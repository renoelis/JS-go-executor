package blob

import (
	"bytes"
	"fmt"
	"math"
	goRuntime "runtime"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"flow-codeblock-go/enhance_modules/internal/streams"

	"github.com/dop251/goja"
)

// JSBlob Blob 对象的内部表示
type JSBlob struct {
	data []byte // 数据
	typ  string // MIME 类型
}

// GetData 返回 Blob 数据
func (b *JSBlob) GetData() []byte {
	return b.data
}

// GetType 返回 Blob MIME 类型
func (b *JSBlob) GetType() string {
	return b.typ
}

// JSFile File 对象的内部表示（继承 Blob）
type JSFile struct {
	JSBlob
	name         string  // 文件名
	lastModified float64 // 最后修改时间（Unix 毫秒）
}

const blobStreamDefaultChunkSize = 64 * 1024

// GetName 返回文件名
func (f *JSFile) GetName() string {
	return f.name
}

// GetLastModified 返回最后修改时间
func (f *JSFile) GetLastModified() float64 {
	return f.lastModified
}

// decodeUTF8WithReplacement 解码 UTF-8 字节序列，对不合法序列使用 U+FFFD 替换
// 符合 WHATWG Encoding Standard 的 UTF-8 解码行为
func decodeUTF8WithReplacement(data []byte) string {
	var result strings.Builder
	result.Grow(len(data)) // 预分配空间

	for len(data) > 0 {
		r, size := utf8.DecodeRune(data)
		if r == utf8.RuneError && size == 1 {
			// 不合法的 UTF-8 序列，使用替换字符
			result.WriteRune('\uFFFD')
		} else {
			// 合法的 rune
			result.WriteRune(r)
		}
		data = data[size:]
	}

	return result.String()
}

// normalizeType 规范化 MIME 类型
// 符合 W3C File API 规范：
// 1. 如果包含 U+0020-U+007E 范围外的字符，返回空字符串
// 2. 否则转换为 ASCII 小写
func normalizeType(typ string) string {
	// 检查字符范围 U+0020 (空格) 到 U+007E (~)
	for _, r := range typ {
		if r < 0x0020 || r > 0x007E {
			return "" // 包含非法字符，返回空字符串
		}
	}
	// 转换为 ASCII 小写
	return strings.ToLower(typ)
}

// isTypedArray 检查对象是否是 TypedArray
func isTypedArray(obj *goja.Object) bool {
	if constructor := obj.Get("constructor"); constructor != nil && !goja.IsUndefined(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok {
			if nameVal := constructorObj.Get("name"); nameVal != nil && !goja.IsUndefined(nameVal) {
				typeName := nameVal.String()
				return typeName == "Uint8Array" ||
					typeName == "Int8Array" ||
					typeName == "Uint16Array" ||
					typeName == "Int16Array" ||
					typeName == "Uint32Array" ||
					typeName == "Int32Array" ||
					typeName == "Float32Array" ||
					typeName == "Float64Array" ||
					typeName == "Uint8ClampedArray" ||
					typeName == "BigInt64Array" ||
					typeName == "BigUint64Array"
			}
		}
	}
	return false
}

// isDataView 检查对象是否是 DataView
func isDataView(obj *goja.Object) bool {
	if constructor := obj.Get("constructor"); constructor != nil && !goja.IsUndefined(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok {
			if nameVal := constructorObj.Get("name"); nameVal != nil && !goja.IsUndefined(nameVal) {
				return nameVal.String() == "DataView"
			}
		}
	}
	return false
}

// extractBufferSourceBytes 从 BufferSource (ArrayBuffer/TypedArray/DataView) 提取字节
func extractBufferSourceBytes(runtime *goja.Runtime, obj *goja.Object) ([]byte, error) {
	// 尝试 TypedArray 或 DataView
	if isTypedArray(obj) || isDataView(obj) {
		// 获取底层 ArrayBuffer
		bufferVal := obj.Get("buffer")
		if bufferVal == nil || goja.IsUndefined(bufferVal) {
			return nil, fmt.Errorf("TypedArray/DataView 缺少 buffer 属性")
		}

		bufferObj := bufferVal.ToObject(runtime)
		if bufferObj == nil {
			return nil, fmt.Errorf("无法获取 buffer 对象")
		}

		// 导出 ArrayBuffer
		if ab, ok := bufferObj.Export().(goja.ArrayBuffer); ok {
			// 获取 byteOffset 和 byteLength
			byteOffset := int64(0)
			if offsetVal := obj.Get("byteOffset"); offsetVal != nil && !goja.IsUndefined(offsetVal) {
				byteOffset = offsetVal.ToInteger()
			}

			byteLength := int64(len(ab.Bytes()))
			if lengthVal := obj.Get("byteLength"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
				byteLength = lengthVal.ToInteger()
			}

			// 防御：检查负长度
			if byteLength < 0 {
				return nil, fmt.Errorf("byteLength 非法")
			}

			// 切片提取
			allBytes := ab.Bytes()
			if byteOffset < 0 || byteOffset > int64(len(allBytes)) {
				return nil, fmt.Errorf("byteOffset 越界")
			}
			end := byteOffset + byteLength
			if end > int64(len(allBytes)) {
				end = int64(len(allBytes))
			}

			// 转换为 int（安全，因为已经钳制到 len(allBytes)）
			start := int(byteOffset)
			stop := int(end)
			return allBytes[start:stop], nil
		}
	}

	return nil, fmt.Errorf("不是有效的 BufferSource")
}

