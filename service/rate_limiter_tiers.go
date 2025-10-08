package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"flow-codeblock-go/utils"

	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// ==================== 热数据层（内存） ====================

// HotDataTier 热数据层 - 内存存储（最近5分钟活跃Token）
type HotDataTier struct {
	data        map[string][]int64   // tokenKey -> requestTimestamps[]
	accessOrder map[string]time.Time // tokenKey -> lastAccessTime (LRU)
	maxTokens   int
	mutex       sync.RWMutex
}

// NewHotDataTier 创建热数据层
func NewHotDataTier(maxTokens int) *HotDataTier {
	return &HotDataTier{
		data:        make(map[string][]int64),
		accessOrder: make(map[string]time.Time),
		maxTokens:   maxTokens,
	}
}

// Get 获取请求历史
func (h *HotDataTier) Get(tokenKey string) ([]int64, bool) {
	h.mutex.RLock()
	data, exists := h.data[tokenKey]
	if !exists {
		h.mutex.RUnlock()
		return nil, false
	}
	h.mutex.RUnlock()

	// 更新访问时间（需要写锁）
	h.mutex.Lock()
	h.accessOrder[tokenKey] = time.Now()
	h.mutex.Unlock()

	return data, true
}

// Set 设置请求历史
func (h *HotDataTier) Set(tokenKey string, requests []int64) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// LRU淘汰策略
	if len(h.data) >= h.maxTokens && h.data[tokenKey] == nil {
		h.evictLRU()
	}

	h.data[tokenKey] = requests
	h.accessOrder[tokenKey] = time.Now()
}

// Delete 删除Token数据
func (h *HotDataTier) Delete(tokenKey string) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	delete(h.data, tokenKey)
	delete(h.accessOrder, tokenKey)
}

// Cleanup 清理过期数据
func (h *HotDataTier) Cleanup(cleanupAge time.Duration) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	now := time.Now()
	cleanupThreshold := now.Add(-cleanupAge)

	for tokenKey, lastAccess := range h.accessOrder {
		if lastAccess.Before(cleanupThreshold) {
			delete(h.data, tokenKey)
			delete(h.accessOrder, tokenKey)
		}
	}
}

// evictLRU LRU淘汰
func (h *HotDataTier) evictLRU() {
	var oldestToken string
	var oldestTime time.Time

	for tokenKey, lastAccess := range h.accessOrder {
		if oldestToken == "" || lastAccess.Before(oldestTime) {
			oldestToken = tokenKey
			oldestTime = lastAccess
		}
	}

	if oldestToken != "" {
		delete(h.data, oldestToken)
		delete(h.accessOrder, oldestToken)
		utils.Debug("热数据层LRU淘汰", zap.String("token_key", oldestToken[:min(15, len(oldestToken))]+"***"))
	}
}

// GetStats 获取统计信息
func (h *HotDataTier) GetStats() map[string]interface{} {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	return map[string]interface{}{
		"size":                len(h.data),
		"max_size":            h.maxTokens,
		"utilization_percent": int(float64(len(h.data)) / float64(h.maxTokens) * 100),
	}
}

// ==================== 温数据层（Redis） ====================

// WarmDataTier 温数据层 - Redis存储（最近1小时活跃Token）
type WarmDataTier struct {
	redis      *redis.Client
	enabled    bool
	keyPrefix  string
	ttl        time.Duration
	errorCount int
	maxErrors  int
	mutex      sync.RWMutex
}

// NewWarmDataTier 创建温数据层
func NewWarmDataTier(redisClient *redis.Client, ttl time.Duration) *WarmDataTier {
	return &WarmDataTier{
		redis:      redisClient,
		enabled:    redisClient != nil,
		keyPrefix:  "rate_limit:",
		ttl:        ttl,
		maxErrors:  5,
		errorCount: 0,
	}
}

// Get 获取请求历史
func (w *WarmDataTier) Get(ctx context.Context, tokenKey string) ([]int64, bool) {
	if !w.isAvailable() {
		return nil, false
	}

	key := w.keyPrefix + tokenKey
	data, err := w.redis.Get(ctx, key).Result()
	if err != nil {
		if err != redis.Nil {
			w.handleError(err, "读取")
		}
		return nil, false
	}

	var requests []int64
	if err := json.Unmarshal([]byte(data), &requests); err != nil {
		utils.Error("温数据层数据反序列化失败", zap.Error(err))
		return nil, false
	}

	// 成功操作，重置错误计数
	w.resetErrorCount()
	return requests, true
}

