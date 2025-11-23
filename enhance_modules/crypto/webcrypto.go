package crypto

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/subtle"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"hash"
	"strings"

	"github.com/dop251/goja"
	"golang.org/x/crypto/curve25519"
	"golang.org/x/crypto/hkdf"
	"golang.org/x/crypto/pbkdf2"
)

// RegisterWebCrypto 在 crypto 对象上挂载 webcrypto 子模块
// 目前提供最小可用集：
//   - crypto.webcrypto.getRandomValues
//   - crypto.webcrypto.subtle.digest(algorithm, data)
func RegisterWebCrypto(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	webcrypto := runtime.NewObject()

	// 复用现有 getRandomValues 实现
	webcrypto.Set("getRandomValues", func(call goja.FunctionCall) goja.Value {
		return GetRandomValues(call, runtime)
	})

	// 复用现有 randomUUID 实现
	webcrypto.Set("randomUUID", func(call goja.FunctionCall) goja.Value {
		return RandomUUID(call, runtime)
	})

	// subtle 对象
	subtle := runtime.NewObject()

	// deriveKey/deriveBits - PBKDF2 / HKDF / ECDH / X25519
	subtle.Set("deriveBits", func(call goja.FunctionCall) goja.Value {
		return WebCryptoDeriveBits(call, runtime)
	})

	subtle.Set("deriveKey", func(call goja.FunctionCall) goja.Value {
		return WebCryptoDeriveKey(call, runtime)
	})

	subtle.Set("digest", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		// 参数个数检查
		if len(call.Arguments) < 2 {
			reject(runtime.NewTypeError("subtle.digest 需要 algorithm 和 data 参数"))
			return runtime.ToValue(promise)
		}

		algVal := call.Arguments[0]
		dataVal := call.Arguments[1]

		// algorithm 参数检查 - 必须是字符串或包含 name 属性的对象
		var alg string
		if algVal == nil || goja.IsUndefined(algVal) || goja.IsNull(algVal) {
			reject(runtime.NewTypeError("The \"algorithm\" argument must be of type string or object"))
			return runtime.ToValue(promise)
		}

		// 检查是否是数字类型（应该拒绝）
		if exported := algVal.Export(); exported != nil {
			switch exported.(type) {
			case int, int32, int64, float32, float64:
				reject(runtime.NewTypeError("The \"algorithm\" argument must be of type string or object"))
				return runtime.ToValue(promise)
			}
		}

		alg = SafeGetString(algVal)
		if alg == "" {
			reject(runtime.NewTypeError("The \"algorithm\" argument must be of type string"))
			return runtime.ToValue(promise)
		}

		// 使用已有 GetHashFunction + NormalizeHashAlgorithm，对齐 Node 算法名称
		h, err := GetHashFunction(alg)
		if err != nil {
			// WebCrypto 规范要求对不支持的算法抛出 NotSupportedError
			notSupportedErr := runtime.NewTypeError(fmt.Sprintf("Algorithm not supported: %s", alg))
			errObj := notSupportedErr.ToObject(runtime)
			errObj.Set("name", "NotSupportedError")
			reject(errObj)
			return runtime.ToValue(promise)
		}

		// WebCrypto subtle.digest 接受 BufferSource
		//   ArrayBuffer / TypedArray / DataView / Buffer
		// 检查 data 参数类型
		if dataVal == nil || goja.IsUndefined(dataVal) || goja.IsNull(dataVal) {
			reject(runtime.NewTypeError("The \"data\" argument must be an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received undefined"))
			return runtime.ToValue(promise)
		}

		// 检查 data 参数类型是否在 WebCrypto 中支持
		if _, ok := dataVal.Export().(string); ok {
			reject(runtime.NewTypeError("The \"data\" argument must be an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received type string"))
			return runtime.ToValue(promise)
		}

		// 将 data 参数转换为字节切片
		data, err := convertToBytesInternal(runtime, dataVal, true /* allowArrayBuffer */)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be an instance of Buffer, TypedArray, DataView, or ArrayBuffer. %v", err)))
			return runtime.ToValue(promise)
		}

		if _, err := h.Write(data); err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}

		sum := h.Sum(nil)
		// 返回 Promise<ArrayBuffer>
		resolve(runtime.NewArrayBuffer(sum))
		return runtime.ToValue(promise)
	})

	// generateKey(algorithm, extractable, keyUsages) - 目前支持 AES-GCM secret key
	subtle.Set("generateKey", func(call goja.FunctionCall) goja.Value {
		return WebCryptoGenerateKey(call, runtime)
	})

	// encrypt/decrypt - 目前支持 AES-GCM + secret key
	subtle.Set("encrypt", func(call goja.FunctionCall) goja.Value {
		return WebCryptoEncrypt(call, runtime)
	})

	subtle.Set("decrypt", func(call goja.FunctionCall) goja.Value {
		return WebCryptoDecrypt(call, runtime)
	})

	// importKey/exportKey - 目前支持 AES-GCM secret key 的 raw 格式
	subtle.Set("importKey", func(call goja.FunctionCall) goja.Value {
		return WebCryptoImportKey(call, runtime)
	})

	subtle.Set("exportKey", func(call goja.FunctionCall) goja.Value {
		return WebCryptoExportKey(call, runtime)
	})

	// wrapKey/unwrapKey
	subtle.Set("wrapKey", func(call goja.FunctionCall) goja.Value {
		return WebCryptoWrapKey(call, runtime)
	})

	subtle.Set("unwrapKey", func(call goja.FunctionCall) goja.Value {
		return WebCryptoUnwrapKey(call, runtime)
	})

	// sign/verify - 目前支持 HMAC
	subtle.Set("sign", func(call goja.FunctionCall) goja.Value {
		return WebCryptoSign(call, runtime)
	})

	subtle.Set("verify", func(call goja.FunctionCall) goja.Value {
		return WebCryptoVerify(call, runtime)
	})

	webcrypto.Set("subtle", subtle)
	cryptoObj.Set("webcrypto", webcrypto)

	return nil
}

func parseRsaHashParam(algObj *goja.Object) (string, error) {
	if algObj == nil {
		return "", fmt.Errorf("The \"algorithm\" object must have a 'hash' member")
	}
	hashVal := algObj.Get("hash")
	if hashVal == nil || goja.IsUndefined(hashVal) || goja.IsNull(hashVal) {
		return "", fmt.Errorf("The \"algorithm\" object must have a 'hash' member")
	}
	var hashName string
	if hashObj, ok := hashVal.(*goja.Object); ok && hashObj != nil {
		hashName = SafeGetString(hashObj.Get("name"))
	} else {
		hashName = SafeGetString(hashVal)
	}
	if hashName == "" {
		return "", fmt.Errorf("The \"hash\" member must specify a valid hash algorithm")
	}
	return strings.ToUpper(hashName), nil
}

func parseRsaOaepLabel(runtime *goja.Runtime, algObj *goja.Object) ([]byte, error) {
	if algObj == nil {
		return nil, nil
	}
	labelVal := algObj.Get("label")
	if labelVal == nil || goja.IsUndefined(labelVal) || goja.IsNull(labelVal) {
		return nil, nil
	}
	label, err := convertToBytesInternal(runtime, labelVal, true)
	if err != nil {
		return nil, fmt.Errorf("The \"label\" member must be a BufferSource. %v", err)
	}
	return label, nil
}

func defaultRsaPssSaltLength(hashName string) (int, error) {
	hashFunc, err := GetHashFunction(hashName)
	if err != nil {
		return 0, err
	}
	return hashFunc.Size(), nil
}

func parseRsaPssSaltLength(algObj *goja.Object, hashName string) (int, error) {
	defaultLen, err := defaultRsaPssSaltLength(hashName)
	if err != nil {
		return 0, err
	}
	if algObj == nil {
		return defaultLen, nil
	}
	saltVal := algObj.Get("saltLength")
	if saltVal == nil || goja.IsUndefined(saltVal) || goja.IsNull(saltVal) {
		return defaultLen, nil
	}
	if exported := saltVal.Export(); exported != nil {
		switch exported.(type) {
		case int, int32, int64, float32, float64:
		default:
			return 0, fmt.Errorf("The \"saltLength\" member must be a number")
		}
	}
	salt := int(saltVal.ToInteger())
	if salt < 0 {
		return 0, fmt.Errorf("The value of \"saltLength\" must be >= 0")
	}
	return salt, nil
}

func canonicalizeRsaAlgorithm(name string) string {
	upper := strings.ToUpper(name)
	if upper == "RSASSA-PSS" {
		return "RSA-PSS"
	}
	return upper
}

// validateRsaPublicExponentBytes 校验 RSA publicExponent 是否为合法的奇数（>= 3）
func validateRsaPublicExponentBytes(expBytes []byte) error {
	if len(expBytes) == 0 {
		return fmt.Errorf("Invalid RSA public exponent value")
	}
	val := 0
	for _, b := range expBytes {
		val = (val << 8) | int(b)
	}
	if val < 3 || val%2 == 0 {
		return fmt.Errorf("Invalid RSA public exponent value")
	}
	return nil
}

func validateKeyUsagesSubset(usages []string, allowed []string) error {
	allowedSet := make(map[string]struct{}, len(allowed))
	for _, u := range allowed {
		allowedSet[strings.ToLower(u)] = struct{}{}
	}
	for _, u := range usages {
		if _, ok := allowedSet[strings.ToLower(u)]; !ok {
			return fmt.Errorf("Unsupported key usage '%s' for this algorithm", u)
		}
	}
	return nil
}

// normalizeWebCryptoKDFDigest 将 WebCrypto 中的哈希名称（如 "SHA-256"）映射为
// kdf.go 中 getKDFHashFunc 使用的 digest 名称（如 "sha256"）。
func normalizeWebCryptoKDFDigest(name string) string {
	switch strings.ToUpper(strings.TrimSpace(name)) {
	case "SHA-1":
		return "sha1"
	case "SHA-224":
		return "sha224"
	case "SHA-256":
		return "sha256"
	case "SHA-384":
		return "sha384"
	case "SHA-512":
		return "sha512"
	default:
		return name
	}
}

// importJWKKey 处理 subtle.importKey 的 JWK 格式导入
// 仅覆盖当前测试需要的算法：AES-GCM、RSA-OAEP、RSA-PSS、RSASSA-PKCS1-v1_5、ECDSA、ECDH、Ed25519
func importJWKKey(runtime *goja.Runtime, algName, algUpper string, keyDataVal goja.Value, extractable bool, usagesVal goja.Value, algObj *goja.Object) (*goja.Object, error) {
	if keyDataVal == nil || goja.IsUndefined(keyDataVal) || goja.IsNull(keyDataVal) {
		return nil, fmt.Errorf("The \"keyData\" argument must be a JWK object")
	}

	obj, ok := keyDataVal.(*goja.Object)
	if !ok || obj == nil {
		return nil, fmt.Errorf("The \"keyData\" argument must be a JWK object")
	}

	// 将 JWK 对象转换为 map[string]interface{}，以复用 jwk.go 中的解析函数
	var jwkMap map[string]interface{}
	if exported := obj.Export(); exported != nil {
		if m, ok := exported.(map[string]interface{}); ok {
			jwkMap = m
		}
	}
	if jwkMap == nil {
		jwkMap = make(map[string]interface{})
		for _, k := range obj.Keys() {
			v := obj.Get(k)
			if v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				jwkMap[k] = v.Export()
			}
		}
	}

	switch algUpper {
	case "AES-GCM":
		// JWK 对称密钥：{ kty: "oct", k: base64url(key) }
		kty, _ := jwkMap["kty"].(string)
		if kty != "oct" {
			return nil, fmt.Errorf("JWK kty must be 'oct' for AES keys")
		}
		kStr, ok := jwkMap["k"].(string)
		if !ok || kStr == "" {
			return nil, fmt.Errorf("JWK AES key is missing 'k' property")
		}
		keyBytes, err := base64.RawURLEncoding.DecodeString(kStr)
		if err != nil {
			return nil, fmt.Errorf("Failed to decode JWK \"k\" value: %v", err)
		}
		if len(keyBytes) == 0 {
			return nil, fmt.Errorf("The \"k\" member must not be empty")
		}
		keyLenBits := len(keyBytes) * 8
		if keyLenBits != 128 && keyLenBits != 192 && keyLenBits != 256 {
			return nil, fmt.Errorf("Invalid AES-GCM key length in JWK: %d bits", keyLenBits)
		}

		// 如果 algorithm.length 存在，则验证与 keyData 匹配
		if algObj != nil {
			lenVal := algObj.Get("length")
			if lenVal != nil && !goja.IsUndefined(lenVal) && !goja.IsNull(lenVal) {
				if exported := lenVal.Export(); exported != nil {
					switch exported.(type) {
					case int, int32, int64, float32, float64:
						algLen := int(lenVal.ToInteger())
						if algLen != keyLenBits {
							return nil, fmt.Errorf("The AES-GCM keyData length (%d) does not match algorithm.length (%d)", keyLenBits, algLen)
						}
					default:
						return nil, fmt.Errorf("The \"length\" member must be a number")
					}
				}
			}
		}

		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			return nil, err
		}

		keyObj := newWebCryptoSecretKey(runtime, "AES-GCM", keyLenBits, extractable, usages, keyBytes)
		return keyObj, nil

	case "HMAC":
		// HMAC JWK：kty=oct, k=base64url(key)
		kty, _ := jwkMap["kty"].(string)
		if kty != "oct" {
			return nil, fmt.Errorf("JWK kty must be 'oct' for HMAC keys")
		}
		kStr, ok := jwkMap["k"].(string)
		if !ok || kStr == "" {
			return nil, fmt.Errorf("JWK HMAC key is missing 'k' property")
		}
		keyBytes, err := base64.RawURLEncoding.DecodeString(kStr)
		if err != nil {
			return nil, fmt.Errorf("Failed to decode JWK \"k\" value: %v", err)
		}
		if len(keyBytes) == 0 {
			return nil, fmt.Errorf("The \"k\" member must not be empty")
		}
		keyLenBits := len(keyBytes) * 8

		// 从 algorithm 对象解析 hash 参数，保持与 generateKey/import raw 一致
		if algObj == nil {
			return nil, fmt.Errorf("The \"algorithm\" object for HMAC must have a 'hash' member")
		}
		hashName, _, err := parseHmacParams(runtime, algObj)
		if err != nil {
			return nil, err
		}

		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			return nil, err
		}
		if err := validateKeyUsagesSubset(usages, []string{"sign", "verify"}); err != nil {
			return nil, err
		}

		keyObj := newWebCryptoHMACKey(runtime, hashName, keyLenBits, extractable, usages, keyBytes)
		return keyObj, nil

	case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5", "RSASSA-PSS":
		// 判断是否为私钥（是否包含 d 字段）
		_, hasD := jwkMap["d"]
		canonAlg := canonicalizeRsaAlgorithm(algName)
		if algObj == nil {
			return nil, fmt.Errorf("The \"algorithm\" object must have a 'hash' member")
		}
		hashName, err := parseRsaHashParam(algObj)
		if err != nil {
			return nil, err
		}

		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			return nil, err
		}

		if hasD {
			// 私钥 JWK
			rsaPriv, err := JWKToRSAPrivateKey(jwkMap)
			if err != nil {
				return nil, err
			}
			if canonAlg == "RSA-OAEP" {
				if err := validateKeyUsagesSubset(usages, []string{"decrypt", "unwrapkey"}); err != nil {
					return nil, err
				}
			} else {
				if err := validateKeyUsagesSubset(usages, []string{"sign"}); err != nil {
					return nil, err
				}
			}
			keyObj := newWebCryptoRSAKey(runtime, canonAlg, hashName, extractable, usages, nil, rsaPriv)
			return keyObj, nil
		}

		// 公钥 JWK
		rsaPub, err := JWKToRSAPublicKey(jwkMap)
		if err != nil {
			return nil, err
		}
		if canonAlg == "RSA-OAEP" {
			if err := validateKeyUsagesSubset(usages, []string{"encrypt", "wrapkey"}); err != nil {
				return nil, err
			}
		} else {
			if err := validateKeyUsagesSubset(usages, []string{"verify"}); err != nil {
				return nil, err
			}
		}
		keyObj := newWebCryptoRSAKey(runtime, canonAlg, hashName, extractable, usages, rsaPub, nil)
		return keyObj, nil

	case "ECDSA", "ECDH":
		_, hasD := jwkMap["d"]

		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			return nil, err
		}

		if hasD {
			// 私钥
			ecPriv, err := JWKToECPrivateKey(jwkMap)
			if err != nil {
				return nil, err
			}
			if algUpper == "ECDSA" {
				if err := validateKeyUsagesSubset(usages, []string{"sign"}); err != nil {
					return nil, err
				}
			} else {
				if err := validateKeyUsagesSubset(usages, []string{"deriveKey", "deriveBits"}); err != nil {
					return nil, err
				}
			}

			curveName := ""
			switch ecPriv.Curve {
			case elliptic.P256():
				curveName = "P-256"
			case elliptic.P384():
				curveName = "P-384"
			case elliptic.P521():
				curveName = "P-521"
			default:
				return nil, fmt.Errorf("unsupported EC curve for JWK key")
			}

			keyObj := newWebCryptoECKey(runtime, algUpper, curveName, extractable, usages, nil, ecPriv)
			return keyObj, nil
		}

		// 公钥
		ecPub, err := JWKToECPublicKey(jwkMap)
		if err != nil {
			return nil, err
		}
		if algUpper == "ECDSA" {
			if err := validateKeyUsagesSubset(usages, []string{"verify"}); err != nil {
				return nil, err
			}
		} else {
			if err := validateKeyUsagesSubset(usages, []string{"deriveKey", "deriveBits"}); err != nil {
				return nil, err
			}
		}

		curveName := ""
		switch ecPub.Curve {
		case elliptic.P256():
			curveName = "P-256"
		case elliptic.P384():
			curveName = "P-384"
		case elliptic.P521():
			curveName = "P-521"
		default:
			return nil, fmt.Errorf("unsupported EC curve for JWK key")
		}

		keyObj := newWebCryptoECKey(runtime, algUpper, curveName, extractable, usages, ecPub, nil)
		return keyObj, nil

	case "ED25519":
		_, hasD := jwkMap["d"]

		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			return nil, err
		}

		if hasD {
			priv, err := JWKToEd25519PrivateKey(jwkMap)
			if err != nil {
				return nil, err
			}
			if err := validateKeyUsagesSubset(usages, []string{"sign"}); err != nil {
				return nil, err
			}
			if len(priv) != ed25519.PrivateKeySize {
				return nil, fmt.Errorf("Invalid Ed25519 private key length: %d", len(priv))
			}
			pub := ed25519.PublicKey(priv[ed25519.SeedSize:])
			keyObj := newWebCryptoEd25519Key(runtime, false, extractable, usages, pub, priv)
			return keyObj, nil
		}

		pub, err := JWKToEd25519PublicKey(jwkMap)
		if err != nil {
			return nil, err
		}
		if err := validateKeyUsagesSubset(usages, []string{"verify"}); err != nil {
			return nil, err
		}
		keyObj := newWebCryptoEd25519Key(runtime, true, extractable, usages, pub, nil)
		return keyObj, nil

	default:
		return nil, fmt.Errorf("Algorithm not supported by subtle.importKey with 'jwk' format: %s", algName)
	}
}

// =========================================================================
// WebCrypto CryptoKey 基础实现（当前仅覆盖 AES-GCM secret key）
// =========================================================================

// WebCryptoKey 表示内部保存的 WebCrypto 密钥
type WebCryptoKey struct {
	Type        string // "secret" | "public" | "private"
	Algorithm   string // 如 "AES-GCM"、"HMAC" 等
	LengthBits  int    // 密钥长度（bit）
	Extractable bool
	Usages      []string
	Secret      []byte // 对称密钥原始字节（仅用于对称/HMAC 密钥）
	Hash        string // HMAC / RSA 等使用的哈希算法名称（如 "SHA-256"）
	RSAPublic   *rsa.PublicKey
	RSAPrivate  *rsa.PrivateKey
	ECPublic    *ecdsa.PublicKey
	ECPrivate   *ecdsa.PrivateKey
	Curve       string
	EdPublic    ed25519.PublicKey
	EdPrivate   ed25519.PrivateKey
	X25519Pub   []byte
	X25519Priv  []byte
}

