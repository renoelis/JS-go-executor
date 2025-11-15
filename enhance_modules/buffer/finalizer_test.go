package buffer

import (
	"runtime"
	"testing"
	"time"

	"github.com/dop251/goja"
)

// TestFinalizerCleanup 验证 Finalizer 是否正确触发 cleanup
// 🔥 关键洞察：Finalizer 在 Runtime 销毁时触发（不是 ArrayBuffer 销毁时）
// 因为 arrayBufferObject 被 Runtime 持有（通过 Object 引用链）
// 这在实际场景中是正确的：每个请求创建 Runtime，请求结束 Runtime 销毁，Finalizer 批量触发
func TestFinalizerCleanup(t *testing.T) {
	// 用于追踪 cleanup 是否被调用
	cleanupCalled := false

	func() {
		// 创建 runtime
		vm := goja.New()

		// 创建 ArrayBuffer 并注册 cleanup
		cleanup := func() {
			cleanupCalled = true
			t.Log("cleanup 被调用")
		}

		data := make([]byte, 100*1024*1024) // 100MB
		_ = vm.NewArrayBufferWithCleanup(data, cleanup)

		// vm (Runtime) 离开作用域，应该被 GC
		// 这时 arrayBufferObject 也会被 GC，Finalizer 触发
	}()

	// 强制触发 GC（可能需要多次）
	for i := 0; i < 5; i++ {
		runtime.GC()
		time.Sleep(50 * time.Millisecond)
	}

	// 验证 cleanup 是否被调用
	if !cleanupCalled {
		t.Error("Finalizer 未触发 cleanup（Runtime 销毁后应该触发）")
	} else {
		t.Log("✅ Finalizer 正确触发 cleanup")
	}
}

// TestFinalizerNotCalledAfterDetach 验证 detach 后 Finalizer 不会重复调用
func TestFinalizerNotCalledAfterDetach(t *testing.T) {
	cleanupCallCount := 0

	func() {
		vm := goja.New()

		cleanup := func() {
			cleanupCallCount++
			t.Logf("cleanup 被调用，调用次数: %d", cleanupCallCount)
		}

		data := make([]byte, 10*1024*1024) // 10MB
		ab := vm.NewArrayBufferWithCleanup(data, cleanup)

		// 手动 detach（应该调用 cleanup 并清除 Finalizer）
		ab.Detach()
	}()

	// 强制触发 GC
	runtime.GC()
	time.Sleep(100 * time.Millisecond)

	// 验证 cleanup 只被调用一次（detach 时）
	if cleanupCallCount != 1 {
		t.Errorf("cleanup 被调用了 %d 次，预期 1 次", cleanupCallCount)
	} else {
		t.Log("✅ detach 后 Finalizer 正确避免重复调用")
	}
}

// TestMultipleReferencesCleanup 验证多引用场景的 cleanup 行为
func TestMultipleReferencesCleanup(t *testing.T) {
	cleanupCalled := false

	func() {
		vm := goja.New()

		cleanup := func() {
			cleanupCalled = true
			t.Log("cleanup 被调用")
		}

		data := make([]byte, 10*1024*1024) // 10MB
		ab := vm.NewArrayBufferWithCleanup(data, cleanup)

		// 创建多个 TypedArray 视图（但都引用同一个 ArrayBuffer）
		vm.Set("ab", ab)
		_, err := vm.RunString(`
			const view1 = new Uint8Array(ab);
			const view2 = new Uint32Array(ab);
			const view3 = new Float64Array(ab);
		`)
		if err != nil {
			t.Fatal(err)
		}

		// 所有引用离开作用域
	}()

	// 强制触发 GC
	runtime.GC()
	time.Sleep(100 * time.Millisecond)

	// 验证 cleanup 被调用（注意：cleanup 应该只被调用一次）
	if !cleanupCalled {
		t.Error("多引用场景下 Finalizer 未触发 cleanup")
	} else {
		t.Log("✅ 多引用场景下 Finalizer 正确触发 cleanup")
	}
}

