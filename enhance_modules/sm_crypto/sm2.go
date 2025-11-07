package sm_crypto

import (
	"crypto/ecdsa"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"

	"github.com/dop251/goja"
	"github.com/emmansun/gmsm/sm2"
	"github.com/emmansun/gmsm/sm3"
)

// ============================================================================
// 🔐 SM2 密钥生成
// ============================================================================

// GenerateKeyPairHex 生成 SM2 密钥对（十六进制格式）
// 对应 JS: sm2.generateKeyPairHex(str?)
//
// 参数:
//   - str: string (可选) - 随机种子，如果提供则基于种子生成
//
// 返回: { publicKey: string, privateKey: string }
//   - publicKey: "04" + X (64 字符) + Y (64 字符) = 130 字符
//   - privateKey: D (64 字符)
func GenerateKeyPairHex(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	var privateKey *sm2.PrivateKey
	var err error

	// 如果提供了种子参数
	if len(call.Arguments) > 0 && !goja.IsUndefined(call.Argument(0)) {
		seedStr := call.Argument(0).String()
		// 使用种子生成私钥
		d := new(big.Int)

		// 尝试解析种子（支持十进制和十六进制）
		var success bool
		if strings.HasPrefix(seedStr, "0x") || strings.HasPrefix(seedStr, "0X") {
			// 十六进制（去掉 0x 前缀）
			_, success = d.SetString(seedStr[2:], 16)
		} else {
			// 十进制
			_, success = d.SetString(seedStr, 10)
		}

		if !success {
			// 匹配 Node.js sm-crypto-v2 的错误消息
			panic(runtime.NewTypeError(fmt.Sprintf("Cannot convert %s to a BigInt", seedStr)))
		}

		// 确保在有效范围内 (1 到 n-1)
		n := sm2.P256().Params().N
		d.Mod(d, n)
		if d.Sign() == 0 {
			d.SetInt64(1)
		}

		privateKey = new(sm2.PrivateKey)
		privateKey.Curve = sm2.P256()
		privateKey.D = d
		privateKey.PublicKey.Curve = sm2.P256()
		privateKey.PublicKey.X, privateKey.PublicKey.Y = sm2.P256().ScalarBaseMult(d.Bytes())
	} else {
		// 随机生成
		privateKey, err = sm2.GenerateKey(rand.Reader)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to generate key pair: %w", err)))
		}
	}

	// 转换为十六进制格式
	result := runtime.NewObject()
	result.Set("publicKey", runtime.ToValue(PublicKeyToHex(&privateKey.PublicKey, false)))
	result.Set("privateKey", runtime.ToValue(PrivateKeyToHex(privateKey)))

	return result
}

// ============================================================================
// 🔐 SM2 加密/解密
// ============================================================================

// DoEncrypt SM2 加密
// 对应 JS: sm2.doEncrypt(msg, publicKey, cipherMode=1, options?)
//
// 参数:
//   - msg: string | Uint8Array - 明文
//   - publicKey: string - 公钥（十六进制）
//   - cipherMode: number - 密文排列模式（0=C1C2C3, 1=C1C3C2，默认 1）
//   - options: { asn1?: boolean } - 可选参数
//
// 返回: string - 密文（十六进制）
func DoEncrypt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("doEncrypt requires at least 2 arguments"))
	}

	// 参数 0: msg (string | Uint8Array)
	msg, err := ParseStringOrBytes(call.Argument(0), runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid msg parameter: %w", err)))
	}

	// 参数 1: publicKey (string | {x, y})
	publicKey, err := ParsePublicKeyParam(call.Argument(1), runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid public key: %w", err)))
	}

	// 参数 2: cipherMode (默认 1)
	cipherMode := 1
	if len(call.Arguments) > 2 && !goja.IsUndefined(call.Argument(2)) {
		cipherMode = int(call.Argument(2).ToInteger())
	}

	// 参数 3: options
	opts := ParseOptions(call, 3, runtime)
	asn1 := GetBoolOption(opts, "asn1", false)

	// 执行加密
	var ciphertext []byte
	if asn1 {
		// ASN.1 模式
		ciphertext, err = sm2.EncryptASN1(rand.Reader, publicKey, msg)
	} else {
		// 普通模式
		var opts *sm2.EncrypterOpts
		if cipherMode == 0 {
			opts = sm2.NewPlainEncrypterOpts(sm2.MarshalUncompressed, sm2.C1C2C3)
		} else {
			opts = sm2.NewPlainEncrypterOpts(sm2.MarshalUncompressed, sm2.C1C3C2)
		}
		ciphertext, err = sm2.Encrypt(rand.Reader, publicKey, msg, opts)
	}

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("encryption failed: %w", err)))
	}

	// 转换为十六进制
	ciphertextHex := BytesToHex(ciphertext)

	// 🔥 重要：JavaScript 版本的 C1 不包含 "04" 前缀
	// 如果是非 ASN.1 模式且密文以 "04" 开头，需要去掉前两个字符
	if !asn1 && len(ciphertextHex) > 2 && ciphertextHex[:2] == "04" {
		ciphertextHex = ciphertextHex[2:]
	}

	return runtime.ToValue(ciphertextHex)
}

