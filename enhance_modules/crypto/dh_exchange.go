package crypto

import (
	"crypto/ecdh"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"

	x448lib "github.com/cloudflare/circl/dh/x448"
	"github.com/dop251/goja"
	"golang.org/x/crypto/curve25519"
)

// ============================================================================
// 🔥 Diffie-Hellman 密钥交换
// ============================================================================

// DiffieHellman 计算 Diffie-Hellman 共享密钥
// 支持: ECDH (EC curves), X25519, X448, DH
// crypto.diffieHellman(options[, callback])
func DiffieHellman(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 1 {
		panic(runtime.NewTypeError("crypto.diffieHellman requires an options object"))
	}

	// 获取选项对象
	optionsVal := call.Argument(0)
	if goja.IsUndefined(optionsVal) || goja.IsNull(optionsVal) {
		panic(runtime.NewTypeError("options must be provided"))
	}

	optionsObj := optionsVal.ToObject(runtime)

	// 提前验证关键参数（同步抛出错误，与 Node.js 行为一致）
	privateKeyVal := optionsObj.Get("privateKey")
	publicKeyVal := optionsObj.Get("publicKey")

	if goja.IsUndefined(privateKeyVal) || goja.IsNull(privateKeyVal) {
		panic(runtime.NewTypeError("privateKey is required"))
	}
	if goja.IsUndefined(publicKeyVal) || goja.IsNull(publicKeyVal) {
		panic(runtime.NewTypeError("publicKey is required"))
	}

	// 解析并验证密钥类型（同步抛出）
	privKey, privKeyType, err := parseKeyForDH(privateKeyVal, runtime, true)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid privateKey: %w", err)))
	}

	pubKey, pubKeyType, err := parseKeyForDH(publicKeyVal, runtime, false)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("invalid publicKey: %w", err)))
	}

	// 密钥类型必须匹配（同步抛出）
	if privKeyType != pubKeyType {
		panic(runtime.NewTypeError(fmt.Sprintf("key type mismatch: private=%s, public=%s", privKeyType, pubKeyType)))
	}

	// 检查是否有 callback 参数
	var callback goja.Callable
	if len(call.Arguments) >= 2 {
		callbackVal := call.Argument(1)
		if !goja.IsUndefined(callbackVal) && !goja.IsNull(callbackVal) {
			var ok bool
			callback, ok = goja.AssertFunction(callbackVal)
			if !ok {
				panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE",
					"The \"callback\" argument must be of type function"))
			}
		}
	}

	// 如果有 callback，使用异步模式
	if callback != nil {
		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			asyncCallback := func(call goja.FunctionCall) goja.Value {
				defer func() {
					if r := recover(); r != nil {
						// 捕获 panic，转换为错误回调
						var err error
						switch v := r.(type) {
						case error:
							err = v
						case *goja.Object:
							// 已经是 Node error 对象
							callback(goja.Undefined(), v, goja.Undefined())
							return
						default:
							err = fmt.Errorf("%v", r)
						}
						errObj := runtime.NewGoError(err)
						callback(goja.Undefined(), errObj, goja.Undefined())
					}
				}()

				// 执行密钥交换（参数已验证）
				sharedSecret := performDiffieHellmanCore(privKey, pubKey, privKeyType, runtime)
				callback(goja.Undefined(), goja.Null(), sharedSecret)
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
		}
		return goja.Undefined()
	}

	// 同步模式（参数已验证）
	return performDiffieHellmanCore(privKey, pubKey, privKeyType, runtime)
}

// performDiffieHellmanCore 执行实际的 DH 密钥交换计算（参数已验证）
func performDiffieHellmanCore(privKey, pubKey interface{}, keyType string, runtime *goja.Runtime) goja.Value {

	// 防御性检查，避免内部错误导致 nil 解引用
	if privKey == nil || pubKey == nil {
		panic(runtime.NewGoError(fmt.Errorf("diffieHellman failed: internal key is nil")))
	}

	// 根据密钥类型执行密钥交换
	var sharedSecret []byte
	var err error

	switch keyType {
	case "ec":
		// ECDH for EC curves
		sharedSecret, err = ecdhCompute(privKey, pubKey)
	case "x25519":
		// X25519
		sharedSecret, err = x25519Compute(privKey, pubKey)
	case "x448":
		// X448
		sharedSecret, err = x448Compute(privKey, pubKey)
	case "dh":
		// DH (modp groups)
		sharedSecret, err = dhCompute(privKey, pubKey)
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("unsupported key type for diffieHellman: %s", keyType)))
	}

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("diffieHellman failed: %w", err)))
	}

	// 返回 Buffer
	return CreateBuffer(runtime, sharedSecret)
}

