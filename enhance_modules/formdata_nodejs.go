package enhance_modules

import (
	"bytes"
	"context"
	"encoding/base64"
	"flow-codeblock-go/enhance_modules/fetch"
	"flow-codeblock-go/enhance_modules/internal/formdata"
	"flow-codeblock-go/enhance_modules/internal/jsbuffer"
	"flow-codeblock-go/utils"
	"fmt"
	"io"
	"net"
	neturl "net/url"
	"reflect"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/eventloop"
	"github.com/dop251/goja_nodejs/require"
)

// NodeFormDataModule Node.js form-data 模块
// 提供与 Node.js form-data 包兼容的 API
type NodeFormDataModule struct {
	fetchEnhancer *FetchEnhancer // 共享 FetchEnhancer 的配置和基础设施
}

// NewNodeFormDataModule 创建 Node.js FormData 模块
func NewNodeFormDataModule(fetchEnhancer *FetchEnhancer) *NodeFormDataModule {
	return &NodeFormDataModule{
		fetchEnhancer: fetchEnhancer,
	}
}

// RegisterFormDataModule 注册 form-data 模块到 require 系统
func RegisterFormDataModule(registry *require.Registry, fetchEnhancer *FetchEnhancer) {
	module := NewNodeFormDataModule(fetchEnhancer)

	registry.RegisterNativeModule("form-data", func(runtime *goja.Runtime, moduleObj *goja.Object) {
		// 创建 FormData 构造函数
		constructor := module.createFormDataConstructor(runtime)

		// 导出构造函数
		moduleObj.Set("exports", constructor)
	})
}

