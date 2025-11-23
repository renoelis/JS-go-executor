package crypto

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/sha512"
	"fmt"

	x448lib "github.com/cloudflare/circl/dh/x448"
	"github.com/dop251/goja"
	"golang.org/x/crypto/curve25519"
)

// Encapsulate implements crypto.encapsulate(publicKey[, callback])
func Encapsulate(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 1 {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"publicKey\" argument must be of type KeyObject. Received undefined"))
	}

	// 检查回调函数
	var callback goja.Callable
	if len(call.Arguments) >= 2 && !goja.IsUndefined(call.Arguments[1]) {
		var ok bool
		callback, ok = goja.AssertFunction(call.Arguments[1])
		if !ok {
			panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
				"The \"callback\" argument must be of type function"))
		}
	}

	// 同步执行
	result := performEncapsulate(call.Arguments[0], runtime)

	if callback != nil {
		// 异步返回
		setImmediate := runtime.Get("setImmediate")
		if fn, ok := goja.AssertFunction(setImmediate); ok {
			fn(goja.Undefined(), runtime.ToValue(func(goja.FunctionCall) goja.Value {
				callback(goja.Undefined(), goja.Null(), result)
				return goja.Undefined()
			}))
		}
		return goja.Undefined()
	}

	return result
}

func performEncapsulate(keyVal goja.Value, runtime *goja.Runtime) goja.Value {
	if goja.IsUndefined(keyVal) || goja.IsNull(keyVal) {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"publicKey\" argument must be of type KeyObject"))
	}

	keyObj := keyVal.ToObject(runtime)
	if keyObj == nil {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"publicKey\" argument must be of type KeyObject"))
	}

	keyTypeVal := keyObj.Get("type")
	if keyTypeVal == nil || goja.IsUndefined(keyTypeVal) || goja.IsNull(keyTypeVal) {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"publicKey\" argument must be of type KeyObject"))
	}
	keyType := SafeGetString(keyTypeVal)
	if keyType != "public" {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"publicKey\" argument must be a public key"))
	}

	asymKeyType := keyObj.Get("asymmetricKeyType")
	if asymKeyType == nil || goja.IsUndefined(asymKeyType) || goja.IsNull(asymKeyType) {
		panic(NewNodeError(runtime, "ERR_CRYPTO_OPERATION_FAILED",
			"Failed to determine key type"))
	}

	keyTypeStr := SafeGetString(asymKeyType)
	pubKey := extractPublicKey(keyObj, runtime)

	var sharedKey, ciphertext []byte
	var err error

	switch keyTypeStr {
	case "x25519", "x448":
		sharedKey, ciphertext, err = encapsulateECDH(pubKey, keyTypeStr, runtime)
	case "rsa":
		sharedKey, ciphertext, err = encapsulateRSA(pubKey, runtime)
	case "ec":
		sharedKey, ciphertext, err = encapsulateEC(pubKey, runtime)
	default:
		panic(NewNodeError(runtime, "ERR_CRYPTO_OPERATION_FAILED",
			fmt.Sprintf("Unsupported key type for encapsulation: %s", keyTypeStr)))
	}

	if err != nil {
		panic(NewNodeError(runtime, "ERR_CRYPTO_OPERATION_FAILED", err.Error()))
	}

	result := runtime.NewObject()
	result.Set("sharedKey", CreateBuffer(runtime, sharedKey))
	result.Set("ciphertext", CreateBuffer(runtime, ciphertext))
	return result
}

func encapsulateECDH(pubKey interface{}, keyType string, runtime *goja.Runtime) ([]byte, []byte, error) {
	switch keyType {
	case "x25519":
		// 当前工程中 X25519 KeyObject 的 _key 为 []byte(32)
		pubBytes, ok := pubKey.([]byte)
		if !ok || len(pubBytes) != 32 {
			return nil, nil, fmt.Errorf("invalid X25519 public key")
		}

		// 生成临时密钥对
		var ephPriv, ephPub [32]byte
		if _, err := rand.Read(ephPriv[:]); err != nil {
			return nil, nil, err
		}
		curve25519.ScalarBaseMult(&ephPub, &ephPriv)

		// 计算共享密钥：X25519(ephPriv, pubBytes)
		sharedSecret, err := x25519Compute(ephPriv[:], pubBytes)
		if err != nil {
			return nil, nil, err
		}

		return sharedSecret, ephPub[:], nil

	case "x448":
		// 当前工程中 X448 KeyObject 的 _key 为 []byte(56)
		pubBytes, ok := pubKey.([]byte)
		if !ok || len(pubBytes) != x448lib.Size {
			return nil, nil, fmt.Errorf("invalid X448 public key")
		}

		// 生成临时密钥对
		var ephPub, ephPriv x448lib.Key
		x448lib.KeyGen(&ephPub, &ephPriv)

		// 计算 56 字节共享密钥
		secret56, err := x448Compute(ephPriv[:], pubBytes)
		if err != nil {
			return nil, nil, err
		}

		// Node.js 中 X448 sharedKey 长度为 64 字节，使用 SHA-512 做简单扩展
		derived := sha512.Sum512(secret56)
		return derived[:], ephPub[:], nil
	}

	return nil, nil, fmt.Errorf("unsupported key type: %s", keyType)
}

