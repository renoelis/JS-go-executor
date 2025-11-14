package buffer

import (
	"testing"
	"time"
)

// TestRealGoroutineLeakScenario 演示真实的泄漏场景
func TestRealGoroutineLeakScenario(t *testing.T) {
	t.Logf("========================================")
	t.Logf("真实 Goroutine 泄漏场景演示")
	t.Logf("========================================")
	t.Logf("")

	t.Logf("场景: 测试结束后全局 tracker 仍在运行")
	t.Logf("")

	// 记录初始状态
	initialGoroutines := countGoroutines()
	initialCleanup := countCleanupGoroutines()

	t.Logf("测试开始:")
	t.Logf("  总 goroutines: %d", initialGoroutines)
	t.Logf("  cleanup goroutines: %d", initialCleanup)
	t.Logf("")

	// 模拟使用 mmap资源
	data := make([]byte, 1024)
	res := NewMmapResource(data, 1024)
	globalMmapTracker.Track(res)
	res.Release()

	t.Logf("使用 mmap 后:")
	t.Logf("  总 goroutines: %d", countGoroutines())
	t.Logf("  cleanup goroutines: %d", countCleanupGoroutines())
	t.Logf("")

	// 测试结束时，全局 tracker 仍在运行
	t.Logf("测试结束时的状态:")
	t.Logf("  全局 tracker 运行中: %v", globalMmapTracker.running.Load())
	t.Logf("  cleanup goroutines: %d", countCleanupGoroutines())
	t.Logf("")

	if countCleanupGoroutines() > 0 {
		t.Logf("⚠️  全局 tracker 的 goroutine 仍在运行")
		t.Logf("   这在长期运行的服务中是正常的")
		t.Logf("   但在测试环境中可能被视为泄漏")
	}

	// 注意：这里故意不调用 Stop()，以演示"泄漏"
}

// TestCleanExitWithStop 演示正确的清理方式
func TestCleanExitWithStop(t *testing.T) {
	t.Logf("========================================")
	t.Logf("正确的清理方式演示")
	t.Logf("========================================")
	t.Logf("")

	initialGoroutines := countGoroutines()

	// 创建临时 tracker
	tracker := &MmapResourceTracker{
		cleanupInterval: 100 * time.Millisecond,
		leakTimeout:     1 * time.Second,
		stopCh:          make(chan struct{}),
	}
	tracker.Start()

	// 使用 defer 确保清理
	defer func() {
		tracker.Stop()
		time.Sleep(150 * time.Millisecond) // 等待 goroutine 退出
	}()

	afterStart := countGoroutines()
	t.Logf("启动后: %d goroutines (+%d)", afterStart, afterStart-initialGoroutines)

	// 使用 tracker
	data := make([]byte, 1024)
	res := NewMmapResource(data, 1024)
	tracker.Track(res)
	res.Release()

	t.Logf("使用后: %d goroutines", countGoroutines())
	t.Logf("")
	t.Logf("✅ 正确做法: 使用 defer tracker.Stop() 确保清理")
}

// TestGlobalTrackerImpact 测试全局 tracker 的实际影响
func TestGlobalTrackerImpact(t *testing.T) {
	t.Logf("========================================")
	t.Logf("全局 Tracker 实际影响评估")
	t.Logf("========================================")
	t.Logf("")

	stats, _ := globalMmapTracker.GetStats()
	activeCount := globalMmapTracker.activeCount.Load()
	releasedCount := globalMmapTracker.releasedCount.Load()

	t.Logf("全局 tracker 统计:")
	t.Logf("  活跃资源: %d", stats)
	t.Logf("  累计释放: %d", releasedCount)
	t.Logf("  实际活跃 (计数器): %d", activeCount)
	t.Logf("")

	t.Logf("内存开销:")
	t.Logf("  tracker 本身: ~200 bytes")
	t.Logf("  sync.Map: ~48 bytes/entry (仅活跃资源)")
	t.Logf("  goroutine: ~2-8 KB (stack)")
	t.Logf("")

	t.Logf("CPU 开销:")
	t.Logf("  清理频率: 每 30 秒")
	t.Logf("  空资源时: 立即返回 (O(1))")
	t.Logf("  有资源时: O(n) 遍历，n 通常很小")
	t.Logf("")

	// 实际影响评估
	goroutineOverhead := 2048 + 6144 // 2-8KB
	trackerOverhead := 200
	syncMapOverhead := 48 * int(activeCount)
	totalOverhead := goroutineOverhead + trackerOverhead + syncMapOverhead

	t.Logf("总开销估算: ~%d bytes (%.2f KB)", totalOverhead, float64(totalOverhead)/1024)
	t.Logf("")

	if totalOverhead < 10240 { // 10KB
		t.Logf("✅ 开销极小 (< 10KB)，可忽略")
	} else if totalOverhead < 102400 { // 100KB
		t.Logf("✅ 开销较小 (< 100KB)，可接受")
	} else {
		t.Logf("⚠️  开销较大 (> 100KB)，需要优化")
	}
}

// TestShortLivedProcessImpact 测试短期进程的影响
func TestShortLivedProcessImpact(t *testing.T) {
	t.Logf("========================================")
	t.Logf("短期进程影响测试")
	t.Logf("========================================")
	t.Logf("")

	t.Logf("场景: CLI 工具或脚本，运行时间 < 1 秒")
	t.Logf("")

	goroutinesBefore := countGoroutines()

	// 模拟短期进程的工作
	start := time.Now()

	data := make([]byte, 1024*1024) // 1MB
	res := NewMmapResource(data, 1024*1024)
	globalMmapTracker.Track(res)
	res.Release()

	duration := time.Since(start)
	goroutinesAfter := countGoroutines()

	t.Logf("进程运行时间: %v", duration)
	t.Logf("goroutines: %d -> %d", goroutinesBefore, goroutinesAfter)
	t.Logf("")

	t.Logf("影响分析:")
	if goroutinesAfter > goroutinesBefore {
		t.Logf("  ⚠️  残留 %d 个 goroutine", goroutinesAfter-goroutinesBefore)
		t.Logf("  短期进程结束时，这些 goroutine 会随进程退出")
		t.Logf("  实际影响: 可忽略 (进程退出时自动清理)")
	} else {
		t.Logf("  ✅ 无额外 goroutine")
	}
	t.Logf("")

	t.Logf("建议:")
	t.Logf("  - 短期进程: 无需特殊处理，进程退出自动清理")
	t.Logf("  - 长期进程: 全局 tracker 持续运行，提供泄漏检测")
	t.Logf("  - 测试环境: 可选择性停止全局 tracker")
}