// createFormDataConstructor 创建 FormData 构造函数
func (nfm *NodeFormDataModule) createFormDataConstructor(runtime *goja.Runtime) goja.Value {
	constructor := func(call goja.ConstructorCall) *goja.Object {
		// 创建底层的 StreamingFormData 实例
		// 🔥 重要：每个 FormData 都应该有独立的 config（深拷贝）
		// 避免 config.Context 被共享，导致一个 FormData 的 context 取消影响其他 FormData
		var config *formdata.FormDataStreamConfig
		if nfm.fetchEnhancer != nil {
			// 通过 GetFormDataConfig() 获取配置副本
			baseCfg := nfm.fetchEnhancer.GetFormDataConfig()
			config = &formdata.FormDataStreamConfig{
				MaxBufferedFormDataSize:  baseCfg.MaxBufferedFormDataSize,
				MaxStreamingFormDataSize: baseCfg.MaxStreamingFormDataSize,
				EnableChunkedUpload:      baseCfg.EnableChunkedUpload,
				BufferSize:               baseCfg.BufferSize,
				MaxFileSize:              baseCfg.MaxFileSize,
				Timeout:                  baseCfg.Timeout,
				Context:                  nil, // 🔥 关键：每个 FormData 独立的 context，默认 nil
				MaxFormDataSize:          baseCfg.MaxFormDataSize,
				StreamingThreshold:       baseCfg.StreamingThreshold,
			}
		} else {
			config = formdata.DefaultFormDataStreamConfig()
		}
		streamingFormData := NewStreamingFormData(config)
		if streamingFormData == nil {
			panic(runtime.NewGoError(fmt.Errorf("创建 StreamingFormData 实例失败")))
		}

		// 创建 FormData 对象
		formDataObj := runtime.NewObject()
		if err := formDataObj.DefineDataPropertySymbol(goja.SymToStringTag, runtime.ToValue("FormData"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
			formDataObj.SetSymbol(goja.SymToStringTag, runtime.ToValue("FormData"))
		}

		// 为兼容 Node.js form-data 的测试用内部字段，提供 _streams 和 _boundary
		// _streams: 近似模拟 form-data 的内部 streams 结构，方便 JS 辅助函数 parseFormData 解析字段
		// 结构约定：按顺序写入 [headerString, value, headerString, value, ...]
		streamsArray := runtime.NewArray()
		formDataObj.Set("_streams", streamsArray)
		// _boundary: 暴露当前 boundary 字符串，供测试判断是否为"Node form-data 实例"
		formDataObj.Set("_boundary", streamingFormData.GetBoundary())

		// 清理 _streams 的辅助函数：在流式消费后移除对大对象的引用，便于 GC 回收
		clearStreamsArray := func() {
			if streamsArray == nil {
				return
			}
			newArr := runtime.NewArray()
			formDataObj.Set("_streams", newArr)
			streamsArray = newArr
		}

		// 流式模式下 CreateReader 成功后，主动清空 _streams，避免长时间持有 Buffer/流引用
		streamingFormData.SetAfterCreateReaderHook(func(isStreaming bool) {
			if !isStreaming {
				return
			}
			clearStreamsArray()
		})

		// 设置类型标识（区分 Node.js FormData 和浏览器 FormData）
		formDataObj.Set("__isNodeFormData", true)
		formDataObj.Set("__isFormData", false) // 不是浏览器版本
		formDataObj.Set("__type", "nodejs-formdata")

		// === 核心方法实现 ===

		// append(name, value, filename|options?) - 添加字段
		// 支持两种签名：
		// 1. append(name, value, filename) - filename 作为字符串
		// 2. append(name, value, options) - options 对象 {filename, contentType, knownLength}
		formDataObj.Set("append", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("FormData.append 需要至少 2 个参数"))
			}

			name := call.Arguments[0].String()
			value := call.Arguments[1]

			var filename string
			var contentType string
			var hasKnownLength bool
			var knownLength int64

			// 解析第三个参数（filename 或 options 对象）
			if len(call.Arguments) > 2 {
				thirdArg := call.Arguments[2]

				// null/undefined 行为与 Node 对齐：视作未提供 options
				if !goja.IsUndefined(thirdArg) && !goja.IsNull(thirdArg) {
					// options 可以是字符串（作为 filename）或对象（contentType/filename/knownLength）
					if exported := thirdArg.Export(); exported != nil {
						if _, ok := exported.(string); ok {
							filename = thirdArg.String()
						} else if obj := thirdArg.ToObject(runtime); obj != nil {
							isOptions := false

							if filenameVal := obj.Get("filename"); filenameVal != nil && !goja.IsUndefined(filenameVal) && !goja.IsNull(filenameVal) {
								filename = filenameVal.String()
								isOptions = true
							}
							if contentTypeVal := obj.Get("contentType"); contentTypeVal != nil && !goja.IsUndefined(contentTypeVal) && !goja.IsNull(contentTypeVal) {
								contentType = contentTypeVal.String()
								isOptions = true
							}
							if knownLengthVal := obj.Get("knownLength"); knownLengthVal != nil && !goja.IsUndefined(knownLengthVal) && !goja.IsNull(knownLengthVal) {
								hasKnownLength = true
								knownLength = knownLengthVal.ToInteger()
								isOptions = true
							}

							// 如果既不是字符串也未识别到 options 字段，则退化为字符串处理，保持兼容 filename 传参
							if !isOptions {
								filename = thirdArg.String()
							}
						} else {
							filename = thirdArg.String()
						}
					} else {
						filename = thirdArg.String()
					}
				}
			}

			// 处理不同类型的 value（写入底层 StreamingFormData）
			if err := nfm.handleAppend(runtime, streamingFormData, name, value, filename, contentType, hasKnownLength, knownLength); err != nil {
				panic(runtime.NewGoError(err))
			}

			// 维护 _streams 兼容结构，供 JS 侧 parseFormData 使用
			// 格式："Content-Disposition: form-data; name=\"<name>\"" 后面紧跟实际值
			if streamsArray != nil {
				header := fmt.Sprintf("Content-Disposition: form-data; name=\"%s\"", name)
				// 当前长度
				lengthVal := streamsArray.Get("length")
				var length int64
				if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
					length = lengthVal.ToInteger()
				}
				// 写入 header（goja.Object.Set 需要 string key，这里使用索引字符串）
				idxHeader := fmt.Sprintf("%d", length)
				streamsArray.Set(idxHeader, header)
				// 写入值：保留原值，避免对 Buffer/大文本强制 toString 造成冗余拷贝
				var valueForStream goja.Value
				switch {
				case goja.IsUndefined(value):
					valueForStream = runtime.ToValue("undefined")
				case goja.IsNull(value):
					valueForStream = runtime.ToValue("null")
				default:
					// 函数占位，避免被序列化；其余保持原值以贴近 Node form-data 行为
					if _, isFunc := goja.AssertFunction(value); isFunc {
						valueForStream = runtime.ToValue("[function]")
					} else {
						valueForStream = value
					}
				}
				idxValue := fmt.Sprintf("%d", length+1)
				streamsArray.Set(idxValue, valueForStream)
			}
			return goja.Undefined()
		})

		// getHeaders() - 获取 headers 对象（包含正确的 boundary）
		formDataObj.Set("getHeaders", func(call goja.FunctionCall) goja.Value {
			headers := runtime.NewObject()
			boundary := streamingFormData.GetBoundary()
			formDataObj.Set("_boundary", boundary)
			contentType := fmt.Sprintf("multipart/form-data; boundary=%s", boundary)
			headers.Set("content-type", contentType)

			// 合并外部传入的 headers（与 Node form-data 行为保持一致）
			if len(call.Arguments) > 0 {
				userHeaders := call.Arguments[0]
				if !goja.IsUndefined(userHeaders) && !goja.IsNull(userHeaders) {
					if obj := userHeaders.ToObject(runtime); obj != nil {
						for _, key := range obj.Keys() {
							val := obj.Get(key)
							// Node 侧会将 header 名转换为小写后再合并
							lowerKey := strings.ToLower(key)
							headers.Set(lowerKey, val)
						}
					}
				}
			}
			return headers
		})

		// getBoundary() - 获取边界字符串
		formDataObj.Set("getBoundary", func(call goja.FunctionCall) goja.Value {
			boundary := streamingFormData.GetBoundary()
			// 同步 _boundary，保证与 Node.js form-data 行为一致
			formDataObj.Set("_boundary", boundary)
			return runtime.ToValue(boundary)
		})

		// setBoundary(boundary) - 设置自定义边界
		formDataObj.Set("setBoundary", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("FormData boundary must be a string"))
			}
			val := call.Arguments[0]
			exportType := val.ExportType()
			if exportType == nil || exportType.Kind() != reflect.String {
				panic(runtime.NewTypeError("FormData boundary must be a string"))
			}
			boundary := val.String()
			streamingFormData.SetBoundary(boundary)
			// 同步更新 _boundary，以兼容测试中对 _boundary 的检查
			formDataObj.Set("_boundary", boundary)
			return goja.Undefined()
		})

		// hasKnownLength() - 检查是否有已知长度（不包含流式数据）
		formDataObj.Set("hasKnownLength", func(call goja.FunctionCall) goja.Value {
			return runtime.ToValue(streamingFormData.HasKnownLength())
		})

		// getLengthSync() - 同步获取内容长度
		formDataObj.Set("getLengthSync", func(call goja.FunctionCall) goja.Value {
			if streamingFormData.HasUnknownStreamLength() {
				panic(runtime.NewGoError(fmt.Errorf("Cannot calculate proper length in synchronous way.")))
			}

			totalSize := streamingFormData.GetTotalSize()
			return runtime.ToValue(totalSize)
		})

		// getLength(callback) - 异步获取长度（通过 Promise）
		formDataObj.Set("getLength", func(call goja.FunctionCall) goja.Value {
			scheduleAsync := func(run func()) {
				if siVal := runtime.GlobalObject().Get("setImmediate"); siVal != nil && !goja.IsUndefined(siVal) && !goja.IsNull(siVal) {
					if si, ok := goja.AssertFunction(siVal); ok {
						if _, err := si(goja.Undefined(), runtime.ToValue(func(goja.FunctionCall) goja.Value {
							run()
							return goja.Undefined()
						})); err == nil {
							return
						}
					}
				}

				if stVal := runtime.GlobalObject().Get("setTimeout"); stVal != nil && !goja.IsUndefined(stVal) && !goja.IsNull(stVal) {
					if st, ok := goja.AssertFunction(stVal); ok {
						if _, err := st(goja.Undefined(), runtime.ToValue(func(goja.FunctionCall) goja.Value {
							run()
							return goja.Undefined()
						}), runtime.ToValue(0)); err == nil {
							return
						}
					}
				}

				run()
			}

			// 未知长度的流需要按照 Node 行为返回错误
			if streamingFormData.HasUnknownStreamLength() {
				if len(call.Arguments) == 0 {
					promise, _, reject := runtime.NewPromise()
					reject(runtime.NewGoError(fmt.Errorf("Unknown stream")))
					return runtime.ToValue(promise)
				}

				callback, ok := goja.AssertFunction(call.Arguments[0])
				if !ok {
					panic(runtime.NewTypeError("getLength 需要一个回调函数参数"))
				}
				scheduleAsync(func() {
					callback(goja.Undefined(), runtime.NewGoError(fmt.Errorf("Unknown stream")))
				})
				return goja.Undefined()
			}

			if len(call.Arguments) == 0 {
				// 返回 Promise（如果没有 callback）
				promise, resolve, _ := runtime.NewPromise()
				totalSize := streamingFormData.GetTotalSize()
				resolve(runtime.ToValue(totalSize))
				return runtime.ToValue(promise)
			}

			callback, ok := goja.AssertFunction(call.Arguments[0])
			if !ok {
				panic(runtime.NewTypeError("getLength 需要一个回调函数参数"))
			}

			// 同步计算长度
			totalSize := streamingFormData.GetTotalSize()

			// Node.js form-data 标准：callback(err, length) - 只有2个参数
			// 🔥 修复：callback(thisObj, arg1, arg2...) - 第一个参数是 this
			scheduleAsync(func() {
				callback(goja.Undefined(), goja.Null(), runtime.ToValue(totalSize))
			})

			return goja.Undefined()
		})

		// getBuffer() - 获取完整的 multipart/form-data Buffer
		// 🔥 关键方法：用于与 fetch API 集成
		formDataObj.Set("getBuffer", func(call goja.FunctionCall) goja.Value {
			// Node form-data 行为：只支持已缓冲的数据；遇到流会在 Buffer.from 时抛 TypeError
			if hasStream, streamType := detectStreamingEntryForBuffer(streamingFormData); hasStream {
				errMsg := fmt.Sprintf(
					"The \"string\" argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of %s",
					streamType,
				)
				panic(runtime.NewTypeError(errMsg))
			}

			// 创建 Reader 并读取所有数据
			reader, err := streamingFormData.CreateReader()
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("创建 reader 失败: %w", err)))
			}

			// 读取所有数据到 Buffer
			var buf bytes.Buffer
			copyReader := reader
			maxBufferedSize := int64(0)
			if cfg := streamingFormData.GetConfig(); cfg != nil {
				maxBufferedSize = cfg.MaxBufferedFormDataSize
			}
			if maxBufferedSize > 0 {
				copyReader = io.LimitReader(reader, maxBufferedSize+1)
			}

			n, err := io.Copy(&buf, copyReader)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("读取表单数据失败: %w", err)))
			}
			if maxBufferedSize > 0 && n > maxBufferedSize {
				panic(runtime.NewGoError(fmt.Errorf("FormData getBuffer size exceeds limit: %d > %d bytes", n, maxBufferedSize)))
			}

			// 转换为 goja Buffer
			bufferConstructor := runtime.Get("Buffer")
			if goja.IsUndefined(bufferConstructor) || goja.IsNull(bufferConstructor) {
				panic(runtime.NewTypeError("Buffer 不可用"))
			}

			bufferObj := bufferConstructor.ToObject(runtime)
			if bufferObj == nil {
				panic(runtime.NewTypeError("转换 Buffer 为对象失败"))
			}

			fromFunc, ok := goja.AssertFunction(bufferObj.Get("from"))
			if !ok {
				panic(runtime.NewTypeError("Buffer.from 不可用"))
			}

			// 创建 Uint8Array
			arrayBuffer := runtime.NewArrayBuffer(buf.Bytes())
			result, err := fromFunc(bufferObj, runtime.ToValue(arrayBuffer))
			if err != nil {
				panic(runtime.NewGoError(err))
			}

			return result
		})

		// _getStreamingFormData() - 内部方法，返回底层 StreamingFormData 对象
		// 🔥 用于 fetch API 直接访问流式对象（高效方案）
		formDataObj.Set("_getStreamingFormData", func(call goja.FunctionCall) goja.Value {
			// 返回一个包装对象，暴露必要的方法
			wrapper := runtime.NewObject()

			wrapper.Set("createReader", func(call goja.FunctionCall) goja.Value {
				// 这个方法在 Go 侧被 fetch_enhancement.go 调用
				// 不需要返回 JavaScript 值
				return goja.Undefined()
			})

			wrapper.Set("getContentType", func(call goja.FunctionCall) goja.Value {
				contentType := fmt.Sprintf("multipart/form-data; boundary=%s", streamingFormData.GetBoundary())
				return runtime.ToValue(contentType)
			})

			wrapper.Set("getBoundary", func(call goja.FunctionCall) goja.Value {
				return runtime.ToValue(streamingFormData.GetBoundary())
			})

			// 存储原始 StreamingFormData 引用（Go 侧访问）
			wrapper.Set("__goStreamingFormData", streamingFormData)

			return wrapper
		})

		// _getGoStreamingFormData() - 直接返回 Go 对象（供 fetch 使用）
		formDataObj.Set("__getGoStreamingFormData", streamingFormData)

		// 🔥 为 Node.js 兼容性添加流接口
		// 使用 FormDataReadable 实现真正的 Node.js Readable Stream 语义
		// 支持 on/pipe/pause/resume/destroy，按块读取、背压控制、单次消费

		// 创建 FormDataReadable 实例（惰性初始化）
		var formDataReadable *fetch.FormDataReadable

		// 获取或创建 FormDataReadable
		getFormDataReadable := func() *fetch.FormDataReadable {
			if formDataReadable == nil {
				// 使用工厂函数延迟创建 reader
				formDataReadable = fetch.NewFormDataReadable(func() (io.ReadCloser, error) {
					reader, err := streamingFormData.CreateReader()
					if err != nil {
						return nil, err
					}
					// 使用 io.NopCloser 包装 io.Reader 为 io.ReadCloser
					return io.NopCloser(reader), nil
				}, runtime)
			}
			return formDataReadable
		}

		// on(event, callback) - 注册事件监听器
		// 🔥 支持 data/end/error/close 事件
		// 🔥 首个 data 监听器注册时开始按块读取
		formDataObj.Set("on", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				return formDataObj // 返回 this 支持链式调用
			}

			eventName := call.Arguments[0].String()
			callback := call.Arguments[1]

			readable := getFormDataReadable()
			readable.On(eventName, callback)

			return formDataObj // 返回 this 支持链式调用
		})

		// emit(event, ...args) - 触发事件（兼容 EventEmitter）
		formDataObj.Set("emit", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return runtime.ToValue(false)
			}

			eventName := call.Arguments[0].String()
			args := []goja.Value{}
			if len(call.Arguments) > 1 {
				args = call.Arguments[1:]
			}

			readable := getFormDataReadable()
			triggered := readable.Emit(eventName, args...)
			return runtime.ToValue(triggered)
		})

		// once(event, callback) - 只触发一次的事件监听
		// 🔥 使用 FormDataReadable.Once 方法，触发后自动移除
		formDataObj.Set("once", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				return formDataObj
			}

			eventName := call.Arguments[0].String()
			callback := call.Arguments[1]

			readable := getFormDataReadable()
			readable.Once(eventName, callback)
			return formDataObj
		})

		// pipe(destination, options?) - 管道传输到目标流
		// 🔥 支持背压控制：
		// - 调用目标的 write(chunk) 方法
		// - write 返回 false 时暂停读取，等待 drain 事件
		// - 结束时调用目标的 end() 方法
		formDataObj.Set("pipe", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return goja.Undefined()
			}

			destination := call.Arguments[0].ToObject(runtime)
			if destination == nil {
				return goja.Undefined()
			}

			readable := getFormDataReadable()

			// 检查是否已消费
			if readable.IsConsumed() {
				panic(runtime.NewTypeError("Cannot pipe after stream has already been consumed"))
			}

			return readable.Pipe(destination)
		})

		// pause() - 暂停流读取
		// 🔥 维护 isPaused 状态，停止调度下一块
		formDataObj.Set("pause", func(call goja.FunctionCall) goja.Value {
			readable := getFormDataReadable()
			readable.Pause()
			return formDataObj // 返回 this 支持链式调用
		})

		// resume() - 恢复流读取
		// 🔥 重新调度读取循环
		formDataObj.Set("resume", func(call goja.FunctionCall) goja.Value {
			readable := getFormDataReadable()
			readable.Resume()
			return formDataObj // 返回 this 支持链式调用
		})

		// destroy(error?) - 销毁流
		// 🔥 关闭底层 reader，触发 error 事件（如果有错误）
		formDataObj.Set("destroy", func(call goja.FunctionCall) goja.Value {
			readable := getFormDataReadable()
			var err error
			if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
				err = fmt.Errorf("%s", call.Arguments[0].String())
			}
			readable.Destroy(err)
			return formDataObj
		})

		// readable 属性 - 标识这是一个可读流
		formDataObj.Set("readable", true)

		// submit(url, callback?) - 提交表单到指定 URL
		// 🔥 使用内部 fetch API 实现
		formDataObj.Set("submit", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("submit 需要一个 URL 参数"))
			}

			targetArg := call.Arguments[0]
			var callback goja.Callable
			if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
				var ok bool
				callback, ok = goja.AssertFunction(call.Arguments[1])
				if !ok {
					panic(runtime.NewTypeError("callback 必须是一个函数"))
				}
			}

			target, err := parseSubmitTarget(runtime, targetArg)
			if err != nil {
				panic(runtime.NewGoError(err))
			}

			if target.method == "" {
				target.method = "POST"
			}

			finalURL, err := buildURLFromTarget(target)
			if err != nil {
				panic(runtime.NewGoError(err))
			}

			headers, err := nfm.collectSubmitHeaders(runtime, formDataObj, target.headers)
			if err != nil {
				panic(runtime.NewGoError(err))
			}

			// auth: 自动生成 Basic Authorization 头（与 Node http.request 保持一致）
			if target.auth != "" {
				if headers == nil {
					headers = map[string]string{}
				}
				if _, ok := headers["authorization"]; !ok {
					authStr := target.auth
					if !strings.Contains(authStr, ":") {
						authStr += ":"
					}
					headers["authorization"] = "Basic " + base64.StdEncoding.EncodeToString([]byte(authStr))
				}
			}

			// 构造 fetch 选项
			options := runtime.NewObject()
			options.Set("method", strings.ToUpper(target.method))
			options.Set("body", formDataObj)

			headersObj := runtime.NewObject()
			for k, v := range headers {
				headersObj.Set(k, v)
			}
			options.Set("headers", headersObj)

			// AbortController 支持，供 abort/destroy 使用
			var abortController *goja.Object
			if acCtor := runtime.Get("AbortController"); acCtor != nil && !goja.IsUndefined(acCtor) && !goja.IsNull(acCtor) {
				if ctor, ok := goja.AssertFunction(acCtor); ok {
					if val, err := ctor(goja.Undefined()); err == nil {
						abortController = val.ToObject(runtime)
					}
				}
			}
			if abortController != nil {
				if signal := abortController.Get("signal"); signal != nil {
					options.Set("signal", signal)
				}
			}

			// 构造 ClientRequest 风格对象
			requestObj := runtime.NewObject()
			reqEmitter := newJSEventEmitter(runtime, requestObj)
			var callbackCalled bool
			var aborted bool
			var finishedOnce sync.Once

			emitFinish := func() {
				finishedOnce.Do(func() {
					reqEmitter.emit("finish")
				})
			}

			callCallback := func(err goja.Value, res goja.Value) {
				if callback == nil || callbackCalled {
					return
				}
				callbackCalled = true
				scheduleAsync(runtime, func() {
					callback(goja.Undefined(), err, res)
				})
			}

			failWithError := func(errVal goja.Value) {
				if errVal == nil {
					errVal = runtime.NewTypeError("request error")
				}
				errVal = normalizeRequestErrorValue(runtime, errVal, "ECONNRESET")
				emitFinish()
				reqEmitter.emit("error", errVal)
				callCallback(errVal, goja.Null())
			}

			triggerAbort := func(reason goja.Value) {
				if aborted {
					return
				}
				aborted = true
				requestObj.Set("aborted", true)
				if abortController != nil {
					if abortFn, ok := goja.AssertFunction(abortController.Get("abort")); ok {
						abortFn(abortController)
					}
				}
				if reason == nil || goja.IsUndefined(reason) || goja.IsNull(reason) {
					reason = runtime.NewTypeError("aborted")
				}
				failWithError(normalizeRequestErrorValue(runtime, reason, "ECONNRESET"))
			}

			// on/once 事件
			requestObj.Set("on", func(call goja.FunctionCall) goja.Value {
				if len(call.Arguments) >= 2 {
					reqEmitter.on(call.Arguments[0].String(), call.Arguments[1])
				}
				return requestObj
			})

			requestObj.Set("once", func(call goja.FunctionCall) goja.Value {
				if len(call.Arguments) >= 2 {
					reqEmitter.once(call.Arguments[0].String(), call.Arguments[1])
				}
				return requestObj
			})

			// abort/destroy/end
			requestObj.Set("abort", func(call goja.FunctionCall) goja.Value {
				var reason goja.Value
				if len(call.Arguments) > 0 {
					reason = call.Arguments[0]
				}
				triggerAbort(reason)
				return requestObj
			})

			requestObj.Set("destroy", func(call goja.FunctionCall) goja.Value {
				var reason goja.Value
				if len(call.Arguments) > 0 {
					reason = call.Arguments[0]
				}
				triggerAbort(reason)
				requestObj.Set("destroyed", true)
				return requestObj
			})

			requestObj.Set("end", func(call goja.FunctionCall) goja.Value {
				emitFinish()
				return requestObj
			})

			// 异步触发 socket 事件
			scheduleAsync(runtime, func() {
				reqEmitter.emit("socket", runtime.NewObject())
			})

			// 使用 fetch API 发送请求
			fetchFunc := runtime.Get("fetch")
			if goja.IsUndefined(fetchFunc) {
				failWithError(runtime.NewTypeError("fetch 不可用"))
				return requestObj
			}

			fetch, ok := goja.AssertFunction(fetchFunc)
			if !ok {
				failWithError(runtime.NewTypeError("fetch 不是一个函数"))
				return requestObj
			}

			result, err := fetch(goja.Undefined(), runtime.ToValue(finalURL), options)
			if err != nil {
				failWithError(runtime.NewGoError(err))
				return requestObj
			}

			promiseObj := result.ToObject(runtime)
			if promiseObj == nil {
				failWithError(runtime.NewTypeError("无效的 fetch 返回值"))
				return requestObj
			}

			handleResponse := func(respVal goja.Value) {
				if aborted {
					return
				}
				respObj := nfm.createIncomingMessage(runtime, respVal, func(errVal goja.Value) {
					reqEmitter.emit("error", normalizeRequestErrorValue(runtime, errVal, "ECONNRESET"))
				})
				if respObj == nil {
					failWithError(runtime.NewTypeError("无效的响应对象"))
					return
				}
				emitFinish()
				callCallback(goja.Null(), respObj)
				reqEmitter.emit("response", respObj)
			}

			if thenFunc, ok := goja.AssertFunction(promiseObj.Get("then")); ok {
				thenFunc(promiseObj, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
					handleResponse(call.Argument(0))
					return goja.Undefined()
				}))
			}

			if catchFunc, ok := goja.AssertFunction(promiseObj.Get("catch")); ok {
				catchFunc(promiseObj, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
					if aborted {
						return goja.Undefined()
					}
					failWithError(call.Argument(0))
					return goja.Undefined()
				}))
			}

			return requestObj
		})

		// 设置原型链（支持 instanceof 检查）
		if call.This != nil {
			proto := call.This.Prototype()
			if proto != nil {
				formDataObj.SetPrototype(proto)
			}
		}

		return formDataObj
	}

	constructorVal := runtime.ToValue(constructor)
	constructorObj := constructorVal.ToObject(runtime)

	if constructorObj != nil {
		// 确保 prototype 存在，方便挂载 @@toStringTag / toString
		var formProto *goja.Object
		if protoVal := constructorObj.Get("prototype"); protoVal != nil && !goja.IsUndefined(protoVal) && !goja.IsNull(protoVal) {
			formProto = protoVal.ToObject(runtime)
		}
		if formProto == nil {
			formProto = runtime.NewObject()
			constructorObj.Set("prototype", formProto)
		}

		// 原型链指向 stream.Stream.prototype，保证 instanceof Stream 与 Node 行为一致
		if streamProto := nfm.getStreamPrototype(runtime); streamProto != nil {
			formProto.SetPrototype(streamProto)
		}

		// 在原型上定义 @@toStringTag（不可写、不可枚举、可配置）
		if err := formProto.DefineDataPropertySymbol(goja.SymToStringTag, runtime.ToValue("FormData"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
			formProto.SetSymbol(goja.SymToStringTag, runtime.ToValue("FormData"))
		}

		// 定义匿名 toString，name 需要为空字符串以对齐 form-data 行为
		toStringVal := runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			return runtime.ToValue("[object FormData]")
		})
		formProto.Set("toString", toStringVal)
		if fnObj := toStringVal.ToObject(runtime); fnObj != nil {
			if err := fnObj.DefineDataProperty("name", runtime.ToValue(""), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
				fnObj.Set("name", runtime.ToValue(""))
			}
		}
	}

	return constructorVal
}

