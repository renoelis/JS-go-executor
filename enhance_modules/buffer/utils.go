package buffer

import (
	"errors"
	"fmt"
	"math"
	"math/big"
	"strconv"
	"strings"

	"github.com/dop251/goja"
)

// valueToUint8 converts a goja.Value to uint8 according to ECMAScript specification
// This handles NaN, Infinity, and other edge cases correctly
func valueToUint8(v goja.Value) uint8 {
	// First convert to number
	num := v.ToNumber()

	// Get float representation to check for special values
	f := num.ToFloat()

	// According to ECMAScript spec: NaN, ±Infinity, ±0 all return 0
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return 0
	}

	// For normal values, use ToInteger which handles the conversion properly
	// ToInteger truncates towards zero
	i := num.ToInteger()

	// Apply modulo 256 with proper handling of negative values
	mod := i % (Uint8Max + 1)
	if mod < 0 {
		mod += (Uint8Max + 1)
	}

	return uint8(mod)
}

// safeGetThis 安全地获取 this 对象，如果失败则 panic
func safeGetThis(runtime *goja.Runtime, call goja.FunctionCall) *goja.Object {
	this := call.This.ToObject(runtime)
	if this == nil {
		panic(runtime.NewTypeError("无法读取 null 或 undefined 的属性"))
	}
	return this
}

// safeGetBufferThis 安全地获取 Buffer/TypedArray this 对象
// 验证对象是否是真正的 Buffer、TypedArray 或数组，对齐 Node.js 行为
func safeGetBufferThis(runtime *goja.Runtime, call goja.FunctionCall, methodName string) *goja.Object {
	// 先检查是否是字符串（在 ToObject 之前，因为 ToObject 会将字符串包装成对象）
	if exported := call.This.Export(); exported != nil {
		if _, ok := exported.(string); ok {
			// 字符串不允许调用 Buffer 方法
			panic(newRangeError(runtime, "The value of \"offset\" is out of range. It must be >= 0 && <= 0. Received 0"))
		}
	}

	this := call.This.ToObject(runtime)
	if this == nil {
		panic(runtime.NewTypeError("无法读取 null 或 undefined 的属性"))
	}

	// Node.js 允许以下类型调用 Buffer 方法：
	// 1. Buffer 本身
	// 2. TypedArray（Uint8Array 等）
	// 3. 普通数组
	// 4. 类数组对象（有 length 属性和数字索引）
	// 但不允许：
	// 1. 只有 length 但没有数字索引的对象（如 { length: 8 }）
	// 2. 字符串（会导致 BigInt 转换错误）

	// 检查是否是 Buffer 或 TypedArray
	if isBufferOrTypedArray(runtime, this) {
		return this
	}

	// 检查是否是数组（通过检查是否有 Array.isArray）
	if exported := this.Export(); exported != nil {
		// 检查是否是 []interface{} 类型（数组）
		if _, ok := exported.([]interface{}); ok {
			return this
		}
	}

	// 检查是否是类数组对象（有 length 属性和数字索引）
	// Node.js 允许在真正的类数组对象上调用 Buffer 方法
	lengthVal := this.Get("length")
	if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
		length := lengthVal.ToInteger()
		// 检查是否有数字索引属性（至少检查第一个）
		// 如果有 length 但没有数字索引，会在后续读取时自然失败
		if length > 0 {
			// 检查是否有索引 0
			val0 := this.Get("0")
			if val0 != nil && !goja.IsUndefined(val0) {
				// 有数字索引，认为是类数组对象
				return this
			}
		} else if length == 0 {
			// length 为 0 的对象也允许（虽然会在边界检查时失败）
			return this
		}
	}

	// 对于普通对象、字符串等，Node.js 会抛出 RangeError
	// 模拟 Node.js 的错误消息
	panic(newRangeError(runtime, "The value of \"offset\" is out of range. It must be >= 0 && <= 0. Received 0"))
}

// getBufferByte 是一个辅助函数，用于从Buffer中读取字节
func (be *BufferEnhancer) getBufferByte(buffer *goja.Object, offset int64) uint8 {
	if buffer == nil {
		return 0
	}
	val := buffer.Get(strconv.FormatInt(offset, 10))
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return 0
	}
	return uint8(val.ToInteger() & ByteMask)
}

// exportBufferBytesFast 快速导出 Buffer/Uint8Array 数据到 Go []byte
// 🔥 性能优化：对于大 Buffer，使用批量导出避免逐字节访问
// 支持 Buffer 和 Uint8Array（包括带 byteOffset 的 Uint8Array）
func (be *BufferEnhancer) exportBufferBytesFast(runtime *goja.Runtime, obj *goja.Object, length int64) []byte {
	if obj == nil || length <= 0 {
		return []byte{}
	}

	// 1. 尝试通过 Export() 直接获取 []byte（最快路径）
	if exported := obj.Export(); exported != nil {
		// 检查是否是 goja.ArrayBuffer
		if arrayBuffer, ok := exported.(goja.ArrayBuffer); ok {
			allBytes := arrayBuffer.Bytes()
			// 检查是否有 byteOffset
			byteOffset := int64(0)
			if offsetVal := obj.Get("byteOffset"); offsetVal != nil && !goja.IsUndefined(offsetVal) {
				byteOffset = offsetVal.ToInteger()
			}
			// 🔥 修复：使用传入的 length 参数作为实际要读取的字节数
			// length 参数来自对象的 .length 属性，代表 TypedArray 的元素个数
			// 对于 Uint8Array，length == byteLength
			actualLength := length

			// 边界检查
			if byteOffset < 0 || byteOffset > int64(len(allBytes)) {
				return nil
			}
			end := byteOffset + actualLength
			if end > int64(len(allBytes)) {
				end = int64(len(allBytes))
			}
			if byteOffset >= end {
				return []byte{}
			}
			// 🔥 安全性：必须复制数据！
			// JavaScript ArrayBuffer 的内存可能被 JS GC 移动/释放
			// 如果返回切片引用，后续 string(data) 可能访问无效内存导致段错误
			result := make([]byte, end-byteOffset)
			copy(result, allBytes[byteOffset:end])
			return result
		}
		// 检查是否已经是 []byte
		if byteArray, ok := exported.([]byte); ok {
			return byteArray
		}
	}

	// 2. 尝试通过 buffer 属性获取 ArrayBuffer（Uint8Array 路径）
	if bufferVal := obj.Get("buffer"); bufferVal != nil && !goja.IsUndefined(bufferVal) {
		if bufferObj := bufferVal.ToObject(runtime); bufferObj != nil {
			if exported := bufferObj.Export(); exported != nil {
				if arrayBuffer, ok := exported.(goja.ArrayBuffer); ok {
					allBytes := arrayBuffer.Bytes()
					byteOffset := int64(0)
					if offsetVal := obj.Get("byteOffset"); offsetVal != nil && !goja.IsUndefined(offsetVal) {
						byteOffset = offsetVal.ToInteger()
					}
					// 🔥 修复：使用传入的 length 参数作为实际要读取的字节数
					actualLength := length

					// 边界检查
					if byteOffset < 0 || byteOffset > int64(len(allBytes)) {
						return nil
					}
					end := byteOffset + actualLength
					if end > int64(len(allBytes)) {
						end = int64(len(allBytes))
					}
					if byteOffset >= end {
						return []byte{}
					}
					// 🔥 安全性：必须复制数据！
					// JavaScript ArrayBuffer 的内存可能被 JS GC 移动/释放
					result := make([]byte, end-byteOffset)
					copy(result, allBytes[byteOffset:end])
					return result
				}
			}
		}
	}

	// 3. 回退到逐字节读取（最慢但最通用）
	// 🔥 性能优化：使用 strconv.Itoa 代替 strconv.FormatInt（对于小索引更快）
	result := make([]byte, length)
	for i := int64(0); i < length; i++ {
		var idxStr string
		if i < 256 {
			// 使用缓存的索引字符串
			idxStr = getIndexString(i)
		} else {
			// 对于大索引，使用 strconv.Itoa（比 FormatInt 稍快）
			idxStr = strconv.Itoa(int(i))
		}
		if val := obj.Get(idxStr); val != nil && !goja.IsUndefined(val) {
			result[i] = byte(val.ToInteger() & 0xFF)
		}
	}
	return result
}

