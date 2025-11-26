package fetch

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	neturl "net/url"
	"strings"
	"sync"
	"time"

	"flow-codeblock-go/enhance_modules/internal/blob"
	"flow-codeblock-go/enhance_modules/internal/body"
	"flow-codeblock-go/enhance_modules/internal/formdata"
	"flow-codeblock-go/enhance_modules/internal/ssrf"
	"flow-codeblock-go/enhance_modules/internal/transport"
	"flow-codeblock-go/enhance_modules/internal/url"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// ==================== FetchEnhancer ====================

// FetchEnhancer Fetch 增强器（集成所有功能）
// 🔥 核心组件：
// - config: 配置管理器（超时、大小限制等）
// - client: HTTP 客户端（连接池、超时等）
// - bodyHandler: Body 类型处理器（TypedArray、URLSearchParams 等）
//
// 设计说明:
// 1. **统一入口**:
//   - RegisterFetchAPI: 注册所有 API 到 goja Runtime
//   - fetch: 主方法（处理 URL、Request、options）
//
// 2. **模块化集成**:
//   - 使用 internal 包的实现（ssrf、formdata、body、blob、url）
//   - 使用 fetch 包的组件（config、security、constructors 等）
//   - 保持零依赖倒置（internal <- fetch <- root adapter）
//
// 3. **Promise 驱动**:
//   - EventLoop 模式：使用 setImmediate 轮询
//   - Runtime Pool 模式：同步等待结果
//
// 4. **类型系统**:
//   - Headers: 请求和响应头部对象
//   - Request: 请求构造器
//   - Response: 响应对象（支持 clone）
//   - AbortController: 请求取消控制器
//   - FormData: 浏览器兼容的 FormData API
//   - Blob/File: 二进制数据对象
//   - URLSearchParams: URL 查询参数对象
type FetchEnhancer struct {
	config      *FetchConfig          // 配置管理器
	client      *http.Client          // HTTP 客户端
	bodyHandler *body.BodyTypeHandler // Body 类型处理器
}

// ==================== 构造器 ====================

// NewFetchEnhancer 创建 Fetch 增强器（使用默认配置）
func NewFetchEnhancer() *FetchEnhancer {
	config := DefaultFetchConfig()
	return NewFetchEnhancerWithConfig(config)
}

// NewFetchEnhancerWithConfig 创建 Fetch 增强器（使用自定义配置）
func NewFetchEnhancerWithConfig(config *FetchConfig) *FetchEnhancer {
	if config == nil {
		config = DefaultFetchConfig()
	}

	// 🔥 创建带 SSRF 防护的 DialContext
	dialContext := ssrf.CreateProtectedDialContext(
		config.SSRFConfig,
		config.TransportConfig.DialTimeout,
		config.TransportConfig.KeepAlive,
	)

	// 🔥 创建 HTTP Transport（应用 TransportConfig 和 SSRF 防护）
	httpTransport := transport.CreateHTTPTransport(dialContext, config.TransportConfig)

	// 创建 HTTP 客户端（带连接池、超时、SSRF 防护）
	client := &http.Client{
		Timeout:   config.RequestTimeout,
		Transport: httpTransport,
	}

	// 创建 Body 类型处理器
	bodyHandler := body.NewBodyTypeHandler(config.MaxBlobFileSize)

	return &FetchEnhancer{
		config:      config,
		client:      client,
		bodyHandler: bodyHandler,
	}
}

// ==================== ModuleEnhancer 接口实现 ====================

// GetName 返回模块名称
func (fe *FetchEnhancer) GetName() string {
	return "fetch"
}

// Name 返回模块名称（ModuleEnhancer 接口）
func (fe *FetchEnhancer) Name() string {
	return fe.GetName()
}

// Register 注册模块到 require 系统（ModuleEnhancer 接口）
// 🔥 Fetch 模块不需要注册到 require，返回 nil
func (fe *FetchEnhancer) Register(registry *require.Registry) error {
	// Fetch 是全局 API，不需要 require()
	return nil
}

// Setup 在 Runtime 上设置全局对象（ModuleEnhancer 接口）
func (fe *FetchEnhancer) Setup(runtime *goja.Runtime) error {
	return fe.RegisterFetchAPI(runtime)
}

// Close 关闭模块并释放资源（ModuleEnhancer 接口）
// 🔥 Fetch 模块使用共享的 HTTP Client，不需要主动关闭
func (fe *FetchEnhancer) Close() error {
	// HTTP Client 会在进程退出时自动清理连接池
	return nil
}

// GetFormDataConfig 返回 FormData 配置（供 Node.js FormData 模块使用）
// 🔥 注意：返回的是配置副本，避免外部修改
func (fe *FetchEnhancer) GetFormDataConfig() *formdata.FormDataStreamConfig {
	if fe.config == nil || fe.config.FormDataConfig == nil {
		return formdata.DefaultFormDataStreamConfig()
	}
	// 返回副本，避免外部修改
	config := *fe.config.FormDataConfig
	return &config
}

// RegisterFetchAPI 注册 Fetch API 到 Runtime
// 🔥 对外接口：供 module_enhancer.go 调用
func (fe *FetchEnhancer) RegisterFetchAPI(runtime *goja.Runtime) error {
	if runtime == nil {
		return fmt.Errorf("runtime 为 nil")
	}

	// 1. 注册 fetch 主方法
	runtime.Set("fetch", fe.createFetchFunction(runtime))

	// 2. 注册 Headers 构造器
	runtime.Set("Headers", CreateHeadersConstructor(runtime))

	// 3. 注册 Request 构造器
	runtime.Set("Request", CreateRequestConstructor(runtime))

	// 4. 注册 AbortSignal 构造函数（必须在 AbortController 之前，因为需要初始化 prototype）
	runtime.Set("AbortSignal", CreateAbortSignalConstructor(runtime))

	// 5. 注册 AbortController 构造器
	nativeAbortController := runtime.ToValue(CreateAbortControllerConstructor(runtime))
	runtime.Set("AbortController", WrapAbortController(runtime, nativeAbortController))

	// 6. 注册 DOMException 构造器
	runtime.Set("DOMException", CreateDOMExceptionConstructor(runtime))

	// 7. 注册 Event 构造器
	runtime.Set("Event", CreateEventConstructor(runtime))

	// 8. 注册 FormData 构造器
	runtime.Set("FormData", CreateFormDataConstructor(runtime))

	// 9. 注册 Blob/File 构造器
	if err := blob.RegisterBlobFileConstructors(runtime, fe.config.MaxBlobFileSize); err != nil {
		return fmt.Errorf("注册 Blob/File 构造器失败: %w", err)
	}

	// 10. 注册 URLSearchParams 构造器
	if err := url.RegisterURLSearchParams(runtime); err != nil {
		return fmt.Errorf("注册 URLSearchParams 构造器失败: %w", err)
	}

	return nil
}

// ==================== Fetch 主方法 ====================

