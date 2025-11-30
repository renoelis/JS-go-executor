package jsbuffer

import (
	"fmt"
	"strconv"

	"github.com/dop251/goja"
)

// ExtractView 返回 Buffer/TypedArray 底层的视图切片（可能是零拷贝）。
// length 为逻辑长度；<=0 时自动按数据长度与 byteOffset 计算。
func ExtractView(runtime *goja.Runtime, bufferObj *goja.Object, length int64) ([]byte, bool) {
	if runtime == nil || bufferObj == nil {
		return nil, false
	}

	// 读取 byteOffset（Buffer/TypedArray 可能带偏移）
	getByteOffset := func() int64 {
		offsetVal := bufferObj.Get("byteOffset")
		if offsetVal != nil && !goja.IsUndefined(offsetVal) && !goja.IsNull(offsetVal) {
			return offsetVal.ToInteger()
		}
		return 0
	}

	// 按 offset/length 构造视图
	buildView := func(data []byte) ([]byte, bool) {
		if data == nil {
			return nil, false
		}
		byteOffset := getByteOffset()
		viewLen := length
		if viewLen <= 0 {
			viewLen = int64(len(data)) - byteOffset
		}
		if byteOffset < 0 || byteOffset > int64(len(data)) {
			return nil, false
		}
		end := byteOffset + viewLen
		if end > int64(len(data)) {
			end = int64(len(data))
		}
		if byteOffset > end {
			return nil, false
		}
		return data[byteOffset:end], true
	}

	// 1) 直接 Export 底层数据
	if exported := bufferObj.Export(); exported != nil {
		switch v := exported.(type) {
		case goja.ArrayBuffer:
			if view, ok := buildView(v.Bytes()); ok {
				return view, true
			}
		case []byte:
			if view, ok := buildView(v); ok {
				return view, true
			}
		}
	}

	// 2) 通过 buffer 属性获取 ArrayBuffer
	if bufVal := bufferObj.Get("buffer"); bufVal != nil && !goja.IsUndefined(bufVal) && !goja.IsNull(bufVal) {
		if bufObj := bufVal.ToObject(runtime); bufObj != nil {
			if exported := bufObj.Export(); exported != nil {
				if ab, ok := exported.(goja.ArrayBuffer); ok {
					if view, ok := buildView(ab.Bytes()); ok {
						return view, true
					}
				}
			}
		}
	}

	return nil, false
}

// CopyBytes 将 JS Buffer/TypedArray 数据复制到 Go 字节切片，优先利用底层视图，失败时回退到逐字节读取。
func CopyBytes(runtime *goja.Runtime, bufferObj *goja.Object) ([]byte, error) {
	if bufferObj == nil {
		return nil, fmt.Errorf("buffer object is nil")
	}

	lengthVal := bufferObj.Get("length")
	if lengthVal == nil || goja.IsUndefined(lengthVal) || goja.IsNull(lengthVal) {
		return nil, fmt.Errorf("buffer object has no length property")
	}

	length := int(lengthVal.ToInteger())
	if length <= 0 {
		return []byte{}, nil
	}

	// 优先使用零拷贝视图，再做一次 copy，避免逐属性读取
	if view, ok := ExtractView(runtime, bufferObj, int64(length)); ok {
		copyLen := len(view)
		if copyLen > length {
			copyLen = length
		}
		data := make([]byte, copyLen)
		copy(data, view)
		return data, nil
	}

	// 次优：尝试 toJSON() 提供的 data 数组
	if toJSONVal := bufferObj.Get("toJSON"); !goja.IsUndefined(toJSONVal) && !goja.IsNull(toJSONVal) {
		if toJSON, ok := goja.AssertFunction(toJSONVal); ok {
			if result, err := toJSON(bufferObj); err == nil && !goja.IsUndefined(result) && !goja.IsNull(result) {
				if resultObj := result.ToObject(runtime); resultObj != nil {
					if dataVal := resultObj.Get("data"); !goja.IsUndefined(dataVal) && !goja.IsNull(dataVal) {
						if dataObj := dataVal.ToObject(runtime); dataObj != nil {
							if lenVal := dataObj.Get("length"); !goja.IsUndefined(lenVal) && !goja.IsNull(lenVal) {
								dataLen := int(lenVal.ToInteger())
								if dataLen < 0 {
									dataLen = 0
								}
								data := make([]byte, dataLen)
								for i := 0; i < dataLen; i++ {
									if v := dataObj.Get(strconv.Itoa(i)); !goja.IsUndefined(v) && !goja.IsNull(v) {
										data[i] = byte(v.ToInteger())
									}
								}
								return data, nil
							}
						}
					}
				}
			}
		}
	}

	// 最后回退：逐属性读取
	data := make([]byte, length)
	for i := 0; i < length; i++ {
		val := bufferObj.Get(strconv.Itoa(i))
		if goja.IsUndefined(val) || goja.IsNull(val) {
			data[i] = 0
		} else {
			data[i] = byte(val.ToInteger())
		}
	}

	return data, nil
}
