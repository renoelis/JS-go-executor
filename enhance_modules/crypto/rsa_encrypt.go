package crypto

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/subtle"
	"fmt"
	"hash"
	"math/big"

	"github.com/dop251/goja"
)

// ============================================================================
// 🔥 RSA 加密解密功能 - 100%完整实现
// ============================================================================

// PublicEncrypt RSA 公钥加密 (Node.js 18+ 完整兼容)
func PublicEncrypt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("publicEncrypt 需要 key 和 data 参数"))
	}

	// 解析参数
	var keyPEM string
	var padding int = 4          // 默认 RSA_PKCS1_OAEP_PADDING (Node.js 18+ 行为)
	var oaepHash string = "sha1" // OAEP 默认哈希算法
	var oaepLabel []byte = nil   // OAEP 默认不使用 label

	// 第一个参数可以是字符串、KeyObject 或对象
	firstArg := call.Arguments[0]
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		// 检查是否有选项对象（有 key、padding 等属性）
		hasKeyProp := obj.Get("key") != nil && !goja.IsUndefined(obj.Get("key"))
		if hasKeyProp {
			// 对象形式: { key: '...' | KeyObject | Buffer, format: 'pem'|'der', type: '...', padding: ..., oaepHash: '...', oaepLabel: ... }

			// 检查 format 参数
			formatVal := obj.Get("format")
			if !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
				formatStr := SafeGetString(formatVal)
				if formatStr == "jwk" {
					panic(runtime.NewTypeError("JWK format is not supported"))
				}
				if formatStr != "" && formatStr != "pem" && formatStr != "der" {
					panic(runtime.NewTypeError(fmt.Sprintf("The value '%s' is invalid for option 'format'", formatStr)))
				}
				if formatStr == "der" {
					keyPEM = ExtractKeyFromDEROptions(runtime, obj)
				} else {
					keyPEM = ExtractKeyPEM(runtime, obj.Get("key"))
				}
			} else {
				keyPEM = ExtractKeyPEM(runtime, obj.Get("key"))
			}

			if paddingVal := obj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			if hashVal := obj.Get("oaepHash"); hashVal != nil && !goja.IsUndefined(hashVal) && !goja.IsNull(hashVal) {
				if hashStr := hashVal.Export(); hashStr != nil {
					oaepHash = fmt.Sprintf("%v", hashStr)
				}
			}
			if labelVal := obj.Get("oaepLabel"); labelVal != nil && !goja.IsUndefined(labelVal) && !goja.IsNull(labelVal) {
				var labelErr error
				oaepLabel, labelErr = ConvertToBytes(runtime, labelVal)
				if labelErr != nil {
					panic(runtime.NewTypeError(fmt.Sprintf("oaepLabel 类型错误: %v", labelErr)))
				}
			}
		} else {
			keyPEM = ExtractKeyPEM(runtime, firstArg)
		}
	} else {
		keyPEM = ExtractKeyPEM(runtime, firstArg)
	}

	// 获取待加密数据
	var data []byte
	secondArg := call.Arguments[1]
	var err error
	data, err = ConvertToBytes(runtime, secondArg)
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("data 类型错误: %v", err)))
	}

	// 解析公钥
	publicKey, err := ParsePublicKeyPEM(keyPEM)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	// 防御性检查，避免内部错误导致 nil 解引用
	if publicKey == nil || publicKey.N == nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid RSA public key")))
	}

	// 执行加密 (支持 Node.js 18+ 的所有 padding 模式)
	var encrypted []byte
	k := (publicKey.N.BitLen() + 7) / 8

	switch padding {
	case 4: // RSA_PKCS1_OAEP_PADDING
		hashFunc, err := GetHashFunction(oaepHash)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		hLen := hashFunc.Size()
		maxLen := k - 2*hLen - 2
		if len(data) > maxLen {
			panic(runtime.NewTypeError(fmt.Sprintf("data too large for key size (max %d bytes for OAEP with %s)", maxLen, oaepHash)))
		}
		encrypted, err = rsa.EncryptOAEP(hashFunc, rand.Reader, publicKey, data, oaepLabel)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("encryption failed (OAEP): %w", err)))
		}
	case 1: // RSA_PKCS1_PADDING
		maxLen := k - 11
		if len(data) > maxLen {
			panic(runtime.NewTypeError(fmt.Sprintf("data too large for key size (max %d bytes for PKCS1)", maxLen)))
		}
		encrypted, err = rsa.EncryptPKCS1v15(rand.Reader, publicKey, data)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("encryption failed: %w", err)))
		}
	case 3: // RSA_NO_PADDING
		if len(data) < k {
			panic(runtime.NewTypeError("error:0200007A:rsa routines::data too small for key size"))
		}
		if len(data) > k {
			panic(runtime.NewTypeError("error:0200006E:rsa routines::data too large for key size"))
		}
		m := new(big.Int).SetBytes(data)
		if m.Cmp(publicKey.N) >= 0 {
			panic(runtime.NewTypeError("data too large for RSA key"))
		}
		e := big.NewInt(int64(publicKey.E))
		c := new(big.Int).Exp(m, e, publicKey.N)
		encrypted = c.FillBytes(make([]byte, k))
	case 5: // RSA_X931_PADDING
		panic(runtime.NewTypeError("publicEncrypt 不支持 RSA_X931_PADDING"))
	case 6: // RSA_PKCS1_PSS_PADDING
		panic(runtime.NewTypeError("publicEncrypt 不支持 RSA_PKCS1_PSS_PADDING (PSS 仅用于签名)"))
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("不支持的 padding 模式: %d", padding)))
	}

	return CreateBuffer(runtime, encrypted)
}

