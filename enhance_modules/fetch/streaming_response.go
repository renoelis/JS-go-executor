package fetch

import (
	"bytes"
	"fmt"
	"io"
	"sync"

	"github.com/dop251/goja"
)

// ==================== StreamingResponse ====================

// StreamingResponse 流式响应对象（支持 Node.js Readable 和 Web Streams）
// 🔥 支持 clone 缓存机制（首次读取时缓存数据）
// 🔥 线程安全：使用 setImmediate 替代 goroutine，确保所有 goja Runtime 操作在 EventLoop 中执行
//
// 设计说明:
// 1. **双模式支持**:
//   - Node.js Readable Stream: .on('data', callback) + .on('end', callback)
//   - Web Streams API: .getReader() + read() 方法
//
// 2. **Clone 缓存机制**:
//   - cloneable: 标记是否需要缓存（用于支持 clone）
//   - cachedData: 缓存读取的数据（首次读取时自动缓存）
//   - cloneMutex: 保护缓存数据的线程安全访问
//   - 使用场景: response.clone() 后读取原始或克隆的 body
//
// 3. **资源管理**:
//   - 原始流读完后自动关闭
//   - 缓存数据在所有克隆都使用后释放
//   - 支持手动 close/cancel
type StreamingResponse struct {
	reader      *StreamReader              // 底层流读取器
	runtime     *goja.Runtime              // goja Runtime
	cloneable   bool                       // 是否需要缓存（用于 clone）
	cachedData  *bytes.Buffer              // 缓存的数据（用于 clone）
	cloneMutex  sync.Mutex                 // 保护缓存数据
	closed      bool                       // 是否已关闭
	closedMutex sync.Mutex                 // 保护关闭状态
	listeners   map[string][]goja.Callable // 事件监听器存储
	isPaused    bool                       // 是否暂停
	isDestroyed bool                       // 是否已销毁
	// closed Promise 的 resolver，在 Close() 时触发
	resolveClosedFunc func(interface{}) error
}

// NewStreamingResponse 创建流式响应对象
func NewStreamingResponse(reader *StreamReader, runtime *goja.Runtime, cloneable bool) *StreamingResponse {
	var cachedData *bytes.Buffer
	if cloneable {
		cachedData = &bytes.Buffer{}
	}

	return &StreamingResponse{
		reader:      reader,
		runtime:     runtime,
		cloneable:   cloneable,
		cachedData:  cachedData,
		closed:      false,
		listeners:   make(map[string][]goja.Callable),
		isPaused:    false,
		isDestroyed: false,
	}
}

// ==================== Node.js Readable Stream API ====================

// On 注册事件监听器（Node.js Readable Stream API）
// 🔥 支持事件:
// - 'data': 每次接收数据块时触发（参数: Uint8Array）
// - 'end': 流结束时触发
// - 'error': 错误时触发（参数: Error）
// - 'close': 流关闭时触发
// 🔥 线程安全：使用 setImmediate 替代 goroutine
func (sr *StreamingResponse) On(eventName string, callback goja.Value) {
	sr.closedMutex.Lock()
	if sr.closed {
		sr.closedMutex.Unlock()
		return
	}
	sr.closedMutex.Unlock()

	callbackFn, ok := goja.AssertFunction(callback)
	if !ok {
		return
	}

	// 存储监听器
	if sr.listeners[eventName] == nil {
		sr.listeners[eventName] = make([]goja.Callable, 0)
	}
	sr.listeners[eventName] = append(sr.listeners[eventName], callbackFn)

	// 如果是 'data' 事件且是第一个监听器，开始流式读取
	if eventName == "data" && len(sr.listeners["data"]) == 1 {
		// 🔥 使用 setImmediate 异步开始读取（线程安全）
		setImmediate := sr.runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			setImmediateFn(goja.Undefined(), sr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
				sr.startStreamReading()
				return goja.Undefined()
			}))
		}
	}
}

// startStreamReading 开始流式读取（使用递归 setImmediate）
// 🔥 线程安全：所有 goja Runtime 操作都在 EventLoop 中执行
func (sr *StreamingResponse) startStreamReading() {
	// 检查是否已暂停或销毁
	if sr.isPaused || sr.isDestroyed {
		return
	}

	// 检查是否有 data 监听器
	if len(sr.listeners["data"]) == 0 {
		return
	}

	// 🔥 使用 setImmediate 异步读取下一块数据
	setImmediate := sr.runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		setImmediateFn(goja.Undefined(), sr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			sr.readNextChunk()
			return goja.Undefined()
		}))
	}
}

