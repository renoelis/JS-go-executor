package buffer

import (
	"unsafe"
)

// FastMemcpy 使用 unsafe 进行超高速内存复制
// 注意：这是高级优化，需要确保内存安全
func FastMemcpy(dst, src []byte) int {
	if len(src) == 0 {
		return 0
	}

	n := len(src)
	if len(dst) < n {
		n = len(dst)
	}

	if n == 0 {
		return 0
	}

	// 使用 Go 标准库的 copy，它已经高度优化
	// Go 1.17+ 会自动使用 SIMD 指令（AVX2/SSE）
	return copy(dst, src[:n])
}

// FastMemmove 处理重叠内存的快速移动
// 使用与 runtime.memmove 相同的策略
func FastMemmove(dst, src []byte) int {
	if len(src) == 0 {
		return 0
	}

	n := len(src)
	if len(dst) < n {
		n = len(dst)
	}

	if n == 0 {
		return 0
	}

	// Go 的 copy() 内建函数已经正确处理重叠
	// 它会自动选择正向或反向复制
	return copy(dst, src[:n])
}

// IsSameMemory 检查两个切片是否指向同一块内存
func IsSameMemory(a, b []byte) bool {
	if len(a) == 0 || len(b) == 0 {
		return false
	}

	// 比较底层数组指针
	aPtr := (*[0]byte)(unsafe.Pointer(&a[0]))
	bPtr := (*[0]byte)(unsafe.Pointer(&b[0]))
	return aPtr == bPtr
}

// MemoryOverlaps 检查两个切片的内存区域是否重叠
func MemoryOverlaps(dst, src []byte) bool {
	if len(dst) == 0 || len(src) == 0 {
		return false
	}

	// 获取地址范围
	dstStart := uintptr(unsafe.Pointer(&dst[0]))
	dstEnd := dstStart + uintptr(len(dst))
	srcStart := uintptr(unsafe.Pointer(&src[0]))
	srcEnd := srcStart + uintptr(len(src))

	// 检查是否重叠
	return dstStart < srcEnd && srcStart < dstEnd
}

// OptimizedCopy 根据数据大小选择最优复制策略
func OptimizedCopy(dst, src []byte) int {
	n := len(src)
	if len(dst) < n {
		n = len(dst)
	}

	if n == 0 {
		return 0
	}

	// 对于小数据（< 32 字节），直接逐字节复制可能更快（避免函数调用开销）
	if n <= 32 {
		for i := 0; i < n; i++ {
			dst[i] = src[i]
		}
		return n
	}

	// 对于大数据，使用 copy() 会自动使用 SIMD
	return copy(dst, src[:n])
}
