package buffer

import (
	"strconv"
	"sync"

	"github.com/dop251/goja"
)

// 迭代器状态存储 - 使用私有 Symbol 替代全局 map,避免内存泄漏
// 🔥 优化:移除 cachedBytes,改用按需读取,避免预分配整个 Buffer 副本
type iteratorState struct {
	index        int64
	bufferLength int64
	buffer       *goja.Object
	iterType     string // "entries", "keys", "values"
	enhancer     *BufferEnhancer // 保存 BufferEnhancer 引用用于 fast path
}

// 使用私有 Symbol 作为迭代器状态的键,避免全局 map 导致的内存泄漏
var iteratorStateSymbol = goja.NewSymbol("[[IteratorState]]")

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

		// 从私有 Symbol 属性中获取迭代器状态
		stateVal := thisObj.GetSymbol(iteratorStateSymbol)
		if stateVal == nil || goja.IsUndefined(stateVal) {
			panic(runtime.NewTypeError("Method Array Iterator.prototype.next called on incompatible receiver"))
		}

		// 将 Go 结构体导出到 JS 对象,再从中读取字段
		state, ok := stateVal.Export().(*iteratorState)
		if !ok {
			panic(runtime.NewTypeError("Invalid iterator state"))
		}

		result := runtime.NewObject()

		if state.index < state.bufferLength {
			switch state.iterType {
			case "entries":
				// 返回 [index, value]
				// 🔥 优化:对于 Uint8Array/Buffer,使用 fast path 按需读取;对于其他 TypedArray,使用属性访问
				var val goja.Value
				// 检查是否为 Uint8Array/Buffer (bytesPerElement == 1)
				isUint8 := false
				if ctorVal := state.buffer.Get("constructor"); ctorVal != nil && !goja.IsUndefined(ctorVal) {
					if ctorObj := ctorVal.ToObject(runtime); ctorObj != nil {
						if nameVal := ctorObj.Get("name"); nameVal != nil && !goja.IsUndefined(nameVal) {
							ctorName := nameVal.String()
							isUint8 = ctorName == "Buffer" || ctorName == "Uint8Array" || ctorName == "Uint8ClampedArray"
						}
					}
				}

				if isUint8 && state.enhancer != nil {
					// 尝试使用 fastReadUint8 快速读取(仅 Uint8Array/Buffer)
					if byteVal, err := state.enhancer.fastReadUint8(state.buffer, state.index); err == nil {
						val = runtime.ToValue(byteVal)
					} else {
						// 降级到属性访问
						v := state.buffer.Get(getIndexString(state.index))
						if !goja.IsUndefined(v) && !goja.IsNull(v) {
							val = v
						} else {
							val = runtime.ToValue(uint8(0))
						}
					}
				} else {
					// 其他 TypedArray (Uint16Array, Int32Array 等) - 直接使用属性访问获取元素值
					v := state.buffer.Get(getIndexString(state.index))
					if !goja.IsUndefined(v) && !goja.IsNull(v) {
						val = v
					} else {
						val = runtime.ToValue(uint8(0))
					}
				}

				valueArray := runtime.NewArray(int64(2))
				valueArray.Set("0", runtime.ToValue(state.index))
				valueArray.Set("1", val)
				result.Set("value", valueArray)

			case "keys":
				// 返回 index
				result.Set("value", runtime.ToValue(state.index))

			case "values":
				// 返回 value - 直接返回元素值,不进行类型转换
				// 🔥 优化:对于 Uint8Array/Buffer,使用 fast path 按需读取;对于其他 TypedArray,使用属性访问
				var val goja.Value
				// 检查是否为 Uint8Array/Buffer (bytesPerElement == 1)
				isUint8 := false
				if ctorVal := state.buffer.Get("constructor"); ctorVal != nil && !goja.IsUndefined(ctorVal) {
					if ctorObj := ctorVal.ToObject(runtime); ctorObj != nil {
						if nameVal := ctorObj.Get("name"); nameVal != nil && !goja.IsUndefined(nameVal) {
							ctorName := nameVal.String()
							isUint8 = ctorName == "Buffer" || ctorName == "Uint8Array" || ctorName == "Uint8ClampedArray"
						}
					}
				}

				if isUint8 && state.enhancer != nil {
					// 尝试使用 fastReadUint8 快速读取(仅 Uint8Array/Buffer)
					if byteVal, err := state.enhancer.fastReadUint8(state.buffer, state.index); err == nil {
						val = runtime.ToValue(byteVal)
					} else {
						// 降级到属性访问
						v := state.buffer.Get(getIndexString(state.index))
						if !goja.IsUndefined(v) && !goja.IsNull(v) {
							val = v
						} else {
							val = runtime.ToValue(uint8(0))
						}
					}
				} else {
					// 其他 TypedArray (Uint16Array, Int32Array 等) - 直接使用属性访问获取元素值
					v := state.buffer.Get(getIndexString(state.index))
					if !goja.IsUndefined(v) && !goja.IsNull(v) {
						val = v
					} else {
						val = runtime.ToValue(uint8(0))
					}
				}
				result.Set("value", val)
			}

			result.Set("done", valueFalse)
			state.index++ // 状态会自动更新,因为是指针
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


		// 创建迭代器对象
		iterator := runtime.NewObject()

		// 将状态存储到迭代器对象的私有 Symbol 属性中
		// 这样当迭代器对象被 GC 回收时,状态也会自动释放,避免内存泄漏
		state := &iteratorState{
			index:        0,
			bufferLength: bufferLength,
			enhancer:     be, // 保存 BufferEnhancer 引用用于 fast path
			buffer:       this,
			iterType:     "entries",
		}
		iterator.SetSymbol(iteratorStateSymbol, runtime.ToValue(state))

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

		// 将状态存储到迭代器对象的私有 Symbol 属性中
		state := &iteratorState{
			index:        0,
			bufferLength: bufferLength,
			enhancer:     be, // 保存 BufferEnhancer 引用用于 fast path
			buffer:       this,
			iterType:     "keys",
		}
		iterator.SetSymbol(iteratorStateSymbol, runtime.ToValue(state))

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


		// 创建迭代器对象
		iterator := runtime.NewObject()

		// 将状态存储到迭代器对象的私有 Symbol 属性中
		state := &iteratorState{
			index:        0,
			bufferLength: bufferLength,
			enhancer:     be, // 保存 BufferEnhancer 引用用于 fast path
			buffer:       this,
			iterType:     "values",
		}
		iterator.SetSymbol(iteratorStateSymbol, runtime.ToValue(state))

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
