package buffer

import (
	"strconv"

	"github.com/dop251/goja"
)

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
		if len(call.Arguments) < 3 {
			panic(runtime.NewTypeError("Value、offset 和 byteLength 参数是必需的"))
		}

		value := call.Arguments[0].ToInteger()
		offset := validateOffset(runtime, call.Arguments[1], "writeIntBE")
		byteLength := call.Arguments[2].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("RangeError: byteLength 必须在 1 到 6 之间"))
		}

		// 检查 value 范围（有符号）
		min := -(int64(1) << (8*uint(byteLength) - 1))
		max := (int64(1) << (8*uint(byteLength) - 1)) - 1
		if value < min || value > max {
			panic(runtime.NewTypeError("RangeError: value 超出范围"))
		}

		// 检查 offset 边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+byteLength > bufferLength {
			panic(runtime.NewTypeError("RangeError: offset 超出 Buffer 边界"))
		}

		// 写入字节（大端）
		for i := byteLength - 1; i >= 0; i-- {
			b := byte(value & 0xFF)
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(b))
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
		if len(call.Arguments) < 3 {
			panic(runtime.NewTypeError("Value、offset 和 byteLength 参数是必需的"))
		}

		value := call.Arguments[0].ToInteger()
		offset := validateOffset(runtime, call.Arguments[1], "writeIntLE")
		byteLength := call.Arguments[2].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("RangeError: byteLength 必须在 1 到 6 之间"))
		}

		// 检查 value 范围（有符号）
		min := -(int64(1) << (8*uint(byteLength) - 1))
		max := (int64(1) << (8*uint(byteLength) - 1)) - 1
		if value < min || value > max {
			panic(runtime.NewTypeError("RangeError: value 超出范围"))
		}

		// 检查 offset 边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+byteLength > bufferLength {
			panic(runtime.NewTypeError("RangeError: offset 超出 Buffer 边界"))
		}

		// 写入字节（小端）
		for i := int64(0); i < byteLength; i++ {
			b := byte(value & 0xFF)
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(b))
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
		if len(call.Arguments) < 3 {
			panic(runtime.NewTypeError("Value、offset 和 byteLength 参数是必需的"))
		}

		value := uint64(call.Arguments[0].ToInteger())
		offset := validateOffset(runtime, call.Arguments[1], "writeUIntBE")
		byteLength := call.Arguments[2].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("RangeError: byteLength 必须在 1 到 6 之间"))
		}

		// 检查 value 范围（无符号）
		max := uint64(1)<<(8*uint(byteLength)) - 1
		if value > max {
			panic(runtime.NewTypeError("RangeError: value 超出范围"))
		}

		// 检查 offset 边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+byteLength > bufferLength {
			panic(runtime.NewTypeError("RangeError: offset 超出 Buffer 边界"))
		}

		// 写入字节（大端）
		for i := byteLength - 1; i >= 0; i-- {
			b := byte(value & 0xFF)
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(b))
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
		if len(call.Arguments) < 3 {
			panic(runtime.NewTypeError("Value、offset 和 byteLength 参数是必需的"))
		}

		value := uint64(call.Arguments[0].ToInteger())
		offset := validateOffset(runtime, call.Arguments[1], "writeUIntLE")
		byteLength := call.Arguments[2].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength 必须在 1 到 6 之间"))
		}

		// 写入字节（小端）
		for i := int64(0); i < byteLength; i++ {
			b := byte(value & 0xFF)
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(b))
			value >>= 8
		}

		return runtime.ToValue(offset + byteLength)
	}
	writeUIntLEValue := runtime.ToValue(writeUIntLEFunc)
	setFunctionNameAndLength(runtime, writeUIntLEValue, "writeUIntLE", 3)
	prototype.Set("writeUIntLE", writeUIntLEValue)
}
