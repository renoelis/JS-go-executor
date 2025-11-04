package qs

import (
	"github.com/dop251/goja"
)

// ============================================================================
// 🌉 Goja 桥接层 - 将 Go 函数暴露给 JavaScript（完整手动实现）
// ============================================================================

// CreateQsObject 创建 qs 对象并注册所有函数
// 对应 Node.js 的 qs 模块导出
func CreateQsObject(runtime *goja.Runtime) *goja.Object {
	obj := runtime.NewObject()

	// ============================================================================
	// 导出格式常量（与 Node.js qs 兼容）
	// 注意：formats 必须先设置，以保持与 Node.js qs 相同的属性顺序
	// ============================================================================

	// formats 对象
	formatsObj := runtime.NewObject()
	formatsObj.Set("RFC1738", string(RFC1738))
	formatsObj.Set("RFC3986", string(RFC3986))
	formatsObj.Set("default", string(DefaultFormat))

	// formatters 对象
	formattersObj := runtime.NewObject()

	// RFC1738 formatter
	formattersObj.Set("RFC1738", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Undefined()
		}
		value := call.Argument(0).String()
		return runtime.ToValue(FormatterRFC1738(value))
	})

	// RFC3986 formatter
	formattersObj.Set("RFC3986", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Undefined()
		}
		value := call.Argument(0).String()
		return runtime.ToValue(FormatterRFC3986(value))
	})

	formatsObj.Set("formatters", formattersObj)
	obj.Set("formats", formatsObj)

	// ============================================================================
	// 核心功能 - Parse 和 Stringify
	// ============================================================================

	// qs.parse(string, [options])
	// 解析查询字符串为对象
	obj.Set("parse", func(call goja.FunctionCall) goja.Value {
		return Parse(call, runtime)
	})

	// qs.stringify(object, [options])
	// 将对象序列化为查询字符串
	obj.Set("stringify", func(call goja.FunctionCall) goja.Value {
		return Stringify(call, runtime)
	})

	// ============================================================================
	// 注意：qs v6.14.0 不再公开导出 utils 对象
	// utils 已成为内部实现，对外不可访问（qs.utils === undefined）
	// ============================================================================

	return obj
}
