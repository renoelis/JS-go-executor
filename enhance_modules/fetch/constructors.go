package fetch

import (
	"fmt"
	neturl "net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/dop251/goja"
)

func setHeaderWithValidation(headers map[string]string, runtime *goja.Runtime, ctx, name, value string) {
	ensureValidHeaderName(runtime, ctx, name)
	normalized := normalizeHeaderValue(value)
	ensureValidHeaderValue(runtime, ctx, normalized)
	headers[strings.ToLower(name)] = normalized
}

func appendHeaderWithValidation(headers map[string]string, runtime *goja.Runtime, ctx, name, value string) {
	ensureValidHeaderName(runtime, ctx, name)
	normalized := normalizeHeaderValue(value)
	ensureValidHeaderValue(runtime, ctx, normalized)
	key := strings.ToLower(name)
	if existing, ok := headers[key]; ok && existing != "" {
		headers[key] = existing + ", " + normalized
	} else {
		headers[key] = normalized
	}
}

// sortedHeaderKeys 返回按字母顺序排序的 header 名称列表
func sortedHeaderKeys(headers map[string]string) []string {
	keys := make([]string, 0, len(headers))
	for key := range headers {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

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
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			if normalized, err := normalizeHeadersInit(runtime, call.Arguments[0], "Headers.append"); err == nil {
				for key, value := range normalized {
					headers[strings.ToLower(key)] = normalizeHeaderValue(fmt.Sprintf("%v", value))
				}
			} else {
				panic(runtime.NewTypeError("初始化 Headers 失败: " + err.Error()))
			}
		}

		obj := ensureConstructorThis(runtime, "Headers", call.This)

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
			name := call.Arguments[0].String()
			value := call.Arguments[1].String()
			setHeaderWithValidation(headers, runtime, "Headers.set", name, value)
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
			name := call.Arguments[0].String()
			value := call.Arguments[1].String()
			appendHeaderWithValidation(headers, runtime, "Headers.append", name, value)
			return goja.Undefined()
		})

		// forEach(callback) - 遍历所有头部（字母序）
		obj.Set("forEach", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return goja.Undefined()
			}
			callback, ok := goja.AssertFunction(call.Arguments[0])
			if !ok {
				return goja.Undefined()
			}

			for _, key := range sortedHeaderKeys(headers) {
				value := headers[key]
				callback(goja.Undefined(), runtime.ToValue(value), runtime.ToValue(key), obj)
			}
			return goja.Undefined()
		})

		// entries() - 返回 [key, value] 迭代器
		obj.Set("entries", func(call goja.FunctionCall) goja.Value {
			entries := make([]interface{}, 0, len(headers))
			for _, key := range sortedHeaderKeys(headers) {
				entries = append(entries, []interface{}{key, headers[key]})
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
			keys := sortedHeaderKeys(headers)

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

		// values() - 返回 value 迭代器（字母序）
		obj.Set("values", func(call goja.FunctionCall) goja.Value {
			keys := sortedHeaderKeys(headers)
			values := make([]string, 0, len(keys))
			for _, key := range keys {
				values = append(values, headers[key])
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

// ensureConstructorThis 确保构造函数返回带有正确原型的 this 对象
func ensureConstructorThis(runtime *goja.Runtime, constructorName string, thisObj *goja.Object) *goja.Object {
	if runtime == nil {
		return thisObj
	}
	if thisObj != nil && thisObj != runtime.GlobalObject() {
		return thisObj
	}
	obj := runtime.NewObject()
	attachConstructorPrototype(runtime, constructorName, obj)
	return obj
}

// attachConstructorPrototype 将指定构造函数的 prototype 关联到对象
func attachConstructorPrototype(runtime *goja.Runtime, constructorName string, target *goja.Object) {
	if runtime == nil || target == nil || constructorName == "" {
		return
	}

	constructorVal := runtime.Get(constructorName)
	if constructorVal == nil || goja.IsUndefined(constructorVal) || goja.IsNull(constructorVal) {
		return
	}

	constructorObj := constructorVal.ToObject(runtime)
	if constructorObj == nil {
		return
	}

	prototypeVal := constructorObj.Get("prototype")
	if prototypeVal == nil || goja.IsUndefined(prototypeVal) || goja.IsNull(prototypeVal) {
		return
	}

	if protoObj := prototypeVal.ToObject(runtime); protoObj != nil {
		target.SetPrototype(protoObj)
	}
}

type requestCloneContext struct {
	url                string
	method             string
	body               interface{}
	headers            map[string]string
	cacheValue         string
	credentialsValue   string
	modeValue          string
	redirectValue      string
	referrerValue      string
	referrerPolicyValue string
	integrityValue     string
	keepaliveValue     bool
	destinationValue   string
	signal             goja.Value
}

func defineRequestReadonlyProperty(runtime *goja.Runtime, obj *goja.Object, name string, value interface{}) {
	if runtime == nil || obj == nil {
		return
	}
	obj.DefineDataProperty(name, runtime.ToValue(value), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
}

func attachRequestCloneMethod(runtime *goja.Runtime, requestObj *goja.Object, ctx *requestCloneContext) {
	if runtime == nil || requestObj == nil || ctx == nil {
		return
	}

	requestObj.Set("clone", func(call goja.FunctionCall) goja.Value {
		clonedHeaders := make(map[string]string, len(ctx.headers))
		for k, v := range ctx.headers {
			clonedHeaders[k] = v
		}

		clonedRequest := runtime.NewObject()
		attachConstructorPrototype(runtime, "Request", clonedRequest)
		clonedRequest.Set("url", runtime.ToValue(ctx.url))
		clonedRequest.Set("method", runtime.ToValue(ctx.method))

		if gojaVal, ok := ctx.body.(goja.Value); ok {
			clonedRequest.Set("body", gojaVal)
		} else if ctx.body != nil {
			clonedRequest.Set("body", runtime.ToValue(ctx.body))
		} else {
			clonedRequest.Set("body", goja.Null())
		}

		clonedRequest.Set("headers", createHeadersObject(runtime, clonedHeaders))
		clonedRequest.Set("bodyUsed", runtime.ToValue(false))

		defineRequestReadonlyProperty(runtime, clonedRequest, "cache", ctx.cacheValue)
		defineRequestReadonlyProperty(runtime, clonedRequest, "credentials", ctx.credentialsValue)
		defineRequestReadonlyProperty(runtime, clonedRequest, "mode", ctx.modeValue)
		defineRequestReadonlyProperty(runtime, clonedRequest, "redirect", ctx.redirectValue)
		defineRequestReadonlyProperty(runtime, clonedRequest, "referrer", ctx.referrerValue)
		defineRequestReadonlyProperty(runtime, clonedRequest, "referrerPolicy", ctx.referrerPolicyValue)
		defineRequestReadonlyProperty(runtime, clonedRequest, "integrity", ctx.integrityValue)
		defineRequestReadonlyProperty(runtime, clonedRequest, "keepalive", ctx.keepaliveValue)
		defineRequestReadonlyProperty(runtime, clonedRequest, "destination", ctx.destinationValue)

		var clonedSignal goja.Value
		if ctx.signal != nil && !goja.IsUndefined(ctx.signal) && !goja.IsNull(ctx.signal) {
			if signalObj, ok := ctx.signal.(*goja.Object); ok {
				if stateVal := signalObj.Get("__signalState"); stateVal != nil && !goja.IsUndefined(stateVal) {
					if st, ok := stateVal.Export().(*SignalState); ok {
						if protos := getRuntimePrototypes(runtime); protos != nil && protos.abortSignalPrototype != nil {
							clonedSignal = CreateAbortSignalObjectWithPrototype(runtime, st, protos.abortSignalPrototype)
						}
					}
				}
			}
			if clonedSignal == nil {
				clonedSignal = ctx.signal
			}
			clonedRequest.DefineDataProperty("signal", clonedSignal, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
		} else {
			clonedSignal = goja.Null()
			clonedRequest.DefineDataProperty("signal", clonedSignal, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
		}

		cloneCtx := &requestCloneContext{
			url:                 ctx.url,
			method:              ctx.method,
			body:                ctx.body,
			headers:             clonedHeaders,
			cacheValue:          ctx.cacheValue,
			credentialsValue:    ctx.credentialsValue,
			modeValue:           ctx.modeValue,
			redirectValue:       ctx.redirectValue,
			referrerValue:       ctx.referrerValue,
			referrerPolicyValue: ctx.referrerPolicyValue,
			integrityValue:      ctx.integrityValue,
			keepaliveValue:      ctx.keepaliveValue,
			destinationValue:    ctx.destinationValue,
			signal:              clonedSignal,
		}
		attachRequestCloneMethod(runtime, clonedRequest, cloneCtx)
		return clonedRequest
	})
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
		name := call.Arguments[0].String()
		value := call.Arguments[1].String()
		setHeaderWithValidation(headers, runtime, "Headers.set", name, value)
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
		name := call.Arguments[0].String()
		value := call.Arguments[1].String()
		appendHeaderWithValidation(headers, runtime, "Headers.append", name, value)
		return goja.Undefined()
	})

	// forEach(callback) - 遍历所有头部（字母序）
	obj.Set("forEach", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Undefined()
		}
		callback, ok := goja.AssertFunction(call.Arguments[0])
		if !ok {
			return goja.Undefined()
		}

		for _, key := range sortedHeaderKeys(headers) {
			value := headers[key]
			callback(goja.Undefined(), runtime.ToValue(value), runtime.ToValue(key), obj)
		}
		return goja.Undefined()
	})

	// entries() - 返回 [key, value] 迭代器
	obj.Set("entries", func(call goja.FunctionCall) goja.Value {
		entries := make([]interface{}, 0, len(headers))
		for _, key := range sortedHeaderKeys(headers) {
			entries = append(entries, []interface{}{key, headers[key]})
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

	// keys() - 返回 key 迭代器（字母序）
	obj.Set("keys", func(call goja.FunctionCall) goja.Value {
		keys := sortedHeaderKeys(headers)

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

	// values() - 返回 value 迭代器（字母序对应）
	obj.Set("values", func(call goja.FunctionCall) goja.Value {
		keys := sortedHeaderKeys(headers)
		values := make([]string, 0, len(keys))
		for _, key := range keys {
			values = append(values, headers[key])
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

	attachConstructorPrototype(runtime, "Headers", obj)

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
			if cacheVal := inputObj.Get("cache"); cacheVal != nil && !goja.IsUndefined(cacheVal) && !goja.IsNull(cacheVal) {
				options["cache"] = cacheVal.String()
			}
			if credentialsVal := inputObj.Get("credentials"); credentialsVal != nil && !goja.IsUndefined(credentialsVal) && !goja.IsNull(credentialsVal) {
				options["credentials"] = credentialsVal.String()
			}
			if modeVal := inputObj.Get("mode"); modeVal != nil && !goja.IsUndefined(modeVal) && !goja.IsNull(modeVal) {
				options["mode"] = modeVal.String()
			}
			if redirectVal := inputObj.Get("redirect"); redirectVal != nil && !goja.IsUndefined(redirectVal) && !goja.IsNull(redirectVal) {
				options["redirect"] = redirectVal.String()
			}
			if referrerVal := inputObj.Get("referrer"); referrerVal != nil && !goja.IsUndefined(referrerVal) && !goja.IsNull(referrerVal) {
				options["referrer"] = referrerVal.String()
			}
			if referrerPolicyVal := inputObj.Get("referrerPolicy"); referrerPolicyVal != nil && !goja.IsUndefined(referrerPolicyVal) && !goja.IsNull(referrerPolicyVal) {
				options["referrerPolicy"] = referrerPolicyVal.String()
			}
			if integrityVal := inputObj.Get("integrity"); integrityVal != nil && !goja.IsUndefined(integrityVal) && !goja.IsNull(integrityVal) {
				options["integrity"] = integrityVal.String()
			}
			if keepaliveVal := inputObj.Get("keepalive"); keepaliveVal != nil && !goja.IsUndefined(keepaliveVal) && !goja.IsNull(keepaliveVal) {
				options["keepalive"] = keepaliveVal.ToBoolean()
			}
			if destinationVal := inputObj.Get("destination"); destinationVal != nil && !goja.IsUndefined(destinationVal) && !goja.IsNull(destinationVal) {
				options["destination"] = destinationVal.String()
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
		if parsed, err := neturl.ParseRequestURI(url); err != nil || parsed == nil || parsed.Scheme == "" {
			panic(runtime.NewTypeError(fmt.Sprintf("Failed to parse URL from %s", url)))
		}

		// 方法
		methodSource := "GET"
		if rawMethod, ok := options["method"]; ok {
			switch v := rawMethod.(type) {
			case string:
				if v != "" {
					methodSource = v
				}
			case goja.Value:
				if !goja.IsUndefined(v) && !goja.IsNull(v) {
					methodSource = v.String()
				}
			default:
				if rawMethod != nil {
					methodSource = fmt.Sprintf("%v", rawMethod)
				}
			}
		}
		validateHTTPMethod(runtime, methodSource)
		method := strings.ToUpper(methodSource)

		// 解析 headers
		headers := make(map[string]string)
		parseHeaders := func(val goja.Value) bool {
			if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
				return false
			}
			normalized, err := normalizeHeadersInit(runtime, val, "Headers.append")
			if err != nil {
				panic(runtime.NewTypeError("解析 headers 失败: " + err.Error()))
			}
			for key, value := range normalized {
				headers[strings.ToLower(key)] = normalizeHeaderValue(fmt.Sprintf("%v", value))
			}
			return len(normalized) > 0
		}

		if !parseHeaders(headersVal) {
			if h, ok := options["headers"].(map[string]interface{}); ok {
				for key, value := range h {
					headers[strings.ToLower(key)] = normalizeHeaderValue(fmt.Sprintf("%v", value))
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
		if (method == "GET" || method == "HEAD") && hasUsableBodyValue(body) {
			panic(runtime.NewTypeError("Request with GET/HEAD method cannot have body."))
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

		cacheValue := requestStringOptionValue(options, "cache", "default")
		credentialsValue := requestStringOptionValue(options, "credentials", "same-origin")
		modeValue := requestStringOptionValue(options, "mode", "cors")
		redirectValue := requestStringOptionValue(options, "redirect", "follow")
		referrerValue := requestStringOptionValue(options, "referrer", "about:client")
		referrerPolicyValue := requestStringOptionValue(options, "referrerPolicy", "")
		integrityValue := requestStringOptionValue(options, "integrity", "")
		destinationValue := requestStringOptionValue(options, "destination", "")
		keepaliveValue := requestBoolOptionValue(options, "keepalive", false)

		// 创建 Request 对象
		requestObj := ensureConstructorThis(runtime, "Request", call.This)
		requestObj.Set("url", runtime.ToValue(url))
		requestObj.Set("method", runtime.ToValue(method))

		if gojaVal, ok := body.(goja.Value); ok {
			requestObj.Set("body", gojaVal)
		} else if body != nil {
			requestObj.Set("body", runtime.ToValue(body))
		} else {
			requestObj.Set("body", goja.Null())
		}
		requestObj.Set("bodyUsed", runtime.ToValue(false))

		// headers 对象
		headersObj := createHeadersObject(runtime, headers)
		requestObj.Set("headers", headersObj)

		// signal 只读属性
		if signal != nil && !goja.IsUndefined(signal) && !goja.IsNull(signal) {
			requestObj.DefineDataProperty("signal", signal, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
		} else {
			requestObj.DefineDataProperty("signal", goja.Null(), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)
		}

		defineRequestReadonlyProperty(runtime, requestObj, "cache", cacheValue)
		defineRequestReadonlyProperty(runtime, requestObj, "credentials", credentialsValue)
		defineRequestReadonlyProperty(runtime, requestObj, "mode", modeValue)
		defineRequestReadonlyProperty(runtime, requestObj, "redirect", redirectValue)
		defineRequestReadonlyProperty(runtime, requestObj, "referrer", referrerValue)
		defineRequestReadonlyProperty(runtime, requestObj, "referrerPolicy", referrerPolicyValue)
		defineRequestReadonlyProperty(runtime, requestObj, "integrity", integrityValue)
		defineRequestReadonlyProperty(runtime, requestObj, "keepalive", keepaliveValue)
		defineRequestReadonlyProperty(runtime, requestObj, "destination", destinationValue)

		initialCtx := &requestCloneContext{
			url:                 url,
			method:              method,
			body:                body,
			headers:             headers,
			cacheValue:          cacheValue,
			credentialsValue:    credentialsValue,
			modeValue:           modeValue,
			redirectValue:       redirectValue,
			referrerValue:       referrerValue,
			referrerPolicyValue: referrerPolicyValue,
			integrityValue:      integrityValue,
			keepaliveValue:      keepaliveValue,
			destinationValue:    destinationValue,
			signal:              requestObj.Get("signal"),
		}
		attachRequestCloneMethod(runtime, requestObj, initialCtx)

		return requestObj
	}
}

func requestStringOptionValue(options map[string]interface{}, key, defaultValue string) string {
	if options == nil {
		return defaultValue
	}
	if raw, ok := options[key]; ok {
		switch v := raw.(type) {
		case string:
			return v
		case goja.Value:
			if goja.IsUndefined(v) || goja.IsNull(v) {
				return defaultValue
			}
			return v.String()
		case fmt.Stringer:
			return v.String()
		default:
			return fmt.Sprintf("%v", raw)
		}
	}
	return defaultValue
}

func requestBoolOptionValue(options map[string]interface{}, key string, defaultValue bool) bool {
	if options == nil {
		return defaultValue
	}
	if raw, ok := options[key]; ok {
		switch v := raw.(type) {
		case bool:
			return v
		case goja.Value:
			if goja.IsUndefined(v) || goja.IsNull(v) {
				return defaultValue
			}
			return v.ToBoolean()
		case string:
			lower := strings.ToLower(strings.TrimSpace(v))
			if lower == "true" {
				return true
			}
			if lower == "false" {
				return false
			}
		case int:
			return v != 0
		case int64:
			return v != 0
		case float64:
			return v != 0
		}
	}
	return defaultValue
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
	aborted       bool
	reason        goja.Value
	abortCh       chan struct{}
	listenerMutex sync.Mutex
	abortedMutex  sync.Mutex
}

// runtimePrototypes 按 runtime 保存各类原型对象，避免跨 Runtime 污染
type runtimePrototypes struct {
	abortSignalPrototype     *goja.Object
	abortControllerPrototype *goja.Object
	domExceptionPrototype    *goja.Object
	eventPrototype           *goja.Object
	eventTargetPrototype     *goja.Object
}

var (
	prototypesMu     sync.RWMutex
	runtimeProtoByVM = make(map[*goja.Runtime]*runtimePrototypes)
)

// ClearRuntimePrototypes 移除与 runtime 关联的原型缓存，避免长期持有已销毁的 runtime
func ClearRuntimePrototypes(runtime *goja.Runtime) {
	if runtime == nil {
		return
	}
	prototypesMu.Lock()
	delete(runtimeProtoByVM, runtime)
	prototypesMu.Unlock()
}

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

func setFunctionNameAndLength(runtime *goja.Runtime, fnVal goja.Value, name string, length int) {
	fnObj := fnVal.ToObject(runtime)
	if fnObj == nil {
		return
	}
	if name != "" {
		fnObj.DefineDataProperty("name", runtime.ToValue(name), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
	if length >= 0 {
		fnObj.DefineDataProperty("length", runtime.ToValue(length), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
}

func getSignalStateFromThis(runtime *goja.Runtime, thisVal goja.Value, method string) (*SignalState, *goja.Object) {
	obj := thisVal.ToObject(runtime)
	if obj == nil {
		panic(runtime.NewTypeError("Illegal invocation"))
	}
	stateVal := obj.Get("__signalState")
	if stateVal == nil || goja.IsUndefined(stateVal) || goja.IsNull(stateVal) {
		panic(runtime.NewTypeError(fmt.Sprintf("%s called on incompatible receiver", method)))
	}
	state, ok := stateVal.Export().(*SignalState)
	if !ok || state == nil {
		panic(runtime.NewTypeError(fmt.Sprintf("%s called on incompatible receiver", method)))
	}
	return state, obj
}

func shouldStopEvent(ev *goja.Object) bool {
	stop := ev.Get("__stopImmediate")
	return stop != nil && !goja.IsUndefined(stop) && stop.ToBoolean()
}

type eventListenerStore map[string][]goja.Value

type eventListenerData struct {
	listeners eventListenerStore
}

func getEventTargetMutex(runtime *goja.Runtime, target *goja.Object) *sync.Mutex {
	if target == nil {
		return &sync.Mutex{}
	}
	mutexVal := target.Get("__eventListenerMutex")
	if mutexVal != nil && !goja.IsUndefined(mutexVal) && !goja.IsNull(mutexVal) {
		if m, ok := mutexVal.Export().(*sync.Mutex); ok && m != nil {
			return m
		}
	}
	newMutex := &sync.Mutex{}
	target.Set("__eventListenerMutex", newMutex)
	return newMutex
}

func ensureEventListenerStore(runtime *goja.Runtime, target *goja.Object) eventListenerStore {
	if target == nil {
		return make(eventListenerStore)
	}
	storeVal := target.Get("__eventTargetListeners")
	if storeVal != nil && !goja.IsUndefined(storeVal) && !goja.IsNull(storeVal) {
		if data, ok := storeVal.Export().(*eventListenerData); ok && data != nil {
			if data.listeners == nil {
				data.listeners = make(eventListenerStore)
			}
			return data.listeners
		}
	}
	data := &eventListenerData{
		listeners: make(eventListenerStore),
	}
	target.Set("__eventTargetListeners", data)
	return data.listeners
}

func clearEventListenerStore(runtime *goja.Runtime, target *goja.Object) {
	if target == nil {
		return
	}
	storeVal := target.Get("__eventTargetListeners")
	if storeVal == nil || goja.IsUndefined(storeVal) || goja.IsNull(storeVal) {
		return
	}
	data, ok := storeVal.Export().(*eventListenerData)
	if !ok || data == nil {
		return
	}
	if data.listeners != nil {
		for _, list := range data.listeners {
			for _, listener := range list {
				cleanupListenerSignalBinding(runtime, listener)
			}
		}
	}
	target.Delete("__eventTargetListeners")
}

func parseListenerOptions(runtime *goja.Runtime, options goja.Value) (bool, *goja.Object) {
	if options == nil || goja.IsUndefined(options) || goja.IsNull(options) {
		return false, nil
	}
	if obj, ok := options.(*goja.Object); ok {
		once := false
		var signalObj *goja.Object
		if onceVal := obj.Get("once"); onceVal != nil && !goja.IsUndefined(onceVal) && !goja.IsNull(onceVal) {
			once = onceVal.ToBoolean()
		}
		if sigVal := obj.Get("signal"); sigVal != nil && !goja.IsUndefined(sigVal) && !goja.IsNull(sigVal) {
			so, ok := sigVal.(*goja.Object)
			if !ok || so == nil {
				panic(runtime.NewTypeError("signal is not a valid AbortSignal"))
			}
			isSignal := so.Get("__isAbortSignal")
			if isSignal == nil || goja.IsUndefined(isSignal) || goja.IsNull(isSignal) || !isSignal.ToBoolean() {
				panic(runtime.NewTypeError("signal is not a valid AbortSignal"))
			}
			if aborted := so.Get("aborted"); aborted != nil && aborted.ToBoolean() {
				return false, so
			}
			signalObj = so
		}
		return once, signalObj
	}
	// boolean useCapture
	return false, nil
}

func attachSignalCleanup(runtime *goja.Runtime, listener goja.Value, target *goja.Object, eventType string, optionsSignal *goja.Object) {
	if optionsSignal == nil || listener == nil || goja.IsUndefined(listener) || goja.IsNull(listener) {
		return
	}
	var cleanupCallable goja.Value
	cleanupFunc := func() {
		removeEventTargetListenerInternal(runtime, target, eventType, listener)
		if removeFn, ok := goja.AssertFunction(optionsSignal.Get("removeEventListener")); ok {
			removeFn(optionsSignal, runtime.ToValue("abort"), cleanupCallable)
		}
	}
	cleanupCallable = runtime.ToValue(func(goja.FunctionCall) goja.Value {
		cleanupFunc()
		return goja.Undefined()
	})
	listenerObj := listener.ToObject(runtime)
	listenerObj.Set("__signalCleanup", cleanupCallable)
	listenerObj.Set("__signalCleanupTarget", optionsSignal)

	if addFn, ok := goja.AssertFunction(optionsSignal.Get("addEventListener")); ok {
		opts := runtime.NewObject()
		opts.Set("once", true)
		addFn(optionsSignal, runtime.ToValue("abort"), cleanupCallable, opts)
	}
}

func cleanupListenerSignalBinding(runtime *goja.Runtime, listener goja.Value) {
	if listener == nil || goja.IsUndefined(listener) || goja.IsNull(listener) {
		return
	}
	obj := listener.ToObject(runtime)
	if obj == nil {
		return
	}
	cleanup := obj.Get("__signalCleanup")
	targetVal := obj.Get("__signalCleanupTarget")
	if cleanup == nil || goja.IsUndefined(cleanup) || goja.IsNull(cleanup) || targetVal == nil || goja.IsUndefined(targetVal) || goja.IsNull(targetVal) {
		return
	}
	targetObj, _ := targetVal.(*goja.Object)
	if targetObj == nil {
		return
	}
	if removeFn, ok := goja.AssertFunction(targetObj.Get("removeEventListener")); ok {
		removeFn(targetObj, runtime.ToValue("abort"), cleanup)
	}
	obj.Delete("__signalCleanup")
	obj.Delete("__signalCleanupTarget")
}

func addEventTargetListener(runtime *goja.Runtime, call goja.FunctionCall, prototype *goja.Object) goja.Value {
	thisObj := call.This.ToObject(runtime)
	if thisObj == nil {
		panic(runtime.NewTypeError("Illegal invocation"))
	}
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
	if len(call.Arguments) >= 3 {
		once, optionsSignal = parseListenerOptions(runtime, call.Arguments[2])
	}
	if optionsSignal != nil {
		if aborted := optionsSignal.Get("aborted"); aborted != nil && aborted.ToBoolean() {
			return goja.Undefined()
		}
	}

	mutex := getEventTargetMutex(runtime, thisObj)
	mutex.Lock()
	defer mutex.Unlock()

	store := ensureEventListenerStore(runtime, thisObj)
	current := store[eventType]
	for _, l := range current {
		if isSameListener(runtime, l, listener) {
			return goja.Undefined()
		}
	}

	var stored goja.Value
	if once {
		var wrapped goja.Value
		wrapped = runtime.ToValue(func(innerCall goja.FunctionCall) goja.Value {
			removeEventTargetListenerInternal(runtime, thisObj, eventType, wrapped)
			if fn, ok := goja.AssertFunction(listener); ok {
				fn(thisObj, innerCall.Arguments...)
			}
			return goja.Undefined()
		})
		wrapped.ToObject(runtime).Set("__originalListener", listener)
		stored = wrapped
	} else {
		stored = listener
	}

	current = append(current, stored)
	store[eventType] = current

	if optionsSignal != nil {
		attachSignalCleanup(runtime, stored, thisObj, eventType, optionsSignal)
	}

	return goja.Undefined()
}

func removeEventTargetListenerInternal(runtime *goja.Runtime, target *goja.Object, eventType string, targetListener goja.Value) {
	if target == nil || targetListener == nil || eventType == "" {
		return
	}
	mutex := getEventTargetMutex(runtime, target)
	mutex.Lock()
	defer mutex.Unlock()

	store := ensureEventListenerStore(runtime, target)
	current := store[eventType]
	if len(current) == 0 {
		return
	}
	changed := false
	for i := 0; i < len(current); i++ {
		if isSameListener(runtime, current[i], targetListener) {
			cleanupListenerSignalBinding(runtime, current[i])
			current = append(current[:i], current[i+1:]...)
			i--
			changed = true
		}
	}
	if changed {
		if len(current) == 0 {
			delete(store, eventType)
		} else {
			store[eventType] = current
		}
	}
}

func removeEventTargetListener(runtime *goja.Runtime, call goja.FunctionCall, prototype *goja.Object) goja.Value {
	thisObj := call.This.ToObject(runtime)
	if thisObj == nil {
		panic(runtime.NewTypeError("Illegal invocation"))
	}
	if len(call.Arguments) < 2 {
		return goja.Undefined()
	}
	eventType := call.Arguments[0].String()
	targetListener := call.Arguments[1]
	if goja.IsUndefined(targetListener) || goja.IsNull(targetListener) {
		return goja.Undefined()
	}
	removeEventTargetListenerInternal(runtime, thisObj, eventType, targetListener)
	return goja.Undefined()
}

func dispatchEventTargetEvent(runtime *goja.Runtime, call goja.FunctionCall, prototype *goja.Object) goja.Value {
	thisObj := call.This.ToObject(runtime)
	if thisObj == nil {
		panic(runtime.NewTypeError("Illegal invocation"))
	}
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
	eventObj.Set("target", thisObj)
	eventObj.Set("currentTarget", thisObj)
	eventObj.Set("srcElement", thisObj)

	if goja.IsUndefined(eventObj.Get("cancelable")) {
		eventObj.Set("cancelable", false)
	}
	if goja.IsUndefined(eventObj.Get("defaultPrevented")) {
		eventObj.Set("defaultPrevented", false)
	}
	if goja.IsUndefined(eventObj.Get("__stopImmediate")) {
		eventObj.Set("__stopImmediate", false)
	}

	mutex := getEventTargetMutex(runtime, thisObj)
	mutex.Lock()
	store := ensureEventListenerStore(runtime, thisObj)
	listenersCopy := make([]goja.Value, len(store[eventType]))
	copy(listenersCopy, store[eventType])
	mutex.Unlock()

	handlerName := "on" + eventType
	if handler := thisObj.Get(handlerName); handler != nil && !goja.IsUndefined(handler) && !goja.IsNull(handler) {
		if fn, ok := goja.AssertFunction(handler); ok {
			fn(thisObj, eventObj)
			if shouldStopEvent(eventObj) {
				cancelable := eventObj.Get("cancelable").ToBoolean()
				result := true
				if cancelable && eventObj.Get("defaultPrevented").ToBoolean() {
					result = false
				}
				return runtime.ToValue(result)
			}
		}
	}

	for _, listener := range listenersCopy {
		if fn, ok := goja.AssertFunction(listener); ok {
			fn(thisObj, eventObj)
		}
		if shouldStopEvent(eventObj) {
			break
		}
	}

	cancelable := eventObj.Get("cancelable").ToBoolean()
	result := true
	if cancelable && eventObj.Get("defaultPrevented").ToBoolean() {
		result = false
	}
	return runtime.ToValue(result)
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
	if protos.eventTargetPrototype == nil {
		protos.eventTargetPrototype = runtime.NewObject()
	}

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

	eventTargetPrototype := protos.eventTargetPrototype
	eventTargetPrototype.Set("addEventListener", func(call goja.FunctionCall) goja.Value {
		return addEventTargetListener(runtime, call, eventTargetPrototype)
	})
	setFunctionNameAndLength(runtime, eventTargetPrototype.Get("addEventListener"), "addEventListener", 2)

	eventTargetPrototype.Set("removeEventListener", func(call goja.FunctionCall) goja.Value {
		return removeEventTargetListener(runtime, call, eventTargetPrototype)
	})
	setFunctionNameAndLength(runtime, eventTargetPrototype.Get("removeEventListener"), "removeEventListener", 2)

	eventTargetPrototype.Set("dispatchEvent", func(call goja.FunctionCall) goja.Value {
		return dispatchEventTargetEvent(runtime, call, eventTargetPrototype)
	})
	setFunctionNameAndLength(runtime, eventTargetPrototype.Get("dispatchEvent"), "dispatchEvent", 1)

	return eventConstructor
}

// CreateEventTargetConstructor 创建 EventTarget 构造函数
func CreateEventTargetConstructor(runtime *goja.Runtime) goja.Value {
	protos := getRuntimePrototypes(runtime)
	if protos.eventTargetPrototype == nil {
		protos.eventTargetPrototype = runtime.NewObject()
	}

	eventTargetConstructor := runtime.ToValue(func(call goja.ConstructorCall) *goja.Object {
		obj := runtime.NewObject()
		obj.SetPrototype(protos.eventTargetPrototype)
		obj.Set("__eventListenerMutex", &sync.Mutex{})
		return obj
	})

	eventTargetCtorObj := eventTargetConstructor.ToObject(runtime)
	eventTargetCtorObj.Set("prototype", protos.eventTargetPrototype)
	eventTargetCtorObj.DefineDataProperty("name", runtime.ToValue("EventTarget"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	return eventTargetConstructor
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
	event.DefineDataProperty("isTrusted", runtime.ToValue(true), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE)

	dispatchVal := signal.Get("dispatchEvent")
	if dispatchVal != nil {
		if dispatchFn, ok := goja.AssertFunction(dispatchVal); ok {
			dispatchFn(signal, event)
		}
	}

	// 🔥 abort 事件只会触发一次，触发后立即清理所有监听器，避免闭包长驻
	clearEventListenerStore(runtime, signal)
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
func CreateAbortControllerConstructor(runtime *goja.Runtime) goja.Value {
	// 初始化 AbortController 原型并设置 @@toStringTag（按 runtime 隔离）
	protos := getRuntimePrototypes(runtime)
	protos.abortControllerPrototype = runtime.NewObject()
	if err := protos.abortControllerPrototype.DefineDataPropertySymbol(goja.SymToStringTag, runtime.ToValue("AbortController"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
		protos.abortControllerPrototype.SetSymbol(goja.SymToStringTag, runtime.ToValue("AbortController"))
	}

	if err := protos.abortControllerPrototype.DefineAccessorProperty("signal",
		runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			thisObj := call.This.ToObject(runtime)
			if thisObj == nil {
				panic(runtime.NewTypeError("Illegal invocation"))
			}
			signal := thisObj.Get("__abortControllerSignal")
			if signal == nil || goja.IsUndefined(signal) || goja.IsNull(signal) {
				return goja.Undefined()
			}
			return signal
		}),
		nil,
		goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
		panic(err)
	}

	protos.abortControllerPrototype.Set("abort", func(call goja.FunctionCall) goja.Value {
		thisObj := call.This.ToObject(runtime)
		if thisObj == nil {
			panic(runtime.NewTypeError("Illegal invocation"))
		}
		stateVal := thisObj.Get("__abortControllerState")
		state, ok := stateVal.Export().(*SignalState)
		if !ok || state == nil {
			panic(runtime.NewTypeError("Illegal invocation"))
		}
		signalVal := thisObj.Get("__abortControllerSignal")
		signalObj, _ := signalVal.(*goja.Object)
		if signalObj == nil {
			panic(runtime.NewTypeError("Illegal invocation"))
		}

		state.abortedMutex.Lock()
		if !state.aborted {
			state.aborted = true

			if len(call.Arguments) == 0 || goja.IsUndefined(call.Arguments[0]) {
				state.reason = CreateDOMException(runtime, "This operation was aborted", "AbortError")
			} else {
				state.reason = call.Arguments[0]
			}
			state.abortedMutex.Unlock()

			func() {
				defer func() {
					if r := recover(); r != nil {
					}
				}()
				close(state.abortCh)
			}()

			TriggerAbortListeners(runtime, signalObj, state)
		} else {
			state.abortedMutex.Unlock()
		}
		return goja.Undefined()
	})
	setFunctionNameAndLength(runtime, protos.abortControllerPrototype.Get("abort"), "abort", 0)

	ctor := runtime.ToValue(func(call goja.ConstructorCall) *goja.Object {
		// 创建信号状态
		state := &SignalState{
			aborted: false,
			reason:  nil,
			abortCh: make(chan struct{}),
		}

		// 创建 AbortSignal 对象（使用当前 runtime 的原型）
		protos := getRuntimePrototypes(runtime)
		signal := CreateAbortSignalObjectWithPrototype(runtime, state, protos.abortSignalPrototype)

		// 创建 AbortController 对象
		controller := runtime.NewObject()
		controller.SetPrototype(protos.abortControllerPrototype)
		controller.Set("__abortControllerState", state)
		controller.Set("__abortControllerSignal", signal)

		return controller
		return controller
	})

	if ctorObj := ctor.ToObject(runtime); ctorObj != nil {
		ctorObj.Set("prototype", protos.abortControllerPrototype)
	}

	return ctor
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
	if protos.eventTargetPrototype == nil {
		protos.eventTargetPrototype = runtime.NewObject()
	}
	protos.abortSignalPrototype.SetPrototype(protos.eventTargetPrototype)
	if err := protos.abortSignalPrototype.DefineDataPropertySymbol(goja.SymToStringTag, runtime.ToValue("AbortSignal"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
		protos.abortSignalPrototype.SetSymbol(goja.SymToStringTag, runtime.ToValue("AbortSignal"))
	}

	if err := protos.abortSignalPrototype.DefineAccessorProperty("aborted",
		runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			state, _ := getSignalStateFromThis(runtime, call.This, "aborted")
			state.abortedMutex.Lock()
			aborted := state.aborted
			state.abortedMutex.Unlock()
			return runtime.ToValue(aborted)
		}),
		nil,
		goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
		panic(err)
	}

	if err := protos.abortSignalPrototype.DefineAccessorProperty("reason",
		runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			state, _ := getSignalStateFromThis(runtime, call.This, "reason")
			state.abortedMutex.Lock()
			reason := state.reason
			state.abortedMutex.Unlock()
			if reason == nil {
				return goja.Undefined()
			}
			return reason
		}),
		nil,
		goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
		panic(err)
	}

	protos.abortSignalPrototype.Set("throwIfAborted", func(call goja.FunctionCall) goja.Value {
		state, _ := getSignalStateFromThis(runtime, call.This, "throwIfAborted")
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
	setFunctionNameAndLength(runtime, protos.abortSignalPrototype.Get("throwIfAborted"), "throwIfAborted", 0)

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
			aborted: true,
			abortCh: make(chan struct{}),
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

		return signal
	})
	setFunctionNameAndLength(runtime, abortSignalFunc.Get("abort"), "abort", 0)

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
			aborted: false,
			reason:  nil,
			abortCh: make(chan struct{}),
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
	setFunctionNameAndLength(runtime, abortSignalFunc.Get("timeout"), "timeout", 1)

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
			aborted: false,
			reason:  nil,
			abortCh: make(chan struct{}),
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
	setFunctionNameAndLength(runtime, abortSignalFunc.Get("any"), "any", 1)

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
	signal.Set("__eventListenerMutex", &state.listenerMutex)
	signal.Set("onabort", goja.Null())

	return signal
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
