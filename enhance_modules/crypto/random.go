package crypto

import (
	"crypto/rand"
	"fmt"
	"math"
	"math/big"
	"strconv"
	"sync"

	"github.com/dop251/goja"
)

// maxPrimeSize 复用通用 int32 上限，保持与 Node.js 行为一致
const maxPrimeSize = CryptoMaxInt32

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
			msg := fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= %d. Received NaN", MaxRandomBytesSize)
			errObj := runtime.NewGoError(fmt.Errorf("%s", msg))
			errObj.Set("name", runtime.ToValue("RangeError"))
			panic(errObj)
		}
		if math.IsInf(floatVal, 0) {
			received := "Infinity"
			if math.IsInf(floatVal, -1) {
				received = "-Infinity"
			}
			msg := fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= %d. Received %s", MaxRandomBytesSize, received)
			errObj := runtime.NewGoError(fmt.Errorf("%s", msg))
			errObj.Set("name", runtime.ToValue("RangeError"))
			panic(errObj)
		}
	}

	size := int(sizeArg.ToInteger())

	// Node.js 行为：接受 0（返回空 Buffer），拒绝负数和超出最大值
	if size < 0 || size > MaxRandomBytesSize {
		msg := fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= %d. Received %d", MaxRandomBytesSize, size)
		errObj := runtime.NewGoError(fmt.Errorf("%s", msg))
		errObj.Set("name", runtime.ToValue("RangeError"))
		panic(errObj)
	}

	// 检查是否提供了回调函数（异步模式）
	var callback goja.Callable
	if len(call.Arguments) >= 2 {
		callbackArg := call.Arguments[1]
		// Node.js 行为：如果提供了第二个参数且不是 undefined，必须是函数
		if !goja.IsUndefined(callbackArg) {
			// 尝试将参数转为函数
			if callbackObj, ok := callbackArg.(*goja.Object); ok {
				if cbFunc, ok := goja.AssertFunction(callbackObj); ok {
					callback = cbFunc
				} else {
					// 是对象但不是函数，抛出 TypeError
					panic(runtime.NewTypeError("The \"callback\" argument must be of type function. Received " + getTypeString(callbackArg.Export())))
				}
			} else {
				// 不是对象（比如是字符串、数字、null 等），抛出 TypeError
				panic(runtime.NewTypeError("The \"callback\" argument must be of type function. Received " + getTypeString(callbackArg.Export())))
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

const uuidEntropyBatchSize = 128

type uuidEntropyCache struct {
	mu     sync.Mutex
	buf    []byte
	offset int
}

var globalUUIDEntropyCache uuidEntropyCache

func getRandomUUIDBytes(disableEntropyCache bool) ([]byte, error) {
	if disableEntropyCache {
		uuid := make([]byte, 16)
		_, err := rand.Read(uuid)
		if err != nil {
			return nil, err
		}
		return uuid, nil
	}

	globalUUIDEntropyCache.mu.Lock()
	defer globalUUIDEntropyCache.mu.Unlock()

	if globalUUIDEntropyCache.buf == nil || globalUUIDEntropyCache.offset+16 > len(globalUUIDEntropyCache.buf) {
		if globalUUIDEntropyCache.buf == nil || len(globalUUIDEntropyCache.buf) != 16*uuidEntropyBatchSize {
			globalUUIDEntropyCache.buf = make([]byte, 16*uuidEntropyBatchSize)
		}
		globalUUIDEntropyCache.offset = 0
		if _, err := rand.Read(globalUUIDEntropyCache.buf); err != nil {
			globalUUIDEntropyCache.buf = nil
			globalUUIDEntropyCache.offset = 0
			return nil, err
		}
	}

	start := globalUUIDEntropyCache.offset
	end := start + 16
	uuid := make([]byte, 16)
	copy(uuid, globalUUIDEntropyCache.buf[start:end])
	globalUUIDEntropyCache.offset = end
	return uuid, nil
}

// RandomUUID 生成随机 UUID
func RandomUUID(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	disableEntropyCache := false
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

			if b, ok := exportedVal.(bool); ok {
				disableEntropyCache = b
			} else {
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

				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf(
					"The \"options.disableEntropyCache\" property must be of type boolean. Received type %s (%v)",
					actualType, actualValue,
				)))
			}
		}
	}

	// 生成 UUID v4
	uuid, err := getRandomUUIDBytes(disableEntropyCache)
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

	// 检查是否是普通数组（应该报错）
	// 普通数组没有 buffer 属性且没有 byteLength 属性
	bufferVal := obj.Get("buffer")
	byteLengthVal := obj.Get("byteLength")
	if (bufferVal == nil || goja.IsUndefined(bufferVal) || goja.IsNull(bufferVal)) &&
		(byteLengthVal == nil || goja.IsUndefined(byteLengthVal) || goja.IsNull(byteLengthVal)) {
		// 检查是否有 length 属性但不是 Buffer/TypedArray
		lengthVal := obj.Get("length")
		if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			panic(runtime.NewTypeError("The \"buf\" argument must be an instance of ArrayBuffer or ArrayBufferView. Received an instance of Array"))
		}
	}

	// 获取 buffer 的字节长度
	byteLength := getByteLength(runtime, obj)

	// 检测是否是 TypedArray（有 BYTES_PER_ELEMENT 属性）
	bytesPerElementVal := obj.Get("BYTES_PER_ELEMENT")
	var bytesPerElement int
	isTypedArray := false
	if bytesPerElementVal != nil && !goja.IsUndefined(bytesPerElementVal) && !goja.IsNull(bytesPerElementVal) {
		bytesPerElement = int(bytesPerElementVal.ToInteger())
		isTypedArray = bytesPerElement > 0
	}

	// 对于 TypedArray，还需要获取元素数量（用于错误信息）
	var elementLength int
	if isTypedArray {
		lengthVal := obj.Get("length")
		if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			elementLength = int(lengthVal.ToInteger())
		} else {
			elementLength = byteLength / bytesPerElement
		}
	}

	// 解析 offset 和 size 参数
	// 对于 TypedArray，offset 和 size 是元素索引
	// 对于 Buffer/DataView，offset 和 size 是字节索引
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
				maxOffset := byteLength
				if isTypedArray {
					maxOffset = elementLength
				}
				panic(runtime.NewTypeError(fmt.Sprintf(
					"The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received NaN",
					maxOffset)))
			}
		}

		offsetValue := int(offsetArg.ToInteger())

		// 对于 TypedArray，offset 是元素索引，需要转换为字节索引
		if isTypedArray {
			// 检查元素索引范围
			if offsetValue < 0 || offsetValue > elementLength {
				panic(runtime.NewTypeError(fmt.Sprintf(
					"The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d",
					elementLength, offsetValue)))
			}
			// 转换为字节索引
			offset = offsetValue * bytesPerElement
		} else {
			// Buffer/DataView 直接使用字节索引
			if offsetValue < 0 || offsetValue > byteLength {
				panic(runtime.NewTypeError(fmt.Sprintf(
					"The value of \"offset\" is out of range. It must be >= 0 && <= %d. Received %d",
					byteLength, offsetValue)))
			}
			offset = offsetValue
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

		sizeValue := int(sizeArg.ToInteger())

		// 对于 TypedArray，size 是元素数量，需要转换为字节数
		if isTypedArray {
			if sizeValue < 0 {
				panic(runtime.NewTypeError(fmt.Sprintf(
					"The value of \"size\" is out of range. It must be >= 0 && <= %d. Received %d",
					MaxRandomBytesSize, sizeValue)))
			}
			// 检查元素索引范围
			// offset 已经转换为字节，需要先转回元素索引进行检查
			offsetInElements := offset / bytesPerElement
			if offsetInElements+sizeValue > elementLength {
				panic(runtime.NewTypeError(fmt.Sprintf(
					"The value of \"size\" is out of range. It must be >= 0 && <= %d. Received %d",
					elementLength-offsetInElements, sizeValue)))
			}
			// 转换为字节数
			size = sizeValue * bytesPerElement
		} else {
			// Buffer/DataView 直接使用字节数
			if sizeValue < 0 {
				panic(runtime.NewTypeError(fmt.Sprintf(
					"The value of \"size\" is out of range. It must be >= 0 && <= %d. Received %d",
					MaxRandomBytesSize, sizeValue)))
			}
			if offset+sizeValue > byteLength {
				panic(runtime.NewTypeError(fmt.Sprintf(
					"The value of \"size\" is out of range. It must be >= 0 && <= %d. Received %d",
					byteLength-offset, sizeValue)))
			}
			size = sizeValue
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
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"max\" argument must be of type number. Received undefined"))
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

		// undefined 被当作未提供，等价于 randomInt(max)
		if goja.IsUndefined(lastArg) {
			maxArg = call.Arguments[0]
			min = 0
		} else {
			// 先检查第二个参数是否是数字类型
			isNumber := false
			if !goja.IsNull(lastArg) {
				exported := lastArg.Export()
				switch exported.(type) {
				case int64, int, int32, float64, float32:
					isNumber = true
				}
			}

			if isNumber {
				// randomInt(min, max)
				minArg = call.Arguments[0]
				maxArg = call.Arguments[1]
			} else if goja.IsNull(lastArg) {
				// null 作为 callback 应该抛出错误
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"callback\" argument must be of type function. Received null"))
			} else if cbObj, ok := lastArg.(*goja.Object); ok {
				if cbFunc, ok := goja.AssertFunction(cbObj); ok {
					// randomInt(max, callback)
					callback = cbFunc
					maxArg = call.Arguments[0]
					min = 0
				} else {
					// 对象但不是函数
					panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"callback\" argument must be of type function. Received object"))
				}
			} else {
				// 其他类型作为 callback
				exported := lastArg.Export()
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"callback\" argument must be of type function. Received %s", getTypeString(exported))))
			}
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
					panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"callback\" argument must be of type function. Received object"))
				}
			} else {
				exported := lastArg.Export()
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"callback\" argument must be of type function. Received %s", getTypeString(exported))))
			}
		}
	}

	// 验证参数类型 - 必须是数字
	if minArg != nil {
		// 首先检查是否是对象（拒绝 Number/Boolean/String 等包装对象）
		if obj, ok := minArg.(*goja.Object); ok {
			// 获取对象的类名
			className := obj.ClassName()
			if className == "Number" || className == "Boolean" || className == "String" {
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"min\" argument must be a safe integer. Received an instance of %s", className)))
			}
			// 其他对象类型（Date、RegExp等）
			panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"min\" argument must be of type number. Received an instance of %s", className)))
		}

		exported := minArg.Export()
		switch exported.(type) {
		case int64, int, int32, float64, float32:
			// 检查是否为安全整数
			floatVal := minArg.ToFloat()
			if floatVal != floatVal { // NaN
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"min\" argument must be a safe integer. Received type number (NaN)"))
			}
			if floatVal == floatVal+1 || floatVal == floatVal-1 { // Infinity
				infinityStr := "Infinity"
				if floatVal < 0 {
					infinityStr = "-Infinity"
				}
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"min\" argument must be a safe integer. Received type number (%s)", infinityStr)))
			}
			// 检查是否超出安全整数范围
			if floatVal > 9007199254740991 || floatVal < -9007199254740991 {
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"min\" argument must be a safe integer. Received type number (%v)", int64(floatVal))))
			}
			// 检查是否为整数（不是小数）
			if floatVal != float64(int64(floatVal)) {
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"min\" argument must be a safe integer. Received type number (%v)", floatVal)))
			}
			min = int64(floatVal)
		default:
			panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"min\" argument must be of type number. Received %s", getTypeString(exported))))
		}
	}

	if maxArg != nil {
		// 首先检查是否是对象（拒绝 Number/Boolean/String 等包装对象）
		if obj, ok := maxArg.(*goja.Object); ok {
			// 获取对象的类名
			className := obj.ClassName()
			if className == "Number" || className == "Boolean" || className == "String" {
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"max\" argument must be a safe integer. Received an instance of %s", className)))
			}
			// 其他对象类型（Date、RegExp等）
			panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"max\" argument must be of type number. Received an instance of %s", className)))
		}

		exported := maxArg.Export()
		switch exported.(type) {
		case int64, int, int32, float64, float32:
			// 检查是否为安全整数
			floatVal := maxArg.ToFloat()
			if floatVal != floatVal { // NaN
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"max\" argument must be a safe integer. Received type number (NaN)"))
			}
			if floatVal == floatVal+1 || floatVal == floatVal-1 { // Infinity
				infinityStr := "Infinity"
				if floatVal < 0 {
					infinityStr = "-Infinity"
				}
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"max\" argument must be a safe integer. Received type number (%s)", infinityStr)))
			}
			// 检查是否超出安全整数范围
			if floatVal > 9007199254740991 || floatVal < -9007199254740991 {
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"max\" argument must be a safe integer. Received type number (%v)", int64(floatVal))))
			}
			// 检查是否为整数（不是小数）
			if floatVal != float64(int64(floatVal)) {
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"max\" argument must be a safe integer. Received type number (%v)", floatVal)))
			}
			max = int64(floatVal)
		default:
			panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"max\" argument must be of type number. Received %s", getTypeString(exported))))
		}
	} else {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"max\" argument must be of type number. Received undefined"))
	}

	// 验证 min < max
	if min >= max {
		code := "ERR_OUT_OF_RANGE"
		msg := fmt.Sprintf("The value of \"max\" is out of range. It must be greater than the value of \"min\" (%d). Received %d", min, max)
		errObj := runtime.NewGoError(fmt.Errorf("%s", msg))
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
		errObj := runtime.NewGoError(fmt.Errorf("%s", msg))
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

// isPrimeConstraintFeasible 检查在给定位数范围内是否存在满足 p ≡ rem (mod add) 的整数
func isPrimeConstraintFeasible(size int, add, rem *big.Int) bool {
	if add == nil || rem == nil {
		return true
	}
	// 位范围 [2^(size-1), 2^size - 1]
	min := new(big.Int).Lsh(big.NewInt(1), uint(size-1))
	max := new(big.Int).Lsh(big.NewInt(1), uint(size))
	max.Sub(max, big.NewInt(1))

	// 寻找最小的 k 使得 p = rem + k*add >= min
	tmp := new(big.Int).Sub(min, rem)
	var k *big.Int
	if tmp.Sign() <= 0 {
		// rem 已经在范围内，下界对应 k=0
		k = big.NewInt(0)
	} else {
		k = new(big.Int).Div(tmp, add)
		if new(big.Int).Mod(tmp, add).Sign() != 0 {
			k.Add(k, big.NewInt(1))
		}
	}

	p := new(big.Int).Mul(k, add)
	p.Add(p, rem)

	// 如果第一个满足同余条件的 p 已经超出位范围，则没有解
	return p.Cmp(max) <= 0
}

func generateRandomPrime(size int, safe bool, add, rem *big.Int) (*big.Int, error) {
	if size <= 0 {
		return nil, fmt.Errorf("The \"size\" argument must be >= 1")
	}
	if add != nil && rem != nil {
		if !isPrimeConstraintFeasible(size, add, rem) {
			return nil, fmt.Errorf("invalid options.add")
		}
	}
	one := big.NewInt(1)
	two := big.NewInt(2)
	for {
		var p *big.Int
		if safe {
			q, err := rand.Prime(rand.Reader, size-1)
			if err != nil {
				return nil, err
			}
			p = new(big.Int).Mul(q, two)
			p.Add(p, one)
			if p.BitLen() != size || !p.ProbablyPrime(20) {
				continue
			}
		} else {
			q, err := rand.Prime(rand.Reader, size)
			if err != nil {
				return nil, err
			}
			p = q
		}
		// 只有当 add 和 rem 都提供时才应用约束
		if add != nil && rem != nil {
			m := new(big.Int).Mod(p, add)
			if m.Cmp(rem) != 0 {
				continue
			}
		}
		return p, nil
	}
}

func parseRandomPrimeOptions(runtime *goja.Runtime, val goja.Value) (bool, *big.Int, *big.Int, bool) {
	safe := false
	var add *big.Int
	var rem *big.Int
	bigint := false
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return safe, add, rem, bigint
	}
	obj, ok := val.(*goja.Object)
	if !ok || obj == nil {
		panic(runtime.NewTypeError("The \"options\" argument must be of type object"))
	}
	// 拒绝数组作为 options（与 Node 行为保持一致）
	if ctor := obj.Get("constructor"); ctor != nil && !goja.IsUndefined(ctor) && !goja.IsNull(ctor) {
		if ctorObj, ok := ctor.(*goja.Object); ok {
			if nameVal := ctorObj.Get("name"); !goja.IsUndefined(nameVal) && !goja.IsNull(nameVal) && nameVal.String() == "Array" {
				panic(runtime.NewTypeError("The \"options\" argument must be of type object. Received an instance of Array"))
			}
		}
	}
	// safe: boolean
	if v := obj.Get("safe"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
		if b, ok := v.Export().(bool); ok {
			safe = b
		} else {
			panic(runtime.NewTypeError("The \"options.safe\" property must be of type boolean"))
		}
	}
	// bigint: boolean
	if v := obj.Get("bigint"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
		if b, ok := v.Export().(bool); ok {
			bigint = b
		} else {
			panic(runtime.NewTypeError("The \"options.bigint\" property must be of type boolean"))
		}
	}
	if v := obj.Get("add"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
		// 支持 bigint 或 TypedArray/Buffer
		if bi, ok := v.Export().(*big.Int); ok && bi != nil {
			add = new(big.Int).Set(bi)
		} else {
			// 仅当为对象（Buffer/TypedArray/DataView 等）时尝试按字节视图解析
			if _, ok := v.(*goja.Object); ok {
				bytes, err := ConvertToBytes(runtime, v)
				if err == nil && len(bytes) > 0 {
					add = new(big.Int).SetBytes(bytes)
				} else {
					panic(runtime.NewTypeError("The \"options.add\" property must be of type bigint or TypedArray"))
				}
			} else {
				panic(runtime.NewTypeError("The \"options.add\" property must be of type bigint or TypedArray"))
			}
		}
	}
	if v := obj.Get("rem"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
		// 支持 bigint 或 TypedArray/Buffer
		if bi, ok := v.Export().(*big.Int); ok && bi != nil {
			rem = new(big.Int).Set(bi)
		} else {
			// 仅当为对象（Buffer/TypedArray/DataView 等）时尝试按字节视图解析
			if _, ok := v.(*goja.Object); ok {
				bytes, err := ConvertToBytes(runtime, v)
				if err == nil && len(bytes) > 0 {
					rem = new(big.Int).SetBytes(bytes)
				} else {
					panic(runtime.NewTypeError("The \"options.rem\" property must be of type bigint or TypedArray"))
				}
			} else {
				panic(runtime.NewTypeError("The \"options.rem\" property must be of type bigint or TypedArray"))
			}
		}
	}
	// add/rem 数值范围与关系校验
	if add != nil {
		if add.Sign() < 0 {
			panic(runtime.NewTypeError("The \"options.add\" property must be >= 0"))
		}
		if add.Sign() == 0 {
			panic(runtime.NewTypeError("The \"options.add\" property must be > 0"))
		}
	}
	if rem != nil && rem.Sign() < 0 {
		panic(runtime.NewTypeError("The \"options.rem\" property must be >= 0"))
	}
	if add != nil && rem != nil && rem.Cmp(add) >= 0 {
		panic(runtime.NewTypeError("The \"options.rem\" property must be < \"options.add\""))
	}
	// 仅提供 add 时，默认 rem=1，使 prime ≡ 1 (mod add)
	if add != nil && rem == nil {
		rem = big.NewInt(1)
	}
	// 仅提供 rem 时允许但忽略约束
	return safe, add, rem, bigint
}