// createFetchFunction 创建 fetch 函数
// 🔥 核心入口：处理 URL、Request 对象、options
func (fe *FetchEnhancer) createFetchFunction(runtime *goja.Runtime) func(goja.FunctionCall) goja.Value {
	return func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("fetch 需要至少 1 个参数"))
		}

		// 1. 解析 URL（支持 string 或 Request 对象）
		var url string
		var options map[string]interface{}

		firstArg := call.Arguments[0]
		if obj, ok := firstArg.(*goja.Object); ok {
			// 🔥 先检查是否是 URL 对象（有 href 属性且 href 是字符串）
			hrefVal := obj.Get("href")
			if hrefVal != nil && !goja.IsUndefined(hrefVal) && !goja.IsNull(hrefVal) {
				// 尝试获取 href 值
				if hrefStr, ok := hrefVal.Export().(string); ok && hrefStr != "" {
					// 这是一个 URL 对象，使用其 href 属性作为 URL
					url = hrefStr
				} else {
					// href 不是有效字符串，尝试使用对象的 toString()
					url = firstArg.String()
				}
			} else if requestURL := obj.Get("url"); requestURL != nil && !goja.IsUndefined(requestURL) {
				// 这是一个 Request 对象
				url = requestURL.String()

				// 从 Request 对象提取 options
				options = make(map[string]interface{})
				if method := obj.Get("method"); !goja.IsUndefined(method) {
					options["method"] = method.String()
				}
				if headers := obj.Get("headers"); !goja.IsUndefined(headers) {
					if headersObj, ok := headers.(*goja.Object); ok {
						// 转换 headers 对象为 map
						headersMap := make(map[string]interface{})
						for _, key := range headersObj.Keys() {
							headersMap[key] = headersObj.Get(key).String()
						}
						options["headers"] = headersMap
					}
				}
				if bodyVal := obj.Get("body"); !goja.IsUndefined(bodyVal) && !goja.IsNull(bodyVal) {
					// 保留 body 对象，延迟处理
					if bodyObj, ok := bodyVal.(*goja.Object); ok {
						options["__rawBodyObject"] = bodyObj
					} else {
						// 🔥 字符串或其他基本类型，直接导出
						options["body"] = bodyVal.Export()
					}
				}
				// 🔥 从 Request 对象提取 signal（如果存在）
				if signalVal := obj.Get("signal"); !goja.IsUndefined(signalVal) && !goja.IsNull(signalVal) {
					if signalObj, ok := signalVal.(*goja.Object); ok {
						options["signal"] = signalObj
					}
				}
			} else {
				// 既不是 URL 对象也不是 Request 对象，尝试调用 toString()
				url = firstArg.String()
			}
		} else {
			url = firstArg.String()
		}

		// 2. 解析 options（如果有第二个参数）
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			if optionsArg := call.Arguments[1].ToObject(runtime); optionsArg != nil {
				if options == nil {
					options = make(map[string]interface{})
				}

				// 🔥 先保存 signal 和 body 对象（保持原始类型）
				var signalVal, bodyVal goja.Value
				if sv := optionsArg.Get("signal"); !goja.IsUndefined(sv) && sv != nil {
					signalVal = sv
				}
				if bv := optionsArg.Get("body"); !goja.IsUndefined(bv) && bv != nil {
					bodyVal = bv
				}

				// Export 其他选项
				exportedOptions := call.Arguments[1].Export()
				if optMap, ok := exportedOptions.(map[string]interface{}); ok {
					for k, v := range optMap {
						options[k] = v
					}
				}

				// 恢复 signal 和 body 对象
				if signalVal != nil && !goja.IsUndefined(signalVal) {
					// 🔥 保留原始的 goja.Value（无论是对象、字符串还是数字）
					// 这样后续可以正确验证并抛出 TypeError
					options["signal"] = signalVal
				}
				if bodyVal != nil && !goja.IsUndefined(bodyVal) {
					if bodyObj, ok := bodyVal.(*goja.Object); ok {
						options["__rawBodyObject"] = bodyObj
					}
				}
			}
		}

		// 3. 创建 Promise
		promise, resolve, reject := runtime.NewPromise()

		// 3.1 处理 auth 配置（兜底生成 Basic Authorization 头）
		if authVal, ok := options["auth"]; ok && authVal != nil {
			var username, password string

			switch v := authVal.(type) {
			case map[string]interface{}:
				if u, ok := v["username"].(string); ok {
					username = u
				}
				if p, ok := v["password"].(string); ok {
					password = p
				}
			case *goja.Object:
				if u := v.Get("username"); !goja.IsUndefined(u) && !goja.IsNull(u) {
					username = u.String()
				}
				if p := v.Get("password"); !goja.IsUndefined(p) && !goja.IsNull(p) {
					password = p.String()
				}
			}

			if username != "" {
				authHeader := "Basic " + base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", username, password)))
				if headers, ok := options["headers"].(map[string]interface{}); ok {
					if _, exists := headers["authorization"]; !exists {
						headers["authorization"] = authHeader
					}
				} else {
					options["headers"] = map[string]interface{}{
						"authorization": authHeader,
					}
				}
			}
		}

		// 4. 处理特殊 Body 类型（必须在 Promise 创建之后）
		if rawBodyObj, exists := options["__rawBodyObject"]; exists {
			if bodyObj, ok := rawBodyObj.(*goja.Object); ok {
				// 4.1 检查是否是 Node.js FormData（优先检查）
				isNodeFormDataVal := bodyObj.Get("__isNodeFormData")
				if !goja.IsUndefined(isNodeFormDataVal) && isNodeFormDataVal != nil && isNodeFormDataVal.ToBoolean() {
					// 🔥 Node.js FormData 处理
					// 方案1：尝试获取底层 StreamingFormData 对象（高效）
					if goStreamingFD := bodyObj.Get("__getGoStreamingFormData"); !goja.IsUndefined(goStreamingFD) {
						if streamingFormData, ok := goStreamingFD.Export().(*formdata.StreamingFormData); ok {
							// 🔥 判断使用缓冲模式还是流式模式
							totalSize := streamingFormData.GetTotalSize()
							boundary := streamingFormData.GetBoundary()

							// 🔥 如果总大小 <= 缓冲阈值，使用缓冲模式（返回 []byte）
							// 注意：totalSize == 0 的情况（空表单）也应该缓冲
							var bodyReaderOrBytes interface{}
							if totalSize >= 0 && totalSize <= fe.config.FormDataConfig.MaxBufferedFormDataSize {
								// 缓冲模式：一次性读取到内存
								reader, err := streamingFormData.CreateReader()
								if err != nil {
									reject(runtime.NewTypeError("创建 FormData reader 失败: " + err.Error()))
									return runtime.ToValue(promise)
								}

								// 读取所有数据
								data, err := io.ReadAll(reader)
								if err != nil {
									reject(runtime.NewTypeError("读取 FormData 失败: " + err.Error()))
									return runtime.ToValue(promise)
								}

								// 返回 []byte（带 Content-Length）
								bodyReaderOrBytes = data
							} else {
								// 流式模式：返回 Reader（chunked 传输）
								reader, err := streamingFormData.CreateReader()
								if err != nil {
									reject(runtime.NewTypeError("创建 FormData reader 失败: " + err.Error()))
									return runtime.ToValue(promise)
								}
								bodyReaderOrBytes = reader
								// 🔥 保存 StreamingFormData 对象，以便在请求执行时立即注入 context
								options["__streamingFormData"] = streamingFormData
							}

							options["__formDataBody"] = bodyReaderOrBytes
							options["__formDataBoundary"] = boundary

							// 自动设置 Content-Type（如果用户没有手动设置）
							if headers, ok := options["headers"].(map[string]interface{}); ok {
								if _, hasContentType := headers["content-type"]; !hasContentType {
									headers["content-type"] = fmt.Sprintf("multipart/form-data; boundary=%s", boundary)
								}
							} else {
								options["headers"] = map[string]interface{}{
									"content-type": fmt.Sprintf("multipart/form-data; boundary=%s", boundary),
								}
							}
						} else {
							reject(runtime.NewTypeError("无效的 Node.js FormData 对象"))
							return runtime.ToValue(promise)
						}
					} else {
						// 方案2：降级到 getBuffer()
						getBufferFunc := bodyObj.Get("getBuffer")
						if goja.IsUndefined(getBufferFunc) {
							reject(runtime.NewTypeError("Node.js FormData 缺少 getBuffer 方法"))
							return runtime.ToValue(promise)
						}

						getBuffer, ok := goja.AssertFunction(getBufferFunc)
						if !ok {
							reject(runtime.NewTypeError("getBuffer 不是一个函数"))
							return runtime.ToValue(promise)
						}

						// 调用 getBuffer() 获取数据
						bufferVal, err := getBuffer(bodyObj)
						if err != nil {
							reject(runtime.NewTypeError("调用 getBuffer 失败: " + err.Error()))
							return runtime.ToValue(promise)
						}

						// 提取 Buffer 数据
						bufferObj := bufferVal.ToObject(runtime)
						if bufferObj == nil {
							reject(runtime.NewTypeError("getBuffer 没有返回 Buffer"))
							return runtime.ToValue(promise)
						}

						// 从 Buffer 提取字节数据
						data, err := fe.extractBufferBytes(bufferObj)
						if err != nil {
							reject(runtime.NewTypeError("提取 buffer 数据失败: " + err.Error()))
							return runtime.ToValue(promise)
						}

						// 获取 boundary
						boundaryVal := bodyObj.Get("getBoundary")
						if goja.IsUndefined(boundaryVal) {
							reject(runtime.NewTypeError("Node.js FormData 缺少 getBoundary 方法"))
							return runtime.ToValue(promise)
						}
						getBoundaryFunc, ok := goja.AssertFunction(boundaryVal)
						if !ok {
							reject(runtime.NewTypeError("getBoundary 不是一个函数"))
							return runtime.ToValue(promise)
						}
						boundaryResult, err := getBoundaryFunc(bodyObj)
						if err != nil {
							reject(runtime.NewTypeError("调用 getBoundary 失败: " + err.Error()))
							return runtime.ToValue(promise)
						}
						boundary := boundaryResult.String()

						options["__formDataBody"] = data
						options["__formDataBoundary"] = boundary

						// 自动设置 Content-Type
						if headers, ok := options["headers"].(map[string]interface{}); ok {
							if _, hasContentType := headers["content-type"]; !hasContentType {
								headers["content-type"] = fmt.Sprintf("multipart/form-data; boundary=%s", boundary)
							}
						} else {
							options["headers"] = map[string]interface{}{
								"content-type": fmt.Sprintf("multipart/form-data; boundary=%s", boundary),
							}
						}
					}
				} else if isFormDataVal := bodyObj.Get("__isFormData"); !goja.IsUndefined(isFormDataVal) && isFormDataVal != nil && isFormDataVal.ToBoolean() {
					// 4.2 浏览器 FormData 处理
					// 🔥 关键：在当前 goroutine 中提取 FormData 数据
					bodyReaderOrBytes, boundary, err := fe.extractFormDataInCurrentThread(runtime, bodyObj)
					if err != nil {
						reject(runtime.NewTypeError("提取 FormData 失败: " + err.Error()))
						return runtime.ToValue(promise)
					}

					// 🔥 支持流式 Reader 或字节数组
					options["__formDataBody"] = bodyReaderOrBytes
					options["__formDataBoundary"] = boundary
				} else {
					// 4.3 处理其他特殊 Body 类型（TypedArray、URLSearchParams 等）
					if fe.bodyHandler == nil {
						reject(runtime.NewTypeError("bodyHandler 为 nil"))
						return runtime.ToValue(promise)
					}

					data, reader, ct, err := fe.bodyHandler.ProcessBody(runtime, bodyObj)
					if err != nil {
						reject(runtime.NewTypeError("处理 body 失败: " + err.Error()))
						return runtime.ToValue(promise)
					}

					if data != nil {
						// 已知大小的数据
						options["body"] = data
						if ct != "" {
							// 如果没有手动设置 Content-Type，则使用自动检测的
							// 🔥 修复：大小写不敏感检查 Content-Type
							if headers, ok := options["headers"].(map[string]interface{}); ok {
								hasContentType := false
								for key := range headers {
									if strings.EqualFold(key, "Content-Type") {
										hasContentType = true
										break
									}
								}
								if !hasContentType {
									headers["Content-Type"] = ct
								}
							} else {
								options["headers"] = map[string]interface{}{
									"Content-Type": ct,
								}
							}
						}
					} else if reader != nil {
						// 真正的流式数据
						options["body"] = reader
					}
				}
			}
			// 清理临时字段
			delete(options, "__rawBodyObject")
		}

		// 5. 检查是否有 AbortSignal
		var abortCh chan struct{}
		var signalObj *goja.Object // 保存 signal 对象引用，用于后续获取 reason

		if signal, ok := options["signal"]; ok && signal != nil {
			// 🔥 检查是否是 goja.Value
			signalValue, isGojaValue := signal.(goja.Value)

			// 🔥 如果 signal 不是 null 或 undefined，需要验证它是有效的 AbortSignal
			if isGojaValue && !goja.IsNull(signalValue) && !goja.IsUndefined(signalValue) {
				if sObj, ok := signal.(*goja.Object); ok {
					// 🔥 验证是否是真正的 AbortSignal（检查 __isAbortSignal 标记）
					isSignalVal := sObj.Get("__isAbortSignal")
					if isSignalVal != nil && !goja.IsUndefined(isSignalVal) && !goja.IsNull(isSignalVal) && isSignalVal.ToBoolean() {
						signalObj = sObj
						// 🔥 从 signal 对象获取已存在的 abortChannel
						// 🔥 使用 defer recover 保护 Export 调用，避免非法 signal 导致 panic
						if chVal := signalObj.Get("__abortChannel"); !goja.IsUndefined(chVal) && !goja.IsNull(chVal) {
							func() {
								defer func() {
									if r := recover(); r != nil {
										// 忽略非法的 __abortChannel，使用默认 channel
									}
								}()
								if ch, ok := chVal.Export().(chan struct{}); ok && ch != nil {
									abortCh = ch
								}
							}()
						}
					} else {
						// 🔥 不是有效的 AbortSignal，抛出 TypeError（与 Node.js 行为一致）
						panic(runtime.NewTypeError("signal is not a valid AbortSignal"))
					}
				} else {
					// 🔥 signal 不是对象类型（字符串、数字等），抛出 TypeError
					panic(runtime.NewTypeError("signal is not a valid AbortSignal"))
				}
			}
			// 🔥 如果 signal 是 null 或 undefined，静默忽略（符合 Node.js 行为）
		}

		// 先验证 URL 是否有效（即便 signal 已经 aborted 也要抛出 TypeError）
		if parsed, err := neturl.ParseRequestURI(url); err != nil || parsed.Scheme == "" {
			panic(runtime.NewTypeError("Invalid URL"))
		}

		// header 值 ASCII 校验
		if headers, ok := options["headers"].(map[string]interface{}); ok {
			for _, v := range headers {
				ensureASCIIHeaderValue(runtime, fmt.Sprintf("%v", v))
			}
		}

		// 🔥 检查 signal 是否已经 aborted（在发起请求前）
		if signalObj != nil {
			abortedVal := signalObj.Get("aborted")
			if !goja.IsUndefined(abortedVal) && !goja.IsNull(abortedVal) && abortedVal.ToBoolean() {
				// 🔥 signal 已经 aborted，直接 reject 并使用 signal.reason
				reasonVal := signalObj.Get("reason")
				if reasonVal != nil && !goja.IsUndefined(reasonVal) && !goja.IsNull(reasonVal) {
					// 使用自定义 reason
					reject(reasonVal)
				} else {
					// 使用默认 AbortError
					reject(CreateDOMException(runtime, "This operation was aborted", "AbortError"))
				}
				return runtime.ToValue(promise)
			}
		}

		// 如果没有 signal 或获取失败，创建一个新的（但不会被使用）
		if abortCh == nil {
			abortCh = make(chan struct{})
		}

		// 6. 创建请求控制通道
		req := &FetchRequest{
			url:       url,
			options:   options,
			resultCh:  make(chan FetchResult, 1),
			abortCh:   abortCh,
			signalObj: signalObj, // 🔥 传递 signal 对象，用于获取 reason
		}

		// 7. 异步执行请求（不阻塞 EventLoop）
		go ExecuteRequestAsync(fe.config, fe.client, req, fe.createBodyWrapper)

		// 8. 检查是否在 EventLoop 环境中
		setImmediateFn := runtime.Get("setImmediate")

		if setImmediateFn != nil && !goja.IsUndefined(setImmediateFn) {
			// EventLoop 模式：使用轮询机制
			resolveFunc := func(value goja.Value) { resolve(value) }
			rejectFunc := func(value goja.Value) { reject(value) }
			PollResult(runtime, req, resolveFunc, rejectFunc, setImmediateFn, fe.recreateResponse)
		} else {
			// Runtime Pool 模式：同步等待
			result := <-req.resultCh
			if result.err != nil {
				// 🔥 检查是否为 AbortError
				if _, isAbortError := result.err.(*AbortError); isAbortError {
					// 🔥 如果有自定义 abortReason，使用它；否则使用默认 AbortError
					if result.abortReason != nil && !goja.IsUndefined(result.abortReason) {
						reject(result.abortReason)
					} else {
						reject(CreateAbortErrorObject(runtime, result.err))
					}
				} else {
					reject(CreateErrorObject(runtime, result.err))
				}
			} else {
				resolve(fe.recreateResponse(runtime, result.response))
			}
		}

		return runtime.ToValue(promise)
	}
}

