package middleware

import (
	"net/http"
	"sync"
	"time"

	"flow-codeblock-go/config"
	"flow-codeblock-go/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// IPRateLimiter IP 限流器
type IPRateLimiter struct {
	limiters map[string]*limiterEntry
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
}

// limiterEntry 限流器条目
type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewIPRateLimiter 创建 IP 限流器
func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	limiter := &IPRateLimiter{
		limiters: make(map[string]*limiterEntry),
		rate:     r,
		burst:    b,
	}

	// 启动清理 goroutine（每 5 分钟清理一次，清理 10 分钟未活跃的 IP）
	go limiter.cleanup(5*time.Minute, 10*time.Minute)

	return limiter
}

// GetLimiter 获取 IP 对应的限流器
func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	entry, exists := i.limiters[ip]
	if !exists {
		entry = &limiterEntry{
			limiter:  rate.NewLimiter(i.rate, i.burst),
			lastSeen: time.Now(),
		}
		i.limiters[ip] = entry
	} else {
		entry.lastSeen = time.Now()
	}

	return entry.limiter
}

// cleanup 定期清理不活跃的 IP
func (i *IPRateLimiter) cleanup(interval, maxAge time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		i.mu.Lock()
		now := time.Now()
		cleaned := 0
		for ip, entry := range i.limiters {
			if now.Sub(entry.lastSeen) > maxAge {
				delete(i.limiters, ip)
				cleaned++
			}
		}
		i.mu.Unlock()

		if cleaned > 0 {
			utils.Debug("IP 限流器清理完成",
				zap.Int("cleaned_count", cleaned),
				zap.Int("remaining_count", len(i.limiters)),
			)
		}
	}
}

// GetStats 获取统计信息
func (i *IPRateLimiter) GetStats() map[string]interface{} {
	i.mu.RLock()
	defer i.mu.RUnlock()

	return map[string]interface{}{
		"total_ips": len(i.limiters),
		"rate":      float64(i.rate),
		"burst":     i.burst,
	}
}

// ========================================
// 🔥 全局 IP 限流中间件（用于公开端点）
// ========================================
// 注意：PreAuth 和 PostAuth IP 限流已被 SmartIPRateLimiter 替代
// 参见：middleware/smart_ip_rate_limiter.go

// GlobalIPRateLimiterMiddleware 全局 IP 限流中间件
// 目标：保护公开端点（如健康检查）
// 默认：50 QPS，突发 100
func GlobalIPRateLimiterMiddleware(cfg *config.Config) gin.HandlerFunc {
	limiter := NewIPRateLimiter(
		rate.Limit(cfg.RateLimit.GlobalIPRate),
		cfg.RateLimit.GlobalIPBurst,
	)

	utils.Info("全局 IP 限流器已启动",
		zap.Int("rate_per_second", cfg.RateLimit.GlobalIPRate),
		zap.Int("burst", cfg.RateLimit.GlobalIPBurst),
	)

	return func(c *gin.Context) {
		ip := getRealIP(c)

		if !limiter.GetLimiter(ip).Allow() {
			utils.Warn("全局 IP 限流拒绝",
				zap.String("ip", ip),
				zap.String("path", c.Request.URL.Path),
			)

			utils.RespondError(c, http.StatusTooManyRequests,
				utils.ErrorTypeIPRateLimit,
				"IP 请求频率超限，请稍后再试",
				map[string]interface{}{
					"limit": map[string]interface{}{
						"rate":  cfg.RateLimit.GlobalIPRate,
						"burst": cfg.RateLimit.GlobalIPBurst,
					},
				})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ========================================
// 🔧 辅助函数
// ========================================

// getRealIP 获取真实 IP 地址
// 支持 CDN、反向代理等场景
func getRealIP(c *gin.Context) string {
	// 1. 优先从 X-Forwarded-For 获取（标准头）
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For 可能包含多个 IP，取第一个
		// 格式：client, proxy1, proxy2
		if idx := len(xff); idx > 0 {
			// 简单处理：取第一个逗号前的 IP
			for i := 0; i < idx; i++ {
				if xff[i] == ',' {
					return xff[:i]
				}
			}
			return xff
		}
	}

	// 2. 其次从 X-Real-IP 获取（Nginx 常用）
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return xri
	}

	// 3. 最后使用 ClientIP（Gin 内置方法）
	return c.ClientIP()
}
