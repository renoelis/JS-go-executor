package fetch

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"flow-codeblock-go/enhance_modules/internal/formdata"

	"github.com/dop251/goja"
)

// ==================== FetchRequest ====================

// FetchRequest 表示一个 HTTP 请求
// 🔥 用于异步请求执行
type FetchRequest struct {
	url       string                 // 请求 URL
	options   map[string]interface{} // 请求选项（method, headers, body 等）
	abortCh   chan struct{}          // Abort 信号 channel
	resultCh  chan FetchResult       // 结果 channel
	signalObj *goja.Object           // 🔥 AbortSignal 对象（用于获取 reason）
}

// prefetchedReadCloser 将已预读的数据与原始 Body 组合在一起
// 用于在缓冲失败时回退到流式模式，确保已经读取的数据不会丢失
type prefetchedReadCloser struct {
	io.Reader
	closer io.Closer
}

func (p *prefetchedReadCloser) Close() error {
	if p.closer != nil {
		return p.closer.Close()
	}
	return nil
}

// FetchResult 表示请求结果
type FetchResult struct {
	response    *ResponseData // 响应数据
	err         error         // 错误信息
	abortReason goja.Value    // 🔥 abort 时的 reason（从 signal 获取）
}

// ==================== Request 执行函数 ====================

