package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/des"
	"crypto/dsa"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/x509"
	"encoding/asn1"
	"encoding/pem"
	"fmt"
	"hash"
	"math/big"
	"strings"

	"github.com/dop251/goja"
	"golang.org/x/crypto/pbkdf2"
)

// ============================================================================
// 🔥 PKCS#8 PBES2 手动解密实现（支持 Node.js 加密私钥）
// ============================================================================

// PKCS#8 OID definitions
var (
	oidPBES2Local      = asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 5, 13}
	oidPBKDF2Local     = asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 5, 12}
	oidAES128CBCLocal  = asn1.ObjectIdentifier{2, 16, 840, 1, 101, 3, 4, 1, 2}
	oidAES192CBCLocal  = asn1.ObjectIdentifier{2, 16, 840, 1, 101, 3, 4, 1, 22}
	oidAES256CBCLocal  = asn1.ObjectIdentifier{2, 16, 840, 1, 101, 3, 4, 1, 42}
	oidDESCBCLocal     = asn1.ObjectIdentifier{1, 3, 14, 3, 2, 7}
	oidDESEDE3CBCLocal = asn1.ObjectIdentifier{1, 2, 840, 113549, 3, 7}
	oidHMACSHA256Local = asn1.ObjectIdentifier{1, 2, 840, 113549, 2, 9}
	oidHMACSHA384Local = asn1.ObjectIdentifier{1, 2, 840, 113549, 2, 10}
	oidHMACSHA512Local = asn1.ObjectIdentifier{1, 2, 840, 113549, 2, 11}
)

type pkcs8EncryptedPrivateKeyInfo struct {
	EncryptionAlgorithm pkcs8AlgorithmIdentifier
	EncryptedData       []byte
}

type pkcs8AlgorithmIdentifier struct {
	Algorithm  asn1.ObjectIdentifier
	Parameters asn1.RawValue
}

type pkcs8PBES2Params struct {
	KeyDerivationFunc pkcs8AlgorithmIdentifier
	EncryptionScheme  pkcs8AlgorithmIdentifier
}

type pkcs8PBKDF2Params struct {
	Salt           []byte
	IterationCount int
	KeyLength      int                      `asn1:"optional"`
	PRF            pkcs8AlgorithmIdentifier `asn1:"optional"`
}

// ============================================================================
// 🔥 密钥对象管理 - 100%完整实现（包含JWK支持）
// ============================================================================

// CreatePublicKey 创建公钥对象 (Node.js 18+ 完整兼容)
func CreatePublicKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createPublicKey 需要 key 参数"))
	}

	firstArg := call.Arguments[0]

	if goja.IsNull(firstArg) {
		panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received null"))
	}
	if goja.IsUndefined(firstArg) {
		panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received undefined"))
	}
	if _, isSymbol := firstArg.(*goja.Symbol); isSymbol {
		panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received type symbol"))
	}

	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		className := obj.ClassName()
		if className == "Symbol" {
			panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received type symbol"))
		}
		if className == "RegExp" || className == "Date" {
			panic(runtime.NewTypeError("Invalid key type"))
		}
		// 仅当 JS 层面是真正的 Array 时视为数组；TypedArray 等保留
		if className == "Array" {
			panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received an instance of Array"))
		}
		if _, isFunc := goja.AssertFunction(obj); isFunc {
			panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received type function"))
		}
	} else {
		exported := firstArg.Export()
		if _, ok := exported.(string); !ok {
			typeStr := "type unknown"
			switch v := exported.(type) {
			case nil:
				typeStr = "null"
			case bool:
				typeStr = "type boolean"
			case float64, int, int64:
				typeStr = "type number"
			default:
				typeStr = fmt.Sprintf("type %T", v)
			}
			panic(runtime.NewTypeError(fmt.Sprintf(
				"The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received %s",
				typeStr,
			)))
		}
	}

	var keyFormat string = "pem"
	var keyEncoding string
	var hasFormatProp bool
	var hasEncodingProp bool

	// 检查是否是对象参数（可能包含 format: 'jwk'）
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		hasKeyProp := obj.Get("key") != nil && !goja.IsUndefined(obj.Get("key"))
		hasFormatProp = obj.Get("format") != nil && !goja.IsUndefined(obj.Get("format"))
		hasEncodingProp = obj.Get("encoding") != nil && !goja.IsUndefined(obj.Get("encoding")) && !goja.IsNull(obj.Get("encoding"))

		// 如果没有 key 和 format 属性，可能是直接传入的 KeyObject
		if !hasKeyProp && !hasFormatProp {
			// 检查是否是 KeyObject（有 type 和 asymmetricKeyType）
			if keyType := obj.Get("type"); !goja.IsUndefined(keyType) && !goja.IsNull(keyType) {
				typeStr := SafeGetString(keyType)
				// secret KeyObject 不能用于派生公钥，按照 Node.js 行为抛 TypeError
				if typeStr == "secret" {
					panic(runtime.NewTypeError("KeyObject type 'secret' cannot be used to create a public key"))
				}
				// Node.js 行为：createPublicKey() 可以接受私钥对象或公钥对象
				if typeStr == "public" || typeStr == "private" {
					// 检查是否有 export 方法
					if exportFunc := obj.Get("export"); !goja.IsUndefined(exportFunc) && !goja.IsNull(exportFunc) {
						// 这是一个 KeyObject，调用其 export 方法获取 PEM
						if callable, ok := goja.AssertFunction(exportFunc); ok {
							// 根据密钥类型选择导出格式
							exportOpts := runtime.NewObject()
							exportOpts.Set("format", "pem")
							if typeStr == "private" {
								// 私钥导出为 pkcs8 格式
								exportOpts.Set("type", "pkcs8")
							} else {
								// 公钥导出为 spki 格式
								exportOpts.Set("type", "spki")
							}

							result, err := callable(obj, exportOpts)
							if err != nil {
								panic(runtime.NewGoError(fmt.Errorf("导出密钥失败: %w", err)))
							}

							// 使用导出的 PEM 解析公钥
							// ParsePublicKeyPEM 支持从私钥 PEM 中提取公钥
							keyPEM := result.String()
							publicKey, parseErr := ParsePublicKeyPEM(keyPEM)
							if parseErr != nil {
								panic(runtime.NewGoError(fmt.Errorf("解析密钥失败: %w", parseErr)))
							}
							return CreatePublicKeyObject(runtime, publicKey)
						}
					}
				}
			}
		}

		// 获取 format
		if formatVal := obj.Get("format"); !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
			keyFormat = strings.ToLower(SafeGetString(formatVal))
		}
		if hasEncodingProp {
			keyEncoding = strings.ToLower(SafeGetString(obj.Get("encoding")))
		}
	}

	if hasFormatProp {
		switch keyFormat {
		case "pem", "der", "jwk":
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"format\" property must be one of 'pem', 'der', or 'jwk'. Received '%s'", keyFormat)))
		}
	}
	if hasEncodingProp && keyEncoding != "" {
		switch keyEncoding {
		case "utf8", "utf-8", "ascii", "latin1", "binary", "base64", "hex":
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", keyEncoding)))
		}
	}

	// JWK 格式处理
	if keyFormat == "jwk" {
		if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
			keyVal := obj.Get("key")
			if keyObj, ok := keyVal.(*goja.Object); ok && keyObj != nil {
				// 将 goja.Object 转换为 map[string]interface{}
				jwkMap := make(map[string]interface{})
				for _, key := range keyObj.Keys() {
					val := keyObj.Get(key)
					if val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
						jwkMap[key] = val.Export()
					}
				}
				// 使用通用的 JWK 解析器
				key, keyType, err := JWKToPublicKey(jwkMap)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("解析JWK公钥失败: %w", err)))
				}
				// 根据密钥类型返回相应的 KeyObject
				return CreateKeyObject(runtime, key, keyType, true) // true = 公钥
			} else {
				panic(runtime.NewTypeError("JWK 格式的 key 必须是对象"))
			}
		} else {
			panic(runtime.NewTypeError("JWK 格式需要对象参数"))
		}
	} else {
		// PEM/DER 格式处理
		var keyPEM string
		if keyFormat == "der" {
			if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
				keyPEM = ExtractKeyFromDEROptions(runtime, obj)
			} else {
				panic(runtime.NewTypeError("DER 格式需要对象参数"))
			}
		} else {
			keyPEM = ExtractKeyPEMWithEncoding(runtime, firstArg, keyEncoding)
		}

		// 使用通用解析器
		key, keyType, err := ParseAnyPublicKeyPEM(keyPEM)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("解析公钥失败: %w", err)))
		}

		// 根据密钥类型返回相应的 KeyObject
		if keyType == "rsa" {
			if rsaKey, ok := key.(*rsa.PublicKey); ok {
				return CreatePublicKeyObject(runtime, rsaKey)
			}
		}

		// 对于非 RSA 密钥，使用通用 KeyObject 创建
		return CreateKeyObject(runtime, key, keyType, true) // true = 公钥
	}

	// 这段代码应该永远不会被执行，因为上面的 if/else 涵盖了所有情况
	return goja.Undefined() // 保留一条兜底返回以满足编译器
}

