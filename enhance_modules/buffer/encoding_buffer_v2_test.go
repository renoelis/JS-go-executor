package buffer

import (
	"runtime"
	"sync"
	"testing"
)

// ===========================
// V2 版本测试（分级池）
// ===========================

// 辅助函数：从 v2 实现获取 buffer (模拟)
func getEncodingBufferV2(size int) *encodingBuffer {
	poolIdx := selectPoolIndex(size)
	buf := encodingPools[poolIdx].pool.Get().(*encodingBuffer)

	buf.released.Store(false)
	buf.refs.Store(1)

	expectedCap := encodingPools[poolIdx].capacity
	if cap(buf.data) != expectedCap {
		buf.data = make([]byte, size, expectedCap)
	} else if size > cap(buf.data) {
		buf.data = make([]byte, size)
	} else {
		buf.data = buf.data[:size]
	}

	return buf
}

// 辅助函数：归还 buffer (模拟)
func putEncodingBufferV2(buf *encodingBuffer) {
	if buf.released.Load() {
		return
	}

	if buf.refs.Add(-1) != 0 {
		return
	}

	if buf.released.CompareAndSwap(false, true) {
		// mmapRes 字段已被移除，不再需要检查

		bufCap := cap(buf.data)
		poolIdx := selectPoolIndex(bufCap)
		expectedCap := encodingPools[poolIdx].capacity

		if bufCap == expectedCap {
			encodingPools[poolIdx].pool.Put(buf)
		}
	}
}

// 1. 测试 V2 版本的边界浪费
func TestEncodingBufferV2_BoundaryWaste(t *testing.T) {
	// 关键边界测试用例
	testCases := []struct {
		size         int
		expectedPool string
		maxWastePercent float64
	}{
		{63 * 1024, "64KB", 1.6},
		{64 * 1024, "64KB", 0.0},
		{65 * 1024, "128KB", 49.2},  // 最坏情况
		{128 * 1024, "128KB", 0.0},
		{512 * 1024, "512KB", 0.0},
		{1024 * 1024, "1MB", 0.0},
		{2 * 1024 * 1024, "2MB", 0.0},
		{5 * 1024 * 1024, "10MB", 50.0},  // 最坏情况
	}

	t.Logf("V2 版本边界情况分析 (关键边界):")

	maxWaste := 0.0
	for _, tc := range testCases {
		buf := getEncodingBufferV2(tc.size)
		actualCap := cap(buf.data)
		waste := actualCap - tc.size
		wastePercent := float64(waste) / float64(actualCap) * 100

		if wastePercent > maxWaste {
			maxWaste = wastePercent
		}

		t.Logf("  - %dKB: cap=%dKB (%s), 浪费 %dKB (%.1f%%)",
			tc.size/1024, actualCap/1024, tc.expectedPool, waste/1024, wastePercent)

		if wastePercent > tc.maxWastePercent+1.0 { // 允许 1% 误差
			t.Errorf("    ❌ 浪费率过高: %.1f%% > %.1f%%", wastePercent, tc.maxWastePercent)
		}

		putEncodingBufferV2(buf)
	}

	t.Logf("\n最坏情况浪费率: %.1f%%", maxWaste)

	// 真实场景分布测试 (80% 小, 15% 中, 5% 大)
	t.Logf("\n真实场景分布测试 (80%%小 + 15%%中 + 5%%大):")

	sizeDistribution := []struct{
		size int
		weight int
	}{
		{4 * 1024, 20},    // 4KB: 20%
		{16 * 1024, 30},   // 16KB: 30%
		{32 * 1024, 30},   // 32KB: 30%
		{128 * 1024, 10},  // 128KB: 10%
		{512 * 1024, 5},   // 512KB: 5%
		{2 * 1024 * 1024, 5}, // 2MB: 5%
	}

	totalWaste := 0
	totalCap := 0

	for _, dist := range sizeDistribution {
		buf := getEncodingBufferV2(dist.size)
		actualCap := cap(buf.data)
		waste := actualCap - dist.size

		// 按权重计算
		totalWaste += waste * dist.weight
		totalCap += actualCap * dist.weight

		putEncodingBufferV2(buf)
	}

	avgWaste := float64(totalWaste) / float64(totalCap) * 100
	t.Logf("  - 加权平均浪费率: %.2f%%", avgWaste)

	if avgWaste > 10.0 {
		t.Errorf("❌ 加权平均浪费率过高: %.2f%% > 10%%", avgWaste)
	} else {
		t.Logf("✅ 加权平均浪费率合格 (< 10%%)")
	}
}

