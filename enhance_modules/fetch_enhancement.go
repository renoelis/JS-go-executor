package enhance_modules

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
)

// randReader 全局随机数读取器（用于生成边界）
var randReader = rand.Reader

// bodyWithCancel 包装 io.ReadCloser，在关闭时取消 context
type bodyWithCancel struct {
	io.ReadCloser
	cancel context.CancelFunc
}

func (b *bodyWithCancel) Close() error {
	err := b.ReadCloser.Close()
	if b.cancel != nil {
		b.cancel() // 关闭时取消 context
	}
	return err
}

// FetchEnhancer Fetch API 增强器
type FetchEnhancer struct {
	client         *http.Client
	allowedDomains []string      // 白名单域名 (安全功能)
	maxRespSize    int64         // 最大响应大小（非流式）
	maxStreamSize  int64         // 🔥 最大流式响应大小（0表示不限制）
	defaultTimeout time.Duration // 默认超时

	// 🔥 新增：FormData 流式处理配置
	formDataConfig  *FormDataStreamConfig
	maxBlobFileSize int64 // Blob/File 最大大小（字节）

	// 🔥 新增：Body 类型处理器
	bodyHandler *BodyTypeHandler
}

// FetchRequest 异步 Fetch 请求结构
type FetchRequest struct {
	url      string
	options  map[string]interface{}
	resultCh chan FetchResult
	abortCh  chan struct{}
}

// FetchResult Fetch 请求结果
type FetchResult struct {
	response *ResponseData
	err      error
}

// NewFetchEnhancer 创建 Fetch 增强器（简化版本）
func NewFetchEnhancer(timeout time.Duration) *FetchEnhancer {
	return NewFetchEnhancerWithConfig(timeout, 1*1024*1024, 100*1024*1024, true, 0, 2*1024*1024, 50*1024*1024, 1*1024*1024, 100*1024*1024)
}

// NewFetchEnhancerWithConfig 创建带配置的 Fetch 增强器
// 🔥 新方案：支持差异化的 FormData 限制和流式下载限制
func NewFetchEnhancerWithConfig(
	timeout time.Duration,
	maxBufferedFormDataSize, maxStreamingFormDataSize int64, // FormData 差异化限制
	enableChunked bool,
	maxBlobFileSize int64,
	bufferSize int,
	maxFileSize int64,
	maxResponseSize int64, // 缓冲读取限制（arrayBuffer/blob/text/json）
	maxStreamingSize int64, // 流式读取限制（getReader）
) *FetchEnhancer {
	// 🔥 优化：配置高性能且安全的 HTTP Transport
	transport := &http.Transport{
		// 连接池配置
		MaxIdleConns:        50,               // 最大空闲连接数（合理值，避免过多占用）
		MaxIdleConnsPerHost: 10,               // 每个 host 的最大空闲连接数（合理值）
		MaxConnsPerHost:     100,              // 🚨 安全修复：限制每个 host 的最大连接数，防止慢速攻击
		IdleConnTimeout:     90 * time.Second, // 空闲连接超时

		// 连接超时配置
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second, // 连接建立超时
			KeepAlive: 30 * time.Second, // Keep-Alive 间隔
		}).DialContext,

		// TLS 握手超时
		TLSHandshakeTimeout: 10 * time.Second,

		// 响应头超时（使用传入的 timeout 参数，支持大文件上传）
		ResponseHeaderTimeout: timeout,

		// 期望继续超时
		ExpectContinueTimeout: 1 * time.Second,

		// 启用 HTTP/2
		ForceAttemptHTTP2: true,
	}

	// FormData 流式处理配置
	// 🔥 新方案：使用差异化限制
	formDataConfig := &FormDataStreamConfig{
		// 新方案：差异化限制
		MaxBufferedFormDataSize:  maxBufferedFormDataSize,  // 缓冲模式
		MaxStreamingFormDataSize: maxStreamingFormDataSize, // 流式模式

		// 其他配置
		EnableChunkedUpload: enableChunked,
		BufferSize:          bufferSize,
		MaxFileSize:         maxFileSize,
		Timeout:             timeout, // 🔥 HTTP 请求超时（用于 FormData 写入超时）

		// 🔧 废弃但保留兼容
		MaxFormDataSize:    maxBufferedFormDataSize, // 向后兼容
		StreamingThreshold: 1 * 1024 * 1024,         // 废弃
	}

	// Blob/File 大小限制
	if maxBlobFileSize == 0 {
		maxBlobFileSize = 100 * 1024 * 1024 // 默认 100MB
	}

	return &FetchEnhancer{
		client: &http.Client{
			Timeout:   timeout,
			Transport: transport,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 10 {
					return fmt.Errorf("stopped after 10 redirects")
				}
				return nil
			},
		},
		// 不限制域名，允许所有域名
		allowedDomains:  []string{},
		maxRespSize:     maxResponseSize,  // 🔥 使用配置的响应大小限制（非流式）
		maxStreamSize:   maxStreamingSize, // 🔥 流式下载大小限制（0表示不限制）
		defaultTimeout:  timeout,
		formDataConfig:  formDataConfig,
		maxBlobFileSize: maxBlobFileSize,
		bodyHandler:     NewBodyTypeHandler(), // 🔥 初始化 Body 类型处理器
	}
}

// RegisterFetchAPI 注册 fetch 全局函数到 JavaScript 环境
func (fe *FetchEnhancer) RegisterFetchAPI(runtime *goja.Runtime) error {
	// 注册 fetch() 函数
	runtime.Set("fetch", func(call goja.FunctionCall) goja.Value {
		return fe.fetch(runtime, call)
	})

	// 注册 Headers 构造器
	runtime.Set("Headers", fe.createHeadersConstructor(runtime))

	// 注册 Request 构造器
	runtime.Set("Request", fe.createRequestConstructor(runtime))

	// 注册 AbortController 构造器
	runtime.Set("AbortController", fe.createAbortControllerConstructor(runtime))

	// 注册 FormData 构造器
	runtime.Set("FormData", fe.createFormDataConstructor(runtime))

	// 🔥 新增：注册 Blob/File API
	if err := fe.RegisterBlobFileAPI(runtime); err != nil {
		return fmt.Errorf("failed to register Blob/File API: %w", err)
	}

	// 🔥 新增：注册 URLSearchParams API
	if err := RegisterURLSearchParams(runtime); err != nil {
		return fmt.Errorf("failed to register URLSearchParams: %w", err)
	}

	return nil
}

