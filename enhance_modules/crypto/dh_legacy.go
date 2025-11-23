package crypto

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"math"
	"math/big"
	"strings"

	btcec "github.com/btcsuite/btcd/btcec/v2"
	"github.com/dop251/goja"
)

// ============================================================================
// 🔥 旧式 Diffie-Hellman / ECDH API 兼容层
// ============================================================================

// DiffieHellmanState 保存 createDiffieHellman/getDiffieHellman 的内部状态
// 仅用于 Go 内部，不暴露给 JS

type DiffieHellmanState struct {
	Params  DHParameters
	Private *big.Int
	Public  *big.Int
}

// ECDHState 保存 createECDH 的内部状态
// 仅用于 Go 内部，不暴露给 JS

type ECDHState struct {
	Curve     elliptic.Curve
	CurveName string
	Private   *ecdsa.PrivateKey
}

func newInvalidECDHPublicKeyError(runtime *goja.Runtime) *goja.Object {
	errObj := runtime.NewObject()
	errObj.Set("name", "Error")
	errObj.Set("message", "Public key is not valid for specified curve")
	errObj.Set("code", "ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY")
	return errObj
}

// encodeBytesWithEncoding 将二进制数据按 Node 风格编码返回
func encodeBytesWithEncoding(runtime *goja.Runtime, data []byte, encoding string) goja.Value {
	if encoding == "" {
		return CreateBuffer(runtime, data)
	}

	switch encoding {
	case "hex":
		return runtime.ToValue(hex.EncodeToString(data))
	case "base64":
		return runtime.ToValue(base64.StdEncoding.EncodeToString(data))
	case "base64url":
		// 使用 RFC 4648 URL-safe base64（默认不带 padding）
		return runtime.ToValue(base64.RawURLEncoding.EncodeToString(data))
	case "latin1", "binary":
		// 按 Node.js Buffer 的 latin1/binary 语义：
		// 每个字节 0-255 映射到同值的 UTF-16 码元，再由 Buffer.from(str, 'binary') 取低 8 位还原
		runes := make([]rune, len(data))
		for i, b := range data {
			runes[i] = rune(b)
		}
		return runtime.ToValue(string(runes))
	case "utf8", "utf-8":
		return runtime.ToValue(string(data))
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("Unknown encoding: %s", encoding)))
	}
}

// ECDHConvertKey 实现 crypto.ECDH.convertKey(key, curve[, inputEncoding[, outputEncoding[, format]]])
func ECDHConvertKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("ECDH.convertKey requires key and curve arguments"))
	}

	keyVal := call.Argument(0)
	curveArg := call.Argument(1)
	if goja.IsUndefined(curveArg) || goja.IsNull(curveArg) {
		panic(runtime.NewTypeError("ECDH.convertKey requires curve argument"))
	}
	curveName := curveArg.String()
	curve, _ := resolveECDHCurve(curveName)
	if curve == nil {
		panic(runtime.NewTypeError(fmt.Sprintf("Invalid ECDH curve: %s", curveName)))
	}

	var inputEnc, outputEnc, format string
	if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) && !goja.IsNull(call.Arguments[2]) {
		inputEnc = call.Arguments[2].String()
	}
	if len(call.Arguments) > 3 && !goja.IsUndefined(call.Arguments[3]) && !goja.IsNull(call.Arguments[3]) {
		outputEnc = call.Arguments[3].String()
	}
	format = "uncompressed"
	if len(call.Arguments) > 4 && !goja.IsUndefined(call.Arguments[4]) && !goja.IsNull(call.Arguments[4]) {
		format = call.Arguments[4].String()
	}

	// 解码输入 key 为原始点编码字节
	keyBytes, err := decodeBytesWithEncoding(runtime, keyVal, inputEnc)
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("Invalid key: %v", err)))
	}
	if len(keyBytes) == 0 {
		panic(runtime.NewTypeError("Invalid key: empty"))
	}

	// 解析为 (X, Y)
	x, y, err := unmarshalECPublicKeyWithAnyFormat(curve, keyBytes)
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("Invalid key: %v", err)))
	}

	// 重新按目标格式编码
	outBytes, err := marshalECPublicKeyWithFormat(curve, x, y, format)
	if err != nil {
		panic(runtime.NewTypeError(err.Error()))
	}

	// 根据 outputEncoding 返回 Buffer 或字符串
	return encodeBytesWithEncoding(runtime, outBytes, outputEnc)
}

