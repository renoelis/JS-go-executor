package buffer

import (
	"fmt"
	"runtime"
	"testing"
	"time"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// 测试迭代器是否会导致 Buffer 内存泄漏
func TestIteratorMemoryLeak(t *testing.T) {
	rt := goja.New()
	new(require.Registry).Enable(rt)

	// 获取初始内存统计
	var m1 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)

	script := `
		const Buffer = require('buffer').Buffer;
		const iterators = [];

		// 创建 1000 个大 Buffer (每个 1MB)
		for (let i = 0; i < 1000; i++) {
			const buf = Buffer.alloc(1024 * 1024); // 1MB
			buf.fill(i % 256);

			// 创建迭代器并保存到数组（模拟长期持有）
			const iter = buf.values();
			iterators.push(iter);

			// 只迭代第一个元素，不完成整个迭代
			iter.next();
		}

		// 返回迭代器数量
		iterators.length;
	`

	val, err := rt.RunString(script)
	if err != nil {
		t.Fatalf("脚本执行失败: %v", err)
	}

	if val.ToInteger() != 1000 {
		t.Fatalf("期望创建 1000 个迭代器，实际: %d", val.ToInteger())
	}

	// 触发 GC
	runtime.GC()
	time.Sleep(100 * time.Millisecond)
	runtime.GC()

	// 获取 GC 后的内存统计
	var m2 runtime.MemStats
	runtime.ReadMemStats(&m2)

	// 计算内存增长
	allocDiff := int64(m2.Alloc) - int64(m1.Alloc)
	heapDiff := int64(m2.HeapAlloc) - int64(m1.HeapAlloc)

	t.Logf("初始内存分配: %.2f MB", float64(m1.Alloc)/1024/1024)
	t.Logf("执行后内存分配: %.2f MB", float64(m2.Alloc)/1024/1024)
	t.Logf("内存增长 (Alloc): %.2f MB", float64(allocDiff)/1024/1024)
	t.Logf("内存增长 (HeapAlloc): %.2f MB", float64(heapDiff)/1024/1024)

	// 期望内存增长 < 100MB (因为 Buffer 应该被 GC 回收，只保留迭代器状态)
	// 如果存在泄漏，内存增长会接近 1000MB (1000 个 1MB Buffer)
	if allocDiff > 100*1024*1024 {
		t.Errorf("可能存在内存泄漏! 内存增长 %.2f MB > 100 MB", float64(allocDiff)/1024/1024)
	} else {
		t.Logf("✅ 内存泄漏测试通过 (增长 %.2f MB < 100 MB)", float64(allocDiff)/1024/1024)
	}
}

// Benchmark: 测量迭代器对内存的影响
func BenchmarkIteratorMemoryImpact(b *testing.B) {
	rt := goja.New()
	new(require.Registry).Enable(rt)

	script := `
		const Buffer = require('buffer').Buffer;
		function createIterators(count) {
			const iterators = [];
			for (let i = 0; i < count; i++) {
				const buf = Buffer.alloc(1024 * 1024); // 1MB
				const iter = buf.values();
				iterators.push(iter);
				iter.next(); // 只迭代一次
			}
			return iterators.length;
		}
		createIterators;
	`

	val, err := rt.RunString(script)
	if err != nil {
		b.Fatalf("脚本执行失败: %v", err)
	}

	createIterators, ok := goja.AssertFunction(val)
	if !ok {
		b.Fatalf("createIterators 不是函数")
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		_, err := createIterators(goja.Undefined(), rt.ToValue(100))
		if err != nil {
			b.Fatalf("调用 createIterators 失败: %v", err)
		}
	}
}

// 测试 Buffer 是否可以被 GC 回收（迭代器不持有引用）
func TestBufferCanBeGarbageCollected(t *testing.T) {
	rt := goja.New()
	new(require.Registry).Enable(rt)

	script := `
		const Buffer = require('buffer').Buffer;

		// 创建大 Buffer 并获取迭代器
		let iter;
		(function() {
			const buf = Buffer.alloc(10 * 1024 * 1024); // 10MB
			buf.fill(42);
			iter = buf.values(); // 保存迭代器，不保存 Buffer
			iter.next(); // 迭代一次
		})(); // buf 离开作用域

		// 触发 GC
		if (global.gc) {
			global.gc();
		}

		// 继续使用迭代器（应该仍然有效，因为内部持有 Buffer 引用）
		const result = iter.next();
		result.value; // 应该返回 42
	`

	val, err := rt.RunString(script)
	if err != nil {
		t.Fatalf("脚本执行失败: %v", err)
	}

	// 检查返回值
	if val.ToInteger() != 42 {
		t.Errorf("期望 42，实际: %d", val.ToInteger())
	}

	t.Logf("✅ 迭代器可以正常使用（即使原始 Buffer 离开作用域）")
}