// DoDecrypt SM2 解密
// 对应 JS: sm2.doDecrypt(encryptData, privateKey, cipherMode=1, options?)
//
// 参数:
//   - encryptData: string - 密文（十六进制）
//   - privateKey: string - 私钥（十六进制）
//   - cipherMode: number - 密文排列模式（0=C1C2C3, 1=C1C3C2，默认 1）
//   - options: { output?: "string" | "array", asn1?: boolean }
//
// 返回: string | Uint8Array - 明文
func DoDecrypt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("doDecrypt requires at least 2 arguments"))
	}

	// 参数 0: encryptData (string)
	encryptDataHex := call.Argument(0).String()

	// 🔥 重要：JavaScript 版本的密文 C1 不包含 "04" 前缀
	// 解密时需要加回来（如果是非 ASN.1 模式）
	// 后面会根据 asn1 参数判断是否需要添加

	encryptData, err := HexToBytes(encryptDataHex)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid encrypted data: %w", err)))
	}

	// 参数 1: privateKey (string)
	privateKeyHex := call.Argument(1).String()
	privateKey, err := HexToPrivateKey(privateKeyHex)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid private key: %w", err)))
	}

	// 参数 2: cipherMode (默认 1)
	cipherMode := 1
	if len(call.Arguments) > 2 && !goja.IsUndefined(call.Argument(2)) {
		cipherMode = int(call.Argument(2).ToInteger())
	}

	// 参数 3: options
	opts := ParseOptions(call, 3, runtime)
	output := GetStringOption(opts, "output", "string")
	asn1 := GetBoolOption(opts, "asn1", false)

	// 🔥 如果不是 ASN.1 模式，需要在 C1 前添加 "04" 前缀
	// JavaScript 版本的密文 C1 不包含 "04"，但 gmsm 需要
	if !asn1 {
		// 在密文前添加 "04"
		encryptDataWithPrefix := make([]byte, len(encryptData)+1)
		encryptDataWithPrefix[0] = 0x04
		copy(encryptDataWithPrefix[1:], encryptData)
		encryptData = encryptDataWithPrefix
	}

	// 执行解密
	var plaintext []byte
	if asn1 {
		// ASN.1 模式：先转换为普通格式
		var convertedData []byte
		if cipherMode == 0 {
			convertedData, err = sm2.ASN1Ciphertext2Plain(encryptData, sm2.NewPlainEncrypterOpts(sm2.MarshalUncompressed, sm2.C1C2C3))
		} else {
			convertedData, err = sm2.ASN1Ciphertext2Plain(encryptData, sm2.NewPlainEncrypterOpts(sm2.MarshalUncompressed, sm2.C1C3C2))
		}
		if err != nil {
			// 解密失败返回空
			goto decryptFailed
		}

		// 解密时需要指定模式
		var decryptOpts *sm2.DecrypterOpts
		if cipherMode == 0 {
			decryptOpts = sm2.NewPlainDecrypterOpts(sm2.C1C2C3)
		} else {
			decryptOpts = sm2.NewPlainDecrypterOpts(sm2.C1C3C2)
		}
		plaintext, err = privateKey.Decrypt(rand.Reader, convertedData, decryptOpts)
	} else {
		// 普通模式 - 需要指定密文排列顺序
		var decryptOpts *sm2.DecrypterOpts
		if cipherMode == 0 {
			decryptOpts = sm2.NewPlainDecrypterOpts(sm2.C1C2C3)
		} else {
			decryptOpts = sm2.NewPlainDecrypterOpts(sm2.C1C3C2)
		}
		plaintext, err = privateKey.Decrypt(rand.Reader, encryptData, decryptOpts)
	}

decryptFailed:

	// 如果解密失败，返回空（匹配 JS 行为）
	if err != nil {
		if output == "array" {
			return CreateUint8Array(runtime, []byte{})
		}
		return runtime.ToValue("")
	}

	// 返回结果
	if output == "array" {
		return CreateUint8Array(runtime, plaintext)
	}
	return runtime.ToValue(BytesToUtf8(plaintext))
}

// ============================================================================
// 🔐 SM2 签名/验签
// ============================================================================