func valueToBigInt(runtime *goja.Runtime, val goja.Value) (*big.Int, error) {
	if val == nil || goja.IsUndefined(val) {
		return nil, fmt.Errorf("candidate is undefined")
	}
	if goja.IsNull(val) {
		return nil, fmt.Errorf("candidate is null")
	}

	// 严格类型检查：只接受 BigInt、Buffer、TypedArray、ArrayBuffer、DataView
	exported := val.Export()

	// 检查是否为 BigInt
	if bi, ok := exported.(*big.Int); ok && bi != nil {
		return new(big.Int).Set(bi), nil
	}

	// 明确拒绝不支持的类型
	switch exported.(type) {
	case int, int32, int64, float32, float64:
		// 数字类型不被接受
		return nil, fmt.Errorf("The \"candidate\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView")
	case string:
		// 字符串不被接受
		return nil, fmt.Errorf("The \"candidate\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView")
	case bool:
		// 布尔不被接受
		return nil, fmt.Errorf("The \"candidate\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView")
	}

	// 检查是否为数组
	if obj, ok := val.(*goja.Object); ok {
		if obj.ClassName() == "Array" {
			return nil, fmt.Errorf("The \"candidate\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView")
		}
		// 检查是否为普通对象（非 Buffer/TypedArray/ArrayBuffer/DataView）
		className := obj.ClassName()
		if className != "ArrayBuffer" && className != "Uint8Array" && className != "Int8Array" &&
			className != "Uint16Array" && className != "Int16Array" &&
			className != "Uint32Array" && className != "Int32Array" &&
			className != "Float32Array" && className != "Float64Array" &&
			className != "DataView" && className != "Buffer" {
			// 检查是否有 buffer 属性（TypedArray 特征）
			bufferProp := obj.Get("buffer")
			byteLengthVal := obj.Get("byteLength")
			if bufferProp == nil || goja.IsUndefined(bufferProp) {
				// 不是 TypedArray，可能是普通对象
				if byteLengthVal == nil || goja.IsUndefined(byteLengthVal) {
					return nil, fmt.Errorf("The \"candidate\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView")
				}
			}
		}
	}

	// 尝试转换为字节数组
	bytes, err := ConvertToBytes(runtime, val)
	if err != nil {
		return nil, fmt.Errorf("The \"candidate\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, or DataView")
	}
	if len(bytes) == 0 {
		return big.NewInt(0), nil
	}
	n := new(big.Int).SetBytes(bytes)
	return n, nil
}

