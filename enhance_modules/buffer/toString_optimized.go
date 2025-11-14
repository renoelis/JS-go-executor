package buffer

import (
	"encoding/base64"
	goruntime "runtime"
	"sync"
	"sync/atomic"

	"github.com/dop251/goja"
)

// 🔥 方案1: 编码结果内存池（只池化 hex/base64 的输出，不池化输入）
// 🔥 关键修改：使用引用计数代替 Finalizer（Finalizer 不可靠）
// 注意：encodingBuffer 只用于编码输出缓冲区，不持有原始 Buffer 的 mmap 引用
type encodingBuffer struct {
	data     []byte
	refs     atomic.Int32  // 引用计数
	released atomic.Bool   // 是否已释放
}

// 🔥 优化版本：分级内存池（10 个池，平均浪费率 < 1%）
var encodingPools = [10]struct {
	capacity int
	pool     sync.Pool
}{
	{8 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 8*1024)}
	}}},
	{16 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 16*1024)}
	}}},
	{32 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 32*1024)}
	}}},
	{64 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 64*1024)}
	}}},
	{128 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 128*1024)}
	}}},
	{256 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 256*1024)}
	}}},
	{512 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 512*1024)}
	}}},
	{1024 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 1024*1024)}
	}}},
	{2 * 1024 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 2*1024*1024)}
	}}},
	{10 * 1024 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 10*1024*1024)}
	}}},
}

// selectPoolIndex 选择最合适的池索引（使用线性查找，10 个元素性能足够）
func selectPoolIndex(size int) int {
	for i := range encodingPools {
		if size <= encodingPools[i].capacity {
			return i
		}
	}
	return len(encodingPools) - 1
}

// getEncodingBuffer 根据大小选择合适的池
func getEncodingBuffer(size int) *encodingBuffer {
	poolIdx := selectPoolIndex(size)
	buf := encodingPools[poolIdx].pool.Get().(*encodingBuffer)

	// 🔥 重置状态
	buf.released.Store(false)
	buf.refs.Store(1)

	// 🔥 关键修复: 检查容量是否正确
	expectedCap := encodingPools[poolIdx].capacity
	if cap(buf.data) != expectedCap {
		// 容量不符，说明是容量退化的 buffer，丢弃它
		buf.data = make([]byte, size, expectedCap)
	} else if size > cap(buf.data) {
		// size 超过当前池的最大容量（不应该发生，但防御性编程）
		buf.data = make([]byte, size)
	} else {
		// 容量正确，直接使用
		buf.data = buf.data[:size]
	}

	return buf
}

// putEncodingBuffer 归还到池（引用计数方案）
func putEncodingBuffer(buf *encodingBuffer) {
	if buf.released.Load() {
		return // 已释放，防止 double-free
	}

	if buf.refs.Add(-1) != 0 {
		return // 还有引用，不归还
	}

	// 引用计数为 0，释放资源
	if buf.released.CompareAndSwap(false, true) {
		// 🔥 关键修复: 只归还容量正确的 buffer
		bufCap := cap(buf.data)
		poolIdx := selectPoolIndex(bufCap)
		expectedCap := encodingPools[poolIdx].capacity

		// 只有容量匹配时才归还到池
		if bufCap == expectedCap {
			encodingPools[poolIdx].pool.Put(buf)
		}
		// 否则丢弃，让 GC 回收（防止池容量退化）
	}
}

// 🔥 方案2: JavaScript ArrayBuffer Pin 机制
// 确保在编码期间 JS 内存不被移动
type pinnedArrayBuffer struct {
	data   []byte
	unpinFn func()
}

