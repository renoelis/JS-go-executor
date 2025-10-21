package service

import (
	"context"
	"sync"
	"time"

	"flow-codeblock-go/repository"
	"flow-codeblock-go/utils"

	"go.uber.org/zap"
)

// QuotaCleanupService 配额日志清理服务
type QuotaCleanupService struct {
	repo              *repository.TokenRepository
	retentionDays     int           // 保留天数
	cleanupInterval   time.Duration // 清理间隔
	batchSize         int           // 每批删除数量
	stopChan          chan struct{}
	wg                sync.WaitGroup
	lastCleanupTime   time.Time
	lastCleanupCount  int
	totalCleanedCount int64
	mu                sync.RWMutex
}

// NewQuotaCleanupService 创建清理服务
func NewQuotaCleanupService(
	repo *repository.TokenRepository,
	retentionDays int,
	cleanupInterval time.Duration,
) *QuotaCleanupService {
	if retentionDays <= 0 {
		retentionDays = 180 // 默认保留6个月
	}
	if cleanupInterval <= 0 {
		cleanupInterval = 24 * time.Hour // 默认每天清理一次
	}

	service := &QuotaCleanupService{
		repo:            repo,
		retentionDays:   retentionDays,
		cleanupInterval: cleanupInterval,
		batchSize:       10000, // 每批删除1万条
		stopChan:        make(chan struct{}),
	}

	// 启动后台清理协程
	service.wg.Add(1)
	go service.startCleanupWorker()

	utils.Info("配额日志清理服务启动",
		zap.Int("retention_days", retentionDays),
		zap.Duration("cleanup_interval", cleanupInterval),
		zap.Int("batch_size", service.batchSize))

	return service
}

// Stop 停止清理服务
func (s *QuotaCleanupService) Stop() {
	close(s.stopChan)
	s.wg.Wait()
	utils.Info("配额日志清理服务已停止")
}

// startCleanupWorker 后台清理协程
func (s *QuotaCleanupService) startCleanupWorker() {
	defer s.wg.Done()

	// 首次启动时延迟1分钟执行（避免启动时立即清理）
	firstRunTimer := time.NewTimer(1 * time.Minute)
	defer firstRunTimer.Stop()

	ticker := time.NewTicker(s.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-firstRunTimer.C:
			// 首次执行
			s.performCleanup()
			firstRunTimer.Stop() // 停止首次定时器

		case <-ticker.C:
			// 定期执行
			s.performCleanup()

		case <-s.stopChan:
			utils.Info("清理协程收到停止信号")
			return
		}
	}
}

// performCleanup 执行清理
func (s *QuotaCleanupService) performCleanup() {
	ctx := context.Background()
	startTime := time.Now()

	utils.Info("开始清理配额日志",
		zap.Int("retention_days", s.retentionDays),
		zap.Int("batch_size", s.batchSize))

	// 1. 查询待删除记录数
	count, err := s.countOldLogs(ctx)
	if err != nil {
		utils.Error("查询待删除日志数量失败", zap.Error(err))
		return
	}

	if count == 0 {
		utils.Info("没有需要清理的日志")
		s.updateStats(0)
		return
	}

	utils.Info("发现待删除日志", zap.Int("count", count))

	// 2. 批量删除
	totalDeleted := 0
	for {
		deleted, err := s.deleteBatch(ctx)
		if err != nil {
			utils.Error("批量删除失败", zap.Error(err))
			break
		}

		if deleted == 0 {
			break
		}

		totalDeleted += deleted
		utils.Debug("批量删除完成",
			zap.Int("batch_deleted", deleted),
			zap.Int("total_deleted", totalDeleted))

		// 🔥 使用select+timer替代time.Sleep，支持优雅停止（修复问题3.5）
		select {
		case <-time.After(CleanupBatchDelay):
			// 继续下一批
		case <-s.stopChan:
			utils.Info("清理过程中收到停止信号，已删除记录数",
				zap.Int("total_deleted", totalDeleted))
			s.updateStats(totalDeleted)
			return
		}
	}

	// 3. 优化表（可选，根据删除量决定）
	if totalDeleted > 10000 {
		utils.Info("开始优化表空间...")
		if err := s.optimizeTable(ctx); err != nil {
			utils.Warn("表优化失败", zap.Error(err))
		} else {
			utils.Info("表优化完成")
		}
	}

	// 4. 更新统计
	s.updateStats(totalDeleted)

	duration := time.Since(startTime)
	utils.Info("配额日志清理完成",
		zap.Int("deleted_count", totalDeleted),
		zap.Duration("duration", duration))
}

// countOldLogs 查询待删除记录数
func (s *QuotaCleanupService) countOldLogs(ctx context.Context) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM token_quota_logs 
		WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
	`

	var count int
	err := s.repo.GetDB().GetContext(ctx, &count, query, s.retentionDays)
	return count, err
}

// deleteBatch 批量删除一批数据
func (s *QuotaCleanupService) deleteBatch(ctx context.Context) (int, error) {
	query := `
		DELETE FROM token_quota_logs 
		WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
		LIMIT ?
	`

	result, err := s.repo.GetDB().ExecContext(ctx, query, s.retentionDays, s.batchSize)
	if err != nil {
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}

	return int(rowsAffected), nil
}

// optimizeTable 优化表空间
func (s *QuotaCleanupService) optimizeTable(ctx context.Context) error {
	// 🔥 使用ANALYZE TABLE替代OPTIMIZE TABLE（修复中等问题4）
	// ANALYZE TABLE不会锁表，只更新统计信息，适合生产环境
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	
	query := `ANALYZE TABLE token_quota_logs`
	_, err := s.repo.GetDB().ExecContext(ctx, query)
	
	if err != nil {
		utils.Warn("表分析失败",
			zap.Error(err))
		return err
	}
	
	utils.Info("表统计信息更新完成")
	return nil
}

// updateStats 更新统计信息
func (s *QuotaCleanupService) updateStats(deletedCount int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.lastCleanupTime = time.Now()
	s.lastCleanupCount = deletedCount
	s.totalCleanedCount += int64(deletedCount)
}

// GetStats 获取清理统计信息
func (s *QuotaCleanupService) GetStats() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return map[string]interface{}{
		"retention_days":       s.retentionDays,
		"cleanup_interval":     s.cleanupInterval.String(),
		"batch_size":           s.batchSize,
		"last_cleanup_time":    s.lastCleanupTime.Format("2006-01-02 15:04:05"),
		"last_cleanup_count":   s.lastCleanupCount,
		"total_cleaned_count":  s.totalCleanedCount,
		"next_cleanup_time":    s.lastCleanupTime.Add(s.cleanupInterval).Format("2006-01-02 15:04:05"),
	}
}

// TriggerCleanup 手动触发清理（用于API调用）
func (s *QuotaCleanupService) TriggerCleanup() {
	go s.performCleanup()
}
