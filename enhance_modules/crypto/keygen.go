package crypto

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"io"
	"math/big"
	"strings"

	"github.com/dop251/goja"
)

// ============================================================================
// 🔥 错误辅助函数
// ============================================================================

// CryptoError 带有 code 的加密错误
type CryptoError struct {
	Code    string
	Message string
}

func (e *CryptoError) Error() string {
	return e.Message
}

// NewNodeError 创建带有 code 属性的 Node.js 风格错误
func NewNodeError(runtime *goja.Runtime, code, message string) *goja.Object {
	err := runtime.NewTypeError(message)
	err.Set("code", code)
	return err
}

// ============================================================================
// 🔥 RSA 密钥生成功能 - 100%完整实现
// ============================================================================

// GenerateKeyPair 异步生成密钥对 (Node.js 18+ 完整兼容)
func GenerateKeyPair(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	// 解析参数
	keyType, options, callback := parseKeyPairArgsAsync(runtime, call.Arguments)

	// 使用 setImmediate 异步生成（EventLoop 安全）
	setImmediate := runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		// 创建异步回调
		asyncCallback := func(call goja.FunctionCall) goja.Value {
			// 在 EventLoop 线程中执行
			defer func() {
				if r := recover(); r != nil {
					// 如果出错，调用回调并传递错误
					errMsg := fmt.Sprintf("%v", r)
					errObj := runtime.NewGoError(fmt.Errorf("%s", errMsg))
					_, _ = callback(goja.Undefined(), errObj)
				}
			}()

			// 生成密钥对
			var publicKey, privateKey goja.Value
			switch keyType {
			case "rsa", "rsa-pss":
				publicKey, privateKey = doGenerateRSAKeyPair(runtime, keyType, options)
			case "ec":
				publicKey, privateKey = GenerateECKeyPair(runtime, options)
			case "ed25519":
				publicKey, privateKey = GenerateEd25519KeyPair(runtime, options)
			case "ed448":
				publicKey, privateKey = GenerateEd448KeyPair(runtime, options)
			case "x25519":
				publicKey, privateKey = GenerateX25519KeyPair(runtime, options)
			case "x448":
				publicKey, privateKey = GenerateX448KeyPair(runtime, options)
			case "dsa":
				publicKey, privateKey = GenerateDSAKeyPair(runtime, options)
			case "dh":
				publicKey, privateKey = GenerateDHKeyPair(runtime, options)
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("The argument 'type' must be a supported key type. Received '%s'", keyType)))
			}

			// 调用回调（第一个参数是 null 表示无错误）
			_, _ = callback(goja.Undefined(), goja.Null(), publicKey, privateKey)
			return goja.Undefined()
		}

		// 使用 setImmediate 调度异步执行
		_, _ = setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
	} else {
		// 降级：如果没有 setImmediate，同步执行
		defer func() {
			if r := recover(); r != nil {
				errMsg := fmt.Sprintf("%v", r)
				errObj := runtime.NewGoError(fmt.Errorf("%s", errMsg))
				_, _ = callback(goja.Undefined(), errObj)
			}
		}()

		var publicKey, privateKey goja.Value
		switch keyType {
		case "rsa", "rsa-pss":
			publicKey, privateKey = doGenerateRSAKeyPair(runtime, keyType, options)
		case "ec":
			publicKey, privateKey = GenerateECKeyPair(runtime, options)
		case "ed25519":
			publicKey, privateKey = GenerateEd25519KeyPair(runtime, options)
		case "ed448":
			publicKey, privateKey = GenerateEd448KeyPair(runtime, options)
		case "x25519":
			publicKey, privateKey = GenerateX25519KeyPair(runtime, options)
		case "x448":
			publicKey, privateKey = GenerateX448KeyPair(runtime, options)
		case "dsa":
			publicKey, privateKey = GenerateDSAKeyPair(runtime, options)
		case "dh":
			publicKey, privateKey = GenerateDHKeyPair(runtime, options)
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("The argument 'type' must be a supported key type. Received '%s'", keyType)))
		}

		_, _ = callback(goja.Undefined(), goja.Null(), publicKey, privateKey)
	}

	return goja.Undefined()
}

// GenerateKeyPairSync 同步生成密钥对 (Node.js 18+ 完整兼容)
func GenerateKeyPairSync(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 1 {
		panic(runtime.NewTypeError("generateKeyPairSync 需要 type 参数"))
	}

	// 算法名大小写敏感，不转换
	keyType := call.Arguments[0].String()

	// 验证算法名必须是小写
	if keyType != strings.ToLower(keyType) {
		panic(runtime.NewTypeError(fmt.Sprintf("The argument 'type' must be a supported key type. Received '%s'", keyType)))
	}

	// 解析选项（某些密钥类型可能不需要 options）
	var options *goja.Object
	if len(call.Arguments) >= 2 {
		if opt, ok := call.Arguments[1].(*goja.Object); ok && opt != nil {
			options = opt
		}
	}

	// 如果 options 为 nil，创建一个空对象
	if options == nil {
		options = runtime.NewObject()
	}

	// 根据密钥类型调用相应的生成函数
	switch keyType {
	case "rsa", "rsa-pss":
		// RSA/RSA-PSS 继续使用原有逻辑
		return generateRSAKeyPairSync(runtime, keyType, options)
	case "ec":
		publicKey, privateKey := GenerateECKeyPair(runtime, options)
		result := runtime.NewObject()
		result.Set("publicKey", publicKey)
		result.Set("privateKey", privateKey)
		return result
	case "ed25519":
		publicKey, privateKey := GenerateEd25519KeyPair(runtime, options)
		result := runtime.NewObject()
		result.Set("publicKey", publicKey)
		result.Set("privateKey", privateKey)
		return result
	case "ed448":
		publicKey, privateKey := GenerateEd448KeyPair(runtime, options)
		result := runtime.NewObject()
		result.Set("publicKey", publicKey)
		result.Set("privateKey", privateKey)
		return result
	case "x25519":
		publicKey, privateKey := GenerateX25519KeyPair(runtime, options)
		result := runtime.NewObject()
		result.Set("publicKey", publicKey)
		result.Set("privateKey", privateKey)
		return result
	case "x448":
		publicKey, privateKey := GenerateX448KeyPair(runtime, options)
		result := runtime.NewObject()
		result.Set("publicKey", publicKey)
		result.Set("privateKey", privateKey)
		return result
	case "dsa":
		publicKey, privateKey := GenerateDSAKeyPair(runtime, options)
		result := runtime.NewObject()
		result.Set("publicKey", publicKey)
		result.Set("privateKey", privateKey)
		return result
	case "dh":
		publicKey, privateKey := GenerateDHKeyPair(runtime, options)
		result := runtime.NewObject()
		result.Set("publicKey", publicKey)
		result.Set("privateKey", privateKey)
		return result
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("The argument 'type' must be a supported key type. Received '%s'", keyType)))
	}
}

