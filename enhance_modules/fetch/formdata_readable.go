package fetch

import (
	"bytes"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/dop251/goja"
)

// ==================== FormDataReadable ====================

// FormDataReadable FormData 的 Node.js Readable Stream 包装器
// 🔥 复用 StreamReader 和 StreamingResponse 的事件驱动模式
// 🔥 支持 Node.js form-data 的流式接口（on/pipe/pause/resume）
//
// 设计说明:
// 1. **单次消费语义**:
//   - consumed: 标记是否已开始消费
//   - 禁止多次读取（符合 Node.js Readable 语义）
//   - On/Pipe 都会检查 consumed 状态
//
// 2. **统一读取循环**:
//   - pipe 和 on('data') 共用同一个读取循环
//   - pipe 时也会触发 data 事件（符合 Node.js 语义）
//
// 3. **事件驱动**:
//   - 使用 setImmediate 在 EventLoop 中触发事件
//   - 支持 data/end/error/close 事件
//   - 正常结束和异常都会触发 close 事件
//
// 4. **背压控制**:
//   - isPaused: 暂停/恢复读取
//   - pipe 时根据目标的 write 返回值控制读取速度
//   - drain 监听器复用同一个 handler，避免累积
//
// 5. **资源管理**:
//   - 读取完成后自动关闭底层 reader
//   - destroy/close 都会触发 close 事件
type FormDataReadable struct {
	readerFactory func() (io.ReadCloser, error) // 延迟创建 reader 的工厂函数
	reader        io.ReadCloser                 // 底层的 io.ReadCloser
	streamReader  *StreamReader                 // 复用的 StreamReader
	runtime       *goja.Runtime                 // goja Runtime

	listeners    map[string][]onceWrapper // 事件监听器存储（带 once 标记）
	consumed     bool                     // 是否已开始消费
	isPaused     bool                     // 是否暂停
	closed       bool                     // 是否已关闭
	destroyed    bool                     // 是否已销毁
	reading      bool                     // 是否正在读取中
	endEmitted   bool                     // 是否已触发 end 事件
	closeEmitted bool                     // 是否已触发 close 事件

	readChan       chan readResult // 异步读取结果通道
	readReqChan    chan struct{}   // 触发单次读取的请求通道
	readWorkerOnce sync.Once       // 确保只启动一个读取 worker
	readInFlight   bool            // 是否有正在进行的读取
	stopChan       chan struct{}   // 触发读协程退出
	stopOnce       sync.Once
	readChanOnce   sync.Once // 保护 readChan 关闭
	// pipe 相关
	pipeDestination *goja.Object  // pipe 目标
	pipeWriteFunc   goja.Callable // 目标的 write 方法
	pipeEndFunc     goja.Callable // 目标的 end 方法
	pipeOnFunc      goja.Callable // 目标的 on 方法
	hasPipeEnd      bool          // 是否有 end 方法
	hasPipeOn       bool          // 是否有 on 方法
	drainRegistered bool          // 是否已注册 drain 监听

	mutex sync.Mutex // 保护状态访问
}

// onceWrapper 包装监听器，支持 once 语义
type onceWrapper struct {
	callback goja.Callable
	once     bool // 是否是 once 监听器
}

type readResult struct {
	data []byte
	done bool
	err  error
}

// NewFormDataReadable 创建 FormData Readable 流
// 🔥 使用工厂函数延迟创建 reader，支持惰性初始化
func NewFormDataReadable(readerFactory func() (io.ReadCloser, error), runtime *goja.Runtime) *FormDataReadable {
	return &FormDataReadable{
		readerFactory: readerFactory,
		runtime:       runtime,
		listeners:     make(map[string][]onceWrapper),
		readChan:      make(chan readResult, 4),
		readReqChan:   make(chan struct{}, 1),
		stopChan:      make(chan struct{}),
		consumed:      false,
		isPaused:      false,
		closed:        false,
		destroyed:     false,
		reading:       false,
		endEmitted:    false,
		closeEmitted:  false,
	}
}