// isNodeReadableObject 简易判定 goja 对象是否类似 Node.js Readable 流（无已知长度）
func isNodeReadableObject(obj *goja.Object) bool {
	// 对齐 Node form-data：只有具备典型 Node Stream 特征时才按流处理
	return shouldMeasureNodeStreamLength(obj)
}

// shouldMeasureNodeStreamLength 粗略模拟 form-data 对 _valuesToMeasure 的判定
// 仅当存在 path/httpVersion/_readableState 等典型 Node 流特征时，才认为长度未知
func shouldMeasureNodeStreamLength(obj *goja.Object) bool {
	if obj == nil {
		return false
	}

	hasProp := func(key string) bool {
		val := obj.Get(key)
		return val != nil && !goja.IsUndefined(val) && !goja.IsNull(val)
	}

	// fs.ReadStream/自定义 Node Stream：path/fd 或内部状态标识
	if hasProp("path") || hasProp("fd") || hasProp("_readableState") || hasProp("_writableState") {
		return true
	}

	// http.IncomingMessage 风格：readable + httpVersion
	if readable := obj.Get("readable"); readable != nil && readable.ToBoolean() {
		if hasProp("httpVersion") || hasProp("httpModule") {
			return true
		}
	}

	return false
}

// getStreamPrototype 尝试获取 stream 模块的原型（兼容导出函数或导出对象的场景）
func (nfm *NodeFormDataModule) getStreamPrototype(runtime *goja.Runtime) *goja.Object {
	if runtime == nil {
		return nil
	}

	reqVal := runtime.GlobalObject().Get("require")
	if reqVal == nil || goja.IsUndefined(reqVal) || goja.IsNull(reqVal) {
		return nil
	}

	reqFn, ok := goja.AssertFunction(reqVal)
	if !ok {
		return nil
	}

	streamVal, err := reqFn(goja.Undefined(), runtime.ToValue("stream"))
	if err != nil {
		return nil
	}

	streamObj := streamVal.ToObject(runtime)
	if streamObj == nil {
		return nil
	}

	// 优先使用模块导出自身的 prototype（当 require('stream') 直接返回构造函数时）
	if protoVal := streamObj.Get("prototype"); protoVal != nil && !goja.IsUndefined(protoVal) && !goja.IsNull(protoVal) {
		if protoObj := protoVal.ToObject(runtime); protoObj != nil {
			return protoObj
		}
	}

	// 兼容模块导出对象的情况，从 Stream 属性上拿 prototype
	if streamCtorVal := streamObj.Get("Stream"); streamCtorVal != nil && !goja.IsUndefined(streamCtorVal) && !goja.IsNull(streamCtorVal) {
		if ctorObj := streamCtorVal.ToObject(runtime); ctorObj != nil {
			if protoVal := ctorObj.Get("prototype"); protoVal != nil && !goja.IsUndefined(protoVal) && !goja.IsNull(protoVal) {
				return protoVal.ToObject(runtime)
			}
		}
	}

	return nil
}