// readNextChunk 读取下一块数据并触发事件
func (sr *StreamingResponse) readNextChunk() {
	// 防御性保护
	defer func() {
		if r := recover(); r != nil {
			// 触发 error 事件
			if callbacks, exists := sr.listeners["error"]; exists {
				errorObj := sr.runtime.NewGoError(fmt.Errorf("stream read error: %v", r))
				for _, cb := range callbacks {
					cb(goja.Undefined(), errorObj)
				}
			}
			sr.Close()
		}
	}()

	// 检查是否已关闭
	sr.closedMutex.Lock()
	if sr.closed || sr.isDestroyed {
		sr.closedMutex.Unlock()
		return
	}
	sr.closedMutex.Unlock()

	// 检查是否已暂停
	if sr.isPaused {
		return
	}

	// 读取数据块（默认 64KB）
	data, done, err := sr.reader.Read(0)

	if err != nil {
		// 触发 error 事件
		if callbacks, exists := sr.listeners["error"]; exists {
			errorObj := sr.errorToValue(err)
			for _, cb := range callbacks {
				cb(goja.Undefined(), errorObj)
			}
		}
		sr.Close()
		return
	}

	if done {
		// 触发 end 事件
		if callbacks, exists := sr.listeners["end"]; exists {
			for _, cb := range callbacks {
				cb(goja.Undefined())
			}
		}

		// 触发 close 事件
		if callbacks, exists := sr.listeners["close"]; exists {
			for _, cb := range callbacks {
				cb(goja.Undefined())
			}
		}

		sr.Close()
		return
	}

	// 如果有数据，触发 data 事件
	if len(data) > 0 {
		// 🔥 如果需要缓存，保存数据
		if sr.cloneable && sr.cachedData != nil {
			sr.cloneMutex.Lock()
			sr.cachedData.Write(data)
			sr.cloneMutex.Unlock()
		}

		var dataValue goja.Value

		// 🔥 尝试转换为 Buffer（Node.js 标准）
		bufferConstructor := sr.runtime.Get("Buffer")
		if !goja.IsUndefined(bufferConstructor) && !goja.IsNull(bufferConstructor) {
			bufferObj := bufferConstructor.ToObject(sr.runtime)
			if bufferObj != nil {
				fromFunc, ok := goja.AssertFunction(bufferObj.Get("from"))
				if ok {
					arrayBuffer := sr.runtime.NewArrayBuffer(data)
					buffer, err := fromFunc(bufferObj, sr.runtime.ToValue(arrayBuffer))
					if err == nil {
						dataValue = buffer
					}
				}
			}
		}

		// 🔥 降级方案：如果无法创建 Buffer，返回 Uint8Array（与 Node fetch 一致）
		if dataValue == nil || goja.IsUndefined(dataValue) {
			dataValue = createUint8ArrayValue(sr.runtime, data)
		}

		// 触发 data 事件
		if callbacks, exists := sr.listeners["data"]; exists {
			for _, cb := range callbacks {
				cb(goja.Undefined(), dataValue)
			}
		}
	}

	// 继续读取下一块（递归 setImmediate）
	sr.startStreamReading()
}

// ==================== Web Streams API ====================