// BenchmarkWithFinalizer 性能测试：使用 Finalizer
func BenchmarkWithFinalizer(b *testing.B) {
	for i := 0; i < b.N; i++ {
		func() {
			vm := goja.New()

			cleanup := func() {
				// 模拟 cleanup 操作
			}

			data := make([]byte, 1024*1024) // 1MB
			_ = vm.NewArrayBufferWithCleanup(data, cleanup)

			// ArrayBuffer 离开作用域
		}()
	}

	// 最后触发 GC 清理
	runtime.GC()
}

// BenchmarkWithoutFinalizer 性能测试：不使用 Finalizer（对照组）
func BenchmarkWithoutFinalizer(b *testing.B) {
	for i := 0; i < b.N; i++ {
		func() {
			vm := goja.New()

			data := make([]byte, 1024*1024) // 1MB
			_ = vm.NewArrayBuffer(data)

			// ArrayBuffer 离开作用域
		}()
	}

	// 最后触发 GC 清理
	runtime.GC()
}

// TestFinalizerMemoryRelease 测试 Finalizer 是否真正释放内存
// 🔥 模拟真实场景：每个请求创建 Runtime，请求结束销毁 Runtime
func TestFinalizerMemoryRelease(t *testing.T) {
	const iterations = 10
	cleanupCount := 0

	// 创建多个 Runtime（模拟多个请求）
	for i := 0; i < iterations; i++ {
		func() {
			vm := goja.New()

			cleanup := func() {
				cleanupCount++
			}

			data := make([]byte, 10*1024*1024) // 10MB
			_ = vm.NewArrayBufferWithCleanup(data, cleanup)

			// Runtime 离开作用域（请求结束）
		}()
	}

	// 强制触发多次 GC
	for i := 0; i < 5; i++ {
		runtime.GC()
		time.Sleep(100 * time.Millisecond)
	}

	t.Logf("创建了 %d 个 Runtime/ArrayBuffer，cleanup 被调用了 %d 次", iterations, cleanupCount)

	// 验证大部分 cleanup 被调用
	if float64(cleanupCount)/float64(iterations) < 0.8 {
		t.Errorf("cleanup 调用率过低: %d/%d (%.1f%%)", cleanupCount, iterations, float64(cleanupCount)/float64(iterations)*100)
	} else {
		t.Logf("✅ cleanup 调用率: %d/%d (%.1f%%)", cleanupCount, iterations, float64(cleanupCount)/float64(iterations)*100)
	}
}

// TestFinalizerWithGCPressure 在内存压力下测试 Finalizer
// 🔥 模拟高并发场景：多个请求同时处理
func TestFinalizerWithGCPressure(t *testing.T) {
	cleanupCount := 0
	const iterations = 20

	// 创建大量 Runtime（模拟高并发请求）
	for i := 0; i < iterations; i++ {
		func() {
			vm := goja.New()

			cleanup := func() {
				cleanupCount++
			}

			// 每个 50MB
			data := make([]byte, 50*1024*1024)
			_ = vm.NewArrayBufferWithCleanup(data, cleanup)

			// Runtime 立即离开作用域（请求快速完成）
		}()

		// 每 5 次触发一次 GC
		if i%5 == 4 {
			runtime.GC()
			time.Sleep(10 * time.Millisecond)
		}
	}

	// 最后多次触发 GC
	for i := 0; i < 5; i++ {
		runtime.GC()
		time.Sleep(100 * time.Millisecond)
	}

	t.Logf("内存压力下：创建了 %d 个 Runtime/ArrayBuffer，cleanup 被调用了 %d 次", iterations, cleanupCount)

	// 验证大部分 cleanup 被调用
	if float64(cleanupCount)/float64(iterations) < 0.7 {
		t.Errorf("cleanup 调用率过低: %d/%d (%.1f%%)", cleanupCount, iterations, float64(cleanupCount)/float64(iterations)*100)
	} else {
		t.Logf("✅ cleanup 调用率: %d/%d (%.1f%%)", cleanupCount, iterations, float64(cleanupCount)/float64(iterations)*100)
	}
}