// decodeBytesWithEncoding 按给定编码将 JS 值解码为字节
func decodeBytesWithEncoding(runtime *goja.Runtime, val goja.Value, encoding string) ([]byte, error) {
	// 未指定编码时，按 Buffer/TypedArray/DataView/ArrayBuffer 处理
	if encoding == "" {
		return ConvertToBytes(runtime, val)
	}

	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return nil, fmt.Errorf("value is undefined or null")
	}

	if s, ok := val.Export().(string); ok {
		switch encoding {
		case "hex":
			return hex.DecodeString(s)
		case "base64":
			return base64.StdEncoding.DecodeString(s)
		case "base64url":
			// 兼容带/不带 padding 的 URL-safe base64
			normalized := strings.TrimSpace(s)
			// 补齐到 4 的倍数长度
			if m := len(normalized) % 4; m != 0 {
				if m == 2 {
					normalized += "=="
				} else if m == 3 {
					normalized += "="
				}
			}
			return base64.URLEncoding.DecodeString(normalized)
		case "latin1", "binary":
			return []byte(s), nil
		default:
			return nil, fmt.Errorf("Unknown encoding: %s", encoding)
		}
	}

	// 非字符串：按照 Node 语义，对 Buffer/TypedArray/DataView/ArrayBuffer 忽略 encoding，直接视为二进制数据
	bytes, err := ConvertToBytes(runtime, val)
	if err != nil {
		return nil, err
	}
	return bytes, nil
}

// newDiffieHellmanObject 根据给定参数创建一个 DiffieHellman JS 对象
func newDiffieHellmanObject(runtime *goja.Runtime, params DHParameters) *goja.Object {
	state := &DiffieHellmanState{
		Params: params,
	}

	obj := runtime.NewObject()

	// generateKeys([encoding]) -> publicKey
	obj.Set("generateKeys", func(call goja.FunctionCall) goja.Value {
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}

		if state.Params.P == nil || state.Params.G == nil {
			panic(runtime.NewTypeError("DH parameters are not set"))
		}

		if state.Private == nil {
			// 私钥范围 [2, p-2]
			one := big.NewInt(1)
			max := new(big.Int).Sub(state.Params.P, one)
			priv, err := rand.Int(rand.Reader, max)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("failed to generate DH private key: %w", err)))
			}
			if priv.Cmp(one) < 0 {
				priv.Add(priv, one)
			}
			state.Private = priv
		}

		state.Public = new(big.Int).Exp(state.Params.G, state.Private, state.Params.P)

		return encodeBytesWithEncoding(runtime, state.Public.Bytes(), encoding)
	})

	// computeSecret(otherPublicKey[, inputEncoding][, outputEncoding])
	obj.Set("computeSecret", func(call goja.FunctionCall) goja.Value {
		if state.Private == nil {
			panic(runtime.NewTypeError("DH private key is not set"))
		}

		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("computeSecret requires otherPublicKey argument"))
		}

		otherVal := call.Arguments[0]
		var inputEnc, outputEnc string
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			inputEnc = call.Arguments[1].String()
		}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) && !goja.IsNull(call.Arguments[2]) {
			outputEnc = call.Arguments[2].String()
		}

		otherBytes, err := decodeBytesWithEncoding(runtime, otherVal, inputEnc)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid otherPublicKey: %v", err)))
		}
		if len(otherBytes) == 0 {
			// 按 Node.js DiffieHellmanGroup 语义，空公钥应抛出 TypeError，
			// 测试用例会检查 name 为 TypeError，或 message 中包含 "empty"/"small"。
			panic(runtime.NewTypeError("Invalid otherPublicKey: empty"))
		}

		otherY := new(big.Int).SetBytes(otherBytes)
		shared := new(big.Int).Exp(otherY, state.Private, state.Params.P)

		return encodeBytesWithEncoding(runtime, shared.Bytes(), outputEnc)
	})

	// getPrime([encoding])
	obj.Set("getPrime", func(call goja.FunctionCall) goja.Value {
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		return encodeBytesWithEncoding(runtime, state.Params.P.Bytes(), encoding)
	})

	// getGenerator([encoding])
	obj.Set("getGenerator", func(call goja.FunctionCall) goja.Value {
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		return encodeBytesWithEncoding(runtime, state.Params.G.Bytes(), encoding)
	})

	// getPublicKey([encoding])
	obj.Set("getPublicKey", func(call goja.FunctionCall) goja.Value {
		if state.Public == nil {
			panic(runtime.NewTypeError("DH public key is not set"))
		}
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		return encodeBytesWithEncoding(runtime, state.Public.Bytes(), encoding)
	})

	// getPrivateKey([encoding])
	obj.Set("getPrivateKey", func(call goja.FunctionCall) goja.Value {
		if state.Private == nil {
			panic(runtime.NewTypeError("DH private key is not set"))
		}
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		return encodeBytesWithEncoding(runtime, state.Private.Bytes(), encoding)
	})

	// setPrivateKey(privateKey[, encoding])
	obj.Set("setPrivateKey", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("setPrivateKey requires privateKey argument"))
		}
		val := call.Arguments[0]
		var encoding string
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			encoding = call.Arguments[1].String()
		}

		bytes, err := decodeBytesWithEncoding(runtime, val, encoding)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid privateKey: %v", err)))
		}
		if len(bytes) == 0 {
			panic(runtime.NewTypeError("Invalid privateKey: empty"))
		}

		priv := new(big.Int).SetBytes(bytes)
		state.Private = priv
		if state.Params.P != nil && state.Params.G != nil {
			state.Public = new(big.Int).Exp(state.Params.G, priv, state.Params.P)
		}
		return goja.Undefined()
	})

	obj.Set("setPublicKey", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("setPublicKey requires publicKey argument"))
		}
		val := call.Arguments[0]
		var encoding string
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			encoding = call.Arguments[1].String()
		}

		bytes, err := decodeBytesWithEncoding(runtime, val, encoding)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid publicKey: %v", err)))
		}
		if len(bytes) == 0 {
			panic(runtime.NewTypeError("Invalid publicKey: empty"))
		}

		state.Public = new(big.Int).SetBytes(bytes)
		return goja.Undefined()
	})

	obj.Set("verifyError", 0)

	return obj
}

