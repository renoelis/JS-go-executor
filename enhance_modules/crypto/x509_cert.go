package crypto

import (
	"bytes"
	"crypto/dsa"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/dop251/goja"
)

// NewX509Certificate 实现 new crypto.X509Certificate(bufferOrString)
// 目前实现核心属性：raw / subject / issuer / serialNumber / validFrom / validTo
func NewX509Certificate(call goja.ConstructorCall, runtime *goja.Runtime) *goja.Object {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("X509Certificate constructor requires a single argument"))
	}

	dataVal := call.Arguments[0]
	bytes, err := ConvertToBytes(runtime, dataVal)
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("The first argument must be of type string or an instance of Buffer, TypedArray, or DataView. %v", err)))
	}
	if len(bytes) == 0 {
		panic(runtime.NewTypeError("X509Certificate input must not be empty"))
	}

	// 如果是 PEM，先解码
	if block, _ := pem.Decode(bytes); block != nil && block.Type == "CERTIFICATE" {
		bytes = block.Bytes
	}

	cert, err := x509.ParseCertificate(bytes)
	if err != nil {
		// Node.js 行为：构造 X509Certificate 时，如果输入字节不是合法证书，应抛出 TypeError
		// 这里统一使用 TypeError，而不是 GoError，避免在 JS 侧出现 name === 'GoError'
		panic(runtime.NewTypeError("Failed to parse X509 certificate: %v", err))
	}

	obj := runtime.NewObject()

	// 保留底层证书对象（内部使用）
	obj.Set("_cert", runtime.ToValue(cert))
	obj.Set("_derBytes", runtime.ToValue(bytes))

	// raw: DER 编码 Buffer（只读）
	obj.DefineDataProperty("raw", CreateBuffer(runtime, bytes), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	// subject / issuer（只读）
	obj.DefineDataProperty("subject", runtime.ToValue(cert.Subject.String()), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	obj.DefineDataProperty("issuer", runtime.ToValue(cert.Issuer.String()), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	// serialNumber（十六进制字符串，与 Node 行为一致，只读）
	obj.DefineDataProperty("serialNumber", runtime.ToValue(strings.ToUpper(cert.SerialNumber.Text(16))), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	// 有效期字符串（只读）
	obj.DefineDataProperty("validFrom", runtime.ToValue(cert.NotBefore.Format(time.RFC3339)), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	obj.DefineDataProperty("validTo", runtime.ToValue(cert.NotAfter.Format(time.RFC3339)), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	// 有效期 Date 对象 - 创建 JavaScript Date 对象（只读）
	dateConstructor := runtime.Get("Date")
	if constructor, ok := goja.AssertConstructor(dateConstructor); ok {
		validFromDate, _ := constructor(nil, runtime.ToValue(cert.NotBefore.UnixMilli()))
		obj.DefineDataProperty("validFromDate", validFromDate, goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		validToDate, _ := constructor(nil, runtime.ToValue(cert.NotAfter.UnixMilli()))
		obj.DefineDataProperty("validToDate", validToDate, goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}

	// fingerprint 系列（SHA-1/SHA-256/SHA-512，只读）
	sha1Hash := sha1.Sum(bytes)
	obj.DefineDataProperty("fingerprint", runtime.ToValue(formatFingerprint(sha1Hash[:])), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	sha256Hash := sha256.Sum256(bytes)
	obj.DefineDataProperty("fingerprint256", runtime.ToValue(formatFingerprint(sha256Hash[:])), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	sha512Hash := sha512.Sum512(bytes)
	obj.DefineDataProperty("fingerprint512", runtime.ToValue(formatFingerprint(sha512Hash[:])), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	// ca（只读）
	obj.DefineDataProperty("ca", runtime.ToValue(cert.IsCA), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	// email
	if len(cert.EmailAddresses) > 0 {
		obj.Set("email", cert.EmailAddresses[0])
	}

	// publicKey - 返回 KeyObject
	obj.DefineAccessorProperty("publicKey", runtime.ToValue(func(call goja.FunctionCall) goja.Value {
		return createPublicKeyObjectFromCert(runtime, cert)
	}), goja.Undefined(), goja.FLAG_FALSE, goja.FLAG_TRUE)

	// keyUsage
	if cert.KeyUsage != 0 {
		keyUsages := []string{}
		if cert.KeyUsage&x509.KeyUsageDigitalSignature != 0 {
			keyUsages = append(keyUsages, "digitalSignature")
		}
		if cert.KeyUsage&x509.KeyUsageContentCommitment != 0 {
			keyUsages = append(keyUsages, "nonRepudiation")
		}
		if cert.KeyUsage&x509.KeyUsageKeyEncipherment != 0 {
			keyUsages = append(keyUsages, "keyEncipherment")
		}
		if cert.KeyUsage&x509.KeyUsageDataEncipherment != 0 {
			keyUsages = append(keyUsages, "dataEncipherment")
		}
		if cert.KeyUsage&x509.KeyUsageKeyAgreement != 0 {
			keyUsages = append(keyUsages, "keyAgreement")
		}
		if cert.KeyUsage&x509.KeyUsageCertSign != 0 {
			keyUsages = append(keyUsages, "keyCertSign")
		}
		if cert.KeyUsage&x509.KeyUsageCRLSign != 0 {
			keyUsages = append(keyUsages, "cRLSign")
		}
		if cert.KeyUsage&x509.KeyUsageEncipherOnly != 0 {
			keyUsages = append(keyUsages, "encipherOnly")
		}
		if cert.KeyUsage&x509.KeyUsageDecipherOnly != 0 {
			keyUsages = append(keyUsages, "decipherOnly")
		}
		if len(keyUsages) > 0 {
			obj.Set("keyUsage", keyUsages)
		}
	}

	// subjectAltName
	if len(cert.DNSNames) > 0 || len(cert.IPAddresses) > 0 || len(cert.EmailAddresses) > 0 {
		var sans []string
		for _, dns := range cert.DNSNames {
			sans = append(sans, "DNS:"+dns)
		}
		for _, ip := range cert.IPAddresses {
			sans = append(sans, "IP Address:"+ip.String())
		}
		for _, email := range cert.EmailAddresses {
			sans = append(sans, "email:"+email)
		}
		obj.Set("subjectAltName", strings.Join(sans, ", "))
	}

	// signatureAlgorithmOid - 返回真正的 OID 格式（只读）
	sigAlgOid := getSignatureAlgorithmOid(cert.SignatureAlgorithm)
	obj.DefineDataProperty("signatureAlgorithmOid", runtime.ToValue(sigAlgOid), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	// toString() 和 toJSON() 方法
	toStringFunc := func(call goja.FunctionCall) goja.Value {
		pemBlock := &pem.Block{
			Type:  "CERTIFICATE",
			Bytes: bytes,
		}
		return runtime.ToValue(string(pem.EncodeToMemory(pemBlock)))
	}
	obj.Set("toString", toStringFunc)
	obj.Set("toJSON", toStringFunc)

	// checkIssued() 方法
	obj.Set("checkIssued", func(call goja.FunctionCall) goja.Value {
		return checkIssuedMethod(runtime, cert, call)
	})

	// verify() 方法
	obj.Set("verify", func(call goja.FunctionCall) goja.Value {
		return verifyMethod(runtime, cert, call)
	})

	// checkPrivateKey() 方法
	obj.Set("checkPrivateKey", func(call goja.FunctionCall) goja.Value {
		return checkPrivateKeyMethod(runtime, cert, call)
	})

	// checkHost() 方法
	obj.Set("checkHost", func(call goja.FunctionCall) goja.Value {
		return checkHostMethod(runtime, cert, call)
	})

	// checkEmail() 方法
	obj.Set("checkEmail", func(call goja.FunctionCall) goja.Value {
		return checkEmailMethod(runtime, cert, call)
	})

	// checkIP() 方法
	obj.Set("checkIP", func(call goja.FunctionCall) goja.Value {
		return checkIPMethod(runtime, cert, call)
	})

	// toLegacyObject() 方法
	obj.Set("toLegacyObject", func(call goja.FunctionCall) goja.Value {
		legacy := runtime.NewObject()

		// subject 和 issuer 转换为对象格式
		subjectObj := runtime.NewObject()
		for _, name := range cert.Subject.Names {
			oid := name.Type.String()
			if val, ok := name.Value.(string); ok {
				subjectObj.Set(oid, val)
			}
		}
		if cert.Subject.CommonName != "" {
			subjectObj.Set("CN", cert.Subject.CommonName)
		}

		issuerObj := runtime.NewObject()
		for _, name := range cert.Issuer.Names {
			oid := name.Type.String()
			if val, ok := name.Value.(string); ok {
				issuerObj.Set(oid, val)
			}
		}
		if cert.Issuer.CommonName != "" {
			issuerObj.Set("CN", cert.Issuer.CommonName)
		}

		legacy.Set("subject", subjectObj)
		legacy.Set("issuer", issuerObj)
		legacy.Set("serialNumber", strings.ToUpper(cert.SerialNumber.Text(16)))
		legacy.Set("validFrom", cert.NotBefore.Format(time.RFC3339))
		legacy.Set("validTo", cert.NotAfter.Format(time.RFC3339))
		legacy.Set("fingerprint", formatFingerprint(sha1Hash[:]))
		legacy.Set("fingerprint256", formatFingerprint(sha256Hash[:]))

		return legacy
	})

	return obj
}

// formatFingerprint 将字节数组格式化为指纹格式（XX:XX:XX:...）
func formatFingerprint(hash []byte) string {
	hexStr := hex.EncodeToString(hash)
	var result strings.Builder
	for i := 0; i < len(hexStr); i += 2 {
		if i > 0 {
			result.WriteString(":")
		}
		result.WriteString(strings.ToUpper(hexStr[i : i+2]))
	}
	return result.String()
}

// getSignatureAlgorithmOid 将签名算法转换为 OID 格式
func getSignatureAlgorithmOid(alg x509.SignatureAlgorithm) string {
	// 根据 Go crypto/x509 的定义返回对应的 OID
	switch alg {
	case x509.MD2WithRSA:
		return "1.2.840.113549.1.1.2"
	case x509.MD5WithRSA:
		return "1.2.840.113549.1.1.4"
	case x509.SHA1WithRSA:
		return "1.2.840.113549.1.1.5"
	case x509.SHA256WithRSA:
		return "1.2.840.113549.1.1.11"
	case x509.SHA384WithRSA:
		return "1.2.840.113549.1.1.12"
	case x509.SHA512WithRSA:
		return "1.2.840.113549.1.1.13"
	case x509.DSAWithSHA1:
		return "1.2.840.10040.4.3"
	case x509.DSAWithSHA256:
		return "2.16.840.1.101.3.4.3.2"
	case x509.ECDSAWithSHA1:
		return "1.2.840.10045.4.1"
	case x509.ECDSAWithSHA256:
		return "1.2.840.10045.4.3.2"
	case x509.ECDSAWithSHA384:
		return "1.2.840.10045.4.3.3"
	case x509.ECDSAWithSHA512:
		return "1.2.840.10045.4.3.4"
	case x509.SHA256WithRSAPSS:
		return "1.2.840.113549.1.1.10"
	case x509.SHA384WithRSAPSS:
		return "1.2.840.113549.1.1.10"
	case x509.SHA512WithRSAPSS:
		return "1.2.840.113549.1.1.10"
	case x509.PureEd25519:
		return "1.3.101.112"
	default:
		// 返回算法名称作为降级方案
		return alg.String()
	}
}

// createPublicKeyObjectFromCert 根据证书的公钥创建 KeyObject
func createPublicKeyObjectFromCert(runtime *goja.Runtime, cert *x509.Certificate) goja.Value {
	pubKey := cert.PublicKey

	// 判断公钥类型并创建相应的 KeyObject
	switch key := pubKey.(type) {
	case *rsa.PublicKey:
		return CreateKeyObject(runtime, key, "rsa", true)
	case *ecdsa.PublicKey:
		return CreateKeyObject(runtime, key, "ec", true)
	case ed25519.PublicKey:
		return CreateKeyObject(runtime, key, "ed25519", true)
	case *dsa.PublicKey:
		return CreateKeyObject(runtime, key, "dsa", true)
	default:
		// 对于其他类型，尝试导出为 SPKI 格式然后解析
		spki, err := x509.MarshalPKIXPublicKey(pubKey)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("无法导出公钥: %w", err)))
		}
		// 重新解析
		parsedKey, err := x509.ParsePKIXPublicKey(spki)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("无法解析公钥: %w", err)))
		}
		// 递归调用（应该不会再次进入 default 分支）
		tempCert := &x509.Certificate{PublicKey: parsedKey}
		return createPublicKeyObjectFromCert(runtime, tempCert)
	}
}

// checkHostMethod 实现 cert.checkHost(hostname, options)
func checkHostMethod(runtime *goja.Runtime, cert *x509.Certificate, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) == 0 {
		return goja.Undefined()
	}

	hostname := call.Arguments[0].String()
	if hostname == "" {
		return goja.Undefined()
	}

	// 解析 options
	var subject string = "default" // default, always, never
	if len(call.Arguments) > 1 {
		if opts, ok := call.Arguments[1].(*goja.Object); ok {
			if subj := opts.Get("subject"); subj != nil && !goja.IsUndefined(subj) {
				subject = subj.String()
			}
		}
	}

	// 规范化主机名为小写（大小写不敏感）
	hostname = strings.ToLower(hostname)

	// 1. 检查 SAN DNS 条目（除非 subject = "never"）
	if subject != "never" {
		for _, dnsName := range cert.DNSNames {
			if matchHostname(hostname, strings.ToLower(dnsName)) {
				return runtime.ToValue(dnsName)
			}
		}
	}

	// 2. 检查 CN（只在特定情况下）
	// - subject="always": 总是检查 CN
	// - subject="default" 且没有 SAN DNS: 检查 CN
	// - subject="never": 不检查 CN
	if subject == "always" || (subject == "default" && len(cert.DNSNames) == 0) {
		// 从 Subject 中提取 CN
		cn := cert.Subject.CommonName
		if cn != "" && matchHostname(hostname, strings.ToLower(cn)) {
			return runtime.ToValue(cn)
		}
	}

	return goja.Undefined()
}

// checkEmailMethod 实现 cert.checkEmail(email, options)
func checkEmailMethod(runtime *goja.Runtime, cert *x509.Certificate, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) == 0 {
		return goja.Undefined()
	}

	email := call.Arguments[0].String()
	if email == "" {
		return goja.Undefined()
	}

	// 解析 options（虽然目前不影响逻辑，但要接受参数）
	// var subject string = "default"
	// if len(call.Arguments) > 1 { ... }

	// 邮箱比较通常是大小写不敏感的
	email = strings.ToLower(email)

	// 检查 SAN email 条目
	for _, emailAddr := range cert.EmailAddresses {
		if strings.ToLower(emailAddr) == email {
			return runtime.ToValue(emailAddr)
		}
	}

	return goja.Undefined()
}

// checkIssuedMethod 实现 cert.checkIssued(otherCert)
func checkIssuedMethod(runtime *goja.Runtime, cert *x509.Certificate, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("X509Certificate.checkIssued() requires an argument"))
	}

	otherVal := call.Arguments[0]
	obj, ok := otherVal.(*goja.Object)
	if !ok || obj == nil {
		panic(runtime.NewTypeError("The \"otherCert\" argument must be an X509Certificate"))
	}

	internal := obj.Get("_cert")
	if internal == nil || goja.IsUndefined(internal) || goja.IsNull(internal) {
		panic(runtime.NewTypeError("The \"otherCert\" argument must be an X509Certificate"))
	}

	exported := internal.Export()
	otherCert, ok := exported.(*x509.Certificate)
	if !ok || otherCert == nil {
		panic(runtime.NewTypeError("The \"otherCert\" argument must be an X509Certificate"))
	}

	// 使用 Go 内置的证书签名校验
	if err := cert.CheckSignatureFrom(otherCert); err != nil {
		return runtime.ToValue(false)
	}

	return runtime.ToValue(true)
}

// verifyMethod 实现 cert.verify(publicKey)
func verifyMethod(runtime *goja.Runtime, cert *x509.Certificate, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("X509Certificate.verify() requires a publicKey argument"))
	}

	arg := call.Arguments[0]
	obj, ok := arg.(*goja.Object)
	if !ok || obj == nil {
		panic(runtime.NewTypeError("The \"publicKey\" argument must be a KeyObject"))
	}

	typeVal := obj.Get("type")
	if goja.IsUndefined(typeVal) || goja.IsNull(typeVal) {
		panic(runtime.NewTypeError("The \"publicKey\" argument must be a KeyObject with type property"))
	}
	typeStr := strings.ToLower(SafeGetString(typeVal))
	if typeStr == "private" || typeStr == "secret" {
		// 测试允许返回 false 或抛错；这里返回 false
		return runtime.ToValue(false)
	}
	if typeStr != "public" {
		// 不是公钥 KeyObject，直接视为不匹配
		return runtime.ToValue(false)
	}

	internal := obj.Get("_key")
	if internal == nil || goja.IsUndefined(internal) || goja.IsNull(internal) {
		panic(runtime.NewTypeError("Invalid KeyObject: missing internal key"))
	}

	exported := internal.Export()
	var pubKey interface{}
	switch k := exported.(type) {
	case *rsa.PublicKey, *ecdsa.PublicKey, ed25519.PublicKey, *dsa.PublicKey:
		pubKey = k
	case *rsa.PrivateKey:
		pubKey = &k.PublicKey
	case *ecdsa.PrivateKey:
		pubKey = &k.PublicKey
	case ed25519.PrivateKey:
		pubKey = k.Public().(ed25519.PublicKey)
	case *dsa.PrivateKey:
		pubKey = &k.PublicKey
	default:
		// 不支持的 key 类型，视为不匹配
		return runtime.ToValue(false)
	}

	// 构造临时证书对象，使用给定公钥验证当前证书的签名
	tmp := &x509.Certificate{PublicKey: pubKey}
	if err := tmp.CheckSignature(cert.SignatureAlgorithm, cert.RawTBSCertificate, cert.Signature); err != nil {
		return runtime.ToValue(false)
	}

	return runtime.ToValue(true)
}

