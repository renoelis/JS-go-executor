package buffer

import (
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

// MmapResource mmap 资源管理器（引用计数版本）
// 🔥 解决 Finalizer 不可靠的问题：
// 1. 使用引用计数实现确定性的资源释放
// 2. 后台协程定期清理泄漏的资源
// 3. 支持多个引用共享同一块 mmap 内存
type MmapResource struct {
	data     []byte
	size     int
	refCount atomic.Int32 // 引用计数
	released atomic.Bool  // 是否已释放（防止 double-free）
}

// NewMmapResource 创建新的 mmap 资源
func NewMmapResource(data []byte, size int) *MmapResource {
	res := &MmapResource{
		data: data,
		size: size,
	}
	res.refCount.Store(1) // 初始引用计数为 1
	return res
}

// AddRef 增加引用计数
// 用于创建新的引用（如 Buffer.slice）
func (m *MmapResource) AddRef() {
	if m.released.Load() {
		return // 已释放，不允许增加引用
	}
	m.refCount.Add(1)
}

// Release 减少引用计数，计数为 0 时释放 mmap 内存
// 🔥 关键特性：
// - 引用计数为 0 时立即调用 munmap（不依赖 GC）
// - 使用 CompareAndSwap 防止 double-free
// - 线程安全
func (m *MmapResource) Release() {
	if m.released.Load() {
		return // 已释放，防止 double-free
	}

	newCount := m.refCount.Add(-1)
	if newCount == 0 {
		// 引用计数为 0，立即释放
		if m.released.CompareAndSwap(false, true) {
			if len(m.data) > 0 {
				// 立即调用 munmap 释放内存映射
				_ = syscall.Munmap(m.data)
				m.data = nil
			}
		}
	} else if newCount < 0 {
		// 检测 double-free（不应该发生）
		// 在生产环境应该记录日志而不是 panic
		// log.Printf("ERROR: MmapResource double-free detected, size=%d", m.size)
	}
}

// IsReleased 检查资源是否已释放
func (m *MmapResource) IsReleased() bool {
	return m.released.Load()
}

// RefCount 获取当前引用计数（用于调试）
func (m *MmapResource) RefCount() int32 {
	return m.refCount.Load()
}

// MmapResourceTracker 全局 mmap 资源追踪器
// 🔥 功能：
// 1. 追踪所有活跃的 mmap 资源
// 2. 定期清理已释放的资源
// 3. 检测泄漏（超过 5 分钟未释放的资源）
// 🔥 性能优化：使用计数器避免频繁遍历 sync.Map
type MmapResourceTracker struct {
	resources       sync.Map      // map[*MmapResource]time.Time
	cleanupInterval time.Duration // 清理间隔
	leakTimeout     time.Duration // 泄漏超时时间
	stopCh          chan struct{}
	running         atomic.Bool

	// 🔥 新增：快速计数器（避免频繁遍历 sync.Map）
	activeCount atomic.Int64 // 当前活跃的资源数量
	releasedCount atomic.Int64 // 累计释放的资源数量
}

// 全局追踪器实例
var globalMmapTracker = &MmapResourceTracker{
	cleanupInterval: MmapCleanupInterval * time.Second, // 每 30 秒清理一次
	leakTimeout:     time.Duration(MmapLeakTimeout) * time.Second,  // 5 分钟未释放视为泄漏
	stopCh:          make(chan struct{}),
}

// 🔥 延迟启动机制：只有在首次使用 mmap 时才启动 tracker
// 这避免了 init() 自动启动导致的 goroutine 泄漏问题
var trackerStartOnce sync.Once

// ensureTrackerStarted 确保 tracker 已启动（线程安全，只执行一次）
func ensureTrackerStarted() {
	trackerStartOnce.Do(func() {
		globalMmapTracker.Start()
	})
}

// Shutdown 停止全局 tracker（用于测试清理）
// 🔥 注意：此函数主要用于测试环境，生产环境通常不需要调用
func Shutdown() {
	globalMmapTracker.Stop()
}

// Start 启动后台清理协程
func (t *MmapResourceTracker) Start() {
	if t.running.CompareAndSwap(false, true) {
		go t.cleanupLoop()
	}
}

// Stop 停止后台清理协程
func (t *MmapResourceTracker) Stop() {
	if t.running.CompareAndSwap(true, false) {
		close(t.stopCh)
	}
}

// cleanupLoop 后台清理循环
func (t *MmapResourceTracker) cleanupLoop() {
	ticker := time.NewTicker(t.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			t.cleanup()
		case <-t.stopCh:
			return
		}
	}
}

// cleanup 清理已释放的资源并检测泄漏
// 🔥 性能优化：
// 1. 使用计数器快速判断是否需要清理
// 2. 批量删除,减少 sync.Map 操作次数
func (t *MmapResourceTracker) cleanup() {
	// 🔥 快速路径：如果没有活跃资源,直接返回
	if t.activeCount.Load() == 0 {
		return
	}

	now := time.Now()
	toRemove := make([]*MmapResource, 0, MmapCleanupBatchSize) // 预分配容量

	t.resources.Range(func(key, value interface{}) bool {
		res := key.(*MmapResource)
		createTime := value.(time.Time)

		if res.IsReleased() {
			// 已释放,从追踪器中移除
			toRemove = append(toRemove, res)
		} else if now.Sub(createTime) > t.leakTimeout {
			// 超过 5 分钟未释放,视为泄漏
			// 在生产环境应该记录日志
			// log.Printf("WARNING: mmap resource leaked, size=%d, age=%v, refCount=%d",
			//     res.size, now.Sub(createTime), res.RefCount())

			// 强制释放（防止内存泄漏）
			res.Release()
			toRemove = append(toRemove, res)
		}
		return true
	})

	// 🔥 批量删除
	for _, res := range toRemove {
		t.resources.Delete(res)
		t.activeCount.Add(-1)
		t.releasedCount.Add(1)
	}
}

// Track 追踪一个 mmap 资源
func (t *MmapResourceTracker) Track(res *MmapResource) {
	t.resources.Store(res, time.Now())
	t.activeCount.Add(1)
}

// GetStats 获取统计信息（用于监控）
func (t *MmapResourceTracker) GetStats() (total int, leaked int) {
	// 🔥 性能优化：优先使用计数器,避免遍历
	activeCount := t.activeCount.Load()
	if activeCount == 0 {
		return 0, 0
	}

	now := time.Now()
	total = int(activeCount)
	leaked = 0

	t.resources.Range(func(key, value interface{}) bool {
		createTime := value.(time.Time)
		if now.Sub(createTime) > t.leakTimeout {
			leaked++
		}
		return true
	})
	return
}