// newDiffieHellmanGroupObject 创建用于预定义组的 DiffieHellmanGroup 对象
// 按 Node.js 语义：不允许通过 setPrivateKey/setPublicKey 修改密钥
func newDiffieHellmanGroupObject(runtime *goja.Runtime, params DHParameters) *goja.Object {
	state := &DiffieHellmanState{
		Params: params,
	}

	obj := runtime.NewObject()

	// generateKeys([encoding]) -> publicKey
	obj.Set("generateKeys", func(call goja.FunctionCall) goja.Value {
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}

		if state.Params.P == nil || state.Params.G == nil {
			panic(runtime.NewTypeError("DH parameters are not set"))
		}

		if state.Private == nil {
			// 私钥范围 [2, p-2]
			one := big.NewInt(1)
			max := new(big.Int).Sub(state.Params.P, one)
			priv, err := rand.Int(rand.Reader, max)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("failed to generate DH private key: %w", err)))
			}
			if priv.Cmp(one) < 0 {
				priv.Add(priv, one)
			}
			state.Private = priv
		}

		state.Public = new(big.Int).Exp(state.Params.G, state.Private, state.Params.P)

		return encodeBytesWithEncoding(runtime, state.Public.Bytes(), encoding)
	})

	// computeSecret(otherPublicKey[, inputEncoding][, outputEncoding])
	obj.Set("computeSecret", func(call goja.FunctionCall) goja.Value {
		if state.Private == nil {
			panic(runtime.NewTypeError("DH private key is not set"))
		}

		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("computeSecret requires otherPublicKey argument"))
		}

		otherVal := call.Arguments[0]
		var inputEnc, outputEnc string
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			inputEnc = call.Arguments[1].String()
		}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) && !goja.IsNull(call.Arguments[2]) {
			outputEnc = call.Arguments[2].String()
		}

		otherBytes, err := decodeBytesWithEncoding(runtime, otherVal, inputEnc)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid otherPublicKey: %v", err)))
		}
		if len(otherBytes) == 0 {
			// DiffieHellmanGroup 的 computeSecret 在空公钥时应抛出 TypeError，
			// 测试会检查 error.name === 'TypeError' 或 message 包含 "empty"/"small"。
			panic(runtime.NewTypeError("Invalid otherPublicKey: empty"))
		}

		otherY := new(big.Int).SetBytes(otherBytes)
		shared := new(big.Int).Exp(otherY, state.Private, state.Params.P)

		return encodeBytesWithEncoding(runtime, shared.Bytes(), outputEnc)
	})

	// getPrime([encoding])
	obj.Set("getPrime", func(call goja.FunctionCall) goja.Value {
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		return encodeBytesWithEncoding(runtime, state.Params.P.Bytes(), encoding)
	})

	// getGenerator([encoding])
	obj.Set("getGenerator", func(call goja.FunctionCall) goja.Value {
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		return encodeBytesWithEncoding(runtime, state.Params.G.Bytes(), encoding)
	})

	// getPublicKey([encoding])
	obj.Set("getPublicKey", func(call goja.FunctionCall) goja.Value {
		if state.Public == nil {
			panic(runtime.NewTypeError("DH public key is not set"))
		}
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		return encodeBytesWithEncoding(runtime, state.Public.Bytes(), encoding)
	})

	// getPrivateKey([encoding])
	obj.Set("getPrivateKey", func(call goja.FunctionCall) goja.Value {
		if state.Private == nil {
			panic(runtime.NewTypeError("DH private key is not set"))
		}
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		return encodeBytesWithEncoding(runtime, state.Private.Bytes(), encoding)
	})

	// group 对象也暴露 verifyError 属性
	obj.Set("verifyError", 0)

	return obj
}