// exportBufferRange 导出 Buffer 的指定范围到 Go []byte
// 这是一个通用的辅助函数，用于性能优化
// 参数:
//   - runtime: goja 运行时
//   - obj: Buffer 或 Uint8Array 对象
//   - start: 起始位置
//   - end: 结束位置（不包含）
//
// 返回:
//   - []byte: 导出的字节数据，如果失败返回 nil
func (be *BufferEnhancer) exportBufferRange(runtime *goja.Runtime, obj *goja.Object, start, end int64) []byte {
	if obj == nil || start < 0 || end <= start {
		return nil
	}

	length := end - start
	if length <= 0 {
		return []byte{}
	}

	// 导出整个 Buffer（到 end 位置）
	allBytes := be.exportBufferBytesFast(runtime, obj, end)
	if allBytes == nil || int64(len(allBytes)) < end {
		return nil
	}

	// 🔥 安全修复：必须复制数据，避免切片共享底层数组
	result := make([]byte, length)
	copy(result, allBytes[start:end])
	return result
}

// extractBufferDataSafe 安全地提取 Buffer 数据（强制复制，避免切片共享）
// 这是 toString 优化方案的核心：双重复制保证内存安全
// 🔥 关键：即使 exportBufferBytesFast 已复制，切片操作仍会共享底层数组，必须再次复制
func (be *BufferEnhancer) extractBufferDataSafe(runtime *goja.Runtime, obj *goja.Object, start, end, bufferLength int64) []byte {
	dataLen := end - start
	if dataLen <= 0 {
		return []byte{}
	}

	// 快速路径：批量导出 + 安全复制
	if shouldUseFastPath(bufferLength) {
		bufferBytes := be.exportBufferBytesFast(runtime, obj, bufferLength)
		if bufferBytes != nil && int64(len(bufferBytes)) >= bufferLength {
			// 🔥 关键：必须复制，不能直接切片
			result := make([]byte, dataLen)
			copy(result, bufferBytes[start:end])
			return result
		}
	}

	// 降级方案：逐字节获取
	result := make([]byte, dataLen)
	for i := start; i < end; i++ {
		if val := obj.Get(getIndexString(i)); val != nil && !goja.IsUndefined(val) {
			if byteVal := val.ToInteger(); byteVal >= 0 {
				result[i-start] = byte(byteVal & 0xFF)
			}
		}
	}
	return result
}

// shouldUseFastPath 检查是否应该使用快速路径（批量操作）
// 阈值: 50 字节（降低阈值以提升迭代器性能）
// 🔥 性能优化：由于已经避免了数据复制，可以大幅降低阈值
func shouldUseFastPath(dataLength int64) bool {
	const threshold = 50 // 50 字节（之前是 256）
	return dataLength >= threshold
}

// reverseBytesInPlace 反转 Go []byte 数组（原地操作）
// 用于 Buffer.prototype.reverse 的性能优化
func reverseBytesInPlace(data []byte) {
	length := len(data)
	for i := 0; i < length/2; i++ {
		j := length - 1 - i
		data[i], data[j] = data[j], data[i]
	}
}

// swapBytesInPlace 在 Go []byte 中交换字节（原地操作）
// swapSize: 2 (swap16), 4 (swap32), 8 (swap64)
func swapBytesInPlace(data []byte, swapSize int) {
	if len(data)%swapSize != 0 {
		return // 应该已经在调用前检查过
	}

	switch swapSize {
	case 2:
		// swap16: [a, b] -> [b, a]
		for i := 0; i < len(data); i += 2 {
			data[i], data[i+1] = data[i+1], data[i]
		}
	case 4:
		// swap32: [a, b, c, d] -> [d, c, b, a]
		for i := 0; i < len(data); i += 4 {
			data[i], data[i+3] = data[i+3], data[i]
			data[i+1], data[i+2] = data[i+2], data[i+1]
		}
	case 8:
		// swap64: [a, b, c, d, e, f, g, h] -> [h, g, f, e, d, c, b, a]
		for i := 0; i < len(data); i += 8 {
			data[i], data[i+7] = data[i+7], data[i]
			data[i+1], data[i+6] = data[i+6], data[i+1]
			data[i+2], data[i+5] = data[i+5], data[i+2]
			data[i+3], data[i+4] = data[i+4], data[i+3]
		}
	}
}