// createBlobConstructor 创建 Blob 构造器
// 🔥 Goja 约定：构造器中使用 panic(runtime.NewTypeError(...)) 抛出 JavaScript 异常
// 这些 panic 会被上层的 defer recover 捕获,转换为 JavaScript TypeError
func (fe *FetchEnhancer) createBlobConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	return func(call goja.ConstructorCall) *goja.Object {
		// 🔥 安全检查：fe 不能为 nil
		if fe == nil {
			panic(runtime.NewTypeError("Blob 构造函数中 FetchEnhancer 为 nil"))
		}

		blob := &JSBlob{
			typ: "", // 默认类型为空字符串（符合 Web 标准）
		}

		// 🔥 提前获取大小限制（避免内存消耗后才检查）
		maxBlobSize := int64(100 * 1024 * 1024) // 默认 100MB
		if fe != nil && fe.maxBlobFileSize > 0 {
			maxBlobSize = fe.maxBlobFileSize
		}

		// 🔥 P2-1: 获取 endings 选项（默认 "transparent"，白名单处理）
		endings := "transparent"
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			if optionsObj := call.Arguments[1].ToObject(runtime); optionsObj != nil {
				if endingsVal := optionsObj.Get("endings"); endingsVal != nil && !goja.IsUndefined(endingsVal) {
					if endingsVal.String() == "native" {
						endings = "native"
					}
					// 其他任何值都保持 "transparent"
				}
			}
		}

		// 解析参数：new Blob([parts], options)
		// 🔥 规范修复：支持 BufferSource (ArrayBuffer/TypedArray/DataView)、Blob、USVString
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			// 第一个参数：数据parts数组（必须是 goja.Value 才能调用 JS 方法）
			if partsVal := call.Arguments[0]; partsVal != nil {
				// 尝试作为数组对象处理
				partsObj, ok := partsVal.(*goja.Object)
				if !ok {
					// 不是对象（例如数字、字符串等）
					panic(runtime.NewTypeError("Failed to construct 'Blob': The provided value cannot be converted to a sequence"))
				}

				// 获取数组长度
				lengthVal := partsObj.Get("length")
				if lengthVal == nil || goja.IsUndefined(lengthVal) {
					// 不是 array-like（没有 length 属性）
					panic(runtime.NewTypeError("Failed to construct 'Blob': The provided value cannot be converted to a sequence"))
				}

				arrayLen := int(lengthVal.ToInteger())

				// 🔥 只检查累计字节数，不检查元素个数
				// （元素多但每个很小不应该误判）
				var buffer bytes.Buffer
				var accumulatedSize int64 = 0

				// 遍历数组元素
				for i := 0; i < arrayLen; i++ {
					partVal := partsObj.Get(strconv.Itoa(i))
					var (
						partBytes    []byte
						partBytesSet bool
					)

					// 1. 检查是否是 Blob/File
					if partObj, ok := partVal.(*goja.Object); ok {
						if isBlob := partObj.Get("__isBlob"); isBlob != nil && !goja.IsUndefined(isBlob) && isBlob.ToBoolean() {
							// 提取 Blob 数据
							if blobDataVal := partObj.Get("__blobData"); blobDataVal != nil && !goja.IsUndefined(blobDataVal) {
								if blobData, ok := blobDataVal.Export().(*JSBlob); ok {
									partBytes = blobData.data
									partBytesSet = true
								}
							}
						} else if exported := partVal.Export(); exported != nil {
							// 2. 检查是否是 ArrayBuffer
							if ab, ok := exported.(goja.ArrayBuffer); ok {
								partBytes = ab.Bytes()
								partBytesSet = true
							} else if partObj != nil {
								// 3. 检查是否是 TypedArray 或 DataView
								if bytes, err := extractBufferSourceBytes(runtime, partObj); err == nil {
									partBytes = bytes
									partBytesSet = true
								}
								// 如果提取失败，partBytes 保持 nil，会走到 toString() 逻辑
							}
						}
					}

					// 4. 如果不是 BufferSource 或 Blob，使用 JS ToString 语义
					if !partBytesSet {
						// 调用 JS 的 toString 方法
						str := partVal.String()

						// 🔥 P2-1: 应用 endings 选项
						if endings == "native" {
							// 转换换行符为本地平台格式
							// Windows: \r\n, 其他平台: \n
							str = strings.ReplaceAll(str, "\r\n", "\n") // 先统一为 \n
							str = strings.ReplaceAll(str, "\r", "\n")   // 处理单独的 \r

							// 根据平台选择行尾（使用 Go 的 runtime 包）
							if goRuntime.GOOS == "windows" {
								str = strings.ReplaceAll(str, "\n", "\r\n")
							}
							// 其他平台保持 \n
						}

						partBytes = []byte(str)
						partBytesSet = true
					}

					// 检查累积大小
					partSize := int64(len(partBytes))
					if accumulatedSize+partSize > maxBlobSize {
						panic(runtime.NewTypeError(fmt.Sprintf("Blob 大小超过限制：%d > %d 字节（构建过程中）", accumulatedSize+partSize, maxBlobSize)))
					}

					buffer.Write(partBytes)
					accumulatedSize += partSize
				}
				blob.data = buffer.Bytes()
			}
		}

		// 🔥 最后再次检查（防御性编程）
		if len(blob.data) > int(maxBlobSize) {
			panic(runtime.NewTypeError(fmt.Sprintf("Blob 大小超过限制：%d > %d 字节", len(blob.data), maxBlobSize)))
		}

		// 第二个参数：options {type: "text/plain"}
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			if optionsObj := call.Arguments[1].ToObject(runtime); optionsObj != nil {
				// 🔥 修复：同时检查 nil 和 undefined，并规范化 type
				if typeVal := optionsObj.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) {
					blob.typ = normalizeType(typeVal.String())
				}
			}
		}

		return fe.createBlobObject(runtime, blob)
	}
}

