package crypto

import (
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"strconv"
	"strings"

	"github.com/dop251/goja"
)

// ============================================================================
// 🔥 工具函数
// ============================================================================

// SafeGetString 安全获取字符串
func SafeGetString(val goja.Value) string {
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return ""
	}
	if exported := val.Export(); exported != nil {
		return fmt.Sprintf("%v", exported)
	}
	return ""
}

// GetPassphraseBytes 获取 passphrase 的字节表示（支持 String 和 Buffer）
// 与 Node.js 行为一致：String 和 Buffer 应该等价
func GetPassphraseBytes(runtime *goja.Runtime, val goja.Value) ([]byte, error) {
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return nil, nil
	}

	// 先检查是否是字符串（最常见情况）
	if str, ok := val.Export().(string); ok {
		return []byte(str), nil
	}

	// 尝试作为 Buffer/TypedArray/ArrayBuffer 处理
	if _, ok := val.(*goja.Object); ok {
		bytes, err := ConvertToBytes(runtime, val)
		if err == nil && bytes != nil {
			return bytes, nil
		}
		// 如果 ConvertToBytes 失败，尝试作为字符串处理
		str := SafeGetString(val)
		return []byte(str), nil
	}

	// 默认作为字符串处理
	str := SafeGetString(val)
	return []byte(str), nil
}

// ExtractKeyFromDEROptions 从 DER 选项中提取并转换为 PEM
// 处理格式：{ key: Buffer | ArrayBuffer | TypedArray | string, format: 'der', type: 'spki'|'pkcs8'|'pkcs1', encoding?: 'base64'|'hex'|'base64url' }
func ExtractKeyFromDEROptions(runtime *goja.Runtime, opts *goja.Object) string {
	// 提取 key
	keyVal := opts.Get("key")
	if keyVal == nil || goja.IsUndefined(keyVal) || goja.IsNull(keyVal) {
		panic(runtime.NewTypeError("DER 格式需要 key 属性"))
	}

	// 解析 encoding（当 key 是字符串时使用）
	enc := strings.ToLower(SafeGetString(opts.Get("encoding"))) // 可选: base64 | hex | base64url

	// 读取 type（spki/pkcs1/pkcs8）
	typ := strings.ToLower(SafeGetString(opts.Get("type")))
	if typ == "" {
		// 与 Node 常见用法对齐：未给 type 时默认按 spki
		typ = "spki"
	}

	// 将 key 解码为原始 DER 字节
	var der []byte
	var err error

	if _, ok := keyVal.(*goja.Object); !ok {
		// 原始（非对象）——大概率是字符串。若指定了 encoding，严格按 encoding 解码
		s := SafeGetString(keyVal)
		switch enc {
		case "base64":
			der, err = base64.StdEncoding.DecodeString(s)
		case "hex":
			der, err = hex.DecodeString(s)
		case "base64url":
			// 兼容无/有 padding
			der, err = base64.RawURLEncoding.DecodeString(s)
			if err != nil {
				der, err = base64.URLEncoding.DecodeString(s)
			}
		case "":
			// 未声明 encoding，则按原始字节处理
			der = []byte(s)
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("不支持的 encoding: %s (支持: base64, hex, base64url)", enc)))
		}
	} else {
		// 对象（Buffer/TypedArray/ArrayBuffer/DataView 等）
		der, err = ConvertToBytes(runtime, keyVal)
	}

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("无法解析 DER key: %w", err)))
	}
	if len(der) == 0 {
		panic(runtime.NewTypeError("DER key 不能为空"))
	}

	// 选择 PEM 头部
	var pemType string
	switch typ {
	case "spki", "subjectpublickeyinfo":
		pemType = "PUBLIC KEY"
	case "pkcs1":
		// 自动探测：优先判断是否为 PKCS#1 私钥，否则尝试公钥
		if _, perr := x509.ParsePKCS1PrivateKey(der); perr == nil {
			pemType = "RSA PRIVATE KEY"
		} else if _, perr := x509.ParsePKCS1PublicKey(der); perr == nil {
			pemType = "RSA PUBLIC KEY"
		} else {
			panic(runtime.NewTypeError("无法识别的 PKCS#1 DER：既非私钥也非公钥"))
		}
	case "pkcs8":
		pemType = "PRIVATE KEY"
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("不支持的 DER type: %s (支持: spki, pkcs1, pkcs8)", typ)))
	}

	// 包装为 PEM
	block := &pem.Block{Type: pemType, Bytes: der}
	return string(pem.EncodeToMemory(block))
}