// DoSignature SM2 签名
// 对应 JS: sm2.doSignature(msg, privateKey, options?)
//
// 参数:
//   - msg: string | Uint8Array - 消息
//   - privateKey: string - 私钥（十六进制）
//   - options: { der?: boolean, hash?: boolean, publicKey?: string, userId?: string }
//
// 返回: string - 签名（十六进制）
func DoSignature(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("doSignature requires at least 2 arguments"))
	}

	// 参数 0: msg (string | Uint8Array)
	msg, err := ParseStringOrBytes(call.Argument(0), runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid msg parameter: %w", err)))
	}

	// 参数 1: privateKey (string)
	privateKeyHex := call.Argument(1).String()
	privateKey, err := HexToPrivateKey(privateKeyHex)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid private key: %w", err)))
	}

	// 参数 2: options
	opts := ParseOptions(call, 2, runtime)
	der := GetBoolOption(opts, "der", false)
	hashMode := GetBoolOption(opts, "hash", false)
	userID := GetStringOption(opts, "userId", "1234567812345678")

	// 处理 pointPool：为了兼容 Node.js sm-crypto-v2 的行为，需要从 pool 中消费一个点
	// Node.js 版本会调用 pool.shift() 移除第一个元素
	if opts != nil {
		pointPoolVal := opts.Get("pointPool")
		if pointPoolVal != nil && !goja.IsUndefined(pointPoolVal) && !goja.IsNull(pointPoolVal) {
			pointPoolObj := pointPoolVal.ToObject(runtime)
			if pointPoolObj != nil {
				// 获取数组长度
				lengthVal := pointPoolObj.Get("length")
				if lengthVal != nil && !goja.IsUndefined(lengthVal) {
					length := int(lengthVal.ToInteger())
					if length > 0 {
						// 模拟 array.shift()：移除第一个元素
						// 1. 获取所有元素（从索引 1 开始）
						// 2. 重新排列数组
						for i := 0; i < length-1; i++ {
							pointPoolObj.Set(fmt.Sprintf("%d", i), pointPoolObj.Get(fmt.Sprintf("%d", i+1)))
						}
						// 3. 删除最后一个元素
						pointPoolObj.Delete(fmt.Sprintf("%d", length-1))
						// 4. 更新 length
						pointPoolObj.Set("length", runtime.ToValue(length-1))
					}
				}
			}
		}
	}

	var msgHash []byte

	if hashMode {
		// 需要计算 e = SM3(Z || M)
		publicKeyHex := GetStringOption(opts, "publicKey", "")
		if publicKeyHex == "" {
			// 从私钥导出公钥
			publicKeyHex = PublicKeyToHex(&privateKey.PublicKey, false)
		}

		publicKey, err := HexToPublicKey(publicKeyHex)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("invalid public key: %w", err)))
		}

		// 计算 Z 值
		za, err := calculateZA(publicKey, []byte(userID))
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to calculate ZA: %w", err)))
		}

		// e = SM3(Z || M)
		h := sm3.New()
		h.Write(za)
		h.Write(msg)
		msgHash = h.Sum(nil)
	} else {
		// 直接对消息签名（消息被视为哈希值）
		msgHash = msg
	}

	// 执行签名
	var signature []byte
	if der {
		// DER 编码格式
		signature, err = sm2.SignASN1(rand.Reader, privateKey, msgHash, nil)
	} else {
		// 原始格式 (R || S)
		r, s, err2 := sm2.Sign(rand.Reader, &privateKey.PrivateKey, msgHash)
		if err2 != nil {
			err = err2
		} else {
			rHex := LeftPad(r.Text(16), 64)
			sHex := LeftPad(s.Text(16), 64)
			return runtime.ToValue(rHex + sHex)
		}
	}

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("signature failed: %w", err)))
	}

	return runtime.ToValue(BytesToHex(signature))
}

