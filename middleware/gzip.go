package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
	"sync"

	"flow-codeblock-go/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// gzip写入器池，复用压缩器以提高性能
var gzipWriterPool = sync.Pool{
	New: func() interface{} {
		gz, err := gzip.NewWriterLevel(io.Discard, gzip.BestSpeed)
		if err != nil {
			// 🔥 这个错误理论上不应该发生（BestSpeed 是有效值）
			// 但为了防御性编程，还是应该处理
			panic("failed to create gzip writer: " + err.Error())
		}
		return gz
	},
}

// gzipWriter 包装响应写入器
type gzipWriter struct {
	gin.ResponseWriter
	writer     *gzip.Writer
	buffered   int  // 🔥 已缓冲字节数
	flushSize  int  // 🔥 刷新阈值（默认 4KB）
	streamMode bool // 🔥 流式模式（SSE/WebSocket 等需要立即刷新）
}

func (g *gzipWriter) Write(data []byte) (int, error) {
	// 确保在写入数据前移除 Content-Length
	if g.Header().Get("Content-Length") != "" {
		g.Header().Del("Content-Length")
	}
	n, err := g.writer.Write(data)
	if err != nil {
		return n, err
	}

	g.buffered += n

	// 🔥 条件刷新策略：
	// 1. 流式模式：立即刷新（SSE、WebSocket、长轮询等）
	// 2. 普通模式：累积到 flushSize 后才刷新（提高压缩效率）
	shouldFlush := g.streamMode || g.buffered >= g.flushSize

	if shouldFlush {
		if err := g.writer.Flush(); err != nil {
			return n, err
		}
		// 刷新底层 HTTP 响应，真正发送数据块
		if flusher, ok := g.ResponseWriter.(http.Flusher); ok {
			flusher.Flush()
		}
		g.buffered = 0 // 重置计数器
	}

	return n, nil
}

func (g *gzipWriter) WriteString(s string) (int, error) {
	// 直接调用 Write 方法（复用条件刷新逻辑）
	return g.Write([]byte(s))
}

// WriteHeader 覆盖 WriteHeader 方法，在发送 header 前移除 Content-Length
func (g *gzipWriter) WriteHeader(code int) {
	// 在真正发送 header 之前，移除 Content-Length
	// 这样 Go 的 HTTP 服务器会自动使用 chunked 编码
	g.Header().Del("Content-Length")
	g.ResponseWriter.WriteHeader(code)
}

// Size 返回已写入的压缩数据大小（用于 Gin 的内部统计）
// 但返回 -1 表示大小未知，防止 Gin 设置 Content-Length
func (g *gzipWriter) Size() int {
	return -1
}

// Written 返回是否已写入响应（用于 Gin 的内部判断）
func (g *gzipWriter) Written() bool {
	return g.ResponseWriter.Written()
}

// Flush 实现 http.Flusher 接口，支持流式传输
func (g *gzipWriter) Flush() {
	// 先刷新 gzip 缓冲
	if err := g.writer.Flush(); err != nil {
		// 🔥 记录错误但继续执行（避免中断响应流）
		utils.Error("failed to flush gzip writer", zap.Error(err))
		return
	}
	// 再刷新底层 ResponseWriter
	if flusher, ok := g.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
	// 重置缓冲计数器
	g.buffered = 0
}

