package crypto

import (
	"crypto/dsa"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/asn1"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"math/big"
	"strconv"
	"strings"

	ed448lib "github.com/cloudflare/circl/sign/ed448"
	"github.com/dop251/goja"
)

// ============================================================================
// 🔥 多算法签名验证功能 - 支持 RSA, Ed25519, ECDSA
// ============================================================================

// ParseAnyPrivateKey 解析任意类型的私钥（RSA, Ed25519, ECDSA, DSA）
func ParseAnyPrivateKey(keyPEM string, passphrase ...string) (interface{}, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, fmt.Errorf("无法解析 PEM 格式")
	}

	der := block.Bytes

	// 处理加密的私钥
	if strings.Contains(block.Type, "ENCRYPTED") || x509.IsEncryptedPEMBlock(block) {
		if len(passphrase) == 0 || passphrase[0] == "" {
			return nil, fmt.Errorf("私钥已加密，需要提供密码")
		}
		var err error
		der, err = x509.DecryptPEMBlock(block, []byte(passphrase[0]))
		if err != nil {
			return nil, fmt.Errorf("解密私钥失败: %w", err)
		}
	}

	// 尝试不同的格式
	switch block.Type {
	case "PRIVATE KEY": // PKCS#8
		key, err := x509.ParsePKCS8PrivateKey(der)
		if err != nil {
			errStr := err.Error()
			// 尝试解析 secp256k1
			if strings.Contains(errStr, "1.3.132.0.10") ||
				strings.Contains(errStr, "unknown elliptic curve") ||
				strings.Contains(errStr, "unsupported elliptic curve") {
				key, secp256k1Err := ParseSecp256k1PrivateKeyPKCS8(der)
				if secp256k1Err == nil {
					return key, nil
				}
			}
			// 尝试解析 Ed448 (OID: 1.3.101.113)
			if strings.Contains(errStr, "1.3.101.113") {
				key, ed448Err := ParseEd448PrivateKeyPKCS8(der)
				if ed448Err == nil {
					return key, nil
				}
			}
			// 尝试解析 DSA (OID: 1.2.840.10040.4.1)
			if strings.Contains(errStr, "1.2.840.10040.4.1") {
				key, dsaErr := ParseDSAPrivateKeyPKCS8(der)
				if dsaErr == nil {
					return key, nil
				}
			}
			return nil, fmt.Errorf("解析 PKCS8 私钥失败: %w", err)
		}
		return key, nil

	case "RSA PRIVATE KEY", "ENCRYPTED PRIVATE KEY": // PKCS#1
		return x509.ParsePKCS1PrivateKey(der)

	case "EC PRIVATE KEY": // SEC1 for ECDSA
		key, err := x509.ParseECPrivateKey(der)
		if err != nil {
			// 尝试 secp256k1
			key, secp256k1Err := ParseSecp256k1PrivateKeySEC1(der)
			if secp256k1Err == nil {
				return key, nil
			}
			return nil, err
		}
		return key, nil

	default:
		return nil, fmt.Errorf("不支持的私钥类型: %s", block.Type)
	}
}