// ExecuteRequestAsync 异步执行 HTTP 请求
// 🔥 核心功能:
// - 解析 HTTP 方法和请求体
// - 创建请求上下文（支持超时和取消）
// - 处理 redirect 选项（manual/follow/error）
// - 启动 Abort 监听器
// - 返回流式响应（bodyWithCancel 包装）
//
// 参数说明:
// - config: Fetch 配置（超时、大小限制等）
// - client: HTTP 客户端
// - req: 请求对象
// - createBodyWrapper: 创建 bodyWithCancel 的工厂函数
//
// 架构说明:
// - 请求和响应共享一个 context（reqCtx）
// - reqCancel 传递给 bodyWithCancel，在 body.Close() 时调用（延迟取消）
// - uploadCtx 用于 FormData 上传（独立的超时）
// - done channel 用于同步请求完成
func ExecuteRequestAsync(
	config *FetchConfig,
	client *http.Client,
	req *FetchRequest,
	createBodyWrapper func(body io.ReadCloser, contentLength int64, timeout time.Duration, cancel context.CancelFunc) io.ReadCloser,
) {
	// 🔥 在函数顶部声明 context 相关变量，便于在 defer 中安全访问
	var (
		reqCtx       context.Context
		reqCancel    context.CancelFunc
		uploadCtx    context.Context
		uploadCancel context.CancelFunc
	)

	// 🔥 兜底：捕获所有 panic，防止进程崩溃
	// 同时在异常路径上兜底取消 context，避免少数极端场景下的 context 泄漏
	defer func() {
		if r := recover(); r != nil {
			// 兜底取消 context（如果已创建）
			if uploadCancel != nil {
				uploadCancel()
			}
			if reqCancel != nil {
				reqCancel()
			}

			// 将 panic 转为错误写回 resultCh
			select {
			case req.resultCh <- FetchResult{nil, fmt.Errorf("fetch 内部错误: %v", r), nil}:
			default:
				// channel 已满或已关闭，忽略
			}
		}
	}()

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
				req.resultCh <- FetchResult{nil, fmt.Errorf("无效的 FormData body 类型: %T", formDataBody), nil}
				return
			}
		}
	} else if b, ok := req.options["body"]; ok && b != nil {
		// 处理其他类型的 body（已经在 fetch 函数中预处理为基础类型）
		switch v := b.(type) {
		case string:
			body = strings.NewReader(v)
			contentLength = int64(len(v))
			if contentType == "" {
				contentType = "text/plain;charset=UTF-8"
			}
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
				req.resultCh <- FetchResult{nil, fmt.Errorf("无效的 body 类型: 无法序列化为 JSON"), nil}
				return
			}
			body = bytes.NewReader(jsonData)
			contentLength = int64(len(jsonData))
			contentType = "application/json"
		}
	}

	// 3. 创建请求上下文
	// 🔥 v2.5.3: 延迟 context 取消策略
	//   - context 用于整个 HTTP 事务（请求+响应读取）
	//   - cancel 传递给 bodyWithCancel，在 body.Close() 时调用
	//   - 双重 timer 提供额外保护（idleTimer + totalTimer）
	//
	// 生命周期：
	//   1. 创建 context（带超时）
	//   2. HTTP 请求使用这个 context
	//   3. body 持有 cancel，读取时 context 仍有效
	//   4. body.Close() 时调用 cancel，释放 context ✅
	//
	// 为什么不能在请求完成后立即 cancel：
	//   - resp.Body 底层仍依赖 request context（特别是 HTTP/2）
	//   - 过早 cancel 会导致 body 读取失败（context canceled 错误）
	reqCtx, reqCancel = context.WithTimeout(context.Background(), config.RequestTimeout)

	// 🔥 v2.4.2: 为上传 FormData 创建独立的 context
	// 注意：这是上传阶段的 context，与下载响应的 context 独立

	if _, ok := req.options["__formDataBody"]; ok {
		if streamingFormData, ok := req.options["__streamingFormData"].(*formdata.StreamingFormData); ok {
			// 为 FormData 上传创建独立的 context（带超时）
			uploadCtx, uploadCancel = context.WithTimeout(context.Background(), config.RequestTimeout)
			// 🔥 注意：uploadCancel 会在请求完成或失败时调用

			// 立即注入到 FormData 配置
			streamingFormData.SetContext(uploadCtx)
		}
	}

	// 4. 创建 HTTP 请求（使用请求阶段 context）
	httpReq, err := http.NewRequestWithContext(reqCtx, method, req.url, body)
	if err != nil {
		// 清理上传 context（如果有）
		if uploadCancel != nil {
			uploadCancel()
		}
		// 🔥 清理请求 context（避免 context 泄漏）
		reqCancel()
		req.resultCh <- FetchResult{nil, fmt.Errorf("创建请求失败: %w", err), nil}
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
	if headers, ok := req.options["headers"].(map[string][]string); ok {
		for key, values := range headers {
			for _, v := range values {
				httpReq.Header.Add(key, fmt.Sprintf("%v", v))
			}
		}
	} else if headers, ok := req.options["headers"].(map[string]interface{}); ok {
		for key, value := range headers {
			switch vals := value.(type) {
			case []string:
				for _, v := range vals {
					httpReq.Header.Add(key, fmt.Sprintf("%v", v))
				}
			case []interface{}:
				for _, v := range vals {
					httpReq.Header.Add(key, fmt.Sprintf("%v", v))
				}
			default:
				httpReq.Header.Set(key, fmt.Sprintf("%v", value))
			}
		}
	}
	if contentType != "" && httpReq.Header.Get("Content-Type") == "" {
		httpReq.Header.Set("Content-Type", contentType)
	}
	applyDefaultRequestHeaders(httpReq)

	// 6. 安全检查
	// 6.1 协议安全检查
	if err := CheckProtocol(httpReq.URL.Scheme); err != nil {
		// 清理上传 context（如果有）
		if uploadCancel != nil {
			uploadCancel()
		}
		// 🔥 清理请求 context（避免 context 泄漏）
		reqCancel()
		req.resultCh <- FetchResult{nil, err, nil}
		return
	}

	// 6.2 域名白名单检查
	if len(config.AllowedDomains) > 0 {
		if err := CheckDomainWhitelist(req.url, config.AllowedDomains); err != nil {
			// 清理上传 context（如果有）
			if uploadCancel != nil {
				uploadCancel()
			}
			// 🔥 清理请求 context（避免 context 泄漏）
			reqCancel()
			req.resultCh <- FetchResult{nil, err, nil}
			return
		}
	}

	// 6.5 🔥 处理 redirect 选项（支持 fetch API 的 redirect 模式）
	// redirect: 'manual' -> 不自动跟随重定向（返回 3xx 状态码）
	// redirect: 'follow' -> 自动跟随重定向（默认行为）
	// redirect: 'error' -> 遇到重定向时抛出错误
	httpClient := client // 默认使用共享 client
	redirectMode := "follow"
	if mode, ok := req.options["redirect"].(string); ok {
		redirectMode = mode
	}
	requestMode := "cors"
	if modeVal, ok := req.options["mode"].(string); ok && modeVal != "" {
		requestMode = strings.ToLower(modeVal)
	}
	var redirectedFlag atomic.Bool

	// 🔥 如果有白名单配置，需要在 redirect 时验证目标域名
	needsRedirectCheck := len(config.AllowedDomains) > 0

	switch redirectMode {
	case "manual":
		// 不跟随重定向：创建新的 client，禁用自动重定向
		httpClient = &http.Client{
			Timeout:   client.Timeout,
			Transport: client.Transport,
			CheckRedirect: func(redirectReq *http.Request, via []*http.Request) error {
				// 🔥 1. 先验证协议安全（防止 file:// 等危险协议）
				if err := CheckProtocol(redirectReq.URL.Scheme); err != nil {
					return fmt.Errorf("redirect protocol not allowed: %w", err)
				}

				// 🔥 2. 如果配置了白名单，验证目标域名
				if needsRedirectCheck {
					if err := CheckDomainWhitelist(redirectReq.URL.String(), config.AllowedDomains); err != nil {
						return fmt.Errorf("redirect target not in whitelist: %w", err)
					}
				}

				// 返回 http.ErrUseLastResponse 表示不跟随重定向
				return http.ErrUseLastResponse
			},
		}
	case "error":
		// 遇到重定向时抛出错误
		httpClient = &http.Client{
			Timeout:   client.Timeout,
			Transport: client.Transport,
			CheckRedirect: func(redirectReq *http.Request, via []*http.Request) error {
				// 🔥 1. 先验证协议安全
				if err := CheckProtocol(redirectReq.URL.Scheme); err != nil {
					return fmt.Errorf("redirect protocol not allowed: %w", err)
				}

				// 🔥 2. 如果配置了白名单，验证目标域名
				if needsRedirectCheck {
					if err := CheckDomainWhitelist(redirectReq.URL.String(), config.AllowedDomains); err != nil {
						return fmt.Errorf("redirect target not in whitelist: %w", err)
					}
				}

				return fmt.Errorf("redirect not allowed")
			},
		}
	case "follow":
		// 🔥 如果有白名单配置，需要创建新的 client 来验证 redirect 目标
		if needsRedirectCheck {
			httpClient = &http.Client{
				Timeout:   client.Timeout,
				Transport: client.Transport,
				CheckRedirect: func(redirectReq *http.Request, via []*http.Request) error {
					// 🔥 1. 先验证协议安全
					if err := CheckProtocol(redirectReq.URL.Scheme); err != nil {
						return fmt.Errorf("redirect protocol not allowed: %w", err)
					}

					// 🔥 2. 验证重定向目标是否在白名单中
					if err := CheckDomainWhitelist(redirectReq.URL.String(), config.AllowedDomains); err != nil {
						return fmt.Errorf("redirect target not in whitelist: %w", err)
					}

					if len(via) > 0 {
						redirectedFlag.Store(true)
					}
					// 🔥 3. 默认最多跟随 10 次重定向（Go 标准库的默认值）
					// 🔥 注意：via 包含之前所有请求，len(via) > 10 表示已完成 10 次重定向
					if len(via) > 10 {
						return fmt.Errorf("stopped after 10 redirects")
					}
					return nil
				},
			}
		} else {
			// 🔥 即使没有白名单，也要验证 redirect 协议安全
			httpClient = &http.Client{
				Timeout:   client.Timeout,
				Transport: client.Transport,
				CheckRedirect: func(redirectReq *http.Request, via []*http.Request) error {
					// 验证协议安全
					if err := CheckProtocol(redirectReq.URL.Scheme); err != nil {
						return fmt.Errorf("redirect protocol not allowed: %w", err)
					}
					if len(via) > 0 {
						redirectedFlag.Store(true)
					}
					// 默认最多跟随 10 次重定向
					// 🔥 注意：via 包含之前所有请求，len(via) > 10 表示已完成 10 次重定向
					if len(via) > 10 {
						return fmt.Errorf("stopped after 10 redirects")
					}
					return nil
				},
			}
		}
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
		defer close(done)                     // 🔥 确保 done 总会关闭（防御异常情况）
		resp, reqErr = httpClient.Do(httpReq) // 🔥 使用选择的 client
	}()

	// 6.6 🔥 启动 abort 监听器 (在独立的 goroutine 中)
	// 当 abortCh 被关闭时，立即取消请求 context
	go func() {
		select {
		case <-req.abortCh:
			// abort 被调用，立即取消请求 context
			reqCancel()
		case <-done:
			// 请求已完成，退出监听
		}
	}()

	// 🔥 资源清理策略
	// shouldCloseBody: 是否需要在 defer 中关闭 resp.Body
	// shouldCancelContext: 是否需要在 defer 中取消 context
	shouldCloseBody := true     // 默认需要清理 body
	shouldCancelContext := true // 默认需要取消 context
	// drainBody: 是否需要在关闭前耗尽响应体（用于连接复用）
	// 超限/错误分支应跳过耗尽，避免无意义的带宽/CPU 消耗
	drainBody := true

	defer func() {
		// 清理上传 context（如果有）
		if uploadCancel != nil {
			uploadCancel()
		}

		// 清理响应 body
		if shouldCloseBody && resp != nil && resp.Body != nil {
			// 清空 Body 以帮助连接复用 (性能提升 ~100x)
			if drainBody {
				io.Copy(io.Discard, resp.Body)
			}
			resp.Body.Close()
		}

		// 🔥 如果 cancel 没有被 bodyWrapper 接管，在这里取消
		if shouldCancelContext && reqCancel != nil {
			reqCancel()
		}
	}()

	// 8. 等待请求完成、取消或超时
	select {
	case <-done:
		// 请求完成（成功或失败）
		if reqErr != nil {
			// 请求失败
			// ✅ reqCancel 会在 defer 中调用
			// ✅ uploadCancel 会在 defer 中调用
			// ✅ defer 会清理 resp.Body
			if reqCtx.Err() == context.Canceled {
				req.resultCh <- FetchResult{nil, fmt.Errorf("请求已中止"), nil}
			} else if reqCtx.Err() == context.DeadlineExceeded {
				req.resultCh <- FetchResult{nil, fmt.Errorf("请求超时"), nil}
			} else {
				req.resultCh <- FetchResult{nil, fmt.Errorf("网络错误: %w", reqErr), nil}
			}
			return
		}

		normalizeContentEncodingHeader(resp)

		// 🔥 优化：提前检查 Content-Length（节省带宽）
		// 检查是否超过流式限制（绝对上限）
		if resp.ContentLength > 0 && config.MaxStreamingSize > 0 && resp.ContentLength > config.MaxStreamingSize {
			sizeMB := float64(resp.ContentLength) / 1024 / 1024
			limitMB := float64(config.MaxStreamingSize) / 1024 / 1024
			excessBytes := resp.ContentLength - config.MaxStreamingSize

			// 超限场景不再耗尽 body，直接取消请求并关闭
			drainBody = false
			if reqCancel != nil {
				reqCancel()
				shouldCancelContext = false
			}

			req.resultCh <- FetchResult{
				nil,
				fmt.Errorf(
					"文件大小超过流式下载限制: %d 字节 (%.3fMB) > %d 字节 (%.2fMB)，超出 %d 字节",
					resp.ContentLength, sizeMB, config.MaxStreamingSize, limitMB, excessBytes,
				),
				nil,
			}
			// shouldCloseBody = true, defer 会清理
			return
		}

		// 🔥 判断是否使用缓冲模式或流式模式
		// 策略：
		// 1. Content-Length 已知且 <= MaxResponseSize：直接缓冲
		// 2. Content-Length 未知/<=0：尝试缓冲，读取过程中使用 LimitReader 控制上限
		// 3. 其他情况（明确超过限制）走流式，保持旧行为
		shouldTryBuffering := false
		if config.MaxResponseSize > 0 && req.signalObj == nil {
			switch {
			case resp.ContentLength > 0:
				shouldTryBuffering = resp.ContentLength <= config.MaxResponseSize
			case resp.ContentLength == 0:
				shouldTryBuffering = true
			default: // Content-Length < 0（未知，例如 chunked 编码）
				shouldTryBuffering = true
			}
		}

		// 🔥 请求成功：创建响应
		// ✅ uploadCtx 会在 defer 中取消（防止泄漏）
		// ✅ reqCancel 传递给 bodyWrapper，在 body.Close() 时调用（流式模式）
		// ✅ resp.Body 的生命周期由 bodyWrapper 和双重 timer 管理（流式模式）

		redirected := redirectedFlag.Load()
		responseType := determineResponseTypeForNode(requestMode)
		statusText := resp.Status
		if len(resp.Status) > 4 && resp.Status[3] == ' ' {
			statusText = resp.Status[4:]
		}

		if isNullBodyStatus(resp.StatusCode) {
			// WHATWG null body status：强制 Response.body 为 null
			req.resultCh <- FetchResult{
				response: &ResponseData{
					StatusCode:    resp.StatusCode,
					Status:        statusText,
					Headers:       resp.Header,
					Body:          []byte{},
					IsStreaming:   false,
					FinalURL:      resp.Request.URL.String(),
					Redirected:    redirected,
					ResponseType:  responseType,
					ContentLength: 0,
					AbortCh:       req.abortCh,
					Signal:        req.signalObj,
					ForceNullBody: true,
				},
				err:         nil,
				abortReason: nil,
			}

			shouldCloseBody = true
			shouldCancelContext = true
			return
		}

		var bufferedBody []byte
		bodyForStreaming := resp.Body

		if shouldTryBuffering {
			// 尝试缓冲模式：读取最多 MaxResponseSize+1 字节
			limitedReader := io.LimitReader(resp.Body, config.MaxResponseSize+1)
			bodyBytes, readErr := io.ReadAll(limitedReader)
			if readErr != nil {
				req.resultCh <- FetchResult{nil, fmt.Errorf("读取响应失败: %w", readErr), nil}
				return
			}

			if int64(len(bodyBytes)) > config.MaxResponseSize {
				// Content-Length 未知时，超出限制则回退到流式模式：将已读取的数据重新拼接回去
				if resp.ContentLength <= 0 {
					bodyForStreaming = &prefetchedReadCloser{
						Reader: io.MultiReader(bytes.NewReader(bodyBytes), resp.Body),
						closer: resp.Body,
					}
					bufferedBody = nil
				} else {
					// 已知 Content-Length 的响应超过限制，直接报错（保持旧行为）
					sizeMB := float64(len(bodyBytes)) / 1024 / 1024
					limitMB := float64(config.MaxResponseSize) / 1024 / 1024
					// 超限时不再继续耗尽 body，直接取消
					drainBody = false
					if reqCancel != nil {
						reqCancel()
						shouldCancelContext = false
					}
					req.resultCh <- FetchResult{
						nil,
						fmt.Errorf(
							"响应大小超过缓冲限制: %d 字节 (%.3fMB) > %d 字节 (%.2fMB)",
							len(bodyBytes), sizeMB, config.MaxResponseSize, limitMB,
						),
						nil,
					}
					return
				}
			} else {
				bufferedBody = bodyBytes
			}
		}

		if bufferedBody != nil {
			// 发送缓冲响应
			req.resultCh <- FetchResult{
				response: &ResponseData{
					StatusCode:    resp.StatusCode,
					Status:        statusText,
					Headers:       resp.Header,
					Body:          bufferedBody,
					IsStreaming:   false, // 缓冲模式
					FinalURL:      resp.Request.URL.String(),
					Redirected:    redirected,
					ResponseType:  responseType,
					ContentLength: int64(len(bufferedBody)),
					AbortCh:       req.abortCh,
					Signal:        req.signalObj,
				},
				err:         nil,
				abortReason: nil,
			}

			// 缓冲模式已读取完毕，需要关闭 body 和取消 context
			shouldCloseBody = true
			shouldCancelContext = true

		} else {
			// 流式模式：已知大小 > MaxResponseSize 或 Content-Length 未知但超过限制
			bodyWrapper := createBodyWrapper(bodyForStreaming, resp.ContentLength, config.ResponseReadTimeout, reqCancel)

			req.resultCh <- FetchResult{
				response: &ResponseData{
					StatusCode:    resp.StatusCode,
					Status:        statusText,
					Headers:       resp.Header,
					BodyStream:    bodyWrapper,
					IsStreaming:   true, // 流式模式
					FinalURL:      resp.Request.URL.String(),
					Redirected:    redirected,
					ResponseType:  responseType,
					ContentLength: resp.ContentLength,
					AbortCh:       req.abortCh,
					Signal:        req.signalObj,
				},
				err:         nil,
				abortReason: nil,
			}

			// ✅ body 和 cancel 都已被 bodyWrapper 接管
			shouldCloseBody = false
			shouldCancelContext = false
		}

	case <-req.abortCh:
		// 🔥 请求被取消 (用户调用了 controller.abort())
		// ✅ reqCancel 会在 defer 中调用
		// 🔥 等待请求真正结束
		<-done
		// defer 会清理资源

		// 🔥 尝试从 signal 获取 reason
		var abortReason goja.Value
		if req.signalObj != nil {
			reasonVal := req.signalObj.Get("reason")
			if reasonVal != nil && !goja.IsUndefined(reasonVal) {
				abortReason = reasonVal
			}
		}

		select {
		case req.resultCh <- FetchResult{nil, NewAbortError("The operation was aborted"), abortReason}:
		default:
			// channel 已满或已关闭,忽略
		}

	case <-reqCtx.Done():
		// 🔥 请求超时
		// ✅ reqCancel 会在 defer 中调用
		// 🔥 等待请求真正结束
		<-done
		// defer 会清理资源

		if reqCtx.Err() == context.DeadlineExceeded {
			req.resultCh <- FetchResult{nil, fmt.Errorf("请求超时"), nil}
		} else {
			req.resultCh <- FetchResult{nil, reqCtx.Err(), nil}
		}
	}
}