// GetReader 获取 ReadableStreamDefaultReader（Web Streams API）
// 🔥 返回标准的 Web Streams Reader:
// - read() 方法: 返回 Promise<{ value, done }>
// - cancel() 方法: 取消流
// - closed 属性: Promise（流关闭时 resolve）
func (sr *StreamingResponse) GetReader() *goja.Object {
	reader := sr.runtime.NewObject()

	// read() 方法
	reader.Set("read", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := sr.runtime.NewPromise()

		// 检查是否已关闭
		sr.closedMutex.Lock()
		if sr.closed {
			sr.closedMutex.Unlock()
			result := sr.runtime.NewObject()
			result.Set("value", goja.Undefined())
			result.Set("done", true)
			_ = resolve(result)
			return sr.runtime.ToValue(promise)
		}
		sr.closedMutex.Unlock()

		type readResult struct {
			data []byte
			done bool
			err  error
		}

		resultCh := make(chan readResult, 1)
		go func() {
			data, done, err := sr.reader.Read(0)
			resultCh <- readResult{data: data, done: done, err: err}
		}()

		setImmediate := sr.runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			var pump func(goja.FunctionCall) goja.Value
			pump = func(call goja.FunctionCall) goja.Value {
				select {
				case res := <-resultCh:
					sr.handleReadResult(resolve, reject, res.data, res.done, res.err)
				default:
					setImmediateFn(goja.Undefined(), sr.runtime.ToValue(pump), sr.runtime.ToValue(1))
				}
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), sr.runtime.ToValue(pump), sr.runtime.ToValue(1))
		} else {
			// Runtime Pool：直接等待结果
			res := <-resultCh
			sr.handleReadResult(resolve, reject, res.data, res.done, res.err)
		}

		return sr.runtime.ToValue(promise)
	})

	// cancel() 方法
	reader.Set("cancel", func(call goja.FunctionCall) goja.Value {
		sr.Close()
		return sr.wrapPromise(goja.Undefined(), nil)
	})

	// closed 属性（Promise）
	closedPromise, resolveClosed, _ := sr.runtime.NewPromise()
	reader.Set("closed", sr.runtime.ToValue(closedPromise))

	// 记录 resolver，Close() 时触发；如果已经关闭则立即 resolve
	sr.closedMutex.Lock()
	closedNow := sr.closed
	if !closedNow {
		sr.resolveClosedFunc = resolveClosed
	}
	sr.closedMutex.Unlock()

	if closedNow {
		_ = resolveClosed(goja.Undefined())
	}

	return reader
}

// wrapPromise 包装返回值为真正的 Promise（基于 goja.Runtime.NewPromise）
func (sr *StreamingResponse) wrapPromise(value interface{}, err error) goja.Value {
	p, resolve, reject := sr.runtime.NewPromise()

	if err != nil {
		_ = reject(sr.errorToValue(err))
	} else {
		var v goja.Value
		if vv, ok := value.(goja.Value); ok {
			v = vv
		} else if value == nil {
			v = goja.Undefined()
		} else {
			v = sr.runtime.ToValue(value)
		}
		_ = resolve(v)
	}

	return sr.runtime.ToValue(p)
}

func (sr *StreamingResponse) handleReadResult(resolve, reject func(interface{}) error, data []byte, done bool, err error) {
	if err != nil {
		_ = reject(sr.errorToValue(err))
		return
	}

	if len(data) > 0 && sr.cloneable && sr.cachedData != nil {
		sr.cloneMutex.Lock()
		sr.cachedData.Write(data)
		sr.cloneMutex.Unlock()
	}

	result := sr.runtime.NewObject()
	if done {
		result.Set("value", goja.Undefined())
		result.Set("done", true)
		_ = sr.Close()
	} else {
		result.Set("value", createUint8ArrayValue(sr.runtime, data))
		result.Set("done", false)
	}
	_ = resolve(result)
}

func (sr *StreamingResponse) errorToValue(err error) goja.Value {
	switch e := err.(type) {
	case *AbortReasonError:
		reason := e.Reason()
		if reason == nil || goja.IsUndefined(reason) || goja.IsNull(reason) {
			reason = CreateDOMException(sr.runtime, "This operation was aborted", "AbortError")
		}
		return reason
	case *AbortError:
		return CreateAbortErrorObject(sr.runtime, err)
	default:
		return sr.runtime.NewGoError(err)
	}
}

// ==================== Clone 缓存机制 ====================

// GetCachedData 获取缓存的数据（用于 clone）
// 🔥 如果 cloneable=false，返回 nil
func (sr *StreamingResponse) GetCachedData() []byte {
	if !sr.cloneable || sr.cachedData == nil {
		return nil
	}

	sr.cloneMutex.Lock()
	defer sr.cloneMutex.Unlock()

	return sr.cachedData.Bytes()
}

