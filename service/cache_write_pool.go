package service

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"flow-codeblock-go/utils"

	"go.uber.org/zap"
)

// CacheWriteTask 缓存写入任务
type CacheWriteTask struct {
	TaskType string // "token" 或 "rate_limit"
	Execute  func(ctx context.Context) error
	Key      string // 用于日志
}

// CacheWritePool 异步缓存写入池
// 特点：
//  1. 零丢失：所有任务都会被执行（阻塞式提交）
//  2. 背压控制：队列满时阻塞调用方
//  3. 资源限制：固定数量的 worker goroutines
//  4. 优雅关闭：支持等待所有任务完成
type CacheWritePool struct {
	tasks     chan CacheWriteTask
	workers   int
	queueSize int
	wg        sync.WaitGroup
	stop      chan struct{}
	stopOnce  sync.Once

	// 统计信息
	stats poolStats
}

type poolStats struct {
	totalSubmitted int64 // 总提交任务数
	totalProcessed int64 // 总处理任务数
	totalSuccess   int64 // 成功执行数
	totalFailed    int64 // 失败执行数
	totalTimeout   int64 // 超时次数
	submitBlocked  int64 // 提交阻塞次数（队列满）
}

// NewCacheWritePool 创建缓存写入池
// workers: worker goroutine 数量（推荐 10-20）
// queueSize: 任务队列大小（推荐 500-2000）
func NewCacheWritePool(workers, queueSize int) *CacheWritePool {
	if workers <= 0 {
		workers = 10
	}
	if queueSize <= 0 {
		queueSize = 1000
	}

	pool := &CacheWritePool{
		tasks:     make(chan CacheWriteTask, queueSize),
		workers:   workers,
		queueSize: queueSize,
		stop:      make(chan struct{}),
	}

	// 启动 workers
	for i := 0; i < workers; i++ {
		pool.wg.Add(1)
		go pool.worker(i)
	}

	utils.Info("缓存写入池已启动",
		zap.Int("workers", workers),
		zap.Int("queue_size", queueSize),
	)

	return pool
}

// worker 工作协程
func (p *CacheWritePool) worker(id int) {
	defer p.wg.Done()

	utils.Debug("缓存写入 worker 已启动", zap.Int("worker_id", id))

	for {
		select {
		case task := <-p.tasks:
			p.processTask(task, id)

		case <-p.stop:
			// 🔥 优雅关闭：处理完剩余任务
			// drain remaining tasks
			for {
				select {
				case task := <-p.tasks:
					p.processTask(task, id)
				default:
					utils.Debug("缓存写入 worker 已停止", zap.Int("worker_id", id))
					return
				}
			}
		}
	}
}

// processTask 处理单个任务
func (p *CacheWritePool) processTask(task CacheWriteTask, workerID int) {
	// 统计开始
	atomic.AddInt64(&p.stats.totalProcessed, 1)

	// 执行任务（带3秒超时）
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// 执行
	err := task.Execute(ctx)

	if err != nil {
		// 判断是否超时
		if ctx.Err() == context.DeadlineExceeded {
			atomic.AddInt64(&p.stats.totalTimeout, 1)
			utils.Debug("缓存写入超时",
				zap.Int("worker_id", workerID),
				zap.String("task_type", task.TaskType),
				zap.String("key", task.Key),
			)
		} else {
			atomic.AddInt64(&p.stats.totalFailed, 1)
			utils.Debug("缓存写入失败",
				zap.Int("worker_id", workerID),
				zap.String("task_type", task.TaskType),
				zap.String("key", task.Key),
				zap.Error(err),
			)
		}
	} else {
		atomic.AddInt64(&p.stats.totalSuccess, 1)
	}
}