// fetch 主函数 - 实现标准 Fetch API (真正的异步实现)
// 🔥 重构: 使用 goroutine + channel 实现真正的异步,支持请求中取消
func (fe *FetchEnhancer) fetch(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	// 1. 参数验证
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("fetch: At least 1 argument required"))
	}

	url := call.Arguments[0].String()
	if url == "" {
		panic(runtime.NewTypeError("fetch: URL cannot be empty"))
	}

	// 2. 解析选项参数
	options := make(map[string]interface{})
	if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
		if obj := call.Arguments[1].ToObject(runtime); obj != nil {
			options = call.Arguments[1].Export().(map[string]interface{})

			// 🔥 关键修复: 保留特殊对象的原始 goja.Object 引用
			// 保留 signal 对象
			if signalVal := obj.Get("signal"); !goja.IsUndefined(signalVal) && signalVal != nil {
				if signalObj, ok := signalVal.(*goja.Object); ok {
					options["signal"] = signalObj // 保持原始类型
				}
			}

			// 保留 body 对象 (可能是 FormData) 但延迟处理
			if bodyVal := obj.Get("body"); !goja.IsUndefined(bodyVal) && bodyVal != nil {
				if bodyObj, ok := bodyVal.(*goja.Object); ok {
					options["__rawBodyObject"] = bodyObj // 暂存原始 body 对象
				}
			}
		}
	}

	// 3. 创建 Promise
	promise, resolve, reject := runtime.NewPromise()

	// 4. 处理特殊 Body 类型 (必须在 Promise 创建之后,以便使用 reject)
	if rawBodyObj, exists := options["__rawBodyObject"]; exists {
		if bodyObj, ok := rawBodyObj.(*goja.Object); ok {
			// 4.1 检查是否是 Node.js FormData (优先检查，因为更具体)
			isNodeFormDataVal := bodyObj.Get("__isNodeFormData")
			if !goja.IsUndefined(isNodeFormDataVal) && isNodeFormDataVal != nil && isNodeFormDataVal.ToBoolean() {
				// 🔥 Node.js FormData 处理
				// 方案1: 尝试获取底层 StreamingFormData 对象（高效）
				if goStreamingFD := bodyObj.Get("__getGoStreamingFormData"); !goja.IsUndefined(goStreamingFD) {
					if streamingFormData, ok := goStreamingFD.Export().(*StreamingFormData); ok {
						// 直接使用 StreamingFormData
						reader, err := streamingFormData.CreateReader()
						if err != nil {
							reject(runtime.NewTypeError("Failed to create FormData reader: " + err.Error()))
							return runtime.ToValue(promise)
						}
						options["__formDataBody"] = reader
						options["__formDataBoundary"] = streamingFormData.boundary

						// 自动设置 Content-Type (如果用户没有手动设置)
						if headers, ok := options["headers"].(map[string]interface{}); ok {
							if _, hasContentType := headers["content-type"]; !hasContentType {
								headers["content-type"] = fmt.Sprintf("multipart/form-data; boundary=%s", streamingFormData.boundary)
							}
						} else {
							options["headers"] = map[string]interface{}{
								"content-type": fmt.Sprintf("multipart/form-data; boundary=%s", streamingFormData.boundary),
							}
						}
					} else {
						reject(runtime.NewTypeError("Invalid Node.js FormData object"))
						return runtime.ToValue(promise)
					}
				} else {
					// 方案2: 降级到 getBuffer()
					getBufferFunc := bodyObj.Get("getBuffer")
					if goja.IsUndefined(getBufferFunc) {
						reject(runtime.NewTypeError("Node.js FormData missing getBuffer method"))
						return runtime.ToValue(promise)
					}

					getBuffer, ok := goja.AssertFunction(getBufferFunc)
					if !ok {
						reject(runtime.NewTypeError("getBuffer is not a function"))
						return runtime.ToValue(promise)
					}

					// 调用 getBuffer() 获取数据
					bufferVal, err := getBuffer(bodyObj)
					if err != nil {
						reject(runtime.NewTypeError("Failed to call getBuffer: " + err.Error()))
						return runtime.ToValue(promise)
					}

					// 提取 Buffer 数据
					bufferObj := bufferVal.ToObject(runtime)
					if bufferObj == nil {
						reject(runtime.NewTypeError("getBuffer did not return a Buffer"))
						return runtime.ToValue(promise)
					}

					// 从 Buffer 提取字节数据
					data, err := fe.extractBufferBytes(bufferObj)
					if err != nil {
						reject(runtime.NewTypeError("Failed to extract buffer data: " + err.Error()))
						return runtime.ToValue(promise)
					}

					// 获取 boundary
					boundaryVal := bodyObj.Get("getBoundary")
					if goja.IsUndefined(boundaryVal) {
						reject(runtime.NewTypeError("Node.js FormData missing getBoundary method"))
						return runtime.ToValue(promise)
					}
					getBoundaryFunc, ok := goja.AssertFunction(boundaryVal)
					if !ok {
						reject(runtime.NewTypeError("getBoundary is not a function"))
						return runtime.ToValue(promise)
					}
					boundaryResult, err := getBoundaryFunc(bodyObj)
					if err != nil {
						reject(runtime.NewTypeError("Failed to call getBoundary: " + err.Error()))
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
				// 4.2 浏览器 FormData 处理（原有逻辑）
				// 🔥 关键: 在当前 goroutine 中提取 FormData 数据
				// 因为在异步 goroutine 中无法访问 goja.Runtime
				bodyReaderOrBytes, boundary, err := fe.extractFormDataInCurrentThread(bodyObj)
				if err != nil {
					// ✅ 优化: 使用 Promise.reject 替代 panic
					reject(runtime.NewTypeError("Failed to extract FormData: " + err.Error()))
					return runtime.ToValue(promise)
				}

				// 🔥 新优化：支持流式 Reader 或字节数组
				// 根据大小决定使用哪种方式
				options["__formDataBody"] = bodyReaderOrBytes
				options["__formDataBoundary"] = boundary
			} else {
				// 4.2 处理其他特殊 Body 类型 (TypedArray, URLSearchParams, ArrayBuffer等)
				// 🔥 必须在有 runtime 上下文时处理

				// 安全检查
				if fe.bodyHandler == nil {
					reject(runtime.NewTypeError("bodyHandler is nil"))
					return runtime.ToValue(promise)
				}

				if bodyObj == nil {
					reject(runtime.NewTypeError("bodyObj is nil"))
					return runtime.ToValue(promise)
				}

				reader, contentType, _, err := fe.bodyHandler.ProcessBody(runtime, bodyObj)
				if err != nil {
					reject(runtime.NewTypeError("Failed to process body: " + err.Error()))
					return runtime.ToValue(promise)
				}

				if reader != nil {
					// 成功处理，读取为字节数组（因为 io.Reader 不能跨 goroutine）
					data, err := io.ReadAll(reader)
					if err != nil {
						reject(runtime.NewTypeError("Failed to read body: " + err.Error()))
						return runtime.ToValue(promise)
					}
					options["body"] = data // 转换为 []byte
					if contentType != "" {
						// 如果没有手动设置 Content-Type，则使用自动检测的
						if headers, ok := options["headers"].(map[string]interface{}); ok {
							if _, hasContentType := headers["Content-Type"]; !hasContentType {
								headers["Content-Type"] = contentType
							}
						} else {
							options["headers"] = map[string]interface{}{
								"Content-Type": contentType,
							}
						}
					}
				}
				// 如果 reader == nil，表示需要 JSON 序列化，保持原样
			}
		}
		// 清理临时字段
		delete(options, "__rawBodyObject")
	}

	// 5. 检查是否有 AbortSignal,如果有则使用其 channel
	var abortCh chan struct{}
	if signal, ok := options["signal"]; ok && signal != nil {
		if signalObj, ok := signal.(*goja.Object); ok {
			// 🔥 修复: 从 signal 对象获取已存在的 abortChannel
			if chVal := signalObj.Get("__abortChannel"); !goja.IsUndefined(chVal) {
				if ch, ok := chVal.Export().(chan struct{}); ok {
					abortCh = ch // 使用 controller 创建的 channel
				}
			}
		}
	}

	// 如果没有 signal 或获取失败,创建一个新的 (但不会被使用)
	if abortCh == nil {
		abortCh = make(chan struct{})
	}

	// 5. 创建请求控制通道
	req := &FetchRequest{
		url:      url,
		options:  options,
		resultCh: make(chan FetchResult, 1),
		abortCh:  abortCh, // 🔥 使用从 signal 获取的 channel
	}

	// 6. 异步执行请求 (不阻塞 EventLoop)
	go fe.executeRequestAsync(req)

	// 7. 检查是否在 EventLoop 环境中
	setImmediateFn := runtime.Get("setImmediate")

	if setImmediateFn != nil && !goja.IsUndefined(setImmediateFn) {
		// EventLoop 模式: 使用轮询机制
		// 包装 resolve/reject 为接受 goja.Value 的函数
		resolveFunc := func(value goja.Value) { resolve(value) }
		rejectFunc := func(value goja.Value) { reject(value) }
		fe.pollResult(runtime, req, resolveFunc, rejectFunc, setImmediateFn)
	} else {
		// 🔥 修复: Runtime Pool 模式 - 同步等待,不使用 goroutine
		// goja.Runtime 不是线程安全的,必须在当前线程中访问
		// Promise 的 resolve/reject 会在微任务队列中异步执行,这里同步等待是安全的
		result := <-req.resultCh
		if result.err != nil {
			reject(fe.createErrorObject(runtime, result.err))
		} else {
			resolve(fe.recreateResponse(runtime, result.response))
		}
	}

	return runtime.ToValue(promise)
}

// executeRequestAsync 异步执行 HTTP 请求
// 🔥 核心方法: 在独立的 goroutine 中执行请求,支持随时取消
func (fe *FetchEnhancer) executeRequestAsync(req *FetchRequest) {
	// 1. 解析 HTTP 方法
	method := "GET"
	if m, ok := req.options["method"].(string); ok {
		method = strings.ToUpper(m)
	}

	// 2. 解析请求体
	var body io.Reader
	var contentType string
	var contentLength int64 = -1 // -1 表示使用 chunked transfer

	// 🔥 优先检查 FormData 流式body
	if formDataBody, ok := req.options["__formDataBody"]; ok {
		if boundary, ok := req.options["__formDataBoundary"].(string); ok {
			contentType = "multipart/form-data; boundary=" + boundary

			// 🔥 关键优化：直接使用 io.Reader，支持流式传输
			switch v := formDataBody.(type) {
			case io.Reader:
				// 流式 Reader（大文件）
				body = v
				contentLength = -1 // 使用 chunked transfer
			case []byte:
				// 字节数组（小文件）
				body = bytes.NewReader(v)
				contentLength = int64(len(v))
			default:
				req.resultCh <- FetchResult{nil, fmt.Errorf("invalid FormData body type: %T", formDataBody)}
				return
			}
		}
	} else if b, ok := req.options["body"]; ok && b != nil {
		// 处理其他类型的 body（已经在 fetch 函数中预处理为基础类型）
		switch v := b.(type) {
		case string:
			body = strings.NewReader(v)
			contentLength = int64(len(v))
		case []byte:
			body = bytes.NewReader(v)
			contentLength = int64(len(v))
		case io.Reader:
			// 支持直接传入 io.Reader
			body = v
			contentLength = -1 // 使用 chunked transfer
		default:
			// 默认 JSON 序列化
			jsonData, err := json.Marshal(v)
			if err != nil {
				req.resultCh <- FetchResult{nil, fmt.Errorf("invalid body type: cannot serialize to JSON")}
				return
			}
			body = bytes.NewReader(jsonData)
			contentLength = int64(len(jsonData))
			contentType = "application/json"
		}
	}

	// 3. 创建上下文 (带超时)
	// 🔥 新方案：fetch 默认返回流式响应（符合标准 Fetch API）
	// StreamReader 负责生命周期管理，context 不会自动超时
	var ctx context.Context
	var cancel context.CancelFunc
	var cancelHandled bool // 标记 cancel 是否已被处理

	ctx, cancel = context.WithCancel(context.Background())
	// 🔥 防御性 defer：确保异常路径上 cancel 被调用
	defer func() {
		if !cancelHandled {
			cancel() // 如果没有被 bodyWrapper 接管，这里清理
		}
	}()

	// 4. 创建 HTTP 请求
	httpReq, err := http.NewRequestWithContext(ctx, method, req.url, body)
	if err != nil {
		cancel() // 🔥 修复：确保 cancel 被调用，防止 context 泄漏
		req.resultCh <- FetchResult{nil, fmt.Errorf("failed to create request: %w", err)}
		return
	}

	// 🔥 关键优化：设置 ContentLength
	// contentLength = -1 时，HTTP 客户端会自动使用 Transfer-Encoding: chunked
	// 但对于 GET/HEAD 等没有 body 的请求，不应设置 ContentLength = -1
	if body != nil {
		httpReq.ContentLength = contentLength
	} else {
		// GET/HEAD 等请求，body 为 nil，ContentLength 应为 0
		httpReq.ContentLength = 0
	}

	// 5. 设置请求头
	if headers, ok := req.options["headers"].(map[string]interface{}); ok {
		for key, value := range headers {
			httpReq.Header.Set(key, fmt.Sprintf("%v", value))
		}
	}
	if contentType != "" && httpReq.Header.Get("Content-Type") == "" {
		httpReq.Header.Set("Content-Type", contentType)
	}

	// 6. 协议安全检查
	if err := fe.checkProtocol(httpReq.URL.Scheme); err != nil {
		cancel() // 🔥 修复：确保 cancel 被调用，防止 context 泄漏
		req.resultCh <- FetchResult{nil, err}
		return
	}

	// 7. 启动请求 (在独立的 goroutine 中)
	// 🔥 Goroutine 生命周期保证：
	//   - http.NewRequestWithContext 确保 Context 取消时中断请求
	//   - ResponseHeaderTimeout 防止无限期等待响应头
	//   - Abort/Timeout 场景都会 <-done 等待 goroutine 退出
	//   - 无 goroutine 泄漏风险
	done := make(chan struct{})
	var resp *http.Response
	var reqErr error

	go func() {
		resp, reqErr = fe.client.Do(httpReq)
		close(done)
	}()

	// 🔥 资源泄漏修复: 使用 defer 确保 resp.Body 总是被关闭
	// 无论是正常完成、取消还是超时，都会清理资源
	// 🔥 新方案：总是流式模式，由 StreamReader 管理生命周期
	shouldCloseBody := false // 总是由 StreamReader 负责关闭
	defer func() {
		if shouldCloseBody && resp != nil && resp.Body != nil {
			// 清空 Body 以帮助连接复用 (性能提升 ~100x)
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
		}
	}()

	// 8. 等待请求完成、取消或超时
	select {
	case <-done:
		// 请求完成
		if reqErr != nil {
			// 🔥 修复：确保 cancel 被调用，防止 context 泄漏
			cancel()
			// defer 会清理 resp.Body
			if ctx.Err() == context.Canceled {
				req.resultCh <- FetchResult{nil, fmt.Errorf("request aborted")}
			} else if ctx.Err() == context.DeadlineExceeded {
				req.resultCh <- FetchResult{nil, fmt.Errorf("request timeout")}
			} else {
				req.resultCh <- FetchResult{nil, fmt.Errorf("network error: %w", reqErr)}
			}
			return
		}

		// 🔥 优化：提前检查 Content-Length（节省带宽）
		// 如果服务器明确告知文件大小，且超过限制，立即失败（0下载）
		if resp.ContentLength > 0 && fe.maxStreamSize > 0 && resp.ContentLength > fe.maxStreamSize {
			sizeMB := float64(resp.ContentLength) / 1024 / 1024
			limitMB := float64(fe.maxStreamSize) / 1024 / 1024

			cancel() // 取消请求
			req.resultCh <- FetchResult{
				nil,
				fmt.Errorf(
					"文件大小超过流式下载限制: %.2fMB > %.2fMB (Content-Length: %d 字节) - 提示: 请调整 MAX_STREAMING_SIZE_MB 配置",
					sizeMB, limitMB, resp.ContentLength,
				),
			}
			return
		}

		// 🔥 新方案：总是返回流式响应（符合标准 Fetch API）
		// 创建一个包装器，在关闭时也取消 context
		bodyWrapper := &bodyWithCancel{
			ReadCloser: resp.Body,
			cancel:     cancel,
		}

		req.resultCh <- FetchResult{
			response: &ResponseData{
				StatusCode:    resp.StatusCode,
				Status:        resp.Status,
				Headers:       resp.Header,
				BodyStream:    bodyWrapper, // 传递包装后的 Body
				IsStreaming:   true,        // 总是流式
				FinalURL:      resp.Request.URL.String(),
				ContentLength: resp.ContentLength, // 🔥 保存 Content-Length（用于智能预分配）
			},
			err: nil,
		}
		// ⚠️ 不在这里关闭 Body，由 StreamReader 负责
		shouldCloseBody = false // 🔥 关键：防止 defer 关闭 Body
		cancelHandled = true    // 🔥 标记 cancel 已被 bodyWrapper 接管

	case <-req.abortCh:
		// 🔥 请求被取消 (用户调用了 controller.abort())
		cancel() // 取消 context,中断 HTTP 请求
		// 🔥 修复: 等待请求真正结束
		<-done
		// defer 会清理 resp.Body

		// 🔥 修复: 使用 select 防止 channel 阻塞
		select {
		case req.resultCh <- FetchResult{nil, fmt.Errorf("request aborted")}:
		default:
			// channel 已满或已关闭,忽略
		}

	case <-ctx.Done():
		// 🔥 修复: 超时时必须等待 client.Do() 完成
		<-done
		// defer 会清理 resp.Body

		if ctx.Err() == context.DeadlineExceeded {
			req.resultCh <- FetchResult{nil, fmt.Errorf("request timeout")}
		} else {
			req.resultCh <- FetchResult{nil, ctx.Err()}
		}
	}
}

// pollResult 使用 setImmediate 轮询请求结果 (EventLoop 模式)
// 🔥 不阻塞 EventLoop,保持异步特性
func (fe *FetchEnhancer) pollResult(runtime *goja.Runtime, req *FetchRequest, resolve, reject func(goja.Value), setImmediate goja.Value) {
	fn, ok := goja.AssertFunction(setImmediate)
	if !ok {
		reject(fe.createErrorObject(runtime, fmt.Errorf("setImmediate is not a function")))
		return
	}

	// 创建轮询函数
	var checkResult func(goja.FunctionCall) goja.Value
	checkResult = func(call goja.FunctionCall) goja.Value {
		select {
		case result := <-req.resultCh:
			// 有结果了
			if result.err != nil {
				reject(fe.createErrorObject(runtime, result.err))
			} else {
				resolve(fe.recreateResponse(runtime, result.response))
			}
		default:
			// 🔥 修复: 添加 1ms 延迟避免 CPU 空转
			// 还没结果,继续轮询
			fn(goja.Undefined(), runtime.ToValue(checkResult), runtime.ToValue(1))
		}
		return goja.Undefined()
	}

	// 开始第一次轮询
	fn(goja.Undefined(), runtime.ToValue(checkResult), runtime.ToValue(1))
}

// createErrorObject 创建标准的 JavaScript Error 对象
// 🔥 修复: 错误对象有正确的 message 和 toString 方法
func (fe *FetchEnhancer) createErrorObject(runtime *goja.Runtime, err error) goja.Value {
	errorObj := runtime.NewObject()
	errorMsg := err.Error()
	errorObj.Set("message", errorMsg)
	errorObj.Set("name", "TypeError")

	// 🔥 添加 toString 方法,确保错误信息正确显示
	errorObj.Set("toString", func(call goja.FunctionCall) goja.Value {
		return runtime.ToValue("TypeError: " + errorMsg)
	})

	return errorObj
}

// makeRequest 已废弃 - 使用 executeRequestAsync 和 pollResult 替代
// 🔥 清理: 移除同步阻塞的 makeRequest 方法,统一使用异步实现

// createResponseHeaders 创建 Headers 对象用于 response.headers
func (fe *FetchEnhancer) createResponseHeaders(runtime *goja.Runtime, httpHeaders http.Header) *goja.Object {
	headersObj := runtime.NewObject()

	// headers.get(name) - 获取指定头部值
	headersObj.Set("get", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Null()
		}
		name := strings.ToLower(call.Arguments[0].String())
		for key, values := range httpHeaders {
			if strings.ToLower(key) == name && len(values) > 0 {
				return runtime.ToValue(values[0])
			}
		}
		return goja.Null()
	})

	// headers.has(name) - 检查是否存在指定头部
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

	// headers.forEach(callback) - 遍历所有头部
	headersObj.Set("forEach", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Undefined()
		}
		callback, ok := goja.AssertFunction(call.Arguments[0])
		if !ok {
			return goja.Undefined()
		}

		for key, values := range httpHeaders {
			if len(values) > 0 {
				callback(goja.Undefined(), runtime.ToValue(values[0]), runtime.ToValue(key), headersObj)
			}
		}
		return goja.Undefined()
	})

	return headersObj
}

