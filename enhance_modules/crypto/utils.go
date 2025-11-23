package crypto

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"strconv"
	"strings"

	ed448lib "github.com/cloudflare/circl/sign/ed448"
	"github.com/dop251/goja"
)

// ============================================================================
// 🔥 工具函数
// ============================================================================

// SafeGetString 安全获取字符串
// 注意：对于 Symbol 类型，会返回空字符串（调用方需要额外检查）
func SafeGetString(val goja.Value) string {
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return ""
	}
	// 检查是否是 Symbol 类型
	if exported := val.Export(); exported != nil {
		// Symbol 类型在 Go 中导出为特殊类型，需要检查
		exportedStr := fmt.Sprintf("%T", exported)
		if strings.Contains(exportedStr, "Symbol") {
			return "" // Symbol 返回空字符串，让调用方检查
		}
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
	typeVal := opts.Get("type")
	typ := strings.ToLower(SafeGetString(typeVal))
	if typ == "" {
		// 对 DER 格式，Node 要求必须显式提供 type（spki/pkcs1/pkcs8）
		panic(runtime.NewTypeError("The \"type\" property is required for DER format keys"))
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
	case "spki":
		pemType = "PUBLIC KEY"
	case "pkcs1":
		// pkcs1 在 Node.js 中既可以表示 RSA 公钥也可以表示 RSA 私钥：
		// - createPublicKey({ format: 'der', type: 'pkcs1' }) 使用 RSAPublicKey 结构
		// - createPrivateKey({ format: 'der', type: 'pkcs1' }) 使用 RSAPrivateKey 结构
		// 这里优先尝试按私钥解析；若失败则视为公钥，以与 Node 行为对齐。
		if _, err := x509.ParsePKCS1PrivateKey(der); err == nil {
			pemType = "RSA PRIVATE KEY"
		} else {
			pemType = "RSA PUBLIC KEY"
		}
	case "pkcs8":
		pemType = "PRIVATE KEY"
	case "sec1":
		pemType = "EC PRIVATE KEY"
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("不支持的 DER type: %s (支持: spki, pkcs1, pkcs8, sec1)", typ)))
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

	// 首先检查Symbol（最优先 - 在任何Export之前）
	// Symbol在goja中是*goja.Symbol类型，不是Object
	if _, isSymbol := value.(*goja.Symbol); isSymbol {
		return nil, fmt.Errorf("The \"buffer\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, or DataView. Received type symbol")
	}

	// Export值用于后续类型检查
	exported := value.Export()

	// 显式拒绝其他非法类型（function、boolean 等）
	switch exported.(type) {
	case bool:
		return nil, fmt.Errorf("data must be a string or a buffer-like object")
	case func(goja.FunctionCall) goja.Value, func(goja.ConstructorCall) *goja.Object:
		return nil, fmt.Errorf("data must be a string or a buffer-like object")
	case int, int64, float64:
		// 纯数字类型也应该拒绝（除非在特定上下文）
		return nil, fmt.Errorf("data must be a string or a buffer-like object")
	}

	// 1. 字符串
	if str, ok := exported.(string); ok {
		return []byte(str), nil
	}

	// 2. 对象类型 (Buffer, ArrayBuffer, TypedArray, DataView, KeyObject 等)
	if obj, ok := value.(*goja.Object); ok && obj != nil {
		// 特殊处理：对称密钥 KeyObject（type: 'secret'），从 _key 属性中提取真实字节
		if t := obj.Get("type"); t != nil && !goja.IsUndefined(t) && !goja.IsNull(t) {
			if strings.ToLower(SafeGetString(t)) == "secret" {
				if keyVal := obj.Get("_key"); keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
					// 递归调用 ConvertToBytes 处理 _key（通常是 Buffer）
					return ConvertToBytes(runtime, keyVal)
				}
			}
		}

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

		// 可能是 Buffer/TypedArray/ArrayBuffer，尝试转换为字符串
		if bytes, err := ConvertToBytes(runtime, obj); err == nil && bytes != nil {
			return string(bytes)
		}
	}

	// 默认作为字符串处理
	return SafeGetString(keyArg)
}