// ParseAnyPublicKey 解析任意类型的公钥（RSA, Ed25519, ECDSA, DSA）
func ParseAnyPublicKey(keyPEM string) (interface{}, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, fmt.Errorf("无法解析 PEM 格式")
	}

	switch block.Type {
	case "PUBLIC KEY": // SPKI 格式
		pub, err := x509.ParsePKIXPublicKey(block.Bytes)
		if err != nil {
			errStr := err.Error()
			// 尝试 secp256k1
			if strings.Contains(errStr, "1.3.132.0.10") ||
				strings.Contains(errStr, "unknown elliptic curve") ||
				strings.Contains(errStr, "unsupported elliptic curve") {
				pub, secp256k1Err := ParseSecp256k1PublicKeyPKIX(block.Bytes)
				if secp256k1Err == nil {
					return pub, nil
				}
			}
			// 如果是 "unknown public key algorithm"，依次尝试 Ed448 和 DSA
			if strings.Contains(errStr, "unknown public key algorithm") || strings.Contains(errStr, "1.3.101.113") {
				// 先尝试 Ed448 (OID: 1.3.101.113)
				if pub, ed448Err := ParseEd448PublicKeyPKIX(block.Bytes); ed448Err == nil {
					return pub, nil
				}
			}
			if strings.Contains(errStr, "unknown public key algorithm") || strings.Contains(errStr, "1.2.840.10040.4.1") {
				// 尝试解析 DSA (OID: 1.2.840.10040.4.1)
				if pub, dsaErr := ParseDSAPublicKeyPKIX(block.Bytes); dsaErr == nil {
					return pub, nil
				}
			}
			return nil, fmt.Errorf("解析 SPKI 公钥失败: %w", err)
		}
		return pub, nil

	case "RSA PUBLIC KEY": // PKCS#1 格式
		return x509.ParsePKCS1PublicKey(block.Bytes)

	case "CERTIFICATE": // X.509 证书
		cert, err := x509.ParseCertificate(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("解析证书失败: %w", err)
		}
		return cert.PublicKey, nil

	case "PRIVATE KEY", "RSA PRIVATE KEY", "EC PRIVATE KEY", "ENCRYPTED PRIVATE KEY":
		// 从私钥中提取公钥
		priv, err := ParseAnyPrivateKey(string(pem.EncodeToMemory(block)))
		if err != nil {
			return nil, fmt.Errorf("从私钥提取公钥失败: %w", err)
		}

		switch key := priv.(type) {
		case *rsa.PrivateKey:
			return &key.PublicKey, nil
		case *ecdsa.PrivateKey:
			return &key.PublicKey, nil
		case ed25519.PrivateKey:
			return key.Public().(ed25519.PublicKey), nil
		case ed448lib.PrivateKey:
			return key.Public().(ed448lib.PublicKey), nil
		default:
			return nil, fmt.Errorf("无法从私钥类型 %T 提取公钥", priv)
		}

	default:
		return nil, fmt.Errorf("不支持的 PEM 类型: %s", block.Type)
	}
}

// SignWithAnyKey 使用任意类型的私钥进行签名
func SignWithAnyKey(privateKey interface{}, algorithm string, data []byte, options map[string]interface{}) ([]byte, error) {
	switch key := privateKey.(type) {
	case *rsa.PrivateKey:
		return SignWithRSA(key, algorithm, data, options)

	case ed25519.PrivateKey:
		return SignWithEd25519(key, data)

	case *ecdsa.PrivateKey:
		return SignWithECDSA(key, algorithm, data)

	case ed448lib.PrivateKey:
		return SignWithEd448(key, data)

	case *dsa.PrivateKey:
		return SignWithDSA(key, algorithm, data)

	default:
		return nil, fmt.Errorf("不支持的私钥类型: %T", privateKey)
	}
}

// VerifyWithAnyKey 使用任意类型的公钥进行验证
func VerifyWithAnyKey(publicKey interface{}, algorithm string, data []byte, signature []byte, options map[string]interface{}) error {
	switch key := publicKey.(type) {
	case *rsa.PublicKey:
		return VerifyWithRSA(key, algorithm, data, signature, options)

	case ed25519.PublicKey:
		return VerifyWithEd25519(key, data, signature)

	case *ecdsa.PublicKey:
		return VerifyWithECDSA(key, algorithm, data, signature)

	case ed448lib.PublicKey:
		return VerifyWithEd448(key, data, signature)

	case *dsa.PublicKey:
		return VerifyWithDSA(key, algorithm, data, signature)

	default:
		return fmt.Errorf("不支持的公钥类型: %T", publicKey)
	}
}