// createBlobObject 创建 Blob 对象
func (fe *FetchEnhancer) createBlobObject(runtime *goja.Runtime, blob *JSBlob) *goja.Object {
	obj := runtime.NewObject()

	// 🔥 设置原型链，使 instanceof Blob 工作
	if blobConstructor := runtime.Get("Blob"); blobConstructor != nil && !goja.IsUndefined(blobConstructor) {
		if blobCtor := blobConstructor.ToObject(runtime); blobCtor != nil {
			if blobProto := blobCtor.Get("prototype"); blobProto != nil && !goja.IsUndefined(blobProto) {
				obj.SetPrototype(blobProto.ToObject(runtime))
			}
		}
	}

	// ✅ size 和 type 现在在 Blob.prototype 上定义为 getter
	// 不再在实例上定义这些属性

	// 标记为 Blob 对象（内部使用，不可枚举、不可配置）
	obj.DefineDataProperty("__isBlob", runtime.ToValue(true),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)
	obj.DefineDataProperty("__blobData", runtime.ToValue(blob),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)

	// 🔥 方法已在 Blob.prototype 上定义，不需要在实例上重复设置
	// 🔥 Symbol.toStringTag 也已在 Blob.prototype 上定义

	return obj
}

// createBlobReadableStream 使用真正的 ReadableStream 构造器创建流
// 🔥 关键：必须使用 new ReadableStream() 创建，这样 pipeThrough 等方法才能正常工作
// web-streams-polyfill 通过内部 slot 检测对象是否是真正的 ReadableStream
func createBlobReadableStream(runtime *goja.Runtime, blob *JSBlob, uint8ArrayConstructor goja.Constructor) *goja.Object {
	if runtime == nil || blob == nil {
		return nil
	}

	// 检查 ReadableStream 构造函数是否存在
	readableStreamConstructor := runtime.Get("ReadableStream")
	if readableStreamConstructor == nil || goja.IsUndefined(readableStreamConstructor) {
		// 降级：使用老的手动创建方式
		return createBlobReadableStreamFallback(runtime, blob, uint8ArrayConstructor)
	}

	// 准备 Blob 数据状态（闭包共享）
	totalLength := len(blob.data)
	offset := 0

	// 创建 Uint8Array 的辅助函数
	createChunkValue := func(chunk []byte) goja.Value {
		buffer := runtime.NewArrayBuffer(chunk)
		if uint8ArrayConstructor != nil {
			if uint8Array, err := uint8ArrayConstructor(nil, runtime.ToValue(buffer)); err == nil {
				return uint8Array
			}
		}
		return runtime.ToValue(buffer)
	}

	// 创建 underlying source 对象
	underlyingSource := runtime.NewObject()

	// pull 方法：每次 reader.read() 时被调用
	underlyingSource.Set("pull", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 1 {
			return goja.Undefined()
		}
		controller := call.Arguments[0].ToObject(runtime)
		if controller == nil {
			return goja.Undefined()
		}

		// 检查是否还有数据
		if offset >= totalLength {
			// 关闭流
			closeMethod := controller.Get("close")
			if closeMethod != nil && !goja.IsUndefined(closeMethod) {
				if closeFn, ok := goja.AssertFunction(closeMethod); ok {
					_, _ = closeFn(controller)
				}
			}
			return goja.Undefined()
		}

		// 读取一块数据
		remaining := totalLength - offset
		chunkSize := blobStreamDefaultChunkSize
		if remaining < chunkSize {
			chunkSize = remaining
		}

		chunk := make([]byte, chunkSize)
		copy(chunk, blob.data[offset:offset+chunkSize])
		offset += chunkSize

		// 入队数据
		enqueueMethod := controller.Get("enqueue")
		if enqueueMethod != nil && !goja.IsUndefined(enqueueMethod) {
			if enqueueFn, ok := goja.AssertFunction(enqueueMethod); ok {
				_, _ = enqueueFn(controller, createChunkValue(chunk))
			}
		}

		// 如果数据读完，关闭流
		if offset >= totalLength {
			closeMethod := controller.Get("close")
			if closeMethod != nil && !goja.IsUndefined(closeMethod) {
				if closeFn, ok := goja.AssertFunction(closeMethod); ok {
					_, _ = closeFn(controller)
				}
			}
		}

		return goja.Undefined()
	})

	// cancel 方法
	underlyingSource.Set("cancel", func(call goja.FunctionCall) goja.Value {
		offset = totalLength // 标记为已消费完
		return goja.Undefined()
	})

	// 🔥 关键修复：使用 runtime.New() 以构造函数方式调用 ReadableStream
	// 这样才能正确初始化内部 slot（如 _readableStreamController）
	streamVal, err := runtime.New(readableStreamConstructor, runtime.ToValue(underlyingSource))
	if err != nil {
		return createBlobReadableStreamFallback(runtime, blob, uint8ArrayConstructor)
	}

	streamObj := streamVal.ToObject(runtime)
	return streamObj
}