// CreateDiffieHellman 实现 crypto.createDiffieHellman()
// 支持两种主要调用形式：
//
//	createDiffieHellman(primeLength[, generator])
//	createDiffieHellman(prime)
func CreateDiffieHellman(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createDiffieHellman requires prime or primeLength argument"))
	}

	first := call.Arguments[0]
	exported := first.Export()

	// primeLength 分支
	switch exported.(type) {
	case int, int32, int64, float32, float64:
		// 检查是否是特殊值
		floatVal := first.ToFloat()
		if math.IsNaN(floatVal) { // NaN check
			panic(runtime.NewTypeError("The \"primeLength\" argument must be a valid number"))
		}
		if math.IsInf(floatVal, 0) { // Infinity check (0 means either +Inf or -Inf)
			panic(runtime.NewTypeError("The \"primeLength\" argument must be a finite number"))
		}

		primeBits := int(first.ToInteger())
		if primeBits <= 0 {
			panic(runtime.NewTypeError("The \"primeLength\" argument must be a positive number"))
		}

		// 限制最大值以防止资源耗尽
		if primeBits > 16384 {
			panic(runtime.NewTypeError("The \"primeLength\" argument is too large (maximum 16384 bits)"))
		}

		// 解析 generator（可选，默认 2）
		// 支持 createDiffieHellman(primeLength, generator[, generatorEncoding])
		generator := big.NewInt(2)
		var generatorEncoding string
		if len(call.Arguments) >= 3 {
			if enc, ok := call.Arguments[2].Export().(string); ok {
				generatorEncoding = enc
			}
		}

		if len(call.Arguments) >= 2 {
			genVal := call.Arguments[1]
			if genVal != nil && !goja.IsUndefined(genVal) && !goja.IsNull(genVal) {
				// 如果有 generatorEncoding，则按编码解码字符串
				if generatorEncoding != "" {
					genBytes, err := decodeBytesWithEncoding(runtime, genVal, generatorEncoding)
					if err != nil {
						panic(runtime.NewTypeError(fmt.Sprintf("Invalid generatorEncoding \"%s\": %v", generatorEncoding, err)))
					}
					if len(genBytes) == 0 {
						panic(runtime.NewTypeError("The \"generator\" argument must not be empty"))
					}
					generator = new(big.Int).SetBytes(genBytes)
				} else if num, ok := genVal.Export().(int64); ok {
					if num < 0 {
						panic(runtime.NewTypeError("The \"generator\" argument must be non-negative"))
					}
					// Node.js 将 0 规范化为默认值 2
					if num == 0 {
						generator = big.NewInt(2)
					} else {
						generator = big.NewInt(num)
					}
				} else if num, ok := genVal.Export().(int); ok {
					if num < 0 {
						panic(runtime.NewTypeError("The \"generator\" argument must be non-negative"))
					}
					// Node.js 将 0 规范化为默认值 2
					if num == 0 {
						generator = big.NewInt(2)
					} else {
						generator = big.NewInt(int64(num))
					}
				} else if b, err := ConvertToBytes(runtime, genVal); err == nil {
					if len(b) == 0 {
						panic(runtime.NewTypeError("The \"generator\" argument must not be empty"))
					}
					generator = new(big.Int).SetBytes(b)
				} else {
					panic(runtime.NewTypeError("The \"generator\" argument must be a number or Buffer"))
				}
			}
		}

		p, err := generateSafePrime(primeBits)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		params := DHParameters{P: p, G: generator}
		return newDiffieHellmanObject(runtime, params)
	}

	// prime Buffer/字符串分支，兼容 Node.js:
	// createDiffieHellman(prime[, primeEncoding][, generator][, generatorEncoding])
	// 只有当 prime 是字符串时，第二个参数才能是 primeEncoding
	var (
		primeBytes        []byte
		primeEncoding     string
		generatorVal      goja.Value
		generatorEncoding string
	)

	argc := len(call.Arguments)
	firstIsString := false
	if _, ok := first.Export().(string); ok {
		firstIsString = true
	}

	if argc >= 2 {
		second := call.Arguments[1]
		// 只有当第一个参数是字符串时，第二个参数才能是 encoding
		if firstIsString {
			if s, ok := second.Export().(string); ok {
				// 形如 (primeString, primeEncoding, [generator], [generatorEncoding])
				primeEncoding = s
				if argc >= 3 {
					generatorVal = call.Arguments[2]
				}
				if argc >= 4 {
					if s2, ok2 := call.Arguments[3].Export().(string); ok2 {
						generatorEncoding = s2
					}
				}
			} else {
				// 形如 (primeString, generator[, generatorEncoding])
				// 这种情况下 primeString 会被当作 hex 解码
				generatorVal = second
				if argc >= 3 {
					if s3, ok3 := call.Arguments[2].Export().(string); ok3 {
						generatorEncoding = s3
					}
				}
			}
		} else {
			// 第一个参数是 Buffer，第二个参数必须是 generator
			generatorVal = second
			if argc >= 3 {
				if s3, ok3 := call.Arguments[2].Export().(string); ok3 {
					generatorEncoding = s3
				}
			}
		}
	}

	var err error
	if primeEncoding != "" {
		primeBytes, err = decodeBytesWithEncoding(runtime, first, primeEncoding)
		if err != nil || len(primeBytes) == 0 {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid prime: %v", err)))
		}
	} else {
		primeBytes, err = ConvertToBytes(runtime, first)
		if err != nil {
			panic(runtime.NewTypeError("The \"prime\" argument must be a Buffer"))
		}
		if len(primeBytes) == 0 {
			panic(runtime.NewTypeError("The \"prime\" argument must not be empty"))
		}
	}

	p := new(big.Int).SetBytes(primeBytes)
	if p.Sign() <= 0 {
		panic(runtime.NewTypeError("The \"prime\" argument must be a positive number"))
	}

	generator := big.NewInt(2)
	if generatorVal != nil && !goja.IsUndefined(generatorVal) && !goja.IsNull(generatorVal) {
		if generatorEncoding != "" {
			// Generator 是字符串 + encoding 形式
			genBytes, err := decodeBytesWithEncoding(runtime, generatorVal, generatorEncoding)
			if err != nil {
				panic(runtime.NewTypeError(fmt.Sprintf("Invalid generatorEncoding \"%s\": %v", generatorEncoding, err)))
			}
			if len(genBytes) == 0 {
				panic(runtime.NewTypeError("The \"generator\" argument must not be empty"))
			}
			generator = new(big.Int).SetBytes(genBytes)
		} else {
			if num, ok := generatorVal.Export().(int64); ok {
				if num < 0 {
					panic(runtime.NewTypeError("The \"generator\" argument must be non-negative"))
				}
				// Node.js 将 0 规范化为默认值 2
				if num == 0 {
					generator = big.NewInt(2)
				} else {
					generator = big.NewInt(num)
				}
			} else if num, ok := generatorVal.Export().(int); ok {
				if num < 0 {
					panic(runtime.NewTypeError("The \"generator\" argument must be non-negative"))
				}
				// Node.js 将 0 规范化为默认值 2
				if num == 0 {
					generator = big.NewInt(2)
				} else {
					generator = big.NewInt(int64(num))
				}
			} else if b, err := ConvertToBytes(runtime, generatorVal); err == nil {
				if len(b) == 0 {
					panic(runtime.NewTypeError("The \"generator\" argument must not be empty"))
				}
				generator = new(big.Int).SetBytes(b)
			} else {
				panic(runtime.NewTypeError("The \"generator\" argument must be a number or Buffer"))
			}
		}
	}

	params := DHParameters{P: p, G: generator}
	return newDiffieHellmanObject(runtime, params)
}

