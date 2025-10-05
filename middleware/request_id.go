package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestIDMiddleware 为每个请求生成唯一ID
//
// 功能：
//  1. 检查请求头中是否已有 X-Request-ID
//  2. 如果没有，生成新的 UUID 作为请求ID
//  3. 将请求ID存入 gin.Context，供日志和响应使用
//  4. 将请求ID添加到响应头中
//
// 用途：
//   - 请求追踪：关联同一请求的所有日志
//   - 问题排查：用户可以提供 request_id 快速定位问题
//   - 分布式追踪：在微服务间传递请求ID
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 尝试从请求头获取请求ID（支持客户端传递）
		requestID := c.GetHeader("X-Request-ID")

		// 2. 如果没有，生成新的 UUID
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// 3. 存入上下文，供 response.go 和日志使用
		c.Set("request_id", requestID)

		// 4. 添加到响应头中，方便客户端追踪
		c.Header("X-Request-ID", requestID)

		// 继续处理请求
		c.Next()
	}
}