// createBlobReadableStreamFallback 降级方案：手动创建 ReadableStream 对象
// 用于 ReadableStream 构造函数不可用时
func createBlobReadableStreamFallback(runtime *goja.Runtime, blob *JSBlob, uint8ArrayConstructor goja.Constructor) *goja.Object {
	if runtime == nil || blob == nil {
		return nil
	}

	streamObj := runtime.NewObject()
	streams.AttachReadableStreamPrototype(runtime, streamObj)
	totalLength := len(blob.data)

	var offset int
	var streamLocked bool
	var streamClosed bool
	var readerClosedResolve func(interface{}) error

	streamObj.Set("locked", false)

	resolveReaderClosed := func() {
		if readerClosedResolve != nil {
			_ = readerClosedResolve(goja.Undefined())
			readerClosedResolve = nil
		}
	}

	updateLocked := func(locked bool) {
		streamLocked = locked
		streamObj.Set("locked", locked)
	}

	finalizeStream := func() {
		if streamClosed {
			return
		}
		streamClosed = true
		offset = totalLength
		updateLocked(false)
		resolveReaderClosed()
	}

	createChunkValue := func(chunk []byte) goja.Value {
		buffer := runtime.NewArrayBuffer(chunk)
		if uint8ArrayConstructor != nil {
			if uint8Array, err := uint8ArrayConstructor(nil, runtime.ToValue(buffer)); err == nil {
				return uint8Array
			}
		}
		return runtime.ToValue(buffer)
	}

	streamObj.Set("cancel", func(call goja.FunctionCall) goja.Value {
		promise, resolve, _ := runtime.NewPromise()
		finalizeStream()
		_ = resolve(goja.Undefined())
		return runtime.ToValue(promise)
	})

	streamObj.Set("getReader", func(call goja.FunctionCall) goja.Value {
		if streamLocked {
			panic(runtime.NewTypeError("ReadableStream already locked"))
		}

		reader := runtime.NewObject()
		updateLocked(true)

		readerClosed := false
		readerReleased := false

		closedPromise, resolveClosed, rejectClosed := runtime.NewPromise()
		reader.Set("closed", closedPromise)
		readerClosedResolve = resolveClosed

		maybeResolveClosed := func() {
			if readerClosed {
				return
			}
			readerClosed = true
			resolveReaderClosed()
		}

		reader.Set("read", func(call goja.FunctionCall) goja.Value {
			promise, resolve, reject := runtime.NewPromise()

			if readerReleased {
				_ = reject(runtime.NewTypeError("Reader has been released"))
				return runtime.ToValue(promise)
			}

			result := runtime.NewObject()

			if streamClosed || offset >= totalLength {
				finalizeStream()
				result.Set("value", goja.Undefined())
				result.Set("done", true)
				_ = resolve(result)
				maybeResolveClosed()
				return runtime.ToValue(promise)
			}

			remaining := totalLength - offset
			chunkSize := blobStreamDefaultChunkSize
			if remaining < chunkSize {
				chunkSize = remaining
			}

			chunk := make([]byte, chunkSize)
			copy(chunk, blob.data[offset:offset+chunkSize])
			offset += chunkSize

			result.Set("value", createChunkValue(chunk))
			result.Set("done", false)
			_ = resolve(result)

			if offset >= totalLength {
				finalizeStream()
				maybeResolveClosed()
			}

			return runtime.ToValue(promise)
		})

		reader.Set("cancel", func(call goja.FunctionCall) goja.Value {
			promise, resolve, _ := runtime.NewPromise()
			finalizeStream()
			maybeResolveClosed()
			_ = resolve(goja.Undefined())
			return runtime.ToValue(promise)
		})

		reader.Set("releaseLock", func(call goja.FunctionCall) goja.Value {
			readerReleased = true
			readerClosedResolve = nil
			updateLocked(false)
			return goja.Undefined()
		})

		// closed Promise 如果 reader 还未消费任何数据且 stream 已关闭，立即 resolve
		if streamClosed || offset >= totalLength {
			finalizeStream()
			maybeResolveClosed()
		}

		// 避免未使用的 reject
		_ = rejectClosed

		return reader
	})

	return streamObj
}

