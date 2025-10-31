package sm_crypto

import (
	"bytes"
	"crypto/cipher"
	"errors"
	"fmt"

	"github.com/dop251/goja"
	"github.com/emmansun/gmsm/sm4"
)

// ============================================================================
// 🔐 SM4 对称加密
// ============================================================================

const (
	SM4_ENCRYPT    = 1
	SM4_DECRYPT    = 0
	SM4_BLOCK_SIZE = 16
)

// SM4Core SM4 核心加密/解密函数
// 对应 JS: sm4(inArray, key, cryptFlag, options?)
//
// 参数:
//   - inArray: string | Uint8Array - 输入数据
//   - key: string | Uint8Array - 密钥（128 位 = 16 字节 = 32 字符十六进制）
//   - cryptFlag: number - 0=解密, 1=加密
//   - options: SM4Options - 可选参数
//
// 返回: string | Uint8Array | { output: string, tag: string } - 输出数据
func SM4Core(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("sm4 requires at least 3 arguments"))
	}

	// 参数 0: inArray (string | Uint8Array)
	var inArray []byte
	var err error

	// 参数 2: cryptFlag (0=解密, 1=加密)
	cryptFlag := int(call.Argument(2).ToInteger())

	inVal := call.Argument(0)
	if inVal.ExportType().Kind().String() == "string" { // 字符串类型
		inputStr := inVal.String()
		if cryptFlag == SM4_DECRYPT {
			// 解密时，字符串被视为十六进制
			inArray, err = HexToBytes(inputStr)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("invalid hex input for decryption: %w", err)))
			}
		} else {
			// 加密时，字符串被视为 UTF-8
			inArray = Utf8ToBytes(inputStr)
		}
	} else {
		// Uint8Array 类型
		inArray, err = ExportUint8Array(inVal, runtime)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("invalid input array: %w", err)))
		}
	}

	// 参数 1: key (string | Uint8Array)
	key, err := ParseHexOrBytes(call.Argument(1), runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid key: %w", err)))
	}

	if len(key) != 16 {
		panic(runtime.NewTypeError("key must be 128 bits (16 bytes)"))
	}

	// 参数 3: options
	opts := ParseOptions(call, 3, runtime)

	// 获取选项（带默认值）
	padding := GetStringOption(opts, "padding", "pkcs#7")
	// 规范化 padding 名称（pkcs7 -> pkcs#7）
	if padding == "pkcs7" {
		padding = "pkcs#7"
	} else if padding == "pkcs5" {
		padding = "pkcs#5"
	}

	mode := GetStringOption(opts, "mode", "ecb")
	output := GetStringOption(opts, "output", "string")

	// GCM 模式
	if mode == "gcm" {
		return sm4GCM(runtime, inArray, key, cryptFlag, opts, output)
	}

	// CBC 模式
	if mode == "cbc" {
		var iv []byte
		var err error
		if opts != nil {
			iv, err = GetBytesOption(opts, "iv", runtime)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("invalid iv: %w", err)))
			}
		}
		if iv == nil {
			iv = make([]byte, SM4_BLOCK_SIZE)
		}
		if len(iv) != SM4_BLOCK_SIZE {
			panic(runtime.NewTypeError("iv must be 128 bits (16 bytes)"))
		}
		return sm4CBC(runtime, inArray, key, iv, cryptFlag, padding, output)
	}

	// CTR/CFB/OFB 模式（流密码模式）
	if mode == "ctr" || mode == "cfb" || mode == "ofb" {
		var iv []byte
		var err error
		if opts != nil {
			iv, err = GetBytesOption(opts, "iv", runtime)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("invalid iv: %w", err)))
			}
		}
		if iv == nil {
			iv = make([]byte, SM4_BLOCK_SIZE)
		}
		if len(iv) != SM4_BLOCK_SIZE {
			panic(runtime.NewTypeError("iv must be 128 bits (16 bytes)"))
		}
		return sm4Stream(runtime, inArray, key, iv, cryptFlag, mode, output)
	}

	// ECB 模式（默认）
	return sm4ECB(runtime, inArray, key, cryptFlag, padding, output)
}

// SM4Encrypt SM4 加密（简化接口）
// 对应 JS: sm4.encrypt(inArray, key, options?)
func SM4Encrypt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	// 构造参数：[inArray, key, SM4_ENCRYPT, options]
	newArgs := make([]goja.Value, 0, 4)

	// 添加前两个参数
	for i := 0; i < 2 && i < len(call.Arguments); i++ {
		newArgs = append(newArgs, call.Arguments[i])
	}

	// 添加 cryptFlag
	newArgs = append(newArgs, runtime.ToValue(SM4_ENCRYPT))

	// 添加 options（如果有）
	if len(call.Arguments) > 2 {
		newArgs = append(newArgs, call.Arguments[2])
	}

	return SM4Core(goja.FunctionCall{
		This:      call.This,
		Arguments: newArgs,
	}, runtime)
}

