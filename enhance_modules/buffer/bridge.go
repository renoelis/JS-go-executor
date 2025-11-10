package buffer

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/dop251/goja"
)

// EnhanceBufferSupport 增强Buffer功能，补充官方goja_nodejs不支持的方法
func (be *BufferEnhancer) EnhanceBufferSupport(runtime *goja.Runtime) {
	// 首先设置 BigInt 支持
	be.setupBigIntSupport(runtime)

	bufferObj := runtime.Get("Buffer")
	if bufferObj == nil {
		return
	}

	buffer, ok := bufferObj.(*goja.Object)
	if !ok {
		return
	}

	// 注意：不再包装 Buffer 构造函数，因为会影响 Buffer.alloc 的 fill 参数处理
	// typedArrayCreate 中已经添加了对 Buffer.alloc 的支持，足以处理 Uint8Array.prototype.slice 等场景
	// be.wrapBufferConstructor(runtime, buffer)

	// 保存原始的 Buffer.from 方法
	originalFrom := buffer.Get("from")

	// 覆盖 Buffer.from 静态方法，支持编码参数
	buffer.Set("from", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received undefined"))
		}

		arg0 := call.Arguments[0]

		// 获取编码参数（如果有）
		encoding := "utf8"
		if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) {
			encoding = call.Arguments[1].String()
		}
		// 🔥 修复：编码大小写不敏感
		encoding = strings.ToLower(encoding)

		// 判断第一个参数的类型
		if goja.IsNull(arg0) || goja.IsUndefined(arg0) {
			panic(runtime.NewTypeError("第一个参数必须是字符串、Buffer、ArrayBuffer、Array 或类数组对象"))
		}

		// 如果是字符串，根据编码创建 Buffer
		arg0Type := arg0.ExportType()
		if arg0Type != nil && arg0Type.Kind().String() == "string" {
			str := arg0.String()

			// 使用我们的编码逻辑创建 buffer
			var data []byte

			switch encoding {
			case "hex":
				// 🔥 修复：使用宽松的 hex 解码，处理奇数长度字符串
				decoded, err := decodeHexLenient(str)
				if err != nil {
					panic(runtime.NewTypeError("无效的十六进制字符串"))
				}
				data = decoded
			case "base64":
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
				// Latin1: 每个 UTF-16 码元的低 8 位
				codeUnits := stringToUTF16CodeUnits(str)
				data = make([]byte, len(codeUnits))
				for i, unit := range codeUnits {
					data[i] = byte(unit) & 0xFF
				}
			case "ascii":
				// 🔥 修复：按 UTF-16 码元处理，不是 Unicode 码点
				// ASCII: 每个 UTF-16 码元的低 7 位
				codeUnits := stringToUTF16CodeUnits(str)
				data = make([]byte, len(codeUnits))
				for i, unit := range codeUnits {
					data[i] = byte(unit) & 0x7F
				}
			case "utf16le", "ucs2", "ucs-2", "utf-16le":
				// UTF-16LE 编码
				byteCount := utf16CodeUnitCount(str) * 2
				data = make([]byte, byteCount)
				offset := 0
				for _, r := range str {
					if r <= 0xFFFF {
						data[offset] = byte(r)
						data[offset+1] = byte(r >> 8)
						offset += 2
					} else {
						rPrime := r - 0x10000
						high := uint16(0xD800 + (rPrime >> 10))
						low := uint16(0xDC00 + (rPrime & 0x3FF))
						data[offset] = byte(high)
						data[offset+1] = byte(high >> 8)
						offset += 2
						data[offset] = byte(low)
						data[offset+1] = byte(low >> 8)
						offset += 2
					}
				}
			case "utf8", "utf-8":
				// UTF-8
				data = []byte(str)
			default:
				// 🔥 修复：未知编码应该抛出错误（Node.js 行为）
				panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", encoding)))
			}

			// 🔥 性能优化：直接使用 ArrayBuffer 而不是 Array
			// 创建 ArrayBuffer
			ab := runtime.NewArrayBuffer(data)

			// 调用原生 Buffer.from(arrayBuffer)
			if !goja.IsUndefined(originalFrom) {
				fromFunc, ok := goja.AssertFunction(originalFrom)
				if !ok {
					panic(runtime.NewTypeError("Buffer.from 不是一个函数"))
				}
				result, err := fromFunc(goja.Undefined(), runtime.ToValue(ab))
				if err != nil {
					// 🔥 修复：直接抛出原始错误，不包装（保留 Node.js 的错误信息）
					panic(err)
				}
				return result
			}

			panic(runtime.NewTypeError("Buffer.from 不可用"))
		}

		// 对于其他类型（数组、Buffer、ArrayBuffer等），调用原生实现
		if !goja.IsUndefined(originalFrom) {
			// 🔥 修复：检查 ArrayBuffer + offset 参数（对齐 Node.js 错误信息）
			// 如果第一个参数是 ArrayBuffer 且有第二个参数（offset），需要先验证
			if arg0Obj := arg0.ToObject(runtime); arg0Obj != nil {
				if _, isArrayBuffer := arg0Obj.Export().(goja.ArrayBuffer); isArrayBuffer {
					if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) {
						offset := call.Arguments[1].ToInteger()
						bufferLen := int64(0)
						if ab, ok := arg0Obj.Export().(goja.ArrayBuffer); ok {
							bufferLen = int64(len(ab.Bytes()))
						}

						// 检查 offset 是否越界
						if offset < 0 {
							panic(runtime.NewTypeError(fmt.Sprintf("Start offset %d is outside the bounds of the buffer", offset)))
						}
						if offset > bufferLen {
							panic(runtime.NewTypeError(fmt.Sprintf("Start offset %d is outside the bounds of the buffer", offset)))
						}

						// 如果有第三个参数（length），也需要检查
						if len(call.Arguments) >= 3 && !goja.IsUndefined(call.Arguments[2]) {
							length := call.Arguments[2].ToInteger()
							// 负数 length 被视为 0，直接返回空 Buffer
							if length < 0 {
								// 创建空 Buffer
								allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
								if ok {
									result, err := allocFunc(buffer, runtime.ToValue(0))
									if err == nil {
										return result
									}
								}
							}
							if offset+int64(length) > bufferLen {
								panic(runtime.NewTypeError("\"length\" is outside of buffer bounds"))
							}
						}
					}
				}
			}

			fromFunc, ok := goja.AssertFunction(originalFrom)
			if !ok {
				panic(runtime.NewTypeError("Buffer.from 不是一个函数"))
			}
			result, err := fromFunc(goja.Undefined(), call.Arguments...)
			if err != nil {
				// 🔥 修复：直接抛出原始错误，不包装（保留 Node.js 的错误信息）
				panic(err)
			}
			return result
		}

		panic(runtime.NewTypeError("第一个参数必须是字符串、Buffer、ArrayBuffer、Array 或类数组对象"))
	})

	// 添加 Buffer.isBuffer 静态方法（修复版 - 严格区分 Buffer 和 TypedArray）
	buffer.Set("isBuffer", func(obj goja.Value) bool {
		if obj == nil || goja.IsUndefined(obj) || goja.IsNull(obj) {
			return false
		}

		// 排除原始类型（字符串、数字、布尔值）
		objType := obj.ExportType()
		if objType != nil {
			kind := objType.Kind().String()
			if kind == "string" || kind == "int" || kind == "int64" || kind == "float64" || kind == "bool" {
				return false
			}
		}

		// 检查是否为Buffer实例
		objAsObject := obj.ToObject(runtime)
		if objAsObject == nil {
			return false
		}

		// 🔥 关键修复：先检查原型链，确保是 Buffer 实例
		bufferConstructor := runtime.Get("Buffer")
		isBufferInstance := false
		if !goja.IsUndefined(bufferConstructor) {
			if bufferCtor := bufferConstructor.ToObject(runtime); bufferCtor != nil {
				if prototype := bufferCtor.Get("prototype"); !goja.IsUndefined(prototype) {
					if protoObj := prototype.ToObject(runtime); protoObj != nil {
						// 检查对象的原型链
						objProto := objAsObject.Prototype()
						if objProto != nil && objProto == protoObj {
							isBufferInstance = true
						}
					}
				}
			}
		}

		// 如果原型链检查成功，直接返回 true
		if isBufferInstance {
			return true
		}

		// 如果原型链检查失败，再检查 constructor.name 排除 TypedArray
		if constructor := objAsObject.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
				if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
					nameStr := name.String()
					// 明确排除所有 TypedArray 类型和 ArrayBuffer
					typedArrayTypes := []string{
						"Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array",
						"Int8Array", "Int16Array", "Int32Array",
						"Float32Array", "Float64Array",
						"BigInt64Array", "BigUint64Array",
						"DataView", "ArrayBuffer",
						"Array", "Object", "String", "Number", "Boolean",
					}
					for _, typedArrayType := range typedArrayTypes {
						if nameStr == typedArrayType {
							return false
						}
					}

					// 如果不是 "Buffer"，返回 false
					if nameStr != "Buffer" {
						return false
					}
				}
			}
		}

		// 最后的兜底检查：必须同时具备 Buffer 特有的多个方法（但不是 TypedArray 的方法）
		hasReadInt8 := !goja.IsUndefined(objAsObject.Get("readInt8"))
		hasWriteInt8 := !goja.IsUndefined(objAsObject.Get("writeInt8"))
		hasReadUInt8 := !goja.IsUndefined(objAsObject.Get("readUInt8"))
		hasWriteUInt8 := !goja.IsUndefined(objAsObject.Get("writeUInt8"))
		hasCopy := !goja.IsUndefined(objAsObject.Get("copy"))

		// TypedArray 没有这些方法，Buffer 才有
		return hasReadInt8 && hasWriteInt8 && hasReadUInt8 && hasWriteUInt8 && hasCopy
	})

	// 添加 Buffer.allocUnsafe 静态方法
	buffer.Set("allocUnsafe", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("size 参数是必需的"))
		}

		size := call.Arguments[0].ToInteger()
		if size < 0 {
			panic(runtime.NewTypeError("size 参数必须非负"))
		}

		// 使用Buffer.alloc创建，但不初始化内容（在实际实现中allocUnsafe不会清零）
		allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.alloc 不可用"))
		}

		result, err := allocFunc(buffer, runtime.ToValue(size))
		if err != nil {
			panic(err)
		}
		return result
	})

	// 添加 Buffer.allocUnsafeSlow 静态方法
	buffer.Set("allocUnsafeSlow", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("size 参数是必需的"))
		}

		size := call.Arguments[0].ToInteger()
		if size < 0 {
			panic(runtime.NewTypeError("size 参数必须非负"))
		}

		// allocUnsafeSlow 创建非池化的Buffer
		allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.alloc 不可用"))
		}

		result, err := allocFunc(buffer, runtime.ToValue(size))
		if err != nil {
			panic(err)
		}
		return result
	})

	// 添加 Buffer.byteLength 静态方法
	buffer.Set("byteLength", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("字符串参数是必需的"))
		}

		str := call.Arguments[0].String()
		encoding := "utf8"
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			encoding = call.Arguments[1].String()
		}
		// 🔥 修复：编码大小写不敏感
		encoding = strings.ToLower(encoding)

		var length int
		switch encoding {
		case "utf8", "utf-8":
			length = len([]byte(str))
		case "hex":
			// 🔥 优化：使用公式估算，避免实际解码
			// hex: 每 2 个字符 = 1 字节
			length = len(str) / 2
		case "base64":
			// 🔥 Node.js 行为：不移除空白字符，直接按公式估算
			// 注意：这会导致 byteLength 可能大于实际 Buffer.from() 的长度
			// 这是 Node.js 的设计行为（文档已说明）
			cleanStr := strings.Map(func(r rune) rune {
				if r == '=' {
					return -1
				}
				return r
			}, str)
			length = (len(cleanStr) * 3) / 4
		case "base64url":
			// 🔥 Node.js 行为：不移除空白字符，直接按公式估算
			cleanStr := strings.Map(func(r rune) rune {
				if r == '=' {
					return -1
				}
				return r
			}, str)
			length = (len(cleanStr) * 3) / 4
		case "ascii", "latin1", "binary":
			// 🔥 修复：按 UTF-16 码元计数，不是 UTF-8 字节数
			// Node.js 字符串是 UTF-16，每个码元对应 1 字节
			length = utf16CodeUnitCount(str)
		case "utf16le", "ucs2", "ucs-2", "utf-16le":
			// UTF-16LE: 每个 UTF-16 码元占 2 字节
			// 需要计算 UTF-16 码元数量（包括 surrogate pairs）
			// 例如：'𠮷' (U+20BB7) 是 1 个 rune，但在 UTF-16 中是 2 个码元 = 4 字节
			length = utf16CodeUnitCount(str) * 2
		default:
			length = len([]byte(str))
		}

		return runtime.ToValue(length)
	})

	// 添加 Buffer.isEncoding 静态方法
	// 🔥 修复：支持大小写混合（Node.js 行为）
	buffer.Set("isEncoding", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}

		encoding := strings.ToLower(call.Arguments[0].String())
		switch encoding {
		case "utf8", "utf-8", "hex", "base64", "base64url",
			"ascii", "latin1", "binary",
			"utf16le", "ucs2", "ucs-2", "utf-16le":
			return runtime.ToValue(true)
		default:
			return runtime.ToValue(false)
		}
	})

	// 添加 Buffer.compare 静态方法
	// 🔥 100% 对齐 Node.js v25.0.0 行为：严格参数验证
	buffer.Set("compare", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received undefined"))
		}
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received undefined"))
		}

		// 验证 buf1
		buf1Arg := call.Arguments[0]
		if goja.IsNull(buf1Arg) {
			panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received null"))
		}
		if goja.IsUndefined(buf1Arg) {
			panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received undefined"))
		}

		// 先检查 buf1 是否是基本类型
		exportedVal1 := buf1Arg.Export()
		if exportedVal1 == nil {
			panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received null"))
		}
		switch v := exportedVal1.(type) {
		case string:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received type string ('%s')", v)))
		case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received type number (%v)", v)))
		case bool:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received type boolean (%v)", v)))
		}

		buf1 := buf1Arg.ToObject(runtime)
		if buf1 == nil {
			panic(runtime.NewTypeError(fmt.Sprintf("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received %v", buf1Arg.String())))
		}

		// 🔥 先检查 constructor.name 以快速排除 Array, Function 等
		if constructor := buf1.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
				if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
					nameStr := name.String()
					switch nameStr {
					case "Array":
						panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received an instance of Array"))
					case "Function":
						panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received function "))
					case "RegExp":
						panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received an instance of RegExp"))
					case "Date":
						panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received an instance of Date"))
					case "DataView":
						panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received an instance of DataView"))
					}
				}
			}
		}

		buf1LengthVal := buf1.Get("length")
		if buf1LengthVal == nil || goja.IsUndefined(buf1LengthVal) {
			panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object"))
		}

		// 🔥 验证 buf1 是否真的是 Buffer/TypedArray
		buf1Len := buf1LengthVal.ToInteger()
		if buf1Len > 0 {
			firstElem := buf1.Get("0")
			if firstElem == nil || goja.IsUndefined(firstElem) {
				panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object"))
			}
		} else {
			byteLength := buf1.Get("byteLength")
			if goja.IsUndefined(byteLength) {
				bufferProp := buf1.Get("buffer")
				if goja.IsUndefined(bufferProp) {
					bytesPerElem := buf1.Get("BYTES_PER_ELEMENT")
					writeMethod := buf1.Get("write")
					if goja.IsUndefined(bytesPerElem) && goja.IsUndefined(writeMethod) {
						panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object"))
					}
				}
			}
		}

		// 验证 buf2
		buf2Arg := call.Arguments[1]
		if goja.IsNull(buf2Arg) {
			panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received null"))
		}
		if goja.IsUndefined(buf2Arg) {
			panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received undefined"))
		}

		// 先检查 buf2 是否是基本类型
		exportedVal2 := buf2Arg.Export()
		if exportedVal2 == nil {
			panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received null"))
		}
		switch v := exportedVal2.(type) {
		case string:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received type string ('%s')", v)))
		case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received type number (%v)", v)))
		case bool:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received type boolean (%v)", v)))
		}

		buf2 := buf2Arg.ToObject(runtime)
		if buf2 == nil {
			panic(runtime.NewTypeError(fmt.Sprintf("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received %v", buf2Arg.String())))
		}

		// 🔥 先检查 constructor.name 以快速排除 Array, Function 等
		if constructor := buf2.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
				if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
					nameStr := name.String()
					switch nameStr {
					case "Array":
						panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received an instance of Array"))
					case "Function":
						panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received function "))
					case "RegExp":
						panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received an instance of RegExp"))
					case "Date":
						panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received an instance of Date"))
					case "DataView":
						panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received an instance of DataView"))
					}
				}
			}
		}

		buf2LengthVal := buf2.Get("length")
		if buf2LengthVal == nil || goja.IsUndefined(buf2LengthVal) {
			panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object"))
		}

		// 🔥 验证 buf2 是否真的是 Buffer/TypedArray
		buf2Len := buf2LengthVal.ToInteger()
		if buf2Len > 0 {
			firstElem := buf2.Get("0")
			if firstElem == nil || goja.IsUndefined(firstElem) {
				panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object"))
			}
		} else {
			byteLength := buf2.Get("byteLength")
			if goja.IsUndefined(byteLength) {
				bufferProp := buf2.Get("buffer")
				if goja.IsUndefined(bufferProp) {
					bytesPerElem := buf2.Get("BYTES_PER_ELEMENT")
					writeMethod := buf2.Get("write")
					if goja.IsUndefined(bytesPerElem) && goja.IsUndefined(writeMethod) {
						panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object"))
					}
				}
			}
		}

		// 获取两个buffer的长度
		len1 := buf1LengthVal.ToInteger()
		len2 := buf2LengthVal.ToInteger()

		// 比较每个字节
		minLength := len1
		if len2 < minLength {
			minLength = len2
		}

		for i := int64(0); i < minLength; i++ {
			val1 := int64(0)
			val2 := int64(0)

			if v := buf1.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(v) {
				val1 = v.ToInteger() & 0xFF
			}
			if v := buf2.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(v) {
				val2 = v.ToInteger() & 0xFF
			}

			if val1 < val2 {
				return runtime.ToValue(-1)
			}
			if val1 > val2 {
				return runtime.ToValue(1)
			}
		}

		// 如果所有比较的字节都相等，比较长度
		if len1 < len2 {
			return runtime.ToValue(-1)
		}
		if len1 > len2 {
			return runtime.ToValue(1)
		}
		return runtime.ToValue(0)
	})

	// 添加 Buffer.concat 静态方法
	buffer.Set("concat", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("buffers 参数是必需的"))
		}

		buffers := call.Arguments[0]
		totalLength := int64(0)

		// 如果提供了总长度参数
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			totalLength = call.Arguments[1].ToInteger()
			// 🔥 修复：检查负数总长度（对齐 Node.js v25.0.0）
			if totalLength < 0 {
				errObj := runtime.NewGoError(fmt.Errorf("The value of \"length\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", totalLength))
				errObj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
				errObj.Set("name", runtime.ToValue("RangeError"))
				panic(errObj)
			}
		}

		buffersObj := buffers.ToObject(runtime)
		if buffersObj == nil {
			panic(runtime.NewTypeError("Buffers 必须是一个数组"))
		}

		// 获取数组长度
		lengthVal := buffersObj.Get("length")
		if goja.IsUndefined(lengthVal) {
			panic(runtime.NewTypeError("Buffers 必须是一个数组"))
		}

		arrayLength := lengthVal.ToInteger()
		if arrayLength == 0 {
			// 返回空Buffer
			allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
			if !ok {
				panic(runtime.NewTypeError("Buffer.alloc 不可用"))
			}
			result, err := allocFunc(buffer, runtime.ToValue(0))
			if err != nil {
				panic(err)
			}
			return result
		}

		// 计算总长度（如果没有提供）
		bufferObjects := make([]*goja.Object, arrayLength)
		if totalLength == 0 {
			// 🔥 修复：如果明确指定 totalLength 为 0，直接返回空 Buffer
			if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
				allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
				if !ok {
					panic(runtime.NewTypeError("Buffer.alloc 不可用"))
				}
				result, err := allocFunc(buffer, runtime.ToValue(0))
				if err != nil {
					panic(err)
				}
				return result
			}
			// 否则计算实际总长度
			for i := int64(0); i < arrayLength; i++ {
				bufObj := buffersObj.Get(strconv.FormatInt(i, 10))
				if !goja.IsUndefined(bufObj) {
					if bufferObj := bufObj.ToObject(runtime); bufferObj != nil {
						bufferObjects[i] = bufferObj
						if lengthProp := bufferObj.Get("length"); !goja.IsUndefined(lengthProp) {
							totalLength += lengthProp.ToInteger()
						}
					}
				}
			}
		} else {
			// 获取buffer对象引用
			for i := int64(0); i < arrayLength; i++ {
				bufObj := buffersObj.Get(strconv.FormatInt(i, 10))
				if !goja.IsUndefined(bufObj) {
					if bufferObj := bufObj.ToObject(runtime); bufferObj != nil {
						bufferObjects[i] = bufferObj
					}
				}
			}
		}

		// 创建结果Buffer
		allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.alloc 不可用"))
		}

		result, err := allocFunc(buffer, runtime.ToValue(totalLength))
		if err != nil {
			panic(err)
		}

		resultObj := result.ToObject(runtime)
		if resultObj == nil {
			panic(runtime.NewTypeError("创建结果 buffer 失败"))
		}

		// 复制数据
		offset := int64(0)
		for i := int64(0); i < arrayLength && offset < totalLength; i++ {
			bufferObj := bufferObjects[i]
			if bufferObj == nil {
				continue
			}

			bufferLength := int64(0)
			if lengthProp := bufferObj.Get("length"); !goja.IsUndefined(lengthProp) {
				bufferLength = lengthProp.ToInteger()
			}

			for j := int64(0); j < bufferLength && offset < totalLength; j++ {
				if val := bufferObj.Get(strconv.FormatInt(j, 10)); !goja.IsUndefined(val) {
					resultObj.Set(strconv.FormatInt(offset, 10), val)
				}
				offset++
			}
		}

		return result
	})

	// 🔥 P1 修复：添加 Buffer.poolSize 属性 (Node.js v18+)
	// poolSize 控制预分配的内部 Buffer 池的大小（字节）
	// 默认值：8192 (8KB)
	buffer.Set("poolSize", runtime.ToValue(8192))

	// 🔥 性能优化：使用优化的 Buffer.alloc 实现（带 Buffer 池）
	SetupOptimizedBufferAlloc(runtime, be.pool)

	// 为Buffer原型添加扩展方法
	be.enhanceBufferPrototype(runtime)

	// 🔥 添加 TypedArray.from() 和 of() 静态方法
	// 注：虽然 goja 内部已实现 typedArray_from 和 typedArray_of 函数，
	// 但通过 _putProp 添加的方法无法在 JavaScript 中访问（原因未知）
	// 因此使用 JavaScript polyfill 作为可靠的解决方案
	be.polyfillTypedArrayFeatures(runtime)

	// 注：length 属性只读行为已在 goja/typedarrays.go 中修复
}