// GzipMiddleware Gzip压缩中间件
func GzipMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查客户端是否支持gzip
		if !strings.Contains(c.GetHeader("Accept-Encoding"), "gzip") {
			c.Next()
			return
		}

		// 排除不需要压缩的请求
		// 1. 小于1KB的响应不压缩（压缩开销大于收益）
		// 2. 已经压缩的格式不再压缩（jpg, png, gif, zip等）
		path := c.Request.URL.Path
		if shouldSkipCompression(path) {
			c.Next()
			return
		}

		// 从池中获取gzip写入器
		gz := gzipWriterPool.Get().(*gzip.Writer)
		defer gzipWriterPool.Put(gz)

		gz.Reset(c.Writer)
		defer gz.Close()

		// 设置响应头
		c.Header("Content-Encoding", "gzip")
		c.Header("Vary", "Accept-Encoding")

		// 🔥 检测是否需要流式模式
		streamMode := isStreamingRequest(c)

		// 包装响应写入器
		c.Writer = &gzipWriter{
			ResponseWriter: c.Writer,
			writer:         gz,
			buffered:       0,
			flushSize:      4096, // 4KB 缓冲（平衡压缩效率和响应速度）
			streamMode:     streamMode,
		}

		c.Next()
	}
}

// isStreamingRequest 检测是否是流式请求（需要立即刷新）
func isStreamingRequest(c *gin.Context) bool {
	// SSE (Server-Sent Events)
	if strings.Contains(c.GetHeader("Accept"), "text/event-stream") {
		return true
	}

	// WebSocket 升级请求
	if strings.ToLower(c.GetHeader("Upgrade")) == "websocket" {
		return true
	}

	// 长轮询或流式API（可根据路径判断）
	path := c.Request.URL.Path
	streamingPaths := []string{
		"/stream",
		"/events",
		"/sse",
	}
	for _, p := range streamingPaths {
		if strings.Contains(path, p) {
			return true
		}
	}

	return false
}

// shouldSkipCompression 判断是否应该跳过压缩
func shouldSkipCompression(path string) bool {
	// 已压缩的图片格式
	if strings.HasSuffix(path, ".jpg") ||
		strings.HasSuffix(path, ".jpeg") ||
		strings.HasSuffix(path, ".png") ||
		strings.HasSuffix(path, ".gif") ||
		strings.HasSuffix(path, ".webp") ||
		strings.HasSuffix(path, ".ico") {
		return true
	}

	// 已压缩的文件格式
	if strings.HasSuffix(path, ".zip") ||
		strings.HasSuffix(path, ".gz") ||
		strings.HasSuffix(path, ".tar.gz") ||
		strings.HasSuffix(path, ".7z") ||
		strings.HasSuffix(path, ".rar") {
		return true
	}

	// 视频文件
	if strings.HasSuffix(path, ".mp4") ||
		strings.HasSuffix(path, ".avi") ||
		strings.HasSuffix(path, ".mov") ||
		strings.HasSuffix(path, ".webm") {
		return true
	}

	return false
}

// GzipMiddlewareWithLevel 可配置压缩级别的Gzip中间件
// level: 1-9，1=最快速度，9=最高压缩率，建议使用6（平衡）或1（高性能）
func GzipMiddlewareWithLevel(level int) gin.HandlerFunc {
	// 验证压缩级别
	if level < gzip.BestSpeed || level > gzip.BestCompression {
		level = gzip.BestSpeed // 默认使用最快速度
	}

	// 为不同级别创建独立的池
	pool := &sync.Pool{
		New: func() interface{} {
			gz, _ := gzip.NewWriterLevel(io.Discard, level)
			return gz
		},
	}

	return func(c *gin.Context) {
		if !strings.Contains(c.GetHeader("Accept-Encoding"), "gzip") {
			c.Next()
			return
		}

		path := c.Request.URL.Path
		if shouldSkipCompression(path) {
			c.Next()
			return
		}

		gz := pool.Get().(*gzip.Writer)
		defer pool.Put(gz)

		gz.Reset(c.Writer)
		defer gz.Close()

		c.Header("Content-Encoding", "gzip")
		c.Header("Vary", "Accept-Encoding")

		// 🔥 检测是否需要流式模式
		streamMode := isStreamingRequest(c)

		c.Writer = &gzipWriter{
			ResponseWriter: c.Writer,
			writer:         gz,
			buffered:       0,
			flushSize:      4096, // 4KB 缓冲
			streamMode:     streamMode,
		}

		c.Next()
	}
}
