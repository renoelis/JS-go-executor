package middleware

import (
	"fmt"
	"net/http"
	"time"

	"flow-codeblock-go/service"
	"flow-codeblock-go/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RateLimiterMiddleware 限流中间件
func RateLimiterMiddleware(limiterService *service.RateLimiterService) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// 1. 获取Token信息（由认证中间件设置）
		tokenInfo, exists := GetTokenInfo(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"type":    "AuthenticationError",
					"message": "认证失败：未找到Token信息",
				},
				"timestamp": utils.FormatTime(utils.Now()),
			})
			c.Abort()
			return
		}

		// 2. 获取限流配置
		rateLimitConfig := tokenInfo.GetRateLimitConfig()

		// 3. 如果不限制，直接通过
		if rateLimitConfig.Unlimited {
			utils.Debug("Token无限制访问",
				zap.String("token", utils.MaskToken(tokenInfo.AccessToken)),
				zap.String("path", c.Request.URL.Path),
			)
			c.Next()
			return
		}

		// 4. 执行限流检查
		allowed, limitInfo, err := limiterService.CheckLimit(
			c.Request.Context(),
			tokenInfo.AccessToken,
			rateLimitConfig,
		)

		if err != nil {
			// 限流器异常，记录日志但不阻塞请求
			utils.Error("限流检查异常", zap.Error(err))
			c.Next()
			return
		}

		// 5. 设置响应头
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rateLimitConfig.PerMinute))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", limitInfo.Remaining))
		c.Header("X-RateLimit-Reset", limitInfo.ResetTime.Format(time.RFC3339))
		c.Header("X-RateLimit-Type", "token")

		if rateLimitConfig.Burst > 0 {
			c.Header("X-RateLimit-Burst-Limit", fmt.Sprintf("%d", rateLimitConfig.Burst))
		}

		// 6. 检查是否超限
		if !allowed {
			duration := time.Since(startTime)
			utils.Warn("限流拒绝",
				zap.String("token", utils.MaskToken(tokenInfo.AccessToken)),
				zap.String("ws_id", tokenInfo.WsID),
				zap.String("limit_type", limitInfo.LimitType),
				zap.String("message", limitInfo.Message),
				zap.Duration("duration", duration),
			)

			utils.RespondError(c, http.StatusTooManyRequests,
				utils.ErrorTypeTokenRateLimit,
				limitInfo.Message,
				map[string]interface{}{
					"retryAfter": limitInfo.RetryAfter,
					"limitInfo": map[string]interface{}{
						"type":      limitInfo.LimitType,
						"limit":     rateLimitConfig.PerMinute,
						"burst":     rateLimitConfig.Burst,
						"window":    fmt.Sprintf("%d秒", rateLimitConfig.WindowSeconds),
						"remaining": limitInfo.Remaining,
					},
				})
			c.Abort()
			return
		}

		// 7. 记录限流日志（高使用量时）
		if limitInfo.Remaining < rateLimitConfig.PerMinute/5 {
			utils.Debug("限流警告",
				zap.String("token", utils.MaskToken(tokenInfo.AccessToken)),
				zap.Int("remaining", limitInfo.Remaining),
				zap.Int("limit", rateLimitConfig.PerMinute),
			)
		}

		c.Next()
	}
}

// OptionalRateLimiterMiddleware 可选的限流中间件
// 如果有Token信息则进行限流，但不强制要求
func OptionalRateLimiterMiddleware(limiterService *service.RateLimiterService) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenInfo, exists := GetTokenInfo(c)
		if !exists {
			c.Next()
			return
		}

		// 获取限流配置
		rateLimitConfig := tokenInfo.GetRateLimitConfig()

		// 如果不限制，直接通过
		if rateLimitConfig.Unlimited {
			c.Next()
			return
		}

		// 执行限流检查
		allowed, limitInfo, err := limiterService.CheckLimit(
			c.Request.Context(),
			tokenInfo.AccessToken,
			rateLimitConfig,
		)

		if err != nil {
			// 限流器异常，不阻塞请求
			c.Next()
			return
		}

		// 设置响应头
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rateLimitConfig.PerMinute))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", limitInfo.Remaining))
		c.Header("X-RateLimit-Reset", limitInfo.ResetTime.Format(time.RFC3339))

		if !allowed {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": map[string]interface{}{
					"type":       "TokenRateLimitError",
					"message":    limitInfo.Message,
					"retryAfter": limitInfo.RetryAfter,
				},
				"timestamp": utils.FormatTime(utils.Now()),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