// generateRSAKeyPairSync RSA/RSA-PSS 密钥对生成（原有逻辑）
func generateRSAKeyPairSync(runtime *goja.Runtime, keyType string, options *goja.Object) goja.Value {
	// RSA 需要 modulusLength
	modulusLengthVal := options.Get("modulusLength")
	if modulusLengthVal == nil || goja.IsUndefined(modulusLengthVal) || goja.IsNull(modulusLengthVal) {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_VALUE", "The \"options.modulusLength\" property must be of type number. Received undefined"))
	}

	// 检查类型
	exported := modulusLengthVal.Export()
	var modulusLength int
	switch v := exported.(type) {
	case int, int32, int64:
		modulusLength = int(modulusLengthVal.ToInteger())
	case float64:
		modulusLength = int(v)
	case string:
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"options.modulusLength\" property must be of type number. Received type string ('%s')", v)))
	default:
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"options.modulusLength\" property must be of type number. Received type %T", v)))
	}

	// 支持 publicExponent 选项
	publicExponent := 65537 // 默认 0x10001
	if val := options.Get("publicExponent"); val != nil && !goja.IsUndefined(val) {
		// null 值应报错
		if goja.IsNull(val) {
			panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"options.publicExponent\" property must be of type number. Received null"))
		}
		// 检查类型
		exported := val.Export()
		switch v := exported.(type) {
		case int, int32, int64, float64:
			publicExponent = int(val.ToInteger())
		default:
			panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"options.publicExponent\" property must be of type number. Received type %T", v)))
		}
		// 验证必须是 >=3 的奇数
		if publicExponent < 3 || publicExponent%2 == 0 {
			panic(NewNodeError(runtime, "ERR_INVALID_ARG_VALUE", fmt.Sprintf("The value of \"options.publicExponent\" must be an odd number >= 3. Received %d", publicExponent)))
		}
	}

	// 验证密钥长度
	if modulusLength < 512 || modulusLength > 8192 {
		panic(NewNodeError(runtime, "ERR_OUT_OF_RANGE", fmt.Sprintf("The value of \"options.modulusLength\" is out of range. It must be >= 512 && <= 8192. Received %d", modulusLength)))
	}
	if modulusLength%8 != 0 {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_VALUE", fmt.Sprintf("The value of \"options.modulusLength\" must be a multiple of 8. Received %d", modulusLength)))
	}

	// 检查是否指定了 encoding
	pubEnc := options.Get("publicKeyEncoding")
	privEnc := options.Get("privateKeyEncoding")

	hasPublicEncoding := pubEnc != nil && !goja.IsUndefined(pubEnc) && !goja.IsNull(pubEnc)
	hasPrivateEncoding := privEnc != nil && !goja.IsUndefined(privEnc) && !goja.IsNull(privEnc)

	// 严格验证：encoding 必须是对象，不能是数组
	if hasPublicEncoding {
		if _, ok := pubEnc.(*goja.Object); !ok {
			panic(runtime.NewTypeError("The \"options.publicKeyEncoding\" property must be of type object"))
		}
		if pubEncObj, ok := pubEnc.(*goja.Object); ok && pubEncObj != nil {
			lengthVal := pubEncObj.Get("length")
			if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
				if lengthVal.ToInteger() > 0 {
					panic(runtime.NewTypeError("The \"publicKeyEncoding\" argument must be of type object. Received an instance of Array"))
				}
			}
		}
	}

	if hasPrivateEncoding {
		if _, ok := privEnc.(*goja.Object); !ok {
			panic(runtime.NewTypeError("privateKeyEncoding 必须是对象"))
		}
		if privEncObj, ok := privEnc.(*goja.Object); ok && privEncObj != nil {
			lengthVal := privEncObj.Get("length")
			if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
				if lengthVal.ToInteger() > 0 {
					panic(runtime.NewTypeError("The \"privateKeyEncoding\" argument must be of type object. Received an instance of Array"))
				}
			}
		}
	}

	// 解析 publicKeyEncoding - 严格验证
	publicKeyType := "spki"
	publicKeyFormat := "pem"
	if hasPublicEncoding {
		if pubEncObj, ok := pubEnc.(*goja.Object); ok && pubEncObj != nil {
			// 验证 format 字段必须存在
			formatVal := pubEncObj.Get("format")
			if formatVal == nil || goja.IsUndefined(formatVal) {
				panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.format' is invalid. Received undefined"))
			}
			if goja.IsNull(formatVal) {
				panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.format' is invalid. Received null"))
			}
			if formatStr := formatVal.Export(); formatStr != nil {
				publicKeyFormat = fmt.Sprintf("%v", formatStr)
				if publicKeyFormat == "" {
					panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.format' is invalid. Received empty string"))
				}
			} else {
				panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.format' is invalid. Received nil"))
			}

			// 对于非JWK格式，验证 type 字段必须存在
			if publicKeyFormat != "jwk" {
				typeVal := pubEncObj.Get("type")
				if typeVal == nil || goja.IsUndefined(typeVal) {
					panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.type' is invalid. Received undefined"))
				}
				if goja.IsNull(typeVal) {
					panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.type' is invalid. Received null"))
				}
				if typeStr := typeVal.Export(); typeStr != nil {
					publicKeyType = fmt.Sprintf("%v", typeStr)
					if publicKeyType == "" {
						panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.type' is invalid. Received empty string"))
					}
				} else {
					panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.type' is invalid. Received nil"))
				}
			}
		}
	}

	// 解析 privateKeyEncoding - 严格验证
	privateKeyType := "pkcs8"
	privateKeyFormat := "pem"
	var cipher string
	var passphrase string

	if hasPrivateEncoding {
		if privEncObj, ok := privEnc.(*goja.Object); ok && privEncObj != nil {
			// 验证 format 字段必须存在
			formatVal := privEncObj.Get("format")
			if formatVal == nil || goja.IsUndefined(formatVal) {
				panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.format' is invalid. Received undefined"))
			}
			if goja.IsNull(formatVal) {
				panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.format' is invalid. Received null"))
			}
			if formatStr := formatVal.Export(); formatStr != nil {
				privateKeyFormat = fmt.Sprintf("%v", formatStr)
				if privateKeyFormat == "" {
					panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.format' is invalid. Received empty string"))
				}
			} else {
				panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.format' is invalid. Received nil"))
			}

			// 对于非JWK格式，验证 type 字段必须存在
			if privateKeyFormat != "jwk" {
				typeVal := privEncObj.Get("type")
				if typeVal == nil || goja.IsUndefined(typeVal) {
					panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.type' is invalid. Received undefined"))
				}
				if goja.IsNull(typeVal) {
					panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.type' is invalid. Received null"))
				}
				if typeStr := typeVal.Export(); typeStr != nil {
					privateKeyType = fmt.Sprintf("%v", typeStr)
					if privateKeyType == "" {
						panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.type' is invalid. Received empty string"))
					}
				} else {
					panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.type' is invalid. Received nil"))
				}
			}

			cipherVal := privEncObj.Get("cipher")
			if cipherVal != nil && !goja.IsUndefined(cipherVal) {
				// cipher 不能是 null（当有 passphrase 时）
				if goja.IsNull(cipherVal) {
					// 先检查是否有 passphrase
					passVal := privEncObj.Get("passphrase")
					if passVal != nil && !goja.IsUndefined(passVal) && !goja.IsNull(passVal) {
						panic(runtime.NewTypeError("The \"options.privateKeyEncoding.cipher\" property must be of type string. Received null"))
					}
				} else {
					if cipherStr := cipherVal.Export(); cipherStr != nil {
						cipher = fmt.Sprintf("%v", cipherStr)
					}
				}
			}

			// 验证 passphrase 类型（支持 String 和 Buffer）
			passVal := privEncObj.Get("passphrase")
			if passVal != nil && !goja.IsUndefined(passVal) && !goja.IsNull(passVal) {
				// 严格验证 passphrase 不能是数字
				if exported := passVal.Export(); exported != nil {
					if _, ok := exported.(float64); ok {
						panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.passphrase' must be of type string. Received number"))
					}
					if _, ok := exported.(int); ok {
						panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.passphrase' must be of type string. Received number"))
					}
					if _, ok := exported.(int64); ok {
						panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.passphrase' must be of type string. Received number"))
					}
				}
				// 使用 GetPassphraseBytes 支持 Buffer 和 String
				passphraseBytes, err := GetPassphraseBytes(runtime, passVal)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("解析 passphrase 失败: %w", err)))
				}
				passphrase = string(passphraseBytes)
			}

			// 验证：如果指定了 cipher，passphrase 不能是 undefined 或 null
			// 注意：Node.js 允许空字符串作为 passphrase
			if cipher != "" {
				passphraseVal := privEncObj.Get("passphrase")
				if passphraseVal == nil || goja.IsUndefined(passphraseVal) {
					panic(NewNodeError(runtime, "ERR_INVALID_ARG_VALUE", "The property 'options.privateKeyEncoding.passphrase' is invalid. Received undefined"))
				}
				if goja.IsNull(passphraseVal) {
					panic(NewNodeError(runtime, "ERR_INVALID_ARG_VALUE", "The property 'options.privateKeyEncoding.passphrase' is invalid. Received null"))
				}
				// 空字符串是允许的，不需要额外检查
			}

			// 验证：如果指定了 passphrase 但没有 cipher，应该报错
			if passphrase != "" && cipher == "" {
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_VALUE", "The property 'options.privateKeyEncoding.cipher' is invalid. Received undefined"))
			}
		}
	}

	// 解析 rsa-pss 参数（如果是 rsa-pss 类型）- 严格验证
	var pssParams *RSAPSSParams
	if keyType == "rsa-pss" {
		hashAlgVal := options.Get("hashAlgorithm")
		mgf1HashVal := options.Get("mgf1HashAlgorithm")
		saltLenVal := options.Get("saltLength")

		// 只有在明确指定参数时才创建 pssParams
		hasHashAlg := hashAlgVal != nil && !goja.IsUndefined(hashAlgVal) && !goja.IsNull(hashAlgVal)
		hasMGF1Hash := mgf1HashVal != nil && !goja.IsUndefined(mgf1HashVal) && !goja.IsNull(mgf1HashVal)
		hasSaltLen := saltLenVal != nil && !goja.IsUndefined(saltLenVal) && !goja.IsNull(saltLenVal)

		if hasHashAlg || hasMGF1Hash || hasSaltLen {
			pssParams = &RSAPSSParams{}

			// 设置 hashAlgorithm - 验证必须是字符串
			if hasHashAlg {
				if exported := hashAlgVal.Export(); exported != nil {
					if _, ok := exported.(float64); ok {
						panic(runtime.NewTypeError("The property 'options.hashAlgorithm' must be of type string. Received number"))
					}
					if _, ok := exported.(int); ok {
						panic(runtime.NewTypeError("The property 'options.hashAlgorithm' must be of type string. Received number"))
					}
					if _, ok := exported.(int64); ok {
						panic(runtime.NewTypeError("The property 'options.hashAlgorithm' must be of type string. Received number"))
					}
				}
				pssParams.HashAlgorithm = SafeGetString(hashAlgVal)
				pssParams.HasHashAlgorithm = true
			}

			// 设置 mgf1HashAlgorithm（如果没指定但指定了 hashAlgorithm，则默认等于 hashAlgorithm）
			if hasMGF1Hash {
				pssParams.MGF1HashAlgorithm = SafeGetString(mgf1HashVal)
				pssParams.HasMGF1HashAlgorithm = true
			} else if hasHashAlg {
				pssParams.MGF1HashAlgorithm = pssParams.HashAlgorithm
				pssParams.HasMGF1HashAlgorithm = true
			}

			// 设置 saltLength - 验证必须是数字且非负
			if hasSaltLen {
				if exported := saltLenVal.Export(); exported != nil {
					if _, ok := exported.(string); ok {
						panic(runtime.NewTypeError("The property 'options.saltLength' must be of type number. Received string"))
					}
				}
				saltLen := int(saltLenVal.ToInteger())
				if saltLen < 0 {
					panic(runtime.NewTypeError(fmt.Sprintf("The value of \"options.saltLength\" is out of range. It must be >= 0. Received %d", saltLen)))
				}
				pssParams.SaltLength = saltLen
				pssParams.HasSaltLength = true
			} else if hasHashAlg {
				// 如果指定了 hashAlgorithm，saltLength 默认等于哈希长度
				hashFunc, err := GetHashFunction(pssParams.HashAlgorithm)
				if err != nil {
					// 检查是否是 HashError
					if hashErr, ok := err.(*HashError); ok {
						panic(NewNodeError(runtime, hashErr.Code, hashErr.Message))
					}
					panic(runtime.NewGoError(err))
				}
				pssParams.SaltLength = hashFunc.Size()
				pssParams.HasSaltLength = true
			}
		}
	}

	// 生成密钥对 - 统一使用自定义实现以支持512位密钥
	var privateKey *rsa.PrivateKey
	var err error

	// 总是使用自定义实现，这样可以支持512位等较小的密钥长度
	privateKey, err = GenerateRSAKeyWithExponent(rand.Reader, modulusLength, publicExponent)

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成 RSA 密钥失败: %w", err)))
	}

	// 返回密钥对对象
	result := runtime.NewObject()
	if result == nil {
		panic(runtime.NewGoError(fmt.Errorf("无法创建结果对象")))
	}

	// 根据是否指定 encoding 返回不同类型
	if hasPublicEncoding {
		// JWK 格式特殊处理
		if publicKeyFormat == "jwk" {
			result.Set("publicKey", EncodePublicKeyJWK(runtime, &privateKey.PublicKey, "rsa"))
		} else {
			publicKeyData, err := ExportPublicKey(&privateKey.PublicKey, publicKeyType, publicKeyFormat)
			if err != nil {
				panic(runtime.NewGoError(err))
			}

			if publicKeyFormat == "pem" {
				result.Set("publicKey", runtime.ToValue(string(publicKeyData)))
			} else {
				result.Set("publicKey", CreateBuffer(runtime, publicKeyData))
			}
		}
	} else {
		if keyType == "rsa-pss" {
			result.Set("publicKey", CreateRSAPSSPublicKeyObject(runtime, &privateKey.PublicKey, pssParams))
		} else {
			result.Set("publicKey", CreatePublicKeyObject(runtime, &privateKey.PublicKey))
		}
	}

	if hasPrivateEncoding {
		// JWK 格式特殊处理
		if privateKeyFormat == "jwk" {
			result.Set("privateKey", EncodePrivateKeyJWK(runtime, privateKey, "rsa"))
		} else {
			privateKeyData, err := ExportPrivateKey(privateKey, privateKeyType, privateKeyFormat, cipher, passphrase, "rsa")
			if err != nil {
				// 检查是否是 CryptoError
				if cryptoErr, ok := err.(*CryptoError); ok {
					panic(NewNodeError(runtime, cryptoErr.Code, cryptoErr.Message))
				}
				panic(runtime.NewGoError(err))
			}

			if privateKeyFormat == "pem" {
				result.Set("privateKey", runtime.ToValue(string(privateKeyData)))
			} else {
				result.Set("privateKey", CreateBuffer(runtime, privateKeyData))
			}
		}
	} else {
		if keyType == "rsa-pss" {
			result.Set("privateKey", CreateRSAPSSPrivateKeyObject(runtime, privateKey, pssParams))
		} else {
			result.Set("privateKey", CreatePrivateKeyObject(runtime, privateKey))
		}
	}

	return result
}

