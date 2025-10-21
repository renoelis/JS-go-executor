package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"flow-codeblock-go/model"
	"flow-codeblock-go/repository"
	"flow-codeblock-go/utils"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// QuotaService 配额管理服务
type QuotaService struct {
	redis       *redis.Client
	repo        *repository.TokenRepository
	syncChan    chan QuotaSyncTask    // 配额同步队列
	logChan     chan *model.QuotaLog  // 审计日志队列
	stopChan    chan struct{}         // 停止信号
	wg          sync.WaitGroup        // 等待协程结束
	syncBatch   int                   // 同步批次大小
	syncInterval time.Duration        // 同步间隔
	// 🔥 修复问题10：添加计数器统计丢弃的任务
	droppedSyncCount int64            // 丢弃的同步任务数
	droppedLogCount  int64            // 丢弃的日志任务数
	lastAlertTime    time.Time        // 最后告警时间
	alertMutex       sync.Mutex       // 告警锁
	// 🔥 优化1.6：预编译Lua脚本，提高性能
	consumeScript *redis.Script       // 配额消耗Lua脚本
}

// QuotaSyncTask 配额同步任务
type QuotaSyncTask struct {
	Token     string
	Remaining int
	Timestamp time.Time
}

// NewQuotaService 创建配额服务
func NewQuotaService(
	redisClient *redis.Client,
	repo *repository.TokenRepository,
	syncQueueSize int,
	logQueueSize int,
	syncBatch int,
	syncInterval time.Duration,
) *QuotaService {
	qs := &QuotaService{
		redis:        redisClient,
		repo:         repo,
		syncChan:     make(chan QuotaSyncTask, syncQueueSize),
		logChan:      make(chan *model.QuotaLog, logQueueSize),
		stopChan:     make(chan struct{}),
		syncBatch:    syncBatch,
		syncInterval: syncInterval,
		// 🔥 优化1.6：预编译Lua脚本
		consumeScript: redis.NewScript(`
			local current = redis.call('GET', KEYS[1])
			if current == false then
				return -2
			end
			current = tonumber(current)
			if current <= 0 then
				return -1
			end
			local new_value = redis.call('DECR', KEYS[1])
			return new_value
		`),
	}

	// 启动后台协程
	qs.wg.Add(2)
	go qs.startSyncWorker()
	go qs.startLogWorker()

	utils.Info("QuotaService 启动成功",
		zap.Int("sync_queue_size", syncQueueSize),
		zap.Int("log_queue_size", logQueueSize),
		zap.Int("sync_batch", syncBatch),
		zap.Duration("sync_interval", syncInterval))

	return qs
}

// Stop 停止服务
func (s *QuotaService) Stop() {
	close(s.stopChan)
	s.wg.Wait()
	utils.Info("QuotaService 已停止")
}

// ========== Redis Key 管理 ==========

// getRedisKey 获取Redis配额Key
func (s *QuotaService) getRedisKey(token string) string {
	return fmt.Sprintf("quota:%s", token)
}

// ========== 配额初始化 ==========

// InitQuota 初始化Redis配额（Token创建时调用）
func (s *QuotaService) InitQuota(ctx context.Context, tokenInfo *model.TokenInfo) error {
	if !tokenInfo.NeedsQuotaCheck() {
		return nil // time模式跳过
	}

	key := s.getRedisKey(tokenInfo.AccessToken)

	// 🔥 修复中等问题：校验RemainingQuota，防止panic
	if tokenInfo.RemainingQuota == nil {
		// 如果RemainingQuota为nil，使用TotalQuota作为初始值
		if tokenInfo.TotalQuota == nil {
			return fmt.Errorf("Token配额信息不完整: RemainingQuota和TotalQuota均为nil")
		}
		tokenInfo.RemainingQuota = tokenInfo.TotalQuota
		utils.Warn("RemainingQuota为nil，使用TotalQuota初始化",
			zap.String("token", utils.MaskToken(tokenInfo.AccessToken)),
			zap.Int("total_quota", *tokenInfo.TotalQuota))
	}

	// 🔥 使用 RemainingQuota 初始化Redis（而不是TotalQuota）
	initialQuota := *tokenInfo.RemainingQuota
	
	// 🔥 设置合理的TTL避免内存泄漏（修复问题3）
	ttl := s.calculateTTL(tokenInfo)
	err := s.redis.Set(ctx, key, initialQuota, ttl).Err()
	if err != nil {
		utils.Error("初始化Redis配额失败", zap.Error(err))
		return err
	}

	totalQuota := 0
	if tokenInfo.TotalQuota != nil {
		totalQuota = *tokenInfo.TotalQuota
	}
	utils.Info("Redis配额初始化成功",
		zap.String("token", utils.MaskToken(tokenInfo.AccessToken)),
		zap.Int("remaining_quota", initialQuota),
		zap.Int("total_quota", totalQuota))

	// 🔥 记录初始化日志
	s.logQuotaChange(tokenInfo.AccessToken, tokenInfo.WsID, tokenInfo.Email,
		0, initialQuota, "init", nil, nil, nil, nil)

	return nil
}