// handleAppend 处理 append 方法的不同值类型
func (nfm *NodeFormDataModule) handleAppend(runtime *goja.Runtime, streamingFormData *formdata.StreamingFormData, name string, value goja.Value, filename, contentType string, hasKnownLength bool, knownLength int64) error {
	// 安全检查
	if nfm == nil {
		return fmt.Errorf("nfm 为 nil")
	}
	if runtime == nil {
		return fmt.Errorf("runtime 为 nil")
	}
	if streamingFormData == nil {
		return fmt.Errorf("streamingFormData 为 nil")
	}

	// 先检查 null/undefined（在 ToObject 之前，避免 panic）
	if goja.IsNull(value) {
		nfm.appendField(streamingFormData, name, "null", contentType, hasKnownLength, knownLength)
		return nil
	}
	if goja.IsUndefined(value) {
		nfm.appendField(streamingFormData, name, "undefined", contentType, hasKnownLength, knownLength)
		return nil
	}

	// 关键修复：先转换为对象，不要先 Export（Export 会破坏 Blob/File 对象）
	obj := value.ToObject(runtime)

	// 对齐 Node form-data：禁止直接传入 TypedArray/ArrayBuffer（需先转 Buffer）
	isBufferVal := isBufferValue(runtime, value)
	if obj != nil && !isBufferVal {
		if typeName, isTyped := detectTypedArrayOrArrayBuffer(runtime, obj); isTyped {
			return fmt.Errorf("FormData.append 不支持直接传入 %s，请先转换为 Buffer", typeName)
		}
	}

	// 1. 优先处理对象类型（ReadableStream、File、Blob、Buffer）
	if obj != nil {
		// 1.0 检查 ReadableStream（最优先）
		// 🔥 新增：支持直接传入 axios stream
		getReaderFunc := obj.Get("getReader")
		if !goja.IsUndefined(getReaderFunc) && getReaderFunc != nil {
			// 这是一个 ReadableStream 对象
			if err := nfm.handleReadableStream(streamingFormData, name, obj, filename, contentType, hasKnownLength, knownLength); err == nil {
				return nil
			}
			// 如果处理失败，继续尝试其他方式
		}

		// 1.0.1 粗略判断 Node.js Readable（无 knownLength 时应视作未知长度流）
		if isNodeReadableObject(obj) {
			// Node form-data 只在 Stream/path/httpVersion 等场景下判定长度未知
			needsLength := !hasKnownLength && shouldMeasureNodeStreamLength(obj)

			// 优先尝试将 Node Readable 转换为 io.Reader，确保真实数据写入
			if reader, err := nfm.convertNodeReadableStream(runtime, obj, streamingFormData); err == nil && reader != nil {
				if filename == "" {
					if pathVal := obj.Get("path"); pathVal != nil && !goja.IsUndefined(pathVal) && !goja.IsNull(pathVal) {
						filename = pathVal.String()
					} else {
						filename = "blob"
					}
				}
				if contentType == "" {
					contentType = "application/octet-stream"
				}
				nfm.appendStreamFile(streamingFormData, name, filename, contentType, reader, hasKnownLength, knownLength)
				return nil
			}

			nfm.appendUnknownStream(streamingFormData, name, filename, contentType, hasKnownLength, knownLength, needsLength)
			return nil
		}

		// 1.1 检查 File（最优先，因为 File 继承自 Blob，必须先检查）
		isFile := obj.Get("__isFile")
		if !goja.IsUndefined(isFile) && isFile != nil && isFile.ToBoolean() {
			if nfm.fetchEnhancer == nil {
				return fmt.Errorf("fetchEnhancer 为 nil")
			}

			data, contentTypeFromFile, filenameFromFile, err := nfm.fetchEnhancer.ExtractFileData(obj)
			if err == nil {
				if filename == "" {
					filename = filenameFromFile
				}
				if filename == "" {
					filename = "file"
				}
				if contentType == "" {
					contentType = contentTypeFromFile
				}
				if contentType == "" {
					contentType = "application/octet-stream"
				}
				nfm.appendFile(streamingFormData, name, filename, contentType, data, hasKnownLength, knownLength)
				return nil
			}
		}

		// 1.2 检查 Blob
		isBlob := obj.Get("__isBlob")
		if !goja.IsUndefined(isBlob) && isBlob != nil && isBlob.ToBoolean() {
			if nfm.fetchEnhancer == nil {
				return fmt.Errorf("fetchEnhancer 为 nil")
			}

			data, contentTypeFromBlob, err := nfm.fetchEnhancer.ExtractBlobData(obj)
			if err == nil {
				if filename == "" {
					filename = "blob"
				}
				if contentType == "" {
					contentType = contentTypeFromBlob
				}
				if contentType == "" {
					contentType = "application/octet-stream"
				}
				nfm.appendFile(streamingFormData, name, filename, contentType, data, hasKnownLength, knownLength)
				return nil
			}
		}

		// 1.3 检查 Buffer（通过 length 属性 + 索引访问）
		lengthVal := obj.Get("length")
		if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			// 先排除字符串类型（字符串也有 length 和索引访问）
			if value.ExportType().Kind() != reflect.String {
				// 还要检查是否可以通过索引访问（排除普通数字、字符串对象）
				firstByte := obj.Get("0")
				if firstByte != nil && !goja.IsUndefined(firstByte) && !goja.IsNull(firstByte) {
					// Panic 防护：extractBufferData 可能会 panic
					var data []byte
					var bufRef formdata.BufferRef
					var ok bool
					var useBufferRef bool
					func() {
						defer func() {
							if r := recover(); r != nil {
								ok = false
							}
						}()
						// 优先获取零拷贝视图，保持与原始 Buffer 的引用关系
						if bufferRef, refOK := nfm.createBufferRef(runtime, obj); refOK {
							bufRef = bufferRef
							useBufferRef = true
							ok = true
							return
						}

						data, ok = nfm.extractBufferData(runtime, obj)
					}()

					if ok {
						// Buffer 默认不应自动补充 filename，但需要保留 content-type
						if contentType == "" {
							contentType = "application/octet-stream"
						}
						if useBufferRef {
							nfm.appendBufferRef(streamingFormData, name, filename, contentType, bufRef, hasKnownLength, knownLength)
						} else {
							nfm.appendFile(streamingFormData, name, filename, contentType, data, hasKnownLength, knownLength)
						}
						return nil
					}
				}
			}
		}
	}

	// 2. 最后才 Export 处理基本类型（避免破坏对象结构）
	exported := value.Export()

	// 2.1 兜底：goja.ArrayBuffer 直接拒绝（与 Node form-data 行为一致）
	if _, ok := exported.(goja.ArrayBuffer); ok {
		return fmt.Errorf("FormData.append 不支持直接传入 ArrayBuffer，请先转换为 Buffer")
	}

	switch v := exported.(type) {
	case io.ReadCloser:
		if filename == "" {
			filename = "blob"
		}
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		nfm.appendStreamFile(streamingFormData, name, filename, contentType, v, hasKnownLength, knownLength)
		return nil
	case io.Reader:
		if filename == "" {
			filename = "blob"
		}
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		nfm.appendStreamFile(streamingFormData, name, filename, contentType, io.NopCloser(v), hasKnownLength, knownLength)
		return nil
	case string:
		// 🔥 修复：如果提供了 filename，将字符串作为文件处理
		if filename != "" {
			// 字符串转为字节数组，作为文件上传
			data := []byte(v)
			if contentType == "" {
				contentType = "text/plain"
			}
			nfm.appendFile(streamingFormData, name, filename, contentType, data, hasKnownLength, knownLength)
			return nil
		}
		// 否则作为普通文本字段
		nfm.appendField(streamingFormData, name, v, contentType, hasKnownLength, knownLength)
		return nil
	case bool:
		// 保留布尔值，后续 getBuffer 时抛出与 Node 相同的类型错误
		nfm.appendRawEntry(streamingFormData, name, v, filename, contentType, hasKnownLength, knownLength)
		return nil
	case int, int32, int64, float32, float64:
		// 数字类型
		nfm.appendField(streamingFormData, name, fmt.Sprintf("%v", v), contentType, hasKnownLength, knownLength)
		return nil
	case []uint8:
		// []byte 类型 - 直接作为文件
		if filename == "" {
			filename = "blob"
		}
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		nfm.appendFile(streamingFormData, name, filename, contentType, v, hasKnownLength, knownLength)
		return nil
	}

	// 3. 兜底处理：转换为字符串
	var strValue string
	if value == nil || goja.IsUndefined(value) || goja.IsNull(value) {
		strValue = ""
	} else {
		strValue = fmt.Sprintf("%v", exported)
	}

	// 如果提供了 filename，即使值类型未知，也需要生成文件 part 以包含 filename
	if filename != "" {
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		nfm.appendFile(streamingFormData, name, filename, contentType, []byte(strValue), hasKnownLength, knownLength)
		return nil
	}

	nfm.appendField(streamingFormData, name, strValue, contentType, hasKnownLength, knownLength)
	return nil
}

// appendField 添加文本字段到 StreamingFormData
func (nfm *NodeFormDataModule) appendField(streamingFormData *formdata.StreamingFormData, name, value, contentType string, hasKnownLength bool, knownLength int64) {
	if streamingFormData == nil {
		return
	}

	entry := formdata.FormDataEntry{
		Name:        name,
		Value:       value,
		ContentType: contentType,
		HasKnownLen: hasKnownLength,
		KnownLength: knownLength,
	}

	// 添加条目
	streamingFormData.AppendEntry(entry)

	// 更新总大小估算
	estimatedValueLen := int64(len(value))
	if hasKnownLength {
		estimatedValueLen = knownLength
	}
	streamingFormData.AddToTotalSize(int64(len(name)+len(contentType)+100) + estimatedValueLen) // 100 字节为 header 开销
}

// normalizeFilename 模拟 Node.js form-data 中的 path.basename 行为，只保留 "/" 之后的部分
func normalizeFilename(filename string) string {
	if filename == "" {
		return ""
	}

	// 去掉末尾的 "/"，与 path.posix.basename 对齐
	end := len(filename) - 1
	for end >= 0 && filename[end] == '/' {
		end--
	}
	if end < 0 {
		return ""
	}

	// 截取最后一个 "/" 之后的子串
	start := end
	for start >= 0 && filename[start] != '/' {
		start--
	}
	return filename[start+1 : end+1]
}