// CreatePrivateKey 创建私钥对象 (Node.js 18+ 完整兼容)
func CreatePrivateKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createPrivateKey 需要 key 参数"))
	}

	firstArg := call.Arguments[0]

	// 严格类型检查：检查是否是非法类型
	if goja.IsNull(firstArg) {
		panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received null"))
	}
	if goja.IsUndefined(firstArg) {
		panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received undefined"))
	}

	// 检查是否是 Symbol（必须在任何 Export 或字符串转换之前）
	if _, isSymbol := firstArg.(*goja.Symbol); isSymbol {
		panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received type symbol"))
	}

	// 检查是否是对象（可能是 Object/Buffer/TypedArray/Array/Function/Symbol）
	if obj, ok := firstArg.(*goja.Object); ok {
		// 检查是否是 Symbol（Symbol 在某些情况下会被封装为对象）
		if obj.ClassName() == "Symbol" {
			panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received type symbol"))
		}

		// 是对象，检查是否是数组或函数
		exported := obj.Export()
		if _, isArray := exported.([]interface{}); isArray {
			panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received an instance of Array"))
		}
		// 检查是否是函数
		if _, isFunc := goja.AssertFunction(obj); isFunc {
			panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received type function"))
		}
		// 其他对象类型继续处理
	} else {
		// 不是对象，只能是原始类型
		// 特殊处理：检查是否是 Symbol（Symbol 在 goja 中可能以特殊方式表示）
		// Symbol 不能被 Export，会导致特定行为
		if firstArg.ExportType() != nil {
			typeName := firstArg.ExportType().String()
			if strings.Contains(typeName, "Symbol") || strings.Contains(typeName, "symbol") {
				panic(runtime.NewTypeError("The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received type symbol"))
			}
		}

		exported := firstArg.Export()
		// 如果是字符串，允许
		if _, ok := exported.(string); ok {
			// 字符串类型，继续处理
		} else {
			// 其他原始类型（数字、布尔等）不允许
			typeStr := "type unknown"
			switch v := exported.(type) {
			case nil:
				typeStr = "null"
			case bool:
				typeStr = "type boolean"
			case float64, int, int64:
				typeStr = "type number"
			default:
				typeStr = fmt.Sprintf("type %T", v)
			}
			panic(runtime.NewTypeError(fmt.Sprintf(
				"The \"key\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received %s",
				typeStr,
			)))
		}
	}

	var keyFormat string = "pem"
	var keyEncoding string = ""
	var passphraseBytes []byte

	// 检查是否是对象参数（可能包含 format: 'jwk' 或其他选项）
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		// 获取 format、encoding 和 passphrase
		if formatVal := obj.Get("format"); !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
			keyFormat = strings.ToLower(SafeGetString(formatVal))
		}
		if encodingVal := obj.Get("encoding"); !goja.IsUndefined(encodingVal) && !goja.IsNull(encodingVal) {
			keyEncoding = strings.ToLower(SafeGetString(encodingVal))
		}
		if passphraseVal := obj.Get("passphrase"); !goja.IsUndefined(passphraseVal) && !goja.IsNull(passphraseVal) {
			// 使用 GetPassphraseBytes 支持 Buffer 和 String
			var err error
			passphraseBytes, err = GetPassphraseBytes(runtime, passphraseVal)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("解析 passphrase 失败: %w", err)))
			}
		}
	}

	// 将字节数组转换为字符串
	passphrase := string(passphraseBytes)

	// JWK 格式处理
	if keyFormat == "jwk" {
		if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
			keyVal := obj.Get("key")
			if keyObj, ok := keyVal.(*goja.Object); ok && keyObj != nil {
				// 将 goja.Object 转换为 map[string]interface{}
				jwkMap := make(map[string]interface{})
				for _, key := range keyObj.Keys() {
					val := keyObj.Get(key)
					if val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
						jwkMap[key] = val.Export()
					}
				}
				// 使用通用的 JWK 解析器
				key, keyType, err := JWKToPrivateKey(jwkMap)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("解析JWK私钥失败: %w", err)))
				}
				// 根据密钥类型返回相应的 KeyObject
				return CreateKeyObject(runtime, key, keyType, false) // false = 私钥
			} else {
				panic(runtime.NewTypeError("JWK 格式的 key 必须是对象"))
			}
		} else {
			panic(runtime.NewTypeError("JWK 格式需要对象参数"))
		}
	} else {
		// PEM/DER 格式处理
		var keyPEM string
		if keyFormat == "der" {
			// DER 格式，使用专门的 DER 处理函数
			if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
				keyPEM = ExtractKeyFromDEROptions(runtime, obj)
			} else {
				panic(runtime.NewTypeError("DER 格式需要对象参数"))
			}
		} else {
			// PEM 格式，可能需要处理 encoding
			keyPEM = ExtractKeyPEMWithEncoding(runtime, firstArg, keyEncoding)
		}

		// 使用通用解析器
		key, keyType, err := ParseAnyPrivateKeyPEM(keyPEM, passphrase)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("解析私钥失败: %w", err)))
		}

		// 根据密钥类型返回相应的 KeyObject
		if keyType == "rsa" {
			if rsaKey, ok := key.(*rsa.PrivateKey); ok {
				return CreatePrivateKeyObject(runtime, rsaKey)
			}
		}

		// 对于非 RSA 密钥，使用通用 KeyObject 创建
		return CreateKeyObject(runtime, key, keyType, false) // false = 私钥
	}

	// 这段代码应该永远不会被执行，因为上面的 if/else 涵盖了所有情况
	return goja.Undefined() // 保留一条兜底返回以满足编译器
}

