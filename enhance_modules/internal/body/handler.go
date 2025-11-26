package body

import (
	"encoding/binary"
	"fmt"
	"io"
	"math"
	"strconv"

	"flow-codeblock-go/enhance_modules/internal/blob"

	"github.com/dop251/goja"
)

// BodyTypeHandler 处理各种 Body 类型
type BodyTypeHandler struct {
	maxBlobFileSize int64 // Blob/File/TypedArray 最大大小（字节）
}

// NewBodyTypeHandler 创建 Body 类型处理器
func NewBodyTypeHandler(maxBlobFileSize int64) *BodyTypeHandler {
	if maxBlobFileSize <= 0 {
		maxBlobFileSize = 100 * 1024 * 1024 // 默认 100MB
	}
	return &BodyTypeHandler{
		maxBlobFileSize: maxBlobFileSize,
	}
}

// addSymbolIteratorToIterator 为迭代器添加 Symbol.iterator 支持（使用原生 API）
// 使迭代器本身可迭代（返回自身），符合 ES6 迭代器协议
func addSymbolIteratorToIterator(runtime *goja.Runtime, iterator *goja.Object) {
	symbolObj := runtime.Get("Symbol")
	if goja.IsUndefined(symbolObj) {
		return
	}

	symbol := symbolObj.ToObject(runtime)
	if symbol == nil {
		return
	}

	iteratorSym := symbol.Get("iterator")
	if goja.IsUndefined(iteratorSym) {
		return
	}

	// 使用原生 SetSymbol API（性能最优）
	if sym, ok := iteratorSym.(*goja.Symbol); ok {
		iterator.SetSymbol(sym, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			return iterator
		}))
	}
}

// setSymbolIteratorMethod 为对象设置 Symbol.iterator 方法（使用原生 API）
// methodFunc 是返回迭代器的函数
func setSymbolIteratorMethod(runtime *goja.Runtime, obj *goja.Object, methodFunc func() goja.Value) {
	symbolObj := runtime.Get("Symbol")
	if goja.IsUndefined(symbolObj) {
		return
	}

	symbol := symbolObj.ToObject(runtime)
	if symbol == nil {
		return
	}

	iteratorSym := symbol.Get("iterator")
	if goja.IsUndefined(iteratorSym) {
		return
	}

	// 使用原生 SetSymbol API（性能最优）
	if sym, ok := iteratorSym.(*goja.Symbol); ok {
		obj.SetSymbol(sym, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			return methodFunc()
		}))
	}
}

