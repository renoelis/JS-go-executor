package enhance_modules

import (
	"encoding/binary"
	"fmt"
	"io"
	"math"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/dop251/goja"
)

// BodyTypeHandler 处理各种 Body 类型
type BodyTypeHandler struct {
	maxBlobFileSize int64 // Blob/File/TypedArray 最大大小（字节）
}

// NewBodyTypeHandler 创建 Body 类型处理器
func NewBodyTypeHandler(maxBlobFileSize int64) *BodyTypeHandler {
	if maxBlobFileSize <= 0 {
		maxBlobFileSize = 100 * 1024 * 1024 // 默认 100MB
	}
	return &BodyTypeHandler{
		maxBlobFileSize: maxBlobFileSize,
	}
}

// addSymbolIteratorToIterator 为迭代器添加 Symbol.iterator 支持（使用原生 API）
// 使迭代器本身可迭代（返回自身），符合 ES6 迭代器协议
func addSymbolIteratorToIterator(runtime *goja.Runtime, iterator *goja.Object) {
	symbolObj := runtime.Get("Symbol")
	if goja.IsUndefined(symbolObj) {
		return
	}

	symbol := symbolObj.ToObject(runtime)
	if symbol == nil {
		return
	}

	iteratorSym := symbol.Get("iterator")
	if goja.IsUndefined(iteratorSym) {
		return
	}

	// 使用原生 SetSymbol API（性能最优）
	if sym, ok := iteratorSym.(*goja.Symbol); ok {
		iterator.SetSymbol(sym, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			return iterator
		}))
	}
}

// setSymbolIteratorMethod 为对象设置 Symbol.iterator 方法（使用原生 API）
// methodFunc 是返回迭代器的函数
func setSymbolIteratorMethod(runtime *goja.Runtime, obj *goja.Object, methodFunc func() goja.Value) {
	symbolObj := runtime.Get("Symbol")
	if goja.IsUndefined(symbolObj) {
		return
	}

	symbol := symbolObj.ToObject(runtime)
	if symbol == nil {
		return
	}

	iteratorSym := symbol.Get("iterator")
	if goja.IsUndefined(iteratorSym) {
		return
	}

	// 使用原生 SetSymbol API（性能最优）
	if sym, ok := iteratorSym.(*goja.Symbol); ok {
		obj.SetSymbol(sym, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			return methodFunc()
		}))
	}
}

// ProcessBody 处理各种类型的 body，返回数据或 Reader，以及 contentType
// 🔥 重构优化：直接返回 []byte 避免不必要的 Reader 包装
//
// 返回值：
//   - data: 已知大小的数据（[]byte）
//   - reader: 流式数据（io.Reader，用于真正的流）
//   - contentType: Content-Type
//   - 只有 data 和 reader 中的一个非 nil
func (h *BodyTypeHandler) ProcessBody(runtime *goja.Runtime, body interface{}) (data []byte, reader io.Reader, contentType string, err error) {
	if body == nil {
		return nil, nil, "", nil
	}

	// 1. 字符串 - 直接转换为 []byte
	if str, ok := body.(string); ok {
		return []byte(str), nil, "", nil
	}

	// 2. 字节数组 - 直接返回
	if bytes, ok := body.([]byte); ok {
		return bytes, nil, "", nil
	}

	// 3. io.Reader - 保持流式（真正的流）
	if r, ok := body.(io.Reader); ok {
		return nil, r, "", nil // chunked transfer
	}

	// 4. goja.Object - 需要进一步判断类型
	if obj, ok := body.(*goja.Object); ok {
		// 4.1 检查是否是 TypedArray (Uint8Array, Int8Array等)
		if h.isTypedArray(obj) {
			bytes, err := h.typedArrayToBytes(obj)
			if err != nil {
				return nil, nil, "", fmt.Errorf("转换 TypedArray 失败: %w", err)
			}
			return bytes, nil, "application/octet-stream", nil
		}

		// 4.2 检查是否是 ArrayBuffer
		if h.isArrayBuffer(obj) {
			bytes, err := h.arrayBufferToBytes(obj)
			if err != nil {
				return nil, nil, "", fmt.Errorf("转换 ArrayBuffer 失败: %w", err)
			}
			return bytes, nil, "application/octet-stream", nil
		}

		// 4.3 检查是否是 URLSearchParams
		if h.isURLSearchParams(obj) {
			str, err := h.urlSearchParamsToString(obj)
			if err != nil {
				return nil, nil, "", fmt.Errorf("转换 URLSearchParams 失败: %w", err)
			}
			return []byte(str), nil, "application/x-www-form-urlencoded", nil
		}

		// 4.4 检查是否是 Blob 或 File
		if h.isBlobOrFile(obj) {
			bytes, ct, err := h.blobToBytes(obj)
			if err != nil {
				return nil, nil, "", fmt.Errorf("转换 Blob/File 失败: %w", err)
			}
			return bytes, nil, ct, nil
		}
	}

	// 5. 默认：返回 nil 表示需要 JSON 序列化
	return nil, nil, "", nil
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
		return nil, fmt.Errorf("TypedArray 对象为 nil")
	}

	// 获取数组长度
	lengthVal := obj.Get("length")
	if goja.IsUndefined(lengthVal) || lengthVal == nil {
		return nil, fmt.Errorf("TypedArray 缺少 length 属性")
	}
	length := int(lengthVal.ToInteger())

	// 🔥 检查 length 合法性
	if length < 0 {
		return nil, fmt.Errorf("TypedArray length 不能为负数: %d", length)
	}
	if length == 0 {
		return []byte{}, nil // 空数组，直接返回
	}

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

	// 🔥 防护：整数溢出 + 内存耗尽（DoS 防护）
	// 使用 int64 计算避免 32 位系统溢出
	totalBytes64 := int64(length) * int64(bytesPerElement)

	// 🔥 检查是否超过配置的限制（MAX_BLOB_FILE_SIZE）
	if totalBytes64 > h.maxBlobFileSize {
		sizeMB := float64(totalBytes64) / (1024 * 1024)
		limitMB := float64(h.maxBlobFileSize) / (1024 * 1024)
		return nil, fmt.Errorf("TypedArray 过大: %.2fMB > %.2fMB 限制 (类型: %s, 长度: %d, 每元素字节数: %d)",
			sizeMB, limitMB, typeName, length, bytesPerElement)
	}

	// 检查是否会在 32 位系统上溢出（兼容性检查）
	if totalBytes64 > math.MaxInt32 {
		return nil, fmt.Errorf("TypedArray 超过 32 位系统支持的最大大小")
	}

	totalBytes := int(totalBytes64)
	data := make([]byte, totalBytes)

	// 读取数据
	for i := 0; i < length; i++ {
		val := obj.Get(strconv.Itoa(i))
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
	return nil, fmt.Errorf("导出 ArrayBuffer 失败: 类型断言失败")
}

