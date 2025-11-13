package buffer

import (
	"fmt"
	"strconv"
	"sync"

	"github.com/dop251/goja"
)

// 🚀 性能优化：预分配字节值缓存（0-255）
var byteValueCache [256]goja.Value
var byteValueCacheOnce sync.Once

func initByteValueCache(runtime *goja.Runtime) {
	for i := 0; i < 256; i++ {
		byteValueCache[i] = runtime.ToValue(byte(i))
	}
}

// getByteValue 获取字节对应的 goja.Value，使用缓存优化性能
func getByteValue(runtime *goja.Runtime, b byte) goja.Value {
	byteValueCacheOnce.Do(func() { initByteValueCache(runtime) })
	return byteValueCache[b]
}

// isBufferInstance 检查对象是否是 Buffer 实例（不包括 TypedArray）
func isBufferInstance(runtime *goja.Runtime, obj *goja.Object) bool {
	if obj == nil {
		return false
	}

	// 检查原型链，确保是 Buffer 实例
	bufferConstructor := runtime.Get("Buffer")
	if goja.IsUndefined(bufferConstructor) {
		return false
	}

	bufferCtor := bufferConstructor.ToObject(runtime)
	if bufferCtor == nil {
		return false
	}

	prototype := bufferCtor.Get("prototype")
	if goja.IsUndefined(prototype) {
		return false
	}

	protoObj := prototype.ToObject(runtime)
	if protoObj == nil {
		return false
	}

	objProto := obj.Prototype()
	return objProto != nil && objProto == protoObj
}