// SM4Decrypt SM4 解密（简化接口）
// 对应 JS: sm4.decrypt(inArray, key, options?)
func SM4Decrypt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	// 构造参数：[inArray, key, SM4_DECRYPT, options]
	newArgs := make([]goja.Value, 0, 4)

	// 添加前两个参数
	for i := 0; i < 2 && i < len(call.Arguments); i++ {
		newArgs = append(newArgs, call.Arguments[i])
	}

	// 添加 cryptFlag
	newArgs = append(newArgs, runtime.ToValue(SM4_DECRYPT))

	// 添加 options（如果有）
	if len(call.Arguments) > 2 {
		newArgs = append(newArgs, call.Arguments[2])
	}

	return SM4Core(goja.FunctionCall{
		This:      call.This,
		Arguments: newArgs,
	}, runtime)
}

// ============================================================================
// 🔧 SM4 ECB 模式
// ============================================================================

func sm4ECB(runtime *goja.Runtime, inArray []byte, key []byte, cryptFlag int, padding string, output string) goja.Value {
	block, err := sm4.NewCipher(key)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to create cipher: %w", err)))
	}

	var outArray []byte

	// 🔥 兼容 sm-crypto-v2 行为：array 模式下的特殊 padding 逻辑
	// - 如果输入长度是块的倍数：不添加/不移除 padding
	// - 如果输入长度不是块的倍数：添加/移除 padding（与 string 模式相同）
	isArrayMode := (output == "array")
	isBlockAligned := (len(inArray)%SM4_BLOCK_SIZE == 0)

	if cryptFlag == SM4_ENCRYPT {
		// array 模式且输入已对齐块：不添加 padding
		// 其他情况：添加 padding
		if !(isArrayMode && isBlockAligned) {
			inArray = applyPadding(inArray, padding, SM4_BLOCK_SIZE)
		}

		// 确保长度是块大小的倍数
		if len(inArray)%SM4_BLOCK_SIZE != 0 {
			panic(runtime.NewTypeError("input length must be multiple of block size after padding"))
		}

		outArray = make([]byte, len(inArray))
		for i := 0; i < len(inArray); i += SM4_BLOCK_SIZE {
			block.Encrypt(outArray[i:i+SM4_BLOCK_SIZE], inArray[i:i+SM4_BLOCK_SIZE])
		}
	} else {
		// 解密：先解密，再根据 padding 情况决定是否去除
		if len(inArray)%SM4_BLOCK_SIZE != 0 {
			panic(runtime.NewTypeError(fmt.Sprintf("encrypted data length %d is not multiple of block size %d", len(inArray), SM4_BLOCK_SIZE)))
		}

		outArray = make([]byte, len(inArray))
		for i := 0; i < len(inArray); i += SM4_BLOCK_SIZE {
			block.Decrypt(outArray[i:i+SM4_BLOCK_SIZE], inArray[i:i+SM4_BLOCK_SIZE])
		}

		// 🔥 兼容 sm-crypto-v2：解密时总是尝试移除 padding
		// 如果移除失败（说明没有有效的 padding），则保持原样
		// 这与标准 PKCS#7 不同，但匹配 Node.js 库的行为
		if isArrayMode {
			// array 模式：尝试移除 padding，失败则忽略错误
			trimmed, err := removePadding(outArray, padding, SM4_BLOCK_SIZE)
			if err == nil {
				outArray = trimmed
			}
			// 如果出错，保持 outArray 不变（不移除 padding）
		} else {
			// string 模式：必须成功移除 padding
			outArray, err = removePadding(outArray, padding, SM4_BLOCK_SIZE)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("invalid padding: %w", err)))
			}
		}
	}

	// 返回结果
	return formatOutput(runtime, outArray, cryptFlag, output)
}

// ============================================================================
// 🔧 SM4 CBC 模式
// ============================================================================

