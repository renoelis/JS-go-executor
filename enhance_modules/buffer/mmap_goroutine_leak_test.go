package buffer

import (
	"fmt"
	"runtime"
	"strings"
	"testing"
	"time"
)

// countGoroutines 统计当前 goroutine 数量
func countGoroutines() int {
	return runtime.NumGoroutine()
}

// getGoroutineStacks 获取 goroutine 堆栈信息
func getGoroutineStacks() string {
	buf := make([]byte, 1<<20) // 1MB buffer
	n := runtime.Stack(buf, true)
	return string(buf[:n])
}

// countCleanupGoroutines 统计 cleanup 相关的 goroutine
func countCleanupGoroutines() int {
	stacks := getGoroutineStacks()
	count := 0
	for _, line := range strings.Split(stacks, "\n") {
		if strings.Contains(line, "cleanupLoop") {
			count++
		}
	}
	return count
}

// TestMmapTrackerGoroutineLeak 测试 tracker 的 goroutine 泄漏
func TestMmapTrackerGoroutineLeak(t *testing.T) {
	t.Logf("========================================")
	t.Logf("MmapResourceTracker Goroutine 泄漏测试")
	t.Logf("========================================")
	t.Logf("")

	// 1. 记录初始状态
	initialGoroutines := countGoroutines()
	initialCleanup := countCleanupGoroutines()

	t.Logf("初始状态:")
	t.Logf("  总 goroutines: %d", initialGoroutines)
	t.Logf("  cleanup goroutines: %d", initialCleanup)
	t.Logf("")

	// 2. 创建多个 tracker 实例（模拟多次导入包）
	trackers := make([]*MmapResourceTracker, 10)
	for i := 0; i < 10; i++ {
		tracker := &MmapResourceTracker{
			cleanupInterval: 100 * time.Millisecond,
			leakTimeout:     1 * time.Second,
			stopCh:          make(chan struct{}),
		}
		tracker.Start()
		trackers[i] = tracker
	}

	// 等待 goroutine 启动
	time.Sleep(50 * time.Millisecond)

	afterStart := countGoroutines()
	afterCleanup := countCleanupGoroutines()

	t.Logf("启动 10 个 tracker 后:")
	t.Logf("  总 goroutines: %d (+%d)", afterStart, afterStart-initialGoroutines)
	t.Logf("  cleanup goroutines: %d (+%d)", afterCleanup, afterCleanup-initialCleanup)
	t.Logf("")

	// 3. 停止所有 tracker
	for _, tracker := range trackers {
		tracker.Stop()
	}

	// 等待 goroutine 退出
	time.Sleep(200 * time.Millisecond)

	afterStop := countGoroutines()
	afterCleanupStop := countCleanupGoroutines()

	t.Logf("停止所有 tracker 后:")
	t.Logf("  总 goroutines: %d", afterStop)
	t.Logf("  cleanup goroutines: %d", afterCleanupStop)
	t.Logf("")

	// 4. 分析泄漏
	leaked := afterStop - initialGoroutines
	cleanupLeaked := afterCleanupStop - initialCleanup

	t.Logf("泄漏分析:")
	t.Logf("  总泄漏: %d goroutines", leaked)
	t.Logf("  cleanup 泄漏: %d goroutines", cleanupLeaked)
	t.Logf("")

	if cleanupLeaked > 0 {
		t.Errorf("❌ 检测到 cleanup goroutine 泄漏: %d 个未退出", cleanupLeaked)
		t.Logf("\n当前 goroutine 堆栈:\n%s", getGoroutineStacks())
	} else {
		t.Logf("✅ 无 cleanup goroutine 泄漏")
	}

	if leaked > 5 { // 允许一些合理的差异
		t.Logf("⚠️  总泄漏 %d 个 goroutine (可能包含其他测试)", leaked)
	}
}

// TestGlobalTrackerLifecycle 测试全局 tracker 的生命周期
func TestGlobalTrackerLifecycle(t *testing.T) {
	t.Logf("========================================")
	t.Logf("全局 MmapResourceTracker 生命周期测试")
	t.Logf("========================================")
	t.Logf("")

	// 检查全局 tracker 的状态
	isRunning := globalMmapTracker.running.Load()
	t.Logf("全局 tracker 运行状态: %v", isRunning)

	if !isRunning {
		t.Logf("⚠️  全局 tracker 未运行 (可能已被停止)")
	} else {
		t.Logf("✅ 全局 tracker 正在运行")
	}

	// 统计 cleanup goroutine
	cleanupCount := countCleanupGoroutines()
	t.Logf("cleanup goroutines: %d", cleanupCount)

	if cleanupCount == 0 {
		t.Logf("⚠️  没有检测到 cleanup goroutine")
	} else if cleanupCount == 1 {
		t.Logf("✅ 检测到 1 个 cleanup goroutine (正常)")
	} else {
		t.Logf("⚠️  检测到 %d 个 cleanup goroutine (可能重复启动)", cleanupCount)
	}
}