// CreatePublicKeyObject 创建公钥对象（内部使用） - Node.js 18+ 完整兼容
func CreatePublicKeyObject(runtime *goja.Runtime, publicKey *rsa.PublicKey) goja.Value {
	keyObj := runtime.NewObject()
	keyObj.Set("type", "public")
	keyObj.Set("asymmetricKeyType", "rsa")

	// 存储原始密钥对象（用于内部操作）
	keyObj.Set("_key", runtime.ToValue(publicKey))

	// Node.js 18+ 兼容：添加 asymmetricKeyDetails
	details := runtime.NewObject()
	details.Set("modulusLength", publicKey.N.BitLen())
	// publicExponent 使用 BigInt 暴露（与 Node.js 行为一致）
	details.Set("publicExponent", runtime.ToValue(big.NewInt(int64(publicKey.E))))
	keyObj.Set("asymmetricKeyDetails", details)

	// export方法 - 支持PEM/DER/JWK格式
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		exportType := "spki"
		exportFormat := "pem"
		hasType := false
		hasFormat := false

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
						hasType = true
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
						hasFormat = true
					}
				}
			}
		}

		// 校验 options：对于 PEM/DER 格式，若显式给了 format 但没给 type，应抛 TypeError
		if hasFormat {
			fmtLower := strings.ToLower(exportFormat)
			if fmtLower != "jwk" {
				if !hasType {
					panic(runtime.NewTypeError("The \"options.type\" property must be of type string for PEM/DER public key export"))
				}
				// 同时校验 type 是否有效
				typeLower := strings.ToLower(exportType)
				if typeLower != "spki" && typeLower != "pkcs1" {
					panic(runtime.NewTypeError(fmt.Sprintf("The property 'options.type' is invalid. Received '%s'", exportType)))
				}
			}
		}

		// JWK 格式导出
		if exportFormat == "jwk" {
			jwk := RSAPublicKeyToJWK(publicKey)
			return runtime.ToValue(jwk)
		}

		// PEM/DER 格式导出
		exported, err := ExportPublicKey(publicKey, exportType, exportFormat)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}
		return CreateBuffer(runtime, exported)
	})

	// equals(otherKey) - 比较 RSA 公钥是否等价
	keyObj.Set("equals", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}

		otherObj, ok := call.Arguments[0].(*goja.Object)
		if !ok || otherObj == nil {
			return runtime.ToValue(false)
		}

		// 自反性：同一对象直接返回 true
		if otherObj == keyObj {
			return runtime.ToValue(true)
		}

		// 类型和算法必须匹配
		otherType := strings.ToLower(SafeGetString(otherObj.Get("type")))
		if otherType != "public" {
			return runtime.ToValue(false)
		}
		otherAsym := strings.ToLower(SafeGetString(otherObj.Get("asymmetricKeyType")))
		if otherAsym != "rsa" {
			return runtime.ToValue(false)
		}

		// 计算当前对象的规范化 PEM（spki + pem）
		selfPEMBytes, err := ExportPublicKey(publicKey, "spki", "pem")
		if err != nil {
			return runtime.ToValue(false)
		}
		selfPEM := string(selfPEMBytes)

		// 调用对方的 export，生成相同规范的 PEM
		exportVal := otherObj.Get("export")
		exportFn, ok := goja.AssertFunction(exportVal)
		if !ok {
			return runtime.ToValue(false)
		}
		opts := runtime.NewObject()
		opts.Set("type", "spki")
		opts.Set("format", "pem")
		res, err := exportFn(otherObj, opts)
		if err != nil {
			return runtime.ToValue(false)
		}
		otherPEM := res.String()

		return runtime.ToValue(selfPEM == otherPEM)
	})

	// 使属性不可变（与 Node.js 行为一致）
	MakeKeyObjectPropertiesImmutable(runtime, keyObj)

	return keyObj
}

// CreateRSAPSSPublicKeyObject 创建 RSA-PSS 公钥对象（内部使用）
func CreateRSAPSSPublicKeyObject(runtime *goja.Runtime, publicKey *rsa.PublicKey, pssParams *RSAPSSParams) goja.Value {
	keyObj := runtime.NewObject()
	keyObj.Set("type", "public")
	keyObj.Set("asymmetricKeyType", "rsa-pss")

	// Node.js 18+ 兼容：添加 asymmetricKeyDetails（包含 PSS 参数）
	details := runtime.NewObject()
	details.Set("modulusLength", publicKey.N.BitLen())
	details.Set("publicExponent", runtime.ToValue(big.NewInt(int64(publicKey.E))))

	// RSA-PSS 特有字段（只在明确指定时才设置，否则为 undefined）
	if pssParams != nil {
		if pssParams.HasHashAlgorithm {
			details.Set("hashAlgorithm", pssParams.HashAlgorithm)
		}
		if pssParams.HasMGF1HashAlgorithm {
			details.Set("mgf1HashAlgorithm", pssParams.MGF1HashAlgorithm)
		}
		if pssParams.HasSaltLength {
			details.Set("saltLength", pssParams.SaltLength)
		}
	}

	keyObj.Set("asymmetricKeyDetails", details)

	// export 方法 - 支持 PEM/DER 格式（RSA-PSS 不支持 JWK）
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		exportType := "spki"
		exportFormat := "pem"

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
					}
				}
			}
		}

		// JWK 格式导出 - RSA-PSS 不支持（Node.js 兼容）
		if exportFormat == "jwk" {
			panic(runtime.NewTypeError("Unsupported JWK Key Type."))
		}

		// PEM/DER 格式导出
		exported, err := ExportPublicKey(publicKey, exportType, exportFormat)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}
		return CreateBuffer(runtime, exported)
	})

	// 使属性不可变（与 Node.js 行为一致）
	MakeKeyObjectPropertiesImmutable(runtime, keyObj)

	return keyObj
}

