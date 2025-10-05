package enhance_modules

import (
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"math"
	"math/big"
	"strconv"
	"strings"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// BufferEnhancer Buffer增强器
type BufferEnhancer struct{}

// decodeBase64Lenient 宽松的 base64 解码（Node.js 行为）
// 允许：空格、换行、缺少 padding
func decodeBase64Lenient(str string) ([]byte, error) {
	// 移除空格、换行、制表符等空白字符
	str = strings.Map(func(r rune) rune {
		if r == ' ' || r == '\n' || r == '\r' || r == '\t' {
			return -1 // 删除字符
		}
		return r
	}, str)

	// Node.js 允许缺少 padding，使用 RawStdEncoding
	// 如果有 padding，StdEncoding 也能处理
	decoded, err := base64.RawStdEncoding.DecodeString(str)
	if err != nil {
		// 如果 RawStdEncoding 失败，尝试 StdEncoding（带 padding）
		decoded, err = base64.StdEncoding.DecodeString(str)
	}
	return decoded, err
}

// utf16CodeUnitCount 计算字符串的 UTF-16 码元数量（Node.js 行为）
// 在 Node.js 中，每个 UTF-16 码元占 2 字节
// 例如：'𠮷' (U+20BB7) 在 UTF-16 中是 surrogate pair，占 2 个码元 = 4 字节
// 但在 JavaScript 中被视为 2 个"字符"（码元），所以 byteLength('𠮷', 'ucs2') === 4
func utf16CodeUnitCount(str string) int {
	count := 0
	for _, r := range str {
		if r <= 0xFFFF {
			// BMP 字符：1 个 UTF-16 码元
			count++
		} else {
			// 超出 BMP：需要 surrogate pair，占 2 个 UTF-16 码元
			count += 2
		}
	}
	return count
}

// NewBufferEnhancer 创建新的Buffer增强器
func NewBufferEnhancer() *BufferEnhancer {
	return &BufferEnhancer{}
}

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

	// 保存原始的 Buffer.from 方法
	originalFrom := buffer.Get("from")

	// 覆盖 Buffer.from 静态方法，支持编码参数
	buffer.Set("from", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Buffer.from requires at least 1 argument"))
		}

		arg0 := call.Arguments[0]

		// 获取编码参数（如果有）
		encoding := "utf8"
		if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) {
			encoding = call.Arguments[1].String()
		}

		// 判断第一个参数的类型
		if goja.IsNull(arg0) || goja.IsUndefined(arg0) {
			panic(runtime.NewTypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or Array-like object"))
		}

		// 如果是字符串，根据编码创建 Buffer
		arg0Type := arg0.ExportType()
		if arg0Type != nil && arg0Type.Kind().String() == "string" {
			str := arg0.String()

			// 使用我们的编码逻辑创建 buffer
			var data []byte

			switch encoding {
			case "hex":
				decoded, err := hex.DecodeString(str)
				if err != nil {
					panic(runtime.NewTypeError("Invalid hex string"))
				}
				data = decoded
			case "base64":
				decoded, err := decodeBase64Lenient(str)
				if err != nil {
					panic(runtime.NewTypeError("Invalid base64 string"))
				}
				data = decoded
			case "base64url":
				decoded, err := base64.RawURLEncoding.DecodeString(str)
				if err != nil {
					panic(runtime.NewTypeError("Invalid base64url string"))
				}
				data = decoded
			case "latin1", "binary":
				// Latin1: 每个 Unicode 码点的低 8 位
				runes := []rune(str)
				data = make([]byte, len(runes))
				for i, r := range runes {
					data[i] = byte(r) & 0xFF
				}
			case "ascii":
				// ASCII: 每个 Unicode 码点的低 7 位
				runes := []rune(str)
				data = make([]byte, len(runes))
				for i, r := range runes {
					data[i] = byte(r) & 0x7F
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
			default:
				// UTF-8 (默认)
				data = []byte(str)
			}

			// 创建 Buffer
			bufferConstructor := runtime.Get("Buffer")
			if bufferConstructor == nil {
				panic(runtime.NewTypeError("Buffer constructor not found"))
			}

			// 调用 Buffer.alloc 或类似方法创建 buffer
			// 由于我们不能直接创建 Buffer，我们需要调用原生的 Buffer.from
			// 但要用字节数组而不是字符串
			arr := runtime.NewArray()
			for i, b := range data {
				arr.Set(strconv.Itoa(i), runtime.ToValue(b))
			}
			arr.Set("length", runtime.ToValue(len(data)))

			// 调用原生 Buffer.from(array)
			if !goja.IsUndefined(originalFrom) {
				fromFunc, ok := goja.AssertFunction(originalFrom)
				if !ok {
					panic(runtime.NewTypeError("Buffer.from is not a function"))
				}
				result, err := fromFunc(goja.Undefined(), arr)
				if err != nil {
					panic(runtime.NewTypeError("Failed to create Buffer: " + err.Error()))
				}
				return result
			}

			panic(runtime.NewTypeError("Buffer.from not available"))
		}

		// 对于其他类型（数组、Buffer、ArrayBuffer等），调用原生实现
		if !goja.IsUndefined(originalFrom) {
			fromFunc, ok := goja.AssertFunction(originalFrom)
			if !ok {
				panic(runtime.NewTypeError("Buffer.from is not a function"))
			}
			result, err := fromFunc(goja.Undefined(), call.Arguments...)
			if err != nil {
				panic(runtime.NewTypeError("Failed to create Buffer: " + err.Error()))
			}
			return result
		}

		panic(runtime.NewTypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or Array-like object"))
	})

	// 添加 Buffer.isBuffer 静态方法（修复版 - 更严格的判断）
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

		// 首先检查 constructor.name
		if constructor := objAsObject.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
				if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
					nameStr := name.String()
					// 检查是否为 "Buffer" 或包含 Buffer 相关的名称
					// goja-nodejs 的 Buffer constructor name 可能是完整的包路径
					if nameStr == "Buffer" || strings.Contains(nameStr, "Buffer") {
						return true
					}
					// 如果明确是其他类型（Array、Object、String等），返回 false
					if nameStr == "Array" || nameStr == "Object" || nameStr == "String" ||
						nameStr == "Number" || nameStr == "Boolean" {
						return false
					}
				}
			}
		}

		// 如果没有 constructor，进行备用检查
		// 但这种情况很少见，通常意味着不是 Buffer
		// 必须同时具备 Buffer 特有的多个方法
		hasReadInt8 := !goja.IsUndefined(objAsObject.Get("readInt8"))
		hasWriteInt8 := !goja.IsUndefined(objAsObject.Get("writeInt8"))
		hasReadUInt8 := !goja.IsUndefined(objAsObject.Get("readUInt8"))
		hasWriteUInt8 := !goja.IsUndefined(objAsObject.Get("writeUInt8"))
		hasLength := !goja.IsUndefined(objAsObject.Get("length"))
		hasCopy := !goja.IsUndefined(objAsObject.Get("copy"))

		// 必须具备这些 Buffer 特有的方法
		return hasLength && hasReadInt8 && hasWriteInt8 && hasReadUInt8 && hasWriteUInt8 && hasCopy
	})

	// 添加 Buffer.allocUnsafe 静态方法
	buffer.Set("allocUnsafe", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("The size argument is required"))
		}

		size := call.Arguments[0].ToInteger()
		if size < 0 {
			panic(runtime.NewTypeError("The size argument must be non-negative"))
		}

		// 使用Buffer.alloc创建，但不初始化内容（在实际实现中allocUnsafe不会清零）
		allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.alloc is not available"))
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
			panic(runtime.NewTypeError("The size argument is required"))
		}

		size := call.Arguments[0].ToInteger()
		if size < 0 {
			panic(runtime.NewTypeError("The size argument must be non-negative"))
		}

		// allocUnsafeSlow 创建非池化的Buffer
		allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.alloc is not available"))
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
			panic(runtime.NewTypeError("String is required"))
		}

		str := call.Arguments[0].String()
		encoding := "utf8"
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			encoding = call.Arguments[1].String()
		}

		var length int
		switch encoding {
		case "utf8", "utf-8":
			length = len([]byte(str))
		case "hex":
			decoded, err := hex.DecodeString(str)
			if err != nil {
				panic(runtime.NewTypeError("Invalid hex string"))
			}
			length = len(decoded)
		case "base64":
			// 使用宽松的 base64 解码（Node.js 行为）
			decoded, err := decodeBase64Lenient(str)
			if err != nil {
				panic(runtime.NewTypeError("Invalid base64 string"))
			}
			length = len(decoded)
		case "base64url":
			decoded, err := base64.RawURLEncoding.DecodeString(str)
			if err != nil {
				panic(runtime.NewTypeError("Invalid base64url string"))
			}
			length = len(decoded)
		case "ascii", "latin1", "binary":
			length = len(str)
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
	buffer.Set("isEncoding", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}

		encoding := call.Arguments[0].String()
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
	buffer.Set("compare", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Two buffers are required"))
		}

		buf1 := call.Arguments[0].ToObject(runtime)
		buf2 := call.Arguments[1].ToObject(runtime)
		if buf1 == nil || buf2 == nil {
			panic(runtime.NewTypeError("Arguments must be buffers"))
		}

		// 获取两个buffer的长度
		len1 := int64(0)
		len2 := int64(0)

		if lengthVal := buf1.Get("length"); !goja.IsUndefined(lengthVal) {
			len1 = lengthVal.ToInteger()
		}
		if lengthVal := buf2.Get("length"); !goja.IsUndefined(lengthVal) {
			len2 = lengthVal.ToInteger()
		}

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
			panic(runtime.NewTypeError("The buffers argument is required"))
		}

		buffers := call.Arguments[0]
		totalLength := int64(0)

		// 如果提供了总长度参数
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			totalLength = call.Arguments[1].ToInteger()
		}

		buffersObj := buffers.ToObject(runtime)
		if buffersObj == nil {
			panic(runtime.NewTypeError("Buffers must be an array"))
		}

		// 获取数组长度
		lengthVal := buffersObj.Get("length")
		if goja.IsUndefined(lengthVal) {
			panic(runtime.NewTypeError("Buffers must be an array"))
		}

		arrayLength := lengthVal.ToInteger()
		if arrayLength == 0 {
			// 返回空Buffer
			allocFunc, ok := goja.AssertFunction(buffer.Get("alloc"))
			if !ok {
				panic(runtime.NewTypeError("Buffer.alloc is not available"))
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
			panic(runtime.NewTypeError("Buffer.alloc is not available"))
		}

		result, err := allocFunc(buffer, runtime.ToValue(totalLength))
		if err != nil {
			panic(err)
		}

		resultObj := result.ToObject(runtime)
		if resultObj == nil {
			panic(runtime.NewTypeError("Failed to create result buffer"))
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

	// 注意：Buffer.from 已经在上面覆盖了，不需要再次覆盖
	// 如果需要额外的逻辑，应该合并到上面的实现中

	// 下面这段代码已经被上面的实现替代，注释掉避免重复
	/*
		originalFrom := buffer.Get("from")
		buffer.Set("from", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array"))
			}

			arg := call.Arguments[0]

			// 首先检查是否为字符串
			if argStr := arg.String(); argStr != "" {
				// 如果能转换为字符串且不为空，直接调用原始方法
				if fromFunc, ok := goja.AssertFunction(originalFrom); ok {
					result, err := fromFunc(buffer, call.Arguments...)
					if err != nil {
						panic(err)
					}
					return result
				}
			}

			// 检查是否为数组（通过检查是否是对象且有数字索引）
			if obj := arg.ToObject(runtime); obj != nil {
				if lengthVal := obj.Get("length"); !goja.IsUndefined(lengthVal) {
					if length := lengthVal.ToInteger(); length >= 0 {
						// 检查是否真的是数组（有数字索引且不是字符串）
						isArray := false

						// 首先排除字符串对象
						if arg.ExportType().Kind().String() != "string" {
							if length > 0 {
								// 检查是否有第0个元素且是数字
								if val := obj.Get("0"); !goja.IsUndefined(val) {
									if val.ToInteger() >= 0 && val.ToInteger() <= 255 {
										isArray = true
									}
								}
							} else if length == 0 {
								// 空数组也认为是数组
								isArray = true
							}
						}

						if isArray {
							// 创建字节数组
							data := make([]byte, length)
							for i := int64(0); i < length; i++ {
								if val := obj.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
									if byteVal := val.ToInteger(); byteVal >= 0 {
										data[i] = byte(byteVal & 0xFF)
									}
								}
							}
							// 使用原始的from方法创建Buffer
							arrayBuffer := runtime.NewArrayBuffer(data)
							if fromFunc, ok := goja.AssertFunction(originalFrom); ok {
								result, err := fromFunc(buffer, runtime.ToValue(arrayBuffer))
								if err != nil {
									panic(err)
								}
								return result
							}
						}
					}
				}
			}

			// 如果不是数组，调用原始的from方法
			if fromFunc, ok := goja.AssertFunction(originalFrom); ok {
				result, err := fromFunc(buffer, call.Arguments...)
				if err != nil {
					panic(err)
				}
				return result
			}

			panic(runtime.NewTypeError("Buffer.from is not properly initialized"))
		})
	*/

	// 为Buffer原型添加扩展方法
	be.enhanceBufferPrototype(runtime)
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

	// 添加 write 方法（支持多种参数形式）
	prototype.Set("write", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("String is required"))
		}

		str := call.Arguments[0].String()
		offset := int64(0)
		length := int64(len(str))
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
			// 尝试作为整数解析，如果失败说明是字符串
			arg1Int := arg1.ToInteger()
			arg1Str := arg1.String()

			// 判断是数字还是字符串：如果字符串不是纯数字，或者明确是编码名称
			isEncoding := false
			if arg1Str != "" {
				// 检查是否是已知的编码格式
				switch arg1Str {
				case "utf8", "utf-8", "hex", "base64", "base64url", "ascii", "latin1", "binary", "utf16le", "ucs2", "ucs-2", "utf-16le":
					isEncoding = true
				default:
					// 如果不是编码格式，且能转为数字，则当作 offset
					if arg1Int == 0 && arg1Str != "0" {
						isEncoding = true // 非数字字符串，可能是未知编码
					}
				}
			}

			if isEncoding {
				// write(string, encoding)
				encoding = arg1Str
			} else {
				// write(string, offset, ...)
				offset = arg1Int

				if len(call.Arguments) >= 3 && !goja.IsUndefined(call.Arguments[2]) {
					arg2 := call.Arguments[2]
					arg2Int := arg2.ToInteger()
					arg2Str := arg2.String()

					// 同样判断第三个参数
					isEncoding2 := false
					switch arg2Str {
					case "utf8", "utf-8", "hex", "base64", "base64url", "ascii", "latin1", "binary", "utf16le", "ucs2", "ucs-2", "utf-16le":
						isEncoding2 = true
					default:
						if arg2Int == 0 && arg2Str != "0" {
							isEncoding2 = true
						}
					}

					if isEncoding2 {
						// write(string, offset, encoding)
						encoding = arg2Str
					} else {
						// write(string, offset, length, ...)
						length = arg2Int

						if len(call.Arguments) >= 4 && !goja.IsUndefined(call.Arguments[3]) {
							encoding = call.Arguments[3].String()
						}
					}
				}
			}
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		if offset >= bufferLength {
			return runtime.ToValue(0)
		}

		// 转换字符串为字节
		var data []byte
		switch encoding {
		case "utf8", "utf-8":
			data = []byte(str)
		case "hex":
			decoded, err := hex.DecodeString(str)
			if err != nil {
				panic(runtime.NewTypeError("Invalid hex string"))
			}
			data = decoded
		case "base64":
			// 使用宽松的 base64 解码（Node.js 行为）
			decoded, err := decodeBase64Lenient(str)
			if err != nil {
				panic(runtime.NewTypeError("Invalid base64 string"))
			}
			data = decoded
		case "base64url":
			decoded, err := base64.RawURLEncoding.DecodeString(str)
			if err != nil {
				panic(runtime.NewTypeError("Invalid base64url string"))
			}
			data = decoded
		case "latin1", "binary":
			// Latin1/Binary 编码：取 Unicode 码点的低 8 位 (Node.js 行为)
			// 例如：'Ā' (U+0100) → 0x00，而不是 0xFF
			data = make([]byte, len(str))
			for i, r := range str {
				data[i] = byte(r) & 0xFF
			}
		case "ascii":
			// ASCII 伪编码：只取低 7 位 (Node.js 行为)
			// 不是严格的 ASCII，而是 byte & 0x7F
			data = make([]byte, len(str))
			for i, r := range str {
				data[i] = byte(r) & 0x7F
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
			data = []byte(str)
		}

		// 限制写入长度
		if length > int64(len(data)) {
			length = int64(len(data))
		}
		if offset+length > bufferLength {
			length = bufferLength - offset
		}

		// 写入数据
		written := int64(0)
		for i := int64(0); i < length && i < int64(len(data)); i++ {
			this.Set(strconv.FormatInt(offset+i, 10), runtime.ToValue(data[i]))
			written++
		}

		return runtime.ToValue(written)
	})

	// 添加 slice 方法
	prototype.Set("slice", func(call goja.FunctionCall) goja.Value {
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
		if end > bufferLength {
			end = bufferLength
		}
		if start >= end {
			end = start
		}

		// 使用Buffer.alloc创建新Buffer，然后复制数据
		bufferConstructor := runtime.Get("Buffer")
		if bufferConstructor == nil {
			panic(runtime.NewTypeError("Buffer constructor is not available"))
		}

		bufferObj := bufferConstructor.ToObject(runtime)
		if bufferObj == nil {
			panic(runtime.NewTypeError("Buffer constructor is not an object"))
		}

		allocFunc, ok := goja.AssertFunction(bufferObj.Get("alloc"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.alloc is not available"))
		}

		// 创建新的Buffer
		sliceLength := end - start
		newBuffer, err := allocFunc(bufferConstructor, runtime.ToValue(sliceLength))
		if err != nil {
			panic(err)
		}

		newBufferObj := newBuffer.ToObject(runtime)
		if newBufferObj == nil {
			panic(runtime.NewTypeError("Failed to create new buffer"))
		}

		// 复制数据
		for i := int64(0); i < sliceLength; i++ {
			srcIndex := start + i
			if val := this.Get(strconv.FormatInt(srcIndex, 10)); !goja.IsUndefined(val) {
				newBufferObj.Set(strconv.FormatInt(i, 10), val)
			} else {
				newBufferObj.Set(strconv.FormatInt(i, 10), runtime.ToValue(0))
			}
		}

		return newBuffer
	})

	// 添加 indexOf 方法
	prototype.Set("indexOf", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			return runtime.ToValue(-1)
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		searchArg := call.Arguments[0]
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}

		// 处理不同类型的搜索值
		var searchBytes []byte
		if searchStr := searchArg.String(); searchStr != "" {
			searchBytes = []byte(searchStr)
		} else if searchInt := searchArg.ToInteger(); searchInt >= 0 {
			searchBytes = []byte{byte(searchInt & 0xFF)}
		} else {
			return runtime.ToValue(-1)
		}

		if len(searchBytes) == 0 {
			return runtime.ToValue(-1)
		}

		// 搜索
		for i := offset; i <= bufferLength-int64(len(searchBytes)); i++ {
			found := true
			for j, searchByte := range searchBytes {
				if val := this.Get(strconv.FormatInt(i+int64(j), 10)); !goja.IsUndefined(val) {
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
	})

	// 重写 toString 方法以支持范围参数
	prototype.Set("toString", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
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

		// 提取指定范围的数据
		data := make([]byte, end-start)
		for i := start; i < end; i++ {
			if val := this.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
				if byteVal := val.ToInteger(); byteVal >= 0 {
					data[i-start] = byte(byteVal & 0xFF)
				}
			}
		}

		// 根据编码类型转换
		switch encoding {
		case "utf8", "utf-8":
			return runtime.ToValue(string(data))
		case "hex":
			return runtime.ToValue(hex.EncodeToString(data))
		case "base64":
			return runtime.ToValue(base64.StdEncoding.EncodeToString(data))
		case "base64url":
			return runtime.ToValue(base64.RawURLEncoding.EncodeToString(data))
		case "latin1", "binary":
			// Latin1 解码：每个字节(0-255)对应一个 Unicode 码点 (U+0000 to U+00FF)
			// 不能直接用 string(data)，因为 Go 的 string 要求 UTF-8 编码
			// 需要将每个字节转换为对应的 rune，然后编码为 UTF-8
			runes := make([]rune, len(data))
			for i, b := range data {
				runes[i] = rune(b)
			}
			return runtime.ToValue(string(runes))
		case "ascii":
			// ASCII 伪编码：只取低 7 位 (Node.js 行为)
			// 不是严格的 ASCII，而是 byte & 0x7F
			result := make([]byte, len(data))
			for i, b := range data {
				result[i] = b & 0x7F
			}
			return runtime.ToValue(string(result))
		case "utf16le", "ucs2", "ucs-2", "utf-16le":
			// UTF-16LE 解码
			// 如果是奇数字节，最后一个字节会被忽略（Node.js 行为）
			numPairs := len(data) / 2
			if numPairs == 0 {
				return runtime.ToValue("")
			}
			runes := make([]rune, numPairs)
			for i := 0; i < numPairs; i++ {
				// Little Endian: 低字节在前
				runes[i] = rune(data[i*2]) | (rune(data[i*2+1]) << 8)
			}
			return runtime.ToValue(string(runes))
		default:
			return runtime.ToValue(string(data))
		}
	})

	// 添加 copy 方法
	prototype.Set("copy", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Target buffer is required"))
		}

		target := call.Arguments[0].ToObject(runtime)
		if target == nil {
			panic(runtime.NewTypeError("Target must be a buffer"))
		}

		targetStart := int64(0)
		sourceStart := int64(0)
		sourceEnd := int64(0)

		// 获取source buffer长度
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			sourceEnd = lengthVal.ToInteger()
		}

		// 解析参数
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			targetStart = call.Arguments[1].ToInteger()
		}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			sourceStart = call.Arguments[2].ToInteger()
		}
		if len(call.Arguments) > 3 && !goja.IsUndefined(call.Arguments[3]) {
			sourceEnd = call.Arguments[3].ToInteger()
		}

		// 获取target buffer长度
		targetLength := int64(0)
		if lengthVal := target.Get("length"); !goja.IsUndefined(lengthVal) {
			targetLength = lengthVal.ToInteger()
		}

		// 边界检查
		if sourceStart < 0 {
			sourceStart = 0
		}
		if sourceEnd < sourceStart {
			sourceEnd = sourceStart
		}
		if targetStart < 0 {
			targetStart = 0
		}

		// 复制数据
		written := int64(0)
		for i := sourceStart; i < sourceEnd && targetStart+written < targetLength; i++ {
			if val := this.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
				target.Set(strconv.FormatInt(targetStart+written, 10), val)
				written++
			}
		}

		return runtime.ToValue(written)
	})

	// 添加 compare 方法
	prototype.Set("compare", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Target buffer is required"))
		}

		target := call.Arguments[0].ToObject(runtime)
		if target == nil {
			panic(runtime.NewTypeError("Target must be a buffer"))
		}

		// 获取两个buffer的长度
		thisLength := int64(0)
		targetLength := int64(0)

		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			thisLength = lengthVal.ToInteger()
		}
		if lengthVal := target.Get("length"); !goja.IsUndefined(lengthVal) {
			targetLength = lengthVal.ToInteger()
		}

		// 比较每个字节
		minLength := thisLength
		if targetLength < minLength {
			minLength = targetLength
		}

		for i := int64(0); i < minLength; i++ {
			thisVal := int64(0)
			targetVal := int64(0)

			if val := this.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
				thisVal = val.ToInteger() & 0xFF
			}
			if val := target.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
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
		if thisLength < targetLength {
			return runtime.ToValue(-1)
		}
		if thisLength > targetLength {
			return runtime.ToValue(1)
		}
		return runtime.ToValue(0)
	})

	// 添加 equals 方法
	prototype.Set("equals", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}

		target := call.Arguments[0].ToObject(runtime)
		if target == nil {
			return runtime.ToValue(false)
		}

		// 获取两个buffer的长度
		thisLength := int64(0)
		targetLength := int64(0)

		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			thisLength = lengthVal.ToInteger()
		}
		if lengthVal := target.Get("length"); !goja.IsUndefined(lengthVal) {
			targetLength = lengthVal.ToInteger()
		}

		// 长度不同直接返回false
		if thisLength != targetLength {
			return runtime.ToValue(false)
		}

		// 比较每个字节
		for i := int64(0); i < thisLength; i++ {
			thisVal := int64(0)
			targetVal := int64(0)

			if val := this.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
				thisVal = val.ToInteger() & 0xFF
			}
			if val := target.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
				targetVal = val.ToInteger() & 0xFF
			}

			if thisVal != targetVal {
				return runtime.ToValue(false)
			}
		}

		return runtime.ToValue(true)
	})

	// 添加 fill 方法
	prototype.Set("fill", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Value is required"))
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

		// 解析参数
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			end = call.Arguments[2].ToInteger()
		}
		if len(call.Arguments) > 3 && !goja.IsUndefined(call.Arguments[3]) {
			encoding = call.Arguments[3].String()
		}

		// 边界检查
		if offset < 0 {
			offset = 0
		}
		if end > bufferLength {
			end = bufferLength
		}
		if offset >= end {
			return this
		}

		// 处理填充值
		var fillData []byte

		// 先尝试作为字符串处理
		fillStr := value.String()
		if fillStr != "" && fillStr != "0" {
			// 字符串值
			switch encoding {
			case "utf8", "utf-8":
				fillData = []byte(fillStr)
			case "hex":
				decoded, err := hex.DecodeString(fillStr)
				if err != nil {
					fillData = []byte(fillStr)
				} else {
					fillData = decoded
				}
			case "base64":
				// 使用宽松的 base64 解码（Node.js 行为）
				decoded, err := decodeBase64Lenient(fillStr)
				if err != nil {
					fillData = []byte(fillStr)
				} else {
					fillData = decoded
				}
			default:
				fillData = []byte(fillStr)
			}
		} else {
			// 数字值
			numVal := value.ToInteger()
			if numVal >= 0 && numVal <= 255 {
				fillData = []byte{byte(numVal & 0xFF)}
			} else {
				fillData = []byte{0}
			}
		}

		if len(fillData) == 0 {
			fillData = []byte{0}
		}

		// 填充buffer
		fillIndex := 0
		for i := offset; i < end; i++ {
			this.Set(strconv.FormatInt(i, 10), runtime.ToValue(fillData[fillIndex]))
			fillIndex = (fillIndex + 1) % len(fillData)
		}

		return this
	})

	// 添加 toJSON 方法
	prototype.Set("toJSON", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 创建数据数组
		data := make([]interface{}, bufferLength)
		for i := int64(0); i < bufferLength; i++ {
			if val := this.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
				data[i] = val.ToInteger() & 0xFF
			} else {
				data[i] = 0
			}
		}

		// 返回标准Buffer JSON格式
		result := map[string]interface{}{
			"type": "Buffer",
			"data": data,
		}

		return runtime.ToValue(result)
	})

	// === 字符串搜索方法 ===

	// 添加 includes 方法
	prototype.Set("includes", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}

		// 使用indexOf来实现includes
		searchVal := call.Arguments[0]
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}

		// 调用已有的indexOf方法
		indexOfFunc := prototype.Get("indexOf")
		if indexOfFunc != nil && !goja.IsUndefined(indexOfFunc) {
			if fn, ok := goja.AssertFunction(indexOfFunc); ok {
				result, err := fn(call.This, searchVal, runtime.ToValue(offset))
				if err == nil {
					return runtime.ToValue(result.ToInteger() != -1)
				}
			}
		}

		return runtime.ToValue(false)
	})

	// 添加 lastIndexOf 方法
	prototype.Set("lastIndexOf", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			return runtime.ToValue(-1)
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		searchValue := call.Arguments[0]
		byteOffset := bufferLength - 1 // 从末尾开始
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			byteOffset = call.Arguments[1].ToInteger()
			if byteOffset >= bufferLength {
				byteOffset = bufferLength - 1
			}
		}

		// 检查searchValue的实际类型来决定搜索方式
		searchValueType := searchValue.ExportType()

		// 如果是数字类型，进行字节搜索
		if searchValueType.Kind().String() == "float64" || searchValueType.Kind().String() == "int64" {
			// 处理数字搜索
			searchByte := uint8(searchValue.ToInteger() & 0xFF)
			for i := byteOffset; i >= 0; i-- {
				if val := this.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
					if uint8(val.ToInteger()&0xFF) == searchByte {
						return runtime.ToValue(i)
					}
				}
			}
		} else {
			// 处理字符串搜索
			searchStr := searchValue.String()
			if searchStr != "" {
				searchBytes := []byte(searchStr)
				// 从byteOffset开始向前搜索
				for i := byteOffset; i >= int64(len(searchBytes)-1); i-- {
					found := true
					for j, searchByte := range searchBytes {
						if val := this.Get(strconv.FormatInt(i-int64(len(searchBytes)-1)+int64(j), 10)); !goja.IsUndefined(val) {
							if uint8(val.ToInteger()&0xFF) != searchByte {
								found = false
								break
							}
						} else {
							found = false
							break
						}
					}
					if found {
						return runtime.ToValue(i - int64(len(searchBytes)-1))
					}
				}
			}
		}

		return runtime.ToValue(-1)
	})

	// === 字节交换方法 ===

	// 添加 swap16 方法
	prototype.Set("swap16", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 长度必须是2的倍数
		if bufferLength%2 != 0 {
			panic(runtime.NewTypeError("Buffer size must be a multiple of 16-bits"))
		}

		// 交换每对字节
		for i := int64(0); i < bufferLength; i += 2 {
			byte1 := this.Get(strconv.FormatInt(i, 10))
			byte2 := this.Get(strconv.FormatInt(i+1, 10))

			// 交换位置
			this.Set(strconv.FormatInt(i, 10), byte2)
			this.Set(strconv.FormatInt(i+1, 10), byte1)
		}

		return this
	})

	// 添加 swap32 方法
	prototype.Set("swap32", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 长度必须是4的倍数
		if bufferLength%4 != 0 {
			panic(runtime.NewTypeError("Buffer size must be a multiple of 32-bits"))
		}

		// 交换每4个字节
		for i := int64(0); i < bufferLength; i += 4 {
			byte1 := this.Get(strconv.FormatInt(i, 10))
			byte2 := this.Get(strconv.FormatInt(i+1, 10))
			byte3 := this.Get(strconv.FormatInt(i+2, 10))
			byte4 := this.Get(strconv.FormatInt(i+3, 10))

			// 交换位置: [0,1,2,3] -> [3,2,1,0]
			this.Set(strconv.FormatInt(i, 10), byte4)
			this.Set(strconv.FormatInt(i+1, 10), byte3)
			this.Set(strconv.FormatInt(i+2, 10), byte2)
			this.Set(strconv.FormatInt(i+3, 10), byte1)
		}

		return this
	})

	// 添加 swap64 方法
	prototype.Set("swap64", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 长度必须是8的倍数
		if bufferLength%8 != 0 {
			panic(runtime.NewTypeError("Buffer size must be a multiple of 64-bits"))
		}

		// 交换每8个字节
		for i := int64(0); i < bufferLength; i += 8 {
			bytes := make([]goja.Value, 8)
			for j := int64(0); j < 8; j++ {
				bytes[j] = this.Get(strconv.FormatInt(i+j, 10))
			}

			// 交换位置: [0,1,2,3,4,5,6,7] -> [7,6,5,4,3,2,1,0]
			for j := int64(0); j < 8; j++ {
				this.Set(strconv.FormatInt(i+j, 10), bytes[7-j])
			}
		}

		return this
	})

	// 添加 reverse 方法
	prototype.Set("reverse", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 反转 Buffer 中的字节
		for i := int64(0); i < bufferLength/2; i++ {
			j := bufferLength - 1 - i
			// 交换 i 和 j 位置的字节
			valI := this.Get(strconv.FormatInt(i, 10))
			valJ := this.Get(strconv.FormatInt(j, 10))
			this.Set(strconv.FormatInt(i, 10), valJ)
			this.Set(strconv.FormatInt(j, 10), valI)
		}

		return this
	})

	// 添加 subarray 方法（类似 slice，但返回视图）
	prototype.Set("subarray", func(call goja.FunctionCall) goja.Value {
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
		if end > bufferLength {
			end = bufferLength
		}
		if start >= end {
			end = start
		}

		// 创建新的Buffer（在真实的Node.js中subarray返回视图，这里简化为复制）
		bufferConstructor := runtime.Get("Buffer")
		if bufferConstructor == nil {
			panic(runtime.NewTypeError("Buffer constructor is not available"))
		}

		bufferObj := bufferConstructor.ToObject(runtime)
		if bufferObj == nil {
			panic(runtime.NewTypeError("Buffer constructor is not an object"))
		}

		allocFunc, ok := goja.AssertFunction(bufferObj.Get("alloc"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.alloc is not available"))
		}

		subarrayLength := end - start
		newBuffer, err := allocFunc(bufferConstructor, runtime.ToValue(subarrayLength))
		if err != nil {
			panic(err)
		}

		newBufferObj := newBuffer.ToObject(runtime)
		if newBufferObj == nil {
			panic(runtime.NewTypeError("Failed to create new buffer"))
		}

		// 复制数据
		for i := int64(0); i < subarrayLength; i++ {
			srcIndex := start + i
			if val := this.Get(strconv.FormatInt(srcIndex, 10)); !goja.IsUndefined(val) {
				newBufferObj.Set(strconv.FormatInt(i, 10), val)
			} else {
				newBufferObj.Set(strconv.FormatInt(i, 10), runtime.ToValue(0))
			}
		}

		return newBuffer
	})

	// 添加 set 方法
	prototype.Set("set", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Array is required"))
		}

		sourceArray := call.Arguments[0].ToObject(runtime)
		if sourceArray == nil {
			panic(runtime.NewTypeError("First argument must be an array or buffer"))
		}

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}

		// 获取源数组长度
		sourceLength := int64(0)
		if lengthVal := sourceArray.Get("length"); !goja.IsUndefined(lengthVal) {
			sourceLength = lengthVal.ToInteger()
		}

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 边界检查
		if offset < 0 || offset+sourceLength > bufferLength {
			panic(runtime.NewTypeError("Offset is outside buffer bounds"))
		}

		// 复制数据
		for i := int64(0); i < sourceLength; i++ {
			if val := sourceArray.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
				this.Set(strconv.FormatInt(offset+i, 10), val)
			}
		}

		return goja.Undefined()
	})

	// 添加迭代器支持
	be.addBufferIteratorMethods(runtime, prototype)

	// 添加数值读写方法
	be.addBufferNumericMethods(runtime, prototype)

	// 添加可变长度整数读写方法
	be.addBufferVariableLengthMethods(runtime, prototype)

	// 添加 BigInt 读写方法
	be.addBigIntReadWriteMethods(runtime, prototype)
}