// SignWithRSA RSA 签名
func SignWithRSA(privateKey *rsa.PrivateKey, algorithm string, data []byte, options map[string]interface{}) ([]byte, error) {
	// 计算哈希
	hashFunc, err := GetHashFunction(algorithm)
	if err != nil {
		return nil, err
	}
	hashFunc.Write(data)
	hashed := hashFunc.Sum(nil)

	// 获取选项
	padding := 1 // 默认 PKCS1
	if p, ok := options["padding"].(int); ok {
		padding = p
	}

	saltLength := -2 // 默认 MAX_SIGN
	if s, ok := options["saltLength"].(int); ok {
		saltLength = s
	}

	// 执行签名
	if padding == 6 { // RSA_PKCS1_PSS_PADDING
		hashID := GetCryptoHash(algorithm)
		if saltLength < -2 {
			return nil, fmt.Errorf("invalid saltLength: %d", saltLength)
		}
		resolvedSaltLength := ResolvePSSSaltLengthForSign(saltLength, privateKey, hashID)

		opts := &rsa.PSSOptions{
			SaltLength: resolvedSaltLength,
			Hash:       hashID,
		}

		if err := ValidatePSSKeySize(privateKey, opts.Hash, opts.SaltLength); err != nil {
			return nil, err
		}

		return rsa.SignPSS(rand.Reader, privateKey, opts.Hash, hashed, opts)
	}

	// RSA_PKCS1_PADDING
	return rsa.SignPKCS1v15(rand.Reader, privateKey, GetCryptoHash(algorithm), hashed)
}

// VerifyWithRSA RSA 验证
func VerifyWithRSA(publicKey *rsa.PublicKey, algorithm string, data []byte, signature []byte, options map[string]interface{}) error {
	// 计算哈希
	hashFunc, err := GetHashFunction(algorithm)
	if err != nil {
		return err
	}
	hashFunc.Write(data)
	hashed := hashFunc.Sum(nil)

	// 获取选项
	padding := 1 // 默认 PKCS1
	if p, ok := options["padding"].(int); ok {
		padding = p
	}

	saltLength := rsa.PSSSaltLengthAuto
	if s, ok := options["saltLength"].(int); ok {
		saltLength = s
	}

	// 执行验证
	if padding == 6 { // RSA_PKCS1_PSS_PADDING
		hashID := GetCryptoHash(algorithm)
		resolvedSaltLength := ResolvePSSSaltLengthForVerify(saltLength, hashID)

		opts := &rsa.PSSOptions{
			SaltLength: resolvedSaltLength,
			Hash:       hashID,
		}
		return rsa.VerifyPSS(publicKey, opts.Hash, hashed, signature, opts)
	}

	// RSA_PKCS1_PADDING
	return rsa.VerifyPKCS1v15(publicKey, GetCryptoHash(algorithm), hashed, signature)
}

// SignWithEd25519 Ed25519 签名
// 注意：Ed25519 不需要哈希算法参数，它内部使用 SHA-512
func SignWithEd25519(privateKey ed25519.PrivateKey, data []byte) ([]byte, error) {
	// Ed25519 签名不需要外部哈希，直接对原始数据签名
	signature := ed25519.Sign(privateKey, data)
	return signature, nil
}

// VerifyWithEd25519 Ed25519 验证
func VerifyWithEd25519(publicKey ed25519.PublicKey, data []byte, signature []byte) error {
	// Ed25519 验证
	if !ed25519.Verify(publicKey, data, signature) {
		return fmt.Errorf("ed25519 signature verification failed")
	}
	return nil
}

// SignWithEd448 Ed448 签名
func SignWithEd448(privateKey ed448lib.PrivateKey, data []byte) ([]byte, error) {
	// Ed448 签名不需要外部哈希，直接对原始数据签名
	signature := ed448lib.Sign(privateKey, data, "")
	return signature, nil
}

// VerifyWithEd448 Ed448 验证
func VerifyWithEd448(publicKey ed448lib.PublicKey, data []byte, signature []byte) error {
	// Ed448 验证
	if !ed448lib.Verify(publicKey, data, signature, "") {
		return fmt.Errorf("ed448 signature verification failed")
	}
	return nil
}