// PrivateDecrypt RSA私钥解密 (Node.js 18+ 完整兼容)
func PrivateDecrypt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("privateDecrypt 需要 key 和 data 参数"))
	}

	// 解析参数
	var keyPEM string
	var padding int = 4          // 默认 RSA_PKCS1_OAEP_PADDING
	var oaepHash string = "sha1" // OAEP 默认哈希算法
	var oaepLabel []byte = nil   // OAEP 默认不使用 label
	var passphrase string = ""
	var hasPassphrase bool = false // 是否提供了 passphrase

	firstArg := call.Arguments[0]
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		hasKeyProp := obj.Get("key") != nil && !goja.IsUndefined(obj.Get("key"))
		if hasKeyProp {
			// 验证 format 参数
			formatVal := obj.Get("format")
			if !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
				formatStr := SafeGetString(formatVal)
				if formatStr == "jwk" {
					panic(runtime.NewTypeError("JWK format is not supported"))
				}
				if formatStr != "" && formatStr != "pem" && formatStr != "der" {
					panic(runtime.NewTypeError(fmt.Sprintf("The value '%s' is invalid for option 'format'", formatStr)))
				}
				if formatStr == "der" {
					keyPEM = ExtractKeyFromDEROptions(runtime, obj)
				} else {
					keyPEM = ExtractKeyPEM(runtime, obj.Get("key"))
				}
			} else {
				keyPEM = ExtractKeyPEM(runtime, obj.Get("key"))
			}

			// 验证 type 参数
			typeVal := obj.Get("type")
			if !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
				typeStr := SafeGetString(typeVal)
				if typeStr != "" && typeStr != "pkcs1" && typeStr != "pkcs8" && typeStr != "sec1" {
					panic(runtime.NewTypeError(fmt.Sprintf("The value '%s' is invalid for option 'type'", typeStr)))
				}
			}

			if paddingVal := obj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			if hashVal := obj.Get("oaepHash"); hashVal != nil && !goja.IsUndefined(hashVal) && !goja.IsNull(hashVal) {
				if hashStr := hashVal.Export(); hashStr != nil {
					oaepHash = fmt.Sprintf("%v", hashStr)
				}
			}
			if labelVal := obj.Get("oaepLabel"); labelVal != nil && !goja.IsUndefined(labelVal) && !goja.IsNull(labelVal) {
				var labelErr error
				oaepLabel, labelErr = ConvertToBytes(runtime, labelVal)
				if labelErr != nil {
					panic(runtime.NewTypeError(fmt.Sprintf("oaepLabel 类型错误: %v", labelErr)))
				}
			}
			if passphraseVal := obj.Get("passphrase"); passphraseVal != nil && !goja.IsUndefined(passphraseVal) && !goja.IsNull(passphraseVal) {
				hasPassphrase = true
				// 严格类型检查：只接受 string 或 Buffer 类型
				exported := passphraseVal.Export()
				switch v := exported.(type) {
				case string:
					passphrase = v
				case []byte:
					passphrase = string(v)
				default:
					// 尝试作为 Buffer 对象处理
					if bytes, err := ConvertToBytes(runtime, passphraseVal); err == nil {
						passphrase = string(bytes)
					} else {
						// 不是 string 或 Buffer 类型，抛出错误
						panic(runtime.NewTypeError(fmt.Sprintf("passphrase must be a string or Buffer, received %T", exported)))
					}
				}
			}
		} else {
			keyPEM = ExtractKeyPEM(runtime, firstArg)
		}
	} else {
		keyPEM = ExtractKeyPEM(runtime, firstArg)
	}

	// 获取待解密数据
	data, err := ConvertToBytes(runtime, call.Arguments[1])
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("data 类型错误: %v", err)))
	}

	// 解析私钥
	var privateKey *rsa.PrivateKey
	if hasPassphrase {
		// 提供了 passphrase（包括空字符串）
		privateKey, err = ParsePrivateKey(keyPEM, passphrase)
	} else {
		// 未提供 passphrase
		privateKey, err = ParsePrivateKey(keyPEM)
	}
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	// 执行解密
	var decrypted []byte
	k := (privateKey.N.BitLen() + 7) / 8

	switch padding {
	case 4: // RSA_PKCS1_OAEP_PADDING
		hashFunc, err := GetHashFunction(oaepHash)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		decrypted, err = rsa.DecryptOAEP(hashFunc, rand.Reader, privateKey, data, oaepLabel)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("decryption failed (OAEP): %w", err)))
		}
	case 1: // RSA_PKCS1_PADDING
		decrypted, err = rsa.DecryptPKCS1v15(rand.Reader, privateKey, data)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("decryption failed: %w", err)))
		}
	case 3: // RSA_NO_PADDING
		if len(data) != k {
			panic(runtime.NewTypeError(fmt.Sprintf("data length must equal key size (%d bytes)", k)))
		}
		c := new(big.Int).SetBytes(data)
		if c.Cmp(privateKey.N) >= 0 {
			panic(runtime.NewTypeError("data too large for RSA key"))
		}
		m := new(big.Int).Exp(c, privateKey.D, privateKey.N)
		decrypted = m.FillBytes(make([]byte, k))
	case 5: // RSA_X931_PADDING
		panic(runtime.NewTypeError("privateDecrypt 不支持 RSA_X931_PADDING"))
	case 6: // RSA_PKCS1_PSS_PADDING
		panic(runtime.NewTypeError("privateDecrypt 不支持 RSA_PKCS1_PSS_PADDING (PSS 仅用于签名)"))
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("不支持的 padding 模式: %d", padding)))
	}

	return CreateBuffer(runtime, decrypted)
}

