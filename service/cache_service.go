package service

import (
	"container/list"
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"flow-codeblock-go/model"
	"flow-codeblock-go/utils"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// CacheService 混合缓存服务（内存+Redis）
type CacheService struct {
	// 热缓存（内存）
	hotCache   map[string]*cacheItem
	hotMutex   sync.RWMutex
	hotMaxSize int
	hotTTL     time.Duration

	// LRU 链表（O(1) 淘汰）
	lruList *list.List               // 双向链表，头部是最新访问，尾部是最旧访问
	lruMap  map[string]*list.Element // key -> list element 映射

	// 温缓存（Redis）
	redis       *redis.Client
	redisPrefix string
	redisTTL    time.Duration

	// 统计信息
	stats cacheStats

	// 🔥 新增：优雅关闭支持
	shutdown chan struct{}
	wg       sync.WaitGroup
}

type cacheItem struct {
	Key       string           // 缓存键（用于 LRU 淘汰时识别）
	Data      *model.TokenInfo // Token 信息
	Timestamp time.Time        // 缓存时间（用于 TTL 检查）
}

type cacheStats struct {
	HotHits      int64
	WarmHits     int64
	Misses       int64
	HotEvictions int64
}

// NewCacheService 创建缓存服务
func NewCacheService(hotMaxSize int, hotTTL time.Duration, redisClient *redis.Client, redisTTL time.Duration) *CacheService {
	cs := &CacheService{
		hotCache:    make(map[string]*cacheItem),
		hotMaxSize:  hotMaxSize,
		hotTTL:      hotTTL,
		lruList:     list.New(),                     // 初始化 LRU 链表
		lruMap:      make(map[string]*list.Element), // 初始化 LRU 映射
		redis:       redisClient,
		redisPrefix: "token_cache:",
		redisTTL:    redisTTL,
		shutdown:    make(chan struct{}), // 🔥 初始化关闭信号
	}

	// 启动定期清理任务
	cs.wg.Add(1) // 🔥 注册 goroutine
	go cs.cleanupLoop()

	utils.Info("缓存服务初始化完成",
		zap.Int("hot_max_size", hotMaxSize),
		zap.Duration("hot_ttl", hotTTL),
		zap.Bool("redis_enabled", redisClient != nil),
		zap.Duration("redis_ttl", redisTTL),
		zap.String("lru_algorithm", "container/list (O(1))"),
	)

	return cs
}

// GetHot 从热缓存获取
func (cs *CacheService) GetHot(key string) (*model.TokenInfo, bool) {
	cs.hotMutex.RLock()
	item, exists := cs.hotCache[key]
	if !exists {
		cs.hotMutex.RUnlock()
		return nil, false
	}

	// 检查是否过期
	if time.Since(item.Timestamp) > cs.hotTTL {
		cs.hotMutex.RUnlock()
		return nil, false
	}

	data := item.Data
	cs.hotMutex.RUnlock()

	// 更新访问时间 - O(1) 操作：移动到链表头部
	cs.hotMutex.Lock()
	if elem, exists := cs.lruMap[key]; exists {
		cs.lruList.MoveToFront(elem) // O(1): 最近访问的移到最前面
	}
	cs.stats.HotHits++
	cs.hotMutex.Unlock()

	return data, true
}

// SetHot 设置热缓存
func (cs *CacheService) SetHot(key string, data *model.TokenInfo) {
	cs.hotMutex.Lock()
	defer cs.hotMutex.Unlock()

	now := time.Now()

	// 如果 key 已存在，更新数据并移到链表头部 - O(1)
	if elem, exists := cs.lruMap[key]; exists {
		cs.lruList.MoveToFront(elem) // O(1): 移到最前面
		item := elem.Value.(*cacheItem)
		item.Data = data
		item.Timestamp = now
		cs.hotCache[key] = item
		return
	}

	// LRU 淘汰 - O(1) 操作
	if len(cs.hotCache) >= cs.hotMaxSize {
		cs.evictLRU()
	}

	// 添加新元素 - O(1) 操作
	item := &cacheItem{
		Key:       key,
		Data:      data,
		Timestamp: now,
	}
	elem := cs.lruList.PushFront(item) // O(1): 添加到链表头部（最新访问）
	cs.lruMap[key] = elem              // O(1): 建立映射关系
	cs.hotCache[key] = item            // O(1): 添加到缓存
}

// GetWarm 从温缓存（Redis）获取
func (cs *CacheService) GetWarm(ctx context.Context, key string) (*model.TokenInfo, bool) {
	if cs.redis == nil {
		return nil, false
	}

	redisKey := cs.redisPrefix + key
	data, err := cs.redis.Get(ctx, redisKey).Result()
	if err != nil {
		if err != redis.Nil {
			utils.Debug("Redis获取失败", zap.Error(err), zap.String("key", utils.MaskToken(key)))
		}
		return nil, false
	}

	var tokenInfo model.TokenInfo
	if err := json.Unmarshal([]byte(data), &tokenInfo); err != nil {
		utils.Error("Redis数据反序列化失败", zap.Error(err))
		return nil, false
	}

	cs.stats.WarmHits++
	return &tokenInfo, true
}

// SetWarm 设置温缓存（Redis）
func (cs *CacheService) SetWarm(ctx context.Context, key string, data *model.TokenInfo) error {
	if cs.redis == nil {
		return nil
	}

	redisKey := cs.redisPrefix + key
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return cs.redis.Set(ctx, redisKey, jsonData, cs.redisTTL).Err()
}

// Delete 删除缓存（热+温）
// 使用传入的 Context 来控制 Redis 操作的生命周期
// 如果原 Context 已取消，会创建独立的 Context 确保缓存删除完成（避免脏数据）
func (cs *CacheService) Delete(ctx context.Context, key string) {
	// 删除热缓存 - O(1) 操作
	cs.hotMutex.Lock()
	if elem, exists := cs.lruMap[key]; exists {
		cs.lruList.Remove(elem) // O(1): 从链表移除
		delete(cs.lruMap, key)  // O(1): 从 LRU 映射移除
	}
	delete(cs.hotCache, key) // O(1): 从缓存移除
	cs.hotMutex.Unlock()

	// 删除温缓存（Redis）
	if cs.redis != nil {
		// 智能 Context 选择：
		// 1. 优先使用传入的 Context（遵循请求生命周期）
		// 2. 如果 Context 已取消，创建独立的 Context 确保删除完成
		//    原因：缓存删除是清理操作，即使请求已取消也应该完成，避免脏数据
		deleteCtx := ctx
		if ctx.Err() != nil {
			// Context 已取消/超时，使用独立的 Context
			deleteCtx = context.Background()
			utils.Debug("Context已取消，使用独立Context完成缓存删除",
				zap.String("key", utils.MaskToken(key)),
				zap.Error(ctx.Err()),
			)
		}

		// 设置 3s 超时（Redis.Del 通常 < 1ms）
		timeoutCtx, cancel := context.WithTimeout(deleteCtx, 3*time.Second)
		defer cancel()

		if err := cs.redis.Del(timeoutCtx, cs.redisPrefix+key).Err(); err != nil {
			utils.Debug("Redis缓存删除失败",
				zap.String("key", utils.MaskToken(key)),
				zap.Error(err),
			)
		}
	}
}

// evictLRU LRU淘汰 - O(1) 实现
// 从链表尾部移除最旧的元素（链表头部是最新访问的，尾部是最旧的）
func (cs *CacheService) evictLRU() {
	elem := cs.lruList.Back() // O(1): 获取链表尾部（最旧访问的元素）
	if elem == nil {
		return
	}

	item := elem.Value.(*cacheItem)
	cs.lruList.Remove(elem)       // O(1): 从链表移除
	delete(cs.lruMap, item.Key)   // O(1): 从 LRU 映射中移除
	delete(cs.hotCache, item.Key) // O(1): 从缓存中移除
	cs.stats.HotEvictions++

	utils.Debug("LRU淘汰",
		zap.String("key", utils.MaskToken(item.Key)),
		zap.Time("last_access", item.Timestamp),
	)
}

// cleanupLoop 定期清理过期数据
func (cs *CacheService) cleanupLoop() {
	defer cs.wg.Done() // 🔥 goroutine 退出时通知

	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			cs.cleanup()
		case <-cs.shutdown: // 🔥 监听关闭信号
			utils.Info("CacheService 清理任务已停止")
			return
		}
	}
}

