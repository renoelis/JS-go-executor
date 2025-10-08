package enhance_modules

import (
	"bytes"
	"fmt"
	"time"

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

// createBlobConstructor 创建 Blob 构造器
func (fe *FetchEnhancer) createBlobConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	return func(call goja.ConstructorCall) *goja.Object {
		// 🔥 安全检查：fe 不能为 nil
		if fe == nil {
			panic(runtime.NewTypeError("FetchEnhancer is nil in Blob constructor"))
		}

		blob := &JSBlob{
			typ: "", // 默认类型为空字符串（符合 Web 标准）
		}

		// 🔥 提前获取大小限制（避免内存消耗后才检查）
		maxBlobSize := int64(100 * 1024 * 1024) // 默认 100MB
		if fe != nil && fe.maxBlobFileSize > 0 {
			maxBlobSize = fe.maxBlobFileSize
		}

		// 解析参数：new Blob([parts], options)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			// 第一个参数：数据parts数组
			if partsVal := call.Arguments[0]; partsVal != nil {
				parts := partsVal.Export()
				if partsArray, ok := parts.([]interface{}); ok {
					// 🔥 提前检查数组长度（防止巨大稀疏数组）
					// 即使数组元素是 undefined，过大的数组长度也会消耗内存
					arrayLen := int64(len(partsArray))
					if arrayLen > maxBlobSize {
						panic(runtime.NewTypeError(fmt.Sprintf("Blob parts array too large: %d elements > %d bytes limit", arrayLen, maxBlobSize)))
					}

					var buffer bytes.Buffer
					var accumulatedSize int64 = 0

					for _, part := range partsArray {
						var partSize int

						switch v := part.(type) {
						case string:
							partSize = len(v)
							// 🔥 检查累积大小（写入前）
							if accumulatedSize+int64(partSize) > maxBlobSize {
								panic(runtime.NewTypeError(fmt.Sprintf("Blob size exceeds limit: %d > %d bytes (during construction)", accumulatedSize+int64(partSize), maxBlobSize)))
							}
							buffer.WriteString(v)
						case []byte:
							partSize = len(v)
							// 🔥 检查累积大小（写入前）
							if accumulatedSize+int64(partSize) > maxBlobSize {
								panic(runtime.NewTypeError(fmt.Sprintf("Blob size exceeds limit: %d > %d bytes (during construction)", accumulatedSize+int64(partSize), maxBlobSize)))
							}
							buffer.Write(v)
						case goja.ArrayBuffer:
							partSize = len(v.Bytes())
							// 🔥 检查累积大小（写入前）
							if accumulatedSize+int64(partSize) > maxBlobSize {
								panic(runtime.NewTypeError(fmt.Sprintf("Blob size exceeds limit: %d > %d bytes (during construction)", accumulatedSize+int64(partSize), maxBlobSize)))
							}
							buffer.Write(v.Bytes())
						default:
							// 其他类型转为字符串
							str := fmt.Sprintf("%v", v)
							partSize = len(str)
							// 🔥 检查累积大小（写入前）
							if accumulatedSize+int64(partSize) > maxBlobSize {
								panic(runtime.NewTypeError(fmt.Sprintf("Blob size exceeds limit: %d > %d bytes (during construction)", accumulatedSize+int64(partSize), maxBlobSize)))
							}
							buffer.WriteString(str)
						}

						accumulatedSize += int64(partSize)
					}
					blob.data = buffer.Bytes()
				}
			}
		}

		// 🔥 最后再次检查（防御性编程）
		if len(blob.data) > int(maxBlobSize) {
			panic(runtime.NewTypeError(fmt.Sprintf("Blob size exceeds limit: %d > %d bytes", len(blob.data), maxBlobSize)))
		}

		// 第二个参数：options {type: "text/plain"}
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			if optionsObj := call.Arguments[1].ToObject(runtime); optionsObj != nil {
				// 🔥 修复：同时检查 nil 和 undefined
				if typeVal := optionsObj.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) {
					blob.typ = typeVal.String()
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

	// size 属性
	obj.Set("size", int64(len(blob.data)))

	// type 属性
	obj.Set("type", blob.typ)

	// slice(start, end, contentType) 方法
	obj.Set("slice", func(call goja.FunctionCall) goja.Value {
		dataLen := int64(len(blob.data))
		start := int64(0)
		end := dataLen

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

		// 创建新的 Blob
		slicedBlob := &JSBlob{
			data: blob.data[start:end],
			typ:  blob.typ,
		}

		// 第三个参数可以覆盖类型
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			slicedBlob.typ = call.Arguments[2].String()
		}

		return fe.createBlobObject(runtime, slicedBlob)
	})

	// arrayBuffer() 方法 - 返回 Promise<ArrayBuffer>
	obj.Set("arrayBuffer", func(call goja.FunctionCall) goja.Value {
		promise, resolve, _ := runtime.NewPromise()
		// 同步返回（因为数据已在内存中）
		resolve(runtime.NewArrayBuffer(blob.data))
		return runtime.ToValue(promise)
	})

	// text() 方法 - 返回 Promise<string>
	obj.Set("text", func(call goja.FunctionCall) goja.Value {
		promise, resolve, _ := runtime.NewPromise()
		resolve(runtime.ToValue(string(blob.data)))
		return runtime.ToValue(promise)
	})

	// 标记为 Blob 对象
	obj.Set("__isBlob", true)
	obj.Set("__blobData", blob)

	return obj
}