func sm4CBC(runtime *goja.Runtime, inArray []byte, key []byte, iv []byte, cryptFlag int, padding string, output string) goja.Value {
	block, err := sm4.NewCipher(key)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to create cipher: %w", err)))
	}

	var outArray []byte

	// 🔥 兼容 sm-crypto-v2 行为：array 模式下的特殊 padding 逻辑
	// - 如果输入长度是块的倍数：不添加/不移除 padding
	// - 如果输入长度不是块的倍数：添加/移除 padding（与 string 模式相同）
	isArrayMode := (output == "array")
	isBlockAligned := (len(inArray)%SM4_BLOCK_SIZE == 0)

	if cryptFlag == SM4_ENCRYPT {
		// array 模式且输入已对齐块：不添加 padding
		// 其他情况：添加 padding
		if !(isArrayMode && isBlockAligned) {
			inArray = applyPadding(inArray, padding, SM4_BLOCK_SIZE)
		}

		// 确保长度是块大小的倍数
		if len(inArray)%SM4_BLOCK_SIZE != 0 {
			panic(runtime.NewTypeError("input length must be multiple of block size after padding"))
		}

		outArray = make([]byte, len(inArray))
		mode := cipher.NewCBCEncrypter(block, iv)
		mode.CryptBlocks(outArray, inArray)
	} else {
		// 解密：先解密，再根据 padding 情况决定是否去除
		if len(inArray)%SM4_BLOCK_SIZE != 0 {
			panic(runtime.NewTypeError("encrypted data length must be multiple of block size"))
		}

		outArray = make([]byte, len(inArray))
		mode := cipher.NewCBCDecrypter(block, iv)
		mode.CryptBlocks(outArray, inArray)

		// 🔥 兼容 sm-crypto-v2：解密时总是尝试移除 padding
		// 如果移除失败（说明没有有效的 padding），则保持原样
		if isArrayMode {
			// array 模式：尝试移除 padding，失败则忽略错误
			trimmed, err := removePadding(outArray, padding, SM4_BLOCK_SIZE)
			if err == nil {
				outArray = trimmed
			}
			// 如果出错，保持 outArray 不变（不移除 padding）
		} else {
			// string 模式：必须成功移除 padding
			outArray, err = removePadding(outArray, padding, SM4_BLOCK_SIZE)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("invalid padding: %w", err)))
			}
		}
	}

	// 返回结果
	return formatOutput(runtime, outArray, cryptFlag, output)
}

// ============================================================================
// 🔧 SM4 流密码模式（CTR/CFB/OFB）
// ============================================================================

func sm4Stream(runtime *goja.Runtime, inArray []byte, key []byte, iv []byte, cryptFlag int, mode string, output string) goja.Value {
	block, err := sm4.NewCipher(key)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to create cipher: %w", err)))
	}

	outArray := make([]byte, len(inArray))

	var stream cipher.Stream
	switch mode {
	case "ctr":
		stream = cipher.NewCTR(block, iv)
	case "cfb":
		// CFB 模式加密和解密使用不同的 stream
		if cryptFlag == SM4_ENCRYPT {
			stream = cipher.NewCFBEncrypter(block, iv)
		} else {
			stream = cipher.NewCFBDecrypter(block, iv)
		}
	case "ofb":
		stream = cipher.NewOFB(block, iv)
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("unsupported stream mode: %s", mode)))
	}

	// 流密码模式下执行 XOR 操作
	stream.XORKeyStream(outArray, inArray)

	// 返回结果（流密码模式不需要 padding）
	return formatOutput(runtime, outArray, cryptFlag, output)
}

// ============================================================================
// 🔧 SM4 GCM 模式
// ============================================================================

func sm4GCM(runtime *goja.Runtime, inArray []byte, key []byte, cryptFlag int, opts *goja.Object, output string) goja.Value {
	block, err := sm4.NewCipher(key)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to create cipher: %w", err)))
	}

	// 获取 IV
	iv, err := GetBytesOption(opts, "iv", runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid iv: %w", err)))
	}
	if iv == nil {
		iv = make([]byte, 12) // GCM 默认 12 字节 IV
	}

	// 创建 GCM 模式
	// cipher.NewGCM 只支持 12 字节 IV，对于其他长度需要用 NewGCMWithNonceSize
	var aead cipher.AEAD
	if len(iv) == 12 {
		aead, err = cipher.NewGCM(block)
	} else {
		aead, err = cipher.NewGCMWithNonceSize(block, len(iv))
	}
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to create GCM: %w", err)))
	}

	// 获取附加认证数据 (AAD)
	aad, _ := GetBytesOption(opts, "associatedData", runtime)
	if aad == nil {
		aad = []byte{}
	}

	outputTag := GetBoolOption(opts, "outputTag", false)

	if cryptFlag == SM4_ENCRYPT {
		// GCM 加密
		ciphertext := aead.Seal(nil, iv, inArray, aad)

		// GCM 的输出格式: ciphertext || tag (tag 在最后 16 字节)
		tagSize := aead.Overhead()
		actualCiphertext := ciphertext[:len(ciphertext)-tagSize]
		tag := ciphertext[len(ciphertext)-tagSize:]

		if output == "array" {
			if outputTag {
				result := runtime.NewObject()
				result.Set("output", CreateUint8Array(runtime, actualCiphertext))
				result.Set("tag", CreateUint8Array(runtime, tag))
				return result
			}
			return CreateUint8Array(runtime, actualCiphertext)
		}

		// 字符串输出
		result := runtime.NewObject()
		result.Set("output", runtime.ToValue(BytesToHex(actualCiphertext)))
		result.Set("tag", runtime.ToValue(BytesToHex(tag)))
		return result
	}

	// GCM 解密
	tagVal, _ := GetBytesOption(opts, "tag", runtime)
	if tagVal == nil {
		panic(runtime.NewTypeError("GCM decryption requires a tag"))
	}

	// 组合 ciphertext + tag
	ciphertext := append(inArray, tagVal...)

	plaintext, err := aead.Open(nil, iv, ciphertext, aad)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("authentication tag mismatch")))
	}

	// 返回结果
	if output == "array" {
		return CreateUint8Array(runtime, plaintext)
	}
	return runtime.ToValue(BytesToUtf8(plaintext))
}

