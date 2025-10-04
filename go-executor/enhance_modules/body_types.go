package enhance_modules

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"math"
	"net/url"
	"sort"
	"strings"

	"github.com/dop251/goja"
)

// BodyTypeHandler 处理各种 Body 类型
type BodyTypeHandler struct{}

// NewBodyTypeHandler 创建 Body 类型处理器
func NewBodyTypeHandler() *BodyTypeHandler {
	return &BodyTypeHandler{}
}

// ProcessBody 处理各种类型的 body，返回 io.Reader, contentType, contentLength
func (h *BodyTypeHandler) ProcessBody(runtime *goja.Runtime, body interface{}) (io.Reader, string, int64, error) {
	if body == nil {
		return nil, "", 0, nil
	}

	// 1. 字符串
	if str, ok := body.(string); ok {
		return strings.NewReader(str), "", int64(len(str)), nil
	}

	// 2. 字节数组
	if data, ok := body.([]byte); ok {
		return bytes.NewReader(data), "", int64(len(data)), nil
	}

	// 3. io.Reader
	if reader, ok := body.(io.Reader); ok {
		return reader, "", -1, nil // chunked transfer
	}

	// 4. goja.Object - 需要进一步判断类型
	if obj, ok := body.(*goja.Object); ok {
		// 4.1 检查是否是 TypedArray (Uint8Array, Int8Array等)
		if h.isTypedArray(obj) {
			data, err := h.typedArrayToBytes(obj)
			if err != nil {
				return nil, "", 0, fmt.Errorf("failed to convert TypedArray: %w", err)
			}
			return bytes.NewReader(data), "application/octet-stream", int64(len(data)), nil
		}

		// 4.2 检查是否是 ArrayBuffer
		if h.isArrayBuffer(obj) {
			data, err := h.arrayBufferToBytes(obj)
			if err != nil {
				return nil, "", 0, fmt.Errorf("failed to convert ArrayBuffer: %w", err)
			}
			return bytes.NewReader(data), "application/octet-stream", int64(len(data)), nil
		}

		// 4.3 检查是否是 URLSearchParams
		if h.isURLSearchParams(obj) {
			data, err := h.urlSearchParamsToString(obj)
			if err != nil {
				return nil, "", 0, fmt.Errorf("failed to convert URLSearchParams: %w", err)
			}
			return strings.NewReader(data), "application/x-www-form-urlencoded", int64(len(data)), nil
		}

		// 4.4 检查是否是 Blob 或 File
		if h.isBlobOrFile(obj) {
			data, contentType, err := h.blobToBytes(obj)
			if err != nil {
				return nil, "", 0, fmt.Errorf("failed to convert Blob/File: %w", err)
			}
			return bytes.NewReader(data), contentType, int64(len(data)), nil
		}
	}

	// 5. 默认：尝试 JSON 序列化
	return nil, "", 0, nil // 返回 nil 表示需要 JSON 序列化
}

// isTypedArray 检查对象是否是 TypedArray
func (h *BodyTypeHandler) isTypedArray(obj *goja.Object) bool {
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok {
			if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
				typeName := nameVal.String()
				return typeName == "Uint8Array" ||
					typeName == "Int8Array" ||
					typeName == "Uint16Array" ||
					typeName == "Int16Array" ||
					typeName == "Uint32Array" ||
					typeName == "Int32Array" ||
					typeName == "Float32Array" ||
					typeName == "Float64Array" ||
					typeName == "Uint8ClampedArray"
			}
		}
	}
	return false
}

// isArrayBuffer 检查对象是否是 ArrayBuffer
func (h *BodyTypeHandler) isArrayBuffer(obj *goja.Object) bool {
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok {
			if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
				return nameVal.String() == "ArrayBuffer"
			}
		}
	}
	return false
}