// CreatePrivateKeyObject 创建私钥对象（内部使用） - Node.js 18+ 完整兼容
func CreatePrivateKeyObject(runtime *goja.Runtime, privateKey *rsa.PrivateKey) goja.Value {
	keyObj := runtime.NewObject()
	keyObj.Set("type", "private")
	keyObj.Set("asymmetricKeyType", "rsa")

	// 存储原始密钥对象（用于内部操作）
	keyObj.Set("_key", runtime.ToValue(privateKey))

	// Node.js 18+ 兼容：添加 asymmetricKeyDetails
	details := runtime.NewObject()
	details.Set("modulusLength", privateKey.N.BitLen())
	// publicExponent 使用 BigInt 暴露（与 Node.js 行为一致）
	details.Set("publicExponent", runtime.ToValue(big.NewInt(int64(privateKey.E))))
	keyObj.Set("asymmetricKeyDetails", details)

	// 添加 _handle 字段存储私钥 PEM（用于某些内部操作）
	pemBytes, err := ExportPrivateKey(privateKey, "pkcs8", "pem", "", "", "rsa")
	if err == nil {
		keyObj.Set("_handle", runtime.ToValue(string(pemBytes)))
	}

	// export方法 - 支持PEM/DER/JWK格式，支持加密导出
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		exportType := "pkcs8"
		exportFormat := "pem"
		exportCipher := ""
		exportPass := ""
		hasType := false
		hasFormat := false

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
						hasType = true
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
						hasFormat = true
					}
				}
				if cipherVal := opts.Get("cipher"); cipherVal != nil && !goja.IsUndefined(cipherVal) && !goja.IsNull(cipherVal) {
					if cipherStr := cipherVal.Export(); cipherStr != nil {
						exportCipher = fmt.Sprintf("%v", cipherStr)
					}
				}
				if passVal := opts.Get("passphrase"); passVal != nil && !goja.IsUndefined(passVal) && !goja.IsNull(passVal) {
					if passStr := passVal.Export(); passStr != nil {
						exportPass = fmt.Sprintf("%v", passStr)
					}
				}
			}
		}

		// 对非 JWK 私钥导出校验 type（拦截非法 type 值）
		if hasFormat {
			fmtLower := strings.ToLower(exportFormat)
			if fmtLower != "jwk" && hasType {
				typeLower := strings.ToLower(exportType)
				if typeLower != "pkcs1" && typeLower != "pkcs8" {
					panic(runtime.NewTypeError(
						fmt.Sprintf("The property 'options.type' is invalid. Received '%s'", exportType),
					))
				}
			}
		}

		// JWK 格式导出
		if exportFormat == "jwk" {
			jwk := RSAPrivateKeyToJWK(privateKey)
			return runtime.ToValue(jwk)
		}

		// PEM/DER 格式导出（支持加密）
		exported, err := ExportPrivateKey(privateKey, exportType, exportFormat, exportCipher, exportPass, "rsa")
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}
		return CreateBuffer(runtime, exported)
	})

	// equals(otherKey) - 比较 RSA 私钥是否等价
	keyObj.Set("equals", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}

		otherVal := call.Arguments[0]
		otherObj, ok := otherVal.(*goja.Object)
		if !ok || otherObj == nil {
			return runtime.ToValue(false)
		}

		// 自反性：同一对象直接返回 true
		if otherObj == keyObj {
			return runtime.ToValue(true)
		}

		// 类型和算法必须匹配
		otherType := strings.ToLower(SafeGetString(otherObj.Get("type")))
		if otherType != "private" {
			return runtime.ToValue(false)
		}
		otherAsym := strings.ToLower(SafeGetString(otherObj.Get("asymmetricKeyType")))
		if otherAsym != "rsa" {
			return runtime.ToValue(false)
		}

		// 当前对象的规范化 PEM（pkcs8 + pem）
		selfPEMBytes, err := ExportPrivateKey(privateKey, "pkcs8", "pem", "", "", "rsa")
		if err != nil {
			return runtime.ToValue(false)
		}
		selfPEM := string(selfPEMBytes)

		// 对方对象使用相同参数导出
		exportVal := otherObj.Get("export")
		exportFn, ok := goja.AssertFunction(exportVal)
		if !ok {
			return runtime.ToValue(false)
		}
		opts := runtime.NewObject()
		opts.Set("type", "pkcs8")
		opts.Set("format", "pem")
		res, err := exportFn(otherObj, opts)
		if err != nil {
			return runtime.ToValue(false)
		}
		otherPEM := res.String()

		return runtime.ToValue(selfPEM == otherPEM)
	})

	// 使属性不可变（与 Node.js 行为一致）
	MakeKeyObjectPropertiesImmutable(runtime, keyObj)

	return keyObj
}

