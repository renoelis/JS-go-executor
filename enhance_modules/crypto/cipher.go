//go:build cgo

package crypto

import (
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/dop251/goja"
)

// CreateCipher 实现 Node.js 的 crypto.createCipher(algorithm, password[, options])
//
// 注意：该 API 已在 Node.js 中标记为弃用，但这里仍然按照其历史行为实现：
// - 基于 OpenSSL EVP_BytesToKey，使用 MD5、一次迭代、无盐
// - password 可以是 string 或 Buffer
func CreateCipher(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("createCipher 需要 algorithm 和 password 参数"))
	}

	algorithmVal := call.Arguments[0]
	passwordVal := call.Arguments[1]

	algorithm := strings.ToLower(SafeGetString(algorithmVal))
	if algorithm == "" {
		panic(runtime.NewTypeError("The \"algorithm\" argument must be of type string"))
	}

	// password 按 Node 语义处理：string/Buffer 都视为字节序列
	passwordBytes, err := ConvertToBytes(runtime, passwordVal)
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"password\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. %v", err)))
	}

	// 无盐、一次迭代
	key, iv, err := BytesToKey(algorithm, passwordBytes, nil, 1)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	authTagLen := 16
	if len(call.Arguments) >= 3 {
		if optObj, ok := call.Arguments[2].(*goja.Object); ok && optObj != nil {
			if v := optObj.Get("authTagLength"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				if n := v.ToInteger(); n > 0 {
					authTagLen = int(n)
				}
			}
		}
	}

	ctx, err := NewCipherCtxByName(algorithm, key, iv, true)
	if err != nil {
		// 与 Node.js 行为对齐：未知算法时抛出 ERR_CRYPTO_UNKNOWN_CIPHER
		if strings.Contains(strings.ToLower(err.Error()), "unknown cipher") {
			panic(NewNodeError(runtime, "ERR_CRYPTO_UNKNOWN_CIPHER", err.Error()))
		}
		panic(runtime.NewGoError(err))
	}

	return createCipherObject(runtime, ctx, algorithm, true, authTagLen)
}

// CreateDecipher 实现 Node.js 的 crypto.createDecipher(algorithm, password[, options])
func CreateDecipher(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("createDecipher 需要 algorithm 和 password 参数"))
	}

	algorithmVal := call.Arguments[0]
	passwordVal := call.Arguments[1]

	algorithm := strings.ToLower(SafeGetString(algorithmVal))
	if algorithm == "" {
		panic(runtime.NewTypeError("The \"algorithm\" argument must be of type string"))
	}

	passwordBytes, err := ConvertToBytes(runtime, passwordVal)
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"password\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. %v", err)))
	}

	key, iv, err := BytesToKey(algorithm, passwordBytes, nil, 1)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	authTagLen := 16
	if len(call.Arguments) >= 3 {
		if optObj, ok := call.Arguments[2].(*goja.Object); ok && optObj != nil {
			if v := optObj.Get("authTagLength"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				if n := v.ToInteger(); n > 0 {
					authTagLen = int(n)
				}
			}
		}
	}

	ctx, err := NewCipherCtxByName(algorithm, key, iv, false)
	if err != nil {
		// 与 Node.js 行为对齐：未知算法时抛出 ERR_CRYPTO_UNKNOWN_CIPHER
		if strings.Contains(strings.ToLower(err.Error()), "unknown cipher") {
			panic(NewNodeError(runtime, "ERR_CRYPTO_UNKNOWN_CIPHER", err.Error()))
		}
		panic(runtime.NewGoError(err))
	}

	return createCipherObject(runtime, ctx, algorithm, false, authTagLen)
}