// ==================== 响应创建 ====================

// recreateResponse 创建响应对象（供 JavaScript 使用）
// 🔥 核心方法：将 ResponseData 转换为 JavaScript Response 对象
func (fe *FetchEnhancer) recreateResponse(runtime *goja.Runtime, data *ResponseData) goja.Value {
	if data == nil {
		return goja.Null()
	}

	respObj := runtime.NewObject()

	// 基础属性
	respObj.Set("status", runtime.ToValue(data.StatusCode))
	respObj.Set("statusText", runtime.ToValue(data.Status))
	respObj.Set("ok", runtime.ToValue(data.StatusCode >= 200 && data.StatusCode < 300))
	respObj.Set("url", runtime.ToValue(data.FinalURL))

	// 🔥 支持 redirected 属性（检测是否发生重定向）
	respObj.Set("redirected", runtime.ToValue(false)) // 简化实现，可扩展

	// Headers 对象
	respObj.Set("headers", fe.createResponseHeaders(runtime, data.Headers))

	// 🔥 核心：Body 读取方法（支持流式和缓冲）
	// 🔥 注意：clone() 方法在 attachStreamingBodyMethods 和 attachBufferedBodyMethods 中设置
	if data.IsStreaming {
		// 流式响应（支持 clone）
		fe.attachStreamingBodyMethods(runtime, respObj, data)
	} else {
		// 缓冲响应
		fe.attachBufferedBodyMethods(runtime, respObj, data)
	}

	return respObj
}