// Set 设置请求历史
func (w *WarmDataTier) Set(ctx context.Context, tokenKey string, requests []int64) error {
	if !w.isAvailable() {
		return nil
	}

	key := w.keyPrefix + tokenKey
	jsonData, err := json.Marshal(requests)
	if err != nil {
		return err
	}

	if err := w.redis.Set(ctx, key, jsonData, w.ttl).Err(); err != nil {
		w.handleError(err, "写入")
		return err
	}

	// 成功操作，重置错误计数
	w.resetErrorCount()
	return nil
}

// Delete 删除Token数据
func (w *WarmDataTier) Delete(ctx context.Context, tokenKey string) error {
	if !w.isAvailable() {
		return nil
	}

	key := w.keyPrefix + tokenKey
	return w.redis.Del(ctx, key).Err()
}

// isAvailable 检查Redis是否可用
func (w *WarmDataTier) isAvailable() bool {
	w.mutex.RLock()
	defer w.mutex.RUnlock()
	return w.enabled && w.redis != nil
}

// handleError 处理Redis错误
func (w *WarmDataTier) handleError(err error, operation string) {
	w.mutex.Lock()
	defer w.mutex.Unlock()

	utils.Error("温数据层"+operation+"失败", zap.Error(err))
	w.errorCount++

	// 连续错误达到阈值，临时禁用Redis
	if w.errorCount >= w.maxErrors {
		w.enabled = false
		utils.Warn("温数据层连续错误，已临时禁用", zap.Int("error_count", w.errorCount))
	}
}

// resetErrorCount 重置错误计数
func (w *WarmDataTier) resetErrorCount() {
	w.mutex.Lock()
	defer w.mutex.Unlock()

	if w.errorCount > 0 {
		w.errorCount = 0
	}
}

// GetStats 获取统计信息
func (w *WarmDataTier) GetStats(ctx context.Context) map[string]interface{} {
	if !w.isAvailable() {
		return map[string]interface{}{
			"enabled": false,
		}
	}

	keys, err := w.redis.Keys(ctx, w.keyPrefix+"*").Result()
	if err != nil {
		return map[string]interface{}{
			"enabled": true,
			"error":   err.Error(),
		}
	}

	return map[string]interface{}{
		"enabled": true,
		"size":    len(keys),
		"ttl":     int(w.ttl.Seconds()),
	}
}

// ==================== 冷数据层（MySQL） ====================

// ColdDataTier 冷数据层 - 数据库存储（历史数据）
type ColdDataTier struct {
	db          *sqlx.DB
	tableName   string
	batchBuffer map[string]*batchItem
	batchSize   int
	mutex       sync.RWMutex

	// 🔥 新增：优雅关闭支持
	shutdown chan struct{}
	wg       sync.WaitGroup
}

type batchItem struct {
	TokenKey       string
	RequestCount   int
	TimeWindow     int
	RecordDate     string
	RecordHour     int
	FirstRequestAt int64
	LastRequestAt  int64
}

// NewColdDataTier 创建冷数据层
func NewColdDataTier(db *sqlx.DB, batchSize int) *ColdDataTier {
	tier := &ColdDataTier{
		db:          db,
		tableName:   "token_rate_limit_history",
		batchBuffer: make(map[string]*batchItem),
		batchSize:   batchSize,
		shutdown:    make(chan struct{}), // 🔥 初始化关闭信号
	}

	// 启动批量写入定时器
	tier.wg.Add(1) // 🔥 注册 goroutine
	go tier.startBatchTimer()

	return tier
}

