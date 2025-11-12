package buffer

import (
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"math"
	"strconv"
	"strings"
	"unicode/utf16"
	
	"github.com/dop251/goja"
)

// OptimizedBufferAlloc 优化的 Buffer.alloc 实现
// 使用 Buffer 池和 Go 的高效内存分配
func OptimizedBufferAlloc(runtime *goja.Runtime, pool *BufferPool, size int64, fill interface{}, encoding string) (goja.Value, error) {
	if size < 0 {
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
	}

	// Node.js 兼容的最大限制检查 
	const maxSafeInteger = 9007199254740991
	if size > maxSafeInteger {
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
	}
	
	// 实际内存分配限制（防止系统内存耗尽）
	const maxActualSize = 2 * 1024 * 1024 * 1024 // 2GB
	if size > maxActualSize {
		panic(newRangeError(runtime, "Array buffer allocation failed"))
	}

	// 🔥 性能优化：使用 Buffer 池分配内存
	// 小 Buffer (<4KB) 从池中分配，大 Buffer 直接分配
	var data []byte
	if pool != nil && fill == nil {
		// 使用池分配并零初始化
		data = pool.AllocZeroed(int(size))
	} else if pool != nil {
		// 需要填充，先从池分配
		data = pool.Alloc(int(size))
	} else {
		// 没有池，直接分配
		data = make([]byte, size)
	}

	// 创建 ArrayBuffer
	ab := runtime.NewArrayBuffer(data)

	// 如果需要填充（默认是 0，Go 的 make 已经零初始化了）
	if fill != nil {
		// 获取 ArrayBuffer 的底层字节数组
		data := ab.Bytes()
		
		// 处理填充值
		fillBuffer(data, fill, encoding, runtime)
	}

	// 调用原生 Buffer.from(arrayBuffer) 创建 Buffer
	bufferConstructor := runtime.Get("Buffer")
	if goja.IsUndefined(bufferConstructor) || goja.IsNull(bufferConstructor) {
		panic(runtime.NewTypeError("Buffer 构造函数不可用"))
	}

	bufferObj := bufferConstructor.ToObject(runtime)
	if bufferObj == nil {
		panic(runtime.NewTypeError("Buffer 不是一个对象"))
	}

	fromFunc, ok := goja.AssertFunction(bufferObj.Get("from"))
	if !ok {
		panic(runtime.NewTypeError("Buffer.from 不可用"))
	}

	result, err := fromFunc(bufferConstructor, runtime.ToValue(ab))
	if err != nil {
		return goja.Undefined(), err
	}

	return result, nil
}

// fillBuffer 处理 Buffer 填充逻辑
func fillBuffer(data []byte, fill interface{}, encoding string, runtime *goja.Runtime) {
	size := int64(len(data))
	
	switch v := fill.(type) {
	case int64:
		// 填充单个字节值
		fillByte := byte(v & 0xFF)
		if fillByte != 0 {
			// 🔥 使用 memset 式的快速填充
			if size > 0 {
				// 对于大 Buffer，使用倍增策略
				data[0] = fillByte
				for i := int64(1); i < size; i *= 2 {
					limit := i * 2
					if limit > size {
						limit = size
					}
					copy(data[i:limit], data[:i])
				}
			}
		}
	case string:
		// 字符串填充（按编码处理）
		fillBytes := encodeString(v, encoding, runtime)
		if len(fillBytes) > 0 {
			// 循环填充
			for i := int64(0); i < size; {
				n := copy(data[i:], fillBytes)
				i += int64(n)
			}
		}
	case []byte:
		// 字节数组填充
		if len(v) > 0 {
			for i := int64(0); i < size; {
				n := copy(data[i:], v)
				i += int64(n)
			}
		}
	default:
		// 默认填充 0 (已经通过 make() 初始化)
	}
}