// CreateRSAPSSPrivateKeyObject 创建 RSA-PSS 私钥对象（内部使用）
func CreateRSAPSSPrivateKeyObject(runtime *goja.Runtime, privateKey *rsa.PrivateKey, pssParams *RSAPSSParams) goja.Value {
	keyObj := runtime.NewObject()
	keyObj.Set("type", "private")
	keyObj.Set("asymmetricKeyType", "rsa-pss")

	// Node.js 18+ 兼容：添加 asymmetricKeyDetails（包含 PSS 参数）
	details := runtime.NewObject()
	details.Set("modulusLength", privateKey.N.BitLen())
	details.Set("publicExponent", runtime.ToValue(big.NewInt(int64(privateKey.E))))

	// RSA-PSS 特有字段（只在明确指定时才设置，否则为 undefined）
	if pssParams != nil {
		if pssParams.HasHashAlgorithm {
			details.Set("hashAlgorithm", pssParams.HashAlgorithm)
		}
		if pssParams.HasMGF1HashAlgorithm {
			details.Set("mgf1HashAlgorithm", pssParams.MGF1HashAlgorithm)
		}
		if pssParams.HasSaltLength {
			details.Set("saltLength", pssParams.SaltLength)
		}
	}

	keyObj.Set("asymmetricKeyDetails", details)

	// 添加 _handle 字段存储私钥 PEM
	pemBytes, err := ExportPrivateKey(privateKey, "pkcs8", "pem", "", "", "rsa")
	if err == nil {
		keyObj.Set("_handle", runtime.ToValue(string(pemBytes)))
	}

	// export 方法 - 支持 PEM/DER 格式，支持加密导出（RSA-PSS 不支持 JWK）
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		exportType := "pkcs8"
		exportFormat := "pem"
		exportCipher := ""
		exportPass := ""

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
					}
				}
				if cipherVal := opts.Get("cipher"); cipherVal != nil && !goja.IsUndefined(cipherVal) && !goja.IsNull(cipherVal) {
					if cipherStr := cipherVal.Export(); cipherStr != nil {
						exportCipher = fmt.Sprintf("%v", cipherStr)
					}
				}
				if passVal := opts.Get("passphrase"); passVal != nil && !goja.IsUndefined(passVal) && !goja.IsNull(passVal) {
					if passStr := passVal.Export(); passStr != nil {
						exportPass = fmt.Sprintf("%v", passStr)
					}
				}
			}
		}

		// JWK 格式导出 - RSA-PSS 不支持（Node.js 兼容）
		if exportFormat == "jwk" {
			panic(runtime.NewTypeError("Unsupported JWK Key Type."))
		}

		// PEM/DER 格式导出（支持加密）
		exported, err := ExportPrivateKey(privateKey, exportType, exportFormat, exportCipher, exportPass, "rsa")
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}
		return CreateBuffer(runtime, exported)
	})

	// equals(otherKey) - 比较 RSA-PSS 私钥是否等价
	keyObj.Set("equals", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}

		otherVal := call.Arguments[0]
		otherObj, ok := otherVal.(*goja.Object)
		if !ok || otherObj == nil {
			return runtime.ToValue(false)
		}

		// 自反性：同一对象直接返回 true
		if otherObj == keyObj {
			return runtime.ToValue(true)
		}

		// 类型和算法必须匹配
		otherType := strings.ToLower(SafeGetString(otherObj.Get("type")))
		if otherType != "private" {
			return runtime.ToValue(false)
		}
		otherAsym := strings.ToLower(SafeGetString(otherObj.Get("asymmetricKeyType")))
		if otherAsym != "rsa-pss" {
			return runtime.ToValue(false)
		}

		// 当前对象的规范化 PEM（pkcs8 + pem）
		selfPEMBytes, err := ExportPrivateKey(privateKey, "pkcs8", "pem", "", "", "rsa")
		if err != nil {
			return runtime.ToValue(false)
		}
		selfPEM := string(selfPEMBytes)

		// 对方对象使用相同参数导出
		exportVal := otherObj.Get("export")
		exportFn, ok := goja.AssertFunction(exportVal)
		if !ok {
			return runtime.ToValue(false)
		}
		opts := runtime.NewObject()
		opts.Set("type", "pkcs8")
		opts.Set("format", "pem")
		res, err := exportFn(otherObj, opts)
		if err != nil {
			return runtime.ToValue(false)
		}
		otherPEM := res.String()

		return runtime.ToValue(selfPEM == otherPEM)
	})

	// 使属性不可变（与 Node.js 行为一致）
	MakeKeyObjectPropertiesImmutable(runtime, keyObj)

	return keyObj
}

// MakeKeyObjectPropertiesImmutable 使 KeyObject 的属性不可变
func MakeKeyObjectPropertiesImmutable(runtime *goja.Runtime, keyObj *goja.Object) {
	// 使用 Object.defineProperty 使属性不可变
	defineProperty := runtime.Get("Object").ToObject(runtime).Get("defineProperty")
	if callable, ok := goja.AssertFunction(defineProperty); ok {
		// 定义属性描述符
		properties := []string{"type", "asymmetricKeyType", "asymmetricKeyDetails"}
		for _, prop := range properties {
			if val := keyObj.Get(prop); !goja.IsUndefined(val) {
				descriptor := runtime.NewObject()
				descriptor.Set("value", val)
				descriptor.Set("writable", false)
				descriptor.Set("enumerable", true)
				descriptor.Set("configurable", false)
				callable(goja.Undefined(), runtime.ToValue(keyObj), runtime.ToValue(prop), descriptor)
			}
		}
	}
}

// ============================================================================
// 🔥 密钥解析函数 - 100%完整实现
// ============================================================================

// ParsePublicKeyPEM 智能解析 PEM 格式的公钥
// 支持：SPKI, PKCS#1, X.509证书，以及从私钥提取公钥
func ParsePublicKeyPEM(keyPEM string) (*rsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, fmt.Errorf("无法解析 PEM 格式")
	}

	switch block.Type {
	case "PUBLIC KEY": // SPKI 格式
		pub, err := x509.ParsePKIXPublicKey(block.Bytes)
		if err != nil {
			// 检查是否是因为不支持的椭圆曲线（EC密钥）
			errMsg := err.Error()
			if strings.Contains(errMsg, "elliptic") || strings.Contains(errMsg, "curve") || strings.Contains(errMsg, "unsupported") {
				return nil, fmt.Errorf("key type not supported (RSA key required)")
			}
			return nil, fmt.Errorf("解析 SPKI 公钥失败: %w", err)
		}
		rsaPub, ok := pub.(*rsa.PublicKey)
		if !ok {
			return nil, fmt.Errorf("key type not supported (RSA key required)")
		}
		return rsaPub, nil

	case "RSA PUBLIC KEY": // PKCS#1 格式
		return x509.ParsePKCS1PublicKey(block.Bytes)

	case "CERTIFICATE": // X.509 证书
		cert, err := x509.ParseCertificate(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("解析证书失败: %w", err)
		}
		rsaPub, ok := cert.PublicKey.(*rsa.PublicKey)
		if !ok {
			return nil, fmt.Errorf("key type not supported (RSA key required)")
		}
		return rsaPub, nil

	case "PRIVATE KEY", "RSA PRIVATE KEY", "ENCRYPTED PRIVATE KEY":
		// 从私钥中提取公钥
		priv, err := parsePrivateKeyFromBlock(block)
		if err != nil {
			return nil, fmt.Errorf("从私钥提取公钥失败: %w", err)
		}
		return &priv.PublicKey, nil

	default:
		return nil, fmt.Errorf("不支持的 PEM 类型: %s", block.Type)
	}
}

// ParsePrivateKey 解析私钥（支持加密私钥）
func ParsePrivateKey(keyPEM string, passphrase ...string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, fmt.Errorf("无法解析 PEM 格式")
	}

	return parsePrivateKeyFromBlock(block, passphrase...)
}