// newWebCryptoSecretKey 创建 AES-GCM 等对称密钥的 CryptoKey JS 对象
func newWebCryptoSecretKey(runtime *goja.Runtime, algName string, lengthBits int, extractable bool, usages []string, secret []byte) *goja.Object {
	obj := runtime.NewObject()

	key := &WebCryptoKey{
		Type:        "secret",
		Algorithm:   strings.ToUpper(algName),
		LengthBits:  lengthBits,
		Extractable: extractable,
		Usages:      usages,
		Secret:      append([]byte(nil), secret...),
	}

	// WebCrypto 标准属性
	obj.Set("type", key.Type)
	algObj := runtime.NewObject()
	algObj.Set("name", key.Algorithm)
	algObj.Set("length", key.LengthBits)
	obj.Set("algorithm", algObj)
	obj.Set("extractable", key.Extractable)

	usagesArr := runtime.NewArray()
	for i, u := range key.Usages {
		usagesArr.Set(fmt.Sprintf("%d", i), u)
	}
	obj.Set("usages", usagesArr)

	// 内部句柄
	obj.Set("_handle", runtime.ToValue(key))

	return obj
}

func newWebCryptoRSAKey(runtime *goja.Runtime, algName string, hashName string, extractable bool, usages []string, publicKey *rsa.PublicKey, privateKey *rsa.PrivateKey) *goja.Object {
	obj := runtime.NewObject()
	upperAlg := strings.ToUpper(algName)
	upperHash := strings.ToUpper(hashName)
	// Node/WebCrypto 规范中 RSASSA-PKCS1-v1_5 使用小写的 v1_5 作为算法名称
	displayAlg := upperAlg
	if upperAlg == "RSASSA-PKCS1-V1_5" {
		displayAlg = "RSASSA-PKCS1-v1_5"
	}
	typeStr := "public"
	if privateKey != nil {
		typeStr = "private"
		publicKey = &privateKey.PublicKey
	}
	if publicKey == nil {
		panic(runtime.NewTypeError("Missing RSA key material"))
	}

	modulusBits := publicKey.N.BitLen()
	key := &WebCryptoKey{
		Type:        typeStr,
		Algorithm:   displayAlg,
		LengthBits:  modulusBits,
		Extractable: extractable,
		Usages:      usages,
		Hash:        upperHash,
		RSAPublic:   publicKey,
		RSAPrivate:  privateKey,
	}

	obj.Set("type", typeStr)
	algObj := runtime.NewObject()
	algObj.Set("name", displayAlg)
	algObj.Set("modulusLength", modulusBits)
	algObj.Set("publicExponent", runtime.ToValue(int64(publicKey.E)))
	hashObj := runtime.NewObject()
	hashObj.Set("name", upperHash)
	algObj.Set("hash", hashObj)
	obj.Set("algorithm", algObj)
	obj.Set("extractable", extractable)
	usagesArr := runtime.NewArray()
	for i, u := range usages {
		usagesArr.Set(fmt.Sprintf("%d", i), u)
	}
	obj.Set("usages", usagesArr)
	obj.Set("_handle", runtime.ToValue(key))
	return obj
}

// newWebCryptoHMACKey 创建 HMAC 对称密钥的 CryptoKey JS 对象
func newWebCryptoHMACKey(runtime *goja.Runtime, hashName string, lengthBits int, extractable bool, usages []string, secret []byte) *goja.Object {
	obj := runtime.NewObject()

	upperHash := strings.ToUpper(hashName)
	key := &WebCryptoKey{
		Type:        "secret",
		Algorithm:   "HMAC",
		LengthBits:  lengthBits,
		Extractable: extractable,
		Usages:      usages,
		Secret:      append([]byte(nil), secret...),
		Hash:        upperHash,
	}

	obj.Set("type", key.Type)
	algObj := runtime.NewObject()
	algObj.Set("name", "HMAC")
	algObj.Set("length", key.LengthBits)
	hashObj := runtime.NewObject()
	hashObj.Set("name", upperHash)
	algObj.Set("hash", hashObj)
	obj.Set("algorithm", algObj)
	obj.Set("extractable", key.Extractable)

	usagesArr := runtime.NewArray()
	for i, u := range key.Usages {
		usagesArr.Set(fmt.Sprintf("%d", i), u)
	}
	obj.Set("usages", usagesArr)

	obj.Set("_handle", runtime.ToValue(key))

	return obj
}

// getWebCryptoKey 从 JS 值中提取内部 WebCryptoKey 结构
func getWebCryptoKey(runtime *goja.Runtime, val goja.Value) *WebCryptoKey {
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return nil
	}
	obj := val.ToObject(runtime)
	if obj == nil {
		return nil
	}
	h := obj.Get("_handle")
	if h == nil || goja.IsUndefined(h) || goja.IsNull(h) {
		return nil
	}
	if key, ok := h.Export().(*WebCryptoKey); ok {
		return key
	}
	return nil
}

// WebCryptoGenerateKey 实现 subtle.generateKey（当前仅支持 AES-GCM secret key）
func WebCryptoGenerateKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	promise, resolve, reject := runtime.NewPromise()

	// 参数检查：algorithm, extractable, keyUsages
	if len(call.Arguments) < 3 {
		reject(runtime.NewTypeError("subtle.generateKey requires algorithm, extractable, and keyUsages arguments"))
		return runtime.ToValue(promise)
	}

	algVal := call.Arguments[0]
	extractableVal := call.Arguments[1]
	usagesVal := call.Arguments[2]

	// 解析 algorithm.name
	algName, algObj := parseWebCryptoAlgorithm(runtime, algVal)
	if algName == "" {
		reject(runtime.NewTypeError("The \"algorithm\" argument must have a valid name"))
		return runtime.ToValue(promise)
	}

	algNameUpper := strings.ToUpper(algName)

	switch algNameUpper {
	case "AES-GCM", "AES-CBC", "AES-CTR", "AES-KW":
		lengthBits, err := parseAesKeyLengthEx(runtime, algObj, true) // generateKey 需要明确的 length
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		extractable := extractableVal.ToBoolean()
		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			reject(handleKeyUsagesError(runtime, err))
			return runtime.ToValue(promise)
		}

		switch algNameUpper {
		case "AES-GCM":
			if err := validateKeyUsagesSubset(usages, []string{"encrypt", "decrypt", "wrapKey", "unwrapKey"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		case "AES-CBC":
			if err := validateKeyUsagesSubset(usages, []string{"encrypt", "decrypt", "wrapKey", "unwrapKey"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		case "AES-CTR":
			if err := validateKeyUsagesSubset(usages, []string{"encrypt", "decrypt"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		case "AES-KW":
			if err := validateKeyUsagesSubset(usages, []string{"wrapKey", "unwrapKey"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		}

		keyBytes := make([]byte, lengthBits/8)
		if _, err := rand.Read(keyBytes); err != nil {
			reject(runtime.NewGoError(fmt.Errorf("failed to generate AES key: %w", err)))
			return runtime.ToValue(promise)
		}

		keyObj := newWebCryptoSecretKey(runtime, algNameUpper, lengthBits, extractable, usages, keyBytes)
		resolve(keyObj)
		return runtime.ToValue(promise)

	case "HMAC":
		hashName, lengthBits, err := parseHmacParams(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		extractable := extractableVal.ToBoolean()
		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		if err := validateKeyUsagesSubset(usages, []string{"sign", "verify"}); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		keyBytes := make([]byte, lengthBits/8)
		if _, err := rand.Read(keyBytes); err != nil {
			reject(runtime.NewGoError(fmt.Errorf("failed to generate HMAC key: %w", err)))
			return runtime.ToValue(promise)
		}

		keyObj := newWebCryptoHMACKey(runtime, hashName, lengthBits, extractable, usages, keyBytes)
		resolve(keyObj)
		return runtime.ToValue(promise)

	case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5":
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" argument must be an object"))
			return runtime.ToValue(promise)
		}

		modulusVal := algObj.Get("modulusLength")
		if modulusVal == nil || goja.IsUndefined(modulusVal) || goja.IsNull(modulusVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object must have a 'modulusLength' member"))
			return runtime.ToValue(promise)
		}
		modulusLength := int(modulusVal.ToInteger())
		// WebCrypto 规范要求 RSA modulusLength 为 >= 1024 且为 8 的倍数。
		// Node.js 在这些条件不满足时会通过 OperationError 拒绝。
		// 实际行为上，Node.js v25 允许 512-bit RSA 密钥；这里与 Node 对齐，放宽下限到 512。
		if modulusLength < 512 || modulusLength%8 != 0 {
			reject(newOperationError(runtime, "Invalid RSA modulusLength; it must be a multiple of 8 and >= 512"))
			return runtime.ToValue(promise)
		}

		pubExpVal := algObj.Get("publicExponent")
		if pubExpVal == nil || goja.IsUndefined(pubExpVal) || goja.IsNull(pubExpVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object must have a 'publicExponent' member"))
			return runtime.ToValue(promise)
		}
		expBytes, err := convertToBytesInternal(runtime, pubExpVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"publicExponent\" member must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}
		// 校验 publicExponent 数值是否合法（必须为 >=3 的奇数），
		// 与 Node.js WebCrypto 的行为保持一致。
		if err := validateRsaPublicExponentBytes(expBytes); err != nil {
			reject(newOperationError(runtime, err.Error()))
			return runtime.ToValue(promise)
		}

		// 将 publicExponent 的 BufferSource 按大端解析为整数值，
		// 以便复用 GenerateRSAKeyWithExponent（支持 512-bit 等较小密钥）。
		exponent := 0
		for _, b := range expBytes {
			exponent = (exponent << 8) | int(b)
		}

		hashName, err := parseRsaHashParam(algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		extractable := extractableVal.ToBoolean()
		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		var allowed []string
		canonAlg := canonicalizeRsaAlgorithm(algNameUpper)
		if canonAlg == "RSA-OAEP" {
			allowed = []string{"encrypt", "decrypt", "wrapKey", "unwrapKey"}
		} else {
			allowed = []string{"sign", "verify"}
		}
		if err := validateKeyUsagesSubset(usages, allowed); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		// 使用自定义 RSA 生成函数，以支持 512-bit 等较小密钥长度，
		// 并与 crypto.generateKeyPair 的行为保持一致。
		privKey, err := GenerateRSAKeyWithExponent(rand.Reader, modulusLength, exponent)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("failed to generate RSA key pair: %w", err)))
			return runtime.ToValue(promise)
		}

		var pubUsages, privUsages []string
		for _, u := range usages {
			switch strings.ToLower(u) {
			case "encrypt", "wrapkey":
				if canonAlg == "RSA-OAEP" {
					pubUsages = append(pubUsages, u)
				}
			case "decrypt", "unwrapkey":
				if canonAlg == "RSA-OAEP" {
					privUsages = append(privUsages, u)
				}
			case "sign":
				if canonAlg != "RSA-OAEP" {
					privUsages = append(privUsages, u)
				}
			case "verify":
				if canonAlg != "RSA-OAEP" {
					pubUsages = append(pubUsages, u)
				}
			}
		}

		pubKeyObj := newWebCryptoRSAKey(runtime, canonAlg, hashName, extractable, pubUsages, &privKey.PublicKey, nil)
		privKeyObj := newWebCryptoRSAKey(runtime, canonAlg, hashName, extractable, privUsages, nil, privKey)

		pairObj := runtime.NewObject()
		pairObj.Set("publicKey", pubKeyObj)
		pairObj.Set("privateKey", privKeyObj)
		resolve(pairObj)
		return runtime.ToValue(promise)

	case "ECDSA", "ECDH":
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" argument must be an object"))
			return runtime.ToValue(promise)
		}
		namedCurveVal := algObj.Get("namedCurve")
		if namedCurveVal == nil || goja.IsUndefined(namedCurveVal) || goja.IsNull(namedCurveVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object must have a 'namedCurve' member"))
			return runtime.ToValue(promise)
		}
		curveName := SafeGetString(namedCurveVal)
		var curve elliptic.Curve
		switch curveName {
		case "P-256":
			curve = elliptic.P256()
		case "P-384":
			curve = elliptic.P384()
		case "P-521":
			curve = elliptic.P521()
		default:
			reject(runtime.NewTypeError(fmt.Sprintf("unsupported curve '%s'", curveName)))
			return runtime.ToValue(promise)
		}

		extractable := extractableVal.ToBoolean()
		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		if algNameUpper == "ECDSA" {
			if err := validateKeyUsagesSubset(usages, []string{"sign", "verify"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		} else {
			if err := validateKeyUsagesSubset(usages, []string{"deriveKey", "deriveBits"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		}

		privKey, err := ecdsa.GenerateKey(curve, rand.Reader)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("failed to generate EC key pair: %w", err)))
			return runtime.ToValue(promise)
		}

		var pubUsages, privUsages []string
		if algNameUpper == "ECDSA" {
			for _, u := range usages {
				switch strings.ToLower(u) {
				case "sign":
					privUsages = append(privUsages, u)
				case "verify":
					pubUsages = append(pubUsages, u)
				}
			}
		} else {
			// ECDH: 用于派生，usage 只赋给私钥
			privUsages = append(privUsages, usages...)
		}

		pubKeyObj := newWebCryptoECKey(runtime, algNameUpper, curveName, extractable, pubUsages, &privKey.PublicKey, nil)
		privKeyObj := newWebCryptoECKey(runtime, algNameUpper, curveName, extractable, privUsages, nil, privKey)

		pairObj := runtime.NewObject()
		pairObj.Set("publicKey", pubKeyObj)
		pairObj.Set("privateKey", privKeyObj)
		resolve(pairObj)
		return runtime.ToValue(promise)

	case "ED25519":
		extractable := extractableVal.ToBoolean()
		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		if err := validateKeyUsagesSubset(usages, []string{"sign", "verify"}); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		pubKey, privKey, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("failed to generate Ed25519 key pair: %w", err)))
			return runtime.ToValue(promise)
		}

		var pubUsages, privUsages []string
		for _, u := range usages {
			switch strings.ToLower(u) {
			case "sign":
				privUsages = append(privUsages, u)
			case "verify":
				pubUsages = append(pubUsages, u)
			}
		}

		pubKeyObj := newWebCryptoEd25519Key(runtime, true, extractable, pubUsages, pubKey, nil)
		privKeyObj := newWebCryptoEd25519Key(runtime, false, extractable, privUsages, pubKey, privKey)

		pairObj := runtime.NewObject()
		pairObj.Set("publicKey", pubKeyObj)
		pairObj.Set("privateKey", privKeyObj)
		resolve(pairObj)
		return runtime.ToValue(promise)

	case "X25519":
		extractable := extractableVal.ToBoolean()
		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		if err := validateKeyUsagesSubset(usages, []string{"deriveKey", "deriveBits"}); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		var privBytes [32]byte
		if _, err := rand.Read(privBytes[:]); err != nil {
			reject(runtime.NewGoError(fmt.Errorf("failed to generate X25519 key pair: %w", err)))
			return runtime.ToValue(promise)
		}
		var pubBytes [32]byte
		curve25519.ScalarBaseMult(&pubBytes, &privBytes)

		privSlice := make([]byte, 32)
		copy(privSlice, privBytes[:])
		pubSlice := make([]byte, 32)
		copy(pubSlice, pubBytes[:])

		// ECDH/X25519: usage 只赋给私钥
		pubKeyObj := newWebCryptoX25519Key(runtime, true, extractable, nil, pubSlice, nil)
		privKeyObj := newWebCryptoX25519Key(runtime, false, extractable, usages, pubSlice, privSlice)

		pairObj := runtime.NewObject()
		pairObj.Set("publicKey", pubKeyObj)
		pairObj.Set("privateKey", privKeyObj)
		resolve(pairObj)
		return runtime.ToValue(promise)

	default:
		// 其他算法暂不支持，返回 NotSupported 风格错误
		reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.generateKey: %s", algName)))
		return runtime.ToValue(promise)
	}
}

// parseAesCbcParams 解析 AES-CBC 算法参数（iv）
func parseAesCbcParams(runtime *goja.Runtime, algObj *goja.Object) (iv []byte, err error) {
	if algObj == nil {
		err = fmt.Errorf("The \"algorithm\" object for AES-CBC must have an 'iv' member")
		return
	}
	ivVal := algObj.Get("iv")
	if ivVal == nil || goja.IsUndefined(ivVal) || goja.IsNull(ivVal) {
		err = fmt.Errorf("The \"algorithm\" object for AES-CBC must have an 'iv' member")
		return
	}
	iv, err = convertToBytesInternal(runtime, ivVal, true)
	if err != nil {
		err = fmt.Errorf("The \"iv\" member must be a BufferSource. %v", err)
		return
	}
	// AES-CBC 要求 16 字节 IV
	if len(iv) != 16 {
		err = fmt.Errorf("The \"iv\" member must be 16 bytes long for AES-CBC")
		return
	}
	return
}

// parseAesCtrParams 解析 AES-CTR 算法参数（counter / length）
func parseAesCtrParams(runtime *goja.Runtime, algObj *goja.Object) (counter []byte, lengthBits int, err error) {
	if algObj == nil {
		err = fmt.Errorf("The \"algorithm\" object for AES-CTR must have 'counter' and 'length' members")
		return
	}

	ctrVal := algObj.Get("counter")
	if ctrVal == nil || goja.IsUndefined(ctrVal) || goja.IsNull(ctrVal) {
		err = fmt.Errorf("The \"algorithm\" object for AES-CTR must have a 'counter' member")
		return
	}
	counter, err = convertToBytesInternal(runtime, ctrVal, true)
	if err != nil {
		err = fmt.Errorf("The \"counter\" member must be a BufferSource. %v", err)
		return
	}
	if len(counter) != 16 {
		err = fmt.Errorf("The \"counter\" member must be 16 bytes long")
		return
	}

	lenVal := algObj.Get("length")
	if lenVal == nil || goja.IsUndefined(lenVal) || goja.IsNull(lenVal) {
		err = fmt.Errorf("The \"algorithm\" object for AES-CTR must have a 'length' member")
		return
	}

	exported := lenVal.Export()
	switch exported.(type) {
	case int, int32, int64, float32, float64:
		bits := int(lenVal.ToInteger())
		if bits <= 0 || bits > 128 {
			err = fmt.Errorf("The \"length\" member must be between 1 and 128")
			return
		}
		lengthBits = bits
		return
	default:
		err = fmt.Errorf("The \"length\" member must be a number")
		return
	}
}

func newWebCryptoECKey(runtime *goja.Runtime, algName string, curveName string, extractable bool, usages []string, publicKey *ecdsa.PublicKey, privateKey *ecdsa.PrivateKey) *goja.Object {
	obj := runtime.NewObject()
	typeStr := "public"
	if privateKey != nil {
		typeStr = "private"
		if publicKey == nil {
			publicKey = &privateKey.PublicKey
		}
	} else if publicKey == nil {
		panic(runtime.NewTypeError("Missing EC key material"))
	}

	lengthBits := 0
	if publicKey != nil && publicKey.Curve != nil && publicKey.Curve.Params() != nil {
		lengthBits = publicKey.Curve.Params().BitSize
	}

	key := &WebCryptoKey{
		Type:        typeStr,
		Algorithm:   strings.ToUpper(algName),
		LengthBits:  lengthBits,
		Extractable: extractable,
		Usages:      usages,
		ECPublic:    publicKey,
		ECPrivate:   privateKey,
		Curve:       curveName,
	}

	obj.Set("type", typeStr)
	algObj := runtime.NewObject()
	algObj.Set("name", strings.ToUpper(algName))
	algObj.Set("namedCurve", curveName)
	obj.Set("algorithm", algObj)
	obj.Set("extractable", extractable)

	usagesArr := runtime.NewArray()
	for i, u := range usages {
		usagesArr.Set(fmt.Sprintf("%d", i), u)
	}
	obj.Set("usages", usagesArr)

	obj.Set("_handle", runtime.ToValue(key))
	return obj
}