// 2. 测试 V2 版本的池容量退化修复
func TestEncodingBufferV2_NoCapacityDegradation(t *testing.T) {
	// 场景：分配 65KB, 归还, 然后分配 1MB
	// 期望：1MB 分配应该使用正确容量的 buffer

	// 第一次：65KB
	buf1 := getEncodingBufferV2(65 * 1024)
	if cap(buf1.data) != 128*1024 {
		t.Errorf("❌ 65KB 分配容量错误: %dKB (期望 128KB)", cap(buf1.data)/1024)
	} else {
		t.Logf("✅ 65KB 分配容量正确: 128KB")
	}
	putEncodingBufferV2(buf1)

	// 第二次：1MB (应该从 1MB 池获取，而不是 128KB 池)
	buf2 := getEncodingBufferV2(1024 * 1024)
	if cap(buf2.data) != 1024*1024 {
		t.Errorf("❌ 1MB 分配容量错误: %dKB (期望 1024KB)", cap(buf2.data)/1024)
	} else {
		t.Logf("✅ 1MB 分配容量正确: 1024KB")
	}
	putEncodingBufferV2(buf2)

	// 第三次：再次分配 65KB，验证池中的 buffer 容量正确
	buf3 := getEncodingBufferV2(65 * 1024)
	if cap(buf3.data) != 128*1024 {
		t.Errorf("❌ 65KB 二次分配容量错误: %dKB (期望 128KB)", cap(buf3.data)/1024)
	} else {
		t.Logf("✅ 65KB 二次分配容量正确: 128KB")
	}
	putEncodingBufferV2(buf3)
}

// 3. 测试 V2 版本的内存泄漏修复
func TestEncodingBufferV2_NoMemoryLeak(t *testing.T) {
	runtime.GC()
	var m1 runtime.MemStats
	runtime.ReadMemStats(&m1)

	// 分配并归还 1000 个 1MB buffer
	for i := 0; i < 1000; i++ {
		buf := getEncodingBufferV2(1024 * 1024)
		putEncodingBufferV2(buf)
	}

	runtime.GC()
	var m2 runtime.MemStats
	runtime.ReadMemStats(&m2)

	allocDelta := int64(m2.Alloc) - int64(m1.Alloc)

	t.Logf("V2 版本内存泄漏测试:")
	t.Logf("  - 常驻内存增长: %.2f MB", float64(allocDelta)/1024/1024)

	// V2 版本应该 < 10MB
	if allocDelta > 10*1024*1024 {
		t.Errorf("❌ V2 内存泄漏: %.2f MB (预期 < 10MB)", float64(allocDelta)/1024/1024)
	} else {
		t.Logf("✅ V2 内存回收正常")
	}
}

// 4. 性能对比：V2 vs 当前实现
func BenchmarkEncodingBuffer_V2_MixedSizes(b *testing.B) {
	sizes := []int{
		63 * 1024,
		65 * 1024,
		512 * 1024,
		1024 * 1024,
		10 * 1024 * 1024,
	}

	b.ReportAllocs()
	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			size := sizes[i%len(sizes)]
			i++

			buf := getEncodingBufferV2(size)
			_ = buf.data
			putEncodingBufferV2(buf)
		}
	})
}

// 5. 并发安全性测试
func TestEncodingBufferV2_ConcurrentSafety(t *testing.T) {
	const numGoroutines = 100
	const numOpsPerGoroutine = 1000

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer wg.Done()

			for j := 0; j < numOpsPerGoroutine; j++ {
				// 随机大小
				size := (id*1000 + j) % (10 * 1024 * 1024)
				if size < 1024 {
					size = 1024
				}

				buf := getEncodingBufferV2(size)
				_ = buf.data
				putEncodingBufferV2(buf)
			}
		}(i)
	}

	wg.Wait()
	t.Logf("✅ 并发测试通过 (100 goroutines × 1000 ops)")
}

// 6. 真实场景测试：80% 小数据, 15% 中数据, 5% 大数据
func BenchmarkEncodingBufferV2_RealisticWorkload(b *testing.B) {
	b.ReportAllocs()
	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			var size int
			mod := i % 100
			i++

			if mod < 80 {
				// 80%: 1KB-64KB
				size = (1 + mod%64) * 1024
			} else if mod < 95 {
				// 15%: 64KB-2MB
				size = (64 + (mod-80)*128) * 1024
			} else {
				// 5%: 2MB-10MB
				size = (2 + (mod-95)*2) * 1024 * 1024
			}

			buf := getEncodingBufferV2(size)
			_ = buf.data
			putEncodingBufferV2(buf)
		}
	})
}

// 7. 对比测试：V2 vs 当前实现 (内存碎片)
func TestEncodingBufferV2_FragmentationComparison(t *testing.T) {
	sizes := []int{
		63 * 1024,
		65 * 1024,
		512 * 1024,
		1024 * 1024,
		10 * 1024 * 1024,
	}

	t.Logf("内存碎片对比 (V2 vs 当前):")
	t.Logf("%-10s | %-15s | %-15s | %-15s", "Size", "Current Waste", "V2 Waste", "Improvement")
	t.Logf("-----------|-----------------|-----------------|----------------")

	for _, size := range sizes {
		// 当前实现的浪费
		var currentWaste int
		switch {
		case size < 64*1024:
			currentWaste = 64*1024 - size
		case size < 2*1024*1024:
			currentWaste = 2*1024*1024 - size
		default:
			currentWaste = 10*1024*1024 - size
		}

		// V2 实现的浪费
		buf := getEncodingBufferV2(size)
		v2Waste := cap(buf.data) - size
		putEncodingBufferV2(buf)

		// 计算改进比例
		improvement := float64(currentWaste-v2Waste) / float64(currentWaste) * 100
		if currentWaste == 0 {
			improvement = 0
		}

		t.Logf("%-10d | %-15d | %-15d | %.1f%%",
			size, currentWaste, v2Waste, improvement)
	}
}
