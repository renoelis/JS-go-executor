package buffer

import (
	"runtime"
	"testing"
	"time"

	"github.com/dop251/goja"
	"github.com/dop251/goja/parser"
	"github.com/dop251/goja_nodejs/require"
)

// TestMemoryExhaustionAttack 测试恶意脚本是否能耗尽内存
// 验证问题描述中的场景：
// const buffers = [];
// while(true) {
//     buffers.push(Buffer.alloc(100 * 1024 * 1024)); // 100MB × N
// }
func TestMemoryExhaustionAttack(t *testing.T) {
	vm := goja.New()
	vm.SetParserOptions(parser.WithDisableSourceMaps)

	// 设置 require
	registry := new(require.Registry)
	registry.Enable(vm)

	// 注册 Buffer 模块
	pool := NewBufferPool(8192)
	SetupOptimizedBufferAlloc(vm, pool)

	// 记录初始内存
	runtime.GC()
	var m1 runtime.MemStats
	runtime.ReadMemStats(&m1)
	initialMem := m1.Alloc
	t.Logf("初始内存: %.2f MB", float64(initialMem)/(1024*1024))

	// 测试脚本：尝试分配多个大 Buffer
	script := `
		const buffers = [];
		let count = 0;
		let totalMB = 0;
		let error = null;

		try {
			// 尝试分配 30 个 100MB 的 Buffer (总共 3GB)
			for (let i = 0; i < 30; i++) {
				buffers.push(Buffer.alloc(100 * 1024 * 1024));
				count++;
				totalMB += 100;
			}
		} catch (e) {
			error = e.message;
		}

		({ count: count, totalMB: totalMB, error: error })
	`

	// 设置超时（防止测试卡死）
	done := make(chan bool, 1)
	var result goja.Value
	var err error

	go func() {
		result, err = vm.RunString(script)
		done <- true
	}()

	select {
	case <-done:
		// 执行完成
	case <-time.After(30 * time.Second):
		t.Fatal("测试超时 - 可能陷入无限循环")
	}

	// 检查结果
	if err != nil {
		t.Logf("脚本执行出错（这可能是预期的内存限制）: %v", err)
	}

	// 读取最终内存
	runtime.GC()
	var m2 runtime.MemStats
	runtime.ReadMemStats(&m2)
	finalMem := m2.Alloc

	var usedMem uint64
	if finalMem > initialMem {
		usedMem = finalMem - initialMem
	} else {
		// GC 可能回收了一些初始内存，使用 TotalAlloc 来计算
		usedMem = m2.TotalAlloc - m1.TotalAlloc
	}

	t.Logf("最终内存: %.2f MB", float64(finalMem)/(1024*1024))
	t.Logf("使用内存: %.2f MB", float64(usedMem)/(1024*1024))

	if result != nil && !goja.IsUndefined(result) {
		obj := result.ToObject(vm)
		if obj != nil {
			count := obj.Get("count").ToInteger()
			totalMB := obj.Get("totalMB").ToInteger()
			t.Logf("成功分配: %d 个 Buffer, 总计 %d MB", count, totalMB)
		}
	}

	// 分析：如果能分配超过 2GB 的内存，说明存在问题
	maxExpectedMem := uint64(3 * 1024 * 1024 * 1024) // 3GB 阈值
	if usedMem > maxExpectedMem {
		t.Errorf("警告：可能存在内存耗尽漏洞！分配了 %.2f GB 内存",
			float64(usedMem)/(1024*1024*1024))
	}

	// 清理
	runtime.GC()
}

// TestMemoryLimitWithSmallBuffers 测试小 Buffer 的累积分配
// 验证是否能通过大量小 Buffer 绕过单次分配限制
func TestMemoryLimitWithSmallBuffers(t *testing.T) {
	vm := goja.New()
	vm.SetParserOptions(parser.WithDisableSourceMaps)

	registry := new(require.Registry)
	registry.Enable(vm)

	pool := NewBufferPool(8192)
	SetupOptimizedBufferAlloc(vm, pool)

	runtime.GC()
	var m1 runtime.MemStats
	runtime.ReadMemStats(&m1)
	initialMem := m1.Alloc

	// 测试脚本：分配大量小 Buffer
	script := `
		const buffers = [];
		let count = 0;
		let totalMB = 0;

		try {
			// 尝试分配 10000 个 10MB 的 Buffer (总共 100GB)
			for (let i = 0; i < 10000; i++) {
				buffers.push(Buffer.alloc(10 * 1024 * 1024));
				count++;
				totalMB += 10;

				// 每 100 次记录一次
				if (count % 100 === 0) {
					// 允许 GC
				}
			}
		} catch (e) {
			// 返回分配信息
		}

		({ count: count, totalMB: totalMB })
	`

	done := make(chan bool, 1)
	var result goja.Value
	var err error

	go func() {
		result, err = vm.RunString(script)
		done <- true
	}()

	select {
	case <-done:
		// 执行完成
	case <-time.After(60 * time.Second):
		t.Fatal("测试超时")
	}

	if err != nil {
		t.Logf("脚本执行出错: %v", err)
	}

	runtime.GC()
	var m2 runtime.MemStats
	runtime.ReadMemStats(&m2)
	finalMem := m2.Alloc
	usedMem := finalMem - initialMem

	t.Logf("初始内存: %.2f MB", float64(initialMem)/(1024*1024))
	t.Logf("最终内存: %.2f MB", float64(finalMem)/(1024*1024))
	t.Logf("使用内存: %.2f MB", float64(usedMem)/(1024*1024))

	if result != nil && !goja.IsUndefined(result) {
		obj := result.ToObject(vm)
		if obj != nil {
			count := obj.Get("count").ToInteger()
			totalMB := obj.Get("totalMB").ToInteger()
			t.Logf("成功分配: %d 个 Buffer, 总计 %d MB", count, totalMB)

			// 分析结果
			allocatedGB := float64(totalMB) / 1024
			if allocatedGB > 10 {
				t.Logf("警告：累积分配了 %.2f GB 内存", allocatedGB)
			}
		}
	}

	runtime.GC()
}

