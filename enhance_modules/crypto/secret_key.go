package crypto

import (
	"crypto/rand"
	"fmt"
	"strings"

	"github.com/dop251/goja"
)

// ============================================================================
// 🔥 对称密钥 KeyObject 及便捷函数
// ============================================================================

// createSecretKeyObject 根据原始密钥字节创建一个 KeyObject（type: 'secret'）
func createSecretKeyObject(runtime *goja.Runtime, keyBytes []byte) goja.Value {
	obj := runtime.NewObject()

	// 为安全起见，拷贝一份内部密钥，避免外部对同一底层切片的修改
	internalKey := make([]byte, len(keyBytes))
	copy(internalKey, keyBytes)
	keyBytes = internalKey

	// Node.js: KeyObject.type = 'secret'（只读）
	obj.DefineDataProperty("type", runtime.ToValue("secret"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	// Node.js: symmetricKeySize 以字节表示（只读）
	obj.DefineDataProperty("symmetricKeySize", runtime.ToValue(len(keyBytes)), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)

	// 将真实密钥缓存为 Buffer，供后续 API（如 cipher/hmac）通过 ConvertToBytes 读取
	obj.Set("_key", CreateBuffer(runtime, keyBytes))

	// export([options])
	// - 对称密钥行为需与 Node.js v25 对齐：
	//   * 无参数                → Buffer
	//   * options 为对象       → 读取 options.format:
	//       - 'buffer' 或未设置 → Buffer
	//       - 'jwk'            → 返回 { kty: 'oct', k: base64url(key) }
	//       - 其他             → 抛出 TypeError
	//   * 其余情况（字符串等） → 作为编码字符串处理，保持旧行为兼容
	obj.Set("export", func(call goja.FunctionCall) goja.Value {
		// 每次导出都返回新的 Buffer 拷贝，避免外部修改影响内部密钥
		cloneKey := func() []byte {
			out := make([]byte, len(keyBytes))
			copy(out, keyBytes)
			return out
		}

		// 无参数或显式传 undefined：默认返回 Buffer
		if len(call.Arguments) == 0 || goja.IsUndefined(call.Arguments[0]) {
			return CreateBuffer(runtime, cloneKey())
		}

		first := call.Arguments[0]

		// Node.js: export() 只接受 options 对象；null 或其他原始值都抛 TypeError
		if goja.IsNull(first) {
			panic(runtime.NewTypeError("The \"options\" argument must be of type object. Received null"))
		}

		opts, ok := first.(*goja.Object)
		if !ok || opts == nil {
			panic(runtime.NewTypeError("The \"options\" argument must be of type object"))
		}

		formatVal := opts.Get("format")
		if formatVal == nil || goja.IsUndefined(formatVal) || goja.IsNull(formatVal) {
			// 对称密钥默认 format: 'buffer'
			return CreateBuffer(runtime, cloneKey())
		}

		// 与 Node v25 对齐：format 区分大小写，仅接受精确的 'buffer' 和 'jwk'
		format := SafeGetString(formatVal)

		switch format {
		case "buffer":
			return CreateBuffer(runtime, cloneKey())
		case "jwk":
			// JWK 对称密钥: kty=oct, k=base64url(keyBytes)
			jwk := runtime.NewObject()
			jwk.Set("kty", "oct")
			jwk.Set("k", EncodeBase64URL(keyBytes))
			return jwk
		default:
			// 与 Node v25 一致：对称密钥仅支持 buffer/jwk
			panic(runtime.NewTypeError(
				fmt.Sprintf("The property 'options.format' is invalid for symmetric keys. Received '%s'", format),
			))
		}
	})

	// equals(otherKey)
	obj.Set("equals", func(call goja.FunctionCall) goja.Value {
		// Node.js: 参数缺失、undefined、null 或非 KeyObject 时抛 TypeError
		if len(call.Arguments) == 0 || goja.IsUndefined(call.Arguments[0]) || goja.IsNull(call.Arguments[0]) {
			panic(runtime.NewTypeError("The \"otherKey\" argument must be an instance of KeyObject with type \"secret\""))
		}

		otherVal := call.Arguments[0]
		otherObj, ok := otherVal.(*goja.Object)
		if !ok || otherObj == nil {
			panic(runtime.NewTypeError("The \"otherKey\" argument must be an instance of KeyObject with type \"secret\""))
		}

		// 读取对方的 type 属性，用于区分 KeyObject 类型
		otherTypeVal := otherObj.Get("type")
		if otherTypeVal == nil || goja.IsUndefined(otherTypeVal) || goja.IsNull(otherTypeVal) {
			// 没有 type 属性，视为非 KeyObject，抛 TypeError
			panic(runtime.NewTypeError("The \"otherKey\" argument must be an instance of KeyObject with type \"secret\""))
		}
		otherType := strings.ToLower(SafeGetString(otherTypeVal))
		if otherType != "secret" {
			// Node.js: 不同类型的 KeyObject（如 public/private）比较时返回 false，而不是抛错
			return runtime.ToValue(false)
		}

		// 自反性：同一对象直接返回 true
		if otherObj == obj {
			return runtime.ToValue(true)
		}

		selfBytes, err := ConvertToBytes(runtime, obj)
		if err != nil {
			panic(runtime.NewTypeError("The \"otherKey\" argument must be an instance of KeyObject with type \"secret\""))
		}
		otherBytes, err := ConvertToBytes(runtime, otherObj)
		if err != nil {
			panic(runtime.NewTypeError("The \"otherKey\" argument must be an instance of KeyObject with type \"secret\""))
		}

		if len(selfBytes) != len(otherBytes) {
			return runtime.ToValue(false)
		}
		for i := range selfBytes {
			if selfBytes[i] != otherBytes[i] {
				return runtime.ToValue(false)
			}
		}

		return runtime.ToValue(true)
	})

	return obj
}

// CreateSecretKey 实现 crypto.createSecretKey(key[, encoding])
func CreateSecretKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createSecretKey 需要 key 参数"))
	}

	keyVal := call.Arguments[0]
	var keyBytes []byte
	var err error

	// 如果提供了 encoding，则按字符串+编码解析
	if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
		encVal := call.Arguments[1]
		enc := strings.ToLower(SafeGetString(encVal))

		// 仅在 enc 非空字符串时做显式校验
		if enc != "" {
			valid := map[string]bool{
				"utf8":      true,
				"utf-8":     true,
				"hex":       true,
				"base64":    true,
				"base64url": true,
				"latin1":    true,
				"binary":    true,
				"ascii":     true,
				"utf16le":   true,
				"ucs2":      true,
				"ucs-2":     true,
			}
			if !valid[enc] {
				// 与 Node 行为一致：未知编码抛 TypeError
				panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", enc)))
			}
		}

		keyBytes = parseDataWithEncoding(runtime, []goja.Value{keyVal, encVal})
	} else {
		keyBytes, err = ConvertToBytes(runtime, keyVal)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("The \"key\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. %v", err)))
		}
	}

	return createSecretKeyObject(runtime, keyBytes)
}

