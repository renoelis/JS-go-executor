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

		// 解析参数：new Blob([parts], options)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			// 第一个参数：数据parts数组
			if partsVal := call.Arguments[0]; partsVal != nil {
				parts := partsVal.Export()
				if partsArray, ok := parts.([]interface{}); ok {
					var buffer bytes.Buffer
					for _, part := range partsArray {
						switch v := part.(type) {
						case string:
							buffer.WriteString(v)
						case []byte:
							buffer.Write(v)
						case goja.ArrayBuffer:
							buffer.Write(v.Bytes())
						default:
							// 其他类型转为字符串
							buffer.WriteString(fmt.Sprintf("%v", v))
						}
					}
					blob.data = buffer.Bytes()
				}
			}
		}

		// 检查 Blob 大小限制（安全检查 fe 是否为 nil）
		maxBlobSize := int64(100 * 1024 * 1024) // 默认 100MB
		if fe != nil && fe.maxBlobFileSize > 0 {
			maxBlobSize = fe.maxBlobFileSize
		}
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

		// 第一个参数：数据parts数组
		if partsVal := call.Arguments[0]; partsVal != nil {
			parts := partsVal.Export()
			if partsArray, ok := parts.([]interface{}); ok {
				var buffer bytes.Buffer
				for _, part := range partsArray {
					switch v := part.(type) {
					case string:
						buffer.WriteString(v)
					case []byte:
						buffer.Write(v)
					case goja.ArrayBuffer:
						buffer.Write(v.Bytes())
					default:
						buffer.WriteString(fmt.Sprintf("%v", v))
					}
				}
				file.data = buffer.Bytes()
			}
		}

		// 检查 File 大小限制（安全检查 fe 是否为 nil）
		maxFileSize := int64(100 * 1024 * 1024) // 默认 100MB
		if fe != nil && fe.maxBlobFileSize > 0 {
			maxFileSize = fe.maxBlobFileSize
		}
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
	// 先创建 Blob 对象（继承）
	obj := fe.createBlobObject(runtime, &file.JSBlob)

	// 添加 File 特有属性
	obj.Set("name", file.name)
	obj.Set("lastModified", file.lastModified)
	obj.Set("lastModifiedDate", time.UnixMilli(file.lastModified).Format(time.RFC3339))

	// 标记为 File 对象
	obj.Set("__isFile", true)
	obj.Set("__fileData", file)

	return obj
}

// RegisterBlobFileAPI 注册 Blob 和 File API
func (fe *FetchEnhancer) RegisterBlobFileAPI(runtime *goja.Runtime) error {
	// 注册 Blob 构造器
	runtime.Set("Blob", fe.createBlobConstructor(runtime))

	// 注册 File 构造器
	runtime.Set("File", fe.createFileConstructor(runtime))

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
