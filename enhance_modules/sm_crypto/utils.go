package sm_crypto

import (
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/dop251/goja"
)

// ============================================================================
// 🔧 Hex 转换工具函数
// ============================================================================

// HexToBytes 十六进制字符串转字节数组
func HexToBytes(hexStr string) ([]byte, error) {
	// 移除可能的 0x 前缀
	hexStr = strings.TrimPrefix(hexStr, "0x")
	hexStr = strings.TrimPrefix(hexStr, "0X")

	// 如果长度为奇数，前面补 0
	if len(hexStr)%2 != 0 {
		hexStr = "0" + hexStr
	}

	return hex.DecodeString(hexStr)
}

// BytesToHex 字节数组转十六进制字符串（小写）
func BytesToHex(data []byte) string {
	return hex.EncodeToString(data)
}

// ============================================================================
// 🔧 UTF-8 转换工具函数（精确匹配 JS 版本）
// ============================================================================

// Utf8ToBytes UTF-8 字符串转字节数组
// 精确匹配 sm-crypto-v2.js 的 utf8ToArray 函数实现
func Utf8ToBytes(str string) []byte {
	result := make([]byte, 0, len(str))

	for i := 0; i < len(str); {
		r, size := utf8.DecodeRuneInString(str[i:])
		if r == utf8.RuneError {
			// 处理无效 UTF-8
			result = append(result, str[i])
			i++
			continue
		}

		point := uint32(r)

		if point <= 0x7F {
			// 1 字节：0xxxxxxx
			result = append(result, byte(point))
		} else if point <= 0x7FF {
			// 2 字节：110xxxxx 10xxxxxx
			result = append(result, byte(0xC0|(point>>6)))
			result = append(result, byte(0x80|(point&0x3F)))
		} else if (point <= 0xD7FF) || (point >= 0xE000 && point <= 0xFFFF) {
			// 3 字节：1110xxxx 10xxxxxx 10xxxxxx
			result = append(result, byte(0xE0|(point>>12)))
			result = append(result, byte(0x80|((point>>6)&0x3F)))
			result = append(result, byte(0x80|(point&0x3F)))
		} else if point >= 0x10000 && point <= 0x10FFFF {
			// 4 字节：11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
			result = append(result, byte(0xF0|((point>>18)&0x07)))
			result = append(result, byte(0x80|((point>>12)&0x3F)))
			result = append(result, byte(0x80|((point>>6)&0x3F)))
			result = append(result, byte(0x80|(point&0x3F)))
		} else {
			// 无效范围
			return nil
		}

		i += size
	}

	return result
}

// BytesToUtf8 字节数组转 UTF-8 字符串
func BytesToUtf8(data []byte) string {
	return string(data)
}

// Utf8ToHex UTF-8 字符串转十六进制字符串
func Utf8ToHex(str string) string {
	return BytesToHex(Utf8ToBytes(str))
}

// ============================================================================
// 🔧 字符串填充工具函数
// ============================================================================

// LeftPad 左侧填充字符串到指定长度（用 0 填充）
func LeftPad(str string, length int) string {
	if len(str) >= length {
		return str
	}
	return strings.Repeat("0", length-len(str)) + str
}

// ============================================================================
// 🔧 Goja 互操作工具函数
// ============================================================================

// ExportUint8Array 从 Goja Value 导出 Uint8Array 为 []byte
func ExportUint8Array(val goja.Value, runtime *goja.Runtime) ([]byte, error) {
	if goja.IsNull(val) || goja.IsUndefined(val) {
		return nil, errors.New("value is null or undefined")
	}

	obj := val.ToObject(runtime)
	if obj == nil {
		return nil, errors.New("value is not an object")
	}

	// 获取数组长度
	lengthVal := obj.Get("length")
	if goja.IsUndefined(lengthVal) {
		return nil, errors.New("value does not have a length property")
	}

	length := int(lengthVal.ToInteger())
	result := make([]byte, length)

	// 逐个读取元素
	for i := 0; i < length; i++ {
		elemVal := obj.Get(fmt.Sprintf("%d", i))
		if goja.IsUndefined(elemVal) {
			result[i] = 0
		} else {
			result[i] = byte(elemVal.ToInteger())
		}
	}

	return result, nil
}

// CreateUint8Array 创建 Goja Uint8Array
func CreateUint8Array(runtime *goja.Runtime, data []byte) goja.Value {
	// 方法：使用 Uint8Array.from() 或者先创建普通数组再转换

	// 创建包含数据的普通数组
	dataArray := runtime.NewArray()
	for i, b := range data {
		dataArray.Set(fmt.Sprintf("%d", i), runtime.ToValue(int(b)))
	}

	// 尝试使用 Uint8Array.from(array)
	uint8ArrayConstructor := runtime.Get("Uint8Array")
	if !goja.IsUndefined(uint8ArrayConstructor) {
		constructorObj := uint8ArrayConstructor.ToObject(runtime)
		fromFunc := constructorObj.Get("from")

		if !goja.IsUndefined(fromFunc) {
			// 使用 Uint8Array.from(array)
			fromFn, ok := goja.AssertFunction(fromFunc)
			if ok {
				u8Array, err := fromFn(uint8ArrayConstructor, dataArray)
				if err == nil {
					return u8Array
				}
			}
		}

		// 降级：尝试 new Uint8Array(array)
		constructor, ok := goja.AssertFunction(uint8ArrayConstructor)
		if ok {
			u8Array, err := constructor(goja.Null(), dataArray)
			if err == nil {
				return u8Array
			}
		}
	}

	// 最终降级：返回类 Uint8Array 的数组
	dataArray.Set("byteLength", runtime.ToValue(len(data)))
	return dataArray
}