// parseKeyForDH 解析密钥对象用于 DH 交换
func parseKeyForDH(keyVal goja.Value, runtime *goja.Runtime, isPrivate bool) (interface{}, string, error) {
	if goja.IsUndefined(keyVal) || goja.IsNull(keyVal) {
		return nil, "", errors.New("key is undefined or null")
	}

	keyObj := keyVal.ToObject(runtime)
	if keyObj == nil {
		return nil, "", errors.New("failed to convert key to object")
	}

	// 获取密钥类型
	typeVal := keyObj.Get("type")
	if typeVal == nil || goja.IsUndefined(typeVal) || goja.IsNull(typeVal) {
		return nil, "", errors.New("key object missing 'type' property")
	}

	keyType := typeVal.String()
	expectedType := "public"
	if isPrivate {
		expectedType = "private"
	}

	if keyType != expectedType {
		return nil, "", fmt.Errorf("expected %s key but got %s key", expectedType, keyType)
	}

	// 获取 asymmetricKeyType
	asymTypeVal := keyObj.Get("asymmetricKeyType")
	var asymType string
	if asymTypeVal != nil && !goja.IsUndefined(asymTypeVal) && !goja.IsNull(asymTypeVal) {
		asymType = asymTypeVal.String()
	}

	// 通过 export() 方法获取密钥的 PEM 表示
	exportFunc := keyObj.Get("export")
	if exportFunc == nil || goja.IsUndefined(exportFunc) || goja.IsNull(exportFunc) {
		return nil, "", errors.New("key object missing 'export' method")
	}

	// 调用 export 方法获取 PEM
	exportCallable, ok := goja.AssertFunction(exportFunc)
	if !ok {
		return nil, "", errors.New("export is not a function")
	}

	exportOpts := runtime.NewObject()
	exportOpts.Set("format", "pem")
	if isPrivate {
		exportOpts.Set("type", "pkcs8")
	} else {
		exportOpts.Set("type", "spki")
	}

	pemVal, err := exportCallable(keyObj, exportOpts)
	if err != nil {
		return nil, "", fmt.Errorf("failed to export key: %w", err)
	}

	pemStr := pemVal.String()
	if pemStr == "" {
		return nil, "", errors.New("exported PEM is empty")
	}

	// 根据类型解析 PEM
	switch asymType {
	case "ec":
		if isPrivate {
			// 解析 EC 私钥
			privKey, err := ParseAnyPrivateKey(pemStr)
			if err != nil {
				return nil, "", fmt.Errorf("failed to parse EC private key: %w", err)
			}
			if ecPriv, ok := privKey.(*ecdsa.PrivateKey); ok {
				return ecPriv, "ec", nil
			}
			return nil, "", errors.New("parsed key is not an EC private key")
		} else {
			// 解析 EC 公钥
			pubKey, err := ParseAnyPublicKey(pemStr)
			if err != nil {
				return nil, "", fmt.Errorf("failed to parse EC public key: %w", err)
			}
			if ecPub, ok := pubKey.(*ecdsa.PublicKey); ok {
				return ecPub, "ec", nil
			}
			return nil, "", errors.New("parsed key is not an EC public key")
		}

	case "x25519":
		// 解析 X25519 密钥（PKCS8/SPKI 格式）
		block, _ := pem.Decode([]byte(pemStr))
		if block == nil {
			return nil, "", errors.New("failed to decode X25519 PEM")
		}

		// PKCS8/SPKI 格式: 提取最后32字节（实际密钥数据）
		if len(block.Bytes) >= 32 {
			keyBytes := block.Bytes[len(block.Bytes)-32:]
			return keyBytes, "x25519", nil
		}
		return nil, "", errors.New("invalid X25519 key length")

	case "x448":
		// 解析 X448 密钥
		block, _ := pem.Decode([]byte(pemStr))
		if block == nil {
			return nil, "", errors.New("failed to decode X448 PEM")
		}

		// PKCS8/SPKI 格式: 提取最后56字节（实际密钥数据）
		if len(block.Bytes) >= 56 {
			keyBytes := block.Bytes[len(block.Bytes)-56:]
			return keyBytes, "x448", nil
		}
		return nil, "", errors.New("invalid X448 key length")

	case "dh":
		// 解析 DH 密钥
		if isPrivate {
			// 尝试从 _key 直接获取 DH 私钥对象
			internalKeyVal := keyObj.Get("_key")
			if internalKeyVal != nil && !goja.IsUndefined(internalKeyVal) && !goja.IsNull(internalKeyVal) {
				// 防御 typed-nil 场景，避免后续使用时 panic
				exported := internalKeyVal.Export()
				if exported == nil {
					return nil, "", errors.New("internal DH private key is nil")
				}
				if dhPriv, ok := exported.(*DHPrivateKey); ok {
					if dhPriv == nil {
						return nil, "", errors.New("internal DH private key is nil")
					}
					return dhPriv, "dh", nil
				}
			}

			// 如果 _key 不存在，尝试解析 PEM
			dhPriv, err := ParseDHPrivateKey(pemStr)
			if err != nil {
				return nil, "", fmt.Errorf("failed to parse DH private key: %w", err)
			}
			return dhPriv, "dh", nil
		} else {
			// 尝试从 _key 直接获取 DH 公钥对象
			internalKeyVal := keyObj.Get("_key")
			if internalKeyVal != nil && !goja.IsUndefined(internalKeyVal) && !goja.IsNull(internalKeyVal) {
				// 防御 typed-nil 场景，避免后续使用时 panic
				exported := internalKeyVal.Export()
				if exported == nil {
					return nil, "", errors.New("internal DH public key is nil")
				}
				if dhPub, ok := exported.(*DHPublicKey); ok {
					if dhPub == nil {
						return nil, "", errors.New("internal DH public key is nil")
					}
					return dhPub, "dh", nil
				}
			}

			// 如果 _key 不存在，尝试解析 PEM
			dhPub, err := ParseDHPublicKey(pemStr)
			if err != nil {
				return nil, "", fmt.Errorf("failed to parse DH public key: %w", err)
			}
			return dhPub, "dh", nil
		}

	default:
		return nil, "", fmt.Errorf("unsupported asymmetricKeyType for diffieHellman: %s", asymType)
	}
}

