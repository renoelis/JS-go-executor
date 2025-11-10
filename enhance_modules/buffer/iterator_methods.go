package buffer

import (
	"strconv"
	"sync"

	"github.com/dop251/goja"
)

// 预分配常用索引字符串（0-255），避免重复格式化
var indexStringCache [256]string
var indexStringCacheOnce sync.Once

func initIndexStringCache() {
	for i := 0; i < 256; i++ {
		indexStringCache[i] = strconv.FormatInt(int64(i), 10)
	}
}

// getIndexString 获取索引字符串，使用缓存优化性能
func getIndexString(index int64) string {
	if index >= 0 && index < 256 {
		indexStringCacheOnce.Do(initIndexStringCache)
		return indexStringCache[index]
	}
	return strconv.FormatInt(index, 10)
}

func (be *BufferEnhancer) addBufferIteratorMethods(runtime *goja.Runtime, prototype *goja.Object) {
	// entries() - 返回键值对迭代器
	prototype.Set("entries", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 🔥 类型检查：必须是 Buffer 或 TypedArray
		if !isBufferOrTypedArray(runtime, this) {
			panic(runtime.NewTypeError("this is not a typed array."))
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 🔥 性能优化：对于大 Buffer，预加载数据到 Go []byte
		var cachedBytes []byte
		if shouldUseFastPath(bufferLength) {
			cachedBytes = be.exportBufferBytesFast(runtime, this, bufferLength)
		}

		// 创建迭代器对象
		iterator := runtime.NewObject()
		index := int64(0)

		// 实现 next() 方法 - 使用不可枚举属性
		nextFunc := func(call goja.FunctionCall) goja.Value {
			result := runtime.NewObject()

			if index < bufferLength {
				val := uint8(0)
				if cachedBytes != nil && int64(len(cachedBytes)) > index {
					// 🔥 性能优化：从预加载的缓存中读取
					val = cachedBytes[index]
				} else {
					// 回退到逐字节访问
					if v := this.Get(getIndexString(index)); !goja.IsUndefined(v) {
						val = uint8(v.ToInteger() & 0xFF)
					}
				}

				// 返回 {value: [index, value], done: false}
				valueArray := runtime.NewArray(int64(2))
				valueArray.Set("0", runtime.ToValue(index))
				valueArray.Set("1", runtime.ToValue(val))

				result.Set("value", valueArray)
				result.Set("done", runtime.ToValue(false))
				index++
			} else {
				// 返回 {value: undefined, done: true}
				result.Set("value", goja.Undefined())
				result.Set("done", runtime.ToValue(true))
			}

			return result
		}
		
		// 设置为不可枚举属性
		if err := iterator.DefineDataProperty("next", runtime.ToValue(nextFunc), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE); err != nil {
			// 如果失败，回退到普通设置
			iterator.Set("next", nextFunc)
		}

		// 🔥 新增：添加 Symbol.iterator 支持
		addSymbolIterator(runtime, iterator)

		return iterator
	})

	// keys() - 返回索引迭代器
	prototype.Set("keys", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 🔥 类型检查：必须是 Buffer 或 TypedArray
		if !isBufferOrTypedArray(runtime, this) {
			panic(runtime.NewTypeError("this is not a typed array."))
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 创建迭代器对象
		iterator := runtime.NewObject()
		index := int64(0)

		// 实现 next() 方法 - 使用不可枚举属性
		nextFunc := func(call goja.FunctionCall) goja.Value {
			result := runtime.NewObject()

			if index < bufferLength {
				result.Set("value", runtime.ToValue(index))
				result.Set("done", runtime.ToValue(false))
				index++
			} else {
				result.Set("value", goja.Undefined())
				result.Set("done", runtime.ToValue(true))
			}

			return result
		}
		
		// 设置为不可枚举属性
		if err := iterator.DefineDataProperty("next", runtime.ToValue(nextFunc), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE); err != nil {
			// 如果失败，回退到普通设置
			iterator.Set("next", nextFunc)
		}

		// 🔥 新增：添加 Symbol.iterator 支持
		addSymbolIterator(runtime, iterator)

		return iterator
	})

	// values() - 返回值迭代器
	prototype.Set("values", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 🔥 类型检查：必须是 Buffer 或 TypedArray
		if !isBufferOrTypedArray(runtime, this) {
			panic(runtime.NewTypeError("this is not a typed array."))
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 🔥 性能优化：对于大 Buffer，预加载数据到 Go []byte
		var cachedBytes []byte
		if shouldUseFastPath(bufferLength) {
			cachedBytes = be.exportBufferBytesFast(runtime, this, bufferLength)
		}

		// 创建迭代器对象
		iterator := runtime.NewObject()
		index := int64(0)

		// 实现 next() 方法 - 使用不可枚举属性
		nextFunc := func(call goja.FunctionCall) goja.Value {
			result := runtime.NewObject()

			if index < bufferLength {
				val := uint8(0)
				if cachedBytes != nil && int64(len(cachedBytes)) > index {
					// 🔥 性能优化：从预加载的缓存中读取
					val = cachedBytes[index]
				} else {
					// 回退到逐字节访问
					if v := this.Get(getIndexString(index)); !goja.IsUndefined(v) {
						val = uint8(v.ToInteger() & 0xFF)
					}
				}

				result.Set("value", runtime.ToValue(val))
				result.Set("done", runtime.ToValue(false))
				index++
			} else {
				result.Set("value", goja.Undefined())
				result.Set("done", runtime.ToValue(true))
			}

			return result
		}
		
		// 设置为不可枚举属性
		if err := iterator.DefineDataProperty("next", runtime.ToValue(nextFunc), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE); err != nil {
			// 如果失败，回退到普通设置
			iterator.Set("next", nextFunc)
		}

		// 🔥 新增：添加 Symbol.iterator 支持
		addSymbolIterator(runtime, iterator)

		return iterator
	})
}

// isBufferOrTypedArray 检查对象是否是 Buffer 或 TypedArray
func isBufferOrTypedArray(runtime *goja.Runtime, obj *goja.Object) bool {
	if obj == nil {
		return false
	}

	// 检查是否有 BYTES_PER_ELEMENT 属性（TypedArray 特征）
	// TypedArray 必须有数值类型的 BYTES_PER_ELEMENT
	bytesPerElement := obj.Get("BYTES_PER_ELEMENT")
	if bytesPerElement == nil || goja.IsUndefined(bytesPerElement) || goja.IsNull(bytesPerElement) {
		return false
	}

	// 验证 BYTES_PER_ELEMENT 是数字
	// 使用 ToInteger() 来安全地检查是否是数字
	intVal := bytesPerElement.ToInteger()
	return intVal > 0 && intVal <= 8 // TypedArray 的 BYTES_PER_ELEMENT 范围是 1-8
}