// SignWithECDSA ECDSA 签名
func SignWithECDSA(privateKey *ecdsa.PrivateKey, algorithm string, data []byte) ([]byte, error) {
	// 如果 algorithm 为空或 "null"，根据曲线自动选择哈希算法
	if algorithm == "" || algorithm == "null" {
		bitSize := privateKey.Curve.Params().BitSize
		if bitSize <= 256 {
			algorithm = "sha256"
		} else if bitSize <= 384 {
			algorithm = "sha384"
		} else {
			algorithm = "sha512"
		}
	}

	// 计算哈希
	hashFunc, err := GetHashFunction(algorithm)
	if err != nil {
		return nil, err
	}
	hashFunc.Write(data)
	hashed := hashFunc.Sum(nil)

	// ECDSA 签名（ASN.1 DER 编码）
	signature, err := ecdsa.SignASN1(rand.Reader, privateKey, hashed)
	if err != nil {
		return nil, fmt.Errorf("ecdsa 签名失败: %w", err)
	}

	return signature, nil
}

// VerifyWithECDSA ECDSA 验证
func VerifyWithECDSA(publicKey *ecdsa.PublicKey, algorithm string, data []byte, signature []byte) error {
	// 如果 algorithm 为空或 "null"，根据曲线自动选择哈希算法
	if algorithm == "" || algorithm == "null" {
		bitSize := publicKey.Curve.Params().BitSize
		if bitSize <= 256 {
			algorithm = "sha256"
		} else if bitSize <= 384 {
			algorithm = "sha384"
		} else {
			algorithm = "sha512"
		}
	}

	// 计算哈希
	hashFunc, err := GetHashFunction(algorithm)
	if err != nil {
		return err
	}
	hashFunc.Write(data)
	hashed := hashFunc.Sum(nil)

	// ECDSA 验证（ASN.1 DER 编码）
	if !ecdsa.VerifyASN1(publicKey, hashed, signature) {
		return fmt.Errorf("ecdsa signature verification failed")
	}

	return nil
}

// SignWithDSA DSA 签名
func SignWithDSA(privateKey *dsa.PrivateKey, algorithm string, data []byte) ([]byte, error) {
	// 计算哈希
	hashFunc, err := GetHashFunction(algorithm)
	if err != nil {
		return nil, err
	}
	hashFunc.Write(data)
	hashed := hashFunc.Sum(nil)

	// DSA 签名返回 r, s
	r, s, err := dsa.Sign(rand.Reader, privateKey, hashed)
	if err != nil {
		return nil, fmt.Errorf("dsa 签名失败: %w", err)
	}

	// 将 r, s 编码为 ASN.1 DER 格式（与 Node.js 一致）
	type dsaSignature struct {
		R, S *big.Int
	}
	signature, err := asn1.Marshal(dsaSignature{R: r, S: s})
	if err != nil {
		return nil, fmt.Errorf("编码 DSA 签名失败: %w", err)
	}

	return signature, nil
}

// VerifyWithDSA DSA 验证
func VerifyWithDSA(publicKey *dsa.PublicKey, algorithm string, data []byte, signature []byte) error {
	// 计算哈希
	hashFunc, err := GetHashFunction(algorithm)
	if err != nil {
		return err
	}
	hashFunc.Write(data)
	hashed := hashFunc.Sum(nil)

	// 解码 ASN.1 DER 格式的签名
	type dsaSignature struct {
		R, S *big.Int
	}
	var sig dsaSignature
	if _, err := asn1.Unmarshal(signature, &sig); err != nil {
		return fmt.Errorf("解码 DSA 签名失败: %w", err)
	}

	// DSA 验证
	if !dsa.Verify(publicKey, hashed, sig.R, sig.S) {
		return fmt.Errorf("dsa signature verification failed")
	}

	return nil
}

// ============================================================================
// 🔥 更新后的 Sign 和 Verify 函数 - 支持多种算法
// ============================================================================