// appendRawEntry 保留原始值（用于布尔等需要在 getBuffer 抛错的类型）
func (nfm *NodeFormDataModule) appendRawEntry(streamingFormData *formdata.StreamingFormData, name string, value interface{}, filename, contentType string, hasKnownLength bool, knownLength int64) {
	if streamingFormData == nil {
		return
	}

	filename = normalizeFilename(filename)

	entry := formdata.FormDataEntry{
		Name:        name,
		Value:       value,
		Filename:    filename,
		ContentType: contentType,
		HasKnownLen: hasKnownLength,
		KnownLength: knownLength,
	}

	streamingFormData.AppendEntry(entry)
	// 估算长度：与 appendField 相同的简单估算，便于后续 getLength 计算
	estimatedValueLen := int64(0)
	if hasKnownLength {
		estimatedValueLen = knownLength
	}
	streamingFormData.AddToTotalSize(int64(len(name)+len(filename)+len(contentType)+100) + estimatedValueLen)
}

// appendFile 添加文件字段到 StreamingFormData
func (nfm *NodeFormDataModule) appendFile(streamingFormData *formdata.StreamingFormData, name, filename, contentType string, data []byte, hasKnownLength bool, knownLength int64) {
	if streamingFormData == nil {
		return
	}

	filename = normalizeFilename(filename)

	entry := formdata.FormDataEntry{
		Name:        name,
		Value:       data,
		Filename:    filename,
		ContentType: contentType,
		HasKnownLen: hasKnownLength,
		KnownLength: knownLength,
	}

	// 添加条目
	streamingFormData.AppendEntry(entry)

	// 更新总大小估算
	estimatedValueLen := int64(len(data))
	if hasKnownLength {
		estimatedValueLen = knownLength
	}
	streamingFormData.AddToTotalSize(int64(len(name)+len(filename)+len(contentType)+200) + estimatedValueLen) // 200 字节为 header 开销
}

// appendBufferRef 添加 BufferRef，保持与原始 Buffer 的引用关系
func (nfm *NodeFormDataModule) appendBufferRef(streamingFormData *formdata.StreamingFormData, name, filename, contentType string, bufferRef formdata.BufferRef, hasKnownLength bool, knownLength int64) {
	if streamingFormData == nil {
		return
	}

	filename = normalizeFilename(filename)

	entry := formdata.FormDataEntry{
		Name:        name,
		Value:       bufferRef,
		Filename:    filename,
		ContentType: contentType,
		HasKnownLen: hasKnownLength,
		KnownLength: knownLength,
	}

	streamingFormData.AppendEntry(entry)

	// 使用逻辑长度预估，保持与 Buffer 实际长度一致
	estimatedValueLen := bufferRef.Length()
	if hasKnownLength {
		estimatedValueLen = knownLength
	}
	streamingFormData.AddToTotalSize(int64(len(name)+len(filename)+len(contentType)) + estimatedValueLen + 200)
}

// handleReadableStream 处理 ReadableStream 对象（axios stream）
// 🔥 新增方法：支持直接传入流式响应
func (nfm *NodeFormDataModule) handleReadableStream(streamingFormData *formdata.StreamingFormData, name string, streamObj *goja.Object, filename, contentType string, hasKnownLength bool, knownLength int64) error {
	if nfm == nil || streamingFormData == nil || streamObj == nil {
		return fmt.Errorf("invalid parameters")
	}

	// 尝试获取内部的 StreamReader 对象
	// 在 fetch_enhancement.go 的 createStreamingResponse 中，
	// 我们将 streamReader 存储在 ReadableStream 的内部属性中
	streamReaderVal := streamObj.Get("__streamReader")
	if goja.IsUndefined(streamReaderVal) || goja.IsNull(streamReaderVal) {
		return fmt.Errorf("ReadableStream 没有 __streamReader 属性")
	}

	// 尝试导出为 Go 对象
	exported := streamReaderVal.Export()
	if exported == nil {
		return fmt.Errorf("无法导出 StreamReader")
	}

	// 类型断言为 *fetch.StreamReader
	streamReader, ok := exported.(*fetch.StreamReader)
	if !ok {
		return fmt.Errorf("__streamReader 不是有效的 StreamReader 类型")
	}

	// 获取底层的 io.ReadCloser
	reader := streamReader.GetReader()
	if reader == nil {
		return fmt.Errorf("StreamReader 的 reader 为 nil")
	}

	// 设置默认值
	if filename == "" {
		filename = "stream-file"
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// 🔥 关键：将 io.ReadCloser 添加到 FormData
	// StreamingFormData 已经支持 io.Reader 类型
	nfm.appendStreamFile(streamingFormData, name, filename, contentType, reader, hasKnownLength, knownLength)

	return nil
}

// appendStreamFile 添加流式文件到 StreamingFormData
func (nfm *NodeFormDataModule) appendStreamFile(streamingFormData *formdata.StreamingFormData, name, filename, contentType string, reader io.ReadCloser, hasKnownLength bool, knownLength int64) {
	if streamingFormData == nil {
		return
	}

	filename = normalizeFilename(filename)

	entry := formdata.FormDataEntry{
		Name:        name,
		Value:       reader, // io.ReadCloser 实现了 io.Reader 接口
		Filename:    filename,
		ContentType: contentType,
		HasKnownLen: hasKnownLength,
		KnownLength: knownLength,
	}

	// 添加条目
	streamingFormData.AppendEntry(entry)

	// 🔥 注意:流式数据的大小未知，不更新 totalSize
	// 这样会自动触发流式处理模式
	estimated := int64(len(name) + len(filename) + len(contentType) + 200) // header 预估
	if hasKnownLength {
		estimated += knownLength
	} else {
		estimated += int64(1024 * 1024) // 默认预估 1MB
	}
	streamingFormData.AddToTotalSize(estimated) // 预估长度用于模式检测
}

// appendUnknownStream 添加 Node.js Readable 占位，needsLength 决定是否视作未知长度流
func (nfm *NodeFormDataModule) appendUnknownStream(streamingFormData *formdata.StreamingFormData, name, filename, contentType string, hasKnownLength bool, knownLength int64, needsLength bool) {
	if streamingFormData == nil {
		return
	}

	filename = normalizeFilename(filename)

	entry := formdata.FormDataEntry{
		Name:        name,
		Value:       formdata.UnknownLengthStreamPlaceholder{NeedsLength: needsLength},
		Filename:    filename,
		ContentType: contentType,
		HasKnownLen: hasKnownLength,
		KnownLength: knownLength,
	}

	streamingFormData.AppendEntry(entry)

	estimated := int64(len(name) + len(filename) + len(contentType) + 200)
	switch {
	case hasKnownLength:
		estimated += knownLength
	case needsLength:
		estimated += int64(1024 * 1024) // 默认 1MB 预估值，触发未知流分支
	default:
		// 与 Node 行为一致：非典型 Stream 对象按 0 字节处理
	}
	streamingFormData.AddToTotalSize(estimated)
}

// convertNodeReadableStream 将 Node.js Readable 对象转换为 io.ReadCloser，保持数据流式写入并绑定取消信号
func (nfm *NodeFormDataModule) convertNodeReadableStream(runtime *goja.Runtime, streamObj *goja.Object, streamingFormData *formdata.StreamingFormData) (io.ReadCloser, error) {
	if runtime == nil || streamObj == nil {
		return nil, fmt.Errorf("invalid readable stream")
	}

	onVal := streamObj.Get("on")
	onFn, ok := goja.AssertFunction(onVal)
	if !ok {
		return nil, fmt.Errorf("stream.on is not a function")
	}

	// 绑定 FormData/请求的上下文与超时，避免 goroutine 常驻
	var (
		ctx       context.Context = context.Background()
		timeout   time.Duration
		ctxDoneCh <-chan struct{}
	)
	if streamingFormData != nil {
		if cfg := streamingFormData.GetConfig(); cfg != nil {
			if cfg.Context != nil {
				ctx = cfg.Context
			}
			timeout = cfg.Timeout
		}
	}
	// 超时下限保护：cfg.Timeout 可能为 0（自定义配置漏校验），统一回落到 30s
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	if ctx != nil {
		ctxDoneCh = ctx.Done()
	}

	var timer *time.Timer
	var timeoutCh <-chan time.Time
	if timeout > 0 {
		timer = time.NewTimer(timeout)
		timeoutCh = timer.C
	}

	pr, pw := io.Pipe()
	chunkCh := make(chan []byte, 32) // 小缓冲 + 背压
	backlogCh := make(chan []byte, 128)
	closedCh := make(chan struct{})
	var closeOnce sync.Once
	var cleanupOnce sync.Once
	var closeErr error
	var dataHandlerVal, endHandlerVal, errorHandlerVal goja.Value
	var pauseFn, resumeFn goja.Callable
	var backpressureDrainerOnce sync.Once

	if pauseVal := streamObj.Get("pause"); pauseVal != nil && !goja.IsUndefined(pauseVal) && !goja.IsNull(pauseVal) {
		if fn, ok := goja.AssertFunction(pauseVal); ok {
			pauseFn = fn
		}
	}
	if resumeVal := streamObj.Get("resume"); resumeVal != nil && !goja.IsUndefined(resumeVal) && !goja.IsNull(resumeVal) {
		if fn, ok := goja.AssertFunction(resumeVal); ok {
			resumeFn = fn
		}
	}

	scheduleResume := func() {
		if resumeFn == nil {
			return
		}
		scheduleAsync(runtime, func() {
			select {
			case <-closedCh:
				return
			default:
			}
			defer func() { _ = recover() }()
			resumeFn(streamObj)
		})
	}

	// 统一关闭管道和信号
	signalClose := func(err error) {
		closeOnce.Do(func() {
			if err != nil && closeErr == nil {
				closeErr = err
			}
			// 先解绑监听，避免复用流时残留闭包
			cleanupOnce.Do(func() {
				removeListener := func(event string, handler goja.Value) {
					if handler == nil || goja.IsUndefined(handler) || goja.IsNull(handler) {
						return
					}
					if offVal := streamObj.Get("off"); offVal != nil && !goja.IsUndefined(offVal) && !goja.IsNull(offVal) {
						if offFn, ok := goja.AssertFunction(offVal); ok {
							offFn(streamObj, runtime.ToValue(event), handler)
							return
						}
					}
					if rmVal := streamObj.Get("removeListener"); rmVal != nil && !goja.IsUndefined(rmVal) && !goja.IsNull(rmVal) {
						if rmFn, ok := goja.AssertFunction(rmVal); ok {
							rmFn(streamObj, runtime.ToValue(event), handler)
						}
					}
				}
				removeListener("data", dataHandlerVal)
				removeListener("end", endHandlerVal)
				removeListener("close", endHandlerVal)
				removeListener("error", errorHandlerVal)
			})
			close(closedCh)
			close(chunkCh)
			if timer != nil {
				timer.Stop()
			}
		})
	}

	// 监听 context/超时，防止读端缺失事件时泄漏
	go func() {
		select {
		case <-closedCh:
		case <-ctxDoneCh:
			signalClose(fmt.Errorf("readable stream canceled: %v", ctx.Err()))
		case <-timeoutCh:
			signalClose(fmt.Errorf("readable stream timeout after %v", timeout))
		}
	}()

	// 单 goroutine 顺序写入，防止 goroutine 风暴
	go func() {
		for chunk := range chunkCh {
			if len(chunk) == 0 {
				continue
			}
			if _, err := pw.Write(chunk); err != nil {
				signalClose(err)
				break
			}
		}
		if closeErr != nil {
			pw.CloseWithError(closeErr)
		} else {
			pw.Close()
		}
	}()

	// 背压队列 drain：单 worker 顺序推进 backlog -> chunkCh，避免 per-chunk goroutine
	startBackpressureDrainer := func() {
		backpressureDrainerOnce.Do(func() {
			go func() {
				for {
					select {
					case <-closedCh:
						return
					case <-ctxDoneCh:
						signalClose(fmt.Errorf("readable stream canceled: %v", ctx.Err()))
						return
					case <-timeoutCh:
						signalClose(fmt.Errorf("readable stream timeout after %v", timeout))
						return
					case buf := <-backlogCh:
						for {
							select {
							case <-closedCh:
								return
							case <-ctxDoneCh:
								signalClose(fmt.Errorf("readable stream canceled: %v", ctx.Err()))
								return
							case <-timeoutCh:
								signalClose(fmt.Errorf("readable stream timeout after %v", timeout))
								return
							case chunkCh <- buf:
								scheduleResume()
								goto nextChunk
							}
						}
					nextChunk:
					}
				}
			}()
		})
	}

	dataHandler := func(call goja.FunctionCall) goja.Value {
		chunk := call.Argument(0)
		if goja.IsUndefined(chunk) || goja.IsNull(chunk) {
			return goja.Undefined()
		}
		data, err := exportNodeStreamChunk(runtime, chunk)
		if err != nil {
			signalClose(err)
			return goja.Undefined()
		}
		if len(data) == 0 {
			return goja.Undefined()
		}

		func() {
			defer func() {
				// channel 可能已被关闭，忽略 panic
				if r := recover(); r != nil {
					_ = r
				}
			}()
			select {
			case <-closedCh:
				// 已关闭，直接丢弃
			case <-ctxDoneCh:
				signalClose(fmt.Errorf("readable stream canceled: %v", ctx.Err()))
			case <-timeoutCh:
				signalClose(fmt.Errorf("readable stream timeout after %v", timeout))
			case chunkCh <- data:
				// 正常写入
			default:
				// 背压：暂停流，入队有限队列，单 worker 推进，避免 goroutine 积累
				if pauseFn != nil {
					defer func() { _ = recover() }()
					pauseFn(streamObj)
				}
				select {
				case backlogCh <- append([]byte(nil), data...):
					startBackpressureDrainer()
				default:
					signalClose(fmt.Errorf("readable stream backpressure overflow"))
				}
			}
		}()
		return goja.Undefined()
	}

	endHandler := func(goja.FunctionCall) goja.Value {
		signalClose(nil)
		return goja.Undefined()
	}

	errorHandler := func(call goja.FunctionCall) goja.Value {
		var msg string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			msg = call.Arguments[0].String()
		} else {
			msg = "Unknown stream error"
		}
		signalClose(fmt.Errorf("%s", msg))
		return goja.Undefined()
	}

	// 保存 handler 引用以便解绑
	dataHandlerVal = runtime.ToValue(dataHandler)
	endHandlerVal = runtime.ToValue(endHandler)
	errorHandlerVal = runtime.ToValue(errorHandler)

	if _, err := onFn(streamObj, runtime.ToValue("data"), dataHandlerVal); err != nil {
		signalClose(err)
		return nil, err
	}
	onFn(streamObj, runtime.ToValue("end"), endHandlerVal)
	onFn(streamObj, runtime.ToValue("close"), endHandlerVal)
	onFn(streamObj, runtime.ToValue("error"), errorHandlerVal)

	// 确保流进入 flowing 模式
	if resumeFn != nil {
		if _, err := resumeFn(streamObj); err != nil {
			// 忽略 resume 错误，保持兼容性
		}
	}

	return pr, nil
}

