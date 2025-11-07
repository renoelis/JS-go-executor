package crypto

import (
	"crypto/rand"
	"fmt"
	"strconv"

	"github.com/dop251/goja"
)

// ============================================================================
// 🔥 随机数功能
// ============================================================================

// RandomBytes 生成随机字节
// 支持同步和异步两种模式：
// - 同步模式：crypto.randomBytes(size) 返回 Buffer
// - 异步模式：crypto.randomBytes(size, callback) 返回 undefined，通过回调返回结果
func RandomBytes(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("randomBytes 需要 size 参数"))
	}

	sizeArg := call.Arguments[0]

	// Node.js 严格类型检查:拒绝非数字类型(null, undefined, 字符串, 对象等)
	// 但允许数字(包括 NaN, Infinity)
	exportedVal := sizeArg.Export()

	// 检查是否为 null 或 undefined
	if goja.IsNull(sizeArg) || goja.IsUndefined(sizeArg) {
		panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received " + getTypeString(exportedVal)))
	}

	// 检查是否为数字类型
	switch exportedVal.(type) {
	case int64, int, int32, float64, float32:
		// 允许的数字类型
	default:
		// 其他类型一律拒绝
		panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received " + getTypeString(exportedVal)))
	}

	// 检查 NaN 和 Infinity
	if floatVal, ok := exportedVal.(float64); ok {
		if floatVal != floatVal { // NaN check (NaN != NaN)
			panic(runtime.NewTypeError(fmt.Sprintf(
				"The value of \"size\" is out of range. It must be >= 0 && <= %d. Received NaN",
				MaxRandomBytesSize)))
		}
	}

	size := int(sizeArg.ToInteger())

	// Node.js 行为：接受 0（返回空 Buffer），拒绝负数和超出最大值
	if size < 0 || size > MaxRandomBytesSize {
		panic(runtime.NewTypeError(fmt.Sprintf(
			"The value of \"size\" is out of range. It must be >= 0 && <= %d. Received %d",
			MaxRandomBytesSize, size)))
	}

	// 检查是否提供了回调函数（异步模式）
	var callback goja.Callable
	if len(call.Arguments) >= 2 {
		if callbackArg := call.Arguments[1]; !goja.IsUndefined(callbackArg) && !goja.IsNull(callbackArg) {
			if callbackObj, ok := callbackArg.(*goja.Object); ok {
				if cbFunc, ok := goja.AssertFunction(callbackObj); ok {
					callback = cbFunc
				}
			}
		}
	}

	// 生成随机字节的核心逻辑
	generateBytes := func() (goja.Value, error) {
		// 如果 size 为 0，直接返回空 Buffer
		if size == 0 {
			return CreateBuffer(runtime, []byte{}), nil
		}

		bytes := make([]byte, size)
		_, err := rand.Read(bytes)
		if err != nil {
			return nil, fmt.Errorf("生成随机字节失败: %w", err)
		}

		return CreateBuffer(runtime, bytes), nil
	}

	// 如果提供了回调函数，使用异步模式
	if callback != nil {
		// 使用 setImmediate 异步执行回调（EventLoop 安全）
		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			// 创建回调函数
			asyncCallback := func(call goja.FunctionCall) goja.Value {
				// 在 EventLoop 线程中执行
				result, err := generateBytes()
				if err != nil {
					// 调用回调，传递错误
					errObj := runtime.NewGoError(err)
					_, _ = callback(goja.Undefined(), errObj, goja.Null())
				} else {
					// 调用回调，传递结果（第一个参数是 null 表示无错误）
					_, _ = callback(goja.Undefined(), goja.Null(), result)
				}
				return goja.Undefined()
			}

			// 使用 setImmediate 调度异步执行
			_, _ = setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
		} else {
			// 降级：如果没有 setImmediate，同步执行回调
			result, err := generateBytes()
			if err != nil {
				errObj := runtime.NewGoError(err)
				_, _ = callback(goja.Undefined(), errObj, goja.Null())
			} else {
				_, _ = callback(goja.Undefined(), goja.Null(), result)
			}
		}

		// 异步模式返回 undefined
		return goja.Undefined()
	}

	// 同步模式：直接返回结果
	result, err := generateBytes()
	if err != nil {
		panic(runtime.NewGoError(err))
	}
	return result
}