// enhanceBufferPrototype 为Buffer原型添加扩展方法
func (be *BufferEnhancer) enhanceBufferPrototype(runtime *goja.Runtime) {
	// 获取一个Buffer实例来访问其原型
	bufferConstructor := runtime.Get("Buffer")
	if bufferConstructor == nil {
		return
	}

	// 创建一个临时Buffer来获取原型
	tempBufferFunc, ok := goja.AssertFunction(bufferConstructor.ToObject(runtime).Get("from"))
	if !ok {
		return
	}

	tempBuffer, err := tempBufferFunc(bufferConstructor, runtime.ToValue(""))
	if err != nil {
		return
	}

	prototype := tempBuffer.ToObject(runtime).Prototype()
	if prototype == nil {
		return
	}

	// 添加原型方法（write, toString, slice, indexOf 等）
	be.addBufferPrototypeMethods(runtime, prototype)

	// 添加数值读写方法（readInt8, writeInt8 等）
	be.addBufferNumericMethods(runtime, prototype)

	// 添加迭代器方法（entries, keys, values）
	be.addBufferIteratorMethods(runtime, prototype)

	// 添加可变长度整数方法（readIntLE, writeUIntBE 等）
	be.addBufferVariableLengthMethods(runtime, prototype)

	// 添加 BigInt 方法（readBigInt64LE, writeBigUInt64BE 等）
	be.addBigIntReadWriteMethods(runtime, prototype)
}