// swapElementsInPlace 在TypedArray中交换元素块（原地操作）
// 对于TypedArray，length表示元素个数，需要按元素交换而不是字节对交换
// elementSize: 元素大小（字节数），elementCount: 元素个数
func swapElementsInPlace(data []byte, elementSize int, elementCount int) {
	if elementCount <= 1 || len(data) < elementSize*elementCount {
		return
	}

	// 交换元素：把第i个元素和第(elementCount-1-i)个元素交换
	temp := make([]byte, elementSize)
	for i := 0; i < elementCount/2; i++ {
		leftStart := i * elementSize
		rightStart := (elementCount - 1 - i) * elementSize

		// 交换两个元素
		copy(temp, data[leftStart:leftStart+elementSize])
		copy(data[leftStart:leftStart+elementSize], data[rightStart:rightStart+elementSize])
		copy(data[rightStart:rightStart+elementSize], temp)
	}
}

// checkIntRange 检查整数是否在指定范围内（Node.js 行为）
func checkIntRange(runtime *goja.Runtime, value int64, min int64, max int64, valueName string) {
	if value < min || value > max {
		panic(runtime.NewTypeError("\"" + valueName + "\" 的值超出范围。必须 >= " +
			strconv.FormatInt(min, 10) + " 且 <= " + strconv.FormatInt(max, 10) + "。接收到 " +
			strconv.FormatInt(value, 10)))
	}
}

// checkIntRangeStrict 严格检查整数范围（在截断前检查浮点数，对齐 Node.js 行为）
// Node.js 的逻辑：先检查浮点数是否在范围内，如果在范围内则截断为整数，否则抛出错误
// 返回值：int64 类型的整数值
func checkIntRangeStrict(runtime *goja.Runtime, val goja.Value, min int64, max int64, valueName string) int64 {
	// 获取浮点数值
	floatVal := val.ToFloat()

	// 检查 NaN - NaN 写入 0（Node.js 行为）
	if math.IsNaN(floatVal) {
		return 0
	}

	// 检查 Infinity
	if math.IsInf(floatVal, 1) {
		panic(newRangeError(runtime, "The value of \""+valueName+"\" is out of range. It must be >= "+
			strconv.FormatInt(min, 10)+" and <= "+strconv.FormatInt(max, 10)+". Received Infinity"))
	}

	// 检查 -Infinity
	if math.IsInf(floatVal, -1) {
		panic(newRangeError(runtime, "The value of \""+valueName+"\" is out of range. It must be >= "+
			strconv.FormatInt(min, 10)+" and <= "+strconv.FormatInt(max, 10)+". Received -Infinity"))
	}

	// 检查浮点数范围（不截断）
	// Node.js 先检查原始浮点数是否在范围内
	if floatVal < float64(min) || floatVal > float64(max) {
		// 格式化错误信息中的浮点数
		// 如果浮点数是整数，不显示小数点
		valueStr := strconv.FormatFloat(floatVal, 'f', -1, 64)
		panic(newRangeError(runtime, "The value of \""+valueName+"\" is out of range. It must be >= "+
			strconv.FormatInt(min, 10)+" and <= "+strconv.FormatInt(max, 10)+". Received "+valueStr))
	}

	// 在范围内，截断为整数
	intVal := val.ToInteger()

	return intVal
}

// newRangeError 创建一个 RangeError，对齐 Node.js 的错误格式
func newRangeError(runtime *goja.Runtime, message string) *goja.Object {
	// 使用 JS 的 RangeError 构造函数创建真正的 RangeError 实例
	rangeErrorCtor := runtime.Get("RangeError")
	if rangeErrorCtor != nil && !goja.IsUndefined(rangeErrorCtor) && !goja.IsNull(rangeErrorCtor) {
		if ctor, ok := goja.AssertConstructor(rangeErrorCtor); ok {
			errObj, err := ctor(nil, runtime.ToValue(message))
			if err == nil && errObj != nil {
				if obj := errObj.ToObject(runtime); obj != nil {
					obj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
					return obj
				}
			}
		}
	}
	// 回退：使用 Go error
	errObj := runtime.NewGoError(errors.New(message))
	errObj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
	errObj.Set("name", runtime.ToValue("RangeError"))
	return errObj
}