// GetDiffieHellman 实现 crypto.getDiffieHellman(groupName)
func GetDiffieHellman(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("getDiffieHellman requires groupName argument"))
	}
	groupName := call.Arguments[0].String()
	params := getDHStandardGroup(groupName)
	if params == nil || params.P == nil || params.G == nil {
		panic(runtime.NewTypeError(fmt.Sprintf("Unknown DH group: %s", groupName)))
	}
	return newDiffieHellmanGroupObject(runtime, *params)
}

// CreateDiffieHellmanGroup 实现 crypto.createDiffieHellmanGroup(groupName)
// 按 Node.js 语义：返回与 getDiffieHellman(groupName) 等效的预定义组对象
func CreateDiffieHellmanGroup(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createDiffieHellmanGroup requires groupName argument"))
	}
	groupName := call.Arguments[0].String()
	params := getDHStandardGroup(groupName)
	if params == nil || params.P == nil || params.G == nil {
		panic(runtime.NewTypeError(fmt.Sprintf("Unknown DH group: %s", groupName)))
	}
	return newDiffieHellmanGroupObject(runtime, *params)
}

// resolveECDHCurve 根据曲线名称返回对应的 elliptic.Curve
func resolveECDHCurve(name string) (elliptic.Curve, string) {
	switch name {
	case "prime256v1", "P-256", "p256":
		return elliptic.P256(), "prime256v1"
	case "secp384r1", "P-384", "p384":
		return elliptic.P384(), "secp384r1"
	case "secp521r1", "P-521", "p521":
		return elliptic.P521(), "secp521r1"
	case "secp256k1":
		return btcec.S256(), "secp256k1"
	default:
		return nil, ""
	}
}