// 注：以下功能已移除，因为 goja 已原生支持或已在源码中修复：

// polyfillTypedArrayFeatures 为 TypedArray 添加缺失的功能
// 添加 Uint8Array.from() 和 Uint8Array.of() 静态方法（Node.js v25.0.0 标准）
// 性能影响：仅在初始化时执行一次，运行时零开销
func (be *BufferEnhancer) polyfillTypedArrayFeatures(runtime *goja.Runtime) {
	// 注入 JavaScript polyfill 代码
	polyfillCode := `
(function() {
'use strict';

// 添加 Uint8Array.from() 静态方法
if (typeof Uint8Array.from !== 'function') {
Uint8Array.from = function(arrayLike, mapFn, thisArg) {
// arrayLike 可以是数组或类数组对象
if (arrayLike == null) {
throw new TypeError('Uint8Array.from requires an array-like object');
}

// 获取长度
const len = arrayLike.length >>> 0;
const result = new Uint8Array(len);

// 复制元素
for (let i = 0; i < len; i++) {
let value = arrayLike[i];
if (mapFn) {
value = mapFn.call(thisArg, value, i);
}
result[i] = value;
}

return result;
};
}

// 添加 Uint8Array.of() 静态方法
if (typeof Uint8Array.of !== 'function') {
Uint8Array.of = function() {
const len = arguments.length;
const result = new Uint8Array(len);
for (let i = 0; i < len; i++) {
result[i] = arguments[i];
}
return result;
};
}

// 为其他 TypedArray 类型也添加 from 和 of 方法
const typedArrayCtors = [
Uint8ClampedArray, Int8Array,
Uint16Array, Int16Array,
Uint32Array, Int32Array,
Float32Array, Float64Array
];

typedArrayCtors.forEach(function(TypedArrayCtor) {
if (typeof TypedArrayCtor.from !== 'function') {
TypedArrayCtor.from = function(arrayLike, mapFn, thisArg) {
if (arrayLike == null) {
throw new TypeError(TypedArrayCtor.name + '.from requires an array-like object');
}
const len = arrayLike.length >>> 0;
const result = new TypedArrayCtor(len);
for (let i = 0; i < len; i++) {
let value = arrayLike[i];
if (mapFn) {
value = mapFn.call(thisArg, value, i);
}
result[i] = value;
}
return result;
};
}

if (typeof TypedArrayCtor.of !== 'function') {
TypedArrayCtor.of = function() {
const len = arguments.length;
const result = new TypedArrayCtor(len);
for (let i = 0; i < len; i++) {
result[i] = arguments[i];
}
return result;
};
}
});
})();
`

	// 执行 polyfill 代码
	_, err := runtime.RunString(polyfillCode)
	if err != nil {
		// 如果 polyfill 失败，静默忽略（保持向后兼容）
		// 在生产环境中，应该使用日志系统记录
		_ = err
	}
	
	// 🔥 修复：添加 util.inspect 支持
	be.setupUtilInspect(runtime)
}

