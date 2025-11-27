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

// NewFormDataReadable 创建 FormData Readable 流
// 🔥 使用工厂函数延迟创建 reader，支持惰性初始化
func NewFormDataReadable(readerFactory func() (io.ReadCloser, error), runtime *goja.Runtime) *FormDataReadable {
	return &FormDataReadable{
		readerFactory: readerFactory,
		runtime:       runtime,
		listeners:     make(map[string][]onceWrapper),
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

	fdr.reading = true
	fdr.mutex.Unlock()

	// 🔥 使用 setImmediate 异步读取下一块数据
	setImmediate := fdr.runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		setImmediateFn(goja.Undefined(), fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			fdr.readNextChunk()
			return goja.Undefined()
		}))
	} else {
		fdr.mutex.Lock()
		fdr.reading = false
		fdr.mutex.Unlock()
	}
}

// readNextChunk 读取下一块数据并触发事件
// 🔥 统一处理 on('data') 和 pipe
func (fdr *FormDataReadable) readNextChunk() {
	// 防御性保护
	defer func() {
		if r := recover(); r != nil {
			fdr.emitError(fmt.Errorf("stream read error: %v", r))
			fdr.closeInternal()
		}
	}()

	fdr.mutex.Lock()
	if fdr.closed || fdr.destroyed || fdr.isPaused {
		fdr.reading = false
		fdr.mutex.Unlock()
		return
	}

	if fdr.streamReader == nil {
		fdr.reading = false
		fdr.mutex.Unlock()
		return
	}
	fdr.mutex.Unlock()

	// 读取数据块（默认 64KB）
	data, done, err := fdr.streamReader.Read(0)

	if err != nil {
		fdr.mutex.Lock()
		fdr.reading = false
		fdr.mutex.Unlock()
		fdr.emitError(err)
		fdr.emitClose() // 🔥 错误后也要触发 close 事件（符合 Node.js 行为）
		fdr.closeInternal()
		return
	}

	if done {
		fdr.mutex.Lock()
		fdr.reading = false

		// 获取 pipe 信息
		hasPipe := fdr.pipeDestination != nil
		hasEnd := fdr.hasPipeEnd
		endFunc := fdr.pipeEndFunc
		dest := fdr.pipeDestination
		fdr.mutex.Unlock()

		// 如果有 pipe，调用目标的 end 方法
		if hasPipe && hasEnd && endFunc != nil {
			endFunc(dest)
		}

		// 🔥 触发 end 事件，然后触发 close 事件
		fdr.emitEnd()
		fdr.emitClose()
		fdr.closeInternal()
		return
	}

	// 如果有数据
	if len(data) > 0 {
		// 创建 Buffer
		dataValue := fdr.createBuffer(data)

		// 🔥 先触发 data 事件（无论是否有 pipe）
		fdr.emitData(dataValue)

		// 🔥 如果有 pipe，写入目标
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
				fdr.mutex.Lock()
				fdr.reading = false
				fdr.mutex.Unlock()
				fdr.emitError(err)
				fdr.emitClose() // 🔥 写入错误后也要触发 close 事件
				fdr.closeInternal()
				return
			}

			// 检查背压：如果 write 返回 false，等待 drain 事件
			if !result.ToBoolean() && hasOn {
				fdr.mutex.Lock()
				fdr.isPaused = true

				// 🔥 只在未注册时注册 drain 监听器
				if !fdr.drainRegistered {
					fdr.drainRegistered = true
					fdr.reading = false
					fdr.mutex.Unlock()

					// 检查目标是否支持 once
					onceFunc, hasOnce := goja.AssertFunction(dest.Get("once"))
					removeListenerFunc, hasRemove := goja.AssertFunction(dest.Get("removeListener"))

					if hasOnce {
						// 🔥 使用 once：触发一次后自动移除，允许下次重新注册
						var drainHandler goja.Value
						drainHandler = fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
							fdr.mutex.Lock()
							fdr.isPaused = false
							fdr.drainRegistered = false // 🔥 once 自动移除后，重置标记允许重新注册
							fdr.mutex.Unlock()

							fdr.scheduleNextRead()
							return goja.Undefined()
						})
						onceFunc(dest, fdr.runtime.ToValue("drain"), drainHandler)
					} else if hasRemove {
						// 🔥 有 removeListener：手动移除后重置标记
						var drainHandler goja.Value
						drainHandler = fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
							// 先移除监听器
							removeListenerFunc(dest, fdr.runtime.ToValue("drain"), drainHandler)

							fdr.mutex.Lock()
							fdr.isPaused = false
							fdr.drainRegistered = false // 🔥 移除后重置标记
							fdr.mutex.Unlock()

							fdr.scheduleNextRead()
							return goja.Undefined()
						})
						onFunc(dest, fdr.runtime.ToValue("drain"), drainHandler)
					} else {
						// 🔥 既没有 once 也没有 removeListener：
						// 只注册一次，handler 保持挂载，不重置 drainRegistered
						// 这样 handler 会在每次 drain 时触发，但不会累积
						var drainHandler goja.Value
						drainHandler = fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
							fdr.mutex.Lock()
							fdr.isPaused = false
							// 🔥 不重置 drainRegistered，防止重复注册
							fdr.mutex.Unlock()

							fdr.scheduleNextRead()
							return goja.Undefined()
						})
						onFunc(dest, fdr.runtime.ToValue("drain"), drainHandler)
					}
				} else {
					// 已经注册了 drain 监听，只需更新状态
					fdr.reading = false
					fdr.mutex.Unlock()
				}

				return
			}
		}
	}

	// 继续读取下一块
	fdr.scheduleNextRead()
}

// scheduleNextRead 调度下一次读取
func (fdr *FormDataReadable) scheduleNextRead() {
	fdr.mutex.Lock()
	fdr.reading = false
	fdr.mutex.Unlock()

	setImmediate := fdr.runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		setImmediateFn(goja.Undefined(), fdr.runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			fdr.startReading()
			return goja.Undefined()
		}))
	}
}

// createBuffer 创建 Buffer 或 Uint8Array
func (fdr *FormDataReadable) createBuffer(data []byte) goja.Value {
	var dataValue goja.Value

	// 🔥 尝试转换为 Buffer（Node.js 标准）
	bufferConstructor := fdr.runtime.Get("Buffer")
	if !goja.IsUndefined(bufferConstructor) && !goja.IsNull(bufferConstructor) {
		bufferObj := bufferConstructor.ToObject(fdr.runtime)
		if bufferObj != nil {
			fromFunc, ok := goja.AssertFunction(bufferObj.Get("from"))
			if ok {
				arrayBuffer := fdr.runtime.NewArrayBuffer(data)
				buffer, err := fromFunc(bufferObj, fdr.runtime.ToValue(arrayBuffer))
				if err == nil {
					dataValue = buffer
				}
			}
		}
	}

	// 🔥 降级方案：如果无法创建 Buffer，创建 Uint8Array
	if dataValue == nil || goja.IsUndefined(dataValue) {
		arrayBuffer := fdr.runtime.NewArrayBuffer(data)
		dataValue = fdr.runtime.ToValue(arrayBuffer)
	}

	return dataValue
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