// CreateCipheriv 实现 Node.js 的 crypto.createCipheriv(algorithm, key, iv[, options])
// 目前基于 OpenSSL EVP，通过 CipherCtx 封装实现
func CreateCipheriv(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("createCipheriv 需要 algorithm, key, iv 参数"))
	}

	algorithmVal := call.Arguments[0]
	keyVal := call.Arguments[1]
	ivVal := call.Arguments[2]

	algorithm := strings.ToLower(SafeGetString(algorithmVal))
	if algorithm == "" {
		panic(runtime.NewTypeError("The \"algorithm\" argument must be of type string"))
	}

	key, err := ConvertToBytes(runtime, keyVal)
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"key\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. %v", err)))
	}

	keyLenInfo, ivLenInfo, _, _, errInfo := getCipherBasicInfo(algorithm)
	if errInfo != nil {
		panic(runtime.NewGoError(errInfo))
	}

	// 若 keyLen 和 ivLen 都为 0，说明 OpenSSL 中不存在该 cipher
	// 与 Node.js 行为对齐：此时应抛出 ERR_CRYPTO_UNKNOWN_CIPHER，而不是做 IV 长度等校验
	if keyLenInfo == 0 && ivLenInfo == 0 {
		panic(NewNodeError(runtime, "ERR_CRYPTO_UNKNOWN_CIPHER", fmt.Sprintf("unknown cipher: %s", algorithm)))
	}

	algoLower := strings.ToLower(algorithm)
	isGCM := strings.Contains(algoLower, "gcm")
	isCCM := strings.Contains(algoLower, "ccm")
	isOCB := strings.Contains(algoLower, "ocb")

	if keyLenInfo > 0 && len(key) != keyLenInfo {
		panic(runtime.NewTypeError(fmt.Sprintf("Invalid key length: %d (expected %d)", len(key), keyLenInfo)))
	}

	var iv []byte

	if ivLenInfo == 0 && !isGCM && !isCCM && !isOCB {
		if goja.IsUndefined(ivVal) || goja.IsNull(ivVal) {
			iv = nil
		} else {
			iv, err = ConvertToBytes(runtime, ivVal)
			if err != nil {
				panic(runtime.NewTypeError(fmt.Sprintf("The \"iv\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. %v", err)))
			}
		}
		if len(iv) > 0 {
			panic(runtime.NewTypeError("Invalid IV length"))
		}
	} else {
		if goja.IsUndefined(ivVal) || goja.IsNull(ivVal) {
			panic(runtime.NewTypeError("The \"iv\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
		}
		iv, err = ConvertToBytes(runtime, ivVal)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("The \"iv\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. %v", err)))
		}

		if !isGCM && !isCCM && !isOCB && ivLenInfo > 0 && len(iv) != ivLenInfo {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid IV length: %d (expected %d)", len(iv), ivLenInfo)))
		}
		if (isGCM || isCCM || isOCB) && len(iv) <= 0 {
			panic(runtime.NewTypeError("Invalid IV length"))
		}
	}

	authTagLen := 16
	if len(call.Arguments) >= 4 {
		if optObj, ok := call.Arguments[3].(*goja.Object); ok && optObj != nil {
			if v := optObj.Get("authTagLength"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				// 使用 JavaScript 检查是否是整数
				isInteger, _ := runtime.RunString(`(function(val) { return Number.isInteger(val); })`)
				if checkFunc, ok := goja.AssertFunction(isInteger); ok {
					result, _ := checkFunc(goja.Undefined(), v)
					if result == nil || !result.ToBoolean() {
						panic(runtime.NewTypeError("The \"options.authTagLength\" property must be an integer"))
					}
				}

				n := int(v.ToInteger())
				if n <= 0 {
					panic(runtime.NewTypeError(fmt.Sprintf("Invalid authTagLength: %d", n)))
				}
				if (isGCM || isCCM || isOCB) && (n < 4 || n > 16) {
					panic(runtime.NewTypeError(fmt.Sprintf("Invalid authTagLength: %d", n)))
				}
				authTagLen = n
			}
		}
	}

	ctx, err := NewCipherCtxByName(algorithm, key, iv, true)
	if err != nil {
		// 与 Node.js 行为对齐：未知算法时抛出 ERR_CRYPTO_UNKNOWN_CIPHER
		if strings.Contains(strings.ToLower(err.Error()), "unknown cipher") {
			panic(NewNodeError(runtime, "ERR_CRYPTO_UNKNOWN_CIPHER", err.Error()))
		}
		panic(runtime.NewGoError(err))
	}

	return createCipherObject(runtime, ctx, algorithm, true, authTagLen)
}