// ecdhCompute 执行 ECDH 密钥交换
func ecdhCompute(privKey, pubKey interface{}) ([]byte, error) {
	ecPriv, ok := privKey.(*ecdsa.PrivateKey)
	if !ok {
		return nil, errors.New("invalid EC private key")
	}

	ecPub, ok := pubKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, errors.New("invalid EC public key")
	}

	// 确保曲线匹配
	if ecPriv.Curve.Params().BitSize != ecPub.Curve.Params().BitSize {
		return nil, errors.New("EC curves do not match")
	}

	// 使用 crypto/ecdh (Go 1.20+)
	var ecdhCurve ecdh.Curve
	switch ecPriv.Curve {
	case elliptic.P256():
		ecdhCurve = ecdh.P256()
	case elliptic.P384():
		ecdhCurve = ecdh.P384()
	case elliptic.P521():
		ecdhCurve = ecdh.P521()
	default:
		return nil, fmt.Errorf("unsupported EC curve for ECDH")
	}

	// 转换私钥
	privBytes := ecPriv.D.FillBytes(make([]byte, (ecPriv.Curve.Params().BitSize+7)/8))
	ecdhPriv, err := ecdhCurve.NewPrivateKey(privBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to convert EC private key: %w", err)
	}

	// 转换公钥
	pubBytes := elliptic.Marshal(ecPub.Curve, ecPub.X, ecPub.Y)
	ecdhPub, err := ecdhCurve.NewPublicKey(pubBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to convert EC public key: %w", err)
	}

	// 计算共享密钥
	sharedSecret, err := ecdhPriv.ECDH(ecdhPub)
	if err != nil {
		return nil, fmt.Errorf("ECDH computation failed: %w", err)
	}

	return sharedSecret, nil
}

