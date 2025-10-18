package enhance_modules

import (
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"fmt"
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
// 允许：空格、换行、有/无 padding
func decodeBase64Lenient(str string) ([]byte, error) {
	// 移除空格、换行、制表符等空白字符
	str = strings.Map(func(r rune) rune {
		if r == ' ' || r == '\n' || r == '\r' || r == '\t' {
			return -1 // 删除字符
		}
		return r
	}, str)

	// 🔥 修复：先检查是否有 padding
	hasPadding := strings.Contains(str, "=")
	
	if hasPadding {
		// 有 padding：使用 StdEncoding
		decoded, err := base64.StdEncoding.DecodeString(str)
		if err == nil {
			return decoded, nil
		}
		// 如果失败，移除 padding 再试
		str = strings.TrimRight(str, "=")
	}
	
	// 无 padding 或移除 padding 后：使用 RawStdEncoding
	return base64.RawStdEncoding.DecodeString(str)
}

// decodeBase64URLLenient 宽松的 base64url 解码（Node.js 行为）
// 允许：空格、换行、有/无 padding
func decodeBase64URLLenient(str string) ([]byte, error) {
	// 移除空格、换行、制表符等空白字符
	str = strings.Map(func(r rune) rune {
		if r == ' ' || r == '\n' || r == '\r' || r == '\t' {
			return -1 // 删除字符
		}
		return r
	}, str)

	// 检查是否有 padding
	hasPadding := strings.Contains(str, "=")
	
	if hasPadding {
		// 有 padding：使用 URLEncoding
		decoded, err := base64.URLEncoding.DecodeString(str)
		if err == nil {
			return decoded, nil
		}
		// 如果失败，移除 padding 再试
		str = strings.TrimRight(str, "=")
	}
	
	// 无 padding 或移除 padding 后：使用 RawURLEncoding
	return base64.RawURLEncoding.DecodeString(str)
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

// stringToUTF16CodeUnits 将字符串转换为 UTF-16 码元序列（Node.js 行为）
// 🔥 修复：ascii/latin1 需要按 UTF-16 码元处理，而不是按 Unicode 码点
// 例如：'𠮷' (U+20BB7) → [0xD842, 0xDFB7] (2 个码元)
func stringToUTF16CodeUnits(str string) []uint16 {
	runes := []rune(str)
	codeUnits := make([]uint16, 0, len(runes))

	for _, r := range runes {
		if r <= 0xFFFF {
			// BMP 字符：直接转换
			codeUnits = append(codeUnits, uint16(r))
		} else {
			// 超出 BMP：编码为 surrogate pair
			r -= 0x10000
			high := uint16(0xD800 + (r >> 10))
			low := uint16(0xDC00 + (r & 0x3FF))
			codeUnits = append(codeUnits, high, low)
		}
	}

	return codeUnits
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
			panic(runtime.NewTypeError("Buffer.from 需要至少 1 个参数"))
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
				decoded, err := hex.DecodeString(str)
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
					panic(runtime.NewTypeError("创建 Buffer 失败: " + err.Error()))
				}
				return result
			}

			panic(runtime.NewTypeError("Buffer.from 不可用"))
		}

		// 对于其他类型（数组、Buffer、ArrayBuffer等），调用原生实现
		if !goja.IsUndefined(originalFrom) {
			fromFunc, ok := goja.AssertFunction(originalFrom)
			if !ok {
				panic(runtime.NewTypeError("Buffer.from 不是一个函数"))
			}
			result, err := fromFunc(goja.Undefined(), call.Arguments...)
			if err != nil {
				panic(runtime.NewTypeError("创建 Buffer 失败: " + err.Error()))
			}
			return result
		}

		panic(runtime.NewTypeError("第一个参数必须是字符串、Buffer、ArrayBuffer、Array 或类数组对象"))
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

		// 🔥 优化：尝试使用 instanceof（如果 goja 支持）
		bufferConstructor := runtime.Get("Buffer")
		if !goja.IsUndefined(bufferConstructor) {
			if bufferCtor := bufferConstructor.ToObject(runtime); bufferCtor != nil {
				// 尝试使用 instanceof 检查
				// 注意：这取决于 goja 版本是否支持
				if prototype := bufferCtor.Get("prototype"); !goja.IsUndefined(prototype) {
					if protoObj := prototype.ToObject(runtime); protoObj != nil {
						// 检查对象的原型链
						objProto := objAsObject.Prototype()
						if objProto != nil && objProto == protoObj {
							return true
						}
					}
				}
			}
		}

		// 备用方案：检查 constructor.name
		if constructor := objAsObject.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj := constructor.ToObject(runtime); constructorObj != nil {
				if name := constructorObj.Get("name"); !goja.IsUndefined(name) {
					nameStr := name.String()
					// 检查是否为 "Buffer" 或包含 Buffer 相关的名称
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

		// 最后的兜底检查：必须同时具备 Buffer 特有的多个方法
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
	buffer.Set("compare", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("需要两个 buffer 参数"))
		}

		buf1 := call.Arguments[0].ToObject(runtime)
		buf2 := call.Arguments[1].ToObject(runtime)
		if buf1 == nil || buf2 == nil {
			panic(runtime.NewTypeError("参数必须是 buffer"))
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
			panic(runtime.NewTypeError("buffers 参数是必需的"))
		}

		buffers := call.Arguments[0]
		totalLength := int64(0)

		// 如果提供了总长度参数
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			totalLength = call.Arguments[1].ToInteger()
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

	// 注意：Buffer.from 已经在上面覆盖了，不需要再次覆盖
	// 如果需要额外的逻辑，应该合并到上面的实现中

	// 下面这段代码已经被上面的实现替代，注释掉避免重复
	/*
		originalFrom := buffer.Get("from")
		buffer.Set("from", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("第一个参数必须是字符串类型或 Buffer、ArrayBuffer、Array 的实例"))
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

			panic(runtime.NewTypeError("Buffer.from 未正确初始化"))
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
			panic(runtime.NewTypeError("字符串参数是必需的"))
		}

		str := call.Arguments[0].String()
		offset := int64(0)
		// 🔥 修复：默认 length 应该是 buf.length - offset，不是字符串长度
		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
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
			
			// 🔥 修复：Node.js 只看类型，不看内容
			// 如果是字符串类型 -> encoding；否则 -> offset
			arg1Type := arg1.ExportType()
			if arg1Type != nil && arg1Type.Kind().String() == "string" {
				// write(string, encoding)
				encoding = arg1.String()
			} else {
				// write(string, offset, ...)
				offset = arg1.ToInteger()

				if len(call.Arguments) >= 3 && !goja.IsUndefined(call.Arguments[2]) {
					arg2 := call.Arguments[2]
					
					// 第三个参数同理：字符串 -> encoding；否则 -> length
					arg2Type := arg2.ExportType()
					if arg2Type != nil && arg2Type.Kind().String() == "string" {
						// write(string, offset, encoding)
						encoding = arg2.String()
					} else {
						// write(string, offset, length, ...)
						length = arg2.ToInteger()

						if len(call.Arguments) >= 4 && !goja.IsUndefined(call.Arguments[3]) {
							encoding = call.Arguments[3].String()
						}
					}
				}
			}
		}

		// 🔥 修复：编码大小写不敏感
		encoding = strings.ToLower(encoding)

		// 🔥 修复：调整 length 为 buf.length - offset
		if offset >= bufferLength {
			return runtime.ToValue(0)
		}
		if length > bufferLength-offset {
			length = bufferLength - offset
		}

		// 转换字符串为字节
		var data []byte
		switch encoding {
		case "utf8", "utf-8":
			data = []byte(str)
		case "hex":
			decoded, err := hex.DecodeString(str)
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
			// ASCII: 每个 UTF-16 码元的低 7 位
			codeUnits := stringToUTF16CodeUnits(str)
			data = make([]byte, len(codeUnits))
			for i, unit := range codeUnits {
				data[i] = byte(unit) & 0x7F
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
	// 🔥 修复：返回共享内存视图（对齐 Node.js）
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

		// 🔥 修复：返回共享视图而不是复制
		// 获取底层 ArrayBuffer 和当前 byteOffset
		arrayBuffer := this.Get("buffer")
		baseByteOffset := int64(0)
		if byteOffsetVal := this.Get("byteOffset"); !goja.IsUndefined(byteOffsetVal) {
			baseByteOffset = byteOffsetVal.ToInteger()
		}

		// 计算新视图的参数
		viewLength := end - start
		if viewLength < 0 {
			viewLength = 0
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
	})

	// 添加 indexOf 方法
	// 🔥 修复：完整实现 indexOf(value[, byteOffset][, encoding])
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
		encoding := "utf8"

		// 解析参数：indexOf(value, byteOffset, encoding) 或 indexOf(value, encoding)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			arg1 := call.Arguments[1]
			// 判断是 offset 还是 encoding
			arg1Str := arg1.String()
			isEncoding := false
			switch strings.ToLower(arg1Str) {
			case "utf8", "utf-8", "hex", "base64", "base64url", "ascii", "latin1", "binary", "utf16le", "ucs2", "ucs-2", "utf-16le":
				isEncoding = true
			}

			if isEncoding {
				encoding = arg1Str
			} else {
				offset = arg1.ToInteger()
				// 第三个参数可能是 encoding
				if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
					encoding = call.Arguments[2].String()
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

		// 先尝试作为字符串或数字
		searchType := searchArg.ExportType()
		if searchType != nil && (searchType.Kind().String() == "float64" || searchType.Kind().String() == "int64") {
			// 数字类型
			searchBytes = []byte{byte(searchArg.ToInteger() & 0xFF)}
		} else if searchType != nil && searchType.Kind().String() == "string" {
			// 字符串类型
			searchStr := searchArg.String()
			if searchStr != "" {
				// 🔥 修复：完整的编码处理（对齐 Node.js）
				switch strings.ToLower(encoding) {
				case "utf8", "utf-8":
					searchBytes = []byte(searchStr)
				case "hex":
					decoded, err := hex.DecodeString(searchStr)
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
			// 可能是 Buffer 或 Uint8Array
			searchObj := searchArg.ToObject(runtime)
			if searchObj != nil {
				searchLen := searchObj.Get("length")
				if searchLen != nil && !goja.IsUndefined(searchLen) && !goja.IsNull(searchLen) {
					searchLength := searchLen.ToInteger()
					if searchLength > 0 {
						searchBytes = make([]byte, searchLength)
						for i := int64(0); i < searchLength; i++ {
							val := searchObj.Get(strconv.FormatInt(i, 10))
							if val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
								searchBytes[i] = byte(val.ToInteger() & 0xFF)
							}
						}
					}
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
		// 🔥 修复：编码大小写不敏感
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
			// UTF-16LE 解码（正确处理 surrogate pairs）
			// 如果是奇数字节，最后一个字节会被忽略（Node.js 行为）
			if len(data) < 2 {
				return runtime.ToValue("")
			}

			// 解码 UTF-16LE，支持 surrogate pairs
			var runes []rune
			for i := 0; i < len(data)-1; i += 2 {
				// Little Endian: 低字节在前
				codeUnit := uint16(data[i]) | (uint16(data[i+1]) << 8)

				// 检查是否是 high surrogate (0xD800 - 0xDBFF)
				if codeUnit >= 0xD800 && codeUnit <= 0xDBFF {
					// 这是一个 high surrogate，需要读取下一个 low surrogate
					if i+3 < len(data) {
						lowSurrogate := uint16(data[i+2]) | (uint16(data[i+3]) << 8)
						// 检查是否是 low surrogate (0xDC00 - 0xDFFF)
						if lowSurrogate >= 0xDC00 && lowSurrogate <= 0xDFFF {
							// 合并 surrogate pair 为一个码点
							// 算法：codePoint = 0x10000 + ((high - 0xD800) << 10) + (low - 0xDC00)
							codePoint := 0x10000 + ((uint32(codeUnit) - 0xD800) << 10) + (uint32(lowSurrogate) - 0xDC00)
							runes = append(runes, rune(codePoint))
							i += 2 // 跳过 low surrogate
							continue
						}
					}
					// 如果不是有效的 surrogate pair，作为单个字符处理（替换为 U+FFFD）
					runes = append(runes, '\uFFFD')
				} else if codeUnit >= 0xDC00 && codeUnit <= 0xDFFF {
					// 孤立的 low surrogate，替换为 U+FFFD
					runes = append(runes, '\uFFFD')
				} else {
					// BMP 字符，直接转换
					runes = append(runes, rune(codeUnit))
				}
			}
			return runtime.ToValue(string(runes))
		default:
			// 🔥 修复：未知编码应该抛出错误（Node.js 行为）
			panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", encoding)))
		}
	})

	// 添加 copy 方法
	prototype.Set("copy", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("目标 buffer 是必需的"))
		}

		target := call.Arguments[0].ToObject(runtime)
		if target == nil {
			panic(runtime.NewTypeError("目标必须是一个 buffer"))
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

		// 🔥 修复：Node.js v22 严格参数验证
		// 负数参数抛出 RangeError（与 Node.js v22 一致）
		if targetStart < 0 {
			panic(runtime.NewTypeError(fmt.Sprintf("RangeError [ERR_OUT_OF_RANGE]: The value of \"targetStart\" is out of range. It must be >= 0 && <= %d. Received %d", targetLength, targetStart)))
		}
		if sourceStart < 0 {
			panic(runtime.NewTypeError(fmt.Sprintf("RangeError [ERR_OUT_OF_RANGE]: The value of \"sourceStart\" is out of range. It must be >= 0 && <= %d. Received %d", thisLength, sourceStart)))
		}
		if sourceEnd < 0 {
			panic(runtime.NewTypeError(fmt.Sprintf("RangeError [ERR_OUT_OF_RANGE]: The value of \"sourceEnd\" is out of range. It must be >= 0 && <= %d. Received %d", thisLength, sourceEnd)))
		}

		// 边界夹取（超出上界时夹取）
		if sourceStart > thisLength {
			sourceStart = thisLength
		}
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
		thisAB := this.Get("buffer")
		targetAB := target.Get("buffer")
		if !goja.IsUndefined(thisAB) && !goja.IsUndefined(targetAB) {
			// 比较 ArrayBuffer 是否相同
			if thisAB.Export() == targetAB.Export() {
				sameAB = true
			}
		}

		// 计算绝对偏移范围
		thisBase := int64(0)
		targetBase := int64(0)
		if v := this.Get("byteOffset"); !goja.IsUndefined(v) {
			thisBase = v.ToInteger()
		}
		if v := target.Get("byteOffset"); !goja.IsUndefined(v) {
			targetBase = v.ToInteger()
		}

		srcAbsStart := thisBase + sourceStart
		srcAbsEnd := thisBase + sourceEnd
		dstAbsStart := targetBase + targetStart
		dstAbsEnd := dstAbsStart + copyLength

		// 只要共享 ArrayBuffer 且区间相交，就按 memmove 语义处理
		if sameAB && copyLength > 0 && dstAbsStart < srcAbsEnd && dstAbsEnd > srcAbsStart {
			// 🔥 修复：先读取所有数据到临时缓冲区，避免读写冲突
			tempData := make([]goja.Value, copyLength)
			for i := int64(0); i < copyLength; i++ {
				tempData[i] = this.Get(strconv.FormatInt(sourceStart+i, 10))
			}
			// 然后写入目标
			for i := int64(0); i < copyLength; i++ {
				target.Set(strconv.FormatInt(targetStart+i, 10), tempData[i])
			}
			return runtime.ToValue(copyLength)
		}

		// 非重叠情况：直接复制
		written := int64(0)
		for i := int64(0); i < copyLength; i++ {
			if val := this.Get(strconv.FormatInt(sourceStart+i, 10)); !goja.IsUndefined(val) {
				target.Set(strconv.FormatInt(targetStart+i, 10), val)
				written++
			}
		}

		return runtime.ToValue(written)
	})

	// 添加 compare 方法
	// 🔥 修复：支持范围参数 compare(target, targetStart, targetEnd, sourceStart, sourceEnd)
	prototype.Set("compare", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("目标 buffer 是必需的"))
		}

		target := call.Arguments[0].ToObject(runtime)
		if target == nil {
			panic(runtime.NewTypeError("目标必须是一个 buffer"))
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

		// 🔥 新增：解析范围参数
		targetStart := int64(0)
		targetEnd := targetLength
		sourceStart := int64(0)
		sourceEnd := thisLength

		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			targetStart = call.Arguments[1].ToInteger()
		}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			targetEnd = call.Arguments[2].ToInteger()
		}
		if len(call.Arguments) > 3 && !goja.IsUndefined(call.Arguments[3]) {
			sourceStart = call.Arguments[3].ToInteger()
		}
		if len(call.Arguments) > 4 && !goja.IsUndefined(call.Arguments[4]) {
			sourceEnd = call.Arguments[4].ToInteger()
		}

		// 边界检查
		if targetStart < 0 {
			targetStart = 0
		}
		if targetEnd > targetLength {
			targetEnd = targetLength
		}
		if targetStart >= targetEnd {
			targetEnd = targetStart
		}

		if sourceStart < 0 {
			sourceStart = 0
		}
		if sourceEnd > thisLength {
			sourceEnd = thisLength
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

		// 比较每个字节
		for i := int64(0); i < minLength; i++ {
			thisVal := int64(0)
			targetVal := int64(0)

			if val := this.Get(strconv.FormatInt(sourceStart+i, 10)); !goja.IsUndefined(val) {
				thisVal = val.ToInteger() & 0xFF
			}
			if val := target.Get(strconv.FormatInt(targetStart+i, 10)); !goja.IsUndefined(val) {
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
		
		// 🔥 修复：编码大小写不敏感
		encoding = strings.ToLower(encoding)

		// 🔥 修复：严格的边界检查（对齐 Node.js v22）
		if offset < 0 {
			offset = 0
		}

		// Node.js v22 要求 end 必须在有效范围内
		if end < 0 || end > bufferLength {
			panic(runtime.NewTypeError(fmt.Sprintf("RangeError: The value of \"end\" is out of range. It must be >= 0 && <= %d. Received %d", bufferLength, end)))
		}

		if offset >= end {
			return this
		}

		// 处理填充值
		var fillData []byte

		// 🔥 修复：先判断类型，避免将数字误当作字符串
		valueType := value.ExportType()
		if valueType != nil && (valueType.Kind().String() == "float64" || valueType.Kind().String() == "int64") {
			// 数字类型
			numVal := value.ToInteger()
			fillData = []byte{byte(numVal & 0xFF)}
		} else if valueType != nil && valueType.Kind().String() == "string" {
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
					decoded, err := hex.DecodeString(fillStr)
					if err != nil {
						fillData = []byte(fillStr)
					} else {
						fillData = decoded
					}
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
					// ASCII: 每个 UTF-16 码元的低 7 位
					codeUnits := stringToUTF16CodeUnits(fillStr)
					fillData = make([]byte, len(codeUnits))
					for i, unit := range codeUnits {
						fillData[i] = byte(unit & 0x7F)
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
			// 🔥 新增：尝试作为 Buffer/Uint8Array
			obj := value.ToObject(runtime)
			if obj != nil {
				if lengthVal := obj.Get("length"); !goja.IsUndefined(lengthVal) {
					length := lengthVal.ToInteger()
					if length > 0 {
						fillData = make([]byte, length)
						for i := int64(0); i < length; i++ {
							if val := obj.Get(strconv.FormatInt(i, 10)); !goja.IsUndefined(val) {
								fillData[i] = byte(val.ToInteger() & 0xFF)
							}
						}
					}
				}
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
		enc := goja.Undefined()
		
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}
		// 🔥 修复：传递 encoding 参数
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			enc = call.Arguments[2]
		}

		// 调用已有的indexOf方法
		indexOfFunc := prototype.Get("indexOf")
		if indexOfFunc != nil && !goja.IsUndefined(indexOfFunc) {
			if fn, ok := goja.AssertFunction(indexOfFunc); ok {
				result, err := fn(call.This, searchVal, runtime.ToValue(offset), enc)
				if err == nil {
					return runtime.ToValue(result.ToInteger() != -1)
				}
			}
		}

		return runtime.ToValue(false)
	})

	// 添加 lastIndexOf 方法
	// 🔥 修复：完整实现 lastIndexOf(value[, byteOffset][, encoding])
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

		searchArg := call.Arguments[0]
		byteOffset := bufferLength - 1
		encoding := "utf8"

		// 解析参数：lastIndexOf(value, byteOffset, encoding) 或 lastIndexOf(value, encoding)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			arg1 := call.Arguments[1]
			arg1Str := arg1.String()
			isEncoding := false
			// 🔥 修复：大小写不敏感
			switch strings.ToLower(arg1Str) {
			case "utf8", "utf-8", "hex", "base64", "base64url", "ascii", "latin1", "binary", "utf16le", "ucs2", "ucs-2", "utf-16le":
				isEncoding = true
			}

			if isEncoding {
				encoding = arg1Str
			} else {
				byteOffset = arg1.ToInteger()
				if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
					encoding = call.Arguments[2].String()
				}
			}
		}

		// 🔥 修复：编码大小写不敏感
		encoding = strings.ToLower(encoding)

		// 处理负数 offset
		if byteOffset < 0 {
			byteOffset = bufferLength + byteOffset
		}
		if byteOffset >= bufferLength {
			byteOffset = bufferLength - 1
		}
		if byteOffset < 0 {
			return runtime.ToValue(-1)
		}

		// 处理不同类型的搜索值
		var searchBytes []byte

		// 先尝试作为字符串或数字
		searchType := searchArg.ExportType()
		if searchType != nil && (searchType.Kind().String() == "float64" || searchType.Kind().String() == "int64") {
			// 数字类型
			searchBytes = []byte{byte(searchArg.ToInteger() & 0xFF)}
		} else if searchType != nil && searchType.Kind().String() == "string" {
			// 字符串类型
			searchStr := searchArg.String()
			if searchStr != "" {
				// 🔥 修复：完整的编码处理（对齐 Node.js）
				// encoding 已经在上面转为小写
				switch encoding {
				case "utf8", "utf-8":
					searchBytes = []byte(searchStr)
				case "hex":
					decoded, err := hex.DecodeString(searchStr)
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
			// 可能是 Buffer 或 Uint8Array
			searchObj := searchArg.ToObject(runtime)
			if searchObj != nil {
				searchLen := searchObj.Get("length")
				if searchLen != nil && !goja.IsUndefined(searchLen) && !goja.IsNull(searchLen) {
					searchLength := searchLen.ToInteger()
					if searchLength > 0 {
						searchBytes = make([]byte, searchLength)
						for i := int64(0); i < searchLength; i++ {
							val := searchObj.Get(strconv.FormatInt(i, 10))
							if val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
								searchBytes[i] = byte(val.ToInteger() & 0xFF)
							}
						}
					}
				}
			}
		}

		if len(searchBytes) == 0 {
			if byteOffset < bufferLength {
				return runtime.ToValue(byteOffset)
			}
			return runtime.ToValue(bufferLength)
		}

		// 从 byteOffset 向前搜索
		searchLen := int64(len(searchBytes))
		for i := byteOffset; i >= searchLen-1; i-- {
			found := true
			startPos := i - searchLen + 1
			for j := int64(0); j < searchLen; j++ {
				if val := this.Get(strconv.FormatInt(startPos+j, 10)); !goja.IsUndefined(val) {
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

		// 🔥 修复：错误类型和消息对齐 Node.js
		if bufferLength%2 != 0 {
			panic(runtime.NewTypeError("RangeError: Buffer size must be a multiple of 16-bits"))
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

		// 🔥 修复：错误类型和消息对齐 Node.js
		if bufferLength%4 != 0 {
			panic(runtime.NewTypeError("RangeError: Buffer size must be a multiple of 32-bits"))
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

		// 🔥 修复：错误类型和消息对齐 Node.js
		if bufferLength%8 != 0 {
			panic(runtime.NewTypeError("RangeError: Buffer size must be a multiple of 64-bits"))
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

	// 添加 subarray 方法
	// 🔥 修复：返回共享内存视图（对齐 Node.js）
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

		// 🔥 修复：返回共享视图而不是复制
		// 获取底层 ArrayBuffer 和当前 byteOffset
		arrayBuffer := this.Get("buffer")
		baseByteOffset := int64(0)
		if byteOffsetVal := this.Get("byteOffset"); !goja.IsUndefined(byteOffsetVal) {
			baseByteOffset = byteOffsetVal.ToInteger()
		}

		// 计算新视图的参数
		viewLength := end - start
		if viewLength < 0 {
			viewLength = 0
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
	})

	// 添加 set 方法
	prototype.Set("set", func(call goja.FunctionCall) goja.Value {
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
			panic(runtime.NewTypeError("偏移量超出 buffer 边界"))
		}

		// 🔥 修复：检查是否共享同一 ArrayBuffer（避免重叠时数据污染）
		sameAB := false
		thisAB := this.Get("buffer")
		srcAB := sourceArray.Get("buffer")
		if !goja.IsUndefined(thisAB) && !goja.IsUndefined(srcAB) && thisAB.Export() == srcAB.Export() {
			sameAB = true
		}

		if sameAB && sourceLength > 0 {
			// 先把源区数据拷到临时切片，避免重叠破坏（memmove 语义）
			tmp := make([]goja.Value, sourceLength)
			for i := int64(0); i < sourceLength; i++ {
				tmp[i] = sourceArray.Get(strconv.FormatInt(i, 10))
			}
			for i := int64(0); i < sourceLength; i++ {
				this.Set(strconv.FormatInt(offset+i, 10), tmp[i])
			}
			return goja.Undefined()
		}

		// 非同 AB 或不重叠：直接顺序复制
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
		panic(runtime.NewTypeError("\"" + valueName + "\" 的值超出范围。必须 >= " +
			strconv.FormatInt(min, 10) + " 且 <= " + strconv.FormatInt(max, 10) + "。接收到 " +
			strconv.FormatInt(value, 10)))
	}
}

// checkReadBounds 检查读取边界并返回 buffer length
func checkReadBounds(runtime *goja.Runtime, this *goja.Object, offset, byteSize int64, methodName string) int64 {
	if this == nil {
		panic(runtime.NewTypeError("方法 " + methodName + " 在不兼容的接收器上调用"))
	}

	bufferLength := int64(0)
	if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
		bufferLength = lengthVal.ToInteger()
	}

	if offset < 0 || offset+byteSize > bufferLength {
		panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
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

		if offset >= bufferLength {
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
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
			panic(runtime.NewTypeError("RangeError: 偏移量超出 Buffer 边界"))
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

// safeGetThis 安全地获取 this 对象，如果失败则 panic
func safeGetThis(runtime *goja.Runtime, call goja.FunctionCall) *goja.Object {
	this := call.This.ToObject(runtime)
	if this == nil {
		panic(runtime.NewTypeError("无法读取 null 或 undefined 的属性"))
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

// addSymbolIterator 为迭代器添加 Symbol.iterator 支持（如果可用）
func addSymbolIterator(runtime *goja.Runtime, iterator *goja.Object) {
	// 注意：这取决于 goja 版本是否支持 Symbol
	// 如果不支持，迭代器仍然可以通过 .next() 手动使用
	if symbolObj := runtime.Get("Symbol"); !goja.IsUndefined(symbolObj) {
		if symbol := symbolObj.ToObject(runtime); symbol != nil {
			if iteratorSym := symbol.Get("iterator"); !goja.IsUndefined(iteratorSym) {
				// 返回自身，使迭代器可以用于 for...of
				iterator.Set("Symbol.iterator", runtime.ToValue(func() goja.Value {
					return iterator
				}))
			}
		}
	}
}

// addBufferIteratorMethods 添加Buffer迭代器方法
// 🔥 改进：返回真正的迭代器对象而不是数组
func (be *BufferEnhancer) addBufferIteratorMethods(runtime *goja.Runtime, prototype *goja.Object) {
	// entries() - 返回键值对迭代器
	prototype.Set("entries", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 创建迭代器对象
		iterator := runtime.NewObject()
		index := int64(0)

		// 实现 next() 方法
		iterator.Set("next", func(call goja.FunctionCall) goja.Value {
			result := runtime.NewObject()

			if index < bufferLength {
				val := uint8(0)
				if v := this.Get(strconv.FormatInt(index, 10)); !goja.IsUndefined(v) {
					val = uint8(v.ToInteger() & 0xFF)
				}

				// 返回 {value: [index, value], done: false}
				valueArray := runtime.NewArray(int64(2))
				valueArray.Set("0", runtime.ToValue(index))
				valueArray.Set("1", runtime.ToValue(val))

				result.Set("value", valueArray)
				result.Set("done", runtime.ToValue(false))
				index++
			} else {
				// 返回 {value: undefined, done: true}
				result.Set("value", goja.Undefined())
				result.Set("done", runtime.ToValue(true))
			}

			return result
		})

		// 🔥 新增：添加 Symbol.iterator 支持
		addSymbolIterator(runtime, iterator)

		return iterator
	})

	// keys() - 返回索引迭代器
	prototype.Set("keys", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 创建迭代器对象
		iterator := runtime.NewObject()
		index := int64(0)

		// 实现 next() 方法
		iterator.Set("next", func(call goja.FunctionCall) goja.Value {
			result := runtime.NewObject()

			if index < bufferLength {
				result.Set("value", runtime.ToValue(index))
				result.Set("done", runtime.ToValue(false))
				index++
			} else {
				result.Set("value", goja.Undefined())
				result.Set("done", runtime.ToValue(true))
			}

			return result
		})

		// 🔥 新增：添加 Symbol.iterator 支持
		addSymbolIterator(runtime, iterator)

		return iterator
	})

	// values() - 返回值迭代器
	prototype.Set("values", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)

		// 获取buffer长度
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}

		// 创建迭代器对象
		iterator := runtime.NewObject()
		index := int64(0)

		// 实现 next() 方法
		iterator.Set("next", func(call goja.FunctionCall) goja.Value {
			result := runtime.NewObject()

			if index < bufferLength {
				val := uint8(0)
				if v := this.Get(strconv.FormatInt(index, 10)); !goja.IsUndefined(v) {
					val = uint8(v.ToInteger() & 0xFF)
				}

				result.Set("value", runtime.ToValue(val))
				result.Set("done", runtime.ToValue(false))
				index++
			} else {
				result.Set("value", goja.Undefined())
				result.Set("done", runtime.ToValue(true))
			}

			return result
		})

		// 🔥 新增：添加 Symbol.iterator 支持
		addSymbolIterator(runtime, iterator)

		return iterator
	})
}

// addBufferVariableLengthMethods 添加可变长度整数读写方法
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

// setupBigIntSupport 设置 BigInt 模拟支持（使用 Go 的 math/big.Int）
func (be *BufferEnhancer) setupBigIntSupport(runtime *goja.Runtime) {
	// 🔥 新方案：通过 eval 创建原生 bigint 字面量
	// 这样 BigInt(100) 返回的就是真正的 bigint 原始类型，而不是对象
	bigIntConstructor := func(call goja.FunctionCall) goja.Value {
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

		// 🔥 新方法：通过 eval 执行 "数字n" 语法来创建原生 bigint
		// 例如：BigInt(100) 会执行 eval("100n")，返回原生 bigint
		valueStr := value.String()

		// 安全检查：确保值是有效的数字字符串
		if _, err := strconv.ParseInt(valueStr, 10, 64); err == nil || value.BitLen() > 63 {
			// 构造 bigint 字面量代码
			code := valueStr + "n"

			// 尝试通过 RunString 执行，返回原生 bigint
			result, err := runtime.RunString(code)
			if err == nil {
				return result
			}
		}

		// 🔥 降级方案：如果 eval 失败，使用原来的对象方式（兼容性）
		obj := runtime.NewObject()
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

	// 🔥 重要：为 BigInt 添加 prototype，确保 qs 等库能访问 BigInt.prototype.valueOf
	// Go 函数对象默认没有 prototype，需要手动添加
	bigIntObj := runtime.Get("BigInt")
	if obj, ok := bigIntObj.(*goja.Object); ok {
		prototype := runtime.NewObject()

		// 添加 valueOf 方法（qs 库需要检查这个方法是否存在）
		prototype.Set("valueOf", runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			// 如果是对象，尝试获取其值
			if thisObj, ok := call.This.(*goja.Object); ok {
				if val := thisObj.Get("__bigIntValue__"); !goja.IsUndefined(val) {
					return val
				}
			}
			// 否则返回 this 本身（对于原生 bigint）
			return call.This
		}))

		// 添加 toString 方法
		prototype.Set("toString", runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			if thisObj, ok := call.This.(*goja.Object); ok {
				if val := thisObj.Get("__bigIntValue__"); !goja.IsUndefined(val) {
					return val
				}
			}
			return runtime.ToValue(call.This.String())
		}))

		obj.Set("prototype", prototype)
	}
}

// addBigIntReadWriteMethods 添加 BigInt 读写方法
func (be *BufferEnhancer) addBigIntReadWriteMethods(runtime *goja.Runtime, prototype *goja.Object) {
	// 🔥 辅助函数：创建 BigInt 对象（改进版：返回原生 bigint）
	createBigInt := func(value *big.Int) goja.Value {
		valueStr := value.String()

		// 🔥 新方法：通过 eval 执行 "数字n" 语法来创建原生 bigint
		// 这样 Buffer.readBigInt64BE() 等方法返回的也是原生 bigint
		code := valueStr + "n"

		// 尝试通过 RunString 执行，返回原生 bigint
		result, err := runtime.RunString(code)
		if err == nil {
			return result
		}

		// 🔥 降级方案：如果 eval 失败，使用对象方式（兼容性）
		bigInt := runtime.NewObject()
		bigInt.Set("__bigIntValue__", runtime.ToValue(valueStr))
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

	// 辅助函数：从 goja.Value 获取 big.Int（改进版：支持原生 bigint）
	getBigIntValue := func(value goja.Value) *big.Int {
		// 检查是否为 undefined 或 null
		if goja.IsUndefined(value) || goja.IsNull(value) {
			panic(runtime.NewTypeError("无法将 undefined 或 null 转换为 BigInt"))
		}

		// 🔥 新增：优先检查是否为原生 bigint（通过 Export 导出）
		// goja 原生 bigint 会导出为 *big.Int
		if exported := value.Export(); exported != nil {
			if bigIntVal, ok := exported.(*big.Int); ok {
				return bigIntVal
			}
		}

		// 先检查是否为数字类型（防止 ToObject 失败）
		// 如果是普通数字，直接抛出类型错误
		if _, ok := value.Export().(int64); ok {
			panic(runtime.NewTypeError("\"value\" 参数必须是 bigint 类型。接收到 number 类型"))
		}
		if _, ok := value.Export().(float64); ok {
			panic(runtime.NewTypeError("\"value\" 参数必须是 bigint 类型。接收到 number 类型"))
		}

		// 尝试获取 BigInt 对象（兼容旧的对象方式）
		defer func() {
			if r := recover(); r != nil {
				// 如果ToObject失败，抛出类型错误
				panic(runtime.NewTypeError("\"value\" 参数必须是 bigint 类型"))
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
		panic(runtime.NewTypeError("\"value\" 参数必须是 bigint 类型"))
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
			panic(runtime.NewTypeError("方法 writeBigInt64BE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
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
			panic(runtime.NewTypeError("方法 writeBigInt64LE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
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
			panic(runtime.NewTypeError("方法 writeBigUInt64BE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
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
			panic(runtime.NewTypeError("方法 writeBigUInt64LE 在不兼容的接收器上调用"))
		}
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
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