// applyDefaultRequestHeaders 应用默认请求头
// 🔥 自动注入 Accept 和 User-Agent（如果未设置）
func applyDefaultRequestHeaders(httpReq *http.Request) {
	if httpReq.Header.Get("Accept") == "" {
		httpReq.Header.Set("Accept", "application/json, text/plain, */*")
	}
	if httpReq.Header.Get("User-Agent") == "" {
		httpReq.Header.Set("User-Agent", "Flow-HTTP-Client/1.0")
	}
}

func normalizeContentEncodingHeader(resp *http.Response) {
	if resp == nil {
		return
	}
	if !resp.Uncompressed {
		return
	}
	if resp.Header == nil {
		resp.Header = http.Header{}
	}
	if resp.Header.Get("Content-Encoding") == "" {
		resp.Header.Set("Content-Encoding", "gzip")
	}
}

func determineResponseTypeForNode(mode string) string {
	mode = strings.ToLower(strings.TrimSpace(mode))
	switch mode {
	case "", "cors":
		return "cors"
	case "same-origin", "navigate", "no-cors":
		return "basic"
	default:
		return "cors"
	}
}

// ==================== Promise 轮询和错误处理 ====================

// LoopSchedulerGlobalKey 存储 EventLoop 调度器的全局变量名（仅内部使用）
const LoopSchedulerGlobalKey = "__go_fetch_loop_scheduler__"