// getPositiveIntOption 读取 options 中的正整数属性
func getPositiveIntOption(runtime *goja.Runtime, opts *goja.Object, name string) int {
	if opts == nil {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"options.%s\" property must be of type number. Received undefined", name)))
	}
	val := opts.Get(name)
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		panic(runtime.NewTypeError(fmt.Sprintf("The \"options.%s\" property must be of type number. Received undefined", name)))
	}

	// 检查是否为数字类型（不接受字符串数字）
	exported := val.Export()
	switch exported.(type) {
	case int64, float64, int, int32, uint32, int16, uint16, int8, uint8, uint64, float32:
		// 数字类型，OK
	default:
		// 非数字类型
		panic(runtime.NewTypeError(fmt.Sprintf("The \"options.%s\" property must be of type number. Received type string ('%v')", name, exported)))
	}

	// 获取数字值
	floatVal := val.ToFloat()

	// 检查 NaN
	if floatVal != floatVal { // NaN check
		panic(runtime.NewTypeError(fmt.Sprintf("The value of \"options.%s\" is out of range. It must be >= 8 && <= 2147483647. Received NaN", name)))
	}

	// 检查 Infinity
	if floatVal > float64(CryptoMaxInt32) || floatVal < -float64(CryptoMaxInt32) {
		panic(runtime.NewTypeError(fmt.Sprintf("The value of \"options.%s\" is out of range. It must be >= 8 && <= 2147483647. Received %v", name, floatVal)))
	}

	// 检查是否为整数
	if floatVal != float64(int64(floatVal)) {
		panic(runtime.NewTypeError(fmt.Sprintf("The value of \"options.%s\" is out of range. It must be an integer. Received %v", name, floatVal)))
	}

	n := int(floatVal)

	// 检查范围：8 <= n <= 2147483647
	if n < 8 {
		panic(runtime.NewTypeError(fmt.Sprintf("The value of \"options.%s\" is out of range. It must be >= 8 && <= 2147483647. Received %d", name, n)))
	}
	if n > CryptoMaxInt32 {
		panic(runtime.NewTypeError(fmt.Sprintf("The value of \"options.%s\" is out of range. It must be >= 8 && <= 2147483647. Received %d", name, n)))
	}

	return n
}