// createFileConstructor 创建 File 构造器
func (fe *FetchEnhancer) createFileConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	return func(call goja.ConstructorCall) *goja.Object {
		// 安全检查：fe 不能为 nil
		if fe == nil {
			panic(runtime.NewTypeError("File 构造函数中 FetchEnhancer 为 nil"))
		}

		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("File 构造函数需要至少 2 个参数"))
		}

		file := &JSFile{
			JSBlob: JSBlob{
				typ: "", // 默认类型为空字符串（符合 Web 标准）
			},
			lastModified: float64(time.Now().UnixMilli()),
		}

		// 🔥 提前获取大小限制（避免内存消耗后才检查）
		maxFileSize := int64(100 * 1024 * 1024) // 默认 100MB
		if fe != nil && fe.maxBlobFileSize > 0 {
			maxFileSize = fe.maxBlobFileSize
		}

		var optionsObj *goja.Object
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) && !goja.IsNull(call.Arguments[2]) {
			optionsObj = call.Arguments[2].ToObject(runtime)
		}

		endings := "transparent"
		if optionsObj != nil {
			if endingsVal := optionsObj.Get("endings"); endingsVal != nil && !goja.IsUndefined(endingsVal) && !goja.IsNull(endingsVal) {
				endingsStr := endingsVal.String()
				if endingsStr == "native" || endingsStr == "transparent" {
					endings = endingsStr
				} else {
					panic(runtime.NewTypeError(fmt.Sprintf("Failed to construct 'File': option 'endings' must be 'transparent' or 'native', got %s", endingsStr)))
				}
			}
		}

		// 第一个参数：数据parts数组
		// 🔥 规范修复：支持 BufferSource (ArrayBuffer/TypedArray/DataView)、Blob、USVString
		if partsVal := call.Arguments[0]; partsVal != nil {
			// 尝试作为数组对象处理
			partsObj, ok := partsVal.(*goja.Object)
			if !ok {
				// 不是对象（例如数字、字符串等）
				panic(runtime.NewTypeError("Failed to construct 'File': The provided value cannot be converted to a sequence"))
			}

			// 获取数组长度
			lengthVal := partsObj.Get("length")
			if lengthVal == nil || goja.IsUndefined(lengthVal) {
				// 不是 array-like（没有 length 属性）
				panic(runtime.NewTypeError("Failed to construct 'File': The provided value cannot be converted to a sequence"))
			}

			arrayLen := int(lengthVal.ToInteger())

			// 🔥 只检查累计字节数，不检查元素个数
			var buffer bytes.Buffer
			var accumulatedSize int64 = 0

			// 遍历数组元素
			for i := 0; i < arrayLen; i++ {
				partVal := partsObj.Get(strconv.Itoa(i))
				// 🔥 不跳过 undefined/null，让它们走 toString 路径
				// undefined → "undefined", null → "null"

				var (
					partBytes    []byte
					partBytesSet bool
				)

				// 1. 检查是否是 Blob/File
				if partObj, ok := partVal.(*goja.Object); ok {
					if isBlob := partObj.Get("__isBlob"); isBlob != nil && !goja.IsUndefined(isBlob) && isBlob.ToBoolean() {
						// 提取 Blob 数据
						if blobDataVal := partObj.Get("__blobData"); blobDataVal != nil && !goja.IsUndefined(blobDataVal) {
							if blobData, ok := blobDataVal.Export().(*JSBlob); ok {
								partBytes = blobData.data
								partBytesSet = true
							}
						}
					} else if exported := partVal.Export(); exported != nil {
						// 2. 检查是否是 ArrayBuffer
						if ab, ok := exported.(goja.ArrayBuffer); ok {
							partBytes = ab.Bytes()
							partBytesSet = true
						} else if partObj != nil {
							// 3. 检查是否是 TypedArray 或 DataView
							if bytes, err := extractBufferSourceBytes(runtime, partObj); err == nil {
								partBytes = bytes
								partBytesSet = true
							}
						}
					}
				}

				// 4. 如果不是 BufferSource 或 Blob，使用 JS ToString 语义
				if !partBytesSet {
					// 调用 JS 的 toString 方法
					str := partVal.String()
					if endings == "native" {
						str = strings.ReplaceAll(str, "\r\n", "\n")
						str = strings.ReplaceAll(str, "\r", "\n")
						if goRuntime.GOOS == "windows" {
							str = strings.ReplaceAll(str, "\n", "\r\n")
						}
					}
					partBytes = []byte(str)
					partBytesSet = true
				}

				// 检查累积大小
				partSize := int64(len(partBytes))
				if accumulatedSize+partSize > maxFileSize {
					panic(runtime.NewTypeError(fmt.Sprintf("File 大小超过限制：%d > %d 字节（构建过程中）", accumulatedSize+partSize, maxFileSize)))
				}

				buffer.Write(partBytes)
				accumulatedSize += partSize
			}
			file.data = buffer.Bytes()
		}

		// 🔥 最后再次检查（防御性编程）
		if len(file.data) > int(maxFileSize) {
			panic(runtime.NewTypeError(fmt.Sprintf("File 大小超过限制：%d > %d 字节", len(file.data), maxFileSize)))
		}

		// 第二个参数：文件名，需要遵循 DOMString 语义（Symbol 需抛错）
		if _, isSymbol := call.Arguments[1].(*goja.Symbol); isSymbol {
			panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
		}
		file.name = call.Arguments[1].String()

		// 第三个参数：options {type, lastModified}
		if optionsObj != nil {
			if typeVal := optionsObj.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) {
				file.typ = normalizeType(typeVal.String())
			}
			if lastModVal := optionsObj.Get("lastModified"); lastModVal != nil && !goja.IsUndefined(lastModVal) {
				// 与 Node 行为保持一致：允许 NaN/Infinity，并按 JS Number 语义保留
				file.lastModified = lastModVal.ToFloat()
			}
		}

		return fe.createFileObject(runtime, file)
	}
}

// createFileObject 创建 File 对象
func (fe *FetchEnhancer) createFileObject(runtime *goja.Runtime, file *JSFile) *goja.Object {
	// 创建基础对象（不通过 createBlobObject，避免设置错误的原型）
	obj := runtime.NewObject()

	// 🔥 设置 File 的原型链（File 继承自 Blob）
	if fileConstructor := runtime.Get("File"); fileConstructor != nil && !goja.IsUndefined(fileConstructor) {
		if fileCtor := fileConstructor.ToObject(runtime); fileCtor != nil {
			if fileProto := fileCtor.Get("prototype"); fileProto != nil && !goja.IsUndefined(fileProto) {
				obj.SetPrototype(fileProto.ToObject(runtime))
			}
		}
	}

	// ✅ size 和 type 继承自 Blob.prototype 的 getter
	// 不再在 File 实例上重复定义

	// File 特有属性（只读、可枚举、不可配置）- 与 Node.js/浏览器一致
	obj.DefineDataProperty("name", runtime.ToValue(file.name),
		goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_FALSE) // writable=false, enumerable=TRUE, configurable=false
	obj.DefineDataProperty("lastModified", runtime.ToValue(file.lastModified),
		goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_FALSE) // writable=false, enumerable=TRUE, configurable=false

	// 🔥 P1-3: 删除非标准的 lastModifiedDate（已废弃）
	// obj.Set("lastModifiedDate", ...) - 已移除

	// 标记（内部使用，不可枚举、不可配置）
	obj.DefineDataProperty("__isBlob", runtime.ToValue(true),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)
	obj.DefineDataProperty("__isFile", runtime.ToValue(true),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)
	obj.DefineDataProperty("__blobData", runtime.ToValue(&file.JSBlob),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)
	obj.DefineDataProperty("__fileData", runtime.ToValue(file),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)

	// 🔥 方法已在 Blob.prototype 上定义（File 继承自 Blob）
	// 🔥 Symbol.toStringTag 已在 File.prototype 上定义

	return obj
}

