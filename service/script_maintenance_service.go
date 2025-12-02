package service

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"flow-codeblock-go/utils"

	"go.uber.org/zap"
)

// cleanupTime 用于自定义 JSON 时间格式（yyyy-MM-dd HH:mm:ss）
type cleanupTime time.Time

func (t cleanupTime) MarshalJSON() ([]byte, error) {
	if time.Time(t).IsZero() {
		return []byte("null"), nil
	}
	return []byte(`"` + time.Time(t).Format("2006-01-02 15:04:05") + `"`), nil
}

// ScriptCleanupResult 单次清理结果
type ScriptCleanupResult struct {
	Trigger               string      `json:"trigger"`
	StartedAt             cleanupTime `json:"started_at"`
	FinishedAt            cleanupTime `json:"finished_at"`
	DurationMs            int64       `json:"duration_ms"`
	ExpiredScriptsDeleted int64       `json:"expired_scripts_deleted"`
	OrphanScriptsDeleted  int64       `json:"orphan_scripts_deleted"`
	OldStatsDeleted       int64       `json:"old_stats_deleted"`
	OrphanStatsDeleted    int64       `json:"orphan_stats_deleted"`
	Error                 string      `json:"error,omitempty"`
	SkipReason            string      `json:"skip_reason,omitempty"`
}

// ScriptMaintenanceStats 清理服务运行状态
type ScriptMaintenanceStats struct {
	Enabled         bool                 `json:"enabled"`
	Running         bool                 `json:"running"`
	IntervalMinutes int64                `json:"interval_minutes"`
	TimeoutSeconds  int64                `json:"timeout_seconds"`
	LastResult      *ScriptCleanupResult `json:"last_result,omitempty"`
	LastResultAt    *cleanupTime         `json:"last_result_at,omitempty"`
	NextRunAt       *cleanupTime         `json:"next_run_at,omitempty"`
	Note            string               `json:"note,omitempty"`
}

// ScriptMaintenanceService 负责脚本/统计清理的定时任务和手动触发
type ScriptMaintenanceService struct {
	cleanupService *ScriptCleanupService
	statsService   *ScriptStatsService
	interval       time.Duration
	timeout        time.Duration
	enabled        bool

	stopChan          chan struct{}
	manualTriggerChan chan struct{}
	wg                sync.WaitGroup

	mu         sync.RWMutex
	running    bool
	lastResult *ScriptCleanupResult
	nextRunAt  time.Time
}

// NewScriptMaintenanceService 创建脚本清理维护服务
func NewScriptMaintenanceService(
	cleanupService *ScriptCleanupService,
	statsService *ScriptStatsService,
	interval time.Duration,
	timeout time.Duration,
	enabled bool,
) *ScriptMaintenanceService {
	if interval <= 0 {
		interval = 24 * time.Hour
	}
	if timeout <= 0 {
		timeout = 2 * time.Minute
	}

	service := &ScriptMaintenanceService{
		cleanupService:    cleanupService,
		statsService:      statsService,
		interval:          interval,
		timeout:           timeout,
		enabled:           enabled,
		stopChan:          make(chan struct{}),
		manualTriggerChan: make(chan struct{}, 1), // 单槽队列，避免重复堆积
	}

	// 如果依赖未就绪，仅支持后续手动触发（返回时不启动定时任务）
	if cleanupService == nil || statsService == nil {
		utils.Warn("脚本清理维护服务未启动，依赖未初始化",
			zap.Bool("has_cleanup_service", cleanupService != nil),
			zap.Bool("has_stats_service", statsService != nil))
		return service
	}

	if enabled {
		service.scheduleNextRun(time.Now().Add(interval))
		service.wg.Add(1)
		go service.runLoop()
		utils.Info("脚本清理维护服务已启动",
			zap.Duration("interval", interval),
			zap.Duration("timeout", timeout))
	} else {
		utils.Info("脚本清理维护服务未启用自动调度（仍支持手动触发）")
	}
	// 手动触发独立 worker，串行处理队列任务
	service.wg.Add(1)
	go service.runManualWorker()

	return service
}

// Stop 停止后台定时任务
func (s *ScriptMaintenanceService) Stop() {
	if s == nil || s.stopChan == nil {
		return
	}

	select {
	case <-s.stopChan:
		// 已关闭
		return
	default:
		close(s.stopChan)
	}
	s.wg.Wait()
	utils.Info("脚本清理维护服务已停止")
}