// createResponseHeaders 创建响应 Headers 对象
func (fe *FetchEnhancer) createResponseHeaders(runtime *goja.Runtime, httpHeaders http.Header) *goja.Object {
	headersObj := runtime.NewObject()

	// get(name) - 获取指定头部值
	headersObj.Set("get", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Null()
		}
		name := strings.ToLower(call.Arguments[0].String())
		for key, values := range httpHeaders {
			if strings.ToLower(key) == name && len(values) > 0 {
				// 🔥 Set-Cookie 特殊处理：返回数组
				if name == "set-cookie" && len(values) > 1 {
					return runtime.ToValue(values)
				}
				return runtime.ToValue(values[0])
			}
		}
		return goja.Null()
	})

	// has(name) - 检查是否存在指定头部
	headersObj.Set("has", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}
		name := strings.ToLower(call.Arguments[0].String())
		for key := range httpHeaders {
			if strings.ToLower(key) == name {
				return runtime.ToValue(true)
			}
		}
		return runtime.ToValue(false)
	})

	// forEach(callback) - 遍历所有头部
	headersObj.Set("forEach", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Undefined()
		}
		callback, ok := goja.AssertFunction(call.Arguments[0])
		if !ok {
			return goja.Undefined()
		}

		for key, values := range httpHeaders {
			if len(values) == 0 {
				continue
			}

			keyLower := strings.ToLower(key)
			if keyLower == "set-cookie" && len(values) > 1 {
				// Set-Cookie 返回数组
				callback(goja.Undefined(), runtime.ToValue(values), runtime.ToValue(key), headersObj)
			} else {
				callback(goja.Undefined(), runtime.ToValue(values[0]), runtime.ToValue(key), headersObj)
			}
		}
		return goja.Undefined()
	})

	return headersObj
}

// ==================== 流式响应处理 ====================

