package fetch

import (
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/dop251/goja"
)

// ==================== StreamReader ====================
// AbortReasonError 记录 AbortSignal 的自定义 reason（用于 Promise reject）
type AbortReasonError struct {
	reason goja.Value
}

func (e *AbortReasonError) Error() string {
	return "The operation was aborted"
}

func (e *AbortReasonError) Reason() goja.Value {
	return e.reason
}

// StreamReader 流式读取器（JavaScript 层面使用）
// 🔥 符合 Web Streams API 标准
// 标准参考: https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStreamDefaultReader
//
// 设计说明:
// 1. **Web Streams API 兼容**:
//   - read() 方法: 返回 {value, done} 对象
//   - 有数据时: {value: Uint8Array, done: false}
//   - 流结束时: {value: undefined, done: true}
//   - 永远不会同时返回数据和 done=true
//
// 2. **大小限制保护**:
//   - maxSize: 最大允许读取的总字节数（0表示不限制）
//   - totalRead: 累计已读取的字节数
//   - 超过限制时自动关闭流并返回错误
//
// 3. **Content-Length 预分配**:
//   - contentLength: HTTP 响应的 Content-Length（-1表示未知）
//   - 用于优化缓冲区分配和进度计算
//
// 4. **EOF 处理**:
//   - reachedEOF: 标记是否已到达 EOF
//   - 第一次遇到 EOF 时，如果有数据则先返回数据（done=false）
//   - 下次调用时才返回 done=true（符合 Web Streams 标准）
type StreamReader struct {
	reader        io.ReadCloser   // 底层的 ReadCloser
	runtime       *goja.Runtime   // goja Runtime（用于创建 JavaScript 对象）
	mutex         sync.Mutex      // 保护并发访问
	closed        bool            // 标记是否已关闭
	reachedEOF    bool            // 标记是否已到达 EOF（符合 Web Streams API 标准）
	totalRead     int64           // 累计读取的字节数
	maxSize       int64           // 最大允许大小（0表示不限制）
	contentLength int64           // HTTP 响应的 Content-Length（用于智能预分配，-1表示未知）
	abortCh       <-chan struct{} // Abort 信号 channel
	signal        *goja.Object    // AbortSignal 对象（用于 reason）
	abortReason   goja.Value      // 🔥 预提取的 abort reason（避免在 goroutine 中访问 goja Object）
	abortErr      error           // Abort 错误（包含 reason）
	aborted       bool            // 是否已中止
	abortWatcher  bool            // 是否已启动 abort watcher
	closeOnce     sync.Once       // 确保关闭通知仅执行一次
	closeCh       chan struct{}   // watcher 退出信号
	timeout       time.Duration   // 🔥 P2: abort watcher 超时保护(0=不设置超时)
}

// NewStreamReader 创建流式读取器
// 🔥 P2 新增: timeout 参数用于 abort watcher 超时保护(0=不设置超时)
func NewStreamReader(reader io.ReadCloser, runtime *goja.Runtime, maxSize int64, contentLength int64, abortCh <-chan struct{}, signal *goja.Object, timeout time.Duration) *StreamReader {
	// 🔥 预提取 abort reason（在主 goroutine 中安全地访问 goja Object）
	var abortReason goja.Value
	if signal != nil {
		if r := signal.Get("reason"); r != nil && !goja.IsUndefined(r) && !goja.IsNull(r) {
			abortReason = r
		}
	}
	// 🔥 如果没有 reason，预先创建默认的 AbortError（避免在 goroutine 中创建）
	if abortReason == nil || goja.IsUndefined(abortReason) || goja.IsNull(abortReason) {
		abortReason = CreateDOMException(runtime, "This operation was aborted", "AbortError")
	}

	sr := &StreamReader{
		reader:        reader,
		runtime:       runtime,
		closed:        false,
		totalRead:     0,             // 🔥 初始化计数器
		maxSize:       maxSize,       // 🔥 设置限制（0表示不限制）
		contentLength: contentLength, // 🔥 保存 Content-Length（-1表示未知）
		abortCh:       abortCh,
		signal:        signal,
		abortReason:   abortReason, // 🔥 存储预提取的 reason
		closeCh:       make(chan struct{}),
		timeout:       timeout, // 🔥 P2: 超时保护
	}
	sr.startAbortWatcher()
	return sr
}

