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
//   - options: { mode?: "hmac", key?: string | Uint8Array } - 可选参数（HMAC 模式）
//
// 返回: string - 64 字符十六进制哈希（始终返回 hex，与 sm-crypto-v2 v1.15.0 行为一致）
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

	// 检查是否是 HMAC 模式
	// 注意：如果提供了 options，检查是否有 key（符合 JS 版本：有 key 就是 HMAC）
	if opts != nil {
		keyVal := opts.Get("key")

		// 如果 key 存在但为 null，抛出错误（匹配 sm-crypto-v2 行为）
		if keyVal != nil && !goja.IsUndefined(keyVal) && goja.IsNull(keyVal) {
			panic(runtime.NewGoError(fmt.Errorf("invalid key")))
		}

		// 如果有 key，说明是 HMAC 模式
		if keyVal != nil && !goja.IsUndefined(keyVal) {
			// 检查 mode（如果提供了 mode，必须是 "hmac"）
			mode := GetStringOption(opts, "mode", "hmac") // 默认 "hmac"
			if mode != "hmac" {
				panic(runtime.NewTypeError("invalid mode"))
			}

			// 解析 key（可以是字符串或 Uint8Array）
			// 注意：sm-crypto-v2 优先将字符串作为 hex 解析，失败则作为 UTF-8 处理
			key, err := ParseHexOrBytes(keyVal, runtime)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("invalid key parameter: %w", err)))
			}

			// sm-crypto-v2 允许空 key（会正常计算 HMAC）
			// 但如果是空字符串，仍然抛出错误
			if keyVal.ExportType().Kind().String() == "string" && keyVal.String() == "" {
				panic(runtime.NewGoError(fmt.Errorf("invalid key")))
			}

			// 计算 HMAC - sm-crypto-v2 始终返回 hex 字符串
			hash := sm3Hmac(key, input)
			return runtime.ToValue(BytesToHex(hash))
		}
	}

	// 普通 SM3 哈希 - sm-crypto-v2 始终返回 hex 字符串
	hash := sm3Hash(input)
	return runtime.ToValue(BytesToHex(hash))
}