// ========== 配额消耗 ==========

// ConsumeQuota 消耗配额（执行代码时调用）
// 返回: (quotaBefore, quotaAfter, error)
func (s *QuotaService) ConsumeQuota(ctx context.Context, token string, wsID string, email string, requestID string, executionSuccess bool, errorType *string, errorMessage *string) (int, int, error) {
	return s.consumeQuotaWithDepth(ctx, token, wsID, email, requestID, executionSuccess, errorType, errorMessage, 0)
}

// consumeQuotaWithDepth 消耗配额（带递归深度限制）
func (s *QuotaService) consumeQuotaWithDepth(ctx context.Context, token string, wsID string, email string, requestID string, executionSuccess bool, errorType *string, errorMessage *string, depth int) (int, int, error) {
	// 🔥 防止递归深度过大导致栈溢出（修复问题5）
	if depth > MaxRecursionDepth {
		return 0, 0, fmt.Errorf("配额检查递归深度超限")
	}

	key := s.getRedisKey(token)

	// 🔥 使用预编译的Lua脚本保证原子性（优化1.6）
	// 脚本逻辑：检查配额是否充足，如果充足则扣减，否则返回-1
	// -2: Redis中不存在
	// -1: 配额不足
	// >=0: 扣减后的剩余配额
	result, err := s.consumeScript.Run(ctx, s.redis, []string{key}).Result()

	if err != nil {
		// Redis故障，降级到DB模式
		utils.Warn("Redis配额扣减失败，降级到DB", zap.Error(err))
		return s.consumeQuotaFromDB(ctx, token, wsID, email, requestID, executionSuccess, errorType, errorMessage)
	}

	remaining, ok := result.(int64)
	if !ok {
		utils.Error("Lua脚本返回值类型错误", zap.Any("result", result))
		return 0, 0, fmt.Errorf("配额检查失败")
	}

	// Redis中不存在（-2），从DB加载
	if remaining == -2 {
		utils.Debug("Redis配额不存在，从DB加载", zap.String("token", utils.MaskToken(token)))
		return s.loadQuotaFromDBAndConsume(ctx, token, wsID, email, requestID, executionSuccess, errorType, errorMessage, depth)
	}

	// 配额不足（-1）
	if remaining == -1 {
		utils.Warn("配额不足",
			zap.String("token", utils.MaskToken(token)),
			zap.Int64("remaining", remaining))
		return 0, 0, fmt.Errorf("配额不足")
	}
	
	// 其他负数（异常情况）
	if remaining < 0 {
		utils.Error("配额检查返回异常值",
			zap.String("token", utils.MaskToken(token)),
			zap.Int64("remaining", remaining))
		return 0, 0, fmt.Errorf("配额检查失败")
	}

	quotaBefore := int(remaining) + 1
	quotaAfter := int(remaining)

	utils.Debug("配额消耗成功",
		zap.String("token", utils.MaskToken(token)),
		zap.Int("before", quotaBefore),
		zap.Int("after", quotaAfter))

	// 🔥 提交异步同步任务（优化性能：先非阻塞尝试，失败后再创建timer）
	task := QuotaSyncTask{
		Token:     token,
		Remaining: quotaAfter,
		Timestamp: time.Now(),
	}
	
	// 🔥 修复中等问题：先尝试非阻塞写入，避免每次都创建time.After
	select {
	case s.syncChan <- task:
		// 快速路径：成功提交到队列
	default:
		// 队列满，创建timer进行阻塞等待
		timer := time.NewTimer(SyncQueueTimeout)
		defer timer.Stop() // 确保timer被释放
		
		select {
		case s.syncChan <- task:
			// 阻塞等待后成功提交
			timer.Stop()
		case <-timer.C:
			// 🔥 超时后降级到DB直接同步，避免数据丢失（修复严重问题1）
			utils.Warn("同步队列阻塞超时，降级到DB直接同步",
				zap.String("token", utils.MaskToken(token)),
				zap.Int("remaining", quotaAfter))
			
			// 异步执行DB同步，不阻塞主流程
			go s.syncToDBDirectly(task)
			s.handleDroppedSync() // 统计降级次数
		}
	}

	// 🔥 记录审计日志
	success := executionSuccess
	s.logQuotaChange(token, wsID, email, quotaBefore, quotaAfter, "consume", &requestID, &success, errorType, errorMessage)

	return quotaBefore, quotaAfter, nil
}

