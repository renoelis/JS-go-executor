package fetch

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"

	"github.com/dop251/goja"
)

// generateBoundary 生成随机边界字符串
func generateBoundary() string {
	b := make([]byte, 12)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// ==================== FormData ====================

// FormData 表示浏览器兼容的 FormData 对象
// 🔥 浏览器兼容的 FormData API
// 标准参考: https://developer.mozilla.org/zh-CN/docs/Web/API/FormData
//
// 设计说明:
// 1. **数据存储**:
//   - entries: 存储所有表单字段（key-value pairs）
//   - 支持多个同名字段（append 不覆盖）
//   - 支持字符串值和 Blob/File 值
//
// 2. **API 兼容**:
//   - append(name, value[, filename]): 添加字段
//   - set(name, value[, filename]): 设置字段（覆盖）
//   - get(name): 获取第一个值
//   - getAll(name): 获取所有值
//   - has(name): 检查字段是否存在
//   - delete(name): 删除字段
//   - entries/keys/values: 迭代器支持
//   - forEach: 遍历所有字段
//
// 3. **线程安全**:
//   - 使用 mutex 保护共享状态
//   - 支持并发访问
type FormData struct {
	entries []FormDataEntry // 表单字段列表
	mutex   sync.Mutex      // 保护并发访问
	runtime *goja.Runtime   // goja Runtime（用于创建 JavaScript 对象）
}

// FormDataEntry 表单字段条目
type FormDataEntry struct {
	Name     string      // 字段名
	Value    interface{} // 字段值（string 或 Blob/File 对象）
	Filename string      // 文件名（仅用于 File 类型）
}

// NewFormData 创建 FormData 对象
func NewFormData(runtime *goja.Runtime) *FormData {
	return &FormData{
		entries: make([]FormDataEntry, 0),
		runtime: runtime,
	}
}

// ==================== 浏览器 API 方法 ====================

// Append 添加字段（不覆盖同名字段）
// 🔥 append(name, value) 或 append(name, blob, filename)
func (fd *FormData) Append(name string, value interface{}, filename ...string) {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	entry := FormDataEntry{
		Name:  name,
		Value: value,
	}

	// 如果提供了 filename，保存
	if len(filename) > 0 {
		entry.Filename = filename[0]
	}

	fd.entries = append(fd.entries, entry)
}

// Set 设置字段（覆盖同名字段）
// 🔥 set(name, value) 或 set(name, blob, filename)
// 🔥 Web API 标准：保持第一个同名字段的位置，删除其他同名字段
func (fd *FormData) Set(name string, value interface{}, filename ...string) {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	// 创建新条目
	entry := FormDataEntry{
		Name:  name,
		Value: value,
	}

	if len(filename) > 0 {
		entry.Filename = filename[0]
	}

	// 🔥 从切片中移除所有同名条目，并在第一个位置替换（保持原位置）
	var newEntries []FormDataEntry
	firstReplaced := false
	for _, e := range fd.entries {
		if e.Name == name {
			if !firstReplaced {
				// 第一次遇到，替换为新值（保持原位置）
				newEntries = append(newEntries, entry)
				firstReplaced = true
			}
			// 其他同名的跳过（删除）
		} else {
			newEntries = append(newEntries, e)
		}
	}

	// 如果是新字段，添加到末尾
	if !firstReplaced {
		newEntries = append(newEntries, entry)
	}

	fd.entries = newEntries
}

// Get 获取第一个值
func (fd *FormData) Get(name string) interface{} {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	for _, entry := range fd.entries {
		if entry.Name == name {
			return entry.Value
		}
	}

	return nil
}

// GetAll 获取所有值
func (fd *FormData) GetAll(name string) []interface{} {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	values := make([]interface{}, 0)
	for _, entry := range fd.entries {
		if entry.Name == name {
			values = append(values, entry.Value)
		}
	}

	return values
}

// Has 检查字段是否存在
func (fd *FormData) Has(name string) bool {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	for _, entry := range fd.entries {
		if entry.Name == name {
			return true
		}
	}

	return false
}

// Delete 删除字段
func (fd *FormData) Delete(name string) {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	fd.deleteInternal(name)
}

// deleteInternal 内部删除方法（不加锁，由调用者加锁）
func (fd *FormData) deleteInternal(name string) {
	newEntries := make([]FormDataEntry, 0, len(fd.entries))
	for _, entry := range fd.entries {
		if entry.Name != name {
			newEntries = append(newEntries, entry)
		}
	}
	fd.entries = newEntries
}

// ==================== 迭代器支持 ====================

// Entries 返回 [name, value] 迭代器
func (fd *FormData) Entries() [][]interface{} {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	entries := make([][]interface{}, 0, len(fd.entries))
	for _, entry := range fd.entries {
		entries = append(entries, []interface{}{entry.Name, entry.Value})
	}

	return entries
}

// Keys 返回 name 迭代器
func (fd *FormData) Keys() []string {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	keys := make([]string, 0, len(fd.entries))
	for _, entry := range fd.entries {
		keys = append(keys, entry.Name)
	}

	return keys
}

// Values 返回 value 迭代器
func (fd *FormData) Values() []interface{} {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	values := make([]interface{}, 0, len(fd.entries))
	for _, entry := range fd.entries {
		values = append(values, entry.Value)
	}

	return values
}

// ForEach 遍历所有字段
func (fd *FormData) ForEach(callback func(value interface{}, key string)) {
	fd.mutex.Lock()
	entries := make([]FormDataEntry, len(fd.entries))
	copy(entries, fd.entries)
	fd.mutex.Unlock()

	for _, entry := range entries {
		callback(entry.Value, entry.Name)
	}
}

// ==================== 内部方法 ====================

// GetEntries 获取所有条目（内部使用）
func (fd *FormData) GetEntries() []FormDataEntry {
	fd.mutex.Lock()
	defer fd.mutex.Unlock()

	// 返回副本，避免外部修改
	entries := make([]FormDataEntry, len(fd.entries))
	copy(entries, fd.entries)
	return entries
}

// ==================== FormData 构造器 ====================

// CreateFormDataConstructor 创建 FormData 构造器
// 🔥 浏览器兼容的 FormData API
// 标准参考: https://developer.mozilla.org/zh-CN/docs/Web/API/FormData
func CreateFormDataConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	return func(call goja.ConstructorCall) *goja.Object {
		formData := NewFormData(runtime)

		obj := runtime.NewObject()

		// 保存 FormData 实例到对象（用于内部访问）
		obj.Set("__formDataInstance", formData)
		// 🔥 标记为 FormData 对象（用于类型检测）
		obj.Set("__isFormData", true)
		obj.Set("__isNodeFormData", false) // 不是 Node.js 版本
		obj.Set("__type", "web-formdata")

		// 🔥 Node.js form-data 库兼容属性
		// 这些属性会被 JSON.stringify 序列化，用于 maxBodyLength 检测
		obj.Set("_overheadLength", 0)
		obj.Set("_valueLength", 0)
		obj.Set("_valuesToMeasure", []interface{}{})
		obj.Set("writable", false)
		obj.Set("readable", true)
		obj.Set("dataSize", 0)
		obj.Set("maxDataSize", 2097152) // 2MB 默认值
		obj.Set("pauseStreams", true)
		obj.Set("_released", false)
		obj.Set("_streams", []interface{}{})
		obj.Set("_currentStream", nil)
		obj.Set("_insideLoop", false)
		obj.Set("_pendingNext", false)
		obj.Set("_boundary", "----FormDataBoundary"+generateBoundary())

		// 🔥 辅助函数：更新 Node.js 兼容属性
		updateNodeCompatProps := func() {
			entries := formData.GetEntries()
			var overheadLen, valueLen int
			streams := make([]interface{}, 0)

			boundary := obj.Get("_boundary").String()
			for _, entry := range entries {
				// 计算 overhead（边界 + headers）
				header := fmt.Sprintf("--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n", boundary, entry.Name)
				overheadLen += len(header)

				// 计算 value 长度
				var valStr string
				switch v := entry.Value.(type) {
				case string:
					valStr = v
				case []byte:
					valStr = string(v)
				case map[string]interface{}:
					// 🔥 对象转换为 "[object Object]"（符合浏览器行为，防止循环引用导致栈溢出）
					valStr = "[object Object]"
				case nil:
					// 🔥 nil 转换为 "null"
					valStr = "null"
				default:
					valStr = fmt.Sprintf("%v", v)
				}
				valueLen += len(valStr)

				// 添加到 streams
				streams = append(streams, header)
				streams = append(streams, valStr)
				streams = append(streams, nil) // 分隔符占位
			}

			// 添加结束边界
			if len(entries) > 0 {
				overheadLen += len(fmt.Sprintf("--%s--\r\n", boundary))
			}

			obj.Set("_overheadLength", overheadLen)
			obj.Set("_valueLength", valueLen)
			obj.Set("_streams", streams)
			obj.Set("dataSize", overheadLen+valueLen)
		}

		// append(name, value[, filename])
		obj.Set("append", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("append 需要至少 2 个参数"))
			}

			name := call.Arguments[0].String()
			valueArg := call.Arguments[1]

			// 🔥 类型转换：非 Blob/File 值转换为字符串（符合 Web FormData API）
			var value interface{}
			if valueObj, ok := valueArg.(*goja.Object); ok {
				// 检查是否是 Blob/File 对象
				isBlob := valueObj.Get("__isBlob")
				isFile := valueObj.Get("__isFile")
				isBlobOrFile := (isBlob != nil && !goja.IsUndefined(isBlob) && !goja.IsNull(isBlob) && isBlob.ToBoolean()) ||
					(isFile != nil && !goja.IsUndefined(isFile) && !goja.IsNull(isFile) && isFile.ToBoolean())
				if isBlobOrFile {
					// Blob/File 保留原对象
					value = valueArg
				} else {
					// 其他对象转换为 "[object Object]"
					value = "[object Object]"
				}
			} else if goja.IsNull(valueArg) {
				value = "null"
			} else if goja.IsUndefined(valueArg) {
				value = "undefined"
			} else {
				// 基本类型转换为字符串
				value = valueArg.String()
			}

			var filename string
			if len(call.Arguments) > 2 {
				filename = call.Arguments[2].String()
			}

			if filename != "" {
				formData.Append(name, value, filename)
			} else {
				formData.Append(name, value)
			}

			// 🔥 更新 Node.js 兼容属性
			updateNodeCompatProps()

			return goja.Undefined()
		})

		// set(name, value[, filename])
		obj.Set("set", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("set 需要至少 2 个参数"))
			}

			name := call.Arguments[0].String()
			valueArg := call.Arguments[1]

			// 🔥 类型转换：非 Blob/File 值转换为字符串（符合 Web FormData API）
			var value interface{}
			if valueObj, ok := valueArg.(*goja.Object); ok {
				// 检查是否是 Blob/File 对象
				isBlob := valueObj.Get("__isBlob")
				isFile := valueObj.Get("__isFile")
				isBlobOrFile := (isBlob != nil && !goja.IsUndefined(isBlob) && !goja.IsNull(isBlob) && isBlob.ToBoolean()) ||
					(isFile != nil && !goja.IsUndefined(isFile) && !goja.IsNull(isFile) && isFile.ToBoolean())
				if isBlobOrFile {
					// Blob/File 保留原对象
					value = valueArg
				} else {
					// 其他对象转换为 "[object Object]"
					value = "[object Object]"
				}
			} else if goja.IsNull(valueArg) {
				value = "null"
			} else if goja.IsUndefined(valueArg) {
				value = "undefined"
			} else {
				// 基本类型转换为字符串
				value = valueArg.String()
			}

			var filename string
			if len(call.Arguments) > 2 {
				filename = call.Arguments[2].String()
			}

			if filename != "" {
				formData.Set(name, value, filename)
			} else {
				formData.Set(name, value)
			}

			// 🔥 更新 Node.js 兼容属性
			updateNodeCompatProps()

			return goja.Undefined()
		})

		// get(name)
		obj.Set("get", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return goja.Null()
			}

			name := call.Arguments[0].String()
			value := formData.Get(name)

			if value == nil {
				return goja.Null()
			}

			return runtime.ToValue(value)
		})

		// getAll(name)
		obj.Set("getAll", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return runtime.ToValue([]interface{}{})
			}

			name := call.Arguments[0].String()
			values := formData.GetAll(name)

			return runtime.ToValue(values)
		})

		// has(name)
		obj.Set("has", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return runtime.ToValue(false)
			}

			name := call.Arguments[0].String()
			return runtime.ToValue(formData.Has(name))
		})

		// delete(name)
		obj.Set("delete", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return goja.Undefined()
			}

			name := call.Arguments[0].String()
			formData.Delete(name)

			// 🔥 更新 Node.js 兼容属性
			updateNodeCompatProps()

			return goja.Undefined()
		})

		// entries() - 返回 [name, value] 迭代器
		obj.Set("entries", func(call goja.FunctionCall) goja.Value {
			entries := formData.Entries()

			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(entries) {
					result.Set("value", runtime.ToValue(entries[index]))
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			attachIteratorSymbol(runtime, iterator)

			return iterator
		})

		// keys() - 返回 name 迭代器
		obj.Set("keys", func(call goja.FunctionCall) goja.Value {
			keys := formData.Keys()

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

			attachIteratorSymbol(runtime, iterator)

			return iterator
		})

		// values() - 返回 value 迭代器
		obj.Set("values", func(call goja.FunctionCall) goja.Value {
			values := formData.Values()

			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(values) {
					result.Set("value", runtime.ToValue(values[index]))
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			attachIteratorSymbol(runtime, iterator)

			return iterator
		})

		// forEach(callback)
		obj.Set("forEach", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("FormData.forEach 需要一个回调函数"))
			}

			callback, ok := goja.AssertFunction(call.Arguments[0])
			if !ok {
				panic(runtime.NewTypeError("FormData.forEach 回调函数必须是一个函数"))
			}

			formData.ForEach(func(value interface{}, key string) {
				callback(goja.Undefined(), runtime.ToValue(value), runtime.ToValue(key), obj)
			})

			return goja.Undefined()
		})

		setFormDataDefaultIterator(runtime, obj)

		return obj
	}
}