// RandomUUID 生成随机 UUID
func RandomUUID(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	// Node.js v18+：接受可选的 options 参数 { disableEntropyCache?: boolean }
	if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
		arg := call.Arguments[0]

		// 检查 null - Node.js 对 null 会抛出 TypeError
		if goja.IsNull(arg) {
			panic(runtime.NewTypeError("The \"options\" argument must be of type object. Received null"))
		}

		// 验证 options 是对象
		optionsObj, ok := arg.(*goja.Object)
		if !ok {
			panic(runtime.NewTypeError("The \"options\" argument must be of type object"))
		}

		// 检查是否为数组 - Node.js 拒绝数组
		if isArray := optionsObj.Get("constructor"); isArray != nil && !goja.IsUndefined(isArray) {
			if ctorObj, ok := isArray.(*goja.Object); ok {
				if name := ctorObj.Get("name"); !goja.IsUndefined(name) && name.String() == "Array" {
					panic(runtime.NewTypeError("The \"options\" argument must be of type object. Received an instance of Array"))
				}
			}
		}

		// 检查 disableEntropyCache 参数类型
		if disableEntropyCacheVal := optionsObj.Get("disableEntropyCache"); disableEntropyCacheVal != nil && !goja.IsUndefined(disableEntropyCacheVal) {
			// 必须是 boolean 类型
			exportedVal := disableEntropyCacheVal.Export()

			// 检查是否为 bool 类型
			if _, ok := exportedVal.(bool); !ok {
				// 获取实际类型名称
				actualType := "unknown"
				actualValue := exportedVal

				switch v := exportedVal.(type) {
				case string:
					actualType = "string"
					actualValue = fmt.Sprintf("'%s'", v)
				case int64, int, int32:
					actualType = "number"
				case float64:
					actualType = "number"
				case nil:
					actualType = "undefined"
					actualValue = "undefined"
				default:
					actualType = fmt.Sprintf("%T", v)
				}

				panic(runtime.NewTypeError(fmt.Sprintf(
					"The \"options.disableEntropyCache\" property must be of type boolean. Received type %s (%v)",
					actualType, actualValue,
				)))
			}
		}
	}

	// 生成 UUID v4
	uuid := make([]byte, 16)
	_, err := rand.Read(uuid)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成 UUID 失败: %w", err)))
	}

	// 设置版本 (4) 和变体位
	uuid[6] = (uuid[6] & 0x0f) | 0x40 // Version 4
	uuid[8] = (uuid[8] & 0x3f) | 0x80 // Variant bits

	// 格式化为标准 UUID 字符串
	uuidStr := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		uuid[0:4], uuid[4:6], uuid[6:8], uuid[8:10], uuid[10:16])

	return runtime.ToValue(uuidStr)
}