// PrivateEncrypt RSA 私钥加密 (Node.js 18+ 完整兼容)
func PrivateEncrypt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("privateEncrypt 需要 key 和 data 参数"))
	}

	// 解析参数
	var keyPEM string
	var padding int = 1 // 默认 RSA_PKCS1_PADDING
	var passphrase string = ""
	var hasPassphrase bool = false // 是否提供了 passphrase

	firstArg := call.Arguments[0]
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		hasKeyProp := obj.Get("key") != nil && !goja.IsUndefined(obj.Get("key"))
		if hasKeyProp {
			// 验证 format 参数
			formatVal := obj.Get("format")
			if !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
				formatStr := SafeGetString(formatVal)
				if formatStr == "jwk" {
					panic(runtime.NewTypeError("JWK format is not supported"))
				}
				if formatStr != "" && formatStr != "pem" && formatStr != "der" {
					panic(runtime.NewTypeError(fmt.Sprintf("The value '%s' is invalid for option 'format'", formatStr)))
				}
				if formatStr == "der" {
					keyPEM = ExtractKeyFromDEROptions(runtime, obj)
				} else {
					keyPEM = ExtractKeyPEM(runtime, obj.Get("key"))
				}
			} else {
				keyPEM = ExtractKeyPEM(runtime, obj.Get("key"))
			}

			// 验证 type 参数
			typeVal := obj.Get("type")
			if !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
				typeStr := SafeGetString(typeVal)
				if typeStr != "" && typeStr != "pkcs1" && typeStr != "pkcs8" && typeStr != "sec1" {
					panic(runtime.NewTypeError(fmt.Sprintf("The value '%s' is invalid for option 'type'", typeStr)))
				}
			}

			if paddingVal := obj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			if passphraseVal := obj.Get("passphrase"); passphraseVal != nil && !goja.IsUndefined(passphraseVal) && !goja.IsNull(passphraseVal) {
				hasPassphrase = true
				// 严格类型检查：只接受 string 或 Buffer 类型
				exported := passphraseVal.Export()
				switch v := exported.(type) {
				case string:
					passphrase = v
				case []byte:
					passphrase = string(v)
				default:
					// 尝试作为 Buffer 对象处理
					if bytes, err := ConvertToBytes(runtime, passphraseVal); err == nil {
						passphrase = string(bytes)
					} else {
						// 不是 string 或 Buffer 类型，抛出错误
						panic(runtime.NewTypeError(fmt.Sprintf("passphrase must be a string or Buffer, received %T", exported)))
					}
				}
			}
		} else {
			keyPEM = ExtractKeyPEM(runtime, firstArg)
		}
	} else {
		keyPEM = ExtractKeyPEM(runtime, firstArg)
	}

	// 显式检查第二个参数是否为Symbol（在ConvertToBytes之前）
	// Symbol在goja中是*goja.Symbol类型
	secondArg := call.Arguments[1]
	if _, isSymbol := secondArg.(*goja.Symbol); isSymbol {
		panic(runtime.NewTypeError("The \"buffer\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, or DataView. Received type symbol"))
	}

	data, err := ConvertToBytes(runtime, secondArg)
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("data 类型错误: %v", err)))
	}

	var privateKey *rsa.PrivateKey
	if hasPassphrase {
		// 提供了 passphrase（包括空字符串）
		privateKey, err = ParsePrivateKey(keyPEM, passphrase)
	} else {
		// 未提供 passphrase
		privateKey, err = ParsePrivateKey(keyPEM)
	}
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	var encrypted []byte
	k := (privateKey.N.BitLen() + 7) / 8

	switch padding {
	case 1: // RSA_PKCS1_PADDING
		maxLen := k - 11
		if len(data) > maxLen {
			panic(runtime.NewTypeError(fmt.Sprintf("data too large for key size (max %d bytes)", maxLen)))
		}
		encrypted, err = RSAEncryptWithPrivateKey(privateKey, data)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("encryption failed: %w", err)))
		}
	case 3: // RSA_NO_PADDING
		if len(data) < k {
			panic(runtime.NewTypeError("error:0200007A:rsa routines::data too small for key size"))
		}
		if len(data) > k {
			panic(runtime.NewTypeError("error:0200006E:rsa routines::data too large for key size"))
		}
		m := new(big.Int).SetBytes(data)
		if m.Cmp(privateKey.N) >= 0 {
			panic(runtime.NewTypeError("data too large for RSA key"))
		}
		c := new(big.Int).Exp(m, privateKey.D, privateKey.N)
		encrypted = c.FillBytes(make([]byte, k))
	case 4: // RSA_PKCS1_OAEP_PADDING
		panic(runtime.NewTypeError("privateEncrypt 不支持 RSA_PKCS1_OAEP_PADDING (OAEP 用于公钥加密)"))
	case 5: // RSA_X931_PADDING
		panic(runtime.NewTypeError("privateEncrypt 不支持 RSA_X931_PADDING"))
	case 6: // RSA_PKCS1_PSS_PADDING
		panic(runtime.NewTypeError("privateEncrypt 不支持 RSA_PKCS1_PSS_PADDING (PSS 仅用于签名)"))
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("不支持的 padding 模式: %d", padding)))
	}

	return CreateBuffer(runtime, encrypted)
}

