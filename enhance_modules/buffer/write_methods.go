package buffer

import (
	"bytes"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/dop251/goja"
	gojaBuffer "github.com/dop251/goja_nodejs/buffer"
)

// addBufferPrototypeMethods 添加 Buffer 原型方法（write, toString, slice, indexOf 等）
func (be *BufferEnhancer) addBufferPrototypeMethods(runtime *goja.Runtime, prototype *goja.Object) {
	// 🚀 性能优化：缓存 Buffer.from 函数，避免每次 slice 调用时重复查找
	bufferConstructor := runtime.Get("Buffer")
	var cachedBufferFromFunc goja.Callable
	if bufferConstructor != nil {
		if bufferObj := bufferConstructor.ToObject(runtime); bufferObj != nil {
			if fromFunc, ok := goja.AssertFunction(bufferObj.Get("from")); ok {
				cachedBufferFromFunc = fromFunc
			}
		}
	}
	// 添加 write 方法（支持多种参数形式）
	writeFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("Method Buffer.prototype.write called on incompatible receiver"))
		}

		// 🔥 修复：检查 this 是否是真正的 Buffer（不能是普通 Uint8Array）
		// Node.js 的 Buffer 有特殊的内部方法（如 utf8Write），Uint8Array 没有
		bufferProp := this.Get("buffer")
		if bufferProp == nil || goja.IsUndefined(bufferProp) || goja.IsNull(bufferProp) {
			panic(runtime.NewTypeError("this.utf8Write is not a function"))
		}

		// 🔥 修复：进一步检查是否是真正的 Buffer（通过检查特殊方法或构造函数）
		// 检查是否有 Buffer 特有的方法或属性
		// 一个简单的方式是检查 constructor 名称或特定方法
		thisConstructor := this.Get("constructor")
		if thisConstructor != nil && !goja.IsUndefined(thisConstructor) {
			constructorObj := thisConstructor.ToObject(runtime)
			if constructorObj != nil {
				constructorName := constructorObj.Get("name")
				if constructorName != nil && !goja.IsUndefined(constructorName) {
					name := constructorName.String()
					// 只接受 Buffer，不接受 Uint8Array 等其他 TypedArray
					if name != "Buffer" && name != "" {
						// 如果明确是 Uint8Array 等，抛出错误
						if name == "Uint8Array" || name == "Uint16Array" || name == "Uint32Array" ||
							name == "Int8Array" || name == "Int16Array" || name == "Int32Array" ||
							name == "Float32Array" || name == "Float64Array" {
							panic(runtime.NewTypeError("this.utf8Write is not a function"))
						}
					}
				}
			}
		}

		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("字符串参数是必需的"))
		}

		// 🔥 修复：检查 Symbol 类型（Symbol 不能转换为字符串）
		assertNotSymbol(runtime, call.Arguments[0], "Cannot convert a Symbol value to a string")

		// 🔥 修复：第一个参数必须是字符串类型（Node.js v25.0.0 严格检查）
		firstArg := call.Arguments[0]
		if goja.IsUndefined(firstArg) || goja.IsNull(firstArg) {
			panic(runtime.NewTypeError("The \"string\" argument must be of type string. Received " + firstArg.String()))
		}

		// 检查是否为字符串类型
		firstArgType := firstArg.ExportType()
		if firstArgType == nil || firstArgType.Kind().String() != "string" {
			receivedType := "object"
			if firstArgType != nil {
				receivedType = firstArgType.Kind().String()
			}
			panic(runtime.NewTypeError("The \"string\" argument must be of type string. Received type " + receivedType))
		}

		str := firstArg.String()

		offset := int64(0)
		// 🔥 修复：默认 length 应该是 buf.length - offset，不是字符串长度
		// 获取buffer长度
		bufferLength := int64(0)
		lengthVal := this.Get("length")
		if lengthVal != nil && !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		length := bufferLength // 默认值，后面会根据 offset 调整
		encoding := "utf8"

		// 解析参数 - 支持多种形式
		// write(string)
		// write(string, offset)
		// write(string, offset, length)
		// write(string, offset, length, encoding)
		// write(string, encoding) <-- 新增支持
		// write(string, offset, encoding) <-- 新增支持

		if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) {
			arg1 := call.Arguments[1]

			// 🔥 修复：null 不能作为 offset
			if goja.IsNull(arg1) {
				panic(runtime.NewTypeError("The \"offset\" argument must be of type number. Received null"))
			}

			// 🔥 修复：Node.js 只看类型，不看内容
			// 如果是字符串类型 -> encoding；否则 -> offset
			arg1Type := arg1.ExportType()
			if arg1Type != nil && arg1Type.Kind().String() == "string" {
				// write(string, encoding)
				// 🔥 修复：空字符串使用默认编码
				encodingStr := arg1.String()
				if encodingStr != "" {
					encoding = encodingStr
				}
			} else {
				// write(string, offset, ...)
				// 🔥 修复：offset 不能是布尔值
				if arg1Type != nil && arg1Type.Kind().String() == "bool" {
					panic(runtime.NewTypeError("The \"offset\" argument must be of type number. Received type boolean"))
				}

				// 🔥 修复：offset 不能是数组
				if arg1Type != nil && (arg1Type.Kind().String() == "slice" || arg1Type.Kind().String() == "array") {
					panic(runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of Array"))
				}

				// 🔥 修复：offset 必须是原始数字类型（不能是对象，即使对象有 valueOf）
				// Node.js v25.0.0 不接受 { valueOf: () => 2 } 这样的对象
				if arg1Type != nil && (arg1Type.Kind().String() == "map" || arg1Type.Kind().String() == "struct") {
					panic(runtime.NewTypeError("The \"offset\" argument must be of type number. Received an instance of Object"))
				}

				// 🔥 修复：offset 必须是整数（不能是小数）
				offsetFloat := arg1.ToFloat()
				if math.Floor(offsetFloat) != offsetFloat || math.IsNaN(offsetFloat) || math.IsInf(offsetFloat, 0) {
					errObj := newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be an integer. Received %v", offsetFloat))
					panic(errObj)
				}
				offset = int64(offsetFloat)

				if len(call.Arguments) >= 3 && !goja.IsUndefined(call.Arguments[2]) {
					arg2 := call.Arguments[2]

					// 第三个参数同理：字符串 -> encoding；否则 -> length
					arg2Type := arg2.ExportType()
					if arg2Type != nil && arg2Type.Kind().String() == "string" {
						// write(string, offset, encoding)
						// 🔥 修复：空字符串使用默认编码
						encodingStr := arg2.String()
						if encodingStr != "" {
							encoding = encodingStr
						}
					} else {
						// write(string, offset, length, ...)
						// 🔥 修复：length 必须是整数（不能是小数）
						lengthFloat := arg2.ToFloat()
						if math.Floor(lengthFloat) != lengthFloat || math.IsNaN(lengthFloat) || math.IsInf(lengthFloat, 0) {
							errObj := newRangeError(runtime, fmt.Sprintf("The value of \"length\" is out of range. It must be an integer. Received %v", lengthFloat))
							panic(errObj)
						}
						length = int64(lengthFloat)

						if len(call.Arguments) >= 4 && !goja.IsUndefined(call.Arguments[3]) {
							arg3 := call.Arguments[3]
							// 🔥 修复：null 或空字符串作为 encoding 使用默认值
							if !goja.IsNull(arg3) {
								encodingStr := arg3.String()
								if encodingStr != "" {
									encoding = encodingStr
								}
							}
						}
					}
				}
			}
		}

		// 🔥 修复：编码大小写不敏感
		encoding = strings.ToLower(encoding)

		// 🔥 修复：严格的边界检查（对齐 Node.js v25.0.0）
		// offset 必须 >= 0 && <= bufferLength
		if offset < 0 {
			errObj := newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength, offset))
			panic(errObj)
		}
		if offset > bufferLength {
			errObj := newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength, offset))
			panic(errObj)
		}

		// 🔥 修复：检查 length 参数（对齐 Node.js v25.0.0）
		maxLength := bufferLength - offset
		if length < 0 {
			errObj := newRangeError(runtime, fmt.Sprintf("The value of \"length\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength, length))
			panic(errObj)
		}

		// 🔥 修复：Node.js v25.0.0 行为
		// 如果 length > bufferLength，抛出错误
		// 如果 length > bufferLength - offset (即 maxLength)，自动截断到 maxLength
		if len(call.Arguments) >= 3 {
			arg2 := call.Arguments[2]
			arg2Type := arg2.ExportType()
			// 如果第三个参数不是字符串（即不是 encoding），说明用户显式传入了 length
			if arg2Type != nil && arg2Type.Kind().String() != "string" && !goja.IsUndefined(arg2) {
				if length > bufferLength {
					errObj := newRangeError(runtime, fmt.Sprintf("The value of \"length\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength, length))
					panic(errObj)
				}
			}
		}

		// 🔥 修复：调整 length 为 buf.length - offset（对于默认值或自动截断）
		if offset >= bufferLength {
			return runtime.ToValue(0)
		}
		if length > maxLength {
			length = maxLength
		}

		// 转换字符串为字节
		var data []byte
		switch encoding {
		case "utf8", "utf-8":
			data = []byte(str)
		case "hex":
			// 🔥 修复：使用宽松的 hex 解码，处理奇数长度字符串
			decoded, err := decodeHexLenient(str)
			if err != nil {
				panic(runtime.NewTypeError("无效的十六进制字符串"))
			}
			data = decoded
		case "base64":
			// 使用宽松的 base64 解码（Node.js 行为）
			decoded, err := decodeBase64Lenient(str)
			if err != nil {
				panic(runtime.NewTypeError("无效的 base64 字符串"))
			}
			data = decoded
		case "base64url":
			decoded, err := decodeBase64URLLenient(str)
			if err != nil {
				panic(runtime.NewTypeError("无效的 base64url 字符串"))
			}
			data = decoded
		case "latin1", "binary":
			// 🔥 修复：按 UTF-16 码元处理，不是 Unicode 码点
			// Latin1/Binary: 每个 UTF-16 码元的低 8 位
			codeUnits := stringToUTF16CodeUnits(str)
			data = make([]byte, len(codeUnits))
			for i, unit := range codeUnits {
				data[i] = byte(unit) & 0xFF
			}
		case "ascii":
			// 🔥 修复：按 UTF-16 码元处理，不是 Unicode 码点
			// Node.js v25.0.0: ASCII 编码实际保留完整 8 位（0x00-0xFF），而不是传统的 7 位
			codeUnits := stringToUTF16CodeUnits(str)
			data = make([]byte, len(codeUnits))
			for i, unit := range codeUnits {
				data[i] = byte(unit) & 0xFF
			}
		case "utf16le", "ucs2", "ucs-2", "utf-16le":
			// UTF-16LE / UCS-2 编码（Node.js 行为）
			// 对于 BMP 字符 (U+0000 to U+FFFF)：直接写 2 字节
			// 对于超出 BMP 的字符 (U+10000+)：编码为 surrogate pair，写 4 字节
			// 预计算需要的字节数
			byteCount := utf16CodeUnitCount(str) * 2
			data = make([]byte, byteCount)
			offset := 0
			for _, r := range str {
				if r <= 0xFFFF {
					// BMP 字符：直接写入
					data[offset] = byte(r)
					data[offset+1] = byte(r >> 8)
					offset += 2
				} else {
					// 超出 BMP：编码为 surrogate pair
					// 算法：r' = r - 0x10000
					// high surrogate = 0xD800 + (r' >> 10)
					// low surrogate = 0xDC00 + (r' & 0x3FF)
					rPrime := r - 0x10000
					high := uint16(0xD800 + (rPrime >> 10))
					low := uint16(0xDC00 + (rPrime & 0x3FF))
					// 写入 high surrogate (Little Endian)
					data[offset] = byte(high)
					data[offset+1] = byte(high >> 8)
					offset += 2
					// 写入 low surrogate (Little Endian)
					data[offset] = byte(low)
					data[offset+1] = byte(low >> 8)
					offset += 2
				}
			}
		default:
			// 🔥 修复：未知编码应该抛出错误（Node.js 行为）
			panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", encoding)))
		}

		// 🔥 修复：对于 UTF-8 和 UTF-16LE，需要检查多字节字符是否完整
		// 如果 length 会截断多字节字符，则不写入该字符
		maxWriteLength := length
		if maxWriteLength > int64(len(data)) {
			maxWriteLength = int64(len(data))
		}
		if offset+maxWriteLength > bufferLength {
			maxWriteLength = bufferLength - offset
		}

		actualWriteLength := maxWriteLength

		// UTF-8: 检查多字节字符边界
		if encoding == "utf8" || encoding == "utf-8" {
			actualWriteLength = findUTF8ByteBoundary(data, maxWriteLength)
		}

		// UTF-16LE: 必须是 2 字节对齐
		if encoding == "utf16le" || encoding == "ucs2" || encoding == "ucs-2" || encoding == "utf-16le" {
			if actualWriteLength%2 != 0 {
				actualWriteLength-- // 截断到偶数字节
			}
			// 检查是否会截断代理对（surrogate pair）
			if actualWriteLength >= 2 && actualWriteLength < int64(len(data)) {
				// 检查最后两个字节是否是 high surrogate
				lastCodeUnit := uint16(data[actualWriteLength-2]) | (uint16(data[actualWriteLength-1]) << 8)
				if lastCodeUnit >= 0xD800 && lastCodeUnit <= 0xDBFF {
					// 这是 high surrogate，需要再有 2 字节才能完整
					if actualWriteLength+2 > int64(len(data)) || actualWriteLength+2 > maxWriteLength {
						// 空间不足，不写入这个 surrogate pair
						actualWriteLength -= 2
					}
				}
			}
		}

		// 写入数据 - 性能优化版
		written := int64(0)
		for i := int64(0); i < actualWriteLength && i < int64(len(data)); i++ {
			// 优化：预计算索引和字节值，减少重复计算
			indexStr := getIndexString(offset + i)
			byteValue := runtime.ToValue(data[i])
			this.Set(indexStr, byteValue)
			written++
		}

		return runtime.ToValue(written)
	}
	writeValue := runtime.ToValue(writeFunc)
	setFunctionNameAndLength(runtime, writeValue, "write", 4)
	prototype.Set("write", writeValue)

	// 添加 slice 方法
	// 🔥 修复：返回共享内存视图（对齐 Node.js）
	sliceFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 🚀 优化：简化 this 类型检查 - Buffer/TypedArray 必有 buffer 属性
		bufferProp := this.Get("buffer")
		if bufferProp == nil || goja.IsUndefined(bufferProp) || goja.IsNull(bufferProp) {
			panic(runtime.NewTypeError("this.subarray is not a function"))
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		start := int64(0)
		end := bufferLength

		// 🚀 优化：合并参数解析，减少分支判断
		if len(call.Arguments) > 0 {
			if !goja.IsUndefined(call.Arguments[0]) {
				start = call.Arguments[0].ToInteger()
			}
			if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
				end = call.Arguments[1].ToInteger()
			}
		}

		// 处理负数索引
		if start < 0 {
			start = bufferLength + start
		}
		if end < 0 {
			end = bufferLength + end
		}

		// 🚀 优化：边界检查 - 使用 else if 减少分支
		if start < 0 {
			start = 0
		} else if start > bufferLength {
			start = bufferLength
		}

		if end > bufferLength {
			end = bufferLength
		}
		if end < start {
			end = start
		}

		// 计算新视图的参数
		viewLength := end - start
		if viewLength < 0 {
			viewLength = 0
		}

		// 🚀 优化：直接使用 buffer 属性（已在上面验证），移除永远不会执行的备用路径
		arrayBuffer := bufferProp

		// 获取当前 byteOffset
		baseByteOffset := int64(0)
		if byteOffsetVal := this.Get("byteOffset"); byteOffsetVal != nil && !goja.IsUndefined(byteOffsetVal) {
			baseByteOffset = byteOffsetVal.ToInteger()
		}

		// 🚀 优化：使用缓存的 Buffer.from 函数
		if cachedBufferFromFunc == nil {
			panic(runtime.NewTypeError("Buffer.from is not available"))
		}

		// 返回共享视图：Buffer.from(arrayBuffer, byteOffset + start, length)
		newBuffer, err := cachedBufferFromFunc(bufferConstructor,
			arrayBuffer,
			runtime.ToValue(baseByteOffset+start),
			runtime.ToValue(viewLength))
		if err != nil {
			panic(err)
		}

		return newBuffer
	}
	sliceValue := runtime.ToValue(sliceFunc)
	setFunctionNameAndLength(runtime, sliceValue, "slice", 2)
	prototype.Set("slice", sliceValue)

	// 添加 inspect 方法（Node.js Buffer 特有）
	// 使用 buffer.INSPECT_MAX_BYTES 控制显示的字节数
	inspectFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取长度
		length := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			length = lengthVal.ToInteger()
		}

		// 构建类似 <Buffer 68 65 6c> 的字符串
		if length == 0 {
			return runtime.ToValue("<Buffer >")
		}

		// 🔥 修复：通过 goja_nodejs/buffer API 直接获取 INSPECT_MAX_BYTES 值
		// 这样可以避免 require.cache 被删除后访问到错误的模块实例
		maxShow := gojaBuffer.GetInspectMaxBytes(runtime)

		// 🔥 修复：处理 Number.MAX_VALUE 等极大值的溢出
		// 将浮点数 maxShow 转换为实际显示的字节数（向下取整用于索引）
		var showLength int64

		// 检查是否超出 int64 最大值（避免溢出）
		// math.MaxInt64 = 9223372036854775807
		if maxShow > float64(math.MaxInt64) || math.IsInf(maxShow, 1) {
			// 极大值或 +Infinity：显示全部字节
			showLength = length
		} else {
			showLength = int64(math.Floor(maxShow))
			if showLength > length {
				showLength = length
			}
		}

		var hexParts []string
		for i := int64(0); i < showLength; i++ {
			val := this.Get(getIndexString(i))
			byteVal := byte(val.ToInteger() & 0xFF)
			hexParts = append(hexParts, fmt.Sprintf("%02x", byteVal))
		}

		result := "<Buffer " + strings.Join(hexParts, " ")
		// 🔥 修复：保留浮点精度显示剩余字节数
		if showLength < length {
			remaining := float64(length) - maxShow
			// 格式化：如果是整数显示为整数，否则显示为浮点数
			if remaining == math.Floor(remaining) {
				result += fmt.Sprintf(" ... %d more bytes", int64(remaining))
			} else {
				result += fmt.Sprintf(" ... %g more byte", remaining)
			}
		}
		result += ">"

		return runtime.ToValue(result)
	}
	inspectValue := runtime.ToValue(inspectFunc)
	setFunctionNameAndLength(runtime, inspectValue, "inspect", 0)
	prototype.Set("inspect", inspectValue)

	// 添加 indexOf 方法
	// 🔥 修复：完整实现 indexOf(value[, byteOffset][, encoding])
	indexOfFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			return runtime.ToValue(-1)
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		searchArg := call.Arguments[0]
		offset := int64(0)
		encoding := "utf8"

		// 解析参数：indexOf(value, byteOffset, encoding) 或 indexOf(value, encoding)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			arg1 := call.Arguments[1]
			// 判断是 offset 还是 encoding
			// 🔥 修复：Node.js 行为 - 如果第二个参数是字符串，先检查是否是有效 encoding
			arg1Type := arg1.ExportType()
			isString := arg1Type != nil && arg1Type.Kind().String() == "string"

			if isString {
				arg1Str := arg1.String()
				encodingLower := strings.ToLower(arg1Str)
				validEncodings := map[string]bool{
					"utf8": true, "utf-8": true, "hex": true, "base64": true, "base64url": true,
					"ascii": true, "latin1": true, "binary": true, "utf16le": true,
					"ucs2": true, "ucs-2": true, "utf-16le": true,
				}

				if validEncodings[encodingLower] {
					// 是有效的 encoding
					encoding = arg1Str
				} else {
					// 不是有效的 encoding，Node.js 会抛出错误
					panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", arg1Str)))
				}
			} else {
				// 不是字符串，当作 offset 处理
				offset = arg1.ToInteger()
				// 第三个参数可能是 encoding
				if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
					arg2 := call.Arguments[2]
					arg2Str := arg2.String()
					encodingLower := strings.ToLower(arg2Str)
					validEncodings := map[string]bool{
						"utf8": true, "utf-8": true, "hex": true, "base64": true, "base64url": true,
						"ascii": true, "latin1": true, "binary": true, "utf16le": true,
						"ucs2": true, "ucs-2": true, "utf-16le": true,
					}
					if !validEncodings[encodingLower] {
						panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", arg2Str)))
					}
					encoding = arg2Str
				}
			}
		}

		// 处理负数 offset
		if offset < 0 {
			offset = bufferLength + offset
			if offset < 0 {
				offset = 0
			}
		}

		// 处理不同类型的搜索值
		var searchBytes []byte

		// 🔥 修复：检查 Symbol 类型（必须在其他类型检查之前）
		assertNotSymbol(runtime, searchArg, "Cannot convert a Symbol value to a string")

		// 🔥 修复：检查函数类型
		searchType := searchArg.ExportType()
		if searchType != nil {
			// 检查是否是函数
			if searchType.Kind().String() == "func" {
				panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received an instance of Function"))
			}
		}

		// 🔥 修复：优先检查是否是数字类型（最明确的类型）
		if searchType != nil && (searchType.Kind().String() == "float64" || searchType.Kind().String() == "int64") {
			// 数字类型
			// 🔥 修复：处理特殊数字值（NaN, Infinity, -Infinity）
			// Node.js 行为：这些值都会被转换为 0
			numVal := searchArg.ToFloat()
			if math.IsNaN(numVal) || math.IsInf(numVal, 0) {
				searchBytes = []byte{0}
			} else {
				// 🔥 修复：使用位运算而不是 ToInteger()，避免超大浮点数溢出
				// Node.js 行为：number & 0xFF
				intVal := int64(numVal)
				searchBytes = []byte{byte(intVal & 0xFF)}
			}
		} else if searchType != nil && searchType.Kind().String() == "string" {
			// 字符串类型
			searchStr := searchArg.String()
			if searchStr != "" {
				// 🔥 修复：完整的编码处理（对齐 Node.js）
				switch strings.ToLower(encoding) {
				case "utf8", "utf-8":
					searchBytes = []byte(searchStr)
				case "hex":
					// 🔥 修复：使用宽松的 hex 解码，处理奇数长度字符串
					decoded, err := decodeHexLenient(searchStr)
					if err == nil {
						searchBytes = decoded
					}
				case "base64":
					// 使用宽松的 base64 解码
					decoded, err := decodeBase64Lenient(searchStr)
					if err == nil {
						searchBytes = decoded
					}
				case "base64url":
					decoded, err := decodeBase64URLLenient(searchStr)
					if err == nil {
						searchBytes = decoded
					}
				case "latin1", "binary":
					// latin1: 按 UTF-16 码元转字节
					cu := stringToUTF16CodeUnits(searchStr)
					searchBytes = make([]byte, len(cu))
					for i, u := range cu {
						searchBytes[i] = byte(u)
					}
				case "ascii":
					// ascii: 按 UTF-16 码元转字节，取低 7 位
					cu := stringToUTF16CodeUnits(searchStr)
					searchBytes = make([]byte, len(cu))
					for i, u := range cu {
						searchBytes[i] = byte(u & 0x7F)
					}
				case "utf16le", "ucs2", "ucs-2", "utf-16le":
					// utf16le: 完整的 UTF-16LE 编码
					byteCount := utf16CodeUnitCount(searchStr) * 2
					b := make([]byte, byteCount)
					off := 0
					for _, r := range searchStr {
						if r <= 0xFFFF {
							b[off] = byte(r)
							b[off+1] = byte(r >> 8)
							off += 2
						} else {
							rPrime := r - 0x10000
							high := uint16(0xD800 + (rPrime >> 10))
							low := uint16(0xDC00 + (rPrime & 0x3FF))
							b[off] = byte(high)
							b[off+1] = byte(high >> 8)
							off += 2
							b[off] = byte(low)
							b[off+1] = byte(low >> 8)
							off += 2
						}
					}
					searchBytes = b
				default:
					searchBytes = []byte(searchStr)
				}
			}
		} else {
			// 🔥 修复：对象类型处理
			searchObj := searchArg.ToObject(runtime)
			if searchObj != nil {
				className := searchObj.ClassName()

				// 拒绝普通数组
				if className == "Array" {
					panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received an instance of Array"))
				}

				// 检查是否有 length 属性
				searchLen := searchObj.Get("length")
				hasLength := searchLen != nil && !goja.IsUndefined(searchLen) && !goja.IsNull(searchLen)

				if !hasLength {
					// 没有 length，是普通对象
					panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received an instance of Object"))
				}

				// 有 length，检查是否有数字索引
				searchLength := searchLen.ToInteger()
				if searchLength > 0 {
					val0 := searchObj.Get("0")
					if val0 == nil || goja.IsUndefined(val0) {
						// 有 length 但没有索引，是普通对象
						panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received an instance of Object"))
					}

					// 是 Buffer/TypedArray
					searchBytes = make([]byte, searchLength)
					for i := int64(0); i < searchLength; i++ {
						val := searchObj.Get(getIndexString(i))
						if val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
							searchBytes[i] = byte(val.ToInteger() & 0xFF)
						}
					}
				} else {
					// 空的 Buffer/TypedArray
					searchBytes = []byte{}
				}
			}
		}

		if len(searchBytes) == 0 {
			if offset <= bufferLength {
				return runtime.ToValue(offset)
			}
			return runtime.ToValue(bufferLength)
		}

		// 搜索
		// 🔥 修复：检查是否是 UTF-16 编码
		encodingLower := strings.ToLower(encoding)
		isUTF16 := encodingLower == "utf16le" || encodingLower == "ucs2" || encodingLower == "ucs-2" || encodingLower == "utf-16le"

		// 🔥 性能优化：对于大 Buffer，使用批量导出进行搜索
		if shouldUseFastPath(bufferLength) {
			// 尝试批量导出 Buffer 数据
			bufferBytes := be.exportBufferBytesFast(runtime, this, bufferLength)
			if bufferBytes != nil && int64(len(bufferBytes)) >= bufferLength {
				// 使用 Go 的 bytes.Index 进行快速搜索
				searchStart := int(offset)
				if searchStart < 0 {
					searchStart = 0
				}

				// 🔥 修复：对于 UTF-16 编码，确保搜索起始位置是 2 字节对齐的
				if isUTF16 && searchStart%2 != 0 {
					searchStart++
				}

				if searchStart >= len(bufferBytes) {
					return runtime.ToValue(-1)
				}

				// 🔥 安全修复：必须复制数据，避免切片共享底层数组
				searchData := make([]byte, len(bufferBytes)-searchStart)
				copy(searchData, bufferBytes[searchStart:])

				// 🔥 修复：对于 UTF-16 编码，需要按 2 字节步长搜索
				if isUTF16 {
					// UTF-16 编码需要 2 字节对齐搜索
					for i := 0; i <= len(searchData)-len(searchBytes); i += 2 {
						if bytes.Equal(searchData[i:i+len(searchBytes)], searchBytes) {
							return runtime.ToValue(int64(searchStart + i))
						}
					}
					return runtime.ToValue(-1)
				} else {
					// 其他编码使用标准的 bytes.Index
					idx := bytes.Index(searchData, searchBytes)
					if idx >= 0 {
						return runtime.ToValue(int64(searchStart + idx))
					}
					return runtime.ToValue(-1)
				}
			}
			// 如果批量导出失败，回退到逐字节搜索
		}

		// 🔥 性能优化：对于小 Buffer，使用优化的逐字节搜索
		// 🔥 修复：对于 utf16le/ucs2 编码，需要确保搜索位置是 2 字节对齐的
		// encodingLower 和 isUTF16 已在上面定义

		// 如果是 UTF-16 编码且 offset 不是 2 字节对齐，调整到下一个对齐位置
		searchStart := offset
		if isUTF16 && searchStart%2 != 0 {
			searchStart++
		}

		// 确定搜索步长：UTF-16 编码时步长为 2，其他编码步长为 1
		step := int64(1)
		if isUTF16 {
			step = 2
		}

		for i := searchStart; i <= bufferLength-int64(len(searchBytes)); i += step {
			found := true
			for j, searchByte := range searchBytes {
				if val := this.Get(getIndexString(i + int64(j))); !goja.IsUndefined(val) {
					if byteVal := val.ToInteger(); byteVal >= 0 {
						if byte(byteVal&0xFF) != searchByte {
							found = false
							break
						}
					} else {
						found = false
						break
					}
				} else {
					found = false
					break
				}
			}
			if found {
				return runtime.ToValue(i)
			}
		}

		return runtime.ToValue(-1)
	}
	indexOfValue := runtime.ToValue(indexOfFunc)
	setFunctionNameAndLength(runtime, indexOfValue, "indexOf", 3)
	prototype.Set("indexOf", indexOfValue)

	// 重写 toString 方法以支持范围参数
	toStringFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("Method Buffer.prototype.toString called on incompatible receiver"))
		}

		// 🔥 类型检查：必须是 Buffer 或 TypedArray
		if !isBufferOrTypedArray(runtime, this) {
			panic(runtime.NewTypeError("The \"this\" argument must be an instance of Buffer or TypedArray"))
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		encoding := "utf8"
		start := int64(0)
		end := bufferLength

		// 解析参数
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			start = call.Arguments[1].ToInteger()
		}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			end = call.Arguments[2].ToInteger()
		}
		encoding = strings.ToLower(encoding)

		// 边界检查
		if start < 0 {
			start = 0
		}
		if end > bufferLength {
			end = bufferLength
		}
		if start >= end {
			return runtime.ToValue("")
		}

		// 安全地提取数据（自动处理快速路径和降级方案）
		data := be.extractBufferDataSafe(runtime, this, start, end, bufferLength)

		// 根据编码类型转换（小 Buffer 或其他编码使用安全方案）
		var result goja.Value
		switch encoding {
		case "utf8", "utf-8":
			result = runtime.ToValue(string(data))
		case "hex":
			result = runtime.ToValue(hex.EncodeToString(data))
		case "base64":
			// 直接编码，标准库已优化
			result = runtime.ToValue(base64.StdEncoding.EncodeToString(data))
		case "base64url":
			result = runtime.ToValue(base64.RawURLEncoding.EncodeToString(data))
		case "latin1", "binary":
			// Latin1 解码：每个字节(0-255)对应一个 Unicode 码点 (U+0000 to U+00FF)
			runes := make([]rune, len(data))
			for i, b := range data {
				runes[i] = rune(b)
			}
			result = runtime.ToValue(string(runes))
		case "ascii":
			// ASCII 伪编码：只取低 7 位 (Node.js 行为)
			asciiData := make([]byte, len(data))
			for i, b := range data {
				asciiData[i] = b & 0x7F
			}
			result = runtime.ToValue(string(asciiData))
		case "utf16le", "ucs2", "ucs-2", "utf-16le":
			// UTF-16LE 解码（正确处理 surrogate pairs）
			if len(data) < 2 {
				result = runtime.ToValue("")
			} else {
				// 解码 UTF-16LE，支持 surrogate pairs
				var runes []rune
				for i := 0; i < len(data)-1; i += 2 {
					codeUnit := uint16(data[i]) | (uint16(data[i+1]) << 8)
					if codeUnit >= 0xD800 && codeUnit <= 0xDBFF {
						if i+3 < len(data) {
							lowSurrogate := uint16(data[i+2]) | (uint16(data[i+3]) << 8)
							if lowSurrogate >= 0xDC00 && lowSurrogate <= 0xDFFF {
								codePoint := 0x10000 + ((uint32(codeUnit) - 0xD800) << 10) + (uint32(lowSurrogate) - 0xDC00)
								runes = append(runes, rune(codePoint))
								i += 2
								continue
							}
						}
						runes = append(runes, '\uFFFD')
					} else if codeUnit >= 0xDC00 && codeUnit <= 0xDFFF {
						runes = append(runes, '\uFFFD')
					} else {
						runes = append(runes, rune(codeUnit))
					}
				}
				result = runtime.ToValue(string(runes))
			}
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", encoding)))
		}

		// 注意：不能在这里手动 GC！
		// string(data) 可能引用 data 的底层内存，立即 GC 会导致段错误
		// 让 Go 的 GC 自动管理内存

		return result
	}
	toStringValue := runtime.ToValue(toStringFunc)
	setFunctionNameAndLength(runtime, toStringValue, "toString", 3)
	prototype.Set("toString", toStringValue)

	// 添加 toLocaleString 方法（与 toString 行为一致）
	toLocaleStringFunc := func(call goja.FunctionCall) goja.Value {
		// 直接调用 toString 方法
		return toStringFunc(call)
	}
	toLocaleStringValue := runtime.ToValue(toLocaleStringFunc)
	setFunctionNameAndLength(runtime, toLocaleStringValue, "toLocaleString", 0)
	prototype.Set("toLocaleString", toLocaleStringValue)

	// 添加 copy 方法
	copyFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("The first argument must be one of type Buffer or Uint8Array"))
		}

		// 验证 target 参数类型
		targetArg := call.Arguments[0]
		if goja.IsNull(targetArg) {
			panic(runtime.NewTypeError("The first argument must be one of type Buffer or Uint8Array. Received null"))
		}
		if goja.IsUndefined(targetArg) {
			panic(runtime.NewTypeError("The first argument must be one of type Buffer or Uint8Array. Received undefined"))
		}

		// 检查基本类型
		exportedVal := targetArg.Export()
		if exportedVal == nil {
			panic(runtime.NewTypeError("The first argument must be one of type Buffer or Uint8Array. Received null"))
		}

		// 根据类型生成对应的错误消息
		switch v := exportedVal.(type) {
		case string:
			panic(runtime.NewTypeError(fmt.Sprintf("The first argument must be one of type Buffer or Uint8Array. Received type string ('%s')", v)))
		case bool:
			panic(runtime.NewTypeError(fmt.Sprintf("The first argument must be one of type Buffer or Uint8Array. Received type boolean (%v)", v)))
		case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
			panic(runtime.NewTypeError(fmt.Sprintf("The first argument must be one of type Buffer or Uint8Array. Received type number (%v)", v)))
		case []interface{}:
			// JavaScript 数组
			panic(runtime.NewTypeError("The first argument must be one of type Buffer or Uint8Array. Received an instance of Array"))
		}

		// 尝试转换为对象
		target := targetArg.ToObject(runtime)

		// 对于普通对象，需要额外检查是否有 buffer 特征
		// 检查是否有 length 属性（TypedArray/Buffer 的特征）
		var lengthVal goja.Value
		if target != nil {
			lengthVal = target.Get("length")
		}

		// 检查 lengthVal 是否为 nil 或 undefined
		if target == nil || lengthVal == nil || goja.IsUndefined(lengthVal) {
			// 获取更详细的类型信息
			if target != nil {
				if typeName := target.Get("constructor"); !goja.IsUndefined(typeName) {
					if nameObj := typeName.ToObject(runtime); nameObj != nil {
						if name := nameObj.Get("name"); !goja.IsUndefined(name) {
							panic(runtime.NewTypeError(fmt.Sprintf("The first argument must be one of type Buffer or Uint8Array. Received an instance of %s", name.String())))
						}
					}
				}
			}
			panic(runtime.NewTypeError("The first argument must be one of type Buffer or Uint8Array"))
		}

		// 🔥 严格类型检查：即使有 length 属性，也必须是 Buffer 或 TypedArray
		// 检查 constructor.name 必须是有效的 TypedArray 类型
		isValidType := false
		if constructor := target.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
				if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
					nameStr := name.String()
					validTypes := []string{
						"Buffer", "Uint8Array", "Uint8ClampedArray", "Int8Array",
						"Uint16Array", "Int16Array", "Uint32Array", "Int32Array",
						"Float32Array", "Float64Array", "BigUint64Array", "BigInt64Array",
					}
					for _, validType := range validTypes {
						if nameStr == validType || strings.Contains(nameStr, validType) {
							isValidType = true
							break
						}
					}
					// 如果不是有效类型，抛出错误
					if !isValidType {
						if nameStr == "Object" || nameStr == "object" {
							panic(runtime.NewTypeError("The first argument must be one of type Buffer or Uint8Array. Received an instance of Object"))
						}
						panic(runtime.NewTypeError(fmt.Sprintf("The first argument must be one of type Buffer or Uint8Array. Received an instance of %s", nameStr)))
					}
				}
			}
		}

		targetStart := int64(0)
		sourceStart := int64(0)
		sourceEnd := int64(0)

		// 获取source buffer长度
		thisLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			thisLength = lengthVal.ToInteger()
			sourceEnd = thisLength
		}

		// 解析参数（特殊处理 Infinity/-Infinity/NaN）
		// 🔥 修复：使用 Math.floor 语义而不是 ToInteger，与 Node.js 一致
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			arg := call.Arguments[1]
			floatVal := arg.ToFloat()
			// 检查是否是 NaN、Infinity 或 -Infinity
			if math.IsNaN(floatVal) || math.IsInf(floatVal, 0) {
				// NaN/Infinity/-Infinity 都转换为 0
				targetStart = 0
			} else {
				// 使用 floor 而不是 ToInteger，负数浮点数会向下取整
				targetStart = int64(math.Floor(floatVal))
			}
		}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			arg := call.Arguments[2]
			floatVal := arg.ToFloat()
			if math.IsNaN(floatVal) || math.IsInf(floatVal, 0) {
				// NaN/Infinity/-Infinity 都转换为 0
				sourceStart = 0
			} else {
				// 使用 floor 而不是 ToInteger
				sourceStart = int64(math.Floor(floatVal))
			}
		}
		if len(call.Arguments) > 3 && !goja.IsUndefined(call.Arguments[3]) {
			arg := call.Arguments[3]
			floatVal := arg.ToFloat()
			if math.IsNaN(floatVal) || math.IsInf(floatVal, 0) {
				// NaN/Infinity/-Infinity 都转换为 0
				sourceEnd = 0
			} else {
				// 使用 floor 而不是 ToInteger
				sourceEnd = int64(math.Floor(floatVal))
			}
		}

		// 获取target buffer长度
		// 对于 TypedArray（除 Buffer/Uint8Array），需要使用 byteLength
		// 对于 Buffer/Uint8Array，length 就是字节长度
		targetLength := lengthVal.ToInteger()

		// 检查是否有 byteLength 属性（TypedArray 特征）
		if target != nil {
			if byteLengthVal := target.Get("byteLength"); byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) {
				byteLength := byteLengthVal.ToInteger()
				// 如果 byteLength 和 length 不同，说明这是一个非字节类型的 TypedArray（如 Float32Array）
				// 此时应该使用 byteLength
				if byteLength != targetLength {
					targetLength = byteLength
				}
			}
		}

		// 🔥 修复：Node.js v25.0.0 严格参数验证
		// 负数参数抛出 RangeError
		if targetStart < 0 {
			errObj := newRangeError(runtime, fmt.Sprintf("The value of \"targetStart\" is out of range. It must be >= 0. Received %d", targetStart))
			panic(errObj)
		}
		if sourceStart < 0 {
			errObj := newRangeError(runtime, fmt.Sprintf("The value of \"sourceStart\" is out of range. It must be >= 0 && <= %d. Received %d", thisLength, sourceStart))
			panic(errObj)
		}
		if sourceEnd < 0 {
			errObj := newRangeError(runtime, fmt.Sprintf("The value of \"sourceEnd\" is out of range. It must be >= 0. Received %d", sourceEnd))
			panic(errObj)
		}

		// 🔥 修复：sourceStart 超出范围应抛出错误（Node.js v25.0.0）
		if sourceStart > thisLength {
			errObj := newRangeError(runtime, fmt.Sprintf("The value of \"sourceStart\" is out of range. It must be >= 0 && <= %d. Received %d", thisLength, sourceStart))
			panic(errObj)
		}

		// 边界夹取（超出上界时夹取，但 sourceStart 已经在上面检查过）
		if sourceEnd > thisLength {
			sourceEnd = thisLength
		}
		if sourceEnd < sourceStart {
			sourceEnd = sourceStart
		}
		if targetStart > targetLength {
			targetStart = targetLength
		}

		// 计算 copyLength
		copyLength := sourceEnd - sourceStart
		if copyLength > (targetLength - targetStart) {
			copyLength = targetLength - targetStart
		}
		if copyLength < 0 {
			copyLength = 0
		}

		// 判断是否共享同一 ArrayBuffer（即使对象不同）
		sameAB := false
		if target != nil {
			thisAB := this.Get("buffer")
			targetAB := target.Get("buffer")
			if thisAB != nil && targetAB != nil && !goja.IsUndefined(thisAB) && !goja.IsUndefined(targetAB) {
				// 比较 ArrayBuffer 是否相同
				if thisAB.Export() == targetAB.Export() {
					sameAB = true
				}
			}
		}

		// 计算绝对偏移范围
		thisBase := int64(0)
		targetBase := int64(0)
		if v := this.Get("byteOffset"); !goja.IsUndefined(v) {
			thisBase = v.ToInteger()
		}
		if target != nil {
			if v := target.Get("byteOffset"); v != nil && !goja.IsUndefined(v) {
				targetBase = v.ToInteger()
			}
		}

		srcAbsStart := thisBase + sourceStart
		srcAbsEnd := thisBase + sourceEnd
		dstAbsStart := targetBase + targetStart
		dstAbsEnd := dstAbsStart + copyLength

		// 只要共享 ArrayBuffer 且区间相交，就按 memmove 语义处理
		if sameAB && copyLength > 0 && dstAbsStart < srcAbsEnd && dstAbsEnd > srcAbsStart {
			// 🔥 性能优化：直接使用底层字节数组的 memmove 语义
			thisArrayBufferVal := this.Get("buffer")
			if !goja.IsUndefined(thisArrayBufferVal) && thisArrayBufferVal != nil {
				if arrayBuffer, ok := thisArrayBufferVal.Export().(goja.ArrayBuffer); ok {
					srcBytes := arrayBuffer.Bytes()
					// Go 的 copy() 自动处理重叠情况（memmove 语义）
					srcStart := srcAbsStart
					srcEnd := srcAbsEnd
					dstStart := dstAbsStart

					if srcStart >= 0 && srcEnd <= int64(len(srcBytes)) &&
						dstStart >= 0 && dstStart < int64(len(srcBytes)) {
						// 🔥 优化：使用快速 memmove
						srcSlice := srcBytes[srcStart:srcEnd]
						dstSlice := srcBytes[dstStart:]
						copied := FastMemmove(dstSlice, srcSlice)
						return runtime.ToValue(int64(copied))
					}
				}
			}

			// 🔥 回退：先读取所有数据到临时缓冲区，避免读写冲突
			tempData := make([]goja.Value, copyLength)
			for i := int64(0); i < copyLength; i++ {
				tempData[i] = this.Get(getIndexString(sourceStart + i))
			}

			// 检查是否需要字节级写入
			needsByteLevel := false
			if target != nil {
				if constructor := target.Get("constructor"); !goja.IsUndefined(constructor) {
					if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
						if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
							nameStr := name.String()
							if nameStr != "Buffer" && nameStr != "Uint8Array" &&
								(strings.Contains(nameStr, "Array") || strings.Contains(nameStr, "Int") || strings.Contains(nameStr, "Float")) {
								needsByteLevel = true
							}
						}
					}
				}
			}

			// 然后写入目标
			if target != nil {
				if needsByteLevel {
					// 字节级写入
					if bufferVal := target.Get("buffer"); !goja.IsUndefined(bufferVal) && bufferVal != nil {
						targetByteOffset := int64(0)
						if offsetVal := target.Get("byteOffset"); !goja.IsUndefined(offsetVal) && offsetVal != nil {
							targetByteOffset = offsetVal.ToInteger()
						}
						uint8ArrayConstructor := runtime.Get("Uint8Array")
						if uint8ArrayCtor, ok := goja.AssertFunction(uint8ArrayConstructor); ok {
							byteView, err := uint8ArrayCtor(goja.Undefined(), bufferVal)
							if err == nil && byteView != nil {
								byteViewObj := byteView.ToObject(runtime)
								if byteViewObj != nil {
									for i := int64(0); i < copyLength; i++ {
										byteIndex := targetByteOffset + targetStart + i
										byteViewObj.Set(getIndexString(byteIndex), tempData[i])
									}
									return runtime.ToValue(copyLength)
								}
							}
						}
					}
				}

				// 普通写入
				for i := int64(0); i < copyLength; i++ {
					target.Set(getIndexString(targetStart+i), tempData[i])
				}
			}
			return runtime.ToValue(copyLength)
		}

		// 非重叠情况：直接复制
		// 🔥 性能优化：尝试使用底层 ArrayBuffer 的字节切片进行快速复制
		// 如果源和目标都有 ArrayBuffer，我们可以直接操作字节数组
		thisAB := this.Get("buffer")
		targetAB := target.Get("buffer")

		if !goja.IsUndefined(thisAB) && !goja.IsUndefined(targetAB) && thisAB != nil && targetAB != nil {
			// 尝试获取底层字节数组
			if thisArrayBuffer, ok1 := thisAB.Export().(goja.ArrayBuffer); ok1 {
				if targetArrayBuffer, ok2 := targetAB.Export().(goja.ArrayBuffer); ok2 {
					// 获取字节偏移
					thisOffset := int64(0)
					targetOffset := int64(0)
					if v := this.Get("byteOffset"); !goja.IsUndefined(v) {
						thisOffset = v.ToInteger()
					}
					if v := target.Get("byteOffset"); !goja.IsUndefined(v) {
						targetOffset = v.ToInteger()
					}

					// 🔥 快速路径：直接 copy 字节切片
					srcBytes := thisArrayBuffer.Bytes()
					dstBytes := targetArrayBuffer.Bytes()

					srcStart := thisOffset + sourceStart
					srcEnd := thisOffset + sourceEnd
					dstStart := targetOffset + targetStart

					// 安全检查
					if srcStart >= 0 && srcEnd <= int64(len(srcBytes)) &&
						dstStart >= 0 && dstStart < int64(len(dstBytes)) {
						// 使用优化的复制函数
						srcSlice := srcBytes[srcStart:srcEnd]
						dstSlice := dstBytes[dstStart:]
						copied := OptimizedCopy(dstSlice, srcSlice)
						return runtime.ToValue(int64(copied))
					}
				}
			}
		}

		// 🔥 回退：检查是否需要使用字节级别的复制
		needsByteLevel := false
		if target != nil {
			// 检查 target 的 constructor.name
			if constructor := target.Get("constructor"); !goja.IsUndefined(constructor) {
				if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
					if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
						nameStr := name.String()
						// 对于非 Uint8Array 的 TypedArray，需要字节级复制
						if nameStr != "Buffer" && nameStr != "Uint8Array" &&
							(strings.Contains(nameStr, "Array") || strings.Contains(nameStr, "Int") || strings.Contains(nameStr, "Float")) {
							needsByteLevel = true
						}
					}
				}
			}
		}

		written := int64(0)
		if target != nil {
			if needsByteLevel {
				// 🔥 字节级复制：获取 target.buffer 并创建 Uint8Array 视图
				if bufferVal := target.Get("buffer"); !goja.IsUndefined(bufferVal) && bufferVal != nil {
					if bufferObj := bufferVal.ToObject(runtime); bufferObj != nil {
						// 获取 byteOffset
						targetByteOffset := int64(0)
						if offsetVal := target.Get("byteOffset"); !goja.IsUndefined(offsetVal) && offsetVal != nil {
							targetByteOffset = offsetVal.ToInteger()
						}

						// 通过 runtime 创建 Uint8Array 视图
						uint8ArrayConstructor := runtime.Get("Uint8Array")
						if uint8ArrayCtor, ok := goja.AssertFunction(uint8ArrayConstructor); ok {
							// 创建 Uint8Array 视图：new Uint8Array(buffer)
							byteView, err := uint8ArrayCtor(goja.Undefined(), bufferVal)
							if err == nil && byteView != nil {
								byteViewObj := byteView.ToObject(runtime)
								if byteViewObj != nil {
									// 🔥 性能优化：对于大 Buffer，使用批量复制
									if shouldUseFastPath(copyLength) {
										// 尝试批量导出和复制
										sourceSlice := be.exportBufferRange(runtime, this, sourceStart, sourceStart+copyLength)
										if sourceSlice != nil {
											// 写入到目标
											for i := int64(0); i < copyLength; i++ {
												byteIndex := targetByteOffset + targetStart + i
												byteViewObj.Set(getIndexString(byteIndex), runtime.ToValue(sourceSlice[i]))
											}
											return runtime.ToValue(copyLength)
										}
									}
									// 回退到逐字节复制
									for i := int64(0); i < copyLength; i++ {
										if val := this.Get(getIndexString(sourceStart + i)); !goja.IsUndefined(val) {
											// 写入到字节偏移位置
											byteIndex := targetByteOffset + targetStart + i
											byteViewObj.Set(getIndexString(byteIndex), val)
											written++
										}
									}
									return runtime.ToValue(written)
								}
							}
						}
					}
				}
			}

			// 🔥 性能优化：对于大 Buffer，使用批量复制
			if shouldUseFastPath(copyLength) {
				// 尝试批量导出和复制
				sourceSlice := be.exportBufferRange(runtime, this, sourceStart, sourceStart+copyLength)
				if sourceSlice != nil {
					// 写入到目标
					for i := int64(0); i < copyLength; i++ {
						target.Set(getIndexString(targetStart+i), runtime.ToValue(sourceSlice[i]))
					}
					return runtime.ToValue(copyLength)
				}
			}

			// 普通复制（Buffer 或 Uint8Array）
			for i := int64(0); i < copyLength; i++ {
				if val := this.Get(getIndexString(sourceStart + i)); !goja.IsUndefined(val) {
					target.Set(getIndexString(targetStart+i), val)
					written++
				}
			}
		}

		return runtime.ToValue(written)
	}
	copyValue := runtime.ToValue(copyFunc)
	setFunctionNameAndLength(runtime, copyValue, "copy", 4)
	prototype.Set("copy", copyValue)

	// 添加 compare 方法
	// 🔥 修复：支持范围参数 compare(target, targetStart, targetEnd, sourceStart, sourceEnd)
	// 🔥 100% 对齐 Node.js v25.0.0 行为：严格参数验证
	compareFunc := func(call goja.FunctionCall) goja.Value {
		// 先检查 call.This 是否为 null 或 undefined
		if goja.IsNull(call.This) || goja.IsUndefined(call.This) {
			panic(runtime.NewTypeError("Method buffer.prototype.compare called on incompatible receiver"))
		}

		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("Method buffer.prototype.compare called on incompatible receiver"))
		}
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("The \"target\" argument must be an instance of Buffer or Uint8Array. Received undefined"))
		}

		// 验证 target 参数类型
		targetArg := call.Arguments[0]
		if goja.IsNull(targetArg) {
			panic(runtime.NewTypeError("The \"target\" argument must be an instance of Buffer or Uint8Array. Received null"))
		}
		if goja.IsUndefined(targetArg) {
			panic(runtime.NewTypeError("The \"target\" argument must be an instance of Buffer or Uint8Array. Received undefined"))
		}

		// 先检查是否是基本类型，避免 ToObject 导致 nil
		exportedVal := targetArg.Export()
		if exportedVal == nil {
			panic(runtime.NewTypeError("The \"target\" argument must be an instance of Buffer or Uint8Array. Received null"))
		}

		// 根据类型生成对应的错误消息
		switch v := exportedVal.(type) {
		case string:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"target\" argument must be an instance of Buffer or Uint8Array. Received type string ('%s')", v)))
		case int, int8, int16, int32, int64:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"target\" argument must be an instance of Buffer or Uint8Array. Received type number (%v)", v)))
		case uint, uint8, uint16, uint32, uint64:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"target\" argument must be an instance of Buffer or Uint8Array. Received type number (%v)", v)))
		case float32, float64:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"target\" argument must be an instance of Buffer or Uint8Array. Received type number (%v)", v)))
		case bool:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"target\" argument must be an instance of Buffer or Uint8Array. Received type boolean (%v)", v)))
		}

		// 转换为对象
		target := targetArg.ToObject(runtime)
		if target == nil {
			panic(runtime.NewTypeError(fmt.Sprintf("The \"target\" argument must be an instance of Buffer or Uint8Array. Received %v", targetArg.String())))
		}

		// 🔥 Node.js v25.0.0 严格类型检查：只接受 Buffer 和 Uint8Array
		// 验证 target 是否有 length 属性
		lengthVal := target.Get("length")
		if lengthVal == nil || goja.IsUndefined(lengthVal) {
			panic(runtime.NewTypeError("The \"target\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object"))
		}

		// 使用严格的类型检查
		if !isBufferOrUint8Array(runtime, target) {
			// 获取详细的错误信息
			errorMsg := getDetailedTypeError(runtime, target, "target")
			panic(runtime.NewTypeError(errorMsg))
		}

		// 获取两个buffer的长度
		thisLength := int64(0)
		targetLength := int64(0)

		// 检查 this 也必须是 Buffer 或 Uint8Array
		if !isBufferOrUint8Array(runtime, this) {
			panic(runtime.NewTypeError("Method buffer.prototype.compare called on incompatible receiver"))
		}

		thisLengthVal := this.Get("length")
		if thisLengthVal == nil || goja.IsUndefined(thisLengthVal) {
			panic(runtime.NewTypeError("Method buffer.prototype.compare called on incompatible receiver"))
		}
		thisLength = thisLengthVal.ToInteger()
		targetLength = lengthVal.ToInteger()

		// 🔥 新增：解析范围参数并进行严格验证（Node.js v25.0.0 行为）
		targetStart := int64(0)
		targetEnd := targetLength
		sourceStart := int64(0)
		sourceEnd := thisLength

		// validateOffset 辅助函数：验证参数必须是有效整数且在范围内
		validateOffset := func(val goja.Value, name string, min, max int64) int64 {
			if goja.IsUndefined(val) {
				if name == "targetEnd" {
					return max
				}
				if name == "sourceEnd" {
					return max
				}
				return min
			}

			// 🔥 Node.js v25 严格类型检查：必须是 number 类型
			// 先检查 null
			if goja.IsNull(val) {
				panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number. Received null", name)))
			}

			exportedVal := val.Export()
			if exportedVal == nil {
				panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number. Received null", name)))
			}

			// 🔥 检查 BigInt - 必须在转换前检查，因为 ToFloat 会报错
			if valObj := val.ToObject(runtime); valObj != nil {
				if constructor := valObj.Get("constructor"); !goja.IsUndefined(constructor) {
					if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
						if constructorName := constructorObj.Get("name"); !goja.IsUndefined(constructorName) {
							nameStr := constructorName.String()
							// 特殊处理 BigInt
							if nameStr == "BigInt" {
								// 尝试获取 BigInt 的字符串表示
								bigintStr := "0n"
								if toStringMethod := valObj.Get("toString"); !goja.IsUndefined(toStringMethod) {
									if toStringFunc, ok := goja.AssertFunction(toStringMethod); ok {
										if result, err := toStringFunc(valObj); err == nil {
											bigintStr = result.String() + "n"
										}
									}
								}
								panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number. Received type bigint (%s)", name, bigintStr)))
							}
							// 排除其他非数字对象
							if nameStr == "Object" || nameStr == "Array" || nameStr == "Function" {
								panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number. Received an instance of %s", name, nameStr)))
							}
						}
					}
				}
			}

			switch v := exportedVal.(type) {
			case string:
				panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number. Received type string ('%s')", name, v)))
			case bool:
				panic(runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number. Received type boolean (%v)", name, v)))
			}

			// 检查是否是 NaN
			if val.ToFloat() != val.ToFloat() { // NaN != NaN
				errObj := newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received NaN", name))
				panic(errObj)
			}

			// 检查是否是 Infinity
			floatVal := val.ToFloat()
			if math.IsInf(floatVal, 1) {
				errObj := newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received Infinity", name))
				panic(errObj)
			}
			if math.IsInf(floatVal, -1) {
				errObj := newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received -Infinity", name))
				panic(errObj)
			}

			// 检查是否是整数（小数会被拒绝）
			if floatVal != math.Floor(floatVal) {
				errObj := newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received %v", name, floatVal))
				panic(errObj)
			}

			intVal := val.ToInteger()

			// 检查范围
			if intVal < min {
				errObj := newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be >= %d && <= %d. Received %d", name, min, MaxSafeInteger, intVal))
				panic(errObj)
			}
			if intVal > max {
				errObj := newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be >= %d && <= %d. Received %d", name, min, max, intVal))
				panic(errObj)
			}

			return intVal
		}

		if len(call.Arguments) > 1 {
			targetStart = validateOffset(call.Arguments[1], "targetStart", 0, MaxSafeInteger)
		}
		if len(call.Arguments) > 2 {
			targetEnd = validateOffset(call.Arguments[2], "targetEnd", 0, targetLength)
		}
		if len(call.Arguments) > 3 {
			sourceStart = validateOffset(call.Arguments[3], "sourceStart", 0, MaxSafeInteger)
		}
		if len(call.Arguments) > 4 {
			sourceEnd = validateOffset(call.Arguments[4], "sourceEnd", 0, thisLength)
		}

		// 边界检查（Node.js 行为：start > end 时修正为空范围）
		if targetStart >= targetEnd {
			targetEnd = targetStart
		}
		if sourceStart >= sourceEnd {
			sourceEnd = sourceStart
		}

		// 计算比较长度
		targetCompareLength := targetEnd - targetStart
		sourceCompareLength := sourceEnd - sourceStart
		minLength := targetCompareLength
		if sourceCompareLength < minLength {
			minLength = sourceCompareLength
		}

		// 🔥 性能优化：对于大 Buffer（>1MB），使用批量比较
		if shouldUseFastPath(minLength) {
			// 尝试批量导出数据到 Go []byte 进行比较
			thisCompareBytes := be.exportBufferRange(runtime, this, sourceStart, sourceEnd)
			targetCompareBytes := be.exportBufferRange(runtime, target, targetStart, targetEnd)

			if thisCompareBytes != nil && targetCompareBytes != nil {
				if len(thisCompareBytes) == len(targetCompareBytes) {
					// 使用 Go 的 bytes.Compare 进行快速比较
					result := bytes.Compare(thisCompareBytes, targetCompareBytes)
					return runtime.ToValue(result)
				}
			}
			// 如果批量导出失败，回退到逐字节比较
		}

		// 🔥 性能优化：使用批量预计算减少重复操作
		// 预计算字符串索引，减少函数调用开销
		for i := int64(0); i < minLength; i++ {
			thisVal := int64(0)
			targetVal := int64(0)

			// 使用优化的索引字符串获取
			thisIdx := sourceStart + i
			targetIdx := targetStart + i

			thisIdxStr := getIndexString(thisIdx)
			if val := this.Get(thisIdxStr); val != nil && !goja.IsUndefined(val) {
				thisVal = val.ToInteger() & 0xFF
			}

			targetIdxStr := getIndexString(targetIdx)
			if val := target.Get(targetIdxStr); val != nil && !goja.IsUndefined(val) {
				targetVal = val.ToInteger() & 0xFF
			}

			if thisVal < targetVal {
				return runtime.ToValue(-1)
			}
			if thisVal > targetVal {
				return runtime.ToValue(1)
			}
		}

		// 如果所有比较的字节都相等，比较长度
		if sourceCompareLength < targetCompareLength {
			return runtime.ToValue(-1)
		}
		if sourceCompareLength > targetCompareLength {
			return runtime.ToValue(1)
		}
		return runtime.ToValue(0)
	}
	compareValue := runtime.ToValue(compareFunc)
	setFunctionNameAndLength(runtime, compareValue, "compare", 5)
	prototype.Set("compare", compareValue)

	// 添加 equals 方法
	equalsFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("Method get TypedArray.prototype.equals called on incompatible receiver"))
		}

		// 🔥 验证 this 是否是 Buffer 或 Uint8Array 实例
		// 检查 this 是否有 length 属性
		thisLengthVal := this.Get("length")
		if thisLengthVal == nil || goja.IsUndefined(thisLengthVal) {
			panic(runtime.NewTypeError("Method get TypedArray.prototype.equals called on incompatible receiver"))
		}

		// 检查 this 是否是 Buffer 实例
		isThisBuffer := false
		bufferConstructor := runtime.Get("Buffer")
		if !goja.IsUndefined(bufferConstructor) {
			if bufferCtor := bufferConstructor.ToObject(runtime); bufferCtor != nil {
				if prototype := bufferCtor.Get("prototype"); !goja.IsUndefined(prototype) {
					if protoObj := prototype.ToObject(runtime); protoObj != nil {
						objProto := this.Prototype()
						if objProto != nil && objProto == protoObj {
							isThisBuffer = true
						}
					}
				}
			}
		}

		// 检查 this 是否是 Uint8Array 实例
		isThisUint8Array := false
		if constructor := this.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
				if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
					nameStr := name.String()
					if nameStr == "Uint8Array" {
						if bytesPerElement := this.Get("BYTES_PER_ELEMENT"); !goja.IsUndefined(bytesPerElement) {
							isThisUint8Array = true
						}
					}
				}
			}
		}

		// 如果 this 既不是 Buffer 也不是 Uint8Array，抛出错误
		if !isThisBuffer && !isThisUint8Array {
			panic(runtime.NewTypeError("Method get TypedArray.prototype.equals called on incompatible receiver"))
		}

		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received undefined"))
		}

		// 🔥 复用 compare 方法的类型验证逻辑
		otherBufferArg := call.Arguments[0]
		if goja.IsNull(otherBufferArg) {
			panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received null"))
		}
		if goja.IsUndefined(otherBufferArg) {
			panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received undefined"))
		}

		// 先检查是否是基本类型
		exportedVal := otherBufferArg.Export()
		if exportedVal == nil {
			panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received null"))
		}

		// 根据类型生成对应的错误消息
		switch v := exportedVal.(type) {
		case string:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received type string ('%s')", v)))
		case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received type number (%v)", v)))
		case bool:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received type boolean (%v)", v)))
		}

		// 转换为对象
		target := otherBufferArg.ToObject(runtime)
		if target == nil {
			panic(runtime.NewTypeError(fmt.Sprintf("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received %v", otherBufferArg.String())))
		}

		// 检查 constructor.name 以快速排除常见的非 Buffer 类型
		if constructor := target.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
				if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
					nameStr := name.String()
					switch nameStr {
					case "Array":
						panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received an instance of Array"))
					case "Function":
						panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received function "))
					case "RegExp":
						panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received an instance of RegExp"))
					case "Date":
						panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received an instance of Date"))
					case "DataView":
						panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received an instance of DataView"))
					case "Int8Array", "Uint16Array", "Int16Array", "Uint32Array", "Int32Array", "Float32Array", "Float64Array", "Uint8ClampedArray", "BigInt64Array", "BigUint64Array":
						// 这些 TypedArray 类型不被 equals 接受，只接受 Uint8Array
						panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received an instance of " + nameStr))
					}
				}
			}
		}

		// 验证是否有 length 属性
		lengthVal := target.Get("length")
		if lengthVal == nil || goja.IsUndefined(lengthVal) {
			panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object"))
		}

		// 🔥 严格类型检查：确保是真正的 Buffer 或 Uint8Array 实例
		// 检查是否是 Buffer 实例（通过原型链）
		isBufferInstance := false
		if !goja.IsUndefined(bufferConstructor) {
			if bufferCtor := bufferConstructor.ToObject(runtime); bufferCtor != nil {
				if prototype := bufferCtor.Get("prototype"); !goja.IsUndefined(prototype) {
					if protoObj := prototype.ToObject(runtime); protoObj != nil {
						objProto := target.Prototype()
						if objProto != nil && objProto == protoObj {
							isBufferInstance = true
						}
					}
				}
			}
		}

		// 检查是否是 Uint8Array 实例
		isUint8Array := false
		if constructor := target.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
				if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
					nameStr := name.String()
					if nameStr == "Uint8Array" {
						// 进一步验证：检查是否有 BYTES_PER_ELEMENT 属性
						if bytesPerElement := target.Get("BYTES_PER_ELEMENT"); !goja.IsUndefined(bytesPerElement) {
							isUint8Array = true
						}
					}
				}
			}
		}

		// 如果既不是 Buffer 也不是 Uint8Array，抛出错误
		if !isBufferInstance && !isUint8Array {
			// 检查 constructor.name 以提供更详细的错误信息
			constructorName := "Object"
			if constructor := target.Get("constructor"); !goja.IsUndefined(constructor) {
				if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
					if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
						constructorName = name.String()
					}
				}
			}
			if constructorName == "Object" {
				panic(runtime.NewTypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object"))
			}
			panic(runtime.NewTypeError(fmt.Sprintf("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array. Received an instance of %s", constructorName)))
		}

		// 获取两个buffer的长度
		// 🔥 修复：优先使用 byteLength（只读，不会被 Object.defineProperty 修改）
		// 如果 byteLength 不存在，再使用 length 属性
		thisLength := int64(0)
		targetLength := int64(0)

		// 优先使用 byteLength
		if byteLengthVal := this.Get("byteLength"); !goja.IsUndefined(byteLengthVal) {
			thisLength = byteLengthVal.ToInteger()
		} else if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			thisLength = lengthVal.ToInteger()
		}

		if byteLengthVal := target.Get("byteLength"); !goja.IsUndefined(byteLengthVal) {
			targetLength = byteLengthVal.ToInteger()
		} else if lengthVal := target.Get("length"); !goja.IsUndefined(lengthVal) {
			targetLength = lengthVal.ToInteger()
		}

		// 长度不同直接返回false
		if thisLength != targetLength {
			return runtime.ToValue(false)
		}

		// 🔥 性能优化：对于大 Buffer（>1MB），使用批量比较
		if shouldUseFastPath(thisLength) {
			// 尝试批量导出数据到 Go []byte 进行比较
			thisBytes := be.exportBufferBytesFast(runtime, this, thisLength)
			targetBytes := be.exportBufferBytesFast(runtime, target, targetLength)

			if thisBytes != nil && targetBytes != nil {
				// 使用 Go 的 bytes.Equal 进行快速比较（原生实现，非常快）
				if len(thisBytes) == len(targetBytes) {
					return runtime.ToValue(bytes.Equal(thisBytes, targetBytes))
				}
			}
			// 如果批量导出失败，回退到逐字节比较
		}

		// 🔥 性能优化：对于小 Buffer，使用优化的逐字节比较
		// 使用预分配的索引字符串缓存（如果可能）
		for i := int64(0); i < thisLength; i++ {
			thisVal := int64(0)
			targetVal := int64(0)

			// 优化：使用缓存的索引字符串（如果可用）
			idxStr := getIndexString(i)
			if val := this.Get(idxStr); val != nil && !goja.IsUndefined(val) {
				thisVal = val.ToInteger() & 0xFF
			}
			if val := target.Get(idxStr); val != nil && !goja.IsUndefined(val) {
				targetVal = val.ToInteger() & 0xFF
			}

			if thisVal != targetVal {
				return runtime.ToValue(false)
			}
		}

		return runtime.ToValue(true)
	}
	equalsValue := runtime.ToValue(equalsFunc)
	setFunctionNameAndLength(runtime, equalsValue, "equals", 1)
	prototype.Set("equals", equalsValue)

	// 添加 fill 方法
	fillFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		value := call.Arguments[0]
		offset := int64(0)
		end := int64(0)
		encoding := "utf8"

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
			end = bufferLength
		}

		// 🔥 修复：简化参数解析逻辑（对齐 Node.js v25.0.0）
		// 语法1: buf.fill(value, encoding)  - 2 args
		// 语法2: buf.fill(value, offset, encoding) - 3 args
		// 语法3: buf.fill(value, offset, end, encoding) - 4 args
		// offset/end 必须是数字类型，encoding 可以是字符串或 null/undefined
		argCount := len(call.Arguments)

		// 辅助函数：验证并转换整数参数
		validateIntArg := func(v goja.Value, argName string) int64 {
			if goja.IsNull(v) {
				errObj := runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number. Received null", argName))
				errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
				panic(errObj)
			}
			exportType := v.ExportType()
			if exportType != nil {
				kind := exportType.Kind().String()
				// 检查字符串类型
				if kind == "string" {
					errObj := runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number. Received type string ('%s')", argName, v.String()))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
					panic(errObj)
				}
				// 检查 boolean 类型
				if kind == "bool" {
					errObj := runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number. Received type boolean (%v)", argName, v.ToBoolean()))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
					panic(errObj)
				}
			}
			// 检查对象类型（非数字、非字符串、非布尔）
			val := v.Export()
			if val != nil {
				switch val.(type) {
				case float64, int, int64, int32, uint, uint64, uint32:
					// 数字类型，继续处理
				default:
					// 其他类型（对象、数组等）
					errObj := runtime.NewTypeError(fmt.Sprintf("The \"%s\" argument must be of type number. Received an instance of Object", argName))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
					panic(errObj)
				}
			}
			// 检查 NaN, Infinity, 浮点数
			if exportType != nil {
				if f, ok := val.(float64); ok {
					// 检查 NaN
					if f != f {
						errObj := newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received NaN", argName))
						panic(errObj)
					}
					// 检查 Infinity
					if f == math.Inf(1) || f == math.Inf(-1) {
						errObj := newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received %v", argName, f))
						panic(errObj)
					}
					// 检查是否为整数
					if f != float64(int64(f)) {
						errObj := newRangeError(runtime, fmt.Sprintf("The value of \"%s\" is out of range. It must be an integer. Received %v", argName, f))
						panic(errObj)
					}
				}
			}
			return v.ToInteger()
		}

		// 辅助函数：判断是否为字符串类型
		isStringType := func(v goja.Value) bool {
			if goja.IsNull(v) || goja.IsUndefined(v) {
				return false
			}
			exportType := v.ExportType()
			if exportType == nil {
				return false
			}
			return exportType.Kind().String() == "string"
		}

		// 🔥 关键：参数解析取决于 value 的类型
		// 当 value 是字符串时，第2个参数的字符串可以是 encoding
		// 当 value 不是字符串时，第2个参数必须是数字（offset）
		valueIsString := value.ExportType() != nil && value.ExportType().Kind().String() == "string"

		// 标记 arg1 是否被解析为 offset
		arg1IsOffset := false

		// 解析参数
		if argCount >= 2 && !goja.IsUndefined(call.Arguments[1]) {
			arg1 := call.Arguments[1]
			// arg1 可能是 offset 或 encoding（仅当 value 是字符串时）
			if isStringType(arg1) {
				if valueIsString {
					// value 是字符串，arg1 可以是 encoding
					encoding = arg1.String()
				} else {
					// value 不是字符串，arg1 必须是数字
					// 字符串会导致类型错误
					offset = validateIntArg(arg1, "offset")
					arg1IsOffset = true
				}
			} else {
				// arg1 不是字符串，作为 offset
				offset = validateIntArg(arg1, "offset")
				arg1IsOffset = true
			}
		}

		if argCount >= 3 && !goja.IsUndefined(call.Arguments[2]) {
			arg2 := call.Arguments[2]
			// arg2 的解析取决于 arg1 是否为 offset 以及 value 的类型
			if arg1IsOffset {
				// 如果 arg1 是 offset，那么 arg2 可能是 end 或 encoding
				// 但只有当 value 是字符串时，arg2 才能是 encoding
				if isStringType(arg2) && valueIsString {
					// value 是字符串，arg2 是字符串 -> encoding（没有 end）
					encoding = arg2.String()
				} else {
					// 否则 arg2 必须是 end（必须是数字）
					// 如果 arg2 是字符串但 value 不是字符串，会抛出类型错误
					end = validateIntArg(arg2, "end")
				}
			} else {
				// 如果 arg1 不是 offset（是 encoding），那么 arg2 必须是数字（offset）
				// 这种情况下：fill(value, encoding, offset) - 但这不是有效的语法
				// 实际上这种情况不应该发生，因为如果 arg1 是 encoding，就不应该有 arg2 作为 offset
				// 所以 arg2 应该被当作 end，但没有 offset，这会导致错误
				// 为了安全，我们将 arg2 当作 offset
				offset = validateIntArg(arg2, "offset")
			}
		}

		if argCount >= 4 {
			// arg3 只能是 encoding（可以是 null/undefined）
			if !goja.IsUndefined(call.Arguments[3]) && !goja.IsNull(call.Arguments[3]) {
				encoding = call.Arguments[3].String()
			}
		}

		// 🔥 修复：编码大小写不敏感
		encoding = strings.ToLower(encoding)

		// 🔥 验证编码是否有效
		validEncodings := map[string]bool{
			"utf8": true, "utf-8": true,
			"hex":    true,
			"base64": true, "base64url": true,
			"latin1": true, "binary": true,
			"ascii":   true,
			"utf16le": true, "ucs2": true, "ucs-2": true, "utf-16le": true,
			"": true, // 空字符串使用默认编码
		}
		if !validEncodings[encoding] && encoding != "" {
			errObj := newRangeError(runtime, fmt.Sprintf("Unknown encoding: %s", encoding))
			errObj.Set("code", runtime.ToValue("ERR_UNKNOWN_ENCODING"))
			errObj.Set("name", runtime.ToValue("TypeError"))
			panic(errObj)
		}
		if encoding == "" {
			encoding = "utf8"
		}

		// 🔥 修复：严格的边界检查（对齐 Node.js v25.0.0）
		// Node.js 的检查顺序：先检查 offset 负数，再检查 end 范围，最后检查 offset 超出

		// 1. 检查 offset 是否为负数
		if offset < 0 {
			errObj := newRangeError(runtime, fmt.Sprintf("The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d", MaxSafeInteger, offset))
			panic(errObj)
		}

		// 2. 检查 end 是否在有效范围内（包括负数和超出）
		if end < 0 {
			errObj := newRangeError(runtime, fmt.Sprintf("The value of \"end\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength, end))
			panic(errObj)
		}
		if end > bufferLength {
			errObj := newRangeError(runtime, fmt.Sprintf("The value of \"end\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength, end))
			panic(errObj)
		}

		// 3. 检查 offset 是否超出范围（静默处理）
		// Node.js v25.0.0 行为：offset >= length 时不填充，静默返回
		if offset > bufferLength {
			// 静默处理：不抛错，直接返回
			return this
		}

		if offset >= end {
			return this
		}

		// 处理填充值
		var fillData []byte

		// 🔥 修复：先判断类型，优先处理特殊值
		// 🔥 首先检查 Symbol - 必须在其他类型检查之前
		assertNotSymbol(runtime, value, "Cannot convert a Symbol value to a number")

		// 处理 undefined, null, boolean 等特殊值
		if goja.IsUndefined(value) {
			fillData = []byte{0}
		} else if goja.IsNull(value) {
			fillData = []byte{0}
		} else if value.ExportType() != nil && value.ExportType().Kind().String() == "bool" {
			// boolean 类型：true -> 1, false -> 0
			if value.ToBoolean() {
				fillData = []byte{1}
			} else {
				fillData = []byte{0}
			}
		} else if value.ExportType() != nil && (value.ExportType().Kind().String() == "float64" || value.ExportType().Kind().String() == "int64") {
			// 数字类型
			// 🔥 检查 NaN, Infinity 等特殊值
			if val := value.Export(); val != nil {
				if f, ok := val.(float64); ok {
					// NaN, Infinity, -Infinity 都应该填充为 0
					if f != f || f == math.Inf(1) || f == math.Inf(-1) {
						fillData = []byte{0}
					} else {
						numVal := value.ToInteger()
						fillData = []byte{byte(numVal & 0xFF)}
					}
				} else {
					numVal := value.ToInteger()
					fillData = []byte{byte(numVal & 0xFF)}
				}
			} else {
				fillData = []byte{0}
			}
		} else if value.ExportType() != nil && value.ExportType().Kind().String() == "string" {
			// 字符串类型
			fillStr := value.String()
			if fillStr == "" {
				fillData = []byte{0}
			} else {
				// 🔥 修复：支持所有编码（与 from/write 一致）
				switch encoding {
				case "utf8", "utf-8":
					fillData = []byte(fillStr)
				case "hex":
					// 🔥 修复：Node.js v25.0.0 hex 处理逻辑
					// 只使用有效的 hex 字符，遇到无效字符时截断
					validHex := ""
					for _, r := range fillStr {
						if (r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F') {
							validHex += string(r)
						} else {
							// 遇到无效字符，停止
							break
						}
					}

					if validHex == "" {
						// 没有有效的 hex 字符，抛出异常
						errObj := runtime.NewTypeError(fmt.Sprintf("The argument 'value' is invalid. Received '%s'", fillStr))
						errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_VALUE"))
						panic(errObj)
					}

					// 只使用偶数长度部分
					if len(validHex)%2 == 1 {
						validHex = validHex[:len(validHex)-1]
					}

					if validHex == "" {
						// 只有一个 hex 字符，无法解码
						errObj := runtime.NewTypeError(fmt.Sprintf("The argument 'value' is invalid. Received '%s'", fillStr))
						errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_VALUE"))
						panic(errObj)
					}

					decoded, err := hex.DecodeString(validHex)
					if err != nil {
						errObj := runtime.NewTypeError(fmt.Sprintf("The argument 'value' is invalid. Received '%s'", fillStr))
						errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_VALUE"))
						panic(errObj)
					}
					fillData = decoded
				case "base64":
					decoded, err := decodeBase64Lenient(fillStr)
					if err != nil {
						fillData = []byte(fillStr)
					} else {
						fillData = decoded
					}
				case "base64url":
					decoded, err := decodeBase64URLLenient(fillStr)
					if err != nil {
						fillData = []byte(fillStr)
					} else {
						fillData = decoded
					}
				case "latin1", "binary":
					// Latin1: 每个 UTF-16 码元的低 8 位
					codeUnits := stringToUTF16CodeUnits(fillStr)
					fillData = make([]byte, len(codeUnits))
					for i, unit := range codeUnits {
						fillData[i] = byte(unit & 0xFF)
					}
				case "ascii":
					// 🔥 修复：Node.js 的 ASCII 编码实际上取低 8 位，与 latin1 相同
					// 这与标准 ASCII（7位）不同，但这是 Node.js 的行为
					codeUnits := stringToUTF16CodeUnits(fillStr)
					fillData = make([]byte, len(codeUnits))
					for i, unit := range codeUnits {
						fillData[i] = byte(unit & 0xFF)
					}
				case "utf16le", "ucs2", "ucs-2", "utf-16le":
					// UTF-16LE 编码
					byteCount := utf16CodeUnitCount(fillStr) * 2
					b := make([]byte, byteCount)
					off := 0
					for _, r := range fillStr {
						if r <= 0xFFFF {
							b[off] = byte(r)
							b[off+1] = byte(r >> 8)
							off += 2
						} else {
							rp := r - 0x10000
							hi := uint16(0xD800 + (rp >> 10))
							lo := uint16(0xDC00 + (rp & 0x3FF))
							b[off] = byte(hi)
							b[off+1] = byte(hi >> 8)
							off += 2
							b[off] = byte(lo)
							b[off+1] = byte(lo >> 8)
							off += 2
						}
					}
					fillData = b
				default:
					fillData = []byte(fillStr)
				}
			}
		} else {
			// 🔥 修复：检查特殊类型（Symbol、BigInt）
			// 先检查是否是 Symbol 或 BigInt，这些类型应该抛出异常
			// 检查 Symbol：尝试调用 Symbol.for 来判断
			assertNotSymbol(runtime, value, "Cannot convert a Symbol value to a number")

			// 🔥 修复：检查函数类型
			// 函数应该转换为 0，而不是抛出错误
			if callable, ok := goja.AssertFunction(value); ok && callable != nil {
				fillData = []byte{0}
			} else {
				// 🔥 新增：尝试作为 Buffer/Uint8Array
				// 使用 defer 捕获可能的 ToObject panic
				var obj *goja.Object
				var objConversionFailed bool
				func() {
					defer func() {
						if r := recover(); r != nil {
							// ToObject 失败，obj 保持 nil
							obj = nil
							objConversionFailed = true
						}
					}()
					obj = value.ToObject(runtime)
				}()

				if obj != nil && !objConversionFailed {
					// 🔥 修复：检查是否是普通数组（Array.isArray）
					// 普通数组应该转换为 0，而不是作为类数组对象处理
					isArray := false
					if arrayConstructor := runtime.Get("Array"); !goja.IsUndefined(arrayConstructor) {
						if arrayObj := arrayConstructor.ToObject(runtime); arrayObj != nil {
							if isArrayFunc := arrayObj.Get("isArray"); !goja.IsUndefined(isArrayFunc) {
								if callable, ok := goja.AssertFunction(isArrayFunc); ok {
									result, err := callable(goja.Undefined(), value)
									if err == nil && result.ToBoolean() {
										isArray = true
									}
								}
							}
						}
					}

					if isArray {
						// 普通数组转换为 0
						fillData = []byte{0}
						goto fillDataReady
					} else if bufferVal := obj.Get("buffer"); !goja.IsUndefined(bufferVal) && bufferVal != nil {
						// 🔥 修复：DataView 使用其 buffer 属性（ArrayBuffer）
						// DataView 没有数字索引，需要通过 buffer 访问底层数据
						if bufferObj := bufferVal.ToObject(runtime); bufferObj != nil {
							// 尝试从 ArrayBuffer 导出数据
							var bytes []byte
							err := runtime.ExportTo(bufferVal, &bytes)
							if err == nil && bytes != nil {
								// 检查 byteOffset 和 byteLength
								byteOffset := int64(0)
								byteLength := int64(len(bytes))

								if offsetVal := obj.Get("byteOffset"); !goja.IsUndefined(offsetVal) {
									byteOffset = offsetVal.ToInteger()
								}
								if lengthVal := obj.Get("byteLength"); !goja.IsUndefined(lengthVal) {
									byteLength = lengthVal.ToInteger()
								}

								// 提取 DataView 的实际范围
								if byteOffset >= 0 && byteLength > 0 && int64(len(bytes)) >= byteOffset+byteLength {
									fillData = bytes[byteOffset : byteOffset+byteLength]
									goto fillDataReady
								} else if byteLength == 0 {
									// DataView 的 byteLength 为 0，应该抛出错误
									errObj := runtime.NewTypeError(fmt.Sprintf("The argument 'value' is invalid. Received %s", value.String()))
									errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_VALUE"))
									panic(errObj)
								}
							}
						}
						// 如果 buffer 处理失败，继续检查 length
						if lengthVal := obj.Get("length"); !goja.IsUndefined(lengthVal) && lengthVal != nil {
							length := lengthVal.ToInteger()
							if length == 0 {
								// length == 0, 应该抛出错误（与后面的逻辑一致）
								errObj := runtime.NewTypeError(fmt.Sprintf("The argument 'value' is invalid. Received %s", value.String()))
								errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_VALUE"))
								panic(errObj)
							}
							// length > 0, 继续往下处理
						} else {
							// 没有 length，转换为 0
							fillData = []byte{0}
							goto fillDataReady
						}
					}

					// 处理有 length 属性的对象
					if lengthVal := obj.Get("length"); !goja.IsUndefined(lengthVal) && lengthVal != nil {
						length := lengthVal.ToInteger()
						if length > 0 {
							// 🔥 性能优化：对于 Buffer/Uint8Array，使用快速导出
							// 检查是否是字节类型（bytesPerElement == 1）
							bytesPerElement := int64(1)
							if bpeVal := obj.Get("BYTES_PER_ELEMENT"); bpeVal != nil && !goja.IsUndefined(bpeVal) {
								bytesPerElement = bpeVal.ToInteger()
							}

							var typedArrayBytes []byte

							// 如果是字节类型（Buffer/Uint8Array/Int8Array），使用快速路径
							if bytesPerElement == 1 && shouldUseFastPath(length) {
								typedArrayBytes = be.exportBufferBytesFast(runtime, obj, length)
								if typedArrayBytes != nil {
									// ✅ 成功导出，直接使用
									fillData = typedArrayBytes
									goto fillDataReady
								}
							}

							// 降级方案：处理不同类型的 TypedArray
							// 检测 TypedArray 类型
							isFloatArray := false
							isFloat32 := false

							// 获取 constructor.name
							if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
								if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
									if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
										typeName := nameVal.String()
										if typeName == "Float32Array" {
											isFloatArray = true
											isFloat32 = true
										} else if typeName == "Float64Array" {
											isFloatArray = true
											isFloat32 = false
										}
									}
								}
							}

							for i := int64(0); i < length; i++ {
								if val := obj.Get(getIndexString(i)); !goja.IsUndefined(val) {
									// 尝试转换，如果是 BigInt 则特殊处理
									isBigInt := false
									var numVal int64
									var floatVal float64

									func() {
										defer func() {
											if r := recover(); r != nil {
												// 检查是否是 BigInt 转换错误
												if errStr := fmt.Sprint(r); strings.Contains(errStr, "BigInt") {
													isBigInt = true
													// BigInt 需要转换为 8 字节（小端序）
													// 解析 BigInt 字符串（去掉 'n' 后缀）
													strVal := val.String()
													if len(strVal) > 0 && strVal[len(strVal)-1] == 'n' {
														strVal = strVal[:len(strVal)-1]
													}
													// 解析为 int64
													if num, err := strconv.ParseInt(strVal, 10, 64); err == nil {
														numVal = num
													} else {
														numVal = 0
													}
												} else {
													// 其他错误，重新抛出
													panic(r)
												}
											}
										}()
										// 尝试正常转换
										if isFloatArray {
											// 浮点数组：解析为浮点数
											if f, err := strconv.ParseFloat(val.String(), 64); err == nil {
												floatVal = f
											} else {
												floatVal = 0
											}
										} else {
											// 整数数组
											numVal = val.ToInteger()
										}
									}()

									// 根据 bytesPerElement 转换为字节
									if isBigInt {
										// BigInt64Array/BigUint64Array: 8 字节
										for j := 0; j < 8; j++ {
											typedArrayBytes = append(typedArrayBytes, byte((numVal>>(j*8))&0xFF))
										}
									} else if isFloatArray {
										// Float32Array 或 Float64Array
										if isFloat32 {
											// Float32
											bits := math.Float32bits(float32(floatVal))
											for j := 0; j < 4; j++ {
												typedArrayBytes = append(typedArrayBytes, byte((bits>>(j*8))&0xFF))
											}
										} else {
											// Float64
											bits := math.Float64bits(floatVal)
											for j := 0; j < 8; j++ {
												typedArrayBytes = append(typedArrayBytes, byte((bits>>(j*8))&0xFF))
											}
										}
									} else {
										// 整数类型：根据 bytesPerElement
										for j := int64(0); j < bytesPerElement; j++ {
											typedArrayBytes = append(typedArrayBytes, byte((numVal>>(j*8))&0xFF))
										}
									}
								}
							}

							fillData = typedArrayBytes
						} else if length == 0 {
							// 🔥 修复：空 Buffer/Uint8Array 应抛出错误（Node.js v25.0.0）
							errObj := runtime.NewTypeError(fmt.Sprintf("The argument 'value' is invalid. Received %s", value.String()))
							errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_VALUE"))
							panic(errObj)
						}
					} else {
						// 🔥 修复：对象没有 length 属性，应该转换为 0
						// Node.js 行为：{} -> 0
						fillData = []byte{0}
					}
				} else {
					// ToObject 失败，转换为 0
					fillData = []byte{0}
				}
			}
		}

	fillDataReady:
		// 🔥 修复：如果 fillData 仍然为空，说明value类型不支持，应该使用默认处理
		// Node.js v25.0.0: 未知类型转为字符串再转 UTF-8
		if len(fillData) == 0 {
			// 尝试将 value 转为字符串
			strVal := value.String()
			if strVal == "" {
				// 空字符串填充为 0
				fillData = []byte{0}
			} else {
				fillData = []byte(strVal)
			}
		}

		// 填充buffer - 性能优化版
		fillIndex := 0
		for i := offset; i < end; i++ {
			// 优化：预计算索引和填充值，减少重复计算
			indexStr := getIndexString(i)
			fillValue := runtime.ToValue(fillData[fillIndex])
			this.Set(indexStr, fillValue)
			fillIndex = (fillIndex + 1) % len(fillData)
		}

		return this
	}
	fillValue := runtime.ToValue(fillFunc)
	setFunctionNameAndLength(runtime, fillValue, "fill", 4)
	prototype.Set("fill", fillValue)

	// 添加 toJSON 方法
	toJSONFunc := func(call goja.FunctionCall) goja.Value {
		// 检查 this 不能是 null 或 undefined
		if goja.IsNull(call.This) || goja.IsUndefined(call.This) {
			panic(runtime.NewTypeError("Cannot convert undefined or null to object"))
		}

		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("Cannot convert undefined or null to object"))
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 🔥 修复：确保空数组的一致性处理
		// 使用 runtime.NewArray() 创建 JavaScript 数组，确保序列化一致性
		dataArray := runtime.NewArray()

		for i := int64(0); i < bufferLength; i++ {
			var byteVal int64
			if val := this.Get(getIndexString(i)); !goja.IsUndefined(val) {
				byteVal = val.ToInteger() & 0xFF
			} else {
				byteVal = 0
			}
			dataArray.Set(strconv.FormatInt(i, 10), runtime.ToValue(byteVal))
		}

		// 返回标准Buffer JSON格式
		// 🔥 修复：使用 runtime.NewObject() 创建对象，确保键顺序一致
		result := runtime.NewObject()
		result.Set("type", runtime.ToValue("Buffer"))
		result.Set("data", dataArray)

		return result
	}
	toJSONValue := runtime.ToValue(toJSONFunc)
	setFunctionNameAndLength(runtime, toJSONValue, "toJSON", 0)
	prototype.Set("toJSON", toJSONValue)

	// === 字符串搜索方法 ===

	// 添加 includes 方法
	includesFunc := func(call goja.FunctionCall) goja.Value {
		// 🔥 修复：参数验证 - 必须至少有一个参数
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("The \"value\" argument must be specified"))
		}

		// 🔥 修复：验证 this 必须是 Buffer 或 Uint8Array
		this := call.This.ToObject(runtime)
		indexOfMethod := this.Get("indexOf")
		if indexOfMethod == nil || goja.IsUndefined(indexOfMethod) || goja.IsNull(indexOfMethod) {
			panic(runtime.NewTypeError("this.indexOf is not a function"))
		}

		// 使用indexOf来实现includes
		searchVal := call.Arguments[0]
		offset := int64(0)
		enc := goja.Undefined()

		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}
		// 🔥 修复：传递 encoding 参数
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			enc = call.Arguments[2]
		}

		// 调用对象自己的indexOf方法
		if fn, ok := goja.AssertFunction(indexOfMethod); ok {
			result, err := fn(call.This, searchVal, runtime.ToValue(offset), enc)
			if err != nil {
				// 🔥 修复：传播 indexOf 的错误，不要吞掉
				panic(err)
			}
			return runtime.ToValue(result.ToInteger() != -1)
		}

		panic(runtime.NewTypeError("this.indexOf is not a function"))
	}
	includesValue := runtime.ToValue(includesFunc)
	setFunctionNameAndLength(runtime, includesValue, "includes", 3)
	prototype.Set("includes", includesValue)

	// 添加 lastIndexOf 方法
	// 🔥 修复：完整实现 lastIndexOf(value[, byteOffset][, encoding])
	lastIndexOfFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received undefined"))
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		searchArg := call.Arguments[0]

		// 修复：严格类型检查（对齐 Node.js v25.0.0）
		// 检查 undefined 和 null
		if goja.IsUndefined(searchArg) {
			panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received undefined"))
		}
		if goja.IsNull(searchArg) {
			panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received null"))
		}

		// 检查 boolean 类型
		searchType := searchArg.ExportType()
		if searchType != nil && searchType.Kind().String() == "bool" {
			boolVal := searchArg.ToBoolean()
			panic(runtime.NewTypeError(fmt.Sprintf("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received type boolean (%v)", boolVal)))
		}

		// 检查 Symbol 类型（使用类型断言）
		assertNotSymbol(runtime, searchArg, "The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received type symbol")

		// 检查 Function 类型
		if _, ok := goja.AssertFunction(searchArg); ok {
			panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received type function"))
		}

		byteOffset := bufferLength - 1
		encoding := "utf8"
		// 记录是否显式指定了 byteOffset（用于空搜索时的返回值）
		explicitOffset := false

		// 解析参数：lastIndexOf(value, byteOffset, encoding) 或 lastIndexOf(value, encoding)
		// 🔥 修复：需要处理 undefined 作为第二个参数的情况
		if len(call.Arguments) > 1 {
			arg1 := call.Arguments[1]

			// 如果第二个参数不是 undefined
			if !goja.IsUndefined(arg1) {
				// 🔥 修复：先检查类型，字符串类型必须是有效的 encoding
				arg1Type := arg1.ExportType()
				if arg1Type != nil && arg1Type.Kind().String() == "string" {
					// 字符串类型：必须是有效的 encoding
					arg1Str := arg1.String()
					isValidEncoding := false
					switch strings.ToLower(arg1Str) {
					case "utf8", "utf-8", "hex", "base64", "base64url", "ascii", "latin1", "binary", "utf16le", "ucs2", "ucs-2", "utf-16le":
						isValidEncoding = true
					}

					if isValidEncoding {
						encoding = arg1Str
					} else {
						// 无效的 encoding，抛出错误
						panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", arg1Str)))
					}
				} else {
					// 非字符串类型：当作 byteOffset 处理
					floatVal := arg1.ToFloat()
					if math.IsNaN(floatVal) {
						// NaN 应该使用默认值 bufferLength - 1
						byteOffset = bufferLength - 1
					} else {
						byteOffset = arg1.ToInteger()
						explicitOffset = true
					}
				}
			}

			// 检查第三个参数（无论第二个参数是什么）
			if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
				arg2 := call.Arguments[2]
				arg2Str := arg2.String()
				// 检查第三个参数是否是有效的编码
				validEncoding := false
				switch strings.ToLower(arg2Str) {
				case "utf8", "utf-8", "hex", "base64", "base64url", "ascii", "latin1", "binary", "utf16le", "ucs2", "ucs-2", "utf-16le":
					validEncoding = true
				}
				if validEncoding {
					encoding = arg2Str
				} else {
					// 无效编码，抛出错误
					panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", arg2Str)))
				}
			}
		}

		// 🔥 修复：编码大小写不敏感
		encoding = strings.ToLower(encoding)

		// 记录原始 byteOffset（用于空搜索时的返回值）
		originalByteOffset := byteOffset

		// 处理负数 offset
		if byteOffset < 0 {
			byteOffset = bufferLength + byteOffset
		}

		// 🔥 修复：对于超出范围的 byteOffset，需要特殊处理
		// 如果 byteOffset >= bufferLength，调整为 bufferLength - 1
		// 但要记录原始值，因为空字符串查找时需要返回不同的值
		if originalByteOffset >= bufferLength && originalByteOffset >= 0 {
			// 正数且超出范围：调整为 bufferLength - 1，但空字符串返回 bufferLength
			byteOffset = bufferLength - 1
		} else if byteOffset >= bufferLength {
			// 负数转换后超出范围
			byteOffset = bufferLength - 1
		}

		// 🔥 修复：不要在这里直接返回 -1，因为空字符串查找需要特殊处理
		// 将这个检查移到后面，在确定 searchBytes 之后

		// 处理不同类型的搜索值
		var searchBytes []byte

		// 检查 BigInt 类型（在处理数字之前）
		// 使用 ExportType 检测 BigInt 类型
		if searchType != nil {
			typeName := searchType.String()
			if typeName == "*big.Int" || typeName == "big.Int" {
				panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received type bigint"))
			}
		}

		// 先尝试作为字符串或数字
		if searchType != nil && (searchType.Kind().String() == "float64" || searchType.Kind().String() == "int64") {
			// 数字类型
			// 🔥 修复：处理特殊数字值（NaN, Infinity, -Infinity）
			// Node.js 行为：这些值都会被转换为 0
			numVal := searchArg.ToFloat()
			if math.IsNaN(numVal) || math.IsInf(numVal, 0) {
				searchBytes = []byte{0}
			} else {
				// 🔥 修复：使用位运算而不是 ToInteger()，避免超大浮点数溢出
				// Node.js 行为：number & 0xFF
				intVal := int64(numVal)
				searchBytes = []byte{byte(intVal & 0xFF)}
			}
		} else if searchType != nil && searchType.Kind().String() == "string" {
			// 字符串类型
			searchStr := searchArg.String()
			// 🔥 修复：空字符串也需要处理
			if searchStr == "" {
				searchBytes = []byte{}
			} else {
				// 🔥 修复：完整的编码处理（对齐 Node.js）
				// encoding 已经在上面转为小写
				switch encoding {
				case "utf8", "utf-8":
					searchBytes = []byte(searchStr)
				case "hex":
					// 🔥 修复：使用宽松的 hex 解码，处理奇数长度字符串
					decoded, err := decodeHexLenient(searchStr)
					if err == nil && decoded != nil {
						searchBytes = decoded
					}
				case "base64":
					// 使用宽松的 base64 解码
					decoded, err := decodeBase64Lenient(searchStr)
					if err == nil && decoded != nil {
						searchBytes = decoded
					} else if err != nil {
						// 解码失败，searchBytes 设为空数组（会返回 bufferLength）
						searchBytes = []byte{}
					}
				case "base64url":
					decoded, err := decodeBase64URLLenient(searchStr)
					if err == nil && decoded != nil {
						searchBytes = decoded
					}
				case "latin1", "binary":
					// latin1: 按 UTF-16 码元转字节
					cu := stringToUTF16CodeUnits(searchStr)
					searchBytes = make([]byte, len(cu))
					for i, u := range cu {
						searchBytes[i] = byte(u)
					}
				case "ascii":
					// ascii: 按 UTF-16 码元转字节，取低 7 位
					cu := stringToUTF16CodeUnits(searchStr)
					searchBytes = make([]byte, len(cu))
					for i, u := range cu {
						searchBytes[i] = byte(u & 0x7F)
					}
				case "utf16le", "ucs2", "ucs-2", "utf-16le":
					// utf16le: 完整的 UTF-16LE 编码
					byteCount := utf16CodeUnitCount(searchStr) * 2
					b := make([]byte, byteCount)
					off := 0
					for _, r := range searchStr {
						if r <= 0xFFFF {
							b[off] = byte(r)
							b[off+1] = byte(r >> 8)
							off += 2
						} else {
							rPrime := r - 0x10000
							high := uint16(0xD800 + (rPrime >> 10))
							low := uint16(0xDC00 + (rPrime & 0x3FF))
							b[off] = byte(high)
							b[off+1] = byte(high >> 8)
							off += 2
							b[off] = byte(low)
							b[off+1] = byte(low >> 8)
							off += 2
						}
					}
					searchBytes = b
				default:
					searchBytes = []byte(searchStr)
				}
			}
		} else {
			// 可能是 Buffer 或 Uint8Array
			searchObj := searchArg.ToObject(runtime)
			if searchObj != nil {
				// 检查是否是普通数组（需要拒绝）
				className := searchObj.ClassName()
				if className == "Array" {
					panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received an instance of Array"))
				}

				// 🔥 修复：严格检查 TypedArray 类型（只接受 Uint8Array 和 Buffer）
				// 检查 constructor.name
				typeName := "Object"
				if constructor := searchObj.Get("constructor"); !goja.IsUndefined(constructor) {
					if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
						if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
							typeName = name.String()
						}
					}
				}

				// 只接受 Buffer 和 Uint8Array
				isValidType := false
				if typeName == "Buffer" || typeName == "Uint8Array" || strings.Contains(typeName, "Buffer") {
					isValidType = true
				}

				if !isValidType {
					// 其他 TypedArray 类型（Int8Array, Uint16Array 等）都不接受
					if typeName == "Int8Array" || typeName == "Uint16Array" || typeName == "Int16Array" ||
						typeName == "Uint32Array" || typeName == "Int32Array" || typeName == "Float32Array" ||
						typeName == "Float64Array" || typeName == "BigInt64Array" || typeName == "BigUint64Array" ||
						typeName == "Uint8ClampedArray" {
						panic(runtime.NewTypeError(fmt.Sprintf("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received an instance of %s", typeName)))
					}
				}

				searchLen := searchObj.Get("length")
				if searchLen != nil && !goja.IsUndefined(searchLen) && !goja.IsNull(searchLen) {
					searchLength := searchLen.ToInteger()

					// 检查是否有数字索引（Buffer/TypedArray 特征）
					if searchLength > 0 {
						// 检查第一个元素是否存在
						val0 := searchObj.Get("0")
						if val0 == nil || goja.IsUndefined(val0) {
							// 有 length 但没有索引，可能是普通对象
							panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received an instance of Object"))
						}

						searchBytes = make([]byte, searchLength)
						for i := int64(0); i < searchLength; i++ {
							val := searchObj.Get(getIndexString(i))
							if val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
								searchBytes[i] = byte(val.ToInteger() & 0xFF)
							}
						}
					} else if searchLength == 0 {
						// 空的 Buffer/TypedArray 是允许的
						searchBytes = []byte{}
					}
				} else {
					// 没有 length 属性，是普通对象
					panic(runtime.NewTypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array. Received an instance of Object"))
				}
			}
		}

		if len(searchBytes) == 0 {
			// 🔥 修复：空字符串/空 Buffer 应该返回 byteOffset
			// 特殊情况：空 Buffer（bufferLength == 0）查找空字符串应该返回 0
			if bufferLength == 0 {
				return runtime.ToValue(0)
			}

			// 如果用户没有显式指定 offset，返回 bufferLength
			if !explicitOffset {
				return runtime.ToValue(bufferLength)
			}

			// 用户显式指定了 offset，返回调整后的 byteOffset
			// 但如果原始 offset >= bufferLength，返回 bufferLength
			if originalByteOffset >= bufferLength && originalByteOffset >= 0 {
				return runtime.ToValue(bufferLength)
			}

			// 其他情况返回调整后的 byteOffset
			if byteOffset < 0 {
				return runtime.ToValue(0)
			}
			return runtime.ToValue(byteOffset)
		}

		// 🔥 修复：在确定 searchBytes 之后，检查 byteOffset 是否有效
		if byteOffset < 0 {
			return runtime.ToValue(-1)
		}

		// 从 byteOffset 向前搜索（startPos 不能超过 byteOffset）
		// 🔥 修复：对于 utf16le/ucs2 编码，需要确保搜索位置是 2 字节对齐的
		encodingLower := strings.ToLower(encoding)
		isUTF16 := encodingLower == "utf16le" || encodingLower == "ucs2" || encodingLower == "ucs-2" || encodingLower == "utf-16le"

		// 🔥 修复：对于 UTF-16 编码，搜索值长度必须是 2 的倍数
		if isUTF16 && len(searchBytes)%2 != 0 {
			return runtime.ToValue(-1)
		}

		searchLen := int64(len(searchBytes))

		// 如果是 UTF-16 编码且 byteOffset 不是 2 字节对齐，调整到前一个对齐位置
		searchStart := byteOffset
		if isUTF16 && searchStart%2 != 0 {
			searchStart--
		}

		// 确定搜索步长：UTF-16 编码时步长为 2，其他编码步长为 1
		step := int64(1)
		if isUTF16 {
			step = 2
		}

		for startPos := searchStart; startPos >= 0; startPos -= step {
			// 检查边界：startPos + searchLen 不能超过 bufferLength
			if startPos+searchLen > bufferLength {
				continue
			}

			found := true
			for j := int64(0); j < searchLen; j++ {
				if val := this.Get(getIndexString(startPos + j)); !goja.IsUndefined(val) {
					if byte(val.ToInteger()&0xFF) != searchBytes[j] {
						found = false
						break
					}
				} else {
					found = false
					break
				}
			}
			if found {
				return runtime.ToValue(startPos)
			}
		}

		return runtime.ToValue(-1)
	}
	lastIndexOfValue := runtime.ToValue(lastIndexOfFunc)
	setFunctionNameAndLength(runtime, lastIndexOfValue, "lastIndexOf", 3)
	prototype.Set("lastIndexOf", lastIndexOfValue)

	// === 字节交换方法 ===

	// 添加 swap16 方法
	swap16Func := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 🔥 性能优化：优先尝试最快路径 - 直接导出为 ArrayBuffer
		if exported := this.Export(); exported != nil {
			if arrayBuffer, ok := exported.(goja.ArrayBuffer); ok {
				bufferBytes := arrayBuffer.Bytes()
				byteLen := int64(len(bufferBytes))

				if byteLen%2 != 0 {
					errObj := newRangeError(runtime, fmt.Sprintf("Buffer size must be a multiple of 16-bits"))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_BUFFER_SIZE"))
					panic(errObj)
				}

				swapBytesInPlace(bufferBytes, 2)
				return this
			}
		}

		// 获取 length 属性（仅在需要时）
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		if bufferLength%2 != 0 {
			errObj := newRangeError(runtime, fmt.Sprintf("Buffer size must be a multiple of 16-bits"))
			errObj.Set("code", runtime.ToValue("ERR_INVALID_BUFFER_SIZE"))
			panic(errObj)
		}

		// 获取实际字节长度（仅在需要时）
		actualByteLength := bufferLength
		byteLengthVal := this.Get("byteLength")
		if byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
			actualByteLength = byteLengthVal.ToInteger()
		}

		// 尝试通过 buffer 属性获取 ArrayBuffer
		bufferVal := this.Get("buffer")
		if bufferVal != nil && !goja.IsUndefined(bufferVal) {
			if arrayBuffer, ok := bufferVal.Export().(goja.ArrayBuffer); ok {
				bufferBytes := arrayBuffer.Bytes()
				byteOffset := int64(0)
				offsetVal := this.Get("byteOffset")
				if offsetVal != nil && !goja.IsUndefined(offsetVal) {
					byteOffset = offsetVal.ToInteger()
				}

				if byteOffset >= 0 && byteOffset+actualByteLength <= int64(len(bufferBytes)) {
					if actualByteLength != bufferLength {
						elementSize := int(actualByteLength / bufferLength)
						swapElementsInPlace(bufferBytes[byteOffset:byteOffset+actualByteLength], elementSize, int(bufferLength))
					} else {
						swapBytesInPlace(bufferBytes[byteOffset:byteOffset+actualByteLength], 2)
					}
					return this
				}
			}
		}

		// 回退：逐字节交换（最慢路径）
		for i := int64(0); i < actualByteLength; i += 2 {
			byte1 := this.Get(getIndexString(i))
			byte2 := this.Get(getIndexString(i + 1))
			this.Set(getIndexString(i), byte2)
			this.Set(getIndexString(i+1), byte1)
		}

		return this
	}
	swap16Value := runtime.ToValue(swap16Func)
	setFunctionNameAndLength(runtime, swap16Value, "swap16", 0)
	prototype.Set("swap16", swap16Value)

	// 添加 swap32 方法
	swap32Func := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 🔥 性能优化：优先尝试最快路径 - 直接导出为 ArrayBuffer
		// 这样可以避免多次属性访问，对于频繁调用的小 Buffer 性能提升显著
		if exported := this.Export(); exported != nil {
			if arrayBuffer, ok := exported.(goja.ArrayBuffer); ok {
				bufferBytes := arrayBuffer.Bytes()
				byteLen := int64(len(bufferBytes))

				// 快速长度检查
				if byteLen%4 != 0 {
					errObj := newRangeError(runtime, fmt.Sprintf("Buffer size must be a multiple of 32-bits"))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_BUFFER_SIZE"))
					panic(errObj)
				}

				// 直接交换，无需额外属性访问
				swapBytesInPlace(bufferBytes, 4)
				return this
			}
		}

		// 获取 length 属性（仅在需要时）
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 长度检查
		if bufferLength%4 != 0 {
			errObj := newRangeError(runtime, fmt.Sprintf("Buffer size must be a multiple of 32-bits"))
			errObj.Set("code", runtime.ToValue("ERR_INVALID_BUFFER_SIZE"))
			panic(errObj)
		}

		// 获取实际字节长度（仅在需要时）
		actualByteLength := bufferLength
		byteLengthVal := this.Get("byteLength")
		if byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
			actualByteLength = byteLengthVal.ToInteger()
		}

		// 尝试通过 buffer 属性获取 ArrayBuffer
		bufferVal := this.Get("buffer")
		if bufferVal != nil && !goja.IsUndefined(bufferVal) {
			if arrayBuffer, ok := bufferVal.Export().(goja.ArrayBuffer); ok {
				bufferBytes := arrayBuffer.Bytes()
				byteOffset := int64(0)
				offsetVal := this.Get("byteOffset")
				if offsetVal != nil && !goja.IsUndefined(offsetVal) {
					byteOffset = offsetVal.ToInteger()
				}

				// 边界检查
				if byteOffset >= 0 && byteOffset+actualByteLength <= int64(len(bufferBytes)) {
					// 区分TypedArray和Buffer的swap行为
					if actualByteLength != bufferLength {
						// TypedArray: 按元素交换
						elementSize := int(actualByteLength / bufferLength)
						swapElementsInPlace(bufferBytes[byteOffset:byteOffset+actualByteLength], elementSize, int(bufferLength))
					} else {
						// Buffer/Uint8Array: 按字节组交换
						swapBytesInPlace(bufferBytes[byteOffset:byteOffset+actualByteLength], 4)
					}
					return this
				}
			}
		}

		// 回退：逐字节交换（最慢路径）
		for i := int64(0); i < actualByteLength; i += 4 {
			byte1 := this.Get(getIndexString(i))
			byte2 := this.Get(getIndexString(i + 1))
			byte3 := this.Get(getIndexString(i + 2))
			byte4 := this.Get(getIndexString(i + 3))

			this.Set(getIndexString(i), byte4)
			this.Set(getIndexString(i+1), byte3)
			this.Set(getIndexString(i+2), byte2)
			this.Set(getIndexString(i+3), byte1)
		}

		return this
	}
	swap32Value := runtime.ToValue(swap32Func)
	setFunctionNameAndLength(runtime, swap32Value, "swap32", 0)
	prototype.Set("swap32", swap32Value)

	// 添加 swap64 方法
	swap64Func := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 🔥 性能优化：优先尝试最快路径 - 直接导出为 ArrayBuffer
		if exported := this.Export(); exported != nil {
			if arrayBuffer, ok := exported.(goja.ArrayBuffer); ok {
				bufferBytes := arrayBuffer.Bytes()
				byteLen := int64(len(bufferBytes))

				if byteLen%8 != 0 {
					errObj := newRangeError(runtime, fmt.Sprintf("Buffer size must be a multiple of 64-bits"))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_BUFFER_SIZE"))
					panic(errObj)
				}

				swapBytesInPlace(bufferBytes, 8)
				return this
			}
		}

		// 获取 length 属性（仅在需要时）
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		if bufferLength%8 != 0 {
			errObj := newRangeError(runtime, fmt.Sprintf("Buffer size must be a multiple of 64-bits"))
			errObj.Set("code", runtime.ToValue("ERR_INVALID_BUFFER_SIZE"))
			panic(errObj)
		}

		// 获取实际字节长度（仅在需要时）
		actualByteLength := bufferLength
		byteLengthVal := this.Get("byteLength")
		if byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
			actualByteLength = byteLengthVal.ToInteger()
		}

		// 尝试通过 buffer 属性获取 ArrayBuffer
		bufferVal := this.Get("buffer")
		if bufferVal != nil && !goja.IsUndefined(bufferVal) {
			if arrayBuffer, ok := bufferVal.Export().(goja.ArrayBuffer); ok {
				bufferBytes := arrayBuffer.Bytes()
				byteOffset := int64(0)
				offsetVal := this.Get("byteOffset")
				if offsetVal != nil && !goja.IsUndefined(offsetVal) {
					byteOffset = offsetVal.ToInteger()
				}

				if byteOffset >= 0 && byteOffset+actualByteLength <= int64(len(bufferBytes)) {
					if actualByteLength != bufferLength {
						elementSize := int(actualByteLength / bufferLength)
						swapElementsInPlace(bufferBytes[byteOffset:byteOffset+actualByteLength], elementSize, int(bufferLength))
					} else {
						swapBytesInPlace(bufferBytes[byteOffset:byteOffset+actualByteLength], 8)
					}
					return this
				}
			}
		}

		// 回退：逐字节交换（最慢路径）
		for i := int64(0); i < actualByteLength; i += 8 {
			bytes := make([]goja.Value, 8)
			for j := int64(0); j < 8; j++ {
				bytes[j] = this.Get(getIndexString(i + j))
			}

			for j := int64(0); j < 8; j++ {
				this.Set(getIndexString(i+j), bytes[7-j])
			}
		}

		return this
	}
	swap64Value := runtime.ToValue(swap64Func)
	setFunctionNameAndLength(runtime, swap64Value, "swap64", 0)
	prototype.Set("swap64", swap64Value)

	// 添加 reverse 方法
	reverseFunc := func(call goja.FunctionCall) goja.Value {
		// 🔥 修复：检查 this 是否为 null 或 undefined
		if goja.IsNull(call.This) || goja.IsUndefined(call.This) {
			panic(runtime.NewTypeError("Cannot convert undefined or null to object"))
		}

		// 检查 this 是否可以转换为对象
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("Cannot convert undefined or null to object"))
		}

		// 🔥 修复：检查是否是 TypedArray（包括 Buffer）
		// reverse 只能在 TypedArray 上调用，普通对象、字符串等会抛出 TypeError
		if !isBufferOrTypedArray(runtime, this) {
			// 检查是否是字符串、数字、布尔值等基本类型
			exported := call.This.Export()
			if exported != nil {
				switch exported.(type) {
				case string, float64, int, int32, int64, bool:
					panic(runtime.NewTypeError("Method Buffer.prototype.reverse called on incompatible receiver " + call.This.String()))
				}
			}
			// 普通对象或类数组对象也不允许
			panic(runtime.NewTypeError("Method Buffer.prototype.reverse called on incompatible receiver [object Object]"))
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 🔥 性能优化：无论大小，都优先尝试零拷贝快速路径
		// 只有在无法获取底层 ArrayBuffer 时才回退到慢速路径

		// 检查 BYTES_PER_ELEMENT（确保只对字节数组进行字节级反转）
		bytesPerElement := int64(1)
		if bpeVal := this.Get("BYTES_PER_ELEMENT"); bpeVal != nil && !goja.IsUndefined(bpeVal) {
			bytesPerElement = bpeVal.ToInteger()
		}

		// 只有 BYTES_PER_ELEMENT = 1 的 TypedArray 可以使用字节级零拷贝反转
		// 对于 Uint16Array、Int32Array 等，需要使用慢速路径（按元素反转）
		if bytesPerElement == 1 {
			// 路径1：尝试直接从 this.Export() 获取 ArrayBuffer（最常见）
			if exported := call.This.Export(); exported != nil {
				if arrayBuffer, ok := exported.(goja.ArrayBuffer); ok {
					bufferBytes := arrayBuffer.Bytes()
					// 直接在 ArrayBuffer 的字节数组上反转（原地修改，零拷贝）
					reverseBytesInPlace(bufferBytes)
					// ArrayBuffer 的修改会自动反映到 Buffer，无需写回
					return this
				}
			}

			// 路径2：尝试通过 buffer 属性获取 ArrayBuffer（TypedArray 路径）
			if bufferVal := this.Get("buffer"); bufferVal != nil && !goja.IsUndefined(bufferVal) {
				if arrayBuffer, ok := bufferVal.Export().(goja.ArrayBuffer); ok {
					bufferBytes := arrayBuffer.Bytes()
					byteOffset := int64(0)
					if offsetVal := this.Get("byteOffset"); offsetVal != nil && !goja.IsUndefined(offsetVal) {
						byteOffset = offsetVal.ToInteger()
					}
					// 边界检查
					if byteOffset >= 0 && byteOffset+bufferLength <= int64(len(bufferBytes)) {
						// 直接在 ArrayBuffer 的字节数组上反转（原地修改，零拷贝）
						reverseBytesInPlace(bufferBytes[byteOffset : byteOffset+bufferLength])
						// ArrayBuffer 的修改会自动反映到 Buffer，无需写回
						return this
					}
				}
			}
		}

		// 路径3：慢速回退路径（只在无法获取 ArrayBuffer 时使用）
		// 注意：对于 goja_nodejs 的标准 Buffer，应该永远不会走到这里
		for i := int64(0); i < bufferLength/2; i++ {
			j := bufferLength - 1 - i
			// 交换 i 和 j 位置的字节
			valI := this.Get(getIndexString(i))
			valJ := this.Get(getIndexString(j))
			this.Set(getIndexString(i), valJ)
			this.Set(getIndexString(j), valI)
		}

		return this
	}
	reverseValue := runtime.ToValue(reverseFunc)
	if fnObj := reverseValue.ToObject(runtime); fnObj != nil {
		fnObj.DefineDataProperty("name", runtime.ToValue("reverse"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		fnObj.DefineDataProperty("length", runtime.ToValue(0), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
	prototype.Set("reverse", reverseValue)

	// 添加 subarray 方法
	// 🔥 修复：返回共享内存视图（对齐 Node.js）
	subarrayFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		start := int64(0)
		end := bufferLength

		// 解析参数
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			start = call.Arguments[0].ToInteger()
		}
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			end = call.Arguments[1].ToInteger()
		}

		// 处理负数索引
		if start < 0 {
			start = bufferLength + start
		}
		if end < 0 {
			end = bufferLength + end
		}

		// 边界检查
		if start < 0 {
			start = 0
		}
		if start > bufferLength {
			start = bufferLength
		}
		if end > bufferLength {
			end = bufferLength
		}
		if start >= end {
			end = start
		}

		// 计算新视图的参数
		viewLength := end - start
		if viewLength < 0 {
			viewLength = 0
		}

		// 🔥 修复：返回共享视图而不是复制
		// 获取底层 ArrayBuffer 和当前 byteOffset
		arrayBuffer := this.Get("buffer")
		if arrayBuffer == nil || goja.IsUndefined(arrayBuffer) || goja.IsNull(arrayBuffer) {
			// 备用：创建新 buffer（数据复制）
			bufferConstructor := runtime.Get("Buffer")
			allocFunc, _ := goja.AssertFunction(bufferConstructor.ToObject(runtime).Get("alloc"))
			newBuf, _ := allocFunc(bufferConstructor, runtime.ToValue(viewLength))
			newBufObj := newBuf.ToObject(runtime)
			// 复制数据
			for i := int64(0); i < viewLength; i++ {
				val := this.Get(getIndexString(start + i))
				newBufObj.Set(getIndexString(i), val)
			}
			return newBuf
		}

		baseByteOffset := int64(0)
		byteOffsetVal := this.Get("byteOffset")
		if byteOffsetVal != nil && !goja.IsUndefined(byteOffsetVal) && !goja.IsNull(byteOffsetVal) {
			baseByteOffset = byteOffsetVal.ToInteger()
		}

		// 使用 Buffer.from(arrayBuffer, byteOffset, length) 创建共享视图
		bufferConstructor := runtime.Get("Buffer")
		if bufferConstructor == nil {
			panic(runtime.NewTypeError("Buffer 构造函数不可用"))
		}

		bufferObj := bufferConstructor.ToObject(runtime)
		if bufferObj == nil {
			panic(runtime.NewTypeError("Buffer 构造函数不是一个对象"))
		}

		fromFunc, ok := goja.AssertFunction(bufferObj.Get("from"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.from 不可用"))
		}

		// 返回共享视图：Buffer.from(arrayBuffer, byteOffset + start, length)
		newBuffer, err := fromFunc(bufferConstructor,
			arrayBuffer,
			runtime.ToValue(baseByteOffset+start),
			runtime.ToValue(viewLength))
		if err != nil {
			panic(err)
		}

		return newBuffer
	}
	subarrayValue := runtime.ToValue(subarrayFunc)
	setFunctionNameAndLength(runtime, subarrayValue, "subarray", 2)
	prototype.Set("subarray", subarrayValue)

	// 添加 set 方法
	setFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Array 参数是必需的"))
		}

		sourceArray := call.Arguments[0].ToObject(runtime)
		if sourceArray == nil {
			panic(runtime.NewTypeError("第一个参数必须是数组或 buffer"))
		}

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			// 检查 Infinity
			offsetVal := call.Arguments[1]
			if offsetVal.ExportType() != nil && offsetVal.ExportType().Kind().String() == "float64" {
				f := offsetVal.ToFloat()
				if math.IsInf(f, 0) {
					panic(newRangeError(runtime, "The value of \"offset\" is out of range. It must be an integer. Received Infinity"))
				}
				// 🔥 修复：检查极大值（如 Number.MAX_VALUE）
				// Number.MAX_SAFE_INTEGER = 2^53 - 1
				// 任何超过此值的浮点数都无法安全表示为整数，直接抛出错误
				if f > float64(MaxSafeInteger) || f < -float64(MaxSafeInteger) {
					panic(newRangeError(runtime, "offset is out of bounds"))
				}
				offset = offsetVal.ToInteger()
			} else {
				offset = offsetVal.ToInteger()
			}
		}

		// 检测 BigInt TypedArray（不支持）
		if constructorVal := sourceArray.Get("constructor"); constructorVal != nil && !goja.IsUndefined(constructorVal) {
			if constructorObj := constructorVal.ToObject(runtime); constructorObj != nil {
				if nameVal := constructorObj.Get("name"); nameVal != nil && !goja.IsUndefined(nameVal) {
					constructorName := nameVal.String()
					if constructorName == "BigInt64Array" || constructorName == "BigUint64Array" {
						panic(runtime.NewTypeError("Cannot mix BigInt and other types, use explicit conversions"))
					}
				}
			}
		}

		// 获取源数组长度
		sourceLength := int64(0)
		if lengthVal := sourceArray.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			// 检查 Infinity
			if lengthVal.ExportType() != nil && lengthVal.ExportType().Kind().String() == "float64" {
				f := lengthVal.ToFloat()
				if math.IsInf(f, 0) {
					panic(newRangeError(runtime, "The value of \"length\" is out of range"))
				}
			}
			sourceLength = lengthVal.ToInteger()
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 边界检查（使用 RangeError）
		if offset < 0 || offset+sourceLength > bufferLength {
			panic(newRangeError(runtime, "offset is out of bounds"))
		}

		// ========== 🔥 性能优化：TypedArray/Buffer 快速路径 ==========
		// 检测是否为 TypedArray 或 Buffer，如果是则使用快速内存复制
		if isTypedArrayOrBuffer(sourceArray) {
			srcBytes, _, bytesPerElement, ok := extractTypedArrayBytes(sourceArray)
			if ok && bytesPerElement == 1 {
				// 只对 Uint8Array/Buffer (bytesPerElement=1) 使用快速路径
				// 其他类型（Uint16Array 等）需要逐元素转换

				// 提取目标 Buffer 的底层字节
				targetBytes, _, _, targetOk := extractTypedArrayBytes(this)
				if targetOk {
					// 检查是否需要处理内存重叠
					targetAB := this.Get("buffer")
					sourceAB := sourceArray.Get("buffer")

					sameBuffer := false
					if targetAB != nil && sourceAB != nil &&
						!goja.IsUndefined(targetAB) && !goja.IsUndefined(sourceAB) {
						sameBuffer = (targetAB.Export() == sourceAB.Export())
					}

					if sameBuffer {
						// 内存重叠：需要临时缓冲区（memmove 语义）
						tmp := make([]byte, len(srcBytes))
						copy(tmp, srcBytes)
						copy(targetBytes[offset:], tmp)
					} else {
						// 无重叠：直接复制（最快路径）
						copy(targetBytes[offset:], srcBytes)
					}

					return goja.Undefined()
				}
			}
		}
		// ========== 快速路径结束 ==========

		// 🔥 修复：检查是否共享同一 ArrayBuffer（避免重叠时数据污染）
		sameAB := false
		thisAB := this.Get("buffer")
		srcAB := sourceArray.Get("buffer")
		if thisAB != nil && srcAB != nil && !goja.IsUndefined(thisAB) && !goja.IsUndefined(srcAB) && thisAB.Export() == srcAB.Export() {
			sameAB = true
		}

		if sameAB && sourceLength > 0 {
			// 先把源区数据拷到临时切片，避免重叠破坏（memmove 语义）
			tmp := make([]byte, sourceLength)
			for i := int64(0); i < sourceLength; i++ {
				val := sourceArray.Get(getIndexString(i))
				// 🔥 修复：将每个元素显式转换为字节值（0-255）
				// 这样可以避免循环引用等复杂对象导致的问题
				tmp[i] = convertToUint8(runtime, val)
			}
			for i := int64(0); i < sourceLength; i++ {
				this.Set(getIndexString(offset+i), runtime.ToValue(tmp[i]))
			}
			return goja.Undefined()
		}

		// 非同 AB 或不重叠：直接顺序复制
		for i := int64(0); i < sourceLength; i++ {
			val := sourceArray.Get(getIndexString(i))
			// 🔥 修复：将每个元素显式转换为字节值（0-255）
			byteVal := convertToUint8(runtime, val)
			this.Set(getIndexString(offset+i), runtime.ToValue(byteVal))
		}

		return goja.Undefined()
	}
	setValue := runtime.ToValue(setFunc)
	setFunctionNameAndLength(runtime, setValue, "set", 1)
	prototype.Set("set", setValue)

	// 🔥 修复：添加 filter 方法（TypedArray 方法，返回新 Buffer）
	filterFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Callback function is required"))
		}

		callback, ok := goja.AssertFunction(call.Arguments[0])
		if !ok {
			panic(runtime.NewTypeError("Callback function is required"))
		}
		thisArg := goja.Undefined()
		if len(call.Arguments) > 1 {
			thisArg = call.Arguments[1]
		}

		// 获取长度
		length := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			length = lengthVal.ToInteger()
		}

		// 收集通过过滤的元素
		var results []byte
		for i := int64(0); i < length; i++ {
			val := this.Get(getIndexString(i))
			// 调用回调函数
			res, err := callback(thisArg, val, runtime.ToValue(i), this)
			if err != nil {
				panic(err)
			}
			// 如果返回 truthy，保留该元素
			if res.ToBoolean() {
				results = append(results, byte(val.ToInteger()&0xFF))
			}
		}

		// 使用 Buffer.alloc 创建新 Buffer
		bufferConstructor := runtime.Get("Buffer")
		allocFunc, _ := goja.AssertFunction(bufferConstructor.ToObject(runtime).Get("alloc"))
		newBuf, _ := allocFunc(bufferConstructor, runtime.ToValue(len(results)))
		newBufObj := newBuf.ToObject(runtime)

		// 填充数据
		for i, b := range results {
			newBufObj.Set(getIndexString(int64(i)), runtime.ToValue(b))
		}

		return newBuf
	}
	filterValue := runtime.ToValue(filterFunc)
	setFunctionNameAndLength(runtime, filterValue, "filter", 1)
	prototype.Set("filter", filterValue)

	// 🔥 修复：添加 map 方法（TypedArray 方法，返回新 Buffer）
	mapFunc := func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Callback function is required"))
		}

		callback, ok := goja.AssertFunction(call.Arguments[0])
		if !ok {
			panic(runtime.NewTypeError("Callback function is required"))
		}
		thisArg := goja.Undefined()
		if len(call.Arguments) > 1 {
			thisArg = call.Arguments[1]
		}

		// 获取长度
		length := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			length = lengthVal.ToInteger()
		}

		// 使用 Buffer.alloc 创建新 Buffer
		bufferConstructor := runtime.Get("Buffer")
		allocFunc, _ := goja.AssertFunction(bufferConstructor.ToObject(runtime).Get("alloc"))
		newBuf, _ := allocFunc(bufferConstructor, runtime.ToValue(length))
		newBufObj := newBuf.ToObject(runtime)

		// 映射每个元素
		for i := int64(0); i < length; i++ {
			val := this.Get(getIndexString(i))
			// 调用回调函数
			res, err := callback(thisArg, val, runtime.ToValue(i), this)
			if err != nil {
				panic(err)
			}
			// 将结果转换为字节
			byteVal := byte(res.ToInteger() & 0xFF)
			newBufObj.Set(getIndexString(i), runtime.ToValue(byteVal))
		}

		return newBuf
	}
	mapValue := runtime.ToValue(mapFunc)
	setFunctionNameAndLength(runtime, mapValue, "map", 1)
	prototype.Set("map", mapValue)

}