// validateSafeIntegerArg 验证参数是否为安全整数（高性能版本，使用 Go 原生类型检查）
// 返回值：如果有效返回 int64，否则 panic
// 此函数替代 runtime.RunString() 调用，性能更好
func validateSafeIntegerArg(runtime *goja.Runtime, arg goja.Value, argName string) int64 {
	// 1. 检查 null/undefined
	if goja.IsNull(arg) {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number", argName)))
	}
	if goja.IsUndefined(arg) {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number", argName)))
	}

	// 2. 检查类型 - 使用 ExportType() 快速检查
	exportType := arg.ExportType()
	if exportType == nil {
		// 无法确定类型，可能是对象，需要更深入检查
		// 但为了性能，我们先尝试转换为数字
		argStr := arg.String()
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received %s", argName, argStr)))
	}

	// 3. 获取导出值进行类型检查
	exported := arg.Export()
	if exported == nil {
		argStr := arg.String()
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received %s", argName, argStr)))
	}

	// 4. 处理不同类型的数字
	var floatVal float64
	var intVal int64

	switch v := exported.(type) {
	case int:
		intVal = int64(v)
		floatVal = float64(v)
	case int8:
		intVal = int64(v)
		floatVal = float64(v)
	case int16:
		intVal = int64(v)
		floatVal = float64(v)
	case int32:
		intVal = int64(v)
		floatVal = float64(v)
	case int64:
		intVal = v
		floatVal = float64(v)
	case uint:
		intVal = int64(v)
		floatVal = float64(v)
	case uint8:
		intVal = int64(v)
		floatVal = float64(v)
	case uint16:
		intVal = int64(v)
		floatVal = float64(v)
	case uint32:
		intVal = int64(v)
		floatVal = float64(v)
	case uint64:
		// uint64 可能超出 int64 范围
		if v > math.MaxInt64 {
			panic(newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be >= 0 && <= %d. Received %d", argName, MaxSafeInteger, v)))
		}
		intVal = int64(v)
		floatVal = float64(v)
	case float32:
		floatVal = float64(v)
		// 对于 float 类型，intVal 会在后面根据 floatVal 计算
	case float64:
		floatVal = v
		// 对于 float 类型，intVal 会在后面根据 floatVal 计算
	default:
		// 不是数字类型
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number", argName)))
	}

	// 5. 检查特殊值：NaN, Infinity
	if math.IsNaN(floatVal) {
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received NaN", argName)))
	}
	if math.IsInf(floatVal, 0) {
		infStr := "Infinity"
		if math.IsInf(floatVal, -1) {
			infStr = "-Infinity"
		}
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received %s", argName, infStr)))
	}

	// 6. 检查是否为整数（浮点数检查）
	// 使用精确比较：f != float64(int64(f)) 来检查是否为整数
	// 注意：对于已经在 switch 中设置了 intVal 的整数类型，floatVal == float64(intVal) 应该为 true
	if floatVal != float64(int64(floatVal)) {
		argStr := arg.String()
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received %s", argName, argStr)))
	}

	// 7. 转换为 int64（此时 floatVal 应该是整数）
	// 对于已经在 switch 中设置了 intVal 的整数类型，这里不会改变值
	// 对于 float 类型，这里会进行转换
	intVal = int64(floatVal)

	// 8. 检查是否为安全整数（>= 0 && <= MAX_SAFE_INTEGER）
	// MAX_SAFE_INTEGER 使用全局常量
	// 	const maxSafeInteger = MaxSafeInteger // 已移至 constants.go
	if intVal < 0 || intVal > MaxSafeInteger {
		argStr := arg.String()
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be >= 0 && <= %d. Received %s", argName, MaxSafeInteger, argStr)))
	}

	return intVal
}

// newBufferOutOfBoundsError 创建一个 Buffer 越界错误，对齐 Node.js 的错误格式
func newBufferOutOfBoundsError(runtime *goja.Runtime) *goja.Object {
	errObj := runtime.NewGoError(errors.New("Attempt to access memory outside buffer bounds"))
	errObj.Set("code", runtime.ToValue("ERR_BUFFER_OUT_OF_BOUNDS"))
	errObj.Set("name", runtime.ToValue("RangeError"))
	return errObj
}

// validateOffset 验证 offset 参数类型和值（对齐 Node.js v25 行为）
// 注意：此函数不接受 undefined，适用于必需的 offset 参数（如 readIntBE）
func validateOffset(runtime *goja.Runtime, val goja.Value, methodName string) int64 {
	// 首先检查是否是 Symbol（在Export之前检查，因为Symbol.Export()返回字符串）
	// 使用类型断言直接检查 val 的类型
	switch val.(type) {
	case *goja.Symbol:
		// Symbol 类型，获取字符串表示
		symStr := val.String()
		errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received type symbol (" + symStr + ")")
		errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
		panic(errObj)
	}

	// 检查类型（必须在转换之前）
	exported := val.Export()

	// 检查是否是字符串类型
	if str, ok := exported.(string); ok {
		errObj := runtime.NewTypeError(fmt.Sprintf("The \"offset\" argument must be of type number. Received type string ('%s')", str))
		errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
		panic(errObj)
	}

	// 检查是否是布尔值类型
	if _, ok := exported.(bool); ok {
		errObj := runtime.NewTypeError(fmt.Sprintf("The \"offset\" argument must be of type number. Received type boolean (%v)", exported))
		errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
		panic(errObj)
	}

	// 检查是否是 null
	if goja.IsNull(val) {
		errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received null")
		errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
		panic(errObj)
	}

	// 检查是否是 BigInt
	// 在 goja 中，BigInt 的 typeof 会返回 "bigint"
	// 我们可以通过 runtime.RunString 来检查类型
	typeofResult, err := runtime.RunString("(function(v) { return typeof v; })")
	if err == nil {
		if typeofFunc, ok := goja.AssertFunction(typeofResult); ok {
			typeResult, err := typeofFunc(goja.Undefined(), val)
			if err == nil && typeResult != nil {
				typeStr := typeResult.String()
				if typeStr == "bigint" {
					// 获取 BigInt 的字符串表示（如 "1n"）
					valStr := val.String()
					errObj := runtime.NewTypeError(fmt.Sprintf("The \"offset\" argument must be of type number. Received type bigint (%s)", valStr))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
					panic(errObj)
				}
			}
		}
	}

	// 检查 Number/String/Boolean 对象包装器
	// 原理：Object.is(primitive, primitive) → true
	//      Object.is(new Number(0), new Number(0).valueOf()) → false
	// 检测包装器对象（Number、String、Boolean 对象）
	// 在 goja 中，原始值（如数字 42）和包装器对象（如 new Number(42)）的类型不同
	// 原始值会被 exported 为 Go 原生类型（int64, float64, string, bool）
	// 包装器对象则是 *goja.Object 类型

	// 如果 exported 是数字类型（int64/float64等），说明是原始值，不是包装器
	// 如果 val 是 *goja.Object 且不是特殊对象（Date、RegExp等），需要检查是否是包装器
	if objVal, isObj := val.(*goja.Object); isObj {
		// 是对象类型，检查 constructor.name
		if ctorProp := objVal.Get("constructor"); ctorProp != nil && !goja.IsUndefined(ctorProp) {
			if ctorObj := ctorProp.ToObject(runtime); ctorObj != nil {
				if nameProp := ctorObj.Get("name"); nameProp != nil && !goja.IsUndefined(nameProp) {
					ctorName := nameProp.String()
					switch ctorName {
					case "Number":
						// Number 包装器对象
						errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of Number")
						errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
						panic(errObj)
					case "String":
						// String 包装器对象
						errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of String")
						errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
						panic(errObj)
					case "Boolean":
						// Boolean 包装器对象
						errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received type boolean")
						errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
						panic(errObj)
					}
				}
			}
		}
	}

	// 继续检查其他对象类型
	if obj := val.ToObject(runtime); obj != nil {
		if !goja.IsUndefined(obj) && obj != nil {
			// 检查是否是 Date 对象
			if className := obj.Get("constructor"); className != nil {
				if nameObj := className.ToObject(runtime); nameObj != nil {
					if name := nameObj.Get("name"); name != nil {
						constructorName := name.String()
						switch constructorName {
						case "Date":
							errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of Date")
							errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
							panic(errObj)
						case "Map":
							errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of Map")
							errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
							panic(errObj)
						case "Set":
							errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of Set")
							errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
							panic(errObj)
						case "Promise":
							errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of Promise")
							errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
							panic(errObj)
						case "ArrayBuffer":
							errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of ArrayBuffer")
							errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
							panic(errObj)
						case "Uint8Array", "Uint16Array", "Uint32Array", "Int8Array", "Int16Array", "Int32Array", "Float32Array", "Float64Array":
							errObj := runtime.NewTypeError(fmt.Sprintf("The \"offset\" argument must be of type number. Received an instance of %s", constructorName))
							errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
							panic(errObj)
						case "RegExp":
							// RegExp 应该抛出 TypeError
							errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of RegExp")
							errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
							panic(errObj)
						case "Function":
							// Function 应该抛出 TypeError
							errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received type function")
							errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
							panic(errObj)
						case "Object":
							// 普通对象（包括带 valueOf/toString 的对象）
							errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of Object")
							errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
							panic(errObj)
						}

						// 检查是否是 Buffer（Buffer 的 constructor.name 可能是特殊的）
						// 在 goja_nodejs 中，Buffer 的 constructor.name 可能不是 "Buffer"，需要额外检查
						if obj.Get("BYTES_PER_ELEMENT") != nil || obj.Get("buffer") != nil {
							// 可能是 TypedArray 或 Buffer
							if obj.Get("length") != nil {
								errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of Buffer")
								errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
								panic(errObj)
							}
						}
					}
				}
			}
		}
	}

	if exported != nil {
		switch exported.(type) {
		case int64, float64, int, int32, uint32, uint64:
			// 这些是有效的数字类型，继续处理
		case []interface{}, map[string]interface{}:
			// 数组或对象
			errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of Array")
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			panic(errObj)
		}
	}

	// 获取浮点数值
	floatVal := val.ToFloat()

	// 检查 NaN
	if math.IsNaN(floatVal) {
		panic(newRangeError(runtime, "The value of \"offset\" is out of range. It must be an integer. Received NaN"))
	}

	// 检查 Infinity
	if math.IsInf(floatVal, 0) {
		panic(newRangeError(runtime, "The value of \"offset\" is out of range. It must be an integer. Received Infinity"))
	}

	// 转换为整数
	offset := val.ToInteger()

	// 检查是否是整数（不是浮点数）
	if float64(offset) != floatVal {
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be an integer. Received %v", floatVal)))
	}

	return offset
}

// validateOptionalOffset 验证可选的 offset 参数（对齐 Node.js v25 行为）
// 当 offset 为 undefined 时返回 0，适用于可选的 offset 参数（如 write 方法）
func validateOptionalOffset(runtime *goja.Runtime, val goja.Value, methodName string) int64 {
	// 处理 undefined：默认为 0
	if goja.IsUndefined(val) {
		return 0
	}

	// 其他情况调用标准的 validateOffset
	return validateOffset(runtime, val, methodName)
}

// validateByteLength 验证 byteLength 参数类型和值（对齐 Node.js v25 行为）
func validateByteLength(runtime *goja.Runtime, val goja.Value, min, max int64, methodName string) int64 {
	// 首先检查是否是 undefined 或 null
	if goja.IsUndefined(val) || goja.IsNull(val) {
		errObj := runtime.NewTypeError("The \"byteLength\" argument must be of type number. Received undefined")
		errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
		panic(errObj)
	}

	// 检查是否是字符串类型
	exported := val.Export()
	if str, ok := exported.(string); ok {
		errObj := runtime.NewTypeError(fmt.Sprintf("The \"byteLength\" argument must be of type number. Received type string ('%s')", str))
		errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
		panic(errObj)
	}

	// 检查是否是布尔类型
	if _, ok := exported.(bool); ok {
		errObj := runtime.NewTypeError("The \"byteLength\" argument must be of type number. Received type boolean")
		errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
		panic(errObj)
	}

	// 检查是否是对象类型（包括数组、普通对象等，但排除 null 和 undefined）
	if exported != nil {
		// 检查是否是数组
		if _, isArray := exported.([]interface{}); isArray {
			errObj := runtime.NewTypeError("The \"byteLength\" argument must be of type number. Received an instance of Array")
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			panic(errObj)
		}
		// 检查是否是普通对象
		if _, isMap := exported.(map[string]interface{}); isMap {
			errObj := runtime.NewTypeError("The \"byteLength\" argument must be of type number. Received an instance of Object")
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			panic(errObj)
		}
	}

	// 获取浮点数值
	floatVal := val.ToFloat()

	// 检查 NaN
	if math.IsNaN(floatVal) {
		panic(newRangeError(runtime, "The value of \"byteLength\" is out of range. It must be >= "+strconv.FormatInt(min, 10)+" and <= "+strconv.FormatInt(max, 10)+". Received NaN"))
	}

	// 检查 Infinity
	if math.IsInf(floatVal, 0) {
		panic(newRangeError(runtime, "The value of \"byteLength\" is out of range. It must be >= "+strconv.FormatInt(min, 10)+" and <= "+strconv.FormatInt(max, 10)+". Received Infinity"))
	}

	// 转换为整数
	byteLength := val.ToInteger()

	// 检查是否是整数（不是浮点数）
	if float64(byteLength) != floatVal {
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"byteLength\" is out of range. It must be an integer. Received %v", floatVal)))
	}

	// 检查范围
	if byteLength < min || byteLength > max {
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"byteLength\" is out of range. It must be >= %d and <= %d. Received %d", min, max, byteLength)))
	}

	return byteLength
}