// RegisterBlobFileAPI 注册 Blob 和 File API
func (fe *FetchEnhancer) RegisterBlobFileAPI(runtime *goja.Runtime) error {
	// 🔥 优化：缓存常用的全局函数（避免重复 runtime.RunString）
	var (
		uint8ArrayConstructor goja.Constructor
		objectDefineProperty  goja.Callable
		symbolToStringTag     goja.Value
	)

	// 获取 Uint8Array 构造函数
	if uint8ArrayVal := runtime.Get("Uint8Array"); uint8ArrayVal != nil && !goja.IsUndefined(uint8ArrayVal) {
		uint8ArrayConstructor, _ = goja.AssertConstructor(uint8ArrayVal)
	}

	// 获取 Object.defineProperty
	if objectVal := runtime.Get("Object"); objectVal != nil && !goja.IsUndefined(objectVal) {
		if objectObj := objectVal.ToObject(runtime); objectObj != nil {
			if defProp := objectObj.Get("defineProperty"); defProp != nil && !goja.IsUndefined(defProp) {
				objectDefineProperty, _ = goja.AssertFunction(defProp)
			}
		}
	}

	// 获取 Symbol.toStringTag
	if symbolVal := runtime.Get("Symbol"); symbolVal != nil && !goja.IsUndefined(symbolVal) {
		if symbolObj := symbolVal.ToObject(runtime); symbolObj != nil {
			symbolToStringTag = symbolObj.Get("toStringTag")
		}
	}

	// 🔥 创建 Blob 构造器并设置原型
	blobConstructor := runtime.ToValue(fe.createBlobConstructor(runtime)).ToObject(runtime)

	// 🔥 显式设置 Blob 构造函数的 name，与 Node.js v25 行为保持一致
	blobConstructor.DefineDataProperty("name", runtime.ToValue("Blob"),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	blobPrototype := runtime.NewObject()

	// 🔥 在 Blob.prototype 上定义方法（而不是在实例上）
	// arrayBuffer() 方法
	blobPrototype.Set("arrayBuffer", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		blobDataVal := this.Get("__blobData")
		if blobDataVal == nil || goja.IsUndefined(blobDataVal) {
			panic(runtime.NewTypeError("arrayBuffer called on non-Blob object"))
		}
		blob, _ := blobDataVal.Export().(*JSBlob)

		promise, resolve, _ := runtime.NewPromise()
		// 🔥 返回拷贝，确保 Blob 不可变
		buf := make([]byte, len(blob.data))
		copy(buf, blob.data)
		resolve(runtime.NewArrayBuffer(buf))
		return runtime.ToValue(promise)
	})

	// text() 方法
	blobPrototype.Set("text", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		blobDataVal := this.Get("__blobData")
		if blobDataVal == nil || goja.IsUndefined(blobDataVal) {
			panic(runtime.NewTypeError("text called on non-Blob object"))
		}
		blob, _ := blobDataVal.Export().(*JSBlob)

		promise, resolve, _ := runtime.NewPromise()
		// 🔥 使用 UTF-8 解码容错，对不合法序列使用 U+FFFD 替换
		// 符合 WHATWG Encoding Standard
		decodedText := decodeUTF8WithReplacement(blob.data)
		resolve(runtime.ToValue(decodedText))
		return runtime.ToValue(promise)
	})

	// slice() 方法
	blobPrototype.Set("slice", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		blobDataVal := this.Get("__blobData")
		if blobDataVal == nil || goja.IsUndefined(blobDataVal) {
			panic(runtime.NewTypeError("slice called on non-Blob object"))
		}
		blob, _ := blobDataVal.Export().(*JSBlob)

		dataLen := int64(len(blob.data))
		var start int64
		if len(call.Arguments) > 0 {
			start = normalizeSliceIndex(call.Arguments[0], dataLen, 0)
		} else {
			start = 0
		}

		var end int64
		if len(call.Arguments) > 1 {
			end = normalizeSliceIndex(call.Arguments[1], dataLen, dataLen)
		} else {
			end = dataLen
		}

		// 确保 start <= end
		if start > end {
			start = end
		}

		// 转换为 int（安全，因为已经钳制到 dataLen）
		s := int(start)
		e := int(end)

		// 创建新的 Blob
		slicedBlob := &JSBlob{
			data: blob.data[s:e],
			typ:  "", // 默认空字符串
		}

		// 第三个参数：contentType
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			slicedBlob.typ = normalizeType(call.Arguments[2].String())
		}

		return fe.createBlobObject(runtime, slicedBlob)
	})

	// bytes() 方法（扩展 API）
	blobPrototype.Set("bytes", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		blobDataVal := this.Get("__blobData")
		if blobDataVal == nil || goja.IsUndefined(blobDataVal) {
			panic(runtime.NewTypeError("bytes called on non-Blob object"))
		}
		blob, _ := blobDataVal.Export().(*JSBlob)

		promise, resolve, _ := runtime.NewPromise()
		// 返回拷贝
		buf := make([]byte, len(blob.data))
		copy(buf, blob.data)
		arrayBuffer := runtime.NewArrayBuffer(buf)

		// 🔥 使用 Uint8Array 构造函数
		if uint8ArrayConstructor != nil {
			if uint8Array, err := uint8ArrayConstructor(nil, runtime.ToValue(arrayBuffer)); err == nil {
				resolve(uint8Array)
				return runtime.ToValue(promise)
			}
		}

		// 降级：返回 ArrayBuffer
		resolve(arrayBuffer)
		return runtime.ToValue(promise)
	})

	// stream() 方法
	blobPrototype.Set("stream", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("stream called on non-Blob object"))
		}

		blobDataVal := this.Get("__blobData")
		if blobDataVal == nil || goja.IsUndefined(blobDataVal) {
			panic(runtime.NewTypeError("stream called on non-Blob object"))
		}

		exported := blobDataVal.Export()
		if exported == nil {
			panic(runtime.NewTypeError("Blob data is nil"))
		}

		blobData, ok := exported.(*JSBlob)
		if !ok || blobData == nil {
			panic(runtime.NewTypeError("Invalid Blob data"))
		}

		streamObj := createBlobReadableStream(runtime, blobData, uint8ArrayConstructor)
		if streamObj == nil {
			panic(runtime.NewTypeError("Failed to create ReadableStream for Blob"))
		}

		return streamObj
	})

	// 🔥 在原型上添加 size 和 type 的 getter 属性（与 Node.js/浏览器一致）
	if objectDefineProperty != nil {
		// size getter
		sizeDescriptor := runtime.NewObject()
		sizeGetter := func(call goja.FunctionCall) goja.Value {
			this := call.This.ToObject(runtime)
			if blobDataVal := this.Get("__blobData"); blobDataVal != nil && !goja.IsUndefined(blobDataVal) {
				if blob, ok := blobDataVal.Export().(*JSBlob); ok {
					return runtime.ToValue(int64(len(blob.data)))
				}
			}
			return runtime.ToValue(0)
		}
		sizeDescriptor.Set("get", sizeGetter)
		sizeDescriptor.Set("enumerable", runtime.ToValue(true))
		sizeDescriptor.Set("configurable", runtime.ToValue(true))

		objectDefineProperty(goja.Undefined(),
			runtime.ToValue(blobPrototype),
			runtime.ToValue("size"),
			sizeDescriptor,
		)

		// type getter
		typeDescriptor := runtime.NewObject()
		typeGetter := func(call goja.FunctionCall) goja.Value {
			this := call.This.ToObject(runtime)
			if blobDataVal := this.Get("__blobData"); blobDataVal != nil && !goja.IsUndefined(blobDataVal) {
				if blob, ok := blobDataVal.Export().(*JSBlob); ok {
					return runtime.ToValue(blob.typ)
				}
			}
			return runtime.ToValue("")
		}
		typeDescriptor.Set("get", typeGetter)
		typeDescriptor.Set("enumerable", runtime.ToValue(true))
		typeDescriptor.Set("configurable", runtime.ToValue(true))

		objectDefineProperty(goja.Undefined(),
			runtime.ToValue(blobPrototype),
			runtime.ToValue("type"),
			typeDescriptor,
		)
	}

	// 🔥 在原型上设置 Symbol.toStringTag（不可配置）
	if objectDefineProperty != nil && symbolToStringTag != nil && !goja.IsUndefined(symbolToStringTag) {
		descriptor := runtime.NewObject()
		descriptor.Set("value", runtime.ToValue("Blob"))
		descriptor.Set("writable", runtime.ToValue(false))
		descriptor.Set("enumerable", runtime.ToValue(false))
		descriptor.Set("configurable", runtime.ToValue(false))

		objectDefineProperty(goja.Undefined(),
			runtime.ToValue(blobPrototype),
			symbolToStringTag,
			descriptor,
		)
	}

	// ✅ 方法保持可枚举（与 Node.js/浏览器一致）
	// 不再设置 enumerable: false，使用默认的可枚举行为

	// 设置 Blob.prototype.constructor（不可枚举，与 Node.js/浏览器一致）
	blobPrototype.Set("constructor", blobConstructor)
	blobConstructor.Set("prototype", blobPrototype)

	// 🔥 将 constructor 设为不可枚举（与 Node.js/浏览器一致）
	if objectDefineProperty != nil {
		descriptor := runtime.NewObject()
		descriptor.Set("value", blobConstructor)
		descriptor.Set("writable", runtime.ToValue(true))
		descriptor.Set("enumerable", runtime.ToValue(false))
		descriptor.Set("configurable", runtime.ToValue(true))

		objectDefineProperty(goja.Undefined(),
			runtime.ToValue(blobPrototype),
			runtime.ToValue("constructor"),
			descriptor,
		)
	}

	// 注册 Blob 构造器
	runtime.Set("Blob", blobConstructor)

	// 🔥 创建 File 构造器并设置原型（继承自 Blob）
	fileConstructor := runtime.ToValue(fe.createFileConstructor(runtime)).ToObject(runtime)
	filePrototype := runtime.NewObject()

	// File 的原型指向 Blob 的原型（继承关系）
	filePrototype.SetPrototype(blobPrototype)

	// 🔥 在 File.prototype 上设置 Symbol.toStringTag（不可配置）
	if objectDefineProperty != nil && symbolToStringTag != nil && !goja.IsUndefined(symbolToStringTag) {
		descriptor := runtime.NewObject()
		descriptor.Set("value", runtime.ToValue("File"))
		descriptor.Set("writable", runtime.ToValue(false))
		descriptor.Set("enumerable", runtime.ToValue(false))
		descriptor.Set("configurable", runtime.ToValue(false))

		objectDefineProperty(goja.Undefined(),
			runtime.ToValue(filePrototype),
			symbolToStringTag,
			descriptor,
		)
	}

	// ✅ File.prototype.constructor 不可枚举（与 Node.js/浏览器一致）
	filePrototype.Set("constructor", fileConstructor)
	fileConstructor.Set("prototype", filePrototype)

	// 🔥 将 File.prototype.constructor 设为不可枚举（与 Node.js/浏览器一致）
	if objectDefineProperty != nil {
		descriptor := runtime.NewObject()
		descriptor.Set("value", fileConstructor)
		descriptor.Set("writable", runtime.ToValue(true))
		descriptor.Set("enumerable", runtime.ToValue(false))
		descriptor.Set("configurable", runtime.ToValue(true))

		objectDefineProperty(goja.Undefined(),
			runtime.ToValue(filePrototype),
			runtime.ToValue("constructor"),
			descriptor,
		)
	}

	// 注册 File 构造器
	runtime.Set("File", fileConstructor)

	// 🔥 在 JS 层包装全局 Blob 构造函数：
	// - 禁止直接调用 Blob([...])（非 new 调用抛 TypeError）
	// - 内部仍然使用底层原生 Blob 实现，保持所有行为与 Node.js v25 一致
	wrapperScript := `
(function (global) {
  var InternalBlob = global.Blob;
  if (typeof InternalBlob !== 'function') {
    return;
  }

  function Blob() {
    if (!(this instanceof Blob)) {
      throw new TypeError("Class constructor Blob cannot be invoked without 'new'");
    }
    return new InternalBlob(...arguments);
  }

  Blob.prototype = InternalBlob.prototype;

  try {
    if (typeof Object !== 'undefined' && Object.setPrototypeOf) {
      Object.setPrototypeOf(Blob, InternalBlob);
    }
  } catch (e) {
    // 忽略 setPrototypeOf 失败
  }

  try {
    if (typeof Object !== 'undefined' && Object.defineProperty) {
      Object.defineProperty(Blob, 'name', {
        value: 'Blob',
        writable: false,
        enumerable: false,
        configurable: true
      });
    }
  } catch (e) {
    // 忽略 defineProperty 失败
  }

  global.Blob = Blob;
})(typeof globalThis !== 'undefined' ? globalThis : this);
`
	if _, err := runtime.RunString(wrapperScript); err != nil {
		return fmt.Errorf("包装 Blob 构造函数失败: %w", err)
	}

	return nil
}