// NewFormDataReadableFromReader 从已有 reader 创建 FormData Readable 流
func NewFormDataReadableFromReader(reader io.ReadCloser, runtime *goja.Runtime) *FormDataReadable {
	return &FormDataReadable{
		readerFactory: nil,
		reader:        reader,
		runtime:       runtime,
		listeners:     make(map[string][]onceWrapper),
		readChan:      make(chan readResult, 4),
		readReqChan:   make(chan struct{}, 1),
		stopChan:      make(chan struct{}),
		consumed:      false,
		isPaused:      false,
		closed:        false,
		destroyed:     false,
		reading:       false,
		endEmitted:    false,
		closeEmitted:  false,
	}
}

// ==================== 内部方法 ====================

// ensureReader 确保 reader 已创建
func (fdr *FormDataReadable) ensureReader() error {
	if fdr.reader != nil {
		return nil
	}

	if fdr.readerFactory == nil {
		return fmt.Errorf("no reader factory provided")
	}

	reader, err := fdr.readerFactory()
	if err != nil {
		return err
	}

	fdr.reader = reader
	// 创建 StreamReader 包装（不限制大小）
	// 🔥 P2: FormData 流式读取使用 5 分钟超时保护
	fdr.streamReader = NewStreamReader(reader, fdr.runtime, 0, -1, nil, nil, 5*time.Minute)
	return nil
}

// startReading 开始流式读取（使用递归 setImmediate）
// 🔥 统一的读取循环，同时服务于 on('data') 和 pipe
// 🔥 线程安全：所有 goja Runtime 操作都在 EventLoop 中执行
func (fdr *FormDataReadable) startReading() {
	fdr.mutex.Lock()
	if fdr.isPaused || fdr.destroyed || fdr.closed || fdr.reading {
		fdr.mutex.Unlock()
		return
	}

	// 🔥 只要流已经开始消费（consumed=true），就应该继续读取直到结束
	// 即使 data 监听器被移除（符合 Node.js flowing mode 语义）
	if !fdr.consumed {
		fdr.mutex.Unlock()
		return
	}

	fdr.startReadWorker()
	// 防止重复调度
	fdr.reading = true
	inFlight := fdr.readInFlight
	fdr.mutex.Unlock()

	if !inFlight {
		fdr.enqueueRead()
	}

	fdr.scheduleProcessReadResults()
}

func (fdr *FormDataReadable) startReadWorker() {
	fdr.readWorkerOnce.Do(func() {
		go func() {
			for {
				select {
				case <-fdr.stopChan:
					fdr.readChanOnce.Do(func() { close(fdr.readChan) })
					return
				case _, ok := <-fdr.readReqChan:
					if !ok {
						fdr.readChanOnce.Do(func() { close(fdr.readChan) })
						return
					}

					fdr.mutex.Lock()
					if fdr.destroyed || fdr.closed || fdr.streamReader == nil {
						fdr.mutex.Unlock()
						fdr.readChan <- readResult{err: fmt.Errorf("stream closed")}
						fdr.readChanOnce.Do(func() { close(fdr.readChan) })
						return
					}
					sr := fdr.streamReader
					fdr.mutex.Unlock()

					data, done, err := sr.Read(0)
					fdr.readChan <- readResult{data: data, done: done, err: err}
					if err != nil || done {
						fdr.readChanOnce.Do(func() { close(fdr.readChan) })
						return
					}
				}
			}
		}()
	})
}

func (fdr *FormDataReadable) enqueueRead() {
	fdr.mutex.Lock()
	if fdr.isPaused || fdr.destroyed || fdr.closed || fdr.readInFlight || fdr.streamReader == nil {
		fdr.mutex.Unlock()
		return
	}
	fdr.readInFlight = true
	fdr.mutex.Unlock()

	select {
	case fdr.readReqChan <- struct{}{}:
	default:
		fdr.mutex.Lock()
		fdr.readInFlight = false
		fdr.mutex.Unlock()
	}
}

func (fdr *FormDataReadable) scheduleProcessReadResults() {
	setImmediate := fdr.runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		setImmediateFn(goja.Undefined(), fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			fdr.processReadResults()
			return goja.Undefined()
		}))
	}
}