func parseCheckPrimeOptions(runtime *goja.Runtime, val goja.Value) int {
	if val == nil || goja.IsUndefined(val) {
		return 0
	}
	if goja.IsNull(val) {
		return 0
	}
	obj, ok := val.(*goja.Object)
	if !ok || obj == nil {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"options\" argument must be of type object"))
	}
	checksVal := obj.Get("checks")
	if checksVal == nil || goja.IsUndefined(checksVal) {
		return 0
	}

	// checks 不能为 null
	if goja.IsNull(checksVal) {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"options.checks\" property must be of type number. Received null"))
	}

	exported := checksVal.Export()
	switch exported.(type) {
	case int, int32, int64, float32, float64:
	default:
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"options.checks\" property must be of type number"))
	}

	// 检查 NaN 和 Infinity
	floatVal := checksVal.ToFloat()
	if math.IsNaN(floatVal) {
		panic(NewNodeError(runtime, "ERR_OUT_OF_RANGE", "The value of \"options.checks\" is out of range. It must be >= 0. Received NaN"))
	}
	if math.IsInf(floatVal, 0) {
		panic(NewNodeError(runtime, "ERR_OUT_OF_RANGE", "The value of \"options.checks\" is out of range. It must be >= 0. Received Infinity"))
	}

	checks := int(checksVal.ToInteger())
	if checks < 0 {
		panic(NewNodeError(runtime, "ERR_OUT_OF_RANGE", "The value of \"options.checks\" is out of range. It must be >= 0. Received "+fmt.Sprint(checks)))
	}
	return checks
}