// x25519Compute 执行 X25519 密钥交换
func x25519Compute(privKey, pubKey interface{}) ([]byte, error) {
	privBytes, ok := privKey.([]byte)
	if !ok || len(privBytes) != 32 {
		return nil, errors.New("invalid X25519 private key")
	}

	pubBytes, ok := pubKey.([]byte)
	if !ok || len(pubBytes) != 32 {
		return nil, errors.New("invalid X25519 public key")
	}

	sharedSecret, err := curve25519.X25519(privBytes, pubBytes)
	if err != nil {
		return nil, fmt.Errorf("X25519 computation failed: %w", err)
	}

	return sharedSecret, nil
}

// x448Compute 执行 X448 密钥交换
func x448Compute(privKey, pubKey interface{}) ([]byte, error) {
	privBytes, ok := privKey.([]byte)
	if !ok || len(privBytes) != 56 {
		return nil, errors.New("invalid X448 private key")
	}

	pubBytes, ok := pubKey.([]byte)
	if !ok || len(pubBytes) != 56 {
		return nil, errors.New("invalid X448 public key")
	}

	var privKey448 x448lib.Key
	var pubKey448 x448lib.Key
	var sharedKey448 x448lib.Key

	copy(privKey448[:], privBytes)
	copy(pubKey448[:], pubBytes)

	x448lib.Shared(&sharedKey448, &privKey448, &pubKey448)

	return sharedKey448[:], nil
}

// dhCompute 执行 DH (modp) 密钥交换
func dhCompute(privKey, pubKey interface{}) ([]byte, error) {
	dhPriv, ok := privKey.(*DHPrivateKey)
	if !ok {
		return nil, errors.New("invalid DH private key")
	}

	dhPub, ok := pubKey.(*DHPublicKey)
	if !ok {
		return nil, errors.New("invalid DH public key")
	}

	// 确保参数匹配
	if dhPriv.Parameters.P.Cmp(dhPub.Parameters.P) != 0 || dhPriv.Parameters.G.Cmp(dhPub.Parameters.G) != 0 {
		return nil, errors.New("DH parameters do not match")
	}

	// 计算共享密钥: sharedSecret = (pubKey.Y ^ privKey.X) mod P
	sharedSecret := new(big.Int).Exp(dhPub.Y, dhPriv.X, dhPriv.Parameters.P)

	return sharedSecret.Bytes(), nil
}

// ============================================================================
// 🔥 辅助函数：密钥解析
// ============================================================================

// parseECDHKey 解析 ECDH 密钥 (PEM/DER)
func parseECDHKey(keyData []byte, isPrivate bool) (interface{}, error) {
	// 尝试 PEM
	block, _ := pem.Decode(keyData)
	if block != nil {
		keyData = block.Bytes
	}

	// 尝试解析
	if isPrivate {
		// 尝试 PKCS8
		privKey, err := x509.ParsePKCS8PrivateKey(keyData)
		if err == nil {
			if ecPriv, ok := privKey.(*ecdsa.PrivateKey); ok {
				return ecPriv, nil
			}
			return nil, fmt.Errorf("key is not an EC private key")
		}

		// 尝试 EC private key
		ecPriv, err := x509.ParseECPrivateKey(keyData)
		if err == nil {
			return ecPriv, nil
		}

		return nil, fmt.Errorf("failed to parse EC private key")
	} else {
		// 公钥
		pubKey, err := x509.ParsePKIXPublicKey(keyData)
		if err == nil {
			if ecPub, ok := pubKey.(*ecdsa.PublicKey); ok {
				return ecPub, nil
			}
			return nil, fmt.Errorf("key is not an EC public key")
		}

		return nil, fmt.Errorf("failed to parse EC public key")
	}
}
