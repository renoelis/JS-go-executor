package fetch

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/dop251/goja"
)

// ==================== Headers 构造器 ====================

// CreateHeadersConstructor 创建 Headers 构造器
// 🔥 浏览器兼容的 Headers API
// 标准参考: https://developer.mozilla.org/zh-CN/docs/Web/API/Headers
//
// 功能说明:
// - 创建 HTTP 头部对象
// - 支持 get/set/has/delete/append 方法
// - 支持 forEach/entries/keys/values 迭代方法
// - 自动转换 header 名称为小写（HTTP/2 规范）
func CreateHeadersConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	return func(call goja.ConstructorCall) *goja.Object {
		headers := make(map[string]string)

		// 从参数初始化 Headers
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			init := call.Arguments[0].Export()
			if initMap, ok := init.(map[string]interface{}); ok {
				for key, value := range initMap {
					headers[strings.ToLower(key)] = fmt.Sprintf("%v", value)
				}
			}
		}

		obj := runtime.NewObject()

		// get(name) - 获取头部值
		obj.Set("get", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return goja.Null()
			}
			name := strings.ToLower(call.Arguments[0].String())
			if value, ok := headers[name]; ok {
				return runtime.ToValue(value)
			}
			return goja.Null()
		})

		// set(name, value) - 设置头部值
		obj.Set("set", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				return goja.Undefined()
			}
			name := strings.ToLower(call.Arguments[0].String())
			value := call.Arguments[1].String()
			headers[name] = value
			return goja.Undefined()
		})

		// has(name) - 检查头部是否存在
		obj.Set("has", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return runtime.ToValue(false)
			}
			name := strings.ToLower(call.Arguments[0].String())
			_, ok := headers[name]
			return runtime.ToValue(ok)
		})

		// delete(name) - 删除头部
		obj.Set("delete", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return goja.Undefined()
			}
			name := strings.ToLower(call.Arguments[0].String())
			delete(headers, name)
			return goja.Undefined()
		})

		// append(name, value) - 追加头部值
		obj.Set("append", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				return goja.Undefined()
			}
			name := strings.ToLower(call.Arguments[0].String())
			value := call.Arguments[1].String()
			if existing, ok := headers[name]; ok {
				headers[name] = existing + ", " + value
			} else {
				headers[name] = value
			}
			return goja.Undefined()
		})

		// forEach(callback) - 遍历所有头部
		obj.Set("forEach", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return goja.Undefined()
			}
			callback, ok := goja.AssertFunction(call.Arguments[0])
			if !ok {
				return goja.Undefined()
			}

			for key, value := range headers {
				callback(goja.Undefined(), runtime.ToValue(value), runtime.ToValue(key), obj)
			}
			return goja.Undefined()
		})

		// entries() - 返回 [key, value] 迭代器
		obj.Set("entries", func(call goja.FunctionCall) goja.Value {
			entries := make([]interface{}, 0, len(headers))
			for key, value := range headers {
				entries = append(entries, []interface{}{key, value})
			}

			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(entries) {
					result.Set("value", runtime.ToValue(entries[index]))
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			// 支持 for...of / Array.from
			iterator.SetSymbol(goja.SymIterator, func(call goja.FunctionCall) goja.Value {
				return iterator
			})

			return iterator
		})

		// keys() - 返回 key 迭代器
		obj.Set("keys", func(call goja.FunctionCall) goja.Value {
			keys := make([]string, 0, len(headers))
			for key := range headers {
				keys = append(keys, key)
			}

			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(keys) {
					result.Set("value", runtime.ToValue(keys[index]))
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			iterator.SetSymbol(goja.SymIterator, func(call goja.FunctionCall) goja.Value {
				return iterator
			})

			return iterator
		})

		// values() - 返回 value 迭代器
		obj.Set("values", func(call goja.FunctionCall) goja.Value {
			values := make([]string, 0, len(headers))
			for _, value := range headers {
				values = append(values, value)
			}

			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(values) {
					result.Set("value", runtime.ToValue(values[index]))
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			iterator.SetSymbol(goja.SymIterator, func(call goja.FunctionCall) goja.Value {
				return iterator
			})

			return iterator
		})

		return obj
	}
}

// createHeadersObject 创建一个带有完整 Headers 接口方法的对象
// 这个辅助函数用于为 Request/Response 对象创建 headers 属性
func createHeadersObject(runtime *goja.Runtime, headers map[string]string) *goja.Object {
	obj := runtime.NewObject()

	// get(name) - 获取头部值
	obj.Set("get", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Null()
		}
		name := strings.ToLower(call.Arguments[0].String())
		if value, ok := headers[name]; ok {
			return runtime.ToValue(value)
		}
		return goja.Null()
	})

	// set(name, value) - 设置头部值
	obj.Set("set", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			return goja.Undefined()
		}
		name := strings.ToLower(call.Arguments[0].String())
		value := call.Arguments[1].String()
		headers[name] = value
		return goja.Undefined()
	})

	// has(name) - 检查头部是否存在
	obj.Set("has", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}
		name := strings.ToLower(call.Arguments[0].String())
		_, ok := headers[name]
		return runtime.ToValue(ok)
	})

	// delete(name) - 删除头部
	obj.Set("delete", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Undefined()
		}
		name := strings.ToLower(call.Arguments[0].String())
		delete(headers, name)
		return goja.Undefined()
	})

	// append(name, value) - 追加头部值
	obj.Set("append", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			return goja.Undefined()
		}
		name := strings.ToLower(call.Arguments[0].String())
		value := call.Arguments[1].String()
		if existing, ok := headers[name]; ok {
			headers[name] = existing + ", " + value
		} else {
			headers[name] = value
		}
		return goja.Undefined()
	})

	// forEach(callback) - 遍历所有头部
	obj.Set("forEach", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Undefined()
		}
		callback, ok := goja.AssertFunction(call.Arguments[0])
		if !ok {
			return goja.Undefined()
		}

		for key, value := range headers {
			callback(goja.Undefined(), runtime.ToValue(value), runtime.ToValue(key), obj)
		}
		return goja.Undefined()
	})

	// entries() - 返回 [key, value] 迭代器
	obj.Set("entries", func(call goja.FunctionCall) goja.Value {
		entries := make([]interface{}, 0, len(headers))
		for key, value := range headers {
			entries = append(entries, []interface{}{key, value})
		}

		iterator := runtime.NewObject()
		index := 0

		iterator.Set("next", func(call goja.FunctionCall) goja.Value {
			result := runtime.NewObject()
			if index < len(entries) {
				result.Set("value", runtime.ToValue(entries[index]))
				result.Set("done", runtime.ToValue(false))
				index++
			} else {
				result.Set("value", goja.Undefined())
				result.Set("done", runtime.ToValue(true))
			}
			return result
		})

		iterator.SetSymbol(goja.SymIterator, func(call goja.FunctionCall) goja.Value {
			return iterator
		})

		return iterator
	})

	// keys() - 返回 key 迭代器
	obj.Set("keys", func(call goja.FunctionCall) goja.Value {
		keys := make([]string, 0, len(headers))
		for key := range headers {
			keys = append(keys, key)
		}

		iterator := runtime.NewObject()
		index := 0

		iterator.Set("next", func(call goja.FunctionCall) goja.Value {
			result := runtime.NewObject()
			if index < len(keys) {
				result.Set("value", runtime.ToValue(keys[index]))
				result.Set("done", runtime.ToValue(false))
				index++
			} else {
				result.Set("value", goja.Undefined())
				result.Set("done", runtime.ToValue(true))
			}
			return result
		})

		iterator.SetSymbol(goja.SymIterator, func(call goja.FunctionCall) goja.Value {
			return iterator
		})

		return iterator
	})

	// values() - 返回 value 迭代器
	obj.Set("values", func(call goja.FunctionCall) goja.Value {
		values := make([]string, 0, len(headers))
		for _, value := range headers {
			values = append(values, value)
		}

		iterator := runtime.NewObject()
		index := 0

		iterator.Set("next", func(call goja.FunctionCall) goja.Value {
			result := runtime.NewObject()
			if index < len(values) {
				result.Set("value", runtime.ToValue(values[index]))
				result.Set("done", runtime.ToValue(false))
				index++
			} else {
				result.Set("value", goja.Undefined())
				result.Set("done", runtime.ToValue(true))
			}
			return result
		})

		iterator.SetSymbol(goja.SymIterator, func(call goja.FunctionCall) goja.Value {
			return iterator
		})

		return iterator
	})

	return obj
}