// GetRandomValues 填充 TypedArray 随机值
func GetRandomValues(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("getRandomValues 需要一个类型化数组参数"))
	}

	arg := call.Arguments[0]
	obj, ok := arg.(*goja.Object)
	if !ok || obj == nil {
		panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
	}

	// 检查是否有 TypedArray 的特征属性
	bufferProp := obj.Get("buffer")
	byteLengthVal := obj.Get("byteLength")

	// 必须有 buffer 和 byteLength 属性才是 TypedArray/Buffer
	if bufferProp == nil || goja.IsUndefined(bufferProp) || goja.IsNull(bufferProp) ||
		byteLengthVal == nil || goja.IsUndefined(byteLengthVal) || goja.IsNull(byteLengthVal) {
		panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
	}

	// 获取数组类型名称
	var typeName string
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) && !goja.IsNull(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok && constructorObj != nil {
			if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) && !goja.IsNull(nameVal) {
				typeName = nameVal.String()
			}
		}
	}

	// 规范检查：只允许整型 TypedArray
	// 注意：Node.js 的 Buffer 继承自 Uint8Array
	var bytesPerElement int
	var isValidType bool

	switch typeName {
	case "Int8Array", "Uint8Array", "Uint8ClampedArray", "Buffer":
		bytesPerElement = 1
		isValidType = true
	case "Int16Array", "Uint16Array":
		bytesPerElement = 2
		isValidType = true
	case "Int32Array", "Uint32Array":
		bytesPerElement = 4
		isValidType = true
	case "BigInt64Array", "BigUint64Array":
		bytesPerElement = 8
		isValidType = true
	case "DataView", "Float32Array", "Float64Array", "Array":
		panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
	default:
		// 如果类型名为空或未知，但有 buffer 和 byteLength，可能是 Buffer
		// 尝试通过 byteLength 和 length 判断
		if lengthVal := obj.Get("length"); !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			length := int(lengthVal.ToInteger())
			byteLength := int(byteLengthVal.ToInteger())
			// 根据字节长度和元素长度的比例推断类型
			if byteLength == length {
				// 1字节元素
				bytesPerElement = 1
				isValidType = true
				typeName = "Uint8Array" // 默认作为 Uint8Array 处理
			} else {
				panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
			}
		} else {
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		}
	}

	if !isValidType {
		panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
	}

	// 获取字节长度
	var byteLength int
	if byteLengthVal := obj.Get("byteLength"); byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
		byteLength = int(byteLengthVal.ToInteger())
	} else if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
		length := int(lengthVal.ToInteger())
		byteLength = length * bytesPerElement
	} else {
		panic(runtime.NewTypeError("无法确定数组大小"))
	}

	// Web Crypto API 限制：最大 65536 字节
	if byteLength > MaxTypedArraySize {
		// 创建 QuotaExceededError (DOMException 的一种)
		errorMsg := fmt.Sprintf(
			"The ArrayBufferView's byte length (%d) exceeds the number of bytes of entropy available via this API (65536)",
			byteLength)

		// 创建一个 DOMException 对象
		domException := runtime.NewObject()
		domException.Set("name", "QuotaExceededError")
		domException.Set("message", errorMsg)
		domException.Set("code", 22) // QUOTA_EXCEEDED_ERR

		panic(domException)
	}

	if byteLength == 0 {
		return arg // 空数组直接返回
	}

	// 生成随机字节
	randomBytes := make([]byte, byteLength)
	_, err := rand.Read(randomBytes)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成随机数失败: %w", err)))
	}

	// 填充数组
	fillTypedArray(runtime, obj, randomBytes, typeName, bytesPerElement)

	return arg
}