// ProcessBody 处理各种类型的 body，返回数据或 Reader，以及 contentType
// 🔥 重构优化：直接返回 []byte 避免不必要的 Reader 包装
//
// 返回值：
//   - data: 已知大小的数据（[]byte）
//   - reader: 流式数据（io.Reader，用于真正的流）
//   - contentType: Content-Type
//   - 只有 data 和 reader 中的一个非 nil
func (h *BodyTypeHandler) ProcessBody(runtime *goja.Runtime, body interface{}) (data []byte, reader io.Reader, contentType string, err error) {
	if body == nil {
		return nil, nil, "", nil
	}

	// 1. 字符串 - 直接转换为 []byte
	if str, ok := body.(string); ok {
		return []byte(str), nil, "", nil
	}

	// 2. 字节数组 - 直接返回
	if bytes, ok := body.([]byte); ok {
		return bytes, nil, "", nil
	}

	// 3. io.Reader - 保持流式（真正的流）
	if r, ok := body.(io.Reader); ok {
		return nil, r, "", nil // chunked transfer
	}

	// 4. goja.Object - 需要进一步判断类型
	if obj, ok := body.(*goja.Object); ok && obj != nil {
		// 🔥 Buffer 支持（Node.js FormData 等场景）
		if h.isBuffer(obj, runtime) {
			bytes, err := h.bufferToBytes(obj)
			if err != nil {
				return nil, nil, "", fmt.Errorf("转换 Buffer 失败: %w", err)
			}
			return bytes, nil, "application/octet-stream", nil
		}

		// 4.1 检查是否是 TypedArray (Uint8Array, Int8Array等)
		if h.isTypedArray(obj) {
			bytes, err := h.typedArrayToBytes(obj)
			if err != nil {
				return nil, nil, "", fmt.Errorf("转换 TypedArray 失败: %w", err)
			}
			return bytes, nil, "application/octet-stream", nil
		}

		// 4.2 检查是否是 ArrayBuffer
		if h.isArrayBuffer(obj) {
			bytes, err := h.arrayBufferToBytes(obj)
			if err != nil {
				return nil, nil, "", fmt.Errorf("转换 ArrayBuffer 失败: %w", err)
			}
			return bytes, nil, "application/octet-stream", nil
		}

		// 4.3 检查是否是 URLSearchParams
		if h.isURLSearchParams(obj) {
			str, err := h.urlSearchParamsToString(obj)
			if err != nil {
				return nil, nil, "", fmt.Errorf("转换 URLSearchParams 失败: %w", err)
			}
			return []byte(str), nil, "application/x-www-form-urlencoded", nil
		}

		// 4.4 检查是否是 Blob 或 File
		if h.isBlobOrFile(obj) {
			bytes, ct, err := h.blobToBytes(obj)
			if err != nil {
				return nil, nil, "", fmt.Errorf("转换 Blob/File 失败: %w", err)
			}
			return bytes, nil, ct, nil
		}
	}

	// 5. 默认：返回 nil 表示需要 JSON 序列化
	return nil, nil, "", nil
}

// isTypedArray 检查对象是否是 TypedArray
func (h *BodyTypeHandler) isTypedArray(obj *goja.Object) bool {
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok {
			if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
				typeName := nameVal.String()
				return typeName == "Uint8Array" ||
					typeName == "Int8Array" ||
					typeName == "Uint16Array" ||
					typeName == "Int16Array" ||
					typeName == "Uint32Array" ||
					typeName == "Int32Array" ||
					typeName == "Float32Array" ||
					typeName == "Float64Array" ||
					typeName == "Uint8ClampedArray"
			}
		}
	}
	return false
}

// isArrayBuffer 检查对象是否是 ArrayBuffer
func (h *BodyTypeHandler) isArrayBuffer(obj *goja.Object) bool {
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok {
			if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
				return nameVal.String() == "ArrayBuffer"
			}
		}
	}
	return false
}

// isBuffer 检查对象是否是 Buffer（Node.js 环境）
func (h *BodyTypeHandler) isBuffer(obj *goja.Object, runtime *goja.Runtime) bool {
	if obj == nil || runtime == nil {
		return false
	}

	// 优先使用 Buffer.isBuffer
	if bufferVal := runtime.Get("Buffer"); !goja.IsUndefined(bufferVal) && bufferVal != nil {
		if bufferObj, ok := bufferVal.(*goja.Object); ok {
			if isBufferVal := bufferObj.Get("isBuffer"); !goja.IsUndefined(isBufferVal) {
				if isBufferFn, ok := goja.AssertFunction(isBufferVal); ok {
					if res, err := isBufferFn(bufferObj, obj); err == nil && res.ToBoolean() {
						return true
					}
				}
			}
		}
	}

	// 退化检查：构造函数名为 Buffer
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok {
			if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
				return nameVal.String() == "Buffer"
			}
		}
	}

	return false
}

// bufferToBytes 将 Buffer 转换为字节数组
func (h *BodyTypeHandler) bufferToBytes(obj *goja.Object) ([]byte, error) {
	if obj == nil {
		return nil, fmt.Errorf("Buffer 对象为 nil")
	}

	lengthVal := obj.Get("length")
	if goja.IsUndefined(lengthVal) || goja.IsNull(lengthVal) {
		return nil, fmt.Errorf("Buffer 缺少 length 属性")
	}

	length := int(lengthVal.ToInteger())
	if length < 0 {
		return nil, fmt.Errorf("Buffer 长度非法: %d", length)
	}
	if length == 0 {
		return []byte{}, nil
	}

	data := make([]byte, length)
	for i := 0; i < length; i++ {
		val := obj.Get(strconv.Itoa(i))
		if goja.IsUndefined(val) || goja.IsNull(val) {
			data[i] = 0
		} else {
			data[i] = byte(val.ToInteger())
		}
	}

	return data, nil
}