// createHeadersConstructor 创建 Headers 构造器
func (fe *FetchEnhancer) createHeadersConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
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

			return iterator
		})

		return obj
	}
}

// checkProtocol 协议安全检查 (仅允许 http/https)
func (fe *FetchEnhancer) checkProtocol(scheme string) error {
	scheme = strings.ToLower(scheme)
	if scheme == "http" || scheme == "https" {
		return nil
	}
	return fmt.Errorf("protocol not allowed: %s (only http/https are supported)", scheme)
}

// createRequestConstructor 创建 Request 构造器
func (fe *FetchEnhancer) createRequestConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	return func(call goja.ConstructorCall) *goja.Object {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Request constructor requires at least 1 argument"))
		}

		url := call.Arguments[0].String()
		options := make(map[string]interface{})

		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			if optionsObj := call.Arguments[1].ToObject(runtime); optionsObj != nil {
				options = call.Arguments[1].Export().(map[string]interface{})
			}
		}

		// 解析选项
		method := "GET"
		if m, ok := options["method"].(string); ok {
			method = strings.ToUpper(m)
		}

		headers := make(map[string]string)
		if h, ok := options["headers"].(map[string]interface{}); ok {
			for key, value := range h {
				headers[strings.ToLower(key)] = fmt.Sprintf("%v", value)
			}
		}

		var body string
		if b, ok := options["body"]; ok && b != nil {
			body = fmt.Sprintf("%v", b)
		}

		// 创建 Request 对象
		requestObj := runtime.NewObject()
		requestObj.Set("url", runtime.ToValue(url))
		requestObj.Set("method", runtime.ToValue(method))
		requestObj.Set("body", runtime.ToValue(body))

		// 创建 headers 对象
		headersObj := runtime.NewObject()
		for key, value := range headers {
			headersObj.Set(key, runtime.ToValue(value))
		}
		requestObj.Set("headers", headersObj)

		// clone 方法
		requestObj.Set("clone", func(call goja.FunctionCall) goja.Value {
			clonedRequest := runtime.NewObject()
			clonedRequest.Set("url", runtime.ToValue(url))
			clonedRequest.Set("method", runtime.ToValue(method))
			clonedRequest.Set("body", runtime.ToValue(body))
			clonedRequest.Set("headers", headersObj)
			return clonedRequest
		})

		return requestObj
	}
}