// ==================== 辅助函数 ====================

// ExtractFormDataInstance 从 JavaScript 对象中提取 FormData 实例
// 🔥 用于内部访问 FormData 数据（例如在 fetch 请求中序列化）
func ExtractFormDataInstance(obj *goja.Object) (*FormData, error) {
	if obj == nil {
		return nil, fmt.Errorf("对象为 nil")
	}

	instanceVal := obj.Get("__formDataInstance")
	if instanceVal == nil || goja.IsUndefined(instanceVal) {
		return nil, fmt.Errorf("不是有效的 FormData 对象")
	}

	instance := instanceVal.Export()
	if formData, ok := instance.(*FormData); ok {
		return formData, nil
	}

	return nil, fmt.Errorf("__formDataInstance 类型错误")
}

// FormatFormDataForDebug 格式化 FormData 用于调试
func FormatFormDataForDebug(fd *FormData) string {
	entries := fd.GetEntries()
	if len(entries) == 0 {
		return "FormData {}"
	}

	var parts []string
	for _, entry := range entries {
		// 🔥 安全格式化 value，防止循环引用导致栈溢出
		var valueStr string
		switch v := entry.Value.(type) {
		case string:
			valueStr = v
		case []byte:
			valueStr = string(v)
		case map[string]interface{}:
			valueStr = "[object Object]"
		case nil:
			valueStr = "null"
		default:
			valueStr = fmt.Sprintf("%v", v)
		}
		if len(valueStr) > 50 {
			valueStr = valueStr[:50] + "..."
		}

		if entry.Filename != "" {
			parts = append(parts, fmt.Sprintf("  %s: %s (filename: %s)", entry.Name, valueStr, entry.Filename))
		} else {
			parts = append(parts, fmt.Sprintf("  %s: %s", entry.Name, valueStr))
		}
	}

	return "FormData {\n" + strings.Join(parts, "\n") + "\n}"
}

