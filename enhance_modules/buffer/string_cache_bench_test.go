package buffer

import (
	"strconv"
	"sync"
	"testing"
)

// 模拟当前的 sync.Map 实现
func benchmarkCurrentImpl(b *testing.B, parallelism int) {
	var cache sync.Map

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		localIdx := 0
		for pb.Next() {
			idx := int64(256 + (localIdx % 3840)) // 256-4095
			localIdx++

			if cached, ok := cache.Load(idx); ok {
				_ = cached.(string)
			} else {
				s := strconv.FormatInt(idx, 10)
				cache.Store(idx, s)
			}
		}
	})
}

// 模拟预分配数组 + RWMutex 实现
func benchmarkPreallocImpl(b *testing.B, parallelism int) {
	cache := make([]string, 4096-256)
	var initOnce [3840]sync.Once
	var mu sync.RWMutex

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		localIdx := 0
		for pb.Next() {
			idx := int64(256 + (localIdx % 3840))
			localIdx++

			arrayIdx := idx - 256

			// 先尝试读锁
			mu.RLock()
			if cache[arrayIdx] != "" {
				_ = cache[arrayIdx]
				mu.RUnlock()
				continue
			}
			mu.RUnlock()

			// 需要初始化
			initOnce[arrayIdx].Do(func() {
				s := strconv.FormatInt(idx, 10)
				mu.Lock()
				cache[arrayIdx] = s
				mu.Unlock()
			})

			mu.RLock()
			_ = cache[arrayIdx]
			mu.RUnlock()
		}
	})
}

// 模拟完全预分配（无锁）实现
func benchmarkFullPreallocImpl(b *testing.B, parallelism int) {
	cache := make([]string, 4096)
	var once sync.Once

	init := func() {
		for i := 0; i < 4096; i++ {
			cache[i] = strconv.FormatInt(int64(i), 10)
		}
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		once.Do(init)

		localIdx := 0
		for pb.Next() {
			idx := 256 + (localIdx % 3840)
			localIdx++
			_ = cache[idx]
		}
	})
}

// 测试不同并发级别下的性能
func BenchmarkStringCache_Current_P1(b *testing.B) {
	benchmarkCurrentImpl(b, 1)
}

func BenchmarkStringCache_Current_P4(b *testing.B) {
	benchmarkCurrentImpl(b, 4)
}

func BenchmarkStringCache_Current_P16(b *testing.B) {
	benchmarkCurrentImpl(b, 16)
}

func BenchmarkStringCache_Prealloc_P1(b *testing.B) {
	benchmarkPreallocImpl(b, 1)
}

func BenchmarkStringCache_Prealloc_P4(b *testing.B) {
	benchmarkPreallocImpl(b, 4)
}

func BenchmarkStringCache_Prealloc_P16(b *testing.B) {
	benchmarkPreallocImpl(b, 16)
}

func BenchmarkStringCache_FullPrealloc_P1(b *testing.B) {
	benchmarkFullPreallocImpl(b, 1)
}

func BenchmarkStringCache_FullPrealloc_P4(b *testing.B) {
	benchmarkFullPreallocImpl(b, 4)
}

func BenchmarkStringCache_FullPrealloc_P16(b *testing.B) {
	benchmarkFullPreallocImpl(b, 16)
}

// 测试实际使用场景：90%命中一级缓存，10%使用二级缓存
func benchmarkRealisticPattern(b *testing.B, useFullPrealloc bool) {
	if useFullPrealloc {
		cache := make([]string, 4096)
		var once sync.Once
		init := func() {
			for i := 0; i < 4096; i++ {
				cache[i] = strconv.FormatInt(int64(i), 10)
			}
		}

		b.ResetTimer()
		b.RunParallel(func(pb *testing.PB) {
			once.Do(init)
			localIdx := 0
			for pb.Next() {
				var idx int
				if localIdx%10 < 9 {
					idx = localIdx % 256 // 90% 使用一级缓存
				} else {
					idx = 256 + (localIdx % 3840) // 10% 使用二级缓存
				}
				localIdx++
				_ = cache[idx]
			}
		})
	} else {
		var cache sync.Map
		var primaryCache [256]string
		var once sync.Once

		init := func() {
			for i := 0; i < 256; i++ {
				primaryCache[i] = strconv.FormatInt(int64(i), 10)
			}
		}

		b.ResetTimer()
		b.RunParallel(func(pb *testing.PB) {
			once.Do(init)
			localIdx := 0
			for pb.Next() {
				if localIdx%10 < 9 {
					idx := localIdx % 256
					_ = primaryCache[idx]
				} else {
					idx := int64(256 + (localIdx % 3840))
					if cached, ok := cache.Load(idx); ok {
						_ = cached.(string)
					} else {
						s := strconv.FormatInt(idx, 10)
						cache.Store(idx, s)
					}
				}
				localIdx++
			}
		})
	}
}

func BenchmarkStringCache_Realistic_Current_P1(b *testing.B) {
	benchmarkRealisticPattern(b, false)
}

func BenchmarkStringCache_Realistic_Current_P16(b *testing.B) {
	benchmarkRealisticPattern(b, false)
}

func BenchmarkStringCache_Realistic_FullPrealloc_P1(b *testing.B) {
	benchmarkRealisticPattern(b, true)
}

func BenchmarkStringCache_Realistic_FullPrealloc_P16(b *testing.B) {
	benchmarkRealisticPattern(b, true)
}

// 内存分配测试
func BenchmarkStringCache_Allocs_Current(b *testing.B) {
	var cache sync.Map

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		idx := int64(256 + (i % 3840))
		if cached, ok := cache.Load(idx); ok {
			_ = cached.(string)
		} else {
			s := strconv.FormatInt(idx, 10)
			cache.Store(idx, s)
		}
	}
}

func BenchmarkStringCache_Allocs_FullPrealloc(b *testing.B) {
	cache := make([]string, 4096)
	for i := 0; i < 4096; i++ {
		cache[i] = strconv.FormatInt(int64(i), 10)
	}

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		idx := 256 + (i % 3840)
		_ = cache[idx]
	}
}