// checkReadBounds 检查读取边界并返回 buffer length（为了向后兼容保留此函数名）
func checkReadBounds(runtime *goja.Runtime, this *goja.Object, offset, byteSize int64, methodName string) int64 {
	return checkBounds(runtime, this, offset, byteSize, methodName)
}

// checkBounds 检查读写操作的边界并返回 buffer length
// 适用于所有 Buffer 读写方法（read*/write*）
func checkBounds(runtime *goja.Runtime, this *goja.Object, offset, byteSize int64, methodName string) int64 {
	if this == nil {
		panic(runtime.NewTypeError("方法 " + methodName + " 在不兼容的接收器上调用"))
	}

	bufferLength := int64(0)
	if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
		bufferLength = lengthVal.ToInteger()
	}

	// 检查 Buffer 长度是否足够
	// 如果 Buffer 长度小于需要操作的字节数，抛出 ERR_BUFFER_OUT_OF_BOUNDS
	if bufferLength < byteSize {
		panic(newBufferOutOfBoundsError(runtime))
	}

	// 检查 offset 是否在有效范围内
	if offset < 0 || offset+byteSize > bufferLength {
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength-byteSize, offset)))
	}

	return bufferLength
}

// addSymbolIterator 为迭代器添加 Symbol.iterator 支持（如果可用）
// 使用 goja 原生 Symbol API，性能最优
func addSymbolIterator(runtime *goja.Runtime, iterator *goja.Object) {
	// 获取 Symbol.iterator
	symbolObj := runtime.Get("Symbol")
	if goja.IsUndefined(symbolObj) {
		return
	}

	symbol := symbolObj.ToObject(runtime)
	if symbol == nil {
		return
	}

	iteratorSym := symbol.Get("iterator")
	if goja.IsUndefined(iteratorSym) {
		return
	}

	// 直接类型断言为 *goja.Symbol 并使用原生 SetSymbol API
	if sym, ok := iteratorSym.(*goja.Symbol); ok {
		// 设置 Symbol.iterator 方法，返回自身使迭代器可用于 for...of
		iterator.SetSymbol(sym, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			return iterator
		}))
	}
}