// DoVerifySignature SM2 验签
// 对应 JS: sm2.doVerifySignature(msg, signHex, publicKey, options?)
//
// 参数:
//   - msg: string | Uint8Array - 消息
//   - signHex: string - 签名（十六进制）
//   - publicKey: string - 公钥（十六进制）
//   - options: { der?: boolean, hash?: boolean, userId?: string }
//
// 返回: boolean - 验签结果
func DoVerifySignature(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("doVerifySignature requires at least 3 arguments"))
	}

	// 参数 0: msg (string | Uint8Array)
	msg, err := ParseStringOrBytes(call.Argument(0), runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid msg parameter: %w", err)))
	}

	// 参数 1: signHex (string)
	signHex := call.Argument(1).String()

	// 参数 2: publicKey (string | {x, y})
	publicKey, err := ParsePublicKeyParam(call.Argument(2), runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid public key: %w", err)))
	}

	// 参数 3: options
	opts := ParseOptions(call, 3, runtime)
	der := GetBoolOption(opts, "der", false)
	hashMode := GetBoolOption(opts, "hash", false)
	userID := GetStringOption(opts, "userId", "1234567812345678")

	var msgHash []byte

	if hashMode {
		// 需要计算 e = SM3(Z || M)
		za, err := calculateZA(publicKey, []byte(userID))
		if err != nil {
			return runtime.ToValue(false)
		}

		// e = SM3(Z || M)
		h := sm3.New()
		h.Write(za)
		h.Write(msg)
		msgHash = h.Sum(nil)
	} else {
		// 直接验证（消息被视为哈希值）
		msgHash = msg
	}

	// 执行验签
	var valid bool
	if der {
		// DER 编码格式
		signature, err := HexToBytes(signHex)
		if err != nil {
			return runtime.ToValue(false)
		}
		valid = sm2.VerifyASN1(publicKey, msgHash, signature)
	} else {
		// 原始格式 (R || S)
		if len(signHex) != 128 {
			return runtime.ToValue(false)
		}

		r := new(big.Int)
		s := new(big.Int)
		r.SetString(signHex[:64], 16)
		s.SetString(signHex[64:], 16)

		valid = sm2.Verify(publicKey, msgHash, r, s)
	}

	return runtime.ToValue(valid)
}

// ============================================================================
// 🔐 SM2 密钥管理
// ============================================================================

// GetPublicKeyFromPrivateKey 从私钥导出公钥
// 对应 JS: sm2.getPublicKeyFromPrivateKey(privateKey)
func GetPublicKeyFromPrivateKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("getPublicKeyFromPrivateKey requires 1 argument"))
	}

	privateKeyHex := call.Argument(0).String()
	privateKey, err := HexToPrivateKey(privateKeyHex)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid private key: %w", err)))
	}

	return runtime.ToValue(PublicKeyToHex(&privateKey.PublicKey, false))
}

// CompressPublicKeyHex 压缩公钥
// 对应 JS: sm2.compressPublicKeyHex(publicKey)
//
// 将 130 字符的未压缩公钥压缩为 66 字符
func CompressPublicKeyHex(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("compressPublicKeyHex requires 1 argument"))
	}

	publicKeyHex := call.Argument(0).String()

	// 移除可能的 0x 前缀
	cleanHex := publicKeyHex
	if len(cleanHex) >= 2 && (cleanHex[:2] == "0x" || cleanHex[:2] == "0X") {
		cleanHex = cleanHex[2:]
	}

	// ⚠️ 与 sm-crypto-v2 对齐：已压缩的公钥不能再次压缩
	// sm-crypto-v2 会抛出错误 "Invalid public key to compress"
	if len(cleanHex) == 66 && (cleanHex[:2] == "02" || cleanHex[:2] == "03") {
		panic(runtime.NewGoError(fmt.Errorf("Invalid public key to compress")))
	}

	publicKey, err := HexToPublicKey(publicKeyHex)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid public key: %w", err)))
	}

	return runtime.ToValue(PublicKeyToHex(publicKey, true))
}

// ComparePublicKeyHex 比较两个公钥是否相同
// 对应 JS: sm2.comparePublicKeyHex(publicKey1, publicKey2)
func ComparePublicKeyHex(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("comparePublicKeyHex requires 2 arguments"))
	}

	pubKey1Hex := call.Argument(0).String()
	pubKey2Hex := call.Argument(1).String()

	// 兼容 Node.js 行为：解析失败时应该抛出错误而不是返回 false
	pubKey1, err1 := HexToPublicKey(pubKey1Hex)
	if err1 != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid first public key: %w", err1)))
	}

	pubKey2, err2 := HexToPublicKey(pubKey2Hex)
	if err2 != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid second public key: %w", err2)))
	}

	// 比较 X 和 Y 坐标
	equal := pubKey1.X.Cmp(pubKey2.X) == 0 && pubKey1.Y.Cmp(pubKey2.Y) == 0
	return runtime.ToValue(equal)
}