// checkIntRange 检查整数是否在指定范围内（Node.js 行为）
func checkIntRange(runtime *goja.Runtime, value int64, min int64, max int64, valueName string) {
	if value < min || value > max {
		panic(runtime.NewTypeError("The value of \"" + valueName + "\" is out of range. It must be >= " +
			strconv.FormatInt(min, 10) + " and <= " + strconv.FormatInt(max, 10) + ". Received " +
			strconv.FormatInt(value, 10)))
	}
}

// checkReadBounds 检查读取边界并返回 buffer length
func checkReadBounds(runtime *goja.Runtime, this *goja.Object, offset, byteSize int64, methodName string) int64 {
	if this == nil {
		panic(runtime.NewTypeError("Method " + methodName + " called on incompatible receiver"))
	}

	bufferLength := int64(0)
	if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
		bufferLength = lengthVal.ToInteger()
	}

	if offset < 0 || offset+byteSize > bufferLength {
		panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
	}

	return bufferLength
}

// addBufferNumericMethods 添加Buffer数值读写方法
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
		panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
	})

	// writeInt8
	prototype.Set("writeInt8", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value is required"))
		}

		value := call.Arguments[0].ToInteger()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		if offset >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
		panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
	})

	// writeUInt8
	prototype.Set("writeUInt8", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value is required"))
		}

		value := call.Arguments[0].ToInteger()
		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}

		// 检查边界
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		if offset >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
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
		if offset+1 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
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
		if offset+1 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
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
		if offset+1 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
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
		if offset+1 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
		}

		// 获取原始值并检查范围（Node.js 行为）
		rawValue := call.Arguments[0].ToInteger()
		if rawValue < math.MinInt32 || rawValue > math.MaxInt32 {
			panic(runtime.NewTypeError("The value of \"value\" is out of range. It must be >= -2147483648 and <= 2147483647. Received " + strconv.FormatInt(rawValue, 10)))
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
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
		}

		// 获取原始值并检查范围（Node.js 行为）
		rawValue := call.Arguments[0].ToInteger()
		if rawValue < math.MinInt32 || rawValue > math.MaxInt32 {
			panic(runtime.NewTypeError("The value of \"value\" is out of range. It must be >= -2147483648 and <= 2147483647. Received " + strconv.FormatInt(rawValue, 10)))
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
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
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
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
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
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
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
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
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
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
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
		if offset+7 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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
			panic(runtime.NewTypeError("Value is required"))
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
		if offset+7 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
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

// safeGetThis 安全地获取 this 对象，如果失败则 panic
func safeGetThis(runtime *goja.Runtime, call goja.FunctionCall) *goja.Object {
	this := call.This.ToObject(runtime)
	if this == nil {
		panic(runtime.NewTypeError("Cannot read property of null or undefined"))
	}
	return this
}

// getBufferByte 是一个辅助函数，用于从Buffer中读取字节
func (be *BufferEnhancer) getBufferByte(buffer *goja.Object, offset int64) uint8 {
	if buffer == nil {
		return 0
	}
	if val := buffer.Get(strconv.FormatInt(offset, 10)); !goja.IsUndefined(val) {
		return uint8(val.ToInteger() & 0xFF)
	}
	return 0
}

// addBufferIteratorMethods 添加Buffer迭代器方法
func (be *BufferEnhancer) addBufferIteratorMethods(runtime *goja.Runtime, prototype *goja.Object) {
	// entries() - 返回键值对迭代器
	prototype.Set("entries", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 创建迭代器数组
		entries := make([]interface{}, bufferLength)
		for i := int64(0); i < bufferLength; i++ {
			val := uint8(0)
			if v := this.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(v) {
				val = uint8(v.ToInteger() & 0xFF)
			}
			entries[i] = []interface{}{i, val}
		}

		// 返回数组（goja会自动处理迭代）
		return runtime.ToValue(entries)
	})

	// keys() - 返回索引迭代器
	prototype.Set("keys", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 创建索引数组
		keys := make([]int64, bufferLength)
		for i := int64(0); i < bufferLength; i++ {
			keys[i] = i
		}

		return runtime.ToValue(keys)
	})

	// values() - 返回值迭代器
	prototype.Set("values", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 创建值数组
		values := make([]uint8, bufferLength)
		for i := int64(0); i < bufferLength; i++ {
			if val := this.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
				values[i] = uint8(val.ToInteger() & 0xFF)
			}
		}

		return runtime.ToValue(values)
	})
}