// RandomFillSync 同步填充 Buffer/TypedArray
func RandomFillSync(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("randomFillSync 需要一个 buffer 参数"))
	}

	arg := call.Arguments[0]
	obj, ok := arg.(*goja.Object)
	if !ok || obj == nil {
		panic(runtime.NewTypeError("第一个参数必须是 Buffer 或 TypedArray"))
	}

	// 获取 buffer 的字节长度
	byteLength := getByteLength(runtime, obj)

	// 解析 offset 和 size 参数
	var offset, size int

	// 处理 offset 参数
	if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
		offsetArg := call.Arguments[1]

		// 检查是否为 null，Node.js 会抛出类型错误
		if goja.IsNull(offsetArg) {
			panic(runtime.NewTypeError("The \"offset\" argument must be of type number. Received null"))
		}

		exportedVal := offsetArg.Export()

		// Node.js 严格类型检查：只允许数字类型
		switch exportedVal.(type) {
		case int64, int, int32, float64, float32:
			// 允许的数字类型
		default:
			// 其他类型一律拒绝
			panic(runtime.NewTypeError(fmt.Sprintf(
				"The \"offset\" argument must be of type number. Received type %s (%v)",
				getTypeString(exportedVal), exportedVal)))
		}

		// 检查 NaN
		if floatVal, ok := exportedVal.(float64); ok {
			if floatVal != floatVal { // NaN check (NaN != NaN)
				panic(runtime.NewTypeError(fmt.Sprintf(
					"The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received NaN",
					byteLength)))
			}
		}

		offset = int(offsetArg.ToInteger())
		if offset < 0 || offset > byteLength {
			panic(runtime.NewTypeError(fmt.Sprintf(
				"The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d",
				byteLength, offset)))
		}
	}

	// 处理 size 参数
	if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
		sizeArg := call.Arguments[2]

		// 检查是否为 null，Node.js 会抛出类型错误
		if goja.IsNull(sizeArg) {
			panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received null"))
		}

		exportedVal := sizeArg.Export()

		// Node.js 严格类型检查：只允许数字类型
		switch exportedVal.(type) {
		case int64, int, int32, float64, float32:
			// 允许的数字类型
		default:
			// 其他类型一律拒绝
			panic(runtime.NewTypeError(fmt.Sprintf(
				"The \"size\" argument must be of type number. Received type %s (%v)",
				getTypeString(exportedVal), exportedVal)))
		}

		// 检查 NaN
		if floatVal, ok := exportedVal.(float64); ok {
			if floatVal != floatVal { // NaN check (NaN != NaN)
				panic(runtime.NewTypeError(fmt.Sprintf(
					"The value of \"size\" is out of range. It must be >= 0 && <= %d. Received NaN",
					MaxRandomBytesSize)))
			}
		}

		size = int(sizeArg.ToInteger())
		if size < 0 {
			panic(runtime.NewTypeError(fmt.Sprintf(
				"The value of \"size\" is out of range. It must be >= 0 && <= %d. Received %d",
				MaxRandomBytesSize, size)))
		}
		if offset+size > byteLength {
			panic(runtime.NewTypeError(fmt.Sprintf(
				"The value of \"size\" is out of range. It must be >= 0 && <= %d. Received %d",
				byteLength-offset, size)))
		}
	} else {
		size = byteLength - offset
	}

	if size == 0 {
		return arg
	}

	// 生成随机字节并填充
	randomBytes := make([]byte, size)
	_, err := rand.Read(randomBytes)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成随机数失败: %w", err)))
	}

	// 填充到 buffer
	fillBuffer(runtime, obj, randomBytes, offset)

	return arg
}

