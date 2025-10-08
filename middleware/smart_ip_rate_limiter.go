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

// SmartIPRateLimiter 智能IP限流器
// 根据认证状态动态切换限流策略
type SmartIPRateLimiter struct {
	preAuthLimiters  map[string]*limiterEntry // 认证前限流器（严格）
	postAuthLimiters map[string]*limiterEntry // 认证后限流器（宽松）
	authenticatedIPs map[string]time.Time     // 已认证IP列表
	mu               sync.RWMutex
	preAuthRate      rate.Limit
	preAuthBurst     int
	postAuthRate     rate.Limit
	postAuthBurst    int

	// 🔥 优雅关闭支持
	shutdown chan struct{}
	wg       sync.WaitGroup
}

// NewSmartIPRateLimiter 创建智能IP限流器
func NewSmartIPRateLimiter(preRate, preBurst, postRate, postBurst int) *SmartIPRateLimiter {
	limiter := &SmartIPRateLimiter{
		preAuthLimiters:  make(map[string]*limiterEntry),
		postAuthLimiters: make(map[string]*limiterEntry),
		authenticatedIPs: make(map[string]time.Time),
		preAuthRate:      rate.Limit(preRate),
		preAuthBurst:     preBurst,
		postAuthRate:     rate.Limit(postRate),
		postAuthBurst:    postBurst,
		shutdown:         make(chan struct{}), // 🔥 初始化关闭信号
	}

	// 启动清理goroutine
	limiter.wg.Add(1) // 🔥 注册 goroutine
	go limiter.cleanup(5*time.Minute, 30*time.Minute)

	return limiter
}

// MarkAuthenticated 标记IP已认证成功
func (s *SmartIPRateLimiter) MarkAuthenticated(ip string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.authenticatedIPs[ip] = time.Now()
	utils.Debug("IP已标记为已认证",
		zap.String("ip", ip),
	)
}

// IsAuthenticated 检查IP是否已认证
func (s *SmartIPRateLimiter) IsAuthenticated(ip string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	_, exists := s.authenticatedIPs[ip]
	return exists
}

// GetLimiter 获取IP对应的限流器（根据认证状态）
func (s *SmartIPRateLimiter) GetLimiter(ip string, authenticated bool) *rate.Limiter {
	s.mu.Lock()
	defer s.mu.Unlock()

	var limiters map[string]*limiterEntry
	var r rate.Limit
	var b int

	if authenticated {
		// 已认证，使用PostAuth限流器（宽松）
		limiters = s.postAuthLimiters
		r = s.postAuthRate
		b = s.postAuthBurst
	} else {
		// 未认证，使用PreAuth限流器（严格）
		limiters = s.preAuthLimiters
		r = s.preAuthRate
		b = s.preAuthBurst
	}

	entry, exists := limiters[ip]
	if !exists {
		entry = &limiterEntry{
			limiter:  rate.NewLimiter(r, b),
			lastSeen: time.Now(),
		}
		limiters[ip] = entry
	} else {
		entry.lastSeen = time.Now()
	}

	return entry.limiter
}

// cleanup 定期清理不活跃的IP
func (s *SmartIPRateLimiter) cleanup(interval, maxAge time.Duration) {
	defer s.wg.Done() // 🔥 goroutine 退出时通知

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.mu.Lock()
			now := time.Now()
			cleaned := 0

			// 清理PreAuth限流器
			for ip, entry := range s.preAuthLimiters {
				if now.Sub(entry.lastSeen) > maxAge {
					delete(s.preAuthLimiters, ip)
					cleaned++
				}
			}

			// 清理PostAuth限流器
			for ip, entry := range s.postAuthLimiters {
				if now.Sub(entry.lastSeen) > maxAge {
					delete(s.postAuthLimiters, ip)
					cleaned++
				}
			}

			// 清理已认证IP列表
			for ip, lastAuth := range s.authenticatedIPs {
				if now.Sub(lastAuth) > maxAge {
					delete(s.authenticatedIPs, ip)
					cleaned++
				}
			}

			s.mu.Unlock()

			if cleaned > 0 {
				utils.Debug("智能IP限流器清理完成",
					zap.Int("cleaned_count", cleaned),
				)
			}

		case <-s.shutdown: // 🔥 监听关闭信号
			utils.Info("SmartIPRateLimiter 清理任务已停止")
			return
		}
	}
}

// GetStats 获取统计信息
func (s *SmartIPRateLimiter) GetStats() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return map[string]interface{}{
		"pre_auth_ips":      len(s.preAuthLimiters),
		"post_auth_ips":     len(s.postAuthLimiters),
		"authenticated_ips": len(s.authenticatedIPs),
		"pre_auth_config": map[string]interface{}{
			"rate":  float64(s.preAuthRate),
			"burst": s.preAuthBurst,
		},
		"post_auth_config": map[string]interface{}{
			"rate":  float64(s.postAuthRate),
			"burst": s.postAuthBurst,
		},
	}
}

