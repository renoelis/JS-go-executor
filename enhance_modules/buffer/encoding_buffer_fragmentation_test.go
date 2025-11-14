package buffer

import (
	"runtime"
	"sync"
	"testing"
)

// 测试：验证 encodingBuffer 内存碎片问题是否真实存在
// 场景：混合大小的编码操作（63KB, 65KB, 512KB, 1MB, 10MB）

// 1. 测试当前实现的内存碎片情况
func TestEncodingBufferFragmentation_Current(t *testing.T) {
	sizes := []int{
		63 * 1024,   // 63KB -> 使用 smallPool (64KB)
		65 * 1024,   // 65KB -> 使用 mediumPool (2MB) - 浪费 ~1.97MB
		512 * 1024,  // 512KB -> 使用 mediumPool (2MB) - 浪费 ~1.5MB
		1024 * 1024, // 1MB -> 使用 mediumPool (2MB) - 浪费 ~1MB
		10 * 1024 * 1024, // 10MB -> 使用 largePool (10MB) - 刚好
	}

	// 强制 GC，获取基线内存
	runtime.GC()
	var m1 runtime.MemStats
	runtime.ReadMemStats(&m1)

	// 执行 1000 次混合大小的分配和归还
	for i := 0; i < 1000; i++ {
		for _, size := range sizes {
			buf := getEncodingBuffer(size)
			putEncodingBuffer(buf)
		}
	}

	// 强制 GC，获取最终内存
	runtime.GC()
	var m2 runtime.MemStats
	runtime.ReadMemStats(&m2)

	// 计算内存增长
	allocDelta := int64(m2.Alloc) - int64(m1.Alloc)
	sysAllocDelta := int64(m2.TotalAlloc) - int64(m1.TotalAlloc)

	t.Logf("当前实现 (3个固定池):")
	t.Logf("  - 常驻内存增长: %d bytes (%.2f MB)", allocDelta, float64(allocDelta)/1024/1024)
	t.Logf("  - 累计分配: %d bytes (%.2f MB)", sysAllocDelta, float64(sysAllocDelta)/1024/1024)
	t.Logf("  - Pool 容量: smallPool=64KB, mediumPool=2MB, largePool=10MB")
	t.Logf("  - 63KB 浪费: ~1KB (1.6%%)")
	t.Logf("  - 65KB 浪费: ~1.97MB (96.8%%) ⚠️")
	t.Logf("  - 512KB 浪费: ~1.5MB (75.0%%) ⚠️")
	t.Logf("  - 1MB 浪费: ~1MB (50.0%%) ⚠️")
	t.Logf("  - 10MB 浪费: 0 (0%%)")
}

// 2. 模拟细粒度分级池的内存使用
func TestEncodingBufferFragmentation_Graded(t *testing.T) {
	// 模拟 8 级分级池: 8KB, 16KB, 32KB, 64KB, 128KB, 256KB, 512KB, 1MB, 2MB, 10MB
	poolSizes := []int{
		8 * 1024,
		16 * 1024,
		32 * 1024,
		64 * 1024,
		128 * 1024,
		256 * 1024,
		512 * 1024,
		1024 * 1024,
		2 * 1024 * 1024,
		10 * 1024 * 1024,
	}

	// 选择最合适的池（使用二分查找）
	selectPool := func(size int) int {
		for _, capacity := range poolSizes {
			if size <= capacity {
				return capacity
			}
		}
		return poolSizes[len(poolSizes)-1]
	}

	sizes := []int{
		63 * 1024,   // 63KB -> 使用 64KB 池，浪费 1KB (1.6%)
		65 * 1024,   // 65KB -> 使用 128KB 池，浪费 63KB (49.2%)
		512 * 1024,  // 512KB -> 使用 512KB 池，浪费 0 (0%)
		1024 * 1024, // 1MB -> 使用 1MB 池，浪费 0 (0%)
		10 * 1024 * 1024, // 10MB -> 使用 10MB 池，浪费 0 (0%)
	}

	totalWaste := 0
	totalCapacity := 0

	for _, size := range sizes {
		poolCap := selectPool(size)
		waste := poolCap - size
		totalWaste += waste
		totalCapacity += poolCap
		wastePercent := float64(waste) / float64(poolCap) * 100

		t.Logf("  - %dKB -> %dKB pool, 浪费: %dKB (%.1f%%)",
			size/1024, poolCap/1024, waste/1024, wastePercent)
	}

	avgWaste := float64(totalWaste) / float64(totalCapacity) * 100
	t.Logf("\n分级池实现 (10个池):")
	t.Logf("  - 平均浪费率: %.1f%%", avgWaste)
	t.Logf("  - 最大浪费: 63KB (65KB 分配)")
}

// 3. 并发压测：验证是否存在实际性能问题
func BenchmarkEncodingBuffer_MixedSizes_Current(b *testing.B) {
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

			buf := getEncodingBuffer(size)
			// 模拟使用
			_ = buf.data
			putEncodingBuffer(buf)
		}
	})
}