// SignMulti 一步签名（支持 RSA, Ed25519, ECDSA）
func SignMulti(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("sign 需要 algorithm、data 和 key 参数"))
	}

	algorithm := call.Arguments[0].String()

	// 获取数据
	var data []byte
	dataArg := call.Arguments[1]
	if obj, ok := dataArg.(*goja.Object); ok && obj != nil {
		if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			length := int(lengthVal.ToInteger())
			data = make([]byte, length)
			for i := 0; i < length; i++ {
				if val := obj.Get(strconv.Itoa(i)); val != nil && !goja.IsUndefined(val) {
					data[i] = byte(val.ToInteger())
				}
			}
		}
	} else {
		data = []byte(dataArg.String())
	}

	// 解析密钥和选项
	var keyPEM string
	options := make(map[string]interface{})
	options["padding"] = 1                        // 默认 PKCS1
	options["saltLength"] = rsa.PSSSaltLengthAuto // 默认自动
	var passphrase string

	thirdArg := call.Arguments[2]

	// 尝试作为对象解析
	if thirdArgObj, ok := thirdArg.(*goja.Object); ok && thirdArgObj != nil {
		keyVal := thirdArgObj.Get("key")
		if keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
			keyPEM = ExtractKeyPEM(runtime, keyVal)

			if paddingVal := thirdArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				options["padding"] = int(paddingVal.ToInteger())
			}
			if saltVal := thirdArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
				options["saltLength"] = int(saltVal.ToInteger())
			}
			passphrase = SafeGetString(thirdArgObj.Get("passphrase"))
		} else {
			keyPEM = ExtractKeyPEM(runtime, thirdArg)
		}
	} else {
		keyPEM = ExtractKeyPEM(runtime, thirdArg)
	}

	// 解析私钥（支持多种类型）
	var privateKey interface{}
	var err error
	if passphrase != "" {
		privateKey, err = ParseAnyPrivateKey(keyPEM, passphrase)
	} else {
		privateKey, err = ParseAnyPrivateKey(keyPEM)
	}
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("解析私钥失败: %w", err)))
	}

	// 执行签名
	signature, err := SignWithAnyKey(privateKey, algorithm, data, options)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("签名失败: %w", err)))
	}

	return CreateBuffer(runtime, signature)
}

// VerifyMulti 一步验证（支持 RSA, Ed25519, ECDSA）
func VerifyMulti(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 4 {
		panic(runtime.NewTypeError("verify 需要 algorithm、data、key 和 signature 参数"))
	}

	algorithm := call.Arguments[0].String()

	// 获取数据
	var data []byte
	dataArg := call.Arguments[1]
	if obj, ok := dataArg.(*goja.Object); ok && obj != nil {
		if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			length := int(lengthVal.ToInteger())
			data = make([]byte, length)
			for i := 0; i < length; i++ {
				if val := obj.Get(strconv.Itoa(i)); val != nil && !goja.IsUndefined(val) {
					data[i] = byte(val.ToInteger())
				}
			}
		}
	} else {
		data = []byte(dataArg.String())
	}

	// 解析密钥和选项
	var keyPEM string
	options := make(map[string]interface{})
	options["padding"] = 1
	options["saltLength"] = rsa.PSSSaltLengthAuto

	thirdArg := call.Arguments[2]

	// 解析公钥
	if thirdArgObj, ok := thirdArg.(*goja.Object); ok && thirdArgObj != nil {
		keyVal := thirdArgObj.Get("key")
		if keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
			keyPEM = ExtractKeyPEM(runtime, keyVal)

			if paddingVal := thirdArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				options["padding"] = int(paddingVal.ToInteger())
			}
			if saltVal := thirdArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
				options["saltLength"] = int(saltVal.ToInteger())
			}
		} else {
			keyPEM = ExtractKeyPEM(runtime, thirdArg)
		}
	} else {
		keyPEM = ExtractKeyPEM(runtime, thirdArg)
	}

	publicKey, err := ParseAnyPublicKey(keyPEM)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	// 获取签名
	signature, err := ConvertToBytes(runtime, call.Arguments[3])
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("signature 数据类型错误: %v", err)))
	}

	// 执行验证
	err = VerifyWithAnyKey(publicKey, algorithm, data, signature, options)

	return runtime.ToValue(err == nil)
}