// exportNodeStreamChunk 将 Node.js Readable 的 chunk 转为字节切片
func exportNodeStreamChunk(runtime *goja.Runtime, value goja.Value) ([]byte, error) {
	if runtime == nil {
		return nil, fmt.Errorf("runtime is nil")
	}

	// 尝试直接导出为 []byte（支持 Buffer/TypedArray）
	var data []byte
	if err := runtime.ExportTo(value, &data); err == nil {
		return append([]byte(nil), data...), nil
	}

	// 字符串处理
	if str, ok := value.(goja.String); ok {
		return []byte(str.String()), nil
	}
	if exported := value.Export(); exported != nil {
		switch v := exported.(type) {
		case string:
			return []byte(v), nil
		case []byte:
			return append([]byte(nil), v...), nil
		case goja.ArrayBuffer:
			bytes := v.Bytes()
			return append([]byte(nil), bytes...), nil
		}
	}

	// 兜底：尝试从对象中获取 ArrayBuffer
	if obj, ok := value.(*goja.Object); ok {
		if exported := obj.Export(); exported != nil {
			if ab, ok := exported.(goja.ArrayBuffer); ok {
				bytes := ab.Bytes()
				return append([]byte(nil), bytes...), nil
			}
		}
	}

	return nil, fmt.Errorf("unsupported stream chunk type")
}

// createBufferRef 尝试获取 Buffer 的零拷贝视图，保持与原始 Buffer 的引用
func (nfm *NodeFormDataModule) createBufferRef(runtime *goja.Runtime, bufferObj *goja.Object) (formdata.BufferRef, bool) {
	if runtime == nil || bufferObj == nil {
		return formdata.BufferRef{}, false
	}

	lengthVal := bufferObj.Get("length")
	length := int64(0)
	if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
		length = lengthVal.ToInteger()
	}

	if view, ok := jsbuffer.ExtractView(runtime, bufferObj, length); ok {
		// 持有原始对象引用，防止 GC 回收底层数据
		if length <= 0 {
			length = int64(len(view))
		}
		return formdata.BufferRef{
			Data: view,
			Len:  length,
			Ref:  bufferObj,
		}, true
	}

	return formdata.BufferRef{}, false
}

// extractBufferData 从 Buffer 对象提取字节数据
func (nfm *NodeFormDataModule) extractBufferData(runtime *goja.Runtime, bufferObj *goja.Object) ([]byte, bool) {
	// 安全检查
	if bufferObj == nil || runtime == nil {
		return nil, false
	}

	// 尝试获取 Buffer 的底层数据
	lengthVal := bufferObj.Get("length")
	if goja.IsUndefined(lengthVal) || goja.IsNull(lengthVal) {
		return nil, false
	}

	length := int(lengthVal.ToInteger())
	if length == 0 {
		return []byte{}, true
	}

	// 优化：尝试使用 toJSON() 方法（更高效）
	toJSONFunc := bufferObj.Get("toJSON")
	if !goja.IsUndefined(toJSONFunc) {
		if toJSON, ok := goja.AssertFunction(toJSONFunc); ok {
			result, err := toJSON(bufferObj)
			if err == nil && !goja.IsUndefined(result) {
				resultObj := result.ToObject(runtime)
				if resultObj != nil {
					// toJSON() 返回 { type: 'Buffer', data: [...] }
					dataVal := resultObj.Get("data")
					if !goja.IsUndefined(dataVal) {
						dataObj := dataVal.ToObject(runtime)
						if dataObj != nil {
							// 提取 data 数组
							dataLen := dataObj.Get("length")
							if !goja.IsUndefined(dataLen) {
								arrayLen := int(dataLen.ToInteger())
								data := make([]byte, arrayLen)
								for i := 0; i < arrayLen; i++ {
									val := dataObj.Get(strconv.Itoa(i))
									if !goja.IsUndefined(val) && !goja.IsNull(val) {
										data[i] = byte(val.ToInteger())
									}
								}
								return data, true
							}
						}
					}
				}
			}
		}
	}

	// 降级方案：逐字节读取（兼容性更好，但效率较低）
	data := make([]byte, length)
	for i := 0; i < length; i++ {
		val := bufferObj.Get(strconv.Itoa(i))
		if goja.IsUndefined(val) || goja.IsNull(val) {
			data[i] = 0
		} else {
			data[i] = byte(val.ToInteger())
		}
	}

	return data, true
}

// RegisterFormDataModuleWithEventLoop 使用 EventLoop 注册模块（支持异步操作）
func RegisterFormDataModuleWithEventLoop(loop *eventloop.EventLoop, registry *require.Registry, fetchEnhancer *FetchEnhancer) {
	module := NewNodeFormDataModule(fetchEnhancer)

	registry.RegisterNativeModule("form-data", func(runtime *goja.Runtime, moduleObj *goja.Object) {
		// 创建 FormData 构造函数（支持异步）
		constructor := module.createFormDataConstructor(runtime)

		// 导出构造函数
		moduleObj.Set("exports", constructor)

		utils.Debug("Node.js form-data module registered (EventLoop supported)")
	})
}

// isNodeFormData 检查对象是否为 Node.js FormData
// 🔥 辅助方法：提供更安全的类型检查
func isNodeFormData(obj *goja.Object) bool {
	if obj == nil {
		return false
	}
	val := obj.Get("__isNodeFormData")
	return !goja.IsUndefined(val) && !goja.IsNull(val) && val.ToBoolean()
}

// isBufferValue 判断值是否为 Buffer（使用全局 Buffer.isBuffer）
func isBufferValue(runtime *goja.Runtime, val goja.Value) bool {
	if runtime == nil || val == nil {
		return false
	}

	bufferCtor := runtime.GlobalObject().Get("Buffer")
	if bufferCtor == nil || goja.IsUndefined(bufferCtor) || goja.IsNull(bufferCtor) {
		return false
	}

	bufferObj := bufferCtor.ToObject(runtime)
	if bufferObj == nil {
		return false
	}

	isBufferFn := bufferObj.Get("isBuffer")
	if isBufferFn == nil || goja.IsUndefined(isBufferFn) || goja.IsNull(isBufferFn) {
		return false
	}

	if fn, ok := goja.AssertFunction(isBufferFn); ok {
		if res, err := fn(bufferObj, val); err == nil {
			return res.ToBoolean()
		}
	}

	return false
}