func (cs *CacheService) cleanup() {
	cs.hotMutex.Lock()
	defer cs.hotMutex.Unlock()

	now := time.Now()
	cleanupCount := 0

	// 遍历链表清理过期数据
	// 从尾部开始遍历（最旧的数据），因为过期的数据大概率在尾部
	for elem := cs.lruList.Back(); elem != nil; {
		item := elem.Value.(*cacheItem)
		prevElem := elem.Prev() // 保存前一个元素，因为 Remove 会改变链表

		if now.Sub(item.Timestamp) > cs.hotTTL {
			cs.lruList.Remove(elem)
			delete(cs.lruMap, item.Key)
			delete(cs.hotCache, item.Key)
			cleanupCount++
		}

		elem = prevElem
	}

	if cleanupCount > 0 {
		utils.Debug("缓存清理完成",
			zap.Int("cleaned", cleanupCount),
			zap.Int("remaining", len(cs.hotCache)),
		)
	}
}

// GetStats 获取缓存统计信息
func (cs *CacheService) GetStats() map[string]interface{} {
	cs.hotMutex.RLock()
	hotSize := len(cs.hotCache)
	cs.hotMutex.RUnlock()

	totalRequests := cs.stats.HotHits + cs.stats.WarmHits + cs.stats.Misses
	hotHitRate := 0.0
	totalHitRate := 0.0

	if totalRequests > 0 {
		hotHitRate = float64(cs.stats.HotHits) / float64(totalRequests) * 100
		totalHitRate = float64(cs.stats.HotHits+cs.stats.WarmHits) / float64(totalRequests) * 100
	}

	return map[string]interface{}{
		"hot_cache": map[string]interface{}{
			"size":                hotSize,
			"max_size":            cs.hotMaxSize,
			"utilization_percent": int(float64(hotSize) / float64(cs.hotMaxSize) * 100),
		},
		"redis_enabled": cs.redis != nil,
		"performance": map[string]interface{}{
			"hot_hits":       cs.stats.HotHits,
			"warm_hits":      cs.stats.WarmHits,
			"misses":         cs.stats.Misses,
			"hot_evictions":  cs.stats.HotEvictions,
			"total_requests": totalRequests,
			"hot_hit_rate":   hotHitRate,
			"total_hit_rate": totalHitRate,
		},
	}
}