func GeneratePrimeSync(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("generatePrimeSync 需要 size 参数"))
	}
	sizeVal := call.Arguments[0]
	exported := sizeVal.Export()
	switch exported.(type) {
	case int, int32, int64, float32, float64:
	default:
		panic(runtime.NewTypeError("The \"size\" argument must be of type number"))
	}
	floatSize := sizeVal.ToFloat()
	if floatSize != floatSize || floatSize < 1 || floatSize > float64(maxPrimeSize) {
		msg := fmt.Sprintf("The value of \"size\" is out of range. It must be >= 1 && <= %d. Received %v", maxPrimeSize, exported)
		panic(runtime.NewTypeError(msg))
	}
	size := int(sizeVal.ToInteger())
	var optsVal goja.Value
	if len(call.Arguments) > 1 {
		optsVal = call.Arguments[1]
	}
	safe, add, rem, bigint := parseRandomPrimeOptions(runtime, optsVal)
	p, err := generateRandomPrime(size, safe, add, rem)
	if err != nil {
		panic(runtime.NewGoError(err))
	}
	if bigint {
		return runtime.ToValue(p)
	}
	// Node.js v25.0.0 默认返回 ArrayBuffer
	return runtime.ToValue(runtime.NewArrayBuffer(p.Bytes()))
}