// SetupOptimizedBufferAlloc 设置优化的 Buffer.alloc
func SetupOptimizedBufferAlloc(runtime *goja.Runtime, pool *BufferPool) {
	bufferObj := runtime.Get("Buffer")
	if bufferObj == nil || goja.IsUndefined(bufferObj) {
		return
	}

	buffer, ok := bufferObj.(*goja.Object)
	if !ok {
		return
	}

	// 🔥 覆盖 Buffer.alloc 方法（使用 Buffer 池优化）
	allocFunc := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received undefined"))
		}

		sizeArg := call.Arguments[0]
		
		// 严格的 Node.js 类型检查
		if goja.IsNull(sizeArg) {
			panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received null"))
		}
		if goja.IsUndefined(sizeArg) {
			panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received undefined"))
		}
		
		// 检查是否为数字类型
		if sizeArg.ExportType() != nil {
			switch sizeArg.ExportType().Kind().String() {
			case "string":
				str := sizeArg.String()
				panic(runtime.NewTypeError(fmt.Sprintf("The \"size\" argument must be of type number. Received type string ('%s')", str)))
			case "bool":
				panic(runtime.NewTypeError(fmt.Sprintf("The \"size\" argument must be of type number. Received type boolean (%t)", sizeArg.ToBoolean())))
			case "int", "int64", "float64":
				// 数字类型，继续处理
			default:
				// 对象等其他类型
				panic(runtime.NewTypeError(fmt.Sprintf("The \"size\" argument must be of type number. Received type object")))
			}
		}
		
		// 获取数字值并检查特殊值
		var size int64
		if sizeArg.ExportType() != nil && sizeArg.ExportType().Kind().String() == "float64" {
			f := sizeArg.ToFloat()
			if math.IsNaN(f) {
				panic(newRangeError(runtime, "The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received NaN"))
			}
			if math.IsInf(f, 1) {
				panic(newRangeError(runtime, "The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received Infinity"))
			}
			if math.IsInf(f, -1) {
				panic(newRangeError(runtime, "The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received -Infinity"))
			}
			// 检查负数（包括极小的负数如-Number.MIN_VALUE）
			if f < 0 {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %g", f)))
			}
			size = int64(f)
		} else {
			size = sizeArg.ToInteger()
		}
		
		// 范围检查 - 使用 RangeError
		if size < 0 {
			panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
		}
		
		const maxSafeInteger = 9007199254740991 // Number.MAX_SAFE_INTEGER  
		if size > maxSafeInteger {
			panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
		}

		// 检查是否有填充值
		var fill interface{} = nil
		encoding := "utf8"

		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			fillArg := call.Arguments[1]
			
			// 在调用String()之前检查是否是Symbol或BigInt类型（使用类型断言）
			// 这是唯一能在Go层面检测这些特殊类型的方法
			if _, isSymbol := fillArg.(*goja.Symbol); isSymbol {
				panic(runtime.NewTypeError("Cannot convert a Symbol value to a number"))
			}
			// 检查BigInt类型（通过ExportType）
			if fillArg.ExportType() != nil && fillArg.ExportType().String() == "*big.Int" {
				panic(runtime.NewTypeError("Cannot convert a BigInt value to a number"))
			}
			
			fill = parseFillValue(fillArg, runtime, size)
		}

		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			encodingArg := call.Arguments[2]
			// 验证encoding参数类型（必须是字符串或null）
			if !goja.IsNull(encodingArg) {
				if encodingArg.ExportType() != nil && encodingArg.ExportType().Kind().String() != "string" {
					panic(runtime.NewTypeError("The \"encoding\" argument must be of type string. Received " + encodingArg.ExportType().Kind().String()))
				}
				encoding = encodingArg.String()
				// 验证编码名称是否有效
				validEncodings := map[string]bool{
					"utf8": true, "utf-8": true, "utf16le": true, "ucs2": true, "ucs-2": true,
					"base64": true, "base64url": true, "latin1": true, "binary": true,
					"hex": true, "ascii": true,
				}
				if encoding != "" && !validEncodings[strings.ToLower(encoding)] {
					panic(runtime.NewTypeError("Unknown encoding: " + encoding))
				}
			}
		}

		result, err := OptimizedBufferAlloc(runtime, pool, size, fill, encoding)
		if err != nil {
			panic(err)
		}

		return result
	}
	
	// 设置 Buffer.alloc 函数并配置 length 属性
	buffer.Set("alloc", runtime.ToValue(allocFunc))
	allocFuncObj := buffer.Get("alloc").ToObject(runtime)
	if allocFuncObj != nil {
		allocFuncObj.DefineDataProperty("length", runtime.ToValue(3), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}

	// 🔥 优化 Buffer.allocUnsafe - 使用池但不零初始化
	buffer.Set("allocUnsafe", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received undefined"))
		}

		sizeArg := call.Arguments[0]
		
		// 严格的类型检查（与 Buffer.alloc 一致）
		if goja.IsNull(sizeArg) {
			panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received null"))
		}
		if goja.IsUndefined(sizeArg) {
			panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received undefined"))
		}
		
		// 检查是否为数字类型
		if sizeArg.ExportType() != nil {
			switch sizeArg.ExportType().Kind().String() {
			case "string":
				str := sizeArg.String()
				panic(runtime.NewTypeError(fmt.Sprintf("The \"size\" argument must be of type number. Received type string ('%s')", str)))
			case "bool":
				panic(runtime.NewTypeError(fmt.Sprintf("The \"size\" argument must be of type number. Received type boolean (%t)", sizeArg.ToBoolean())))
			case "int", "int64", "float64":
				// 数字类型，继续处理
			default:
				// 对象等其他类型
				panic(runtime.NewTypeError(fmt.Sprintf("The \"size\" argument must be of type number. Received type object")))
			}
		}
		
		// 获取数字值并检查特殊值
		var size int64
		if sizeArg.ExportType() != nil && sizeArg.ExportType().Kind().String() == "float64" {
			f := sizeArg.ToFloat()
			if math.IsNaN(f) {
				panic(newRangeError(runtime, "The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received NaN"))
			}
			if math.IsInf(f, 1) {
				panic(newRangeError(runtime, "The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received Infinity"))
			}
			if math.IsInf(f, -1) {
				panic(newRangeError(runtime, "The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received -Infinity"))
			}
			// 检查负数（包括极小的负数如-Number.MIN_VALUE）
			if f < 0 {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %g", f)))
			}
			size = int64(f)
		} else {
			size = sizeArg.ToInteger()
		}
		
		// 范围检查 - 使用 RangeError
		if size < 0 {
			panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
		}
		
		const maxSafeInteger = 9007199254740991 // Number.MAX_SAFE_INTEGER  
		if size > maxSafeInteger {
			panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
		}

		const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
		if size > maxSize {
			panic(newRangeError(runtime, "Array buffer allocation failed"))
		}

		// 🔥 性能优化：使用 Buffer 池分配（不零初始化）
		// allocUnsafe 的语义是不清零内存，从池中分配正好符合
		var data []byte
		if pool != nil {
			data = pool.Alloc(int(size))
		} else {
			data = make([]byte, size)
		}

		ab := runtime.NewArrayBuffer(data)

		bufferConstructor := runtime.Get("Buffer")
		if goja.IsUndefined(bufferConstructor) || goja.IsNull(bufferConstructor) {
			panic(runtime.NewTypeError("Buffer 构造函数不可用"))
		}

		bufferObj := bufferConstructor.ToObject(runtime)
		if bufferObj == nil {
			panic(runtime.NewTypeError("Buffer 不是一个对象"))
		}

		fromFunc, ok := goja.AssertFunction(bufferObj.Get("from"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.from 不可用"))
		}

		result, err := fromFunc(bufferConstructor, runtime.ToValue(ab))
		if err != nil {
			panic(err)
		}

		return result
	})
	
	// 设置 Buffer.allocUnsafe 函数属性
	allocUnsafeFuncObj := buffer.Get("allocUnsafe").ToObject(runtime)
	if allocUnsafeFuncObj != nil {
		allocUnsafeFuncObj.DefineDataProperty("name", runtime.ToValue("allocUnsafe"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		allocUnsafeFuncObj.DefineDataProperty("length", runtime.ToValue(1), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}

	// 🔥 优化 Buffer.allocUnsafeSlow
	buffer.Set("allocUnsafeSlow", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received undefined"))
		}

		sizeArg := call.Arguments[0]
		
		// 严格的类型检查（与 Buffer.alloc 一致）
		if goja.IsNull(sizeArg) {
			panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received null"))
		}
		if goja.IsUndefined(sizeArg) {
			panic(runtime.NewTypeError("The \"size\" argument must be of type number. Received undefined"))
		}
		
		// 检查是否为数字类型
		if sizeArg.ExportType() != nil {
			switch sizeArg.ExportType().Kind().String() {
			case "string":
				str := sizeArg.String()
				panic(runtime.NewTypeError(fmt.Sprintf("The \"size\" argument must be of type number. Received type string ('%s')", str)))
			case "bool":
				panic(runtime.NewTypeError(fmt.Sprintf("The \"size\" argument must be of type number. Received type boolean (%t)", sizeArg.ToBoolean())))
			case "int", "int64", "float64":
				// 数字类型，继续处理
			default:
				// 对象等其他类型
				panic(runtime.NewTypeError(fmt.Sprintf("The \"size\" argument must be of type number. Received type object")))
			}
		}
		
		// 获取数字值并检查特殊值
		var size int64
		if sizeArg.ExportType() != nil && sizeArg.ExportType().Kind().String() == "float64" {
			f := sizeArg.ToFloat()
			if math.IsNaN(f) {
				panic(newRangeError(runtime, "The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received NaN"))
			}
			if math.IsInf(f, 1) {
				panic(newRangeError(runtime, "The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received Infinity"))
			}
			if math.IsInf(f, -1) {
				panic(newRangeError(runtime, "The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received -Infinity"))
			}
			// 检查负数（包括极小的负数如-Number.MIN_VALUE）
			if f < 0 {
				panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %g", f)))
			}
			size = int64(f)
		} else {
			size = sizeArg.ToInteger()
		}
		
		// 范围检查 - 使用 RangeError
		if size < 0 {
			panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
		}
		
		const maxSafeInteger = 9007199254740991 // Number.MAX_SAFE_INTEGER  
		if size > maxSafeInteger {
			panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
		}

		const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
		if size > maxSize {
			panic(newRangeError(runtime, "Array buffer allocation failed"))
		}

		// allocUnsafeSlow 创建非池化的 Buffer（与 allocUnsafe 相同实现）
		ab := runtime.NewArrayBuffer(make([]byte, size))

		bufferConstructor := runtime.Get("Buffer")
		if goja.IsUndefined(bufferConstructor) || goja.IsNull(bufferConstructor) {
			panic(runtime.NewTypeError("Buffer 构造函数不可用"))
		}

		bufferObj := bufferConstructor.ToObject(runtime)
		if bufferObj == nil {
			panic(runtime.NewTypeError("Buffer 不是一个对象"))
		}

		fromFunc, ok := goja.AssertFunction(bufferObj.Get("from"))
		if !ok {
			panic(runtime.NewTypeError("Buffer.from 不可用"))
		}

		result, err := fromFunc(bufferConstructor, runtime.ToValue(ab))
		if err != nil {
			panic(err)
		}

		return result
	})
	
	// 设置 Buffer.allocUnsafeSlow 函数属性
	allocUnsafeSlowFuncObj := buffer.Get("allocUnsafeSlow").ToObject(runtime)
	if allocUnsafeSlowFuncObj != nil {
		allocUnsafeSlowFuncObj.DefineDataProperty("name", runtime.ToValue("allocUnsafeSlow"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		allocUnsafeSlowFuncObj.DefineDataProperty("length", runtime.ToValue(1), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
	
	// 🔥 添加 buffer.constants 对象（Node.js 兼容）
	// 参考：https://nodejs.org/api/buffer.html#bufferconstants
	constantsObj := runtime.NewObject()
	
	// MAX_LENGTH: 单个 Buffer 实例允许的最大大小
	// 在 32 位架构上约为 2^30 - 1 (~1GB)
	// 在 64 位架构上约为 2^31 - 1 (~2GB) 或 Number.MAX_SAFE_INTEGER
	const maxSafeInteger = 9007199254740991 // Number.MAX_SAFE_INTEGER
	constantsObj.Set("MAX_LENGTH", runtime.ToValue(maxSafeInteger))
	
	// MAX_STRING_LENGTH: 单个字符串实例允许的最大长度
	// 取决于 JS 引擎的实现，Node.js 中约为 2^29 - 24 (~536MB)
	const maxStringLength = 536870888 // Node.js v25 的值
	constantsObj.Set("MAX_STRING_LENGTH", runtime.ToValue(maxStringLength))
	
	buffer.Set("constants", constantsObj)
}

// parseFillValue 解析填充值参数
func parseFillValue(fillArg goja.Value, runtime *goja.Runtime, targetSize int64) interface{} {
	if goja.IsNull(fillArg) || goja.IsUndefined(fillArg) {
		return nil
	}
	
	// 检查特殊JavaScript类型（Symbol, BigInt）
	// 注意：goja会自动转换Symbol为字符串，所以这个检查实际上无效
	fillStr := fillArg.String()
	if strings.Contains(fillStr, "Symbol(") {
		panic(runtime.NewTypeError("Cannot convert a Symbol value to a number"))
	}
	
	// 检查BigInt格式（数字+n结尾）
	if len(fillStr) > 1 && fillStr[len(fillStr)-1] == 'n' {
		// 检查是否是纯数字+n的格式
		isNumericBigInt := true
		for _, r := range fillStr[:len(fillStr)-1] {
			if r < '0' || r > '9' {
				isNumericBigInt = false
				break
			}
		}
		if isNumericBigInt && len(fillStr) > 1 {
			panic(runtime.NewTypeError("Cannot convert a BigInt value to a number"))
		}
	}
	
	// 检查是否是数字
	if fillArg.ExportType() != nil {
		switch fillArg.ExportType().Kind().String() {
		case "string":
			return fillArg.String()
		case "int", "int64":
			return fillArg.ToInteger()
		case "float64":
			f := fillArg.ToFloat()
			// Number.MAX_VALUE等超大数值转换为整数时会溢出，需要特殊处理
			// Node.js行为：超出int64范围的数值会被截断为0
			if math.IsNaN(f) || math.IsInf(f, 0) || f > float64(math.MaxInt64) || f < float64(math.MinInt64) {
				return int64(0)
			}
			return int64(f)
		case "bool":
			if fillArg.ToBoolean() {
				return int64(1)
			}
			return int64(0)
		}
	}
	
	// 尝试作为对象 - 检查 valueOf() 方法（Node.js 兼容性）
	obj := fillArg.ToObject(runtime)
	if obj != nil {
		// 首先尝试调用 valueOf() 方法
		valueOfMethod := obj.Get("valueOf")
		if valueOfMethod != nil && !goja.IsUndefined(valueOfMethod) && !goja.IsNull(valueOfMethod) {
			if valueOfFunc, ok := goja.AssertFunction(valueOfMethod); ok {
				// 安全调用 valueOf，防止递归和崩溃
				valueOfResult, err := valueOfFunc(fillArg)
				if err != nil {
					// valueOf() 方法抛出异常，传播异常（Node.js 兼容）
					panic(err)
				}
				if valueOfResult != nil && !goja.IsUndefined(valueOfResult) {
					// 检查valueOf返回的特殊类型（使用类型断言）
					if _, isSymbol := valueOfResult.(*goja.Symbol); isSymbol {
						panic(runtime.NewTypeError("Cannot convert a Symbol value to a number"))
					}
					
					// 只有 valueOf() 返回有效数字类型时才处理（Node.js 兼容）
					if valueOfResult.ExportType() != nil {
						switch valueOfResult.ExportType().Kind().String() {
						case "int", "int64":
							return valueOfResult.ToInteger()
						case "float64":
							f := valueOfResult.ToFloat()
							// 排除 NaN 和 Infinity（Node.js 行为：这些视为无效数字）
							if !math.IsNaN(f) && !math.IsInf(f, 0) {
								return int64(f)
							}
							// NaN 和 Infinity 忽略 valueOf 结果，继续当作普通对象处理
						}
					}
					// 其他类型（字符串、对象等）忽略 valueOf 结果，继续当作普通对象处理
				}
			}
		}
		
		// 简化的Buffer/TypedArray检测逻辑
		lengthVal := obj.Get("length")
		if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			length := lengthVal.ToInteger()
			
			// 检查构造器名称来判断类型
			constructorVal := obj.Get("constructor")
			isArray := false
			isBufferLike := false
			constructorName := ""
			
			if constructorVal != nil && !goja.IsUndefined(constructorVal) {
				constructorObj := constructorVal.ToObject(runtime)
				if constructorObj != nil {
					nameVal := constructorObj.Get("name")
					if nameVal != nil && !goja.IsUndefined(nameVal) {
						constructorName = nameVal.String()
						if constructorName == "Array" {
							isArray = true
						} else if strings.Contains(constructorName, "Buffer") || strings.Contains(constructorName, "Array") {
							// Buffer和所有TypedArray（包括Uint8Array、Uint16Array等）
							// 修复：使用Contains而不是完全匹配，因为goja中Buffer的constructor名称很复杂
							isBufferLike = true
						}
					}
				}
			}
			
			// 数组当作普通对象处理
			if isArray {
				return int64(0)
			}
			
			// 空的Buffer/TypedArray填充非零长度buffer时抛出错误
			// 但填充长度为0的buffer是合法的（Node.js v25兼容）
			if length == 0 && isBufferLike && targetSize > 0 {
				panic(runtime.NewTypeError("The argument 'value' is invalid. Received " + fillArg.String()))
			}
			
			// 非Buffer/TypedArray的length为0对象返回0
			if length == 0 {
				return int64(0)
			}
			
			// 处理Buffer/TypedArray填充
			if isBufferLike && length > 0 && length <= 1024*1024 {
				// 使用runtime.ExportTo直接导出为[]byte（最可靠的方法）
				var bytes []byte
				err := runtime.ExportTo(fillArg, &bytes)
				if err == nil && len(bytes) > 0 {
					return bytes
				}
				
				// 回退方法：按元素索引读取
				bytes = make([]byte, length)
				for i := int64(0); i < length; i++ {
					indexVal := obj.Get(strconv.Itoa(int(i)))
					if indexVal != nil && !goja.IsUndefined(indexVal) && !goja.IsNull(indexVal) {
						bytes[i] = byte(indexVal.ToInteger() & 0xFF)
					}
				}
				return bytes
			}
		}
	}
	
	// 默认转换为 0（兼容 Node.js 行为：对象转换为 0）
	return int64(0)
}

// encodeString 根据编码转换字符串为字节
func encodeString(str, encoding string, runtime *goja.Runtime) []byte {
	encoding = strings.ToLower(encoding)
	
	switch encoding {
	case "hex":
		// 处理十六进制编码
		// Node.js 行为：奇数长度的hex字符串会截断最后一个字符
		if len(str)%2 != 0 {
			str = str[:len(str)-1]
		}
		decoded, err := hex.DecodeString(str)
		if err != nil {
			// 无效的 hex 字符，抛出 TypeError（Node.js v25.0.0 兼容）
			panic(runtime.NewTypeError("The argument 'value' is invalid. Received '" + str + "'"))
		}
		return decoded
	case "base64":
		// 处理 base64 编码，自动添加填充（Node.js 兼容）
		padded := str
		for len(padded)%4 != 0 {
			padded += "="
		}
		decoded, err := base64.StdEncoding.DecodeString(padded)
		if err != nil {
			// 无效的 base64，返回空
			return []byte{}
		}
		return decoded
	case "base64url":
		// 处理 base64url 编码，自动添加填充（Node.js 兼容）
		padded := str
		for len(padded)%4 != 0 {
			padded += "="
		}
		decoded, err := base64.URLEncoding.DecodeString(padded)
		if err != nil {
			// 无效的 base64url，返回空
			return []byte{}
		}
		return decoded
	case "ascii":
		// ASCII 编码，超过 127 的字符截断
		result := make([]byte, len(str))
		for i, r := range str {
			if r > 127 {
				result[i] = byte(r & 0x7F)
			} else {
				result[i] = byte(r)
			}
		}
		return result
	case "latin1", "binary":
		// Latin1/Binary 编码，每个 Unicode 码点对应一个字节值
		// 将字符串中的每个字符直接转换为其低8位字节值
		runes := []rune(str)
		result := make([]byte, len(runes))
		for i, r := range runes {
			result[i] = byte(r & 0xFF)
		}
		return result
	case "utf16le", "ucs2", "ucs-2":
		// UTF-16LE 编码
		encoded := utf16.Encode([]rune(str))
		result := make([]byte, len(encoded)*2)
		for i, v := range encoded {
			result[i*2] = byte(v)
			result[i*2+1] = byte(v >> 8)
		}
		return result
	default:
		// 默认 UTF-8 编码
		return []byte(str)
	}
}