// checkPrivateKeyMethod 实现 cert.checkPrivateKey(privateKey)
func checkPrivateKeyMethod(runtime *goja.Runtime, cert *x509.Certificate, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("X509Certificate.checkPrivateKey() requires a privateKey argument"))
	}

	arg := call.Arguments[0]
	obj, ok := arg.(*goja.Object)
	if !ok || obj == nil {
		panic(runtime.NewTypeError("The \"privateKey\" argument must be a KeyObject"))
	}

	typeVal := obj.Get("type")
	if goja.IsUndefined(typeVal) || goja.IsNull(typeVal) {
		panic(runtime.NewTypeError("The \"privateKey\" argument must be a KeyObject with type property"))
	}
	typeStr := strings.ToLower(SafeGetString(typeVal))
	if typeStr != "private" {
		// 传入公钥或其它类型，按测试要求可以返回 false
		return runtime.ToValue(false)
	}

	internal := obj.Get("_key")
	if internal == nil || goja.IsUndefined(internal) || goja.IsNull(internal) {
		panic(runtime.NewTypeError("Invalid KeyObject: missing internal key"))
	}

	exported := internal.Export()
	var derivedPub interface{}
	switch k := exported.(type) {
	case *rsa.PrivateKey:
		derivedPub = &k.PublicKey
	case *ecdsa.PrivateKey:
		derivedPub = &k.PublicKey
	case ed25519.PrivateKey:
		derivedPub = k.Public().(ed25519.PublicKey)
	case *dsa.PrivateKey:
		derivedPub = &k.PublicKey
	default:
		// 不支持的私钥类型，返回 false
		return runtime.ToValue(false)
	}

	if publicKeysEqual(cert.PublicKey, derivedPub) {
		return runtime.ToValue(true)
	}
	return runtime.ToValue(false)
}