// LoopScheduler 抽象出 EventLoop 的 RunOnLoop 能力，供 fetch 完成时回调使用
type LoopScheduler interface {
	RunOnLoop(func(*goja.Runtime)) bool
	AcquireKeepAlive() func()
}

// LoopSchedulerAdapter 适配器，封装 RunOnLoop 和 KeepAlive 能力
type LoopSchedulerAdapter struct {
	RunFunc       func(func(*goja.Runtime)) bool
	KeepAliveFunc func() func()
}

func (a *LoopSchedulerAdapter) RunOnLoop(cb func(*goja.Runtime)) bool {
	if a == nil || a.RunFunc == nil {
		return false
	}
	return a.RunFunc(cb)
}

func (a *LoopSchedulerAdapter) AcquireKeepAlive() func() {
	if a == nil || a.KeepAliveFunc == nil {
		return nil
	}
	return a.KeepAliveFunc()
}

// NewLoopScheduler 创建一个 LoopSchedulerAdapter 实例
func NewLoopScheduler(run func(func(*goja.Runtime)) bool, keepAlive func() func()) LoopScheduler {
	return &LoopSchedulerAdapter{
		RunFunc:       run,
		KeepAliveFunc: keepAlive,
	}
}

// PollResult 在 EventLoop 模式下使用调度器事件驱动返回结果（不依赖 JS 定时器保活）
func PollResult(runtime *goja.Runtime, req *FetchRequest, resolve, reject func(goja.Value), recreateResponse func(*goja.Runtime, *ResponseData) goja.Value, cleanup func(error)) {
	scheduler := getLoopScheduler(runtime)
	if scheduler == nil {
		reject(CreateErrorObject(runtime, fmt.Errorf("fetch 调度器不可用")))
		return
	}
	release := scheduler.AcquireKeepAlive()
	if release == nil {
		reject(CreateErrorObject(runtime, fmt.Errorf("fetch 保活不可用")))
		return
	}

	go func() {
		result := <-req.resultCh
		if !scheduler.RunOnLoop(func(rt *goja.Runtime) {
			defer release()
			handleFetchResult(rt, result, resolve, reject, recreateResponse, cleanup)
		}) {
			release()
			if cleanup != nil {
				cleanup(result.err)
			}
		}
	}()
}