// PublicDecrypt RSA 公钥解密 (Node.js 18+ 完整兼容)
func PublicDecrypt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("publicDecrypt 需要 key 和 data 参数"))
	}

	// 解析参数
	var keyPEM string
	var padding int = 1 // 默认 RSA_PKCS1_PADDING

	firstArg := call.Arguments[0]
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		hasKeyProp := obj.Get("key") != nil && !goja.IsUndefined(obj.Get("key"))
		if hasKeyProp {
			formatVal := obj.Get("format")
			if !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) && SafeGetString(formatVal) == "der" {
				keyPEM = ExtractKeyFromDEROptions(runtime, obj)
			} else {
				keyPEM = ExtractKeyPEM(runtime, obj.Get("key"))
			}

			if paddingVal := obj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
		} else {
			keyPEM = ExtractKeyPEM(runtime, firstArg)
		}
	} else {
		keyPEM = ExtractKeyPEM(runtime, firstArg)
	}

	data, err := ConvertToBytes(runtime, call.Arguments[1])
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("data 类型错误: %v", err)))
	}

	publicKey, err := ParsePublicKeyPEM(keyPEM)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	var decrypted []byte
	k := (publicKey.N.BitLen() + 7) / 8

	switch padding {
	case 1: // RSA_PKCS1_PADDING
		if len(data) != k {
			panic(runtime.NewTypeError(fmt.Sprintf("data length must equal key size (%d bytes)", k)))
		}
		decrypted, err = RSADecryptWithPublicKey(publicKey, data)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("decryption failed: %w", err)))
		}
	case 3: // RSA_NO_PADDING
		if len(data) != k {
			panic(runtime.NewTypeError(fmt.Sprintf("data length must equal key size (%d bytes)", k)))
		}
		c := new(big.Int).SetBytes(data)
		if c.Cmp(publicKey.N) >= 0 {
			panic(runtime.NewTypeError("data too large for RSA key"))
		}
		e := big.NewInt(int64(publicKey.E))
		m := new(big.Int).Exp(c, e, publicKey.N)
		decrypted = m.FillBytes(make([]byte, k))
	case 4: // RSA_PKCS1_OAEP_PADDING
		panic(runtime.NewTypeError("publicDecrypt 不支持 RSA_PKCS1_OAEP_PADDING (OAEP 用于公钥加密)"))
	case 5: // RSA_X931_PADDING
		panic(runtime.NewTypeError("publicDecrypt 不支持 RSA_X931_PADDING"))
	case 6: // RSA_PKCS1_PSS_PADDING
		panic(runtime.NewTypeError("publicDecrypt 不支持 RSA_PKCS1_PSS_PADDING (PSS 仅用于签名)"))
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("不支持的 padding 模式: %d", padding)))
	}

	return CreateBuffer(runtime, decrypted)
}