// processReadResults 处理异步读取结果
func (fdr *FormDataReadable) processReadResults() {
	fdr.mutex.Lock()
	if fdr.destroyed || fdr.closed {
		fdr.reading = false
		fdr.mutex.Unlock()
		return
	}
	fdr.mutex.Unlock()

	select {
	case res, ok := <-fdr.readChan:
		if !ok {
			fdr.mutex.Lock()
			fdr.reading = false
			fdr.readInFlight = false
			fdr.mutex.Unlock()
			return
		}
		fdr.mutex.Lock()
		fdr.readInFlight = false
		fdr.mutex.Unlock()
		fdr.handleReadResult(res)
	default:
		fdr.mutex.Lock()
		shouldPoll := fdr.readInFlight && !fdr.isPaused && !fdr.destroyed && !fdr.closed
		fdr.reading = false
		fdr.mutex.Unlock()
		if shouldPoll {
			fdr.scheduleProcessReadResults()
		}
	}
}

func (fdr *FormDataReadable) handleReadResult(res readResult) {
	if res.err != nil {
		fdr.emitError(res.err)
		fdr.emitClose()
		fdr.closeInternal()
		fdr.mutex.Lock()
		fdr.reading = false
		fdr.mutex.Unlock()
		return
	}

	if res.done {
		fdr.mutex.Lock()
		fdr.reading = false

		// 获取 pipe 信息
		hasPipe := fdr.pipeDestination != nil
		hasEnd := fdr.hasPipeEnd
		endFunc := fdr.pipeEndFunc
		dest := fdr.pipeDestination
		fdr.mutex.Unlock()

		if hasPipe && hasEnd && endFunc != nil {
			endFunc(dest)
		}

		fdr.emitEnd()
		fdr.emitClose()
		fdr.closeInternal()
		return
	}

	if len(res.data) > 0 {
		dataValue := fdr.createBuffer(res.data)

		// 先触发 data 事件
		fdr.emitData(dataValue)

		// 如果有 pipe，写入目标
		fdr.mutex.Lock()
		hasPipe := fdr.pipeDestination != nil
		writeFunc := fdr.pipeWriteFunc
		dest := fdr.pipeDestination
		hasOn := fdr.hasPipeOn
		onFunc := fdr.pipeOnFunc
		fdr.mutex.Unlock()

		if hasPipe && writeFunc != nil {
			result, err := writeFunc(dest, dataValue)
			if err != nil {
				fdr.emitError(err)
				fdr.emitClose()
				fdr.closeInternal()
				fdr.mutex.Lock()
				fdr.reading = false
				fdr.mutex.Unlock()
				return
			}

			// 背压处理
			if !result.ToBoolean() && hasOn {
				fdr.mutex.Lock()
				fdr.isPaused = true

				if !fdr.drainRegistered {
					fdr.drainRegistered = true
					fdr.reading = false
					fdr.mutex.Unlock()

					onceFunc, hasOnce := goja.AssertFunction(dest.Get("once"))
					removeListenerFunc, hasRemove := goja.AssertFunction(dest.Get("removeListener"))

					if hasOnce {
						var drainHandler goja.Value
						drainHandler = fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
							fdr.mutex.Lock()
							fdr.isPaused = false
							fdr.drainRegistered = false
							fdr.mutex.Unlock()

							fdr.scheduleNextRead()
							return goja.Undefined()
						})
						onceFunc(dest, fdr.runtime.ToValue("drain"), drainHandler)
					} else if hasRemove {
						var drainHandler goja.Value
						drainHandler = fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
							removeListenerFunc(dest, fdr.runtime.ToValue("drain"), drainHandler)

							fdr.mutex.Lock()
							fdr.isPaused = false
							fdr.drainRegistered = false
							fdr.mutex.Unlock()

							fdr.scheduleNextRead()
							return goja.Undefined()
						})
						onFunc(dest, fdr.runtime.ToValue("drain"), drainHandler)
					} else {
						var drainHandler goja.Value
						drainHandler = fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
							fdr.mutex.Lock()
							fdr.isPaused = false
							fdr.mutex.Unlock()

							fdr.scheduleNextRead()
							return goja.Undefined()
						})
						onFunc(dest, fdr.runtime.ToValue("drain"), drainHandler)
					}
				} else {
					fdr.mutex.Unlock()
				}

				return
			}
		}
	}

	// 继续读取
	fdr.scheduleNextRead()
}