// ============================================================================
// 🔧 Padding 辅助函数
// ============================================================================

// applyPadding 根据 padding 类型应用填充
func applyPadding(data []byte, padding string, blockSize int) []byte {
	if padding == "pkcs#5" || padding == "pkcs#7" {
		return pkcs7Pad(data, blockSize)
	} else if padding == "zero" {
		return zeroPad(data, blockSize)
	}
	return data
}

// removePadding 根据 padding 类型移除填充
func removePadding(data []byte, padding string, blockSize int) ([]byte, error) {
	if padding == "pkcs#5" || padding == "pkcs#7" {
		return pkcs7Unpad(data, blockSize)
	} else if padding == "zero" {
		return zeroUnpad(data), nil
	}
	return data, nil
}

// ============================================================================
// 🔧 PKCS#7 Padding
// ============================================================================

// pkcs7Pad 添加 PKCS#7 填充
func pkcs7Pad(data []byte, blockSize int) []byte {
	padding := blockSize - (len(data) % blockSize)
	padText := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(data, padText...)
}

// pkcs7Unpad 移除 PKCS#7 填充
func pkcs7Unpad(data []byte, blockSize int) ([]byte, error) {
	length := len(data)
	if length == 0 {
		return nil, errors.New("invalid padding: empty data")
	}

	if length%blockSize != 0 {
		return nil, fmt.Errorf("invalid padding: data length %d is not multiple of block size %d", length, blockSize)
	}

	// 获取 padding 值（最后一个字节）
	paddingValue := int(data[length-1])

	if paddingValue > blockSize || paddingValue == 0 {
		return nil, fmt.Errorf("invalid padding size: %d (must be 1-%d)", paddingValue, blockSize)
	}

	if paddingValue > length {
		return nil, fmt.Errorf("invalid padding: padding size %d > data length %d", paddingValue, length)
	}

	// 验证所有 padding 字节都等于 paddingValue
	for i := 0; i < paddingValue; i++ {
		pos := length - 1 - i
		if data[pos] != byte(paddingValue) {
			return nil, fmt.Errorf("invalid padding: byte at position %d is %d, expected %d", pos, data[pos], paddingValue)
		}
	}

	return data[:length-paddingValue], nil
}

// zeroPad 添加 zero 填充
func zeroPad(data []byte, blockSize int) []byte {
	padding := blockSize - (len(data) % blockSize)
	if padding == blockSize {
		return data // 已经是块大小的倍数
	}
	padText := make([]byte, padding)
	return append(data, padText...)
}

// zeroUnpad 移除 zero 填充（从尾部移除所有 0）
func zeroUnpad(data []byte) []byte {
	// 从尾部开始移除连续的 0
	length := len(data)
	for length > 0 && data[length-1] == 0 {
		length--
	}
	return data[:length]
}

// ============================================================================
// 🔧 输出格式化
// ============================================================================

func formatOutput(runtime *goja.Runtime, data []byte, cryptFlag int, output string) goja.Value {
	if output == "array" {
		return CreateUint8Array(runtime, data)
	}

	if cryptFlag == SM4_ENCRYPT {
		// 加密输出十六进制
		return runtime.ToValue(BytesToHex(data))
	}

	// 解密输出 UTF-8 字符串
	return runtime.ToValue(BytesToUtf8(data))
}