// createFileConstructor 创建 File 构造器
func (fe *FetchEnhancer) createFileConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	return func(call goja.ConstructorCall) *goja.Object {
		// 安全检查：fe 不能为 nil
		if fe == nil {
			panic(runtime.NewTypeError("FetchEnhancer is nil in File constructor"))
		}

		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("File constructor requires at least 2 arguments"))
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
		if partsVal := call.Arguments[0]; partsVal != nil {
			parts := partsVal.Export()
			if partsArray, ok := parts.([]interface{}); ok {
				// 🔥 提前检查数组长度（防止巨大稀疏数组）
				// 即使数组元素是 undefined，过大的数组长度也会消耗内存
				arrayLen := int64(len(partsArray))
				if arrayLen > maxFileSize {
					panic(runtime.NewTypeError(fmt.Sprintf("File parts array too large: %d elements > %d bytes limit", arrayLen, maxFileSize)))
				}

				var buffer bytes.Buffer
				var accumulatedSize int64 = 0

				for _, part := range partsArray {
					var partSize int

					switch v := part.(type) {
					case string:
						partSize = len(v)
						// 🔥 检查累积大小（写入前）
						if accumulatedSize+int64(partSize) > maxFileSize {
							panic(runtime.NewTypeError(fmt.Sprintf("File size exceeds limit: %d > %d bytes (during construction)", accumulatedSize+int64(partSize), maxFileSize)))
						}
						buffer.WriteString(v)
					case []byte:
						partSize = len(v)
						// 🔥 检查累积大小（写入前）
						if accumulatedSize+int64(partSize) > maxFileSize {
							panic(runtime.NewTypeError(fmt.Sprintf("File size exceeds limit: %d > %d bytes (during construction)", accumulatedSize+int64(partSize), maxFileSize)))
						}
						buffer.Write(v)
					case goja.ArrayBuffer:
						partSize = len(v.Bytes())
						// 🔥 检查累积大小（写入前）
						if accumulatedSize+int64(partSize) > maxFileSize {
							panic(runtime.NewTypeError(fmt.Sprintf("File size exceeds limit: %d > %d bytes (during construction)", accumulatedSize+int64(partSize), maxFileSize)))
						}
						buffer.Write(v.Bytes())
					default:
						str := fmt.Sprintf("%v", v)
						partSize = len(str)
						// 🔥 检查累积大小（写入前）
						if accumulatedSize+int64(partSize) > maxFileSize {
							panic(runtime.NewTypeError(fmt.Sprintf("File size exceeds limit: %d > %d bytes (during construction)", accumulatedSize+int64(partSize), maxFileSize)))
						}
						buffer.WriteString(str)
					}

					accumulatedSize += int64(partSize)
				}
				file.data = buffer.Bytes()
			}
		}

		// 🔥 最后再次检查（防御性编程）
		if len(file.data) > int(maxFileSize) {
			panic(runtime.NewTypeError(fmt.Sprintf("File size exceeds limit: %d > %d bytes", len(file.data), maxFileSize)))
		}

		// 第二个参数：文件名
		file.name = call.Arguments[1].String()

		// 第三个参数：options {type, lastModified}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			if optionsObj := call.Arguments[2].ToObject(runtime); optionsObj != nil {
				if typeVal := optionsObj.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) {
					file.typ = typeVal.String()
				}
				if lastModVal := optionsObj.Get("lastModified"); lastModVal != nil && !goja.IsUndefined(lastModVal) {
					file.lastModified = lastModVal.ToInteger()
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

	// Blob 属性
	obj.Set("size", int64(len(file.data)))
	obj.Set("type", file.typ)

	// File 特有属性
	obj.Set("name", file.name)
	obj.Set("lastModified", file.lastModified)
	obj.Set("lastModifiedDate", time.UnixMilli(file.lastModified).Format(time.RFC3339))

	// Blob 方法（需要手动添加，因为没有通过 createBlobObject）
	obj.Set("slice", func(call goja.FunctionCall) goja.Value {
		dataLen := int64(len(file.data))
		start := int64(0)
		end := dataLen

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

		if start > end {
			start = end
		}

		slicedBlob := &JSBlob{
			data: file.data[start:end],
			typ:  file.typ,
		}

		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			slicedBlob.typ = call.Arguments[2].String()
		}

		return fe.createBlobObject(runtime, slicedBlob)
	})

	obj.Set("arrayBuffer", func(call goja.FunctionCall) goja.Value {
		promise, resolve, _ := runtime.NewPromise()
		resolve(runtime.NewArrayBuffer(file.data))
		return runtime.ToValue(promise)
	})

	obj.Set("text", func(call goja.FunctionCall) goja.Value {
		promise, resolve, _ := runtime.NewPromise()
		resolve(runtime.ToValue(string(file.data)))
		return runtime.ToValue(promise)
	})

	// 标记
	obj.Set("__isBlob", true)
	obj.Set("__isFile", true)
	obj.Set("__blobData", &file.JSBlob)
	obj.Set("__fileData", file)

	return obj
}