// handleFetchResult 统一处理 fetch 结果并执行 resolve/reject
func handleFetchResult(runtime *goja.Runtime, result FetchResult, resolve, reject func(goja.Value), recreateResponse func(*goja.Runtime, *ResponseData) goja.Value, cleanup func(error)) {
	if cleanup != nil {
		cleanup(result.err)
	}
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
		return
	}
	resolve(recreateResponse(runtime, result.response))
}

// getLoopScheduler 从 Runtime 中获取可用的事件循环调度器
func getLoopScheduler(runtime *goja.Runtime) LoopScheduler {
	if runtime == nil {
		return nil
	}
	schedulerVal := runtime.Get(LoopSchedulerGlobalKey)
	if schedulerVal == nil || goja.IsUndefined(schedulerVal) || goja.IsNull(schedulerVal) {
		return nil
	}
	if scheduler, ok := schedulerVal.Export().(LoopScheduler); ok {
		return scheduler
	}
	return nil
}

// CreateErrorObject 创建标准的 JavaScript Error 对象
// 🔥 修复: 错误对象有正确的 message 和 toString 方法
func CreateErrorObject(runtime *goja.Runtime, err error) goja.Value {
	return CreateErrorObjectWithName(runtime, err, "TypeError")
}

// CreateAbortErrorObject 创建 AbortError 对象
func CreateAbortErrorObject(runtime *goja.Runtime, err error) goja.Value {
	return CreateErrorObjectWithName(runtime, err, "AbortError")
}