// ========== 配额查询 ==========

// GetRemainingQuota 查询剩余配额
func (s *QuotaService) GetRemainingQuota(ctx context.Context, token string) (int, error) {
	key := s.getRedisKey(token)

	// 先从Redis查询
	remaining, err := s.redis.Get(ctx, key).Int()
	if err == redis.Nil {
		// Redis不存在，从DB加载
		quota, err := s.repo.GetQuotaFromDB(ctx, token)
		if err != nil {
			return 0, err
		}
		if quota == nil {
			return 0, fmt.Errorf("该Token未设置配额")
		}
		
		// 🔥 修复严重问题：根据Token信息计算TTL，而不是固定7天
		tokenInfo, err := s.repo.GetByToken(ctx, token)
		if err == nil && tokenInfo != nil {
			ttl := s.calculateTTL(tokenInfo)
			s.redis.Set(ctx, key, *quota, ttl)
		} else {
			// 如果获取Token信息失败，使用默认7天（向后兼容）
			s.redis.Set(ctx, key, *quota, 7*24*time.Hour)
		}
		return *quota, nil
	}

	if err != nil {
		// Redis故障，从DB查询
		quota, err := s.repo.GetQuotaFromDB(ctx, token)
		if err != nil {
			return 0, err
		}
		if quota == nil {
			return 0, fmt.Errorf("该Token未设置配额")
		}
		return *quota, nil
	}

	return remaining, nil
}

// ========== 配额更新（增购/重置） ==========

// UpdateQuota 更新配额（用于增购/重置）
func (s *QuotaService) UpdateQuota(ctx context.Context, token string, operation string, amount *int) (*model.TokenInfo, error) {
	// 1. 更新数据库
	tokenInfo, err := s.repo.UpdateQuota(ctx, token, operation, amount)
	if err != nil {
		return nil, err
	}

	// 2. 更新Redis
	if tokenInfo.RemainingQuota != nil {
		key := s.getRedisKey(token)
		// 🔥 修复严重问题：使用calculateTTL计算TTL，而不是永久存活(TTL=0)
		ttl := s.calculateTTL(tokenInfo)
		err = s.redis.Set(ctx, key, *tokenInfo.RemainingQuota, ttl).Err()
		if err != nil {
			utils.Warn("更新Redis配额失败", zap.Error(err))
		}
	}

	// 3. 记录日志
	quotaChange := 0
	if tokenInfo.RemainingQuota != nil && tokenInfo.TotalQuota != nil {
		quotaChange = *tokenInfo.RemainingQuota
	}
	
	action := "recharge"
	if operation == "reset" {
		action = "init"
	}
	
	s.logQuotaChange(token, tokenInfo.WsID, tokenInfo.Email,
		0, quotaChange, action, nil, nil, nil, nil)

	utils.Info("配额更新成功",
		zap.String("token", utils.MaskToken(token)),
		zap.String("operation", operation),
		zap.Int("new_quota", quotaChange))

	return tokenInfo, nil
}

// ========== 私有方法 ==========

// calculateTTL 计算Redis Key的TTL（修复中等问题5：根据配额类型动态调整）
func (s *QuotaService) calculateTTL(tokenInfo *model.TokenInfo) time.Duration {
	// 1. 如果Token有过期时间，使用过期时间作TTL
	if tokenInfo.ExpiresAt != nil && !tokenInfo.ExpiresAt.Time.IsZero() {
		ttl := time.Until(tokenInfo.ExpiresAt.Time)
		if ttl > 0 {
			return ttl
		}
	}
	
	// 2. 根据配额类型动态调整TTL
	switch tokenInfo.QuotaType {
	case "count":
		// count类型：永久有效，设置较长TTL（30天）
		return 30 * 24 * time.Hour
	case "hybrid":
		// hybrid类型：时间+配额双重限制，使用过期时间（已在上面处理）
		// 如果没有过期时间，使用默认7天
		return 7 * 24 * time.Hour
	case "time":
		// time类型：仅时间限制，使用过期时间（已在上面处理）
		// 如果没有过期时间，使用默认7天
		return 7 * 24 * time.Hour
	default:
		// 未知类型，使用默认7天
		return 7 * 24 * time.Hour
	}
}

