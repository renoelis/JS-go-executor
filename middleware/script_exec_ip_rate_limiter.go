package middleware

import (
	"context"
	"fmt"
	"net/http"

	"flow-codeblock-go/config"
	"flow-codeblock-go/utils"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// ScriptExecIPRateLimiter 无Token脚本执行IP限流（Redis分布式）
type ScriptExecIPRateLimiter struct {
	redis  *redis.Client
	rate   int
	burst  int
	prefix string

	script *redis.Script
}

// NewScriptExecIPRateLimiter 创建限流器
func NewScriptExecIPRateLimiter(redisClient *redis.Client, cfg *config.Config) *ScriptExecIPRateLimiter {
	rate := cfg.Script.ScriptExecIPRateLimit
	burst := cfg.Script.ScriptExecIPRateLimitBurst
	if rate <= 0 {
		rate = 200
	}
	if burst <= 0 {
		burst = rate * 2
	}

	return &ScriptExecIPRateLimiter{
		redis:  redisClient,
		rate:   rate,
		burst:  burst,
		prefix: cfg.Script.ScriptCachePrefix,
		script: redis.NewScript(`
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then
  redis.call('EXPIRE', key, ttl)
end
if current > limit then
  return 0
end
return 1
`),
	}
}

// Allow 判断是否允许通过
func (l *ScriptExecIPRateLimiter) Allow(ctx context.Context, ip string) bool {
	if l == nil || l.redis == nil {
		return true
	}
	key := fmt.Sprintf("%sscript_exec_ip:%s", l.prefix, ip)
	// 使用1秒窗口的突发限流
	res, err := l.script.Run(ctx, l.redis, []string{key}, 1, l.burst).Int()
	if err != nil {
		utils.Warn("脚本执行IP限流降级", zap.Error(err))
		return true
	}
	return res == 1
}

// ScriptExecIPRateLimiterMiddleware 创建Gin中间件
func ScriptExecIPRateLimiterMiddleware(limiter *ScriptExecIPRateLimiter, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if limiter == nil {
			c.Next()
			return
		}
		ip := GetRealIP(c)
		if ip == "" {
			ip = c.ClientIP()
		}
		if !limiter.Allow(c.Request.Context(), ip) {
			utils.RespondError(c, http.StatusTooManyRequests, utils.ErrorTypeIPRateLimit, fmt.Sprintf("请求过于频繁，请稍后再试（%d/s）", cfg.Script.ScriptExecIPRateLimit), nil)
			c.Abort()
			return
		}
		c.Next()
	}
}