func newWebCryptoEd25519Key(runtime *goja.Runtime, isPublic bool, extractable bool, usages []string, publicKey ed25519.PublicKey, privateKey ed25519.PrivateKey) *goja.Object {
	obj := runtime.NewObject()
	typeStr := "public"
	if !isPublic {
		typeStr = "private"
	}
	key := &WebCryptoKey{
		Type:        typeStr,
		Algorithm:   "ED25519",
		LengthBits:  256,
		Extractable: extractable,
		Usages:      usages,
		EdPublic:    publicKey,
		EdPrivate:   privateKey,
	}

	obj.Set("type", typeStr)
	algObj := runtime.NewObject()
	algObj.Set("name", "Ed25519")
	obj.Set("algorithm", algObj)
	obj.Set("extractable", extractable)

	usagesArr := runtime.NewArray()
	for i, u := range usages {
		usagesArr.Set(fmt.Sprintf("%d", i), u)
	}
	obj.Set("usages", usagesArr)

	obj.Set("_handle", runtime.ToValue(key))
	return obj
}

func newWebCryptoX25519Key(runtime *goja.Runtime, isPublic bool, extractable bool, usages []string, publicKey []byte, privateKey []byte) *goja.Object {
	obj := runtime.NewObject()
	typeStr := "public"
	if !isPublic {
		typeStr = "private"
	}

	key := &WebCryptoKey{
		Type:        typeStr,
		Algorithm:   "X25519",
		LengthBits:  256,
		Extractable: extractable,
		Usages:      usages,
		X25519Pub:   publicKey,
		X25519Priv:  privateKey,
	}

	obj.Set("type", typeStr)
	algObj := runtime.NewObject()
	algObj.Set("name", "X25519")
	obj.Set("algorithm", algObj)
	obj.Set("extractable", extractable)

	usagesArr := runtime.NewArray()
	for i, u := range usages {
		usagesArr.Set(fmt.Sprintf("%d", i), u)
	}
	obj.Set("usages", usagesArr)

	obj.Set("_handle", runtime.ToValue(key))
	return obj
}

// parseHmacParams 解析 HMAC 算法参数（hash / length）
func parseHmacParams(runtime *goja.Runtime, algObj *goja.Object) (string, int, error) {
	if algObj == nil {
		return "", 0, fmt.Errorf("The \"algorithm\" object for HMAC must have a 'hash' member")
	}
	hashVal := algObj.Get("hash")
	if hashVal == nil || goja.IsUndefined(hashVal) || goja.IsNull(hashVal) {
		return "", 0, fmt.Errorf("The \"algorithm\" object for HMAC must have a 'hash' member")
	}

	// hash 可以是对象 { name: "SHA-256" } 或字符串 "SHA-256"
	var hashName string
	if hashObj, ok := hashVal.(*goja.Object); ok && hashObj != nil {
		hashName = SafeGetString(hashObj.Get("name"))
	} else {
		hashName = SafeGetString(hashVal)
	}
	if hashName == "" {
		return "", 0, fmt.Errorf("The \"hash\" member must specify a valid hash algorithm")
	}

	upperHash := strings.ToUpper(hashName)
	_, defaultBits, err := getHmacHashFactory(upperHash)
	if err != nil {
		return "", 0, err
	}
	lengthBits := defaultBits

	// 可选 length 字段
	lenVal := algObj.Get("length")
	if lenVal != nil && !goja.IsUndefined(lenVal) && !goja.IsNull(lenVal) {
		exported := lenVal.Export()
		switch exported.(type) {
		case int, int32, int64, float32, float64:
			bits := int(lenVal.ToInteger())
			if bits <= 0 || bits%8 != 0 {
				return "", 0, fmt.Errorf("The \"length\" member for HMAC must be a positive multiple of 8")
			}
			lengthBits = bits
		default:
			return "", 0, fmt.Errorf("The \"length\" member must be a number")
		}
	}

	return upperHash, lengthBits, nil
}

// getHmacHashFactory 根据哈希名称返回对应的 HMAC 底层哈希工厂及默认密钥长度
func getHmacHashFactory(hashName string) (func() hash.Hash, int, error) {
	switch strings.ToUpper(hashName) {
	case "SHA-1":
		return sha1.New, 160, nil
	case "SHA-256":
		return sha256.New, 256, nil
	case "SHA-384":
		return sha512.New384, 384, nil
	case "SHA-512":
		return sha512.New, 512, nil
	default:
		return nil, 0, fmt.Errorf("Unsupported HMAC hash algorithm: %s", hashName)
	}
}

// parseWebCryptoAlgorithm 解析 algorithm 参数，返回 name 和对象形式
func parseWebCryptoAlgorithm(runtime *goja.Runtime, algVal goja.Value) (string, *goja.Object) {
	if algVal == nil || goja.IsUndefined(algVal) || goja.IsNull(algVal) {
		return "", nil
	}
	if obj, ok := algVal.(*goja.Object); ok && obj != nil {
		nameVal := obj.Get("name")
		name := strings.TrimSpace(SafeGetString(nameVal))
		return name, obj
	}
	// 允许直接传 string
	name := strings.TrimSpace(SafeGetString(algVal))
	return name, nil
}

// parseAesKeyLength 获取 AES 密钥长度（bit）
func parseAesKeyLength(runtime *goja.Runtime, algObj *goja.Object) (int, error) {
	return parseAesKeyLengthEx(runtime, algObj, false)
}

// parseAesKeyLengthEx 获取 AES 密钥长度（bit），requireLength 为 true 时强制要求 length 参数
func parseAesKeyLengthEx(runtime *goja.Runtime, algObj *goja.Object, requireLength bool) (int, error) {
	if algObj == nil {
		if requireLength {
			return 0, fmt.Errorf("The \"algorithm\" object must have a 'length' member")
		}
		// 未提供对象形式时，默认 256 bit
		return 256, nil
	}
	lenVal := algObj.Get("length")
	if lenVal == nil || goja.IsUndefined(lenVal) || goja.IsNull(lenVal) {
		if requireLength {
			return 0, fmt.Errorf("The \"algorithm\" object must have a 'length' member")
		}
		// 未指定长度时，默认 256 bit
		return 256, nil
	}

	exported := lenVal.Export()
	switch exported.(type) {
	case int, int32, int64, float32, float64:
		length := int(lenVal.ToInteger())
		if length != 128 && length != 192 && length != 256 {
			return 0, fmt.Errorf("The \"length\" member must be 128, 192, or 256 for AES-GCM. Received %d", length)
		}
		return length, nil
	default:
		return 0, fmt.Errorf("The \"length\" member must be a number")
	}
}

// parseKeyUsages 解析 keyUsages 数组
func parseKeyUsages(runtime *goja.Runtime, usagesVal goja.Value) ([]string, error) {
	if usagesVal == nil || goja.IsUndefined(usagesVal) || goja.IsNull(usagesVal) {
		return nil, fmt.Errorf("The \"keyUsages\" argument must be a non-empty array")
	}

	obj, ok := usagesVal.(*goja.Object)
	if !ok || obj == nil {
		return nil, fmt.Errorf("The \"keyUsages\" argument must be an Array")
	}
	lengthVal := obj.Get("length")
	if lengthVal == nil || goja.IsUndefined(lengthVal) || goja.IsNull(lengthVal) {
		return nil, fmt.Errorf("The \"keyUsages\" argument must be an Array")
	}
	length := int(lengthVal.ToInteger())
	if length <= 0 {
		return nil, fmt.Errorf("The \"keyUsages\" argument must be a non-empty array")
	}

	usages := make([]string, 0, length)
	for i := 0; i < length; i++ {
		val := obj.Get(fmt.Sprintf("%d", i))
		if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
			continue
		}
		raw := SafeGetString(val)
		uLower := strings.ToLower(raw)
		if uLower == "" {
			return nil, fmt.Errorf("keyUsages[%d] must be a non-empty string", i)
		}
		var canonical string
		switch uLower {
		case "encrypt":
			canonical = "encrypt"
		case "decrypt":
			canonical = "decrypt"
		case "wrapkey":
			canonical = "wrapKey"
		case "unwrapkey":
			canonical = "unwrapKey"
		case "sign":
			canonical = "sign"
		case "verify":
			canonical = "verify"
		case "derivekey":
			canonical = "deriveKey"
		case "derivebits":
			canonical = "deriveBits"
		default:
			return nil, fmt.Errorf("Unsupported key usage: %s", raw)
		}
		usages = append(usages, canonical)
	}

	if len(usages) == 0 {
		return nil, fmt.Errorf("The \"keyUsages\" argument must contain at least one supported usage")
	}
	return usages, nil
}

// handleKeyUsagesError 处理 parseKeyUsages 返回的错误，空数组错误转换为 SyntaxError
func handleKeyUsagesError(runtime *goja.Runtime, err error) goja.Value {
	if err == nil {
		return nil
	}
	errMsg := err.Error()
	// 空用法数组应返回 SyntaxError
	if strings.Contains(errMsg, "non-empty") {
		syntaxErr := runtime.NewTypeError(errMsg)
		errObj := syntaxErr.ToObject(runtime)
		errObj.Set("name", "SyntaxError")
		return errObj
	}
	// 其他错误返回 TypeError
	return runtime.NewTypeError(errMsg)
}

// hasKeyUsage 检查 CryptoKey 是否包含指定用途
func hasKeyUsage(usages []string, want string) bool {
	w := strings.ToLower(want)
	for _, u := range usages {
		if strings.ToLower(u) == w {
			return true
		}
	}
	return false
}

// parseAesGcmParams 解析 AES-GCM 算法参数（iv / additionalData / tagLength）
func parseAesGcmParams(runtime *goja.Runtime, algObj *goja.Object) (iv []byte, aad []byte, tagLenBits int, err error) {
	if algObj == nil {
		err = fmt.Errorf("The \"algorithm\" object for AES-GCM must have an 'iv' member")
		return
	}
	ivVal := algObj.Get("iv")
	if ivVal == nil || goja.IsUndefined(ivVal) || goja.IsNull(ivVal) {
		err = fmt.Errorf("The \"algorithm\" object for AES-GCM must have an 'iv' member")
		return
	}
	iv, err = convertToBytesInternal(runtime, ivVal, true)
	if err != nil {
		err = fmt.Errorf("The \"iv\" member must be a BufferSource. %v", err)
		return
	}
	// 允许 12 字节或 16 字节 IV：8 字节等其它长度视为错误
	if len(iv) != 12 && len(iv) != 16 {
		err = fmt.Errorf("The \"iv\" member must be 12 or 16 bytes long for AES-GCM")
		return
	}

	// additionalData（可选）
	aadVal := algObj.Get("additionalData")
	if aadVal != nil && !goja.IsUndefined(aadVal) && !goja.IsNull(aadVal) {
		aad, err = convertToBytesInternal(runtime, aadVal, true)
		if err != nil {
			err = fmt.Errorf("The \"additionalData\" member must be a BufferSource. %v", err)
			return
		}
	}

	// tagLength（bit，可选，默认 128）
	tagVal := algObj.Get("tagLength")
	if tagVal == nil || goja.IsUndefined(tagVal) || goja.IsNull(tagVal) {
		tagLenBits = 128
		return
	}

	exported := tagVal.Export()
	switch exported.(type) {
	case int, int32, int64, float32, float64:
		bits := int(tagVal.ToInteger())
		if bits%8 != 0 {
			err = fmt.Errorf("The \"tagLength\" member must be a multiple of 8")
			return
		}
		if bits < 32 || bits > 128 {
			err = fmt.Errorf("The \"tagLength\" member must be between 32 and 128")
			return
		}
		tagLenBits = bits
		return
	default:
		err = fmt.Errorf("The \"tagLength\" member must be a number")
		return
	}
}

// getAesGcmCipherName 根据密钥长度返回 OpenSSL cipher 名称
func getAesGcmCipherName(keyLen int) (string, error) {
	switch keyLen {
	case 16:
		return "aes-128-gcm", nil
	case 24:
		return "aes-192-gcm", nil
	case 32:
		return "aes-256-gcm", nil
	default:
		return "", fmt.Errorf("Invalid AES-GCM key length: %d", keyLen)
	}
}

// getAesCbcCipherName 根据密钥长度返回 OpenSSL AES-CBC cipher 名称
func getAesCbcCipherName(keyLen int) (string, error) {
	switch keyLen {
	case 16:
		return "aes-128-cbc", nil
	case 24:
		return "aes-192-cbc", nil
	case 32:
		return "aes-256-cbc", nil
	default:
		return "", fmt.Errorf("Invalid AES-CBC key length: %d", keyLen)
	}
}

// getAesCtrCipherName 根据密钥长度返回 OpenSSL AES-CTR cipher 名称
func getAesCtrCipherName(keyLen int) (string, error) {
	switch keyLen {
	case 16:
		return "aes-128-ctr", nil
	case 24:
		return "aes-192-ctr", nil
	case 32:
		return "aes-256-ctr", nil
	default:
		return "", fmt.Errorf("Invalid AES-CTR key length: %d", keyLen)
	}
}

// getAesKwCipherName 根据密钥长度返回 OpenSSL AES-KW cipher 名称
func getAesKwCipherName(keyLen int) (string, error) {
	switch keyLen {
	case 16:
		return "aes128-wrap", nil
	case 24:
		return "aes192-wrap", nil
	case 32:
		return "aes256-wrap", nil
	default:
		return "", fmt.Errorf("Invalid AES-KW key length: %d", keyLen)
	}
}

func getAesKwpCipherName(keyLen int) (string, error) {
	switch keyLen {
	case 16:
		return "aes128-wrap-pad", nil
	case 24:
		return "aes192-wrap-pad", nil
	case 32:
		return "aes256-wrap-pad", nil
	default:
		return "", fmt.Errorf("Invalid AES-KW key length: %d", keyLen)
	}
}

// WebCryptoEncrypt 实现 subtle.encrypt（当前仅支持 AES-GCM secret key）
func WebCryptoEncrypt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	promise, resolve, reject := runtime.NewPromise()

	if len(call.Arguments) < 3 {
		reject(runtime.NewTypeError("subtle.encrypt requires algorithm, key, and data arguments"))
		return runtime.ToValue(promise)
	}

	algVal := call.Arguments[0]
	keyVal := call.Arguments[1]
	dataVal := call.Arguments[2]

	key := getWebCryptoKey(runtime, keyVal)
	if key == nil {
		reject(runtime.NewTypeError("The provided key is not a valid CryptoKey"))
		return runtime.ToValue(promise)
	}

	algName, algObj := parseWebCryptoAlgorithm(runtime, algVal)
	if algName == "" {
		reject(runtime.NewTypeError("The \"algorithm\" argument must have a valid name"))
		return runtime.ToValue(promise)
	}
	algUpper := strings.ToUpper(algName)

	switch strings.ToUpper(key.Algorithm) {
	case "AES-GCM":
		if key.Type != "secret" {
			reject(runtime.NewTypeError("The provided key is not a valid CryptoKey of type 'secret'"))
			return runtime.ToValue(promise)
		}
		if algUpper != "AES-GCM" {
			// 算法与密钥不匹配，应视为访问错误，测试接受 InvalidAccessError 或包含 algorithm 的错误信息
			reject(newInvalidAccessError(runtime, "Algorithm does not match key algorithm for encrypt operation"))
			return runtime.ToValue(promise)
		}
		if !hasKeyUsage(key.Usages, "encrypt") && !hasKeyUsage(key.Usages, "wrapkey") {
			reject(newInvalidAccessError(runtime, "CryptoKey does not allow 'encrypt' usage"))
			return runtime.ToValue(promise)
		}

		iv, aad, tagLenBits, err := parseAesGcmParams(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		tagLenBytes := tagLenBits / 8

		plaintext, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		cipherName, err := getAesGcmCipherName(len(key.Secret))
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ctx, err := NewCipherCtxByName(cipherName, key.Secret, iv, true)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		if len(aad) > 0 {
			if err := ctx.SetAAD(aad); err != nil {
				reject(runtime.NewGoError(err))
				return runtime.ToValue(promise)
			}
		}

		out1, err := ctx.Update(plaintext)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		ciphertext := append(out1, out2...)

		tag, err := ctx.GetTag(tagLenBytes)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}

		result := append(ciphertext, tag...)
		resolve(runtime.NewArrayBuffer(result))
		return runtime.ToValue(promise)

	case "AES-CBC":
		if key.Type != "secret" {
			reject(runtime.NewTypeError("The provided key is not a valid CryptoKey of type 'secret'"))
			return runtime.ToValue(promise)
		}
		if algUpper != "AES-CBC" {
			// 算法与密钥不匹配，同样抛出 InvalidAccessError
			reject(newInvalidAccessError(runtime, "Algorithm does not match key algorithm for encrypt operation"))
			return runtime.ToValue(promise)
		}
		if !hasKeyUsage(key.Usages, "encrypt") && !hasKeyUsage(key.Usages, "wrapkey") {
			reject(newInvalidAccessError(runtime, "CryptoKey does not allow 'encrypt' usage"))
			return runtime.ToValue(promise)
		}

		iv, err := parseAesCbcParams(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		plaintext, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		cipherName, err := getAesCbcCipherName(len(key.Secret))
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ctx, err := NewCipherCtxByName(cipherName, key.Secret, iv, true)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		out1, err := ctx.Update(plaintext)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		ciphertext := append(out1, out2...)
		resolve(runtime.NewArrayBuffer(ciphertext))
		return runtime.ToValue(promise)

	case "AES-CTR":
		if key.Type != "secret" {
			reject(runtime.NewTypeError("The provided key is not a valid CryptoKey of type 'secret'"))
			return runtime.ToValue(promise)
		}
		if algUpper != "AES-CTR" {
			reject(runtime.NewTypeError("Algorithm.name must be 'AES-CTR' for this key"))
			return runtime.ToValue(promise)
		}
		if !hasKeyUsage(key.Usages, "encrypt") {
			reject(newInvalidAccessError(runtime, "CryptoKey does not allow 'encrypt' usage"))
			return runtime.ToValue(promise)
		}

		counter, _, err := parseAesCtrParams(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		plaintext, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		cipherName, err := getAesCtrCipherName(len(key.Secret))
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ctx, err := NewCipherCtxByName(cipherName, key.Secret, counter, true)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		out1, err := ctx.Update(plaintext)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		ciphertext := append(out1, out2...)
		resolve(runtime.NewArrayBuffer(ciphertext))
		return runtime.ToValue(promise)

	case "RSA-OAEP":
		if key.Type != "public" || key.RSAPublic == nil {
			reject(runtime.NewTypeError("RSA-OAEP encryption requires a public RSA key"))
			return runtime.ToValue(promise)
		}
		if algUpper != "RSA-OAEP" {
			reject(runtime.NewTypeError("Algorithm.name must be 'RSA-OAEP' for this key"))
			return runtime.ToValue(promise)
		}
		if !hasKeyUsage(key.Usages, "encrypt") && !hasKeyUsage(key.Usages, "wrapkey") {
			reject(runtime.NewTypeError("CryptoKey does not allow 'encrypt' usage"))
			return runtime.ToValue(promise)
		}

		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" object for RSA-OAEP must include parameters"))
			return runtime.ToValue(promise)
		}
		hashName := key.Hash
		if hashName == "" {
			var err error
			hashName, err = parseRsaHashParam(algObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		}
		label, err := parseRsaOaepLabel(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		plaintext, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		hashFunc, err := GetHashFunction(hashName)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}

		// RSA-OAEP 明文长度上限：k - 2*hLen - 2，其中 k 为模数字节长度，hLen 为哈希输出长度
		modulusBytes := (key.RSAPublic.N.BitLen() + 7) / 8
		hLen := hashFunc.Size()
		maxPlainLen := modulusBytes - 2*hLen - 2
		if maxPlainLen < 0 {
			reject(newOperationError(runtime, "RSA-OAEP parameters are invalid"))
			return runtime.ToValue(promise)
		}
		if len(plaintext) > maxPlainLen {
			reject(newOperationError(runtime, "RSA-OAEP data too large for key size"))
			return runtime.ToValue(promise)
		}

		ciphertext, err := rsa.EncryptOAEP(hashFunc, rand.Reader, key.RSAPublic, plaintext, label)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("RSA-OAEP encryption failed: %w", err)))
			return runtime.ToValue(promise)
		}
		resolve(runtime.NewArrayBuffer(ciphertext))
		return runtime.ToValue(promise)

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.encrypt for key algorithm %s", key.Algorithm)))
		return runtime.ToValue(promise)
	}
}

