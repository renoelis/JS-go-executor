package buffer

import (
	"fmt"
	"runtime"
	"sync"
	"testing"
	"time"
)

// TestBufferPoolResetLeak 测试池重置时的内存累积
func TestBufferPoolResetLeak(t *testing.T) {
	pool := NewBufferPool(8192) // 8KB pool

	var m1, m2 runtime.MemStats
	runtime.GC()
	time.Sleep(10 * time.Millisecond)
	runtime.ReadMemStats(&m1)

	// 模拟频繁的小 Buffer 分配，导致池多次重置
	// 每次分配 100 bytes，8KB 池可容纳 ~81 个
	// 分配 1000 个会导致 ~12 次池重置
	allocCount := 1000
	resetExpected := allocCount * 100 / 8192 // ~12 次

	var buffers [][]byte
	for i := 0; i < allocCount; i++ {
		buf, _ := pool.Alloc(100)
		buffers = append(buffers, buf) // 保持引用，防止 GC
	}

	// 触发 GC
	runtime.GC()
	time.Sleep(10 * time.Millisecond)
	runtime.ReadMemStats(&m2)

	allocDiff := int64(m2.Alloc) - int64(m1.Alloc)
	expectedMin := int64(allocCount * 100)                // 最少：所有 buffer 的实际数据
	expectedMax := int64(resetExpected * 8192)            // 最多：所有池的总大小
	actualPoolOverhead := allocDiff - expectedMin

	t.Logf("========================================")
	t.Logf("BufferPool 重置内存测试")
	t.Logf("========================================")
	t.Logf("分配次数: %d 次 × 100 bytes", allocCount)
	t.Logf("预期池重置次数: ~%d 次", resetExpected)
	t.Logf("")
	t.Logf("内存统计:")
	t.Logf("  初始内存: %.2f KB", float64(m1.Alloc)/1024)
	t.Logf("  执行后内存: %.2f KB", float64(m2.Alloc)/1024)
	t.Logf("  内存增长: %.2f KB", float64(allocDiff)/1024)
	t.Logf("")
	t.Logf("期望范围:")
	t.Logf("  最小 (仅数据): %.2f KB", float64(expectedMin)/1024)
	t.Logf("  最大 (所有池): %.2f KB", float64(expectedMax)/1024)
	t.Logf("")
	t.Logf("池开销: %.2f KB", float64(actualPoolOverhead)/1024)

	// 判断是否存在严重的内存累积
	if actualPoolOverhead > expectedMax {
		t.Errorf("❌ 池开销过大: %.2f KB > %.2f KB",
			float64(actualPoolOverhead)/1024, float64(expectedMax)/1024)
	} else if actualPoolOverhead > expectedMax/2 {
		t.Logf("⚠️  池开销中等: %.2f KB (可接受)", float64(actualPoolOverhead)/1024)
	} else {
		t.Logf("✅ 池开销正常: %.2f KB (GC 工作良好)", float64(actualPoolOverhead)/1024)
	}
}

// TestBufferPoolConcurrentReset 并发场景下的池重置
func TestBufferPoolConcurrentReset(t *testing.T) {
	pool := NewBufferPool(8192)

	var m1, m2 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)

	// 并发分配，模拟多个 goroutine 同时使用池
	goroutines := 10
	allocPerGoroutine := 100
	var wg sync.WaitGroup

	for g := 0; g < goroutines; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < allocPerGoroutine; i++ {
				pool.Alloc(100)
				// 不保留引用，模拟短生命周期
			}
		}()
	}

	wg.Wait()
	runtime.GC()
	time.Sleep(50 * time.Millisecond)
	runtime.ReadMemStats(&m2)

	allocDiff := int64(m2.Alloc) - int64(m1.Alloc)

	t.Logf("========================================")
	t.Logf("并发池使用测试")
	t.Logf("========================================")
	t.Logf("并发数: %d goroutines", goroutines)
	t.Logf("每个协程分配: %d 次 × 100 bytes", allocPerGoroutine)
	t.Logf("总分配: %d 次", goroutines*allocPerGoroutine)
	t.Logf("")
	t.Logf("内存增长: %.2f KB", float64(allocDiff)/1024)

	// 并发场景下，短生命周期的分配应该被 GC 回收
	if allocDiff > 100*1024 { // 100KB
		t.Logf("⚠️  内存未完全回收: %.2f KB", float64(allocDiff)/1024)
	} else {
		t.Logf("✅ 内存正常回收: %.2f KB", float64(allocDiff)/1024)
	}
}