// loadQuotaFromDBAndConsume 从DB加载配额并消耗
func (s *QuotaService) loadQuotaFromDBAndConsume(ctx context.Context, token string, wsID string, email string, requestID string, executionSuccess bool, errorType *string, errorMessage *string, depth int) (int, int, error) {
	// 从DB获取配额
	quota, err := s.repo.GetQuotaFromDB(ctx, token)
	if err != nil {
		return 0, 0, err
	}

	if quota == nil || *quota <= 0 {
		return 0, 0, fmt.Errorf("配额不足")
	}

	// 🔥 从DB加载配额并设置到Redis（修复严重问题：使用calculateTTL计算TTL）
	key := s.getRedisKey(token)
	
	// 获取Token信息以计算正确的TTL
	tokenInfo, err := s.repo.GetByToken(ctx, token)
	if err == nil && tokenInfo != nil {
		ttl := s.calculateTTL(tokenInfo)
		err = s.redis.Set(ctx, key, *quota, ttl).Err()
	} else {
		// 如果获取Token信息失败，使用默认7天（向后兼容）
		err = s.redis.Set(ctx, key, *quota, 7*24*time.Hour).Err()
	}
	if err != nil {
		utils.Warn("加载配额到Redis失败", zap.Error(err))
	}

	// 🔥 再次调用消耗逻辑（传递depth+1，修复问题5）
	return s.consumeQuotaWithDepth(ctx, token, wsID, email, requestID, executionSuccess, errorType, errorMessage, depth+1)
}

// consumeQuotaFromDB 从DB扣减配额（降级方案）
func (s *QuotaService) consumeQuotaFromDB(ctx context.Context, token string, wsID string, email string, requestID string, executionSuccess bool, errorType *string, errorMessage *string) (int, int, error) {
	// 🔥 使用原子操作扣减配额（数据库级别的原子性保证）
	// UPDATE ... WHERE remaining_quota > 0 确保不会扣成负数
	quotaBefore, quotaAfter, err := s.repo.DecrementQuotaAtomic(ctx, token)
	if err != nil {
		return 0, 0, fmt.Errorf("DB原子扣减配额失败: %w", err)
	}

	// 记录日志
	success := executionSuccess
	s.logQuotaChange(token, wsID, email, quotaBefore, quotaAfter, "consume", &requestID, &success, errorType, errorMessage)

	return quotaBefore, quotaAfter, nil
}

// logQuotaChange 记录配额变更日志（异步）
func (s *QuotaService) logQuotaChange(token string, wsID string, email string, quotaBefore int, quotaAfter int, action string, requestID *string, executionSuccess *bool, errorType *string, errorMessage *string) {
	log := &model.QuotaLog{
		Token:                token,
		WsID:                 wsID,
		Email:                email,
		QuotaBefore:          quotaBefore,
		QuotaAfter:           quotaAfter,
		QuotaChange:          quotaAfter - quotaBefore,
		Action:               action,
		RequestID:            requestID,
		ExecutionSuccess:     executionSuccess,
		ExecutionErrorType:   errorType,
		ExecutionErrorMessage: errorMessage,
	}

	// 非阻塞提交
	select {
	case s.logChan <- log:
	default:
		// 🔥 队列满时统计并告警（修复问题10）
		s.handleDroppedLog()
	}
}

// handleDroppedLog 处理日志队列满时的统计和告警
func (s *QuotaService) handleDroppedLog() {
	// 🔥 使用原子操作增加计数器
	count := atomic.AddInt64(&s.droppedLogCount, 1)
	
	utils.Warn("审计日志队列已满，丢弃日志",
		zap.Int64("dropped_count", count))
	
	// 🔥 达到阈值时发送告警（每 AlertThreshold 个丢弃任务告警一次）
	if count%AlertThreshold == 0 {
		s.alertIfNeeded("审计日志队列持续拥堵", count)
	}
}

// handleDroppedSync 处理配额同步队列满时的统计和告警
func (s *QuotaService) handleDroppedSync() {
	// 🔥 使用原子操作增加计数器
	count := atomic.AddInt64(&s.droppedSyncCount, 1)
	
	utils.Warn("配额同步队列已满，丢弃任务",
		zap.Int64("dropped_count", count))
	
	// 🔥 达到阈值时发送告警（每 AlertThreshold 个丢弃任务告警一次）
	if count%AlertThreshold == 0 {
		s.alertIfNeeded("配额同步队列持续拥堵", count)
	}
}