// RandomFill 异步填充 Buffer/TypedArray (Node.js v7.10.0+)
func RandomFill(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("randomFill 需要 buffer 和 callback 参数"))
	}

	// 解析参数
	var buffer goja.Value
	var offsetArg, sizeArg goja.Value
	var callback goja.Callable
	var hasOffset, hasSize bool

	buffer = call.Arguments[0]

	// 参数可能是：
	// randomFill(buffer, callback)
	// randomFill(buffer, offset, callback)
	// randomFill(buffer, offset, size, callback)

	lastArg := call.Arguments[len(call.Arguments)-1]
	if cbObj, ok := lastArg.(*goja.Object); ok {
		if cbFunc, ok := goja.AssertFunction(cbObj); ok {
			callback = cbFunc
		}
	}

	if callback == nil {
		panic(runtime.NewTypeError("最后一个参数必须是回调函数"))
	}

	// 保存原始参数（不进行类型转换，让 RandomFillSync 来验证）
	if len(call.Arguments) == 3 {
		// randomFill(buffer, offset, callback)
		offsetArg = call.Arguments[1]
		hasOffset = true
	} else if len(call.Arguments) == 4 {
		// randomFill(buffer, offset, size, callback)
		offsetArg = call.Arguments[1]
		sizeArg = call.Arguments[2]
		hasOffset = true
		hasSize = true
	}

	// 使用 setImmediate 异步执行（EventLoop 安全）
	setImmediate := runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		// 创建异步回调
		asyncCallback := func(call goja.FunctionCall) goja.Value {
			// 在 EventLoop 线程中执行
			defer func() {
				if r := recover(); r != nil {
					// 如果出错，调用回调并传递错误
					errMsg := fmt.Sprintf("%v", r)
					errObj := runtime.NewGoError(fmt.Errorf("%s", errMsg))
					_, _ = callback(goja.Undefined(), errObj, goja.Null())
				}
			}()

			// 构建参数数组（传递原始参数，不转换类型）
			args := []goja.Value{buffer}
			if hasOffset {
				args = append(args, offsetArg)
			}
			if hasSize {
				args = append(args, sizeArg)
			}

			// 调用 randomFillSync
			result := RandomFillSync(goja.FunctionCall{
				This:      runtime.GlobalObject(),
				Arguments: args,
			}, runtime)

			// 调用回调（第一个参数是 null 表示无错误）
			_, _ = callback(goja.Undefined(), goja.Null(), result)
			return goja.Undefined()
		}

		// 使用 setImmediate 调度异步执行
		_, _ = setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
	} else {
		// 降级：如果没有 setImmediate，同步执行
		defer func() {
			if r := recover(); r != nil {
				errMsg := fmt.Sprintf("%v", r)
				errObj := runtime.NewGoError(fmt.Errorf("%s", errMsg))
				_, _ = callback(goja.Undefined(), errObj, goja.Null())
			}
		}()

		args := []goja.Value{buffer}
		if hasOffset {
			args = append(args, offsetArg)
		}
		if hasSize {
			args = append(args, sizeArg)
		}

		result := RandomFillSync(goja.FunctionCall{
			This:      runtime.GlobalObject(),
			Arguments: args,
		}, runtime)

		_, _ = callback(goja.Undefined(), goja.Null(), result)
	}

	return goja.Undefined()
}