// unmarshalECPublicKeyWithAnyFormat 解析任意支持格式的 EC 公钥（compressed/uncompressed/hybrid）
func unmarshalECPublicKeyWithAnyFormat(curve elliptic.Curve, key []byte) (*big.Int, *big.Int, error) {
	if len(key) == 0 {
		return nil, nil, fmt.Errorf("EC public key is empty")
	}
	params := curve.Params()
	if params == nil {
		return nil, nil, fmt.Errorf("EC curve params not available")
	}
	byteLen := (params.BitSize + 7) / 8
	prefix := key[0]

	switch prefix {
	case 0x04:
		// 标准未压缩格式
		x, y := elliptic.Unmarshal(curve, key)
		if x == nil || y == nil {
			return nil, nil, fmt.Errorf("invalid uncompressed EC public key")
		}
		return x, y, nil

	case 0x06, 0x07:
		// hybrid: 0x06/0x07 || X || Y —— 内容与 uncompressed 相同，只是前缀不同
		if len(key) != 1+2*byteLen {
			return nil, nil, fmt.Errorf("invalid hybrid EC public key length")
		}
		buf := make([]byte, len(key))
		buf[0] = 0x04
		copy(buf[1:], key[1:])
		x, y := elliptic.Unmarshal(curve, buf)
		if x == nil || y == nil {
			return nil, nil, fmt.Errorf("invalid hybrid EC public key")
		}
		return x, y, nil

	case 0x02, 0x03:
		// 压缩格式：0x02/0x03 || X
		if len(key) != 1+byteLen {
			return nil, nil, fmt.Errorf("invalid compressed EC public key length")
		}
		// secp256k1 使用 btcec 解析（支持压缩编码）
		if curve == btcec.S256() {
			pk, err := btcec.ParsePubKey(key)
			if err != nil {
				return nil, nil, err
			}
			return pk.X(), pk.Y(), nil
		}
		// 其它曲线使用标准库的压缩解码
		x, y := elliptic.UnmarshalCompressed(curve, key)
		if x == nil || y == nil {
			return nil, nil, fmt.Errorf("invalid compressed EC public key")
		}
		return x, y, nil

	default:
		return nil, nil, fmt.Errorf("unsupported EC public key format")
	}
}