func attachIteratorSymbol(runtime *goja.Runtime, iterator *goja.Object) {
	symbolVal := runtime.Get("Symbol")
	if symbolVal == nil || goja.IsUndefined(symbolVal) || goja.IsNull(symbolVal) {
		return
	}

	symbolObj := symbolVal.ToObject(runtime)
	if symbolObj == nil {
		return
	}

	iteratorSym := symbolObj.Get("iterator")
	if iteratorSym == nil {
		return
	}

	if sym, ok := iteratorSym.(*goja.Symbol); ok {
		iterator.SetSymbol(sym, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			return iterator
		}))
	}
}

func setFormDataDefaultIterator(runtime *goja.Runtime, obj *goja.Object) {
	symbolVal := runtime.Get("Symbol")
	if symbolVal == nil || goja.IsUndefined(symbolVal) || goja.IsNull(symbolVal) {
		return
	}

	symbolObj := symbolVal.ToObject(runtime)
	if symbolObj == nil {
		return
	}

	iteratorSym := symbolObj.Get("iterator")
	if iteratorSym == nil {
		return
	}

	sym, ok := iteratorSym.(*goja.Symbol)
	if !ok {
		return
	}

	obj.SetSymbol(sym, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
		if entriesFunc, ok := goja.AssertFunction(obj.Get("entries")); ok {
			if iterator, err := entriesFunc(obj); err == nil {
				return iterator
			}
		}
		return goja.Undefined()
	}))
}

// ==================== 注释说明 ====================
// 🔥 设计原则：
//
// 1. **浏览器兼容性**：
//    - 完全兼容浏览器 FormData API
//    - 支持所有标准方法和属性
//    - 支持迭代器协议（entries/keys/values）
//
// 2. **多值支持**：
//    - append 不覆盖同名字段（累加）
//    - set 覆盖同名字段（替换）
//    - getAll 返回所有同名值
//    - 保持字段顺序（插入顺序）
//
// 3. **类型支持**：
//    - 字符串值（普通表单字段）
//    - Blob/File 值（文件上传）
//    - filename 参数（仅用于文件）
//
// 4. **线程安全**：
//    - 使用 mutex 保护共享状态
//    - 支持并发读写
//    - 迭代器返回副本（避免修改影响）
//
// 5. **内部访问**：
//    - __formDataInstance 保存实例引用
//    - ExtractFormDataInstance 提取实例
//    - GetEntries 返回副本（避免外部修改）
//
// 6. **调试友好**：
//    - FormatFormDataForDebug 格式化输出
//    - 显示字段名、值和文件名
//    - 长值自动截断（避免输出过长）