// ============================================================================
// 🔥 更新后的 CreateSign 和 CreateVerify - 支持多种算法
// ============================================================================

// CreateSignMulti 创建签名对象（支持 RSA, Ed25519, ECDSA）
func CreateSignMulti(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createSign 需要 algorithm 参数"))
	}

	algorithm := call.Arguments[0].String()

	// 创建Sign对象
	signObj := runtime.NewObject()
	var dataBuffer []byte

	// update方法
	signObj.Set("update", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("update 需要 data 参数"))
		}

		buf, err := ConvertToBytesStrict(runtime, call.Arguments[0])
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
		}
		dataBuffer = append(dataBuffer, buf...)

		return call.This
	})

	// end方法
	signObj.Set("end", func(call goja.FunctionCall) goja.Value {
		return call.This
	})

	// sign方法
	signObj.Set("sign", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("sign 需要 key 参数"))
		}

		// 解析参数
		var keyPEM string
		options := make(map[string]interface{})
		options["padding"] = 1     // 默认RSA_PKCS1_PADDING
		options["saltLength"] = -2 // 默认 MAX_SIGN
		var outputEncoding string
		var passphrase string

		firstArg := call.Arguments[0]

		// 尝试作为对象解析
		if firstArgObj, ok := firstArg.(*goja.Object); ok && firstArgObj != nil {
			keyVal := firstArgObj.Get("key")
			if keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
				formatVal := firstArgObj.Get("format")
				if !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) && SafeGetString(formatVal) == "der" {
					keyPEM = ExtractKeyFromDEROptions(runtime, firstArgObj)
				} else {
					keyPEM = ExtractKeyPEM(runtime, keyVal)
				}

				if paddingVal := firstArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
					options["padding"] = int(paddingVal.ToInteger())
				}
				if saltVal := firstArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
					options["saltLength"] = int(saltVal.ToInteger())
				}
				passphrase = SafeGetString(firstArgObj.Get("passphrase"))
			} else {
				keyPEM = ExtractKeyPEM(runtime, firstArg)
			}
		} else {
			keyPEM = ExtractKeyPEM(runtime, firstArg)
		}

		// 检查第二个参数是否为编码格式
		if len(call.Arguments) > 1 {
			outputEncoding = strings.ToLower(SafeGetString(call.Arguments[1]))
		}

		// 解析私钥（支持多种类型）
		var privateKey interface{}
		var err error
		if passphrase != "" {
			privateKey, err = ParseAnyPrivateKey(keyPEM, passphrase)
		} else {
			privateKey, err = ParseAnyPrivateKey(keyPEM)
		}
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("解析私钥失败: %w", err)))
		}

		// 执行签名
		signature, err := SignWithAnyKey(privateKey, algorithm, dataBuffer, options)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("签名失败: %w", err)))
		}

		// 如果指定了编码格式，返回编码后的字符串
		if outputEncoding != "" {
			switch outputEncoding {
			case "hex":
				return runtime.ToValue(hex.EncodeToString(signature))
			case "base64":
				return runtime.ToValue(base64.StdEncoding.EncodeToString(signature))
			case "latin1", "binary":
				return runtime.ToValue(string(signature))
			case "utf8", "utf-8":
				return runtime.ToValue(string(signature))
			case "ascii":
				return runtime.ToValue(string(signature))
			case "ucs2", "ucs-2", "utf16le", "utf-16le":
				runes := make([]rune, len(signature)/2)
				for i := 0; i < len(signature)/2 && i*2+1 < len(signature); i++ {
					runes[i] = rune(signature[i*2]) | rune(signature[i*2+1])<<8
				}
				return runtime.ToValue(string(runes))
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", outputEncoding)))
			}
		}

		// 默认返回 Buffer
		return CreateBuffer(runtime, signature)
	})

	return signObj
}

