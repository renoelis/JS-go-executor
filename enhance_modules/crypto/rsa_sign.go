package crypto

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"

	"github.com/dop251/goja"
)

// ============================================================================
// 🔥 RSA 签名验证功能 - 100%完整实现（包含PSS支持）
// ============================================================================

// CreateSign 创建签名对象 (Node.js 18+ 完整兼容)
func CreateSign(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
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

		// Node.js 行为：Sign.update() 不接受 ArrayBuffer，只接受 Buffer/TypedArray/DataView
		buf, err := ConvertToBytesStrict(runtime, call.Arguments[0])
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
		}
		dataBuffer = append(dataBuffer, buf...)

		return call.This
	})

	signObj.Set("write", func(call goja.FunctionCall) goja.Value {
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
		var padding int = 1       // 默认RSA_PKCS1_PADDING
		var saltLength int = -2   // 默认 MAX_SIGN (Node.js 签名默认行为)
		var outputEncoding string // 可选的输出编码格式
		var passphrase string = ""

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
					padding = int(paddingVal.ToInteger())
				}
				if saltVal := firstArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
					saltLength = int(saltVal.ToInteger())
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

		// 解析私钥
		var privateKey *rsa.PrivateKey
		var err error
		if passphrase != "" {
			privateKey, err = ParsePrivateKey(keyPEM, passphrase)
		} else {
			privateKey, err = ParsePrivateKey(keyPEM)
		}
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("解析私钥失败: %w", err)))
		}

		// 计算哈希
		hashFunc, err := GetHashFunction(algorithm)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		hashFunc.Write(dataBuffer)
		hashed := hashFunc.Sum(nil)

		// 执行签名
		var signature []byte
		if padding == 6 { // RSA_PKCS1_PSS_PADDING
			hashID := GetCryptoHash(algorithm)
			// 验证 saltLength 合法性
			if saltLength < -2 {
				panic(runtime.NewTypeError(fmt.Sprintf("Invalid saltLength: %d (仅支持 -2, -1, 0 或正整数)", saltLength)))
			}
			// Node.js 18+ 兼容：sign 默认使用 MAX_SIGN
			resolvedSaltLength := ResolvePSSSaltLengthForSign(saltLength, privateKey, hashID)

			opts := &rsa.PSSOptions{
				SaltLength: resolvedSaltLength,
				Hash:       hashID,
			}

			// Node.js 兼容：验证密钥大小是否足够
			if err := ValidatePSSKeySize(privateKey, opts.Hash, opts.SaltLength); err != nil {
				panic(runtime.NewGoError(err))
			}

			signature, err = rsa.SignPSS(rand.Reader, privateKey, opts.Hash, hashed, opts)
		} else { // RSA_PKCS1_PADDING
			signature, err = rsa.SignPKCS1v15(rand.Reader, privateKey, GetCryptoHash(algorithm), hashed)
		}

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
				// Node.js 支持 utf8 编码（虽然对二进制数据不推荐）
				// 将二进制数据转换为字符串（可能包含不可打印字符）
				return runtime.ToValue(string(signature))
			case "ascii":
				// Node.js 也支持 ascii 编码
				return runtime.ToValue(string(signature))
			case "ucs2", "ucs-2", "utf16le", "utf-16le":
				// Node.js 支持 UTF-16LE 编码
				// 将字节转换为 UTF-16LE 字符串
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

// CreateVerify 创建验证对象 (Node.js 18+ 完整兼容)
func CreateVerify(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
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

		// Node.js 行为：Verify.update() 不接受 ArrayBuffer，只接受 Buffer/TypedArray/DataView
		buf, err := ConvertToBytesStrict(runtime, call.Arguments[0])
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
		}
		dataBuffer = append(dataBuffer, buf...)

		return call.This
	})

	verifyObj.Set("write", func(call goja.FunctionCall) goja.Value {
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
		var padding int = 1
		var saltLength int = rsa.PSSSaltLengthAuto // 默认 AUTO

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
					padding = int(paddingVal.ToInteger())
				}
				if saltVal := firstArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
					saltLength = int(saltVal.ToInteger())
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
			// 字符串路径：如果未提供 encoding，默认当作 binary (latin1) 处理
			// 这与 Node.js 的行为一致
			if signatureFormat == "" {
				// Node.js 行为：默认当作 binary/latin1 处理
				signature = []byte(signatureStr)
			} else {
				// 按 encoding 解码
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
			// 非字符串：Buffer/TypedArray/ArrayBuffer/DataView
			signature, err = ConvertToBytes(runtime, secondArg)
			if err != nil {
				panic(runtime.NewTypeError(fmt.Sprintf("signature 数据类型错误: %v", err)))
			}
		}

		// 解析公钥
		publicKey, err := ParsePublicKeyPEM(keyPEM)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		// 计算哈希
		hashFunc, err := GetHashFunction(algorithm)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		hashFunc.Write(dataBuffer)
		hashed := hashFunc.Sum(nil)

		// 执行验证
		if padding == 6 { // RSA_PKCS1_PSS_PADDING
			hashID := GetCryptoHash(algorithm)
			resolvedSaltLength := ResolvePSSSaltLengthForVerify(saltLength, hashID)

			opts := &rsa.PSSOptions{
				SaltLength: resolvedSaltLength,
				Hash:       hashID,
			}
			err = rsa.VerifyPSS(publicKey, opts.Hash, hashed, signature, opts)
		} else { // RSA_PKCS1_PADDING
			err = rsa.VerifyPKCS1v15(publicKey, GetCryptoHash(algorithm), hashed, signature)
		}

		return runtime.ToValue(err == nil)
	})

	return verifyObj
}