// CreateDecipheriv 实现 Node.js 的 crypto.createDecipheriv(algorithm, key, iv[, options])
func CreateDecipheriv(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("createDecipheriv 需要 algorithm, key, iv 参数"))
	}

	algorithmVal := call.Arguments[0]
	keyVal := call.Arguments[1]
	ivVal := call.Arguments[2]

	// 使用 JavaScript 检查 Symbol 类型
	isSymbol, _ := runtime.RunString(`(function(val) { return typeof val === 'symbol'; })`)
	if checkFunc, ok := goja.AssertFunction(isSymbol); ok {
		result, _ := checkFunc(goja.Undefined(), algorithmVal)
		if result != nil && result.ToBoolean() {
			panic(runtime.NewTypeError("The \"algorithm\" argument must be of type string. Received symbol"))
		}
	}

	algorithm := strings.ToLower(SafeGetString(algorithmVal))
	if algorithm == "" {
		panic(runtime.NewTypeError("The \"algorithm\" argument must be of type string"))
	}

	key, err := ConvertToBytes(runtime, keyVal)
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"key\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. %v", err)))
	}

	keyLenInfo, ivLenInfo, _, _, errInfo := getCipherBasicInfo(algorithm)
	if errInfo != nil {
		panic(runtime.NewGoError(errInfo))
	}

	// 若 keyLen 和 ivLen 都为 0，说明 OpenSSL 中不存在该 cipher
	// 与 Node.js 行为对齐：此时应抛出 ERR_CRYPTO_UNKNOWN_CIPHER，而不是做 IV 长度等校验
	if keyLenInfo == 0 && ivLenInfo == 0 {
		panic(NewNodeError(runtime, "ERR_CRYPTO_UNKNOWN_CIPHER", fmt.Sprintf("unknown cipher: %s", algorithm)))
	}

	algoLower := strings.ToLower(algorithm)
	isGCM := strings.Contains(algoLower, "gcm")
	isCCM := strings.Contains(algoLower, "ccm")
	isOCB := strings.Contains(algoLower, "ocb")

	if keyLenInfo > 0 && len(key) != keyLenInfo {
		panic(runtime.NewTypeError(fmt.Sprintf("Invalid key length: %d (expected %d)", len(key), keyLenInfo)))
	}

	var iv []byte

	if ivLenInfo == 0 && !isGCM && !isCCM && !isOCB {
		if goja.IsUndefined(ivVal) || goja.IsNull(ivVal) {
			iv = nil
		} else {
			iv, err = ConvertToBytes(runtime, ivVal)
			if err != nil {
				panic(runtime.NewTypeError(fmt.Sprintf("The \"iv\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. %v", err)))
			}
		}
		if len(iv) > 0 {
			panic(runtime.NewTypeError("Invalid IV length"))
		}
	} else {
		if goja.IsUndefined(ivVal) || goja.IsNull(ivVal) {
			panic(runtime.NewTypeError("The \"iv\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
		}
		iv, err = ConvertToBytes(runtime, ivVal)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("The \"iv\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. %v", err)))
		}

		if !isGCM && !isCCM && !isOCB && ivLenInfo > 0 && len(iv) != ivLenInfo {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid IV length: %d (expected %d)", len(iv), ivLenInfo)))
		}
		if (isGCM || isCCM || isOCB) && len(iv) <= 0 {
			panic(runtime.NewTypeError("Invalid IV length"))
		}
	}

	authTagLen := 16
	if len(call.Arguments) >= 4 {
		if optObj, ok := call.Arguments[3].(*goja.Object); ok && optObj != nil {
			if v := optObj.Get("authTagLength"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				// 使用 JavaScript 检查是否是整数
				isInteger, _ := runtime.RunString(`(function(val) { return Number.isInteger(val); })`)
				if checkFunc, ok := goja.AssertFunction(isInteger); ok {
					result, _ := checkFunc(goja.Undefined(), v)
					if result == nil || !result.ToBoolean() {
						panic(runtime.NewTypeError("The \"options.authTagLength\" property must be an integer"))
					}
				}

				n := int(v.ToInteger())
				if n <= 0 {
					panic(runtime.NewTypeError(fmt.Sprintf("Invalid authTagLength: %d", n)))
				}
				if (isGCM || isCCM || isOCB) && (n < 4 || n > 16) {
					panic(runtime.NewTypeError(fmt.Sprintf("Invalid authTagLength: %d", n)))
				}
				authTagLen = n
			}
		}
	}

	ctx, err := NewCipherCtxByName(algorithm, key, iv, false)
	if err != nil {
		// 与 Node.js 行为对齐：未知算法时抛出 ERR_CRYPTO_UNKNOWN_CIPHER
		if strings.Contains(strings.ToLower(err.Error()), "unknown cipher") {
			panic(NewNodeError(runtime, "ERR_CRYPTO_UNKNOWN_CIPHER", err.Error()))
		}
		panic(runtime.NewGoError(err))
	}

	return createCipherObject(runtime, ctx, algorithm, false, authTagLen)
}