// publicKeysEqual 比较两个公钥是否等价
// 通过 x509.MarshalPKIXPublicKey 得到规范化的 SPKI 编码，再用 bytes.Equal 比较
func publicKeysEqual(a, b interface{}) bool {
	if a == nil || b == nil {
		return false
	}

	derA, errA := x509.MarshalPKIXPublicKey(a)
	if errA != nil {
		return false
	}
	derB, errB := x509.MarshalPKIXPublicKey(b)
	if errB != nil {
		return false
	}

	return bytes.Equal(derA, derB)
}

// checkIPMethod 实现 cert.checkIP(ip, options)
func checkIPMethod(runtime *goja.Runtime, cert *x509.Certificate, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) == 0 {
		return goja.Undefined()
	}

	ipStr := call.Arguments[0].String()
	if ipStr == "" {
		return goja.Undefined()
	}

	// 使用 net.ParseIP 解析 IP 地址
	ip := net.ParseIP(ipStr)
	if ip == nil {
		// 无效的 IP 格式，返回 undefined（Node.js 行为）
		return goja.Undefined()
	}

	// 检查 SAN IP 条目
	for _, certIP := range cert.IPAddresses {
		// Node.js 行为：IPv4 和 IPv4 映射的 IPv6 (::ffff:x.x.x.x) 被视为不同
		// 需要精确匹配字节表示，而不仅仅是语义相等
		if ipBytesEqual(certIP, ip) {
			// 如果证书里是 IPv4，而传入的是 IPv4 映射 IPv6（字符串里带有冒号），按 Node.js 行为不视为匹配
			if certIP.To4() != nil && strings.Contains(ipStr, ":") {
				continue
			}

			// 返回规范化的 IP 字符串
			return runtime.ToValue(certIP.String())
		}
	}

	return goja.Undefined()
}