// Stats 返回当前状态
func (s *ScriptMaintenanceService) Stats() *ScriptMaintenanceStats {
	if s == nil {
		return nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	var lastResultCopy *ScriptCleanupResult
	if s.lastResult != nil {
		tmp := *s.lastResult
		lastResultCopy = &tmp
	}
	var lastResultAt *cleanupTime
	if s.lastResult != nil {
		t := s.lastResult.FinishedAt
		lastResultAt = &t
	}
	var nextRunAt *cleanupTime
	if !s.nextRunAt.IsZero() {
		t := cleanupTime(s.nextRunAt)
		nextRunAt = &t
	}

	return &ScriptMaintenanceStats{
		Enabled:         s.enabled,
		Running:         s.running,
		IntervalMinutes: int64(s.interval / time.Minute),
		TimeoutSeconds:  int64(s.timeout / time.Second),
		LastResult:      lastResultCopy,
		LastResultAt:    lastResultAt,
		NextRunAt:       nextRunAt,
		Note:            "如果自动调度关闭，仍可通过手动触发执行清理",
	}
}

// TriggerCleanup 手动触发一次清理（异步提交，避免受HTTP生命周期影响）
func (s *ScriptMaintenanceService) TriggerCleanup(_ context.Context) ScriptCleanupResult {
	result := ScriptCleanupResult{
		Trigger: "manual",
	}

	if s == nil || s.cleanupService == nil || s.statsService == nil {
		result.Error = "脚本清理服务未初始化"
		return result
	}

	// 若已有任务在运行，则直接返回冲突信息
	s.mu.RLock()
	running := s.running
	s.mu.RUnlock()
	if running {
		result.Error = "已有清理任务在运行，跳过本次请求"
		result.SkipReason = "running"
		return result
	}

	// 将任务提交到单通道队列，避免并发重复启动
	select {
	case s.manualTriggerChan <- struct{}{}:
		result.SkipReason = "queued" // 已排队，等待后台 worker 执行
	default:
		result.Error = "已有清理任务在排队，请稍后再试"
		result.SkipReason = "queued"
	}

	return result
}

// runLoop 定时执行清理
func (s *ScriptMaintenanceService) runLoop() {
	defer s.wg.Done()

	initialDelay := time.NewTimer(1 * time.Minute)
	defer initialDelay.Stop()

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	for {
		select {
		case <-initialDelay.C:
			result := s.runCleanup("startup", context.Background())
			if result.Error != "" {
				utils.Warn("启动阶段脚本清理完成（有错误）", zap.String("error", result.Error))
			}
			s.scheduleNextRun(time.Now().Add(s.interval))
		case <-ticker.C:
			result := s.runCleanup("schedule", context.Background())
			if result.Error != "" {
				utils.Warn("定时脚本清理完成（有错误）", zap.String("error", result.Error))
			}
			s.scheduleNextRun(time.Now().Add(s.interval))
		case <-s.stopChan:
			return
		}
	}
}

// runManualWorker 串行消费手动触发的清理请求
func (s *ScriptMaintenanceService) runManualWorker() {
	defer s.wg.Done()

	for {
		select {
		case <-s.manualTriggerChan:
			result := s.runCleanup("manual", context.Background())
			if result.Error != "" {
				utils.Warn("手动脚本清理完成（有错误）", zap.String("error", result.Error))
			}
		case <-s.stopChan:
			return
		}
	}
}

func (s *ScriptMaintenanceService) scheduleNextRun(t time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nextRunAt = t
}

// runCleanup 执行实际清理逻辑（带并发保护和超时）
func (s *ScriptMaintenanceService) runCleanup(trigger string, parentCtx context.Context) ScriptCleanupResult {
	result := ScriptCleanupResult{
		Trigger:   trigger,
		StartedAt: cleanupTime(time.Now()),
	}

	if s == nil || s.cleanupService == nil || s.statsService == nil {
		result.Error = "脚本清理服务未初始化"
		return result
	}

	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		result.Error = "已有清理任务在运行，跳过本次请求"
		result.SkipReason = "running"
		return result
	}
	s.running = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		s.running = false
		s.lastResult = &result
		s.mu.Unlock()
	}()

	// 清理任务需与外部请求生命周期解耦，始终使用独立上下文
	ctx, cancel := context.WithTimeout(context.Background(), s.timeout)
	defer cancel()

	var errs []string

	deletedExpired, err := s.cleanupService.CleanupExpiredTokenScripts(ctx)
	if err != nil {
		errs = append(errs, fmt.Sprintf("清理过期Token脚本失败: %v", err))
	} else {
		result.ExpiredScriptsDeleted = deletedExpired
	}

	deletedOrphaned, err := s.cleanupService.CleanupOrphanedScripts(ctx)
	if err != nil {
		errs = append(errs, fmt.Sprintf("清理孤儿脚本失败: %v", err))
	} else {
		result.OrphanScriptsDeleted = deletedOrphaned
	}

	deletedOldStats, err := s.statsService.CleanupOldStats(ctx)
	if err != nil {
		errs = append(errs, fmt.Sprintf("清理过期统计失败: %v", err))
	} else {
		result.OldStatsDeleted = deletedOldStats
	}

	deletedOrphanStats, err := s.statsService.CleanupOrphanedStats(ctx)
	if err != nil {
		errs = append(errs, fmt.Sprintf("清理孤儿统计失败: %v", err))
	} else {
		result.OrphanStatsDeleted = deletedOrphanStats
	}

	result.FinishedAt = cleanupTime(time.Now())
	result.DurationMs = time.Time(result.FinishedAt).Sub(time.Time(result.StartedAt)).Milliseconds()

	if len(errs) > 0 {
		result.Error = strings.Join(errs, "; ")
		utils.Warn("脚本/统计清理完成，存在错误",
			zap.String("trigger", trigger),
			zap.String("error", result.Error),
			zap.Int64("duration_ms", result.DurationMs))
	} else {
		utils.Info("脚本/统计清理完成",
			zap.String("trigger", trigger),
			zap.Int64("duration_ms", result.DurationMs),
			zap.Int64("expired_scripts_deleted", result.ExpiredScriptsDeleted),
			zap.Int64("orphan_scripts_deleted", result.OrphanScriptsDeleted),
			zap.Int64("old_stats_deleted", result.OldStatsDeleted),
			zap.Int64("orphan_stats_deleted", result.OrphanStatsDeleted))
	}

	return result
}
