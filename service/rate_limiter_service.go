package service

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"flow-codeblock-go/model"
	"flow-codeblock-go/utils"

	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// RateLimiterService 限流业务逻辑服务
type RateLimiterService struct {
	hotTier          *HotDataTier
	warmTier         *WarmDataTier
	coldTier         *ColdDataTier
	writePool        *CacheWritePool // 🔥 新增：异步缓存写入池
	writePoolTimeout time.Duration   // 🔥 写入池提交超时

	// 统计信息
	hotHits  int64
	warmHits int64
	coldHits int64
	misses   int64
}

// NewRateLimiterService 创建限流服务
func NewRateLimiterService(
	hotMaxSize int,
	redisClient *redis.Client,
	redisTTL time.Duration,
	db *sqlx.DB,
	batchSize int,
	writePool *CacheWritePool,
	writePoolTimeout time.Duration,
) *RateLimiterService {
	service := &RateLimiterService{
		hotTier:          NewHotDataTier(hotMaxSize),
		warmTier:         NewWarmDataTier(redisClient, redisTTL),
		coldTier:         NewColdDataTier(db, batchSize),
		writePool:        writePool,
		writePoolTimeout: writePoolTimeout,
	}

	// 启动定期清理任务
	go service.startCleanupTasks()

	utils.Info("限流服务初始化完成",
		zap.Int("hot_max_size", hotMaxSize),
		zap.Bool("redis_enabled", redisClient != nil),
		zap.Int("batch_size", batchSize),
	)

	return service
}

// CheckLimit 检查限流
func (s *RateLimiterService) CheckLimit(
	ctx context.Context,
	token string,
	config model.RateLimitConfig,
) (bool, *model.RateLimitInfo, error) {
	// 如果不限制，直接通过
	if config.Unlimited {
		return true, &model.RateLimitInfo{
			Allowed:   true,
			Remaining: -1,
		}, nil
	}

	now := time.Now()
	limitKey := "code_exec_" + token

	// 1. 获取请求历史（三层查询）
	requests, err := s.getRequestHistory(ctx, limitKey)
	if err != nil {
		return false, nil, err
	}

	// 2. 清理过期记录
	window := time.Duration(config.WindowSeconds) * time.Second
	validRequests := filterValidRequests(requests, now, window)

	// 3. 检查突发限制（每秒）
	if config.Burst > 0 {
		recentRequests := filterValidRequests(validRequests, now, 1*time.Second)
		if len(recentRequests) >= config.Burst {
			return false, &model.RateLimitInfo{
				Allowed:    false,
				Remaining:  0,
				ResetTime:  now.Add(1 * time.Second),
				RetryAfter: 1,
				Message:    fmt.Sprintf("请求过于频繁，请稍后再试（每秒限制：%d次）", config.Burst),
				LimitType:  "burst",
			}, nil
		}
	}

	// 4. 检查窗口限制
	if len(validRequests) >= config.PerMinute {
		return false, &model.RateLimitInfo{
			Allowed:    false,
			Remaining:  0,
			ResetTime:  now.Add(window),
			RetryAfter: int(window.Seconds()),
			Message:    fmt.Sprintf("请求次数超限（限制：%d次/%d秒）", config.PerMinute, config.WindowSeconds),
			LimitType:  "window",
		}, nil
	}

	// 5. 记录当前请求
	validRequests = append(validRequests, now.UnixMilli())
	if err := s.updateRequestHistory(ctx, limitKey, validRequests); err != nil {
		return false, nil, err
	}

	// 6. 返回限流信息
	return true, &model.RateLimitInfo{
		Allowed:   true,
		Remaining: config.PerMinute - len(validRequests),
		ResetTime: now.Add(window),
		Message:   "",
	}, nil
}

// getRequestHistory 获取请求历史（三层查询）
func (s *RateLimiterService) getRequestHistory(ctx context.Context, key string) ([]int64, error) {
	// 1. 热数据层
	if data, found := s.hotTier.Get(key); found {
		atomic.AddInt64(&s.hotHits, 1)
		utils.Debug("热数据层命中", zap.String("key", key[:min(15, len(key))]+"***"))
		return data, nil
	}

	// 2. 温数据层
	if data, found := s.warmTier.Get(ctx, key); found {
		atomic.AddInt64(&s.warmHits, 1)
		// 提升到热数据层
		s.hotTier.Set(key, data)
		utils.Debug("温数据层命中", zap.String("key", key[:min(15, len(key))]+"***"))
		return data, nil
	}

	// 3. 未找到，创建新记录
	atomic.AddInt64(&s.misses, 1)
	utils.Debug("新Token创建", zap.String("key", key[:min(15, len(key))]+"***"))
	return []int64{}, nil
}

