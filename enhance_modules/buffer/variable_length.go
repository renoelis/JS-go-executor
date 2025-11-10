package buffer

import (
	"strconv"

	"github.com/dop251/goja"
)

func (be *BufferEnhancer) addBufferVariableLengthMethods(runtime *goja.Runtime, prototype *goja.Object) {
	// readIntBE - 读取可变长度有符号整数（大端）
	prototype.Set("readIntBE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 readIntBE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset 和 byteLength 参数是必需的"))
		}

		offset := call.Arguments[0].ToInteger()
		byteLength := call.Arguments[1].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength 必须在 1 到 6 之间"))
		}

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
	})

	// readIntLE - 读取可变长度有符号整数（小端）
	prototype.Set("readIntLE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 readIntLE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset 和 byteLength 参数是必需的"))
		}

		offset := call.Arguments[0].ToInteger()
		byteLength := call.Arguments[1].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength 必须在 1 到 6 之间"))
		}

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
	})

	// readUIntBE - 读取可变长度无符号整数（大端）
	prototype.Set("readUIntBE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 readUIntBE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset 和 byteLength 参数是必需的"))
		}

		offset := call.Arguments[0].ToInteger()
		byteLength := call.Arguments[1].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength 必须在 1 到 6 之间"))
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, byteLength, "readUIntBE")

		// 读取字节
		var value uint64 = 0
		for i := int64(0); i < byteLength; i++ {
			b := be.getBufferByte(this, offset+i)
			value = (value << 8) | uint64(b)
		}

		return runtime.ToValue(int64(value))
	})

	// readUIntLE - 读取可变长度无符号整数（小端）
	prototype.Set("readUIntLE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("方法 readUIntLE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset 和 byteLength 参数是必需的"))
		}

		offset := call.Arguments[0].ToInteger()
		byteLength := call.Arguments[1].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength 必须在 1 到 6 之间"))
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, byteLength, "readUIntLE")

		// 读取字节（小端）
		var value uint64 = 0
		for i := byteLength - 1; i >= 0; i-- {
			b := be.getBufferByte(this, offset+i)
			value = (value << 8) | uint64(b)
		}

		return runtime.ToValue(int64(value))
	})

	// writeIntBE - 写入可变长度有符号整数（大端）
	prototype.Set("writeIntBE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 3 {
			panic(runtime.NewTypeError("Value、offset 和 byteLength 参数是必需的"))
		}

		value := call.Arguments[0].ToInteger()
		offset := call.Arguments[1].ToInteger()
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
	})

	// writeIntLE - 写入可变长度有符号整数（小端）
	prototype.Set("writeIntLE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 3 {
			panic(runtime.NewTypeError("Value、offset 和 byteLength 参数是必需的"))
		}

		value := call.Arguments[0].ToInteger()
		offset := call.Arguments[1].ToInteger()
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
	})

	// writeUIntBE - 写入可变长度无符号整数（大端）
	prototype.Set("writeUIntBE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 3 {
			panic(runtime.NewTypeError("Value、offset 和 byteLength 参数是必需的"))
		}

		value := uint64(call.Arguments[0].ToInteger())
		offset := call.Arguments[1].ToInteger()
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
	})

	// writeUIntLE - 写入可变长度无符号整数（小端）
	prototype.Set("writeUIntLE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 3 {
			panic(runtime.NewTypeError("Value、offset 和 byteLength 参数是必需的"))
		}

		value := uint64(call.Arguments[0].ToInteger())
		offset := call.Arguments[1].ToInteger()
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
	})
}