func encapsulateRSA(pubKey interface{}, runtime *goja.Runtime) ([]byte, []byte, error) {
	rsaPub, ok := pubKey.(*rsa.PublicKey)
	if !ok {
		return nil, nil, fmt.Errorf("invalid RSA public key")
	}

	keySize := rsaPub.Size()
	// 生成短种子，再通过 KDF 扩展为 keySize 字节的 sharedKey
	seed := make([]byte, 32)
	if _, err := rand.Read(seed); err != nil {
		return nil, nil, err
	}

	// 使用 OAEP 加密种子，ciphertext 长度 = 模长
	ciphertext, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, rsaPub, seed, nil)
	if err != nil {
		return nil, nil, err
	}

	sharedKey := deriveRSAKEMSharedKey(seed, keySize)
	return sharedKey, ciphertext, nil
}

// Decapsulate implements crypto.decapsulate(privateKey, ciphertext[, callback])
func Decapsulate(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"Missing required arguments"))
	}

	var callback goja.Callable
	if len(call.Arguments) >= 3 && !goja.IsUndefined(call.Arguments[2]) {
		var ok bool
		callback, ok = goja.AssertFunction(call.Arguments[2])
		if !ok {
			panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
				"The \"callback\" argument must be of type function"))
		}
	}

	result := performDecapsulate(call.Arguments[0], call.Arguments[1], runtime)

	if callback != nil {
		setImmediate := runtime.Get("setImmediate")
		if fn, ok := goja.AssertFunction(setImmediate); ok {
			fn(goja.Undefined(), runtime.ToValue(func(goja.FunctionCall) goja.Value {
				callback(goja.Undefined(), goja.Null(), result)
				return goja.Undefined()
			}))
		}
		return goja.Undefined()
	}

	return result
}

func performDecapsulate(keyVal, ciphertextVal goja.Value, runtime *goja.Runtime) goja.Value {
	if goja.IsUndefined(keyVal) || goja.IsNull(keyVal) {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"privateKey\" argument must be of type KeyObject"))
	}

	keyObj := keyVal.ToObject(runtime)
	if keyObj == nil {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"privateKey\" argument must be of type KeyObject"))
	}

	keyTypeVal := keyObj.Get("type")
	if keyTypeVal == nil || goja.IsUndefined(keyTypeVal) || goja.IsNull(keyTypeVal) {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"privateKey\" argument must be of type KeyObject"))
	}
	keyType := SafeGetString(keyTypeVal)
	if keyType != "private" {
		// KeyObject 但类型不是 private，按照 Node 行为使用 ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE
		panic(NewNodeError(runtime, "ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE",
			"The \"privateKey\" argument must be a private key"))
	}

	ciphertext := extractBufferData(ciphertextVal, runtime)
	asymKeyType := keyObj.Get("asymmetricKeyType").String()
	privKey := extractPrivateKey(keyObj, runtime)

	var sharedKey []byte
	var err error

	switch asymKeyType {
	case "x25519", "x448":
		sharedKey, err = decapsulateECDH(privKey, ciphertext, asymKeyType, runtime)
	case "rsa":
		sharedKey, err = decapsulateRSA(privKey, ciphertext, runtime)
	case "ec":
		sharedKey, err = decapsulateEC(privKey, ciphertext, runtime)
	default:
		panic(NewNodeError(runtime, "ERR_CRYPTO_OPERATION_FAILED",
			fmt.Sprintf("Unsupported key type: %s", asymKeyType)))
	}

	if err != nil {
		panic(NewNodeError(runtime, "ERR_CRYPTO_OPERATION_FAILED", err.Error()))
	}

	return CreateBuffer(runtime, sharedKey)
}

func decapsulateECDH(privKey interface{}, ciphertext []byte, keyType string, runtime *goja.Runtime) ([]byte, error) {
	switch keyType {
	case "x25519":
		// KeyObject._key 为 []byte(32)，ciphertext 为 32 字节临时公钥
		secret, err := x25519Compute(privKey, ciphertext)
		if err != nil {
			return nil, err
		}
		return secret, nil

	case "x448":
		// 先得到 56 字节共享密钥，再扩展到 64 字节
		secret56, err := x448Compute(privKey, ciphertext)
		if err != nil {
			return nil, err
		}
		derived := sha512.Sum512(secret56)
		return derived[:], nil
	}

	return nil, fmt.Errorf("unsupported key type: %s", keyType)
}

func decapsulateRSA(privKey interface{}, ciphertext []byte, runtime *goja.Runtime) ([]byte, error) {
	rsaPriv, ok := privKey.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("invalid RSA private key")
	}

	// 解密得到种子，再通过与 encapsulate 相同的 KDF 推导 sharedKey
	seed, err := rsa.DecryptOAEP(sha256.New(), rand.Reader, rsaPriv, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	keySize := rsaPriv.Size()
	sharedKey := deriveRSAKEMSharedKey(seed, keySize)
	return sharedKey, nil
}

