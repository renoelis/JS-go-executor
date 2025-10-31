package sm_crypto

import (
	"fmt"
	"strings"

	"github.com/dop251/goja"
	"github.com/emmansun/gmsm/sm3"
)

// ============================================================================
// 🔧 KDF 密钥派生函数（Key Derivation Function）
// ============================================================================

// kdfCore KDF 核心实现
// 精确匹配 sm-crypto-v2.js 的 kdf 函数
func kdfCore(z []byte, keylen int, iv []byte) []byte {
	msg := make([]byte, keylen)
	ct := uint32(1)
	offset := 0
	var t []byte

	ctShift := make([]byte, 4)

	nextT := func() {
		// 将 ct 转换为大端字节序
		ctShift[0] = byte(ct >> 24 & 0xFF)
		ctShift[1] = byte(ct >> 16 & 0xFF)
		ctShift[2] = byte(ct >> 8 & 0xFF)
		ctShift[3] = byte(ct & 0xFF)

		// t = SM3(z || ctShift || iv)
		h := sm3.New()
		h.Write(z)
		h.Write(ctShift)
		if len(iv) > 0 {
			h.Write(iv)
		}
		t = h.Sum(nil)

		ct++
		offset = 0
	}

	// 初始化第一个 t
	nextT()

	// 生成密钥
	for i := 0; i < keylen; i++ {
		if offset == len(t) {
			nextT()
		}
		msg[i] = t[offset] & 0xFF
		offset++
	}

	return msg
}

// KDF 密钥派生函数（Goja 包装）
// 对应 JS: kdf(z, keylen, options?)
// 兼容：第三参为旧版 iv（string/Uint8Array）或新版 options 对象 { iv?, output? }
func KDF(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("kdf requires at least 2 arguments"))
	}

	// 参数 0: z (string | Uint8Array)
	z, err := ParseStringOrBytes(call.Argument(0), runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid z parameter: %w", err)))
	}

	// 参数 1: keylen (number)
	keylen := int(call.Argument(1).ToInteger())
	if keylen <= 0 {
		panic(runtime.NewTypeError("keylen must be positive"))
	}

	// 参数 2: options 或 iv（兼容旧版）
	var iv []byte
	outputMode := "array" // 默认输出 Uint8Array（匹配官方 Node.js 行为）
	if len(call.Arguments) > 2 && !goja.IsUndefined(call.Argument(2)) && !goja.IsNull(call.Argument(2)) {
		arg2 := call.Argument(2)
		// 判断是否是对象以及对象类型
		if obj := arg2.ToObject(runtime); obj != nil {
			className := obj.ClassName()
			if className == "Object" {
				// 作为 options 解析
				if v := GetStringOption(obj, "output", ""); v != "" {
					outputMode = v
				}
				if ivBytes, _ := GetBytesOption(obj, "iv", runtime); len(ivBytes) > 0 {
					iv = ivBytes
				}
			} else {
				// 不是普通对象（如 Uint8Array/Array/Buffer），按旧版 iv 解析
				iv, err = ParseStringOrBytes(arg2, runtime)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("invalid iv parameter: %w", err)))
				}
			}
		} else {
			// 非对象，按旧版 iv 解析
			iv, err = ParseStringOrBytes(arg2, runtime)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("invalid iv parameter: %w", err)))
			}
		}
	}

	// 执行 KDF
	result := kdfCore(z, keylen, iv)

	// 输出模式：默认返回 Uint8Array（匹配官方行为）；'string'/'hex' 返回 hex 字符串
	if strings.EqualFold(outputMode, "string") || strings.EqualFold(outputMode, "hex") {
		return runtime.ToValue(BytesToHex(result))
	}
	// 默认返回 Uint8Array
	return CreateUint8Array(runtime, result)
}