// createCipherObject 创建 Cipher/Decipher JS 对象
func createCipherObject(runtime *goja.Runtime, ctx *CipherCtx, algorithm string, encrypt bool, authTagLen int) goja.Value {
	obj := runtime.NewObject()

	finished := false
	authTagSet := false
	algoLower := strings.ToLower(algorithm)
	isGCM := strings.Contains(algoLower, "gcm")
	isCCM := strings.Contains(algoLower, "ccm")
	isOCB := strings.Contains(algoLower, "ocb")
	isChaCha20Poly1305 := strings.Contains(algoLower, "chacha20-poly1305")

	// CCM 解密路径下，按 Node 行为延迟初始化：
	// - setAAD(data, { plaintextLength }) 只记录数据和长度
	// - setAuthTag(tag) 时按 OpenSSL 要求顺序执行：SetTag -> SetCCMPlaintextLength -> SetAAD
	var ccmPlaintextLen int
	var ccmHavePlaintextLen bool
	var ccmAAD []byte
	var ccmHaveAAD bool
	var ccmParamsApplied bool

	// CCM 解密参数下推函数：确保在解密端按顺序执行
	// SetTag (在 setAuthTag 中完成) -> SetCCMPlaintextLength -> SetAAD
	applyCCMDecryptParams := func() {
		// 仅在 CCM 解密端生效
		if !isCCM || encrypt {
			return
		}
		// 必须先设置过 tag
		if !authTagSet {
			return
		}
		// 已经下推过则不重复执行
		if ccmParamsApplied {
			return
		}
		// 需要至少有明文长度或 AAD 才有意义
		if !ccmHavePlaintextLen && !ccmHaveAAD {
			return
		}
		if ccmHavePlaintextLen {
			if err := ctx.SetCCMPlaintextLength(ccmPlaintextLen); err != nil {
				panic(runtime.NewGoError(err))
			}
		}
		if ccmHaveAAD {
			if err := ctx.SetAAD(ccmAAD); err != nil {
				panic(runtime.NewGoError(err))
			}
		}
		ccmParamsApplied = true
	}

	// CCM 模式下，在加密端和解密端都需要使用 authTagLength 设置标签长度
	// 设置 tag 长度后，需要立即初始化 key/iv（OpenSSL CCM 要求的顺序）
	if strings.Contains(algoLower, "ccm") && authTagLen > 0 {
		if err := ctx.SetCCMTagLength(authTagLen); err != nil {
			panic(runtime.NewGoError(err))
		}
		// CCM 模式：在设置 tag 长度后立即初始化 key/iv
		if err := ctx.EnsureCCMKeyIV(); err != nil {
			panic(runtime.NewGoError(err))
		}
	}

	// update(data[, inputEncoding][, outputEncoding])
	obj.Set("update", func(call goja.FunctionCall) goja.Value {
		if finished {
			panic(runtime.NewTypeError("Cipher is already finalized"))
		}
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("update 需要 data 参数"))
		}

		dataVal := call.Arguments[0]
		var inputEncVal goja.Value
		var outputEncVal goja.Value

		// 参数解析规则：
		// - len==3: data, inputEncoding, outputEncoding
		// - len==2: 如果 data 是字符串，则第二个视为 inputEncoding；否则视为 outputEncoding
		if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			if len(call.Arguments) >= 3 && !goja.IsUndefined(call.Arguments[2]) && !goja.IsNull(call.Arguments[2]) {
				inputEncVal = call.Arguments[1]
				outputEncVal = call.Arguments[2]
			} else {
				if _, isString := dataVal.Export().(string); isString {
					inputEncVal = call.Arguments[1]
				} else {
					outputEncVal = call.Arguments[1]
				}
			}
		}

		// 计算输入字节
		var inBytes []byte
		var err error
		if inputEncVal != nil {
			// Cipher/Decipher 的输入编码需要在无效编码时抛错，与 Node.js 行为对齐
			inBytes = parseCipherDataWithEncoding(runtime, dataVal, inputEncVal)
		} else {
			inBytes, err = ConvertToBytesStrict(runtime, dataVal)
			if err != nil {
				panic(runtime.NewTypeError(fmt.Sprintf("data 参数类型错误: %v", err)))
			}
		}

		out, err := ctx.Update(inBytes)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if outputEncVal != nil {
			enc := strings.ToLower(outputEncVal.String())
			switch enc {
			case "hex", "base64", "base64url", "latin1", "binary", "utf8", "utf-8", "ascii", "utf16le", "ucs2", "ucs-2":
				// 合法编码
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("Invalid output encoding: %s", enc)))
			}
			return formatDigest(runtime, out, []goja.Value{outputEncVal})
		}
		return CreateBuffer(runtime, out)
	})

	// final([outputEncoding])
	obj.Set("final", func(call goja.FunctionCall) goja.Value {
		if finished {
			panic(runtime.NewTypeError("Cipher is already finalized"))
		}
		finished = true

		out, err := ctx.Final()
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encVal := call.Arguments[0]
			enc := strings.ToLower(encVal.String())
			switch enc {
			case "hex", "base64", "base64url", "latin1", "binary", "utf8", "utf-8", "ascii", "utf16le", "ucs2", "ucs-2":
				// 合法编码
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("Invalid output encoding: %s", enc)))
			}
			return formatDigest(runtime, out, []goja.Value{encVal})
		}
		return CreateBuffer(runtime, out)
	})

	// setAutoPadding([autoPadding])
	obj.Set("setAutoPadding", func(call goja.FunctionCall) goja.Value {
		if finished {
			panic(runtime.NewTypeError("Cipher is already finalized"))
		}
		autoPadding := true
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			autoPadding = call.Arguments[0].ToBoolean()
		}
		if err := ctx.SetAutoPadding(autoPadding); err != nil {
			panic(runtime.NewGoError(err))
		}
		return call.This
	})

	// GCM/CCM 相关方法
	obj.Set("setAAD", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("setAAD 需要 data 参数"))
		}

		dataVal := call.Arguments[0]
		var opts *goja.Object
		if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			if o, ok := call.Arguments[1].(*goja.Object); ok {
				opts = o
			}
		}

		var data []byte
		var err error

		// 处理 encoding 选项（当 data 为 string 时）
		if opts != nil {
			encVal := opts.Get("encoding")
			if encVal != nil && !goja.IsUndefined(encVal) && !goja.IsNull(encVal) {
				data = parseDataWithEncoding(runtime, []goja.Value{dataVal, encVal})
			} else {
				data, err = ConvertToBytes(runtime, dataVal)
				if err != nil {
					panic(runtime.NewTypeError(fmt.Sprintf("setAAD data 参数类型错误: %v", err)))
				}
			}

			// 处理 plaintextLength（CCM 必需，GCM/OCB 可选）
			if plVal := opts.Get("plaintextLength"); plVal != nil && !goja.IsUndefined(plVal) && !goja.IsNull(plVal) {
				plaintextLen := int(plVal.ToInteger())
				if plaintextLen < 0 {
					panic(runtime.NewTypeError(fmt.Sprintf("The 'plaintextLength' option must be >= 0. Received %d", plaintextLen)))
				}
				if isCCM {
					// CCM：根据加密/解密路径分别处理
					if encrypt {
						// 加密：直接下推到底层（顺序：SetCCMPlaintextLength -> SetAAD）
						if err := ctx.SetCCMPlaintextLength(plaintextLen); err != nil {
							panic(runtime.NewGoError(err))
						}
						ccmPlaintextLen = plaintextLen
						ccmHavePlaintextLen = true
					} else {
						// 解密：仅记录，真正的 OpenSSL 调用延迟到 setAuthTag
						ccmPlaintextLen = plaintextLen
						ccmHavePlaintextLen = true
					}
				}
			}
		} else {
			data, err = ConvertToBytes(runtime, dataVal)
			if err != nil {
				panic(runtime.NewTypeError(fmt.Sprintf("setAAD data 参数类型错误: %v", err)))
			}
		}

		if isCCM && !encrypt {
			// CCM 解密：仅记录 AAD，真实下推延迟到 tag/参数就绪后统一执行
			ccmAAD = make([]byte, len(data))
			copy(ccmAAD, data)
			ccmHaveAAD = true
			applyCCMDecryptParams()
			return call.This
		}

		// 非 CCM 或 CCM 加密：立即下推 AAD
		if err := ctx.SetAAD(data); err != nil {
			panic(runtime.NewGoError(err))
		}
		return call.This
	})

	obj.Set("getAuthTag", func(call goja.FunctionCall) goja.Value {
		if !encrypt {
			panic(runtime.NewTypeError("getAuthTag 只能在加密端使用"))
		}
		tag, err := ctx.GetTag(authTagLen)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		return CreateBuffer(runtime, tag)
	})

	obj.Set("setAuthTag", func(call goja.FunctionCall) goja.Value {
		if encrypt {
			panic(runtime.NewTypeError("setAuthTag 只能在解密端使用"))
		}
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("setAuthTag 需要 tag 参数"))
		}
		if authTagSet {
			panic(runtime.NewTypeError("Auth tag has already been set"))
		}

		// 支持 setAuthTag(tag, encoding) 形式，其中 tag 为字符串
		var tag []byte
		var err error
		if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			// (tag: string, encoding: string)
			tag = parseCipherDataWithEncoding(runtime, call.Arguments[0], call.Arguments[1])
		} else {
			tag, err = ConvertToBytes(runtime, call.Arguments[0])
			if err != nil {
				panic(runtime.NewTypeError(fmt.Sprintf("setAuthTag tag 参数类型错误: %v", err)))
			}
		}

		// 在 AEAD 模式下根据不同算法校验 tag 长度
		if isGCM {
			// GCM：允许 1-16 字节（Node.js 对 <128 bit 给出 deprecation warning 但仍接受）
			if len(tag) <= 0 || len(tag) > 16 {
				panic(runtime.NewTypeError(fmt.Sprintf("Invalid authentication tag length: %d", len(tag))))
			}
		} else if isCCM || isOCB || isChaCha20Poly1305 {
			// CCM/OCB/ChaCha20-Poly1305：要求与 authTagLen 一致
			if len(tag) != authTagLen {
				panic(runtime.NewTypeError(fmt.Sprintf("Invalid authentication tag length: %d", len(tag))))
			}
		}

		if isCCM {
			// CCM 解密路径：先设置 tag，然后在参数就绪时按顺序下推
			if err := ctx.SetTag(tag); err != nil {
				panic(runtime.NewGoError(err))
			}
			authTagSet = true
			applyCCMDecryptParams()
			return call.This
		}

		// 非 CCM：直接设置 tag
		if err := ctx.SetTag(tag); err != nil {
			panic(runtime.NewGoError(err))
		}
		authTagSet = true
		return call.This
	})

	// TODO: createCipher/createDecipher 会在上层包装密码派生逻辑（EVP_BytesToKey + "Salted__" 头）

	return obj
}