// wrapBufferConstructor 包装 Buffer 构造函数，支持数字参数
func (be *BufferEnhancer) wrapBufferConstructor(runtime *goja.Runtime, originalBuffer *goja.Object) {
	// 创建新的构造函数
	newConstructor := func(call goja.ConstructorCall) *goja.Object {
		// 如果只有一个参数且是数字，调用 Buffer.alloc
		if len(call.Arguments) == 1 {
			arg := call.Arguments[0]
			if !goja.IsUndefined(arg) && !goja.IsNull(arg) {
				// 检查是否是数字类型
				exported := arg.Export()
				var size int64
				switch v := exported.(type) {
				case int64:
					size = v
				case float64:
					size = int64(v)
				case int:
					size = int64(v)
				case int32:
					size = int64(v)
				case uint32:
					size = int64(v)
				default:
					// 不是数字，抛出错误
					panic(runtime.NewTypeError("Buffer constructor is deprecated. Use Buffer.alloc(), Buffer.allocUnsafe() or Buffer.from() instead"))
				}
				
				// 调用 Buffer.alloc
				allocFunc, ok := goja.AssertFunction(originalBuffer.Get("alloc"))
				if ok {
					result, err := allocFunc(goja.Undefined(), runtime.ToValue(size))
					if err != nil {
						panic(err)
					}
					return result.ToObject(runtime)
				}
			}
		}
		
		// 对于其他情况，抛出友好错误
		panic(runtime.NewTypeError("Buffer constructor is deprecated. Use Buffer.alloc(), Buffer.allocUnsafe() or Buffer.from() instead"))
	}
	
	// 将新构造函数转换为对象
	newBufferValue := runtime.ToValue(newConstructor)
	newBufferObj := newBufferValue.ToObject(runtime)
	
	// 复制所有静态方法和属性
	for _, key := range originalBuffer.Keys() {
		val := originalBuffer.Get(key)
		newBufferObj.Set(key, val)
	}
	
	// 设置 prototype
	newBufferObj.Set("prototype", originalBuffer.Get("prototype"))
	
	// 保留 name 属性
	newBufferObj.Set("name", runtime.ToValue("Buffer"))
	
	// 替换全局 Buffer
	runtime.Set("Buffer", newBufferObj)
}