// deriveRSAKEMSharedKey 使用简单的基于 SHA-256 的 KDF，将短种子扩展为 keySize 字节
// 这里不追求与 Node.js 内部实现字节级相同，只要在同一实现内 encap/decap 一致即可。
func deriveRSAKEMSharedKey(seed []byte, keySize int) []byte {
	if keySize <= 0 {
		return nil
	}

	out := make([]byte, 0, keySize)
	var counter byte = 0

	for len(out) < keySize {
		h := sha256.New()
		h.Write(seed)
		h.Write([]byte{counter})
		block := h.Sum(nil)
		need := keySize - len(out)
		if need > len(block) {
			need = len(block)
		}
		out = append(out, block[:need]...)
		counter++
	}

	return out
}

func encapsulateEC(pubKey interface{}, runtime *goja.Runtime) ([]byte, []byte, error) {
	ecdsaPub, ok := pubKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, nil, fmt.Errorf("invalid EC public key")
	}

	// 生成临时 ECDH 密钥对
	ephemeralPriv, err := ecdsa.GenerateKey(ecdsaPub.Curve, rand.Reader)
	if err != nil {
		return nil, nil, err
	}

	// 计算共享密钥
	x, _ := ecdsaPub.Curve.ScalarMult(ecdsaPub.X, ecdsaPub.Y, ephemeralPriv.D.Bytes())
	sharedSecret := x.Bytes()

	// Ciphertext 是临时公钥的未压缩编码
	ciphertext := elliptic.Marshal(ecdsaPub.Curve, ephemeralPriv.PublicKey.X, ephemeralPriv.PublicKey.Y)

	return sharedSecret, ciphertext, nil
}

func decapsulateEC(privKey interface{}, ciphertext []byte, runtime *goja.Runtime) ([]byte, error) {
	ecdsaPriv, ok := privKey.(*ecdsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("invalid EC private key")
	}

	// 解析临时公钥
	x, y := elliptic.Unmarshal(ecdsaPriv.Curve, ciphertext)
	if x == nil {
		return nil, fmt.Errorf("invalid ciphertext")
	}

	// 计算共享密钥
	sharedX, _ := ecdsaPriv.Curve.ScalarMult(x, y, ecdsaPriv.D.Bytes())
	sharedSecret := sharedX.Bytes()

	return sharedSecret, nil
}

func extractBufferData(val goja.Value, runtime *goja.Runtime) []byte {
	if goja.IsUndefined(val) || goja.IsNull(val) {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
			"The \"ciphertext\" argument must be an instance of Buffer"))
	}

	// 1. Buffer 或任何导出为 []byte 的类型
	if buf, ok := val.Export().([]byte); ok {
		return buf
	}

	// 2. 直接传入 ArrayBuffer
	if ab, ok := val.Export().(goja.ArrayBuffer); ok {
		b := ab.Bytes()
		out := make([]byte, len(b))
		copy(out, b)
		return out
	}

	// 3. TypedArray/DataView/Buffer 等对象，具有 .buffer 属性
	if obj, ok := val.(*goja.Object); ok && obj != nil {
		bufferVal := obj.Get("buffer")
		if bufferVal != nil && !goja.IsUndefined(bufferVal) && !goja.IsNull(bufferVal) {
			if ab, ok := bufferVal.Export().(goja.ArrayBuffer); ok {
				b := ab.Bytes()
				out := make([]byte, len(b))
				copy(out, b)
				return out
			}
		}
	}

	panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
		"The \"ciphertext\" argument must be an instance of Buffer"))
}

func extractPublicKey(keyObj *goja.Object, runtime *goja.Runtime) interface{} {
	if keyObj == nil {
		panic(NewNodeError(runtime, "ERR_CRYPTO_OPERATION_FAILED",
			"Invalid key object"))
	}

	keyVal := keyObj.Get("_key")
	if keyVal == nil || goja.IsUndefined(keyVal) || goja.IsNull(keyVal) {
		panic(NewNodeError(runtime, "ERR_CRYPTO_OPERATION_FAILED",
			"Failed to extract public key"))
	}

	exportedKey := keyVal.Export()
	if exportedKey == nil {
		panic(NewNodeError(runtime, "ERR_CRYPTO_OPERATION_FAILED",
			"Failed to export public key"))
	}

	return exportedKey
}

func extractPrivateKey(keyObj *goja.Object, runtime *goja.Runtime) interface{} {
	if keyObj == nil {
		panic(NewNodeError(runtime, "ERR_CRYPTO_OPERATION_FAILED",
			"Invalid key object"))
	}

	keyVal := keyObj.Get("_key")
	if keyVal == nil || goja.IsUndefined(keyVal) || goja.IsNull(keyVal) {
		panic(NewNodeError(runtime, "ERR_CRYPTO_OPERATION_FAILED",
			"Failed to extract private key"))
	}

	exportedKey := keyVal.Export()
	if exportedKey == nil {
		panic(NewNodeError(runtime, "ERR_CRYPTO_OPERATION_FAILED",
			"Failed to export private key"))
	}

	return exportedKey
}
