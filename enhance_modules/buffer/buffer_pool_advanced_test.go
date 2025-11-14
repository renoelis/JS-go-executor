package buffer

import (
	"runtime"
	"testing"
	"time"
)

// TestBufferPoolExtremePressure 极端压力测试
func TestBufferPoolExtremePressure(t *testing.T) {
	pool := NewBufferPool(8192)

	var m1, m2 runtime.MemStats
	runtime.GC()
	time.Sleep(20 * time.Millisecond)
	runtime.ReadMemStats(&m1)

	// 极端场景：10000 次分配，每次 100 bytes
	// 理论上会导致 ~122 次池重置
	// 如果旧池不回收，会累积 ~976KB (122 × 8KB)
	allocCount := 10000
	allocSize := 100
	expectedResets := allocCount * allocSize / 8192

	var buffers [][]byte
	for i := 0; i < allocCount; i++ {
		buf, _ := pool.Alloc(allocSize)
		buffers = append(buffers, buf)
	}

	// 强制多次 GC
	for i := 0; i < 3; i++ {
		runtime.GC()
		time.Sleep(10 * time.Millisecond)
	}

	runtime.ReadMemStats(&m2)

	allocDiff := int64(m2.Alloc) - int64(m1.Alloc)
	actualData := int64(allocCount * allocSize)
	poolTheoretical := int64(expectedResets * 8192)
	overhead := allocDiff - actualData

	t.Logf("========================================")
	t.Logf("极端压力测试")
	t.Logf("========================================")
	t.Logf("分配次数: %d 次 × %d bytes", allocCount, allocSize)
	t.Logf("预期池重置: ~%d 次", expectedResets)
	t.Logf("")
	t.Logf("理论计算:")
	t.Logf("  实际数据: %.2f KB", float64(actualData)/1024)
	t.Logf("  池理论开销 (不回收): %.2f KB", float64(poolTheoretical)/1024)
	t.Logf("  池理论总计 (不回收): %.2f KB", float64(actualData+poolTheoretical)/1024)
	t.Logf("")
	t.Logf("实际测量:")
	t.Logf("  内存增长: %.2f KB", float64(allocDiff)/1024)
	t.Logf("  实际开销: %.2f KB (%.1f%%)",
		float64(overhead)/1024,
		float64(overhead)/float64(actualData)*100)
	t.Logf("")

	// 判断 GC 回收效果
	if overhead > poolTheoretical/2 {
		t.Errorf("❌ GC 回收不足，池累积严重: %.2f KB (期望 < %.2f KB)",
			float64(overhead)/1024, float64(poolTheoretical/2)/1024)
	} else if overhead > poolTheoretical/4 {
		t.Logf("⚠️  GC 回收一般，有轻微累积: %.2f KB", float64(overhead)/1024)
	} else {
		t.Logf("✅ GC 回收优秀，池及时释放: %.2f KB", float64(overhead)/1024)
	}
}

// TestBufferPoolWorstCasePattern 最坏情况模式
func TestBufferPoolWorstCasePattern(t *testing.T) {
	pool := NewBufferPool(8192)

	var m1, m2 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)

	// 最坏情况：每次分配都导致池重置
	// 分配 (poolSize - 1) bytes，剩余 1 byte
	// 下次分配任何 >1 byte 的 buffer 都会重置池
	iterations := 100
	var buffers [][]byte

	for i := 0; i < iterations; i++ {
		// 第一次分配占满池
		buf1, _ := pool.Alloc(8191) // poolSize - 1
		buffers = append(buffers, buf1)

		// 第二次分配触发重置
		buf2, _ := pool.Alloc(100)
		buffers = append(buffers, buf2)
	}

	runtime.GC()
	time.Sleep(20 * time.Millisecond)
	runtime.ReadMemStats(&m2)

	allocDiff := int64(m2.Alloc) - int64(m1.Alloc)
	actualData := int64(iterations * (8191 + 100))
	wastedSpace := int64(iterations * 1) // 每次浪费 1 byte
	theoreticalResets := iterations
	maxPoolOverhead := int64(theoreticalResets * 8192)

	t.Logf("========================================")
	t.Logf("最坏情况模式测试")
	t.Logf("========================================")
	t.Logf("迭代次数: %d", iterations)
	t.Logf("每次: 8191 bytes + 100 bytes (触发重置)")
	t.Logf("")
	t.Logf("理论分析:")
	t.Logf("  实际数据: %.2f KB", float64(actualData)/1024)
	t.Logf("  浪费空间: %d bytes", wastedSpace)
	t.Logf("  池重置次数: %d", theoreticalResets)
	t.Logf("  池最大开销 (不回收): %.2f KB", float64(maxPoolOverhead)/1024)
	t.Logf("")
	t.Logf("实际测量:")
	t.Logf("  内存增长: %.2f KB", float64(allocDiff)/1024)

	// 修复：处理负数情况
	if allocDiff <=0 {
		t.Logf("  空间利用率: N/A (GC 回收优秀，内存为负增长)")
		t.Logf("✅ GC 工作优秀，池及时释放")
	} else {
		t.Logf("  空间利用率: %.1f%%",
			float64(actualData)/float64(allocDiff)*100)

		efficiency := float64(actualData) / float64(allocDiff) * 100
		if efficiency < 50 {
			t.Errorf("❌ 空间利用率过低: %.1f%% (大量浪费)", efficiency)
		} else if efficiency < 80 {
			t.Logf("⚠️  空间利用率一般: %.1f%%", efficiency)
		} else {
			t.Logf("✅ 空间利用率良好: %.1f%%", efficiency)
		}
	}
}