// addBufferVariableLengthMethods 添加可变长度整数读写方法
func (be *BufferEnhancer) addBufferVariableLengthMethods(runtime *goja.Runtime, prototype *goja.Object) {
	// readIntBE - 读取可变长度有符号整数（大端）
	prototype.Set("readIntBE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("Method readIntBE called on incompatible receiver"))
		}
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset and byteLength are required"))
		}

		offset := call.Arguments[0].ToInteger()
		byteLength := call.Arguments[1].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength must be between 1 and 6"))
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
			panic(runtime.NewTypeError("Method readIntLE called on incompatible receiver"))
		}
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset and byteLength are required"))
		}

		offset := call.Arguments[0].ToInteger()
		byteLength := call.Arguments[1].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength must be between 1 and 6"))
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
			panic(runtime.NewTypeError("Method readUIntBE called on incompatible receiver"))
		}
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset and byteLength are required"))
		}

		offset := call.Arguments[0].ToInteger()
		byteLength := call.Arguments[1].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength must be between 1 and 6"))
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
			panic(runtime.NewTypeError("Method readUIntLE called on incompatible receiver"))
		}
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("Offset and byteLength are required"))
		}

		offset := call.Arguments[0].ToInteger()
		byteLength := call.Arguments[1].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength must be between 1 and 6"))
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
			panic(runtime.NewTypeError("Value, offset and byteLength are required"))
		}

		value := call.Arguments[0].ToInteger()
		offset := call.Arguments[1].ToInteger()
		byteLength := call.Arguments[2].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength must be between 1 and 6"))
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
			panic(runtime.NewTypeError("Value, offset and byteLength are required"))
		}

		value := call.Arguments[0].ToInteger()
		offset := call.Arguments[1].ToInteger()
		byteLength := call.Arguments[2].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength must be between 1 and 6"))
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
			panic(runtime.NewTypeError("Value, offset and byteLength are required"))
		}

		value := uint64(call.Arguments[0].ToInteger())
		offset := call.Arguments[1].ToInteger()
		byteLength := call.Arguments[2].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength must be between 1 and 6"))
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
			panic(runtime.NewTypeError("Value, offset and byteLength are required"))
		}

		value := uint64(call.Arguments[0].ToInteger())
		offset := call.Arguments[1].ToInteger()
		byteLength := call.Arguments[2].ToInteger()

		if byteLength < 1 || byteLength > 6 {
			panic(runtime.NewTypeError("byteLength must be between 1 and 6"))
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

// setupBigIntSupport 设置 BigInt 模拟支持（使用 Go 的 math/big.Int）
func (be *BufferEnhancer) setupBigIntSupport(runtime *goja.Runtime) {
	// 创建 BigInt 构造函数
	bigIntConstructor := func(call goja.ConstructorCall) *goja.Object {
		var value *big.Int

		if len(call.Arguments) > 0 {
			arg := call.Arguments[0]
			argStr := arg.String()

			// 尝试解析为大整数
			value = new(big.Int)
			if _, ok := value.SetString(argStr, 10); !ok {
				// 如果解析失败，尝试浮点数转换
				if floatVal := arg.ToFloat(); floatVal == floatVal { // 检查 NaN
					value.SetInt64(int64(floatVal))
				} else {
					value.SetInt64(0)
				}
			}
		} else {
			value = big.NewInt(0)
		}

		// 创建一个对象来存储 big.Int（使用内部属性）
		obj := call.This
		// 将 big.Int 的字符串表示存储在对象上
		obj.Set("__bigIntValue__", runtime.ToValue(value.String()))

		// 添加 toString 方法
		obj.Set("toString", func(call goja.FunctionCall) goja.Value {
			obj := call.This.ToObject(runtime)
			if val := obj.Get("__bigIntValue__"); !goja.IsUndefined(val) {
				return val
			}
			return runtime.ToValue("0")
		})

		// 添加 valueOf 方法
		obj.Set("valueOf", func(call goja.FunctionCall) goja.Value {
			obj := call.This.ToObject(runtime)
			if val := obj.Get("__bigIntValue__"); !goja.IsUndefined(val) {
				valStr := val.String()
				bigInt := new(big.Int)
				if _, ok := bigInt.SetString(valStr, 10); ok {
					if bigInt.IsInt64() {
						return runtime.ToValue(bigInt.Int64())
					}
				}
				return val
			}
			return runtime.ToValue(0)
		})

		return obj
	}

	// 将 BigInt 暴露到全局
	runtime.Set("BigInt", bigIntConstructor)
}

// addBigIntReadWriteMethods 添加 BigInt 读写方法
func (be *BufferEnhancer) addBigIntReadWriteMethods(runtime *goja.Runtime, prototype *goja.Object) {
	// 辅助函数：创建 BigInt 对象
	createBigInt := func(value *big.Int) goja.Value {
		bigInt := runtime.NewObject()
		bigInt.Set("__bigIntValue__", runtime.ToValue(value.String()))
		bigInt.Set("toString", func(call goja.FunctionCall) goja.Value {
			obj := call.This.ToObject(runtime)
			if val := obj.Get("__bigIntValue__"); !goja.IsUndefined(val) {
				return val
			}
			return runtime.ToValue("0")
		})
		bigInt.Set("valueOf", func(call goja.FunctionCall) goja.Value {
			obj := call.This.ToObject(runtime)
			if val := obj.Get("__bigIntValue__"); !goja.IsUndefined(val) {
				valStr := val.String()
				bi := new(big.Int)
				if _, ok := bi.SetString(valStr, 10); ok {
					if bi.IsInt64() {
						return runtime.ToValue(bi.Int64())
					}
				}
				return val
			}
			return runtime.ToValue(0)
		})
		return bigInt
	}

	// 辅助函数：从 goja.Value 获取 big.Int
	getBigIntValue := func(value goja.Value) *big.Int {
		// 检查是否为 undefined 或 null
		if goja.IsUndefined(value) || goja.IsNull(value) {
			panic(runtime.NewTypeError("Cannot convert undefined or null to BigInt"))
		}

		// 先检查是否为数字类型（防止 ToObject 失败）
		// 如果是普通数字，直接抛出类型错误
		if _, ok := value.Export().(int64); ok {
			panic(runtime.NewTypeError("The \"value\" argument must be of type bigint. Received type number"))
		}
		if _, ok := value.Export().(float64); ok {
			panic(runtime.NewTypeError("The \"value\" argument must be of type bigint. Received type number"))
		}

		// 尝试获取 BigInt 对象
		defer func() {
			if r := recover(); r != nil {
				// 如果ToObject失败，抛出类型错误
				panic(runtime.NewTypeError("The \"value\" argument must be of type bigint"))
			}
		}()

		obj := value.ToObject(runtime)
		if obj != nil {
			if val := obj.Get("__bigIntValue__"); !goja.IsUndefined(val) {
				bigInt := new(big.Int)
				if _, ok := bigInt.SetString(val.String(), 10); ok {
					return bigInt
				}
			}
		}

		// 如果不是 BigInt 对象，抛出类型错误（Node.js 行为）
		panic(runtime.NewTypeError("The \"value\" argument must be of type bigint"))
	}

	// readBigInt64BE - 读取 64 位有符号大端整数
	prototype.Set("readBigInt64BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 {
			offset = call.Arguments[0].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "readBigInt64BE")

		// 读取 8 个字节（大端）
		bytes := make([]byte, 8)
		for i := 0; i < 8; i++ {
			val := this.Get(strconv.FormatInt(offset+int64(i), 10))
			if goja.IsUndefined(val) {
				bytes[i] = 0
			} else {
				bytes[i] = byte(val.ToInteger())
			}
		}

		// 转换为 big.Int（有符号）
		value := new(big.Int).SetBytes(bytes)

		// 处理负数（二进制补码）
		if bytes[0]&0x80 != 0 {
			// 负数：减去 2^64
			maxUint64 := new(big.Int).Lsh(big.NewInt(1), 64)
			value.Sub(value, maxUint64)
		}

		return createBigInt(value)
	})

	// readBigInt64LE - 读取 64 位有符号小端整数
	prototype.Set("readBigInt64LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 {
			offset = call.Arguments[0].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "readBigInt64LE")

		// 读取 8 个字节（小端）
		bytes := make([]byte, 8)
		for i := 0; i < 8; i++ {
			val := this.Get(strconv.FormatInt(offset+int64(7-i), 10))
			if goja.IsUndefined(val) {
				bytes[i] = 0
			} else {
				bytes[i] = byte(val.ToInteger())
			}
		}

		// 转换为 big.Int（有符号）
		value := new(big.Int).SetBytes(bytes)

		// 处理负数（二进制补码）
		if bytes[0]&0x80 != 0 {
			// 负数：减去 2^64
			maxUint64 := new(big.Int).Lsh(big.NewInt(1), 64)
			value.Sub(value, maxUint64)
		}

		return createBigInt(value)
	})

	// readBigUInt64BE - 读取 64 位无符号大端整数
	prototype.Set("readBigUInt64BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 {
			offset = call.Arguments[0].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "readBigUInt64BE")

		// 读取 8 个字节（大端）
		bytes := make([]byte, 8)
		for i := 0; i < 8; i++ {
			val := this.Get(strconv.FormatInt(offset+int64(i), 10))
			if goja.IsUndefined(val) {
				bytes[i] = 0
			} else {
				bytes[i] = byte(val.ToInteger())
			}
		}

		// 转换为 big.Int（无符号）
		value := new(big.Int).SetBytes(bytes)

		return createBigInt(value)
	})

	// readBigUInt64LE - 读取 64 位无符号小端整数
	prototype.Set("readBigUInt64LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		offset := int64(0)
		if len(call.Arguments) > 0 {
			offset = call.Arguments[0].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "readBigUInt64LE")

		// 读取 8 个字节（小端）
		bytes := make([]byte, 8)
		for i := 0; i < 8; i++ {
			val := this.Get(strconv.FormatInt(offset+int64(7-i), 10))
			if goja.IsUndefined(val) {
				bytes[i] = 0
			} else {
				bytes[i] = byte(val.ToInteger())
			}
		}

		// 转换为 big.Int（无符号）
		value := new(big.Int).SetBytes(bytes)

		return createBigInt(value)
	})

	// writeBigInt64BE - 写入 64 位有符号大端整数
	prototype.Set("writeBigInt64BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("Method writeBigInt64BE called on incompatible receiver"))
		}
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value is required"))
		}

		offset := int64(0)
		if len(call.Arguments) > 1 {
			offset = call.Arguments[1].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "writeBigInt64BE")

		// 获取 BigInt 值
		value := getBigIntValue(call.Arguments[0])

		// 处理负数（转换为二进制补码）
		if value.Sign() < 0 {
			maxUint64 := new(big.Int).Lsh(big.NewInt(1), 64)
			value = new(big.Int).Add(value, maxUint64)
		}

		// 转换为字节数组
		bytes := value.Bytes()

		// 确保是 8 字节，前面补零
		result := make([]byte, 8)
		copy(result[8-len(bytes):], bytes)

		// 写入 buffer（大端）
		for i := 0; i < 8; i++ {
			this.Set(strconv.FormatInt(offset+int64(i), 10), runtime.ToValue(result[i]))
		}

		return runtime.ToValue(offset + 8)
	})

	// writeBigInt64LE - 写入 64 位有符号小端整数
	prototype.Set("writeBigInt64LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("Method writeBigInt64LE called on incompatible receiver"))
		}
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value is required"))
		}

		offset := int64(0)
		if len(call.Arguments) > 1 {
			offset = call.Arguments[1].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "writeBigInt64LE")

		// 获取 BigInt 值
		value := getBigIntValue(call.Arguments[0])

		// 处理负数（转换为二进制补码）
		if value.Sign() < 0 {
			maxUint64 := new(big.Int).Lsh(big.NewInt(1), 64)
			value = new(big.Int).Add(value, maxUint64)
		}

		// 转换为字节数组
		bytes := value.Bytes()

		// 确保是 8 字节，前面补零
		result := make([]byte, 8)
		copy(result[8-len(bytes):], bytes)

		// 写入 buffer（小端）
		for i := 0; i < 8; i++ {
			this.Set(strconv.FormatInt(offset+int64(i), 10), runtime.ToValue(result[7-i]))
		}

		return runtime.ToValue(offset + 8)
	})

	// writeBigUInt64BE - 写入 64 位无符号大端整数
	prototype.Set("writeBigUInt64BE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("Method writeBigUInt64BE called on incompatible receiver"))
		}
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value is required"))
		}

		offset := int64(0)
		if len(call.Arguments) > 1 {
			offset = call.Arguments[1].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "writeBigUInt64BE")

		// 获取 BigInt 值
		value := getBigIntValue(call.Arguments[0])

		// 转换为字节数组
		bytes := value.Bytes()

		// 确保是 8 字节，前面补零
		result := make([]byte, 8)
		copy(result[8-len(bytes):], bytes)

		// 写入 buffer（大端）
		for i := 0; i < 8; i++ {
			this.Set(strconv.FormatInt(offset+int64(i), 10), runtime.ToValue(result[i]))
		}

		return runtime.ToValue(offset + 8)
	})

	// writeBigUInt64LE - 写入 64 位无符号小端整数
	prototype.Set("writeBigUInt64LE", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if this == nil {
			panic(runtime.NewTypeError("Method writeBigUInt64LE called on incompatible receiver"))
		}
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value is required"))
		}

		offset := int64(0)
		if len(call.Arguments) > 1 {
			offset = call.Arguments[1].ToInteger()
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "writeBigUInt64LE")

		// 获取 BigInt 值
		value := getBigIntValue(call.Arguments[0])

		// 转换为字节数组
		bytes := value.Bytes()

		// 确保是 8 字节，前面补零
		result := make([]byte, 8)
		copy(result[8-len(bytes):], bytes)

		// 写入 buffer（小端）
		for i := 0; i < 8; i++ {
			this.Set(strconv.FormatInt(offset+int64(i), 10), runtime.ToValue(result[7-i]))
		}

		return runtime.ToValue(offset + 8)
	})
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (be *BufferEnhancer) Name() string {
	return "buffer"
}

// Close 关闭 BufferEnhancer 并释放资源
// Buffer 模块不持有需要释放的资源，返回 nil
func (be *BufferEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
// Buffer 是全局对象，不需要 require，所以这里返回 nil
func (be *BufferEnhancer) Register(registry *require.Registry) error {
	// Buffer 不需要注册到 require 系统
	// 它是通过 goja_nodejs/buffer 提供的全局对象
	return nil
}

// Setup 在 Runtime 上设置模块环境
// 增强 Buffer 功能，添加额外的方法
func (be *BufferEnhancer) Setup(runtime *goja.Runtime) error {
	be.EnhanceBufferSupport(runtime)
	return nil
}
