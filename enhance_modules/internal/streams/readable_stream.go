package streams

import (
	"fmt"

	"github.com/dop251/goja"
)

// EnsureReadableStream 确保全局存在 ReadableStream 构造器（最小可用 polyfill）
// Node.js v25 已内置 Web Streams API；Goja 环境需要手动注入，避免 Blob.stream() 等
// 调用时出现 ReadableStream 未定义的错误。
func EnsureReadableStream(runtime *goja.Runtime) error {
	if runtime == nil {
		return fmt.Errorf("runtime 为 nil")
	}

	// 已存在且具有 prototype -> 直接复用
	if proto := GetReadableStreamPrototype(runtime); proto != nil {
		return nil
	}

	constructorFunc := func(call goja.ConstructorCall) *goja.Object {
		// 暂不支持用户自定义构造 ReadableStream，与 Node 行为保持一致需要进一步实现
		panic(runtime.NewTypeError("ReadableStream constructor is not available in this environment"))
	}

	constructor := runtime.ToValue(constructorFunc).ToObject(runtime)
	if constructor == nil {
		return fmt.Errorf("无法创建 ReadableStream 构造器")
	}

	// 设置函数名，方便调试 & instanceof
	constructor.DefineDataProperty("name", runtime.ToValue("ReadableStream"),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	prototype := runtime.NewObject()

	// prototype.constructor = constructor（不可枚举，与 Node 行为一致）
	prototype.DefineDataProperty("constructor", runtime.ToValue(constructor),
		goja.FLAG_TRUE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	constructor.Set("prototype", prototype)
	runtime.Set("ReadableStream", constructor)
	return nil
}

// GetReadableStreamPrototype 返回全局 ReadableStream.prototype（若不存在返回 nil）
func GetReadableStreamPrototype(runtime *goja.Runtime) *goja.Object {
	if runtime == nil {
		return nil
	}

	constructorVal := runtime.Get("ReadableStream")
	if constructorVal == nil || goja.IsUndefined(constructorVal) || goja.IsNull(constructorVal) {
		return nil
	}

	constructor := constructorVal.ToObject(runtime)
	if constructor == nil {
		return nil
	}

	protoVal := constructor.Get("prototype")
	if protoVal == nil || goja.IsUndefined(protoVal) || goja.IsNull(protoVal) {
		return nil
	}

	return protoVal.ToObject(runtime)
}

// AttachReadableStreamPrototype 将 target 的原型指向 ReadableStream.prototype（若可用）
func AttachReadableStreamPrototype(runtime *goja.Runtime, target *goja.Object) {
	if runtime == nil || target == nil {
		return
	}

	if proto := GetReadableStreamPrototype(runtime); proto != nil {
		target.SetPrototype(proto)
	}
}