// TestBufferPoolFragmentation 测试池碎片化问题
func TestBufferPoolFragmentation(t *testing.T) {
	pool := NewBufferPool(8192)

	// 场景：交替分配大小不同的 buffer
	// 这会导致池频繁重置，产生碎片
	var m1, m2 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)

	iterations := 500
	var buffers [][]byte

	for i := 0; i < iterations; i++ {
		// 交替分配小(100B)和中(2KB)的 buffer
		if i%2 == 0 {
			buf, _ := pool.Alloc(100)
			buffers = append(buffers, buf)
		} else {
			buf, _ := pool.Alloc(2048)
			buffers = append(buffers, buf)
		}
	}

	runtime.GC()
	time.Sleep(10 * time.Millisecond)
	runtime.ReadMemStats(&m2)

	allocDiff := int64(m2.Alloc) - int64(m1.Alloc)
	actualData := int64((iterations/2)*100 + (iterations/2)*2048) // ~537 KB
	overhead := allocDiff - actualData

	t.Logf("========================================")
	t.Logf("池碎片化测试")
	t.Logf("========================================")
	t.Logf("迭代次数: %d (交替 100B 和 2KB)", iterations)
	t.Logf("")
	t.Logf("实际数据大小: %.2f KB", float64(actualData)/1024)
	t.Logf("内存增长: %.2f KB", float64(allocDiff)/1024)
	t.Logf("池开销: %.2f KB (%.1f%%)",
		float64(overhead)/1024,
		float64(overhead)/float64(actualData)*100)

	// 开销应该 < 50%
	if overhead > actualData/2 {
		t.Logf("⚠️  碎片化严重，开销 > 50%%")
	} else {
		t.Logf("✅ 碎片化可接受，开销 < 50%%")
	}
}

// TestBufferPoolLongRunning 长时间运行场景
func TestBufferPoolLongRunning(t *testing.T) {
	pool := NewBufferPool(8192)

	var m1, m2, m3 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)

	// 模拟长时间运行，持续分配和释放
	rounds := 10
	allocPerRound := 100

	for round := 0; round < rounds; round++ {
		var buffers [][]byte

		// 分配
		for i := 0; i < allocPerRound; i++ {
			buf, _ := pool.Alloc(100)
			buffers = append(buffers, buf)
		}

		// 使用（模拟）
		for _, buf := range buffers {
			_ = buf[0] // 访问，防止编译器优化掉
		}

		// 释放（让 GC 回收）
		buffers = nil
		runtime.GC()

		if round == 0 {
			runtime.ReadMemStats(&m2) // 第一轮后
		}
	}

	runtime.GC()
	time.Sleep(10 * time.Millisecond)
	runtime.ReadMemStats(&m3) // 所有轮次后

	firstRoundGrowth := int64(m2.Alloc) - int64(m1.Alloc)
	totalGrowth := int64(m3.Alloc) - int64(m1.Alloc)

	t.Logf("========================================")
	t.Logf("长时间运行测试")
	t.Logf("========================================")
	t.Logf("运行轮次: %d", rounds)
	t.Logf("每轮分配: %d 次 × 100 bytes", allocPerRound)
	t.Logf("")
	t.Logf("第1轮后内存增长: %.2f KB", float64(firstRoundGrowth)/1024)
	t.Logf("第%d轮后内存增长: %.2f KB", rounds, float64(totalGrowth)/1024)
	t.Logf("")

	// 判断是否有累积（考虑负增长的情况）
	absFirst := firstRoundGrowth
	if absFirst < 0 {
		absFirst = -absFirst
	}
	absTotal := totalGrowth
	if absTotal < 0 {
		absTotal = -absTotal
	}

	if totalGrowth > 0 && totalGrowth > absFirst*2 {
		t.Errorf("❌ 内存持续累积: %.2f KB -> %.2f KB",
			float64(firstRoundGrowth)/1024, float64(totalGrowth)/1024)
	} else if totalGrowth > 0 && totalGrowth > absFirst*3/2 {
		t.Logf("⚠️  轻微累积: %.2f KB -> %.2f KB",
			float64(firstRoundGrowth)/1024, float64(totalGrowth)/1024)
	} else {
		t.Logf("✅ 无明显累积: %.2f KB -> %.2f KB (GC 工作正常)",
			float64(firstRoundGrowth)/1024, float64(totalGrowth)/1024)
	}
}