// ExtractKeyPEMWithEncoding 从参数中提取 PEM 格式的密钥，支持 encoding 参数
// encoding 可以是: utf8, hex, base64, latin1, binary 等
func ExtractKeyPEMWithEncoding(runtime *goja.Runtime, keyArg goja.Value, encoding string) string {
	// 如果是对象且有 key 属性，先提取 key
	if obj, ok := keyArg.(*goja.Object); ok && obj != nil {
		// 检查是否是 { key: ... } 格式的对象
		if keyVal := obj.Get("key"); keyVal != nil && !goja.IsUndefined(keyVal) {
			// 检查是否嵌套了 key 对象（不允许）
			if keyValObj, ok := keyVal.(*goja.Object); ok && keyValObj != nil {
				// 如果 keyVal 本身也有 key 属性，这是无效的嵌套
				if nestedKey := keyValObj.Get("key"); nestedKey != nil && !goja.IsUndefined(nestedKey) {
					panic(runtime.NewTypeError("The \"key\" property cannot be a nested object with its own \"key\" property"))
				}
			}

			// 递归处理 key 值
			return ExtractKeyPEMWithEncoding(runtime, keyVal, encoding)
		}

		// 检查是否是 KeyObject
		if keyType := obj.Get("type"); !goja.IsUndefined(keyType) && !goja.IsNull(keyType) {
			typeStr := SafeGetString(keyType)
			if typeStr == "public" || typeStr == "private" {
				// 是 KeyObject，使用 ExtractKeyPEM
				return ExtractKeyPEM(runtime, keyArg)
			}
		}

		// 可能是 Buffer/TypedArray/ArrayBuffer
		if bytes, err := ConvertToBytes(runtime, obj); err == nil && bytes != nil {
			// Buffer/TypedArray/ArrayBuffer 不受 encoding 影响，直接转换为字符串
			return string(bytes)
		}
	}

	// 字符串类型，根据 encoding 解码
	if encoding == "" || encoding == "utf8" || encoding == "utf-8" {
		// 默认 UTF-8
		return SafeGetString(keyArg)
	}

	// 获取字符串值
	strVal := SafeGetString(keyArg)
	if strVal == "" {
		return ""
	}

	// 根据 encoding 解码
	switch encoding {
	case "hex":
		// hex 解码
		if decoded, err := hex.DecodeString(strVal); err == nil {
			return string(decoded)
		}
		return strVal // 解码失败，返回原始字符串

	case "base64":
		// base64 解码
		decoded := decodeBase64Lenient(strVal)
		if decoded != nil {
			return string(decoded)
		}
		return strVal

	case "latin1", "binary":
		// latin1 和 binary 在 Go 中直接当作字节序列处理
		return strVal

	default:
		// 未知编码，作为 UTF-8 处理
		return strVal
	}
}