// ============================================================================
// 🔥 辅助函数 - RSA 原语实现
// ============================================================================

// RSAEncryptWithPrivateKey 使用私钥加密 (PKCS#1 v1.5 type 1 padding)
func RSAEncryptWithPrivateKey(priv *rsa.PrivateKey, data []byte) ([]byte, error) {
	k := priv.Size()
	if len(data) > k-11 {
		return nil, fmt.Errorf("数据太长，最大 %d 字节", k-11)
	}

	// PKCS#1 v1.5 type 1 padding: 0x00 || 0x01 || PS || 0x00 || M
	em := make([]byte, k)
	em[0] = 0x00
	em[1] = 0x01

	// 填充 0xFF (PS至少8字节)
	psLen := k - len(data) - 3
	for i := 2; i < 2+psLen; i++ {
		em[i] = 0xFF
	}

	em[2+psLen] = 0x00
	copy(em[2+psLen+1:], data)

	// 执行原始 RSA 运算: c = m^d mod n
	m := new(big.Int).SetBytes(em)
	c := new(big.Int).Exp(m, priv.D, priv.N)

	return c.FillBytes(make([]byte, k)), nil
}

// RSADecryptWithPublicKey 使用公钥解密 (PKCS#1 v1.5 type 1 unpadding)
func RSADecryptWithPublicKey(pub *rsa.PublicKey, data []byte) ([]byte, error) {
	k := pub.Size()
	if len(data) != k {
		return nil, fmt.Errorf("密文长度必须等于密钥长度 %d 字节", k)
	}

	// 执行原始 RSA 运算: m = c^e mod n
	c := new(big.Int).SetBytes(data)
	e := big.NewInt(int64(pub.E))
	m := new(big.Int).Exp(c, e, pub.N)

	em := m.FillBytes(make([]byte, k))

	// 常量时间验证并去除 PKCS#1 v1.5 type 1 padding
	msg, ok := unpadPKCS1v15Type1ConstantTime(em)
	if !ok {
		return nil, fmt.Errorf("incorrect data")
	}

	return msg, nil
}