// marshalECPublicKeyWithFormat 按 Node.js ECDH 语义编码公钥
// format 支持: ""/"uncompressed"、"compressed"、"hybrid"
// uncompressed: 0x04 || X || Y
// compressed:   0x02/0x03 || X （02=偶数 Y, 03=奇数 Y）
// hybrid:       0x06/0x07 || X || Y （06=偶数 Y, 07=奇数 Y）
func marshalECPublicKeyWithFormat(curve elliptic.Curve, x, y *big.Int, format string) ([]byte, error) {
	if x == nil || y == nil {
		return nil, fmt.Errorf("EC public key is not set")
	}

	// 默认或 uncompressed 直接走标准编码
	if format == "" || format == "uncompressed" {
		return elliptic.Marshal(curve, x, y), nil
	}

	params := curve.Params()
	byteLen := (params.BitSize + 7) / 8

	xBytes := x.Bytes()
	if len(xBytes) < byteLen {
		padded := make([]byte, byteLen)
		copy(padded[byteLen-len(xBytes):], xBytes)
		xBytes = padded
	}

	yBytes := y.Bytes()
	if len(yBytes) < byteLen {
		padded := make([]byte, byteLen)
		copy(padded[byteLen-len(yBytes):], yBytes)
		yBytes = padded
	}

	yOdd := y.Bit(0) == 1

	switch format {
	case "compressed":
		prefix := byte(0x02)
		if yOdd {
			prefix = 0x03
		}
		out := make([]byte, 1+byteLen)
		out[0] = prefix
		copy(out[1:], xBytes)
		return out, nil

	case "hybrid":
		prefix := byte(0x06)
		if yOdd {
			prefix = 0x07
		}
		out := make([]byte, 1+2*byteLen)
		out[0] = prefix
		copy(out[1:1+byteLen], xBytes)
		copy(out[1+byteLen:], yBytes)
		return out, nil

	default:
		return nil, fmt.Errorf("Unsupported ECDH key format: %s", format)
	}
}

