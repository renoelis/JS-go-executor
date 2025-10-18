package enhance_modules

import (
	"bytes"
	"fmt"
	goRuntime "runtime"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/dop251/goja"
)

// JSBlob Blob 对象的内部表示
type JSBlob struct {
	data []byte // 数据
	typ  string // MIME 类型
}

// JSFile File 对象的内部表示（继承 Blob）
type JSFile struct {
	JSBlob
	name         string // 文件名
	lastModified int64  // 最后修改时间（Unix 毫秒）
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
// 这些 panic 会被上层的 defer recover 捕获，转换为 JavaScript TypeError
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
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
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
					var partBytes []byte

					// 1. 检查是否是 Blob/File
					if partObj, ok := partVal.(*goja.Object); ok {
						if isBlob := partObj.Get("__isBlob"); isBlob != nil && !goja.IsUndefined(isBlob) && isBlob.ToBoolean() {
							// 提取 Blob 数据
							if blobDataVal := partObj.Get("__blobData"); blobDataVal != nil && !goja.IsUndefined(blobDataVal) {
								if blobData, ok := blobDataVal.Export().(*JSBlob); ok {
									partBytes = blobData.data
								}
							}
						} else if exported := partVal.Export(); exported != nil {
							// 2. 检查是否是 ArrayBuffer
							if ab, ok := exported.(goja.ArrayBuffer); ok {
								partBytes = ab.Bytes()
							} else if partObj != nil {
								// 3. 检查是否是 TypedArray 或 DataView
								if bytes, err := extractBufferSourceBytes(runtime, partObj); err == nil {
									partBytes = bytes
								}
								// 如果提取失败，partBytes 保持 nil，会走到 toString() 逻辑
							}
						}
					}

					// 4. 如果不是 BufferSource 或 Blob，使用 JS ToString 语义
					if partBytes == nil {
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
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
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

	// size 属性（只读、不可配置）
	obj.DefineDataProperty("size", runtime.ToValue(int64(len(blob.data))),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE) // writable=false, enumerable=false, configurable=false

	// type 属性（只读、不可配置）
	obj.DefineDataProperty("type", runtime.ToValue(blob.typ),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE) // writable=false, enumerable=false, configurable=false

	// 标记为 Blob 对象（内部使用，不可枚举、不可配置）
	obj.DefineDataProperty("__isBlob", runtime.ToValue(true),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)
	obj.DefineDataProperty("__blobData", runtime.ToValue(blob),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)

	// 🔥 方法已在 Blob.prototype 上定义，不需要在实例上重复设置
	// 🔥 Symbol.toStringTag 也已在 Blob.prototype 上定义

	return obj
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
			lastModified: time.Now().UnixMilli(),
		}

		// 🔥 提前获取大小限制（避免内存消耗后才检查）
		maxFileSize := int64(100 * 1024 * 1024) // 默认 100MB
		if fe != nil && fe.maxBlobFileSize > 0 {
			maxFileSize = fe.maxBlobFileSize
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
				
				var partBytes []byte

				// 1. 检查是否是 Blob/File
				if partObj, ok := partVal.(*goja.Object); ok {
					if isBlob := partObj.Get("__isBlob"); isBlob != nil && !goja.IsUndefined(isBlob) && isBlob.ToBoolean() {
						// 提取 Blob 数据
						if blobDataVal := partObj.Get("__blobData"); blobDataVal != nil && !goja.IsUndefined(blobDataVal) {
							if blobData, ok := blobDataVal.Export().(*JSBlob); ok {
								partBytes = blobData.data
							}
						}
					} else if exported := partVal.Export(); exported != nil {
						// 2. 检查是否是 ArrayBuffer
						if ab, ok := exported.(goja.ArrayBuffer); ok {
							partBytes = ab.Bytes()
						} else if partObj != nil {
							// 3. 检查是否是 TypedArray 或 DataView
							if bytes, err := extractBufferSourceBytes(runtime, partObj); err == nil {
								partBytes = bytes
							}
						}
					}
				}

				// 4. 如果不是 BufferSource 或 Blob，使用 JS ToString 语义
				if partBytes == nil {
					// 调用 JS 的 toString 方法
					str := partVal.String()
					partBytes = []byte(str)
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

		// 第二个参数：文件名
		file.name = call.Arguments[1].String()

		// 第三个参数：options {type, lastModified}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			if optionsObj := call.Arguments[2].ToObject(runtime); optionsObj != nil {
				if typeVal := optionsObj.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) {
					file.typ = normalizeType(typeVal.String())
				}
				if lastModVal := optionsObj.Get("lastModified"); lastModVal != nil && !goja.IsUndefined(lastModVal) {
					lastMod := lastModVal.ToInteger()
					// 可选：将负值 clamp 到 0
					if lastMod < 0 {
						lastMod = 0
					}
					file.lastModified = lastMod
				}
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

	// Blob 属性（只读、不可配置）
	obj.DefineDataProperty("size", runtime.ToValue(int64(len(file.data))),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE) // writable=false, enumerable=false, configurable=false
	obj.DefineDataProperty("type", runtime.ToValue(file.typ),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE) // writable=false, enumerable=false, configurable=false

	// File 特有属性（只读、不可配置）
	obj.DefineDataProperty("name", runtime.ToValue(file.name),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE) // writable=false, enumerable=false, configurable=false
	obj.DefineDataProperty("lastModified", runtime.ToValue(file.lastModified),
		goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE) // writable=false, enumerable=false, configurable=false

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
	// 🔥 P1-4: 缓存 Uint8Array 工厂函数（避免每次 bytes() 都 RunString）
	var uint8ArrayFactory goja.Callable
	factorySrc := `(function(ab){ return new Uint8Array(ab); })`
	if fnVal, err := runtime.RunString(factorySrc); err == nil {
		if factory, ok := goja.AssertFunction(fnVal); ok {
			uint8ArrayFactory = factory
		}
	}

	// 🔥 创建 Blob 构造器并设置原型
	blobConstructor := runtime.ToValue(fe.createBlobConstructor(runtime)).ToObject(runtime)
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
		start := int64(0)
		end := dataLen

		// 第一个参数：start
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			start = call.Arguments[0].ToInteger()
			if start < 0 {
				start = dataLen + start
				if start < 0 {
					start = 0
				}
			}
			if start > dataLen {
				start = dataLen
			}
		}

		// 第二个参数：end
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			end = call.Arguments[1].ToInteger()
			if end < 0 {
				end = dataLen + end
				if end < 0 {
					end = 0
				}
			}
			if end > dataLen {
				end = dataLen
			}
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

		// 🔥 使用缓存的 Uint8Array 工厂函数
		if uint8ArrayFactory != nil {
			if uint8Array, err := uint8ArrayFactory(goja.Undefined(), runtime.ToValue(arrayBuffer)); err == nil {
				resolve(uint8Array)
				return runtime.ToValue(promise)
			}
		}

		// 降级：返回 ArrayBuffer
		resolve(arrayBuffer)
		return runtime.ToValue(promise)
	})

	// stream() 方法（占位符）
	blobPrototype.Set("stream", func(call goja.FunctionCall) goja.Value {
		panic(runtime.NewTypeError("Blob.stream() 需要 Streams API 支持，当前未实现"))
	})

	// 🔥 P2-2: 在原型上设置 Symbol.toStringTag（不可配置）
	script := `(function(proto) {
		if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
			Object.defineProperty(proto, Symbol.toStringTag, {
				value: 'Blob',
				writable: false,
				enumerable: false,
				configurable: false
			});
		}
	})`
	if setterVal, err := runtime.RunString(script); err == nil {
		if setter, ok := goja.AssertFunction(setterVal); ok {
			setter(goja.Undefined(), runtime.ToValue(blobPrototype))
		}
	}

	// 🔥 P1-3: 设置原型方法为不可枚举
	makeNonEnumerableScript := `(function(proto, names){
		names.forEach(function(n){
			var d = Object.getOwnPropertyDescriptor(proto, n);
			if (d && d.enumerable) {
				Object.defineProperty(proto, n, {
					value: d.value,
					writable: true,
					enumerable: false,
					configurable: true
				});
			}
		});
	})`
	if makeNonEnumVal, err := runtime.RunString(makeNonEnumerableScript); err == nil {
		if makeNonEnum, ok := goja.AssertFunction(makeNonEnumVal); ok {
			methodNames := []string{"arrayBuffer", "text", "slice", "bytes", "stream"}
			makeNonEnum(goja.Undefined(), runtime.ToValue(blobPrototype), runtime.ToValue(methodNames))
		}
	}

	// 设置 Blob.prototype.constructor（不可枚举）
	blobPrototype.Set("constructor", blobConstructor)
	blobConstructor.Set("prototype", blobPrototype)
	
	// 🔥 将 constructor 设为不可枚举
	defineCtorScript := `(function(proto, ctor){
		Object.defineProperty(proto, "constructor", {
			value: ctor,
			writable: true,
			enumerable: false,
			configurable: true
		});
	})`
	if defineCtorVal, err := runtime.RunString(defineCtorScript); err == nil {
		if defineCtorFunc, ok := goja.AssertFunction(defineCtorVal); ok {
			defineCtorFunc(goja.Undefined(), runtime.ToValue(blobPrototype), runtime.ToValue(blobConstructor))
		}
	}

	// 注册 Blob 构造器
	runtime.Set("Blob", blobConstructor)

	// 🔥 创建 File 构造器并设置原型（继承自 Blob）
	fileConstructor := runtime.ToValue(fe.createFileConstructor(runtime)).ToObject(runtime)
	filePrototype := runtime.NewObject()

	// File 的原型指向 Blob 的原型（继承关系）
	filePrototype.SetPrototype(blobPrototype)

	// 🔥 在 File.prototype 上设置 Symbol.toStringTag（不可配置）
	fileScript := `(function(proto) {
		if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
			Object.defineProperty(proto, Symbol.toStringTag, {
				value: 'File',
				writable: false,
				enumerable: false,
				configurable: false
			});
		}
	})`
	if fileSetterVal, err := runtime.RunString(fileScript); err == nil {
		if fileSetter, ok := goja.AssertFunction(fileSetterVal); ok {
			fileSetter(goja.Undefined(), runtime.ToValue(filePrototype))
		}
	}

	filePrototype.Set("constructor", fileConstructor)
	fileConstructor.Set("prototype", filePrototype)
	
	// 🔥 将 File.prototype.constructor 设为不可枚举
	if defineCtorVal, err := runtime.RunString(defineCtorScript); err == nil {
		if defineCtorFunc, ok := goja.AssertFunction(defineCtorVal); ok {
			defineCtorFunc(goja.Undefined(), runtime.ToValue(filePrototype), runtime.ToValue(fileConstructor))
		}
	}

	// 注册 File 构造器
	runtime.Set("File", fileConstructor)

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
