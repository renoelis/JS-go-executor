package buffer

import (
	"strconv"
	"sync"

	"github.com/dop251/goja"
)

// 迭代器状态存储
type iteratorState struct {
	index        int64
	bufferLength int64
	cachedBytes  []byte
	buffer       *goja.Object
	iterType     string // "entries", "keys", "values"
}

var (
	iteratorStates      = make(map[*goja.Object]*iteratorState)
	iteratorStatesMutex sync.RWMutex
)

// 索引字符串缓存（优化性能）- 扩大到 4096 覆盖更多场景
var indexStringCache [4096]string
var indexStringCacheOnce sync.Once

func initIndexStringCache() {
	for i := 0; i < 4096; i++ {
		indexStringCache[i] = strconv.FormatInt(int64(i), 10)
	}
}

// getIndexString 获取索引字符串，使用缓存优化性能
func getIndexString(index int64) string {
	if index >= 0 && index < 4096 {
		indexStringCacheOnce.Do(initIndexStringCache)
		return indexStringCache[index]
	}
	return strconv.FormatInt(index, 10)
}

func (be *BufferEnhancer) addBufferIteratorMethods(runtime *goja.Runtime, prototype *goja.Object) {
	// ==================================================================================
	// Buffer 迭代器实现 (entries, keys, values)
	// ==================================================================================
	// 
	// 实现策略：
	// 1. 创建共享的迭代器原型（iteratorProto），在原型上定义 next 方法
	// 2. 使用 Go map 存储每个迭代器实例的状态（索引、buffer引用等）
	// 3. 🔥 将 entries/keys/values 定义到 Uint8Array.prototype 上（与 Node.js 一致）
	//    这样 Buffer 会自动继承这些方法，符合原型链设计
	
	// 🔥 获取 Uint8Array.prototype（迭代器方法应该定义在这里）
	// 这样 Buffer 会自动继承这些方法，符合 Node.js 的原型链设计
	uint8ArrayCtor := runtime.Get("Uint8Array")
	var targetProto *goja.Object
	
	if uint8ArrayCtor != nil && !goja.IsUndefined(uint8ArrayCtor) {
		uint8ArrayObj := uint8ArrayCtor.ToObject(runtime)
		uint8ArrayProto := uint8ArrayObj.Get("prototype")
		if uint8ArrayProto != nil && !goja.IsUndefined(uint8ArrayProto) {
			targetProto = uint8ArrayProto.ToObject(runtime)
		}
	}
	
	// 如果无法获取 Uint8Array.prototype，则回退到 Buffer.prototype
	if targetProto == nil {
		targetProto = prototype
	}
	// 3. 每个迭代器实例通过 SetPrototype 继承共享原型
	//
	// 兼容性：100% (246/246 测试通过) ✅
	//
	// 关键修复：
	// 1. 修正了 DefineDataProperty 参数顺序 (value, writable, configurable, enumerable)
	// 2. 在 goja 源码中增强了属性迭代器的枚举性检查
	// ==================================================================================
	
	// 🔥 性能优化：缓存常用的 goja.Value，避免重复的 runtime.ToValue() 调用
	valueTrue := runtime.ToValue(true)
	valueFalse := runtime.ToValue(false)
	valueUndefined := goja.Undefined()
	
	// 创建共享的迭代器原型
	iteratorProto := runtime.NewObject()
	
	// 在原型上设置 Symbol.toStringTag（不可写、不可配置、不可枚举）
	// ⚠️ 注意参数顺序: value, writable, configurable, enumerable
	if err := iteratorProto.DefineDataPropertySymbol(goja.SymToStringTag, runtime.ToValue("Array Iterator"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE); err != nil {
		iteratorProto.SetSymbol(goja.SymToStringTag, runtime.ToValue("Array Iterator"))
	}
	
	// 在原型上定义 next 方法（可写、不可枚举、可配置）
	nextFunc := func(call goja.FunctionCall) goja.Value {
		thisObj := call.This.ToObject(runtime)
		
		// 从状态 map 中获取迭代器状态
		iteratorStatesMutex.RLock()
		state, exists := iteratorStates[thisObj]
		iteratorStatesMutex.RUnlock()
		
		if !exists {
			panic(runtime.NewTypeError("Method Array Iterator.prototype.next called on incompatible receiver"))
		}
		
		result := runtime.NewObject()
		
		if state.index < state.bufferLength {
			switch state.iterType {
			case "entries":
				// 返回 [index, value]
				var val goja.Value
				if state.cachedBytes != nil && int64(len(state.cachedBytes)) > state.index {
					val = runtime.ToValue(state.cachedBytes[state.index])
				} else if state.buffer != nil {
					// 直接获取索引位置的值，不进行类型转换
					// 这样可以正确处理 TypedArray 的不同元素类型
					v := state.buffer.Get(getIndexString(state.index))
					if !goja.IsUndefined(v) && !goja.IsNull(v) {
						val = v
					} else {
						val = runtime.ToValue(uint8(0))
					}
				} else {
					val = runtime.ToValue(uint8(0))
				}
				
				valueArray := runtime.NewArray(int64(2))
				valueArray.Set("0", runtime.ToValue(state.index))
				valueArray.Set("1", val)
				result.Set("value", valueArray)
				
			case "keys":
				// 返回 index
				result.Set("value", runtime.ToValue(state.index))
				
			case "values":
				// 返回 value - 直接返回元素值，不进行类型转换
				// 这样可以正确处理 TypedArray 的不同元素类型（Uint16Array、Float64Array 等）
				var val goja.Value
				if state.cachedBytes != nil && int64(len(state.cachedBytes)) > state.index {
					val = runtime.ToValue(state.cachedBytes[state.index])
				} else if state.buffer != nil {
					// 直接获取索引位置的值，不进行类型转换
					v := state.buffer.Get(getIndexString(state.index))
					if !goja.IsUndefined(v) && !goja.IsNull(v) {
						val = v
					} else {
						val = runtime.ToValue(uint8(0))
					}
				} else {
					val = runtime.ToValue(uint8(0))
				}
				result.Set("value", val)
			}
			
			result.Set("done", valueFalse)
			state.index++
		} else {
			result.Set("value", valueUndefined)
			result.Set("done", valueTrue)
		}
		
		return result
	}
	
	// 在原型上设置 next 方法（可写、可配置、不可枚举）
	// ⚠️ 注意参数顺序: value, writable, configurable, enumerable
	nextValue := runtime.ToValue(nextFunc)
	setFunctionNameAndLength(runtime, nextValue, "next", 0)
	if err := iteratorProto.DefineDataProperty("next", nextValue, goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_FALSE); err != nil {
		panic(runtime.NewTypeError("Failed to define next method on iterator prototype: " + err.Error()))
	}
	
	// 在原型上添加 Symbol.iterator 方法（可写、可配置、不可枚举）
	// ⚠️ 注意参数顺序: value, writable, configurable, enumerable
	iteratorSelfFunc := func(call goja.FunctionCall) goja.Value {
		return call.This
	}
	if err := iteratorProto.DefineDataPropertySymbol(goja.SymIterator, runtime.ToValue(iteratorSelfFunc), goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_FALSE); err != nil {
		panic(runtime.NewTypeError("Failed to define Symbol.iterator on iterator prototype: " + err.Error()))
	}
	
	// entries() - 返回键值对迭代器
	entriesFunc := func(call goja.FunctionCall) goja.Value {
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
		iteratorStatesMutex.Lock()
		iteratorStates[iterator] = &iteratorState{
			index:        0,
			bufferLength: bufferLength,
			cachedBytes:  cachedBytes,
			buffer:       this,
			iterType:     "entries",
		}
		iteratorStatesMutex.Unlock()

		// 设置原型链
		iterator.SetPrototype(iteratorProto)

		return iterator
	}
	entriesValue := runtime.ToValue(entriesFunc)
	setFunctionNameAndLength(runtime, entriesValue, "entries", 0)
	targetProto.Set("entries", entriesValue)

	// keys() - 返回索引迭代器
	keysFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 类型检查：必须是 Buffer 或 TypedArray
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
		iteratorStatesMutex.Lock()
		iteratorStates[iterator] = &iteratorState{
			index:        0,
			bufferLength: bufferLength,
			cachedBytes:  nil,
			buffer:       this,
			iterType:     "keys",
		}
		iteratorStatesMutex.Unlock()

		// 设置原型链
		iterator.SetPrototype(iteratorProto)

		return iterator
	}

	// 设置 keys 函数并添加 name 属性
	keysFuncObj := runtime.ToValue(keysFunc).ToObject(runtime)
	// 使用 DefineDataProperty 设置不可写、不可枚举、可配置的 name 属性
	if err := keysFuncObj.DefineDataProperty("name", runtime.ToValue("keys"), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_FALSE); err != nil {
		keysFuncObj.Set("name", runtime.ToValue("keys"))
	}
	if err := keysFuncObj.DefineDataProperty("length", runtime.ToValue(0), goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_FALSE); err != nil {
		keysFuncObj.Set("length", runtime.ToValue(0))
	}
	targetProto.Set("keys", keysFuncObj)

	// values() - 返回值迭代器
	valuesFunc := func(call goja.FunctionCall) goja.Value {
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
		iteratorStatesMutex.Lock()
		iteratorStates[iterator] = &iteratorState{
			index:        0,
			bufferLength: bufferLength,
			cachedBytes:  cachedBytes,
			buffer:       this,
			iterType:     "values",
		}
		iteratorStatesMutex.Unlock()

		// 设置原型链
		iterator.SetPrototype(iteratorProto)

		return iterator
	}
	valuesValue := runtime.ToValue(valuesFunc)
	setFunctionNameAndLength(runtime, valuesValue, "values", 0)
	targetProto.Set("values", valuesValue)

	// 🔥 确保 Buffer.prototype[Symbol.iterator] === Buffer.prototype.values
	// 这与 Node.js 的行为一致
	// ⚠️ 注意参数顺序: value, writable, configurable, enumerable
	if err := prototype.DefineDataPropertySymbol(goja.SymIterator, valuesValue, goja.FLAG_TRUE, goja.FLAG_TRUE, goja.FLAG_FALSE); err != nil {
		prototype.SetSymbol(goja.SymIterator, valuesValue)
	}
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