// GenerateRSAKeyWithExponent 生成指定公钥指数的RSA密钥 (完整实现)
func GenerateRSAKeyWithExponent(random io.Reader, bits int, exponent int) (*rsa.PrivateKey, error) {
	// 参数验证
	if bits < 512 {
		return nil, fmt.Errorf("密钥长度太短")
	}
	if exponent < 3 || exponent&1 == 0 {
		return nil, fmt.Errorf("公钥指数必须是大于2的奇数")
	}

	// 检查指数是否超出 int 范围（Go 的 rsa.PublicKey.E 是 int 类型）
	// Node.js 支持到 uint32 (4294967295)，但超过这个值在序列化时会失败
	// 我们限制最大值为 0xFFFFFFFF (4294967295)
	if exponent > 0xFFFFFFFF {
		return nil, fmt.Errorf("公钥指数过大，最大支持 %d", 0xFFFFFFFF)
	}

	priv := new(rsa.PrivateKey)
	priv.PublicKey.E = exponent

	// 生成两个大素数 p 和 q
	for {
		var err error
		priv.Primes = make([]*big.Int, 2)

		// 生成 p 和 q，确保 (p-1) 和 (q-1) 与 e 互质
		for i := 0; i < 2; i++ {
			for {
				priv.Primes[i], err = rand.Prime(random, bits/2)
				if err != nil {
					return nil, err
				}

				pminus1 := new(big.Int).Sub(priv.Primes[i], big.NewInt(1))
				gcd := new(big.Int).GCD(nil, nil, pminus1, big.NewInt(int64(exponent)))
				if gcd.Cmp(big.NewInt(1)) == 0 {
					break
				}
			}
		}

		if priv.Primes[0].Cmp(priv.Primes[1]) == 0 {
			continue
		}

		priv.N = new(big.Int).Mul(priv.Primes[0], priv.Primes[1])
		priv.PublicKey.N = priv.N

		if priv.N.BitLen() == bits {
			break
		}
	}

	// 计算 φ(n) = (p-1)(q-1)
	p := priv.Primes[0]
	q := priv.Primes[1]
	pminus1 := new(big.Int).Sub(p, big.NewInt(1))
	qminus1 := new(big.Int).Sub(q, big.NewInt(1))
	phi := new(big.Int).Mul(pminus1, qminus1)

	// 计算私钥指数 d = e^(-1) mod φ(n)
	e := big.NewInt(int64(exponent))
	priv.D = new(big.Int).ModInverse(e, phi)
	if priv.D == nil {
		return nil, fmt.Errorf("无法计算私钥指数")
	}

	// 预计算 CRT 参数
	priv.Precomputed.Dp = new(big.Int).Mod(priv.D, pminus1)
	priv.Precomputed.Dq = new(big.Int).Mod(priv.D, qminus1)
	priv.Precomputed.Qinv = new(big.Int).ModInverse(q, p)
	priv.Precompute()

	return priv, nil
}