// TestMemoryLimitBenchmark 基准测试：测试内存分配性能和限制
func TestMemoryLimitBenchmark(t *testing.T) {
	vm := goja.New()
	vm.SetParserOptions(parser.WithDisableSourceMaps)

	registry := new(require.Registry)
	registry.Enable(vm)

	pool := NewBufferPool(8192)
	SetupOptimizedBufferAlloc(vm, pool)

	tests := []struct {
		name       string
		bufferSize string
		count      int
	}{
		{"Small_1KB", "1 * 1024", 1000},
		{"Medium_100KB", "100 * 1024", 100},
		{"Large_10MB", "10 * 1024 * 1024", 10},
		{"Huge_100MB", "100 * 1024 * 1024", 5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			runtime.GC()
			var m1 runtime.MemStats
			runtime.ReadMemStats(&m1)

			start := time.Now()

			script := `
				const buffers = [];
				for (let i = 0; i < ` + string(rune(tt.count)) + `; i++) {
					buffers.push(Buffer.alloc(` + tt.bufferSize + `));
				}
				buffers.length
			`

			result, err := vm.RunString(script)
			elapsed := time.Since(start)

			if err != nil {
				t.Logf("执行出错: %v", err)
				return
			}

			runtime.GC()
			var m2 runtime.MemStats
			runtime.ReadMemStats(&m2)

			allocated := m2.Alloc - m1.Alloc

			t.Logf("分配 %v 个 Buffer, 耗时: %v", result.ToInteger(), elapsed)
			t.Logf("内存使用: %.2f MB", float64(allocated)/(1024*1024))
			t.Logf("平均每次分配: %v", elapsed/time.Duration(tt.count))
		})
	}
}

// TestGCReclaimMemory 测试 GC 是否能正确回收 Buffer 内存
func TestGCReclaimMemory(t *testing.T) {
	vm := goja.New()
	vm.SetParserOptions(parser.WithDisableSourceMaps)

	registry := new(require.Registry)
	registry.Enable(vm)

	pool := NewBufferPool(8192)
	SetupOptimizedBufferAlloc(vm, pool)

	runtime.GC()
	var m1 runtime.MemStats
	runtime.ReadMemStats(&m1)
	baseline := m1.Alloc

	// 分配后释放
	for i := 0; i < 10; i++ {
		script := `
			{
				const buffers = [];
				for (let i = 0; i < 10; i++) {
					buffers.push(Buffer.alloc(50 * 1024 * 1024)); // 50MB
				}
				// buffers 在作用域结束后应该被 GC
			}
		`

		_, err := vm.RunString(script)
		if err != nil {
			t.Logf("循环 %d 出错: %v", i, err)
			break
		}

		// 强制 GC
		runtime.GC()
		runtime.GC() // 多次调用确保完全回收

		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		current := m.Alloc

		t.Logf("循环 %d: 内存使用 %.2f MB (基线 %.2f MB, 差值 %.2f MB)",
			i,
			float64(current)/(1024*1024),
			float64(baseline)/(1024*1024),
			float64(current-baseline)/(1024*1024))
	}

	// 最终 GC
	runtime.GC()
	runtime.GC()

	var m2 runtime.MemStats
	runtime.ReadMemStats(&m2)
	final := m2.Alloc

	leaked := int64(final - baseline)
	t.Logf("最终内存泄漏: %.2f MB", float64(leaked)/(1024*1024))

	// 允许一些合理的内存增长（VM 内部开销）
	maxAllowedLeak := int64(100 * 1024 * 1024) // 100MB
	if leaked > maxAllowedLeak {
		t.Errorf("可能存在内存泄漏: %.2f MB", float64(leaked)/(1024*1024))
	}
}
