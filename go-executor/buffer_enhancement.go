package main

import (
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"math"
	"strconv"

	"github.com/dop251/goja"
)

// BufferEnhancer Buffer增强器
type BufferEnhancer struct{}

// NewBufferEnhancer 创建新的Buffer增强器
func NewBufferEnhancer() *BufferEnhancer {
	return &BufferEnhancer{}
}

// EnhanceBufferSupport 增强Buffer功能，补充官方goja_nodejs不支持的方法
func (be *BufferEnhancer) EnhanceBufferSupport(runtime *goja.Runtime) {
	bufferObj := runtime.Get("Buffer")
	if bufferObj == nil {
		return
	}

	buffer, ok := bufferObj.(*goja.Object)
	if !ok {
		return
	}

	// 添加 Buffer.isBuffer 静态方法
	buffer.Set("isBuffer", func(obj goja.Value) bool {
		if obj == nil || goja.IsUndefined(obj) || goja.IsNull(obj) {
			return false
		}

		// 检查是否为Buffer实例
		objAsObject := obj.ToObject(runtime)
		if objAsObject == nil {
			return false
		}

		// 检查是否有Buffer的特征属性
		if length := objAsObject.Get("length"); !goja.IsUndefined(length) {
			if constructor := objAsObject.Get("constructor"); !goja.IsUndefined(constructor) {
				return true // 简化的判断，有length和constructor属性就认为是Buffer
			}
		}
		return false
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

	// 增强 Buffer.from 支持数组
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

	// 添加 write 方法
	prototype.Set("write", func(call goja.FunctionCall) goja.Value {
		this := call.This.ToObject(runtime)
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("String is required"))
		}

		str := call.Arguments[0].String()
		offset := int64(0)
		length := int64(len(str))
		encoding := "utf8"

		// 解析参数
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = call.Arguments[1].ToInteger()
		}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			length = call.Arguments[2].ToInteger()
		}
		if len(call.Arguments) > 3 && !goja.IsUndefined(call.Arguments[3]) {
			encoding = call.Arguments[3].String()
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
			decoded, err := base64.StdEncoding.DecodeString(str)
			if err != nil {
				panic(runtime.NewTypeError("Invalid base64 string"))
			}
			data = decoded
		case "latin1", "binary":
			// Latin1编码：每个字符直接对应一个字节（0-255）
			data = make([]byte, len(str))
			for i, r := range str {
				if r > 255 {
					data[i] = 255 // 截断超出范围的字符
				} else {
					data[i] = byte(r)
				}
			}
		case "ascii":
			// ASCII编码：只支持0-127范围的字符
			data = make([]byte, len(str))
			for i, r := range str {
				if r > 127 {
					data[i] = 63 // '?' 替换非ASCII字符
				} else {
					data[i] = byte(r)
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
		case "latin1", "binary":
			// Latin1编码：每个字节直接对应一个字符（0-255）
			runes := make([]rune, len(data))
			for i, b := range data {
				runes[i] = rune(b)
			}
			return runtime.ToValue(string(runes))
		case "ascii":
			// ASCII编码：只处理0-127范围的字节，超出范围用'?'替换
			runes := make([]rune, len(data))
			for i, b := range data {
				if b <= 127 {
					runes[i] = rune(b)
				} else {
					runes[i] = '?'
				}
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
				decoded, err := base64.StdEncoding.DecodeString(fillStr)
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

	// 添加数值读写方法
	be.addBufferNumericMethods(runtime, prototype)
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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+1 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+1 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+1 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+1 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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

		value := int16(call.Arguments[0].ToInteger())
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

		value := int16(call.Arguments[0].ToInteger())
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

		value := uint16(call.Arguments[0].ToInteger())
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

		value := uint16(call.Arguments[0].ToInteger())
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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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

		value := int32(call.Arguments[0].ToInteger())
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

		value := int32(call.Arguments[0].ToInteger())
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

		value := uint32(call.Arguments[0].ToInteger())
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

		value := uint32(call.Arguments[0].ToInteger())
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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+3 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+7 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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
		bufferLength := int64(0)
		if lengthVal := this.Get("length"); !goja.IsUndefined(lengthVal) {
			bufferLength = lengthVal.ToInteger()
		}
		if offset+7 >= bufferLength {
			panic(runtime.NewTypeError("RangeError: Offset is outside the bounds of the Buffer"))
		}

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

// getBufferByte 是一个辅助函数，用于从Buffer中读取字节
func (be *BufferEnhancer) getBufferByte(buffer *goja.Object, offset int64) uint8 {
	if val := buffer.Get(strconv.FormatInt(offset, 10)); !goja.IsUndefined(val) {
		return uint8(val.ToInteger() & 0xFF)
	}
	return 0
}
