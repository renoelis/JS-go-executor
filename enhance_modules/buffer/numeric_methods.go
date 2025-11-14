package buffer

import (
	"encoding/binary"
	"fmt"
	"math"
	"strconv"

	"github.com/dop251/goja"
)

// 性能优化：缓存常用的数字字符串，避免重复 FormatInt 调用
// 扩大缓存范围到 4096，覆盖更多 Buffer 操作场景
var offsetStrCache = make(map[int64]string, 4096)

func init() {
	// 预缓存 0-4095 的字符串表示，覆盖大部分 Buffer 索引
	for i := int64(0); i < 4096; i++ {
		offsetStrCache[i] = strconv.FormatInt(i, 10)
	}
}

// fastFormatInt 快速获取整数的字符串表示，对小数字使用缓存
func fastFormatInt(n int64) string {
	if n >= 0 && n < 4096 {
		return offsetStrCache[n]
	}
	return strconv.FormatInt(n, 10)
}

// getValueArgument 获取 value 参数，如果没有提供则返回 undefined
// 这与 Node.js 行为一致：undefined 会被转换为 NaN (浮点数) 或 0 (整数)
func getValueArgument(call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 1 {
		return goja.Undefined()
	}
	return call.Arguments[0]
}

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
		
		// value 参数：缺失时默认为 0
		var valueArg goja.Value
		if len(call.Arguments) >= 1 {
			valueArg = call.Arguments[0]
		} else {
			valueArg = runtime.ToValue(0)
		}
		
		// offset 参数：缺失时默认为 0
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeInt8")
		}

		// 🔥 修复：使用严格范围校验（在截断前检查浮点数）
		// writeInt8 允许 [-128, 127]
		value := checkIntRangeStrict(runtime, valueArg, math.MinInt8, math.MaxInt8, "value")

		// 检查边界（使用 checkBounds）
		bufferLength := checkBounds(runtime, this, offset, 1, "writeInt8")
		_ = bufferLength // bufferLength 由 checkBounds 返回但此处不需要使用

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
		
		// value 参数：缺失时默认为 0
		var valueArg goja.Value
		if len(call.Arguments) >= 1 {
			valueArg = call.Arguments[0]
		} else {
			valueArg = runtime.ToValue(0)
		}
		
		// offset 参数：缺失时默认为 0
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeUInt8")
		}

		// 🔥 修复：使用严格范围校验（在截断前检查浮点数）
		// writeUInt8 允许 [0, 255]
		value := checkIntRangeStrict(runtime, valueArg, 0, math.MaxUint8, "value")

		// 检查边界（使用 checkBounds）
		bufferLength := checkBounds(runtime, this, offset, 1, "writeUInt8")
		_ = bufferLength // bufferLength 由 checkBounds 返回但此处不需要使用

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

		// 🔥 性能优化：尝试使用快速路径
		if val, err := be.fastReadUint16BE(this, offset); err == nil {
			return runtime.ToValue(int64(int16(val)))
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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

		// 🔥 性能优化：尝试使用快速路径
		if val, err := be.fastReadUint16LE(this, offset); err == nil {
			return runtime.ToValue(int64(int16(val)))
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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

		// 🔥 性能优化：尝试使用快速路径
		if val, err := be.fastReadUint16BE(this, offset); err == nil {
			return runtime.ToValue(int64(val))
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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

		// 🔥 性能优化：尝试使用快速路径
		if val, err := be.fastReadUint16LE(this, offset); err == nil {
			return runtime.ToValue(int64(val))
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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

		// 检查对象是否被冻结（对齐 Node.js 行为）
		checkIfFrozen(runtime, this, "writeInt16BE")

		// 检查值参数
		var value int16
		if len(call.Arguments) < 1 || goja.IsUndefined(call.Arguments[0]) {
			// undefined 转为 0
			value = 0
		} else {
			// 使用严格检查（支持 Infinity/NaN 检测）
			rawValue := checkIntRangeStrict(runtime, call.Arguments[0], math.MinInt16, math.MaxInt16, "value")
			value = int16(rawValue)
		}

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeInt16BE")
		}

		// 获取 buffer 长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 检查 offset 边界（对齐 Node.js v25.0.0）
		if offset < 0 {
			errObj := runtime.NewGoError(fmt.Errorf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-2, offset))
			errObj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
			errObj.Set("name", runtime.ToValue("RangeError"))
			panic(errObj)
		}
		if offset+2 > bufferLength {
			errObj := runtime.NewGoError(fmt.Errorf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-2, offset))
			errObj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
			errObj.Set("name", runtime.ToValue("RangeError"))
			panic(errObj)
		}

		// 🔥 性能优化：尝试使用快速路径,失败则降级到兼容路径
		if err := be.fastWriteUint16BE(this, offset, uint16(value)); err == nil {
			return runtime.ToValue(offset + 2)
		}

		// 降级到兼容路径（用于普通对象/数组）
		byte0 := runtime.ToValue((value >> 8) & 0xFF)
		byte1 := runtime.ToValue(value & 0xFF)
		offsetStr := fastFormatInt(offset)
		offset1Str := fastFormatInt(offset + 1)
		this.Set(offsetStr, byte0)
		this.Set(offset1Str, byte1)
		return runtime.ToValue(offset + 2)
	}
	writeInt16BEValue := runtime.ToValue(writeInt16BEFunc)
	setFunctionNameAndLength(runtime, writeInt16BEValue, "writeInt16BE", 1)
	prototype.Set("writeInt16BE", writeInt16BEValue)

	// writeInt16LE
	writeInt16LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeInt16LE")
		
		// 检查对象是否被冻结（对齐 Node.js 行为）
		checkIfFrozen(runtime, this, "writeInt16LE")
		
		// 检查值参数
		var value int16
		if len(call.Arguments) < 1 || goja.IsUndefined(call.Arguments[0]) {
			// undefined 转为 0
			value = 0
		} else {
			// 使用严格检查（支持 Infinity/NaN 检测）
			rawValue := checkIntRangeStrict(runtime, call.Arguments[0], math.MinInt16, math.MaxInt16, "value")
			value = int16(rawValue)
		}

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeInt16LE")
		}

		// 获取 buffer 长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		
		// 检查 offset 边界（对齐 Node.js v25.0.0）
		if offset < 0 {
			errObj := runtime.NewGoError(fmt.Errorf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-2, offset))
			errObj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
			errObj.Set("name", runtime.ToValue("RangeError"))
			panic(errObj)
		}
		if offset+2 > bufferLength {
			errObj := runtime.NewGoError(fmt.Errorf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-2, offset))
			errObj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
			errObj.Set("name", runtime.ToValue("RangeError"))
			panic(errObj)
		}

		// 写入小端16位整数 - 性能优化版
		// 预计算字节值和索引字符串，减少重复计算
		byte0 := runtime.ToValue(value & 0xFF)
		byte1 := runtime.ToValue((value >> 8) & 0xFF)
		
		// 使用缓存减少字符串转换开销
		offsetStr := fastFormatInt(offset)
		offset1Str := fastFormatInt(offset + 1)
		
		this.Set(offsetStr, byte0)
		this.Set(offset1Str, byte1)
		return runtime.ToValue(offset + 2)
	}
	writeInt16LEValue := runtime.ToValue(writeInt16LEFunc)
	setFunctionNameAndLength(runtime, writeInt16LEValue, "writeInt16LE", 1)
	prototype.Set("writeInt16LE", writeInt16LEValue)

	// writeUInt16BE
	writeUInt16BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeUInt16BE")
		
		// 获取 value 参数，如果未传入则使用 undefined（转为 NaN -> 0）
		valArg := goja.Undefined()
		if len(call.Arguments) > 0 {
			valArg = call.Arguments[0]
		}
		
		// 使用严格范围检查（先检查浮点数范围再截断）
		rawValue := checkIntRangeStrict(runtime, valArg, 0, math.MaxUint16, "value")
		value := uint16(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeUInt16BE")
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
		// 行为对齐：Buffer/TypedArray 按字节写入；其他（数组/类数组）按数组风格写入
		isTyped := isBufferOrTypedArray(runtime, this)
		if !isTyped {
			// 稀疏数组/类数组：要求目标索引必须已存在（Node 对 holes 抛 RangeError）
			idx0 := strconv.FormatInt(offset, 10)
			idx1 := strconv.FormatInt(offset+1, 10)
			if v0 := this.Get(idx0); v0 == nil || goja.IsUndefined(v0) {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength-2, offset)))
			}
			if v1 := this.Get(idx1); v1 == nil || goja.IsUndefined(v1) {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength-2, offset)))
			}
			// 高位写入字节，下一位写入原始参数值（可为 NaN）
			this.Set(idx0, runtime.ToValue(uint16((value>>8)&0xFF)))
			// 使用原始 valArg 写入完整值，保持 NaN 行为
			this.Set(idx1, valArg)
		} else {
			// Buffer/TypedArray：按字节 - 性能优化版
			// 预计算字节值和索引字符串，减少重复计算
			byte0 := runtime.ToValue((value >> 8) & 0xFF)
			byte1 := runtime.ToValue(value & 0xFF)
			
			// 使用缓存减少字符串转换开销
			offsetStr := fastFormatInt(offset)
			offset1Str := fastFormatInt(offset + 1)
			
			this.Set(offsetStr, byte0)
			this.Set(offset1Str, byte1)
		}
		return runtime.ToValue(offset + 2)
	}
	writeUInt16BEValue := runtime.ToValue(writeUInt16BEFunc)
	setFunctionNameAndLength(runtime, writeUInt16BEValue, "writeUInt16BE", 1)
	prototype.Set("writeUInt16BE", writeUInt16BEValue)

	// writeUInt16LE
	writeUInt16LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeUInt16LE")
		
		// 获取 value 参数，如果未传入则使用 undefined（转为 NaN -> 0）
		valArg := goja.Undefined()
		if len(call.Arguments) > 0 {
			valArg = call.Arguments[0]
		}
		
		// 使用严格范围检查（先检查浮点数范围再截断）
		rawValue := checkIntRangeStrict(runtime, valArg, 0, math.MaxUint16, "value")
		value := uint16(rawValue)

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeUInt16LE")
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
		// 🔥 行为对齐：Buffer/TypedArray 按字节写入；其他（数组/类数组）按数组风格写入
		isTyped := isBufferOrTypedArray(runtime, this)
		if !isTyped {
			// 稀疏数组/类数组：要求目标索引必须已存在（Node 对 holes 抛 RangeError）
			idx0 := strconv.FormatInt(offset, 10)
			idx1 := strconv.FormatInt(offset+1, 10)
			if v0 := this.Get(idx0); v0 == nil || goja.IsUndefined(v0) {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength-2, offset)))
			}
			if v1 := this.Get(idx1); v1 == nil || goja.IsUndefined(v1) {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength-2, offset)))
			}
			// 低位写入原始参数值（可为 NaN），高位写入字节
			this.Set(idx0, valArg)
			this.Set(idx1, runtime.ToValue(uint16((value>>8)&0xFF)))
		} else {
			// Buffer/TypedArray：按字节 - 性能优化版
			// 预计算字节值和索引字符串，减少重复计算
			byte0 := runtime.ToValue(value & 0xFF)
			byte1 := runtime.ToValue((value >> 8) & 0xFF)
			
			// 使用缓存减少字符串转换开销
			offsetStr := fastFormatInt(offset)
			offset1Str := fastFormatInt(offset + 1)
			
			this.Set(offsetStr, byte0)
			this.Set(offset1Str, byte1)
		}
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

		// 🔥 性能优化：尝试使用快速路径
		if val, err := be.fastReadUint32BE(this, offset); err == nil {
			return runtime.ToValue(int64(int32(val)))
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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

		// 🔥 性能优化：尝试使用快速路径
		if val, err := be.fastReadUint32LE(this, offset); err == nil {
			return runtime.ToValue(int64(int32(val)))
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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

		// 🔥 性能优化：尝试使用快速路径
		if val, err := be.fastReadUint32BE(this, offset); err == nil {
			return runtime.ToValue(int64(val))
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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

		// 🔥 性能优化：尝试使用快速路径
		if val, err := be.fastReadUint32LE(this, offset); err == nil {
			return runtime.ToValue(int64(val))
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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
		
		// 获取原始值并检查范围（Node.js 行为）
		var value int32
		if len(call.Arguments) < 1 || goja.IsUndefined(call.Arguments[0]) {
			// undefined 转为 0
			value = 0
		} else {
			// 使用严格检查（支持 Infinity/NaN 检测）
			rawValue := checkIntRangeStrict(runtime, call.Arguments[0], math.MinInt32, math.MaxInt32, "value")
			value = int32(rawValue)
		}

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeInt32BE")
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+4 > bufferLength {
			if offset < 0 {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-4, offset)))
			} else {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-4, offset)))
			}
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
		
		// 获取原始值并检查范围（Node.js 行为）
		var value int32
		if len(call.Arguments) < 1 || goja.IsUndefined(call.Arguments[0]) {
			// undefined 转为 0
			value = 0
		} else {
			// 使用严格检查（支持 Infinity/NaN 检测）
			rawValue := checkIntRangeStrict(runtime, call.Arguments[0], math.MinInt32, math.MaxInt32, "value")
			value = int32(rawValue)
		}

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeInt32LE")
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset < 0 || offset+4 > bufferLength {
			if offset < 0 {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-4, offset)))
			} else {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 and <= %d. Received %d", bufferLength-4, offset)))
			}
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
		
		// value 参数：缺失时默认为 0
		var valueArg goja.Value
		if len(call.Arguments) >= 1 {
			valueArg = call.Arguments[0]
		} else {
			valueArg = runtime.ToValue(0)
		}
		
		// offset 参数：缺失时默认为 0
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeUInt32BE")
		}

		// 使用严格范围校验（处理 Infinity/-Infinity）
		value := checkIntRangeStrict(runtime, valueArg, 0, math.MaxUint32, "value")

		// 检查边界（使用统一的 checkBounds）
		checkBounds(runtime, this, offset, 4, "writeUInt32BE")

		// 写入大端32位无符号整数 - 原始版本（实测最优）
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
		
		// value 参数：缺失时默认为 0
		var valueArg goja.Value
		if len(call.Arguments) >= 1 {
			valueArg = call.Arguments[0]
		} else {
			valueArg = runtime.ToValue(0)
		}
		
		// offset 参数：缺失时默认为 0
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeUInt32LE")
		}

		// 使用严格范围校验（处理 Infinity/-Infinity）
		value := checkIntRangeStrict(runtime, valueArg, 0, math.MaxUint32, "value")

		// 检查边界（使用统一的 checkBounds）
		checkBounds(runtime, this, offset, 4, "writeUInt32LE")

		// 写入小端32位无符号整数 - 性能优化版
		// 预计算字节值和索引字符串，减少重复计算
		byte0 := runtime.ToValue(value & 0xFF)
		byte1 := runtime.ToValue((value >> 8) & 0xFF)
		byte2 := runtime.ToValue((value >> 16) & 0xFF)
		byte3 := runtime.ToValue((value >> 24) & 0xFF)
		
		// 批量设置，使用缓存减少字符串转换开销
		offsetStr := fastFormatInt(offset)
		offset1Str := fastFormatInt(offset + 1)
		offset2Str := fastFormatInt(offset + 2)
		offset3Str := fastFormatInt(offset + 3)
		
		this.Set(offsetStr, byte0)
		this.Set(offset1Str, byte1)
		this.Set(offset2Str, byte2)
		this.Set(offset3Str, byte3)
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

		// 🔥 性能优化：尝试使用快速路径
		if value, err := be.fastReadFloat32BE(this, offset); err == nil {
			return runtime.ToValue(float64(value))
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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

		// 🔥 性能优化：尝试使用快速路径
		if value, err := be.fastReadFloat32LE(this, offset); err == nil {
			return runtime.ToValue(float64(value))
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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

		// 🔥 性能优化：尝试使用快速路径
		if value, err := be.fastReadFloat64BE(this, offset); err == nil {
			return runtime.ToValue(value)
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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

		// 🔥 性能优化：尝试使用快速路径
		if value, err := be.fastReadFloat64LE(this, offset); err == nil {
			return runtime.ToValue(value)
		}

		// 降级到兼容路径（用于类 Buffer 对象）
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
		value := float32(getValueArgument(call).ToFloat())
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeFloatBE")
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
		value := float32(getValueArgument(call).ToFloat())
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeFloatLE")
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
		value := getValueArgument(call).ToFloat()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeDoubleBE")
		}

		// 检查边界
		checkBounds(runtime, this, offset, 8, "writeDoubleBE")

		// 🔥 性能优化：直接使用快速路径
		if err := be.fastWriteFloat64BE(this, offset, value); err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("writeDoubleBE failed: %v", err)))
		}
		return runtime.ToValue(offset + 8)
	}
	writeDoubleBEValue := runtime.ToValue(writeDoubleBEFunc)
	setFunctionNameAndLength(runtime, writeDoubleBEValue, "writeDoubleBackwards", 1)
	prototype.Set("writeDoubleBE", writeDoubleBEValue)

	// writeDoubleLE
	writeDoubleLEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeDoubleLE")
		value := getValueArgument(call).ToFloat()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeDoubleLE")
		}

		// 检查边界
		checkBounds(runtime, this, offset, 8, "writeDoubleLE")

		// 🔥 性能优化：直接使用快速路径
		if err := be.fastWriteFloat64LE(this, offset, value); err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("writeDoubleLE failed: %v", err)))
		}
		return runtime.ToValue(offset + 8)
	}
	writeDoubleLEValue := runtime.ToValue(writeDoubleLEFunc)
	setFunctionNameAndLength(runtime, writeDoubleLEValue, "writeDoubleForwards", 1)
	prototype.Set("writeDoubleLE", writeDoubleLEValue)
}