// ExtractArrayBufferBytes 从 ArrayBuffer 对象提取字节数组
func ExtractArrayBufferBytes(runtime *goja.Runtime, obj *goja.Object) ([]byte, error) {
	if obj == nil {
		return nil, fmt.Errorf("ArrayBuffer object is nil")
	}

	// 方法1：尝试直接导出
	if exported := obj.Export(); exported != nil {
		if bytes, ok := exported.([]byte); ok {
			return bytes, nil
		}
	}

	// 方法2：通过 Uint8Array 视图读取（通用方法）
	ctor := runtime.Get("Uint8Array")
	if goja.IsUndefined(ctor) || goja.IsNull(ctor) {
		return nil, fmt.Errorf("Uint8Array constructor not available")
	}

	ctorObj, ok := ctor.(*goja.Object)
	if !ok {
		return nil, fmt.Errorf("Uint8Array is not a constructor")
	}

	// 创建 Uint8Array 视图：new Uint8Array(arrayBuffer)
	viewObj, err := runtime.New(ctorObj, obj)
	if err != nil {
		return nil, fmt.Errorf("failed to create Uint8Array view: %w", err)
	}

	lengthVal := viewObj.Get("length")
	if goja.IsUndefined(lengthVal) || goja.IsNull(lengthVal) {
		return nil, fmt.Errorf("Uint8Array view has no length")
	}

	length := int(lengthVal.ToInteger())
	out := make([]byte, length)
	for i := 0; i < length; i++ {
		val := viewObj.Get(strconv.Itoa(i))
		if !goja.IsUndefined(val) && !goja.IsNull(val) {
			out[i] = byte(val.ToInteger())
		}
	}

	return out, nil
}

// ConvertToBytes 将各种输入类型转换为字节数组
// 支持: string, Buffer, ArrayBuffer, TypedArray, DataView
// allowArrayBuffer: 是否允许直接传入 ArrayBuffer（某些 API 如 createHmac key 参数允许，但 update() 方法不允许）
func ConvertToBytes(runtime *goja.Runtime, value goja.Value) ([]byte, error) {
	return convertToBytesInternal(runtime, value, true)
}

// ConvertToBytesStrict 严格模式：不接受 ArrayBuffer，只接受 TypedArray/DataView
// Node.js 的 Hash.update(), Hmac.update(), Sign.update(), Verify.update() 使用此模式
func ConvertToBytesStrict(runtime *goja.Runtime, value goja.Value) ([]byte, error) {
	return convertToBytesInternal(runtime, value, false)
}

// convertToBytesInternal 内部实现
func convertToBytesInternal(runtime *goja.Runtime, value goja.Value, allowArrayBuffer bool) ([]byte, error) {
	if goja.IsUndefined(value) || goja.IsNull(value) {
		return nil, fmt.Errorf("值为 undefined 或 null")
	}

	// 1. 字符串
	if str, ok := value.Export().(string); ok {
		return []byte(str), nil
	}

	// 2. 对象类型 (Buffer, ArrayBuffer, TypedArray, DataView)
	if obj, ok := value.(*goja.Object); ok && obj != nil {
		className := obj.ClassName()
		bufferProp := obj.Get("buffer")
		byteLengthVal := obj.Get("byteLength")

		// 2.1 处理纯 ArrayBuffer
		if className == "ArrayBuffer" || (byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && (bufferProp == nil || goja.IsUndefined(bufferProp))) {
			if !allowArrayBuffer {
				// Node.js 行为：update() 方法不接受 ArrayBuffer
				return nil, fmt.Errorf("the data argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received an instance of ArrayBuffer")
			}
			backing, err := ExtractArrayBufferBytes(runtime, obj)
			if err != nil {
				return nil, fmt.Errorf("failed to extract ArrayBuffer: %w", err)
			}
			out := make([]byte, len(backing))
			copy(out, backing)
			return out, nil
		}

		// 2.2 处理 TypedArray / DataView
		if bufferProp != nil && !goja.IsUndefined(bufferProp) && !goja.IsNull(bufferProp) &&
			byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {

			byteLength := int(byteLengthVal.ToInteger())
			if byteLength < 0 {
				return nil, fmt.Errorf("invalid byteLength: %d", byteLength)
			}

			byteOffsetVal := obj.Get("byteOffset")
			byteOffset := 0
			if byteOffsetVal != nil && !goja.IsUndefined(byteOffsetVal) && !goja.IsNull(byteOffsetVal) {
				byteOffset = int(byteOffsetVal.ToInteger())
			}

			// 从底层 ArrayBuffer 提取字节
			if bufferObj, ok := bufferProp.(*goja.Object); ok {
				backing, err := ExtractArrayBufferBytes(runtime, bufferObj)
				if err != nil {
					return nil, fmt.Errorf("failed to extract ArrayBuffer: %w", err)
				}
				if byteOffset+byteLength > len(backing) {
					return nil, fmt.Errorf("view is out of range: offset=%d, length=%d, buffer=%d", byteOffset, byteLength, len(backing))
				}
				out := make([]byte, byteLength)
				copy(out, backing[byteOffset:byteOffset+byteLength])
				return out, nil
			}
		}

		// 2.3 Buffer (Node.js Buffer 对象)
		if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			// 检查是否有 _isBuffer 标记
			isBufferVal := obj.Get("_isBuffer")
			if isBufferVal != nil && !goja.IsUndefined(isBufferVal) && !goja.IsNull(isBufferVal) && isBufferVal.ToBoolean() {
				length := int(lengthVal.ToInteger())
				data := make([]byte, length)
				for i := 0; i < length; i++ {
					if val := obj.Get(strconv.Itoa(i)); val != nil && !goja.IsUndefined(val) {
						data[i] = byte(val.ToInteger())
					}
				}
				return data, nil
			}
		}
	}

	// 3. 尝试直接导出
	if exported := value.Export(); exported != nil {
		if bytes, ok := exported.([]byte); ok {
			return bytes, nil
		}
	}

	return nil, fmt.Errorf("无法转换为字节数组: 不支持的类型")
}

