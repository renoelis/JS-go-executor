package buffer

import (
	"sync"
	"sync/atomic"
	"testing"
)

// withTestMmapUnmap 在测试中注入 mmapUnmap stub, 用于统计 munmap 调用次数
func withTestMmapUnmap(t *testing.T, fn func(unmapCount *int32)) {
	t.Helper()

	original := mmapUnmap
	defer func() {
		mmapUnmap = original
	}()

	var count int32
	mmapUnmap = func(b []byte) error {
		atomic.AddInt32(&count, 1)
		return nil
	}

	fn(&count)
}

// TestMmapResourceConcurrentRelease 验证并发 Release 只会触发一次 munmap 且 refCount 不会变成负数
func TestMmapResourceConcurrentRelease(t *testing.T) {
	withTestMmapUnmap(t, func(unmapCount *int32) {
		const refs = 128

		res := NewMmapResource(make([]byte, 4096), 4096)
		// 提升引用计数到 refs
		for i := 1; i < refs; i++ {
			res.AddRef()
		}

		if got := res.RefCount(); got != refs {
			t.Fatalf("unexpected initial refCount: got %d, want %d", got, refs)
		}

		var wg sync.WaitGroup
		wg.Add(refs)
		for i := 0; i < refs; i++ {
			go func() {
				defer wg.Done()
				res.Release()
			}()
		}
		wg.Wait()

		if got := res.RefCount(); got != 0 {
			t.Errorf("refCount should be 0 after %d releases, got %d", refs, got)
		}
		if !res.IsReleased() {
			t.Errorf("resource should be marked released after last Release")
		}
		if got := atomic.LoadInt32(unmapCount); got != 1 {
			t.Errorf("munmap should be called exactly once, got %d", got)
		}

		// 多次额外 Release 不应再次调用 munmap, refCount 应保持 0
		for i := 0; i < 10; i++ {
			res.Release()
		}

		if got := res.RefCount(); got != 0 {
			t.Errorf("refCount should stay 0 after extra releases, got %d", got)
		}
		if got := atomic.LoadInt32(unmapCount); got != 1 {
			t.Errorf("munmap should still be called exactly once after extra releases, got %d", got)
		}
	})
}

// TestMmapResourceAddRefAfterRelease 验证释放后的 AddRef 不会复活资源或修改 refCount
func TestMmapResourceAddRefAfterRelease(t *testing.T) {
	withTestMmapUnmap(t, func(unmapCount *int32) {
		res := NewMmapResource(make([]byte, 128), 128)

		if got := res.RefCount(); got != 1 {
			t.Fatalf("unexpected initial refCount: got %d, want 1", got)
		}

		res.Release()

		if got := res.RefCount(); got != 0 {
			t.Fatalf("refCount should be 0 after Release, got %d", got)
		}
		if !res.IsReleased() {
			t.Fatalf("resource should be marked released after Release")
		}
		if got := atomic.LoadInt32(unmapCount); got != 1 {
			t.Fatalf("munmap should be called once on final Release, got %d", got)
		}

		// 尝试在释放后频繁 AddRef, 不应改变 refCount 和 released 状态
		for i := 0; i < 100; i++ {
			res.AddRef()
		}

		if got := res.RefCount(); got != 0 {
			t.Errorf("refCount should remain 0 after AddRef on released resource, got %d", got)
		}
		if !res.IsReleased() {
			t.Errorf("resource should remain released after AddRef calls")
		}
		if got := atomic.LoadInt32(unmapCount); got != 1 {
			t.Errorf("munmap should still be called exactly once, got %d", got)
		}
	})
}

// TestMmapResourceConcurrentAddRefRelease 验证高并发下成对 AddRef/Release 不会错误释放资源
func TestMmapResourceConcurrentAddRefRelease(t *testing.T) {
	withTestMmapUnmap(t, func(unmapCount *int32) {
		res := NewMmapResource(make([]byte, 1024), 1024)

		const goroutines = 32
		const iterations = 1000

		var wg sync.WaitGroup
		wg.Add(goroutines)

		// 每个 goroutine 做成对的 AddRef/Release 操作, 总体 refCount 应保持为 1
		for i := 0; i < goroutines; i++ {
			go func() {
				defer wg.Done()
				for j := 0; j < iterations; j++ {
					res.AddRef()
					res.Release()
				}
			}()
		}

		wg.Wait()

		if got := res.RefCount(); got != 1 {
			t.Errorf("refCount should remain 1 while base reference is held, got %d", got)
		}
		if res.IsReleased() {
			t.Errorf("resource should not be released while base reference is still held")
		}
		if got := atomic.LoadInt32(unmapCount); got != 0 {
			t.Errorf("munmap should not be called before final Release, got %d", got)
		}

		// 释放最后一个引用
		res.Release()

		if got := res.RefCount(); got != 0 {
			t.Errorf("refCount should be 0 after final Release, got %d", got)
		}
		if !res.IsReleased() {
			t.Errorf("resource should be released after final Release")
		}
		if got := atomic.LoadInt32(unmapCount); got != 1 {
			t.Errorf("munmap should be called exactly once after final Release, got %d", got)
		}
	})
}