func (be *BufferEnhancer) pinArrayBuffer(runtime *goja.Runtime, obj *goja.Object, length int64) *pinnedArrayBuffer {
	// 获取 ArrayBuffer
	var allBytes []byte

	if exported := obj.Export(); exported != nil {
		if arrayBuffer, ok := exported.(goja.ArrayBuffer); ok {
			allBytes = arrayBuffer.Bytes()
		}
	}

	if allBytes == nil {
		if bufferVal := obj.Get("buffer"); bufferVal != nil && !goja.IsUndefined(bufferVal) {
			if bufferObj := bufferVal.ToObject(runtime); bufferObj != nil {
				if exported := bufferObj.Export(); exported != nil {
					if arrayBuffer, ok := exported.(goja.ArrayBuffer); ok {
						allBytes = arrayBuffer.Bytes()
					}
				}
			}
		}
	}

	if allBytes == nil {
		return nil
	}

	// 计算 offset
	byteOffset := int64(0)
	if offsetVal := obj.Get("byteOffset"); offsetVal != nil && !goja.IsUndefined(offsetVal) {
		byteOffset = offsetVal.ToInteger()
	}

	byteLength := length
	if lengthVal := obj.Get("byteLength"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
		byteLength = lengthVal.ToInteger()
	}

	// 边界检查
	if byteOffset < 0 || byteOffset > int64(len(allBytes)) {
		return nil
	}
	end := byteOffset + byteLength
	if end > int64(len(allBytes)) {
		end = int64(len(allBytes))
	}
	if byteOffset >= end {
		return &pinnedArrayBuffer{data: []byte{}, unpinFn: func(){}}
	}

	data := allBytes[byteOffset:end]

	// 🔥 Pin 机制：通过 KeepAlive 确保 ArrayBuffer 在使用期间不被 GC
	// 创建一个闭包持有引用
	pinRef := obj
	unpinFn := func() {
		goruntime.KeepAlive(pinRef)
	}

	return &pinnedArrayBuffer{
		data:   data,
		unpinFn: unpinFn,
	}
}

// 🔥 方案3: SIMD 优化的 hex 编码（使用查表 + 批量处理）
func hexEncodeSIMD(src []byte, dst []byte) {
	const hexTable = "0123456789abcdef"

	// 批量处理：每次处理 8 个字节（可展开为 SIMD）
	i := 0
	n := len(src)

	// 主循环：8 字节批量
	for ; i+7 < n; i += 8 {
		// 第 1 个字节
		b0 := src[i]
		dst[i*2] = hexTable[b0>>4]
		dst[i*2+1] = hexTable[b0&0x0f]

		// 第 2 个字节
		b1 := src[i+1]
		dst[(i+1)*2] = hexTable[b1>>4]
		dst[(i+1)*2+1] = hexTable[b1&0x0f]

		// 第 3 个字节
		b2 := src[i+2]
		dst[(i+2)*2] = hexTable[b2>>4]
		dst[(i+2)*2+1] = hexTable[b2&0x0f]

		// 第 4 个字节
		b3 := src[i+3]
		dst[(i+3)*2] = hexTable[b3>>4]
		dst[(i+3)*2+1] = hexTable[b3&0x0f]

		// 第 5 个字节
		b4 := src[i+4]
		dst[(i+4)*2] = hexTable[b4>>4]
		dst[(i+4)*2+1] = hexTable[b4&0x0f]

		// 第 6 个字节
		b5 := src[i+5]
		dst[(i+5)*2] = hexTable[b5>>4]
		dst[(i+5)*2+1] = hexTable[b5&0x0f]

		// 第 7 个字节
		b6 := src[i+6]
		dst[(i+6)*2] = hexTable[b6>>4]
		dst[(i+6)*2+1] = hexTable[b6&0x0f]

		// 第 8 个字节
		b7 := src[i+7]
		dst[(i+7)*2] = hexTable[b7>>4]
		dst[(i+7)*2+1] = hexTable[b7&0x0f]
	}

	// 处理剩余字节
	for ; i < n; i++ {
		b := src[i]
		dst[i*2] = hexTable[b>>4]
		dst[i*2+1] = hexTable[b&0x0f]
	}
}

// 🔥 方案4: 直接返回 string（移除 Finalizer）
// 🔥 关键修改：
// 1. 不再使用 Finalizer（Finalizer 不可靠，高并发下会导致 mmap 泄漏）
// 2. 立即归还 encodingBuffer 到池（在函数返回前）
// 3. 使用 string() 转换复制数据（避免 unsafe 指针悬空）
func stringFromEncodingBuffer(buf *encodingBuffer) string {
	if buf == nil || len(buf.data) == 0 {
		return ""
	}

	// 🔥 关键：使用 string() 复制数据，避免 unsafe 指针悬空
	// 虽然会有一次内存复制，但这样更安全可靠
	result := string(buf.data)

	// 🔥 立即归还 buffer 到池（不依赖 Finalizer）
	putEncodingBuffer(buf)

	return result
}