// Read 读取数据块（JavaScript 调用）
// 🔥 符合 Web Streams API 标准：
// - 有数据时: 返回 (data, false, nil)
// - 流结束时: 返回 (nil, true, nil)
// - 永远不会同时返回数据和 done=true
//
// 参数说明:
// - size: 本次读取的字节数（<= 0 时使用默认值 64KB）
//
// 返回值:
// - []byte: 读取的数据（可能小于 size）
// - bool: 是否已到达流末尾（done）
// - error: 错误信息
func (sr *StreamReader) Read(size int) ([]byte, bool, error) {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()

	if err := sr.checkAbortedLocked(); err != nil {
		return nil, true, err
	}

	// 已关闭的流按照 "done" 处理（与 ReadableStream.cancel 后的行为一致）
	if sr.closed || sr.reader == nil {
		return nil, true, nil
	}

	// 如果上次已经到达 EOF，这次直接返回 done=true，并且不再响应后续 abort
	if sr.reachedEOF {
		sr.closed = true
		sr.detachAbortLocked()
		return nil, true, nil
	}

	// 🔥 新增：检查是否已超过大小限制
	if sr.maxSize > 0 && sr.totalRead >= sr.maxSize {
		sr.closed = true
		sr.reader.Close()
		sizeMB := float64(sr.maxSize) / 1024 / 1024
		return nil, true, fmt.Errorf("流式下载已超过限制: %.2fMB", sizeMB)
	}

	// 默认读取 64KB
	if size <= 0 {
		size = 64 * 1024
	}

	// 🔥 新增：如果设置了限制，调整本次读取大小
	if sr.maxSize > 0 {
		remaining := sr.maxSize - sr.totalRead
		if remaining < int64(size) {
			size = int(remaining)
			if size <= 0 {
				sr.closed = true
				sr.reader.Close()
				sizeMB := float64(sr.maxSize) / 1024 / 1024
				return nil, true, fmt.Errorf("流式下载已超过限制: %.2fMB", sizeMB)
			}
		}
	}

	buffer := make([]byte, size)
	n, err := sr.reader.Read(buffer)

	// 🔥 新增：更新累计读取字节数
	sr.totalRead += int64(n)

	// 🔥 读取后再检查是否已被中止（避免 Read 阻塞期间的中止被吞掉）
	if errAbort := sr.checkAbortedLocked(); errAbort != nil {
		return nil, true, errAbort
	}

	if err == io.EOF {
		// 🔥 关键修复：遇到 EOF 时
		sr.reachedEOF = true
		// EOF 之后不应再被 late abort 影响（与 Node 行为对齐）
		sr.detachAbortLocked()

		if n > 0 {
			// 如果还有数据，先返回数据（done=false）
			// 下次调用时才返回 done=true
			return buffer[:n], false, nil
		} else {
			// 没有数据，直接返回 done=true
			if errAbort := sr.checkAbortedLocked(); errAbort != nil {
				return nil, true, errAbort
			}
			sr.closed = true
			return nil, true, nil
		}
	}

	if err != nil {
		sr.closed = true
		sr.reader.Close()
		return nil, true, fmt.Errorf("读取失败: %w", err)
	}

	return buffer[:n], false, nil
}

// Close 关闭流式读取器
func (sr *StreamReader) Close() error {
	sr.mutex.Lock()
	if sr.closed {
		sr.mutex.Unlock()
		return nil
	}
	sr.closed = true
	sr.abortCh = nil
	reader := sr.reader
	sr.reader = nil
	sr.mutex.Unlock()

	sr.closeWatcher()

	if reader != nil {
		return reader.Close()
	}
	return nil
}

// IsClosed 返回流是否已关闭
func (sr *StreamReader) IsClosed() bool {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()
	return sr.closed
}

// GetTotalRead 返回累计读取的字节数
func (sr *StreamReader) GetTotalRead() int64 {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()
	return sr.totalRead
}

// GetContentLength 返回 Content-Length（-1表示未知）
func (sr *StreamReader) GetContentLength() int64 {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()
	return sr.contentLength
}

// GetReader 返回底层的 io.ReadCloser（供 Node.js FormData 使用）
// 🔥 注意：调用者负责管理 Reader 的生命周期
func (sr *StreamReader) GetReader() io.ReadCloser {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()
	return sr.reader
}

// GetMaxSize 返回最大允许大小（0表示不限制）
func (sr *StreamReader) GetMaxSize() int64 {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()
	return sr.maxSize
}

// AbortError 返回中止错误（如果已被 AbortSignal 取消）
func (sr *StreamReader) AbortError() error {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()
	if sr.aborted {
		return sr.abortErr
	}
	return nil
}

// CheckAbortAndGetError 检查 abort 状态并返回错误（如果已被取消）
// 🔥 与 AbortError() 的区别：此方法会直接检查 abortCh channel 是否已关闭
// 即使 abort watcher 还没来得及设置 sr.aborted，也能检测到 abort 信号
func (sr *StreamReader) CheckAbortAndGetError() error {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()

	// 快速路径：已经标记为 aborted
	if sr.aborted {
		return sr.abortErr
	}

	// 没有 abort channel
	if sr.abortCh == nil {
		return nil
	}

	// 直接检查 channel 是否已关闭
	select {
	case <-sr.abortCh:
		// channel 已关闭，触发 abort
		sr.abortLocked()
		return sr.abortErr
	default:
		return nil
	}
}

// 启动 abort watcher，确保阻塞读取也能被中断
func (sr *StreamReader) startAbortWatcher() {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()
	sr.startAbortWatcherLocked()
}

