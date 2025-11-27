package fetch

import (
	"fmt"
	"io"
	"net/http"

	"github.com/dop251/goja"
)

// ==================== ResponseData ====================

// ResponseData 表示 HTTP 响应数据
// 🔥 支持缓冲模式和流式模式
//
// 设计说明:
// 1. **缓冲模式** (IsStreaming = false):
//   - Body 字段保存完整响应数据
//   - BodyStream 为 nil
//   - 适用于小响应（< maxResponseSize）
//   - 支持 arrayBuffer(), blob(), text(), json() 等方法
//
// 2. **流式模式** (IsStreaming = true):
//   - BodyStream 字段保存 io.ReadCloser
//   - Body 为 nil
//   - 适用于大响应或需要流式处理的场景
//   - 支持 body.getReader() 获取流读取器
//
// 3. **Content-Length 智能预分配**:
//   - 已知大小时预分配确切缓冲区（避免 io.ReadAll 的多次扩容）
//   - 未知大小时使用动态扩容策略
type ResponseData struct {
	StatusCode    int           // HTTP 状态码
	Status        string        // HTTP 状态文本（如 "200 OK"）
	Headers       http.Header   // HTTP 响应头
	Body          []byte        // 非流式模式使用（缓冲读取）
	BodyStream    io.ReadCloser // 流式模式使用（流式读取）
	IsStreaming   bool          // 是否为流式模式
	FinalURL      string        // 最终 URL（重定向后）
	Redirected    bool          // 是否跟随过重定向
	ResponseType  string        // WHATWG Response.type
	ContentLength int64         // 响应的 Content-Length（用于智能预分配，-1表示未知）
	AbortCh       chan struct{} // 🔥 关联的 abort channel（用于流式读取时中止）
	Signal        *goja.Object  // 🔥 原始 AbortSignal 对象（用于获取 reason）
}

// ==================== 缓冲读取函数 ====================

// ReadBufferedResponse 从 HTTP 响应中读取完整数据（缓冲模式）
// 🔥 智能预分配策略：
// 1. 已知大小（Content-Length > 0）：直接预分配确切大小 + io.ReadFull（零拷贝，最快）
// 2. 未知大小（Content-Length <= 0）：使用 io.ReadAll（动态扩容）
// 3. 大小限制检查：读取前验证 Content-Length 是否超过 maxSize
//
// 参数说明:
// - body: HTTP 响应体的 io.ReadCloser
// - contentLength: Content-Length 值（-1表示未知）
// - maxSize: 最大允许大小（字节）
//
// 返回值:
// - []byte: 读取的数据
// - error: 错误信息（如超过大小限制、读取失败等）
func ReadBufferedResponse(body io.ReadCloser, contentLength int64, maxSize int64) ([]byte, error) {
	defer body.Close()

	// 1. 大小限制检查（已知大小时提前验证）
	if contentLength > 0 && maxSize > 0 && contentLength > maxSize {
		sizeMB := float64(contentLength) / 1024 / 1024
		limitMB := float64(maxSize) / 1024 / 1024
		return nil, fmt.Errorf("响应大小 %.2fMB 超过限制 %.2fMB", sizeMB, limitMB)
	}

	// 2. 已知大小：直接预分配 + io.ReadFull（最优性能）
	if contentLength > 0 {
		// 预分配确切大小的缓冲区
		data := make([]byte, contentLength)

		// 使用 io.ReadFull 精确读取（零拷贝，最快）
		n, err := io.ReadFull(body, data)
		if err != nil && err != io.ErrUnexpectedEOF {
			return nil, fmt.Errorf("读取响应失败: %w", err)
		}

		// 如果实际读取小于预期（例如压缩传输），截断到实际大小
		if n < len(data) {
			data = data[:n]
		}

		return data, nil
	}

	// 3. 未知大小：使用 io.ReadAll（动态扩容）
	// 🔥 限制读取器：防止无限读取
	if maxSize > 0 {
		limitedReader := io.LimitReader(body, maxSize+1) // +1 用于检测超过限制
		data, err := io.ReadAll(limitedReader)
		if err != nil {
			return nil, fmt.Errorf("读取响应失败: %w", err)
		}

		// 检查是否超过限制（读取到 maxSize+1 字节）
		if int64(len(data)) > maxSize {
			sizeMB := float64(maxSize) / 1024 / 1024
			return nil, fmt.Errorf("响应大小超过限制 %.2fMB", sizeMB)
		}

		return data, nil
	}

	// 4. 无限制：直接使用 io.ReadAll
	data, err := io.ReadAll(body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	return data, nil
}

// ==================== 辅助函数 ====================

// NewResponseData 创建 ResponseData 对象（缓冲模式）
func NewResponseData(statusCode int, status string, headers http.Header, body []byte, finalURL string, contentLength int64) *ResponseData {
	return &ResponseData{
		StatusCode:    statusCode,
		Status:        status,
		Headers:       headers,
		Body:          body,
		BodyStream:    nil,
		IsStreaming:   false,
		FinalURL:      finalURL,
		Redirected:    false,
		ResponseType:  "default",
		ContentLength: contentLength,
		AbortCh:       nil,
		Signal:        nil,
	}
}

// NewStreamingResponseData 创建 ResponseData 对象（流式模式）
func NewStreamingResponseData(statusCode int, status string, headers http.Header, bodyStream io.ReadCloser, finalURL string, contentLength int64) *ResponseData {
	return &ResponseData{
		StatusCode:    statusCode,
		Status:        status,
		Headers:       headers,
		Body:          nil,
		BodyStream:    bodyStream,
		IsStreaming:   true,
		FinalURL:      finalURL,
		Redirected:    false,
		ResponseType:  "default",
		ContentLength: contentLength,
		AbortCh:       nil,
		Signal:        nil,
	}
}

// ==================== 注释说明 ====================
// 🔥 设计原则：
//
// 1. **差异化限制**：
//    - 缓冲模式：maxResponseSize（默认 1MB）
//    - 流式模式：maxStreamingSize（默认 100MB）
//    - 根据使用场景选择合适的模式
//
// 2. **智能预分配**：
//    - 已知 Content-Length：预分配确切大小（最优性能）
//    - 未知 Content-Length：动态扩容（兼容性）
//    - 避免 io.ReadAll 的多次内存分配和拷贝
//
// 3. **大小限制检查**：
//    - 提前检查：已知大小时在读取前验证
//    - 运行时检查：未知大小时使用 LimitReader
//    - 防止内存耗尽攻击
//
// 4. **错误处理**：
//    - 清晰的错误消息（包含大小和限制）
//    - 区分不同的错误类型（超过限制 vs 读取失败）
//    - 方便用户调试和处理
//
// 5. **资源管理**：
//    - 缓冲模式自动关闭 body（defer close）
//    - 流式模式由调用者管理生命周期
//    - 避免资源泄漏
//
// 6. **性能优化**：
//    - 零拷贝：使用 io.ReadFull 精确读取
//    - 避免扩容：预分配确切大小
//    - 减少系统调用：批量读取而非逐字节读取