// VerifyPublicKey 验证公钥是否有效
// 对应 JS: sm2.verifyPublicKey(publicKey)
//
// ⚠️ 与 sm-crypto-v2 对齐：验证失败时抛出错误而不是返回 false
func VerifyPublicKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("verifyPublicKey requires 1 argument"))
	}

	arg := call.Argument(0)

	// 兼容 Node.js 行为：如果参数不是字符串类型，应该抛出错误
	// 检查是否为字符串类型
	if arg.ExportType() != nil {
		kind := arg.ExportType().Kind().String()
		// 如果是对象（map, struct等）或其他非字符串类型，抛出错误
		if kind == "map" || kind == "struct" || kind == "ptr" {
			panic(runtime.NewTypeError("verifyPublicKey expects a string argument"))
		}
	}

	// 尝试将对象转为字符串，检查是否是 "[object Object]" 这种情况
	publicKeyHex := arg.String()
	if publicKeyHex == "[object Object]" {
		panic(runtime.NewTypeError("verifyPublicKey expects a string argument"))
	}

	// ⚠️ 与 sm-crypto-v2 对齐：验证失败时抛出错误
	// sm-crypto-v2 使用 @noble/curves，验证失败时会抛出异常
	_, err := HexToPublicKey(publicKeyHex)
	if err != nil {
		// 将错误信息转换为与 sm-crypto-v2 类似的格式
		panic(runtime.NewGoError(err))
	}

	return runtime.ToValue(true)
}

// ============================================================================
// 🔐 SM2 高级功能
// ============================================================================

// GetHash 计算摘要（含 Z 值）
// 对应 JS: sm2.getHash(msg, publicKey, userId?)
// msg 可以是：
//   - 十六进制字符串（如 "48656c6c6f"）
//   - 普通 UTF-8 字符串（如 "Hello"）- 会自动转换为十六进制
func GetHash(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("getHash requires at least 2 arguments"))
	}

	// 参数 0: msg (可以是十六进制字符串或普通字符串)
	msgStr := call.Argument(0).String()

	// 尝试解析为字节数组：先尝试十六进制，失败则作为UTF-8
	var msgBytes []byte
	var err error

	// 检查是否是有效的十六进制字符串
	isHex := true
	for _, c := range msgStr {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			isHex = false
			break
		}
	}

	if isHex && len(msgStr) > 0 {
		// 尝试作为十六进制解析
		msgBytes, err = HexToBytes(msgStr)
		if err != nil {
			// 十六进制解析失败，作为UTF-8处理
			msgBytes = Utf8ToBytes(msgStr)
		}
	} else {
		// 不是十六进制，作为UTF-8处理
		msgBytes = Utf8ToBytes(msgStr)
	}

	// 参数 1: publicKey
	publicKeyHex := call.Argument(1).String()
	publicKey, err := HexToPublicKey(publicKeyHex)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid public key: %w", err)))
	}

	// 参数 2: userId (可选)
	userID := "1234567812345678"
	if len(call.Arguments) > 2 && !goja.IsUndefined(call.Argument(2)) {
		userID = call.Argument(2).String()
	}

	// 计算 Z 值
	za, err := calculateZA(publicKey, []byte(userID))
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to calculate ZA: %w", err)))
	}

	// e = SM3(Z || M)
	h := sm3.New()
	h.Write(za)
	h.Write(msgBytes)
	hash := h.Sum(nil)

	return runtime.ToValue(BytesToHex(hash))
}

// GetZ 计算 Z 值
// 对应 JS: sm2.getZ(publicKey, userId?)
// 返回: Uint8Array - Z 值（32字节）
func GetZ(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("getZ requires at least 1 argument"))
	}

	// 参数 0: publicKey
	publicKeyHex := call.Argument(0).String()
	publicKey, err := HexToPublicKey(publicKeyHex)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid public key: %w", err)))
	}

	// 参数 1: userId (可选)
	userID := "1234567812345678"
	if len(call.Arguments) > 1 && !goja.IsUndefined(call.Argument(1)) {
		userID = call.Argument(1).String()
	}

	// 计算 Z 值
	za, err := calculateZA(publicKey, []byte(userID))
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to calculate ZA: %w", err)))
	}

	// 返回 Uint8Array（匹配 Node.js sm-crypto-v2 行为）
	return CreateUint8Array(runtime, za)
}

// ECDH 椭圆曲线 Diffie-Hellman 密钥交换
// 对应 JS: sm2.ecdh(privateKeyA, publicKeyB)
// 返回: Uint8Array - 共享密钥（32字节）
func ECDH(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("ecdh requires 2 arguments"))
	}

	// 参数 0: privateKeyA
	privateKeyHex := call.Argument(0).String()
	privateKey, err := HexToPrivateKey(privateKeyHex)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid private key: %w", err)))
	}

	// 参数 1: publicKeyB
	publicKeyHex := call.Argument(1).String()
	publicKey, err := HexToPublicKey(publicKeyHex)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid public key: %w", err)))
	}

	// 计算共享密钥 S = d_A * P_B
	// nolint:staticcheck // SM2 ECDH 需要使用底层 API（非标准 NIST 曲线）
	x, _ := publicKey.ScalarMult(publicKey.X, publicKey.Y, privateKey.D.Bytes())

	// 将 x 坐标转换为 32 字节的 Uint8Array（匹配 Node.js sm-crypto-v2 行为）
	xBytes := make([]byte, 32)
	xBytesRaw := x.Bytes()
	copy(xBytes[32-len(xBytesRaw):], xBytesRaw)

	return CreateUint8Array(runtime, xBytes)
}