// ExtractKeyPEM 从参数中提取 PEM 格式的密钥
// 支持：字符串、KeyObject、{ key: ... } 对象
func ExtractKeyPEM(runtime *goja.Runtime, keyArg goja.Value) string {
	if obj, ok := keyArg.(*goja.Object); ok && obj != nil {
		// 检查是否是 KeyObject（有 type 和 export 方法）
		if keyType := obj.Get("type"); !goja.IsUndefined(keyType) && !goja.IsNull(keyType) {
			typeStr := SafeGetString(keyType)
			if typeStr == "public" || typeStr == "private" {
				// 是 KeyObject，调用 export() 方法
				exportFunc := obj.Get("export")
				if exportFunc != nil && !goja.IsUndefined(exportFunc) {
					// 构造 export 参数
					exportType := "spki"
					if typeStr == "private" {
						exportType = "pkcs8"
					}

					opts := runtime.NewObject()
					opts.Set("type", exportType)
					opts.Set("format", "pem")

					// 尝试调用 export 函数
					if callable, ok := goja.AssertFunction(exportFunc); ok {
						result, err := callable(obj, opts)
						if err == nil && !goja.IsUndefined(result) && !goja.IsNull(result) {
							return SafeGetString(result)
						}
					}
				}

				// 如果 export 失败，尝试直接获取 _pem 或 _handle 属性
				if pemVal := obj.Get("_pem"); pemVal != nil && !goja.IsUndefined(pemVal) && !goja.IsNull(pemVal) {
					return SafeGetString(pemVal)
				}
				if handleVal := obj.Get("_handle"); handleVal != nil && !goja.IsUndefined(handleVal) && !goja.IsNull(handleVal) {
					return SafeGetString(handleVal)
				}
			}
		}

		// 检查是否是 { key: ... } 格式的对象
		if keyVal := obj.Get("key"); keyVal != nil && !goja.IsUndefined(keyVal) {
			// 检查 format
			format := strings.ToLower(SafeGetString(obj.Get("format")))
			if format == "der" {
				// DER 格式，需要转换
				return ExtractKeyFromDEROptions(runtime, obj)
			}
			// 否则递归提取 key 值
			return ExtractKeyPEM(runtime, keyVal)
		}
	}

	// 默认作为字符串处理
	return SafeGetString(keyArg)
}

// CreateBuffer 创建 Buffer 对象
func CreateBuffer(runtime *goja.Runtime, data []byte) goja.Value {
	// 尝试使用全局 Buffer 构造器
	bufferCtor := runtime.Get("Buffer")
	if !goja.IsUndefined(bufferCtor) && !goja.IsNull(bufferCtor) {
		if ctor, ok := bufferCtor.(*goja.Object); ok {
			// 使用 Buffer.from(data)
			fromFunc := ctor.Get("from")
			if !goja.IsUndefined(fromFunc) && !goja.IsNull(fromFunc) {
				if callable, ok := goja.AssertFunction(fromFunc); ok {
					// 创建 Uint8Array - 将 ArrayBuffer 转换为 Value
					arrayBuffer := runtime.NewArrayBuffer(data)
					result, err := callable(ctor, runtime.ToValue(arrayBuffer))
					if err == nil {
						return result
					}
				}
			}
		}
	}

	// 降级方案：创建类 Buffer 对象
	obj := runtime.NewObject()
	obj.Set("_isBuffer", true)
	obj.Set("length", len(data))

	// 设置字节数据
	for i, b := range data {
		obj.Set(strconv.Itoa(i), b)
	}

	// 添加常用方法
	obj.Set("toString", func(call goja.FunctionCall) goja.Value {
		encoding := "utf8"
		if len(call.Arguments) > 0 {
			encoding = SafeGetString(call.Arguments[0])
		}

		switch encoding {
		case "utf8", "utf-8":
			return runtime.ToValue(string(data))
		case "hex":
			return runtime.ToValue(hex.EncodeToString(data))
		case "base64":
			return runtime.ToValue(base64.StdEncoding.EncodeToString(data))
		default:
			return runtime.ToValue(string(data))
		}
	})

	obj.Set("equals", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}

		other, err := ConvertToBytes(runtime, call.Arguments[0])
		if err != nil {
			return runtime.ToValue(false)
		}

		if len(data) != len(other) {
			return runtime.ToValue(false)
		}

		for i := range data {
			if data[i] != other[i] {
				return runtime.ToValue(false)
			}
		}

		return runtime.ToValue(true)
	})

	return obj
}