// scheduleNextRead 调度下一次读取
func (fdr *FormDataReadable) scheduleNextRead() {
	fdr.mutex.Lock()
	fdr.reading = false
	fdr.mutex.Unlock()

	fdr.enqueueRead()
	fdr.scheduleProcessReadResults()
}

// createBuffer 创建 Buffer
// 🔥 修复：通过设置 Uint8Array 的原型为 Buffer.prototype 来创建真正的 Buffer
// 现在 stream.bundle.js 使用全局 Buffer，所以这个方法创建的 Buffer 会被正确识别
func (fdr *FormDataReadable) createBuffer(data []byte) goja.Value {
	// 获取 Buffer 构造函数
	bufferConstructor := fdr.runtime.Get("Buffer")
	if goja.IsUndefined(bufferConstructor) || goja.IsNull(bufferConstructor) {
		// 降级：返回 ArrayBuffer
		return fdr.runtime.ToValue(fdr.runtime.NewArrayBuffer(data))
	}

	bufferObj := bufferConstructor.ToObject(fdr.runtime)
	if bufferObj == nil {
		return fdr.runtime.ToValue(fdr.runtime.NewArrayBuffer(data))
	}

	// 获取 Uint8Array 构造函数
	uint8ArrayCtor := fdr.runtime.Get("Uint8Array")
	if goja.IsUndefined(uint8ArrayCtor) || goja.IsNull(uint8ArrayCtor) {
		return fdr.runtime.ToValue(fdr.runtime.NewArrayBuffer(data))
	}

	ctorFunc, ok := goja.AssertConstructor(uint8ArrayCtor)
	if !ok {
		return fdr.runtime.ToValue(fdr.runtime.NewArrayBuffer(data))
	}

	// 创建 ArrayBuffer
	ab := fdr.runtime.NewArrayBuffer(data)

	// 创建 Uint8Array(arrayBuffer)
	uint8Array, err := ctorFunc(nil, fdr.runtime.ToValue(ab))
	if err != nil {
		return fdr.runtime.ToValue(ab)
	}

	// 🔥 关键：修改原型为 Buffer.prototype，使 Buffer.isBuffer() 返回 true
	bufferPrototype := bufferObj.Get("prototype")
	if bufferPrototype != nil && !goja.IsUndefined(bufferPrototype) {
		uint8ArrayObj := uint8Array.ToObject(fdr.runtime)
		if uint8ArrayObj != nil {
			uint8ArrayObj.SetPrototype(bufferPrototype.ToObject(fdr.runtime))
			return uint8Array
		}
	}

	// 降级：返回 Uint8Array
	return uint8Array
}

// emitData 触发 data 事件
func (fdr *FormDataReadable) emitData(dataValue goja.Value) {
	fdr.mutex.Lock()
	// 复制监听器列表并标记需要移除的 once 监听器
	callbacks := make([]goja.Callable, 0, len(fdr.listeners["data"]))
	toRemove := make([]int, 0)
	for i, wrapper := range fdr.listeners["data"] {
		callbacks = append(callbacks, wrapper.callback)
		if wrapper.once {
			toRemove = append(toRemove, i)
		}
	}
	// 从后往前移除 once 监听器
	for i := len(toRemove) - 1; i >= 0; i-- {
		idx := toRemove[i]
		fdr.listeners["data"] = append(fdr.listeners["data"][:idx], fdr.listeners["data"][idx+1:]...)
	}
	fdr.mutex.Unlock()

	// 触发 data 事件
	for _, cb := range callbacks {
		cb(goja.Undefined(), dataValue)
	}
}

// emitEnd 触发 end 事件
func (fdr *FormDataReadable) emitEnd() {
	fdr.mutex.Lock()
	if fdr.endEmitted {
		fdr.mutex.Unlock()
		return
	}
	fdr.endEmitted = true

	callbacks := make([]goja.Callable, 0, len(fdr.listeners["end"]))
	for _, wrapper := range fdr.listeners["end"] {
		callbacks = append(callbacks, wrapper.callback)
	}
	// end 事件后清空 end 监听器
	fdr.listeners["end"] = nil
	fdr.mutex.Unlock()

	// 触发 end 事件
	for _, cb := range callbacks {
		cb(goja.Undefined())
	}
}