// GetPoint 获取 SM2 曲线基点（包含完整的点信息和密钥对）
// 对应 JS: sm2.getPoint()
// 返回: { x: string, y: string, k: string, x1: string, privateKey: string, publicKey: string }
func GetPoint(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	params := sm2.P256().Params()

	// 生成一个临时密钥对用于填充 k, x1, privateKey, publicKey 字段
	// 这匹配 Node.js sm-crypto-v2 的行为
	keypair, err := sm2.GenerateKey(rand.Reader)
	if err != nil {
		// 如果生成失败，使用固定值（理论上不会发生）
		panic(runtime.NewGoError(fmt.Errorf("failed to generate keypair for getPoint: %w", err)))
	}

	obj := runtime.NewObject()
	// 基点坐标
	obj.Set("x", runtime.ToValue(LeftPad(params.Gx.Text(16), 64)))
	obj.Set("y", runtime.ToValue(LeftPad(params.Gy.Text(16), 64)))
	// 密钥对相关字段（匹配 Node.js 版本）
	obj.Set("k", runtime.ToValue(LeftPad(keypair.D.Text(16), 64)))
	obj.Set("x1", runtime.ToValue(LeftPad(keypair.PublicKey.X.Text(16), 64)))
	obj.Set("privateKey", runtime.ToValue(LeftPad(keypair.D.Text(16), 64)))
	obj.Set("publicKey", runtime.ToValue(PublicKeyToHex(&keypair.PublicKey, false)))

	return obj
}

// PrecomputePublicKey 预计算公钥点（性能优化）
// 对应 JS: sm2.precomputePublicKey(publicKey)
// 注: 当前实现直接返回公钥对象，Go 版本不需要预计算优化
// 返回: { x: string (十六进制), y: string (十六进制) }
func PrecomputePublicKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("precomputePublicKey requires 1 argument"))
	}

	publicKeyHex := call.Argument(0).String()
	publicKey, err := HexToPublicKey(publicKeyHex)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid public key: %w", err)))
	}

	// 返回公钥点对象（转换为字符串以便 JSON 序列化）
	obj := runtime.NewObject()
	obj.Set("x", runtime.ToValue(LeftPad(publicKey.X.Text(16), 64)))
	obj.Set("y", runtime.ToValue(LeftPad(publicKey.Y.Text(16), 64)))

	return obj
}