// attachStreamingBodyMethods 附加流式 Body 方法
// 🔥 支持：text(), json(), arrayBuffer(), body.getReader()
// 🔥 重要：text/json/arrayBuffer/blob 方法受 MaxResponseSize 限制（防止大响应占满内存）
// 🔥 线程安全：使用 setImmediate 替代 goroutine，确保所有 goja Runtime 操作在 EventLoop 中执行
func (fe *FetchEnhancer) attachStreamingBodyMethods(runtime *goja.Runtime, respObj *goja.Object, data *ResponseData) {
	// 创建 StreamReader（包装 BodyStream）
	streamReader := NewStreamReader(data.BodyStream, runtime, fe.config.MaxStreamingSize, data.ContentLength, data.AbortCh, data.Signal)

	// 🔥 创建 StreamingResponse（支持 Node.js + Web Streams）
	streamingResponse := NewStreamingResponse(streamReader, runtime, true) // cloneable=true

	// 🔥 取消状态标志（body.cancel() 后阻止读取）
	var cancelled bool
	var cancelledMutex sync.Mutex

	// 🔥 创建自定义 body 对象（包装 StreamingResponse.GetReader()）
	bodyObj := runtime.NewObject()
	innerReader := streamingResponse.GetReader()

	// getReader() 方法
	bodyObj.Set("getReader", func(call goja.FunctionCall) goja.Value {
		return innerReader
	})

	// cancel() 方法 - 设置取消标志并关闭流
	bodyObj.Set("cancel", func(call goja.FunctionCall) goja.Value {
		promise, resolve, _ := runtime.NewPromise()

		cancelledMutex.Lock()
		cancelled = true
		cancelledMutex.Unlock()

		// 关闭底层流
		streamingResponse.Close()

		resolve(goja.Undefined())
		return runtime.ToValue(promise)
	})

	// locked 属性
	bodyObj.Set("locked", false)

	respObj.Set("body", bodyObj)

	// 🔥 数据缓存机制（确保只读取一次）
	var cachedData []byte
	var cacheError error
	var cacheOnce sync.Once
	var cacheMutex sync.RWMutex

	// 🔥 将流式读取错误转换为 JS 可识别的错误对象
	convertStreamError := func(err error) goja.Value {
		if err == nil {
			return goja.Undefined()
		}

		switch e := err.(type) {
		case *AbortReasonError:
			reason := e.Reason()
			if reason == nil || goja.IsUndefined(reason) || goja.IsNull(reason) {
				reason = CreateDOMException(runtime, "This operation was aborted", "AbortError")
			}
			return reason
		case *AbortError:
			return CreateAbortErrorObject(runtime, err)
		default:
			return runtime.NewGoError(err)
		}
	}

	handleBodyReadError := func(err error, reject func(interface{}) error) bool {
		if err == nil {
			return false
		}
		reject(convertStreamError(err))
		return true
	}

	readStreamIntoCache := func() {
		defer func() {
			if r := recover(); r != nil {
				cacheMutex.Lock()
				cacheError = fmt.Errorf("读取响应流时发生内部错误: %v", r)
				cacheMutex.Unlock()
			}
		}()

		var buffer bytes.Buffer

		for {
			chunk, done, err := streamReader.Read(0)
			if err != nil {
				cacheMutex.Lock()
				cacheError = err
				cacheMutex.Unlock()
				return
			}

			if len(chunk) > 0 {
				if fe.config.MaxResponseSize > 0 && int64(buffer.Len()+len(chunk)) > fe.config.MaxResponseSize {
					cacheMutex.Lock()
					cacheError = fmt.Errorf(
						"响应大小超过缓冲限制: %.2fMB > %.2fMB (使用 .body.getReader() 进行流式读取)",
						float64(buffer.Len()+len(chunk))/1024/1024,
						float64(fe.config.MaxResponseSize)/1024/1024,
					)
					cacheMutex.Unlock()
					_ = streamingResponse.Close()
					return
				}
				_, _ = buffer.Write(chunk)
			}

			if done {
				break
			}
		}

		cacheMutex.Lock()
		cachedData = buffer.Bytes()
		cacheMutex.Unlock()
	}

	// 🔥 bodyUsed 状态
	var bodyUsed bool
	var bodyUsedMutex sync.Mutex

	// 通用的数据获取函数：优先使用缓存，缓存不存在时读取流
	getResponseData := func() ([]byte, error) {
		// 🔥 检查是否已取消（cancel 后返回空数据）
		cancelledMutex.Lock()
		isCancelled := cancelled
		cancelledMutex.Unlock()

		if isCancelled {
			return []byte{}, nil // cancel 后返回空数据
		}

		cacheOnce.Do(func() {
			// 🔥 再次检查取消状态（防止在 cacheOnce.Do 等待期间被取消）
			cancelledMutex.Lock()
			if cancelled {
				cancelledMutex.Unlock()
				return
			}
			cancelledMutex.Unlock()

			readStreamIntoCache()
		})

		// 🔥 最终检查：即使有缓存数据，如果已取消也返回空
		cancelledMutex.Lock()
		isCancelled = cancelled
		cancelledMutex.Unlock()

		if isCancelled {
			return []byte{}, nil
		}

		cacheMutex.RLock()
		defer cacheMutex.RUnlock()
		return cachedData, cacheError
	}

	// 检查并标记 body 为已使用
	checkAndMarkBodyUsed := func() error {
		bodyUsedMutex.Lock()
		defer bodyUsedMutex.Unlock()

		if bodyUsed {
			return fmt.Errorf("响应体已被消费")
		}
		bodyUsed = true
		respObj.Set("bodyUsed", runtime.ToValue(true))
		return nil
	}

	// text() - 读取为文本
	// 🔥 使用 setImmediate 替代 goroutine，确保线程安全
	respObj.Set("text", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		// 防御性保护
		defer func() {
			if r := recover(); r != nil {
				reject(runtime.NewGoError(fmt.Errorf("response.text internal error: %v", r)))
			}
		}()

		// 检查 body 是否已被使用
		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				defer func() {
					if r := recover(); r != nil {
						reject(runtime.NewGoError(fmt.Errorf("response.text internal error: %v", r)))
					}
				}()

				allData, err := getResponseData()
				if handleBodyReadError(err, reject) {
					return goja.Undefined()
				}
				resolve(runtime.ToValue(string(allData)))
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := getResponseData()
			if handleBodyReadError(err, reject) {
				return runtime.ToValue(promise)
			}
			resolve(runtime.ToValue(string(allData)))
		}

		return runtime.ToValue(promise)
	})

	// json() - 读取为 JSON
	// 🔥 使用 setImmediate 替代 goroutine
	respObj.Set("json", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		// 检查 body 是否已被使用
		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				defer func() {
					if r := recover(); r != nil {
						reject(runtime.NewGoError(fmt.Errorf("response.json internal error: %v", r)))
					}
				}()

				allData, err := getResponseData()
				if handleBodyReadError(err, reject) {
					return goja.Undefined()
				}

				var jsonData interface{}
				err = json.Unmarshal(allData, &jsonData)
				if err != nil {
					reject(runtime.NewTypeError(fmt.Sprintf("无效的 JSON: %v", err)))
				} else {
					resolve(runtime.ToValue(jsonData))
				}
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := getResponseData()
			if handleBodyReadError(err, reject) {
				return runtime.ToValue(promise)
			}

			var jsonData interface{}
			err = json.Unmarshal(allData, &jsonData)
			if err != nil {
				reject(runtime.NewTypeError(fmt.Sprintf("无效的 JSON: %v", err)))
			} else {
				resolve(runtime.ToValue(jsonData))
			}
		}

		return runtime.ToValue(promise)
	})

	// arrayBuffer() - 读取为 ArrayBuffer
	// 🔥 使用 setImmediate 替代 goroutine
	respObj.Set("arrayBuffer", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		// 检查 body 是否已被使用
		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				defer func() {
					if r := recover(); r != nil {
						reject(runtime.NewGoError(fmt.Errorf("response.arrayBuffer internal error: %v", r)))
					}
				}()

				allData, err := getResponseData()
				if handleBodyReadError(err, reject) {
					return goja.Undefined()
				}
				arrayBuffer := runtime.NewArrayBuffer(allData)
				resolve(runtime.ToValue(arrayBuffer))
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := getResponseData()
			if handleBodyReadError(err, reject) {
				return runtime.ToValue(promise)
			}
			arrayBuffer := runtime.NewArrayBuffer(allData)
			resolve(runtime.ToValue(arrayBuffer))
		}

		return runtime.ToValue(promise)
	})

	// blob() - 读取为 Blob
	// 🔥 使用 setImmediate 替代 goroutine
	respObj.Set("blob", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		// 检查 body 是否已被使用
		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				defer func() {
					if r := recover(); r != nil {
						reject(runtime.NewGoError(fmt.Errorf("response.blob internal error: %v", r)))
					}
				}()

				allData, err := getResponseData()
				if handleBodyReadError(err, reject) {
					return goja.Undefined()
				}

				// 从响应头获取 Content-Type
				contentType := "application/octet-stream"
				if ct := data.Headers.Get("Content-Type"); ct != "" {
					contentType = ct
				}

				// 创建 Blob 对象
				blobObj := runtime.NewObject()
				blobObj.Set("__isBlob", true)
				blobObj.Set("__data", allData)
				blobObj.Set("size", len(allData))
				blobObj.Set("type", contentType)

				resolve(blobObj)
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := getResponseData()
			if handleBodyReadError(err, reject) {
				return runtime.ToValue(promise)
			}

			contentType := "application/octet-stream"
			if ct := data.Headers.Get("Content-Type"); ct != "" {
				contentType = ct
			}

			blobObj := runtime.NewObject()
			blobObj.Set("__isBlob", true)
			blobObj.Set("__data", allData)
			blobObj.Set("size", len(allData))
			blobObj.Set("type", contentType)

			resolve(blobObj)
		}

		return runtime.ToValue(promise)
	})

	// bodyUsed 属性
	respObj.Set("bodyUsed", false)

	// 🔥 clone() 方法 - 使用缓存机制（性能优化：共享缓存，避免深拷贝）
	respObj.Set("clone", func(call goja.FunctionCall) goja.Value {
		// 🔥 先读取并缓存数据（确保原始和克隆都能读取）
		localData, err := getResponseData()
		if err != nil {
			panic(convertStreamError(err))
		}

		// 🔥 创建克隆的 ResponseData（非流式，共享缓存数据）
		clonedData := &ResponseData{
			StatusCode:    data.StatusCode,
			Status:        data.Status,
			Headers:       data.Headers.Clone(),
			Body:          localData, // 共享缓存，避免深拷贝
			IsStreaming:   false,     // 克隆为非流式
			FinalURL:      data.FinalURL,
			ContentLength: int64(len(localData)),
			AbortCh:       data.AbortCh,
			Signal:        data.Signal,
		}

		return fe.recreateResponse(runtime, clonedData)
	})
}