// unpadPKCS1v15Type1ConstantTime 常量时间去除PKCS#1 v1.5 Type 1 padding
// 格式: 0x00 || 0x01 || PS (至少8个0xFF) || 0x00 || M
func unpadPKCS1v15Type1ConstantTime(em []byte) ([]byte, bool) {
	if len(em) < 11 {
		return nil, false
	}

	// 常量时间验证
	invalid := 0

	// 检查前两个字节: 0x00 || 0x01
	invalid |= subtle.ConstantTimeByteEq(em[0], 0x00) ^ 1
	invalid |= subtle.ConstantTimeByteEq(em[1], 0x01) ^ 1

	// 常量时间遍历找分隔 0x00，统计分隔符之前的 0xFF 数量
	sep := -1
	padLen := 0

	for i := 2; i < len(em); i++ {
		b := em[i]
		isZero := subtle.ConstantTimeByteEq(b, 0x00)
		isFF := subtle.ConstantTimeByteEq(b, 0xFF)

		// 如果还没找到分隔符且当前是 0x00，则记录位置
		notFoundYet := subtle.ConstantTimeEq(int32(sep), -1)
		sep = subtle.ConstantTimeSelect(notFoundYet&isZero, i, sep)

		// 只统计分隔符之前的 0xFF
		shouldCount := notFoundYet & isFF
		padLen += shouldCount
	}

	// 验证：必须找到分隔符
	invalid |= subtle.ConstantTimeEq(int32(sep), -1)

	// 验证：填充长度至少 8 字节
	invalid |= subtle.ConstantTimeLessOrEq(padLen, 7)

	// 如果无效，返回 nil
	if invalid != 0 {
		return nil, false
	}

	// 返回消息部分（分隔符之后的数据）
	return em[sep+1:], true
}

// GetOAEPHash 根据算法名称获取哈希函数（用于OAEP）
func GetOAEPHash(algorithm string) hash.Hash {
	hashFunc, _ := GetHashFunction(algorithm)
	return hashFunc
}