// CreateErrorObjectWithName 创建指定类型的 Error 对象
// 🔥 根据底层错误推断 Node 风格的错误码（用于 axios 网络错误兼容）
func CreateErrorObjectWithName(runtime *goja.Runtime, err error, errorName string) goja.Value {
	errorMsg := err.Error()

	// 1. 推断错误码、主机名、系统调用信息
	var (
		code     string
		hostname string
		syscall  string
	)

	lowerMsg := strings.ToLower(errorMsg)
	switch {
	case errors.Is(err, context.DeadlineExceeded), strings.Contains(lowerMsg, "请求超时"):
		code = "ECONNABORTED"
	case strings.Contains(lowerMsg, "unsupported protocol"),
		strings.Contains(lowerMsg, "invalid url"),
		strings.Contains(lowerMsg, "不允许的协议"):
		code = "ERR_INVALID_URL"
	default:
		root := err
		for {
			unwrapped := errors.Unwrap(root)
			if unwrapped == nil {
				break
			}
			root = unwrapped
		}

		var dnsErr *net.DNSError
		if errors.As(root, &dnsErr) {
			code = "ENOTFOUND"
			if dnsErr.Name != "" {
				hostname = dnsErr.Name
			}
		}

		var opErr *net.OpError
		if errors.As(root, &opErr) {
			syscall = opErr.Op
			if opErr.Op == "dial" || strings.Contains(opErr.Error(), "connection refused") {
				code = "ECONNREFUSED"
			}
		}

		if code == "" && (strings.Contains(lowerMsg, "网络错误") || strings.Contains(lowerMsg, "network")) {
			code = "ERR_NETWORK"
		}
	}

	// 2. 通过 JS 构造函数创建真实的 Error 实例（确保 instanceof 检查成立）
	createErrorObject := func(name string) *goja.Object {
		ctorVal := runtime.Get(name)
		if ctorVal == nil || goja.IsUndefined(ctorVal) || goja.IsNull(ctorVal) {
			ctorVal = runtime.Get("Error")
		}
		if ctor, ok := goja.AssertFunction(ctorVal); ok {
			value, callErr := ctor(goja.Undefined(), runtime.ToValue(errorMsg))
			if callErr == nil {
				if obj := value.ToObject(runtime); obj != nil {
					return obj
				}
			}
		}
		// 兜底：直接构造普通对象
		obj := runtime.NewObject()
		obj.Set("message", errorMsg)
		obj.Set("name", name)
		return obj
	}

	errorObj := createErrorObject(errorName)
	errorObj.Set("name", errorName)

	// 3. 附加 Node 风格的信息
	if code != "" {
		errorObj.Set("code", code)
	}

	// Node fetch 会将底层错误暴露在 cause 属性中
	causeObj := runtime.NewObject()
	causeObj.Set("message", errorMsg)
	if code != "" {
		causeObj.Set("code", code)
	}
	if hostname != "" {
		causeObj.Set("hostname", hostname)
	}
	if syscall != "" {
		causeObj.Set("syscall", syscall)
	}
	errorObj.Set("cause", causeObj)

	return errorObj
}