// ParseStringOrBytes 解析字符串或字节数组参数
// 如果是字符串，返回 UTF-8 字节；如果是 Uint8Array，返回字节数组
func ParseStringOrBytes(val goja.Value, runtime *goja.Runtime) ([]byte, error) {
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return nil, errors.New("argument is undefined or null")
	}

	// 尝试作为字符串
	if val.ExportType().Kind().String() == "string" {
		return Utf8ToBytes(val.String()), nil
	}

	// 尝试作为 Uint8Array
	return ExportUint8Array(val, runtime)
}

// ParseHexOrBytes 解析十六进制字符串或字节数组参数
func ParseHexOrBytes(val goja.Value, runtime *goja.Runtime) ([]byte, error) {
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return nil, errors.New("argument is undefined or null")
	}

	// 尝试作为字符串（十六进制）
	if val.ExportType().Kind().String() == "string" {
		return HexToBytes(val.String())
	}

	// 检查是否为数字类型（不允许）
	exportType := val.ExportType().Kind().String()
	if exportType == "int" || exportType == "int64" || exportType == "float64" || exportType == "number" {
		return nil, errors.New("invalid type: expected string or Uint8Array, got number")
	}

	// 尝试作为 Uint8Array
	return ExportUint8Array(val, runtime)
}

// ParseOptions 解析可选的 options 对象
func ParseOptions(call goja.FunctionCall, argIndex int, runtime *goja.Runtime) *goja.Object {
	if len(call.Arguments) <= argIndex {
		return nil
	}

	optVal := call.Argument(argIndex)
	if goja.IsUndefined(optVal) || goja.IsNull(optVal) {
		return nil
	}

	obj := optVal.ToObject(runtime)
	if obj == nil {
		return nil
	}

	return obj
}

// GetStringOption 从 options 对象获取字符串选项
func GetStringOption(opts *goja.Object, key string, defaultValue string) string {
	if opts == nil {
		return defaultValue
	}

	// 安全检查：确保对象不为空
	defer func() {
		if r := recover(); r != nil {
			// 如果获取失败，返回默认值
		}
	}()

	val := opts.Get(key)
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return defaultValue
	}

	return val.String()
}

// GetBoolOption 从 options 对象获取布尔选项
func GetBoolOption(opts *goja.Object, key string, defaultValue bool) bool {
	if opts == nil {
		return defaultValue
	}

	defer func() {
		if r := recover(); r != nil {
			// 获取失败返回默认值
		}
	}()

	val := opts.Get(key)
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return defaultValue
	}

	return val.ToBoolean()
}

// GetIntOption 从 options 对象获取整数选项
func GetIntOption(opts *goja.Object, key string, defaultValue int) int {
	if opts == nil {
		return defaultValue
	}

	defer func() {
		if r := recover(); r != nil {
			// 获取失败返回默认值
		}
	}()

	val := opts.Get(key)
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return defaultValue
	}

	return int(val.ToInteger())
}

// GetBytesOption 从 options 对象获取字节数组选项
func GetBytesOption(opts *goja.Object, key string, runtime *goja.Runtime) ([]byte, error) {
	if opts == nil {
		return nil, nil
	}

	defer func() {
		if r := recover(); r != nil {
			// 获取失败，返回 nil
		}
	}()

	val := opts.Get(key)
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return nil, nil
	}

	return ParseHexOrBytes(val, runtime)
}

// ============================================================================
// 🔧 Goja 包装的工具函数（暴露给 JS）
// ============================================================================

// HexToArray sm2.hexToArray() 的 Go 实现
func HexToArray(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("hexToArray requires 1 argument"))
	}

	hexStr := call.Argument(0).String()
	bytes, err := HexToBytes(hexStr)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid hex string: %w", err)))
	}

	return CreateUint8Array(runtime, bytes)
}

// ArrayToHex sm2.arrayToHex() 的 Go 实现
func ArrayToHex(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("arrayToHex requires 1 argument"))
	}

	bytes, err := ExportUint8Array(call.Argument(0), runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid array: %w", err)))
	}

	return runtime.ToValue(BytesToHex(bytes))
}

// Utf8ToHexFunc sm2.utf8ToHex() 的 Go 实现
func Utf8ToHexFunc(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("utf8ToHex requires 1 argument"))
	}

	str := call.Argument(0).String()
	return runtime.ToValue(Utf8ToHex(str))
}

// ArrayToUtf8Func sm2.arrayToUtf8() 的 Go 实现
func ArrayToUtf8Func(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("arrayToUtf8 requires 1 argument"))
	}

	bytes, err := ExportUint8Array(call.Argument(0), runtime)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid array: %w", err)))
	}

	return runtime.ToValue(BytesToUtf8(bytes))
}

// LeftPadFunc sm2.leftPad() 的 Go 实现
func LeftPadFunc(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("leftPad requires 2 arguments"))
	}

	str := call.Argument(0).String()
	length := int(call.Argument(1).ToInteger())

	return runtime.ToValue(LeftPad(str, length))
}