// isBlobOrFile 检查对象是否是 Blob 或 File
func (h *BodyTypeHandler) isBlobOrFile(obj *goja.Object) bool {
	// 检查 __isBlob 标识符
	if marker := obj.Get("__isBlob"); !goja.IsUndefined(marker) && marker != nil {
		if markerBool, ok := marker.Export().(bool); ok && markerBool {
			return true
		}
	}
	return false
}

// isURLSearchParams 检查对象是否是 URLSearchParams
func (h *BodyTypeHandler) isURLSearchParams(obj *goja.Object) bool {
	// 🔥 优先检查标识符（最可靠的方法）
	if marker := obj.Get("__isURLSearchParams"); !goja.IsUndefined(marker) && marker != nil {
		if markerBool, ok := marker.Export().(bool); ok && markerBool {
			return true
		}
	}

	// 后备方案：检查 constructor.name
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok {
			if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
				return nameVal.String() == "URLSearchParams"
			}
		}
	}

	return false
}

// typedArrayToBytes 将 TypedArray 转换为字节数组
func (h *BodyTypeHandler) typedArrayToBytes(obj *goja.Object) ([]byte, error) {
	// 安全检查
	if obj == nil {
		return nil, fmt.Errorf("TypedArray 对象为 nil")
	}

	// 获取数组长度
	lengthVal := obj.Get("length")
	if goja.IsUndefined(lengthVal) || lengthVal == nil {
		return nil, fmt.Errorf("TypedArray 缺少 length 属性")
	}
	length := int(lengthVal.ToInteger())

	// 🔥 检查 length 合法性
	if length < 0 {
		return nil, fmt.Errorf("TypedArray length 不能为负数: %d", length)
	}
	if length == 0 {
		return []byte{}, nil // 空数组，直接返回
	}

	// 获取数组类型
	var bytesPerElement int = 1
	var typeName string
	if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
		if constructorObj, ok := constructor.(*goja.Object); ok {
			if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
				typeName = nameVal.String()
			}
		}
	}

	switch typeName {
	case "Uint8Array", "Int8Array", "Uint8ClampedArray":
		bytesPerElement = 1
	case "Uint16Array", "Int16Array":
		bytesPerElement = 2
	case "Uint32Array", "Int32Array", "Float32Array":
		bytesPerElement = 4
	case "Float64Array":
		bytesPerElement = 8
	}

	// 🔥 防护：整数溢出 + 内存耗尽（DoS 防护）
	// 使用 int64 计算避免 32 位系统溢出
	totalBytes64 := int64(length) * int64(bytesPerElement)

	// 🔥 检查是否超过配置的限制（MAX_BLOB_FILE_SIZE）
	if totalBytes64 > h.maxBlobFileSize {
		sizeMB := float64(totalBytes64) / (1024 * 1024)
		limitMB := float64(h.maxBlobFileSize) / (1024 * 1024)
		return nil, fmt.Errorf("TypedArray 过大: %.2fMB > %.2fMB 限制 (类型: %s, 长度: %d, 每元素字节数: %d)",
			sizeMB, limitMB, typeName, length, bytesPerElement)
	}

	// 检查是否会在 32 位系统上溢出（兼容性检查）
	if totalBytes64 > math.MaxInt32 {
		return nil, fmt.Errorf("TypedArray 超过 32 位系统支持的最大大小")
	}

	totalBytes := int(totalBytes64)
	data := make([]byte, totalBytes)

	// 读取数据
	for i := 0; i < length; i++ {
		val := obj.Get(strconv.Itoa(i))
		if goja.IsUndefined(val) || val == nil {
			continue
		}

		switch bytesPerElement {
		case 1:
			// Uint8Array, Int8Array
			num := uint8(val.ToInteger())
			data[i] = num

		case 2:
			// Uint16Array, Int16Array
			num := uint16(val.ToInteger())
			binary.LittleEndian.PutUint16(data[i*2:], num)

		case 4:
			// Uint32Array, Int32Array, Float32Array
			if typeName == "Float32Array" {
				// 使用标准库函数转换 Float32
				bits := math.Float32bits(float32(val.ToFloat()))
				binary.LittleEndian.PutUint32(data[i*4:], bits)
			} else {
				num := uint32(val.ToInteger())
				binary.LittleEndian.PutUint32(data[i*4:], num)
			}

		case 8:
			// Float64Array - 使用标准库函数转换 Float64
			bits := math.Float64bits(val.ToFloat())
			binary.LittleEndian.PutUint64(data[i*8:], bits)
		}
	}

	return data, nil
}

