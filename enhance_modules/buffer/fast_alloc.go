package buffer

import (
	"fmt"
	"math"
	"strconv"
	
	"github.com/dop251/goja"
)

// OptimizedBufferAlloc 优化的 Buffer.alloc 实现
// 使用 Buffer 池和 Go 的高效内存分配
func OptimizedBufferAlloc(runtime *goja.Runtime, pool *BufferPool, size int64, fill interface{}, encoding string) (goja.Value, error) {
	if size < 0 {
		panic(runtime.NewTypeError("size 参数必须非负"))
	}

	// 限制最大分配（防止内存耗尽）
	const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
	if size > maxSize {
		panic(runtime.NewTypeError("size 参数过大"))
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
						copy(data[i:], data[:i])
					}
				}
			}
		case string:
			// 字符串填充（按编码）
			fillBytes := []byte(v)
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
		}
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
	buffer.Set("alloc", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("size 参数是必需的"))
		}

		sizeArg := call.Arguments[0]
		
		// 检查 NaN、Infinity 等无效值
		if sizeArg.ExportType() != nil {
			switch sizeArg.ExportType().Kind().String() {
			case "string":
				// 字符串参数，尝试转换为数字
				// 如果是非数字字符串，ToInteger() 会返回 0，但我们需要抛出错误
				str := sizeArg.String()
				if str != "" {
					// 尝试解析
					if _, err := strconv.ParseFloat(str, 64); err != nil {
						panic(runtime.NewTypeError(fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %s", str)))
					}
				}
			case "float64":
				// 检查 NaN 和 Infinity
				f := sizeArg.ToFloat()
				if math.IsNaN(f) {
					panic(runtime.NewTypeError("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received NaN"))
				}
				if math.IsInf(f, 0) {
					panic(runtime.NewTypeError("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received Infinity"))
				}
			}
		}
		
		size := sizeArg.ToInteger()
		if size < 0 {
			panic(runtime.NewTypeError(fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
		}
		
		const maxSize = 9007199254740991 // Number.MAX_SAFE_INTEGER
		if size > maxSize {
			panic(runtime.NewTypeError(fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
		}

		// 检查是否有填充值
		var fill interface{} = nil
		encoding := "utf8"

		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			fillArg := call.Arguments[1]

			// 判断填充值类型
			if fillArg.ExportType() != nil {
				switch fillArg.ExportType().Kind().String() {
				case "string":
					fill = fillArg.String()
				case "int", "int64", "float64":
					fill = fillArg.ToInteger()
				default:
					// 尝试作为 Buffer 或 Uint8Array
					if obj := fillArg.ToObject(runtime); obj != nil {
						lengthVal := obj.Get("length")
						if !goja.IsUndefined(lengthVal) {
							length := lengthVal.ToInteger()
							bytes := make([]byte, length)
							for i := int64(0); i < length; i++ {
								if val := obj.Get(string(rune('0' + i))); !goja.IsUndefined(val) {
									bytes[i] = byte(val.ToInteger() & 0xFF)
								}
							}
							fill = bytes
						}
					}
				}
			}
		}

		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
			encoding = call.Arguments[2].String()
		}

		result, err := OptimizedBufferAlloc(runtime, pool, size, fill, encoding)
		if err != nil {
			panic(err)
		}

		return result
	})

	// 🔥 优化 Buffer.allocUnsafe - 使用池但不零初始化
	buffer.Set("allocUnsafe", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("size 参数是必需的"))
		}

		sizeArg := call.Arguments[0]
		
		// 检查 NaN、Infinity 等无效值
		if sizeArg.ExportType() != nil {
			switch sizeArg.ExportType().Kind().String() {
			case "string":
				str := sizeArg.String()
				if str != "" {
					if _, err := strconv.ParseFloat(str, 64); err != nil {
						panic(runtime.NewTypeError(fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %s", str)))
					}
				}
			case "float64":
				f := sizeArg.ToFloat()
				if math.IsNaN(f) {
					panic(runtime.NewTypeError("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received NaN"))
				}
				if math.IsInf(f, 0) {
					panic(runtime.NewTypeError("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received Infinity"))
				}
			}
		}
		
		size := sizeArg.ToInteger()
		if size < 0 {
			panic(runtime.NewTypeError(fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
		}

		const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
		if size > maxSize {
			panic(runtime.NewTypeError("size 参数过大"))
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

	// 🔥 优化 Buffer.allocUnsafeSlow
	buffer.Set("allocUnsafeSlow", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("size 参数是必需的"))
		}

		sizeArg := call.Arguments[0]
		
		// 检查 NaN、Infinity 等无效值
		if sizeArg.ExportType() != nil {
			switch sizeArg.ExportType().Kind().String() {
			case "string":
				str := sizeArg.String()
				if str != "" {
					if _, err := strconv.ParseFloat(str, 64); err != nil {
						panic(runtime.NewTypeError(fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %s", str)))
					}
				}
			case "float64":
				f := sizeArg.ToFloat()
				if math.IsNaN(f) {
					panic(runtime.NewTypeError("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received NaN"))
				}
				if math.IsInf(f, 0) {
					panic(runtime.NewTypeError("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received Infinity"))
				}
			}
		}
		
		size := sizeArg.ToInteger()
		if size < 0 {
			panic(runtime.NewTypeError(fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
		}

		const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
		if size > maxSize {
			panic(runtime.NewTypeError("size 参数过大"))
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
}
