package streams

import (
	"fmt"

	"github.com/dop251/goja"
)

const symbolAsyncIteratorPolyfill = `
(function () {
  if (typeof Symbol === 'function' && !Symbol.asyncIterator) {
    var asyncIteratorSymbol = Symbol('Symbol.asyncIterator');
    Object.defineProperty(Symbol, 'asyncIterator', {
      value: asyncIteratorSymbol,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
})();
`

// EnsureReadableStream 确保全局存在 ReadableStream 构造器（最小可用 polyfill）
// Node.js v25 已内置 Web Streams API；Goja 环境需要手动注入，避免 Blob.stream() 等
// 调用时出现 ReadableStream 未定义的错误。
func EnsureReadableStream(runtime *goja.Runtime) error {
	if runtime == nil {
		return fmt.Errorf("runtime 为 nil")
	}

	if err := ensureSymbolAsyncIterator(runtime); err != nil {
		return fmt.Errorf("初始化 Symbol.asyncIterator 失败: %w", err)
	}

	// 已存在且具有 prototype -> 直接复用
	if hasReadableStream(runtime) {
		return nil
	}

	if readableStreamPolyfillJS == "" {
		return fmt.Errorf("ReadableStream polyfill 资源未内置")
	}

	if _, err := runtime.RunString(readableStreamPolyfillJS); err != nil {
		return fmt.Errorf("注入 ReadableStream polyfill 失败: %w", err)
	}

	if !hasReadableStream(runtime) {
		return fmt.Errorf("ReadableStream polyfill 注入后仍不可用")
	}
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

func hasReadableStream(runtime *goja.Runtime) bool {
	constructorVal := runtime.Get("ReadableStream")
	if constructorVal == nil || goja.IsUndefined(constructorVal) || goja.IsNull(constructorVal) {
		return false
	}

	constructor := constructorVal.ToObject(runtime)
	if constructor == nil {
		return false
	}

	protoVal := constructor.Get("prototype")
	if protoVal == nil || goja.IsUndefined(protoVal) || goja.IsNull(protoVal) {
		return false
	}

	return true
}

func ensureSymbolAsyncIterator(runtime *goja.Runtime) error {
	_, err := runtime.RunString(symbolAsyncIteratorPolyfill)
	return err
}