// createAbortControllerConstructor 创建 AbortController 构造器
// 🔥 重构: 使用 channel 代替 context,支持请求中取消
func (fe *FetchEnhancer) createAbortControllerConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	return func(call goja.ConstructorCall) *goja.Object {
		// 🔥 使用 channel 作为取消信号 (替代 context)
		// channel 的优势: 可以在任何 goroutine 中安全地 close,支持多个 goroutine 同时监听
		abortCh := make(chan struct{})
		aborted := false
		var abortedMutex sync.Mutex // 保护 aborted 状态

		// 创建 AbortSignal 对象
		signal := runtime.NewObject()
		signal.Set("aborted", false)
		signal.Set("__abortChannel", abortCh) // 🔥 保存 channel 引用,供 fetch 使用

		// 事件监听器存储
		var listeners []goja.Value
		var listenersMutex sync.Mutex

		// addEventListener 方法
		signal.Set("addEventListener", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) >= 2 {
				eventType := call.Arguments[0].String()
				if eventType == "abort" {
					listenersMutex.Lock()
					listeners = append(listeners, call.Arguments[1])
					listenersMutex.Unlock()
				}
			}
			return goja.Undefined()
		})

		// removeEventListener 方法
		signal.Set("removeEventListener", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) >= 2 {
				eventType := call.Arguments[0].String()
				if eventType == "abort" {
					listener := call.Arguments[1]
					listenersMutex.Lock()
					for i, l := range listeners {
						if l.SameAs(listener) {
							listeners = append(listeners[:i], listeners[i+1:]...)
							break
						}
					}
					listenersMutex.Unlock()
				}
			}
			return goja.Undefined()
		})

		// 创建 AbortController 对象
		controller := runtime.NewObject()
		controller.Set("signal", signal)

		// abort 方法
		controller.Set("abort", func(call goja.FunctionCall) goja.Value {
			abortedMutex.Lock()
			if !aborted {
				aborted = true
				abortedMutex.Unlock()

				// 🔥 关闭 channel 发送取消信号
				// close(channel) 是线程安全的,所有监听该 channel 的 goroutine 都会收到信号
				// 🔥 修复: 使用 defer + recover 防止重复 close 导致 panic
				func() {
					defer func() {
						if r := recover(); r != nil {
							// channel 已经被关闭,忽略 panic
						}
					}()
					close(abortCh)
				}()

				// 更新 signal 状态
				signal.Set("aborted", true)

				// 🔥 触发事件监听器 (在下一个 tick 执行,保持异步特性)
				setImmediate := runtime.Get("setImmediate")
				if setImmediate != nil && !goja.IsUndefined(setImmediate) {
					if fn, ok := goja.AssertFunction(setImmediate); ok {
						triggerListeners := runtime.ToValue(func(call goja.FunctionCall) goja.Value {
							listenersMutex.Lock()
							listenersCopy := make([]goja.Value, len(listeners))
							copy(listenersCopy, listeners)
							listenersMutex.Unlock()

							for _, listener := range listenersCopy {
								if listenerFn, ok := goja.AssertFunction(listener); ok {
									event := runtime.NewObject()
									event.Set("type", "abort")
									listenerFn(goja.Undefined(), event)
								}
							}
							return goja.Undefined()
						})
						fn(goja.Undefined(), triggerListeners, runtime.ToValue(0))
					}
				} else {
					// Runtime Pool 模式: 直接同步触发
					listenersMutex.Lock()
					listenersCopy := make([]goja.Value, len(listeners))
					copy(listenersCopy, listeners)
					listenersMutex.Unlock()

					for _, listener := range listenersCopy {
						if listenerFn, ok := goja.AssertFunction(listener); ok {
							event := runtime.NewObject()
							event.Set("type", "abort")
							listenerFn(goja.Undefined(), event)
						}
					}
				}
			} else {
				abortedMutex.Unlock()
			}
			return goja.Undefined()
		})

		return controller
	}
}

// FormDataEntry 表示 FormData 中的一个条目
type FormDataEntry struct {
	Name        string
	Value       interface{} // 可以是 string 或 []byte
	Filename    string      // 文件名（如果是文件）
	ContentType string      // MIME 类型（如果是文件）
}

// createFormDataConstructor 创建 FormData 构造器
func (fe *FetchEnhancer) createFormDataConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	return func(call goja.ConstructorCall) *goja.Object {
		// FormData 内部存储（支持文本和二进制数据）
		// 🔥 使用切片指针保持插入顺序（Go map 遍历顺序随机）
		formDataEntries := &[]FormDataEntry{}
		formData := make(map[string][]FormDataEntry)

		// 创建 FormData 对象
		formDataObj := runtime.NewObject()

		// 🔥 设置类型标识（让 axios 能正确识别）
		formDataObj.Set("__isFormData", true)
		formDataObj.Set("__isNodeFormData", false)
		formDataObj.Set("__type", "web-formdata")

		// append(name, value, filename) - 添加字段
		formDataObj.Set("append", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("FormData.append requires at least 2 arguments"))
			}

			name := call.Arguments[0].String()
			valueArg := call.Arguments[1]

			var entry FormDataEntry
			entry.Name = name

			// 尝试获取文件名（第三个参数）
			if len(call.Arguments) >= 3 {
				entry.Filename = call.Arguments[2].String()
			}

			// 🔥 新增：检查是否是 Blob/File 对象
			valueObj, isObject := valueArg.(*goja.Object)
			handled := false

			if isObject {
				// 检查是否是 File 对象（优先）
				isFile := valueObj.Get("__isFile")
				if isFile != nil && !goja.IsUndefined(isFile) && isFile.ToBoolean() {
					data, fileContentType, filename, err := fe.extractFileData(valueObj)
					if err == nil {
						entry.Value = data
						// 🔥 保存 File 的 Content-Type
						entry.ContentType = fileContentType
						if entry.Filename == "" {
							entry.Filename = filename
						}
						handled = true
					} else {
						panic(runtime.NewTypeError("Invalid File object: " + err.Error()))
					}
				}

				if !handled {
					// 检查是否是 Blob 对象
					isBlob := valueObj.Get("__isBlob")
					if isBlob != nil && !goja.IsUndefined(isBlob) && isBlob.ToBoolean() {
						data, blobContentType, err := fe.extractBlobData(valueObj)
						if err == nil {
							entry.Value = data
							// 🔥 保存 Blob 的 Content-Type
							entry.ContentType = blobContentType
							if entry.Filename == "" {
								entry.Filename = "blob"
							}
							handled = true
						} else {
							panic(runtime.NewTypeError("Invalid Blob object: " + err.Error()))
						}
					}
				}
			}

			// 如果不是 Blob/File，按原来的逻辑处理
			if !handled {
				// 🔥 优先检查 null/undefined，转换为标准字符串
				if goja.IsNull(valueArg) {
					entry.Value = "null"
				} else if goja.IsUndefined(valueArg) {
					entry.Value = "undefined"
				} else {
					exported := valueArg.Export()
					switch v := exported.(type) {
					case string:
						entry.Value = v
					case goja.ArrayBuffer:
						entry.Value = v.Bytes()
						if entry.Filename == "" {
							entry.Filename = "blob"
						}
					case []byte:
						entry.Value = v
						if entry.Filename == "" {
							entry.Filename = "blob"
						}
					case map[string]interface{}:
						// 🔥 对象转换为 "[object Object]"（符合浏览器行为）
						entry.Value = "[object Object]"
					case nil:
						// 🔥 nil 转换为 "null"
						entry.Value = "null"
					default:
						entry.Value = fmt.Sprintf("%v", v)
					}
				}
			}

			// 🔥 同时添加到 map 和切片（保持顺序）
			if _, exists := formData[name]; !exists {
				formData[name] = []FormDataEntry{}
			}
			formData[name] = append(formData[name], entry)
			*formDataEntries = append(*formDataEntries, entry)

			return goja.Undefined()
		})

		// set(name, value, filename) - 设置字段 (覆盖)
		formDataObj.Set("set", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("FormData.set requires at least 2 arguments"))
			}

			name := call.Arguments[0].String()
			valueArg := call.Arguments[1]

			var entry FormDataEntry
			entry.Name = name

			if len(call.Arguments) >= 3 {
				entry.Filename = call.Arguments[2].String()
			}

			// 🔥 同样的类型转换逻辑
			if goja.IsNull(valueArg) {
				entry.Value = "null"
			} else if goja.IsUndefined(valueArg) {
				entry.Value = "undefined"
			} else {
				exported := valueArg.Export()
				switch v := exported.(type) {
				case string:
					entry.Value = v
				case goja.ArrayBuffer:
					entry.Value = v.Bytes()
					if entry.Filename == "" {
						entry.Filename = "blob"
					}
				case []byte:
					entry.Value = v
					if entry.Filename == "" {
						entry.Filename = "blob"
					}
				case map[string]interface{}:
					entry.Value = "[object Object]"
				case nil:
					entry.Value = "null"
				default:
					entry.Value = fmt.Sprintf("%v", v)
				}
			}

			// 🔥 从切片中移除所有同名条目，并在第一个位置替换
			var newEntries []FormDataEntry
			firstReplaced := false
			for _, e := range *formDataEntries {
				if e.Name == name {
					if !firstReplaced {
						// 第一次遇到，替换为新值（保持原位置）
						newEntries = append(newEntries, entry)
						firstReplaced = true
					}
					// 其他同名的跳过（删除）
				} else {
					newEntries = append(newEntries, e)
				}
			}
			// 如果是新字段，添加到末尾
			if !firstReplaced {
				newEntries = append(newEntries, entry)
			}
			*formDataEntries = newEntries

			// 更新 map
			formData[name] = []FormDataEntry{entry}

			return goja.Undefined()
		})

		// get(name) - 获取字段值
		formDataObj.Set("get", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				return goja.Null()
			}

			name := call.Arguments[0].String()
			if entries, exists := formData[name]; exists && len(entries) > 0 {
				entry := entries[0]
				if str, ok := entry.Value.(string); ok {
					return runtime.ToValue(str)
				} else if bytes, ok := entry.Value.([]byte); ok {
					// 🔥 修复：如果有 filename，返回 Blob 对象
					if entry.Filename != "" {
						blob := &JSBlob{
							data: bytes,
							typ:  entry.ContentType,
						}
						if blob.typ == "" {
							blob.typ = "application/octet-stream"
						}
						return fe.createBlobObject(runtime, blob)
					}
					// 没有 filename，返回 ArrayBuffer
					return runtime.ToValue(runtime.NewArrayBuffer(bytes))
				}
			}

			return goja.Null()
		})

		// getAll(name) - 获取字段所有值
		formDataObj.Set("getAll", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				return runtime.ToValue([]interface{}{})
			}

			name := call.Arguments[0].String()
			if entries, exists := formData[name]; exists {
				var result []interface{}
				for _, entry := range entries {
					if str, ok := entry.Value.(string); ok {
						result = append(result, str)
					} else if bytes, ok := entry.Value.([]byte); ok {
						// 🔥 修复：如果有 filename，返回 Blob 对象
						if entry.Filename != "" {
							blob := &JSBlob{
								data: bytes,
								typ:  entry.ContentType,
							}
							if blob.typ == "" {
								blob.typ = "application/octet-stream"
							}
							result = append(result, fe.createBlobObject(runtime, blob))
						} else {
							// 没有 filename，返回 ArrayBuffer
							result = append(result, runtime.NewArrayBuffer(bytes))
						}
					}
				}
				return runtime.ToValue(result)
			}

			return runtime.ToValue([]interface{}{})
		})

		// has(name) - 检查字段是否存在
		formDataObj.Set("has", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				return runtime.ToValue(false)
			}

			name := call.Arguments[0].String()
			_, exists := formData[name]
			return runtime.ToValue(exists)
		})

		// delete(name) - 删除字段
		formDataObj.Set("delete", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				return goja.Undefined()
			}

			name := call.Arguments[0].String()

			// 🔥 从切片中移除所有同名条目
			var newEntries []FormDataEntry
			for _, e := range *formDataEntries {
				if e.Name != name {
					newEntries = append(newEntries, e)
				}
			}
			*formDataEntries = newEntries

			// 从 map 中删除
			delete(formData, name)

			return goja.Undefined()
		})

		// forEach(callback) - 遍历所有字段
		formDataObj.Set("forEach", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				return goja.Undefined()
			}

			callback, ok := goja.AssertFunction(call.Arguments[0])
			if !ok {
				panic(runtime.NewTypeError("FormData.forEach callback must be a function"))
			}

			// 🔥 使用 formDataEntries 切片保持插入顺序
			for _, entry := range *formDataEntries {
				var value goja.Value
				if str, ok := entry.Value.(string); ok {
					value = runtime.ToValue(str)
				} else if bytes, ok := entry.Value.([]byte); ok {
					// 🔥 修复：如果有 filename，返回 Blob 对象
					if entry.Filename != "" {
						blob := &JSBlob{
							data: bytes,
							typ:  entry.ContentType,
						}
						if blob.typ == "" {
							blob.typ = "application/octet-stream"
						}
						value = fe.createBlobObject(runtime, blob)
					} else {
						// 没有 filename，返回 ArrayBuffer
						value = runtime.ToValue(runtime.NewArrayBuffer(bytes))
					}
				} else {
					value = runtime.ToValue(entry.Value)
				}
				callback(goja.Undefined(), value, runtime.ToValue(entry.Name), formDataObj)
			}

			return goja.Undefined()
		})

		// 内部方法：获取原始数据 (用于 fetch 构建 multipart/form-data)
		formDataObj.Set("__getRawData", func(call goja.FunctionCall) goja.Value {
			// 🔥 使用 formDataEntries 切片保持插入顺序
			var entries []map[string]interface{}
			for _, entry := range *formDataEntries {
				entries = append(entries, map[string]interface{}{
					"name":     entry.Name,
					"value":    entry.Value,
					"filename": entry.Filename,
				})
			}
			return runtime.ToValue(entries)
		})

		// entries() 方法 - 返回迭代器对象（符合 Web API 标准）
		formDataObj.Set("entries", func(call goja.FunctionCall) goja.Value {
			// 收集所有条目（创建快照，避免闭包中 formDataEntries 被修改）
			entriesSnapshot := make([]FormDataEntry, len(*formDataEntries))
			copy(entriesSnapshot, *formDataEntries)

			// 创建迭代器对象
			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(entriesSnapshot) {
					entry := entriesSnapshot[index]

					// 创建 [name, value] 数组
					pair := runtime.NewArray()
					pair.Set("0", runtime.ToValue(entry.Name))

					// 转换 value 为适当的类型
					var value goja.Value
					if str, ok := entry.Value.(string); ok {
						value = runtime.ToValue(str)
					} else if bytes, ok := entry.Value.([]byte); ok {
						// 🔥 修复：如果有 filename，重新创建 Blob 对象，而不是返回 ArrayBuffer
						if entry.Filename != "" {
							blob := &JSBlob{
								data: bytes,
								typ:  entry.ContentType,
							}
							if blob.typ == "" {
								blob.typ = "application/octet-stream"
							}
							value = fe.createBlobObject(runtime, blob)
						} else {
							// 没有 filename 的二进制数据，返回 ArrayBuffer
							value = runtime.ToValue(runtime.NewArrayBuffer(bytes))
						}
					} else {
						value = runtime.ToValue(entry.Value)
					}
					pair.Set("1", value)

					result.Set("value", pair)
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			// 🔥 添加 Symbol.iterator 使迭代器本身可迭代
			// 保存迭代器到全局临时变量,然后用 JS 代码设置 Symbol.iterator
			runtime.Set("__tempFormDataIterator", iterator)
			runtime.RunString("__tempFormDataIterator[Symbol.iterator] = function() { return this; };")
			runtime.Set("__tempFormDataIterator", goja.Undefined())

			return iterator
		})

		// keys() 方法 - 返回迭代器对象（符合 Web API 标准）
		formDataObj.Set("keys", func(call goja.FunctionCall) goja.Value {
			// 收集所有 keys（创建快照）
			keys := make([]string, len(*formDataEntries))
			for i, entry := range *formDataEntries {
				keys[i] = entry.Name
			}

			// 创建迭代器对象
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

			// 🔥 添加 Symbol.iterator 使迭代器本身可迭代
			runtime.Set("__tempFormDataIterator", iterator)
			runtime.RunString("__tempFormDataIterator[Symbol.iterator] = function() { return this; };")
			runtime.Set("__tempFormDataIterator", goja.Undefined())

			return iterator
		})

		// values() 方法 - 返回迭代器对象（符合 Web API 标准）
		formDataObj.Set("values", func(call goja.FunctionCall) goja.Value {
			// 收集所有 values（创建快照）
			values := make([]goja.Value, len(*formDataEntries))
			for i, entry := range *formDataEntries {
				if str, ok := entry.Value.(string); ok {
					values[i] = runtime.ToValue(str)
				} else if bytes, ok := entry.Value.([]byte); ok {
					// 🔥 修复：如果有 filename，返回 Blob 对象
					if entry.Filename != "" {
						blob := &JSBlob{
							data: bytes,
							typ:  entry.ContentType,
						}
						if blob.typ == "" {
							blob.typ = "application/octet-stream"
						}
						values[i] = fe.createBlobObject(runtime, blob)
					} else {
						// 没有 filename，返回 ArrayBuffer
						values[i] = runtime.ToValue(runtime.NewArrayBuffer(bytes))
					}
				} else {
					values[i] = runtime.ToValue(entry.Value)
				}
			}

			// 创建迭代器对象
			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(values) {
					result.Set("value", values[index])
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			// 🔥 添加 Symbol.iterator 使迭代器本身可迭代
			runtime.Set("__tempFormDataIterator", iterator)
			runtime.RunString("__tempFormDataIterator[Symbol.iterator] = function() { return this; };")
			runtime.Set("__tempFormDataIterator", goja.Undefined())

			return iterator
		})

		// 标记这是一个 FormData 对象（浏览器版）
		formDataObj.Set("__isFormData", true)
		formDataObj.Set("__isNodeFormData", false)
		formDataObj.Set("__type", "web-formdata")

		// 🔥 添加 Symbol.iterator 支持，使 FormData 本身可迭代
		// 例如：for (const [name, value] of formData) { ... }
		// 现在 entries() 返回迭代器对象，直接返回即可
		script := `(function(formDataObj) {
			formDataObj[Symbol.iterator] = function() {
				return this.entries();
			};
		})`

		if fn, err := runtime.RunString(script); err == nil {
			if callable, ok := goja.AssertFunction(fn); ok {
				callable(goja.Undefined(), formDataObj)
			}
		} else {
			// 记录错误日志，但不影响 FormData 的其他功能
			utils.Warn("设置 FormData 的 Symbol.iterator 失败", zap.Error(err))
		}

		return formDataObj
	}
}

