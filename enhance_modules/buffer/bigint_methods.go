package buffer

import (
	"fmt"
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
					// 检查是否为整数
					if floatVal != float64(int64(floatVal)) {
						panic(runtime.NewTypeError(fmt.Sprintf("The number %v cannot be converted to a BigInt because it is not an integer", floatVal)))
					}
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
		valueOfFunc := func(call goja.FunctionCall) goja.Value {
			// 如果是对象，尝试获取其值
			if thisObj, ok := call.This.(*goja.Object); ok {
				if val := thisObj.Get("__bigIntValue__"); !goja.IsUndefined(val) {
					return val
				}
			}
			// 否则返回 this 本身（对于原生 bigint）
			return call.This
		}
		valueOfValue := runtime.ToValue(valueOfFunc)
		setFunctionNameAndLength(runtime, valueOfValue, "valueOf", 0)
		prototype.Set("valueOf", valueOfValue)

		// 添加 toString 方法
		toStringFunc := func(call goja.FunctionCall) goja.Value {
			if thisObj, ok := call.This.(*goja.Object); ok {
				if val := thisObj.Get("__bigIntValue__"); !goja.IsUndefined(val) {
					return val
				}
			}
			return runtime.ToValue(call.This.String())
		}
		toStringValue := runtime.ToValue(toStringFunc)
		setFunctionNameAndLength(runtime, toStringValue, "toString", 0)
		prototype.Set("toString", toStringValue)

		obj.Set("prototype", prototype)

		// 添加 BigInt.asIntN 静态方法
		asIntNFunc := func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("BigInt.asIntN requires 2 arguments"))
			}

			bits := call.Arguments[0].ToInteger()
			value := call.Arguments[1]

			// 获取 BigInt 值
			var bigIntVal *big.Int
			if exported := value.Export(); exported != nil {
				if bi, ok := exported.(*big.Int); ok {
					bigIntVal = bi
				}
			}

			if bigIntVal == nil {
				panic(runtime.NewTypeError("Cannot convert value to BigInt"))
			}

			// 创建掩码：2^bits - 1
			modulus := new(big.Int).Lsh(big.NewInt(1), uint(bits))
			// 计算 value mod 2^bits
			result := new(big.Int).Mod(bigIntVal, modulus)

			// 处理符号位：如果结果 >= 2^(bits-1)，则减去 2^bits（转为负数）
			signBit := new(big.Int).Lsh(big.NewInt(1), uint(bits-1))
			if result.Cmp(signBit) >= 0 {
				result.Sub(result, modulus)
			}

			// 返回原生 bigint
			resultStr := result.String()
			code := resultStr + "n"
			res, err := runtime.RunString(code)
			if err == nil {
				return res
			}

			// 降级方案
			return runtime.ToValue(result.String())
		}
		asIntNValue := runtime.ToValue(asIntNFunc)
		setFunctionNameAndLength(runtime, asIntNValue, "asIntN", 2)
		obj.Set("asIntN", asIntNValue)

		// 添加 BigInt.asUintN 静态方法
		asUintNFunc := func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("BigInt.asUintN requires 2 arguments"))
			}

			bits := call.Arguments[0].ToInteger()
			value := call.Arguments[1]

			// 获取 BigInt 值
			var bigIntVal *big.Int
			if exported := value.Export(); exported != nil {
				if bi, ok := exported.(*big.Int); ok {
					bigIntVal = bi
				}
			}

			if bigIntVal == nil {
				panic(runtime.NewTypeError("Cannot convert value to BigInt"))
			}

			// 创建掩码：2^bits - 1
			modulus := new(big.Int).Lsh(big.NewInt(1), uint(bits))
			// 计算 value mod 2^bits（无符号）
			result := new(big.Int).Mod(bigIntVal, modulus)

			// 返回原生 bigint
			resultStr := result.String()
			code := resultStr + "n"
			res, err := runtime.RunString(code)
			if err == nil {
				return res
			}

			// 降级方案
			return runtime.ToValue(result.String())
		}
		asUintNValue := runtime.ToValue(asUintNFunc)
		setFunctionNameAndLength(runtime, asUintNValue, "asUintN", 2)
		obj.Set("asUintN", asUintNValue)
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
		// 特殊处理：Symbol 检查必须最先进行
		// 通过在 runtime 中执行 typeof 检查
		typeofCheck := runtime.Set("__checkTypeOf__", value)
		if typeofCheck == nil {
			typeofResult, err := runtime.RunString("typeof __checkTypeOf__")
			if err == nil && typeofResult != nil {
				typeStr := typeofResult.String()
				if typeStr == "symbol" {
					runtime.Set("__checkTypeOf__", goja.Undefined())
					panic(runtime.NewTypeError("Cannot convert a Symbol value to a number"))
				}
			}
			runtime.Set("__checkTypeOf__", goja.Undefined())
		}

		// 检查是否为 undefined 或 null
		if goja.IsUndefined(value) || goja.IsNull(value) {
			panic(runtime.NewTypeError("无法将 undefined 或 null 转换为 BigInt"))
		}

		// 🔥 优先检查是否为原生 bigint（通过 Export 导出）
		// goja 原生 bigint 会导出为 *big.Int
		exported := value.Export()
		if exported != nil {
			if bigIntVal, ok := exported.(*big.Int); ok {
				return bigIntVal
			}

			// 检查是否为 Boolean 类型
			if _, ok := exported.(bool); ok {
				panic(runtime.NewTypeError("Cannot mix BigInt and other types, use explicit conversions"))
			}

			// 检查是否为数字类型
			if _, ok := exported.(int64); ok {
				panic(runtime.NewTypeError("\"value\" 参数必须是 bigint 类型。接收到 number 类型"))
			}
			if _, ok := exported.(float64); ok {
				panic(runtime.NewTypeError("\"value\" 参数必须是 bigint 类型。接收到 number 类型"))
			}
		}

		// 尝试获取 BigInt 对象（兼容旧的对象方式）
		// 添加 defer recover 防止 ToObject 或其他操作导致崩溃
		defer func() {
			if r := recover(); r != nil {
				// 发生错误时，重新抛出或抛出通用类型错误
				// 但要确保 Symbol/Boolean 的错误能够传递
				if err, ok := r.(*goja.Object); ok {
					if msg := err.Get("message"); msg != nil && !goja.IsUndefined(msg) {
						msgStr := msg.String()
						// 保留特定的错误消息
						if msgStr == "Cannot convert a Symbol value to a number" ||
							msgStr == "Cannot mix BigInt and other types, use explicit conversions" {
							panic(r)
						}
					}
				}
				// 检查是否是 TypeError，且消息匹配
				if typeErr, ok := r.(error); ok {
					errMsg := typeErr.Error()
					if errMsg == "Cannot convert a Symbol value to a number" ||
						errMsg == "Cannot mix BigInt and other types, use explicit conversions" {
						panic(r)
					}
				}
				// 其他错误统一为类型错误
				panic(runtime.NewTypeError("\"value\" 参数必须是 bigint 类型"))
			}
		}()

		obj := value.ToObject(runtime)
		if obj != nil {
			// 检查特定对象类型，这些类型应该抛出 "Cannot mix BigInt and other types" 错误
			if ctorProp := obj.Get("constructor"); ctorProp != nil && !goja.IsUndefined(ctorProp) {
				if ctorObj := ctorProp.ToObject(runtime); ctorObj != nil {
					if nameProp := ctorObj.Get("name"); nameProp != nil && !goja.IsUndefined(nameProp) {
						ctorName := nameProp.String()
						// 这些类型需要抛出 "mix" 错误
						switch ctorName {
						case "Function", "Date", "RegExp", "Array", "Map", "Set", "Promise", "Error":
							panic(runtime.NewTypeError("Cannot mix BigInt and other types, use explicit conversions"))
						}
					}
				}
			}

			// 尝试调用 valueOf 方法
			if valueOfProp := obj.Get("valueOf"); valueOfProp != nil && !goja.IsUndefined(valueOfProp) {
				if valueOfFunc, ok := goja.AssertFunction(valueOfProp); ok {
					valueOfResult, err := valueOfFunc(obj)
					if err == nil && valueOfResult != nil {
						// 递归调用以处理 valueOf 返回的值
						if exported := valueOfResult.Export(); exported != nil {
							if bigIntVal, ok := exported.(*big.Int); ok {
								return bigIntVal
							}
						}
					}
				}
			}

			if val := obj.Get("__bigIntValue__"); val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
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
	readBigInt64BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readBigInt64BE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readBigInt64BE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "readBigInt64BE")

		// 读取 8 个字节（大端）
		bytes := make([]byte, 8)
		for i := 0; i < 8; i++ {
			val := this.Get(strconv.FormatInt(offset+int64(i), 10))
			if val == nil || goja.IsUndefined(val) {
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
	}
	readBigInt64BEValue := runtime.ToValue(readBigInt64BEFunc)
	if fnObj := readBigInt64BEValue.ToObject(runtime); fnObj != nil {
		fnObj.DefineDataProperty("name", runtime.ToValue("readBigInt64BE"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		fnObj.DefineDataProperty("length", runtime.ToValue(0), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
	prototype.Set("readBigInt64BE", readBigInt64BEValue)

	// readBigInt64LE - 读取 64 位有符号小端整数
	readBigInt64LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readBigInt64LE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readBigInt64LE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "readBigInt64LE")

		// 读取 8 个字节（小端）
		bytes := make([]byte, 8)
		for i := 0; i < 8; i++ {
			val := this.Get(strconv.FormatInt(offset+int64(7-i), 10))
			if val == nil || goja.IsUndefined(val) {
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
	}
	readBigInt64LEValue := runtime.ToValue(readBigInt64LEFunc)
	if fnObj := readBigInt64LEValue.ToObject(runtime); fnObj != nil {
		fnObj.DefineDataProperty("name", runtime.ToValue("readBigInt64LE"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		fnObj.DefineDataProperty("length", runtime.ToValue(0), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
	prototype.Set("readBigInt64LE", readBigInt64LEValue)

	// readBigUInt64BE - 读取 64 位无符号大端整数
	readBigUInt64BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readBigUInt64BE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readBigUInt64BE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "readBigUInt64BE")

		// 读取 8 个字节（大端）
		bytes := make([]byte, 8)
		for i := 0; i < 8; i++ {
			val := this.Get(strconv.FormatInt(offset+int64(i), 10))
			if val == nil || goja.IsUndefined(val) {
				bytes[i] = 0
			} else {
				bytes[i] = byte(val.ToInteger())
			}
		}

		// 转换为 big.Int（无符号）
		value := new(big.Int).SetBytes(bytes)

		return createBigInt(value)
	}
	readBigUInt64BEValue := runtime.ToValue(readBigUInt64BEFunc)
	// 设置函数的 name 属性
	if fnObj := readBigUInt64BEValue.ToObject(runtime); fnObj != nil {
		fnObj.DefineDataProperty("name", runtime.ToValue("readBigUInt64BE"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		fnObj.DefineDataProperty("length", runtime.ToValue(0), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
	prototype.Set("readBigUInt64BE", readBigUInt64BEValue)
	
	// 为别名创建单独的函数对象以设置正确的 name
	readBigUint64BEFunc := func(call goja.FunctionCall) goja.Value {
		return readBigUInt64BEFunc(call)
	}
	readBigUint64BEValue := runtime.ToValue(readBigUint64BEFunc)
	if fnObj := readBigUint64BEValue.ToObject(runtime); fnObj != nil {
		fnObj.DefineDataProperty("name", runtime.ToValue("readBigUint64BE"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		fnObj.DefineDataProperty("length", runtime.ToValue(1), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
	prototype.Set("readBigUint64BE", readBigUint64BEValue)

	// readBigUInt64LE - 读取 64 位无符号小端整数
	readBigUInt64LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "readBigUInt64LE")
		offset := int64(0)
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			offset = validateOffset(runtime, call.Arguments[0], "readBigUInt64LE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "readBigUInt64LE")

		// 读取 8 个字节（小端）
		bytes := make([]byte, 8)
		for i := 0; i < 8; i++ {
			val := this.Get(strconv.FormatInt(offset+int64(7-i), 10))
			if val == nil || goja.IsUndefined(val) {
				bytes[i] = 0
			} else {
				bytes[i] = byte(val.ToInteger())
			}
		}

		// 转换为 big.Int（无符号）
		value := new(big.Int).SetBytes(bytes)

		return createBigInt(value)
	}
	readBigUInt64LEValue := runtime.ToValue(readBigUInt64LEFunc)
	if fnObj := readBigUInt64LEValue.ToObject(runtime); fnObj != nil {
		fnObj.DefineDataProperty("name", runtime.ToValue("readBigUInt64LE"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		fnObj.DefineDataProperty("length", runtime.ToValue(0), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
	prototype.Set("readBigUInt64LE", readBigUInt64LEValue)
	
	// 为别名创建单独的函数对象以设置正确的 name
	readBigUint64LEFunc := func(call goja.FunctionCall) goja.Value {
		return readBigUInt64LEFunc(call)
	}
	readBigUint64LEValue := runtime.ToValue(readBigUint64LEFunc)
	if fnObj := readBigUint64LEValue.ToObject(runtime); fnObj != nil {
		fnObj.DefineDataProperty("name", runtime.ToValue("readBigUint64LE"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		fnObj.DefineDataProperty("length", runtime.ToValue(1), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
	prototype.Set("readBigUint64LE", readBigUint64LEValue)

	// writeBigInt64BE - 写入 64 位有符号大端整数
	writeBigInt64BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeBigInt64BE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeBigInt64BE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "writeBigInt64BE")

		// 获取 BigInt 值
		value := getBigIntValue(call.Arguments[0])

		// 检查范围：-2^63 到 2^63-1
		minInt64 := new(big.Int).Lsh(big.NewInt(-1), 63)
		maxInt64 := new(big.Int).Sub(new(big.Int).Lsh(big.NewInt(1), 63), big.NewInt(1))
		if value.Cmp(minInt64) < 0 || value.Cmp(maxInt64) > 0 {
			panic(newRangeError(runtime, "The value of \"value\" is out of range. It must be >= -(2 ** 63) and < 2 ** 63. Received " + value.String()))
		}

		// 处理负数（转换为二进制补码）
		if value.Sign() < 0 {
			maxUint64 := new(big.Int).Lsh(big.NewInt(1), 64)
			value = new(big.Int).Add(value, maxUint64)
		}

		// 转换为字节数组
		bytes := value.Bytes()

		// 确保是 8 字节，前面补零
		result := make([]byte, 8)
		if len(bytes) <= 8 {
			copy(result[8-len(bytes):], bytes)
		} else {
			// 理论上不应该到这里，因为已经做了范围检查
			copy(result, bytes[len(bytes)-8:])
		}

		// 写入 buffer（大端）
		for i := 0; i < 8; i++ {
			this.Set(strconv.FormatInt(offset+int64(i), 10), runtime.ToValue(result[i]))
		}

		return runtime.ToValue(offset + 8)
	}
	writeBigInt64BEValue := runtime.ToValue(writeBigInt64BEFunc)
	setFunctionNameAndLength(runtime, writeBigInt64BEValue, "writeBigInt64BE", 1)
	// 为函数添加空的 prototype 属性
	if fnObj := writeBigInt64BEValue.ToObject(runtime); fnObj != nil {
		fnObj.Set("prototype", runtime.NewObject())
	}
	prototype.Set("writeBigInt64BE", writeBigInt64BEValue)

	// writeBigInt64LE - 写入 64 位有符号小端整数
	writeBigInt64LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeBigInt64LE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		offset := int64(0)
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			offset = validateOffset(runtime, call.Arguments[1], "writeBigInt64LE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "writeBigInt64LE")

		// 获取 BigInt 值
		value := getBigIntValue(call.Arguments[0])

		// 检查范围：-2^63 到 2^63-1
		minInt64 := new(big.Int).Lsh(big.NewInt(-1), 63)
		maxInt64 := new(big.Int).Sub(new(big.Int).Lsh(big.NewInt(1), 63), big.NewInt(1))
		if value.Cmp(minInt64) < 0 || value.Cmp(maxInt64) > 0 {
			panic(newRangeError(runtime, "The value of \"value\" is out of range. It must be >= -(2 ** 63) and < 2 ** 63. Received " + value.String()))
		}

		// 处理负数（转换为二进制补码）
		if value.Sign() < 0 {
			maxUint64 := new(big.Int).Lsh(big.NewInt(1), 64)
			value = new(big.Int).Add(value, maxUint64)
		}

		// 转换为字节数组
		bytes := value.Bytes()

		// 确保是 8 字节，前面补零
		result := make([]byte, 8)
		if len(bytes) <= 8 {
			copy(result[8-len(bytes):], bytes)
		} else {
			// 理论上不应该到这里，因为已经做了范围检查
			copy(result, bytes[len(bytes)-8:])
		}

		// 写入 buffer（小端）
		for i := 0; i < 8; i++ {
			this.Set(strconv.FormatInt(offset+int64(i), 10), runtime.ToValue(result[7-i]))
		}

		return runtime.ToValue(offset + 8)
	}
	writeBigInt64LEValue := runtime.ToValue(writeBigInt64LEFunc)
	setFunctionNameAndLength(runtime, writeBigInt64LEValue, "writeBigInt64LE", 1)
	// 为函数添加空的 prototype 属性
	if fnObj := writeBigInt64LEValue.ToObject(runtime); fnObj != nil {
		fnObj.Set("prototype", runtime.NewObject())
	}
	prototype.Set("writeBigInt64LE", writeBigInt64LEValue)

	// writeBigUInt64BE - 写入 64 位无符号大端整数
	writeBigUInt64BEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeBigUInt64BE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		offset := int64(0)
		if len(call.Arguments) > 1 {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeBigUInt64BE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "writeBigUInt64BE")

		// 获取 BigInt 值
		value := getBigIntValue(call.Arguments[0])

		// 检查范围：0 到 2^64-1
		maxUInt64 := new(big.Int).Sub(new(big.Int).Lsh(big.NewInt(1), 64), big.NewInt(1))
		if value.Sign() < 0 || value.Cmp(maxUInt64) > 0 {
			panic(newRangeError(runtime, "The value of \"value\" is out of range. It must be >= 0 and <= 18446744073709551615. Received "+value.String()))
		}

		// 转换为字节数组
		bytes := value.Bytes()

		// 确保是 8 字节，前面补零
		result := make([]byte, 8)
		if len(bytes) > 0 {
			copy(result[8-len(bytes):], bytes)
		}

		// 写入 buffer（大端）
		for i := 0; i < 8; i++ {
			this.Set(strconv.FormatInt(offset+int64(i), 10), runtime.ToValue(result[i]))
		}

		return runtime.ToValue(offset + 8)
	}
	writeBigUInt64BEValue := runtime.ToValue(writeBigUInt64BEFunc)
	setFunctionNameAndLength(runtime, writeBigUInt64BEValue, "writeBigUInt64BE", 1)
	prototype.Set("writeBigUInt64BE", writeBigUInt64BEValue)
	// 添加别名 writeBigUint64BE（小写 u），确保是同一个引用
	prototype.Set("writeBigUint64BE", writeBigUInt64BEValue)

	// writeBigUInt64LE - 写入 64 位无符号小端整数
	writeBigUInt64LEFunc := func(call goja.FunctionCall) goja.Value {
		this := safeGetBufferThis(runtime, call, "writeBigUInt64LE")
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("Value 参数是必需的"))
		}

		offset := int64(0)
		if len(call.Arguments) > 1 {
			offset = validateOptionalOffset(runtime, call.Arguments[1], "writeBigUInt64LE")
		}

		// 检查边界
		checkReadBounds(runtime, this, offset, 8, "writeBigUInt64LE")

		// 获取 BigInt 值
		value := getBigIntValue(call.Arguments[0])

		// 检查范围：0 到 2^64-1
		maxUInt64 := new(big.Int).Sub(new(big.Int).Lsh(big.NewInt(1), 64), big.NewInt(1))
		if value.Sign() < 0 || value.Cmp(maxUInt64) > 0 {
			panic(newRangeError(runtime, "The value of \"value\" is out of range. It must be >= 0 and <= 18446744073709551615. Received "+value.String()))
		}

		// 转换为字节数组
		bytes := value.Bytes()

		// 确保是 8 字节，前面补零
		result := make([]byte, 8)
		if len(bytes) > 0 {
			copy(result[8-len(bytes):], bytes)
		}

		// 写入 buffer（小端）
		for i := 0; i < 8; i++ {
			this.Set(strconv.FormatInt(offset+int64(i), 10), runtime.ToValue(result[7-i]))
		}

		return runtime.ToValue(offset + 8)
	}
	writeBigUInt64LEValue := runtime.ToValue(writeBigUInt64LEFunc)
	setFunctionNameAndLength(runtime, writeBigUInt64LEValue, "writeBigUInt64LE", 1)
	prototype.Set("writeBigUInt64LE", writeBigUInt64LEValue)
	// 添加别名 writeBigUint64LE（小写 u），确保是同一个引用
	prototype.Set("writeBigUint64LE", writeBigUInt64LEValue)
}
