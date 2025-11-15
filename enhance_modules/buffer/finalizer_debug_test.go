package buffer

import (
	"runtime"
	"testing"
	"time"

	"github.com/dop251/goja"
)

// TestFinalizerWithDebug 调试 Finalizer 触发情况
func TestFinalizerWithDebug(t *testing.T) {
	cleanupCalled := false

	// 创建一个简单的对象并注册 Finalizer
	obj := &struct{ data []byte }{data: make([]byte, 1024)}

	runtime.SetFinalizer(obj, func(o *struct{ data []byte }) {
		t.Log("简单对象的 Finalizer 被触发")
	})

	// 立即离开作用域
	obj = nil

	// 强制 GC
	runtime.GC()
	time.Sleep(100 * time.Millisecond)

	// 现在测试 goja 的 ArrayBuffer
	func() {
		vm := goja.New()

		cleanup := func() {
			cleanupCalled = true
			t.Log("ArrayBuffer cleanup 被调用")
		}

		data := make([]byte, 10*1024*1024)
		ab := vm.NewArrayBufferWithCleanup(data, cleanup)

		t.Logf("ArrayBuffer 已创建，buf 指针: %p", ab)

		// vm 离开作用域
	}()

	// 多次强制 GC
	for i := 0; i < 10; i++ {
		runtime.GC()
		time.Sleep(100 * time.Millisecond)
		t.Logf("第 %d 次 GC 完成", i+1)
	}

	if cleanupCalled {
		t.Log("✅ Finalizer 触发成功")
	} else {
		t.Log("❌ Finalizer 未触发，可能的原因：")
		t.Log("1. arrayBufferObject 被 Runtime 持有，Runtime 未释放")
		t.Log("2. baseObject 内的 val *Object 形成循环引用")
		t.Log("3. goja 的对象管理机制延迟了 GC")
	}
}

// TestManualGCTrigger 测试是否可以手动触发 cleanup
func TestManualGCTrigger(t *testing.T) {
	t.Log("测试：在实际场景中，Finalizer 在请求结束后是否会触发")

	cleanupCount := 0

	// 模拟 100 个请求
	for i := 0; i < 100; i++ {
		func() {
			vm := goja.New()

			cleanup := func() {
				cleanupCount++
			}

			data := make([]byte, 1*1024*1024) // 1MB（小一点，避免OOM）
			_ = vm.NewArrayBufferWithCleanup(data, cleanup)

			// vm 离开作用域
		}()

		// 每 20 个请求触发一次 GC
		if i%20 == 19 {
			before := cleanupCount
			runtime.GC()
			time.Sleep(50 * time.Millisecond)
			after := cleanupCount
			t.Logf("第 %d 次 GC：cleanup 从 %d 增加到 %d", i/20+1, before, after)
		}
	}

	// 最后强制多次 GC
	for i := 0; i < 10; i++ {
		before := cleanupCount
		runtime.GC()
		time.Sleep(100 * time.Millisecond)
		after := cleanupCount
		if after > before {
			t.Logf("最终 GC %d：cleanup 从 %d 增加到 %d", i+1, before, after)
		}
	}

	t.Logf("最终结果：100 个 Runtime，%d 个 cleanup 被调用 (%.1f%%)",
		cleanupCount, float64(cleanupCount)/100*100)

	if cleanupCount > 0 {
		t.Log("✅ Finalizer 机制有效（至少部分触发）")
	} else {
		t.Log("❌ Finalizer 完全未触发")
	}
}
