package sm_crypto

import (
	"crypto/hmac"
	"fmt"

	"github.com/dop251/goja"
	"github.com/emmansun/gmsm/sm3"
)

// ============================================================================
// 🔧 SM3 哈希函数
// ============================================================================

// sm3Hash SM3 哈希核心实现
func sm3Hash(input []byte) []byte {
	h := sm3.New()
	h.Write(input)
	return h.Sum(nil)
}

// sm3Hmac SM3 HMAC 实现
func sm3Hmac(key []byte, input []byte) []byte {
	h := hmac.New(sm3.New, key)
	h.Write(input)
	return h.Sum(nil)
}

// SM3Hash SM3 哈希函数（Goja 包装）
// 对应 JS: sm3(input, options?)
//
// 参数:
//   - input: string | Uint8Array - 输入数据
//   - options: { mode?: "hmac", key?: string | Uint8Array } - 可选参数
//
// 返回: string - 64 字符十六进制哈希
func SM3Hash(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("sm3 requires at least 1 argument"))
	}

	// 参数 0: input (string | Uint8Array)
	input, err := ParseStringOrBytes(call.Argument(0), runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid input parameter: %w", err)))
	}

	// 参数 1: options (可选)
	opts := ParseOptions(call, 1, runtime)
	output := "hex"
	if opts != nil {
		output = GetStringOption(opts, "output", output)
	}

	// 检查是否是 HMAC 模式
	// 注意：如果提供了 options，检查是否有 key（符合 JS 版本：有 key 就是 HMAC）
	if opts != nil {
		keyVal := opts.Get("key")
		// 如果有 key，说明是 HMAC 模式
		if keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
			// 检查 mode（如果提供了 mode，必须是 "hmac"）
			mode := GetStringOption(opts, "mode", "hmac") // 默认 "hmac"
			if mode != "hmac" {
				panic(runtime.NewTypeError("invalid mode"))
			}

			// 解析 key（可以是 hex 字符串或 Uint8Array）
			key, err := ParseHexOrBytes(keyVal, runtime)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("invalid key parameter: %w", err)))
			}

			// 检查 key 是否为空（匹配 Node.js sm-crypto-v2 行为）
			if len(key) == 0 {
				panic(runtime.NewGoError(fmt.Errorf("invalid key")))
			}

			// 计算 HMAC
			hash := sm3Hmac(key, input)
			if output == "array" {
				return CreateUint8Array(runtime, hash)
			}
			return runtime.ToValue(BytesToHex(hash))
		}
	}

	// 普通 SM3 哈希
	hash := sm3Hash(input)
	if output == "array" {
		return CreateUint8Array(runtime, hash)
	}
	return runtime.ToValue(BytesToHex(hash))
}