// CreateVerifyMulti 创建验证对象（支持 RSA, Ed25519, ECDSA）
func CreateVerifyMulti(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createVerify 需要 algorithm 参数"))
	}

	algorithm := call.Arguments[0].String()

	// 创建Verify对象
	verifyObj := runtime.NewObject()
	var dataBuffer []byte

	// update方法
	verifyObj.Set("update", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("update 需要 data 参数"))
		}

		buf, err := ConvertToBytesStrict(runtime, call.Arguments[0])
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
		}
		dataBuffer = append(dataBuffer, buf...)

		return call.This
	})

	// end方法
	verifyObj.Set("end", func(call goja.FunctionCall) goja.Value {
		return call.This
	})

	// verify方法
	verifyObj.Set("verify", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("verify 需要 key 和 signature 参数"))
		}

		// 解析参数
		var keyPEM string
		options := make(map[string]interface{})
		options["padding"] = 1
		options["saltLength"] = rsa.PSSSaltLengthAuto

		firstArg := call.Arguments[0]

		// 尝试作为对象解析
		if firstArgObj, ok := firstArg.(*goja.Object); ok && firstArgObj != nil {
			keyVal := firstArgObj.Get("key")
			if keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
				formatVal := firstArgObj.Get("format")
				if !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) && SafeGetString(formatVal) == "der" {
					keyPEM = ExtractKeyFromDEROptions(runtime, firstArgObj)
				} else {
					keyPEM = ExtractKeyPEM(runtime, keyVal)
				}

				if paddingVal := firstArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
					options["padding"] = int(paddingVal.ToInteger())
				}
				if saltVal := firstArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
					options["saltLength"] = int(saltVal.ToInteger())
				}
			} else {
				keyPEM = ExtractKeyPEM(runtime, firstArg)
			}
		} else {
			keyPEM = ExtractKeyPEM(runtime, firstArg)
		}

		// 获取签名数据
		var signature []byte
		secondArg := call.Arguments[1]
		signatureFormat := ""

		// 检查第三个参数（编码格式）
		if len(call.Arguments) > 2 {
			signatureFormat = strings.ToLower(call.Arguments[2].String())
		}

		// 判断是否是字符串
		var err error
		if signatureStr, isStr := secondArg.Export().(string); isStr {
			if signatureFormat == "" {
				signature = []byte(signatureStr)
			} else {
				switch signatureFormat {
				case "base64":
					signature, err = base64.StdEncoding.DecodeString(signatureStr)
					if err != nil {
						panic(runtime.NewGoError(fmt.Errorf("base64解码签名失败: %w", err)))
					}
				case "hex":
					signature, err = hex.DecodeString(signatureStr)
					if err != nil {
						panic(runtime.NewGoError(fmt.Errorf("hex解码签名失败: %w", err)))
					}
				case "latin1", "binary":
					signature = []byte(signatureStr)
				case "utf8", "utf-8":
					signature = []byte(signatureStr)
				case "ascii":
					signature = []byte(signatureStr)
				default:
					panic(runtime.NewTypeError(fmt.Sprintf("Unknown signature encoding: %s", signatureFormat)))
				}
			}
		} else {
			signature, err = ConvertToBytes(runtime, secondArg)
			if err != nil {
				panic(runtime.NewTypeError(fmt.Sprintf("signature 数据类型错误: %v", err)))
			}
		}

		// 解析公钥（支持多种类型）
		publicKey, err := ParseAnyPublicKey(keyPEM)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		// 执行验证
		err = VerifyWithAnyKey(publicKey, algorithm, dataBuffer, signature, options)

		return runtime.ToValue(err == nil)
	})

	return verifyObj
}