// RegisterBlobFileAPI 注册 Blob 和 File API
func (fe *FetchEnhancer) RegisterBlobFileAPI(runtime *goja.Runtime) error {
	// 🔥 创建 Blob 构造器并设置原型
	blobConstructor := runtime.ToValue(fe.createBlobConstructor(runtime)).ToObject(runtime)
	blobPrototype := runtime.NewObject()

	// 设置 Blob.prototype.constructor
	blobPrototype.Set("constructor", blobConstructor)
	blobConstructor.Set("prototype", blobPrototype)

	// 注册 Blob 构造器
	runtime.Set("Blob", blobConstructor)

	// 🔥 创建 File 构造器并设置原型（继承自 Blob）
	fileConstructor := runtime.ToValue(fe.createFileConstructor(runtime)).ToObject(runtime)
	filePrototype := runtime.NewObject()

	// File 的原型指向 Blob 的原型（继承关系）
	filePrototype.SetPrototype(blobPrototype)
	filePrototype.Set("constructor", fileConstructor)
	fileConstructor.Set("prototype", filePrototype)

	// 注册 File 构造器
	runtime.Set("File", fileConstructor)

	return nil
}

// extractBlobData 从 Blob/File 对象提取数据
func (fe *FetchEnhancer) extractBlobData(obj *goja.Object) ([]byte, string, error) {
	// 检查是否是 Blob 对象
	if isBlobVal := obj.Get("__isBlob"); goja.IsUndefined(isBlobVal) || !isBlobVal.ToBoolean() {
		return nil, "", fmt.Errorf("not a Blob object")
	}

	// 获取数据
	blobDataVal := obj.Get("__blobData")
	if goja.IsUndefined(blobDataVal) {
		return nil, "", fmt.Errorf("invalid Blob object: missing data")
	}

	// 安全的类型断言：先检查 Export() 是否为 nil
	exported := blobDataVal.Export()
	if exported == nil {
		return nil, "", fmt.Errorf("blob data is nil")
	}

	blob, ok := exported.(*JSBlob)
	if !ok {
		return nil, "", fmt.Errorf("invalid blob data type: got %T", exported)
	}

	// 检查 Blob 大小限制（安全检查 fe 是否为 nil）
	maxBlobSize := int64(100 * 1024 * 1024) // 默认 100MB
	if fe != nil && fe.maxBlobFileSize > 0 {
		maxBlobSize = fe.maxBlobFileSize
	}
	if len(blob.data) > int(maxBlobSize) {
		return nil, "", fmt.Errorf("blob size exceeds limit: %d > %d bytes", len(blob.data), maxBlobSize)
	}

	return blob.data, blob.typ, nil
}

// extractFileData 从 File 对象提取数据
func (fe *FetchEnhancer) extractFileData(obj *goja.Object) ([]byte, string, string, error) {
	// 检查是否是 File 对象
	if isFileVal := obj.Get("__isFile"); goja.IsUndefined(isFileVal) || !isFileVal.ToBoolean() {
		return nil, "", "", fmt.Errorf("not a File object")
	}

	// 获取数据
	fileDataVal := obj.Get("__fileData")
	if goja.IsUndefined(fileDataVal) {
		return nil, "", "", fmt.Errorf("invalid File object: missing data")
	}

	// 安全的类型断言：先检查 Export() 是否为 nil
	exported := fileDataVal.Export()
	if exported == nil {
		return nil, "", "", fmt.Errorf("file data is nil")
	}

	file, ok := exported.(*JSFile)
	if !ok {
		return nil, "", "", fmt.Errorf("invalid file data type: got %T", exported)
	}

	// 检查 File 大小限制（安全检查 fe 是否为 nil）
	maxFileSize := int64(100 * 1024 * 1024) // 默认 100MB
	if fe != nil && fe.maxBlobFileSize > 0 {
		maxFileSize = fe.maxBlobFileSize
	}
	if len(file.data) > int(maxFileSize) {
		return nil, "", "", fmt.Errorf("file size exceeds limit: %d > %d bytes", len(file.data), maxFileSize)
	}

	return file.data, file.typ, file.name, nil
}
