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
	prototype.Set("readInt8", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
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
	})

	// writeInt8
	prototype.Set("writeInt8", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := call.Arguments[0].ToInteger()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
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
	})

	// readUInt8
	prototype.Set("readUInt8", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 1, "readUInt8")

		if val := this.Get(strconv.FormatInt(offset, 10)); !goja.IsUndefined(val) {
			if byteVal := val.ToInteger(); byteVal >= 0 {
				return runtime.ToValue(byteVal & 0xFF)
			}
		}
		panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
	})

	// writeUInt8
	prototype.Set("writeUInt8", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := call.Arguments[0].ToInteger()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
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
	})

	// === 16位整数读写方法 ===

	// readInt16BE (Big Endian)
	prototype.Set("readInt16BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 2, "readInt16BE")

		// 读取大端16位有符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		value := int16((uint16(byte1) << 8) | uint16(byte2))
		return runtime.ToValue(int64(value))
	})

	// readInt16LE (Little Endian)
	prototype.Set("readInt16LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 2, "readInt16LE")

		// 读取小端16位有符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		value := int16(uint16(byte1) | (uint16(byte2) << 8))
		return runtime.ToValue(int64(value))
	})

	// readUInt16BE
	prototype.Set("readUInt16BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 2, "readUInt16BE")

		// 读取大端16位无符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		value := uint16((uint16(byte1) << 8) | uint16(byte2))
		return runtime.ToValue(int64(value))
	})

	// readUInt16LE
	prototype.Set("readUInt16LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 2, "readUInt16LE")

		// 读取小端16位无符号整数
		byte1 := be.getBufferByte(this, offset)
		byte2 := be.getBufferByte(this, offset+1)
		value := uint16(uint16(byte1) | (uint16(byte2) << 8))
		return runtime.ToValue(int64(value))
	})

	// writeInt16BE
	prototype.Set("writeInt16BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, math.MinInt16, math.MaxInt16, "value")
		value := int16(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
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
	})

	// writeInt16LE
	prototype.Set("writeInt16LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, math.MinInt16, math.MaxInt16, "value")
		value := int16(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
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
	})

	// writeUInt16BE
	prototype.Set("writeUInt16BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, 0, math.MaxUint16, "value")
		value := uint16(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
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
	})

	// writeUInt16LE
	prototype.Set("writeUInt16LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, 0, math.MaxUint16, "value")
		value := uint16(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+2 > bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入小端16位无符号整数
		this.Set(strconv.FormatInt(offset, 10), runtime.ToValue(value&0xFF))
		this.Set(strconv.FormatInt(offset+1, 10), runtime.ToValue((value>>8)&0xFF))
		return runtime.ToValue(offset + 2)
	})

	// === 32位整数读写方法 ===

	// readInt32BE
	prototype.Set("readInt32BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
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
	})

	// readInt32LE
	prototype.Set("readInt32LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
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
	})

	// readUInt32BE
	prototype.Set("readUInt32BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
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
	})

	// readUInt32LE
	prototype.Set("readUInt32LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
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
	})

	// writeInt32BE
	prototype.Set("writeInt32BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
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
			offset = call.Arguments[1].ToInteger()
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
	})

	// writeInt32LE
	prototype.Set("writeInt32LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
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
			offset = call.Arguments[1].ToInteger()
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
	})

	// writeUInt32BE
	prototype.Set("writeUInt32BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, 0, math.MaxUint32, "value")
		value := uint32(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
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
	})

	// writeUInt32LE
	prototype.Set("writeUInt32LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		rawValue := call.Arguments[0].ToInteger()
		checkIntRange(runtime, rawValue, 0, math.MaxUint32, "value")
		value := uint32(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
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
	})

	// === 浮点数读写方法 ===

	// readFloatBE
	prototype.Set("readFloatBE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
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
	})

	// readFloatLE
	prototype.Set("readFloatLE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
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
	})

	// readDoubleBE
	prototype.Set("readDoubleBE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
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
	})

	// readDoubleLE
	prototype.Set("readDoubleLE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = call.Arguments[0].ToInteger()
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
	})

	// writeFloatBE
	prototype.Set("writeFloatBE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := float32(call.Arguments[0].ToFloat())
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+4 > bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入大端32位浮点数
		bits := math.Float32bits(value)
		bytes := make([]byte, 4)
		binary.BigEndian.PutUint32(bytes, bits)
		for i := int64(0); i < 4; i++ {
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(bytes[i]))
		}
		return runtime.ToValue(offset + 4)
	})

	// writeFloatLE
	prototype.Set("writeFloatLE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := float32(call.Arguments[0].ToFloat())
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+4 > bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入小端32位浮点数
		bits := math.Float32bits(value)
		bytes := make([]byte, 4)
		binary.LittleEndian.PutUint32(bytes, bits)
		for i := int64(0); i < 4; i++ {
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(bytes[i]))
		}
		return runtime.ToValue(offset + 4)
	})

	// writeDoubleBE
	prototype.Set("writeDoubleBE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := call.Arguments[0].ToFloat()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+8 > bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入大端64位双精度浮点数
		bits := math.Float64bits(value)
		bytes := make([]byte, 8)
		binary.BigEndian.PutUint64(bytes, bits)
		for i := int64(0); i < 8; i++ {
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(bytes[i]))
		}
		return runtime.ToValue(offset + 8)
	})

	// writeDoubleLE
	prototype.Set("writeDoubleLE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := call.Arguments[0].ToFloat()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+8 > bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
		}

		// 写入小端64位双精度浮点数
		bits := math.Float64bits(value)
		bytes := make([]byte, 8)
		binary.LittleEndian.PutUint64(bytes, bits)
		for i := int64(0); i < 8; i++ {
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(bytes[i]))
		}
		return runtime.ToValue(offset + 8)
	})
}