// parsePrivateKeyFromBlock 从 PEM 块解析私钥（支持加密）
func parsePrivateKeyFromBlock(block *pem.Block, passphrase ...string) (*rsa.PrivateKey, error) {
	der := block.Bytes

	// 尝试不同的格式
	switch block.Type {
	case "ENCRYPTED PRIVATE KEY": // 加密的 PKCS#8 (PBES2)
		if len(passphrase) == 0 {
			return nil, fmt.Errorf("私钥已加密，需要提供密码")
		}
		// 注意：Node.js允许空字符串作为passphrase
		// 使用我们本地实现的 PBES2 解密（完全兼容 Node.js）
		decryptedDER, err := DecryptPKCS8PrivateKeyLocal(der, passphrase[0])
		if err != nil {
			return nil, fmt.Errorf("解密 PKCS8 私钥失败: %w", err)
		}
		// 解析解密后的 PKCS#8 私钥
		key, err := x509.ParsePKCS8PrivateKey(decryptedDER)
		if err != nil {
			return nil, fmt.Errorf("解析解密后的 PKCS8 私钥失败: %w", err)
		}
		rsaKey, ok := key.(*rsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("不是 RSA 私钥")
		}
		return rsaKey, nil

	case "PRIVATE KEY": // 未加密的 PKCS#8
		key, err := x509.ParsePKCS8PrivateKey(der)
		if err != nil {
			return nil, fmt.Errorf("解析 PKCS8 私钥失败: %w", err)
		}
		rsaKey, ok := key.(*rsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("不是 RSA 私钥")
		}
		return rsaKey, nil

	case "RSA PRIVATE KEY": // PKCS#1 (可能加密)
		// 处理旧式加密的 PKCS#1 私钥
		if x509.IsEncryptedPEMBlock(block) {
			if len(passphrase) == 0 {
				return nil, fmt.Errorf("私钥已加密，需要提供密码")
			}
			// 注意：Node.js允许空字符串作为passphrase
			var err error
			der, err = x509.DecryptPEMBlock(block, []byte(passphrase[0]))
			if err != nil {
				return nil, fmt.Errorf("解密 PKCS1 私钥失败: %w", err)
			}
		}
		return x509.ParsePKCS1PrivateKey(der)

	default:
		return nil, fmt.Errorf("不支持的私钥类型: %s", block.Type)
	}
}

// ============================================================================
// 🔥 通用密钥解析（支持所有密钥类型）
// ============================================================================

// ParseAnyPublicKeyPEM 解析任意类型的公钥（RSA, EC, Ed25519等）
func ParseAnyPublicKeyPEM(keyPEM string) (interface{}, string, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, "", fmt.Errorf("无法解析 PEM 格式")
	}

	switch block.Type {
	case "PUBLIC KEY": // SPKI 格式（所有类型）
		pub, err := x509.ParsePKIXPublicKey(block.Bytes)
		if err != nil {
			errStr := err.Error()
			// 尝试解析 secp256k1（x509 不支持，需要手动解析）
			if strings.Contains(errStr, "1.3.132.0.10") ||
				strings.Contains(errStr, "unknown elliptic curve") ||
				strings.Contains(errStr, "unsupported elliptic curve") {
				secp256k1Pub, secp256k1Err := ParseSecp256k1PublicKeyPKIX(block.Bytes)
				if secp256k1Err == nil {
					return secp256k1Pub, "ec", nil
				}
			}
			// 尝试解析 Ed448（x509 不支持，需要手动解析）
			if strings.Contains(errStr, "unknown public key algorithm") ||
				strings.Contains(errStr, "1.3.101.113") {
				ed448Pub, ed448Err := ParseEd448PublicKeyPKIX(block.Bytes)
				if ed448Err == nil {
					return ed448Pub, "ed448", nil
				}
			}
			return nil, "", fmt.Errorf("解析 SPKI 公钥失败: %w", err)
		}
		// 判断密钥类型
		switch key := pub.(type) {
		case *rsa.PublicKey:
			return key, "rsa", nil
		case *ecdsa.PublicKey:
			return key, "ec", nil
		case ed25519.PublicKey:
			return key, "ed25519", nil
		case *dsa.PublicKey:
			return key, "dsa", nil
		default:
			// 检查是否是 X25519/X448 (crypto/ecdh.PublicKey)
			// Go 1.20+ x509.ParsePKIXPublicKey 会返回 *ecdh.PublicKey
			keyType := fmt.Sprintf("%T", pub)
			if strings.Contains(keyType, "ecdh.PublicKey") {
				// 将 ecdh.PublicKey 转换为字节数组
				// X25519 = 32 bytes, X448 = 56 bytes
				if ecdhKey, ok := pub.(interface{ Bytes() []byte }); ok {
					keyBytes := ecdhKey.Bytes()
					if len(keyBytes) == 32 {
						return keyBytes, "x25519", nil
					} else if len(keyBytes) == 56 {
						return keyBytes, "x448", nil
					}
				}
			}
			return nil, "", fmt.Errorf("不支持的公钥类型: %T", pub)
		}

	case "RSA PUBLIC KEY": // PKCS#1 格式
		rsaPub, err := x509.ParsePKCS1PublicKey(block.Bytes)
		return rsaPub, "rsa", err

	case "PRIVATE KEY", "RSA PRIVATE KEY", "EC PRIVATE KEY", "ENCRYPTED PRIVATE KEY":
		// 从私钥 PEM 中推导公钥（支持 RSA / EC / Ed25519 / DSA）
		priv, privType, err := ParseAnyPrivateKeyPEM(keyPEM, "")
		if err != nil {
			return nil, "", fmt.Errorf("从私钥提取公钥失败: %w", err)
		}

		switch k := priv.(type) {
		case *rsa.PrivateKey:
			return &k.PublicKey, privType, nil
		case *ecdsa.PrivateKey:
			return &k.PublicKey, privType, nil
		case ed25519.PrivateKey:
			return k.Public().(ed25519.PublicKey), privType, nil
		case *dsa.PrivateKey:
			return &k.PublicKey, privType, nil
		default:
			return nil, "", fmt.Errorf("不支持的私钥类型: %T", priv)
		}

	default:
		return nil, "", fmt.Errorf("不支持的 PEM 类型: %s", block.Type)
	}
}