// scheduleAsync 使用 setImmediate/setTimeout 异步调度
func scheduleAsync(runtime *goja.Runtime, fn func()) {
	if runtime == nil || fn == nil {
		return
	}

	if siVal := runtime.GlobalObject().Get("setImmediate"); siVal != nil && !goja.IsUndefined(siVal) && !goja.IsNull(siVal) {
		if si, ok := goja.AssertFunction(siVal); ok {
			if _, err := si(goja.Undefined(), runtime.ToValue(func(goja.FunctionCall) goja.Value {
				fn()
				return goja.Undefined()
			})); err == nil {
				return
			}
		}
	}

	if stVal := runtime.GlobalObject().Get("setTimeout"); stVal != nil && !goja.IsUndefined(stVal) && !goja.IsNull(stVal) {
		if st, ok := goja.AssertFunction(stVal); ok {
			if _, err := st(goja.Undefined(), runtime.ToValue(func(goja.FunctionCall) goja.Value {
				fn()
				return goja.Undefined()
			}), runtime.ToValue(0)); err == nil {
				return
			}
		}
	}

	fn()
}

type eventListener struct {
	cb   goja.Callable
	once bool
}

type jsEventEmitter struct {
	runtime   *goja.Runtime
	target    *goja.Object
	listeners map[string][]eventListener
}

func newJSEventEmitter(runtime *goja.Runtime, target *goja.Object) *jsEventEmitter {
	return &jsEventEmitter{
		runtime:   runtime,
		target:    target,
		listeners: make(map[string][]eventListener),
	}
}

func (em *jsEventEmitter) on(event string, cb goja.Value) {
	if em == nil || em.runtime == nil || em.target == nil {
		return
	}
	callable, ok := goja.AssertFunction(cb)
	if !ok {
		return
	}
	em.listeners[event] = append(em.listeners[event], eventListener{cb: callable})
}

func (em *jsEventEmitter) once(event string, cb goja.Value) {
	if em == nil || em.runtime == nil || em.target == nil {
		return
	}
	callable, ok := goja.AssertFunction(cb)
	if !ok {
		return
	}
	em.listeners[event] = append(em.listeners[event], eventListener{cb: callable, once: true})
}

func (em *jsEventEmitter) emit(event string, args ...goja.Value) {
	if em == nil || em.runtime == nil {
		return
	}
	listeners := em.listeners[event]
	if len(listeners) == 0 {
		return
	}

	// 移除 once 监听
	remaining := make([]eventListener, 0, len(listeners))
	for _, l := range listeners {
		if !l.once {
			remaining = append(remaining, l)
		}
	}
	em.listeners[event] = remaining

	callList := make([]eventListener, len(listeners))
	copy(callList, listeners)

	scheduleAsync(em.runtime, func() {
		for _, l := range callList {
			func(li eventListener) {
				defer func() { _ = recover() }()
				_, _ = li.cb(em.target, args...)
			}(l)
		}
	})
}

type submitTarget struct {
	protocol string
	host     string
	hostname string
	port     string
	path     string
	rawQuery string
	auth     string
	method   string
	headers  map[string]string
}

func parseSubmitTarget(runtime *goja.Runtime, val goja.Value) (submitTarget, error) {
	target := submitTarget{
		path:    "/",
		headers: map[string]string{},
	}

	if goja.IsUndefined(val) || goja.IsNull(val) {
		return target, fmt.Errorf("invalid submit target")
	}

	// 字符串 URL
	if exported := val.Export(); exported != nil {
		if str, ok := exported.(string); ok {
			urlStr := str
			parsed, err := neturl.Parse(urlStr)
			if err != nil || parsed.Scheme == "" {
				parsed, err = neturl.Parse("http://" + urlStr)
				if err != nil {
					return target, err
				}
			}
			target.protocol = parsed.Scheme
			target.host = parsed.Host
			if host, port, err := net.SplitHostPort(parsed.Host); err == nil {
				target.hostname = host
				target.port = port
			} else {
				target.hostname = parsed.Host
			}
			if parsed.Path != "" {
				target.path = parsed.Path
			}
			target.rawQuery = parsed.RawQuery
			if parsed.User != nil {
				target.auth = parsed.User.String()
			}
			return target, nil
		}
	}

	// options 对象
	obj := val.ToObject(runtime)
	if obj == nil {
		return target, fmt.Errorf("invalid submit options")
	}

	if protocolVal := obj.Get("protocol"); protocolVal != nil && !goja.IsUndefined(protocolVal) && !goja.IsNull(protocolVal) {
		target.protocol = strings.TrimSuffix(protocolVal.String(), ":")
	}
	if hostVal := obj.Get("host"); hostVal != nil && !goja.IsUndefined(hostVal) && !goja.IsNull(hostVal) {
		target.host = hostVal.String()
	}
	if hostnameVal := obj.Get("hostname"); hostnameVal != nil && !goja.IsUndefined(hostnameVal) && !goja.IsNull(hostnameVal) {
		target.hostname = hostnameVal.String()
	}
	if portVal := obj.Get("port"); portVal != nil && !goja.IsUndefined(portVal) && !goja.IsNull(portVal) {
		target.port = fmt.Sprintf("%v", portVal.Export())
	}
	if pathVal := obj.Get("path"); pathVal != nil && !goja.IsUndefined(pathVal) && !goja.IsNull(pathVal) {
		target.path = pathVal.String()
	}
	if methodVal := obj.Get("method"); methodVal != nil && !goja.IsUndefined(methodVal) && !goja.IsNull(methodVal) {
		target.method = methodVal.String()
	}
	if headersVal := obj.Get("headers"); headersVal != nil && !goja.IsUndefined(headersVal) && !goja.IsNull(headersVal) {
		target.headers = convertHeadersValue(runtime, headersVal)
	}
	if queryVal := obj.Get("query"); queryVal != nil && !goja.IsUndefined(queryVal) && !goja.IsNull(queryVal) {
		target.rawQuery = queryVal.String()
	}
	if authVal := obj.Get("auth"); authVal != nil && !goja.IsUndefined(authVal) && !goja.IsNull(authVal) {
		if authObj := authVal.ToObject(runtime); authObj != nil {
			user := ""
			pass := ""
			if v := authObj.Get("username"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				user = v.String()
			} else if v := authObj.Get("user"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				user = v.String()
			}
			if v := authObj.Get("password"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				pass = v.String()
			} else if v := authObj.Get("pass"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				pass = v.String()
			}
			if user != "" || pass != "" {
				target.auth = fmt.Sprintf("%s:%s", user, pass)
			} else {
				target.auth = authVal.String()
			}
		} else {
			target.auth = authVal.String()
		}
	}

	if target.path == "" {
		target.path = "/"
	}

	return target, nil
}

func convertHeadersValue(runtime *goja.Runtime, val goja.Value) map[string]string {
	headers := map[string]string{}
	if runtime == nil || val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return headers
	}
	obj := val.ToObject(runtime)
	if obj == nil {
		return headers
	}
	for _, key := range obj.Keys() {
		headers[strings.ToLower(key)] = fmt.Sprintf("%v", obj.Get(key))
	}
	return headers
}

func buildURLFromTarget(target submitTarget) (string, error) {
	protocol := target.protocol
	if protocol == "" {
		protocol = "http"
	}
	protocol = strings.TrimSuffix(protocol, ":")

	host := target.host
	if host == "" {
		host = target.hostname
	}
	if host == "" {
		host = "localhost"
	}

	if target.port != "" {
		if _, _, err := net.SplitHostPort(host); err != nil {
			host = net.JoinHostPort(host, target.port)
		}
	}

	path := target.path
	if path == "" {
		path = "/"
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	if target.rawQuery != "" && !strings.Contains(path, "?") {
		path = path + "?" + target.rawQuery
	}

	return fmt.Sprintf("%s://%s%s", protocol, host, path), nil
}

func (nfm *NodeFormDataModule) collectSubmitHeaders(runtime *goja.Runtime, formDataObj *goja.Object, extra map[string]string) (map[string]string, error) {
	if runtime == nil || formDataObj == nil {
		return nil, fmt.Errorf("runtime or formDataObj is nil")
	}

	getHeadersVal := formDataObj.Get("getHeaders")
	getHeadersFn, ok := goja.AssertFunction(getHeadersVal)
	if !ok {
		return nil, fmt.Errorf("getHeaders 不可用")
	}

	var arg []goja.Value
	if len(extra) > 0 {
		headersObj := runtime.NewObject()
		for k, v := range extra {
			headersObj.Set(k, v)
		}
		arg = append(arg, headersObj)
	}

	headersVal, err := getHeadersFn(formDataObj, arg...)
	if err != nil {
		return nil, err
	}

	headersObj := headersVal.ToObject(runtime)
	if headersObj == nil {
		return nil, fmt.Errorf("getHeaders 返回无效对象")
	}

	return convertHeadersValue(runtime, headersObj), nil
}

func normalizeRequestErrorValue(runtime *goja.Runtime, val goja.Value, fallbackCode string) goja.Value {
	if runtime == nil {
		return val
	}

	if err, ok := val.Export().(error); ok {
		val = fetch.CreateErrorObjectWithName(runtime, err, "Error")
	}

	obj := val.ToObject(runtime)
	if obj == nil {
		obj = runtime.NewObject()
		obj.Set("message", fmt.Sprintf("%v", val))
		val = obj
	}

	message := ""
	if msg := obj.Get("message"); msg != nil && !goja.IsUndefined(msg) && !goja.IsNull(msg) {
		message = msg.String()
	} else {
		message = val.String()
		obj.Set("message", message)
	}

	code := ""
	if codeVal := obj.Get("code"); codeVal != nil && !goja.IsUndefined(codeVal) && !goja.IsNull(codeVal) {
		code = codeVal.String()
	}

	if code == "" {
		lower := strings.ToLower(message)
		switch {
		case strings.Contains(lower, "refused"):
			code = "ECONNREFUSED"
		case strings.Contains(lower, "not found"), strings.Contains(lower, "enotfound"), strings.Contains(lower, "dns"):
			code = "ENOTFOUND"
		case strings.Contains(lower, "timeout"), strings.Contains(lower, "timed out"):
			code = "ETIMEDOUT"
		case strings.Contains(lower, "reset"):
			code = "ECONNRESET"
		case strings.Contains(lower, "abort"):
			code = "ECONNRESET"
		}
		if code == "" {
			code = fallbackCode
		}
		if code == "" {
			code = "ECONNRESET"
		}
		obj.Set("code", code)
	}

	return obj
}

func arrayBufferToBuffer(runtime *goja.Runtime, val goja.Value) (goja.Value, error) {
	if runtime == nil {
		return nil, fmt.Errorf("runtime is nil")
	}
	bufferCtor := runtime.Get("Buffer")
	if bufferCtor == nil || goja.IsUndefined(bufferCtor) || goja.IsNull(bufferCtor) {
		return nil, fmt.Errorf("Buffer 不可用")
	}
	bufferObj := bufferCtor.ToObject(runtime)
	if bufferObj == nil {
		return nil, fmt.Errorf("Buffer 不可用")
	}
	fromFn, ok := goja.AssertFunction(bufferObj.Get("from"))
	if !ok {
		return nil, fmt.Errorf("Buffer.from 不可用")
	}
	bufVal, err := fromFn(bufferObj, val)
	if err != nil {
		return nil, err
	}
	return bufVal, nil
}

func convertResponseHeaders(runtime *goja.Runtime, headersVal goja.Value) (*goja.Object, []string) {
	headersObj := runtime.NewObject()
	rawHeaders := make([]string, 0)
	if runtime == nil || headersVal == nil || goja.IsUndefined(headersVal) || goja.IsNull(headersVal) {
		return headersObj, rawHeaders
	}

	rawObj := headersVal.ToObject(runtime)
	if rawObj == nil {
		return headersObj, rawHeaders
	}

	if forEachFn, ok := goja.AssertFunction(rawObj.Get("forEach")); ok {
		forEachFn(rawObj, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			val := call.Argument(0)
			key := call.Argument(1)

			keyStr := key.String()
			headersObj.Set(strings.ToLower(keyStr), val.String())

			switch exported := val.Export().(type) {
			case []interface{}:
				for _, item := range exported {
					rawHeaders = append(rawHeaders, keyStr, fmt.Sprintf("%v", item))
				}
			case []string:
				for _, item := range exported {
					rawHeaders = append(rawHeaders, keyStr, item)
				}
			default:
				rawHeaders = append(rawHeaders, keyStr, val.String())
			}
			return goja.Undefined()
		}))
	}

	return headersObj, rawHeaders
}

