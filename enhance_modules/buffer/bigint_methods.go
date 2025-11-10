package buffer

import (
	"math/big"
	"strconv"
	"strings"

	"github.com/dop251/goja"
)

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

			// 🔥 支持十六进制字符串（0x 前缀）
			if strings.HasPrefix(argStr, "0x") || strings.HasPrefix(argStr, "0X") {
				// 去掉 0x 前缀，使用 base 16 解析
				hexStr := argStr[2:]
				if _, ok := value.SetString(hexStr, 16); !ok {
					// 十六进制解析失败
					value.SetInt64(0)
				}
			} else if _, ok := value.SetString(argStr, 10); !ok {
				// 十进制解析失败，尝试浮点数转换
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