// ExtractKeyFromJWK 从 JWK 格式提取密钥并转换为 PEM 格式
// 支持 RSA、EC (ECDSA)、OKP (Ed25519/Ed448) 密钥类型
func ExtractKeyFromJWK(runtime *goja.Runtime, keyArg goja.Value) string {
	// 将 goja.Value 转换为 map[string]interface{}
	var jwkMap map[string]interface{}

	if obj, ok := keyArg.(*goja.Object); ok && obj != nil {
		exported := obj.Export()
		if m, ok := exported.(map[string]interface{}); ok {
			jwkMap = m
		} else {
			panic(runtime.NewTypeError("JWK key must be an object"))
		}
	} else {
		panic(runtime.NewTypeError("JWK key must be an object"))
	}

	// 使用 JWKToPublicKey 或 JWKToPrivateKey 转换
	// 先检查是否有私钥字段 'd'
	hasPrivateKey := false
	if _, exists := jwkMap["d"]; exists {
		hasPrivateKey = true
	}

	if hasPrivateKey {
		// 私钥
		privateKey, keyType, err := JWKToPrivateKey(jwkMap)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("Failed to parse JWK private key: %w", err)))
		}

		// 将私钥转换为 PEM
		switch strings.ToLower(keyType) {
		case "rsa":
			if rsaKey, ok := privateKey.(*rsa.PrivateKey); ok {
				derBytes := x509.MarshalPKCS1PrivateKey(rsaKey)
				pemBlock := &pem.Block{Type: "RSA PRIVATE KEY", Bytes: derBytes}
				return string(pem.EncodeToMemory(pemBlock))
			}
		case "ec":
			if ecKey, ok := privateKey.(*ecdsa.PrivateKey); ok {
				derBytes, err := x509.MarshalECPrivateKey(ecKey)
				if err == nil {
					pemBlock := &pem.Block{Type: "EC PRIVATE KEY", Bytes: derBytes}
					return string(pem.EncodeToMemory(pemBlock))
				}
			}
		case "ed25519":
			if edKey, ok := privateKey.(ed25519.PrivateKey); ok {
				derBytes, err := x509.MarshalPKCS8PrivateKey(edKey)
				if err == nil {
					pemBlock := &pem.Block{Type: "PRIVATE KEY", Bytes: derBytes}
					return string(pem.EncodeToMemory(pemBlock))
				}
			}
		case "ed448":
			if edKey, ok := privateKey.(ed448lib.PrivateKey); ok {
				derBytes, err := x509.MarshalPKCS8PrivateKey(edKey)
				if err == nil {
					pemBlock := &pem.Block{Type: "PRIVATE KEY", Bytes: derBytes}
					return string(pem.EncodeToMemory(pemBlock))
				}
			}
		}
		panic(runtime.NewGoError(fmt.Errorf("Unsupported JWK private key type: %s", keyType)))
	} else {
		// 公钥
		publicKey, keyType, err := JWKToPublicKey(jwkMap)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("Failed to parse JWK public key: %w", err)))
		}

		// 将公钥转换为 PEM
		switch strings.ToLower(keyType) {
		case "rsa":
			if rsaKey, ok := publicKey.(*rsa.PublicKey); ok {
				derBytes, err := x509.MarshalPKIXPublicKey(rsaKey)
				if err == nil {
					pemBlock := &pem.Block{Type: "PUBLIC KEY", Bytes: derBytes}
					return string(pem.EncodeToMemory(pemBlock))
				}
			}
		case "ec":
			if ecKey, ok := publicKey.(*ecdsa.PublicKey); ok {
				derBytes, err := x509.MarshalPKIXPublicKey(ecKey)
				if err == nil {
					pemBlock := &pem.Block{Type: "PUBLIC KEY", Bytes: derBytes}
					return string(pem.EncodeToMemory(pemBlock))
				}
			}
		case "ed25519":
			if edKey, ok := publicKey.(ed25519.PublicKey); ok {
				derBytes, err := x509.MarshalPKIXPublicKey(edKey)
				if err == nil {
					pemBlock := &pem.Block{Type: "PUBLIC KEY", Bytes: derBytes}
					return string(pem.EncodeToMemory(pemBlock))
				}
			}
		case "ed448":
			if edKey, ok := publicKey.(ed448lib.PublicKey); ok {
				derBytes, err := x509.MarshalPKIXPublicKey(edKey)
				if err == nil {
					pemBlock := &pem.Block{Type: "PUBLIC KEY", Bytes: derBytes}
					return string(pem.EncodeToMemory(pemBlock))
				}
			}
		}
		panic(runtime.NewGoError(fmt.Errorf("Unsupported JWK public key type: %s", keyType)))
	}
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