// Set 设置请求历史（批量写入）
func (c *ColdDataTier) Set(ctx context.Context, tokenKey string, requests []int64) error {
	if len(requests) == 0 {
		return nil
	}

	// 按小时聚合数据
	hourlyData := c.aggregateByHour(requests)

	c.mutex.Lock()
	defer c.mutex.Unlock()

	for hourKey, data := range hourlyData {
		bufferKey := fmt.Sprintf("%s_%s", tokenKey, hourKey)

		if existing, exists := c.batchBuffer[bufferKey]; exists {
			// 合并现有数据
			existing.RequestCount += data.RequestCount
			if data.LastRequestAt > existing.LastRequestAt {
				existing.LastRequestAt = data.LastRequestAt
			}
			if data.FirstRequestAt < existing.FirstRequestAt {
				existing.FirstRequestAt = data.FirstRequestAt
			}
		} else {
			data.TokenKey = tokenKey
			c.batchBuffer[bufferKey] = data
		}
	}

	// 如果缓冲区满了，触发批量写入
	if len(c.batchBuffer) >= c.batchSize {
		// 🔥 使用 WaitGroup 追踪临时 goroutine，确保优雅关闭时等待完成
		c.wg.Add(1)
		go func() {
			defer c.wg.Done()
			c.flushBatch()
		}()
	}

	return nil
}

// aggregateByHour 按小时聚合数据
func (c *ColdDataTier) aggregateByHour(requests []int64) map[string]*batchItem {
	hourlyData := make(map[string]*batchItem)

	for _, timestamp := range requests {
		t := time.UnixMilli(timestamp)
		dateStr := t.Format("2006-01-02")
		hour := t.Hour()
		hourKey := fmt.Sprintf("%s_%d", dateStr, hour)

		if item, exists := hourlyData[hourKey]; exists {
			item.RequestCount++
			if timestamp > item.LastRequestAt {
				item.LastRequestAt = timestamp
			}
			if timestamp < item.FirstRequestAt {
				item.FirstRequestAt = timestamp
			}
		} else {
			hourlyData[hourKey] = &batchItem{
				RecordDate:     dateStr,
				RecordHour:     hour,
				RequestCount:   1,
				TimeWindow:     3600,
				FirstRequestAt: timestamp,
				LastRequestAt:  timestamp,
			}
		}
	}

	return hourlyData
}

// flushBatch 批量写入数据库
func (c *ColdDataTier) flushBatch() {
	c.mutex.Lock()
	if len(c.batchBuffer) == 0 {
		c.mutex.Unlock()
		return
	}

	// 复制缓冲区数据
	items := make([]*batchItem, 0, len(c.batchBuffer))
	for _, item := range c.batchBuffer {
		items = append(items, item)
	}
	c.batchBuffer = make(map[string]*batchItem)
	c.mutex.Unlock()

	// 批量插入
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	for _, item := range items {
		query := `
			INSERT INTO ` + c.tableName + ` (
				token_key, request_count, time_window, record_date, record_hour,
				first_request_at, last_request_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				request_count = request_count + VALUES(request_count),
				last_request_at = GREATEST(last_request_at, VALUES(last_request_at)),
				first_request_at = LEAST(first_request_at, VALUES(first_request_at))
		`

		_, err := c.db.ExecContext(ctx, query,
			item.TokenKey,
			item.RequestCount,
			item.TimeWindow,
			item.RecordDate,
			item.RecordHour,
			time.UnixMilli(item.FirstRequestAt),
			time.UnixMilli(item.LastRequestAt),
		)
		if err != nil {
			utils.Error("冷数据层批量写入失败", zap.Error(err))
		}
	}

	utils.Debug("冷数据层批量写入完成", zap.Int("count", len(items)))
}

// startBatchTimer 启动批量写入定时器
func (c *ColdDataTier) startBatchTimer() {
	defer c.wg.Done() // 🔥 goroutine 退出时通知

	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.flushBatch()
		case <-c.shutdown: // 🔥 监听关闭信号
			// 🔥 关闭前最后一次刷新，避免数据丢失
			utils.Info("ColdDataTier 正在关闭，执行最后一次批量刷新")
			c.flushBatch()
			utils.Info("ColdDataTier 批量写入定时器已停止")
			return
		}
	}
}

// GetStats 获取统计信息
func (c *ColdDataTier) GetStats() map[string]interface{} {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	return map[string]interface{}{
		"enabled":           true,
		"batch_buffer_size": len(c.batchBuffer),
		"batch_size":        c.batchSize,
		"table_name":        c.tableName,
	}
}

// Close 关闭冷数据层，等待所有批量写入完成
func (c *ColdDataTier) Close() error {
	utils.Info("开始关闭 ColdDataTier")

	// 发送关闭信号
	close(c.shutdown)

	// 等待 goroutine 退出
	c.wg.Wait()

	utils.Info("ColdDataTier 已关闭")
	return nil
}