// isBlobOrFile 检查对象是否是 Blob 或 File
func (h *BodyTypeHandler) isBlobOrFile(obj *goja.Object) bool {
	// 检查 __isBlob 标识符
	if marker := obj.Get("__isBlob"); !goja.IsUndefined(marker) && marker != nil {
		if markerBool, ok := marker.Export().(bool); ok && markerBool {
			return true
		}
	}
	return false
}

// isURLSearchParams 检查对象是否是 URLSearchParams
func (h *BodyTypeHandler) isURLSearchParams(obj *goja.Object) bool {
	// 🔥 优先检查标识符（最可靠的方法）
	if marker := obj.Get("__isURLSearchParams"); !goja.IsUndefined(marker) && marker != nil {
		if markerBool, ok := marker.Export().(bool); ok && markerBool {
			return true
		}
	}

	// 后备方案：检查 constructor.name
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok {
			if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
				return nameVal.String() == "URLSearchParams"
			}
		}
	}

	return false
}

// typedArrayToBytes 将 TypedArray 转换为字节数组
func (h *BodyTypeHandler) typedArrayToBytes(obj *goja.Object) ([]byte, error) {
	// 安全检查
	if obj == nil {
		return nil, fmt.Errorf("TypedArray object is nil")
	}

	// 获取数组长度
	lengthVal := obj.Get("length")
	if goja.IsUndefined(lengthVal) || lengthVal == nil {
		return nil, fmt.Errorf("TypedArray missing length property")
	}
	length := int(lengthVal.ToInteger())

	// 获取数组类型
	var bytesPerElement int = 1
	var typeName string
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok {
			if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
				typeName = nameVal.String()
			}
		}
	}

	switch typeName {
	case "Uint8Array", "Int8Array", "Uint8ClampedArray":
		bytesPerElement = 1
	case "Uint16Array", "Int16Array":
		bytesPerElement = 2
	case "Uint32Array", "Int32Array", "Float32Array":
		bytesPerElement = 4
	case "Float64Array":
		bytesPerElement = 8
	}

	// 创建字节数组
	totalBytes := length * bytesPerElement
	data := make([]byte, totalBytes)

	// 读取数据
	for i := 0; i < length; i++ {
		val := obj.Get(fmt.Sprintf("%d", i))
		if goja.IsUndefined(val) || val == nil {
			continue
		}

		switch bytesPerElement {
		case 1:
			// Uint8Array, Int8Array
			num := uint8(val.ToInteger())
			data[i] = num

		case 2:
			// Uint16Array, Int16Array
			num := uint16(val.ToInteger())
			binary.LittleEndian.PutUint16(data[i*2:], num)

		case 4:
			// Uint32Array, Int32Array, Float32Array
			if typeName == "Float32Array" {
				// 使用标准库函数转换 Float32
				bits := math.Float32bits(float32(val.ToFloat()))
				binary.LittleEndian.PutUint32(data[i*4:], bits)
			} else {
				num := uint32(val.ToInteger())
				binary.LittleEndian.PutUint32(data[i*4:], num)
			}

		case 8:
			// Float64Array - 使用标准库函数转换 Float64
			bits := math.Float64bits(val.ToFloat())
			binary.LittleEndian.PutUint64(data[i*8:], bits)
		}
	}

	return data, nil
}

// arrayBufferToBytes 将 ArrayBuffer 转换为字节数组
func (h *BodyTypeHandler) arrayBufferToBytes(obj *goja.Object) ([]byte, error) {
	// 直接导出为 goja.ArrayBuffer
	// 注意：此方法仅在 isArrayBuffer() 返回 true 后调用
	// 因此类型断言应该总是成功
	if ab, ok := obj.Export().(goja.ArrayBuffer); ok {
		return ab.Bytes(), nil
	}

	// 如果类型断言失败，说明对象不是真正的 ArrayBuffer
	// 这通常不应该发生，因为我们已经通过 isArrayBuffer() 检查过了
	return nil, fmt.Errorf("failed to export ArrayBuffer: type assertion failed")
}