// Sign 一步签名 (crypto.sign)
func Sign(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
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
	var padding int = 1                        // 默认 PKCS1
	var saltLength int = rsa.PSSSaltLengthAuto // 默认自动
	var passphrase string = ""

	thirdArg := call.Arguments[2]

	// 尝试作为对象解析
	if thirdArgObj, ok := thirdArg.(*goja.Object); ok && thirdArgObj != nil {
		keyVal := thirdArgObj.Get("key")
		if keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
			keyPEM = ExtractKeyPEM(runtime, keyVal)

			if paddingVal := thirdArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			if saltVal := thirdArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
				saltLength = int(saltVal.ToInteger())
			}
			passphrase = SafeGetString(thirdArgObj.Get("passphrase"))
		} else {
			keyPEM = ExtractKeyPEM(runtime, thirdArg)
		}
	} else {
		keyPEM = ExtractKeyPEM(runtime, thirdArg)
	}

	// 解析私钥
	var privateKey *rsa.PrivateKey
	var err error
	if passphrase != "" {
		privateKey, err = ParsePrivateKey(keyPEM, passphrase)
	} else {
		privateKey, err = ParsePrivateKey(keyPEM)
	}
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("解析私钥失败: %w", err)))
	}

	// 计算哈希
	hashFunc, err := GetHashFunction(algorithm)
	if err != nil {
		panic(runtime.NewGoError(err))
	}
	hashFunc.Write(data)
	hashed := hashFunc.Sum(nil)

	// 执行签名
	var signature []byte
	if padding == 6 { // RSA_PKCS1_PSS_PADDING
		hashID := GetCryptoHash(algorithm)
		if saltLength < -2 {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid saltLength: %d", saltLength)))
		}
		resolvedSaltLength := ResolvePSSSaltLengthForSign(saltLength, privateKey, hashID)

		opts := &rsa.PSSOptions{
			SaltLength: resolvedSaltLength,
			Hash:       hashID,
		}

		if err := ValidatePSSKeySize(privateKey, opts.Hash, opts.SaltLength); err != nil {
			panic(runtime.NewGoError(err))
		}

		signature, err = rsa.SignPSS(rand.Reader, privateKey, opts.Hash, hashed, opts)
	} else { // RSA_PKCS1_PADDING
		signature, err = rsa.SignPKCS1v15(rand.Reader, privateKey, GetCryptoHash(algorithm), hashed)
	}

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("签名失败: %w", err)))
	}

	return CreateBuffer(runtime, signature)
}

// Verify 一步验证 (crypto.verify)
func Verify(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
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
	var padding int = 1
	var saltLength int = rsa.PSSSaltLengthAuto

	thirdArg := call.Arguments[2]

	// 解析公钥
	if thirdArgObj, ok := thirdArg.(*goja.Object); ok && thirdArgObj != nil {
		keyVal := thirdArgObj.Get("key")
		if keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
			keyPEM = ExtractKeyPEM(runtime, keyVal)

			if paddingVal := thirdArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			if saltVal := thirdArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
				saltLength = int(saltVal.ToInteger())
			}
		} else {
			keyPEM = ExtractKeyPEM(runtime, thirdArg)
		}
	} else {
		keyPEM = ExtractKeyPEM(runtime, thirdArg)
	}

	publicKey, err := ParsePublicKeyPEM(keyPEM)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	// 获取签名
	signature, err := ConvertToBytes(runtime, call.Arguments[3])
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("signature 数据类型错误: %v", err)))
	}

	// 计算哈希
	hashFunc, err := GetHashFunction(algorithm)
	if err != nil {
		panic(runtime.NewGoError(err))
	}
	hashFunc.Write(data)
	hashed := hashFunc.Sum(nil)

	// 执行验证
	if padding == 6 { // RSA_PKCS1_PSS_PADDING
		hashID := GetCryptoHash(algorithm)
		resolvedSaltLength := ResolvePSSSaltLengthForVerify(saltLength, hashID)

		opts := &rsa.PSSOptions{
			SaltLength: resolvedSaltLength,
			Hash:       hashID,
		}
		err = rsa.VerifyPSS(publicKey, opts.Hash, hashed, signature, opts)
	} else {
		err = rsa.VerifyPKCS1v15(publicKey, GetCryptoHash(algorithm), hashed, signature)
	}

	return runtime.ToValue(err == nil)
}