// CalculateSharedKey SM2 密钥协商（完整实现）
// 对应 JS: sm2.calculateSharedKey(keypairA, ephemeralKeypairA, publicKeyB, ephemeralPublicKeyB, sharedKeyLength, isRecipient?, idA?, idB?)
//
// 参数:
//   - keypairA: { publicKey, privateKey } - A 的静态密钥对
//   - ephemeralKeypairA: { publicKey, privateKey } - A 的临时密钥对
//   - publicKeyB: string - B 的静态公钥
//   - ephemeralPublicKeyB: string - B 的临时公钥
//   - sharedKeyLength: number - 共享密钥长度
//   - isRecipient: boolean (可选，默认 false) - 是否为接收方
//   - idA: string (可选，默认 "1234567812345678") - A 的用户 ID
//   - idB: string (可选，默认 "1234567812345678") - B 的用户 ID
//
// 返回: Uint8Array - 共享密钥
func CalculateSharedKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {

	if len(call.Arguments) < 5 {
		panic(runtime.NewTypeError("calculateSharedKey requires at least 5 arguments"))
	}

	// 参数 0: keypairA { publicKey, privateKey }
	keypairA := call.Argument(0).ToObject(runtime)
	if keypairA == nil {
		panic(runtime.NewTypeError("keypairA must be an object"))
	}
	pubKeyAVal := keypairA.Get("publicKey")
	privKeyAVal := keypairA.Get("privateKey")
	if goja.IsUndefined(pubKeyAVal) || goja.IsUndefined(privKeyAVal) {
		panic(runtime.NewTypeError("keypairA must have publicKey and privateKey"))
	}
	publicKeyA := pubKeyAVal.String()
	privateKeyA := privKeyAVal.String()

	// 参数 1: ephemeralKeypairA { publicKey, privateKey }
	ephemeralKeypairA := call.Argument(1).ToObject(runtime)
	if ephemeralKeypairA == nil {
		panic(runtime.NewTypeError("ephemeralKeypairA must be an object"))
	}
	ephPubAVal := ephemeralKeypairA.Get("publicKey")
	ephPrivAVal := ephemeralKeypairA.Get("privateKey")
	if goja.IsUndefined(ephPubAVal) || goja.IsUndefined(ephPrivAVal) {
		panic(runtime.NewTypeError("ephemeralKeypairA must have publicKey and privateKey"))
	}
	ephemeralPublicKeyA := ephPubAVal.String()
	ephemeralPrivateKeyA := ephPrivAVal.String()

	// 参数 2: publicKeyB
	publicKeyB := call.Argument(2).String()
	if publicKeyB == "" {
		panic(runtime.NewTypeError("publicKeyB must be a non-empty hex string"))
	}

	// 参数 3: ephemeralPublicKeyB
	ephemeralPublicKeyB := call.Argument(3).String()
	if ephemeralPublicKeyB == "" {
		panic(runtime.NewTypeError("ephemeralPublicKeyB must be a non-empty hex string"))
	}

	// 参数 4: sharedKeyLength
	sharedKeyLength := int(call.Argument(4).ToInteger())
	if sharedKeyLength <= 0 {
		panic(runtime.NewTypeError("sharedKeyLength must be > 0"))
	}

	// 参数 5: isRecipient (可选，默认 false)
	isRecipient := false
	if len(call.Arguments) > 5 && !goja.IsUndefined(call.Argument(5)) {
		isRecipient = call.Argument(5).ToBoolean()
	}

	// 参数 6: idA (可选，默认 "1234567812345678")
	idA := "1234567812345678"
	if len(call.Arguments) > 6 && !goja.IsUndefined(call.Argument(6)) {
		idA = call.Argument(6).String()
	}

	// 参数 7: idB (可选，默认 "1234567812345678")
	idB := "1234567812345678"
	if len(call.Arguments) > 7 && !goja.IsUndefined(call.Argument(7)) {
		idB = call.Argument(7).String()
	}

	// 执行密钥协商
	sharedKey, err := calculateSharedKeyCore(
		publicKeyA, privateKeyA,
		ephemeralPublicKeyA, ephemeralPrivateKeyA,
		publicKeyB, ephemeralPublicKeyB,
		sharedKeyLength, isRecipient,
		[]byte(idA), []byte(idB),
	)

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("key exchange failed: %w", err)))
	}

	return CreateUint8Array(runtime, sharedKey)
}