// extractFormDataInCurrentThread 在当前线程中提取 FormData 数据并构建 multipart body
// 必须在有 goja.Runtime 访问权限的 goroutine 中调用
//
// 🔥 性能优化：使用流式处理器，根据文件大小自动选择最佳策略
//   - 小文件（< 1MB）: 缓冲模式（性能更好，避免 goroutine 开销）
//   - 大文件（>= 1MB）: 流式模式（内存友好，支持 chunked transfer）
//
// 📖 Reader 生命周期与资源管理：
//
//  1. 小文件返回 []byte:
//     - 纯内存对象，无需手动释放
//     - GC 自动回收
//
//  2. 大文件返回 io.Reader (实际类型为 *io.PipeReader):
//     - 写端在后台 goroutine 中自动关闭（defer pw.Close()）
//     - 读端由 HTTP 客户端负责读取和清理
//     - Pipe 双端都关闭后，Go runtime 自动清理
//     - ⚠️ 注意：调用者无需显式调用 Close()
//
//  3. 资源保证：
//     - ✅ 无文件句柄（所有数据在内存中）
//     - ✅ 无 goroutine 泄漏（写端自动关闭）
//     - ✅ 无内存泄漏（GC 自动回收）
//
// 返回值:
//   - interface{}: []byte（小文件）或 io.Reader（大文件）
//   - string: multipart/form-data 的 boundary 字符串
//   - error: 解析或创建 Reader 时的错误
func (fe *FetchEnhancer) extractFormDataInCurrentThread(formDataObj *goja.Object) (interface{}, string, error) {
	// 获取 FormData 的原始数据
	getRawDataFunc := formDataObj.Get("__getRawData")
	if goja.IsUndefined(getRawDataFunc) || goja.IsNull(getRawDataFunc) {
		return nil, "", fmt.Errorf("FormData object is invalid")
	}

	fn, ok := goja.AssertFunction(getRawDataFunc)
	if !ok {
		return nil, "", fmt.Errorf("__getRawData is not a function")
	}

	// 调用 __getRawData() 获取数据
	result, err := fn(goja.Undefined())
	if err != nil {
		return nil, "", fmt.Errorf("failed to get FormData entries: %w", err)
	}

	// 解析条目
	entriesInterface := result.Export()

	// goja.Export() 返回的是 []map[string]interface{} 而不是 []interface{}
	var entries []map[string]interface{}
	switch v := entriesInterface.(type) {
	case []interface{}:
		// 转换为 []map[string]interface{}
		for _, item := range v {
			if m, ok := item.(map[string]interface{}); ok {
				entries = append(entries, m)
			}
		}
	case []map[string]interface{}:
		entries = v
	default:
		return nil, "", fmt.Errorf("invalid FormData entries format: got %T", entriesInterface)
	}

	// ✅ 优化: 允许空 FormData (合法场景,例如条件性添加字段)
	if len(entries) == 0 {
		var buf bytes.Buffer
		writer := multipart.NewWriter(&buf)
		writer.Close()
		return &buf, writer.Boundary(), nil
	}

	// 🔥 核心优化：转换为 FormDataEntry 并创建流式处理器
	var formDataEntries []FormDataEntry
	for _, entryMap := range entries {
		// 安全的类型断言
		name, ok := entryMap["name"].(string)
		if !ok {
			return nil, "", fmt.Errorf("invalid FormData entry: name is not a string")
		}

		entry := FormDataEntry{
			Name:     name,
			Value:    entryMap["value"],
			Filename: "",
		}
		if filename, ok := entryMap["filename"].(string); ok {
			entry.Filename = filename
		}
		formDataEntries = append(formDataEntries, entry)
	}

	// 创建流式处理器
	streamingFormData := NewStreamingFormData(fe.formDataConfig)

	// 添加所有条目
	for _, entry := range formDataEntries {
		streamingFormData.AddEntry(entry)
	}

	// 🔥 根据大小自动选择处理策略
	// 小文件：返回字节数组（避免 goroutine 开销）
	// 大文件：返回流式 Reader（节省内存，支持 chunked transfer）
	totalSize := streamingFormData.GetTotalSize()

	// 创建 Reader
	reader, err := streamingFormData.CreateReader()
	if err != nil {
		return nil, "", fmt.Errorf("failed to create streaming FormData reader: %w", err)
	}

	// 小文件（< 阈值）：读取全部数据返回字节数组
	if totalSize < fe.formDataConfig.StreamingThreshold {
		var data []byte
		var err error

		// 🔥 优化：已知大小时直接预分配，避免 io.ReadAll 的多次扩容
		if totalSize > 0 {
			// 方案：直接预分配确切大小 + io.ReadFull（零拷贝，最快）
			data = make([]byte, totalSize)
			n, err := io.ReadFull(reader, data)
			if err != nil && err != io.ErrUnexpectedEOF {
				return nil, "", fmt.Errorf("failed to read FormData: %w", err)
			}
			// 如果实际读取小于预期，截断到实际大小
			data = data[:n]
		} else {
			// 大小未知（理论上不应该发生，但保持兼容性）
			data, err = io.ReadAll(reader)
			if err != nil {
				return nil, "", fmt.Errorf("failed to read FormData: %w", err)
			}
		}

		return data, streamingFormData.GetBoundary(), nil
	}

	// 大文件（>= 阈值）：直接返回 Reader，支持流式传输
	return reader, streamingFormData.GetBoundary(), nil
}