// ParseAnyPrivateKeyPEM 解析任意类型的私钥
func ParseAnyPrivateKeyPEM(keyPEM string, passphrase string) (interface{}, string, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, "", fmt.Errorf("无法解析 PEM 格式")
	}

	// 处理加密的私钥
	// 注意：空字符串 passphrase 是有效的密码（Node.js 行为）
	switch block.Type {
	case "ENCRYPTED PRIVATE KEY": // PKCS#8 PBES2 加密格式
		// 使用我们的PBES2解密实现
		decryptedDER, err := DecryptPKCS8PrivateKeyLocal(block.Bytes, passphrase)
		if err != nil {
			return nil, "", fmt.Errorf("解密 PKCS8 私钥失败: %w", err)
		}
		// 解密后是标准的PKCS#8格式，重新赋值
		block.Bytes = decryptedDER
		block.Type = "PRIVATE KEY"
		// 继续下面的PKCS#8解析
		fallthrough

	case "PRIVATE KEY": // PKCS#8 格式（所有类型）
		// 使用标准库解析 PKCS#8
		// 注意：Go 标准库不支持 DSA 的 PKCS#8 格式
		key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			errStr := err.Error()
			// 尝试解析 secp256k1 (标准库不支持)
			if strings.Contains(errStr, "1.3.132.0.10") ||
				strings.Contains(errStr, "unknown elliptic curve") ||
				strings.Contains(errStr, "unsupported elliptic curve") {
				secp256k1Priv, secp256k1Err := ParseSecp256k1PrivateKeyPKCS8(block.Bytes)
				if secp256k1Err == nil {
					return secp256k1Priv, "ec", nil
				}
			}
			// 尝试解析 Ed448 (OID 1.3.101.113)
			if strings.Contains(errStr, "1.3.101.113") {
				ed448Priv, ed448Err := ParseEd448PrivateKeyPKCS8(block.Bytes)
				if ed448Err == nil {
					return ed448Priv, "ed448", nil
				}
			}
			return nil, "", fmt.Errorf("解析 PKCS8 私钥失败: %w", err)
		}
		// 判断密钥类型
		switch k := key.(type) {
		case *rsa.PrivateKey:
			return k, "rsa", nil
		case *ecdsa.PrivateKey:
			return k, "ec", nil
		case ed25519.PrivateKey:
			return k, "ed25519", nil
		case *dsa.PrivateKey:
			// DSA 虽然能解析，但加密的 DSA PKCS#8 不被 Go 标准库支持
			return k, "dsa", nil
		default:
			// 检查是否是 ecdh.PrivateKey (X25519/X448)
			// Go 1.20+ x509.ParsePKCS8PrivateKey 会返回 *ecdh.PrivateKey
			keyType := fmt.Sprintf("%T", key)
			if strings.Contains(keyType, "ecdh.PrivateKey") {
				// 将 ecdh.PrivateKey 转换为字节数组
				if ecdhKey, ok := key.(interface{ Bytes() []byte }); ok {
					keyBytes := ecdhKey.Bytes()
					if len(keyBytes) == 32 {
						return keyBytes, "x25519", nil
					} else if len(keyBytes) == 56 {
						return keyBytes, "x448", nil
					}
				}
			}
			return nil, "", fmt.Errorf("不支持的私钥类型: %T", key)
		}

	case "RSA PRIVATE KEY": // PKCS#1 格式（可能加密）
		// 处理旧式加密的PKCS#1
		der := block.Bytes
		if x509.IsEncryptedPEMBlock(block) {
			decrypted, err := x509.DecryptPEMBlock(block, []byte(passphrase))
			if err != nil {
				return nil, "", fmt.Errorf("解密 PKCS1 私钥失败: %w", err)
			}
			der = decrypted
		}
		rsaPriv, err := x509.ParsePKCS1PrivateKey(der)
		return rsaPriv, "rsa", err

	case "EC PRIVATE KEY": // SEC1 格式（可能加密）
		// 处理旧式加密的EC私钥
		der := block.Bytes
		if x509.IsEncryptedPEMBlock(block) {
			decrypted, err := x509.DecryptPEMBlock(block, []byte(passphrase))
			if err != nil {
				return nil, "", fmt.Errorf("解密 EC 私钥失败: %w", err)
			}
			der = decrypted
		}
		ecPriv, err := x509.ParseECPrivateKey(der)
		if err != nil {
			// 尝试解析 secp256k1 (标准库不支持)
			if strings.Contains(err.Error(), "1.3.132.0.10") ||
				strings.Contains(err.Error(), "unknown elliptic curve") ||
				strings.Contains(err.Error(), "unsupported elliptic curve") {
				secp256k1Priv, secp256k1Err := ParseSecp256k1PrivateKeySEC1(der)
				if secp256k1Err == nil {
					return secp256k1Priv, "ec", nil
				}
			}
			return nil, "", err
		}
		return ecPriv, "ec", nil

	default:
		return nil, "", fmt.Errorf("不支持的 PEM 类型: %s", block.Type)
	}
}

// ============================================================================
// 🔥 本地 PKCS#8 PBES2 解密实现（100% 兼容 Node.js）
// ============================================================================