// 4. 模拟分级池的性能
func BenchmarkEncodingBuffer_MixedSizes_Graded(b *testing.B) {
	// 创建 10 个分级池
	pools := make([]sync.Pool, 10)
	poolSizes := []int{
		8 * 1024,
		16 * 1024,
		32 * 1024,
		64 * 1024,
		128 * 1024,
		256 * 1024,
		512 * 1024,
		1024 * 1024,
		2 * 1024 * 1024,
		10 * 1024 * 1024,
	}

	for i, size := range poolSizes {
		capacity := size
		pools[i] = sync.Pool{
			New: func() interface{} {
				return &encodingBuffer{
					data: make([]byte, 0, capacity),
				}
			},
		}
	}

	selectPoolIdx := func(size int) int {
		for i, capacity := range poolSizes {
			if size <= capacity {
				return i
			}
		}
		return len(poolSizes) - 1
	}

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

			poolIdx := selectPoolIdx(size)
			buf := pools[poolIdx].Get().(*encodingBuffer)

			if cap(buf.data) < size {
				buf.data = make([]byte, size)
			} else {
				buf.data = buf.data[:size]
			}

			// 模拟使用
			_ = buf.data

			pools[poolIdx].Put(buf)
		}
	})
}

// 5. 真实场景测试：80% 小数据 (< 64KB), 15% 中数据 (64KB-2MB), 5% 大数据 (> 2MB)
func BenchmarkEncodingBuffer_RealisticWorkload_Current(b *testing.B) {
	b.ReportAllocs()
	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			var size int
			mod := i % 100
			i++

			if mod < 80 {
				// 80%: 小数据 1KB-64KB
				size = (1 + mod%64) * 1024
			} else if mod < 95 {
				// 15%: 中数据 64KB-2MB
				size = (64 + (mod-80)*128) * 1024
			} else {
				// 5%: 大数据 2MB-10MB
				size = (2 + (mod-95)*2) * 1024 * 1024
			}

			buf := getEncodingBuffer(size)
			_ = buf.data
			putEncodingBuffer(buf)
		}
	})
}

// 6. 内存泄漏测试：验证 Pool 是否正确回收
func TestEncodingBuffer_PoolRecycling(t *testing.T) {
	runtime.GC()
	var m1 runtime.MemStats
	runtime.ReadMemStats(&m1)

	// 分配并归还 1000 个 buffer
	for i := 0; i < 1000; i++ {
		buf := getEncodingBuffer(1024 * 1024) // 1MB
		putEncodingBuffer(buf)
	}

	runtime.GC()
	var m2 runtime.MemStats
	runtime.ReadMemStats(&m2)

	allocDelta := int64(m2.Alloc) - int64(m1.Alloc)

	// 如果常驻内存增长 > 10MB，说明有泄漏
	if allocDelta > 10*1024*1024 {
		t.Errorf("内存泄漏检测失败: 常驻内存增长 %.2f MB (预期 < 10MB)",
			float64(allocDelta)/1024/1024)
	} else {
		t.Logf("✅ Pool 回收正常: 常驻内存增长 %.2f MB", float64(allocDelta)/1024/1024)
	}
}

// 7. 边界情况测试：验证池切换边界的浪费
func TestEncodingBuffer_BoundaryWaste(t *testing.T) {
	testCases := []struct {
		size          int
		expectedPool  string
		expectedCap   int
		wastePercent  float64
	}{
		{63 * 1024, "small", 64 * 1024, 1.6},         // 边界下方
		{64 * 1024, "small", 64 * 1024, 0.0},         // 边界
		{65 * 1024, "medium", 2 * 1024 * 1024, 96.8}, // 边界上方 - 严重浪费!
		{1024 * 1024, "medium", 2 * 1024 * 1024, 50.0}, // 中等浪费
		{2 * 1024 * 1024, "medium", 2 * 1024 * 1024, 0.0}, // 边界
		{2*1024*1024 + 1, "large", 10 * 1024 * 1024, 80.0}, // 边界上方 - 极度浪费!
	}

	t.Logf("边界情况分析:")
	for _, tc := range testCases {
		buf := getEncodingBuffer(tc.size)
		actualCap := cap(buf.data)
		waste := actualCap - tc.size
		wastePercent := float64(waste) / float64(actualCap) * 100

		t.Logf("  - %dKB: 使用 %s 池 (cap=%dKB), 浪费 %.1f%%",
			tc.size/1024, tc.expectedPool, actualCap/1024, wastePercent)

		if actualCap != tc.expectedCap {
			t.Errorf("    ❌ 容量不符: 期望 %dKB, 实际 %dKB",
				tc.expectedCap/1024, actualCap/1024)
		}

		putEncodingBuffer(buf)
	}
}