func (sr *StreamReader) startAbortWatcherLocked() {
	if sr.abortWatcher || sr.abortCh == nil {
		return
	}
	sr.abortWatcher = true
	ch := sr.abortCh
	closeCh := sr.closeCh
	timeout := sr.timeout

	// 🔥 P2 优化: 添加超时保护,防止 watcher goroutine 永久阻塞
	go func() {
		if timeout > 0 {
			// 有超时保护: 三路 select
			timer := time.NewTimer(timeout)
			defer timer.Stop()

			select {
			case <-ch:
				sr.handleAbort()
			case <-closeCh:
				// 正常关闭,goroutine 退出
			case <-timer.C:
				// 超时保护触发,强制关闭流
				sr.Close()
			}
		} else {
			// 无超时保护: 二路 select(保持原有行为)
			select {
			case <-ch:
				sr.handleAbort()
			case <-closeCh:
			}
		}
	}()
}

func (sr *StreamReader) handleAbort() {
	sr.mutex.Lock()
	sr.abortLocked()
	sr.mutex.Unlock()
}

func (sr *StreamReader) abortLocked() {
	if sr.aborted {
		return
	}
	sr.aborted = true
	sr.closed = true

	// 🔥 直接使用预提取的 reason（已在 NewStreamReader 中安全创建）
	sr.abortErr = &AbortReasonError{reason: sr.abortReason}

	if sr.reader != nil {
		_ = sr.reader.Close()
		sr.reader = nil
	}
	sr.closeWatcher()
}

func (sr *StreamReader) closeWatcher() {
	sr.closeOnce.Do(func() {
		close(sr.closeCh)
	})
}

// detachAbortLocked 在流已完成时解绑 abort 监听，避免晚到的 abort 干扰已完成的读取
func (sr *StreamReader) detachAbortLocked() {
	sr.abortCh = nil
	sr.closeWatcher()
}

// AttachAbortSignal 绑定 AbortSignal（用于流式读取阶段）
func (sr *StreamReader) AttachAbortSignal(ch <-chan struct{}, signal *goja.Object) {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()

	// 🔥 预提取 abort reason（在主 goroutine 中安全地访问 goja Object）
	if signal != nil {
		if r := signal.Get("reason"); r != nil && !goja.IsUndefined(r) && !goja.IsNull(r) {
			sr.abortReason = r
		}
	}
	// 🔥 如果没有 reason，预先创建默认的 AbortError
	if sr.abortReason == nil || goja.IsUndefined(sr.abortReason) || goja.IsNull(sr.abortReason) {
		sr.abortReason = CreateDOMException(sr.runtime, "This operation was aborted", "AbortError")
	}

	sr.abortCh = ch
	sr.signal = signal
	if !sr.abortWatcher && sr.abortCh != nil {
		sr.startAbortWatcherLocked()
	}
}

// checkAbortedLocked 检查并处理中止状态（需在持锁状态下调用）
// 🔥 修复策略：先检查快速路径（已设置 aborted），再使用非阻塞 select 检测 channel
// 关闭的 channel 会立即在 select 中触发，不会走 default 分支
func (sr *StreamReader) checkAbortedLocked() error {
	// 快速路径：已经标记为 aborted
	if sr.aborted {
		return sr.abortErr
	}

	// 没有 abort channel
	if sr.abortCh == nil {
		return nil
	}

	// 使用非阻塞 select 检查 channel 是否已关闭
	// 注意：关闭的 channel 会立即返回零值，不会走 default
	select {
	case <-sr.abortCh:
		// channel 已关闭或收到信号
		sr.abortLocked()
		return sr.abortErr
	default:
		// channel 未关闭且无信号
		return nil
	}
}

// ==================== 注释说明 ====================
// 🔥 设计原则：
//
// 1. **Web Streams API 兼容性**：
//    - read() 返回 {value, done} 语义
//    - EOF 处理符合标准（先返回数据，再返回 done）
//    - 支持 close() 和状态查询
//
// 2. **大小限制保护**：
//    - 提前检查：totalRead >= maxSize 时立即停止
//    - 运行时检查：调整本次读取大小避免超限
//    - 清晰的错误消息（包含大小和限制）
//
// 3. **线程安全**：
//    - 使用 mutex 保护所有状态访问
//    - 幂等的 Close() 方法（可多次调用）
//    - 状态查询方法线程安全
//
// 4. **性能优化**：
//    - 默认 64KB 缓冲区（平衡内存和性能）
//    - 智能调整读取大小（避免超过限制）
//    - Content-Length 预分配（用于上层缓冲）
//
// 5. **错误处理**：
//    - 区分 EOF 和错误（EOF 正常结束，error 异常）
//    - 自动关闭流（错误时释放资源）
//    - 详细的错误消息（方便调试）
//
// 6. **状态管理**：
//    - closed: 是否已关闭
//    - reachedEOF: 是否已到达 EOF（符合 Web Streams）
//    - totalRead: 累计读取字节数（用于限制和进度）
//    - maxSize: 最大允许大小（0表示不限制）