func (be *BufferEnhancer) addBufferVariableLengthMethods(runtime *goja.Runtime, prototype *goja.Object) {
	// readIntBE - 读取可变长度有符号整数（大端）
	readIntBEFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 readIntBE 在不兼容的接收器上调用"))
		}
		
		// 严格检查 this 是否是 Buffer 实例（readIntBE 只能在 Buffer 上调用）
		if !isBufferInstance(runtime, this) {
			panic(runtime.NewTypeError("The \"this\" value is not a Buffer"))
		}
		
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset 和 byteLength 参数是必需的"))
		}

		offset := validateOffset(runtime, call.Arguments[0], "readIntBE")
		byteLength := validateByteLength(runtime, call.Arguments[1], 1, 6, "readIntBE")

		// 检查边界
		checkReadBounds(runtime, this, offset, byteLength, "readIntBE")

		// 读取字节
		var value int64 = 0
		for i := int64(0); i < byteLength; i++ {
			b := be.getBufferByte(this, offset+i)
			value = (value << 8) | int64(b)
		}

		// 处理符号位
		shift := uint(64 - byteLength*8)
		value = (value << shift) >> shift // 符号扩展

		return runtime.ToValue(value)
	}
	readIntBEValue := runtime.ToValue(readIntBEFunc)
	setFunctionNameAndLength(runtime, readIntBEValue, "readIntBE", 2)
	prototype.Set("readIntBE", readIntBEValue)

	// readIntLE - 读取可变长度有符号整数（小端）
	readIntLEFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 readIntLE 在不兼容的接收器上调用"))
		}
		
		// 严格检查 this 是否是 Buffer 实例（readIntBE 只能在 Buffer 上调用）
		if !isBufferInstance(runtime, this) {
			panic(runtime.NewTypeError("The \"this\" value is not a Buffer"))
		}
		
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset 和 byteLength 参数是必需的"))
		}

		offset := validateOffset(runtime, call.Arguments[0], "readIntLE")
		byteLength := validateByteLength(runtime, call.Arguments[1], 1, 6, "readIntLE")

		// 检查边界
		checkReadBounds(runtime, this, offset, byteLength, "readIntLE")

		// 读取字节（小端）
		var value int64 = 0
		for i := byteLength - 1; i >= 0; i-- {
			b := be.getBufferByte(this, offset+i)
			value = (value << 8) | int64(b)
		}

		// 处理符号位
		shift := uint(64 - byteLength*8)
		value = (value << shift) >> shift // 符号扩展

		return runtime.ToValue(value)
	}
	readIntLEValue := runtime.ToValue(readIntLEFunc)
	setFunctionNameAndLength(runtime, readIntLEValue, "readIntLE", 2)
	prototype.Set("readIntLE", readIntLEValue)

	// readUIntBE - 读取可变长度无符号整数（大端）
	readUIntBEFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 readUIntBE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset 和 byteLength 参数是必需的"))
		}

		offset := validateOffset(runtime, call.Arguments[0], "readUIntBE")
		byteLength := validateByteLength(runtime, call.Arguments[1], 1, 6, "readUIntBE")

		// 检查边界
		checkReadBounds(runtime, this, offset, byteLength, "readUIntBE")

		// 读取字节
		var value uint64 = 0
		for i := int64(0); i < byteLength; i++ {
			b := be.getBufferByte(this, offset+i)
			value = (value << 8) | uint64(b)
		}

		return runtime.ToValue(int64(value))
	}
	readUIntBEValue := runtime.ToValue(readUIntBEFunc)
	setFunctionNameAndLength(runtime, readUIntBEValue, "readUIntBE", 2)
	prototype.Set("readUIntBE", readUIntBEValue)

	// readUIntLE - 读取可变长度无符号整数（小端）
	readUIntLEFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 readUIntLE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset 和 byteLength 参数是必需的"))
		}

		offset := validateOffset(runtime, call.Arguments[0], "readUIntLE")
		byteLength := validateByteLength(runtime, call.Arguments[1], 1, 6, "readUIntLE")

		// 检查边界
		checkReadBounds(runtime, this, offset, byteLength, "readUIntLE")

		// 读取字节（小端）
		var value uint64 = 0
		for i := byteLength - 1; i >= 0; i-- {
			b := be.getBufferByte(this, offset+i)
			value = (value << 8) | uint64(b)
		}

		return runtime.ToValue(int64(value))
	}
	readUIntLEValue := runtime.ToValue(readUIntLEFunc)
	setFunctionNameAndLength(runtime, readUIntLEValue, "readUIntLE", 2)
	prototype.Set("readUIntLE", readUIntLEValue)

	// writeIntBE - 写入可变长度有符号整数（大端）
	writeIntBEFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 writeIntBE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 3 {
			panic(runtime.NewTypeError("Value、offset 和 byteLength 参数是必需的"))
		}

		value := call.Arguments[0].ToInteger()
		offset := validateOffset(runtime, call.Arguments[1], "writeIntBE")
		byteLength := call.Arguments[2].ToInteger()

		// 🔥 修复：byteLength 边界检查应该抛出 RangeError (Node.js v25.0.0 对齐)
		if byteLength < 1 || byteLength > 6 {
			panic(newRangeError(runtime, "The value of \"byteLength\" is out of range. It must be >= 1 and <= 6. Received "+strconv.FormatInt(byteLength, 10)))
		}

		// 检查 value 范围（有符号）
		min := -(int64(1) << (8*uint(byteLength) - 1))
		max := (int64(1) << (8*uint(byteLength) - 1)) - 1
		if value < min || value > max {
			panic(runtime.NewTypeError("RangeError: value 超出范围"))
		}

		// 检查 offset 边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		// 检查 offset 范围，分别处理负数和超出范围的情况
		if offset < 0 {
			panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-byteLength, offset)))
		}
		if offset+byteLength > bufferLength {
			if bufferLength == 0 {
				panic(newBufferOutOfBoundsError(runtime))
			} else {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-byteLength, offset)))
			}
		}

		// 写入字节（大端）
		// 🚀 性能优化：使用索引字符串缓存 + 字节值缓存
		for i := byteLength - 1; i >= 0; i-- {
			b := byte(value & 0xFF)
			this.Set(getIndexString(offset+i), getByteValue(runtime, b))
			value >>= 8
		}

		return runtime.ToValue(offset + byteLength)
	}
	writeIntBEValue := runtime.ToValue(writeIntBEFunc)
	setFunctionNameAndLength(runtime, writeIntBEValue, "writeIntBE", 3)
	prototype.Set("writeIntBE", writeIntBEValue)

	// writeIntLE - 写入可变长度有符号整数（小端）
	writeIntLEFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 writeIntLE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 3 {
			panic(runtime.NewTypeError("Value、offset 和 byteLength 参数是必需的"))
		}

		value := call.Arguments[0].ToInteger()
		offset := validateOffset(runtime, call.Arguments[1], "writeIntLE")
		byteLength := call.Arguments[2].ToInteger()

		// 🔥 修复：byteLength 边界检查应该抛出 RangeError (Node.js v25.0.0 对齐)
		if byteLength < 1 || byteLength > 6 {
			panic(newRangeError(runtime, "The value of \"byteLength\" is out of range. It must be >= 1 and <= 6. Received "+strconv.FormatInt(byteLength, 10)))
		}

		// 检查 value 范围（有符号）
		min := -(int64(1) << (8*uint(byteLength) - 1))
		max := (int64(1) << (8*uint(byteLength) - 1)) - 1
		if value < min || value > max {
			panic(runtime.NewTypeError("RangeError: value 超出范围"))
		}

		// 检查 offset 边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		// 检查 offset 范围，分别处理负数和超出范围的情况
		if offset < 0 {
			panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-byteLength, offset)))
		}
		if offset+byteLength > bufferLength {
			if bufferLength == 0 {
				panic(newBufferOutOfBoundsError(runtime))
			} else {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-byteLength, offset)))
			}
		}

		// 写入字节（小端）
		// 🚀 性能优化：使用索引字符串缓存 + 字节值缓存
		for i := int64(0); i < byteLength; i++ {
			b := byte(value & 0xFF)
			this.Set(getIndexString(offset+i), getByteValue(runtime, b))
			value >>= 8
		}

		return runtime.ToValue(offset + byteLength)
	}
	writeIntLEValue := runtime.ToValue(writeIntLEFunc)
	setFunctionNameAndLength(runtime, writeIntLEValue, "writeIntLE", 3)
	prototype.Set("writeIntLE", writeIntLEValue)

	// writeUIntBE - 写入可变长度无符号整数（大端）
	writeUIntBEFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 writeUIntBE 在不兼容的接收器上调用"))
		}
		// 不检查参数数量，让 validateByteLength 处理 undefined

		// 使用严格的参数验证（只对 offset 和 byteLength 严格验证）
		var valueArg goja.Value
		if len(call.Arguments) > 0 {
			valueArg = call.Arguments[0]
		} else {
			valueArg = goja.Undefined()
		}
		var offsetArg goja.Value
		if len(call.Arguments) > 1 {
			offsetArg = call.Arguments[1]
		} else {
			offsetArg = goja.Undefined()
		}
		var byteLengthArg goja.Value
		if len(call.Arguments) > 2 {
			byteLengthArg = call.Arguments[2]
		} else {
			byteLengthArg = goja.Undefined()
		}
		byteLength := validateByteLength(runtime, byteLengthArg, 1, 6, "writeUIntBE")
		offset := validateOffset(runtime, offsetArg, "writeUIntBE")

		// value 参数允许类型转换，但需要检查范围
		valueFloat := valueArg.ToFloat()
		value := uint64(valueArg.ToInteger())

		// 🔥 修复：byteLength 边界检查应该抛出 RangeError (Node.js v25.0.0 对齐)
		if byteLength < 1 || byteLength > 6 {
			panic(newRangeError(runtime, "The value of \"byteLength\" is out of range. It must be >= 1 and <= 6. Received "+strconv.FormatInt(byteLength, 10)))
		}

		// 检查 value 范围（无符号） - 先检查浮点值范围
		max := uint64(1)<<(8*uint(byteLength)) - 1
		maxFloat := float64(max)
		// 检查负数
		if valueFloat < 0 {
			if byteLength == 6 {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"value\" is out of range. It must be >= 0 and < 2 ** %d. Received %v", byteLength*8, valueFloat)))
			} else {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"value\" is out of range. It must be >= 0 and <= %d. Received %v", max, valueFloat)))
			}
		}
		if valueFloat > maxFloat {
			if byteLength == 6 {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"value\" is out of range. It must be >= 0 and < 2 ** %d. Received %v", byteLength*8, valueFloat)))
			} else {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"value\" is out of range. It must be >= 0 and <= %d. Received %v", max, valueFloat)))
			}
		}
		if value > max {
			panic(runtime.NewTypeError("RangeError: value 超出范围"))
		}

		// 检查 offset 边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		// 检查 offset 范围，分别处理负数和超出范围的情况
		if offset < 0 {
			panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-byteLength, offset)))
		}
		if offset+byteLength > bufferLength {
			if bufferLength == 0 {
				panic(newBufferOutOfBoundsError(runtime))
			} else {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-byteLength, offset)))
			}
		}

		// 写入字节（大端）
		// 🚀 性能优化：使用索引字符串缓存 + 字节值缓存
		for i := byteLength - 1; i >= 0; i-- {
			b := byte(value & 0xFF)
			this.Set(getIndexString(offset+i), getByteValue(runtime, b))
			value >>= 8
		}

		return runtime.ToValue(offset + byteLength)
	}
	writeUIntBEValue := runtime.ToValue(writeUIntBEFunc)
	setFunctionNameAndLength(runtime, writeUIntBEValue, "writeUIntBE", 3)
	prototype.Set("writeUIntBE", writeUIntBEValue)

	// writeUIntLE - 写入可变长度无符号整数（小端）
	writeUIntLEFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 writeUIntLE 在不兼容的接收器上调用"))
		}
		// 不检查参数数量，让 validateByteLength 处理 undefined

		// 使用严格的参数验证（只对 offset 和 byteLength 严格验证）
		var valueArg goja.Value
		if len(call.Arguments) > 0 {
			valueArg = call.Arguments[0]
		} else {
			valueArg = goja.Undefined()
		}
		var offsetArg goja.Value
		if len(call.Arguments) > 1 {
			offsetArg = call.Arguments[1]
		} else {
			offsetArg = goja.Undefined()
		}
		var byteLengthArg goja.Value
		if len(call.Arguments) > 2 {
			byteLengthArg = call.Arguments[2]
		} else {
			byteLengthArg = goja.Undefined()
		}
		byteLength := validateByteLength(runtime, byteLengthArg, 1, 6, "writeUIntLE")
		offset := validateOffset(runtime, offsetArg, "writeUIntLE")

		// value 参数允许类型转换，但需要检查范围
		valueFloat := valueArg.ToFloat()
		value := uint64(valueArg.ToInteger())

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength 必须在 1 到 6 之间"))
		}

		// 检查 value 范围（无符号） - 先检查浮点值范围
		max := uint64(1)<<(8*uint(byteLength)) - 1
		maxFloat := float64(max)
		// 检查负数
		if valueFloat < 0 {
			if byteLength == 6 {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"value\" is out of range. It must be >= 0 and < 2 ** %d. Received %v", byteLength*8, valueFloat)))
			} else {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"value\" is out of range. It must be >= 0 and <= %d. Received %v", max, valueFloat)))
			}
		}
		if valueFloat > maxFloat {
			if byteLength == 6 {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"value\" is out of range. It must be >= 0 and < 2 ** %d. Received %v", byteLength*8, valueFloat)))
			} else {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"value\" is out of range. It must be >= 0 and <= %d. Received %v", max, valueFloat)))
			}
		}
		if value > max {
			panic(runtime.NewTypeError("RangeError: value 超出范围"))
		}

		// 检查 offset 边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		// 检查 offset 范围，分别处理负数和超出范围的情况
		if offset < 0 {
			panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-byteLength, offset)))
		}
		if offset+byteLength > bufferLength {
			if bufferLength == 0 {
				panic(newBufferOutOfBoundsError(runtime))
			} else {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-byteLength, offset)))
			}
		}

		// 写入字节（小端）
		// 🚀 性能优化：使用索引字符串缓存 + 字节值缓存
		for i := int64(0); i < byteLength; i++ {
			b := byte(value & 0xFF)
			this.Set(getIndexString(offset+i), getByteValue(runtime, b))
			value >>= 8
		}

		return runtime.ToValue(offset + byteLength)
	}
	writeUIntLEValue := runtime.ToValue(writeUIntLEFunc)
	setFunctionNameAndLength(runtime, writeUIntLEValue, "writeUIntLE", 3)
	prototype.Set("writeUIntLE", writeUIntLEValue)
}