// ExportPublicKey 导出公钥 (支持 spki/pkcs1 + pem/der)
func ExportPublicKey(publicKey *rsa.PublicKey, keyType, format string) ([]byte, error) {
	var der []byte
	var pemType string

	switch strings.ToLower(keyType) {
	case "spki", "subjectpublickeyinfo":
		derBytes, err := x509.MarshalPKIXPublicKey(publicKey)
		if err != nil {
			return nil, fmt.Errorf("序列化公钥失败: %w", err)
		}
		der = derBytes
		pemType = "PUBLIC KEY"

	case "pkcs1":
		der = x509.MarshalPKCS1PublicKey(publicKey)
		pemType = "RSA PUBLIC KEY"

	default:
		return nil, fmt.Errorf("不支持的公钥类型: %s", keyType)
	}

	// 验证 format
	formatLower := strings.ToLower(format)
	if formatLower != "der" && formatLower != "pem" && formatLower != "jwk" {
		return nil, fmt.Errorf("The property 'options.publicKeyEncoding.format' is invalid. Received '%s'", format)
	}

	if formatLower == "der" {
		return der, nil
	}

	// PEM 格式
	block := &pem.Block{
		Type:  pemType,
		Bytes: der,
	}
	return pem.EncodeToMemory(block), nil
}