func (nfm *NodeFormDataModule) createIncomingMessage(runtime *goja.Runtime, responseVal goja.Value, onError func(goja.Value)) *goja.Object {
	if runtime == nil {
		return nil
	}
	respObj := responseVal.ToObject(runtime)
	if respObj == nil {
		return nil
	}

	incoming := runtime.NewObject()
	emitter := newJSEventEmitter(runtime, incoming)
	incoming.Set("readable", true)

	if statusVal := respObj.Get("status"); statusVal != nil && !goja.IsUndefined(statusVal) && !goja.IsNull(statusVal) {
		incoming.Set("statusCode", statusVal.ToInteger())
	}
	if statusText := respObj.Get("statusText"); statusText != nil && !goja.IsUndefined(statusText) && !goja.IsNull(statusText) {
		incoming.Set("statusMessage", statusText.String())
	} else {
		incoming.Set("statusMessage", "")
	}
	headersObj, rawHeaders := convertResponseHeaders(runtime, respObj.Get("headers"))
	incoming.Set("headers", headersObj)
	rawHeadersArr := runtime.NewArray()
	for idx, v := range rawHeaders {
		rawHeadersArr.Set(strconv.Itoa(idx), v)
	}
	incoming.Set("rawHeaders", rawHeadersArr)

	var cancelOnce sync.Once
	cancelResponseBody := func(reason goja.Value) {
		cancelOnce.Do(func() {
			bodyVal := respObj.Get("body")
			if bodyVal == nil || goja.IsUndefined(bodyVal) || goja.IsNull(bodyVal) {
				return
			}
			bodyObj, ok := bodyVal.(*goja.Object)
			if !ok || bodyObj == nil {
				return
			}
			if cancelVal := bodyObj.Get("cancel"); cancelVal != nil && !goja.IsUndefined(cancelVal) && !goja.IsNull(cancelVal) {
				if cancelFn, ok := goja.AssertFunction(cancelVal); ok {
					if _, err := cancelFn(bodyObj, reason); err == nil {
						return
					}
				}
			}
			if destroyVal := bodyObj.Get("destroy"); destroyVal != nil && !goja.IsUndefined(destroyVal) && !goja.IsNull(destroyVal) {
				if destroyFn, ok := goja.AssertFunction(destroyVal); ok {
					_, _ = destroyFn(bodyObj, reason)
				}
			}
		})
	}

	var started bool
	var ended bool
	var destroyed bool

	startReading := func() {
		if started || destroyed {
			return
		}
		started = true

		arrayBufferFn, ok := goja.AssertFunction(respObj.Get("arrayBuffer"))
		if !ok {
			errVal := normalizeRequestErrorValue(runtime, runtime.NewTypeError("response.arrayBuffer 不可用"), "ECONNRESET")
			emitter.emit("error", errVal)
			if onError != nil {
				onError(errVal)
			}
			return
		}

		promiseVal, err := arrayBufferFn(respObj)
		if err != nil {
			errVal := normalizeRequestErrorValue(runtime, runtime.NewGoError(err), "ECONNRESET")
			emitter.emit("error", errVal)
			if onError != nil {
				onError(errVal)
			}
			return
		}

		promiseObj := promiseVal.ToObject(runtime)
		if promiseObj == nil {
			errVal := normalizeRequestErrorValue(runtime, runtime.NewTypeError("无效的响应 Promise"), "ECONNRESET")
			emitter.emit("error", errVal)
			if onError != nil {
				onError(errVal)
			}
			return
		}

		if thenFn, ok := goja.AssertFunction(promiseObj.Get("then")); ok {
			thenFn(promiseObj, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
				if destroyed {
					return goja.Undefined()
				}
				bufVal, bufErr := arrayBufferToBuffer(runtime, call.Argument(0))
				if bufErr != nil {
					errVal := normalizeRequestErrorValue(runtime, runtime.NewGoError(bufErr), "ECONNRESET")
					emitter.emit("error", errVal)
					if onError != nil {
						onError(errVal)
					}
					return goja.Undefined()
				}

				emitter.emit("data", bufVal)
				if !ended {
					ended = true
					emitter.emit("end")
					emitter.emit("close")
				}
				return goja.Undefined()
			}))
		}

		if catchFn, ok := goja.AssertFunction(promiseObj.Get("catch")); ok {
			catchFn(promiseObj, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
				errVal := normalizeRequestErrorValue(runtime, call.Argument(0), "ECONNRESET")
				emitter.emit("error", errVal)
				if onError != nil {
					onError(errVal)
				}
				if !ended {
					ended = true
					emitter.emit("close")
				}
				return goja.Undefined()
			}))
		}
	}

	incoming.Set("on", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) >= 2 {
			eventName := call.Arguments[0].String()
			emitter.on(eventName, call.Arguments[1])
			if eventName == "data" {
				startReading()
			}
		}
		return incoming
	})

	incoming.Set("once", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) >= 2 {
			eventName := call.Arguments[0].String()
			emitter.once(eventName, call.Arguments[1])
			if eventName == "data" {
				startReading()
			}
		}
		return incoming
	})

	incoming.Set("resume", func(call goja.FunctionCall) goja.Value {
		startReading()
		return incoming
	})

	incoming.Set("destroy", func(call goja.FunctionCall) goja.Value {
		if destroyed {
			return incoming
		}
		destroyed = true
		var reason goja.Value
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			reason = call.Arguments[0]
		}
		cancelResponseBody(reason)
		if reason != nil {
			errVal := normalizeRequestErrorValue(runtime, reason, "ECONNRESET")
			emitter.emit("error", errVal)
			if onError != nil {
				onError(errVal)
			}
		}
		emitter.emit("close")
		return incoming
	})

	return incoming
}

// detectTypedArrayOrArrayBuffer 检测是否为 TypedArray/ArrayBuffer（排除 Buffer）
func detectTypedArrayOrArrayBuffer(runtime *goja.Runtime, obj *goja.Object) (string, bool) {
	if runtime == nil || obj == nil {
		return "", false
	}

	ctor := obj.Get("constructor")
	if ctor == nil || goja.IsUndefined(ctor) || goja.IsNull(ctor) {
		return "", false
	}

	ctorObj := ctor.ToObject(runtime)
	if ctorObj == nil {
		return "", false
	}

	nameVal := ctorObj.Get("name")
	if nameVal == nil || goja.IsUndefined(nameVal) || goja.IsNull(nameVal) {
		return "", false
	}

	name := nameVal.String()
	switch name {
	case "ArrayBuffer", "SharedArrayBuffer",
		"Uint8Array", "Uint8ClampedArray",
		"Int8Array",
		"Uint16Array", "Int16Array",
		"Uint32Array", "Int32Array",
		"Float32Array", "Float64Array",
		"BigInt64Array", "BigUint64Array":
		return name, true
	default:
		return name, false
	}
}

// detectStreamingEntryForBuffer 检查 FormData 中是否包含流式字段（非 bytes.Reader）
// 如果存在流，getBuffer 应该与 Node form-data 一样直接抛出类型错误，避免同步读取大流
func detectStreamingEntryForBuffer(streamingFormData *formdata.StreamingFormData) (bool, string) {
	if streamingFormData == nil {
		return false, ""
	}

	entries := streamingFormData.GetEntries()
	for _, entry := range entries {
		if isStreamingValue(entry.Value) {
			return true, streamTypeName(entry.Value)
		}
	}

	// entries 可能在流式消费后被清空，使用缓存的模式或未知长度标记兜底
	if streamingFormData.HasStreamingEntries() || streamingFormData.HasUnknownStreamLength() {
		return true, "stream"
	}

	return false, ""
}

// isStreamingValue 判断单个值是否为流式数据
func isStreamingValue(val interface{}) bool {
	switch v := val.(type) {
	case formdata.UnknownLengthStreamPlaceholder:
		return v.NeedsLength
	case *formdata.UnknownLengthStreamPlaceholder:
		if v == nil {
			return false
		}
		return v.NeedsLength
	case io.Reader:
		if _, ok := v.(*bytes.Reader); ok {
			return false
		}
		return true
	default:
		return false
	}
}

// streamTypeName 返回用于错误提示的类型名称，尽量贴近 Node 抛出的类型描述
func streamTypeName(val interface{}) string {
	if val == nil {
		return "stream"
	}

	// UnknownLengthStreamPlaceholder 不需要暴露内部实现细节
	switch val.(type) {
	case formdata.UnknownLengthStreamPlaceholder, *formdata.UnknownLengthStreamPlaceholder:
		return "stream"
	}

	t := reflect.TypeOf(val)
	if t == nil {
		return "stream"
	}

	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}
	if t.Name() != "" {
		return t.Name()
	}
	return t.String()
}