// TestInitFunctionGoroutine 测试 init() 启动的 goroutine
func TestInitFunctionGoroutine(t *testing.T) {
	t.Logf("========================================")
	t.Logf("init() 函数 Goroutine 测试")
	t.Logf("========================================")
	t.Logf("")

	// 问题：init() 自动启动了 globalMmapTracker.Start()
	// 这会创建一个永不退出的 goroutine

	t.Logf("问题分析:")
	t.Logf("  1. init() 自动调用 globalMmapTracker.Start()")
	t.Logf("  2. 创建后台 cleanupLoop goroutine")
	t.Logf("  3. 该 goroutine 永不退出（除非调用 Stop()）")
	t.Logf("")

	t.Logf("影响评估:")
	t.Logf("  - 每次导入 buffer 包 = 1 个后台 goroutine")
	t.Logf("  - 单元测试环境：多个测试文件导入 = 多个 goroutine")
	t.Logf("  - go test -race 会检测到 goroutine 泄漏")
	t.Logf("  - 短期进程（如 CLI 工具）累积 goroutine")
	t.Logf("")

	// 检查当前状态
	cleanupCount := countCleanupGoroutines()
	totalGoroutines := countGoroutines()

	t.Logf("当前状态:")
	t.Logf("  总 goroutines: %d", totalGoroutines)
	t.Logf("  cleanup goroutines: %d", cleanupCount)
	t.Logf("")

	// 检查全局 tracker 是否可停止
	canStop := globalMmapTracker.running.Load()
	t.Logf("全局 tracker 可停止: %v", canStop)

	if canStop {
		t.Logf("✅ 可以通过 globalMmapTracker.Stop() 停止")
	} else {
		t.Logf("❌ 已停止或未启动")
	}
}

// TestMultiplePackageImports 模拟多次包导入
func TestMultiplePackageImports(t *testing.T) {
	t.Logf("========================================")
	t.Logf("多次包导入场景测试")
	t.Logf("========================================")
	t.Logf("")

	// 注意：在 Go 中，一个包只会被初始化一次
	// 即使多个测试文件导入，init() 也只执行一次
	// 但在某些场景下（如 plugin 加载），可能多次初始化

	t.Logf("正常情况:")
	t.Logf("  - Go 保证每个包的 init() 只执行一次")
	t.Logf("  - 因此只会创建 1 个 cleanup goroutine")
	t.Logf("")

	t.Logf("异常情况:")
	t.Logf("  - 使用 plugin 动态加载包")
	t.Logf("  - 每次加载会重新执行 init()")
	t.Logf("  - 可能累积多个 cleanup goroutine")
	t.Logf("")

	cleanupCount := countCleanupGoroutines()
	t.Logf("当前 cleanup goroutines: %d", cleanupCount)

	if cleanupCount <= 1 {
		t.Logf("✅ 符合预期（单例模式工作正常）")
	} else {
		t.Logf("⚠️  检测到多个 cleanup goroutine，可能存在问题")
	}
}

// TestGoroutineLeakWithRaceDetector 测试 -race 检测
func TestGoroutineLeakWithRaceDetector(t *testing.T) {
	t.Logf("========================================")
	t.Logf("Race Detector Goroutine 泄漏测试")
	t.Logf("========================================")
	t.Logf("")

	t.Logf("问题:")
	t.Logf("  go test -race 在测试结束时检查 goroutine 泄漏")
	t.Logf("  如果有 goroutine 仍在运行，会报告泄漏")
	t.Logf("")

	before := countGoroutines()
	cleanupBefore := countCleanupGoroutines()

	// 创建一个临时 tracker
	tracker := &MmapResourceTracker{
		cleanupInterval: 100 * time.Millisecond,
		leakTimeout:     1 * time.Second,
		stopCh:          make(chan struct{}),
	}
	tracker.Start()

	time.Sleep(50 * time.Millisecond)

	after := countGoroutines()
	cleanupAfter := countCleanupGoroutines()

	t.Logf("启动 tracker 前: %d goroutines (%d cleanup)", before, cleanupBefore)
	t.Logf("启动 tracker 后: %d goroutines (%d cleanup)", after, cleanupAfter)
	t.Logf("")

	// 测试结束前必须停止
	t.Logf("正确做法: 在测试结束前调用 tracker.Stop()")
	tracker.Stop()
	time.Sleep(150 * time.Millisecond)

	afterStop := countGoroutines()
	cleanupAfterStop := countCleanupGoroutines()

	t.Logf("停止 tracker 后: %d goroutines (%d cleanup)", afterStop, cleanupAfterStop)
	t.Logf("")

	if cleanupAfterStop == cleanupBefore {
		t.Logf("✅ goroutine 正确退出")
	} else {
		t.Errorf("❌ goroutine 未退出，泄漏 %d 个", cleanupAfterStop-cleanupBefore)
	}
}