// GenerateKeySync 实现 crypto.generateKeySync(type, options)
func GenerateKeySync(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("generateKeySync 需要 type 和 options 参数"))
	}

	// 严格检查 type 参数：不转换大小写，必须精确匹配
	typeVal := call.Arguments[0]
	if goja.IsNull(typeVal) || goja.IsUndefined(typeVal) {
		panic(runtime.NewTypeError("The \"type\" argument must be of type string"))
	}
	typeStr := SafeGetString(typeVal)
	if typeStr == "" {
		panic(runtime.NewTypeError("The \"type\" argument must be of type string"))
	}

	// 只接受小写的 "hmac" 和 "aes"，大写或其他值都拒绝
	if typeStr != "hmac" && typeStr != "aes" {
		panic(runtime.NewTypeError(fmt.Sprintf("Unsupported key type: %s", typeStr)))
	}

	opts, ok := call.Arguments[1].(*goja.Object)
	if !ok || opts == nil {
		panic(runtime.NewTypeError("The \"options\" argument must be of type object"))
	}

	switch typeStr {
	case "hmac":
		// Node.js: length 以 bits 表示，最小 8 bits；非 8 的倍数时截断到 floor(length/8)
		lengthBits := getPositiveIntOption(runtime, opts, "length")
		// getPositiveIntOption 已经检查了 >= 8 和 <= 2147483647
		byteLen := lengthBits / 8
		if byteLen == 0 {
			byteLen = 1
		}
		key := make([]byte, byteLen)
		if _, err := rand.Read(key); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("生成 HMAC 密钥失败: %w", err)))
		}
		return createSecretKeyObject(runtime, key)

	case "aes":
		// AES 典型长度：128/192/256 bits
		lengthBits := getPositiveIntOption(runtime, opts, "length")
		if lengthBits != 128 && lengthBits != 192 && lengthBits != 256 {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid AES key length: %d (must be 128, 192, or 256)", lengthBits)))
		}
		byteLen := lengthBits / 8
		key := make([]byte, byteLen)
		if _, err := rand.Read(key); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("生成 AES 密钥失败: %w", err)))
		}
		return createSecretKeyObject(runtime, key)

	default:
		panic(runtime.NewTypeError(fmt.Sprintf("Unsupported key type: %s", typeStr)))
	}
}

// GenerateKey 实现 crypto.generateKey(type, options, callback)
func GenerateKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("generateKey 需要 type, options, callback 参数"))
	}

	typeVal := call.Arguments[0]
	optsVal := call.Arguments[1]
	cbVal := call.Arguments[2]

	cbObj, ok := cbVal.(*goja.Object)
	if !ok {
		panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
	}
	callback, ok := goja.AssertFunction(cbObj)
	if !ok {
		panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
	}

	// 严格检查 type 参数：不转换大小写
	if goja.IsNull(typeVal) || goja.IsUndefined(typeVal) {
		panic(runtime.NewTypeError("The \"type\" argument must be of type string"))
	}
	typeStr := SafeGetString(typeVal)
	if typeStr == "" {
		panic(runtime.NewTypeError("The \"type\" argument must be of type string"))
	}

	// 只接受小写的 "hmac" 和 "aes"
	if typeStr != "hmac" && typeStr != "aes" {
		panic(runtime.NewTypeError(fmt.Sprintf("Unsupported key type: %s", typeStr)))
	}

	opts, ok := optsVal.(*goja.Object)
	if !ok || opts == nil {
		panic(runtime.NewTypeError("The \"options\" argument must be of type object"))
	}

	// 解析长度，但不在此阶段做耗时操作（只做参数校验）
	lengthBits := getPositiveIntOption(runtime, opts, "length")
	var byteLen int
	switch typeStr {
	case "hmac":
		if lengthBits < 8 {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid key length: %d (must be >= 8)", lengthBits)))
		}
		byteLen = lengthBits / 8
		if byteLen == 0 {
			byteLen = 1
		}
	case "aes":
		if lengthBits != 128 && lengthBits != 192 && lengthBits != 256 {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid key length: %d (must be 128, 192, or 256)", lengthBits)))
		}
		byteLen = lengthBits / 8
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("Unsupported key type: %s", typeStr)))
	}

	setImmediate := runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		asyncCallback := func(goja.FunctionCall) goja.Value {
			var errVal goja.Value = goja.Null()
			var resVal goja.Value = goja.Undefined()
			defer func() {
				_, _ = callback(goja.Undefined(), errVal, resVal)
			}()

			key := make([]byte, byteLen)
			if _, err := rand.Read(key); err != nil {
				errVal = runtime.NewGoError(fmt.Errorf("生成密钥失败: %w", err))
				return goja.Undefined()
			}
			resVal = createSecretKeyObject(runtime, key)
			return goja.Undefined()
		}

		_, _ = setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
		return goja.Undefined()
	}

	// 无 setImmediate，降级同步执行
	key := make([]byte, byteLen)
	if _, err := rand.Read(key); err != nil {
		errVal := runtime.NewGoError(fmt.Errorf("生成密钥失败: %w", err))
		_, _ = callback(goja.Undefined(), errVal, goja.Null())
	} else {
		_, _ = callback(goja.Undefined(), goja.Null(), createSecretKeyObject(runtime, key))
	}
	return goja.Undefined()
}