// arrayBufferToBytes 将 ArrayBuffer 转换为字节数组
func (h *BodyTypeHandler) arrayBufferToBytes(obj *goja.Object) ([]byte, error) {
	// 直接导出为 goja.ArrayBuffer
	// 注意：此方法仅在 isArrayBuffer() 返回 true 后调用
	// 因此类型断言应该总是成功
	if ab, ok := obj.Export().(goja.ArrayBuffer); ok {
		return ab.Bytes(), nil
	}

	// 如果类型断言失败，说明对象不是真正的 ArrayBuffer
	// 这通常不应该发生，因为我们已经通过 isArrayBuffer() 检查过了
	return nil, fmt.Errorf("导出 ArrayBuffer 失败: 类型断言失败")
}

// blobToBytes 将 Blob/File 转换为字节数组
func (h *BodyTypeHandler) blobToBytes(obj *goja.Object) ([]byte, string, error) {
	// 方案 1: 检查 __blobData（internal blob 包的实现）
	blobDataVal := obj.Get("__blobData")
	if !goja.IsUndefined(blobDataVal) && blobDataVal != nil {
		blobData := blobDataVal.Export()

		// 尝试类型断言为 blob.JSBlob
		if jsBlob, ok := blobData.(*blob.JSBlob); ok {
			return jsBlob.GetData(), jsBlob.GetType(), nil
		}

		// 尝试类型断言为 blob.JSFile
		if jsFile, ok := blobData.(*blob.JSFile); ok {
			return jsFile.GetData(), jsFile.GetType(), nil
		}
	}

	// 方案 2: 检查 __data（FormData/fetch 模块的简化 Blob 实现）
	dataVal := obj.Get("__data")
	if !goja.IsUndefined(dataVal) && dataVal != nil && !goja.IsNull(dataVal) {
		exported := dataVal.Export()
		if data, ok := exported.([]byte); ok {
			// 获取 type 属性
			var contentType string
			typeVal := obj.Get("type")
			if typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
				contentType = typeVal.String()
			}
			return data, contentType, nil
		}
	}

	return nil, "", fmt.Errorf("无法提取 Blob/File 数据: 无效类型")
}

// urlSearchParamsToString 将 URLSearchParams 转换为字符串
func (h *BodyTypeHandler) urlSearchParamsToString(obj *goja.Object) (string, error) {
	// URLSearchParams 有 toString() 方法
	toStringMethod := obj.Get("toString")
	if goja.IsUndefined(toStringMethod) {
		return "", fmt.Errorf("URLSearchParams 缺少 toString 方法")
	}

	// 调用 toString()
	if callable, ok := goja.AssertFunction(toStringMethod); ok {
		result, err := callable(obj)
		if err != nil {
			return "", fmt.Errorf("调用 URLSearchParams.toString() 失败: %w", err)
		}
		return result.String(), nil
	}

	return "", fmt.Errorf("URLSearchParams.toString 不可调用")
}