// updateRequestHistory 更新请求历史（三层更新）
func (s *RateLimiterService) updateRequestHistory(ctx context.Context, key string, requests []int64) error {
	// 热数据层（同步）
	s.hotTier.Set(key, requests)

	// 🔥 温数据层（使用写入池，零丢失）
	maskedKey := key
	if len(key) > 15 {
		maskedKey = key[:15] + "***"
	}

	warmTask := CacheWriteTask{
		TaskType: "rate_limit_warm",
		Key:      maskedKey,
		Execute: func(ctx context.Context) error {
			return s.warmTier.Set(ctx, key, requests)
		},
	}

	if err := s.writePool.Submit(warmTask, s.writePoolTimeout); err != nil {
		utils.Warn("提交温数据层写入任务失败",
			zap.String("key", maskedKey),
			zap.Error(err),
		)
	}

	// 🔥 冷数据层（使用写入池，零丢失）
	coldTask := CacheWriteTask{
		TaskType: "rate_limit_cold",
		Key:      maskedKey,
		Execute: func(ctx context.Context) error {
			return s.coldTier.Set(ctx, key, requests)
		},
	}

	if err := s.writePool.Submit(coldTask, s.writePoolTimeout); err != nil {
		utils.Warn("提交冷数据层写入任务失败",
			zap.String("key", maskedKey),
			zap.Error(err),
		)
	}

	return nil
}

// ClearTokenCache 清除指定Token的缓存
func (s *RateLimiterService) ClearTokenCache(ctx context.Context, token string) error {
	limitKey := "code_exec_" + token

	// 清除热缓存（内存操作，无需 Context）
	s.hotTier.Delete(limitKey)

	// 清除温缓存（Redis 操作，传递 Context）
	if err := s.warmTier.Delete(ctx, limitKey); err != nil {
		return err
	}

	utils.Info("Token限流缓存已清除", zap.String("token", utils.MaskToken(token)))
	return nil
}

// GetStats 获取限流统计信息
func (s *RateLimiterService) GetStats(ctx context.Context) *model.RateLimitStats {
	hotStats := s.hotTier.GetStats()
	warmStats := s.warmTier.GetStats(ctx)
	coldStats := s.coldTier.GetStats()

	hotHits := atomic.LoadInt64(&s.hotHits)
	warmHits := atomic.LoadInt64(&s.warmHits)
	coldHits := atomic.LoadInt64(&s.coldHits)
	misses := atomic.LoadInt64(&s.misses)

	totalRequests := hotHits + warmHits + coldHits + misses
	hotRate := 0.0
	warmRate := 0.0
	overall := 0.0

	if totalRequests > 0 {
		hotRate = float64(hotHits) / float64(totalRequests) * 100
		warmRate = float64(warmHits) / float64(totalRequests) * 100
		overall = float64(hotHits+warmHits) / float64(totalRequests) * 100
	}

	return &model.RateLimitStats{
		HotTier: model.HotTierStats{
			Size:               hotStats["size"].(int),
			MaxSize:            hotStats["max_size"].(int),
			UtilizationPercent: hotStats["utilization_percent"].(int),
		},
		WarmTier: model.WarmTierStats{
			Enabled: warmStats["enabled"].(bool),
			Size:    getIntOrZero(warmStats, "size"),
			TTL:     getIntOrZero(warmStats, "ttl"),
			Error:   getStringOrEmpty(warmStats, "error"),
		},
		ColdTier: model.ColdTierStats{
			Enabled:         coldStats["enabled"].(bool),
			BatchBufferSize: coldStats["batch_buffer_size"].(int),
			BatchSize:       coldStats["batch_size"].(int),
			TableName:       coldStats["table_name"].(string),
		},
		HitRate: model.HitRateStats{
			HotHits:  hotHits,
			WarmHits: warmHits,
			ColdHits: coldHits,
			Misses:   misses,
			HotRate:  hotRate,
			WarmRate: warmRate,
			Overall:  overall,
		},
	}
}

// startCleanupTasks 启动定期清理任务
func (s *RateLimiterService) startCleanupTasks() {
	// 每1分钟清理热数据层
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			s.hotTier.Cleanup(5 * time.Minute)
		}
	}()
}

// 辅助函数

func filterValidRequests(requests []int64, now time.Time, window time.Duration) []int64 {
	threshold := now.Add(-window).UnixMilli()
	valid := make([]int64, 0, len(requests))

	for _, timestamp := range requests {
		if timestamp > threshold {
			valid = append(valid, timestamp)
		}
	}

	return valid
}

func getIntOrZero(m map[string]interface{}, key string) int {
	if val, ok := m[key]; ok {
		if intVal, ok := val.(int); ok {
			return intVal
		}
	}
	return 0
}

func getStringOrEmpty(m map[string]interface{}, key string) string {
	if val, ok := m[key]; ok {
		if strVal, ok := val.(string); ok {
			return strVal
		}
	}
	return ""
}
