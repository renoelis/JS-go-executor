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
	rate   int // tokens per second
	burst  int // max bucket size
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
		// 基于令牌桶的分布式限流，支持平滑速率和突发
		script: redis.NewScript(`
local key = KEYS[1]
local rate = tonumber(ARGV[1])      -- tokens per second
local burst = tonumber(ARGV[2])     -- bucket capacity
local now = redis.call('TIME')
local now_ms = now[1] * 1000 + math.floor(now[2] / 1000)

-- 读取现有桶
local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])

if tokens == nil or ts == nil then
  tokens = burst
  ts = now_ms
else
  if now_ms > ts then
    local delta = now_ms - ts
    local refill = delta * rate / 1000.0
    tokens = math.min(burst, tokens + refill)
    ts = now_ms
  end
end

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'ts', ts)
-- TTL 设为满桶时间，防止冷门key长时间存在
local ttl_ms = math.max(1000, math.floor((burst / rate) * 1000))
redis.call('PEXPIRE', key, ttl_ms)

return {allowed, tokens}
`),
	}
}

// Allow 判断是否允许通过
func (l *ScriptExecIPRateLimiter) Allow(ctx context.Context, ip string) bool {
	if l == nil || l.redis == nil {
		return true
	}
	key := fmt.Sprintf("%sscript_exec_ip:%s", l.prefix, ip)
	// 令牌桶限流：rate 为持续速率，burst 为桶容量
	res, err := l.script.Run(ctx, l.redis, []string{key}, l.rate, l.burst).Slice()
	if err != nil {
		utils.Warn("脚本执行IP限流降级", zap.Error(err))
		return true
	}
	if len(res) == 0 {
		return true
	}
	allowed, ok := res[0].(int64)
	if !ok {
		// Lua整数默认是 int64，兜底兼容 float64
		if f, fok := res[0].(float64); fok {
			allowed = int64(f)
		} else {
			return true
		}
	}
	return allowed == 1
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