// setupUtilInspect 添加 util.inspect 方法支持
func (be *BufferEnhancer) setupUtilInspect(runtime *goja.Runtime) {
	// 方法1: 修改全局 util
	utilModule := runtime.Get("util")
	var utilObj *goja.Object
	
	if utilModule == nil || goja.IsUndefined(utilModule) {
		utilObj = runtime.NewObject()
		runtime.Set("util", utilObj)
	} else {
		utilObj = utilModule.ToObject(runtime)
	}
	
	// 创建 inspect 函数
	inspectFunc := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue("undefined")
		}
		
		obj := call.Arguments[0]
		
		// 检查对象是否有自定义的 inspect 方法
		if objVal := obj.ToObject(runtime); objVal != nil {
			if inspectMethod := objVal.Get("inspect"); !goja.IsUndefined(inspectMethod) {
				if fn, ok := goja.AssertFunction(inspectMethod); ok {
					result, err := fn(obj)
					if err == nil {
						return result
					}
				}
			}
		}
		
		// 默认实现：转换为字符串
		exported := obj.Export()
		if exported == nil {
			return runtime.ToValue("null")
		}
		
		return runtime.ToValue(fmt.Sprintf("%v", exported))
	}
	
	// 设置到全局 util（如果存在）
	if utilObj != nil {
		utilObj.Set("inspect", inspectFunc)
	}
	
	// 方法2: 通过 JavaScript 注入到 require('util')
	// 这确保 require('util').inspect 可用
	polyfillCode := `
(function() {
	try {
		var utilModule = require('util');
		if (utilModule && typeof utilModule.inspect === 'undefined') {
			// 从全局 util 复制 inspect 方法
			var globalUtil = (typeof util !== 'undefined') ? util : {};
			if (typeof globalUtil.inspect === 'function') {
				utilModule.inspect = globalUtil.inspect;
			}
		}
	} catch (e) {
		// 如果 require('util') 失败，静默忽略
	}
})();
`
	_, _ = runtime.RunString(polyfillCode)
}
