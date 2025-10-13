package middleware

import (
	"flow-codeblock-go/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RequestBodyLimitMiddleware 请求体大小限制中间件
// 🔥 DoS 防护：在读取请求体前设置大小限制，防止超大请求消耗内存
//
// 功能：
//   - 在 HTTP 层面限制请求体大小（第一道防线）
//   - 超限请求返回 413 Request Entity Too Large
//   - 记录超限请求日志（便于监控和告警）
//
// 与其他防护的关系：
//   - 层次 0（本中间件）：HTTP 请求体限制（10MB）- 最早防护
//   - 层次 1：Base64 长度预检查（~87KB）
//   - 层次 2：MaxInputSize 检查（2MB）
//   - 层次 3：MaxCodeLength 检查（65KB）
//
// 参数：
//   - maxBytes: 最大请求体大小（字节）
//
// 返回值：
//   - Gin 中间件函数
func RequestBodyLimitMiddleware(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 🔥 设置请求体大小限制
		// MaxBytesReader 会在读取超过 maxBytes 时返回错误
		// 重要：这必须在任何读取请求体的操作之前设置
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)

		// 继续处理请求
		c.Next()

		// 🔥 检查是否因请求体过大而被拒绝
		// 如果 Gin 的 ShouldBindJSON 遇到 MaxBytesReader 错误，会返回 400
		// 但我们可以在这里额外记录日志
		if c.Writer.Status() == http.StatusRequestEntityTooLarge {
			utils.Warn("拒绝超大请求体",
				zap.String("request_id", c.GetString("request_id")),
				zap.Int64("max_bytes", maxBytes),
				zap.Int64("max_mb", maxBytes/(1024*1024)),
				zap.String("ip", c.ClientIP()),
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method))
		}
	}
}