func GeneratePrime(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("generatePrime 需要 size 和 callback 参数"))
	}
	sizeVal := call.Arguments[0]
	exported := sizeVal.Export()
	switch exported.(type) {
	case int, int32, int64, float32, float64:
	default:
		panic(runtime.NewTypeError("The \"size\" argument must be of type number"))
	}
	floatSize := sizeVal.ToFloat()
	if floatSize != floatSize || floatSize < 1 || floatSize > float64(maxPrimeSize) {
		msg := fmt.Sprintf("The value of \"size\" is out of range. It must be >= 1 && <= %d. Received %v", maxPrimeSize, exported)
		panic(runtime.NewTypeError(msg))
	}
	size := int(sizeVal.ToInteger())
	var optsVal goja.Value
	var cbVal goja.Value
	if len(call.Arguments) == 2 {
		cbVal = call.Arguments[1]
	} else {
		optsVal = call.Arguments[1]
		cbVal = call.Arguments[2]
	}
	cbFunc, ok := goja.AssertFunction(cbVal)
	if !ok {
		panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
	}
	safe, add, rem, bigint := parseRandomPrimeOptions(runtime, optsVal)
	setImmediate := runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		asyncCallback := func(goja.FunctionCall) goja.Value {
			var errVal goja.Value = goja.Null()
			var resVal goja.Value = goja.Null()
			defer func() {
				_, _ = cbFunc(goja.Undefined(), errVal, resVal)
			}()
			p, err := generateRandomPrime(size, safe, add, rem)
			if err != nil {
				errVal = runtime.NewGoError(err)
				return goja.Undefined()
			}
			if bigint {
				resVal = runtime.ToValue(p)
			} else {
				// Node.js v25.0.0 默认返回 ArrayBuffer
				resVal = runtime.ToValue(runtime.NewArrayBuffer(p.Bytes()))
			}
			return goja.Undefined()
		}
		_, _ = setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
		return goja.Undefined()
	}
	// 无 setImmediate，降级同步执行
	p, err := generateRandomPrime(size, safe, add, rem)
	var errVal goja.Value = goja.Null()
	var resVal goja.Value = goja.Null()
	if err != nil {
		errVal = runtime.NewGoError(err)
	} else {
		if bigint {
			resVal = runtime.ToValue(p)
		} else {
			// Node.js v25.0.0 默认返回 ArrayBuffer
			resVal = runtime.ToValue(runtime.NewArrayBuffer(p.Bytes()))
		}
	}
	_, _ = cbFunc(goja.Undefined(), errVal, resVal)
	return goja.Undefined()
}