// attachBufferedBodyMethods 附加缓冲 Body 方法
func (fe *FetchEnhancer) attachBufferedBodyMethods(runtime *goja.Runtime, respObj *goja.Object, data *ResponseData) {
	// 缓冲数据已完全读取到 Body
	bodyData := data.Body

	// 🔥 bodyUsed 状态管理
	var bodyUsed bool
	var bodyUsedMutex sync.Mutex

	// 🔥 取消状态（与流式模式保持一致）
	var cancelled bool
	var cancelledMutex sync.RWMutex

	// getBodyData 返回当前可读的数据；cancel 后返回空数据
	getBodyData := func() []byte {
		cancelledMutex.RLock()
		isCancelled := cancelled
		cancelledMutex.RUnlock()
		if isCancelled {
			return []byte{}
		}
		return bodyData
	}

	// 标记为已取消
	markCancelled := func() {
		cancelledMutex.Lock()
		cancelled = true
		cancelledMutex.Unlock()
	}

	// 检查并标记 body 为已使用
	checkAndMarkBodyUsed := func() error {
		bodyUsedMutex.Lock()
		defer bodyUsedMutex.Unlock()

		if bodyUsed {
			return fmt.Errorf("响应体已被消费")
		}
		bodyUsed = true
		respObj.Set("bodyUsed", runtime.ToValue(true))
		return nil
	}

	// text() - 返回文本
	respObj.Set("text", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		resolve(runtime.ToValue(string(getBodyData())))
		return runtime.ToValue(promise)
	})

	// json() - 解析 JSON
	respObj.Set("json", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		jsonStr := string(getBodyData())
		jsonVal, err := runtime.RunString("(" + jsonStr + ")")
		if err != nil {
			reject(runtime.NewTypeError("无效的 JSON: " + err.Error()))
		} else {
			resolve(jsonVal)
		}
		return runtime.ToValue(promise)
	})

	// arrayBuffer() - 返回 ArrayBuffer
	respObj.Set("arrayBuffer", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		arrayBuffer := runtime.NewArrayBuffer(getBodyData())
		resolve(runtime.ToValue(arrayBuffer))
		return runtime.ToValue(promise)
	})

	// blob() - 返回 Blob
	respObj.Set("blob", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		contentType := "application/octet-stream"
		if ct := data.Headers.Get("Content-Type"); ct != "" {
			contentType = ct
		}

		blobObj := runtime.NewObject()
		blobObj.Set("__isBlob", true)
		blobObj.Set("__data", getBodyData())
		blobObj.Set("size", len(getBodyData()))
		blobObj.Set("type", contentType)

		resolve(blobObj)
		return runtime.ToValue(promise)
	})

	// 🔥 body 属性（ReadableStream 对象，支持 cancel 和 getReader）
	// Web API 标准：response.body 应该是 ReadableStream，不是 null
	bodyObj := runtime.NewObject()

	// getReader() 方法
	bodyObj.Set("getReader", func(call goja.FunctionCall) goja.Value {
		reader := runtime.NewObject()
		localIndex := 0

		// read() 方法
		reader.Set("read", func(call goja.FunctionCall) goja.Value {
			promise, resolve, _ := runtime.NewPromise()
			result := runtime.NewObject()

			cancelledMutex.RLock()
			isCancelled := cancelled
			cancelledMutex.RUnlock()

			if isCancelled {
				// 已取消：直接返回 done
				result.Set("value", goja.Undefined())
				result.Set("done", true)
				resolve(result)
				return runtime.ToValue(promise)
			}

			if localIndex < len(bodyData) {
				// 返回所有数据（一次性）
				uint8Array := runtime.NewArrayBuffer(bodyData[localIndex:])
				result.Set("value", runtime.ToValue(uint8Array))
				result.Set("done", false)
				localIndex = len(bodyData)
			} else {
				result.Set("value", goja.Undefined())
				result.Set("done", true)
			}

			resolve(result)
			return runtime.ToValue(promise)
		})

		// cancel() 方法
		reader.Set("cancel", func(call goja.FunctionCall) goja.Value {
			promise, resolve, _ := runtime.NewPromise()
			localIndex = len(bodyData) // 标记为已消费
			markCancelled()
			resolve(goja.Undefined())
			return runtime.ToValue(promise)
		})

		// closed 属性
		closedPromise, resolveClosedPromise, _ := runtime.NewPromise()
		resolveClosedPromise(goja.Undefined())
		reader.Set("closed", closedPromise)

		return reader
	})

	// cancel() 方法
	bodyObj.Set("cancel", func(call goja.FunctionCall) goja.Value {
		promise, resolve, _ := runtime.NewPromise()
		markCancelled()
		resolve(goja.Undefined())
		return runtime.ToValue(promise)
	})

	// locked 属性
	bodyObj.Set("locked", false)

	respObj.Set("body", bodyObj)
	respObj.Set("bodyUsed", false)

	// 🔥 clone() 方法 - 缓冲响应克隆（共享数据，避免深拷贝）
	respObj.Set("clone", func(call goja.FunctionCall) goja.Value {
		// 🔥 创建克隆的 ResponseData（共享缓存数据）
		localData := getBodyData()
		clonedData := &ResponseData{
			StatusCode:    data.StatusCode,
			Status:        data.Status,
			Headers:       data.Headers.Clone(),
			Body:          localData, // 共享缓存，避免深拷贝
			IsStreaming:   false,
			FinalURL:      data.FinalURL,
			ContentLength: int64(len(localData)),
			AbortCh:       data.AbortCh,
			Signal:        data.Signal,
		}

		return fe.recreateResponse(runtime, clonedData)
	})
}