// checkIfFrozen 检查对象是否被冻结，如果是则抛出错误（对齐 Node.js 行为）
func checkIfFrozen(runtime *goja.Runtime, obj *goja.Object, methodName string) {
	if obj == nil {
		return
	}

	// 使用 Object.isFrozen() 检查
	objectCtor := runtime.Get("Object")
	if objectCtor == nil || goja.IsUndefined(objectCtor) {
		return
	}

	objectObj := objectCtor.ToObject(runtime)
	if objectObj == nil {
		return
	}

	isFrozenFunc := objectObj.Get("isFrozen")
	if isFrozenFunc == nil || goja.IsUndefined(isFrozenFunc) {
		return
	}

	if isFrozen, ok := goja.AssertFunction(isFrozenFunc); ok {
		result, err := isFrozen(objectCtor, runtime.ToValue(obj))
		if err == nil && !goja.IsUndefined(result) && !goja.IsNull(result) {
			if result.ToBoolean() {
				// 对象被冻结，抛出错误
				errObj := runtime.NewTypeError("Cannot assign to read only property '0' of object '[object Array]'")
				panic(errObj)
			}
		}
	}
}

// getTypeNameWithRuntime 获取值的类型名称，用于错误消息
func getTypeNameWithRuntime(runtime *goja.Runtime, val goja.Value) string {
	if goja.IsNull(val) {
		return "null"
	}
	if goja.IsUndefined(val) {
		return "undefined"
	}

	// 检查基本类型
	exported := val.Export()
	switch exported.(type) {
	case string:
		return "string"
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return "number"
	case bool:
		return "boolean"
	}

	obj := val.ToObject(runtime)
	if obj == nil {
		return "Object"
	}

	// 尝试获取类名
	if className := obj.ClassName(); className != "" {
		return className
	}

	return "Object"
}

// isCallableWithRuntime 检查值是否可调用（是函数）
func isCallableWithRuntime(runtime *goja.Runtime, val goja.Value) bool {
	if goja.IsUndefined(val) || goja.IsNull(val) {
		return false
	}

	// 检查是否是函数
	_, ok := goja.AssertFunction(val)
	return ok
}