// emitClose 触发 close 事件
func (fdr *FormDataReadable) emitClose() {
	fdr.mutex.Lock()
	if fdr.closeEmitted {
		fdr.mutex.Unlock()
		return
	}
	fdr.closeEmitted = true

	callbacks := make([]goja.Callable, 0, len(fdr.listeners["close"]))
	for _, wrapper := range fdr.listeners["close"] {
		callbacks = append(callbacks, wrapper.callback)
	}
	// close 事件后清空 close 监听器
	fdr.listeners["close"] = nil
	fdr.mutex.Unlock()

	// 触发 close 事件
	for _, cb := range callbacks {
		cb(goja.Undefined())
	}
}

// emitError 触发 error 事件
func (fdr *FormDataReadable) emitError(err error) {
	fdr.mutex.Lock()
	callbacks := make([]goja.Callable, 0, len(fdr.listeners["error"]))
	for _, wrapper := range fdr.listeners["error"] {
		callbacks = append(callbacks, wrapper.callback)
	}
	fdr.mutex.Unlock()

	if len(callbacks) == 0 {
		return
	}

	errorObj := fdr.runtime.NewGoError(err)
	for _, cb := range callbacks {
		cb(goja.Undefined(), errorObj)
	}
}

// Emit 主动触发事件（兼容 EventEmitter.emit）
// 返回是否存在对应的监听器
func (fdr *FormDataReadable) Emit(eventName string, args ...goja.Value) bool {
	fdr.mutex.Lock()
	listeners := fdr.listeners[eventName]
	if len(listeners) == 0 {
		fdr.mutex.Unlock()
		return false
	}

	callbacks := make([]goja.Callable, 0, len(listeners))
	toRemove := make([]int, 0)
	for i, wrapper := range listeners {
		callbacks = append(callbacks, wrapper.callback)
		if wrapper.once {
			toRemove = append(toRemove, i)
		}
	}

	// 特殊事件状态标记
	if eventName == "end" {
		fdr.endEmitted = true
	}
	if eventName == "close" {
		fdr.closeEmitted = true
	}

	for i := len(toRemove) - 1; i >= 0; i-- {
		idx := toRemove[i]
		fdr.listeners[eventName] = append(fdr.listeners[eventName][:idx], fdr.listeners[eventName][idx+1:]...)
	}
	fdr.mutex.Unlock()

	for _, cb := range callbacks {
		cb(goja.Undefined(), args...)
	}

	return true
}

// closeInternal 内部关闭方法
func (fdr *FormDataReadable) closeInternal() error {
	fdr.mutex.Lock()
	if fdr.closed {
		fdr.mutex.Unlock()
		return nil
	}
	fdr.closed = true
	fdr.reading = false
	fdr.mutex.Unlock()

	fdr.stopOnce.Do(func() {
		close(fdr.stopChan)
	})

	// 关闭底层 reader
	if fdr.streamReader != nil {
		fdr.streamReader.Close()
	} else if fdr.reader != nil {
		fdr.reader.Close()
	}

	return nil
}

// ==================== Node.js Readable Stream API ====================

// On 注册事件监听器（Node.js Readable Stream API）
// 🔥 支持事件:
// - 'data': 每次接收数据块时触发（参数: Buffer/Uint8Array）
// - 'end': 流结束时触发
// - 'error': 错误时触发（参数: Error）
// - 'close': 流关闭时触发
// 🔥 首个 'data' 监听器注册时开始读取
func (fdr *FormDataReadable) On(eventName string, callback goja.Value) goja.Value {
	fdr.mutex.Lock()
	if fdr.closed || fdr.destroyed {
		fdr.mutex.Unlock()
		return goja.Undefined()
	}

	callbackFn, ok := goja.AssertFunction(callback)
	if !ok {
		fdr.mutex.Unlock()
		return goja.Undefined()
	}

	// 存储监听器
	if fdr.listeners[eventName] == nil {
		fdr.listeners[eventName] = make([]onceWrapper, 0)
	}
	fdr.listeners[eventName] = append(fdr.listeners[eventName], onceWrapper{callback: callbackFn, once: false})

	isFirstDataListener := eventName == "data" && len(fdr.listeners["data"]) == 1 && !fdr.consumed
	fdr.mutex.Unlock()

	// 如果是 'data' 事件且是第一个监听器且未消费，开始流式读取
	if isFirstDataListener {
		// 确保 reader 已创建
		if err := fdr.ensureReader(); err != nil {
			fdr.emitError(err)
			return goja.Undefined()
		}

		// 标记已开始消费
		fdr.mutex.Lock()
		fdr.consumed = true
		fdr.mutex.Unlock()

		// 🔥 使用 setImmediate 异步开始读取（线程安全）
		setImmediate := fdr.runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			setImmediateFn(goja.Undefined(), fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
				fdr.startReading()
				return goja.Undefined()
			}))
		}
	}

	return goja.Undefined()
}