// alertIfNeeded 按需发送告警（限流：至少间隔 AlertCooldownDuration）
func (s *QuotaService) alertIfNeeded(message string, count int64) {
	s.alertMutex.Lock()
	defer s.alertMutex.Unlock()
	
	// 限流：至少间隔 AlertCooldownDuration
	if time.Since(s.lastAlertTime) < AlertCooldownDuration {
		return
	}
	
	s.lastAlertTime = time.Now()
	utils.Error(message,
		zap.Int64("dropped_count", count),
		zap.String("action", "请检查系统负载并考虑增加队列大小"))
}

// syncToDBDirectly 直接同步配额到DB（队列超时时的降级方案）
func (s *QuotaService) syncToDBDirectly(task QuotaSyncTask) {
	// 🔥 使用单个token的batch调用已有的同步逻辑
	batch := map[string]int{
		task.Token: task.Remaining,
	}
	s.batchSyncToDB(batch)
}

// ========== 后台协程 ==========

// startSyncWorker 配额同步协程（批量写入DB）
func (s *QuotaService) startSyncWorker() {
	defer s.wg.Done()

	ticker := time.NewTicker(s.syncInterval)
	defer ticker.Stop()

	batch := make(map[string]int) // token -> remaining

	for {
		select {
		case task := <-s.syncChan:
			// 累积批次（同一个token只保留最新值）
			batch[task.Token] = task.Remaining

			// 达到批次大小，立即同步
			if len(batch) >= s.syncBatch {
				s.batchSyncToDB(batch)
				batch = make(map[string]int)
			}

		case <-ticker.C:
			// 定时同步
			if len(batch) > 0 {
				s.batchSyncToDB(batch)
				batch = make(map[string]int)
			}

		case <-s.stopChan:
			// 停止前同步剩余数据
			if len(batch) > 0 {
				s.batchSyncToDB(batch)
			}
			utils.Info("配额同步协程已停止")
			return
		}
	}
}

// batchSyncToDB 批量同步到DB
func (s *QuotaService) batchSyncToDB(batch map[string]int) {
	// 🔥 为批量操作添加超时控制（修复问题8）
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	successCount := 0

	for token, remaining := range batch {
		err := s.repo.SyncQuotaFromRedis(ctx, token, remaining)
		if err != nil {
			utils.Error("配额同步失败",
				zap.String("token", utils.MaskToken(token)),
				zap.Error(err))
		} else {
			successCount++
		}
	}

	utils.Debug("配额批量同步完成",
		zap.Int("total", len(batch)),
		zap.Int("success", successCount))
}

// startLogWorker 审计日志写入协程（批量写入DB）
func (s *QuotaService) startLogWorker() {
	defer s.wg.Done()

	ticker := time.NewTicker(s.syncInterval)
	defer ticker.Stop()

	batch := make([]*model.QuotaLog, 0, s.syncBatch)

	for {
		select {
		case log := <-s.logChan:
			batch = append(batch, log)

			// 达到批次大小，立即写入
			if len(batch) >= s.syncBatch {
				s.batchInsertLogs(batch)
				batch = make([]*model.QuotaLog, 0, s.syncBatch)
			}

		case <-ticker.C:
			// 定时写入
			if len(batch) > 0 {
				s.batchInsertLogs(batch)
				batch = make([]*model.QuotaLog, 0, s.syncBatch)
			}

		case <-s.stopChan:
			// 停止前写入剩余日志
			if len(batch) > 0 {
				s.batchInsertLogs(batch)
			}
			utils.Info("审计日志协程已停止")
			return
		}
	}
}

// batchInsertLogs 批量插入日志
func (s *QuotaService) batchInsertLogs(logs []*model.QuotaLog) {
	// 🔥 为批量操作添加超时控制（修复问题8）
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err := s.repo.BatchInsertQuotaLogs(ctx, logs)
	if err != nil {
		utils.Error("批量插入审计日志失败",
			zap.Int("count", len(logs)),
			zap.Error(err))
	} else {
		utils.Debug("审计日志批量写入完成", zap.Int("count", len(logs)))
	}
}

// ========== 统计信息 ==========

// GetStats 获取服务统计信息
func (s *QuotaService) GetStats() map[string]interface{} {
	return map[string]interface{}{
		"sync_queue_len":  len(s.syncChan),
		"sync_queue_cap":  cap(s.syncChan),
		"log_queue_len":   len(s.logChan),
		"log_queue_cap":   cap(s.logChan),
		"sync_interval":   s.syncInterval.String(),
		"sync_batch_size": s.syncBatch,
	}
}