// ==================== 注释说明 ====================
// 🔥 设计原则：
//
// 1. **延迟 context 取消**：
//    - reqCancel 传递给 bodyWithCancel
//    - body.Close() 时才取消 context
//    - 保证 body 读取时 context 有效
//
// 2. **双重超时保护**：
//    - reqCtx.Done(): 总超时（请求+响应读取）
//    - bodyWithCancel: 空闲超时 + 总时长超时
//    - 多层防护，避免资源泄漏
//
// 3. **重定向策略**：
//    - manual: 返回 3xx 响应（不跟随）
//    - follow: 自动跟随（默认）
//    - error: 遇到重定向抛出错误
//
// 4. **FormData 上传**：
//    - 独立的 uploadCtx（不影响下载）
//    - 注入到 StreamingFormData.Config
//    - 上传完成后自动取消
//
// 5. **Abort 机制**：
//    - 监听 abortCh（channel 关闭）
//    - 立即取消 reqCtx
//    - 返回 AbortError
//
// 6. **资源清理**：
//    - defer 保证资源释放
//    - shouldCloseBody: 控制 body 清理
//    - shouldCancelContext: 控制 context 取消
//    - 避免 goroutine 和资源泄漏
//
// 7. **错误码兼容**：
//    - ECONNABORTED: 超时
//    - ENOTFOUND: DNS 错误
//    - ECONNREFUSED: 连接被拒绝
//    - ERR_NETWORK: 通用网络错误
//    - 兼容 axios 错误码规范