// ==================== FormData 提取 ====================

// extractFormDataInCurrentThread 在当前线程提取 FormData
// 🔥 关键：必须在有 runtime 上下文时提取，避免异步 goroutine 中访问
// 🔥 返回值：interface{} 可能是 []byte（缓冲模式）或 io.Reader（流式模式）
func (fe *FetchEnhancer) extractFormDataInCurrentThread(runtime *goja.Runtime, formDataObj *goja.Object) (interface{}, string, error) {
	// 从浏览器 FormData 提取实例
	formData, err := ExtractFormDataInstance(formDataObj)
	if err != nil {
		return nil, "", err
	}

	// 防御性保护：配置兜底，避免 nil
	if fe.config == nil {
		fe.config = DefaultFetchConfig()
	}
	if fe.config.FormDataConfig == nil {
		fe.config.FormDataConfig = formdata.DefaultFormDataStreamConfig()
	}

	// 创建 StreamingFormData（使用内部包）
	// 🔥 使用 FormDataConfig 中的配置
	config := formdata.DefaultFormDataStreamConfigWithBuffer(
		fe.config.FormDataConfig.BufferSize,
		fe.config.FormDataConfig.MaxBufferedFormDataSize,
		fe.config.FormDataConfig.MaxStreamingFormDataSize,
		fe.config.FormDataConfig.MaxFileSize,
		fe.config.RequestTimeout,
	)
	streamingFormData := formdata.NewStreamingFormData(config)

	// 转换 entries
	entries := formData.GetEntries()
	for _, entry := range entries {
		// 处理不同类型的值
		var value interface{}
		var contentType string

		switch v := entry.Value.(type) {
		case string:
			value = v
		case []byte:
			value = v
		case goja.Value:
			// 可能是 Blob/File 对象
			if obj, ok := v.(*goja.Object); ok {
				// 🔥 先检查是否是 File（更具体），再检查 Blob（更通用）
				// 因为 File 继承自 Blob，所以 File 对象同时具有 __isBlob=true 和 __isFile=true
				if isFile := obj.Get("__isFile"); isFile != nil && !goja.IsUndefined(isFile) && !goja.IsNull(isFile) && isFile.ToBoolean() {
					dataBytes, ct, filename, err := fe.ExtractFileData(obj)
					if err != nil {
						return nil, "", fmt.Errorf("提取 File 数据失败: %w", err)
					}
					value = dataBytes
					contentType = ct
					// 如果入口未提供 filename，则使用 File 自带的名称
					if entry.Filename == "" && filename != "" {
						entry.Filename = filename
					}
				} else if isBlob := obj.Get("__isBlob"); isBlob != nil && !goja.IsUndefined(isBlob) && !goja.IsNull(isBlob) && isBlob.ToBoolean() {
					// 🔥 使用统一的提取方法，兼容 Blob 原生实现
					dataBytes, ct, err := fe.ExtractBlobData(obj)
					if err != nil {
						return nil, "", fmt.Errorf("提取 Blob 数据失败: %w", err)
					}
					value = dataBytes
					contentType = ct
				}
			}
			// 如果不是 Blob，转为字符串
			if value == nil {
				value = v.String()
			}
		case map[string]interface{}:
			// 🔥 对象转换为 "[object Object]"（符合浏览器行为，防止循环引用导致栈溢出）
			value = "[object Object]"
		case nil:
			// 🔥 nil 转换为 "null"
			value = "null"
		default:
			value = fmt.Sprintf("%v", v)
		}

		// 添加到 StreamingFormData
		streamingFormData.AddEntry(formdata.FormDataEntry{
			Name:        entry.Name,
			Value:       value,
			Filename:    entry.Filename,
			ContentType: contentType,
		})
	}

	// 🔥 判断使用缓冲模式还是流式模式
	totalSize := streamingFormData.GetTotalSize()
	boundary := streamingFormData.GetBoundary()
	shouldStream := streamingFormData.ShouldUseStreaming() || totalSize > fe.config.FormDataConfig.MaxBufferedFormDataSize

	// 🔥 如果总大小 <= 缓冲阈值，使用缓冲模式（返回 []byte）
	// 注意：totalSize == 0 的情况（空表单）也应该缓冲
	if !shouldStream && totalSize >= 0 && totalSize <= fe.config.FormDataConfig.MaxBufferedFormDataSize {
		// 缓冲模式：一次性读取到内存
		reader, err := streamingFormData.CreateReader()
		if err != nil {
			return nil, "", err
		}

		// 读取所有数据
		data, err := io.ReadAll(reader)
		if err != nil {
			return nil, "", fmt.Errorf("读取 FormData 失败: %w", err)
		}

		// 返回 []byte（带 Content-Length）
		return data, boundary, nil
	}

	// 流式模式：返回 Reader（chunked 传输）
	reader, err := streamingFormData.CreateReader()
	if err != nil {
		return nil, "", err
	}

	return reader, boundary, nil
}

// ==================== Body Wrapper ====================

// createBodyWrapper 创建 Body 包装器（带超时和取消）
// 🔥 核心方法：延迟 context 取消（在 body.Close() 时调用）
func (fe *FetchEnhancer) createBodyWrapper(body io.ReadCloser, contentLength int64, timeout time.Duration, cancel context.CancelFunc) io.ReadCloser {
	// 使用 body_timeout.go 中的实现
	// 参数顺序: body, contentLength, totalTimeout, baseIdleTimeout, cancel
	return CreateBodyWithCancel(body, contentLength, fe.config.ResponseReadTimeout, fe.config.ResponseBodyIdleTimeout, cancel)
}

// ==================== 辅助方法 ====================

