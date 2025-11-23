package crypto

import (
	"crypto/subtle"

	"github.com/dop251/goja"
)

// ============================================================================
// 🔥 timingSafeEqual - 时间安全的相等性比较
// ============================================================================

// TimingSafeEqual 时间安全的相等性比较（防止时序攻击）
// Node.js: crypto.timingSafeEqual(a, b)
func TimingSafeEqual(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	// 检查参数数量并获取参数
	var firstArg, secondArg goja.Value
	if len(call.Arguments) >= 1 {
		firstArg = call.Arguments[0]
	}
	if len(call.Arguments) >= 2 {
		secondArg = call.Arguments[1]
	}

	// Node.js 行为：不接受字符串，只接受 Buffer/TypedArray/DataView/ArrayBuffer
	// 检查第一个参数类型
	if firstArg == nil || goja.IsUndefined(firstArg) || goja.IsNull(firstArg) {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"buf1\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView. Received undefined"))
	}
	if _, isString := firstArg.Export().(string); isString {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"buf1\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView. Received type string"))
	}

	// 检查第二个参数类型
	if secondArg == nil || goja.IsUndefined(secondArg) || goja.IsNull(secondArg) {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"buf2\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView. Received undefined"))
	}
	if _, isString := secondArg.Export().(string); isString {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"buf2\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView. Received type string"))
	}

	// 获取第一个参数
	a, errA := ConvertToBytes(runtime, firstArg)
	if errA != nil {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"buf1\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView."))
	}

	// 获取第二个参数
	b, errB := ConvertToBytes(runtime, secondArg)
	if errB != nil {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"buf2\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView."))
	}

	// Node.js 行为：长度必须相同，否则抛出错误
	if len(a) != len(b) {
		panic(runtime.NewTypeError("Input buffers must have the same byte length"))
	}

	// 使用 crypto/subtle.ConstantTimeCompare 进行时间安全的比较
	// 返回 1 表示相等，0 表示不相等
	result := subtle.ConstantTimeCompare(a, b) == 1

	return runtime.ToValue(result)
}