// blobToBytes 将 Blob/File 转换为字节数组
func (h *BodyTypeHandler) blobToBytes(obj *goja.Object) ([]byte, string, error) {
	// 获取 __blobData
	blobDataVal := obj.Get("__blobData")
	if goja.IsUndefined(blobDataVal) || blobDataVal == nil {
		return nil, "", fmt.Errorf("Blob/File missing __blobData")
	}

	// 尝试类型断言获取 JSBlob（在同一包内可以访问私有类型）
	blobData := blobDataVal.Export()
	if blob, ok := blobData.(*JSBlob); ok {
		return blob.data, blob.typ, nil
	}

	// 如果是 JSFile，它嵌入了 JSBlob
	if file, ok := blobData.(*JSFile); ok {
		return file.data, file.typ, nil
	}

	return nil, "", fmt.Errorf("unable to extract Blob/File data: invalid type")
}

// urlSearchParamsToString 将 URLSearchParams 转换为字符串
func (h *BodyTypeHandler) urlSearchParamsToString(obj *goja.Object) (string, error) {
	// URLSearchParams 有 toString() 方法
	toStringMethod := obj.Get("toString")
	if goja.IsUndefined(toStringMethod) {
		return "", fmt.Errorf("URLSearchParams missing toString method")
	}

	// 调用 toString()
	if callable, ok := goja.AssertFunction(toStringMethod); ok {
		result, err := callable(obj)
		if err != nil {
			return "", fmt.Errorf("failed to call URLSearchParams.toString(): %w", err)
		}
		return result.String(), nil
	}

	return "", fmt.Errorf("URLSearchParams.toString is not callable")
}