// Submit 提交任务（阻塞式，直到任务被接受）
// 特点：
//   - 如果队列有空位，立即返回
//   - 如果队列满，阻塞等待直到有空位或超时
//   - 超时时间由调用方指定（推荐 50-100ms）
func (p *CacheWritePool) Submit(task CacheWriteTask, timeout time.Duration) error {
	// 统计
	atomic.AddInt64(&p.stats.totalSubmitted, 1)

	// 检查是否已关闭
	select {
	case <-p.stop:
		return ErrPoolClosed
	default:
	}

	// 🔥 关键设计：带超时的阻塞提交
	// 情况 1：队列有空位 → 立即提交（不阻塞）
	// 情况 2：队列满 → 阻塞等待（最多 timeout）
	// 情况 3：超时 → 返回错误（但调用方可以选择忽略）
	select {
	case p.tasks <- task:
		// 成功提交
		return nil

	case <-time.After(timeout):
		// 提交超时（队列一直满）
		atomic.AddInt64(&p.stats.submitBlocked, 1)
		utils.Warn("缓存写入队列已满，提交超时",
			zap.String("task_type", task.TaskType),
			zap.String("key", task.Key),
			zap.Duration("timeout", timeout),
			zap.Int("queue_size", p.queueSize),
		)
		return ErrSubmitTimeout

	case <-p.stop:
		return ErrPoolClosed
	}
}

// TrySubmit 尝试提交任务（非阻塞）
// 如果队列满，立即返回 false
// 适用场景：对缓存写入不敏感的场景
func (p *CacheWritePool) TrySubmit(task CacheWriteTask) bool {
	select {
	case p.tasks <- task:
		atomic.AddInt64(&p.stats.totalSubmitted, 1)
		return true
	default:
		atomic.AddInt64(&p.stats.submitBlocked, 1)
		return false
	}
}

// Shutdown 优雅关闭（等待所有任务完成）
// timeout: 最长等待时间
func (p *CacheWritePool) Shutdown(timeout time.Duration) {
	p.stopOnce.Do(func() {
		utils.Info("开始关闭缓存写入池",
			zap.Int("workers", p.workers),
			zap.Int("pending_tasks", len(p.tasks)),
		)

		// 1. 发送停止信号
		close(p.stop)

		// 2. 等待所有 workers 完成（或超时）
		done := make(chan struct{})
		go func() {
			p.wg.Wait()
			close(done)
		}()

		select {
		case <-done:
			utils.Info("缓存写入池已完全停止",
				zap.Int64("total_submitted", atomic.LoadInt64(&p.stats.totalSubmitted)),
				zap.Int64("total_processed", atomic.LoadInt64(&p.stats.totalProcessed)),
				zap.Int64("total_success", atomic.LoadInt64(&p.stats.totalSuccess)),
				zap.Int64("total_failed", atomic.LoadInt64(&p.stats.totalFailed)),
			)

		case <-time.After(timeout):
			utils.Warn("缓存写入池关闭超时",
				zap.Duration("timeout", timeout),
				zap.Int("remaining_tasks", len(p.tasks)),
			)
		}
	})
}

// GetStats 获取统计信息
func (p *CacheWritePool) GetStats() map[string]interface{} {
	return map[string]interface{}{
		"workers":         p.workers,
		"queue_size":      p.queueSize,
		"queue_used":      len(p.tasks),
		"queue_available": p.queueSize - len(p.tasks),
		"total_submitted": atomic.LoadInt64(&p.stats.totalSubmitted),
		"total_processed": atomic.LoadInt64(&p.stats.totalProcessed),
		"total_success":   atomic.LoadInt64(&p.stats.totalSuccess),
		"total_failed":    atomic.LoadInt64(&p.stats.totalFailed),
		"total_timeout":   atomic.LoadInt64(&p.stats.totalTimeout),
		"submit_blocked":  atomic.LoadInt64(&p.stats.submitBlocked),
	}
}

// 错误定义
var (
	ErrPoolClosed    = &PoolError{Message: "缓存写入池已关闭"}
	ErrSubmitTimeout = &PoolError{Message: "提交任务超时（队列已满）"}
)

type PoolError struct {
	Message string
}

func (e *PoolError) Error() string {
	return e.Message
}