// Close 关闭智能IP限流器，等待清理任务完成
func (s *SmartIPRateLimiter) Close() error {
	utils.Info("开始关闭 SmartIPRateLimiter")

	// 发送关闭信号
	close(s.shutdown)

	// 等待 goroutine 退出
	s.wg.Wait()

	utils.Info("SmartIPRateLimiter 已关闭")
	return nil
}

// ========================================
// 🔥 智能IP限流中间件
// ========================================

// SmartIPRateLimiterMiddleware 智能IP限流中间件
// 认证前使用严格限流，认证后切换到宽松限流
func SmartIPRateLimiterMiddleware(cfg *config.Config) gin.HandlerFunc {
	limiter := NewSmartIPRateLimiter(
		cfg.RateLimit.PreAuthIPRate,
		cfg.RateLimit.PreAuthIPBurst,
		cfg.RateLimit.PostAuthIPRate,
		cfg.RateLimit.PostAuthIPBurst,
	)

	utils.Info("智能IP限流器已启动",
		zap.Int("pre_auth_rate", cfg.RateLimit.PreAuthIPRate),
		zap.Int("pre_auth_burst", cfg.RateLimit.PreAuthIPBurst),
		zap.Int("post_auth_rate", cfg.RateLimit.PostAuthIPRate),
		zap.Int("post_auth_burst", cfg.RateLimit.PostAuthIPBurst),
	)

	return func(c *gin.Context) {
		ip := getRealIP(c)

		// 检查IP是否已认证过
		authenticated := limiter.IsAuthenticated(ip)

		// 获取对应的限流器
		ipLimiter := limiter.GetLimiter(ip, authenticated)

		// 检查限流
		if !ipLimiter.Allow() {
			limitType := "认证前"
			limitRate := cfg.RateLimit.PreAuthIPRate
			limitBurst := cfg.RateLimit.PreAuthIPBurst

			if authenticated {
				limitType = "认证后"
				limitRate = cfg.RateLimit.PostAuthIPRate
				limitBurst = cfg.RateLimit.PostAuthIPBurst
			}

			utils.Warn("智能IP限流拒绝",
				zap.String("ip", ip),
				zap.String("limit_type", limitType),
				zap.Bool("authenticated", authenticated),
			)

			utils.RespondError(c, http.StatusTooManyRequests,
				utils.ErrorTypeIPRateLimit,
				"IP 请求频率超限，请稍后再试（"+limitType+"限制）",
				map[string]interface{}{
					"limit": map[string]interface{}{
						"rate":  limitRate,
						"burst": limitBurst,
						"type":  limitType,
					},
				})
			c.Abort()
			return
		}

		// 保存限流器引用，供认证中间件使用
		c.Set("smartIPLimiter", limiter)
		c.Set("clientIP", ip)

		c.Next()
	}
}

// SmartIPRateLimiterHandlerWithInstance 使用已有实例的智能IP限流中间件
// 用于在 router 中复用限流器实例
func SmartIPRateLimiterHandlerWithInstance(limiter *SmartIPRateLimiter, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := getRealIP(c)

		// 检查IP是否已认证过
		authenticated := limiter.IsAuthenticated(ip)

		// 获取对应的限流器
		ipLimiter := limiter.GetLimiter(ip, authenticated)

		// 检查限流
		if !ipLimiter.Allow() {
			limitType := "认证前"
			limitRate := cfg.RateLimit.PreAuthIPRate
			limitBurst := cfg.RateLimit.PreAuthIPBurst

			if authenticated {
				limitType = "认证后"
				limitRate = cfg.RateLimit.PostAuthIPRate
				limitBurst = cfg.RateLimit.PostAuthIPBurst
			}

			utils.Warn("智能IP限流拒绝",
				zap.String("ip", ip),
				zap.String("limit_type", limitType),
				zap.Bool("authenticated", authenticated),
			)

			utils.RespondError(c, http.StatusTooManyRequests,
				utils.ErrorTypeIPRateLimit,
				"IP 请求频率超限，请稍后再试（"+limitType+"限制）",
				map[string]interface{}{
					"limit": map[string]interface{}{
						"rate":  limitRate,
						"burst": limitBurst,
						"type":  limitType,
					},
				})
			c.Abort()
			return
		}

		// 保存限流器引用，供认证中间件使用
		c.Set("smartIPLimiter", limiter)
		c.Set("clientIP", ip)

		c.Next()
	}
}

// MarkIPAuthenticated 标记IP认证成功（在Token认证中间件中调用）
func MarkIPAuthenticated(c *gin.Context) {
	limiterValue, exists := c.Get("smartIPLimiter")
	if !exists {
		return
	}

	limiter, ok := limiterValue.(*SmartIPRateLimiter)
	if !ok {
		return
	}

	ipValue, exists := c.Get("clientIP")
	if !exists {
		return
	}

	ip, ok := ipValue.(string)
	if !ok {
		return
	}

	// 标记IP已认证
	limiter.MarkAuthenticated(ip)
}

// 注意：getRealIP 函数在 ip_rate_limiter.go 中定义，两个文件共享使用