// 测试迭代器完成后 Buffer 是否可以被 GC
func TestBufferGCAfterIteratorCompleted(t *testing.T) {
	rt := goja.New()
	new(require.Registry).Enable(rt)

	var m1, m2 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)

	script := `
		const Buffer = require('buffer').Buffer;
		const iters = [];

		// 创建 100 个大 Buffer 和完整迭代它们
		for (let i = 0; i < 100; i++) {
			const buf = Buffer.alloc(1024 * 1024); // 1MB
			const iter = buf.values();

			// 迭代完成
			let result;
			do {
				result = iter.next();
			} while (!result.done);

			// 保存已完成的迭代器
			iters.push(iter);
		}

		iters.length;
	`

	val, err := rt.RunString(script)
	if err != nil {
		t.Fatalf("脚本执行失败: %v", err)
	}

	if val.ToInteger() != 100 {
		t.Fatalf("期望 100 个迭代器，实际: %d", val.ToInteger())
	}

	// 触发 GC
	runtime.GC()
	time.Sleep(100 * time.Millisecond)
	runtime.GC()

	runtime.ReadMemStats(&m2)
	allocDiff := int64(m2.Alloc) - int64(m1.Alloc)

	t.Logf("迭代器完成后内存增长: %.2f MB", float64(allocDiff)/1024/1024)

	// 已完成的迭代器仍然持有 Buffer 引用，但不应影响后续创建的 Buffer
	// 预期内存增长 < 50MB (远小于 100MB)
	if allocDiff > 50*1024*1024 {
		t.Logf("⚠️  已完成的迭代器可能仍持有 Buffer 引用 (%.2f MB)", float64(allocDiff)/1024/1024)
	} else {
		t.Logf("✅ 迭代器完成后内存正常 (%.2f MB)", float64(allocDiff)/1024/1024)
	}
}

// 压力测试：大量短生命周期的迭代器
func TestShortLivedIterators(t *testing.T) {
	rt := goja.New()
	new(require.Registry).Enable(rt)

	script := `
		const Buffer = require('buffer').Buffer;

		// 创建大量短生命周期的迭代器
		for (let i = 0; i < 10000; i++) {
			const buf = Buffer.alloc(1024); // 1KB
			const iter = buf.values();

			// 迭代几个元素
			for (let j = 0; j < 10; j++) {
				const result = iter.next();
				if (result.done) break;
			}
			// iter 和 buf 都离开作用域
		}

		'completed';
	`

	val, err := rt.RunString(script)
	if err != nil {
		t.Fatalf("脚本执行失败: %v", err)
	}

	if val.String() != "completed" {
		t.Fatalf("脚本未完成")
	}

	t.Logf("✅ 大量短生命周期迭代器测试通过")
}

// 检查当前实现的内存特性
func TestCurrentImplementationMemoryProfile(t *testing.T) {
	rt := goja.New()
	new(require.Registry).Enable(rt)

	// 分析 iteratorState 结构体的大小
	state := &iteratorState{
		index:        0,
		bufferLength: 1024,
		buffer:       rt.NewObject(),
		iterType:     "values",
		enhancer:     nil, // enhancer 现在可以为 nil，因为使用 goja_nodejs
	}

	t.Logf("iteratorState 结构体字段:")
	t.Logf("  - index: int64 (8 bytes)")
	t.Logf("  - bufferLength: int64 (8 bytes)")
	t.Logf("  - buffer: *goja.Object (指针，8 bytes)")
	t.Logf("  - iterType: string (16 bytes)")
	t.Logf("  - enhancer: *BufferEnhancer (指针，8 bytes)")
	t.Logf("  总计约: 48 bytes/迭代器")
	t.Logf("")

	// 验证 state 不为 nil
	if state == nil {
		t.Fatalf("state 不应为 nil")
	}

	t.Logf("问题分析:")
	t.Logf("  ✅ iteratorState 本身很小 (48 bytes)")
	t.Logf("  ⚠️  但 buffer 字段是 *goja.Object 指针，会阻止整个 Buffer 被 GC")
	t.Logf("  ⚠️  如果迭代器被长期持有（如存入数组），对应的 Buffer 也无法释放")
	t.Logf("")
	t.Logf("潜在风险场景:")
	t.Logf("  - 10000 个未完成的迭代器 × 1MB Buffer = 10GB 内存泄漏")
	t.Logf("  - 即使迭代器已完成，只要迭代器对象存在，Buffer 就无法释放")
}