// extractBlobData 从 Blob/File 对象提取数据
func (fe *FetchEnhancer) extractBlobData(obj *goja.Object) ([]byte, string, error) {
	// 检查是否是 Blob 对象
	if isBlobVal := obj.Get("__isBlob"); goja.IsUndefined(isBlobVal) || !isBlobVal.ToBoolean() {
		return nil, "", fmt.Errorf("不是一个 Blob 对象")
	}

	// 获取数据
	blobDataVal := obj.Get("__blobData")
	if goja.IsUndefined(blobDataVal) {
		return nil, "", fmt.Errorf("无效的 Blob 对象：缺少数据")
	}

	// 安全的类型断言：先检查 Export() 是否为 nil
	exported := blobDataVal.Export()
	if exported == nil {
		return nil, "", fmt.Errorf("blob 数据为 nil")
	}

	blob, ok := exported.(*JSBlob)
	if !ok {
		return nil, "", fmt.Errorf("无效的 blob 数据类型：获得 %T", exported)
	}

	// 检查 Blob 大小限制（安全检查 fe 是否为 nil）
	maxBlobSize := int64(100 * 1024 * 1024) // 默认 100MB
	if fe != nil && fe.maxBlobFileSize > 0 {
		maxBlobSize = fe.maxBlobFileSize
	}
	if len(blob.data) > int(maxBlobSize) {
		return nil, "", fmt.Errorf("blob 大小超过限制：%d > %d 字节", len(blob.data), maxBlobSize)
	}

	return blob.data, blob.typ, nil
}