// parseCipherDataWithEncoding 专用于 Cipher/Decipher，处理输入编码；无效编码会抛出错误
func parseCipherDataWithEncoding(runtime *goja.Runtime, dataVal, encodingVal goja.Value) []byte {
	dataStr := dataVal.String()
	encoding := strings.ToLower(encodingVal.String())

	switch encoding {
	case "utf8", "utf-8":
		return []byte(dataStr)
	case "hex":
		return decodeHexNodeStyle(runtime, dataStr)
	case "base64":
		buf, err := base64.StdEncoding.DecodeString(dataStr)
		if err != nil {
			// 与 Hash 行为保持一致：失败时进行宽松 base64 解码
			buf = decodeBase64Lenient(dataStr)
		}
		return buf
	case "base64url":
		buf, err := base64.RawURLEncoding.DecodeString(dataStr)
		if err != nil {
			buf, err = base64.URLEncoding.DecodeString(dataStr)
			if err != nil {
				buf = decodeBase64Lenient(dataStr)
			}
		}
		return buf
	case "latin1", "binary":
		runes := []rune(dataStr)
		buf := make([]byte, len(runes))
		for i, r := range runes {
			if r > 255 {
				panic(runtime.NewTypeError(fmt.Sprintf("latin1 字符串包含非法字符: U+%04X", r)))
			}
			buf[i] = byte(r & 0xFF)
		}
		return buf
	case "ascii":
		runes := []rune(dataStr)
		buf := make([]byte, len(runes))
		for i, r := range runes {
			buf[i] = byte(r & 0xFF)
		}
		return buf
	case "utf16le", "ucs2", "ucs-2":
		runes := []rune(dataStr)
		buf := make([]byte, len(runes)*2)
		for i, r := range runes {
			buf[i*2] = byte(r)
			buf[i*2+1] = byte(r >> 8)
		}
		return buf
	default:
		// Cipher/Decipher 在 Node.js 中对未知编码并不会抛错，而是按 utf8 处理
		// 这里对齐该行为：直接按 UTF-8 编码字符串
		return []byte(dataStr)
	}
}
