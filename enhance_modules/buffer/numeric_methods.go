package buffer

import (
	"encoding/binary"
	"fmt"
	"math"
	"strconv"

	"github.com/dop251/goja"
)

func (be *BufferEnhancer) addBufferNumericMethods(runtime *goja.Runtime, prototype *goja.Object) {
	// readInt8
	readInt8Func := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readInt8")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readInt8")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 1, "readInt8")

		if val := this.Get(strconv.FormatInt(offset, 10)); !goja.IsUndefined(val) {
			if byteVal := val.ToInteger(); byteVal >= 0 {
				// 转换为有符号int8
				result := int8(byteVal & 0xFF)
				return runtime.ToValue(int64(result))
			}
		}
		panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
	}
	readInt8Value := runtime.ToValue(readInt8Func)
	setFunctionNameAndLength(runtime, readInt8Value, "readInt8", 0)
	prototype.Set("readInt8", readInt8Value)

	// writeInt8
	writeInt8Func := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeInt8")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := call.Arguments[0].ToInteger()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeInt8")
		}

		// 🔥 修复：添加范围校验（Node.js 行为）
		// writeInt8 允许 [-128, 127]
		checkIntRange(runtime, value, math.MinInt8, math.MaxInt8, "value")

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		if offset >= bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入值
		this.Set(strconv.FormatInt(offset, 10), runtime.ToValue(value&0xFF))
		return runtime.ToValue(offset + 1)
	}
	writeInt8Value := runtime.ToValue(writeInt8Func)
	setFunctionNameAndLength(runtime, writeInt8Value, "writeInt8", 1)
	prototype.Set("writeInt8", writeInt8Value)

	// readUInt8
	readUInt8Func := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readUInt8")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readUInt8")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 1, "readUInt8")

		if val := this.Get(strconv.FormatInt(offset, 10)); !goja.IsUndefined(val) {
			if byteVal := val.ToInteger(); byteVal >= 0 {
				return runtime.ToValue(byteVal & 0xFF)
			}
		}
		panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
	}
	readUInt8Value := runtime.ToValue(readUInt8Func)
	setFunctionNameAndLength(runtime, readUInt8Value, "readUInt8", 0)
	prototype.Set("readUInt8", readUInt8Value)

	// writeUInt8
	writeUInt8Func := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeUInt8")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := call.Arguments[0].ToInteger()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeUInt8")
		}

		// 🔥 修复：添加范围校验（Node.js 行为）
		// writeUInt8 允许 [0, 255]
		checkIntRange(runtime, value, 0, math.MaxUint8, "value")

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		if offset < 0 || offset >= bufferLength {
			errObj := runtime.NewGoError(fmt.Errorf("The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength-1, offset))
			errObj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
			errObj.Set("name", runtime.ToValue("RangeError"))
			panic(errObj)
		}

		// 写入值
		this.Set(strconv.FormatInt(offset, 10), runtime.ToValue(value&0xFF))
		return runtime.ToValue(offset + 1)
	}
	writeUInt8Value := runtime.ToValue(writeUInt8Func)
	setFunctionNameAndLength(runtime, writeUInt8Value, "writeUInt8", 1)
	prototype.Set("writeUInt8", writeUInt8Value)

	// === 16位整数读写方法 ===

	// readInt16BE (Big Endian)
	readInt16BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readInt16BE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readInt16BE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 2, "readInt16BE")

		// 读取大端16位有符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		value := int16((uint16(byte1) << 8) | uint16(byte2))
		return runtime.ToValue(int64(value))
	}
	readInt16BEValue := runtime.ToValue(readInt16BEFunc)
	setFunctionNameAndLength(runtime, readInt16BEValue, "readInt16BE", 0)
	prototype.Set("readInt16BE", readInt16BEValue)

	// readInt16LE (Little Endian)
	readInt16LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readInt16LE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readInt16LE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 2, "readInt16LE")

		// 读取小端16位有符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		value := int16(uint16(byte1) | (uint16(byte2) << 8))
		return runtime.ToValue(int64(value))
	}
	readInt16LEValue := runtime.ToValue(readInt16LEFunc)
	setFunctionNameAndLength(runtime, readInt16LEValue, "readInt16LE", 0)
	prototype.Set("readInt16LE", readInt16LEValue)

	// readUInt16BE
	readUInt16BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readUInt16BE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readUInt16BE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 2, "readUInt16BE")

		// 读取大端16位无符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		value := uint16((uint16(byte1) << 8) | uint16(byte2))
		return runtime.ToValue(int64(value))
	}
	readUInt16BEValue := runtime.ToValue(readUInt16BEFunc)
	setFunctionNameAndLength(runtime, readUInt16BEValue, "readUInt16BE", 0)
	prototype.Set("readUInt16BE", readUInt16BEValue)

	// readUInt16LE
	readUInt16LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readUInt16LE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readUInt16LE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 2, "readUInt16LE")

		// 读取小端16位无符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		value := uint16(uint16(byte1) | (uint16(byte2) << 8))
		return runtime.ToValue(int64(value))
	}
	readUInt16LEValue := runtime.ToValue(readUInt16LEFunc)
	setFunctionNameAndLength(runtime, readUInt16LEValue, "readUInt16LE", 0)
	prototype.Set("readUInt16LE", readUInt16LEValue)

	// writeInt16BE
	writeInt16BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeInt16BE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, math.MinInt16, math.MaxInt16, "value")
		value := int16(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeInt16BE")
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+2 > bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入大端16位整数
		this.Set(strconv.FormatInt(offset, 10), runtime.ToValue((value>>8)&0xFF))
		this.Set(strconv.FormatInt(offset+1, 10), runtime.ToValue(value&0xFF))
		return runtime.ToValue(offset + 2)
	}
	writeInt16BEValue := runtime.ToValue(writeInt16BEFunc)
	setFunctionNameAndLength(runtime, writeInt16BEValue, "writeInt16BE", 1)
	prototype.Set("writeInt16BE", writeInt16BEValue)

	// writeInt16LE
	writeInt16LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeInt16LE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, math.MinInt16, math.MaxInt16, "value")
		value := int16(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeInt16LE")
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+2 > bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入小端16位整数
		this.Set(strconv.FormatInt(offset, 10), runtime.ToValue(value&0xFF))
		this.Set(strconv.FormatInt(offset+1, 10), runtime.ToValue((value>>8)&0xFF))
		return runtime.ToValue(offset + 2)
	}
	writeInt16LEValue := runtime.ToValue(writeInt16LEFunc)
	setFunctionNameAndLength(runtime, writeInt16LEValue, "writeInt16LE", 1)
	prototype.Set("writeInt16LE", writeInt16LEValue)

	// writeUInt16BE
	writeUInt16BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeUInt16BE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, 0, math.MaxUint16, "value")
		value := uint16(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeUInt16BE")
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+2 > bufferLength {
			errObj := runtime.NewGoError(fmt.Errorf("The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength-2, offset))
			errObj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
			errObj.Set("name", runtime.ToValue("RangeError"))
			panic(errObj)
		}

		// 写入大端16位无符号整数
		this.Set(strconv.FormatInt(offset, 10), runtime.ToValue((value>>8)&0xFF))
		this.Set(strconv.FormatInt(offset+1, 10), runtime.ToValue(value&0xFF))
		return runtime.ToValue(offset + 2)
	}
	writeUInt16BEValue := runtime.ToValue(writeUInt16BEFunc)
	setFunctionNameAndLength(runtime, writeUInt16BEValue, "writeUInt16BE", 1)
	prototype.Set("writeUInt16BE", writeUInt16BEValue)

	// writeUInt16LE
	writeUInt16LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeUInt16LE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, 0, math.MaxUint16, "value")
		value := uint16(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeUInt16LE")
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+2 > bufferLength {
			errObj := runtime.NewGoError(fmt.Errorf("The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength-2, offset))
			errObj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
			errObj.Set("name", runtime.ToValue("RangeError"))
			panic(errObj)
		}

		// 写入小端16位无符号整数
		this.Set(strconv.FormatInt(offset, 10), runtime.ToValue(value&0xFF))
		this.Set(strconv.FormatInt(offset+1, 10), runtime.ToValue((value>>8)&0xFF))
		return runtime.ToValue(offset + 2)
	}
	writeUInt16LEValue := runtime.ToValue(writeUInt16LEFunc)
	setFunctionNameAndLength(runtime, writeUInt16LEValue, "writeUInt16LE", 1)
	prototype.Set("writeUInt16LE", writeUInt16LEValue)

	// === 32位整数读写方法 ===

	// readInt32BE
	readInt32BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readInt32BE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readInt32BE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 4, "readInt32BE")

		// 读取大端32位有符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		byte3 := be.getBufferByte(this, offset+2)
		byte4 := be.getBufferByte(this, offset+3)
		value := int32((uint32(byte1) << 24) | (uint32(byte2) << 16) | (uint32(byte3) << 8) | uint32(byte4))
		return runtime.ToValue(int64(value))
	}
	readInt32BEValue := runtime.ToValue(readInt32BEFunc)
	setFunctionNameAndLength(runtime, readInt32BEValue, "readInt32BE", 0)
	prototype.Set("readInt32BE", readInt32BEValue)

	// readInt32LE
	readInt32LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readInt32LE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readInt32LE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 4, "readInt32LE")

		// 读取小端32位有符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		byte3 := be.getBufferByte(this, offset+2)
		byte4 := be.getBufferByte(this, offset+3)
		value := int32(uint32(byte1) | (uint32(byte2) << 8) | (uint32(byte3) << 16) | (uint32(byte4) << 24))
		return runtime.ToValue(int64(value))
	}
	readInt32LEValue := runtime.ToValue(readInt32LEFunc)
	setFunctionNameAndLength(runtime, readInt32LEValue, "readInt32LE", 0)
	prototype.Set("readInt32LE", readInt32LEValue)

	// readUInt32BE
	readUInt32BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readUInt32BE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readUInt32BE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 4, "readUInt32BE")

		// 读取大端32位无符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		byte3 := be.getBufferByte(this, offset+2)
		byte4 := be.getBufferByte(this, offset+3)
		value := uint32((uint32(byte1) << 24) | (uint32(byte2) << 16) | (uint32(byte3) << 8) | uint32(byte4))
		return runtime.ToValue(int64(value))
	}
	readUInt32BEValue := runtime.ToValue(readUInt32BEFunc)
	setFunctionNameAndLength(runtime, readUInt32BEValue, "readUInt32BE", 0)
	prototype.Set("readUInt32BE", readUInt32BEValue)

	// readUInt32LE
	readUInt32LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readUInt32LE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readUInt32LE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 4, "readUInt32LE")

		// 读取小端32位无符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		byte3 := be.getBufferByte(this, offset+2)
		byte4 := be.getBufferByte(this, offset+3)
		value := uint32(uint32(byte1) | (uint32(byte2) << 8) | (uint32(byte3) << 16) | (uint32(byte4) << 24))
		return runtime.ToValue(int64(value))
	}
	readUInt32LEValue := runtime.ToValue(readUInt32LEFunc)
	setFunctionNameAndLength(runtime, readUInt32LEValue, "readUInt32LE", 0)
	prototype.Set("readUInt32LE", readUInt32LEValue)

	// writeInt32BE
	writeInt32BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeInt32BE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		// 获取原始值并检查范围（Node.js 行为）
		rawValue := call.Arguments[0].ToInteger()
		if rawValue < math.MinInt32 || rawValue > math.MaxInt32 {
			panic(runtime.NewTypeError("\"value\" 的值超出范围。必须 >= -2147483648 且 <= 2147483647。接收到 " + strconv.FormatInt(rawValue, 10)))
		}
		value := int32(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeInt32BE")
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+4 > bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入大端32位整数
		this.Set(strconv.FormatInt(offset, 10), runtime.ToValue((value>>24)&0xFF))
		this.Set(strconv.FormatInt(offset+1, 10), runtime.ToValue((value>>16)&0xFF))
		this.Set(strconv.FormatInt(offset+2, 10), runtime.ToValue((value>>8)&0xFF))
		this.Set(strconv.FormatInt(offset+3, 10), runtime.ToValue(value&0xFF))
		return runtime.ToValue(offset + 4)
	}
	writeInt32BEValue := runtime.ToValue(writeInt32BEFunc)
	setFunctionNameAndLength(runtime, writeInt32BEValue, "writeInt32BE", 1)
	prototype.Set("writeInt32BE", writeInt32BEValue)

	// writeInt32LE
	writeInt32LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeInt32LE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		// 获取原始值并检查范围（Node.js 行为）
		rawValue := call.Arguments[0].ToInteger()
		if rawValue < math.MinInt32 || rawValue > math.MaxInt32 {
			panic(runtime.NewTypeError("\"value\" 的值超出范围。必须 >= -2147483648 且 <= 2147483647。接收到 " + strconv.FormatInt(rawValue, 10)))
		}
		value := int32(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeInt32LE")
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+4 > bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入小端32位整数
		this.Set(strconv.FormatInt(offset, 10), runtime.ToValue(value&0xFF))
		this.Set(strconv.FormatInt(offset+1, 10), runtime.ToValue((value>>8)&0xFF))
		this.Set(strconv.FormatInt(offset+2, 10), runtime.ToValue((value>>16)&0xFF))
		this.Set(strconv.FormatInt(offset+3, 10), runtime.ToValue((value>>24)&0xFF))
		return runtime.ToValue(offset + 4)
	}
	writeInt32LEValue := runtime.ToValue(writeInt32LEFunc)
	setFunctionNameAndLength(runtime, writeInt32LEValue, "writeInt32LE", 1)
	prototype.Set("writeInt32LE", writeInt32LEValue)

	// writeUInt32BE
	writeUInt32BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeUInt32BE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, 0, math.MaxUint32, "value")
		value := uint32(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeUInt32BE")
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+4 > bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入大端32位无符号整数
		this.Set(strconv.FormatInt(offset, 10), runtime.ToValue((value>>24)&0xFF))
		this.Set(strconv.FormatInt(offset+1, 10), runtime.ToValue((value>>16)&0xFF))
		this.Set(strconv.FormatInt(offset+2, 10), runtime.ToValue((value>>8)&0xFF))
		this.Set(strconv.FormatInt(offset+3, 10), runtime.ToValue(value&0xFF))
		return runtime.ToValue(offset + 4)
	}
	writeUInt32BEValue := runtime.ToValue(writeUInt32BEFunc)
	setFunctionNameAndLength(runtime, writeUInt32BEValue, "writeUInt32BE", 1)
	prototype.Set("writeUInt32BE", writeUInt32BEValue)

	// writeUInt32LE
	writeUInt32LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeUInt32LE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, 0, math.MaxUint32, "value")
		value := uint32(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeUInt32LE")
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+4 > bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入小端32位无符号整数
		this.Set(strconv.FormatInt(offset, 10), runtime.ToValue(value&0xFF))
		this.Set(strconv.FormatInt(offset+1, 10), runtime.ToValue((value>>8)&0xFF))
		this.Set(strconv.FormatInt(offset+2, 10), runtime.ToValue((value>>16)&0xFF))
		this.Set(strconv.FormatInt(offset+3, 10), runtime.ToValue((value>>24)&0xFF))
		return runtime.ToValue(offset + 4)
	}
	writeUInt32LEValue := runtime.ToValue(writeUInt32LEFunc)
	setFunctionNameAndLength(runtime, writeUInt32LEValue, "writeUInt32LE", 1)
	prototype.Set("writeUInt32LE", writeUInt32LEValue)

	// === 浮点数读写方法 ===

	// readFloatBE
	readFloatBEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readFloatBE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readFloatBE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 4, "readFloatBE")

		// 读取大端32位浮点数
		bytes := make([]byte, 4)
		for i := int64(0); i < 4; i++ {
			bytes[i] = be.getBufferByte(this, offset+i)
		}
		value := math.Float32frombits(binary.BigEndian.Uint32(bytes))
		return runtime.ToValue(float64(value))
	}
	readFloatBEValue := runtime.ToValue(readFloatBEFunc)
	setFunctionNameAndLength(runtime, readFloatBEValue, "readFloatBackwards", 0)
	prototype.Set("readFloatBE", readFloatBEValue)

	// readFloatLE
	readFloatLEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readFloatLE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readFloatLE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 4, "readFloatLE")

		// 读取小端32位浮点数
		bytes := make([]byte, 4)
		for i := int64(0); i < 4; i++ {
			bytes[i] = be.getBufferByte(this, offset+i)
		}
		value := math.Float32frombits(binary.LittleEndian.Uint32(bytes))
		return runtime.ToValue(float64(value))
	}
	readFloatLEValue := runtime.ToValue(readFloatLEFunc)
	setFunctionNameAndLength(runtime, readFloatLEValue, "readFloatForwards", 0)
	prototype.Set("readFloatLE", readFloatLEValue)

	// readDoubleBE
	readDoubleBEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readDoubleBE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readDoubleBE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "readDoubleBE")

		// 读取大端64位双精度浮点数
		bytes := make([]byte, 8)
		for i := int64(0); i < 8; i++ {
			bytes[i] = be.getBufferByte(this, offset+i)
		}
		value := math.Float64frombits(binary.BigEndian.Uint64(bytes))
		return runtime.ToValue(value)
	}
	readDoubleBEValue := runtime.ToValue(readDoubleBEFunc)
	setFunctionNameAndLength(runtime, readDoubleBEValue, "readDoubleBackwards", 0)
	prototype.Set("readDoubleBE", readDoubleBEValue)

	// readDoubleLE
	readDoubleLEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readDoubleLE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readDoubleLE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "readDoubleLE")

		// 读取小端64位双精度浮点数
		bytes := make([]byte, 8)
		for i := int64(0); i < 8; i++ {
			bytes[i] = be.getBufferByte(this, offset+i)
		}
		value := math.Float64frombits(binary.LittleEndian.Uint64(bytes))
		return runtime.ToValue(value)
	}
	readDoubleLEValue := runtime.ToValue(readDoubleLEFunc)
	setFunctionNameAndLength(runtime, readDoubleLEValue, "readDoubleForwards", 0)
	prototype.Set("readDoubleLE", readDoubleLEValue)

	// writeFloatBE
	writeFloatBEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeFloatBE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := float32(call.Arguments[0].ToFloat())
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeFloatBE")
		}

		// 检查边界
		checkBounds(runtime, this, offset, 4, "writeFloatBE")

		// 写入大端32位浮点数
		bits := math.Float32bits(value)
		bytes := make([]byte, 4)
		binary.BigEndian.PutUint32(bytes, bits)
		for i := int64(0); i < 4; i++ {
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(bytes[i]))
		}
		return runtime.ToValue(offset + 4)
	}
	writeFloatBEValue := runtime.ToValue(writeFloatBEFunc)
	setFunctionNameAndLength(runtime, writeFloatBEValue, "writeFloatBackwards", 1)
	prototype.Set("writeFloatBE", writeFloatBEValue)

	// writeFloatLE
	writeFloatLEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeFloatLE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := float32(call.Arguments[0].ToFloat())
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeFloatLE")
		}

		// 检查边界
		checkBounds(runtime, this, offset, 4, "writeFloatLE")

		// 写入小端32位浮点数
		bits := math.Float32bits(value)
		bytes := make([]byte, 4)
		binary.LittleEndian.PutUint32(bytes, bits)
		for i := int64(0); i < 4; i++ {
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(bytes[i]))
		}
		return runtime.ToValue(offset + 4)
	}
	writeFloatLEValue := runtime.ToValue(writeFloatLEFunc)
	setFunctionNameAndLength(runtime, writeFloatLEValue, "writeFloatForwards", 1)
	prototype.Set("writeFloatLE", writeFloatLEValue)

	// writeDoubleBE
	writeDoubleBEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeDoubleBE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := call.Arguments[0].ToFloat()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeDoubleBE")
		}

		// 检查边界
		checkBounds(runtime, this, offset, 8, "writeDoubleBE")

		// 写入大端64位双精度浮点数
		bits := math.Float64bits(value)
		bytes := make([]byte, 8)
		binary.BigEndian.PutUint64(bytes, bits)
		for i := int64(0); i < 8; i++ {
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(bytes[i]))
		}
		return runtime.ToValue(offset + 8)
	}
	writeDoubleBEValue := runtime.ToValue(writeDoubleBEFunc)
	setFunctionNameAndLength(runtime, writeDoubleBEValue, "writeDoubleBackwards", 1)
	prototype.Set("writeDoubleBE", writeDoubleBEValue)

	// writeDoubleLE
	writeDoubleLEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeDoubleLE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := call.Arguments[0].ToFloat()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeDoubleLE")
		}

		// 检查边界
		checkBounds(runtime, this, offset, 8, "writeDoubleLE")

		// 写入小端64位双精度浮点数
		bits := math.Float64bits(value)
		bytes := make([]byte, 8)
		binary.LittleEndian.PutUint64(bytes, bits)
		for i := int64(0); i < 8; i++ {
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(bytes[i]))
		}
		return runtime.ToValue(offset + 8)
	}
	writeDoubleLEValue := runtime.ToValue(writeDoubleLEFunc)
	setFunctionNameAndLength(runtime, writeDoubleLEValue, "writeDoubleForwards", 1)
	prototype.Set("writeDoubleLE", writeDoubleLEValue)
}