// ClearAll 清空所有缓存
func (cs *CacheService) ClearAll(ctx context.Context) error {
	// 清空热缓存
	cs.hotMutex.Lock()
	cs.hotCache = make(map[string]*cacheItem)
	cs.lruList = list.New()                    // 重新初始化链表
	cs.lruMap = make(map[string]*list.Element) // 重新初始化映射
	cs.hotMutex.Unlock()

	// 清空Redis缓存
	if cs.redis != nil {
		keys, err := cs.redis.Keys(ctx, cs.redisPrefix+"*").Result()
		if err != nil {
			return err
		}
		if len(keys) > 0 {
			return cs.redis.Del(ctx, keys...).Err()
		}
	}

	utils.Info("缓存已清空")
	return nil
}

// PingRedis 检查Redis连接
func (cs *CacheService) PingRedis(ctx context.Context) error {
	if cs.redis == nil {
		return fmt.Errorf("Redis未启用")
	}
	return cs.redis.Ping(ctx).Err()
}

// Close 关闭缓存服务，释放所有资源
func (cs *CacheService) Close() error {
	utils.Info("开始关闭 CacheService")

	// 发送关闭信号
	close(cs.shutdown)

	// 等待清理 goroutine 退出
	cs.wg.Wait()

	utils.Info("CacheService 已关闭")
	return nil
}