// setFunctionNameAndLength 设置函数的 name 和 length 属性
// 这是一个通用工具函数，用于为 Buffer 方法设置正确的 name 和 length 属性
// 参数:
//   - runtime: goja 运行时
//   - fn: 函数（已转换为 goja.Value）
//   - name: 函数名称
//   - length: 参数个数
func setFunctionNameAndLength(runtime *goja.Runtime, fn goja.Value, name string, length int) {
	if fnObj := fn.ToObject(runtime); fnObj != nil {
		// 设置 name 属性（不可写、不可枚举、可配置）
		fnObj.DefineDataProperty("name", runtime.ToValue(name), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		// 设置 length 属性（不可写、不可枚举、可配置）
		fnObj.DefineDataProperty("length", runtime.ToValue(length), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
}

// assertNotSymbol 检查值是否为 Symbol 类型，如果是则抛出 TypeError
// 这是一个统一的 Symbol 检测工具，用于所有不支持 Symbol 的 Buffer 方法
//
// Symbol 类型在 JavaScript 中不能转换为数字或字符串（除非显式调用 toString）
// 因此在需要数字或字符串参数的 Buffer 方法中应该拒绝 Symbol
//
// 使用方式：
//
//	assertNotSymbol(runtime, value, "Cannot convert a Symbol value to a number")
//	assertNotSymbol(runtime, value, "Cannot convert a Symbol value to a string")
func assertNotSymbol(runtime *goja.Runtime, val goja.Value, errorMessage string) {
	if _, ok := val.(*goja.Symbol); ok {
		panic(runtime.NewTypeError(errorMessage))
	}
}

// isSymbol 检查值是否为 Symbol 类型（不抛出错误，仅返回布尔值）
// 用于需要条件判断的场景
func isSymbol(val goja.Value) bool {
	_, ok := val.(*goja.Symbol)
	return ok
}

// convertToUint8 将 goja.Value 安全地转换为 uint8（0-255）字节值
// 遵循 ECMAScript ToNumber 和 ToUint8 语义
// 用于 buf.set() 等需要将任意值转换为字节的场景
// 规则：
// - nil/undefined -> 0
// - Symbol -> 抛出 TypeError
// - null -> 0
// - boolean -> 0/1
// - number -> ToInteger & 0xFF
// - string -> parse number
// - object -> 尝试转换，失败则返回 0（避免循环引用问题）
func convertToUint8(runtime *goja.Runtime, val goja.Value) byte {
	// 处理 nil 或 undefined
	if val == nil || goja.IsUndefined(val) {
		return 0
	}

	// 处理 null
	if goja.IsNull(val) {
		return 0
	}

	// 检查 Symbol 类型（必须在其他转换之前）
	assertNotSymbol(runtime, val, "Cannot convert a Symbol value to a number")

	// 检查导出类型以避免循环引用问题
	exportedVal := val.Export()
	if exportedVal != nil {
		// 🔥 检查 BigInt 类型（必须在类型转换之前）
		// goja 的 BigInt 导出为 *big.Int 类型
		if _, isBigInt := exportedVal.(*big.Int); isBigInt {
			panic(runtime.NewTypeError("Cannot convert a BigInt value to a number"))
		}

		switch v := exportedVal.(type) {
		case bool:
			if v {
				return 1
			}
			return 0
		case float64:
			if math.IsNaN(v) || math.IsInf(v, 0) {
				return 0
			}
			return byte(int64(v) & 0xFF)
		case int64:
			return byte(v & 0xFF)
		case int:
			return byte(int64(v) & 0xFF)
		case uint8:
			return v
		case string:
			// 🔥 修复：统一使用 stringToUint8 处理（支持十六进制等格式）
			return stringToUint8(v)
		default:
			// 对于其他类型（对象、数组、函数等），执行 ToPrimitive 转换
			// ECMAScript 规范：优先 valueOf()，失败则 toString()
			return convertObjectToUint8(runtime, val, exportedVal)
		}
	}

	// 默认返回 0
	return 0
}

// convertObjectToUint8 处理对象到 uint8 的转换（ToPrimitive + ToNumber）
// 实现 ECMAScript 规范的 ToPrimitive(hint: number) 转换
func convertObjectToUint8(runtime *goja.Runtime, val goja.Value, exportedVal interface{}) byte {
	// 保护整个转换过程
	defer func() {
		if r := recover(); r != nil {
			// 任何 panic 都返回 0
		}
	}()

	obj := val.ToObject(runtime)
	if obj == nil {
		return 0
	}

	// 步骤 1: 尝试调用 valueOf()
	valueOfFunc := obj.Get("valueOf")
	if valueOfFunc != nil && !goja.IsUndefined(valueOfFunc) {
		if fn, ok := goja.AssertFunction(valueOfFunc); ok {
			result, err := fn(obj)
			if err == nil && result != nil {
				// 检查 valueOf 是否返回原始值（非对象）
				resultExport := result.Export()

				// 尝试转换 valueOf 的返回值
				// 如果返回的是原始值，tryConvertPrimitive 会返回 true
				// 如果返回的是对象，tryConvertPrimitive 会返回 false，我们继续尝试 toString
				if primitiveResult, ok := tryConvertPrimitive(resultExport); ok {
					return primitiveResult
				}
				// valueOf 返回了对象（非原始值），继续尝试 toString
			}
		}
	}

	// 步骤 2: valueOf 失败或返回对象本身，尝试 toString()
	toStringFunc := obj.Get("toString")
	if toStringFunc != nil && !goja.IsUndefined(toStringFunc) {
		if fn, ok := goja.AssertFunction(toStringFunc); ok {
			result, err := fn(obj)
			if err == nil && result != nil {
				// toString 应该返回字符串
				str := result.String()
				// 将字符串转为数字
				return stringToUint8(str)
			}
		}
	}

	// 都失败了，返回 0（NaN 的行为）
	return 0
}

// tryConvertPrimitive 尝试将原始值转换为 uint8
// 返回 (字节值, 是否成功)，false 表示需要继续尝试 toString
func tryConvertPrimitive(val interface{}) (byte, bool) {
	switch v := val.(type) {
	case float64:
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return 0, true
		}
		return byte(int64(v) & 0xFF), true
	case int64:
		return byte(v & 0xFF), true
	case int:
		return byte(int64(v) & 0xFF), true
	case bool:
		if v {
			return 1, true
		}
		return 0, true
	case string:
		return stringToUint8(v), true
	default:
		// 非原始值，返回 false 表示需要继续尝试 toString
		return 0, false
	}
}

// stringToUint8 将字符串转换为 uint8
func stringToUint8(str string) byte {
	// 空字符串 -> 0
	if str == "" {
		return 0
	}

	// 🔥 修复：支持 JavaScript 的数字字面量格式
	// 十六进制：0x 或 0X
	if len(str) > 2 && (str[0:2] == "0x" || str[0:2] == "0X") {
		if i, err := strconv.ParseInt(str, 0, 64); err == nil {
			return byte(i & 0xFF)
		}
		return 0
	}

	// 二进制：0b 或 0B
	if len(str) > 2 && (str[0:2] == "0b" || str[0:2] == "0B") {
		if i, err := strconv.ParseInt(str, 0, 64); err == nil {
			return byte(i & 0xFF)
		}
		return 0
	}

	// 八进制：0o 或 0O
	if len(str) > 2 && (str[0:2] == "0o" || str[0:2] == "0O") {
		if i, err := strconv.ParseInt(str, 0, 64); err == nil {
			return byte(i & 0xFF)
		}
		return 0
	}

	// 普通数字（包括浮点数和科学计数法）
	f, err := strconv.ParseFloat(str, 64)
	if err != nil {
		return 0 // 解析失败 -> NaN -> 0
	}

	if math.IsNaN(f) || math.IsInf(f, 0) {
		return 0
	}

	return byte(int64(f) & 0xFF)
}

// ========== 🔥 性能优化：快速路径辅助函数 ==========

// extractTypedArrayBytes 尝试提取 TypedArray 的底层字节数据
// 返回 (字节切片, 字节偏移, 每元素字节数, 成功标志)
func extractTypedArrayBytes(obj *goja.Object) ([]byte, int, int, bool) {
	if obj == nil {
		return nil, 0, 0, false
	}

	// 检查是否有 buffer 属性（TypedArray 特征）
	bufferVal := obj.Get("buffer")
	if bufferVal == nil || goja.IsUndefined(bufferVal) {
		return nil, 0, 0, false
	}

	// 获取 byteOffset
	byteOffsetVal := obj.Get("byteOffset")
	if byteOffsetVal == nil || goja.IsUndefined(byteOffsetVal) {
		return nil, 0, 0, false
	}
	byteOffset := int(byteOffsetVal.ToInteger())

	// 获取 byteLength
	byteLengthVal := obj.Get("byteLength")
	if byteLengthVal == nil || goja.IsUndefined(byteLengthVal) {
		return nil, 0, 0, false
	}
	byteLength := int(byteLengthVal.ToInteger())

	// 获取 BYTES_PER_ELEMENT (每个元素的字节数)
	bpeVal := obj.Get("BYTES_PER_ELEMENT")
	bytesPerElement := 1
	if bpeVal != nil && !goja.IsUndefined(bpeVal) {
		bytesPerElement = int(bpeVal.ToInteger())
	}

	// 尝试获取底层 ArrayBuffer 的数据
	// 通过反射访问 goja 内部结构
	bufferObj := bufferVal.ToObject(nil)
	if bufferObj == nil {
		return nil, 0, 0, false
	}

	// 尝试通过 Export() 获取底层数据
	// goja 的 ArrayBuffer 导出为 []byte
	exported := bufferObj.Export()
	if exported == nil {
		return nil, 0, 0, false
	}

	// 检查是否为 []byte 类型
	if bytes, ok := exported.([]byte); ok {
		// 验证边界
		if byteOffset < 0 || byteLength < 0 || byteOffset+byteLength > len(bytes) {
			return nil, 0, 0, false
		}
		return bytes[byteOffset : byteOffset+byteLength], byteOffset, bytesPerElement, true
	}

	return nil, 0, 0, false
}

// isTypedArrayOrBuffer 检查对象是否为 TypedArray 或 Buffer
func isTypedArrayOrBuffer(obj *goja.Object) bool {
	if obj == nil {
		return false
	}

	// 检查是否有 buffer 属性
	bufferVal := obj.Get("buffer")
	if bufferVal == nil || goja.IsUndefined(bufferVal) {
		return false
	}

	// 检查是否有 BYTES_PER_ELEMENT 属性（TypedArray 特征）
	bpeVal := obj.Get("BYTES_PER_ELEMENT")
	return bpeVal != nil && !goja.IsUndefined(bpeVal)
}

// getTypedArrayConstructorName 获取 TypedArray 的构造函数名称
func getTypedArrayConstructorName(obj *goja.Object) string {
	if obj == nil {
		return ""
	}

	constructorVal := obj.Get("constructor")
	if constructorVal == nil || goja.IsUndefined(constructorVal) {
		return ""
	}

	constructorObj := constructorVal.ToObject(nil)
	if constructorObj == nil {
		return ""
	}

	nameVal := constructorObj.Get("name")
	if nameVal == nil || goja.IsUndefined(nameVal) {
		return ""
	}

	return nameVal.String()
}

// isBufferOrUint8Array 严格检查对象是否是 Buffer 或 Uint8Array（不包括其他 TypedArray）
func isBufferOrUint8Array(runtime *goja.Runtime, obj *goja.Object) bool {
	if obj == nil {
		return false
	}

	// 检查是否有 length 属性
	lengthVal := obj.Get("length")
	if lengthVal == nil || goja.IsUndefined(lengthVal) {
		return false
	}

	// 优先使用 constructor.name 进行严格类型检查
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
			if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
				nameStr := name.String()

				// 检查是否是 goja_nodejs 内部 Buffer 构造函数
				if strings.Contains(nameStr, "Buffer") && strings.Contains(nameStr, "ctor") {
					return true
				}

				// 检查标准名称
				if nameStr == "Buffer" {
					return true
				}

				// 检查是否是 Uint8Array
				if nameStr == "Uint8Array" {
					// 验证确实有 TypedArray 特征
					if bytesPerElem := obj.Get("BYTES_PER_ELEMENT"); !goja.IsUndefined(bytesPerElem) {
						if bytesPerElem.ToInteger() == 1 {
							return true
						}
					}
				}

				// 其他所有类型都拒绝
				return false
			}
		}
	}

	// 如果无法获取 constructor.name，使用回退检查
	// Buffer 的特征：有 write 方法
	if writeMethod := obj.Get("write"); !goja.IsUndefined(writeMethod) {
		return true
	}

	return false
}