// TestBufferPoolVsDirectAlloc 对比池分配和直接分配
func TestBufferPoolVsDirectAlloc(t *testing.T) {
	allocCount := 1000
	allocSize := 100

	// 测试1: 使用池
	pool := NewBufferPool(8192)
	var m1, m2 runtime.MemStats

	runtime.GC()
	runtime.ReadMemStats(&m1)

	var poolBuffers [][]byte
	for i := 0; i < allocCount; i++ {
		buf, _ := pool.Alloc(allocSize)
		poolBuffers = append(poolBuffers, buf)
	}

	runtime.ReadMemStats(&m2)
	poolAlloc := int64(m2.Alloc) - int64(m1.Alloc)

	// 测试2: 直接分配
	runtime.GC()
	runtime.ReadMemStats(&m1)

	var directBuffers [][]byte
	for i := 0; i < allocCount; i++ {
		buf := make([]byte, allocSize)
		directBuffers = append(directBuffers, buf)
	}

	runtime.ReadMemStats(&m2)
	directAlloc := int64(m2.Alloc) - int64(m1.Alloc)

	t.Logf("========================================")
	t.Logf("池分配 vs 直接分配对比")
	t.Logf("========================================")
	t.Logf("分配次数: %d 次 × %d bytes", allocCount, allocSize)
	t.Logf("")
	t.Logf("池分配内存: %.2f KB", float64(poolAlloc)/1024)
	t.Logf("直接分配内存: %.2f KB", float64(directAlloc)/1024)
	t.Logf("")

	if poolAlloc < directAlloc {
		savings := float64(directAlloc-poolAlloc) / float64(directAlloc) * 100
		t.Logf("✅ 池分配节省: %.1f%%", savings)
	} else if poolAlloc > directAlloc*2 {
		overhead := float64(poolAlloc-directAlloc) / float64(directAlloc) * 100
		t.Errorf("❌ 池分配开销过大: +%.1f%%", overhead)
	} else {
		overhead := float64(poolAlloc-directAlloc) / float64(directAlloc) * 100
		t.Logf("⚠️  池分配略高: +%.1f%% (可接受)", overhead)
	}
}

// BenchmarkBufferPoolAlloc benchmark 池分配
func BenchmarkBufferPoolAlloc(b *testing.B) {
	pool := NewBufferPool(8192)
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		pool.Alloc(100)
	}
}

// BenchmarkDirectAlloc benchmark 直接分配
func BenchmarkDirectAlloc(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = make([]byte, 100)
	}
}

// BenchmarkBufferPoolConcurrent benchmark 并发池分配
func BenchmarkBufferPoolConcurrent(b *testing.B) {
	pool := NewBufferPool(8192)
	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			pool.Alloc(100)
		}
	})
}

// TestBufferPoolSummary 总结测试
func TestBufferPoolSummary(t *testing.T) {
	fmt.Println("\n========================================")
	fmt.Println("BufferPool 8KB 池限制问题分析")
	fmt.Println("========================================")
	fmt.Println()
	fmt.Println("问题描述:")
	fmt.Println("  每次池空间不足时创建新的 8KB 池")
	fmt.Println("  bp.pool = make([]byte, bp.poolSize)")
	fmt.Println("  旧池依赖 GC 回收，可能累积")
	fmt.Println()
	fmt.Println("理论风险:")
	fmt.Println("  1000 次池重置 × 8KB = 8MB 临时内存")
	fmt.Println("  高频小 Buffer 分配场景")
	fmt.Println()
	fmt.Println("缓解机制:")
	fmt.Println("  1. 大 Buffer (>4KB) 不使用池，直接分配")
	fmt.Println("  2. Go GC 会回收未引用的旧池")
	fmt.Println("  3. 池大小固定 8KB，开销可控")
	fmt.Println()
	fmt.Println("运行所有测试以验证实际影响...")
	fmt.Println("========================================")
}
