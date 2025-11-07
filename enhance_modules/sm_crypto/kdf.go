package sm_crypto

import (
	"fmt"

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
// 对应 JS: kdf(z, keylen, iv?)
// 参数:
//   - z: string | Uint8Array - 共享信息
//   - keylen: number - 期望派生密钥的字节长度
//   - iv: string | Uint8Array - 可选的初始化向量（附加信息）
//
// 返回: Uint8Array - 派生的密钥字节（与 sm-crypto-v2 v1.15.0 行为一致）
func KDF(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	// 参数 0: z (string | Uint8Array)
	var z []byte
	var err error
	if len(call.Arguments) < 1 {
		panic(runtime.NewTypeError("kdf requires at least 1 argument"))
	}
	z, err = ParseStringOrBytes(call.Argument(0), runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid z parameter: %w", err)))
	}

	// 参数 1: keylen (number)
	var keylen int
	if len(call.Arguments) >= 2 {
		keylen = int(call.Argument(1).ToInteger())
	}

	// sm-crypto-v2 在 keylen < 0 时抛出错误，keylen == 0 返回空数组
	if keylen < 0 {
		panic(runtime.NewTypeError("keylen cannot be negative"))
	}
	if keylen == 0 {
		return CreateUint8Array(runtime, []byte{})
	}

	// 参数 2: iv (可选，string | Uint8Array)
	var iv []byte
	if len(call.Arguments) > 2 && !goja.IsUndefined(call.Argument(2)) && !goja.IsNull(call.Argument(2)) {
		iv, err = ParseStringOrBytes(call.Argument(2), runtime)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("invalid iv parameter: %w", err)))
		}
	}

	// 执行 KDF 并返回 Uint8Array（sm-crypto-v2 始终返回 Uint8Array）
	result := kdfCore(z, keylen, iv)
	return CreateUint8Array(runtime, result)
}