// ============================================================================
// 🔥 PSS 辅助函数
// ============================================================================

// GetCryptoHash 获取 crypto.Hash
func GetCryptoHash(algorithm string) crypto.Hash {
	normalized := NormalizeHashAlgorithm(algorithm)

	switch normalized {
	case "md5":
		return crypto.MD5
	case "sha1":
		return crypto.SHA1
	case "sha224":
		return crypto.SHA224
	case "sha256":
		return crypto.SHA256
	case "sha384":
		return crypto.SHA384
	case "sha512":
		return crypto.SHA512
	case "sha512224":
		return crypto.SHA512_224
	case "sha512256":
		return crypto.SHA512_256
	case "sha3224":
		return crypto.SHA3_224
	case "sha3256":
		return crypto.SHA3_256
	case "sha3384":
		return crypto.SHA3_384
	case "sha3512":
		return crypto.SHA3_512
	default:
		return crypto.SHA256 // 默认
	}
}

// ResolvePSSSaltLength 解析 PSS salt 长度
func ResolvePSSSaltLength(saltLength int) int {
	switch saltLength {
	case -2: // Node.js RSA_PSS_SALTLEN_AUTO/MAX_SIGN
		return rsa.PSSSaltLengthAuto // Go 的 0
	case -1: // Node.js RSA_PSS_SALTLEN_DIGEST
		return rsa.PSSSaltLengthEqualsHash // Go 的 -1
	default:
		return saltLength
	}
}

// CalculateMaxPSSSaltLength 计算最大 PSS salt 长度
func CalculateMaxPSSSaltLength(key *rsa.PrivateKey, hashFunc crypto.Hash) int {
	emBits := key.N.BitLen() - 1
	emLen := (emBits + 7) / 8
	return emLen - hashFunc.Size() - 2
}

// ResolvePSSSaltLengthForSign 解析签名时的 PSS salt 长度
func ResolvePSSSaltLengthForSign(saltLength int, key *rsa.PrivateKey, hashFunc crypto.Hash) int {
	if saltLength == -2 { // RSA_PSS_SALTLEN_MAX_SIGN
		return CalculateMaxPSSSaltLength(key, hashFunc)
	}
	if saltLength == -1 { // RSA_PSS_SALTLEN_DIGEST
		return hashFunc.Size()
	}
	return saltLength
}

// ResolvePSSSaltLengthForVerify 解析验证时的 PSS salt 长度
func ResolvePSSSaltLengthForVerify(saltLength int, hashFunc crypto.Hash) int {
	if saltLength == -2 { // AUTO
		return rsa.PSSSaltLengthAuto
	}
	if saltLength == -1 { // DIGEST
		return hashFunc.Size()
	}
	return saltLength
}

// ValidatePSSKeySize 验证 PSS 签名的密钥大小是否足够
func ValidatePSSKeySize(privateKey *rsa.PrivateKey, hash crypto.Hash, saltLength int) error {
	// emLen = ceil((modBits-1)/8)
	emLen := (privateKey.N.BitLen() - 1 + 7) / 8

	// Hash length
	hashLen := hash.Size()
	if hashLen <= 0 {
		return fmt.Errorf("unsupported hash")
	}

	// Resolve actual salt length for size check
	actualSaltLen := saltLength
	switch actualSaltLen {
	case rsa.PSSSaltLengthEqualsHash:
		actualSaltLen = hashLen
	case rsa.PSSSaltLengthAuto:
		actualSaltLen = hashLen
	default:
		if actualSaltLen < 0 {
			return fmt.Errorf("invalid saltLength: %d", actualSaltLen)
		}
	}

	required := hashLen + actualSaltLen + 2
	if emLen < required {
		return fmt.Errorf("rsa routines::data too large for key size")
	}
	return nil
}