// ==================== Request 构造器 ====================

// CreateRequestConstructor 创建 Request 构造器
// 🔥 浏览器兼容的 Request API
// 标准参考: https://developer.mozilla.org/zh-CN/docs/Web/API/Request
//
// 功能说明:
// - 创建 HTTP 请求对象
// - 支持 url, method, headers, body 属性
// - 支持 clone() 方法复制请求
// - 🔥 修复：保留 body 的原始类型（特别是 FormData 对象）
func CreateRequestConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	return func(call goja.ConstructorCall) *goja.Object {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Request 构造函数需要至少 1 个参数"))
		}

		// 输入参数
		input := call.Arguments[0]
		options := make(map[string]interface{})

		// 预先提取的原始值（保持 goja.Value 类型，避免 Export 破坏）
		var bodyVal goja.Value
		var signalVal goja.Value
		var headersVal goja.Value

		// 如果第一个参数是 Request 对象，先继承其字段
		if inputObj, ok := input.(*goja.Object); ok {
			if urlVal := inputObj.Get("url"); urlVal != nil && !goja.IsUndefined(urlVal) && !goja.IsNull(urlVal) {
				options["url"] = urlVal.String()
			}
			if m := inputObj.Get("method"); m != nil && !goja.IsUndefined(m) && !goja.IsNull(m) {
				options["method"] = m.String()
			}
			if h := inputObj.Get("headers"); h != nil && !goja.IsUndefined(h) && !goja.IsNull(h) {
				headersVal = h
			}
			if b := inputObj.Get("body"); b != nil && !goja.IsUndefined(b) {
				bodyVal = b
				options["body"] = b
			}
			if s := inputObj.Get("signal"); s != nil && !goja.IsUndefined(s) {
				signalVal = s
				options["signal"] = s
			}
		}

		// 处理 init 参数（第二个参数）
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			if optionsObj := call.Arguments[1].ToObject(runtime); optionsObj != nil {
				bodyVal = optionsObj.Get("body")
				signalVal = optionsObj.Get("signal")
				headersVal = optionsObj.Get("headers")

				if exported, ok := call.Arguments[1].Export().(map[string]interface{}); ok {
					for k, v := range exported {
						options[k] = v
					}
				}

				if !goja.IsUndefined(bodyVal) && bodyVal != nil {
					options["body"] = bodyVal
				}
				if !goja.IsUndefined(signalVal) && signalVal != nil {
					options["signal"] = signalVal
				}
				if !goja.IsUndefined(headersVal) && headersVal != nil {
					options["headers"] = headersVal
				}
			}
		}

		// 解析 URL
		url := input.String()
		if u, ok := options["url"].(string); ok && u != "" {
			url = u
		}

		// 方法
		method := "GET"
		if m, ok := options["method"].(string); ok && m != "" {
			method = strings.ToUpper(m)
		}

		// 解析 headers
		headers := make(map[string]string)
		parseHeaders := func(val goja.Value) bool {
			if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
				return false
			}
			if obj, ok := val.(*goja.Object); ok {
				// 优先使用 forEach
				if forEach := obj.Get("forEach"); forEach != nil && !goja.IsUndefined(forEach) {
					if forEachFn, ok := goja.AssertFunction(forEach); ok {
						callback := func(cbCall goja.FunctionCall) goja.Value {
							if len(cbCall.Arguments) >= 2 {
								key := strings.ToLower(cbCall.Argument(1).String())
								headers[key] = cbCall.Argument(0).String()
							}
							return goja.Undefined()
						}
						if _, err := forEachFn(obj, runtime.ToValue(callback)); err == nil {
							return true
						}
					}
				}

				// 回退：枚举对象键
				for _, key := range obj.Keys() {
					headers[strings.ToLower(key)] = obj.Get(key).String()
				}
				return len(obj.Keys()) > 0
			}
			return false
		}

		if !parseHeaders(headersVal) {
			if h, ok := options["headers"].(map[string]interface{}); ok {
				for key, value := range h {
					headers[strings.ToLower(key)] = fmt.Sprintf("%v", value)
				}
			}
		}

		for _, v := range headers {
			ensureASCIIHeaderValue(runtime, v)
		}

		// 解析 body（保持原始类型）
		var body interface{}
		if b, ok := options["body"]; ok && b != nil {
			body = b
		}

		// 提取并验证 signal
		var signal goja.Value
		if s, ok := options["signal"]; ok && s != nil {
			if sv, ok := s.(goja.Value); ok {
				if !goja.IsUndefined(sv) && !goja.IsNull(sv) {
					if signalObj, ok := sv.(*goja.Object); ok {
						isSignalVal := signalObj.Get("__isAbortSignal")
						if isSignalVal == nil || goja.IsUndefined(isSignalVal) || goja.IsNull(isSignalVal) || !isSignalVal.ToBoolean() {
							panic(runtime.NewTypeError("signal is not a valid AbortSignal"))
						}
						signal = sv
					} else {
						panic(runtime.NewTypeError("signal is not a valid AbortSignal"))
					}
				}
			}
		}

		// 创建 Request 对象
		requestObj := runtime.NewObject()
		requestObj.Set("url", runtime.ToValue(url))
		requestObj.Set("method", runtime.ToValue(method))

		if gojaVal, ok := body.(goja.Value); ok {
			requestObj.Set("body", gojaVal)
		} else if body != nil {
			requestObj.Set("body", runtime.ToValue(body))
		} else {
			requestObj.Set("body", goja.Null())
		}

		// headers 对象
		headersObj := createHeadersObject(runtime, headers)
		requestObj.Set("headers", headersObj)

		// signal 只读属性
		if signal != nil && !goja.IsUndefined(signal) && !goja.IsNull(signal) {
			requestObj.DefineDataProperty("signal", signal, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
		} else {
			requestObj.DefineDataProperty("signal", goja.Null(), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
		}

		// clone 方法
		requestObj.Set("clone", func(call goja.FunctionCall) goja.Value {
			clonedHeaders := make(map[string]string)
			for k, v := range headers {
				clonedHeaders[k] = v
			}

			clonedRequest := runtime.NewObject()
			clonedRequest.Set("url", runtime.ToValue(url))
			clonedRequest.Set("method", runtime.ToValue(method))
			clonedRequest.Set("body", runtime.ToValue(body))
			clonedRequest.Set("headers", createHeadersObject(runtime, clonedHeaders))

			// clone 时创建新的 signal 实例（共享同一 state）
			if signalObj, ok := signal.(*goja.Object); ok {
				if stateVal := signalObj.Get("__signalState"); stateVal != nil && !goja.IsUndefined(stateVal) {
					if st, ok := stateVal.Export().(*SignalState); ok {
						protos := getRuntimePrototypes(runtime)
						clonedSignal := CreateAbortSignalObjectWithPrototype(runtime, st, protos.abortSignalPrototype)
						clonedRequest.DefineDataProperty("signal", clonedSignal, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
					}
				}
			}

			if clonedRequest.Get("signal") == nil || goja.IsUndefined(clonedRequest.Get("signal")) {
				if signal != nil && !goja.IsUndefined(signal) && !goja.IsNull(signal) {
					clonedRequest.DefineDataProperty("signal", signal, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
				} else {
					clonedRequest.DefineDataProperty("signal", goja.Null(), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
				}
			}

			return clonedRequest
		})

		return requestObj
	}
}

// ==================== DOMException 构造器 ====================

// CreateDOMExceptionConstructor 创建 DOMException 构造器
// 🔥 浏览器兼容的 DOMException API
// 标准参考: https://developer.mozilla.org/zh-CN/docs/Web/API/DOMException
func CreateDOMExceptionConstructor(runtime *goja.Runtime) goja.Value {
	protos := getRuntimePrototypes(runtime)
	protos.domExceptionPrototype = runtime.NewObject()

	// 设置 @@toStringTag，保证 Object.prototype.toString.call(new DOMException()) 一致
	if err := protos.domExceptionPrototype.DefineDataPropertySymbol(goja.SymToStringTag, runtime.ToValue("DOMException"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
		protos.domExceptionPrototype.SetSymbol(goja.SymToStringTag, runtime.ToValue("DOMException"))
	}

	domExceptionConstructor := runtime.ToValue(func(call goja.ConstructorCall) *goja.Object {
		message := ""
		name := "Error"

		if len(call.Arguments) >= 1 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			message = call.Arguments[0].String()
		}
		if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			name = call.Arguments[1].String()
		}

		obj := call.This
		if obj == nil {
			obj = runtime.NewObject()
		}
		obj.SetPrototype(protos.domExceptionPrototype)
		obj.Set("message", message)
		obj.Set("name", name)
		obj.Set("__isDOMException", true)

		// 设置 code（根据 name 推断）
		code := 0
		switch name {
		case "AbortError":
			code = 20
		case "TimeoutError":
			code = 23
		case "NotSupportedError":
			code = 9
		case "InvalidStateError":
			code = 11
		}
		obj.Set("code", code)

		obj.Set("toString", func(call goja.FunctionCall) goja.Value {
			return runtime.ToValue(fmt.Sprintf("%s: %s", name, message))
		})

		return obj
	})

	ctorObj := domExceptionConstructor.ToObject(runtime)
	// 与 Node 对齐：DOMException.name === "DOMException"
	ctorObj.DefineDataProperty("name", runtime.ToValue("DOMException"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	// 确保 instanceof DOMException 使用的是我们维护的原型
	ctorObj.Set("prototype", protos.domExceptionPrototype)

	return domExceptionConstructor
}

// CreateDOMException 创建 DOMException 对象（非构造器调用）
func CreateDOMException(runtime *goja.Runtime, message, name string) *goja.Object {
	obj := runtime.NewObject()
	protos := getRuntimePrototypes(runtime)
	if protos.domExceptionPrototype != nil {
		obj.SetPrototype(protos.domExceptionPrototype)
	}
	obj.Set("message", message)
	obj.Set("name", name)
	obj.Set("__isDOMException", true)

	// 设置 code
	code := 0
	switch name {
	case "AbortError":
		code = 20
	case "TimeoutError":
		code = 23
	case "NotSupportedError":
		code = 9
	case "InvalidStateError":
		code = 11
	}
	obj.Set("code", code)

	obj.Set("toString", func(call goja.FunctionCall) goja.Value {
		return runtime.ToValue(fmt.Sprintf("%s: %s", name, message))
	})

	return obj
}

// ==================== AbortSignal 相关类型 ====================

// SignalState 存储 AbortSignal 的状态
type SignalState struct {
	aborted         bool
	reason          goja.Value
	abortCh         chan struct{}
	listeners       []goja.Value            // abort 事件监听器
	customListeners map[string][]goja.Value // 自定义事件监听器
	onabort         goja.Value
	listenerMutex   sync.Mutex
	abortedMutex    sync.Mutex
}

// runtimePrototypes 按 runtime 保存各类原型对象，避免跨 Runtime 污染
type runtimePrototypes struct {
	abortSignalPrototype     *goja.Object
	abortControllerPrototype *goja.Object
	domExceptionPrototype    *goja.Object
	eventPrototype           *goja.Object
}

var (
	prototypesMu     sync.RWMutex
	runtimeProtoByVM = make(map[*goja.Runtime]*runtimePrototypes)
)

// getRuntimePrototypes 返回指定 runtime 的 prototype 容器（若不存在则创建）
func getRuntimePrototypes(runtime *goja.Runtime) *runtimePrototypes {
	prototypesMu.RLock()
	protos := runtimeProtoByVM[runtime]
	prototypesMu.RUnlock()
	if protos != nil {
		return protos
	}
	prototypesMu.Lock()
	defer prototypesMu.Unlock()
	if protos = runtimeProtoByVM[runtime]; protos == nil {
		protos = &runtimePrototypes{}
		runtimeProtoByVM[runtime] = protos
	}
	return protos
}

// eventOptions 用于创建简单事件对象
type eventOptions struct {
	bubbles    bool
	cancelable bool
}

// isSameListener 判断存量监听器与目标监听器是否相同（支持 once 包装器）
func isSameListener(runtime *goja.Runtime, stored goja.Value, target goja.Value) bool {
	if stored == nil || target == nil || goja.IsUndefined(stored) || goja.IsNull(stored) || goja.IsUndefined(target) || goja.IsNull(target) {
		return false
	}
	if stored.SameAs(target) {
		return true
	}
	if obj := stored.ToObject(runtime); obj != nil {
		original := obj.Get("__originalListener")
		if original != nil && !goja.IsUndefined(original) && !goja.IsNull(original) && original.SameAs(target) {
			return true
		}
	}
	return false
}

// removeListenerFromSlice 移除切片中匹配的监听器
func removeListenerFromSlice(runtime *goja.Runtime, list []goja.Value, target goja.Value) []goja.Value {
	for i := 0; i < len(list); i++ {
		if isSameListener(runtime, list[i], target) {
			list = append(list[:i], list[i+1:]...)
			i--
		}
	}
	return list
}

// createEventObject 构造符合 Node/DOM 语义的 Event 对象
func createEventObject(runtime *goja.Runtime, eventType string, opts eventOptions) *goja.Object {
	protos := getRuntimePrototypes(runtime)
	ev := runtime.NewObject()
	if protos.eventPrototype == nil {
		protos.eventPrototype = runtime.NewObject()
	}
	ev.SetPrototype(protos.eventPrototype)

	ev.DefineDataProperty("type", runtime.ToValue(eventType), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("bubbles", runtime.ToValue(opts.bubbles), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("cancelable", runtime.ToValue(opts.cancelable), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("defaultPrevented", runtime.ToValue(false), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("target", goja.Null(), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("currentTarget", goja.Null(), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("srcElement", goja.Null(), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("eventPhase", runtime.ToValue(2), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("isTrusted", runtime.ToValue(false), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("returnValue", runtime.ToValue(true), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("cancelBubble", runtime.ToValue(false), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("composed", runtime.ToValue(false), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("__stopImmediate", runtime.ToValue(false), goja.FLAG_TRUE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	ev.DefineDataProperty("timeStamp", runtime.ToValue(float64(time.Now().UnixNano())/1e6), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	ev.DefineDataProperty("path", runtime.NewArray(), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_TRUE)

	return ev
}

// CreateEventConstructor 创建全局 Event 构造函数
func CreateEventConstructor(runtime *goja.Runtime) goja.Value {
	protos := getRuntimePrototypes(runtime)
	protos.eventPrototype = runtime.NewObject()

	protos.eventPrototype.Set("preventDefault", func(call goja.FunctionCall) goja.Value {
		obj := call.This.ToObject(runtime)
		if obj.Get("cancelable").ToBoolean() {
			obj.Set("defaultPrevented", true)
			obj.Set("returnValue", false)
		}
		return goja.Undefined()
	})

	protos.eventPrototype.Set("stopPropagation", func(call goja.FunctionCall) goja.Value {
		obj := call.This.ToObject(runtime)
		obj.Set("cancelBubble", true)
		return goja.Undefined()
	})

	protos.eventPrototype.Set("stopImmediatePropagation", func(call goja.FunctionCall) goja.Value {
		obj := call.This.ToObject(runtime)
		obj.Set("__stopImmediate", true)
		obj.Set("cancelBubble", true)
		return goja.Undefined()
	})

	eventConstructor := runtime.ToValue(func(call goja.ConstructorCall) *goja.Object {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Failed to construct 'Event': 1 argument required, but only 0 present."))
		}
		eventType := call.Argument(0).String()
		bubbles := false
		cancelable := false
		if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			if optsObj, ok := call.Arguments[1].(*goja.Object); ok {
				if b := optsObj.Get("bubbles"); b != nil && !goja.IsUndefined(b) && !goja.IsNull(b) {
					bubbles = b.ToBoolean()
				}
				if c := optsObj.Get("cancelable"); c != nil && !goja.IsUndefined(c) && !goja.IsNull(c) {
					cancelable = c.ToBoolean()
				}
			}
		}

		return createEventObject(runtime, eventType, eventOptions{
			bubbles:    bubbles,
			cancelable: cancelable,
		})
	})

	eventCtorObj := eventConstructor.ToObject(runtime)
	eventCtorObj.Set("prototype", protos.eventPrototype)
	eventCtorObj.DefineDataProperty("name", runtime.ToValue("Event"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	return eventConstructor
}

// CreateAbortSignalObject 创建 AbortSignal 对象
// 🔥 核心方法：创建完整的 AbortSignal 对象
func CreateAbortSignalObject(runtime *goja.Runtime, state *SignalState) *goja.Object {
	protos := getRuntimePrototypes(runtime)
	return CreateAbortSignalObjectWithPrototype(runtime, state, protos.abortSignalPrototype)
}

// TriggerAbortListeners 触发 abort 事件监听器
func TriggerAbortListeners(runtime *goja.Runtime, signal *goja.Object, state *SignalState) {
	// 创建 abort 事件
	event := createEventObject(runtime, "abort", eventOptions{
		bubbles:    false,
		cancelable: false,
	})
	event.Set("target", signal)
	event.Set("currentTarget", signal)
	event.Set("srcElement", signal)

	// 从 signal 对象读取 onabort（用户可能直接设置了 signal.onabort = fn）
	onabortHandler := signal.Get("onabort")

	// 获取 addEventListener 注册的监听器
	state.listenerMutex.Lock()
	listenersCopy := make([]goja.Value, len(state.listeners))
	copy(listenersCopy, state.listeners)
	state.listenerMutex.Unlock()

	// 触发 onabort
	if onabortHandler != nil && !goja.IsUndefined(onabortHandler) && !goja.IsNull(onabortHandler) {
		if fn, ok := goja.AssertFunction(onabortHandler); ok {
			fn(signal, event)
		}
		stop := event.Get("__stopImmediate")
		if stop != nil && stop.ToBoolean() {
			return
		}
	}

	// 触发 addEventListener 注册的监听器
	for _, listener := range listenersCopy {
		if listenerFn, ok := goja.AssertFunction(listener); ok {
			listenerFn(signal, event)
		}
		stop := event.Get("__stopImmediate")
		if stop != nil && stop.ToBoolean() {
			break
		}
	}
}

// ==================== AbortController 构造器 ====================

// CreateAbortControllerConstructor 创建 AbortController 构造器
// 🔥 浏览器兼容的 AbortController API
// 标准参考: https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController
//
// 功能说明:
// - 创建可取消的请求控制器
// - signal 属性：AbortSignal 对象，用于监听取消事件
// - abort(reason?) 方法：取消请求，可传入自定义 reason
// - 🔥 实现策略：使用 channel 作为取消信号（替代 context）
//   - 优势：可以在任何 goroutine 中安全地 close，支持多个 goroutine 同时监听
//
// 架构说明:
// - AbortController 创建一个 channel（__abortChannel）
// - fetch 函数监听该 channel（通过 select）
// - abort() 关闭 channel 发送取消信号
// - 事件监听器在 abort() 时被触发（通过 setImmediate 异步执行）
func CreateAbortControllerConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	// 初始化 AbortController 原型并设置 @@toStringTag（按 runtime 隔离）
	protos := getRuntimePrototypes(runtime)
	protos.abortControllerPrototype = runtime.NewObject()
	if err := protos.abortControllerPrototype.DefineDataPropertySymbol(goja.SymToStringTag, runtime.ToValue("AbortController"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
		protos.abortControllerPrototype.SetSymbol(goja.SymToStringTag, runtime.ToValue("AbortController"))
	}

	return func(call goja.ConstructorCall) *goja.Object {
		// 创建信号状态
		state := &SignalState{
			aborted:         false,
			reason:          nil,
			abortCh:         make(chan struct{}),
			listeners:       make([]goja.Value, 0),
			customListeners: make(map[string][]goja.Value),
			onabort:         nil,
		}

		// 创建 AbortSignal 对象（使用当前 runtime 的原型）
		protos := getRuntimePrototypes(runtime)
		signal := CreateAbortSignalObjectWithPrototype(runtime, state, protos.abortSignalPrototype)

		// 创建 AbortController 对象
		controller := runtime.NewObject()
		controller.SetPrototype(protos.abortControllerPrototype)
		controller.DefineDataProperty("signal", signal, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)

		// abort(reason?) 方法
		controller.Set("abort", func(call goja.FunctionCall) goja.Value {
			state.abortedMutex.Lock()
			if !state.aborted {
				state.aborted = true

				// 设置 reason
				if len(call.Arguments) == 0 || goja.IsUndefined(call.Arguments[0]) {
					// 默认 reason 是 DOMException AbortError（与 Node.js 行为一致）
					state.reason = CreateDOMException(runtime, "This operation was aborted", "AbortError")
				} else {
					state.reason = call.Arguments[0]
				}
				state.abortedMutex.Unlock()

				// 🔥 关闭 channel 发送取消信号
				func() {
					defer func() {
						if r := recover(); r != nil {
							// channel 已经被关闭,忽略 panic
						}
					}()
					close(state.abortCh)
				}()

				// 更新 signal 状态
				signal.DefineDataProperty("aborted", runtime.ToValue(true), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
				signal.DefineDataProperty("reason", state.reason, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)

				// 🔥 同步触发事件监听器（与 Node.js 行为一致）
				// Node.js 中 abort() 调用后监听器是同步执行的
				TriggerAbortListeners(runtime, signal, state)
			} else {
				state.abortedMutex.Unlock()
			}
			return goja.Undefined()
		})

		return controller
	}
}

// WrapAbortController 为 AbortController 构造器增加 new 调用校验
func WrapAbortController(runtime *goja.Runtime, nativeCtor goja.Value) goja.Value {
	factoryVal, err := runtime.RunString(`
		(function(nativeCtor){
			return function AbortController(){
				if (!new.target) {
					throw new TypeError("Class constructor AbortController cannot be invoked without 'new'");
				}
				return nativeCtor.apply(this, arguments);
			};
		})
	`)
	if err != nil {
		panic(err)
	}

	factory, ok := goja.AssertFunction(factoryVal)
	if !ok {
		return nativeCtor
	}

	wrapped, err := factory(goja.Undefined(), nativeCtor)
	if err != nil {
		panic(err)
	}

	if wrappedObj := wrapped.ToObject(runtime); wrappedObj != nil {
		if nativeObj := nativeCtor.ToObject(runtime); nativeObj != nil {
			if proto := nativeObj.Get("prototype"); proto != nil {
				wrappedObj.Set("prototype", proto)
				// 确保 constructor 指回包装后的函数
				if protoObj, ok := proto.(*goja.Object); ok {
					protoObj.Set("constructor", wrappedObj)
				}
			}
		}
	}

	return wrapped
}

// ==================== AbortSignal 构造器和静态方法 ====================

// CreateAbortSignalConstructor 创建 AbortSignal 构造函数
// 🔥 浏览器兼容的 AbortSignal API
// 标准参考: https://developer.mozilla.org/zh-CN/docs/Web/API/AbortSignal
//
// 静态方法:
// - AbortSignal.abort(reason?) - 创建已中止的 signal
// - AbortSignal.timeout(ms) - 创建超时后中止的 signal
// - AbortSignal.any(signals) - 创建组合 signal
func CreateAbortSignalConstructor(runtime *goja.Runtime) goja.Value {
	protos := getRuntimePrototypes(runtime)
	// 创建 AbortSignal 原型对象（按 runtime 隔离）
	protos.abortSignalPrototype = runtime.NewObject()
	if err := protos.abortSignalPrototype.DefineDataPropertySymbol(goja.SymToStringTag, runtime.ToValue("AbortSignal"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
		protos.abortSignalPrototype.SetSymbol(goja.SymToStringTag, runtime.ToValue("AbortSignal"))
	}

	// 创建 AbortSignal 构造函数（不允许直接 new）
	abortSignalConstructor := runtime.ToValue(func(call goja.ConstructorCall) *goja.Object {
		panic(runtime.NewTypeError("Illegal constructor"))
	})

	// 获取构造函数对象
	abortSignalFunc := abortSignalConstructor.ToObject(runtime)
	// 设置 name 属性以与 Node 保持一致（不可写、不可枚举、可配置）
	abortSignalFunc.DefineDataProperty("name", runtime.ToValue("AbortSignal"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	// 设置 prototype 属性（用于 instanceof 检查）
	abortSignalFunc.Set("prototype", protos.abortSignalPrototype)

	// AbortSignal.abort(reason?) - 创建已中止的 signal
	abortSignalFunc.Set("abort", func(call goja.FunctionCall) goja.Value {
		state := &SignalState{
			aborted:         true,
			abortCh:         make(chan struct{}),
			listeners:       make([]goja.Value, 0),
			customListeners: make(map[string][]goja.Value),
			onabort:         nil,
		}

		// 设置 reason
		if len(call.Arguments) >= 1 && !goja.IsUndefined(call.Arguments[0]) {
			state.reason = call.Arguments[0]
		} else {
			state.reason = CreateDOMException(runtime, "This operation was aborted", "AbortError")
		}

		// 关闭 channel
		close(state.abortCh)

		signal := CreateAbortSignalObjectWithPrototype(runtime, state, protos.abortSignalPrototype)
		signal.DefineDataProperty("aborted", runtime.ToValue(true), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
		signal.DefineDataProperty("reason", state.reason, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)

		return signal
	})

	// AbortSignal.timeout(ms) - 创建超时后中止的 signal
	abortSignalFunc.Set("timeout", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("AbortSignal.timeout requires 1 argument"))
		}

		ms := call.Arguments[0].ToFloat()
		if ms < 0 || ms != ms { // NaN check
			panic(runtime.NewTypeError("timeout must be a non-negative number"))
		}

		state := &SignalState{
			aborted:         false,
			reason:          nil,
			abortCh:         make(chan struct{}),
			listeners:       make([]goja.Value, 0),
			customListeners: make(map[string][]goja.Value),
			onabort:         nil,
		}

		protos := getRuntimePrototypes(runtime)
		signal := CreateAbortSignalObjectWithPrototype(runtime, state, protos.abortSignalPrototype)

		// 使用 setTimeoutUnref（若存在）或普通 setTimeout 来实现超时（在 JS 线程中执行）
		// Node 中 timeout 计时器默认 unref，不会阻塞事件循环退出；这里优先使用我们注入的 unref 版本
		setTimeout := runtime.Get("setTimeoutUnref")
		if goja.IsUndefined(setTimeout) || goja.IsNull(setTimeout) {
			setTimeout = runtime.Get("setTimeout")
		}
		if setTimeout != nil && !goja.IsUndefined(setTimeout) && !goja.IsNull(setTimeout) {
			if fn, ok := goja.AssertFunction(setTimeout); ok {
				timeoutCallback := runtime.ToValue(func(innerCall goja.FunctionCall) goja.Value {
					state.abortedMutex.Lock()
					if !state.aborted {
						state.aborted = true
						state.reason = CreateDOMException(runtime, "The operation was aborted due to timeout", "TimeoutError")
						state.abortedMutex.Unlock()

						// 关闭 channel
						func() {
							defer func() { recover() }()
							close(state.abortCh)
						}()

						// 更新 signal
						signal.DefineDataProperty("aborted", runtime.ToValue(true), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
						signal.DefineDataProperty("reason", state.reason, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
						TriggerAbortListeners(runtime, signal, state)
					} else {
						state.abortedMutex.Unlock()
					}
					return goja.Undefined()
				})
				fn(goja.Undefined(), timeoutCallback, runtime.ToValue(ms))
			}
		}

		return signal
	})

	// AbortSignal.any(signals) - 创建组合 signal
	abortSignalFunc.Set("any", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("AbortSignal.any requires 1 argument"))
		}

		signals := call.Arguments[0]
		if goja.IsNull(signals) || goja.IsUndefined(signals) {
			panic(runtime.NewTypeError("AbortSignal.any requires an iterable"))
		}

		// 提取信号数组
		type signalEntry struct {
			obj   *goja.Object
			state *SignalState
		}
		var signalEntries []signalEntry

		// 🔥 辅助函数：从 goja.Object 提取 signal entry
		extractSignal := func(itemObj *goja.Object) signalEntry {
			if itemObj == nil {
				panic(runtime.NewTypeError("All elements of the iterable must be AbortSignal instances"))
			}
			// 检查是否是 AbortSignal
			isSignal := itemObj.Get("__isAbortSignal")
			if isSignal == nil || goja.IsUndefined(isSignal) || goja.IsNull(isSignal) || !isSignal.ToBoolean() {
				panic(runtime.NewTypeError("All elements of the iterable must be AbortSignal instances"))
			}

			entry := signalEntry{obj: itemObj}

			// 提取 state
			stateVal := itemObj.Get("__signalState")
			if !goja.IsUndefined(stateVal) && !goja.IsNull(stateVal) {
				if st, ok := stateVal.Export().(*SignalState); ok {
					entry.state = st
				}
			}

			return entry
		}

		// 转换为对象
		var signalsObj *goja.Object
		var length int
		var hasLength bool

		var ok bool
		signalsObj, ok = signals.(*goja.Object)
		if !ok {
			signalsObj = signals.ToObject(runtime)
		}
		if signalsObj == nil {
			panic(runtime.NewTypeError("AbortSignal.any requires an iterable"))
		}

		// 检查是否有 length 属性（类数组对象）
		// 🔥 注意：对于 Set 等没有 length 属性的对象，Get("length") 返回 Go 的 nil
		lengthVal := signalsObj.Get("length")
		// 🔥 必须先检查 lengthVal == nil，否则 goja.IsUndefined(nil) 会 panic
		if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			// 额外检查：length 必须是数字类型
			lengthExport := lengthVal.Export()
			switch v := lengthExport.(type) {
			case int64:
				length = int(v)
				hasLength = true
			case float64:
				length = int(v)
				hasLength = true
			case int:
				length = v
				hasLength = true
			}
		}

		// 🔥 尝试多种方式遍历可迭代对象
		if hasLength {
			// 类数组对象（包括 Array）
			for i := 0; i < length; i++ {
				item := signalsObj.Get(fmt.Sprintf("%d", i))
				// 🔥 item 也可能是 nil
				if item == nil || goja.IsUndefined(item) || goja.IsNull(item) {
					panic(runtime.NewTypeError("All elements of the iterable must be AbortSignal instances"))
				}
				itemObj, ok := item.(*goja.Object)
				if !ok || itemObj == nil {
					panic(runtime.NewTypeError("All elements of the iterable must be AbortSignal instances"))
				}
				signalEntries = append(signalEntries, extractSignal(itemObj))
			}
		} else {
			// 🔥 使用 goja.SymIterator 获取迭代器方法（用于 Set、生成器等）
			iteratorFound := false

			iteratorMethod := signalsObj.GetSymbol(goja.SymIterator)
			if iteratorMethod != nil && !goja.IsUndefined(iteratorMethod) {
				if iterFn, ok := goja.AssertFunction(iteratorMethod); ok {
					// 调用迭代器方法获取迭代器
					iteratorResult, err := iterFn(signalsObj)
					if err == nil && iteratorResult != nil {
						if iter, ok := iteratorResult.(*goja.Object); ok {
							nextFn := iter.Get("next")
							if nextFn != nil && !goja.IsUndefined(nextFn) {
								if nextFunc, ok := goja.AssertFunction(nextFn); ok {
									iteratorFound = true
									// 遍历迭代器
									for {
										result, err := nextFunc(iter)
										if err != nil {
											break
										}
										if result == nil {
											break
										}
										resultObj, ok := result.(*goja.Object)
										if !ok {
											break
										}
										done := resultObj.Get("done")
										if done != nil && !goja.IsUndefined(done) && done.ToBoolean() {
											break
										}
										value := resultObj.Get("value")
										if value == nil || goja.IsUndefined(value) || goja.IsNull(value) {
											panic(runtime.NewTypeError("All elements of the iterable must be AbortSignal instances"))
										}
										valueObj, ok := value.(*goja.Object)
										if !ok || valueObj == nil {
											panic(runtime.NewTypeError("All elements of the iterable must be AbortSignal instances"))
										}
										signalEntries = append(signalEntries, extractSignal(valueObj))
									}
								}
							}
						}
					}
				}
			}

			// 🔥 如果没有找到迭代器，也没有 length，则不是有效的可迭代对象
			if !iteratorFound {
				panic(runtime.NewTypeError("AbortSignal.any requires an iterable"))
			}
		}

		// 创建新的组合 signal
		state := &SignalState{
			aborted:         false,
			reason:          nil,
			abortCh:         make(chan struct{}),
			listeners:       make([]goja.Value, 0),
			customListeners: make(map[string][]goja.Value),
			onabort:         nil,
		}

		// 检查是否有已中止的 signal
		for _, entry := range signalEntries {
			// 优先检查对象的 aborted 属性（更可靠）
			abortedVal := entry.obj.Get("aborted")
			if abortedVal != nil && !goja.IsUndefined(abortedVal) && abortedVal.ToBoolean() {
				state.aborted = true
				reasonVal := entry.obj.Get("reason")
				if reasonVal != nil && !goja.IsUndefined(reasonVal) {
					state.reason = reasonVal
				}
				func() {
					defer func() { recover() }()
					close(state.abortCh)
				}()
				break
			}
		}

		protos := getRuntimePrototypes(runtime)
		signal := CreateAbortSignalObjectWithPrototype(runtime, state, protos.abortSignalPrototype)
		if state.aborted {
			signal.DefineDataProperty("aborted", runtime.ToValue(true), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
			signal.DefineDataProperty("reason", state.reason, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
		}

		// 如果还没中止，为每个源 signal 添加 abort 事件监听器
		if !state.aborted {
			for _, entry := range signalEntries {
				srcObjLocal := entry.obj

				// 创建监听器函数
				listener := runtime.ToValue(func(eventCall goja.FunctionCall) goja.Value {
					state.abortedMutex.Lock()
					if !state.aborted {
						state.aborted = true
						// 从源 signal 获取 reason
						reasonVal := srcObjLocal.Get("reason")
						if reasonVal != nil && !goja.IsUndefined(reasonVal) {
							state.reason = reasonVal
						}
						state.abortedMutex.Unlock()

						// 关闭自己的 channel
						func() {
							defer func() { recover() }()
							close(state.abortCh)
						}()

						// 更新 signal
						signal.DefineDataProperty("aborted", runtime.ToValue(true), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
						signal.DefineDataProperty("reason", state.reason, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
						TriggerAbortListeners(runtime, signal, state)
					} else {
						state.abortedMutex.Unlock()
					}
					return goja.Undefined()
				})

				// 为源 signal 添加监听器
				addListenerVal := srcObjLocal.Get("addEventListener")
				if addListenerVal != nil && !goja.IsUndefined(addListenerVal) {
					if addListenerFn, ok := goja.AssertFunction(addListenerVal); ok {
						addListenerFn(srcObjLocal, runtime.ToValue("abort"), listener)
					}
				}
			}
		}

		return signal
	})

	return abortSignalFunc
}

// CreateAbortSignalObjectWithPrototype 创建带原型的 AbortSignal 对象
func CreateAbortSignalObjectWithPrototype(runtime *goja.Runtime, state *SignalState, prototype *goja.Object) *goja.Object {
	signal := runtime.NewObject()

	// 设置原型链（用于 instanceof 检查）
	if prototype != nil {
		signal.SetPrototype(prototype)
	}

	// 标记为 AbortSignal 实例
	signal.Set("__isAbortSignal", true)
	signal.Set("__signalState", state)
	signal.Set("__abortChannel", state.abortCh)

	// aborted 属性
	signal.DefineDataProperty("aborted", runtime.ToValue(state.aborted), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)

	// reason 属性
	if state.reason != nil {
		signal.DefineDataProperty("reason", state.reason, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	} else {
		signal.DefineDataProperty("reason", goja.Undefined(), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
	}

	applyAbortSignalEventAPI(runtime, signal, state)

	return signal
}

// applyAbortSignalEventAPI 统一绑定 AbortSignal 的事件相关 API
func applyAbortSignalEventAPI(runtime *goja.Runtime, signal *goja.Object, state *SignalState) {
	signal.Set("onabort", goja.Null())

	shouldStop := func(ev *goja.Object) bool {
		stop := ev.Get("__stopImmediate")
		return stop != nil && !goja.IsUndefined(stop) && stop.ToBoolean()
	}

	signal.Set("addEventListener", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			return goja.Undefined()
		}

		eventType := call.Arguments[0].String()
		listener := call.Arguments[1]
		if goja.IsUndefined(listener) || goja.IsNull(listener) {
			return goja.Undefined()
		}

		once := false
		var optionsSignal *goja.Object
		if len(call.Arguments) >= 3 && !goja.IsUndefined(call.Arguments[2]) && !goja.IsNull(call.Arguments[2]) {
			if optionsObj, ok := call.Arguments[2].(*goja.Object); ok {
				if onceVal := optionsObj.Get("once"); onceVal != nil && !goja.IsUndefined(onceVal) && !goja.IsNull(onceVal) {
					once = onceVal.ToBoolean()
				}
				if sigVal := optionsObj.Get("signal"); sigVal != nil && !goja.IsUndefined(sigVal) && !goja.IsNull(sigVal) {
					if sigObj, ok := sigVal.(*goja.Object); ok {
						isSignal := sigObj.Get("__isAbortSignal")
						if isSignal == nil || goja.IsUndefined(isSignal) || goja.IsNull(isSignal) || !isSignal.ToBoolean() {
							panic(runtime.NewTypeError("signal is not a valid AbortSignal"))
						}
						if aborted := sigObj.Get("aborted"); aborted != nil && !goja.IsUndefined(aborted) && aborted.ToBoolean() {
							return goja.Undefined()
						}
						optionsSignal = sigObj
					} else {
						panic(runtime.NewTypeError("signal is not a valid AbortSignal"))
					}
				}
			} else if call.Arguments[2].ToBoolean() {
				// boolean useCapture，忽略即可
			}
		}

		state.listenerMutex.Lock()
		defer state.listenerMutex.Unlock()

		if eventType == "abort" {
			for _, l := range state.listeners {
				if isSameListener(runtime, l, listener) {
					return goja.Undefined()
				}
			}

			var stored goja.Value
			if once {
				var wrapped goja.Value
				wrapped = runtime.ToValue(func(innerCall goja.FunctionCall) goja.Value {
					state.listenerMutex.Lock()
					state.listeners = removeListenerFromSlice(runtime, state.listeners, wrapped)
					state.listenerMutex.Unlock()

					if fn, ok := goja.AssertFunction(listener); ok {
						fn(signal, innerCall.Arguments...)
					}
					return goja.Undefined()
				})
				wrapped.ToObject(runtime).Set("__originalListener", listener)
				state.listeners = append(state.listeners, wrapped)
				stored = wrapped
			} else {
				state.listeners = append(state.listeners, listener)
				stored = listener
			}

			if optionsSignal != nil && !goja.IsUndefined(stored) && !goja.IsNull(stored) {
				removeOnAbort := runtime.ToValue(func(goja.FunctionCall) goja.Value {
					state.listenerMutex.Lock()
					state.listeners = removeListenerFromSlice(runtime, state.listeners, stored)
					state.listenerMutex.Unlock()
					return goja.Undefined()
				})
				if addFn, ok := goja.AssertFunction(optionsSignal.Get("addEventListener")); ok {
					addFn(optionsSignal, runtime.ToValue("abort"), removeOnAbort)
				}
			}
		} else {
			if state.customListeners == nil {
				state.customListeners = make(map[string][]goja.Value)
			}
			current := state.customListeners[eventType]
			for _, l := range current {
				if isSameListener(runtime, l, listener) {
					return goja.Undefined()
				}
			}

			var stored goja.Value
			if once {
				var wrapped goja.Value
				wrapped = runtime.ToValue(func(innerCall goja.FunctionCall) goja.Value {
					state.listenerMutex.Lock()
					state.customListeners[eventType] = removeListenerFromSlice(runtime, state.customListeners[eventType], wrapped)
					state.listenerMutex.Unlock()

					if fn, ok := goja.AssertFunction(listener); ok {
						fn(signal, innerCall.Arguments...)
					}
					return goja.Undefined()
				})
				wrapped.ToObject(runtime).Set("__originalListener", listener)
				current = append(current, wrapped)
				stored = wrapped
			} else {
				current = append(current, listener)
				stored = listener
			}
			state.customListeners[eventType] = current

			if optionsSignal != nil && !goja.IsUndefined(stored) && !goja.IsNull(stored) {
				removeOnAbort := runtime.ToValue(func(goja.FunctionCall) goja.Value {
					state.listenerMutex.Lock()
					state.customListeners[eventType] = removeListenerFromSlice(runtime, state.customListeners[eventType], stored)
					state.listenerMutex.Unlock()
					return goja.Undefined()
				})
				if addFn, ok := goja.AssertFunction(optionsSignal.Get("addEventListener")); ok {
					addFn(optionsSignal, runtime.ToValue("abort"), removeOnAbort)
				}
			}
		}

		return goja.Undefined()
	})

	signal.Set("removeEventListener", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			return goja.Undefined()
		}
		eventType := call.Arguments[0].String()
		target := call.Arguments[1]

		state.listenerMutex.Lock()
		defer state.listenerMutex.Unlock()

		if eventType == "abort" {
			state.listeners = removeListenerFromSlice(runtime, state.listeners, target)
		} else {
			if state.customListeners != nil {
				state.customListeners[eventType] = removeListenerFromSlice(runtime, state.customListeners[eventType], target)
			}
		}
		return goja.Undefined()
	})

	signal.Set("dispatchEvent", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Failed to execute 'dispatchEvent': 1 argument required"))
		}

		eventVal := call.Arguments[0]
		eventObj, ok := eventVal.(*goja.Object)
		if !ok {
			panic(runtime.NewTypeError("Failed to execute 'dispatchEvent': parameter 1 is not of type 'Event'"))
		}

		eventTypeVal := eventObj.Get("type")
		if goja.IsUndefined(eventTypeVal) || goja.IsNull(eventTypeVal) {
			return runtime.ToValue(true)
		}
		eventType := eventTypeVal.String()

		eventObj.Set("target", signal)
		eventObj.Set("currentTarget", signal)
		eventObj.Set("srcElement", signal)

		cancelable := eventObj.Get("cancelable").ToBoolean()
		if goja.IsUndefined(eventObj.Get("defaultPrevented")) {
			eventObj.Set("defaultPrevented", false)
		}
		if goja.IsUndefined(eventObj.Get("__stopImmediate")) {
			eventObj.Set("__stopImmediate", false)
		}

		state.listenerMutex.Lock()
		var listenersCopy []goja.Value
		if eventType == "abort" {
			listenersCopy = make([]goja.Value, len(state.listeners))
			copy(listenersCopy, state.listeners)
		} else {
			if state.customListeners != nil {
				listenersCopy = make([]goja.Value, len(state.customListeners[eventType]))
				copy(listenersCopy, state.customListeners[eventType])
			}
		}
		onabort := goja.Undefined()
		if eventType == "abort" {
			onabort = signal.Get("onabort")
		}
		state.listenerMutex.Unlock()

		if eventType == "abort" && onabort != nil && !goja.IsUndefined(onabort) && !goja.IsNull(onabort) {
			if fn, ok := goja.AssertFunction(onabort); ok {
				fn(signal, eventObj)
			}
			if shouldStop(eventObj) {
				result := true
				if cancelable && eventObj.Get("defaultPrevented").ToBoolean() {
					result = false
				}
				return runtime.ToValue(result)
			}
		}

		for _, listener := range listenersCopy {
			if fn, ok := goja.AssertFunction(listener); ok {
				fn(signal, eventObj)
			}
			if shouldStop(eventObj) {
				break
			}
		}

		result := true
		if cancelable && eventObj.Get("defaultPrevented").ToBoolean() {
			result = false
		}
		return runtime.ToValue(result)
	})

	signal.Set("throwIfAborted", func(call goja.FunctionCall) goja.Value {
		state.abortedMutex.Lock()
		isAborted := state.aborted
		reason := state.reason
		state.abortedMutex.Unlock()

		if isAborted {
			if reason != nil && !goja.IsUndefined(reason) {
				panic(reason)
			}
			panic(CreateDOMException(runtime, "This operation was aborted", "AbortError"))
		}
		return goja.Undefined()
	})
}

// ==================== 注释说明 ====================
// 🔥 设计原则：
//
// 1. **浏览器兼容性**：
//    - Headers/Request/AbortController 完全兼容浏览器 API
//    - 支持所有标准方法和属性
//    - 保持浏览器行为（如 header 名称小写）
//
// 2. **类型安全**：
//    - 保留 body 的原始类型（FormData, Blob, string 等）
//    - 避免过早转换导致类型丢失
//    - 使用 goja.Value 传递 JavaScript 对象
//
// 3. **线程安全**：
//    - AbortController 使用 channel 作为取消信号
//    - 使用 mutex 保护共享状态（aborted, listeners）
//    - 使用 defer + recover 防止重复 close channel
//
// 4. **异步特性**：
//    - 事件监听器通过 setImmediate 异步触发
//    - 兼容 Runtime Pool 模式（同步触发）
//    - 避免死锁和阻塞
//
// 5. **迭代器支持**：
//    - Headers 支持 entries/keys/values 迭代器
//    - 返回标准的 Iterator 对象（next 方法）
//    - 兼容 for...of 循环（需要 Symbol.iterator）