// ExportPrivateKey 导出私钥 (支持 pkcs8/pkcs1 + pem/der + 加密)
func ExportPrivateKey(privateKey *rsa.PrivateKey, keyType, format, cipher, passphrase, algType string) ([]byte, error) {
	var der []byte
	var pemType string
	isPKCS1 := false

	switch strings.ToLower(keyType) {
	case "pkcs8":
		derBytes, err := x509.MarshalPKCS8PrivateKey(privateKey)
		if err != nil {
			return nil, fmt.Errorf("序列化私钥失败: %w", err)
		}
		der = derBytes
		pemType = "PRIVATE KEY"

	case "pkcs1":
		der = x509.MarshalPKCS1PrivateKey(privateKey)
		pemType = "RSA PRIVATE KEY"
		isPKCS1 = true

	default:
		return nil, fmt.Errorf("不支持的私钥类型: %s", keyType)
	}

	// 验证 format
	formatLower := strings.ToLower(format)
	if formatLower != "der" && formatLower != "pem" && formatLower != "jwk" {
		return nil, fmt.Errorf("The property 'options.privateKeyEncoding.format' is invalid. Received '%s'", format)
	}

	if formatLower == "der" {
		return der, nil
	}

	// PEM 格式
	block := &pem.Block{
		Type:  pemType,
		Bytes: der,
	}

	// 加密（如果指定了 cipher）
	// 注意：Node.js 允许空字符串作为 passphrase，所以这里只检查 cipher
	if cipher != "" {
		var encryptedBlock *pem.Block
		var err error

		if isPKCS1 {
			// PKCS#1 使用传统 PEM 加密（Proc-Type + DEK-Info）
			encryptedBlock, err = encryptPEMBlockTraditional(block, cipher, passphrase)
		} else {
			// PKCS#8 使用 PBES2 加密
			encryptedBlock, err = encryptPEMBlock(block, cipher, passphrase)
		}

		if err != nil {
			// 检查是否是 Unknown cipher 错误
			if strings.Contains(err.Error(), "Unknown cipher") {
				return nil, &CryptoError{Code: "ERR_CRYPTO_UNKNOWN_CIPHER", Message: err.Error()}
			}
			return nil, fmt.Errorf("加密私钥失败: %w", err)
		}
		block = encryptedBlock
	}

	return pem.EncodeToMemory(block), nil
}

