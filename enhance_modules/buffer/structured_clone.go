package buffer

import (
	"strconv"
	
	"github.com/dop251/goja"
)

// SetupStructuredClone 添加 structuredClone 全局函数
// structuredClone 是 Web API，用于深拷贝对象
// 对于 Buffer，它会转换为 Uint8Array（Node.js 行为）
func SetupStructuredClone(runtime *goja.Runtime) {
	runtime.Set("structuredClone", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Failed to execute 'structuredClone': 1 argument required, but only 0 present"))
		}

		value := call.Arguments[0]
		
		// 处理 null 和 undefined
		if goja.IsNull(value) || goja.IsUndefined(value) {
			return value
		}

		// 深拷贝对象
		return cloneValue(runtime, value, make(map[interface{}]goja.Value))
	})
}

// cloneValue 递归克隆值
func cloneValue(runtime *goja.Runtime, value goja.Value, seen map[interface{}]goja.Value) goja.Value {
	// 处理原始类型（null, undefined, number, string, boolean）
	if value == nil || goja.IsNull(value) || goja.IsUndefined(value) {
		return value
	}

	// 检查是否是原始类型（不是对象）
	// 通过导出类型来判断
	exported := value.Export()
	if exported != nil {
		switch exported.(type) {
		case int, int8, int16, int32, int64:
			return value
		case uint, uint8, uint16, uint32, uint64:
			return value
		case float32, float64:
			return value
		case string:
			return value
		case bool:
			return value
		}
	}

	// 尝试获取对象
	obj := value.ToObject(runtime)
	if obj == nil {
		return value
	}

	// 检查是否已经克隆过（防止循环引用）
	if cloned, ok := seen[obj]; ok {
		return cloned
	}

	// 特殊处理 Buffer - 转换为 Uint8Array（Node.js structuredClone 行为）
	if isBuffer(runtime, obj) {
		return bufferToUint8Array(runtime, obj, seen)
	}

	// 处理数组
	if isArray(runtime, obj) {
		return cloneArray(runtime, obj, seen)
	}

	// 处理普通对象
	return cloneObject(runtime, obj, seen)
}

// isBuffer 检查对象是否是 Buffer
func isBuffer(runtime *goja.Runtime, obj *goja.Object) bool {
	bufferConstructor := runtime.Get("Buffer")
	if bufferConstructor == nil || goja.IsUndefined(bufferConstructor) {
		return false
	}

	isBufferFunc := bufferConstructor.ToObject(runtime).Get("isBuffer")
	if isBufferFunc == nil || goja.IsUndefined(isBufferFunc) {
		return false
	}

	fn, ok := goja.AssertFunction(isBufferFunc)
	if !ok {
		return false
	}

	result, err := fn(bufferConstructor, runtime.ToValue(obj))
	if err != nil {
		return false
	}

	return result.ToBoolean()
}

// bufferToUint8Array 将 Buffer 转换为 Uint8Array
func bufferToUint8Array(runtime *goja.Runtime, buf *goja.Object, seen map[interface{}]goja.Value) goja.Value {
	// 获取 buffer 长度
	lengthVal := buf.Get("length")
	if goja.IsUndefined(lengthVal) {
		return goja.Undefined()
	}
	length := lengthVal.ToInteger()

	// 创建 Uint8Array
	uint8ArrayCtor := runtime.Get("Uint8Array")
	if uint8ArrayCtor == nil || goja.IsUndefined(uint8ArrayCtor) {
		return goja.Undefined()
	}

	ctor, ok := goja.AssertConstructor(uint8ArrayCtor)
	if !ok {
		return goja.Undefined()
	}

	newArray, err := ctor(nil, runtime.ToValue(length))
	if err != nil {
		return goja.Undefined()
	}

	newArrayObj := newArray.ToObject(runtime)
	seen[buf] = newArray

	// 复制数据
	for i := int64(0); i < length; i++ {
		val := buf.Get(strconv.FormatInt(i, 10))
		if !goja.IsUndefined(val) {
			newArrayObj.Set(strconv.FormatInt(i, 10), val)
		}
	}

	return newArray
}

// isArray 检查对象是否是数组
func isArray(runtime *goja.Runtime, obj *goja.Object) bool {
	arrayIsArray := runtime.Get("Array").ToObject(runtime).Get("isArray")
	if arrayIsArray == nil || goja.IsUndefined(arrayIsArray) {
		return false
	}

	fn, ok := goja.AssertFunction(arrayIsArray)
	if !ok {
		return false
	}

	result, err := fn(goja.Undefined(), runtime.ToValue(obj))
	if err != nil {
		return false
	}

	return result.ToBoolean()
}

// cloneArray 克隆数组
func cloneArray(runtime *goja.Runtime, arr *goja.Object, seen map[interface{}]goja.Value) goja.Value {
	lengthVal := arr.Get("length")
	if goja.IsUndefined(lengthVal) {
		return goja.Undefined()
	}
	length := lengthVal.ToInteger()

	newArr := runtime.NewArray()
	seen[arr] = newArr

	for i := int64(0); i < length; i++ {
		val := arr.Get(strconv.FormatInt(i, 10))
		clonedVal := cloneValue(runtime, val, seen)
		newArr.ToObject(runtime).Set(strconv.FormatInt(i, 10), clonedVal)
	}

	return newArr
}

// cloneObject 克隆普通对象
func cloneObject(runtime *goja.Runtime, obj *goja.Object, seen map[interface{}]goja.Value) goja.Value {
	newObj := runtime.NewObject()
	seen[obj] = newObj

	// 获取对象的所有键
	keys := obj.Keys()
	for _, key := range keys {
		val := obj.Get(key)
		clonedVal := cloneValue(runtime, val, seen)
		newObj.Set(key, clonedVal)
	}

	return newObj
}