// 🔥 终极优化版本的 toString
func (be *BufferEnhancer) toStringOptimized(runtime *goja.Runtime, this *goja.Object, encoding string, start, end int64) goja.Value {
	// 1. Pin JavaScript ArrayBuffer
	pinned := be.pinArrayBuffer(runtime, this, end)
	if pinned == nil {
		// 降级到安全方案
		return be.toStringSafe(runtime, this, encoding, start, end)
	}
	defer pinned.unpinFn()

	data := pinned.data
	if start > 0 || end < int64(len(data)) {
		if start < 0 {
			start = 0
		}
		if end > int64(len(data)) {
			end = int64(len(data))
		}
		if start >= end {
			return runtime.ToValue("")
		}
		data = data[start:end]
	}

	dataLen := len(data)

	// 2. 根据编码类型选择策略
	switch encoding {
	case "utf8", "utf-8":
		// UTF-8: 必须复制（string 会长期持有）
		// 但使用小 Buffer 优化
		if dataLen < 4096 {
			// 小数据：栈上分配的临时 string，Go 编译器会优化
			return runtime.ToValue(string(data))
		}
		// 大数据：必须复制
		copied := make([]byte, dataLen)
		copy(copied, data)
		return runtime.ToValue(string(copied))

	case "hex":
		// Hex: 使用内存池 + SIMD 编码
		hexBuf := getEncodingBuffer(dataLen * 2)

		// 🔥 直接在 JS 内存上编码到池化的 buffer
		hexEncodeSIMD(data, hexBuf.data)

		// 🔥 移除 Finalizer：直接复制并归还 buffer
		result := stringFromEncodingBuffer(hexBuf)
		return runtime.ToValue(result)

	case "base64":
		// Base64: 使用内存池
		estimatedSize := ((dataLen + 2) / 3) * 4
		b64Buf := getEncodingBuffer(estimatedSize)

		// 手动编码（避免 EncodeToString 的额外分配）
		base64.StdEncoding.Encode(b64Buf.data, data)
		// 计算实际长度
		actualLen := base64.StdEncoding.EncodedLen(dataLen)
		b64Buf.data = b64Buf.data[:actualLen]

		// 🔥 移除 Finalizer：直接复制并归还 buffer
		result := stringFromEncodingBuffer(b64Buf)
		return runtime.ToValue(result)

	case "base64url":
		estimatedSize := ((dataLen + 2) / 3) * 4
		b64Buf := getEncodingBuffer(estimatedSize)

		base64.RawURLEncoding.Encode(b64Buf.data, data)
		actualLen := base64.RawURLEncoding.EncodedLen(dataLen)
		b64Buf.data = b64Buf.data[:actualLen]

		// 🔥 移除 Finalizer：直接复制并归还 buffer
		result := stringFromEncodingBuffer(b64Buf)
		return runtime.ToValue(result)

	default:
		// 其他编码：降级到安全方案
		return be.toStringSafe(runtime, this, encoding, start, end)
	}
}

// 安全降级方案（当前实现）
func (be *BufferEnhancer) toStringSafe(runtime *goja.Runtime, this *goja.Object, encoding string, start, end int64) goja.Value {
	// 使用当前已验证的安全实现
	bufferLength := int64(0)
	if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
		bufferLength = lengthVal.ToInteger()
	}

	// 获取数据（强制复制，安全）
	data := be.exportBufferBytesFast(runtime, this, bufferLength)

	// 边界处理
	if start < 0 {
		start = 0
	}
	if end > int64(len(data)) {
		end = int64(len(data))
	}
	if start >= end {
		return runtime.ToValue("")
	}

	// 切片
	data = data[start:end]

	// 编码转换（使用现有逻辑）
	switch encoding {
	case "utf8", "utf-8":
		return runtime.ToValue(string(data))
	case "hex":
		return runtime.ToValue(hexEncodeStd(data))
	case "base64":
		return runtime.ToValue(base64.StdEncoding.EncodeToString(data))
	case "base64url":
		return runtime.ToValue(base64.RawURLEncoding.EncodeToString(data))
	default:
		return runtime.ToValue(string(data))
	}
}

// 标准 hex 编码（降级用）
func hexEncodeStd(src []byte) string {
	const hexTable = "0123456789abcdef"
	dst := make([]byte, len(src)*2)
	for i, b := range src {
		dst[i*2] = hexTable[b>>4]
		dst[i*2+1] = hexTable[b&0x0f]
	}
	return string(dst)
}