// ipBytesEqual 比较两个 IP 地址的语义是否相等
// 具体区分 IPv4 与 IPv4 映射 IPv6 的逻辑由调用方结合原始字符串处理
func ipBytesEqual(ip1, ip2 net.IP) bool {
	return ip1.Equal(ip2)
}

// matchHostname 检查主机名是否匹配（完整支持 RFC 6125 通配符）
// 参考 Node.js crypto.X509Certificate.checkHost() 的行为
func matchHostname(hostname, pattern string) bool {
	// 1. 精确匹配（最常见的情况）
	if hostname == pattern {
		return true
	}

	// 2. 检查是否包含通配符
	if !strings.Contains(pattern, "*") {
		// 没有通配符，精确匹配失败则返回 false
		return false
	}

	// 3. 通配符匹配规则（RFC 6125 Section 6.4.3）
	// - 通配符只能出现在最左侧的标签（label）中
	// - 通配符可以匹配单个标签中的一部分或全部
	// - 通配符不能匹配多个标签（即不能跨越 '.'）
	// - 通配符不能匹配空字符串

	// 检查通配符是否只出现在第一个标签中
	firstDot := strings.IndexByte(pattern, '.')
	if firstDot == -1 {
		// 模式中没有点，例如 "*.com" 这样的模式是无效的
		// 但 "*" 单独作为模式在某些情况下可能有效（虽然不安全）
		return matchWildcardLabel(hostname, pattern)
	}

	// 提取第一个标签（通配符部分）和剩余部分
	patternFirstLabel := pattern[:firstDot]
	patternRest := pattern[firstDot+1:] // 去掉第一个点

	// 检查通配符是否只在第一个标签中
	if strings.Contains(patternRest, "*") {
		// 通配符出现在第一个标签之外，不符合规范
		return false
	}

	// 主机名也需要至少有一个点
	hostFirstDot := strings.IndexByte(hostname, '.')
	if hostFirstDot == -1 {
		// 主机名没有点，无法匹配带有域名部分的模式
		return false
	}

	hostnameFirstLabel := hostname[:hostFirstDot]
	hostnameRest := hostname[hostFirstDot+1:]

	// 4. 检查非通配符部分是否完全匹配
	if patternRest != hostnameRest {
		return false
	}

	// 5. 检查第一个标签是否匹配通配符模式
	return matchWildcardLabel(hostnameFirstLabel, patternFirstLabel)
}