func CheckPrimeSync(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"candidate\" argument is required"))
	}
	candidateVal := call.Arguments[0]
	var optsVal goja.Value
	if len(call.Arguments) > 1 {
		optsVal = call.Arguments[1]
	}
	checks := parseCheckPrimeOptions(runtime, optsVal)
	if checks <= 0 {
		checks = 20
	}
	n, err := valueToBigInt(runtime, candidateVal)
	if err != nil {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"candidate\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, DataView, or bigint. %v", err)))
	}
	// 检查是否为负数（BigInt 负数应抛出错误）
	if n.Sign() < 0 {
		panic(NewNodeError(runtime, "ERR_OUT_OF_RANGE", "The value of \"candidate\" is out of range. It must be >= 0. Received a negative value"))
	}
	// 0 返回 false
	if n.Sign() == 0 {
		return runtime.ToValue(false)
	}
	return runtime.ToValue(n.ProbablyPrime(checks))
}

func CheckPrime(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"callback\" argument is required"))
	}
	candidateVal := call.Arguments[0]
	var optsVal goja.Value
	var cbVal goja.Value
	if len(call.Arguments) == 2 {
		cbVal = call.Arguments[1]
	} else {
		optsVal = call.Arguments[1]
		cbVal = call.Arguments[2]
	}
	cbFunc, ok := goja.AssertFunction(cbVal)
	if !ok {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"callback\" argument must be of type function"))
	}

	// 参数验证必须同步进行（如果参数类型错误应立即抛出）
	checks := parseCheckPrimeOptions(runtime, optsVal)
	if checks <= 0 {
		checks = 20
	}

	// 同步验证 candidate 参数类型（类型错误应同步抛出）
	n, err := valueToBigInt(runtime, candidateVal)
	if err != nil {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", fmt.Sprintf("The \"candidate\" argument must be an instance of ArrayBuffer, Buffer, TypedArray, DataView, or bigint. %v", err)))
	}
	// 检查负数（同步抛出）
	if n.Sign() < 0 {
		panic(NewNodeError(runtime, "ERR_OUT_OF_RANGE", "The value of \"candidate\" is out of range. It must be >= 0. Received a negative value"))
	}

	setImmediate := runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		asyncCallback := func(goja.FunctionCall) goja.Value {
			var errVal goja.Value = goja.Null()
			var resVal goja.Value
			// n 已经验证通过，直接使用
			if n.Sign() == 0 {
				resVal = runtime.ToValue(false)
			} else {
				resVal = runtime.ToValue(n.ProbablyPrime(checks))
			}
			_, _ = cbFunc(goja.Undefined(), errVal, resVal)
			return goja.Undefined()
		}
		_, _ = setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
		return goja.Undefined()
	}
	// 无 setImmediate，降级同步执行
	var errVal goja.Value = goja.Null()
	var resVal goja.Value
	if n.Sign() == 0 {
		resVal = runtime.ToValue(false)
	} else {
		resVal = runtime.ToValue(n.ProbablyPrime(checks))
	}
	_, _ = cbFunc(goja.Undefined(), errVal, resVal)
	return goja.Undefined()
}