// Once 注册一次性事件监听器
// 🔥 触发后自动从监听器列表移除
func (fdr *FormDataReadable) Once(eventName string, callback goja.Value) goja.Value {
	fdr.mutex.Lock()
	if fdr.closed || fdr.destroyed {
		fdr.mutex.Unlock()
		return goja.Undefined()
	}

	callbackFn, ok := goja.AssertFunction(callback)
	if !ok {
		fdr.mutex.Unlock()
		return goja.Undefined()
	}

	// 🔥 存储监听器，标记为 once
	if fdr.listeners[eventName] == nil {
		fdr.listeners[eventName] = make([]onceWrapper, 0)
	}
	fdr.listeners[eventName] = append(fdr.listeners[eventName], onceWrapper{callback: callbackFn, once: true})

	isFirstDataListener := eventName == "data" && len(fdr.listeners["data"]) == 1 && !fdr.consumed
	fdr.mutex.Unlock()

	// 如果是 data 事件的第一个监听器，启动读取
	if isFirstDataListener {
		if err := fdr.ensureReader(); err != nil {
			fdr.emitError(err)
			return goja.Undefined()
		}

		fdr.mutex.Lock()
		fdr.consumed = true
		fdr.mutex.Unlock()

		setImmediate := fdr.runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			setImmediateFn(goja.Undefined(), fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
				fdr.startReading()
				return goja.Undefined()
			}))
		}
	}

	return goja.Undefined()
}

// Pipe 管道传输到另一个流（Node.js Readable Stream API）
// 🔥 与 on('data') 共用统一读取循环
// 🔥 pipe 时也会触发 data 事件
// 🔥 支持背压控制
func (fdr *FormDataReadable) Pipe(destination *goja.Object) *goja.Object {
	fdr.mutex.Lock()
	if fdr.closed || fdr.destroyed {
		fdr.mutex.Unlock()
		return destination
	}

	// 🔥 检查是否已消费
	if fdr.consumed {
		fdr.mutex.Unlock()
		panic(fdr.runtime.NewTypeError("Cannot pipe after stream has already been consumed"))
	}
	fdr.consumed = true

	// 设置 pipe 目标
	fdr.pipeDestination = destination

	// 获取目标的方法
	writeFunc, hasWrite := goja.AssertFunction(destination.Get("write"))
	if !hasWrite {
		fdr.mutex.Unlock()
		fdr.emitError(fmt.Errorf("destination does not have write method"))
		return destination
	}
	fdr.pipeWriteFunc = writeFunc

	endFunc, hasEnd := goja.AssertFunction(destination.Get("end"))
	fdr.pipeEndFunc = endFunc
	fdr.hasPipeEnd = hasEnd

	onFunc, hasOn := goja.AssertFunction(destination.Get("on"))
	fdr.pipeOnFunc = onFunc
	fdr.hasPipeOn = hasOn

	fdr.mutex.Unlock()

	// 确保 reader 已创建
	if err := fdr.ensureReader(); err != nil {
		fdr.emitError(err)
		return destination
	}

	// 🔥 使用 setImmediate 开始读取（统一读取循环）
	setImmediate := fdr.runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		setImmediateFn(goja.Undefined(), fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			fdr.startReading()
			return goja.Undefined()
		}))
	}

	return destination
}

// Pause 暂停流读取
func (fdr *FormDataReadable) Pause() {
	fdr.mutex.Lock()
	defer fdr.mutex.Unlock()
	fdr.isPaused = true
}