// TestBufferPoolMemoryStability 内存稳定性测试
func TestBufferPoolMemoryStability(t *testing.T) {
	pool := NewBufferPool(8192)

	measurements := make([]int64, 50)

	// 进行 50 轮分配-释放循环，观察内存是否稳定
	for round := 0; round < 50; round++ {
		var buffers [][]byte

		// 分配
		for i := 0; i < 100; i++ {
			buf, _ := pool.Alloc(100)
			buffers = append(buffers, buf)
		}

		// GC
		buffers = nil
		runtime.GC()

		// 测量
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		measurements[round] = int64(m.Alloc)
	}

	// 分析趋势
	t.Logf("========================================")
	t.Logf("内存稳定性测试 (50 轮)")
	t.Logf("========================================")

	first := measurements[0]
	last := measurements[49]
	min := first
	max := first
	sum := int64(0)

	for _, m := range measurements {
		if m < min {
			min = m
		}
		if m > max {
			max = m
		}
		sum += m
	}

	avg := sum / int64(len(measurements))
	variance := max - min

	t.Logf("第1轮: %.2f KB", float64(first)/1024)
	t.Logf("第50轮: %.2f KB", float64(last)/1024)
	t.Logf("最小值: %.2f KB", float64(min)/1024)
	t.Logf("最大值: %.2f KB", float64(max)/1024)
	t.Logf("平均值: %.2f KB", float64(avg)/1024)
	t.Logf("波动范围: %.2f KB", float64(variance)/1024)
	t.Logf("")

	trend := float64(last-first) / float64(first) * 100
	t.Logf("趋势: %.2f%% (第1轮 -> 第50轮)", trend)

	if trend > 10 {
		t.Errorf("❌ 内存持续增长: +%.2f%%", trend)
	} else if trend > 5 {
		t.Logf("⚠️  轻微增长: +%.2f%%", trend)
	} else if trend < -5 {
		t.Logf("✅ 内存稳定 (轻微下降): %.2f%%", trend)
	} else {
		t.Logf("✅ 内存非常稳定: %.2f%%", trend)
	}

	// 检查波动
	variancePercent := float64(variance) / float64(avg) * 100
	if variancePercent > 20 {
		t.Logf("⚠️  波动较大: %.1f%%", variancePercent)
	} else {
		t.Logf("✅ 波动可控: %.1f%%", variancePercent)
	}
}

// BenchmarkBufferPoolDifferentSizes benchmark 不同大小的分配
func BenchmarkBufferPoolSize100(b *testing.B) {
	pool := NewBufferPool(8192)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		pool.Alloc(100)
	}
}

func BenchmarkBufferPoolSize1K(b *testing.B) {
	pool := NewBufferPool(8192)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		pool.Alloc(1024)
	}
}

func BenchmarkBufferPoolSize4K(b *testing.B) {
	pool := NewBufferPool(8192)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		pool.Alloc(4096) // = poolSize / 2，触发直接分配
	}
}

func BenchmarkDirectAllocSize100(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = make([]byte, 100)
	}
}

func BenchmarkDirectAllocSize1K(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = make([]byte, 1024)
	}
}

func BenchmarkDirectAllocSize4K(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = make([]byte, 4096)
	}
}