// calculateSharedKeyCore SM2 密钥协商核心算法
// 实现 GM/T 0003.3-2012 SM2 密钥交换协议
func calculateSharedKeyCore(
	publicKeyA, privateKeyA string,
	ephemeralPublicKeyA, ephemeralPrivateKeyA string,
	publicKeyB, ephemeralPublicKeyB string,
	sharedKeyLength int, isRecipient bool,
	idA, idB []byte,
) ([]byte, error) {

	// 解析密钥
	pubA, err := HexToPublicKey(publicKeyA)
	if err != nil {
		return nil, fmt.Errorf("invalid publicKeyA: %w", err)
	}

	privA, err := HexToPrivateKey(privateKeyA)
	if err != nil {
		return nil, fmt.Errorf("invalid privateKeyA: %w", err)
	}

	ephPubA, err := HexToPublicKey(ephemeralPublicKeyA)
	if err != nil {
		return nil, fmt.Errorf("invalid ephemeralPublicKeyA: %w", err)
	}

	ephPrivA, err := HexToPrivateKey(ephemeralPrivateKeyA)
	if err != nil {
		return nil, fmt.Errorf("invalid ephemeralPrivateKeyA: %w", err)
	}

	pubB, err := HexToPublicKey(publicKeyB)
	if err != nil {
		return nil, fmt.Errorf("invalid publicKeyB: %w", err)
	}

	ephPubB, err := HexToPublicKey(ephemeralPublicKeyB)
	if err != nil {
		return nil, fmt.Errorf("invalid ephemeralPublicKeyB: %w", err)
	}

	if pubA == nil || pubB == nil || ephPubA == nil || ephPubB == nil || privA == nil || ephPrivA == nil {
		return nil, fmt.Errorf("nil key encountered after parsing")
	}

	if pubA.X == nil || pubA.Y == nil || pubB.X == nil || pubB.Y == nil || ephPubA.X == nil || ephPubA.Y == nil || ephPubB.X == nil || ephPubB.Y == nil {
		return nil, fmt.Errorf("nil point coordinate encountered")
	}

	// 计算 ZA 和 ZB
	zA, err := calculateZA(pubA, idA)
	if err != nil {
		return nil, err
	}

	zB, err := calculateZA(pubB, idB)
	if err != nil {
		return nil, err
	}

	// 如果是接收方，交换 ZA 和 ZB
	if isRecipient {
		zA, zB = zB, zA
	}

	// 计算共享密钥
	// 1. 计算 x1_ = 2^w + (x1 & (2^w - 1))
	//    其中 w = 127 (SM2 曲线的参数)
	wPow2 := new(big.Int)
	wPow2.SetString("80000000000000000000000000000000", 16) // 2^127

	wPow2Sub1 := new(big.Int)
	wPow2Sub1.SetString("7fffffffffffffffffffffffffffffff", 16) // 2^127 - 1

	x1 := ephPubA.X
	x1_ := new(big.Int).And(x1, wPow2Sub1)
	x1_.Add(x1_, wPow2)

	// 2. 计算 tA = (dA + x1_ * rA) mod n
	curve := sm2.P256()
	n := curve.Params().N

	tA := new(big.Int).Mul(x1_, ephPrivA.D)
	tA.Add(tA, privA.D)
	tA.Mod(tA, n)

	if tA.Sign() == 0 {
		return nil, fmt.Errorf("tA is zero")
	}

	// 3. 计算 x2_ = 2^w + (x2 & (2^w - 1))
	x2 := ephPubB.X
	x2_ := new(big.Int).And(x2, wPow2Sub1)
	x2_.Add(x2_, wPow2)

	// 4. 计算 U = [tA]([x2_]RB + PB)
	// 注意：JavaScript 版本是 RB.multiply(x2_).add(PB).multiply(tA)
	// 即 U = tA * (x2_ * RB + PB)

	// 注意：以下使用 curve.ScalarMult 和 curve.Add 是必要的
	// 原因：SM2 是国密算法（非标准 NIST 曲线），crypto/ecdh 不支持
	// gmsm 库本身也使用这些 API，这是实现 SM2 的标准方式
	// 参考：GM/T 0003.3-2012 SM2 密钥交换协议

	// nolint:staticcheck // SM2 国密算法需要使用底层 API
	// 计算 x2_ * RB (不是 x2_ * PB!)
	x2RB_x, x2RB_y := curve.ScalarMult(ephPubB.X, ephPubB.Y, x2_.Bytes())

	if x2RB_x == nil || x2RB_y == nil {
		return nil, fmt.Errorf("ScalarMult returned nil (x2_*RB)")
	}

	// nolint:staticcheck // SM2 国密算法需要使用底层 API
	// 计算 [x2_]RB + PB
	sumX, sumY := curve.Add(x2RB_x, x2RB_y, pubB.X, pubB.Y)
	if sumX == nil || sumY == nil {
		return nil, fmt.Errorf("add returned nil (x2_*RB + PB)")
	}

	// nolint:staticcheck // SM2 国密算法需要使用底层 API
	// 计算 tA * ([x2_]RB + PB)
	uX, uY := curve.ScalarMult(sumX, sumY, tA.Bytes())
	if uX == nil || uY == nil {
		return nil, fmt.Errorf("ScalarMult returned nil (tA * (...))")
	}

	// 5. 转换为字节数组（32 字节，左填充 0）
	xuBytes := make([]byte, 32)
	yuBytes := make([]byte, 32)

	uXBytes := uX.Bytes()
	uYBytes := uY.Bytes()

	// 将坐标值复制到右对齐的 32 字节数组中
	copy(xuBytes[32-len(uXBytes):], uXBytes)
	copy(yuBytes[32-len(uYBytes):], uYBytes)

	// 6. 使用 KDF 派生共享密钥
	// KA = KDF(xU || yU || ZA || ZB, klen)
	kdfInput := make([]byte, 0, len(xuBytes)+len(yuBytes)+len(zA)+len(zB))
	kdfInput = append(kdfInput, xuBytes...)
	kdfInput = append(kdfInput, yuBytes...)
	kdfInput = append(kdfInput, zA...)
	kdfInput = append(kdfInput, zB...)

	sharedKey := kdfCore(kdfInput, sharedKeyLength, nil)

	if len(sharedKey) == 0 {
		return nil, fmt.Errorf("KDF produced empty key")
	}

	return sharedKey, nil
}

// ============================================================================
// 🔧 内部辅助函数
// ============================================================================

// calculateZA 计算 ZA 值（用户身份标识）
// ZA = SM3(ENTLA || IDA || a || b || xG || yG || xA || yA)
func calculateZA(publicKey *ecdsa.PublicKey, userID []byte) ([]byte, error) {
	za, err := sm2.CalculateZA(publicKey, userID)
	if err != nil {
		return nil, err
	}
	return za, nil
}