// extractBufferBytes 从 Buffer 对象提取字节数据
func (fe *FetchEnhancer) extractBufferBytes(bufferObj *goja.Object) ([]byte, error) {
	// 获取 Buffer 长度
	lengthVal := bufferObj.Get("length")
	if goja.IsUndefined(lengthVal) {
		return nil, fmt.Errorf("buffer object has no length property")
	}

	length := int(lengthVal.ToInteger())
	if length <= 0 {
		return []byte{}, nil
	}

	// 逐字节读取数据
	data := make([]byte, length)
	for i := 0; i < length; i++ {
		val := bufferObj.Get(strconv.Itoa(i))
		if goja.IsUndefined(val) {
			data[i] = 0
		} else {
			data[i] = byte(val.ToInteger())
		}
	}

	return data, nil
}

// ResponseData 用于在 goroutine 之间传递响应数据
type ResponseData struct {
	StatusCode    int
	Status        string
	Headers       http.Header
	Body          []byte        // 非流式模式使用
	BodyStream    io.ReadCloser // 流式模式使用
	IsStreaming   bool          // 是否为流式模式
	FinalURL      string
	ContentLength int64 // 🔥 响应的 Content-Length（用于智能预分配）
}

// StreamReader 流式读取器（JavaScript 层面使用）
type StreamReader struct {
	reader        io.ReadCloser
	runtime       *goja.Runtime
	mutex         sync.Mutex
	closed        bool
	reachedEOF    bool  // 🔥 标记是否已到达 EOF（符合 Web Streams API 标准）
	totalRead     int64 // 🔥 累计读取的字节数
	maxSize       int64 // 🔥 最大允许大小（0表示不限制）
	contentLength int64 // 🔥 HTTP 响应的 Content-Length（用于智能预分配，-1表示未知）
}

// NewStreamReader 创建流式读取器
func NewStreamReader(reader io.ReadCloser, runtime *goja.Runtime, maxSize int64, contentLength int64) *StreamReader {
	return &StreamReader{
		reader:        reader,
		runtime:       runtime,
		closed:        false,
		totalRead:     0,             // 🔥 初始化计数器
		maxSize:       maxSize,       // 🔥 设置限制（0表示不限制）
		contentLength: contentLength, // 🔥 保存 Content-Length（-1表示未知）
	}
}

// Read 读取数据块（JavaScript 调用）
// 🔥 符合 Web Streams API 标准：
// - 有数据时: 返回 (data, false, nil)
// - 流结束时: 返回 (nil, true, nil)
// - 永远不会同时返回数据和 done=true
func (sr *StreamReader) Read(size int) ([]byte, bool, error) {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()

	if sr.closed {
		return nil, true, fmt.Errorf("stream已关闭")
	}

	// 如果上次已经到达 EOF，这次直接返回 done=true
	if sr.reachedEOF {
		sr.closed = true
		sr.reader.Close()
		return nil, true, nil
	}

	// 🔥 新增：检查是否已超过大小限制
	if sr.maxSize > 0 && sr.totalRead >= sr.maxSize {
		sr.closed = true
		sr.reader.Close()
		sizeMB := float64(sr.maxSize) / 1024 / 1024
		return nil, true, fmt.Errorf("流式下载已超过限制: %.2fMB", sizeMB)
	}

	// 默认读取 64KB
	if size <= 0 {
		size = 64 * 1024
	}

	// 🔥 新增：如果设置了限制，调整本次读取大小
	if sr.maxSize > 0 {
		remaining := sr.maxSize - sr.totalRead
		if remaining < int64(size) {
			size = int(remaining)
			if size <= 0 {
				sr.closed = true
				sr.reader.Close()
				sizeMB := float64(sr.maxSize) / 1024 / 1024
				return nil, true, fmt.Errorf("流式下载已超过限制: %.2fMB", sizeMB)
			}
		}
	}

	buffer := make([]byte, size)
	n, err := sr.reader.Read(buffer)

	// 🔥 新增：更新累计读取字节数
	sr.totalRead += int64(n)

	if err == io.EOF {
		// 🔥 关键修复：遇到 EOF 时
		sr.reachedEOF = true

		if n > 0 {
			// 如果还有数据，先返回数据（done=false）
			// 下次调用时才返回 done=true
			return buffer[:n], false, nil
		} else {
			// 如果没有数据，直接返回 done=true
			sr.closed = true
			sr.reader.Close()
			return nil, true, nil
		}
	}

	if err != nil {
		sr.closed = true
		sr.reader.Close()
		return nil, true, err
	}

	return buffer[:n], false, nil
}

// Close 关闭流
func (sr *StreamReader) Close() error {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()

	if sr.closed {
		return nil
	}

	sr.closed = true
	return sr.reader.Close()
}

// startNodeStreamReading 开始 Node.js 风格的流式读取
// 🔥 实现 Node.js Stream 的自动读取和事件触发
func startNodeStreamReading(runtime *goja.Runtime, streamReader *StreamReader, listeners map[string][]goja.Callable, isPaused *bool, isDestroyed *bool) {
	if streamReader == nil || runtime == nil {
		return
	}

	// 递归读取函数
	var readNext func()
	readNext = func() {
		// 检查是否已暂停或销毁
		if *isPaused || *isDestroyed {
			return
		}

		// 检查是否有 data 监听器
		if len(listeners["data"]) == 0 {
			return
		}

		// 使用 setImmediate 异步读取
		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			setImmediateFn(goja.Undefined(), runtime.ToValue(func(call goja.FunctionCall) goja.Value {
				// 读取数据块
				data, done, err := streamReader.Read(64 * 1024) // 64KB

				if err != nil {
					// 触发 error 事件
					if callbacks, exists := listeners["error"]; exists {
						errorObj := runtime.NewGoError(err)
						for _, cb := range callbacks {
							cb(goja.Undefined(), errorObj)
						}
					}
					return goja.Undefined()
				}

				// 🔥 符合标准：done=true 时 value 总是 undefined
				// 所以这里 done=true 时不会有数据
				if done {
					// 触发 end 事件
					if callbacks, exists := listeners["end"]; exists {
						for _, cb := range callbacks {
							cb(goja.Undefined())
						}
					}

					// 触发 close 事件
					if callbacks, exists := listeners["close"]; exists {
						for _, cb := range callbacks {
							cb(goja.Undefined())
						}
					}

					return goja.Undefined()
				}

				// 如果有数据，触发 data 事件
				if len(data) > 0 {
					var dataValue goja.Value

					// 🔥 尝试转换为 Buffer（Node.js 标准）
					bufferConstructor := runtime.Get("Buffer")
					if !goja.IsUndefined(bufferConstructor) && !goja.IsNull(bufferConstructor) {
						bufferObj := bufferConstructor.ToObject(runtime)
						if bufferObj != nil {
							fromFunc, ok := goja.AssertFunction(bufferObj.Get("from"))
							if ok {
								arrayBuffer := runtime.NewArrayBuffer(data)
								buffer, err := fromFunc(bufferObj, runtime.ToValue(arrayBuffer))
								if err == nil {
									dataValue = buffer
								}
							}
						}
					}

					// 🔥 降级方案：如果无法创建 Buffer，创建 Uint8Array
					if dataValue == nil || goja.IsUndefined(dataValue) {
						arrayBuffer := runtime.NewArrayBuffer(data)
						uint8ArrayConstructor := runtime.Get("Uint8Array")
						uint8Array, err := runtime.New(uint8ArrayConstructor, runtime.ToValue(arrayBuffer))
						if err == nil {
							dataValue = uint8Array
						} else {
							// 最后降级：直接传递 ArrayBuffer
							dataValue = runtime.ToValue(arrayBuffer)
						}
					}

					// 触发 data 事件
					if callbacks, exists := listeners["data"]; exists {
						for _, cb := range callbacks {
							cb(goja.Undefined(), dataValue)
						}
					}
				}

				// 继续读取下一块
				if !*isPaused && !*isDestroyed {
					readNext()
				}

				return goja.Undefined()
			}))
		}
	}

	// 开始读取
	readNext()
}