// ============================================================================
// 🔥 内部辅助函数
// ============================================================================

// parseKeyPairArgsAsync 解析异步密钥对生成参数
func parseKeyPairArgsAsync(runtime *goja.Runtime, args []goja.Value) (string, *goja.Object, goja.Callable) {
	if len(args) < 3 {
		panic(runtime.NewTypeError("generateKeyPair 需要 type, options 和 callback 参数"))
	}

	keyType := strings.ToLower(args[0].String())

	options := args[1].ToObject(runtime)
	if options == nil {
		options = runtime.NewObject()
	}

	callback, ok := goja.AssertFunction(args[2])
	if !ok {
		panic(runtime.NewTypeError("第三个参数必须是回调函数"))
	}

	return keyType, options, callback
}

// doGenerateRSAKeyPair 实际生成 RSA 密钥对
func doGenerateRSAKeyPair(runtime *goja.Runtime, keyType string, options *goja.Object) (goja.Value, goja.Value) {
	// 获取 modulusLength - 严格类型验证
	modulusLengthVal := options.Get("modulusLength")
	if goja.IsUndefined(modulusLengthVal) || goja.IsNull(modulusLengthVal) {
		panic(runtime.NewTypeError("The \"options.modulusLength\" property must be of type number. Received undefined"))
	}
	// 验证是否为数字类型
	exported := modulusLengthVal.Export()
	if _, ok := exported.(string); ok {
		panic(runtime.NewTypeError("The \"options.modulusLength\" property must be of type number. Received string"))
	}
	modulusLength := int(modulusLengthVal.ToInteger())

	// 解析 publicExponent - 严格类型验证
	publicExponent := 65537
	if pubExpVal := options.Get("publicExponent"); pubExpVal != nil && !goja.IsUndefined(pubExpVal) {
		// null 值应报错
		if goja.IsNull(pubExpVal) {
			panic(runtime.NewTypeError("The \"options.publicExponent\" property must be of type number. Received null"))
		}
		// 验证是否为数字类型
		if exported := pubExpVal.Export(); exported != nil {
			if _, ok := exported.(string); ok {
				panic(runtime.NewTypeError("The \"options.publicExponent\" property must be of type number. Received string"))
			}
		}
		publicExponent = int(pubExpVal.ToInteger())
	}

	// 解析 rsa-pss 参数 - 严格类型验证
	var pssParams *RSAPSSParams
	if keyType == "rsa-pss" {
		hashAlgVal := options.Get("hashAlgorithm")
		mgf1HashVal := options.Get("mgf1HashAlgorithm")
		saltLenVal := options.Get("saltLength")

		hasHashAlg := hashAlgVal != nil && !goja.IsUndefined(hashAlgVal) && !goja.IsNull(hashAlgVal)
		hasMGF1Hash := mgf1HashVal != nil && !goja.IsUndefined(mgf1HashVal) && !goja.IsNull(mgf1HashVal)
		hasSaltLen := saltLenVal != nil && !goja.IsUndefined(saltLenVal) && !goja.IsNull(saltLenVal)

		if hasHashAlg || hasMGF1Hash || hasSaltLen {
			pssParams = &RSAPSSParams{}

			if hasHashAlg {
				// 验证 hashAlgorithm 必须是字符串
				if exported := hashAlgVal.Export(); exported != nil {
					if _, ok := exported.(float64); ok {
						panic(runtime.NewTypeError("The \"options.hashAlgorithm\" property must be of type string. Received number"))
					}
					if _, ok := exported.(int); ok {
						panic(runtime.NewTypeError("The \"options.hashAlgorithm\" property must be of type string. Received number"))
					}
					if _, ok := exported.(int64); ok {
						panic(runtime.NewTypeError("The \"options.hashAlgorithm\" property must be of type string. Received number"))
					}
				}
				pssParams.HashAlgorithm = SafeGetString(hashAlgVal)
				pssParams.HasHashAlgorithm = true
			}

			if hasMGF1Hash {
				pssParams.MGF1HashAlgorithm = SafeGetString(mgf1HashVal)
				pssParams.HasMGF1HashAlgorithm = true
			} else if hasHashAlg {
				pssParams.MGF1HashAlgorithm = pssParams.HashAlgorithm
				pssParams.HasMGF1HashAlgorithm = true
			}

			if hasSaltLen {
				// 验证 saltLength 必须是数字
				if exported := saltLenVal.Export(); exported != nil {
					if _, ok := exported.(string); ok {
						panic(runtime.NewTypeError("The \"options.saltLength\" property must be of type number. Received string"))
					}
				}
				pssParams.SaltLength = int(saltLenVal.ToInteger())
				pssParams.HasSaltLength = true
			} else if hasHashAlg {
				hashFunc, err := GetHashFunction(pssParams.HashAlgorithm)
				if err == nil {
					pssParams.SaltLength = hashFunc.Size()
					pssParams.HasSaltLength = true
				}
			}
		}
	}

	// 生成密钥对 - 统一使用自定义实现以支持512位密钥
	var privateKey *rsa.PrivateKey
	var err error

	// 总是使用自定义实现，这样可以支持512位等较小的密钥长度
	privateKey, err = GenerateRSAKeyWithExponent(rand.Reader, modulusLength, publicExponent)

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成RSA密钥对失败: %w", err)))
	}

	// 导出密钥
	var publicKeyData, privateKeyData goja.Value

	pubEnc := options.Get("publicKeyEncoding")
	privEnc := options.Get("privateKeyEncoding")

	hasPublicEncoding := pubEnc != nil && !goja.IsUndefined(pubEnc) && !goja.IsNull(pubEnc)
	hasPrivateEncoding := privEnc != nil && !goja.IsUndefined(privEnc) && !goja.IsNull(privEnc)

	// 严格验证 publicKeyEncoding 必须是对象（如果提供）
	if hasPublicEncoding {
		if _, ok := pubEnc.Export().(string); ok {
			panic(runtime.NewTypeError("The \"options.publicKeyEncoding\" property must be of type object. Received string"))
		}
	}

	// 严格验证 privateKeyEncoding 必须是对象（如果提供）
	if hasPrivateEncoding {
		if _, ok := privEnc.Export().(string); ok {
			panic(runtime.NewTypeError("The \"options.privateKeyEncoding\" property must be of type object. Received string"))
		}
	}

	if hasPublicEncoding {
		publicKeyData = exportKeyFromOptions(runtime, &privateKey.PublicKey, pubEnc)
	} else {
		if keyType == "rsa-pss" {
			publicKeyData = CreateRSAPSSPublicKeyObject(runtime, &privateKey.PublicKey, pssParams)
		} else {
			publicKeyData = CreatePublicKeyObject(runtime, &privateKey.PublicKey)
		}
	}

	if hasPrivateEncoding {
		privateKeyData = exportPrivateKeyFromOptions(runtime, privateKey, privEnc)
	} else {
		if keyType == "rsa-pss" {
			privateKeyData = CreateRSAPSSPrivateKeyObject(runtime, privateKey, pssParams)
		} else {
			privateKeyData = CreatePrivateKeyObject(runtime, privateKey)
		}
	}

	return publicKeyData, privateKeyData
}

