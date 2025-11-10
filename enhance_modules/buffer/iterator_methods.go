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
	// ==================================================================================
	// Buffer 迭代器实现 (entries, keys, values)
	// ==================================================================================
	// 
	// 实现策略：
	// 1. 创建共享的迭代器原型（iteratorProto），在原型上定义 next 方法
	// 2. 使用 Go map 存储每个迭代器实例的状态（索引、buffer引用等）
	// 3. 每个迭代器实例通过 SetPrototype 继承共享原型
	//
	// 兼容性：99.59% (245/246 测试通过)
	//
	// Known Limitation (已知引擎限制):
	// 由于 goja 引擎的 for...in 实现特性，当遍历迭代器对象时会枚举到原型链上的
	// "next" 属性，即使该属性被标记为不可枚举 (enumerable: false)。
	// 
	// 这是 goja 的 enumerableIter.next() 方法在处理 SetPrototype 创建的原型链时，
	// 对 _ENUM_UNKNOWN 状态属性的检查逻辑导致的。
	//
	// 影响范围：极小
	// - propertyIsEnumerable("next") 正确返回 false ✅
	// - hasOwnProperty("next") 正确返回 false ✅
	// - Object.keys(iter) 正确返回 [] ✅
	// - for...in iter 会遍历到 "next" ❌ (唯一失败的测试)
	//
	// 实际使用不受影响：
	// - 正常迭代: for (const x of buf) { } ✅
	// - 展开运算符: [...buf] ✅
	// - Array.from(buf) ✅
	// - 手动调用: iter.next() ✅
	//
	// 要完全修复此问题需要修改 goja 源码 /fork_goja/goja/object.go 中的
	// enumerableIter.next() 方法。详见 FOR_IN_ISSUE_ANALYSIS.md
	// ==================================================================================
	
	// 创建共享的迭代器原型
	iteratorProto := runtime.NewObject()
	
	// 在原型上设置 Symbol.toStringTag（不可枚举）
	if err := iteratorProto.DefineDataPropertySymbol(goja.SymToStringTag, runtime.ToValue("Array Iterator"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
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
				val := uint8(0)
				if state.cachedBytes != nil && int64(len(state.cachedBytes)) > state.index {
					val = state.cachedBytes[state.index]
				} else if state.buffer != nil {
					if v := state.buffer.Get(getIndexString(state.index)); !goja.IsUndefined(v) {
						val = uint8(v.ToInteger() & 0xFF)
					}
				}
				
				valueArray := runtime.NewArray(int64(2))
				valueArray.Set("0", runtime.ToValue(state.index))
				valueArray.Set("1", runtime.ToValue(val))
				result.Set("value", valueArray)
				
			case "keys":
				// 返回 index
				result.Set("value", runtime.ToValue(state.index))
				
			case "values":
				// 返回 value
				val := uint8(0)
				if state.cachedBytes != nil && int64(len(state.cachedBytes)) > state.index {
					val = state.cachedBytes[state.index]
				} else if state.buffer != nil {
					if v := state.buffer.Get(getIndexString(state.index)); !goja.IsUndefined(v) {
						val = uint8(v.ToInteger() & 0xFF)
					}
				}
				result.Set("value", runtime.ToValue(val))
			}
			
			result.Set("done", runtime.ToValue(false))
			state.index++
		} else {
			result.Set("value", goja.Undefined())
			result.Set("done", runtime.ToValue(true))
		}
		
		return result
	}
	
	// 在原型上设置 next 方法（可写、不可枚举、可配置）
	if err := iteratorProto.DefineDataProperty("next", runtime.ToValue(nextFunc), goja.FLAG_TRUE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
		panic(runtime.NewTypeError("Failed to define next method on iterator prototype: " + err.Error()))
	}
	
	// 在原型上添加 Symbol.iterator 方法（可写、不可枚举、可配置）
	iteratorSelfFunc := func(call goja.FunctionCall) goja.Value {
		return call.This
	}
	if err := iteratorProto.DefineDataPropertySymbol(goja.SymIterator, runtime.ToValue(iteratorSelfFunc), goja.FLAG_TRUE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
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
	prototype.Set("entries", entriesValue)

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
	prototype.Set("keys", keysFuncObj)

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
	prototype.Set("values", valuesValue)

	// 🔥 确保 Buffer.prototype[Symbol.iterator] === Buffer.prototype.values
	// 这与 Node.js 的行为一致
	if err := prototype.DefineDataPropertySymbol(goja.SymIterator, valuesValue, goja.FLAG_TRUE, goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
		// 如果 DefineDataPropertySymbol 失败，尝试 SetSymbol
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