// matchWildcardLabel 匹配单个标签中的通配符
// 支持以下模式：
// - "*" 匹配任意非空字符串
// - "prefix*" 匹配以 prefix 开头的字符串
// - "*suffix" 匹配以 suffix 结尾的字符串
// - "prefix*suffix" 匹配以 prefix 开头且以 suffix 结尾的字符串
// - "pre*mid*suf" 匹配包含多个通配符的复杂模式
func matchWildcardLabel(label, pattern string) bool {
	// 不包含通配符，直接比较
	if !strings.Contains(pattern, "*") {
		return label == pattern
	}

	// 通配符不能匹配空标签
	if len(label) == 0 {
		// 但是如果模式就是 "*"，某些实现可能允许
		// Node.js 的行为：空标签不匹配通配符
		return false
	}

	// 将模式按 * 分割
	parts := strings.Split(pattern, "*")

	// 特殊情况：模式是 "*"
	if len(parts) == 2 && parts[0] == "" && parts[1] == "" {
		// 匹配任意非空字符串
		return len(label) > 0
	}

	// 检查标签是否匹配所有部分
	pos := 0
	for i, part := range parts {
		if part == "" {
			// 空部分，跳过
			continue
		}

		if i == 0 {
			// 第一个部分：必须在开头
			if !strings.HasPrefix(label[pos:], part) {
				return false
			}
			pos += len(part)
		} else if i == len(parts)-1 {
			// 最后一个部分：必须在结尾
			if !strings.HasSuffix(label[pos:], part) {
				return false
			}
			// 检查是否有足够的空间
			if pos+len(part) > len(label) {
				return false
			}
			pos = len(label)
		} else {
			// 中间部分：必须存在
			idx := strings.Index(label[pos:], part)
			if idx == -1 {
				return false
			}
			pos += idx + len(part)
		}
	}

	// 检查是否消耗了整个标签
	// 如果模式以 * 结尾，pos 可能小于 len(label)
	// 如果模式不以 * 结尾，pos 应该等于 len(label)
	if pattern[len(pattern)-1] == '*' {
		// 模式以通配符结尾，允许有剩余字符
		return true
	}

	// 模式不以通配符结尾，必须完全匹配
	return pos == len(label)
}