// RandomInt 生成安全的随机整数
//
// Node.js API:
// - randomInt(max[, callback])
// - randomInt(min, max[, callback])
//
// 约束:
// - min 和 max 必须是安全整数
// - max - min 必须小于 2^48 (281474976710656)
// - min < max
func RandomInt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("The \"max\" argument must be of type number"))
	}

	var min, max int64
	var callback goja.Callable
	var minArg, maxArg goja.Value

	// 解析参数
	if len(call.Arguments) == 1 {
		// randomInt(max)
		maxArg = call.Arguments[0]
		min = 0
	} else if len(call.Arguments) == 2 {
		// 可能是 randomInt(max, callback) 或 randomInt(min, max)
		lastArg := call.Arguments[1]
		if cbObj, ok := lastArg.(*goja.Object); ok {
			if cbFunc, ok := goja.AssertFunction(cbObj); ok {
				// randomInt(max, callback)
				callback = cbFunc
				maxArg = call.Arguments[0]
				min = 0
			} else {
				// randomInt(min, max)
				minArg = call.Arguments[0]
				maxArg = call.Arguments[1]
			}
		} else {
			// randomInt(min, max)
			minArg = call.Arguments[0]
			maxArg = call.Arguments[1]
		}
	} else if len(call.Arguments) >= 3 {
		// randomInt(min, max, callback)
		minArg = call.Arguments[0]
		maxArg = call.Arguments[1]
		lastArg := call.Arguments[2]

		// 验证回调参数类型
		if !goja.IsUndefined(lastArg) && !goja.IsNull(lastArg) {
			if cbObj, ok := lastArg.(*goja.Object); ok {
				if cbFunc, ok := goja.AssertFunction(cbObj); ok {
					callback = cbFunc
				} else {
					panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
				}
			} else {
				panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
			}
		}
	}

	// 验证参数类型 - 必须是数字
	if minArg != nil {
		exported := minArg.Export()
		switch exported.(type) {
		case int64, int, int32, float64, float32:
			// 检查是否为安全整数
			floatVal := minArg.ToFloat()
			if floatVal != floatVal { // NaN
				panic(runtime.NewTypeError("The \"min\" argument must be a safe integer"))
			}
			if floatVal == floatVal+1 || floatVal == floatVal-1 { // Infinity
				panic(runtime.NewTypeError(fmt.Sprintf("The \"min\" argument must be a safe integer. Received type number (%v)", exported)))
			}
			// 检查是否超出安全整数范围
			if floatVal > 9007199254740991 || floatVal < -9007199254740991 {
				panic(runtime.NewTypeError(fmt.Sprintf("The \"min\" argument must be a safe integer. Received type number (%v)", exported)))
			}
			// 检查是否为整数（不是小数）
			if floatVal != float64(int64(floatVal)) {
				panic(runtime.NewTypeError(fmt.Sprintf("The \"min\" argument must be a safe integer. Received type number (%v)", exported)))
			}
			min = int64(floatVal)
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"min\" argument must be of type number. Received %s", getTypeString(exported))))
		}
	}

	if maxArg != nil {
		exported := maxArg.Export()
		switch exported.(type) {
		case int64, int, int32, float64, float32:
			// 检查是否为安全整数
			floatVal := maxArg.ToFloat()
			if floatVal != floatVal { // NaN
				panic(runtime.NewTypeError("The \"max\" argument must be a safe integer"))
			}
			if floatVal == floatVal+1 || floatVal == floatVal-1 { // Infinity
				panic(runtime.NewTypeError(fmt.Sprintf("The \"max\" argument must be a safe integer. Received type number (%v)", exported)))
			}
			// 检查是否超出安全整数范围
			if floatVal > 9007199254740991 || floatVal < -9007199254740991 {
				panic(runtime.NewTypeError(fmt.Sprintf("The \"max\" argument must be a safe integer. Received type number (%v)", exported)))
			}
			// 检查是否为整数（不是小数）
			if floatVal != float64(int64(floatVal)) {
				panic(runtime.NewTypeError(fmt.Sprintf("The \"max\" argument must be a safe integer. Received type number (%v)", exported)))
			}
			max = int64(floatVal)
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("The \"max\" argument must be of type number. Received %s", getTypeString(exported))))
		}
	} else {
		panic(runtime.NewTypeError("The \"max\" argument must be of type number"))
	}

	// 验证 min < max
	if min >= max {
		code := "ERR_OUT_OF_RANGE"
		msg := fmt.Sprintf("The value of \"max\" is out of range. It must be greater than the value of \"min\" (%d). Received %d", min, max)
		errObj := runtime.NewGoError(fmt.Errorf(msg))
		errObj.Set("code", runtime.ToValue(code))
		errObj.Set("name", runtime.ToValue("RangeError"))
		panic(errObj)
	}

	// 验证 max - min < 2^48
	rangeSize := uint64(max - min)
	maxRange := uint64(1 << 48) // 281474976710656
	if rangeSize >= maxRange {
		code := "ERR_OUT_OF_RANGE"
		msg := fmt.Sprintf("The value of \"max - min\" is out of range. It must be <= %d. Received %d", maxRange-1, rangeSize)
		errObj := runtime.NewGoError(fmt.Errorf(msg))
		errObj.Set("code", runtime.ToValue(code))
		errObj.Set("name", runtime.ToValue("RangeError"))
		panic(errObj)
	}

	// 生成随机数的函数
	generateRandom := func() int64 {
		rangeSize := uint64(max - min)

		// 计算需要的字节数
		var bytesNeeded int
		if rangeSize <= 0xFF {
			bytesNeeded = 1
		} else if rangeSize <= 0xFFFF {
			bytesNeeded = 2
		} else if rangeSize <= 0xFFFFFF {
			bytesNeeded = 3
		} else if rangeSize <= 0xFFFFFFFF {
			bytesNeeded = 4
		} else if rangeSize <= 0xFFFFFFFFFF {
			bytesNeeded = 5
		} else if rangeSize <= 0xFFFFFFFFFFFF {
			bytesNeeded = 6
		} else {
			bytesNeeded = 8
		}

		// 计算该字节数能表示的最大值
		var maxPossible uint64
		if bytesNeeded >= 8 {
			maxPossible = ^uint64(0) // 2^64 - 1
		} else {
			maxPossible = (uint64(1) << (bytesNeeded * 8)) - 1
		}

		// 避免取模偏差（rejection sampling）
		// maxValid 是最大的能被 rangeSize 整除的数
		maxValid := maxPossible - (maxPossible % rangeSize)

		for {
			randomBytes := make([]byte, bytesNeeded)
			_, err := rand.Read(randomBytes)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("生成随机数失败: %w", err)))
			}

			var randomValue uint64
			for i := 0; i < bytesNeeded; i++ {
				randomValue |= uint64(randomBytes[i]) << (i * 8)
			}

			if randomValue < maxValid {
				return min + int64(randomValue%rangeSize)
			}
		}
	}

	// 如果有回调，异步执行（使用 setImmediate 确保 EventLoop 安全）
	if callback != nil {
		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			// 创建异步回调
			asyncCallback := func(call goja.FunctionCall) goja.Value {
				// 在 EventLoop 线程中执行
				defer func() {
					if r := recover(); r != nil {
						// 如果出错，调用回调并传递错误
						errMsg := fmt.Sprintf("%v", r)
						errObj := runtime.NewGoError(fmt.Errorf("%s", errMsg))
						_, _ = callback(goja.Undefined(), errObj)
					}
				}()

				// 生成随机数
				result := generateRandom()

				// 调用回调（第一个参数是 null 表示无错误，第二个参数是结果）
				_, _ = callback(goja.Undefined(), goja.Null(), runtime.ToValue(result))
				return goja.Undefined()
			}

			// 使用 setImmediate 调度异步执行
			_, _ = setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
		} else {
			// 降级：如果没有 setImmediate，同步执行
			defer func() {
				if r := recover(); r != nil {
					errMsg := fmt.Sprintf("%v", r)
					errObj := runtime.NewGoError(fmt.Errorf("%s", errMsg))
					_, _ = callback(goja.Undefined(), errObj)
				}
			}()

			result := generateRandom()
			_, _ = callback(goja.Undefined(), goja.Null(), runtime.ToValue(result))
		}

		return goja.Undefined()
	}

	// 同步执行
	return runtime.ToValue(generateRandom())
}