// exportKeyFromOptions 根据选项导出公钥
func exportKeyFromOptions(runtime *goja.Runtime, publicKey *rsa.PublicKey, encodingVal goja.Value) goja.Value {
	if goja.IsUndefined(encodingVal) || goja.IsNull(encodingVal) {
		return CreatePublicKeyObject(runtime, publicKey)
	}

	encoding := encodingVal.ToObject(runtime)
	if encoding == nil {
		return CreatePublicKeyObject(runtime, publicKey)
	}

	// 验证必须有 format 字段
	formatVal := encoding.Get("format")
	if goja.IsUndefined(formatVal) {
		panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.format' is invalid. Received undefined"))
	}
	if goja.IsNull(formatVal) {
		panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.format' is invalid. Received null"))
	}
	format := SafeGetString(formatVal)
	if format == "" {
		panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.format' is invalid. Received empty string"))
	}

	// JWK 格式特殊处理
	if format == "jwk" {
		return EncodePublicKeyJWK(runtime, publicKey, "rsa")
	}

	// 对于 PEM/DER 格式，必须有 type 字段
	typeVal := encoding.Get("type")
	if goja.IsUndefined(typeVal) {
		panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.type' is invalid. Received undefined"))
	}
	if goja.IsNull(typeVal) {
		panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.type' is invalid. Received null"))
	}
	keyType := SafeGetString(typeVal)
	if keyType == "" {
		panic(runtime.NewTypeError("The property 'options.publicKeyEncoding.type' is invalid. Received empty string"))
	}

	exported, err := ExportPublicKey(publicKey, keyType, format)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	if format == "der" {
		return CreateBuffer(runtime, exported)
	}
	return runtime.ToValue(string(exported))
}