// RegisterURLSearchParams 在 runtime 中注册 URLSearchParams 构造函数
func RegisterURLSearchParams(runtime *goja.Runtime) error {
	// 创建构造函数对象并设置 name 属性（需要在构造函数定义之前）
	var constructorObj *goja.Object

	// URLSearchParams 构造函数
	urlSearchParamsConstructor := func(call goja.ConstructorCall) *goja.Object {
		obj := call.This

		// 设置 constructor 引用
		if constructorObj != nil {
			obj.Set("constructor", constructorObj)
		}

		// 内部存储：使用 Map 来存储键值对
		params := make(map[string][]string)
		obj.Set("__params", params)

		// 处理构造函数参数
		if len(call.Arguments) > 0 {
			arg := call.Arguments[0]

			// 支持字符串初始化
			if !goja.IsUndefined(arg) && !goja.IsNull(arg) {
				if str, ok := arg.Export().(string); ok {
					// 解析查询字符串
					str = strings.TrimPrefix(str, "?")
					parsed, err := url.ParseQuery(str)
					if err == nil {
						for k, v := range parsed {
							params[k] = v
						}
					}
				} else if exported := arg.Export(); exported != nil {
					// 🔥 检查是否为二维数组 [['key', 'value'], ...]
					if arr, ok := exported.([]interface{}); ok {
						for _, item := range arr {
							if pairArr, ok := item.([]interface{}); ok && len(pairArr) >= 2 {
								key := fmt.Sprintf("%v", pairArr[0])
								value := fmt.Sprintf("%v", pairArr[1])
								if existing, exists := params[key]; exists {
									params[key] = append(existing, value)
								} else {
									params[key] = []string{value}
								}
							}
						}
					} else if argObj, ok := arg.(*goja.Object); ok {
						// 支持对象初始化
						for _, key := range argObj.Keys() {
							val := argObj.Get(key)
							if !goja.IsUndefined(val) {
								// 🔥 检查是否为数组
								if valArr, ok := val.Export().([]interface{}); ok {
									// 将数组的每个元素转换为字符串
									strArr := make([]string, len(valArr))
									for i, v := range valArr {
										strArr[i] = fmt.Sprintf("%v", v)
									}
									params[key] = strArr
								} else {
									// 单个值
									params[key] = []string{val.String()}
								}
							}
						}
					}
				}
			}
		}

		// append(name, value) 方法
		obj.Set("append", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("URLSearchParams.append requires 2 arguments"))
			}
			name := call.Arguments[0].String()
			value := call.Arguments[1].String()

			if existing, ok := params[name]; ok {
				params[name] = append(existing, value)
			} else {
				params[name] = []string{value}
			}
			return goja.Undefined()
		})

		// delete(name, value) 方法 - Node.js v22 新增支持第二个参数
		obj.Set("delete", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("URLSearchParams.delete requires at least 1 argument"))
			}
			name := call.Arguments[0].String()

			// 如果提供了第二个参数 value，只删除匹配的键值对
			if len(call.Arguments) >= 2 {
				targetValue := call.Arguments[1].String()
				if values, ok := params[name]; ok {
					// 过滤掉匹配的值
					newValues := make([]string, 0)
					for _, v := range values {
						if v != targetValue {
							newValues = append(newValues, v)
						}
					}
					if len(newValues) > 0 {
						params[name] = newValues
					} else {
						delete(params, name)
					}
				}
			} else {
				// 传统行为：删除所有同名参数
				delete(params, name)
			}
			return goja.Undefined()
		})

		// get(name) 方法
		obj.Set("get", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("URLSearchParams.get requires 1 argument"))
			}
			name := call.Arguments[0].String()
			if values, ok := params[name]; ok && len(values) > 0 {
				return runtime.ToValue(values[0])
			}
			return goja.Null()
		})

		// getAll(name) 方法
		obj.Set("getAll", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("URLSearchParams.getAll requires 1 argument"))
			}
			name := call.Arguments[0].String()
			if values, ok := params[name]; ok {
				return runtime.ToValue(values)
			}
			return runtime.NewArray()
		})

		// has(name, value) 方法 - Node.js v22 新增支持第二个参数
		obj.Set("has", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("URLSearchParams.has requires at least 1 argument"))
			}
			name := call.Arguments[0].String()

			// 如果提供了第二个参数 value，检查是否存在指定的键值对
			if len(call.Arguments) >= 2 {
				targetValue := call.Arguments[1].String()
				if values, ok := params[name]; ok {
					for _, v := range values {
						if v == targetValue {
							return runtime.ToValue(true)
						}
					}
				}
				return runtime.ToValue(false)
			}

			// 传统行为：只检查键是否存在
			_, exists := params[name]
			return runtime.ToValue(exists)
		})

		// set(name, value) 方法
		obj.Set("set", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("URLSearchParams.set requires 2 arguments"))
			}
			name := call.Arguments[0].String()
			value := call.Arguments[1].String()
			params[name] = []string{value}
			return goja.Undefined()
		})

		// toString() 方法
		obj.Set("toString", func(call goja.FunctionCall) goja.Value {
			values := url.Values(params)
			return runtime.ToValue(values.Encode())
		})

		// sort() 方法 - Node.js v22 新增，按键名 UTF-16 编码顺序排序
		obj.Set("sort", func(call goja.FunctionCall) goja.Value {
			// 获取所有键并排序
			keys := make([]string, 0, len(params))
			for k := range params {
				keys = append(keys, k)
			}

			// 按 UTF-16 编码顺序排序（Go 的字符串比较默认就是 UTF-16）
			sort.Strings(keys)

			// 创建新的有序 map
			sortedParams := make(map[string][]string)
			for _, k := range keys {
				// 保持每个键的值顺序不变（稳定排序）
				sortedParams[k] = params[k]
			}

			// 替换原 params
			// 清空旧的
			for k := range params {
				delete(params, k)
			}
			// 添加排序后的
			for k, v := range sortedParams {
				params[k] = v
			}

			return goja.Undefined()
		})

		// forEach(callback) 方法
		obj.Set("forEach", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("URLSearchParams.forEach requires 1 argument"))
			}

			callback, ok := goja.AssertFunction(call.Arguments[0])
			if !ok {
				panic(runtime.NewTypeError("URLSearchParams.forEach callback must be a function"))
			}

			for name, values := range params {
				for _, value := range values {
					callback(goja.Undefined(), runtime.ToValue(value), runtime.ToValue(name), obj)
				}
			}
			return goja.Undefined()
		})

		// entries() 方法 - 返回迭代器对象
		obj.Set("entries", func(call goja.FunctionCall) goja.Value {
			// 收集所有条目
			entries := make([][]string, 0)
			for name, values := range params {
				for _, value := range values {
					entries = append(entries, []string{name, value})
				}
			}

			// 创建迭代器对象
			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(entries) {
					pair := runtime.NewArray(2)
					pair.Set("0", runtime.ToValue(entries[index][0]))
					pair.Set("1", runtime.ToValue(entries[index][1]))
					result.Set("value", pair)
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			return iterator
		})

		// keys() 方法 - 返回迭代器对象（符合 Web API 标准）
		obj.Set("keys", func(call goja.FunctionCall) goja.Value {
			// 收集所有 keys
			keys := make([]string, 0)
			for name, values := range params {
				for range values {
					keys = append(keys, name)
				}
			}

			// 创建迭代器对象
			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(keys) {
					result.Set("value", runtime.ToValue(keys[index]))
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			return iterator
		})

		// values() 方法 - 返回迭代器对象（符合 Web API 标准）
		obj.Set("values", func(call goja.FunctionCall) goja.Value {
			// 收集所有 values
			allValues := make([]string, 0)
			for _, vals := range params {
				allValues = append(allValues, vals...)
			}

			// 创建迭代器对象
			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(allValues) {
					result.Set("value", runtime.ToValue(allValues[index]))
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			return iterator
		})

		// 🔥 添加 URLSearchParams 标识符（用于类型识别）
		obj.Set("__isURLSearchParams", runtime.ToValue(true))

		// size 属性 - Node.js v22 新增，返回所有查询参数的数量（包括重复的 key）
		// 使用 getter 定义为动态只读属性
		if err := obj.DefineAccessorProperty("size",
			runtime.ToValue(func(call goja.FunctionCall) goja.Value {
				count := 0
				for _, values := range params {
					count += len(values)
				}
				return runtime.ToValue(count)
			}),
			nil, // no setter
			goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
			// 如果定义失败，回退到普通属性
			obj.Set("__getSize", func() int {
				count := 0
				for _, values := range params {
					count += len(values)
				}
				return count
			})
		}

		// 🔥 添加 Symbol.iterator 支持，使 URLSearchParams 本身可迭代
		// 这样就可以直接用 for...of 遍历 URLSearchParams 对象
		// 例如：for (const [key, value] of params) { ... }

		// 通过 JS 代码设置 Symbol.iterator
		// 将 entries 方法作为默认迭代器
		script := `(function(urlSearchParamsObj) {
			urlSearchParamsObj[Symbol.iterator] = function() {
				const entries = this.entries();
				let index = 0;
				return {
					next: function() {
						if (index < entries.length) {
							return { value: entries[index++], done: false };
						}
						return { done: true };
					}
				};
			};
		})`

		if fn, err := runtime.RunString(script); err == nil {
			if callable, ok := goja.AssertFunction(fn); ok {
				callable(goja.Undefined(), obj)
			}
		} else {
			// 记录错误日志，但不影响 URLSearchParams 的其他功能
			fmt.Printf("⚠️  Warning: Failed to set Symbol.iterator for URLSearchParams: %v\n", err)
		}

		return obj
	}

	// 创建构造函数对象并设置 name 属性
	constructorObj = runtime.ToValue(urlSearchParamsConstructor).ToObject(runtime)
	constructorObj.Set("name", "URLSearchParams")

	// 设置构造函数
	return runtime.Set("URLSearchParams", constructorObj)
}