// TestProposedSolutions 测试建议的解决方案
func TestProposedSolutions(t *testing.T) {
	fmt.Println("\n========================================")
	fmt.Println("MmapResourceTracker Goroutine 泄漏问题")
	fmt.Println("========================================")
	fmt.Println()
	fmt.Println("问题描述:")
	fmt.Println("  位置: mmap_resource.go:104-120")
	fmt.Println("  代码: func init() { globalMmapTracker.Start() }")
	fmt.Println()
	fmt.Println("影响:")
	fmt.Println("  1. init() 自动启动后台 goroutine")
	fmt.Println("  2. 该 goroutine 永不退出（除非调用 Stop()）")
	fmt.Println("  3. go test -race 可能检测到 goroutine 泄漏")
	fmt.Println("  4. 短期进程（CLI 工具）累积 goroutine")
	fmt.Println()
	fmt.Println("严重程度评估:")
	fmt.Println("  - 长期运行的服务: ✅ 无影响（1 个 goroutine 可接受）")
	fmt.Println("  - 单元测试: ⚠️  轻微影响（可能触发 -race 警告）")
	fmt.Println("  - 短期进程: ⚠️  轻微影响（1 个 goroutine 残留）")
	fmt.Println("  - 性能: ✅ 无影响（30 秒 ticker，开销极小）")
	fmt.Println()
	fmt.Println("解决方案对比:")
	fmt.Println()
	fmt.Println("方案 A: 延迟启动（推荐）")
	fmt.Println("  - 移除 init() 中的自动启动")
	fmt.Println("  - 首次使用 mmap 时启动 tracker")
	fmt.Println("  - sync.Once 保证只启动一次")
	fmt.Println("  ✅ 优点: 无 goroutine 泄漏，按需启动")
	fmt.Println("  ❌ 缺点: 稍微增加复杂度")
	fmt.Println()
	fmt.Println("方案 B: 添加清理函数")
	fmt.Println("  - 保留 init() 启动")
	fmt.Println("  - 提供 buffer.Shutdown() 函数")
	fmt.Println("  - 测试中手动调用 Shutdown()")
	fmt.Println("  ✅ 优点: 简单，向后兼容")
	fmt.Println("  ❌ 缺点: 需要手动调用（容易忘记）")
	fmt.Println()
	fmt.Println("方案 C: 使用 TestMain")
	fmt.Println("  - 保持现状")
	fmt.Println("  - 在 TestMain 中清理")
	fmt.Println("  ✅ 优点: 不改动源码")
	fmt.Println("  ❌ 缺点: 需要在每个测试包中添加 TestMain")
	fmt.Println()
	fmt.Println("方案 D: 禁用 tracker（激进）")
	fmt.Println("  - 完全移除后台清理")
	fmt.Println("  - 依赖引用计数和手动 Release()")
	fmt.Println("  ✅ 优点: 无 goroutine")
	fmt.Println("  ❌ 缺点: 无泄漏检测，可能累积内存")
	fmt.Println()
	fmt.Println("========================================")
}

// BenchmarkTrackerOverhead 测试 tracker 的性能开销
func BenchmarkTrackerOverhead(b *testing.B) {
	tracker := &MmapResourceTracker{
		cleanupInterval: 1 * time.Hour, // 很长的间隔，避免干扰
		leakTimeout:     1 * time.Hour,
		stopCh:          make(chan struct{}),
	}
	tracker.Start()
	defer tracker.Stop()

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		data := make([]byte, 1024)
		res := NewMmapResource(data, 1024)
		tracker.Track(res)
		res.Release()
	}
}