// WebCryptoDecrypt 实现 subtle.decrypt（当前仅支持 AES-GCM secret key）
func WebCryptoDecrypt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	promise, resolve, reject := runtime.NewPromise()

	if len(call.Arguments) < 3 {
		reject(runtime.NewTypeError("subtle.decrypt requires algorithm, key, and data arguments"))
		return runtime.ToValue(promise)
	}

	algVal := call.Arguments[0]
	keyVal := call.Arguments[1]
	dataVal := call.Arguments[2]

	key := getWebCryptoKey(runtime, keyVal)
	if key == nil {
		reject(runtime.NewTypeError("The provided key is not a valid CryptoKey"))
		return runtime.ToValue(promise)
	}

	algName, algObj := parseWebCryptoAlgorithm(runtime, algVal)
	if algName == "" {
		reject(runtime.NewTypeError("The \"algorithm\" argument must have a valid name"))
		return runtime.ToValue(promise)
	}
	algUpper := strings.ToUpper(algName)

	switch strings.ToUpper(key.Algorithm) {
	case "AES-GCM":
		if key.Type != "secret" {
			reject(runtime.NewTypeError("The provided key is not a valid CryptoKey of type 'secret'"))
			return runtime.ToValue(promise)
		}
		if algUpper != "AES-GCM" {
			reject(runtime.NewTypeError("Algorithm.name must be 'AES-GCM' for this key"))
			return runtime.ToValue(promise)
		}
		if !hasKeyUsage(key.Usages, "decrypt") && !hasKeyUsage(key.Usages, "unwrapkey") {
			reject(newInvalidAccessError(runtime, "CryptoKey does not allow 'decrypt' usage"))
			return runtime.ToValue(promise)
		}

		iv, aad, tagLenBits, err := parseAesGcmParams(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		tagLenBytes := tagLenBits / 8

		ciphertextWithTag, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}
		if len(ciphertextWithTag) < tagLenBytes {
			reject(runtime.NewTypeError("Ciphertext is too short for the given tagLength"))
			return runtime.ToValue(promise)
		}

		ciphertext := ciphertextWithTag[:len(ciphertextWithTag)-tagLenBytes]
		tag := ciphertextWithTag[len(ciphertextWithTag)-tagLenBytes:]

		cipherName, err := getAesGcmCipherName(len(key.Secret))
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ctx, err := NewCipherCtxByName(cipherName, key.Secret, iv, false)
		if err != nil {
			reject(newOperationError(runtime, "AES-GCM decryption failed"))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		if err := ctx.SetTag(tag); err != nil {
			reject(newOperationError(runtime, "AES-GCM decryption failed"))
			return runtime.ToValue(promise)
		}
		if len(aad) > 0 {
			if err := ctx.SetAAD(aad); err != nil {
				reject(newOperationError(runtime, "AES-GCM decryption failed"))
				return runtime.ToValue(promise)
			}
		}

		out1, err := ctx.Update(ciphertext)
		if err != nil {
			reject(newOperationError(runtime, "AES-GCM decryption failed"))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(newOperationError(runtime, "AES-GCM decryption failed"))
			return runtime.ToValue(promise)
		}
		plaintext := append(out1, out2...)
		resolve(runtime.NewArrayBuffer(plaintext))
		return runtime.ToValue(promise)

	case "AES-CBC":
		if key.Type != "secret" {
			reject(runtime.NewTypeError("The provided key is not a valid CryptoKey of type 'secret'"))
			return runtime.ToValue(promise)
		}
		if algUpper != "AES-CBC" {
			reject(runtime.NewTypeError("Algorithm.name must be 'AES-CBC' for this key"))
			return runtime.ToValue(promise)
		}
		if !hasKeyUsage(key.Usages, "decrypt") && !hasKeyUsage(key.Usages, "unwrapkey") {
			reject(runtime.NewTypeError("CryptoKey does not allow 'decrypt' usage"))
			return runtime.ToValue(promise)
		}

		iv, err := parseAesCbcParams(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ciphertext, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		cipherName, err := getAesCbcCipherName(len(key.Secret))
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ctx, err := NewCipherCtxByName(cipherName, key.Secret, iv, false)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		out1, err := ctx.Update(ciphertext)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		plaintext := append(out1, out2...)
		resolve(runtime.NewArrayBuffer(plaintext))
		return runtime.ToValue(promise)

	case "AES-CTR":
		if key.Type != "secret" {
			reject(runtime.NewTypeError("The provided key is not a valid CryptoKey of type 'secret'"))
			return runtime.ToValue(promise)
		}
		if algUpper != "AES-CTR" {
			reject(runtime.NewTypeError("Algorithm.name must be 'AES-CTR' for this key"))
			return runtime.ToValue(promise)
		}
		if !hasKeyUsage(key.Usages, "decrypt") {
			reject(newInvalidAccessError(runtime, "CryptoKey does not allow 'decrypt' usage"))
			return runtime.ToValue(promise)
		}

		counter, _, err := parseAesCtrParams(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ciphertext, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		cipherName, err := getAesCtrCipherName(len(key.Secret))
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ctx, err := NewCipherCtxByName(cipherName, key.Secret, counter, false)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		out1, err := ctx.Update(ciphertext)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		plaintext := append(out1, out2...)
		resolve(runtime.NewArrayBuffer(plaintext))
		return runtime.ToValue(promise)

	case "RSA-OAEP":
		if key.Type != "private" || key.RSAPrivate == nil {
			reject(runtime.NewTypeError("RSA-OAEP decryption requires a private RSA key"))
			return runtime.ToValue(promise)
		}
		if algUpper != "RSA-OAEP" {
			reject(runtime.NewTypeError("Algorithm.name must be 'RSA-OAEP' for this key"))
			return runtime.ToValue(promise)
		}
		if !hasKeyUsage(key.Usages, "decrypt") && !hasKeyUsage(key.Usages, "unwrapkey") {
			reject(runtime.NewTypeError("CryptoKey does not allow 'decrypt' usage"))
			return runtime.ToValue(promise)
		}
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" object for RSA-OAEP must include parameters"))
			return runtime.ToValue(promise)
		}

		hashName := key.Hash
		if hashName == "" {
			var err error
			hashName, err = parseRsaHashParam(algObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		}
		label, err := parseRsaOaepLabel(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ciphertext, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		hashFunc, err := GetHashFunction(hashName)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}

		plaintext, err := rsa.DecryptOAEP(hashFunc, rand.Reader, key.RSAPrivate, ciphertext, label)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("RSA-OAEP decryption failed: %w", err)))
			return runtime.ToValue(promise)
		}
		resolve(runtime.NewArrayBuffer(plaintext))
		return runtime.ToValue(promise)

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.decrypt for key algorithm %s", key.Algorithm)))
		return runtime.ToValue(promise)
	}
}