// NewStreamingResponseFromCache 从缓存创建流式响应（用于 clone）
// 🔥 用于 response.clone() 后读取克隆的 body
func NewStreamingResponseFromCache(cachedData []byte, runtime *goja.Runtime) *StreamingResponse {
	// 创建一个基于缓存的 io.ReadCloser
	reader := io.NopCloser(bytes.NewReader(cachedData))

	// 创建 StreamReader（不限制大小，因为数据已缓存）
	// 🔥 P2: 缓存数据不需要超时保护,传入 0
	streamReader := NewStreamReader(reader, runtime, 0, int64(len(cachedData)), nil, nil, 0)

	// 创建 StreamingResponse（不需要再次缓存）
	return &StreamingResponse{
		reader:     streamReader,
		runtime:    runtime,
		cloneable:  false, // 克隆的响应不需要再次缓存
		cachedData: nil,
		closed:     false,
	}
}

// ==================== 资源管理 ====================

// Close 关闭流式响应
func (sr *StreamingResponse) Close() error {
	// 更新 closed 状态，并在需要时触发 closed Promise
	var resolver func(interface{}) error
	var reader *StreamReader

	sr.closedMutex.Lock()
	if sr.closed {
		sr.closedMutex.Unlock()
		return nil
	}
	sr.closed = true
	resolver = sr.resolveClosedFunc
	sr.resolveClosedFunc = nil
	reader = sr.reader
	sr.reader = nil
	sr.closedMutex.Unlock()

	if resolver != nil {
		_ = resolver(goja.Undefined())
	}

	if reader != nil {
		if err := reader.Close(); err != nil {
			sr.clearCachedData()
			return err
		}
	}

	sr.clearCachedData()
	return nil
}

func (sr *StreamingResponse) clearCachedData() {
	sr.cloneMutex.Lock()
	defer sr.cloneMutex.Unlock()
	sr.cachedData = nil
}

// IsClosed 返回是否已关闭
func (sr *StreamingResponse) IsClosed() bool {
	sr.closedMutex.Lock()
	defer sr.closedMutex.Unlock()
	return sr.closed
}

// ==================== 辅助方法 ====================

// Pipe 管道传输到另一个流（Node.js Readable Stream API）
// 🔥 简化实现：读取所有数据并写入目标流，“边读边写”的流式实现
func (sr *StreamingResponse) Pipe(destination io.Writer) error {
	for {
		sr.closedMutex.Lock()
		if sr.closed {
			sr.closedMutex.Unlock()
			return nil
		}
		sr.closedMutex.Unlock()

		data, done, err := sr.reader.Read(0)
		if err != nil {
			return err
		}

		if done {
			sr.Close()
			return nil
		}

		// 🔥 如果需要缓存，保存数据
		if sr.cloneable && sr.cachedData != nil {
			sr.cloneMutex.Lock()
			sr.cachedData.Write(data)
			sr.cloneMutex.Unlock()
		}

		// 写入目标流
		if _, err := destination.Write(data); err != nil {
			sr.Close()
			return err
		}
	}
}

// ==================== 注释说明 ====================
// 🔥 设计原则：
//
// 1. **双模式支持**：
//    - Node.js Readable Stream: 事件驱动（data/end/error/close）
//    - Web Streams API: Promise 驱动（read/cancel/closed）
//    - 两种模式可互操作（底层共享 StreamReader）
//
// 2. **Clone 缓存机制**：
//    - 首次读取时自动缓存数据（cloneable=true）
//    - 缓存用于 response.clone() 后读取
//    - 克隆的响应不需要再次缓存（避免内存浪费）
//    - 线程安全（cloneMutex 保护缓存数据）
//
// 3. **资源管理**：
//    - 读取完成后自动关闭流
//    - 支持手动 close/cancel
//    - 幂等的 Close 方法（可多次调用）
//    - 避免资源泄漏
//
// 4. **线程安全**：
//    - closedMutex 保护关闭状态
//    - cloneMutex 保护缓存数据
//    - 异步读取时检查关闭状态
//
// 5. **错误处理**：
//    - 读取错误触发 error 事件或 rejected Promise
//    - 自动关闭流（释放资源）
//    - 详细的错误消息（方便调试）
//
// 6. **性能优化**：
//    - 异步读取（不阻塞主线程）
//    - 按需缓存（cloneable=false 时不缓存）
//    - 默认 64KB 缓冲区（平衡内存和性能）