// exportPrivateKeyFromOptions 根据选项导出私钥
func exportPrivateKeyFromOptions(runtime *goja.Runtime, privateKey *rsa.PrivateKey, encodingVal goja.Value) goja.Value {
	if goja.IsUndefined(encodingVal) || goja.IsNull(encodingVal) {
		return CreatePrivateKeyObject(runtime, privateKey)
	}

	encoding := encodingVal.ToObject(runtime)
	if encoding == nil {
		return CreatePrivateKeyObject(runtime, privateKey)
	}

	// 验证必须有 format 字段
	formatVal := encoding.Get("format")
	if goja.IsUndefined(formatVal) {
		panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.format' is invalid. Received undefined"))
	}
	if goja.IsNull(formatVal) {
		panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.format' is invalid. Received null"))
	}
	format := SafeGetString(formatVal)
	if format == "" {
		panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.format' is invalid. Received empty string"))
	}

	// JWK 格式特殊处理
	if format == "jwk" {
		return EncodePrivateKeyJWK(runtime, privateKey, "rsa")
	}

	// 对于 PEM/DER 格式，必须有 type 字段
	typeVal := encoding.Get("type")
	if goja.IsUndefined(typeVal) {
		panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.type' is invalid. Received undefined"))
	}
	if goja.IsNull(typeVal) {
		panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.type' is invalid. Received null"))
	}
	keyType := SafeGetString(typeVal)
	if keyType == "" {
		panic(runtime.NewTypeError("The property 'options.privateKeyEncoding.type' is invalid. Received empty string"))
	}

	cipherVal := encoding.Get("cipher")
	var cipher string
	passphraseVal := encoding.Get("passphrase")

	// 先检查 cipher 和 passphrase 的组合有效性
	hasCipher := cipherVal != nil && !goja.IsUndefined(cipherVal) && !goja.IsNull(cipherVal)
	hasPassphrase := passphraseVal != nil && !goja.IsUndefined(passphraseVal) && !goja.IsNull(passphraseVal)

	// cipher 不能是 null（当有 passphrase 时）
	if cipherVal != nil && !goja.IsUndefined(cipherVal) {
		if goja.IsNull(cipherVal) {
			// 检查是否有 passphrase
			if hasPassphrase {
				panic(runtime.NewTypeError("The \"options.privateKeyEncoding.cipher\" property must be of type string. Received null"))
			}
		} else {
			cipher = SafeGetString(cipherVal)
		}
	}

	// 如果指定了 cipher，passphrase 不能是 null/undefined
	if hasCipher && !hasPassphrase {
		if passphraseVal == nil || goja.IsUndefined(passphraseVal) {
			panic(NewNodeError(runtime, "ERR_INVALID_ARG_VALUE", "The property 'options.privateKeyEncoding.passphrase' is invalid. Received undefined"))
		}
		if goja.IsNull(passphraseVal) {
			panic(NewNodeError(runtime, "ERR_INVALID_ARG_VALUE", "The property 'options.privateKeyEncoding.passphrase' is invalid. Received null"))
		}
	}

	var passphraseBytes []byte

	// 严格验证 passphrase 类型（支持 String 和 Buffer）
	if hasPassphrase {
		if exported := passphraseVal.Export(); exported != nil {
			if _, ok := exported.(float64); ok {
				panic(runtime.NewTypeError("The \"options.privateKeyEncoding.passphrase\" property must be of type string. Received number"))
			}
			if _, ok := exported.(int); ok {
				panic(runtime.NewTypeError("The \"options.privateKeyEncoding.passphrase\" property must be of type string. Received number"))
			}
			if _, ok := exported.(int64); ok {
				panic(runtime.NewTypeError("The \"options.privateKeyEncoding.passphrase\" property must be of type string. Received number"))
			}
		}
		// 使用 GetPassphraseBytes 支持 Buffer 和 String
		var err error
		passphraseBytes, err = GetPassphraseBytes(runtime, passphraseVal)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("解析 passphrase 失败: %w", err)))
		}
	}

	// 将字节数组转换为字符串传递给 ExportPrivateKey
	passphrase := string(passphraseBytes)
	exported, err := ExportPrivateKey(privateKey, keyType, format, cipher, passphrase, "rsa")
	if err != nil {
		// 检查是否是 CryptoError
		if cryptoErr, ok := err.(*CryptoError); ok {
			panic(NewNodeError(runtime, cryptoErr.Code, cryptoErr.Message))
		}
		panic(runtime.NewGoError(err))
	}

	if format == "der" {
		return CreateBuffer(runtime, exported)
	}
	return runtime.ToValue(string(exported))
}

// encryptPEMBlock 加密 PEM 块 (PKCS#8 PBES2 加密格式 - 100% Node.js 兼容)
func encryptPEMBlock(block *pem.Block, cipher, passphrase string) (*pem.Block, error) {
	// 如果没有指定 cipher，返回未加密的密钥
	if cipher == "" {
		return block, nil
	}

	// 使用我们自己实现的 PKCS#8 PBES2 加密（完全兼容 Node.js）
	encryptedDER, err := EncryptPKCS8PrivateKeyLocal(block.Bytes, passphrase, cipher)
	if err != nil {
		// 检查是否是不支持的cipher错误
		if strings.Contains(err.Error(), "unsupported cipher") {
			return nil, fmt.Errorf("Unknown cipher: %s", cipher)
		}
		return nil, fmt.Errorf("加密失败: %w", err)
	}

	// 返回加密后的 PEM 块
	return &pem.Block{
		Type:  "ENCRYPTED PRIVATE KEY",
		Bytes: encryptedDER,
	}, nil
}

// encryptPEMBlockTraditional 使用传统 PEM 加密 (PKCS#1 格式，带 Proc-Type 和 DEK-Info 头部)
func encryptPEMBlockTraditional(block *pem.Block, cipher, passphrase string) (*pem.Block, error) {
	// 如果没有指定 cipher，返回未加密的密钥
	if cipher == "" {
		return block, nil
	}

	// 使用 x509.EncryptPEMBlock (Go 1.16+)
	// 注意：这是传统的 PEM 加密方式，会在 PEM 头部添加 Proc-Type 和 DEK-Info
	encryptedBlock, err := x509.EncryptPEMBlock(
		rand.Reader,
		block.Type,
		block.Bytes,
		[]byte(passphrase),
		getCipherAlgorithm(cipher),
	)
	if err != nil {
		if strings.Contains(err.Error(), "unknown") {
			return nil, fmt.Errorf("Unknown cipher: %s", cipher)
		}
		return nil, fmt.Errorf("加密失败: %w", err)
	}

	return encryptedBlock, nil
}

// getCipherAlgorithm 将 cipher 名称转换为 x509.PEMCipher
func getCipherAlgorithm(cipher string) x509.PEMCipher {
	switch strings.ToLower(cipher) {
	case "aes-128-cbc", "aes128":
		return x509.PEMCipherAES128
	case "aes-192-cbc", "aes192":
		return x509.PEMCipherAES192
	case "aes-256-cbc", "aes256":
		return x509.PEMCipherAES256
	case "des-cbc", "des":
		return x509.PEMCipherDES
	case "des-ede3-cbc", "3des":
		return x509.PEMCipher3DES
	default:
		// 返回一个无效值，让 EncryptPEMBlock 报错
		return x509.PEMCipher(-1)
	}
}