// WebCryptoImportKey 实现 subtle.importKey（当前仅支持 AES-GCM secret key 的 raw 格式）
func WebCryptoImportKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	promise, resolve, reject := runtime.NewPromise()

	// format, keyData, algorithm, extractable, keyUsages
	if len(call.Arguments) < 5 {
		reject(runtime.NewTypeError("subtle.importKey requires format, keyData, algorithm, extractable, and keyUsages arguments"))
		return runtime.ToValue(promise)
	}

	formatVal := call.Arguments[0]
	keyDataVal := call.Arguments[1]
	algVal := call.Arguments[2]
	extractableVal := call.Arguments[3]
	usagesVal := call.Arguments[4]

	format := strings.ToLower(SafeGetString(formatVal))

	algName, algObj := parseWebCryptoAlgorithm(runtime, algVal)
	algUpper := strings.ToUpper(algName)

	switch format {
	case "raw":
		keyBytes, err := convertToBytesInternal(runtime, keyDataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"keyData\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}
		if len(keyBytes) == 0 {
			reject(runtime.NewTypeError("The \"keyData\" argument must not be empty"))
			return runtime.ToValue(promise)
		}
		keyLenBits := len(keyBytes) * 8

		switch algUpper {
		case "AES-GCM":
			if keyLenBits != 128 && keyLenBits != 192 && keyLenBits != 256 {
				reject(runtime.NewTypeError(fmt.Sprintf("Invalid AES-GCM raw key length: %d bits", keyLenBits)))
				return runtime.ToValue(promise)
			}

			// 如果 algorithm.length 存在，则验证与 keyData 匹配
			if algObj != nil {
				lenVal := algObj.Get("length")
				if lenVal != nil && !goja.IsUndefined(lenVal) && !goja.IsNull(lenVal) {
					if exported := lenVal.Export(); exported != nil {
						switch exported.(type) {
						case int, int32, int64, float32, float64:
							algLen := int(lenVal.ToInteger())
							if algLen != keyLenBits {
								reject(runtime.NewTypeError(fmt.Sprintf("The AES-GCM keyData length (%d) does not match algorithm.length (%d)", keyLenBits, algLen)))
								return runtime.ToValue(promise)
							}
						default:
							reject(runtime.NewTypeError("The \"length\" member must be a number"))
							return runtime.ToValue(promise)
						}
					}
				}
			}

			extractable := extractableVal.ToBoolean()
			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				// 使用 handleKeyUsagesError，将空数组错误映射为 SyntaxError，其他维持 TypeError
				reject(handleKeyUsagesError(runtime, err))
				return runtime.ToValue(promise)
			}
			// AES-GCM 仅允许 encrypt/decrypt/wrapKey/unwrapKey 用法
			if err := validateKeyUsagesSubset(usages, []string{"encrypt", "decrypt", "wrapKey", "unwrapKey"}); err != nil {
				// 返回 TypeError，message 中包含 usage，满足测试对 "无效用法" 的判断
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			keyObj := newWebCryptoSecretKey(runtime, "AES-GCM", keyLenBits, extractable, usages, keyBytes)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "HMAC":
			// HMAC raw 密钥导入
			if keyLenBits <= 0 {
				reject(runtime.NewTypeError("The \"keyData\" length for HMAC must be > 0"))
				return runtime.ToValue(promise)
			}

			hashName, _, err := parseHmacParams(runtime, algObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			// 如果 algorithm.length 存在，则验证与 keyData 匹配
			if algObj != nil {
				lenVal := algObj.Get("length")
				if lenVal != nil && !goja.IsUndefined(lenVal) && !goja.IsNull(lenVal) {
					if exported := lenVal.Export(); exported != nil {
						switch exported.(type) {
						case int, int32, int64, float32, float64:
							algLen := int(lenVal.ToInteger())
							if algLen != keyLenBits {
								reject(runtime.NewTypeError(fmt.Sprintf("The HMAC keyData length (%d) does not match algorithm.length (%d)", keyLenBits, algLen)))
								return runtime.ToValue(promise)
							}
						default:
							reject(runtime.NewTypeError("The \"length\" member must be a number"))
							return runtime.ToValue(promise)
						}
					}
				}
			}

			extractable := extractableVal.ToBoolean()
			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			// HMAC 仅允许 sign/verify 用法
			if err := validateKeyUsagesSubset(usages, []string{"sign", "verify"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			keyObj := newWebCryptoHMACKey(runtime, hashName, keyLenBits, extractable, usages, keyBytes)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "PBKDF2", "HKDF":
			// KDF base key（密码/IKM）原始字节导入
			if keyLenBits <= 0 {
				reject(runtime.NewTypeError("The \"keyData\" length for KDF must be > 0"))
				return runtime.ToValue(promise)
			}

			// KDF base key 只允许 deriveBits / deriveKey 用途
			extractable := extractableVal.ToBoolean()
			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if err := validateKeyUsagesSubset(usages, []string{"deriveKey", "deriveBits"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			// 这里复用 WebCryptoKey 的 Secret 字段保存 password/ikm 原始字节
			secretCopy := append([]byte(nil), keyBytes...)
			keyObj := newWebCryptoSecretKey(runtime, algUpper, keyLenBits, extractable, usages, secretCopy)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "ED25519":
			if len(keyBytes) != ed25519.PublicKeySize {
				reject(runtime.NewTypeError(fmt.Sprintf("Invalid Ed25519 public key length: %d", len(keyBytes))))
				return runtime.ToValue(promise)
			}

			extractable := extractableVal.ToBoolean()
			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if err := validateKeyUsagesSubset(usages, []string{"verify"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			pubCopy := make(ed25519.PublicKey, ed25519.PublicKeySize)
			copy(pubCopy, keyBytes)
			keyObj := newWebCryptoEd25519Key(runtime, true, extractable, usages, pubCopy, nil)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "X25519":
			if len(keyBytes) != 32 {
				reject(runtime.NewTypeError(fmt.Sprintf("Invalid X25519 public key length: %d", len(keyBytes))))
				return runtime.ToValue(promise)
			}

			usagesObj, ok := usagesVal.(*goja.Object)
			if !ok || usagesObj == nil {
				reject(runtime.NewTypeError("The \"keyUsages\" argument must be an Array"))
				return runtime.ToValue(promise)
			}
			lengthVal := usagesObj.Get("length")
			if lengthVal == nil || goja.IsUndefined(lengthVal) || goja.IsNull(lengthVal) {
				reject(runtime.NewTypeError("The \"keyUsages\" argument must be an Array"))
				return runtime.ToValue(promise)
			}
			if int(lengthVal.ToInteger()) != 0 {
				reject(runtime.NewTypeError("X25519 public keys must have an empty keyUsages array"))
				return runtime.ToValue(promise)
			}

			extractable := extractableVal.ToBoolean()
			pubCopy := make([]byte, len(keyBytes))
			copy(pubCopy, keyBytes)
			keyObj := newWebCryptoX25519Key(runtime, true, extractable, nil, pubCopy, nil)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "ECDSA", "ECDH":
			if algObj == nil {
				reject(runtime.NewTypeError("The \"algorithm\" object must have a 'namedCurve' member"))
				return runtime.ToValue(promise)
			}
			namedCurveVal := algObj.Get("namedCurve")
			if namedCurveVal == nil || goja.IsUndefined(namedCurveVal) || goja.IsNull(namedCurveVal) {
				reject(runtime.NewTypeError("The \"algorithm\" object must have a 'namedCurve' member"))
				return runtime.ToValue(promise)
			}
			curveName := SafeGetString(namedCurveVal)
			var curve elliptic.Curve
			switch curveName {
			case "P-256":
				curve = elliptic.P256()
			case "P-384":
				curve = elliptic.P384()
			case "P-521":
				curve = elliptic.P521()
			default:
				reject(runtime.NewTypeError(fmt.Sprintf("unsupported curve '%s'", curveName)))
				return runtime.ToValue(promise)
			}

			x, y := elliptic.Unmarshal(curve, keyBytes)
			if x == nil || y == nil {
				reject(runtime.NewTypeError("Failed to decode EC raw public key"))
				return runtime.ToValue(promise)
			}

			ecPub := &ecdsa.PublicKey{Curve: curve, X: x, Y: y}
			extractable := extractableVal.ToBoolean()
			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if algUpper == "ECDSA" {
				if err := validateKeyUsagesSubset(usages, []string{"verify"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			} else {
				if err := validateKeyUsagesSubset(usages, []string{"deriveKey", "deriveBits"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			}

			keyObj := newWebCryptoECKey(runtime, algUpper, curveName, extractable, usages, ecPub, nil)
			resolve(keyObj)
			return runtime.ToValue(promise)

		default:
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.importKey with 'raw' format: %s", algName)))
			return runtime.ToValue(promise)
		}

	case "jwk":
		// JWK 格式导入，委托给辅助函数处理具体算法
		extractable := extractableVal.ToBoolean()
		keyObj, err := importJWKKey(runtime, algName, algUpper, keyDataVal, extractable, usagesVal, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		resolve(keyObj)
		return runtime.ToValue(promise)

	case "spki":
		keyBytes, err := convertToBytesInternal(runtime, keyDataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"keyData\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		pubKeyAny, err := x509.ParsePKIXPublicKey(keyBytes)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("Failed to parse SPKI public key: %v", err)))
			return runtime.ToValue(promise)
		}

		extractable := extractableVal.ToBoolean()

		switch algUpper {
		case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5", "RSASSA-PSS":
			rsaPub, ok := pubKeyAny.(*rsa.PublicKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an RSA public key"))
				return runtime.ToValue(promise)
			}

			canonAlg := canonicalizeRsaAlgorithm(algName)
			hashName, err := parseRsaHashParam(algObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			if canonAlg == "RSA-OAEP" {
				if err := validateKeyUsagesSubset(usages, []string{"encrypt", "wrapkey"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			} else {
				if err := validateKeyUsagesSubset(usages, []string{"verify"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			}

			keyObj := newWebCryptoRSAKey(runtime, canonAlg, hashName, extractable, usages, rsaPub, nil)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "ECDSA", "ECDH":
			ecPub, ok := pubKeyAny.(*ecdsa.PublicKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an EC public key"))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if algUpper == "ECDSA" {
				if err := validateKeyUsagesSubset(usages, []string{"verify"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			} else {
				if err := validateKeyUsagesSubset(usages, []string{"deriveKey", "deriveBits"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			}

			curveName := ""
			switch ecPub.Curve {
			case elliptic.P256():
				curveName = "P-256"
			case elliptic.P384():
				curveName = "P-384"
			case elliptic.P521():
				curveName = "P-521"
			default:
				reject(runtime.NewTypeError("unsupported EC curve for SPKI key"))
				return runtime.ToValue(promise)
			}

			keyObj := newWebCryptoECKey(runtime, algUpper, curveName, extractable, usages, ecPub, nil)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "ED25519":
			edPub, ok := pubKeyAny.(ed25519.PublicKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an Ed25519 public key"))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if err := validateKeyUsagesSubset(usages, []string{"verify"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			keyObj := newWebCryptoEd25519Key(runtime, true, extractable, usages, edPub, nil)
			resolve(keyObj)
			return runtime.ToValue(promise)

		default:
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.importKey with 'spki' format: %s", algName)))
			return runtime.ToValue(promise)
		}

	case "pkcs8":
		keyBytes, err := convertToBytesInternal(runtime, keyDataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"keyData\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		privKeyAny, err := x509.ParsePKCS8PrivateKey(keyBytes)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("Failed to parse PKCS8 private key: %v", err)))
			return runtime.ToValue(promise)
		}

		extractable := extractableVal.ToBoolean()

		switch algUpper {
		case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5", "RSASSA-PSS":
			rsaPriv, ok := privKeyAny.(*rsa.PrivateKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an RSA private key"))
				return runtime.ToValue(promise)
			}

			canonAlg := canonicalizeRsaAlgorithm(algName)
			hashName, err := parseRsaHashParam(algObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			if canonAlg == "RSA-OAEP" {
				if err := validateKeyUsagesSubset(usages, []string{"decrypt", "unwrapkey"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			} else {
				if err := validateKeyUsagesSubset(usages, []string{"sign"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			}

			keyObj := newWebCryptoRSAKey(runtime, canonAlg, hashName, extractable, usages, nil, rsaPriv)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "ECDSA", "ECDH":
			ecPriv, ok := privKeyAny.(*ecdsa.PrivateKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an EC private key"))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if algUpper == "ECDSA" {
				if err := validateKeyUsagesSubset(usages, []string{"sign"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			} else {
				if err := validateKeyUsagesSubset(usages, []string{"deriveKey", "deriveBits"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			}

			curveName := ""
			switch ecPriv.Curve {
			case elliptic.P256():
				curveName = "P-256"
			case elliptic.P384():
				curveName = "P-384"
			case elliptic.P521():
				curveName = "P-521"
			default:
				reject(runtime.NewTypeError("unsupported EC curve for PKCS8 key"))
				return runtime.ToValue(promise)
			}

			keyObj := newWebCryptoECKey(runtime, algUpper, curveName, extractable, usages, nil, ecPriv)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "ED25519":
			edPriv, ok := privKeyAny.(ed25519.PrivateKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an Ed25519 private key"))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if err := validateKeyUsagesSubset(usages, []string{"sign"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			if len(edPriv) != ed25519.PrivateKeySize {
				reject(runtime.NewTypeError(fmt.Sprintf("Invalid Ed25519 private key length: %d", len(edPriv))))
				return runtime.ToValue(promise)
			}
			offset := len(edPriv) - ed25519.PublicKeySize
			if offset < 0 {
				reject(runtime.NewTypeError("Invalid Ed25519 private key material"))
				return runtime.ToValue(promise)
			}
			pub := ed25519.PublicKey(edPriv[offset:])

			keyObj := newWebCryptoEd25519Key(runtime, false, extractable, usages, pub, edPriv)
			resolve(keyObj)
			return runtime.ToValue(promise)

		default:
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.importKey with 'pkcs8' format: %s", algName)))
			return runtime.ToValue(promise)
		}

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Unsupported format for importKey: '%s'", format)))
		return runtime.ToValue(promise)
	}
}

// WebCryptoDeriveBits 实现 subtle.deriveBits
func WebCryptoDeriveBits(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	promise, resolve, reject := runtime.NewPromise()

	if len(call.Arguments) < 3 {
		reject(runtime.NewTypeError("subtle.deriveBits requires algorithm, baseKey, and length arguments"))
		return runtime.ToValue(promise)
	}

	algVal := call.Arguments[0]
	baseKeyVal := call.Arguments[1]
	lengthVal := call.Arguments[2]

	baseKey := getWebCryptoKey(runtime, baseKeyVal)
	if baseKey == nil {
		reject(runtime.NewTypeError("The provided key is not a valid CryptoKey"))
		return runtime.ToValue(promise)
	}
	if !hasKeyUsage(baseKey.Usages, "deriveBits") {
		reject(newInvalidAccessError(runtime, "CryptoKey does not allow 'deriveBits' usage"))
		return runtime.ToValue(promise)
	}

	algName, algObj := parseWebCryptoAlgorithm(runtime, algVal)
	if algName == "" {
		reject(runtime.NewTypeError("The \"algorithm\" argument must have a valid name"))
		return runtime.ToValue(promise)
	}
	algUpper := strings.ToUpper(algName)

	// 解析 length（bits）
	if goja.IsNaN(lengthVal) || goja.IsInfinity(lengthVal) {
		reject(runtime.NewTypeError("The \"length\" argument must be a finite number"))
		return runtime.ToValue(promise)
	}
	lengthFloat := lengthVal.ToFloat()
	lengthBits := int(lengthFloat)
	if lengthFloat != float64(lengthBits) {
		reject(runtime.NewTypeError("The \"length\" argument must be an integer"))
		return runtime.ToValue(promise)
	}
	if lengthBits < 0 {
		reject(runtime.NewTypeError("The \"length\" argument must be greater than 0"))
		return runtime.ToValue(promise)
	}
	if lengthBits%8 != 0 {
		reject(runtime.NewTypeError("The \"length\" argument must be a multiple of 8"))
		return runtime.ToValue(promise)
	}
	lengthBytes := lengthBits / 8

	switch strings.ToUpper(baseKey.Algorithm) {
	case "PBKDF2":
		if algUpper != "PBKDF2" {
			reject(runtime.NewTypeError("Algorithm.name must be 'PBKDF2' for this key"))
			return runtime.ToValue(promise)
		}
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" argument for PBKDF2 must be an object"))
			return runtime.ToValue(promise)
		}
		if len(baseKey.Secret) == 0 {
			reject(runtime.NewTypeError("PBKDF2 base key material is missing"))
			return runtime.ToValue(promise)
		}

		// salt
		saltVal := algObj.Get("salt")
		if saltVal == nil || goja.IsUndefined(saltVal) || goja.IsNull(saltVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for PBKDF2 must have a 'salt' member"))
			return runtime.ToValue(promise)
		}
		salt, err := convertToBytesInternal(runtime, saltVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"salt\" member must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		// iterations
		iterVal := algObj.Get("iterations")
		if iterVal == nil || goja.IsUndefined(iterVal) || goja.IsNull(iterVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for PBKDF2 must have an 'iterations' member"))
			return runtime.ToValue(promise)
		}
		iterFloat := iterVal.ToFloat()
		iterations := int(iterVal.ToInteger())
		if iterFloat != float64(iterations) {
			reject(runtime.NewTypeError("The \"iterations\" member must be an integer"))
			return runtime.ToValue(promise)
		}
		if iterations <= 0 {
			reject(runtime.NewTypeError("The \"iterations\" member must be > 0"))
			return runtime.ToValue(promise)
		}

		// hash
		hashVal := algObj.Get("hash")
		if hashVal == nil || goja.IsUndefined(hashVal) || goja.IsNull(hashVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for PBKDF2 must have a 'hash' member"))
			return runtime.ToValue(promise)
		}
		var hashName string
		if hashObj, ok := hashVal.(*goja.Object); ok && hashObj != nil {
			hashName = SafeGetString(hashObj.Get("name"))
		} else {
			hashName = SafeGetString(hashVal)
		}
		if hashName == "" {
			reject(runtime.NewTypeError("The \"hash\" member must specify a valid hash algorithm"))
			return runtime.ToValue(promise)
		}

		hf := getKDFHashFunc(runtime, normalizeWebCryptoKDFDigest(hashName))
		derived := pbkdf2.Key(baseKey.Secret, salt, iterations, lengthBytes, hf)
		resolve(runtime.NewArrayBuffer(derived))
		return runtime.ToValue(promise)

	case "HKDF":
		if algUpper != "HKDF" {
			reject(runtime.NewTypeError("Algorithm.name must be 'HKDF' for this key"))
			return runtime.ToValue(promise)
		}
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" argument for HKDF must be an object"))
			return runtime.ToValue(promise)
		}
		if len(baseKey.Secret) == 0 {
			reject(runtime.NewTypeError("HKDF base key material is missing"))
			return runtime.ToValue(promise)
		}

		// hash
		hashVal := algObj.Get("hash")
		if hashVal == nil || goja.IsUndefined(hashVal) || goja.IsNull(hashVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for HKDF must have a 'hash' member"))
			return runtime.ToValue(promise)
		}
		var hashName string
		if hashObj, ok := hashVal.(*goja.Object); ok && hashObj != nil {
			hashName = SafeGetString(hashObj.Get("name"))
		} else {
			hashName = SafeGetString(hashVal)
		}
		if hashName == "" {
			reject(runtime.NewTypeError("The \"hash\" member must specify a valid hash algorithm"))
			return runtime.ToValue(promise)
		}
		hf := getKDFHashFunc(runtime, normalizeWebCryptoKDFDigest(hashName))

		// salt
		saltVal := algObj.Get("salt")
		if saltVal == nil || goja.IsUndefined(saltVal) || goja.IsNull(saltVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for HKDF must have a 'salt' member"))
			return runtime.ToValue(promise)
		}
		salt, err := convertToBytesInternal(runtime, saltVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"salt\" member must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		// info
		infoVal := algObj.Get("info")
		if infoVal == nil || goja.IsUndefined(infoVal) || goja.IsNull(infoVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for HKDF must have an 'info' member"))
			return runtime.ToValue(promise)
		}
		info, err := convertToBytesInternal(runtime, infoVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"info\" member must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}
		if len(info) > 1024 {
			reject(runtime.NewTypeError("The \"info\" member must not be longer than 1024 bytes"))
			return runtime.ToValue(promise)
		}

		hashLen := hf().Size()
		maxBytes := 255 * hashLen
		if lengthBytes > maxBytes {
			reject(runtime.NewTypeError("The \"length\" argument exceeds maximum length for HKDF"))
			return runtime.ToValue(promise)
		}

		r := hkdf.New(hf, baseKey.Secret, salt, info)
		okm := make([]byte, lengthBytes)
		if _, err := r.Read(okm); err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		resolve(runtime.NewArrayBuffer(okm))
		return runtime.ToValue(promise)

	case "ECDH":
		if algUpper != "ECDH" {
			reject(runtime.NewTypeError("Algorithm.name must be 'ECDH' for this key"))
			return runtime.ToValue(promise)
		}
		if baseKey.Type != "private" || baseKey.ECPrivate == nil {
			reject(runtime.NewTypeError("ECDH deriveBits requires an EC private key"))
			return runtime.ToValue(promise)
		}
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" argument for ECDH must be an object"))
			return runtime.ToValue(promise)
		}
		pubVal := algObj.Get("public")
		pubKey := getWebCryptoKey(runtime, pubVal)
		if pubKey == nil || pubKey.Type != "public" || pubKey.ECPublic == nil {
			reject(runtime.NewTypeError("The \"public\" member must be an ECDH public CryptoKey"))
			return runtime.ToValue(promise)
		}
		if strings.ToUpper(pubKey.Algorithm) != "ECDH" {
			reject(runtime.NewTypeError("The \"public\" key algorithm must be 'ECDH'"))
			return runtime.ToValue(promise)
		}
		if baseKey.ECPrivate.Curve != pubKey.ECPublic.Curve {
			reject(runtime.NewTypeError("ECDH keys must use the same curve"))
			return runtime.ToValue(promise)
		}

		curve := baseKey.ECPrivate.Curve
		curveBytes := (curve.Params().BitSize + 7) / 8
		maxBits := curveBytes * 8
		if lengthBits > maxBits {
			reject(runtime.NewTypeError("The \"length\" argument is too large for this curve"))
			return runtime.ToValue(promise)
		}

		x, _ := curve.ScalarMult(pubKey.ECPublic.X, pubKey.ECPublic.Y, baseKey.ECPrivate.D.Bytes())
		if x == nil {
			reject(runtime.NewTypeError("Failed to compute ECDH shared secret"))
			return runtime.ToValue(promise)
		}
		secret := x.Bytes()
		if len(secret) < curveBytes {
			padded := make([]byte, curveBytes)
			copy(padded[curveBytes-len(secret):], secret)
			secret = padded
		}
		out := make([]byte, lengthBytes)
		copy(out, secret[:lengthBytes])
		resolve(runtime.NewArrayBuffer(out))
		return runtime.ToValue(promise)

	case "X25519":
		if algUpper != "X25519" {
			reject(runtime.NewTypeError("Algorithm.name must be 'X25519' for this key"))
			return runtime.ToValue(promise)
		}
		if baseKey.Type != "private" || baseKey.X25519Priv == nil || len(baseKey.X25519Priv) != 32 {
			reject(runtime.NewTypeError("X25519 deriveBits requires a private X25519 key"))
			return runtime.ToValue(promise)
		}
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" argument for X25519 must be an object"))
			return runtime.ToValue(promise)
		}
		pubVal := algObj.Get("public")
		pubKey := getWebCryptoKey(runtime, pubVal)
		if pubKey == nil || pubKey.Type != "public" || pubKey.X25519Pub == nil || len(pubKey.X25519Pub) != 32 {
			reject(runtime.NewTypeError("The \"public\" member must be an X25519 public CryptoKey"))
			return runtime.ToValue(promise)
		}
		if lengthBits > 256 {
			reject(runtime.NewTypeError("The \"length\" argument is too large for X25519"))
			return runtime.ToValue(promise)
		}

		var privArr, pubArr, shared [32]byte
		copy(privArr[:], baseKey.X25519Priv)
		copy(pubArr[:], pubKey.X25519Pub)
		curve25519.ScalarMult(&shared, &privArr, &pubArr)
		out := make([]byte, lengthBytes)
		copy(out, shared[:lengthBytes])
		resolve(runtime.NewArrayBuffer(out))
		return runtime.ToValue(promise)

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.deriveBits for key algorithm %s", baseKey.Algorithm)))
		return runtime.ToValue(promise)
	}
}

// WebCryptoDeriveKey 实现 subtle.deriveKey
func WebCryptoDeriveKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	promise, resolve, reject := runtime.NewPromise()

	// algorithm, baseKey, derivedKeyAlgorithm, extractable, keyUsages
	if len(call.Arguments) < 5 {
		reject(runtime.NewTypeError("subtle.deriveKey requires algorithm, baseKey, derivedKeyAlgorithm, extractable, and keyUsages arguments"))
		return runtime.ToValue(promise)
	}

	algVal := call.Arguments[0]
	baseKeyVal := call.Arguments[1]
	derivedAlgVal := call.Arguments[2]
	extractableVal := call.Arguments[3]
	usagesVal := call.Arguments[4]

	baseKey := getWebCryptoKey(runtime, baseKeyVal)
	if baseKey == nil {
		reject(runtime.NewTypeError("The provided key is not a valid CryptoKey"))
		return runtime.ToValue(promise)
	}
	if !hasKeyUsage(baseKey.Usages, "deriveKey") {
		reject(newInvalidAccessError(runtime, "CryptoKey does not allow 'deriveKey' usage"))
		return runtime.ToValue(promise)
	}

	algName, algObj := parseWebCryptoAlgorithm(runtime, algVal)
	algUpper := strings.ToUpper(algName)
	if algUpper == "" {
		reject(runtime.NewTypeError("The \"algorithm\" argument must have a valid name"))
		return runtime.ToValue(promise)
	}

	derivedAlgName, derivedAlgObj := parseWebCryptoAlgorithm(runtime, derivedAlgVal)
	derivedAlgUpper := strings.ToUpper(derivedAlgName)

	extractable := extractableVal.ToBoolean()

	switch strings.ToUpper(baseKey.Algorithm) {
	case "PBKDF2":
		if algUpper != "PBKDF2" {
			reject(runtime.NewTypeError("Algorithm.name must be 'PBKDF2' for this key"))
			return runtime.ToValue(promise)
		}
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" argument for PBKDF2 must be an object"))
			return runtime.ToValue(promise)
		}
		if len(baseKey.Secret) == 0 {
			reject(runtime.NewTypeError("PBKDF2 base key material is missing"))
			return runtime.ToValue(promise)
		}

		// salt
		saltVal := algObj.Get("salt")
		if saltVal == nil || goja.IsUndefined(saltVal) || goja.IsNull(saltVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for PBKDF2 must have a 'salt' member"))
			return runtime.ToValue(promise)
		}
		salt, err := convertToBytesInternal(runtime, saltVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"salt\" member must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		// iterations
		iterVal := algObj.Get("iterations")
		if iterVal == nil || goja.IsUndefined(iterVal) || goja.IsNull(iterVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for PBKDF2 must have an 'iterations' member"))
			return runtime.ToValue(promise)
		}
		iterFloat := iterVal.ToFloat()
		iterations := int(iterVal.ToInteger())
		if iterFloat != float64(iterations) {
			reject(runtime.NewTypeError("The \"iterations\" member must be an integer"))
			return runtime.ToValue(promise)
		}
		if iterations <= 0 {
			reject(runtime.NewTypeError("The \"iterations\" member must be > 0"))
			return runtime.ToValue(promise)
		}

		// hash
		hashVal := algObj.Get("hash")
		if hashVal == nil || goja.IsUndefined(hashVal) || goja.IsNull(hashVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for PBKDF2 must have a 'hash' member"))
			return runtime.ToValue(promise)
		}
		var hashName string
		if hashObj, ok := hashVal.(*goja.Object); ok && hashObj != nil {
			hashName = SafeGetString(hashObj.Get("name"))
		} else {
			hashName = SafeGetString(hashVal)
		}
		if hashName == "" {
			reject(runtime.NewTypeError("The \"hash\" member must specify a valid hash algorithm"))
			return runtime.ToValue(promise)
		}
		hf := getKDFHashFunc(runtime, normalizeWebCryptoKDFDigest(hashName))

		switch derivedAlgUpper {
		case "AES-GCM":
			lengthBits, err := parseAesKeyLength(runtime, derivedAlgObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			lengthBytes := lengthBits / 8
			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if err := validateKeyUsagesSubset(usages, []string{"encrypt", "decrypt", "wrapKey", "unwrapKey"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			derived := pbkdf2.Key(baseKey.Secret, salt, iterations, lengthBytes, hf)
			keyObj := newWebCryptoSecretKey(runtime, "AES-GCM", lengthBits, extractable, usages, derived)
			resolve(keyObj)
			return runtime.ToValue(promise)
		default:
			reject(runtime.NewTypeError(fmt.Sprintf("PBKDF2 deriveKey does not support derived key algorithm '%s'", derivedAlgName)))
			return runtime.ToValue(promise)
		}

	case "HKDF":
		if algUpper != "HKDF" {
			reject(runtime.NewTypeError("Algorithm.name must be 'HKDF' for this key"))
			return runtime.ToValue(promise)
		}
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" argument for HKDF must be an object"))
			return runtime.ToValue(promise)
		}
		if len(baseKey.Secret) == 0 {
			reject(runtime.NewTypeError("HKDF base key material is missing"))
			return runtime.ToValue(promise)
		}

		// hash
		hashVal := algObj.Get("hash")
		if hashVal == nil || goja.IsUndefined(hashVal) || goja.IsNull(hashVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for HKDF must have a 'hash' member"))
			return runtime.ToValue(promise)
		}
		var hashName string
		if hashObj, ok := hashVal.(*goja.Object); ok && hashObj != nil {
			hashName = SafeGetString(hashObj.Get("name"))
		} else {
			hashName = SafeGetString(hashVal)
		}
		if hashName == "" {
			reject(runtime.NewTypeError("The \"hash\" member must specify a valid hash algorithm"))
			return runtime.ToValue(promise)
		}
		hf := getKDFHashFunc(runtime, normalizeWebCryptoKDFDigest(hashName))

		// salt
		saltVal := algObj.Get("salt")
		if saltVal == nil || goja.IsUndefined(saltVal) || goja.IsNull(saltVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for HKDF must have a 'salt' member"))
			return runtime.ToValue(promise)
		}
		salt, err := convertToBytesInternal(runtime, saltVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"salt\" member must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		// info
		infoVal := algObj.Get("info")
		if infoVal == nil || goja.IsUndefined(infoVal) || goja.IsNull(infoVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for HKDF must have an 'info' member"))
			return runtime.ToValue(promise)
		}
		info, err := convertToBytesInternal(runtime, infoVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"info\" member must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}
		if len(info) > 1024 {
			reject(runtime.NewTypeError("The \"info\" member must not be longer than 1024 bytes"))
			return runtime.ToValue(promise)
		}

		switch derivedAlgUpper {
		case "HMAC":
			// 使用 HMAC 参数确定输出长度
			hmacHashName, lengthBits, err := parseHmacParams(runtime, derivedAlgObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			lengthBytes := lengthBits / 8
			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if err := validateKeyUsagesSubset(usages, []string{"sign", "verify"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			hashLen := hf().Size()
			maxBytes := 255 * hashLen
			if lengthBytes > maxBytes {
				reject(runtime.NewTypeError("The \"length\" argument exceeds maximum length for HKDF"))
				return runtime.ToValue(promise)
			}

			r := hkdf.New(hf, baseKey.Secret, salt, info)
			okm := make([]byte, lengthBytes)
			if _, err := r.Read(okm); err != nil {
				reject(runtime.NewGoError(err))
				return runtime.ToValue(promise)
			}
			keyObj := newWebCryptoHMACKey(runtime, hmacHashName, lengthBits, extractable, usages, okm)
			resolve(keyObj)
			return runtime.ToValue(promise)
		default:
			reject(runtime.NewTypeError(fmt.Sprintf("HKDF deriveKey does not support derived key algorithm '%s'", derivedAlgName)))
			return runtime.ToValue(promise)
		}

	case "ECDH":
		if algUpper != "ECDH" {
			reject(runtime.NewTypeError("Algorithm.name must be 'ECDH' for this key"))
			return runtime.ToValue(promise)
		}
		if baseKey.Type != "private" || baseKey.ECPrivate == nil {
			reject(runtime.NewTypeError("ECDH deriveKey requires an EC private key"))
			return runtime.ToValue(promise)
		}
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" argument for ECDH must be an object"))
			return runtime.ToValue(promise)
		}
		pubVal := algObj.Get("public")
		pubKey := getWebCryptoKey(runtime, pubVal)
		if pubKey == nil || pubKey.Type != "public" || pubKey.ECPublic == nil {
			reject(runtime.NewTypeError("The \"public\" member must be an ECDH public CryptoKey"))
			return runtime.ToValue(promise)
		}
		if strings.ToUpper(pubKey.Algorithm) != "ECDH" {
			reject(runtime.NewTypeError("The \"public\" key algorithm must be 'ECDH'"))
			return runtime.ToValue(promise)
		}
		if baseKey.ECPrivate.Curve != pubKey.ECPublic.Curve {
			reject(runtime.NewTypeError("ECDH keys must use the same curve"))
			return runtime.ToValue(promise)
		}

		// 目前仅支持派生 AES-GCM 密钥
		if derivedAlgUpper != "AES-GCM" {
			reject(runtime.NewTypeError("ECDH deriveKey currently only supports AES-GCM as derived key algorithm"))
			return runtime.ToValue(promise)
		}
		lengthBits, err := parseAesKeyLength(runtime, derivedAlgObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		lengthBytes := lengthBits / 8

		curve := baseKey.ECPrivate.Curve
		curveBytes := (curve.Params().BitSize + 7) / 8
		maxBits := curveBytes * 8
		if lengthBits > maxBits {
			reject(runtime.NewTypeError("The \"length\" argument is too large for this curve"))
			return runtime.ToValue(promise)
		}

		x, _ := curve.ScalarMult(pubKey.ECPublic.X, pubKey.ECPublic.Y, baseKey.ECPrivate.D.Bytes())
		if x == nil {
			reject(runtime.NewTypeError("Failed to compute ECDH shared secret"))
			return runtime.ToValue(promise)
		}
		secret := x.Bytes()
		if len(secret) < curveBytes {
			padded := make([]byte, curveBytes)
			copy(padded[curveBytes-len(secret):], secret)
			secret = padded
		}
		keyBytes := make([]byte, lengthBytes)
		copy(keyBytes, secret[:lengthBytes])

		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		if err := validateKeyUsagesSubset(usages, []string{"encrypt", "decrypt", "wrapKey", "unwrapKey"}); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		keyObj := newWebCryptoSecretKey(runtime, "AES-GCM", lengthBits, extractable, usages, keyBytes)
		resolve(keyObj)
		return runtime.ToValue(promise)

	case "X25519":
		if algUpper != "X25519" {
			reject(runtime.NewTypeError("Algorithm.name must be 'X25519' for this key"))
			return runtime.ToValue(promise)
		}
		if baseKey.Type != "private" || baseKey.X25519Priv == nil || len(baseKey.X25519Priv) != 32 {
			reject(runtime.NewTypeError("X25519 deriveKey requires a private X25519 key"))
			return runtime.ToValue(promise)
		}
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" argument for X25519 must be an object"))
			return runtime.ToValue(promise)
		}
		pubVal := algObj.Get("public")
		pubKey := getWebCryptoKey(runtime, pubVal)
		if pubKey == nil || pubKey.Type != "public" || pubKey.X25519Pub == nil || len(pubKey.X25519Pub) != 32 {
			reject(runtime.NewTypeError("The \"public\" member must be an X25519 public CryptoKey"))
			return runtime.ToValue(promise)
		}

		// 目前仅支持派生 AES-GCM 对称密钥
		if derivedAlgUpper != "AES-GCM" {
			reject(runtime.NewTypeError("X25519 deriveKey currently only supports AES-GCM as derived key algorithm"))
			return runtime.ToValue(promise)
		}
		lengthBits, err := parseAesKeyLength(runtime, derivedAlgObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		if lengthBits > 256 {
			reject(runtime.NewTypeError("The \"length\" argument is too large for X25519"))
			return runtime.ToValue(promise)
		}
		lengthBytes := lengthBits / 8

		var privArr, pubArr, shared [32]byte
		copy(privArr[:], baseKey.X25519Priv)
		copy(pubArr[:], pubKey.X25519Pub)
		curve25519.ScalarMult(&shared, &privArr, &pubArr)

		keyBytes := make([]byte, lengthBytes)
		copy(keyBytes, shared[:lengthBytes])

		usages, err := parseKeyUsages(runtime, usagesVal)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		if err := validateKeyUsagesSubset(usages, []string{"encrypt", "decrypt", "wrapKey", "unwrapKey"}); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		keyObj := newWebCryptoSecretKey(runtime, "AES-GCM", lengthBits, extractable, usages, keyBytes)
		resolve(keyObj)
		return runtime.ToValue(promise)

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.deriveKey for key algorithm %s", baseKey.Algorithm)))
		return runtime.ToValue(promise)
	}
}

// WebCryptoExportKey 实现 subtle.exportKey（当前仅支持 AES-GCM secret key 的 raw 格式）
func WebCryptoExportKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	promise, resolve, reject := runtime.NewPromise()

	if len(call.Arguments) < 2 {
		reject(runtime.NewTypeError("subtle.exportKey requires format and key arguments"))
		return runtime.ToValue(promise)
	}

	formatVal := call.Arguments[0]
	keyVal := call.Arguments[1]

	format := strings.ToLower(SafeGetString(formatVal))
	key := getWebCryptoKey(runtime, keyVal)
	if key == nil {
		reject(runtime.NewTypeError("The provided key is not a valid CryptoKey"))
		return runtime.ToValue(promise)
	}
	if !key.Extractable {
		reject(newInvalidAccessError(runtime, "CryptoKey is not extractable"))
		return runtime.ToValue(promise)
	}

	switch format {
	case "raw":
		algUpper := strings.ToUpper(key.Algorithm)
		if key.Type == "secret" {
			// 对称密钥 raw 导出（AES-GCM / HMAC）
			if algUpper != "AES-GCM" && algUpper != "HMAC" {
				reject(runtime.NewTypeError(fmt.Sprintf("Algorithm '%s' does not support 'raw' export", key.Algorithm)))
				return runtime.ToValue(promise)
			}
			secretCopy := append([]byte(nil), key.Secret...)
			resolve(runtime.NewArrayBuffer(secretCopy))
			return runtime.ToValue(promise)
		}

		// 公钥 raw 导出（Ed25519 / X25519 / EC）
		if key.Type != "public" {
			reject(runtime.NewTypeError("Only secret or public keys can be exported in 'raw' format"))
			return runtime.ToValue(promise)
		}

		switch algUpper {
		case "ED25519":
			if key.EdPublic == nil || len(key.EdPublic) != ed25519.PublicKeySize {
				reject(runtime.NewTypeError("Ed25519 public key material is missing or invalid"))
				return runtime.ToValue(promise)
			}
			out := make([]byte, ed25519.PublicKeySize)
			copy(out, key.EdPublic)
			resolve(runtime.NewArrayBuffer(out))
			return runtime.ToValue(promise)

		case "X25519":
			if key.X25519Pub == nil || len(key.X25519Pub) != 32 {
				reject(runtime.NewTypeError("X25519 public key material is missing or invalid"))
				return runtime.ToValue(promise)
			}
			out := make([]byte, len(key.X25519Pub))
			copy(out, key.X25519Pub)
			resolve(runtime.NewArrayBuffer(out))
			return runtime.ToValue(promise)

		case "ECDSA", "ECDH":
			if key.ECPublic == nil || key.ECPublic.Curve == nil {
				reject(runtime.NewTypeError("EC public key material is missing"))
				return runtime.ToValue(promise)
			}
			encoded := elliptic.Marshal(key.ECPublic.Curve, key.ECPublic.X, key.ECPublic.Y)
			if len(encoded) == 0 {
				reject(runtime.NewTypeError("Failed to encode EC public key"))
				return runtime.ToValue(promise)
			}
			out := make([]byte, len(encoded))
			copy(out, encoded)
			resolve(runtime.NewArrayBuffer(out))
			return runtime.ToValue(promise)

		default:
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm '%s' does not support 'raw' export", key.Algorithm)))
			return runtime.ToValue(promise)
		}

	case "spki":
		if key.Type != "public" {
			// Node/WebCrypto 对私钥使用 spki 视为访问违规，应抛出 InvalidAccessError；
			// 对于对称密钥等其它类型，仍然使用 TypeError（测试也接受这一行为）。
			if key.Type == "private" {
				reject(newInvalidAccessError(runtime, "Only public keys can be exported in 'spki' format"))
			} else {
				reject(runtime.NewTypeError("Only public keys can be exported in 'spki' format"))
			}
			return runtime.ToValue(promise)
		}

		algUpper := strings.ToUpper(key.Algorithm)
		var pub interface{}
		switch algUpper {
		case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5", "RSASSA-PSS":
			if key.RSAPublic == nil {
				reject(runtime.NewTypeError("RSA public key material is missing"))
				return runtime.ToValue(promise)
			}
			pub = key.RSAPublic
		case "ECDSA", "ECDH":
			if key.ECPublic == nil {
				reject(runtime.NewTypeError("EC public key material is missing"))
				return runtime.ToValue(promise)
			}
			pub = key.ECPublic
		case "ED25519":
			if key.EdPublic == nil {
				reject(runtime.NewTypeError("Ed25519 public key material is missing"))
				return runtime.ToValue(promise)
			}
			pub = key.EdPublic
		default:
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm '%s' does not support 'spki' export", key.Algorithm)))
			return runtime.ToValue(promise)
		}

		der, err := x509.MarshalPKIXPublicKey(pub)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("Failed to marshal public key: %w", err)))
			return runtime.ToValue(promise)
		}
		resolve(runtime.NewArrayBuffer(der))
		return runtime.ToValue(promise)

	case "pkcs8":
		if key.Type != "private" {
			reject(runtime.NewTypeError("Only private keys can be exported in 'pkcs8' format"))
			return runtime.ToValue(promise)
		}

		algUpper := strings.ToUpper(key.Algorithm)
		var priv interface{}
		switch algUpper {
		case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5", "RSASSA-PSS":
			if key.RSAPrivate == nil {
				reject(runtime.NewTypeError("RSA private key material is missing"))
				return runtime.ToValue(promise)
			}
			priv = key.RSAPrivate
		case "ECDSA", "ECDH":
			if key.ECPrivate == nil {
				reject(runtime.NewTypeError("EC private key material is missing"))
				return runtime.ToValue(promise)
			}
			priv = key.ECPrivate
		case "ED25519":
			if key.EdPrivate == nil {
				reject(runtime.NewTypeError("Ed25519 private key material is missing"))
				return runtime.ToValue(promise)
			}
			priv = key.EdPrivate
		default:
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm '%s' does not support 'pkcs8' export", key.Algorithm)))
			return runtime.ToValue(promise)
		}

		der, err := x509.MarshalPKCS8PrivateKey(priv)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("Failed to marshal private key: %w", err)))
			return runtime.ToValue(promise)
		}
		resolve(runtime.NewArrayBuffer(der))
		return runtime.ToValue(promise)

	case "jwk":
		algUpper := strings.ToUpper(key.Algorithm)
		switch key.Type {
		case "secret":
			// 对称密钥 JWK：kty=oct, k=base64url(secret)，并根据算法设置合适的 alg 字段
			encoded := base64.RawURLEncoding.EncodeToString(key.Secret)
			jwk := runtime.NewObject()
			jwk.Set("kty", "oct")
			jwk.Set("k", encoded)
			// 填充 alg：
			// - HMAC:  使用 HS + 哈希位数（例如 SHA-256 -> HS256, SHA-512 -> HS512）
			// - AES-GCM: 使用 A128GCM/A192GCM/A256GCM
			switch algUpper {
			case "HMAC":
				if strings.HasPrefix(key.Hash, "SHA-") {
					suffix := strings.TrimPrefix(key.Hash, "SHA-")
					if suffix != "" {
						jwk.Set("alg", "HS"+suffix)
					}
				}
			case "AES-GCM":
				bits := key.LengthBits
				var algName string
				switch bits {
				case 128, 192, 256:
					algName = fmt.Sprintf("A%dGCM", bits)
				}
				if algName != "" {
					jwk.Set("alg", algName)
				}
			}
			resolve(jwk)
			return runtime.ToValue(promise)

		case "public":
			var jwkVal goja.Value
			switch algUpper {
			case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5", "RSASSA-PSS":
				if key.RSAPublic == nil {
					reject(runtime.NewTypeError("RSA public key material is missing"))
					return runtime.ToValue(promise)
				}
				jwkMap := RSAPublicKeyToJWK(key.RSAPublic)
				jwkVal = runtime.ToValue(jwkMap)
			case "ECDSA", "ECDH":
				if key.ECPublic == nil {
					reject(runtime.NewTypeError("EC public key material is missing"))
					return runtime.ToValue(promise)
				}
				jwkVal = EncodePublicKeyJWK(runtime, key.ECPublic, "ec")
			case "ED25519":
				if key.EdPublic == nil {
					reject(runtime.NewTypeError("Ed25519 public key material is missing"))
					return runtime.ToValue(promise)
				}
				jwkVal = EncodePublicKeyJWK(runtime, key.EdPublic, "ed25519")
			default:
				reject(runtime.NewTypeError(fmt.Sprintf("Algorithm '%s' does not support 'jwk' export", key.Algorithm)))
				return runtime.ToValue(promise)
			}
			resolve(jwkVal)
			return runtime.ToValue(promise)

		case "private":
			var jwkVal goja.Value
			switch algUpper {
			case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5", "RSASSA-PSS":
				if key.RSAPrivate == nil {
					reject(runtime.NewTypeError("RSA private key material is missing"))
					return runtime.ToValue(promise)
				}
				jwkMap := RSAPrivateKeyToJWK(key.RSAPrivate)
				jwkVal = runtime.ToValue(jwkMap)
			case "ECDSA", "ECDH":
				if key.ECPrivate == nil {
					reject(runtime.NewTypeError("EC private key material is missing"))
					return runtime.ToValue(promise)
				}
				jwkVal = EncodePrivateKeyJWK(runtime, key.ECPrivate, "ec")
			case "ED25519":
				if key.EdPrivate == nil {
					reject(runtime.NewTypeError("Ed25519 private key material is missing"))
					return runtime.ToValue(promise)
				}
				jwkVal = EncodePrivateKeyJWK(runtime, key.EdPrivate, "ed25519")
			default:
				reject(runtime.NewTypeError(fmt.Sprintf("Algorithm '%s' does not support 'jwk' export", key.Algorithm)))
				return runtime.ToValue(promise)
			}
			resolve(jwkVal)
			return runtime.ToValue(promise)

		default:
			reject(runtime.NewTypeError("Unsupported key type for 'jwk' export"))
			return runtime.ToValue(promise)
		}

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Unsupported format for exportKey: '%s'", format)))
		return runtime.ToValue(promise)
	}
}

// WebCryptoSign 实现 subtle.sign（当前仅支持 HMAC）
func WebCryptoSign(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	promise, resolve, reject := runtime.NewPromise()

	if len(call.Arguments) < 3 {
		reject(runtime.NewTypeError("subtle.sign requires algorithm, key, and data arguments"))
		return runtime.ToValue(promise)
	}

	algVal := call.Arguments[0]
	keyVal := call.Arguments[1]
	dataVal := call.Arguments[2]

	key := getWebCryptoKey(runtime, keyVal)
	if key == nil {
		reject(runtime.NewTypeError("The provided key is not a valid CryptoKey"))
		return runtime.ToValue(promise)
	}
	if !hasKeyUsage(key.Usages, "sign") {
		reject(newInvalidAccessError(runtime, "CryptoKey does not allow 'sign' usage"))
		return runtime.ToValue(promise)
	}

	algName, algObj := parseWebCryptoAlgorithm(runtime, algVal)
	algUpper := strings.ToUpper(algName)

	switch strings.ToUpper(key.Algorithm) {
	case "HMAC":
		if key.Type != "secret" {
			reject(runtime.NewTypeError("HMAC signing requires a secret key"))
			return runtime.ToValue(promise)
		}
		if algUpper != "HMAC" {
			reject(runtime.NewTypeError("Algorithm.name must be 'HMAC' for this key"))
			return runtime.ToValue(promise)
		}

		// WebCrypto 允许在 sign() 时省略 algorithm.hash，此时使用 key 上记录的 hash
		var hashName string
		if algObj != nil {
			if hashVal := algObj.Get("hash"); hashVal != nil && !goja.IsUndefined(hashVal) && !goja.IsNull(hashVal) {
				// 兼容 { hash: { name: "SHA-256" } } 或 "SHA-256"
				if hashObj, ok := hashVal.(*goja.Object); ok && hashObj != nil {
					hashName = SafeGetString(hashObj.Get("name"))
				} else {
					hashName = SafeGetString(hashVal)
				}
			}
		}
		if hashName == "" {
			// 未在 algorithm 中指定 hash，则从 key 上获取
			if key.Hash == "" {
				reject(runtime.NewTypeError("The \"algorithm\" object for HMAC must have a 'hash' member or the key must specify a hash"))
				return runtime.ToValue(promise)
			}
			hashName = key.Hash
		} else {
			// 如果 algorithm.hash 存在，则需要与 key.Hash 一致
			if strings.ToUpper(hashName) != key.Hash {
				reject(runtime.NewTypeError("Algorithm.hash does not match key algorithm"))
				return runtime.ToValue(promise)
			}
		}
		upperHash := strings.ToUpper(hashName)

		data, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		factory, _, err := getHmacHashFactory(upperHash)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		mac := hmac.New(factory, key.Secret)
		if _, err := mac.Write(data); err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		sig := mac.Sum(nil)
		resolve(runtime.NewArrayBuffer(sig))
		return runtime.ToValue(promise)

	case "RSA-PSS":
		if key.Type != "private" || key.RSAPrivate == nil {
			reject(runtime.NewTypeError("RSA-PSS signing requires a private RSA key"))
			return runtime.ToValue(promise)
		}
		canonAlg := canonicalizeRsaAlgorithm(algName)
		if canonAlg != "RSA-PSS" {
			reject(runtime.NewTypeError("Algorithm.name must be 'RSA-PSS' or 'RSASSA-PSS' for this key"))
			return runtime.ToValue(promise)
		}

		hashName := key.Hash
		if hashName == "" {
			var err error
			hashName, err = parseRsaHashParam(algObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		}
		saltLength, err := parseRsaPssSaltLength(algObj, hashName)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		data, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		hashFunc, err := GetHashFunction(hashName)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		hashFunc.Write(data)
		hashed := hashFunc.Sum(nil)

		hashID := GetCryptoHash(hashName)
		opts := &rsa.PSSOptions{
			SaltLength: saltLength,
			Hash:       hashID,
		}
		signature, err := rsa.SignPSS(rand.Reader, key.RSAPrivate, hashID, hashed, opts)
		if err != nil {
			// 过大的 saltLength 等参数问题在 WebCrypto 中应表现为 OperationError
			reject(newOperationError(runtime, fmt.Sprintf("RSA-PSS signing failed: %v", err)))
			return runtime.ToValue(promise)
		}
		resolve(runtime.NewArrayBuffer(signature))
		return runtime.ToValue(promise)

	case "RSASSA-PKCS1-V1_5":
		if key.Type != "private" || key.RSAPrivate == nil {
			reject(runtime.NewTypeError("RSASSA-PKCS1-v1_5 signing requires a private RSA key"))
			return runtime.ToValue(promise)
		}
		if algUpper != "RSASSA-PKCS1-V1_5" {
			reject(runtime.NewTypeError("Algorithm.name must be 'RSASSA-PKCS1-v1_5' for this key"))
			return runtime.ToValue(promise)
		}

		// hash 同样允许省略，默认使用 key.Hash
		hashName := key.Hash
		if hashName == "" {
			parsed, err := parseRsaHashParam(algObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			hashName = parsed
		}

		data, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		// 复用 SignWithRSA，使用 PKCS1 padding
		opts := map[string]interface{}{"padding": 1}
		signature, err := SignWithRSA(key.RSAPrivate, strings.ToUpper(hashName), data, opts)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("RSASSA-PKCS1-v1_5 signing failed: %w", err)))
			return runtime.ToValue(promise)
		}
		resolve(runtime.NewArrayBuffer(signature))
		return runtime.ToValue(promise)

	case "ECDSA":
		if key.Type != "private" || key.ECPrivate == nil {
			reject(runtime.NewTypeError("ECDSA signing requires an ECDSA private key"))
			return runtime.ToValue(promise)
		}
		if algUpper != "ECDSA" {
			reject(runtime.NewTypeError("Algorithm.name must be 'ECDSA' for this key"))
			return runtime.ToValue(promise)
		}

		// ECDSA 的算法对象必须包含 hash
		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" object for ECDSA must have a 'hash' member"))
			return runtime.ToValue(promise)
		}
		hashVal := algObj.Get("hash")
		if hashVal == nil || goja.IsUndefined(hashVal) || goja.IsNull(hashVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for ECDSA must have a 'hash' member"))
			return runtime.ToValue(promise)
		}
		var hashName string
		if hashObj, ok := hashVal.(*goja.Object); ok && hashObj != nil {
			hashName = SafeGetString(hashObj.Get("name"))
		} else {
			hashName = SafeGetString(hashVal)
		}
		if hashName == "" {
			reject(runtime.NewTypeError("The \"hash\" member for ECDSA must specify a valid hash"))
			return runtime.ToValue(promise)
		}

		data, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		// WebCrypto 默认使用 DER 编码
		opts := map[string]interface{}{"dsaEncoding": "der"}
		signature, err := SignWithECDSA(key.ECPrivate, strings.ToUpper(hashName), data, opts)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("ECDSA signing failed: %w", err)))
			return runtime.ToValue(promise)
		}
		resolve(runtime.NewArrayBuffer(signature))
		return runtime.ToValue(promise)

	case "ED25519":
		if key.Type != "private" || key.EdPrivate == nil {
			reject(runtime.NewTypeError("Ed25519 signing requires a private Ed25519 key"))
			return runtime.ToValue(promise)
		}
		if algUpper != "ED25519" {
			reject(runtime.NewTypeError("Algorithm.name must be 'Ed25519' for this key"))
			return runtime.ToValue(promise)
		}

		data, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		signature, err := SignWithEd25519(key.EdPrivate, data)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("Ed25519 signing failed: %w", err)))
			return runtime.ToValue(promise)
		}
		resolve(runtime.NewArrayBuffer(signature))
		return runtime.ToValue(promise)

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.sign for key algorithm %s", key.Algorithm)))
		return runtime.ToValue(promise)
	}
}

// WebCryptoVerify 实现 subtle.verify（当前仅支持 HMAC）
func WebCryptoVerify(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	promise, resolve, reject := runtime.NewPromise()

	if len(call.Arguments) < 4 {
		reject(runtime.NewTypeError("subtle.verify requires algorithm, key, signature, and data arguments"))
		return runtime.ToValue(promise)
	}

	algVal := call.Arguments[0]
	keyVal := call.Arguments[1]
	sigVal := call.Arguments[2]
	dataVal := call.Arguments[3]

	key := getWebCryptoKey(runtime, keyVal)
	if key == nil {
		reject(runtime.NewTypeError("The provided key is not a valid CryptoKey"))
		return runtime.ToValue(promise)
	}
	if !hasKeyUsage(key.Usages, "verify") {
		reject(newInvalidAccessError(runtime, "CryptoKey does not allow 'verify' usage"))
		return runtime.ToValue(promise)
	}

	algName, algObj := parseWebCryptoAlgorithm(runtime, algVal)
	algUpper := strings.ToUpper(algName)

	switch strings.ToUpper(key.Algorithm) {
	case "HMAC":
		if key.Type != "secret" {
			reject(runtime.NewTypeError("HMAC verification requires a secret key"))
			return runtime.ToValue(promise)
		}
		if algUpper != "HMAC" {
			reject(runtime.NewTypeError("Algorithm.name must be 'HMAC' for this key"))
			return runtime.ToValue(promise)
		}

		// 同 sign(): algorithm.hash 可省略，默认使用 key.Hash
		var hashName string
		if algObj != nil {
			if hashVal := algObj.Get("hash"); hashVal != nil && !goja.IsUndefined(hashVal) && !goja.IsNull(hashVal) {
				if hashObj, ok := hashVal.(*goja.Object); ok && hashObj != nil {
					hashName = SafeGetString(hashObj.Get("name"))
				} else {
					hashName = SafeGetString(hashVal)
				}
			}
		}
		if hashName == "" {
			if key.Hash == "" {
				reject(runtime.NewTypeError("The \"algorithm\" object for HMAC must have a 'hash' member or the key must specify a hash"))
				return runtime.ToValue(promise)
			}
			hashName = key.Hash
		} else {
			if strings.ToUpper(hashName) != key.Hash {
				reject(runtime.NewTypeError("Algorithm.hash does not match key algorithm"))
				return runtime.ToValue(promise)
			}
		}
		upperHash := strings.ToUpper(hashName)

		data, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}
		signature, err := convertToBytesInternal(runtime, sigVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"signature\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		factory, _, err := getHmacHashFactory(upperHash)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		mac := hmac.New(factory, key.Secret)
		if _, err := mac.Write(data); err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		expected := mac.Sum(nil)
		eq := len(expected) == len(signature) && subtle.ConstantTimeCompare(expected, signature) == 1
		resolve(runtime.ToValue(eq))
		return runtime.ToValue(promise)

	case "RSA-PSS":
		if key.Type != "public" || key.RSAPublic == nil {
			reject(runtime.NewTypeError("RSA-PSS verification requires a public RSA key"))
			return runtime.ToValue(promise)
		}
		canonAlg := canonicalizeRsaAlgorithm(algName)
		if canonAlg != "RSA-PSS" {
			reject(runtime.NewTypeError("Algorithm.name must be 'RSA-PSS' or 'RSASSA-PSS' for this key"))
			return runtime.ToValue(promise)
		}

		hashName := key.Hash
		if hashName == "" {
			var err error
			hashName, err = parseRsaHashParam(algObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		}
		saltLength, err := parseRsaPssSaltLength(algObj, hashName)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		data, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}
		signature, err := convertToBytesInternal(runtime, sigVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"signature\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		hashFunc, err := GetHashFunction(hashName)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		hashFunc.Write(data)
		hashed := hashFunc.Sum(nil)

		hashID := GetCryptoHash(hashName)
		opts := &rsa.PSSOptions{
			SaltLength: saltLength,
			Hash:       hashID,
		}
		err = rsa.VerifyPSS(key.RSAPublic, hashID, hashed, signature, opts)
		resolve(runtime.ToValue(err == nil))
		return runtime.ToValue(promise)

	case "RSASSA-PKCS1-V1_5":
		if key.Type != "public" || key.RSAPublic == nil {
			reject(runtime.NewTypeError("RSASSA-PKCS1-v1_5 verification requires a public RSA key"))
			return runtime.ToValue(promise)
		}
		if algUpper != "RSASSA-PKCS1-V1_5" {
			reject(runtime.NewTypeError("Algorithm.name must be 'RSASSA-PKCS1-v1_5' for this key"))
			return runtime.ToValue(promise)
		}

		// 与 sign 一致：hash 优先使用 key.Hash，其次 algorithm.hash
		hashName := key.Hash
		if hashName == "" {
			parsed, err := parseRsaHashParam(algObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			hashName = parsed
		}

		data, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}
		signature, err := convertToBytesInternal(runtime, sigVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"signature\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		opts := map[string]interface{}{"padding": 1}
		// VerifyWithRSA 返回 error==nil 表示验证通过
		if err := VerifyWithRSA(key.RSAPublic, strings.ToUpper(hashName), data, signature, opts); err != nil {
			resolve(runtime.ToValue(false))
		} else {
			resolve(runtime.ToValue(true))
		}
		return runtime.ToValue(promise)

	case "ECDSA":
		if key.Type != "public" || key.ECPublic == nil {
			reject(runtime.NewTypeError("ECDSA verification requires an ECDSA public key"))
			return runtime.ToValue(promise)
		}
		if algUpper != "ECDSA" {
			reject(runtime.NewTypeError("Algorithm.name must be 'ECDSA' for this key"))
			return runtime.ToValue(promise)
		}

		if algObj == nil {
			reject(runtime.NewTypeError("The \"algorithm\" object for ECDSA must have a 'hash' member"))
			return runtime.ToValue(promise)
		}
		hashVal := algObj.Get("hash")
		if hashVal == nil || goja.IsUndefined(hashVal) || goja.IsNull(hashVal) {
			reject(runtime.NewTypeError("The \"algorithm\" object for ECDSA must have a 'hash' member"))
			return runtime.ToValue(promise)
		}
		var hashName string
		if hashObj, ok := hashVal.(*goja.Object); ok && hashObj != nil {
			hashName = SafeGetString(hashObj.Get("name"))
		} else {
			hashName = SafeGetString(hashVal)
		}
		if hashName == "" {
			reject(runtime.NewTypeError("The \"hash\" member for ECDSA must specify a valid hash"))
			return runtime.ToValue(promise)
		}

		data, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}
		signature, err := convertToBytesInternal(runtime, sigVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"signature\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		opts := map[string]interface{}{"dsaEncoding": "der"}
		if err := VerifyWithECDSA(key.ECPublic, strings.ToUpper(hashName), data, signature, opts); err != nil {
			// WebCrypto verify 返回 boolean，不抛出错误
			resolve(runtime.ToValue(false))
		} else {
			resolve(runtime.ToValue(true))
		}
		return runtime.ToValue(promise)

	case "ED25519":
		if key.Type != "public" || key.EdPublic == nil {
			reject(runtime.NewTypeError("Ed25519 verification requires a public Ed25519 key"))
			return runtime.ToValue(promise)
		}
		if algUpper != "ED25519" {
			reject(runtime.NewTypeError("Algorithm.name must be 'Ed25519' for this key"))
			return runtime.ToValue(promise)
		}

		data, err := convertToBytesInternal(runtime, dataVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"data\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}
		signature, err := convertToBytesInternal(runtime, sigVal, true)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("The \"signature\" argument must be a BufferSource. %v", err)))
			return runtime.ToValue(promise)
		}

		if err := VerifyWithEd25519(key.EdPublic, data, signature); err != nil {
			resolve(runtime.ToValue(false))
		} else {
			resolve(runtime.ToValue(true))
		}
		return runtime.ToValue(promise)

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.verify for key algorithm %s", key.Algorithm)))
		return runtime.ToValue(promise)
	}
}

// newOperationError 创建一个 OperationError 风格的错误对象
func newOperationError(runtime *goja.Runtime, message string) *goja.Object {
	obj := runtime.NewObject()
	obj.Set("name", "OperationError")
	obj.Set("message", message)
	obj.Set("code", 0)
	return obj
}

// newInvalidAccessError 创建一个 InvalidAccessError 风格的错误对象
func newInvalidAccessError(runtime *goja.Runtime, message string) *goja.Object {
	obj := runtime.NewObject()
	obj.Set("name", "InvalidAccessError")
	obj.Set("message", message)
	return obj
}

// WebCryptoWrapKey 实现 subtle.wrapKey
func WebCryptoWrapKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	promise, resolve, reject := runtime.NewPromise()

	// format, key, wrappingKey, wrapAlgorithm
	if len(call.Arguments) < 4 {
		reject(runtime.NewTypeError("subtle.wrapKey requires format, key, wrappingKey, and wrapAlgorithm arguments"))
		return runtime.ToValue(promise)
	}

	formatVal := call.Arguments[0]
	keyVal := call.Arguments[1]
	wrappingKeyVal := call.Arguments[2]
	algVal := call.Arguments[3]

	format := strings.ToLower(SafeGetString(formatVal))
	if format == "" {
		reject(runtime.NewTypeError("The \"format\" argument must be a non-empty string"))
		return runtime.ToValue(promise)
	}

	key := getWebCryptoKey(runtime, keyVal)
	if key == nil {
		reject(runtime.NewTypeError("The provided key is not a valid CryptoKey"))
		return runtime.ToValue(promise)
	}
	wrappingKey := getWebCryptoKey(runtime, wrappingKeyVal)
	if wrappingKey == nil {
		reject(runtime.NewTypeError("The provided wrappingKey is not a valid CryptoKey"))
		return runtime.ToValue(promise)
	}
	if !hasKeyUsage(wrappingKey.Usages, "wrapkey") {
		reject(newInvalidAccessError(runtime, "CryptoKey does not allow 'wrapKey' usage"))
		return runtime.ToValue(promise)
	}
	if !key.Extractable {
		reject(newInvalidAccessError(runtime, "CryptoKey is not extractable"))
		return runtime.ToValue(promise)
	}

	algName, algObj := parseWebCryptoAlgorithm(runtime, algVal)
	if algName == "" {
		reject(runtime.NewTypeError("The \"algorithm\" argument must have a valid name"))
		return runtime.ToValue(promise)
	}
	algUpper := strings.ToUpper(algName)

	// 导出待包装密钥的原始字节（根据 format）
	var keyData []byte
	switch format {
	case "raw":
		if key.Type != "secret" {
			reject(runtime.NewTypeError("Only secret keys can be wrapped in 'raw' format"))
			return runtime.ToValue(promise)
		}
		alg := strings.ToUpper(key.Algorithm)
		if alg != "AES-GCM" && alg != "HMAC" && alg != "AES-KW" {
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm '%s' does not support 'raw' wrap", key.Algorithm)))
			return runtime.ToValue(promise)
		}
		keyData = append([]byte(nil), key.Secret...)

	case "pkcs8":
		if key.Type != "private" {
			reject(runtime.NewTypeError("Only private keys can be wrapped in 'pkcs8' format"))
			return runtime.ToValue(promise)
		}
		alg := strings.ToUpper(key.Algorithm)
		var priv interface{}
		switch alg {
		case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5", "RSASSA-PSS":
			if key.RSAPrivate == nil {
				reject(runtime.NewTypeError("RSA private key material is missing"))
				return runtime.ToValue(promise)
			}
			priv = key.RSAPrivate
		case "ECDSA", "ECDH":
			if key.ECPrivate == nil {
				reject(runtime.NewTypeError("EC private key material is missing"))
				return runtime.ToValue(promise)
			}
			priv = key.ECPrivate
		case "ED25519":
			if key.EdPrivate == nil {
				reject(runtime.NewTypeError("Ed25519 private key material is missing"))
				return runtime.ToValue(promise)
			}
			priv = key.EdPrivate
		default:
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm '%s' does not support 'pkcs8' wrap", key.Algorithm)))
			return runtime.ToValue(promise)
		}
		der, err := x509.MarshalPKCS8PrivateKey(priv)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("Failed to marshal private key: %w", err)))
			return runtime.ToValue(promise)
		}
		keyData = der

	case "jwk":
		// 目前仅覆盖对称 AES-GCM secret key 的 JWK 包装
		if key.Type != "secret" {
			reject(runtime.NewTypeError("Only secret keys can be wrapped in 'jwk' format as currently implemented"))
			return runtime.ToValue(promise)
		}
		alg := strings.ToUpper(key.Algorithm)
		if alg != "AES-GCM" {
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm '%s' does not support 'jwk' wrap", key.Algorithm)))
			return runtime.ToValue(promise)
		}
		encoded := base64.RawURLEncoding.EncodeToString(key.Secret)
		jwkMap := map[string]interface{}{
			"kty": "oct",
			"k":   encoded,
		}
		b, err := json.Marshal(jwkMap)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("Failed to serialize JWK: %w", err)))
			return runtime.ToValue(promise)
		}
		keyData = b

	case "spki":
		if key.Type != "public" {
			reject(runtime.NewTypeError("Only public keys can be wrapped in 'spki' format"))
			return runtime.ToValue(promise)
		}
		alg := strings.ToUpper(key.Algorithm)
		var pub interface{}
		switch alg {
		case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5", "RSASSA-PSS":
			if key.RSAPublic == nil {
				reject(runtime.NewTypeError("RSA public key material is missing"))
				return runtime.ToValue(promise)
			}
			pub = key.RSAPublic
		case "ECDSA", "ECDH":
			if key.ECPublic == nil {
				reject(runtime.NewTypeError("EC public key material is missing"))
				return runtime.ToValue(promise)
			}
			pub = key.ECPublic
		case "ED25519":
			if key.EdPublic == nil {
				reject(runtime.NewTypeError("Ed25519 public key material is missing"))
				return runtime.ToValue(promise)
			}
			pub = key.EdPublic
		default:
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm '%s' does not support 'spki' wrap", key.Algorithm)))
			return runtime.ToValue(promise)
		}

		der, err := x509.MarshalPKIXPublicKey(pub)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("Failed to marshal public key: %w", err)))
			return runtime.ToValue(promise)
		}
		keyData = der

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Unsupported format for wrapKey: '%s'", format)))
		return runtime.ToValue(promise)
	}

	// 使用包装密钥和算法对 keyData 进行加密
	switch strings.ToUpper(wrappingKey.Algorithm) {
	case "AES-KW":
		if algUpper != "AES-KW" {
			reject(runtime.NewTypeError("Algorithm.name must be 'AES-KW' for this key"))
			return runtime.ToValue(promise)
		}
		if wrappingKey.Type != "secret" {
			reject(runtime.NewTypeError("AES-KW wrapping key must be a secret key"))
			return runtime.ToValue(promise)
		}

		var cipherName string
		var err error
		if format == "jwk" {
			cipherName, err = getAesKwpCipherName(len(wrappingKey.Secret))
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		} else {
			if len(keyData) < 16 || len(keyData)%8 != 0 {
				reject(newOperationError(runtime, "AES-KW input data length is invalid"))
				return runtime.ToValue(promise)
			}
			cipherName, err = getAesKwCipherName(len(wrappingKey.Secret))
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		}

		ctx, err := NewCipherCtxByName(cipherName, wrappingKey.Secret, nil, true)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		out1, err := ctx.Update(keyData)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		ciphertext := append(out1, out2...)
		resolve(runtime.NewArrayBuffer(ciphertext))
		return runtime.ToValue(promise)

	case "AES-GCM":
		if algUpper != "AES-GCM" {
			reject(runtime.NewTypeError("Algorithm.name must be 'AES-GCM' for this key"))
			return runtime.ToValue(promise)
		}
		if wrappingKey.Type != "secret" {
			reject(runtime.NewTypeError("The provided wrappingKey is not a valid CryptoKey of type 'secret'"))
			return runtime.ToValue(promise)
		}

		iv, aad, tagLenBits, err := parseAesGcmParams(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		tagLenBytes := tagLenBits / 8

		cipherName, err := getAesGcmCipherName(len(wrappingKey.Secret))
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ctx, err := NewCipherCtxByName(cipherName, wrappingKey.Secret, iv, true)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		if len(aad) > 0 {
			if err := ctx.SetAAD(aad); err != nil {
				reject(runtime.NewGoError(err))
				return runtime.ToValue(promise)
			}
		}

		out1, err := ctx.Update(keyData)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		ciphertext := append(out1, out2...)

		tag, err := ctx.GetTag(tagLenBytes)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}

		result := append(ciphertext, tag...)
		resolve(runtime.NewArrayBuffer(result))
		return runtime.ToValue(promise)

	case "AES-CBC":
		if algUpper != "AES-CBC" {
			reject(runtime.NewTypeError("Algorithm.name must be 'AES-CBC' for this key"))
			return runtime.ToValue(promise)
		}
		if wrappingKey.Type != "secret" {
			reject(runtime.NewTypeError("The provided wrappingKey is not a valid CryptoKey of type 'secret'"))
			return runtime.ToValue(promise)
		}

		iv, err := parseAesCbcParams(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		cipherName, err := getAesCbcCipherName(len(wrappingKey.Secret))
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ctx, err := NewCipherCtxByName(cipherName, wrappingKey.Secret, iv, true)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		out1, err := ctx.Update(keyData)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		ciphertext := append(out1, out2...)
		resolve(runtime.NewArrayBuffer(ciphertext))
		return runtime.ToValue(promise)

	case "RSA-OAEP":
		canonAlg := canonicalizeRsaAlgorithm(wrappingKey.Algorithm)
		if canonAlg != "RSA-OAEP" || algUpper != "RSA-OAEP" {
			reject(runtime.NewTypeError("Algorithm.name must be 'RSA-OAEP' for this key"))
			return runtime.ToValue(promise)
		}
		if wrappingKey.Type != "public" || wrappingKey.RSAPublic == nil {
			reject(runtime.NewTypeError("RSA-OAEP wrapping requires a public RSA key"))
			return runtime.ToValue(promise)
		}

		hashName := wrappingKey.Hash
		// 优先使用密钥上的 hash 配置；只有在缺失时才从 algorithm 对象解析
		if hashName == "" && algObj != nil {
			var err error
			hashName, err = parseRsaHashParam(algObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		}
		label, err := parseRsaOaepLabel(runtime, algObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		hashFunc, err := GetHashFunction(hashName)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}

		ciphertext, err := rsa.EncryptOAEP(hashFunc, rand.Reader, wrappingKey.RSAPublic, keyData, label)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("RSA-OAEP encryption failed: %w", err)))
			return runtime.ToValue(promise)
		}
		resolve(runtime.NewArrayBuffer(ciphertext))
		return runtime.ToValue(promise)

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.wrapKey for key algorithm %s", wrappingKey.Algorithm)))
		return runtime.ToValue(promise)
	}
}