// ============================================================================
// 🔥 辅助函数
// ============================================================================

// getByteLength 获取对象的字节长度
func getByteLength(runtime *goja.Runtime, obj *goja.Object) int {
	if byteLengthVal := obj.Get("byteLength"); byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
		return int(byteLengthVal.ToInteger())
	}
	if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
		return int(lengthVal.ToInteger())
	}
	panic(runtime.NewTypeError("无法确定 buffer 大小"))
}

// fillTypedArray 填充 TypedArray
func fillTypedArray(runtime *goja.Runtime, obj *goja.Object, randomBytes []byte, typeName string, bytesPerElement int) {
	// 尝试通过底层 ArrayBuffer 填充
	if buffer := obj.Get("buffer"); buffer != nil && !goja.IsUndefined(buffer) && !goja.IsNull(buffer) {
		if bufferObj, ok := buffer.(*goja.Object); ok {
			byteOffset := 0
			if byteOffsetVal := obj.Get("byteOffset"); byteOffsetVal != nil && !goja.IsUndefined(byteOffsetVal) {
				byteOffset = int(byteOffsetVal.ToInteger())
			}

			if fillViaUint8Array(runtime, bufferObj, randomBytes, byteOffset) {
				return
			}
		}
	}

	// 回退方案：直接设置元素值
	length := len(randomBytes) / bytesPerElement
	for i := 0; i < length; i++ {
		offset := i * bytesPerElement
		var value int64

		switch bytesPerElement {
		case 1:
			if typeName == "Int8Array" {
				value = int64(int8(randomBytes[offset]))
			} else {
				value = int64(randomBytes[offset])
			}
		case 2:
			if offset+1 < len(randomBytes) {
				val := uint16(randomBytes[offset]) | (uint16(randomBytes[offset+1]) << 8)
				if typeName == "Int16Array" {
					value = int64(int16(val))
				} else {
					value = int64(val)
				}
			}
		case 4:
			if offset+3 < len(randomBytes) {
				val := uint32(randomBytes[offset]) |
					(uint32(randomBytes[offset+1]) << 8) |
					(uint32(randomBytes[offset+2]) << 16) |
					(uint32(randomBytes[offset+3]) << 24)
				if typeName == "Int32Array" {
					value = int64(int32(val))
				} else {
					value = int64(val)
				}
			}
		case 8:
			if offset+7 < len(randomBytes) {
				val := uint64(randomBytes[offset]) |
					(uint64(randomBytes[offset+1]) << 8) |
					(uint64(randomBytes[offset+2]) << 16) |
					(uint64(randomBytes[offset+3]) << 24) |
					(uint64(randomBytes[offset+4]) << 32) |
					(uint64(randomBytes[offset+5]) << 40) |
					(uint64(randomBytes[offset+6]) << 48) |
					(uint64(randomBytes[offset+7]) << 56)
				value = int64(val)
			}
		}

		obj.Set(strconv.Itoa(i), runtime.ToValue(value))
	}
}