// extractFileData 从 File 对象提取数据
func (fe *FetchEnhancer) extractFileData(obj *goja.Object) ([]byte, string, string, error) {
	// 检查是否是 File 对象
	if isFileVal := obj.Get("__isFile"); goja.IsUndefined(isFileVal) || !isFileVal.ToBoolean() {
		return nil, "", "", fmt.Errorf("不是一个 File 对象")
	}

	// 获取数据
	fileDataVal := obj.Get("__fileData")
	if goja.IsUndefined(fileDataVal) {
		return nil, "", "", fmt.Errorf("无效的 File 对象：缺少数据")
	}

	// 安全的类型断言：先检查 Export() 是否为 nil
	exported := fileDataVal.Export()
	if exported == nil {
		return nil, "", "", fmt.Errorf("file 数据为 nil")
	}

	file, ok := exported.(*JSFile)
	if !ok {
		return nil, "", "", fmt.Errorf("无效的 file 数据类型：获得 %T", exported)
	}

	// 检查 File 大小限制（安全检查 fe 是否为 nil）
	maxFileSize := int64(100 * 1024 * 1024) // 默认 100MB
	if fe != nil && fe.maxBlobFileSize > 0 {
		maxFileSize = fe.maxBlobFileSize
	}
	if len(file.data) > int(maxFileSize) {
		return nil, "", "", fmt.Errorf("file 大小超过限制：%d > %d 字节", len(file.data), maxFileSize)
	}

	return file.data, file.typ, file.name, nil
}

// 🔥 关键修复：FetchEnhancer 类型别名，用于避免循环依赖
// 在 internal/blob 包中，我们不能直接引用 enhance_modules.FetchEnhancer
// 因此需要定义一个接口或结构体别名

// FetchEnhancer 是 enhance_modules.FetchEnhancer 的精简版本
// 只包含 Blob/File API 需要的字段
type FetchEnhancer struct {
	maxBlobFileSize int64 // Blob/File 最大大小（字节）
}

// RegisterBlobFileConstructors 注册 Blob 和 File 构造器到 runtime
// 这是一个独立的函数，不依赖 FetchEnhancer 实例
func RegisterBlobFileConstructors(runtime *goja.Runtime, maxBlobFileSize int64) error {
	fe := &FetchEnhancer{maxBlobFileSize: maxBlobFileSize}
	return fe.RegisterBlobFileAPI(runtime)
}

func normalizeSliceIndex(value goja.Value, dataLen int64, defaultValue int64) int64 {
	if value == nil || goja.IsUndefined(value) {
		return defaultValue
	}

	relative := convertToInt64(value)
	return clampIndex(relative, dataLen)
}

func clampIndex(val int64, dataLen int64) int64 {
	if val < 0 {
		val = dataLen + val
		if val < 0 {
			return 0
		}
	}
	if val > dataLen {
		return dataLen
	}
	return val
}

func convertToInt64(value goja.Value) int64 {
	const bitLength = 64.0

	num := value.ToFloat()
	if math.IsNaN(num) || num == 0 || math.IsInf(num, 0) {
		return 0
	}

	num = math.Trunc(num)

	modulus := math.Exp2(bitLength)
	remainder := math.Mod(num, modulus)
	if remainder == 0 {
		remainder = 0
	}

	signBoundary := math.Exp2(bitLength - 1)
	if remainder >= signBoundary {
		remainder -= modulus
	}

	return int64(remainder)
}