// WebCryptoUnwrapKey 实现 subtle.unwrapKey
func WebCryptoUnwrapKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	promise, resolve, reject := runtime.NewPromise()

	// format, wrappedKey, unwrappingKey, unwrapAlgorithm, unwrappedKeyAlgorithm, extractable, keyUsages
	if len(call.Arguments) < 7 {
		reject(runtime.NewTypeError("subtle.unwrapKey requires format, wrappedKey, unwrappingKey, unwrapAlgorithm, unwrappedKeyAlgorithm, extractable, and keyUsages arguments"))
		return runtime.ToValue(promise)
	}

	formatVal := call.Arguments[0]
	wrappedKeyVal := call.Arguments[1]
	unwrappingKeyVal := call.Arguments[2]
	unwrapAlgVal := call.Arguments[3]
	unwrappedAlgVal := call.Arguments[4]
	extractableVal := call.Arguments[5]
	usagesVal := call.Arguments[6]

	format := strings.ToLower(SafeGetString(formatVal))
	if format == "" {
		reject(runtime.NewTypeError("The \"format\" argument must be a non-empty string"))
		return runtime.ToValue(promise)
	}

	unwrappingKey := getWebCryptoKey(runtime, unwrappingKeyVal)
	if unwrappingKey == nil {
		reject(runtime.NewTypeError("The provided unwrappingKey is not a valid CryptoKey"))
		return runtime.ToValue(promise)
	}
	if !hasKeyUsage(unwrappingKey.Usages, "unwrapkey") {
		reject(newInvalidAccessError(runtime, "CryptoKey does not allow 'unwrapKey' usage"))
		return runtime.ToValue(promise)
	}

	unwrapAlgName, unwrapAlgObj := parseWebCryptoAlgorithm(runtime, unwrapAlgVal)
	if unwrapAlgName == "" {
		reject(runtime.NewTypeError("The \"algorithm\" argument must have a valid name"))
		return runtime.ToValue(promise)
	}
	unwrapAlgUpper := strings.ToUpper(unwrapAlgName)

	unwrappedAlgName, unwrappedAlgObj := parseWebCryptoAlgorithm(runtime, unwrappedAlgVal)
	if unwrappedAlgName == "" {
		reject(runtime.NewTypeError("The \"unwrappedKeyAlgorithm\" argument must have a valid name"))
		return runtime.ToValue(promise)
	}
	unwrappedAlgUpper := strings.ToUpper(unwrappedAlgName)

	// 先使用 unwrappingKey 和 unwrapAlgorithm 解密 wrappedKey，得到原始 keyData
	ciphertext, err := convertToBytesInternal(runtime, wrappedKeyVal, true)
	if err != nil {
		reject(runtime.NewTypeError(fmt.Sprintf("The \"wrappedKey\" argument must be a BufferSource. %v", err)))
		return runtime.ToValue(promise)
	}

	var keyData []byte
	switch strings.ToUpper(unwrappingKey.Algorithm) {
	case "AES-KW":
		if unwrapAlgUpper != "AES-KW" {
			reject(runtime.NewTypeError("Algorithm.name must be 'AES-KW' for this key"))
			return runtime.ToValue(promise)
		}
		if unwrappingKey.Type != "secret" {
			reject(runtime.NewTypeError("AES-KW unwrapping key must be a secret key"))
			return runtime.ToValue(promise)
		}

		var cipherName string
		var err error
		if format == "jwk" {
			cipherName, err = getAesKwpCipherName(len(unwrappingKey.Secret))
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		} else {
			if len(ciphertext) < 24 || len(ciphertext)%8 != 0 {
				reject(newOperationError(runtime, "AES-KW input data length is invalid"))
				return runtime.ToValue(promise)
			}
			cipherName, err = getAesKwCipherName(len(unwrappingKey.Secret))
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		}

		ctx, err := NewCipherCtxByName(cipherName, unwrappingKey.Secret, nil, false)
		if err != nil {
			// 篡改、密钥不匹配等导致的失败在 WebCrypto 中表现为 OperationError
			reject(newOperationError(runtime, "AES-KW unwrap failed"))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		out1, err := ctx.Update(ciphertext)
		if err != nil {
			reject(newOperationError(runtime, "AES-KW unwrap failed"))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(newOperationError(runtime, "AES-KW unwrap failed"))
			return runtime.ToValue(promise)
		}
		keyData = append(out1, out2...)

	case "AES-GCM":
		if unwrapAlgUpper != "AES-GCM" {
			reject(runtime.NewTypeError("Algorithm.name must be 'AES-GCM' for this key"))
			return runtime.ToValue(promise)
		}
		if unwrappingKey.Type != "secret" {
			reject(runtime.NewTypeError("The provided unwrappingKey is not a valid CryptoKey of type 'secret'"))
			return runtime.ToValue(promise)
		}

		iv, aad, tagLenBits, err := parseAesGcmParams(runtime, unwrapAlgObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		tagLenBytes := tagLenBits / 8
		if len(ciphertext) < tagLenBytes {
			reject(runtime.NewTypeError("Ciphertext is too short for the given tagLength"))
			return runtime.ToValue(promise)
		}

		ct := ciphertext[:len(ciphertext)-tagLenBytes]
		tag := ciphertext[len(ciphertext)-tagLenBytes:]

		cipherName, err := getAesGcmCipherName(len(unwrappingKey.Secret))
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ctx, err := NewCipherCtxByName(cipherName, unwrappingKey.Secret, iv, false)
		if err != nil {
			reject(newOperationError(runtime, "AES-GCM unwrap failed"))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		if err := ctx.SetTag(tag); err != nil {
			reject(newOperationError(runtime, "AES-GCM unwrap failed"))
			return runtime.ToValue(promise)
		}
		if len(aad) > 0 {
			if err := ctx.SetAAD(aad); err != nil {
				reject(newOperationError(runtime, "AES-GCM unwrap failed"))
				return runtime.ToValue(promise)
			}
		}

		out1, err := ctx.Update(ct)
		if err != nil {
			reject(newOperationError(runtime, "AES-GCM unwrap failed"))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(newOperationError(runtime, "AES-GCM unwrap failed"))
			return runtime.ToValue(promise)
		}
		keyData = append(out1, out2...)

	case "AES-CBC":
		if unwrapAlgUpper != "AES-CBC" {
			reject(runtime.NewTypeError("Algorithm.name must be 'AES-CBC' for this key"))
			return runtime.ToValue(promise)
		}
		if unwrappingKey.Type != "secret" {
			reject(runtime.NewTypeError("The provided unwrappingKey is not a valid CryptoKey of type 'secret'"))
			return runtime.ToValue(promise)
		}

		iv, err := parseAesCbcParams(runtime, unwrapAlgObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		cipherName, err := getAesCbcCipherName(len(unwrappingKey.Secret))
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		ctx, err := NewCipherCtxByName(cipherName, unwrappingKey.Secret, iv, false)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		defer ctx.Close()

		out1, err := ctx.Update(ciphertext)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		out2, err := ctx.Final()
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}
		keyData = append(out1, out2...)

	case "RSA-OAEP":
		canonAlg := canonicalizeRsaAlgorithm(unwrappingKey.Algorithm)
		if canonAlg != "RSA-OAEP" || unwrapAlgUpper != "RSA-OAEP" {
			reject(runtime.NewTypeError("Algorithm.name must be 'RSA-OAEP' for this key"))
			return runtime.ToValue(promise)
		}
		if unwrappingKey.Type != "private" || unwrappingKey.RSAPrivate == nil {
			reject(runtime.NewTypeError("RSA-OAEP unwrapping requires a private RSA key"))
			return runtime.ToValue(promise)
		}

		hashName := unwrappingKey.Hash
		// 优先使用密钥上的 hash 配置；只有在缺失时才从 algorithm 对象解析
		if hashName == "" && unwrapAlgObj != nil {
			var err error
			hashName, err = parseRsaHashParam(unwrapAlgObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
		}
		label, err := parseRsaOaepLabel(runtime, unwrapAlgObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		hashFunc, err := GetHashFunction(hashName)
		if err != nil {
			reject(runtime.NewGoError(err))
			return runtime.ToValue(promise)
		}

		plaintext, err := rsa.DecryptOAEP(hashFunc, rand.Reader, unwrappingKey.RSAPrivate, ciphertext, label)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("RSA-OAEP decryption failed: %w", err)))
			return runtime.ToValue(promise)
		}
		keyData = plaintext

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.unwrapKey for key algorithm %s", unwrappingKey.Algorithm)))
		return runtime.ToValue(promise)
	}

	extractable := extractableVal.ToBoolean()

	// 根据 format 和 unwrappedKeyAlgorithm 将 keyData 导入为新的 CryptoKey
	switch format {
	case "raw":
		keyLenBits := len(keyData) * 8
		switch unwrappedAlgUpper {
		case "AES-GCM":
			if keyLenBits != 128 && keyLenBits != 192 && keyLenBits != 256 {
				reject(runtime.NewTypeError(fmt.Sprintf("Invalid AES-GCM raw key length: %d bits", keyLenBits)))
				return runtime.ToValue(promise)
			}

			if unwrappedAlgObj != nil {
				lenVal := unwrappedAlgObj.Get("length")
				if lenVal != nil && !goja.IsUndefined(lenVal) && !goja.IsNull(lenVal) {
					if exported := lenVal.Export(); exported != nil {
						switch exported.(type) {
						case int, int32, int64, float32, float64:
							algLen := int(lenVal.ToInteger())
							if algLen != keyLenBits {
								reject(runtime.NewTypeError(fmt.Sprintf("The AES-GCM keyData length (%d) does not match algorithm.length (%d)", keyLenBits, algLen)))
								return runtime.ToValue(promise)
							}
						default:
							reject(runtime.NewTypeError("The \"length\" member must be a number"))
							return runtime.ToValue(promise)
						}
					}
				}
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			keyObj := newWebCryptoSecretKey(runtime, "AES-GCM", keyLenBits, extractable, usages, keyData)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "AES-KW":
			if keyLenBits != 128 && keyLenBits != 192 && keyLenBits != 256 {
				reject(runtime.NewTypeError(fmt.Sprintf("Invalid AES-KW raw key length: %d bits", keyLenBits)))
				return runtime.ToValue(promise)
			}

			if unwrappedAlgObj != nil {
				lenVal := unwrappedAlgObj.Get("length")
				if lenVal != nil && !goja.IsUndefined(lenVal) && !goja.IsNull(lenVal) {
					if exported := lenVal.Export(); exported != nil {
						switch exported.(type) {
						case int, int32, int64, float32, float64:
							algLen := int(lenVal.ToInteger())
							if algLen != keyLenBits {
								reject(runtime.NewTypeError(fmt.Sprintf("The AES-KW keyData length (%d) does not match algorithm.length (%d)", keyLenBits, algLen)))
								return runtime.ToValue(promise)
							}
						default:
							reject(runtime.NewTypeError("The \"length\" member must be a number"))
							return runtime.ToValue(promise)
						}
					}
				}
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			keyObj := newWebCryptoSecretKey(runtime, "AES-KW", keyLenBits, extractable, usages, keyData)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "HMAC":
			if keyLenBits <= 0 {
				reject(runtime.NewTypeError("The \"keyData\" length for HMAC must be > 0"))
				return runtime.ToValue(promise)
			}

			hashName, _, err := parseHmacParams(runtime, unwrappedAlgObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			if unwrappedAlgObj != nil {
				lenVal := unwrappedAlgObj.Get("length")
				if lenVal != nil && !goja.IsUndefined(lenVal) && !goja.IsNull(lenVal) {
					if exported := lenVal.Export(); exported != nil {
						switch exported.(type) {
						case int, int32, int64, float32, float64:
							algLen := int(lenVal.ToInteger())
							if algLen != keyLenBits {
								reject(runtime.NewTypeError(fmt.Sprintf("The HMAC keyData length (%d) does not match algorithm.length (%d)", keyLenBits, algLen)))
								return runtime.ToValue(promise)
							}
						default:
							reject(runtime.NewTypeError("The \"length\" member must be a number"))
							return runtime.ToValue(promise)
						}
					}
				}
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			keyObj := newWebCryptoHMACKey(runtime, hashName, keyLenBits, extractable, usages, keyData)
			resolve(keyObj)
			return runtime.ToValue(promise)

		default:
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.unwrapKey with 'raw' format: %s", unwrappedAlgName)))
			return runtime.ToValue(promise)
		}

	case "jwk":
		// keyData 是 UTF-8 编码的 JWK JSON 字符串
		var jwkMap map[string]interface{}
		if err := json.Unmarshal(keyData, &jwkMap); err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("Failed to parse JWK JSON: %v", err)))
			return runtime.ToValue(promise)
		}

		jwkObj := runtime.NewObject()
		for k, v := range jwkMap {
			jwkObj.Set(k, v)
		}

		keyObj, err := importJWKKey(runtime, unwrappedAlgName, unwrappedAlgUpper, jwkObj, extractable, usagesVal, unwrappedAlgObj)
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}
		resolve(keyObj)
		return runtime.ToValue(promise)

	case "spki":
		pubKeyAny, err := x509.ParsePKIXPublicKey(keyData)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("Failed to parse SPKI public key: %v", err)))
			return runtime.ToValue(promise)
		}

		switch unwrappedAlgUpper {
		case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5", "RSASSA-PSS":
			// RSA 公钥导入
			rsaPub, ok := pubKeyAny.(*rsa.PublicKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an RSA public key"))
				return runtime.ToValue(promise)
			}

			canonAlg := canonicalizeRsaAlgorithm(unwrappedAlgName)
			hashName, err := parseRsaHashParam(unwrappedAlgObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			if canonAlg == "RSA-OAEP" {
				if err := validateKeyUsagesSubset(usages, []string{"encrypt", "wrapkey"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			} else {
				if err := validateKeyUsagesSubset(usages, []string{"verify"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			}

			keyObj := newWebCryptoRSAKey(runtime, canonAlg, hashName, extractable, usages, rsaPub, nil)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "ECDSA", "ECDH":
			// EC 公钥导入
			ecPub, ok := pubKeyAny.(*ecdsa.PublicKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an EC public key"))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if unwrappedAlgUpper == "ECDSA" {
				if err := validateKeyUsagesSubset(usages, []string{"verify"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			} else {
				if err := validateKeyUsagesSubset(usages, []string{"deriveKey", "deriveBits"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			}

			curveName := ""
			switch ecPub.Curve {
			case elliptic.P256():
				curveName = "P-256"
			case elliptic.P384():
				curveName = "P-384"
			case elliptic.P521():
				curveName = "P-521"
			default:
				reject(runtime.NewTypeError("unsupported EC curve for SPKI key"))
				return runtime.ToValue(promise)
			}

			keyObj := newWebCryptoECKey(runtime, unwrappedAlgUpper, curveName, extractable, usages, ecPub, nil)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "ED25519":
			// Ed25519 公钥导入
			edPub, ok := pubKeyAny.(ed25519.PublicKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an Ed25519 public key"))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if err := validateKeyUsagesSubset(usages, []string{"verify"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			keyObj := newWebCryptoEd25519Key(runtime, true, extractable, usages, edPub, nil)
			resolve(keyObj)
			return runtime.ToValue(promise)

		default:
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.unwrapKey with 'spki' format: %s", unwrappedAlgName)))
			return runtime.ToValue(promise)
		}

	case "pkcs8":
		privKeyAny, err := x509.ParsePKCS8PrivateKey(keyData)
		if err != nil {
			reject(runtime.NewTypeError(fmt.Sprintf("Failed to parse PKCS8 private key: %v", err)))
			return runtime.ToValue(promise)
		}

		switch unwrappedAlgUpper {
		case "RSA-OAEP", "RSA-PSS", "RSASSA-PKCS1-V1_5", "RSASSA-PSS":
			rsaPriv, ok := privKeyAny.(*rsa.PrivateKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an RSA private key"))
				return runtime.ToValue(promise)
			}

			canonAlg := canonicalizeRsaAlgorithm(unwrappedAlgName)
			hashName, err := parseRsaHashParam(unwrappedAlgObj)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}

			if canonAlg == "RSA-OAEP" {
				if err := validateKeyUsagesSubset(usages, []string{"decrypt", "unwrapkey"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			} else {
				if err := validateKeyUsagesSubset(usages, []string{"sign"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			}

			keyObj := newWebCryptoRSAKey(runtime, canonAlg, hashName, extractable, usages, nil, rsaPriv)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "ECDSA", "ECDH":
			ecPriv, ok := privKeyAny.(*ecdsa.PrivateKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an EC private key"))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if unwrappedAlgUpper == "ECDSA" {
				if err := validateKeyUsagesSubset(usages, []string{"sign"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			} else {
				if err := validateKeyUsagesSubset(usages, []string{"deriveKey", "deriveBits"}); err != nil {
					reject(runtime.NewTypeError(err.Error()))
					return runtime.ToValue(promise)
				}
			}

			curveName := ""
			switch ecPriv.Curve {
			case elliptic.P256():
				curveName = "P-256"
			case elliptic.P384():
				curveName = "P-384"
			case elliptic.P521():
				curveName = "P-521"
			default:
				reject(runtime.NewTypeError("unsupported EC curve for PKCS8 key"))
				return runtime.ToValue(promise)
			}

			keyObj := newWebCryptoECKey(runtime, unwrappedAlgUpper, curveName, extractable, usages, nil, ecPriv)
			resolve(keyObj)
			return runtime.ToValue(promise)

		case "ED25519":
			edPriv, ok := privKeyAny.(ed25519.PrivateKey)
			if !ok {
				reject(runtime.NewTypeError("The provided key is not an Ed25519 private key"))
				return runtime.ToValue(promise)
			}

			usages, err := parseKeyUsages(runtime, usagesVal)
			if err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if err := validateKeyUsagesSubset(usages, []string{"sign"}); err != nil {
				reject(runtime.NewTypeError(err.Error()))
				return runtime.ToValue(promise)
			}
			if len(edPriv) != ed25519.PrivateKeySize {
				reject(runtime.NewTypeError(fmt.Sprintf("Invalid Ed25519 private key length: %d", len(edPriv))))
				return runtime.ToValue(promise)
			}
			pub := ed25519.PublicKey(edPriv[ed25519.SeedSize:])
			keyObj := newWebCryptoEd25519Key(runtime, false, extractable, usages, pub, edPriv)
			resolve(keyObj)
			return runtime.ToValue(promise)

		default:
			reject(runtime.NewTypeError(fmt.Sprintf("Algorithm not supported by subtle.unwrapKey with 'pkcs8' format: %s", unwrappedAlgName)))
			return runtime.ToValue(promise)
		}

	default:
		reject(runtime.NewTypeError(fmt.Sprintf("Unsupported format for unwrapKey: '%s'", format)))
		return runtime.ToValue(promise)
	}
}