// fillBuffer 填充 Buffer
func fillBuffer(runtime *goja.Runtime, obj *goja.Object, randomBytes []byte, offset int) {
	// 尝试通过底层 ArrayBuffer 填充
	if buffer := obj.Get("buffer"); buffer != nil && !goja.IsUndefined(buffer) && !goja.IsNull(buffer) {
		if bufferObj, ok := buffer.(*goja.Object); ok {
			byteOffset := 0
			if byteOffsetVal := obj.Get("byteOffset"); byteOffsetVal != nil && !goja.IsUndefined(byteOffsetVal) {
				byteOffset = int(byteOffsetVal.ToInteger())
			}

			if fillViaUint8Array(runtime, bufferObj, randomBytes, byteOffset+offset) {
				return
			}
		}
	}

	// 回退方案：直接设置元素
	for i := 0; i < len(randomBytes); i++ {
		obj.Set(strconv.Itoa(offset+i), runtime.ToValue(randomBytes[i]))
	}
}

// fillViaUint8Array 通过 Uint8Array 视图填充数据
func fillViaUint8Array(runtime *goja.Runtime, buffer *goja.Object, data []byte, byteOffset int) bool {
	uint8ArrayCtor := runtime.Get("Uint8Array")
	if uint8ArrayCtor == nil || goja.IsUndefined(uint8ArrayCtor) {
		return false
	}

	ctorObj, ok := uint8ArrayCtor.(*goja.Object)
	if !ok {
		return false
	}

	view, err := runtime.New(ctorObj, buffer, runtime.ToValue(byteOffset), runtime.ToValue(len(data)))
	if err != nil {
		return false
	}

	viewObj := view.ToObject(runtime)
	if viewObj == nil {
		return false
	}

	for i := 0; i < len(data); i++ {
		viewObj.Set(strconv.Itoa(i), runtime.ToValue(data[i]))
	}

	return true
}

// getTypeString 获取 JavaScript 值的类型字符串
func getTypeString(val interface{}) string {
	if val == nil {
		return "undefined"
	}

	switch v := val.(type) {
	case string:
		return fmt.Sprintf("type string ('%s')", v)
	case int64, int, int32, float64, float32:
		return "type number"
	case bool:
		return "type boolean"
	default:
		return fmt.Sprintf("type %T", v)
	}
}