// readAllDataWithLimit 统一的缓冲读取函数（智能预分配 + 限制检查）
// 🔥 用于 arrayBuffer(), text(), json(), blob() 等方法
func readAllDataWithLimit(streamReader *StreamReader, maxBufferSize int64) ([]byte, error) {
	// 🔥 智能预分配策略：基于 Content-Length
	var initialCapacity int
	if streamReader.contentLength > 0 {
		// 场景1：有 Content-Length（最优情况）
		if streamReader.contentLength <= maxBufferSize {
			initialCapacity = int(streamReader.contentLength) // 🔥 精确预分配
		} else {
			initialCapacity = int(maxBufferSize) // 🔥 预分配到限制值
		}
	} else if maxBufferSize < 64*1024 {
		// 场景2：限制很小（< 64KB）
		initialCapacity = int(maxBufferSize) // 预分配限制值
	} else {
		// 场景3：未知大小
		initialCapacity = 64 * 1024 // 🔥 预分配 64KB（避免小文件浪费）
	}

	allData := make([]byte, 0, initialCapacity)
	var totalRead int64

	for {
		data, done, err := streamReader.Read(64 * 1024)
		if err != nil {
			return nil, err
		}

		if len(data) > 0 {
			// 🔥 先检查，后追加（避免无效的内存分配）
			if maxBufferSize > 0 && totalRead+int64(len(data)) > maxBufferSize {
				sizeMB := float64(totalRead+int64(len(data))) / 1024 / 1024
				limitMB := float64(maxBufferSize) / 1024 / 1024
				return nil, fmt.Errorf(
					"缓冲读取超过限制: %.2fMB > %.2fMB\n提示: 大文件请使用 response.body.getReader() 进行流式读取",
					sizeMB, limitMB,
				)
			}

			allData = append(allData, data...)
			totalRead += int64(len(data))
		}

		if done {
			break
		}
	}

	return allData, nil
}

// createStreamingResponse 创建流式响应对象
func (fe *FetchEnhancer) createStreamingResponse(runtime *goja.Runtime, response *goja.Object, data *ResponseData) *goja.Object {
	// 创建 StreamReader，传入大小限制和 Content-Length
	streamReader := NewStreamReader(data.BodyStream, runtime, fe.maxStreamSize, data.ContentLength)

	// 设置 bodyUsed 为 false（流式可以多次读取）
	response.Set("bodyUsed", runtime.ToValue(false))

	// 创建 body 对象（同时支持 Web Streams API 和 Node.js Stream API）
	bodyObj := runtime.NewObject()

	// 🔥 存储 StreamReader 引用，供 FormData 使用
	bodyObj.Set("__streamReader", streamReader)

	// 🔥 Node.js Stream 特性标识
	bodyObj.Set("readable", runtime.ToValue(true))
	bodyObj.Set("__isNodeStream", runtime.ToValue(true))

	// ==================== Node.js Stream API ====================
	// 事件监听器存储
	listeners := make(map[string][]goja.Callable)
	var isPaused bool = false
	var isDestroyed bool = false

	// on(event, callback) - 注册事件监听器（Node.js Stream 标准）
	bodyObj.Set("on", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("on() requires event name and callback"))
		}

		eventName := call.Arguments[0].String()
		callback, ok := goja.AssertFunction(call.Arguments[1])
		if !ok {
			panic(runtime.NewTypeError("second argument must be a function"))
		}

		// 存储监听器
		if listeners[eventName] == nil {
			listeners[eventName] = make([]goja.Callable, 0)
		}
		listeners[eventName] = append(listeners[eventName], callback)

		// 如果是 'data' 事件，自动开始流式读取
		if eventName == "data" && len(listeners["data"]) == 1 {
			// 使用 setImmediate 异步开始读取
			setImmediate := runtime.Get("setImmediate")
			if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
				setImmediateFn(goja.Undefined(), runtime.ToValue(func(call goja.FunctionCall) goja.Value {
					startNodeStreamReading(runtime, streamReader, listeners, &isPaused, &isDestroyed)
					return goja.Undefined()
				}))
			}
		}

		return bodyObj // 返回自身，支持链式调用
	})

	// once(event, callback) - 注册一次性事件监听器
	bodyObj.Set("once", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("once() requires event name and callback"))
		}

		eventName := call.Arguments[0].String()
		originalCallback, ok := goja.AssertFunction(call.Arguments[1])
		if !ok {
			panic(runtime.NewTypeError("second argument must be a function"))
		}

		// 使用标记来追踪是否已执行
		var executed bool

		// 包装回调，只执行一次
		wrapper := func(this goja.Value, args ...goja.Value) (goja.Value, error) {
			if executed {
				return goja.Undefined(), nil
			}
			executed = true
			// 执行原始回调
			return originalCallback(this, args...)
		}

		if listeners[eventName] == nil {
			listeners[eventName] = make([]goja.Callable, 0)
		}
		listeners[eventName] = append(listeners[eventName], wrapper)

		return bodyObj
	})

	// pause() - 暂停流
	bodyObj.Set("pause", func(call goja.FunctionCall) goja.Value {
		isPaused = true
		return bodyObj
	})

	// resume() - 恢复流
	bodyObj.Set("resume", func(call goja.FunctionCall) goja.Value {
		if isPaused {
			isPaused = false
			// 继续读取
			setImmediate := runtime.Get("setImmediate")
			if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
				setImmediateFn(goja.Undefined(), runtime.ToValue(func(call goja.FunctionCall) goja.Value {
					startNodeStreamReading(runtime, streamReader, listeners, &isPaused, &isDestroyed)
					return goja.Undefined()
				}))
			}
		}
		return bodyObj
	})

	// destroy() - 销毁流
	bodyObj.Set("destroy", func(call goja.FunctionCall) goja.Value {
		isDestroyed = true
		streamReader.Close()

		// 触发 close 事件
		if callbacks, exists := listeners["close"]; exists {
			for _, cb := range callbacks {
				cb(goja.Undefined())
			}
		}

		return bodyObj
	})

	// pipe(destination) - 管道传输（简化版）
	bodyObj.Set("pipe", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("pipe() requires a destination"))
		}

		destination := call.Arguments[0].ToObject(runtime)
		if destination == nil {
			panic(runtime.NewTypeError("destination must be an object"))
		}

		// 监听 data 事件并写入目标
		bodyObj.Get("on").ToObject(runtime).Get("call").ToObject(runtime)

		// 简化实现：返回destination
		return destination
	})

	// ==================== Web Streams API（保留原有实现）====================
	// getReader() 方法 - 返回流式读取器
	bodyObj.Set("getReader", func(call goja.FunctionCall) goja.Value {
		readerObj := runtime.NewObject()

		// read(size?) 方法 - 读取数据块
		readerObj.Set("read", func(call goja.FunctionCall) goja.Value {
			promise, resolve, reject := runtime.NewPromise()

			// 获取读取大小参数（可选）
			size := 64 * 1024 // 默认 64KB
			if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
				size = int(call.Arguments[0].ToInteger())
			}

			// 🔥 使用 setImmediate 异步执行（EventLoop 安全）
			// 获取 setImmediate 函数
			setImmediate := runtime.Get("setImmediate")
			if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
				// 创建回调函数
				callback := func(call goja.FunctionCall) goja.Value {
					// 在 EventLoop 线程中同步读取（安全）
					data, done, err := streamReader.Read(size)

					if err != nil {
						reject(runtime.NewGoError(err))
						return goja.Undefined()
					}

					// 创建结果对象 { done: boolean, value: Uint8Array }
					// 🔥 符合 Web Streams API 标准：
					// - done=false 时，value 包含数据
					// - done=true 时，value 总是 undefined
					resultObj := runtime.NewObject()
					resultObj.Set("done", runtime.ToValue(done))

					if len(data) > 0 {
						// 🔥 修复：创建 Uint8Array（而非 ArrayBuffer）
						// Uint8Array 有 .length 和 .byteLength 属性，符合 Web Streams API 标准
						arrayBuffer := runtime.NewArrayBuffer(data)

						// 使用 JavaScript 构造函数创建 Uint8Array
						uint8ArrayConstructor := runtime.Get("Uint8Array")
						uint8Array, err := runtime.New(uint8ArrayConstructor, runtime.ToValue(arrayBuffer))
						if err != nil {
							reject(runtime.NewGoError(fmt.Errorf("failed to create Uint8Array: %w", err)))
							return goja.Undefined()
						}

						resultObj.Set("value", uint8Array)
					} else {
						resultObj.Set("value", goja.Undefined())
					}

					resolve(runtime.ToValue(resultObj))
					return goja.Undefined()
				}

				// 使用 setImmediate 调度执行
				setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
			} else {
				// 降级：同步执行（如果没有 EventLoop）
				data, done, err := streamReader.Read(size)

				if err != nil {
					reject(runtime.NewGoError(err))
				} else {
					// 🔥 符合 Web Streams API 标准
					resultObj := runtime.NewObject()
					resultObj.Set("done", runtime.ToValue(done))

					if len(data) > 0 {
						// 🔥 修复：创建 Uint8Array（而非 ArrayBuffer）
						arrayBuffer := runtime.NewArrayBuffer(data)

						// 使用 JavaScript 构造函数创建 Uint8Array
						uint8ArrayConstructor := runtime.Get("Uint8Array")
						uint8Array, err := runtime.New(uint8ArrayConstructor, runtime.ToValue(arrayBuffer))
						if err != nil {
							reject(runtime.NewGoError(fmt.Errorf("failed to create Uint8Array: %w", err)))
						} else {
							resultObj.Set("value", uint8Array)
							resolve(runtime.ToValue(resultObj))
						}
					} else {
						resultObj.Set("value", goja.Undefined())
						resolve(runtime.ToValue(resultObj))
					}
				}
			}

			return runtime.ToValue(promise)
		})

		// cancel() 方法 - 取消流
		readerObj.Set("cancel", func(call goja.FunctionCall) goja.Value {
			promise, resolve, _ := runtime.NewPromise()
			streamReader.Close()
			resolve(goja.Undefined())
			return runtime.ToValue(promise)
		})

		// closed 属性 - 流是否已关闭
		readerObj.Set("closed", func(call goja.FunctionCall) goja.Value {
			promise, resolve, _ := runtime.NewPromise()
			if streamReader.closed {
				resolve(goja.Undefined())
			}
			return runtime.ToValue(promise)
		})

		return runtime.ToValue(readerObj)
	})

	// 将 body 对象设置到 response
	response.Set("body", bodyObj)

	// 添加便捷方法：直接读取全部数据（与非流式模式兼容）
	// 🔥 新方案：缓冲读取方法应用 1MB 限制
	response.Set("arrayBuffer", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		// 🔥 使用 setImmediate 异步执行
		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				// 🔥 使用统一的缓冲读取函数（智能预分配 + 限制检查）
				allData, err := readAllDataWithLimit(streamReader, fe.maxRespSize)
				if err != nil {
					reject(runtime.NewGoError(err))
					return goja.Undefined()
				}

				arrayBuffer := runtime.NewArrayBuffer(allData)
				resolve(runtime.ToValue(arrayBuffer))
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := readAllDataWithLimit(streamReader, fe.maxRespSize)
			if err != nil {
				reject(runtime.NewGoError(err))
				return runtime.ToValue(promise)
			}
			arrayBuffer := runtime.NewArrayBuffer(allData)
			resolve(runtime.ToValue(arrayBuffer))
		}

		return runtime.ToValue(promise)
	})

	response.Set("text", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				// 🔥 使用统一的缓冲读取函数（智能预分配 + 限制检查）
				allData, err := readAllDataWithLimit(streamReader, fe.maxRespSize)
				if err != nil {
					reject(runtime.NewGoError(err))
					return goja.Undefined()
				}
				resolve(runtime.ToValue(string(allData)))
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := readAllDataWithLimit(streamReader, fe.maxRespSize)
			if err != nil {
				reject(runtime.NewGoError(err))
				return runtime.ToValue(promise)
			}
			resolve(runtime.ToValue(string(allData)))
		}

		return runtime.ToValue(promise)
	})

	response.Set("json", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				// 🔥 使用统一的缓冲读取函数（智能预分配 + 限制检查）
				allData, err := readAllDataWithLimit(streamReader, fe.maxRespSize)
				if err != nil {
					reject(runtime.NewGoError(err))
					return goja.Undefined()
				}

				var jsonData interface{}
				err = json.Unmarshal(allData, &jsonData)
				if err != nil {
					reject(runtime.NewTypeError(fmt.Sprintf("Invalid JSON: %v", err)))
				} else {
					resolve(runtime.ToValue(jsonData))
				}
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := readAllDataWithLimit(streamReader, fe.maxRespSize)
			if err != nil {
				reject(runtime.NewGoError(err))
				return runtime.ToValue(promise)
			}

			var jsonData interface{}
			err = json.Unmarshal(allData, &jsonData)
			if err != nil {
				reject(runtime.NewTypeError(fmt.Sprintf("Invalid JSON: %v", err)))
			} else {
				resolve(runtime.ToValue(jsonData))
			}
		}

		return runtime.ToValue(promise)
	})

	// blob() 方法 - 读取全部数据并返回 Blob 对象
	response.Set("blob", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				// 🔥 使用统一的缓冲读取函数（智能预分配 + 限制检查）
				allData, err := readAllDataWithLimit(streamReader, fe.maxRespSize)
				if err != nil {
					reject(runtime.NewGoError(err))
					return goja.Undefined()
				}

				// 从响应头获取 Content-Type
				contentType := "application/octet-stream"
				if ct := data.Headers.Get("Content-Type"); ct != "" {
					contentType = ct
				}

				// 创建 Blob 对象
				blob := &JSBlob{
					data: allData,
					typ:  contentType,
				}

				blobObj := fe.createBlobObject(runtime, blob)
				resolve(blobObj)
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := readAllDataWithLimit(streamReader, fe.maxRespSize)
			if err != nil {
				reject(runtime.NewGoError(err))
				return runtime.ToValue(promise)
			}

			// 从响应头获取 Content-Type
			contentType := "application/octet-stream"
			if ct := data.Headers.Get("Content-Type"); ct != "" {
				contentType = ct
			}

			// 创建 Blob 对象
			blob := &JSBlob{
				data: allData,
				typ:  contentType,
			}

			blobObj := fe.createBlobObject(runtime, blob)
			resolve(blobObj)
		}

		return runtime.ToValue(promise)
	})

	return response
}

