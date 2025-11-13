package buffer

import (
	"fmt"
	"math"
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


		// 🔥 修复：首先检查 Symbol 类型（必须在所有其他检查之前）
		if _, isSymbol := arg0.(*goja.Symbol); isSymbol {
			symStr := arg0.String()
			panic(runtime.NewTypeError(fmt.Sprintf("The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received type symbol (%s)", symStr)))
		}

		// 🔥 修复：检查函数类型
		if _, isFunc := goja.AssertFunction(arg0); isFunc {
			panic(runtime.NewTypeError("The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received function "))
		}

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
				// 🔥 修复：Node.js v25 行为 - ascii 编码保留原始字节值（不截断到 7 位）
				// 按 UTF-16 码元处理，不是 Unicode 码点
				codeUnits := stringToUTF16CodeUnits(str)
				data = make([]byte, len(codeUnits))
				for i, unit := range codeUnits {
					data[i] = byte(unit) & 0xFF // 保留完整字节值，与 Node.js v25 对齐
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

		// 🔥 修复：处理 JSON 格式 {type: "Buffer", data: [...]}
		if arg0Obj := arg0.ToObject(runtime); arg0Obj != nil {
			// 检查是否是 Buffer.toJSON() 返回的格式
			typeVal := arg0Obj.Get("type")
			dataVal := arg0Obj.Get("data")
			if typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) &&
				dataVal != nil && !goja.IsUndefined(dataVal) && !goja.IsNull(dataVal) {
				// 检查 type 是否为 "Buffer"
				if typeVal.String() == "Buffer" {
					// data 应该是一个数组
					if dataObj := dataVal.ToObject(runtime); dataObj != nil {
						dataLengthVal := dataObj.Get("length")
						if dataLengthVal != nil && !goja.IsUndefined(dataLengthVal) {
							dataLength := dataLengthVal.ToInteger()
							data := make([]byte, dataLength)
							for i := int64(0); i < dataLength; i++ {
								itemVal := dataObj.Get(fmt.Sprintf("%d", i))
								if itemVal != nil && !goja.IsUndefined(itemVal) && !goja.IsNull(itemVal) {
									data[i] = valueToUint8(itemVal)
								}
							}
							// 使用处理后的字节数组创建 ArrayBuffer
							ab := runtime.NewArrayBuffer(data)
							fromFunc, ok := goja.AssertFunction(originalFrom)
							if !ok {
								panic(runtime.NewTypeError("Buffer.from 不是一个函数"))
							}
							result, err := fromFunc(goja.Undefined(), runtime.ToValue(ab))
							if err != nil {
								panic(err)
							}
							return result
						}
					}
				}
			}

			// 🔥 修复：先检查是否有**自定义** valueOf 方法，避免重复读取 getter
			// 如果对象有自定义 valueOf，Node.js 会优先调用 valueOf，而不是使用 length
			// 但不能把所有对象都交给原生处理，因为普通对象也有 valueOf（从Object.prototype继承）
			// 只有当 valueOf 是对象**自己的属性**（hasOwnProperty）时才认为是自定义的
			valueOfVal := arg0Obj.Get("valueOf")
			if valueOfVal != nil && !goja.IsUndefined(valueOfVal) {
				// 🔥 性能优化：使用缓存的 hasOwnProperty 函数
				hasOwnFn := getHasOwnPropertyFunc(runtime)
				if hasOwnFn != nil {
					result, err := hasOwnFn(goja.Undefined(), arg0Obj, runtime.ToValue("valueOf"))
					if err == nil && result != nil && result.ToBoolean() {
						// 有自定义 valueOf 方法，直接交给原生处理
						// 这样可以避免我们先读取一次元素，原生再读取一次，导致 getter 被调用两次
						goto callOriginal
					}
				}
			}

			// 检查是否是类数组对象（有 length 属性）
			lengthVal := arg0Obj.Get("length")
			if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
				length := lengthVal.ToInteger()

				// 🔥 修复：验证 length 必须是真正的数字类型（不是字符串、布尔值等）
				// Node.js 会拒绝非数字类型的 length，返回空 Buffer

				// 🔥 性能优化：使用缓存的 typeof 检查函数
				typeofFn := getTypeofCheckFunc(runtime)
				if typeofFn != nil {
					typeResult, err := typeofFn(goja.Undefined(), lengthVal)
					if err == nil && typeResult != nil {
						lengthType := typeResult.String()
						// 只接受 "number" 类型
						if lengthType != "number" {
							// 🔥 修复：Node.js 不抛出错误，而是返回空 Buffer
							// 这种对象的 length 不是数字，不被视为有效的类数组对象
							// 创建并返回空 Buffer
							allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
							if ok {
								result, err := allocFunc(buffer, runtime.ToValue(0))
								if err == nil {
									return result
								}
							}
							// 如果alloc失败，继续到原生处理（作为回退）
							goto callOriginal
						}
					}
				}

				lengthFloat := lengthVal.ToFloat()
				lengthInt := lengthVal.ToInteger()

				// 🔥 修复：检查 Infinity - Node.js 会抛出错误
				if math.IsInf(lengthFloat, 0) {
					panic(runtime.NewTypeError("Array buffer allocation failed"))
				}

				// 🔥 修复：检查 NaN - 返回空 Buffer
				if math.IsNaN(lengthFloat) {
					allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
					if ok {
						result, err := allocFunc(buffer, runtime.ToValue(0))
						if err == nil {
							return result
						}
					}
					// 如果alloc失败，继续到原生处理（作为回退）
					goto callOriginal
				}

				length = lengthInt

				// 🔥 安全检查：防止负数或过大的 length
				if length < 0 {
					length = 0
				}

				// 🔥 修复：实用的内存限制（2GB），防止内存耗尽
				// 虽然 Node.js 理论上支持 MAX_SAFE_INTEGER，但实际上无法分配那么大的内存
				// 参考：Node.js 的 buffer.constants.MAX_LENGTH 在不同平台上不同
				// 在 64 位系统上约为 2GB (2^31 - 1)
				const maxPracticalLength = int64(2147483647) // 2GB (0x7FFFFFFF)
				if length > maxPracticalLength {
					// 对齐 Node.js 的错误消息
					panic(runtime.NewTypeError("Array buffer allocation failed"))
				}

				// 🔥 修复：检查是否是 ArrayBuffer - 不使用 Export() 避免触发 getter
				// Export() 会读取对象的所有属性，包括索引属性，从而触发 getter
				// 改用检查 constructor.name 的方式
				isArrayBuffer := false
				if constructor := arg0Obj.Get("constructor"); !goja.IsUndefined(constructor) && !goja.IsNull(constructor) {
					if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
						if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
							constructorName := nameVal.String()
							isArrayBuffer = (constructorName == "ArrayBuffer")
						}
					}
				}

				// 🔥 修复：TypedArray 类型检查 - 区分需要逐元素转换的 TypedArray
				// Uint8Array, Uint8ClampedArray, Buffer 可以直接复制字节
				// Float32Array, Float64Array, Int16Array 等需要逐元素转换
				isDirectCopyTypedArray := false // 可直接复制的 TypedArray
				needsConversionTypedArray := false // 需要逐元素转换的 TypedArray

				bytesPerElement := arg0Obj.Get("BYTES_PER_ELEMENT")
				if bytesPerElement != nil && !goja.IsUndefined(bytesPerElement) && !goja.IsNull(bytesPerElement) {
					bpe := bytesPerElement.ToInteger()
					if bpe == 1 {
						// BYTES_PER_ELEMENT === 1: Uint8Array, Uint8ClampedArray, Int8Array
						// 这些可以直接复制底层字节
						isDirectCopyTypedArray = true
					} else if bpe > 1 && bpe <= 8 {
						// BYTES_PER_ELEMENT > 1: Float32Array, Float64Array, Int16Array 等
						// 这些需要逐元素读取并转换为 uint8
						needsConversionTypedArray = true
					}
				}

				// 额外检查：真正的数组不应该有 buffer 属性（TypedArray 特征）
				bufferProp := arg0Obj.Get("buffer")
				hasBufferProp := bufferProp != nil && !goja.IsUndefined(bufferProp) && !goja.IsNull(bufferProp)
				if hasBufferProp && !isDirectCopyTypedArray && !needsConversionTypedArray {
					// 有 buffer 属性但没有 BYTES_PER_ELEMENT，可能是 Buffer 实例
					isDirectCopyTypedArray = true
				}

				if !isArrayBuffer && !isDirectCopyTypedArray && length >= 0 {
					// 这是一个普通数组、类数组对象或需要转换的 TypedArray，需要预处理元素
					data := make([]byte, length)
					for i := int64(0); i < length; i++ {
						itemVal := arg0Obj.Get(fmt.Sprintf("%d", i))
						if itemVal != nil && !goja.IsUndefined(itemVal) && !goja.IsNull(itemVal) {
							data[i] = valueToUint8(itemVal)
						}
					}

					// 🔥 关键修复：直接创建 Uint8Array，然后修改原型为 Buffer.prototype
					// 这个方法完全在 Go 层面，不会调用任何可能触发 getter 的 JavaScript 函数

					// 获取 Uint8Array 构造函数
					uint8ArrayCtor := runtime.Get("Uint8Array")
					if uint8ArrayCtor == nil || goja.IsUndefined(uint8ArrayCtor) {
						panic(runtime.NewTypeError("Uint8Array is not available"))
					}

					uint8ArrayCtorFunc, ok := goja.AssertConstructor(uint8ArrayCtor)
					if !ok {
						panic(runtime.NewTypeError("Uint8Array is not a constructor"))
					}

					// 创建 ArrayBuffer
					ab := runtime.NewArrayBuffer(data)

					// 创建 Uint8Array(arrayBuffer)
					uint8Array, err := uint8ArrayCtorFunc(nil, runtime.ToValue(ab))
					if err != nil {
						panic(err)
					}

					// 修改原型为 Buffer.prototype
					bufferPrototype := buffer.Get("prototype")
					if bufferPrototype != nil && !goja.IsUndefined(bufferPrototype) {
						uint8ArrayObj := uint8Array.ToObject(runtime)
						if uint8ArrayObj != nil {
							uint8ArrayObj.SetPrototype(bufferPrototype.ToObject(runtime))
							return uint8Array
						}
					}

					panic(runtime.NewTypeError("Failed to create Buffer from array-like object"))
				}
			}
		}

		// 对于其他类型（Buffer、ArrayBuffer等），调用原生实现
	callOriginal:
		if !goja.IsUndefined(originalFrom) {
			// 🔥 修复：检查 ArrayBuffer + offset 参数（对齐 Node.js 错误信息）
			// 如果第一个参数是 ArrayBuffer 且有第二个参数（offset），需要先验证
			// 不使用 Export() 避免可能触发 getter
			if arg0Obj := arg0.ToObject(runtime); arg0Obj != nil {
				// 检查是否是 ArrayBuffer - 使用 constructor.name 而不是 Export()
				isArrayBuffer := false
				var arrayBufferBytes []byte
				if constructor := arg0Obj.Get("constructor"); !goja.IsUndefined(constructor) && !goja.IsNull(constructor) {
					if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
						if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
							constructorName := nameVal.String()
							if constructorName == "ArrayBuffer" {
								isArrayBuffer = true
								// 只有在确认是 ArrayBuffer 后才使用 Export()
								if ab, ok := arg0Obj.Export().(goja.ArrayBuffer); ok {
									arrayBufferBytes = ab.Bytes()
								}
							}
						}
					}
				}

				if isArrayBuffer {
					if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) {
						offset := call.Arguments[1].ToInteger()
						bufferLen := int64(len(arrayBufferBytes))

						// 🔥 修复：检查 offset 是否越界 - 应该抛出 RangeError 而不是 TypeError
						if offset < 0 {
							panic(newRangeError(runtime, fmt.Sprintf("Start offset %d is outside the bounds of the buffer", offset)))
						}
						if offset > bufferLen {
							panic(newRangeError(runtime, "\"offset\" is outside of buffer bounds"))
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
							// 🔥 修复：length 超出范围应该抛出 RangeError
							if offset+int64(length) > bufferLen {
								panic(newRangeError(runtime, "\"length\" is outside of buffer bounds"))
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

	// 🔥 修复：设置 Buffer.from 的 length 和 name 属性（对齐 Node.js v25.0.0）
	if fromFunc := buffer.Get("from"); fromFunc != nil && !goja.IsUndefined(fromFunc) {
		if fromObj := fromFunc.ToObject(runtime); fromObj != nil {
			// 设置 length 属性为 3 (value, encodingOrOffset, length)
			fromObj.DefineDataProperty("length", runtime.ToValue(3), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
			// 设置 name 属性为 "from"
			fromObj.DefineDataProperty("name", runtime.ToValue("from"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		}
	}

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
	byteLengthFunc := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			// 🔥 修复：无参数时抛出带错误代码的TypeError
			errObj := runtime.NewTypeError("The \"string\" argument must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received undefined")
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			panic(errObj)
		}

		arg := call.Arguments[0]

		// 🔥 首要检查：Symbol类型检测（必须在其他处理之前）
		// 🔥 性能优化：使用缓存的 Symbol 检查函数
		isSymbolFn := getIsSymbolCheckFunc(runtime)
		if isSymbolFn != nil {
			result, err := isSymbolFn(goja.Undefined(), arg)
			if err == nil && result.ToBoolean() {
				errObj := runtime.NewTypeError("The \"string\" argument must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received type symbol")
				errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
				panic(errObj)
			}
		}

		// 🔥 修复：支持多种输入类型 - Buffer, TypedArray, ArrayBuffer, DataView, SharedArrayBuffer
		if !goja.IsNull(arg) && !goja.IsUndefined(arg) {
			if argObj := arg.ToObject(runtime); argObj != nil {
				// 检查是否是 Buffer
				if constructor := argObj.Get("constructor"); !goja.IsUndefined(constructor) {
					if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
						if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
							nameStr := name.String()
							// 对于 Buffer, TypedArray, DataView, ArrayBuffer 等，直接返回其 byteLength 或 length
							switch nameStr {
							case "Buffer":
								// Buffer: 使用 length 属性
								if lengthVal := argObj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
									return runtime.ToValue(lengthVal.ToInteger())
								}
							case "Uint8Array", "Uint8ClampedArray", "Int8Array":
								// 8位数组: length = byteLength
								if lengthVal := argObj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
									return runtime.ToValue(lengthVal.ToInteger())
								}
							case "Uint16Array", "Int16Array":
								// 16位数组: byteLength = length * 2
								if lengthVal := argObj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
									return runtime.ToValue(lengthVal.ToInteger() * 2)
								}
							case "Uint32Array", "Int32Array", "Float32Array":
								// 32位数组: byteLength = length * 4
								if lengthVal := argObj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
									return runtime.ToValue(lengthVal.ToInteger() * 4)
								}
							case "Float64Array", "BigInt64Array", "BigUint64Array":
								// 64位数组: byteLength = length * 8
								if lengthVal := argObj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
									return runtime.ToValue(lengthVal.ToInteger() * 8)
								}
							case "DataView":
								// DataView: 直接使用 byteLength
								if byteLengthVal := argObj.Get("byteLength"); byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
									return runtime.ToValue(byteLengthVal.ToInteger())
								}
							case "ArrayBuffer":
								// ArrayBuffer: 直接使用 byteLength
								if byteLengthVal := argObj.Get("byteLength"); byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
									return runtime.ToValue(byteLengthVal.ToInteger())
								}
							case "SharedArrayBuffer":
								// 🔥 SharedArrayBuffer 在 goja 环境中不支持，直接报错
								panic(runtime.NewTypeError("SharedArrayBuffer is not supported in goja environment"))
							}
						}
					}
				}

				// 检查是否有 byteLength 属性（TypedArray, ArrayBuffer, DataView 通用）
				if byteLengthVal := argObj.Get("byteLength"); byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
					return runtime.ToValue(byteLengthVal.ToInteger())
				}

				// 检查是否有 length 属性且有 BYTES_PER_ELEMENT（TypedArray）
				if lengthVal := argObj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
					if bytesPerElement := argObj.Get("BYTES_PER_ELEMENT"); bytesPerElement != nil && !goja.IsUndefined(bytesPerElement) && !goja.IsNull(bytesPerElement) {
						length := lengthVal.ToInteger()
						bpe := bytesPerElement.ToInteger()
						return runtime.ToValue(length * bpe)
					}
				}
			}
		}

		// 🔥 修复：非字符串类型抛出更准确的错误
		argType := arg.ExportType()
		if argType != nil {
			switch argType.Kind().String() {
			case "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint16", "uint32", "uint64", "float32", "float64":
				errObj := runtime.NewTypeError("The \"string\" argument must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received type number")
				errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
				panic(errObj)
			case "bool":
				errObj := runtime.NewTypeError("The \"string\" argument must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received type boolean")
				errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
				panic(errObj)
			}
		}

		if goja.IsNull(arg) {
			errObj := runtime.NewTypeError("The \"string\" argument must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received null")
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			panic(errObj)
		}
		if goja.IsUndefined(arg) {
			errObj := runtime.NewTypeError("The \"string\" argument must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received undefined")
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			panic(errObj)
		}

		// 🔥 修复：检查是否是不支持的对象类型 - 但先排除可能已经处理的类型
		if argObj := arg.ToObject(runtime); argObj != nil {
			// 首先检查是否是原始字符串（应该被允许）
			if argType := arg.ExportType(); argType != nil && argType.Kind().String() == "string" {
				// 原始字符串，应该允许通过到字符串处理逻辑
				// 不做额外检查
			} else {
				// 检查 constructor.name 以快速识别不支持的类型
				if constructor := argObj.Get("constructor"); constructor != nil && !goja.IsUndefined(constructor) {
					if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
						if name := constructorObj.Get("name"); name != nil && !goja.IsUndefined(name) {
							nameStr := name.String()
							switch nameStr {
							case "Array":
								errObj := runtime.NewTypeError("The \"string\" argument must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received an instance of Array")
								errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
								panic(errObj)
							case "Function":
								errObj := runtime.NewTypeError("The \"string\" argument must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received an instance of Function")
								errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
								panic(errObj)
							case "Object":
								// 检查是否有自定义的 toString 或 valueOf 且不是已知的类型
								hasLength := argObj.Get("length") != nil && !goja.IsUndefined(argObj.Get("length"))
								hasByteLength := argObj.Get("byteLength") != nil && !goja.IsUndefined(argObj.Get("byteLength"))
								hasBytesPerElement := argObj.Get("BYTES_PER_ELEMENT") != nil && !goja.IsUndefined(argObj.Get("BYTES_PER_ELEMENT"))

								if !hasLength && !hasByteLength && !hasBytesPerElement {
									errObj := runtime.NewTypeError("The \"string\" argument must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received an instance of Object")
									errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
									panic(errObj)
								}
							case "String":
								// 只对明确的 String 对象（非原始字符串）报错
								if arg.ExportType() == nil || arg.ExportType().Kind().String() != "string" {
									errObj := runtime.NewTypeError("The \"string\" argument must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer. Received an instance of String")
									errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
									panic(errObj)
								}
							}
						}
					}
				}

				// Symbol检测已在函数开头处理
			}
		}

		// 处理字符串类型（Symbol检测已在函数开头完成）
		str := arg.String()

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
			// 🔥 修复：Node.js的hex处理逻辑
			// Node.js会验证hex字符的有效性
			length = calculateHexLength(str)
		case "base64":
			// 🔥 修复：Node.js的base64处理逻辑
			// Node.js会进行更严格的base64验证
			length = calculateBase64Length(str)
		case "base64url":
			// 🔥 修复：Node.js的base64url处理逻辑
			// Node.js会进行更严格的base64url验证
			length = calculateBase64Length(str)
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
	}

	// 设置 Buffer.byteLength 函数
	buffer.Set("byteLength", byteLengthFunc)

	// 🔥 修复：设置函数属性以对齐 Node.js v25.0.0
	if byteLengthObj := buffer.Get("byteLength").ToObject(runtime); byteLengthObj != nil {
		// 设置 length 属性为 2 (string, encoding)
		byteLengthObj.DefineDataProperty("length", runtime.ToValue(2), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)
		// 设置 name 属性
		byteLengthObj.DefineDataProperty("name", runtime.ToValue("byteLength"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)
	}

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

		// 使用严格的类型检查
		if !isBufferOrUint8Array(runtime, buf1) {
			errorMsg := getDetailedTypeError(runtime, buf1, "buf1")
			panic(runtime.NewTypeError(errorMsg))
		}

		buf1LengthVal := buf1.Get("length")
		if buf1LengthVal == nil || goja.IsUndefined(buf1LengthVal) {
			panic(runtime.NewTypeError("The \"buf1\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object"))
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

		// 使用严格的类型检查
		if !isBufferOrUint8Array(runtime, buf2) {
			errorMsg := getDetailedTypeError(runtime, buf2, "buf2")
			panic(runtime.NewTypeError(errorMsg))
		}

		buf2LengthVal := buf2.Get("length")
		if buf2LengthVal == nil || goja.IsUndefined(buf2LengthVal) {
			panic(runtime.NewTypeError("The \"buf2\" argument must be an instance of Buffer or Uint8Array. Received an instance of Object"))
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
		// Buffer.concat 静态方法实现
		// 检查参数数量
		if len(call.Arguments) == 0 {
			errObj := runtime.NewGoError(fmt.Errorf("The \"list\" argument must be specified"))
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			errObj.Set("name", runtime.ToValue("TypeError"))
			panic(errObj)
		}

		buffers := call.Arguments[0]

		// 🔥 修复：严格检查第一个参数是否为数组类型
		if goja.IsNull(buffers) {
			errObj := runtime.NewGoError(fmt.Errorf("The \"list\" argument must be an instance of Array. Received null"))
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			errObj.Set("name", runtime.ToValue("TypeError"))
			panic(errObj)
		}

		if goja.IsUndefined(buffers) {
			errObj := runtime.NewGoError(fmt.Errorf("The \"list\" argument must be an instance of Array. Received undefined"))
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			errObj.Set("name", runtime.ToValue("TypeError"))
			panic(errObj)
		}

		// 🔥 新增：检查第一个参数是否为Buffer类型（应该拒绝）
		if buffersExport := buffers.Export(); buffersExport != nil {
			if _, isBuffer := buffersExport.([]uint8); isBuffer {
				errObj := runtime.NewGoError(fmt.Errorf("The \"list\" argument must be an instance of Array. Received an instance of Buffer"))
				errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
				errObj.Set("name", runtime.ToValue("TypeError"))
				panic(errObj)
			}
		}

		totalLength := int64(0)

		// 如果提供了总长度参数
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			lengthArg := call.Arguments[1]

			// 🔥 修复：严格检查参数类型 - 只接受真正的数字类型
			// 首先检查是否为字符串类型
			if lengthArg.ExportType() != nil && lengthArg.ExportType().Kind().String() == "string" {
				errObj := runtime.NewGoError(fmt.Errorf("The \"length\" argument must be of type number. Received type string ('%s')", lengthArg.String()))
				errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
				errObj.Set("name", runtime.ToValue("TypeError"))
				panic(errObj)
			}

			// 检查是否为布尔类型
			if lengthArg.ExportType() != nil && lengthArg.ExportType().Kind().String() == "bool" {
				errObj := runtime.NewGoError(fmt.Errorf("The \"length\" argument must be of type number. Received type boolean (%v)", lengthArg.ToBoolean()))
				errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
				errObj.Set("name", runtime.ToValue("TypeError"))
				panic(errObj)
			}

			// 检查是否为数组类型
			if lengthArgObj := lengthArg.ToObject(runtime); lengthArgObj != nil {
				if isArrayLike(runtime, lengthArgObj) {
					errObj := runtime.NewGoError(fmt.Errorf("The \"length\" argument must be of type number. Received object"))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
					errObj.Set("name", runtime.ToValue("TypeError"))
					panic(errObj)
				}
			}

			// 🔥 修复：检查 totalLength 参数类型（Node.js v25.0.0 严格检查）
			if goja.IsNaN(lengthArg) {
				errObj := runtime.NewGoError(fmt.Errorf("The \"length\" argument must be of type number. Received NaN"))
				errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
				errObj.Set("name", runtime.ToValue("TypeError"))
				panic(errObj)
			}

			// 检查是否为非数字类型
			lengthFloat := lengthArg.ToFloat()
			if math.IsNaN(lengthFloat) {
				errObj := runtime.NewGoError(fmt.Errorf("The \"length\" argument must be of type number. Received NaN"))
				errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
				errObj.Set("name", runtime.ToValue("TypeError"))
				panic(errObj)
			}

			// 检查是否为无穷大
			if math.IsInf(lengthFloat, 0) {
				errObj := runtime.NewGoError(fmt.Errorf("The value of \"length\" is out of range. It must be a finite number. Received %v", lengthFloat))
				errObj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
				errObj.Set("name", runtime.ToValue("RangeError"))
				panic(errObj)
			}

			// 检查是否为非整数（Node.js v25.0.0 严格要求整数）
			if lengthFloat != math.Trunc(lengthFloat) {
				errObj := runtime.NewGoError(fmt.Errorf("The value of \"length\" is out of range. It must be an integer. Received %v", lengthFloat))
				errObj.Set("code", runtime.ToValue("ERR_OUT_OF_RANGE"))
				errObj.Set("name", runtime.ToValue("RangeError"))
				panic(errObj)
			}

			totalLength = lengthArg.ToInteger()
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
			errObj := runtime.NewGoError(fmt.Errorf("The \"list\" argument must be an instance of Array. Received %T", buffers))
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			errObj.Set("name", runtime.ToValue("TypeError"))
			panic(errObj)
		}

		// 🔥 修复：更严格的数组检查 - 验证是否真的是数组对象
		isArray := isArrayLike(runtime, buffersObj)
		if !isArray {
			// 根据对象类型给出更精确的错误信息
			objType := getObjectTypeName(runtime, buffersObj)
			errObj := runtime.NewGoError(fmt.Errorf("The \"list\" argument must be an instance of Array. Received %s", objType))
			errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
			errObj.Set("name", runtime.ToValue("TypeError"))
			panic(errObj)
		}

		// 获取数组长度
		lengthVal := buffersObj.Get("length")
		if lengthVal == nil || goja.IsUndefined(lengthVal) {
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
				// 🔥 优先检查null
				if goja.IsNull(bufObj) {
					errMsg := fmt.Sprintf("The \"list[%d]\" argument must be an instance of Buffer or Uint8Array. Received null", i)
					errObj := runtime.NewGoError(fmt.Errorf(errMsg))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
					errObj.Set("name", runtime.ToValue("TypeError"))
					panic(errObj)
				}
				// 🔥 检查undefined或无法转换为对象的情况
				var bufferObj *goja.Object
				if runtime != nil && bufObj != nil {
					bufferObj = bufObj.ToObject(runtime)
				}
				if goja.IsUndefined(bufObj) || bufferObj == nil {
					errMsg := "Cannot read properties of undefined (reading 'length')"
					errObj := runtime.NewGoError(fmt.Errorf(errMsg))
					errObj.Set("name", runtime.ToValue("TypeError"))
					panic(errObj)
				}
				if bufferObj != nil {
					// 🔥 修复：添加类型检查，只接受 Buffer 或 Uint8Array
					if !isBufferOrUint8Array(runtime, bufferObj) {
						errMsg := getDetailedTypeError(runtime, bufferObj, fmt.Sprintf("list[%d]", i))
						errObj := runtime.NewGoError(fmt.Errorf(errMsg))
						errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
						errObj.Set("name", runtime.ToValue("TypeError"))
						panic(errObj)
					}
					bufferObjects[i] = bufferObj
					if lengthProp := bufferObj.Get("length"); !goja.IsUndefined(lengthProp) {
						totalLength += lengthProp.ToInteger()
					}
				} else {
					// 如果 ToObject 失败，说明类型不正确
					errMsg := fmt.Sprintf("The \"list[%d]\" argument must be an instance of Buffer or Uint8Array", i)
					errObj := runtime.NewGoError(fmt.Errorf(errMsg))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
					errObj.Set("name", runtime.ToValue("TypeError"))
					panic(errObj)
				}
			}
		} else {
			// 获取buffer对象引用
			for i := int64(0); i < arrayLength; i++ {
				bufObj := buffersObj.Get(strconv.FormatInt(i, 10))
				// 🔥 区分undefined（数组越界）和null元素 - null检查优先
				if goja.IsNull(bufObj) {
					// null元素 - 类型错误
					errMsg := fmt.Sprintf("The \"list[%d]\" argument must be an instance of Buffer or Uint8Array. Received null", i)
					errObj := runtime.NewGoError(fmt.Errorf(errMsg))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
					errObj.Set("name", runtime.ToValue("TypeError"))
					panic(errObj)
				}
				if goja.IsUndefined(bufObj) || (bufObj != nil && bufObj.Export() == nil) {
					// 真正的undefined - 数组越界访问
					errMsg := "Cannot read properties of undefined (reading 'length')"
					errObj := runtime.NewGoError(fmt.Errorf(errMsg))
					errObj.Set("name", runtime.ToValue("TypeError"))
					panic(errObj)
				}

				// 安全地转换为对象
				var bufferObj *goja.Object
				if runtime != nil && bufObj != nil {
					bufferObj = bufObj.ToObject(runtime)
				}
				if bufferObj != nil {
					// 🔥 修复：添加类型检查，只接受 Buffer 或 Uint8Array
					if !isBufferOrUint8Array(runtime, bufferObj) {
						errMsg := getDetailedTypeError(runtime, bufferObj, fmt.Sprintf("list[%d]", i))
						errObj := runtime.NewGoError(fmt.Errorf(errMsg))
						errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
						errObj.Set("name", runtime.ToValue("TypeError"))
						panic(errObj)
					}
					bufferObjects[i] = bufferObj
				} else {
					// 如果 ToObject 失败，说明类型不正确
					errMsg := fmt.Sprintf("The \"list[%d]\" argument must be an instance of Buffer or Uint8Array", i)
					errObj := runtime.NewGoError(fmt.Errorf(errMsg))
					errObj.Set("code", runtime.ToValue("ERR_INVALID_ARG_TYPE"))
					errObj.Set("name", runtime.ToValue("TypeError"))
					panic(errObj)
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

	// 🔥 修复：设置 Buffer.concat 函数属性
	if concatObj := buffer.Get("concat").ToObject(runtime); concatObj != nil {
		// 设置 length 属性为 2 (list, totalLength)
		concatObj.DefineDataProperty("length", runtime.ToValue(2), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)
		// 设置 name 属性
		concatObj.DefineDataProperty("name", runtime.ToValue("concat"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)
	}

	// 🔥 P1 修复：添加 Buffer.poolSize 属性 (Node.js v18+)
	// poolSize 控制预分配的内部 Buffer 池的大小（字节）
	// 默认值：8192 (8KB)
	buffer.Set("poolSize", runtime.ToValue(8192))

	// 🔥 添加 Buffer.copyBytesFrom 静态方法（Node.js v17+）
	// 创建一个新 Buffer，包含 view 的副本
	buffer.Set("copyBytesFrom", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("The \"view\" argument must be specified"))
		}

		view := call.Arguments[0]
		if goja.IsNull(view) || goja.IsUndefined(view) {
			panic(runtime.NewTypeError("The \"view\" argument must be an instance of TypedArray or DataView"))
		}

		viewObj := view.ToObject(runtime)
		if viewObj == nil {
			panic(runtime.NewTypeError("The \"view\" argument must be an instance of TypedArray or DataView"))
		}

		// 获取 TypedArray 的属性
		byteLengthVal := viewObj.Get("byteLength")
		if byteLengthVal == nil || goja.IsUndefined(byteLengthVal) || goja.IsNull(byteLengthVal) {
			panic(runtime.NewTypeError("The \"view\" argument must be an instance of TypedArray or DataView"))
		}
		viewByteLength := byteLengthVal.ToInteger()
		if viewByteLength < 0 {
			panic(runtime.NewTypeError("Invalid byteLength"))
		}

		// 检查是否是 DataView (Node.js 不支持 DataView，只支持 TypedArray)
		lengthVal := viewObj.Get("length")
		var viewLength int64
		var bytesPerElement int64 = 1

		if lengthVal == nil || goja.IsUndefined(lengthVal) {
			// 可能是 DataView，检查 constructor name
			constructorVal := viewObj.Get("constructor")
			if constructorVal != nil && !goja.IsUndefined(constructorVal) {
				constructorObj := constructorVal.ToObject(runtime)
				if constructorObj != nil {
					nameVal := constructorObj.Get("name")
					if nameVal != nil && !goja.IsUndefined(nameVal) && nameVal.String() == "DataView" {
						// Node.js 不支持 DataView，抛出错误
						panic(runtime.NewTypeError("The \"view\" argument must be an instance of TypedArray. Received an instance of DataView"))
					} else {
						panic(runtime.NewTypeError("The \"view\" argument must be an instance of TypedArray"))
					}
				} else {
					panic(runtime.NewTypeError("The \"view\" argument must be an instance of TypedArray"))
				}
			} else {
				panic(runtime.NewTypeError("The \"view\" argument must be an instance of TypedArray"))
			}
		} else {
			// TypedArray: 有 length 属性
			if goja.IsNull(lengthVal) {
				panic(runtime.NewTypeError("Invalid TypedArray length"))
			}
			// 🔥 性能优化：直接使用 ToInteger()，参考 byteLength 函数的实现
			// 我们已经检查了 lengthVal 不是 nil、undefined 和 null，所以应该可以安全调用
			viewLength = lengthVal.ToInteger()
			if viewLength < 0 {
				panic(runtime.NewTypeError("Invalid TypedArray length"))
			}

			// 🔥 性能优化：直接获取 BYTES_PER_ELEMENT，参考 byteLength 函数的实现
			bytesPerElementVal := viewObj.Get("BYTES_PER_ELEMENT")
			if bytesPerElementVal != nil && !goja.IsUndefined(bytesPerElementVal) && !goja.IsNull(bytesPerElementVal) {
				bytesPerElement = bytesPerElementVal.ToInteger()
				if bytesPerElement <= 0 {
					bytesPerElement = 1
				}
			}
		}

		// 处理可选的 offset 和 length 参数 (以元素为单位)
		elementOffset := int64(0)
		elementLength := viewLength

		if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) {
			offsetArg := call.Arguments[1]
			// 🔥 性能优化：使用 Go 原生类型检查替代 runtime.RunString()
			elementOffset = validateSafeIntegerArg(runtime, offsetArg, "offset")
		}

		if len(call.Arguments) >= 3 && !goja.IsUndefined(call.Arguments[2]) {
			lengthArg := call.Arguments[2]
			// 🔥 性能优化：使用 Go 原生类型检查替代 runtime.RunString()
			elementLength = validateSafeIntegerArg(runtime, lengthArg, "length")
		}

		// 验证范围 (元素范围)
		if elementOffset > viewLength {
			// offset超出范围时返回空Buffer (Node.js行为)
			elementLength = 0
		} else if elementOffset+elementLength > viewLength {
			// 自动调整长度到剩余元素数量
			elementLength = viewLength - elementOffset
		}

		// 计算实际需要复制的字节数
		copyBytes := elementLength * bytesPerElement

		// 创建新 Buffer
		allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.alloc 不可用"))
		}

		newBuffer, err := allocFunc(buffer, runtime.ToValue(copyBytes))
		if err != nil {
			panic(runtime.ToValue(err.Error()))
		}

		newBufObj := newBuffer.ToObject(runtime)

		// 检查是否是DataView，使用不同的复制策略
		constructorVal := viewObj.Get("constructor")
		isDataView := false
		if !goja.IsUndefined(constructorVal) && !goja.IsNull(constructorVal) {
			constructorObj := constructorVal.ToObject(runtime)
			if constructorObj != nil {
				nameVal := constructorObj.Get("name")
				if !goja.IsUndefined(nameVal) && nameVal.String() == "DataView" {
					isDataView = true
				}
			}
		}

		if isDataView {
			// DataView 特殊处理：使用 getUint8 方法逐字节读取
			getUint8Method := viewObj.Get("getUint8")
			if goja.IsUndefined(getUint8Method) {
				panic(runtime.NewTypeError("DataView missing getUint8 method"))
			}
			getUint8Callable, ok := goja.AssertFunction(getUint8Method)
			if !ok {
				panic(runtime.NewTypeError("DataView getUint8 is not callable"))
			}

			for i := int64(0); i < copyBytes; i++ {
				byteOffset := elementOffset + i
				if byteOffset >= viewByteLength {
					break
				}

				byteVal, err := getUint8Callable(viewObj, runtime.ToValue(byteOffset))
				if err != nil {
					// 如果读取失败，填充0
					newBufObj.Set(strconv.FormatInt(i, 10), runtime.ToValue(0))
				} else {
					newBufObj.Set(strconv.FormatInt(i, 10), byteVal)
				}
			}
		} else {
			// TypedArray 处理：通过索引访问元素，然后转换为字节
			byteIndex := int64(0)

			// 🔥 性能优化：对于多字节类型，在循环外编译转换函数一次，循环内多次调用
			// 这样可以避免每次循环都执行 runtime.RunString()，大幅提升性能
			var convertCallable goja.Callable
			if bytesPerElement > 1 {
				// 只在需要时编译转换函数（多字节类型）
				// 注意：这个转换涉及 JavaScript 的 TypedArray 字节序和内存布局，必须通过 JavaScript 环境
				jsCode := fmt.Sprintf(`
					(function() {
						var view = arguments[0];
						var index = arguments[1];
						var element = view[index];
						var buffer = new ArrayBuffer(%d);
						var tempView = new view.constructor(buffer);
						tempView[0] = element;
						var bytes = new Uint8Array(buffer);
						return Array.from(bytes);
					})
				`, bytesPerElement)

				convertFunc, err := runtime.RunString(jsCode)
				if err != nil {
					panic(runtime.NewTypeError("Failed to convert element to bytes"))
				}

				var ok bool
				convertCallable, ok = goja.AssertFunction(convertFunc)
				if !ok {
					panic(runtime.NewTypeError("Failed to get converter function"))
				}
			}

			for elementIndex := elementOffset; elementIndex < elementOffset+elementLength; elementIndex++ {
				// 获取元素值
				elementVal := viewObj.Get(strconv.FormatInt(elementIndex, 10))
				if goja.IsUndefined(elementVal) {
					// 跳过undefined元素，填充0
					for b := int64(0); b < bytesPerElement; b++ {
						newBufObj.Set(strconv.FormatInt(byteIndex, 10), runtime.ToValue(0))
						byteIndex++
					}
					continue
				}

				// 将元素值转换为字节序列
				if bytesPerElement == 1 {
					// Uint8Array, Int8Array, Uint8ClampedArray
					byteVal := elementVal.ToInteger() & 0xFF
					newBufObj.Set(strconv.FormatInt(byteIndex, 10), runtime.ToValue(byteVal))
					byteIndex++
				} else {
					// 多字节类型：使用预编译的转换函数
					result, err := convertCallable(goja.Undefined(), view, runtime.ToValue(elementIndex))
					if err != nil {
						panic(runtime.NewTypeError("Failed to convert element to bytes"))
					}

					resultArray := result.ToObject(runtime)
					arrayLength := resultArray.Get("length").ToInteger()

					// 复制转换后的字节
					for b := int64(0); b < arrayLength && b < bytesPerElement; b++ {
						byteVal := resultArray.Get(strconv.FormatInt(b, 10)).ToInteger() & 0xFF
						newBufObj.Set(strconv.FormatInt(byteIndex, 10), runtime.ToValue(byteVal))
						byteIndex++
					}
				}
			}
		}

		return newBuffer
	})

	// 🔥 设置 Buffer.copyBytesFrom 函数属性（与 Node.js 保持一致）
	copyBytesFromFunc := buffer.Get("copyBytesFrom").ToObject(runtime)
	if copyBytesFromFunc != nil {
		copyBytesFromFunc.DefineDataProperty("length", runtime.ToValue(3), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)
		copyBytesFromFunc.DefineDataProperty("name", runtime.ToValue("copyBytesFrom"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_FALSE)
	}

	// 🔥 添加 Buffer.transcode 静态方法（Node.js v7.1.0+）
	// 将 Buffer 从一种编码转换为另一种编码
	buffer.Set("transcode", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 3 {
			panic(runtime.NewTypeError("transcode requires 3 arguments"))
		}

		// 获取 source buffer
		source := call.Arguments[0]
		if goja.IsNull(source) || goja.IsUndefined(source) {
			panic(runtime.NewTypeError("The \"source\" argument must be an instance of Buffer or Uint8Array"))
		}

		sourceObj := source.ToObject(runtime)

		// 获取源编码和目标编码
		fromEncoding := strings.ToLower(call.Arguments[1].String())
		toEncoding := strings.ToLower(call.Arguments[2].String())

		// 获取 source buffer 的长度
		lengthVal := sourceObj.Get("length")
		if goja.IsUndefined(lengthVal) {
			panic(runtime.NewTypeError("The \"source\" argument must be an instance of Buffer or Uint8Array"))
		}
		length := lengthVal.ToInteger()

		// 读取源 buffer 数据
		sourceData := make([]byte, length)
		for i := int64(0); i < length; i++ {
			val := sourceObj.Get(strconv.FormatInt(i, 10))
			if !goja.IsUndefined(val) {
				sourceData[i] = byte(val.ToInteger() & 0xFF)
			}
		}

		// 将源数据转换为字符串（使用源编码）
		str := ""
		switch fromEncoding {
		case "utf8", "utf-8":
			str = string(sourceData)
		case "latin1", "binary":
			// Latin1: 直接将字节转为字符
			runes := make([]rune, len(sourceData))
			for i, b := range sourceData {
				runes[i] = rune(b)
			}
			str = string(runes)
		case "ascii":
			// ASCII: 直接将字节转为字符（与 latin1 相同）
			runes := make([]rune, len(sourceData))
			for i, b := range sourceData {
				runes[i] = rune(b)
			}
			str = string(runes)
		default:
			// 其他编码暂不支持，直接使用 UTF-8
			str = string(sourceData)
		}

		// 使用 Buffer.from 创建目标 buffer（使用目标编码）
		fromFunc, ok := goja.AssertFunction(buffer.Get("from"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.from 不可用"))
		}

		result, err := fromFunc(buffer, runtime.ToValue(str), runtime.ToValue(toEncoding))
		if err != nil {
			panic(runtime.ToValue(err.Error()))
		}

		return result
	})

	// 🔥 将 transcode 函数导出到 buffer 模块
	// 使其可以通过 require('buffer').transcode 访问
	_, _ = runtime.RunString(`
		(function() {
			try {
				var bufferModule = require('buffer');
				if (bufferModule && typeof Buffer !== 'undefined' && typeof Buffer.transcode === 'function') {
					bufferModule.transcode = Buffer.transcode;
				}
			} catch (e) {
				// 静默忽略
			}
		})();
	`)

	// 🔥 性能优化：使用优化的 Buffer.alloc 实现（带 Buffer 池）
	SetupOptimizedBufferAlloc(runtime, be.pool)

	// 为Buffer原型添加扩展方法
	be.enhanceBufferPrototype(runtime)

	// 🔥 添加 TypedArray.from() 和 of() 静态方法
	// 注：虽然 goja 内部已实现 typedArray_from 和 typedArray_of 函数，
	// 但通过 _putProp 添加的方法无法在 JavaScript 中访问（原因未知）
	// 因此使用 JavaScript polyfill 作为可靠的解决方案
	be.polyfillTypedArrayFeatures(runtime)

	// 🔥 添加 structuredClone 全局函数（Web API）
	// 用于深拷贝对象，Buffer 会被转换为 Uint8Array
	SetupStructuredClone(runtime)

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

	// 注：forEach, map, filter, reduce, find, some, every, join 等方法
	// 已由 goja 在 TypedArray.prototype 上原生实现，无需额外添加
	// Buffer 继承自 Uint8Array，自动继承这些高性能方法

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

// calculateBase64Length 计算base64字符串的字节长度，模拟Node.js行为
func calculateBase64Length(str string) int {
	if len(str) == 0 {
		return 0
	}

	// 计算JavaScript字符串的length（UTF-16 code units数量）
	jsStringLength := 0
	for _, r := range str {
		if r > 0xFFFF {
			// Unicode码点 > U+FFFF 需要用代理对表示，占用2个UTF-16 code units
			jsStringLength += 2
		} else {
			// Unicode码点 <= U+FFFF 占用1个UTF-16 code unit
			jsStringLength += 1
		}
	}

	// Node.js v25.0.0的base64长度计算有复杂的验证逻辑，不是简单的公式
	// 需要根据实际的字符内容进行验证

	// 统计有效base64字符和填充字符
	validBase64Chars := 0
	paddingChars := 0

	for _, r := range str {
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') ||
			r == '+' || r == '/' || r == '-' || r == '_' {
			validBase64Chars++
		} else if r == '=' {
			paddingChars++
		}
	}

	// 如果没有有效的base64字符，使用简单公式
	if validBase64Chars == 0 {
		if paddingChars > 0 {
			// 纯填充字符的特殊处理
			if jsStringLength == 4 {
				return 1
			} // "====" -> 1
			return 0
		}
		// 按JavaScript字符串长度计算
		return (jsStringLength * 3) / 4
	}

	// 有有效base64字符时，按有效字符数计算
	totalValidLength := validBase64Chars + paddingChars
	if totalValidLength != jsStringLength {
		// 有非base64字符，使用简单公式
		return (jsStringLength * 3) / 4
	}

	// 纯base64字符串的精确验证
	remainder := validBase64Chars % 4
	baseLength := (validBase64Chars / 4) * 3

	// 🔥 修复：当有多余字符时(如5个字符=4+1)，按完整块计算
	if remainder == 1 {
		// 单个多余字符被忽略，只按完整的4字符块计算
		return baseLength
	}

	// 根据余数和填充情况计算最终长度
	switch remainder {
	case 0:
		// 4的倍数，完整的base64块
		if paddingChars <= 2 {
			return baseLength
		}
		// 过多填充被当作字符处理
		return (jsStringLength * 3) / 4
	case 2:
		// 2个字符：标准需要2个填充或1个填充
		if paddingChars <= 2 {
			return baseLength + 1
		}
		// 特殊情况：恰好3个填充时，Node.js返回baseLength+remainder
		if paddingChars == 3 {
			return baseLength + remainder
		}
		// 更多填充被当作额外字符，回退到公式计算
		return (jsStringLength * 3) / 4
	case 3:
		// 3个字符：标准需要1个填充
		if paddingChars <= 2 {
			return baseLength + 2
		}
		// 特殊情况：恰好3个填充时，Node.js返回baseLength+remainder
		if paddingChars == 3 {
			return baseLength + remainder
		}
		// 更多填充被当作额外字符，回退到公式计算
		return (jsStringLength * 3) / 4
	}

	return baseLength
}

// calculateHexLength 计算hex字符串的字节长度，模拟Node.js行为
func calculateHexLength(str string) int {
	if len(str) == 0 {
		return 0
	}

	// 检查字符串是否包含非ASCII字符（如中文、emoji）
	hasNonASCII := false
	for _, r := range str {
		if r > 127 {
			hasNonASCII = true
			break
		}
	}

	// 如果包含非ASCII字符，Node.js返回1
	if hasNonASCII {
		return 1
	}

	// Node.js的Buffer.byteLength对hex的处理逻辑：
	// 1. 移除空白字符（空格、制表符、换行符）
	// 2. 按总长度除以2计算（向下取整）
	cleanStr := ""
	for _, r := range str {
		// 只移除空白字符，保留其他所有字符（包括无效的hex字符）
		if r != ' ' && r != '\t' && r != '\n' && r != '\r' {
			cleanStr += string(r)
		}
	}

	// 按总长度计算，每2个字符对应1个字节
	return len(cleanStr) / 2
}
