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

	// 🔥 优化策略分层：
	// 1. 极小数据（≤16字节）：内联展开，避免循环开销
	// 2. 小数据（≤64字节）：简单循环，避免 copy() 函数调用
	// 3. 中等数据（≤4KB）：使用 copy()，利用 SIMD
	// 4. 大数据（>4KB）：使用 copy()，但提示编译器优化
	
	switch {
	case n <= 16:
		// 极小数据：完全展开，零循环开销
		// 编译器会优化为几条 MOV 指令
		switch n {
		case 1:
			dst[0] = src[0]
		case 2:
			dst[0] = src[0]
			dst[1] = src[1]
		case 3:
			dst[0] = src[0]
			dst[1] = src[1]
			dst[2] = src[2]
		case 4:
			// 使用 uint32 复制 4 字节（一次操作）
			*(*uint32)(unsafe.Pointer(&dst[0])) = *(*uint32)(unsafe.Pointer(&src[0]))
		case 8:
			// 使用 uint64 复制 8 字节（一次操作）
			*(*uint64)(unsafe.Pointer(&dst[0])) = *(*uint64)(unsafe.Pointer(&src[0]))
		default:
			// 5-7, 9-16 字节：使用循环
			for i := 0; i < n; i++ {
				dst[i] = src[i]
			}
		}
		return n
		
	case n <= 64:
		// 小数据：简单循环，避免函数调用开销
		// 对于 17-64 字节，循环比 copy() 更快
		for i := 0; i < n; i++ {
			dst[i] = src[i]
		}
		return n
		
	case n <= 4096:
		// 中等数据：使用 copy()，Go 会使用 SIMD（AVX2/SSE）
		return copy(dst, src[:n])
		
	default:
		// 大数据（>4KB）：使用 copy()
		// 🔥 优化：对于超大数据，可以考虑并行复制
		// 但通常单线程 copy() 已经接近内存带宽极限
		return copy(dst, src[:n])
	}
}

// ZeroCopySlice 创建一个零拷贝的切片视图
// 🔥 类似 mmap 的思想：不复制数据，只创建新的视图
// 注意：修改返回的切片会影响原始数据！
func ZeroCopySlice(src []byte, offset, length int) []byte {
	if offset < 0 || length < 0 || offset+length > len(src) {
		return nil
	}
	
	// 直接返回切片，共享底层数组（零拷贝）
	// 这类似于 mmap 的"映射"概念：不复制，只是创建新的访问方式
	return src[offset : offset+length]
}

// ShareMemory 创建一个共享内存的切片（零拷贝）
// 🔥 这是真正的"类 mmap"优化：避免数据复制
func ShareMemory(src []byte) []byte {
	if len(src) == 0 {
		return nil
	}
	
	// 使用 unsafe.Slice 创建新切片，共享底层数组（Go 1.17+）
	// 这是替代 reflect.SliceHeader 的推荐方式
	if len(src) > 0 {
		return unsafe.Slice(&src[0], len(src))
	}
	return nil
}

// CopyOnWrite 实现写时复制（Copy-on-Write）
// 🔥 这是 mmap MAP_PRIVATE 的核心思想
type CopyOnWrite struct {
	original []byte
	modified []byte
	dirty    bool
}

// NewCopyOnWrite 创建一个写时复制的包装器
func NewCopyOnWrite(data []byte) *CopyOnWrite {
	return &CopyOnWrite{
		original: data,
		modified: nil,
		dirty:    false,
	}
}

// Read 读取数据（零拷贝）
func (cow *CopyOnWrite) Read() []byte {
	if cow.dirty {
		return cow.modified
	}
	return cow.original
}

// Write 写入数据（写时复制）
func (cow *CopyOnWrite) Write(offset int, data []byte) {
	// 首次写入时才复制
	if !cow.dirty {
		cow.modified = make([]byte, len(cow.original))
		copy(cow.modified, cow.original)
		cow.dirty = true
	}
	
	// 写入修改后的副本
	copy(cow.modified[offset:], data)
}

// IsDirty 检查是否已修改
func (cow *CopyOnWrite) IsDirty() bool {
	return cow.dirty
}