// newECDHObject 根据给定曲线创建一个 ECDH JS 对象
func newECDHObject(runtime *goja.Runtime, curve elliptic.Curve, curveName string) *goja.Object {
	state := &ECDHState{
		Curve:     curve,
		CurveName: curveName,
	}

	obj := runtime.NewObject()

	// generateKeys([encoding[, format]]) -> publicKey
	obj.Set("generateKeys", func(call goja.FunctionCall) goja.Value {
		var encoding string
		var format string = "uncompressed"
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			format = call.Arguments[1].String()
		}

		priv, err := ecdsa.GenerateKey(state.Curve, rand.Reader)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to generate ECDH key pair: %w", err)))
		}
		state.Private = priv

		pubBytes, err := marshalECPublicKeyWithFormat(state.Curve, priv.X, priv.Y, format)
		if err != nil {
			panic(runtime.NewTypeError(err.Error()))
		}

		return encodeBytesWithEncoding(runtime, pubBytes, encoding)
	})

	// getPublicKey([encoding[, format]])
	obj.Set("getPublicKey", func(call goja.FunctionCall) goja.Value {
		if state.Private == nil {
			panic(runtime.NewTypeError("ECDH private key is not set"))
		}
		var encoding string
		var format string = "uncompressed"
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			format = call.Arguments[1].String()
		}

		pubBytes, err := marshalECPublicKeyWithFormat(state.Curve, state.Private.X, state.Private.Y, format)
		if err != nil {
			panic(runtime.NewTypeError(err.Error()))
		}

		return encodeBytesWithEncoding(runtime, pubBytes, encoding)
	})

	// getPrivateKey([encoding])
	obj.Set("getPrivateKey", func(call goja.FunctionCall) goja.Value {
		if state.Private == nil {
			panic(runtime.NewTypeError("ECDH private key is not set"))
		}
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		return encodeBytesWithEncoding(runtime, state.Private.D.Bytes(), encoding)
	})

	// setPrivateKey(privateKey[, encoding])
	obj.Set("setPrivateKey", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("setPrivateKey requires privateKey argument"))
		}
		val := call.Arguments[0]
		var encoding string
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			encoding = call.Arguments[1].String()
		}

		bytes, err := decodeBytesWithEncoding(runtime, val, encoding)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid privateKey: %v", err)))
		}
		if len(bytes) == 0 {
			panic(runtime.NewTypeError("Invalid privateKey: empty"))
		}

		// 校验私钥范围：1 <= d < N（曲线阶）
		params := state.Curve.Params()
		if params == nil || params.N == nil {
			panic(runtime.NewTypeError("Invalid ECDH curve parameters"))
		}
		d := new(big.Int).SetBytes(bytes)
		if d.Sign() == 0 || d.Cmp(params.N) >= 0 {
			panic(runtime.NewTypeError("Invalid privateKey: out of range"))
		}

		priv := &ecdsa.PrivateKey{}
		priv.PublicKey.Curve = state.Curve
		priv.D = d
		priv.PublicKey.X, priv.PublicKey.Y = state.Curve.ScalarBaseMult(bytes)
		state.Private = priv
		return goja.Undefined()
	})

	// computeSecret(otherPublicKey[, inputEncoding][, outputEncoding])
	obj.Set("computeSecret", func(call goja.FunctionCall) goja.Value {
		if state.Private == nil {
			panic(runtime.NewTypeError("ECDH private key is not set"))
		}
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("computeSecret requires otherPublicKey argument"))
		}

		otherVal := call.Arguments[0]
		var inputEnc, outputEnc string
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			inputEnc = call.Arguments[1].String()
		}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) && !goja.IsNull(call.Arguments[2]) {
			outputEnc = call.Arguments[2].String()
		}

		otherBytes, err := decodeBytesWithEncoding(runtime, otherVal, inputEnc)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid otherPublicKey: %v", err)))
		}
		if len(otherBytes) == 0 {
			panic(newInvalidECDHPublicKeyError(runtime))
		}

		// 支持 uncompressed/compressed/hybrid 三种格式
		pubX, pubY, err := unmarshalECPublicKeyWithAnyFormat(state.Curve, otherBytes)
		if err != nil || pubX == nil || pubY == nil {
			panic(newInvalidECDHPublicKeyError(runtime))
		}

		// 计算共享密钥：使用 x 坐标作为共享秘密
		sharedX, _ := state.Curve.ScalarMult(pubX, pubY, state.Private.D.Bytes())
		shared := sharedX.Bytes()

		return encodeBytesWithEncoding(runtime, shared, outputEnc)
	})

	return obj
}

// CreateECDH 实现 crypto.createECDH(curveName)
func CreateECDH(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createECDH requires curveName argument"))
	}
	curveArg := call.Arguments[0]
	curveName := curveArg.String()
	curve, normalized := resolveECDHCurve(curveName)
	if curve != nil {
		// 已知主流曲线，使用纯 Go 实现（已通过完整行为对齐测试）
		return newECDHObject(runtime, curve, normalized)
	}

	// 其它曲线（prime192/prime239/secp224k1/brainpoolP* 等），尝试使用 OpenSSL ECDH
	ecdhObj, err := newOpenSSLECDHObject(runtime, curveName)
	if err != nil || ecdhObj == nil {
		// 保持原有错误语义，供错误测试用例匹配
		panic(runtime.NewTypeError(fmt.Sprintf("Invalid ECDH curve: %s", curveName)))
	}
	return ecdhObj
}
