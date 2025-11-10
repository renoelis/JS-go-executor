package buffer

// BufferEnhancer Buffer增强器
type BufferEnhancer struct {
	// 🔥 性能优化：添加 Buffer 内存池
	pool *BufferPool
}

// NewBufferEnhancer 创建新的Buffer增强器
func NewBufferEnhancer() *BufferEnhancer {
	return &BufferEnhancer{
		// 创建 8KB 的 Buffer 池（与 Node.js 一致）
		pool: NewBufferPool(8192),
	}
}
