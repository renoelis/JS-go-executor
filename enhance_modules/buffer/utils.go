package buffer

import (
	"errors"
	"fmt"
	"math"
	"math/big"
	"strconv"

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
	mod := i % 256
	if mod < 0 {
		mod += 256
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
	return uint8(val.ToInteger() & 0xFF)
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
			byteLength := length
			if lengthVal := obj.Get("byteLength"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
				byteLength = lengthVal.ToInteger()
			}
			// 边界检查
			if byteOffset < 0 || byteOffset > int64(len(allBytes)) {
				return nil
			}
			end := byteOffset + byteLength
			if end > int64(len(allBytes)) {
				end = int64(len(allBytes))
			}
			if byteOffset >= end {
				return []byte{}
			}
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
					byteLength := length
					if lengthVal := obj.Get("byteLength"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
						byteLength = lengthVal.ToInteger()
					}
					// 边界检查
					if byteOffset < 0 || byteOffset > int64(len(allBytes)) {
						return nil
					}
					end := byteOffset + byteLength
					if end > int64(len(allBytes)) {
						end = int64(len(allBytes))
					}
					if byteOffset >= end {
						return []byte{}
					}
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

	// 提取指定范围
	return allBytes[start:end]
}

// shouldUseFastPath 检查是否应该使用快速路径（批量操作）
// 阈值: 256 字节（降低阈值以提升性能）
func shouldUseFastPath(dataLength int64) bool {
	const threshold = 256 // 256 字节
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

// newBufferOutOfBoundsError 创建一个 Buffer 越界错误，对齐 Node.js 的错误格式
func newBufferOutOfBoundsError(runtime *goja.Runtime) *goja.Object {
	errObj := runtime.NewGoError(errors.New("Attempt to access memory outside buffer bounds"))
	errObj.Set("code", runtime.ToValue("ERR_BUFFER_OUT_OF_BOUNDS"))
	errObj.Set("name", runtime.ToValue("RangeError"))
	return errObj
}

// validateOffset 验证 offset 参数类型和值（对齐 Node.js v25 行为）
func validateOffset(runtime *goja.Runtime, val goja.Value, methodName string) int64 {
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

	// 检查是否是 Symbol（Symbol 不能被导出为普通类型）
	if symStr := val.String(); len(symStr) > 6 && symStr[:7] == "Symbol(" {
		errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received type symbol")
		errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
		panic(errObj)
	}

	// 检查是否是 BigInt
	if _, ok := exported.(int64); !ok {
		// 尝试检测 BigInt（goja 中 BigInt 可能有特殊的表示）
		if valStr := val.String(); len(valStr) > 0 && valStr[len(valStr)-1] == 'n' {
			// 可能是 BigInt（以 'n' 结尾）
			errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received type bigint")
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			panic(errObj)
		}
	}

	// 检查 Number/String/Boolean 对象包装器
	// 原理：Object.is(primitive, primitive) → true
	//      Object.is(new Number(0), new Number(0).valueOf()) → false
	// 通过比较 val 和 val.valueOf() 来区分原始值和包装器对象
	if obj := val.ToObject(runtime); obj != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
		// 获取 valueOf 方法
		valueOfProp := obj.Get("valueOf")
		if valueOfProp != nil && !goja.IsUndefined(valueOfProp) {
			if valueOfFunc, ok := goja.AssertFunction(valueOfProp); ok {
				// 调用 valueOf()
				valueOfResult, err := valueOfFunc(obj)
				if err == nil && valueOfResult != nil {
					// 使用 Object.is 比较 val 和 valueOf 的结果
					// 如果不相等，说明 val 是包装器对象
					objectCtor := runtime.Get("Object")
					if objectCtor != nil {
						if objectCtorObj := objectCtor.ToObject(runtime); objectCtorObj != nil {
							if isFunc := objectCtorObj.Get("is"); isFunc != nil {
								if isFn, ok := goja.AssertFunction(isFunc); ok {
									isResult, err := isFn(goja.Undefined(), val, valueOfResult)
									if err == nil && isResult != nil {
										// 如果 Object.is(val, val.valueOf()) 返回 false
										// 说明 val 是包装器对象，而不是原始值
										if !isResult.ToBoolean() {
											// 检查是哪种包装器
											if ctorProp := obj.Get("constructor"); ctorProp != nil && !goja.IsUndefined(ctorProp) {
												if ctorObj := ctorProp.ToObject(runtime); ctorObj != nil {
													if nameProp := ctorObj.Get("name"); nameProp != nil && !goja.IsUndefined(nameProp) {
														ctorName := nameProp.String()
														switch ctorName {
														case "Number":
															errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of Number")
															errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
															panic(errObj)
														case "String":
															errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of String")
															errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
															panic(errObj)
														case "Boolean":
															errObj := runtime.NewTypeError("The \"offset\" argument must be of type number. Received type boolean")
															errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
															panic(errObj)
														}
													}
												}
											}
										}
									}
								}
							}
						}
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

// validateByteLength 验证 byteLength 参数类型和值（对齐 Node.js v25 行为）
func validateByteLength(runtime *goja.Runtime, val goja.Value, min, max int64, methodName string) int64 {
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

	// 检查是否是对象类型（包括数组、普通对象等，但排除 null）
	if obj := val.ToObject(runtime); obj != nil && exported != nil {
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