// DecryptPKCS8PrivateKeyLocal 本地实现的PKCS#8 PBES2解密
// 完全兼容 Node.js 使用 AES-CBC 加密的私钥
func DecryptPKCS8PrivateKeyLocal(encryptedDER []byte, password string) ([]byte, error) {
	var encryptedPKI pkcs8EncryptedPrivateKeyInfo
	if _, err := asn1.Unmarshal(encryptedDER, &encryptedPKI); err != nil {
		return nil, fmt.Errorf("failed to parse encrypted private key: %w", err)
	}

	if !encryptedPKI.EncryptionAlgorithm.Algorithm.Equal(oidPBES2Local) {
		return nil, fmt.Errorf("unsupported encryption algorithm (expected PBES2)")
	}

	var pbes2Params pkcs8PBES2Params
	if _, err := asn1.Unmarshal(encryptedPKI.EncryptionAlgorithm.Parameters.FullBytes, &pbes2Params); err != nil {
		return nil, fmt.Errorf("failed to parse PBES2 parameters: %w", err)
	}

	if !pbes2Params.KeyDerivationFunc.Algorithm.Equal(oidPBKDF2Local) {
		return nil, fmt.Errorf("unsupported KDF (expected PBKDF2)")
	}

	var pbkdf2Params pkcs8PBKDF2Params
	if _, err := asn1.Unmarshal(pbes2Params.KeyDerivationFunc.Parameters.FullBytes, &pbkdf2Params); err != nil {
		return nil, fmt.Errorf("failed to parse PBKDF2 parameters: %w", err)
	}

	prfHash := func() hash.Hash { return sha1.New() }
	if pbkdf2Params.PRF.Algorithm != nil {
		switch {
		case pbkdf2Params.PRF.Algorithm.Equal(oidHMACSHA256Local):
			prfHash = sha256.New
		case pbkdf2Params.PRF.Algorithm.Equal(oidHMACSHA384Local):
			prfHash = sha512.New384
		case pbkdf2Params.PRF.Algorithm.Equal(oidHMACSHA512Local):
			prfHash = sha512.New
		}
	}

	var keyLen int
	var blockCipher func([]byte) (cipher.Block, error)

	encAlg := pbes2Params.EncryptionScheme.Algorithm
	switch {
	case encAlg.Equal(oidAES128CBCLocal):
		keyLen = 16
		blockCipher = aes.NewCipher
	case encAlg.Equal(oidAES192CBCLocal):
		keyLen = 24
		blockCipher = aes.NewCipher
	case encAlg.Equal(oidAES256CBCLocal):
		keyLen = 32
		blockCipher = aes.NewCipher
	case encAlg.Equal(oidDESCBCLocal):
		keyLen = 8
		blockCipher = des.NewCipher
	case encAlg.Equal(oidDESEDE3CBCLocal):
		keyLen = 24
		blockCipher = des.NewTripleDESCipher
	default:
		return nil, fmt.Errorf("unsupported encryption algorithm: %v", encAlg)
	}

	if pbkdf2Params.KeyLength > 0 {
		keyLen = pbkdf2Params.KeyLength
	}

	derivedKey := pbkdf2.Key(
		[]byte(password),
		pbkdf2Params.Salt,
		pbkdf2Params.IterationCount,
		keyLen,
		prfHash,
	)

	var iv []byte
	if _, err := asn1.Unmarshal(pbes2Params.EncryptionScheme.Parameters.FullBytes, &iv); err != nil {
		return nil, fmt.Errorf("failed to parse IV: %w", err)
	}

	block, err := blockCipher(derivedKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	if len(iv) != block.BlockSize() {
		return nil, fmt.Errorf("IV length mismatch: got %d, want %d", len(iv), block.BlockSize())
	}

	encryptedData := encryptedPKI.EncryptedData
	if len(encryptedData)%block.BlockSize() != 0 {
		return nil, fmt.Errorf("encrypted data length is not a multiple of block size")
	}

	mode := cipher.NewCBCDecrypter(block, iv)
	decrypted := make([]byte, len(encryptedData))
	mode.CryptBlocks(decrypted, encryptedData)

	// 去除 PKCS#7 填充
	if len(decrypted) == 0 {
		return nil, fmt.Errorf("empty decrypted data")
	}

	paddingLen := int(decrypted[len(decrypted)-1])
	if paddingLen == 0 || paddingLen > block.BlockSize() || paddingLen > len(decrypted) {
		return nil, fmt.Errorf("bad decrypt (invalid padding, possibly wrong passphrase)")
	}

	// 验证填充
	for i := len(decrypted) - paddingLen; i < len(decrypted); i++ {
		if decrypted[i] != byte(paddingLen) {
			return nil, fmt.Errorf("bad decrypt (invalid padding, possibly wrong passphrase)")
		}
	}

	return decrypted[:len(decrypted)-paddingLen], nil
}

// ============================================================================
// 🔥 本地 PKCS#8 PBES2 加密实现（100% 兼容 Node.js）
// ============================================================================

// EncryptPKCS8PrivateKeyLocal 本地实现的PKCS#8 PBES2加密
// 完全兼容 Node.js 生成加密私钥的方式
func EncryptPKCS8PrivateKeyLocal(privateKeyDER []byte, password, cipherName string) ([]byte, error) {
	// 确定加密算法
	var keyLen int
	var blockCipher func([]byte) (cipher.Block, error)
	var encAlgOID asn1.ObjectIdentifier

	switch cipherName {
	case "aes-128-cbc":
		keyLen = 16
		blockCipher = aes.NewCipher
		encAlgOID = oidAES128CBCLocal
	case "aes-192-cbc":
		keyLen = 24
		blockCipher = aes.NewCipher
		encAlgOID = oidAES192CBCLocal
	case "aes-256-cbc":
		keyLen = 32
		blockCipher = aes.NewCipher
		encAlgOID = oidAES256CBCLocal
	case "des-cbc":
		keyLen = 8
		blockCipher = des.NewCipher
		encAlgOID = oidDESCBCLocal
	case "des-ede3-cbc":
		keyLen = 24
		blockCipher = des.NewTripleDESCipher
		encAlgOID = oidDESEDE3CBCLocal
	default:
		return nil, fmt.Errorf("unsupported cipher: %s", cipherName)
	}

	// 生成随机 salt（16字节）
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return nil, fmt.Errorf("failed to generate salt: %w", err)
	}

	// PBKDF2 参数
	iterationCount := 2048 // Node.js 默认值
	prfHash := sha256.New  // 使用 HMAC-SHA256

	// 派生密钥
	derivedKey := pbkdf2.Key(
		[]byte(password),
		salt,
		iterationCount,
		keyLen,
		prfHash,
	)

	// 创建cipher块
	block, err := blockCipher(derivedKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	// 生成随机 IV
	iv := make([]byte, block.BlockSize())
	if _, err := rand.Read(iv); err != nil {
		return nil, fmt.Errorf("failed to generate IV: %w", err)
	}

	// 添加 PKCS#7 填充
	paddingLen := block.BlockSize() - (len(privateKeyDER) % block.BlockSize())
	paddedData := make([]byte, len(privateKeyDER)+paddingLen)
	copy(paddedData, privateKeyDER)
	for i := len(privateKeyDER); i < len(paddedData); i++ {
		paddedData[i] = byte(paddingLen)
	}

	// 加密数据
	encryptedData := make([]byte, len(paddedData))
	mode := cipher.NewCBCEncrypter(block, iv)
	mode.CryptBlocks(encryptedData, paddedData)

	// 构建 PBKDF2 参数
	pbkdf2Params := pkcs8PBKDF2Params{
		Salt:           salt,
		IterationCount: iterationCount,
		KeyLength:      0, // 可选，省略表示使用默认
		PRF: pkcs8AlgorithmIdentifier{
			Algorithm:  oidHMACSHA256Local,
			Parameters: asn1.RawValue{Tag: 5}, // NULL
		},
	}

	pbkdf2ParamsBytes, err := asn1.Marshal(pbkdf2Params)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal PBKDF2 params: %w", err)
	}

	// 构建加密方案参数（IV）
	ivBytes, err := asn1.Marshal(iv)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal IV: %w", err)
	}

	// 构建 PBES2 参数
	pbes2Params := pkcs8PBES2Params{
		KeyDerivationFunc: pkcs8AlgorithmIdentifier{
			Algorithm:  oidPBKDF2Local,
			Parameters: asn1.RawValue{FullBytes: pbkdf2ParamsBytes},
		},
		EncryptionScheme: pkcs8AlgorithmIdentifier{
			Algorithm:  encAlgOID,
			Parameters: asn1.RawValue{FullBytes: ivBytes},
		},
	}

	pbes2ParamsBytes, err := asn1.Marshal(pbes2Params)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal PBES2 params: %w", err)
	}

	// 构建加密私钥信息
	encryptedPKI := pkcs8EncryptedPrivateKeyInfo{
		EncryptionAlgorithm: pkcs8AlgorithmIdentifier{
			Algorithm:  oidPBES2Local,
			Parameters: asn1.RawValue{FullBytes: pbes2ParamsBytes},
		},
		EncryptedData: encryptedData,
	}

	// 编码为 DER
	encryptedDER, err := asn1.Marshal(encryptedPKI)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal encrypted private key: %w", err)
	}

	return encryptedDER, nil
}