// recreateResponse 从 ResponseData 重新创建 JavaScript Response 对象
func (fe *FetchEnhancer) recreateResponse(runtime *goja.Runtime, data *ResponseData) *goja.Object {
	response := runtime.NewObject()

	// 基本属性
	response.Set("ok", runtime.ToValue(data.StatusCode >= 200 && data.StatusCode < 300))
	response.Set("status", runtime.ToValue(data.StatusCode))
	response.Set("statusText", runtime.ToValue(data.Status))
	response.Set("url", runtime.ToValue(data.FinalURL))

	// Headers
	headersObj := fe.createResponseHeaders(runtime, data.Headers)
	response.Set("headers", headersObj)

	// 🔥 新方案：总是返回流式响应（符合标准 Fetch API）
	// data.IsStreaming 现在总是 true
	if data.IsStreaming {
		return fe.createStreamingResponse(runtime, response, data)
	}

	// 🔧 向后兼容：如果 IsStreaming=false（旧数据），仍然支持

	// Body methods
	bodyUsed := false
	response.Set("bodyUsed", runtime.ToValue(bodyUsed))

	// 🔥 修复：使用 sync.Mutex 保护 bodyUsed 状态
	var bodyMutex sync.Mutex

	// text() 方法 - 直接同步执行
	response.Set("text", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		bodyMutex.Lock()
		if bodyUsed {
			bodyMutex.Unlock()
			reject(runtime.NewTypeError("Body has already been consumed"))
		} else {
			bodyUsed = true
			bodyMutex.Unlock()
			response.Set("bodyUsed", runtime.ToValue(true))
			resolve(runtime.ToValue(string(data.Body)))
		}

		return runtime.ToValue(promise)
	})

	// json() 方法 - 直接同步执行
	response.Set("json", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		bodyMutex.Lock()
		if bodyUsed {
			bodyMutex.Unlock()
			reject(runtime.NewTypeError("Body has already been consumed"))
		} else {
			// 🔥 先解锁，稍后根据解析结果决定是否标记 bodyUsed
			bodyMutex.Unlock()

			var jsonData interface{}
			err := json.Unmarshal(data.Body, &jsonData)
			if err != nil {
				// ⚠️ JSON 解析失败，不标记 body 为已使用，允许 fallback 到 text()
				// 提供更友好的错误信息
				// 如果不是 2xx 状态码，可能是 HTML 错误页面
				if data.StatusCode < 200 || data.StatusCode >= 300 {
					bodyPreview := string(data.Body)
					if len(bodyPreview) > 100 {
						bodyPreview = bodyPreview[:100] + "..."
					}
					errorMsg := fmt.Sprintf("Failed to parse JSON (HTTP %d): Response body is not valid JSON. Body preview: %s", data.StatusCode, bodyPreview)
					reject(runtime.NewTypeError(errorMsg))
				} else {
					reject(runtime.NewTypeError(fmt.Sprintf("Invalid JSON: %v", err)))
				}
			} else {
				// ✅ 解析成功，标记 body 为已使用
				bodyMutex.Lock()
				bodyUsed = true
				bodyMutex.Unlock()
				response.Set("bodyUsed", runtime.ToValue(true))
				resolve(runtime.ToValue(jsonData))
			}
		}

		return runtime.ToValue(promise)
	})

	// arrayBuffer() 方法 - 直接同步执行
	response.Set("arrayBuffer", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		bodyMutex.Lock()
		if bodyUsed {
			bodyMutex.Unlock()
			reject(runtime.NewTypeError("Body has already been consumed"))
		} else {
			bodyUsed = true
			bodyMutex.Unlock()
			response.Set("bodyUsed", runtime.ToValue(true))

			// 创建真正的 ArrayBuffer
			arrayBuffer := runtime.NewArrayBuffer(data.Body)
			resolve(runtime.ToValue(arrayBuffer))
		}

		return runtime.ToValue(promise)
	})

	// blob() 方法 - 返回 Blob 对象
	response.Set("blob", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		bodyMutex.Lock()
		if bodyUsed {
			bodyMutex.Unlock()
			reject(runtime.NewTypeError("Body has already been consumed"))
		} else {
			bodyUsed = true
			bodyMutex.Unlock()
			response.Set("bodyUsed", runtime.ToValue(true))

			// 从响应头获取 Content-Type
			contentType := "application/octet-stream"
			if ct := data.Headers.Get("Content-Type"); ct != "" {
				contentType = ct
			}

			// 创建 Blob 对象
			blob := &JSBlob{
				data: data.Body,
				typ:  contentType,
			}

			blobObj := fe.createBlobObject(runtime, blob)
			resolve(blobObj)
		}

		return runtime.ToValue(promise)
	})

	// clone() 方法 - 克隆响应
	response.Set("clone", func(call goja.FunctionCall) goja.Value {
		// 创建新的 ResponseData（深拷贝 Body）
		clonedData := &ResponseData{
			StatusCode: data.StatusCode,
			Status:     data.Status,
			Headers:    data.Headers.Clone(),
			Body:       make([]byte, len(data.Body)),
			FinalURL:   data.FinalURL,
		}
		copy(clonedData.Body, data.Body)

		// 递归调用创建新的 Response 对象
		return fe.recreateResponse(runtime, clonedData)
	})

	// 其他属性
	response.Set("redirected", runtime.ToValue(false))
	response.Set("type", runtime.ToValue("basic"))

	return response
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (fe *FetchEnhancer) Name() string {
	return "fetch"
}

// Close 关闭 FetchEnhancer 并清理 HTTP 资源
// 🔥 Graceful Shutdown 支持：显式关闭所有空闲 HTTP 连接
//
// 调用时机：
//   - JSExecutor.Shutdown() 中通过 ModuleRegistry.CloseAll() 调用
//   - 服务接收到 SIGTERM/SIGINT 信号时触发
//
// 效果：
//   - 立即关闭所有空闲 HTTP 连接（发送 TCP FIN）
//   - 对端服务器可以优雅处理连接关闭
//   - 释放文件描述符和内存资源
//   - 正在进行的请求不受影响（会正常完成）
//
// 注意：
//   - CloseIdleConnections() 只关闭空闲连接
//   - 活跃连接会在请求完成后自然关闭
//   - 这是符合 HTTP 标准的优雅关闭方式
func (fe *FetchEnhancer) Close() error {
	if fe == nil || fe.client == nil {
		return nil
	}

	utils.Info("关闭 FetchEnhancer HTTP 客户端")

	// 关闭底层 Transport 的所有空闲连接
	if transport, ok := fe.client.Transport.(*http.Transport); ok {
		transport.CloseIdleConnections()
		utils.Info("已关闭所有空闲 HTTP 连接")
	}

	return nil
}

// Register 注册模块到 require 系统
// Fetch 是全局函数，不需要 require
func (fe *FetchEnhancer) Register(registry *require.Registry) error {
	// Fetch API 不需要注册到 require 系统
	// 它是全局可用的
	return nil
}

// Setup 在 Runtime 上设置模块环境
// 注册 fetch 全局函数和相关 API
func (fe *FetchEnhancer) Setup(runtime *goja.Runtime) error {
	return fe.RegisterFetchAPI(runtime)
}
