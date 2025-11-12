package buffer

import (
	"sync"
	"syscall"
)

// MmapCleanup mmap内存清理管理器
// 🔥 关键设计：显式生命周期管理，避免finalizer的不确定性
type MmapCleanup struct {
	data []byte
	size int
}

// Release 释放mmap内存
func (m *MmapCleanup) Release() {
	if m != nil && len(m.data) > 0 {
		// 执行munmap清理
		_ = syscall.Munmap(m.data)
		m.data = nil
		m.size = 0
	}
}

// IsValid 检查cleanup是否有效
func (m *MmapCleanup) IsValid() bool {
	return m != nil && len(m.data) > 0
}

// allocLargeBuffer 优化大内存分配
// 🔥 新方案：返回data和cleanup，由ArrayBuffer层面管理生命周期
func allocLargeBuffer(size int) ([]byte, *MmapCleanup) {
	// 🔥 关键优化：使用 mmap 分配大内存
	//
	// 为什么 mmap 更快：
	// 1. make([]byte, 1GB) 会立即零初始化 1GB 内存（1.5-2秒）
	// 2. mmap 只是预留虚拟地址空间，不立即分配物理内存
	// 3. 物理内存在首次访问时才分配（页错误），且 OS 保证是零页
	// 4. 这样可以将 1GB 分配从 1.5秒降低到 <10ms
	//
	// 🔥 新的生命周期管理：
	// - 不使用finalizer，避免GC竞态条件
	// - 返回MmapCleanup对象，由调用方管理
	// - ArrayBuffer detach时显式调用cleanup.Release()

	// 使用 mmap 分配匿名内存映射
	// MAP_ANON: 匿名映射，不关联文件  
	// MAP_PRIVATE: 私有映射，写时复制
	// PROT_READ | PROT_WRITE: 可读写
	data, err := syscall.Mmap(
		-1,                                   // fd: -1 表示匿名映射
		0,                                    // offset: 0
		size,                                 // length: 分配大小
		syscall.PROT_READ|syscall.PROT_WRITE, // prot: 可读写
		syscall.MAP_ANON|syscall.MAP_PRIVATE, // flags: 匿名私有
	)

	if err != nil {
		// mmap 失败，回退到 make()，不需要cleanup
		return make([]byte, size), nil
	}

	// 创建cleanup管理器
	cleanup := &MmapCleanup{
		data: data,
		size: size,
	}

	return data, cleanup
}


// BufferPool Buffer 内存池，用于优化小 Buffer 的分配性能
// 模拟 Node.js 的 Buffer.poolSize 机制
type BufferPool struct {
	pool     []byte     // 预分配的大块内存池
	offset   int        // 当前分配偏移
	poolSize int        // 池大小（默认 8KB）
	mu       sync.Mutex // 并发安全锁
}

// NewBufferPool 创建新的 Buffer 池
func NewBufferPool(poolSize int) *BufferPool {
	if poolSize <= 0 {
		poolSize = 8192 // 默认 8KB，与 Node.js 一致
	}
	return &BufferPool{
		pool:     make([]byte, poolSize),
		offset:   0,
		poolSize: poolSize,
	}
}

// Alloc 从池中分配内存
// 如果请求的大小超过池大小的一半，直接分配新内存（避免浪费池空间）
// 否则从池中切片分配
// 🔥 返回值：(data []byte, cleanup *MmapCleanup)
func (bp *BufferPool) Alloc(size int) ([]byte, *MmapCleanup) {
	// 🔥 性能优化：大 Buffer 直接分配，不使用池
	// 这样避免大 Buffer 占用整个池，导致小 Buffer 无法使用池
	if size > bp.poolSize/2 {
		// 🔥 超大 Buffer (>10MB) 使用 mmap 优化分配
		// 返回 cleanup 对象用于显式生命周期管理
		if size > 10*1024*1024 {
			return allocLargeBuffer(size)
		}
		return make([]byte, size), nil
	}

	bp.mu.Lock()
	defer bp.mu.Unlock()

	// 检查池中剩余空间是否足够
	if bp.offset+size > len(bp.pool) {
		// 池空间不足，重新分配新池
		// 注意：旧池中未使用的空间会被 GC 回收
		bp.pool = make([]byte, bp.poolSize)
		bp.offset = 0
	}

	// 从池中切片分配
	// 注意：这里返回的是池的切片，共享底层数组
	// 这是 Node.js Buffer.allocUnsafe 的行为
	data := bp.pool[bp.offset : bp.offset+size : bp.offset+size]
	bp.offset += size

	return data, nil
}

// AllocZeroed 从池中分配并零初始化内存
// 用于 Buffer.alloc() 的实现
// 🔥 返回值：(data []byte, cleanup *MmapCleanup)
func (bp *BufferPool) AllocZeroed(size int) ([]byte, *MmapCleanup) {
	data, cleanup := bp.Alloc(size)

	// 🔥 性能优化：只有从池中分配的才需要零初始化
	// 因为 make() 已经零初始化了
	// 大 Buffer (>poolSize/2) 由 Alloc() 通过 make() 或 mmap 分配
	// mmap 返回的内存 OS 保证是零页，不需要额外初始化
	if size <= bp.poolSize/2 {
		// 零初始化（清除池中的旧数据）
		// 使用 memclr 优化（Go 编译器会优化为 memclr）
		for i := range data {
			data[i] = 0
		}
	}
	// 大 Buffer 不需要额外零初始化

	return data, cleanup
}

// Reset 重置池（用于测试或手动清理）
func (bp *BufferPool) Reset() {
	bp.mu.Lock()
	defer bp.mu.Unlock()

	bp.offset = 0
	// 可选：清空池数据
	for i := range bp.pool {
		bp.pool[i] = 0
	}
}

// Stats 返回池的统计信息（用于调试）
type PoolStats struct {
	PoolSize int // 池大小
	Used     int // 已使用字节数
	Free     int // 剩余字节数
}

func (bp *BufferPool) Stats() PoolStats {
	bp.mu.Lock()
	defer bp.mu.Unlock()

	return PoolStats{
		PoolSize: bp.poolSize,
		Used:     bp.offset,
		Free:     bp.poolSize - bp.offset,
	}
}