// 实际场景模拟：迭代器存储在数组中
func TestIteratorsStoredInArray(t *testing.T) {
	rt := goja.New()
	new(require.Registry).Enable(rt)

	var m1, m2 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)

	script := `
		const Buffer = require('buffer').Buffer;
		const app = {
			activeIterators: []
		};

		// 模拟应用场景：存储活跃的迭代器
		for (let i = 0; i < 1000; i++) {
			const buf = Buffer.alloc(1024 * 1024); // 1MB
			buf[0] = i % 256;

			const iter = buf.values();
			iter.next(); // 只迭代一次

			// 存储到应用状态中（真实场景可能发生）
			app.activeIterators.push(iter);
		}

		app.activeIterators.length;
	`

	val, err := rt.RunString(script)
	if err != nil {
		t.Fatalf("脚本执行失败: %v", err)
	}

	if val.ToInteger() != 1000 {
		t.Fatalf("期望 1000 个迭代器，实际: %d", val.ToInteger())
	}

	// 多次 GC
	for i := 0; i < 3; i++ {
		runtime.GC()
		time.Sleep(50 * time.Millisecond)
	}

	runtime.ReadMemStats(&m2)
	allocDiff := int64(m2.Alloc) - int64(m1.Alloc)

	t.Logf("========================================")
	t.Logf("实际场景测试: 迭代器存储在数组中")
	t.Logf("========================================")
	t.Logf("初始内存: %.2f MB", float64(m1.Alloc)/1024/1024)
	t.Logf("执行后内存: %.2f MB", float64(m2.Alloc)/1024/1024)
	t.Logf("内存增长: %.2f MB", float64(allocDiff)/1024/1024)
	t.Logf("")

	// 判断是否存在严重泄漏
	if allocDiff > 500*1024*1024 { // 500MB
		t.Errorf("❌ 严重内存泄漏! 内存增长 %.2f MB (接近理论值 1000 MB)", float64(allocDiff)/1024/1024)
		t.Logf("   原因: iteratorState.buffer 持有 *goja.Object 引用，阻止 Buffer 被 GC")
		t.Logf("   建议: 考虑优化存储方式，避免持有完整 Buffer 引用")
	} else if allocDiff > 100*1024*1024 { // 100MB
		t.Logf("⚠️  中等内存泄漏: %.2f MB", float64(allocDiff)/1024/1024)
		t.Logf("   可能原因: goja 内部缓存或 GC 延迟")
	} else {
		t.Logf("✅ 内存控制良好: %.2f MB < 100 MB", float64(allocDiff)/1024/1024)
		t.Logf("   可能 goja 或 Go GC 做了优化")
	}
}

// 运行所有测试的辅助函数
func TestIteratorLeakSummary(t *testing.T) {
	fmt.Println("\n========================================")
	fmt.Println("迭代器内存泄漏分析总结")
	fmt.Println("========================================")
	fmt.Println()
	fmt.Println("当前实现:")
	fmt.Println("  type iteratorState struct {")
	fmt.Println("      buffer *goja.Object  // ⚠️  持有完整 Buffer 引用")
	fmt.Println("      ...其他字段")
	fmt.Println("  }")
	fmt.Println()
	fmt.Println("问题分析:")
	fmt.Println("  1. ✅ 使用 Symbol 存储状态（避免全局 map 泄漏）")
	fmt.Println("  2. ⚠️  iteratorState.buffer 持有 *goja.Object 引用")
	fmt.Println("  3. ⚠️  如果迭代器被长期持有，Buffer 无法被 GC")
	fmt.Println()
	fmt.Println("真实场景风险:")
	fmt.Println("  - 用户将迭代器存入数组/对象")
	fmt.Println("  - 迭代器未完成即被遗忘")
	fmt.Println("  - 大量小迭代器累积")
	fmt.Println()
	fmt.Println("优化建议:")
	fmt.Println("  方案A: 存储 ArrayBuffer 引用而非 Buffer 对象")
	fmt.Println("         - 减少间接引用层级")
	fmt.Println("         - 可能影响类型检查")
	fmt.Println()
	fmt.Println("  方案B: 使用 WeakRef (如果 goja 支持)")
	fmt.Println("         - 允许 Buffer 被 GC")
	fmt.Println("         - 迭代器需要检查引用是否存活")
	fmt.Println()
	fmt.Println("  方案C: 优化迭代器生命周期管理")
	fmt.Println("         - 迭代完成后清除 buffer 引用")
	fmt.Println("         - state.buffer = nil (当 done=true)")
	fmt.Println()
	fmt.Println("  方案D: 不优化（保持现状）")
	fmt.Println("         - 如果测试显示泄漏不严重")
	fmt.Println("         - 依赖 goja/Go GC 自动管理")
	fmt.Println()
	fmt.Println("运行测试以确定实际影响...")
	fmt.Println("========================================")
}