// Resume 恢复流读取
func (fdr *FormDataReadable) Resume() {
	fdr.mutex.Lock()
	wasPaused := fdr.isPaused
	fdr.isPaused = false
	canResume := !fdr.closed && !fdr.destroyed && fdr.consumed
	fdr.mutex.Unlock()

	// 如果之前暂停了且流已启动，重新开始读取
	if wasPaused && canResume {
		setImmediate := fdr.runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			setImmediateFn(goja.Undefined(), fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
				fdr.startReading()
				return goja.Undefined()
			}))
		}
	}
}

// Destroy 销毁流（可选传入错误）
// 🔥 会触发 error 事件（如果有错误）和 close 事件
func (fdr *FormDataReadable) Destroy(err error) {
	fdr.mutex.Lock()
	if fdr.destroyed {
		fdr.mutex.Unlock()
		return
	}
	fdr.destroyed = true
	fdr.mutex.Unlock()

	if err != nil {
		fdr.emitError(err)
	}

	// 🔥 触发 close 事件并关闭
	fdr.emitClose()
	fdr.closeInternal()
}

// Close 关闭流
// 🔥 会触发 close 事件
func (fdr *FormDataReadable) Close() error {
	fdr.emitClose()
	return fdr.closeInternal()
}

// IsClosed 返回是否已关闭
func (fdr *FormDataReadable) IsClosed() bool {
	fdr.mutex.Lock()
	defer fdr.mutex.Unlock()
	return fdr.closed
}

// IsConsumed 返回是否已消费
func (fdr *FormDataReadable) IsConsumed() bool {
	fdr.mutex.Lock()
	defer fdr.mutex.Unlock()
	return fdr.consumed
}

// ==================== JavaScript 对象创建 ====================

// ToJSObject 创建 JavaScript 对象
// 🔥 返回一个带有 on/once/pipe/pause/resume/destroy 方法的对象
func (fdr *FormDataReadable) ToJSObject() *goja.Object {
	obj := fdr.runtime.NewObject()

	// on(event, callback)
	obj.Set("on", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			return obj
		}
		eventName := call.Arguments[0].String()
		callback := call.Arguments[1]
		fdr.On(eventName, callback)
		return obj // 返回 this 支持链式调用
	})

	// once(event, callback)
	obj.Set("once", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			return obj
		}
		eventName := call.Arguments[0].String()
		callback := call.Arguments[1]
		fdr.Once(eventName, callback)
		return obj
	})

	// emit(event, ...args)
	obj.Set("emit", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return fdr.runtime.ToValue(false)
		}
		eventName := call.Arguments[0].String()
		args := []goja.Value{}
		if len(call.Arguments) > 1 {
			args = call.Arguments[1:]
		}
		triggered := fdr.Emit(eventName, args...)
		return fdr.runtime.ToValue(triggered)
	})

	// pipe(destination, options?)
	obj.Set("pipe", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Undefined()
		}
		destination := call.Arguments[0].ToObject(fdr.runtime)
		if destination == nil {
			return goja.Undefined()
		}
		return fdr.Pipe(destination)
	})

	// pause()
	obj.Set("pause", func(call goja.FunctionCall) goja.Value {
		fdr.Pause()
		return obj // 返回 this 支持链式调用
	})

	// resume()
	obj.Set("resume", func(call goja.FunctionCall) goja.Value {
		fdr.Resume()
		return obj // 返回 this 支持链式调用
	})

	// destroy(error?)
	obj.Set("destroy", func(call goja.FunctionCall) goja.Value {
		var err error
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			err = fmt.Errorf("%s", call.Arguments[0].String())
		}
		fdr.Destroy(err)
		return obj
	})

	// 只读属性
	obj.Set("readable", true)
	obj.Set("destroyed", fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
		return fdr.runtime.ToValue(fdr.destroyed)
	}))

	return obj
}

// ==================== 工具函数 ====================

// CreateFormDataReadableFromBytes 从字节数组创建 FormData Readable 流
func CreateFormDataReadableFromBytes(data []byte, runtime *goja.Runtime) *FormDataReadable {
	reader := io.NopCloser(bytes.NewReader(data))
	return NewFormDataReadableFromReader(reader, runtime)
}