// blobToBytes 将 Blob/File 转换为字节数组
func (h *BodyTypeHandler) blobToBytes(obj *goja.Object) ([]byte, string, error) {
	// 获取 __blobData
	blobDataVal := obj.Get("__blobData")
	if goja.IsUndefined(blobDataVal) || blobDataVal == nil {
		return nil, "", fmt.Errorf("Blob/File 缺少 __blobData")
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

	return nil, "", fmt.Errorf("无法提取 Blob/File 数据: 无效类型")
}

// urlSearchParamsToString 将 URLSearchParams 转换为字符串
func (h *BodyTypeHandler) urlSearchParamsToString(obj *goja.Object) (string, error) {
	// URLSearchParams 有 toString() 方法
	toStringMethod := obj.Get("toString")
	if goja.IsUndefined(toStringMethod) {
		return "", fmt.Errorf("URLSearchParams 缺少 toString 方法")
	}

	// 调用 toString()
	if callable, ok := goja.AssertFunction(toStringMethod); ok {
		result, err := callable(obj)
		if err != nil {
			return "", fmt.Errorf("调用 URLSearchParams.toString() 失败: %w", err)
		}
		return result.String(), nil
	}

	return "", fmt.Errorf("URLSearchParams.toString 不可调用")
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
				panic(runtime.NewTypeError("URLSearchParams.append 需要 2 个参数"))
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
				panic(runtime.NewTypeError("URLSearchParams.delete 需要至少 1 个参数"))
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
				panic(runtime.NewTypeError("URLSearchParams.get 需要 1 个参数"))
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
				panic(runtime.NewTypeError("URLSearchParams.getAll 需要 1 个参数"))
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
				panic(runtime.NewTypeError("URLSearchParams.has 需要至少 1 个参数"))
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
				panic(runtime.NewTypeError("URLSearchParams.set 需要 2 个参数"))
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
				panic(runtime.NewTypeError("URLSearchParams.forEach 需要 1 个参数"))
			}

			callback, ok := goja.AssertFunction(call.Arguments[0])
			if !ok {
				panic(runtime.NewTypeError("URLSearchParams.forEach 回调函数必须是一个函数"))
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

			// 🔥 添加 Symbol.iterator，使迭代器本身可迭代（返回自身）
			addSymbolIteratorToIterator(runtime, iterator)

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

			// 🔥 添加 Symbol.iterator，使迭代器本身可迭代（返回自身）
			addSymbolIteratorToIterator(runtime, iterator)

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

			// 🔥 添加 Symbol.iterator，使迭代器本身可迭代（返回自身）
			addSymbolIteratorToIterator(runtime, iterator)

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
		// 将 entries 方法作为默认迭代器（符合 Web API 标准）
		setSymbolIteratorMethod(runtime, obj, func() goja.Value {
			// ✅ 直接返回 entries() 迭代器
			// 调用 obj.entries() 方法
			if entriesFunc, ok := goja.AssertFunction(obj.Get("entries")); ok {
				result, err := entriesFunc(obj)
				if err == nil {
					return result
				}
			}
			return goja.Undefined()
		})

		return obj
	}

	// 创建构造函数对象并设置 name 属性
	constructorObj = runtime.ToValue(urlSearchParamsConstructor).ToObject(runtime)
	constructorObj.Set("name", "URLSearchParams")

	// 设置构造函数
	return runtime.Set("URLSearchParams", constructorObj)
}