// getDetailedTypeError 获取详细的类型错误信息
func getDetailedTypeError(runtime *goja.Runtime, obj *goja.Object, argName string) string {
	if obj == nil {
		return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received null", argName)
	}

	// 尝试获取 constructor.name
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
			if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
				nameStr := name.String()

				// 处理 goja 内部构造函数名称
				if strings.Contains(nameStr, "Buffer") && strings.Contains(nameStr, "ctor") {
					nameStr = "Buffer"
				}

				// 生成具体的错误消息
				switch nameStr {
				case "Array":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Array", argName)
				case "Function":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received function ", argName)
				case "RegExp":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of RegExp", argName)
				case "Date":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Date", argName)
				case "DataView":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of DataView", argName)
				case "ArrayBuffer":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of ArrayBuffer", argName)
				case "SharedArrayBuffer":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of SharedArrayBuffer", argName)
				// 拒绝其他所有 TypedArray 类型
				case "Int8Array":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Int8Array", argName)
				case "Uint8ClampedArray":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Uint8ClampedArray", argName)
				case "Int16Array":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Int16Array", argName)
				case "Uint16Array":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Uint16Array", argName)
				case "Int32Array":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Int32Array", argName)
				case "Uint32Array":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Uint32Array", argName)
				case "Float32Array":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Float32Array", argName)
				case "Float64Array":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Float64Array", argName)
				case "BigInt64Array":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of BigInt64Array", argName)
				case "BigUint64Array":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of BigUint64Array", argName)
				case "Object":
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object", argName)
				default:
					return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of %s", argName, nameStr)
				}
			}
		}
	}

	// 如果无法获取类型名称，返回通用错误
	return fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object", argName)
}

func validateBufferOrUint8ArrayArg(runtime *goja.Runtime, arg goja.Value, argName string) *goja.Object {
	if goja.IsNull(arg) {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received null", argName)))
	}
	if goja.IsUndefined(arg) {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received undefined", argName)))
	}

	exported := arg.Export()
	if exported == nil {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received null", argName)))
	}

	switch v := exported.(type) {
	case string:
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received type string ('%s')", argName, v)))
	case int, int8, int16, int32, int64:
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received type number (%v)", argName, v)))
	case uint, uint8, uint16, uint32, uint64:
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received type number (%v)", argName, v)))
	case float32, float64:
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received type number (%v)", argName, v)))
	case bool:
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received type boolean (%v)", argName, v)))
	}

	obj := arg.ToObject(runtime)
	if obj == nil {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be an instance of Buffer or Uint8Array. Received %v", argName, arg.String())))
	}

	if !isBufferOrUint8Array(runtime, obj) {
		errorMsg := getDetailedTypeError(runtime, obj, argName)
		panic(runtime.NewTypeError(errorMsg))
	}

	return obj
}

// isArrayLike 检查对象是否类似数组（有length属性且为数组类型）
func isArrayLike(runtime *goja.Runtime, obj *goja.Object) bool {
	if obj == nil {
		return false
	}

	// 检查是否有length属性
	lengthVal := obj.Get("length")
	if lengthVal == nil || goja.IsUndefined(lengthVal) {
		return false
	}

	// 检查constructor.name是否包含Array（因为可能返回函数签名）
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
			if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
				nameStr := name.String()
				// 检查是否包含"Array"关键字，而不是精确匹配
				if strings.Contains(nameStr, "Array") && !strings.Contains(nameStr, "Buffer") {
					return true
				}
				// 如果明确是Buffer类型，则不是数组
				if strings.Contains(nameStr, "Buffer") {
					return false
				}
			}
		}
	}

	// 如果无法确定类型，则不认为是数组
	return false
}

// getObjectTypeName 获取对象的类型名称
func getObjectTypeName(runtime *goja.Runtime, obj *goja.Object) string {
	if obj == nil {
		return "null"
	}

	// 尝试获取 constructor.name
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
			if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
				nameStr := name.String()
				switch nameStr {
				case "Number":
					return "number"
				case "String":
					return "string"
				case "Boolean":
					return "boolean"
				case "Object":
					return "an instance of Object"
				case "Array":
					return "an instance of Array"
				default:
					return fmt.Sprintf("an instance of %s", nameStr)
				}
			}
		}
	}

	return "an instance of Object"
}