// extractBufferBytes 从 Buffer 对象提取字节数据
// 🔥 用于 Node.js FormData 的 getBuffer() 方法返回值
func (fe *FetchEnhancer) extractBufferBytes(bufferObj *goja.Object) ([]byte, error) {
	// 安全检查
	if bufferObj == nil {
		return nil, fmt.Errorf("buffer object is nil")
	}

	// 获取 Buffer 长度
	lengthVal := bufferObj.Get("length")
	if lengthVal == nil || goja.IsUndefined(lengthVal) {
		return nil, fmt.Errorf("buffer object has no length property")
	}

	length := int(lengthVal.ToInteger())
	if length <= 0 {
		return []byte{}, nil
	}

	// 逐字节读取数据
	data := make([]byte, length)
	for i := 0; i < length; i++ {
		val := bufferObj.Get(fmt.Sprintf("%d", i))
		if goja.IsUndefined(val) {
			data[i] = 0
		} else {
			data[i] = byte(val.ToInteger())
		}
	}

	return data, nil
}

// ExtractFileData 从 File 对象提取数据
// 🔥 用于 Node.js FormData 模块处理 File 对象
func (fe *FetchEnhancer) ExtractFileData(fileObj *goja.Object) (data []byte, contentType string, filename string, err error) {
	// 🔥 防御性保护：捕获所有 panic
	defer func() {
		if r := recover(); r != nil {
			data = nil
			contentType = ""
			filename = ""
			err = fmt.Errorf("extract file data panic: %v", r)
		}
	}()

	// 安全检查
	if fileObj == nil {
		return nil, "", "", fmt.Errorf("file object is nil")
	}

	// 检查是否是 File 对象
	isFile := fileObj.Get("__isFile")
	if goja.IsUndefined(isFile) || isFile == nil || !isFile.ToBoolean() {
		return nil, "", "", fmt.Errorf("not a File object")
	}

	// 提取数据：优先使用新的 __fileData（*blob.JSFile），兼容旧的 __data []byte
	if dataVal := fileObj.Get("__fileData"); !goja.IsUndefined(dataVal) && !goja.IsNull(dataVal) && dataVal != nil {
		exported := dataVal.Export()
		if exported == nil {
			return nil, "", "", fmt.Errorf("file data export returned nil")
		}

		if fileData, ok := exported.(*blob.JSFile); ok {
			data = fileData.GetData()
			contentType = fileData.GetType()
			filename = fileData.GetName()
		} else {
			return nil, "", "", fmt.Errorf("file data is not *blob.JSFile, got %T", exported)
		}
	} else if legacyVal := fileObj.Get("__data"); !goja.IsUndefined(legacyVal) && !goja.IsNull(legacyVal) && legacyVal != nil {
		// 兼容旧对象上的 __data []byte
		exported := legacyVal.Export()
		if exported == nil {
			return nil, "", "", fmt.Errorf("legacy file data export returned nil")
		}
		bytesData, ok := exported.([]byte)
		if !ok {
			return nil, "", "", fmt.Errorf("legacy file data is not []byte, got %T", exported)
		}
		data = bytesData
		// contentType/filename 仍从属性中读取
	} else {
		return nil, "", "", fmt.Errorf("file has no __fileData or __data property")
	}

	// 提取 contentType
	if typeVal := fileObj.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
		contentType = typeVal.String()
	}

	// 提取 filename
	if nameVal := fileObj.Get("name"); nameVal != nil && !goja.IsUndefined(nameVal) && !goja.IsNull(nameVal) {
		filename = nameVal.String()
	}

	return data, contentType, filename, nil
}

// ExtractBlobData 从 Blob 对象提取数据
// 🔥 用于 Node.js FormData 模块处理 Blob 对象
func (fe *FetchEnhancer) ExtractBlobData(blobObj *goja.Object) (data []byte, contentType string, err error) {
	// 🔥 防御性保护：捕获所有 panic
	defer func() {
		if r := recover(); r != nil {
			data = nil
			contentType = ""
			err = fmt.Errorf("extract blob data panic: %v", r)
		}
	}()

	// 安全检查
	if blobObj == nil {
		return nil, "", fmt.Errorf("blob object is nil")
	}

	// 检查是否是 Blob 对象
	isBlob := blobObj.Get("__isBlob")
	if goja.IsUndefined(isBlob) || isBlob == nil || !isBlob.ToBoolean() {
		return nil, "", fmt.Errorf("not a Blob object")
	}

	// 提取数据：优先 __blobData（*blob.JSBlob），兼容旧的 __data []byte
	if dataVal := blobObj.Get("__blobData"); !goja.IsUndefined(dataVal) && !goja.IsNull(dataVal) && dataVal != nil {
		exported := dataVal.Export()
		if exported == nil {
			return nil, "", fmt.Errorf("blob data export returned nil")
		}

		if blobData, ok := exported.(*blob.JSBlob); ok {
			data = blobData.GetData()
			contentType = blobData.GetType()
		} else {
			return nil, "", fmt.Errorf("blob data is not *blob.JSBlob, got %T", exported)
		}
	} else if legacyVal := blobObj.Get("__data"); !goja.IsUndefined(legacyVal) && !goja.IsNull(legacyVal) && legacyVal != nil {
		exported := legacyVal.Export()
		if exported == nil {
			return nil, "", fmt.Errorf("legacy blob data export returned nil")
		}
		bytesData, ok := exported.([]byte)
		if !ok {
			return nil, "", fmt.Errorf("legacy blob data is not []byte, got %T", exported)
		}
		data = bytesData
	} else {
		return nil, "", fmt.Errorf("blob has no __blobData or __data property")
	}

	return data, contentType, nil
}

// ==================== 注释说明 ====================
// 🔥 设计原则：
//
// 1. **模块化集成**：
//    - internal 包：共享实现（ssrf、formdata、body、blob、url）
//    - fetch 包：业务逻辑（config、security、constructors、request、response）
//    - FetchEnhancer：统一入口（集成所有组件）
//
// 2. **零破坏性重构**：
//    - API 完全兼容原始实现
//    - 行为保持一致（Promise、EventLoop、Runtime Pool）
//    - 无需修改任何用户代码
//
// 3. **Promise 驱动**：
//    - EventLoop 模式：使用 setImmediate 轮询（不阻塞）
//    - Runtime Pool 模式：同步等待（goja Runtime 不是线程安全）
//
// 4. **类型系统**：
//    - Headers：请求和响应头部对象
//    - Request：请求构造器（支持 clone）
//    - Response：响应对象（支持 clone、流式、缓冲）
//    - AbortController：请求取消控制器
//    - FormData：浏览器兼容的 FormData API
//    - Blob/File：二进制数据对象
//    - URLSearchParams：URL 查询参数对象
//
// 5. **流式支持**：
//    - Node.js Readable Stream API
//    - Web Streams API（ReadableStream）
//    - Clone 缓存机制（首次读取时缓存）
//
// 6. **错误处理**：
//    - 浏览器兼容的错误码（ECONNABORTED、ENOTFOUND 等）
//    - AbortError 特殊处理
//    - 详细的错误消息（方便调试）
//
// 7. **资源管理**：
//    - 延迟 context 取消（bodyWrapper.Close() 时调用）
//    - 双重超时保护（idle + total）
//    - Abort 监听器（channel-based）
//    - 连接复用（HTTP Transport 配置）
