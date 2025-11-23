package crypto

import (
	"crypto/dsa"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"math/big"
	"strings"

	btcec "github.com/btcsuite/btcd/btcec/v2"
	x448lib "github.com/cloudflare/circl/dh/x448"
	ed448lib "github.com/cloudflare/circl/sign/ed448"
	"github.com/dop251/goja"
	"golang.org/x/crypto/curve25519"
)

// ============================================================================
// 🔥 多算法密钥生成支持（EC, Ed25519, Ed448, X25519, X448, DSA, DH）
// ============================================================================

// safeGetString 安全地从 goja.Value 获取字符串值
func safeGetString(val goja.Value, fieldName string, runtime *goja.Runtime) string {
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return ""
	}

	exported := val.Export()
	if exported == nil {
		return ""
	}

	if str, ok := exported.(string); ok {
		return str
	}

	// 尝试转换为字符串
	return fmt.Sprintf("%v", exported)
}

// CreateKeyObject 创建密钥对象（支持多种密钥类型）
// isPublicKey: 对于无法自动判断的类型（如 X25519/X448 字节数组），明确指示是否为公钥
func CreateKeyObject(runtime *goja.Runtime, key interface{}, keyType string, isPublicKey ...bool) goja.Value {
	keyObj := runtime.NewObject()

	// 判断是公钥还是私钥
	var keyObjType string

	// 优先使用显式指定
	if len(isPublicKey) > 0 {
		if isPublicKey[0] {
			keyObjType = "public"
		} else {
			keyObjType = "private"
		}
	} else {
		// 自动判断
		switch k := key.(type) {
		case *ecdsa.PrivateKey, *rsa.PrivateKey, *dsa.PrivateKey, ed25519.PrivateKey, *DHPrivateKey:
			keyObjType = "private"
		case *ecdsa.PublicKey, *rsa.PublicKey, *dsa.PublicKey, ed25519.PublicKey, *DHPublicKey:
			keyObjType = "public"
		case ed448lib.PrivateKey:
			keyObjType = "private"
		case ed448lib.PublicKey:
			keyObjType = "public"
		case []byte:
			// 对于 X25519/X448/Ed448 的字节数组，根据长度判断
			keyLen := len(k)
			if keyType == "ed448" {
				// Ed448: 公钥=57字节, 私钥=114字节
				if keyLen == 114 {
					keyObjType = "private"
				} else if keyLen == 57 {
					keyObjType = "public"
				} else {
					keyObjType = "private" // 默认
				}
			} else if (keyType == "x25519" && keyLen == 32) || (keyType == "x448" && keyLen == 56) {
				// X25519/X448: 无法通过长度区分，默认为私钥（但应该使用显式参数）
				keyObjType = "private"
			} else if keyLen == 32 || keyLen == 56 || keyLen == 57 || keyLen == 114 {
				keyObjType = "private" // 默认假设是私钥
			} else {
				keyObjType = "public"
			}
		default:
			keyObjType = "private"
		}
	}

	keyObj.Set("type", keyObjType)
	keyObj.Set("asymmetricKeyType", keyType)

	// 存储原始密钥对象（用于 diffieHellman 等内部操作）
	keyObj.Set("_key", runtime.ToValue(key))

	// 设置 asymmetricKeyDetails
	details := runtime.NewObject()
	switch keyType {
	case "rsa", "rsa-pss":
		if rsaKey, ok := key.(*rsa.PrivateKey); ok {
			details.Set("modulusLength", rsaKey.N.BitLen())
			details.Set("publicExponent", runtime.ToValue(big.NewInt(int64(rsaKey.E))))
		} else if rsaPub, ok := key.(*rsa.PublicKey); ok {
			details.Set("modulusLength", rsaPub.N.BitLen())
			details.Set("publicExponent", runtime.ToValue(big.NewInt(int64(rsaPub.E))))
		}
	case "ec":
		var curveName string
		if ecPriv, ok := key.(*ecdsa.PrivateKey); ok {
			curveName = ecPriv.Curve.Params().Name
		} else if ecPub, ok := key.(*ecdsa.PublicKey); ok {
			curveName = ecPub.Curve.Params().Name
		}
		// 将 Go 的曲线名称映射为 Node.js 期望的名称
		switch curveName {
		case "P-256":
			curveName = "prime256v1"
		case "P-384":
			curveName = "secp384r1"
		case "P-521":
			curveName = "secp521r1"
		case "P-224":
			curveName = "secp224r1"
		}
		details.Set("namedCurve", curveName)
	case "dsa":
		if dsaPriv, ok := key.(*dsa.PrivateKey); ok {
			details.Set("modulusLength", dsaPriv.P.BitLen())
			details.Set("divisorLength", dsaPriv.Q.BitLen())
		} else if dsaPub, ok := key.(*dsa.PublicKey); ok {
			details.Set("modulusLength", dsaPub.P.BitLen())
			details.Set("divisorLength", dsaPub.Q.BitLen())
		}
	}
	keyObj.Set("asymmetricKeyDetails", details)

	// 导出为 PEM 并存储在 _handle 中（用于 ExtractKeyPEM）
	exportOptions := runtime.NewObject()
	exportOptions.Set("format", "pem")
	if keyObjType == "private" {
		exportOptions.Set("type", "pkcs8")
		var pemBytes goja.Value
		if keyType == "dh" {
			if dhPriv, ok := key.(*DHPrivateKey); ok {
				pemBytes = EncodeDHPrivateKey(runtime, dhPriv, exportOptions)
			}
		} else {
			pemBytes = EncodePrivateKey(runtime, key, exportOptions, keyType)
		}
		if pemBytes != nil && !goja.IsUndefined(pemBytes) && !goja.IsNull(pemBytes) {
			keyObj.Set("_handle", pemBytes)
		}
	} else {
		exportOptions.Set("type", "spki")
		var pemBytes goja.Value
		if keyType == "dh" {
			if dhPub, ok := key.(*DHPublicKey); ok {
				pemBytes = EncodeDHPublicKey(runtime, dhPub, exportOptions)
			}
		} else {
			pemBytes = EncodePublicKey(runtime, key, exportOptions, keyType)
		}
		if pemBytes != nil && !goja.IsUndefined(pemBytes) && !goja.IsNull(pemBytes) {
			keyObj.Set("_handle", pemBytes)
		}
	}

	// 添加 export 方法
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		var options *goja.Object
		if len(call.Arguments) > 0 {
			if opt, ok := call.Arguments[0].(*goja.Object); ok {
				options = opt
			}
		}

		if options == nil {
			options = runtime.NewObject()
			options.Set("type", "spki")
			if keyObjType == "private" {
				options.Set("type", "pkcs8")
			}
			options.Set("format", "pem")
		}

		// 导出密钥
		if keyType == "dh" {
			if keyObjType == "public" {
				if dhPub, ok := key.(*DHPublicKey); ok {
					return EncodeDHPublicKey(runtime, dhPub, options)
				}
			} else {
				if dhPriv, ok := key.(*DHPrivateKey); ok {
					return EncodeDHPrivateKey(runtime, dhPriv, options)
				}
			}
		}
		if keyObjType == "public" {
			return EncodePublicKey(runtime, key, options, keyType)
		}
		return EncodePrivateKey(runtime, key, options, keyType)
	})

	// equals(otherKey) - 比较非对称 KeyObject 是否等价
	keyObj.Set("equals", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}

		otherObj, ok := call.Arguments[0].(*goja.Object)
		if !ok || otherObj == nil {
			return runtime.ToValue(false)
		}

		// 自反性：同一对象直接返回 true
		if otherObj == keyObj {
			return runtime.ToValue(true)
		}

		// type / asymmetricKeyType 必须一致
		otherType := strings.ToLower(SafeGetString(otherObj.Get("type")))
		if otherType != keyObjType {
			return runtime.ToValue(false)
		}
		otherAsym := strings.ToLower(SafeGetString(otherObj.Get("asymmetricKeyType")))
		if otherAsym != strings.ToLower(keyType) {
			return runtime.ToValue(false)
		}

		lowerKeyType := strings.ToLower(keyType)

		// 特殊处理 X25519/X448: 直接比较公钥字节
		if lowerKeyType == "x25519" || lowerKeyType == "x448" {
			selfKey := keyObj.Get("_key")
			otherKeyVal := otherObj.Get("_key")
			if selfKey != nil && otherKeyVal != nil &&
				!goja.IsUndefined(selfKey) && !goja.IsUndefined(otherKeyVal) &&
				!goja.IsNull(selfKey) && !goja.IsNull(otherKeyVal) {
				selfExport := selfKey.Export()
				otherExport := otherKeyVal.Export()
				selfBytes, ok1 := selfExport.([]byte)
				otherBytes, ok2 := otherExport.([]byte)
				if ok1 && ok2 {
					if len(selfBytes) != len(otherBytes) {
						return runtime.ToValue(false)
					}
					for i := range selfBytes {
						if selfBytes[i] != otherBytes[i] {
							return runtime.ToValue(false)
						}
					}
					return runtime.ToValue(true)
				}
			}
		}

		// 特殊处理 EC: 直接比较椭圆曲线公钥坐标
		if lowerKeyType == "ec" {
			selfKey := keyObj.Get("_key")
			otherKeyVal := otherObj.Get("_key")
			if selfKey != nil && otherKeyVal != nil &&
				!goja.IsUndefined(selfKey) && !goja.IsUndefined(otherKeyVal) &&
				!goja.IsNull(selfKey) && !goja.IsNull(otherKeyVal) {
				selfExport := selfKey.Export()
				otherExport := otherKeyVal.Export()

				var selfPub, otherPub *ecdsa.PublicKey
				if pub, ok := selfExport.(*ecdsa.PublicKey); ok {
					selfPub = pub
				} else if priv, ok := selfExport.(*ecdsa.PrivateKey); ok {
					selfPub = &priv.PublicKey
				}
				if pub, ok := otherExport.(*ecdsa.PublicKey); ok {
					otherPub = pub
				} else if priv, ok := otherExport.(*ecdsa.PrivateKey); ok {
					otherPub = &priv.PublicKey
				}
				if selfPub != nil && otherPub != nil {
					// 比较曲线名称
					if selfPub.Curve.Params().Name != otherPub.Curve.Params().Name {
						return runtime.ToValue(false)
					}
					// 比较坐标
					if selfPub.X.Cmp(otherPub.X) != 0 || selfPub.Y.Cmp(otherPub.Y) != 0 {
						return runtime.ToValue(false)
					}
					return runtime.ToValue(true)
				}
			}
		}

		// 调用 export({ type, format: 'pem' }) 生成规范 PEM 再比较
		getPEM := func(obj *goja.Object) (string, error) {
			exportVal := obj.Get("export")
			exportFn, ok := goja.AssertFunction(exportVal)
			if !ok {
				return "", fmt.Errorf("export is not a function")
			}
			opts := runtime.NewObject()
			opts.Set("format", "pem")
			t := strings.ToLower(SafeGetString(obj.Get("type")))
			if t == "public" {
				opts.Set("type", "spki")
			} else if t == "private" {
				opts.Set("type", "pkcs8")
			}
			res, err := exportFn(obj, opts)
			if err != nil {
				return "", err
			}
			return res.String(), nil
		}

		selfPEM, err := getPEM(keyObj)
		if err != nil {
			return runtime.ToValue(false)
		}
		otherPEM, err := getPEM(otherObj)
		if err != nil {
			return runtime.ToValue(false)
		}

		return runtime.ToValue(selfPEM == otherPEM)
	})

	// 使属性不可变（与 Node.js 行为一致）
	MakeKeyObjectPropertiesImmutable(runtime, keyObj)

	return keyObj
}

// EncodeBase64URL Base64 URL 编码（无填充）
func EncodeBase64URL(data []byte) string {
	return strings.TrimRight(base64.URLEncoding.EncodeToString(data), "=")
}

// GenerateECKeyPair 生成 EC 密钥对
func GenerateECKeyPair(runtime *goja.Runtime, options *goja.Object) (goja.Value, goja.Value) {
	// 获取 namedCurve - 严格类型验证
	namedCurveVal := options.Get("namedCurve")
	if namedCurveVal == nil || goja.IsUndefined(namedCurveVal) || goja.IsNull(namedCurveVal) {
		panic(runtime.NewTypeError("The \"options.namedCurve\" property must be of type string. Received undefined"))
	}

	// 验证是否为字符串类型
	if exported := namedCurveVal.Export(); exported != nil {
		if _, ok := exported.(float64); ok {
			panic(runtime.NewTypeError("The \"options.namedCurve\" property must be of type string. Received number"))
		}
		if _, ok := exported.(int); ok {
			panic(runtime.NewTypeError("The \"options.namedCurve\" property must be of type string. Received number"))
		}
		if _, ok := exported.(int64); ok {
			panic(runtime.NewTypeError("The \"options.namedCurve\" property must be of type string. Received number"))
		}
	}

	// 安全地获取字符串值
	namedCurve := safeGetString(namedCurveVal, "namedCurve", runtime)
	if namedCurve == "" {
		panic(runtime.NewTypeError("The \"options.namedCurve\" property must be of type string. Received undefined"))
	}

	// 选择曲线并生成密钥对
	var privateKey *ecdsa.PrivateKey
	var err error

	switch namedCurve {
	case "prime256v1", "P-256", "secp256r1":
		privateKey, err = ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	case "secp256k1":
		// 使用 btcec 库生成 secp256k1 密钥
		btcPrivKey, btcErr := btcec.NewPrivateKey()
		if btcErr != nil {
			panic(runtime.NewGoError(fmt.Errorf("生成secp256k1密钥对失败: %w", btcErr)))
		}
		// 转换为标准 ecdsa.PrivateKey
		privateKey = btcPrivKey.ToECDSA()
	case "secp384r1", "P-384":
		privateKey, err = ecdsa.GenerateKey(elliptic.P384(), rand.Reader)
	case "secp521r1", "P-521":
		privateKey, err = ecdsa.GenerateKey(elliptic.P521(), rand.Reader)
	default:
		// 与 Node.js 行为对齐：无效 namedCurve 抛 TypeError
		panic(runtime.NewTypeError(fmt.Sprintf("unsupported curve '%s'", namedCurve)))
	}

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成EC密钥对失败: %w", err)))
	}

	// 检查编码选项
	pubEnc := options.Get("publicKeyEncoding")
	privEnc := options.Get("privateKeyEncoding")

	hasPublicEncoding := pubEnc != nil && !goja.IsUndefined(pubEnc) && !goja.IsNull(pubEnc)
	hasPrivateEncoding := privEnc != nil && !goja.IsUndefined(privEnc) && !goja.IsNull(privEnc)

	// 如果没有指定编码，返回 KeyObject
	if !hasPublicEncoding && !hasPrivateEncoding {
		return CreateKeyObject(runtime, privateKey.Public(), "ec"),
			CreateKeyObject(runtime, privateKey, "ec")
	}

	// 导出为指定格式
	var publicKeyOutput, privateKeyOutput goja.Value

	if hasPublicEncoding {
		publicKeyOutput = EncodePublicKey(runtime, privateKey.Public(), pubEnc.ToObject(runtime), "ec")
	} else {
		publicKeyOutput = CreateKeyObject(runtime, privateKey.Public(), "ec")
	}

	if hasPrivateEncoding {
		privateKeyOutput = EncodePrivateKey(runtime, privateKey, privEnc.ToObject(runtime), "ec")
	} else {
		privateKeyOutput = CreateKeyObject(runtime, privateKey, "ec")
	}

	return publicKeyOutput, privateKeyOutput
}

// GenerateEd25519KeyPair 生成 Ed25519 密钥对
func GenerateEd25519KeyPair(runtime *goja.Runtime, options *goja.Object) (goja.Value, goja.Value) {
	// 生成密钥对
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成Ed25519密钥对失败: %w", err)))
	}

	// 检查编码选项
	pubEnc := options.Get("publicKeyEncoding")
	privEnc := options.Get("privateKeyEncoding")

	hasPublicEncoding := pubEnc != nil && !goja.IsUndefined(pubEnc) && !goja.IsNull(pubEnc)
	hasPrivateEncoding := privEnc != nil && !goja.IsUndefined(privEnc) && !goja.IsNull(privEnc)

	// 如果没有指定编码，返回 KeyObject
	if !hasPublicEncoding && !hasPrivateEncoding {
		return CreateKeyObject(runtime, publicKey, "ed25519"),
			CreateKeyObject(runtime, privateKey, "ed25519")
	}

	// 导出为指定格式
	var publicKeyOutput, privateKeyOutput goja.Value

	if hasPublicEncoding {
		publicKeyOutput = EncodePublicKey(runtime, publicKey, pubEnc.ToObject(runtime), "ed25519")
	} else {
		publicKeyOutput = CreateKeyObject(runtime, publicKey, "ed25519")
	}

	if hasPrivateEncoding {
		privateKeyOutput = EncodePrivateKey(runtime, privateKey, privEnc.ToObject(runtime), "ed25519")
	} else {
		privateKeyOutput = CreateKeyObject(runtime, privateKey, "ed25519")
	}

	return publicKeyOutput, privateKeyOutput
}

// GenerateEd448KeyPair 生成 Ed448 密钥对
// 注意：Ed448 需要第三方库支持，目前返回兼容 Node.js 的错误信息
func GenerateEd448KeyPair(runtime *goja.Runtime, options *goja.Object) (goja.Value, goja.Value) {
	// 生成 Ed448 密钥对
	publicKey, privateKey, err := ed448lib.GenerateKey(rand.Reader)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成Ed448密钥对失败: %w", err)))
	}

	// 检查编码选项
	pubEnc := options.Get("publicKeyEncoding")
	privEnc := options.Get("privateKeyEncoding")

	hasPublicEncoding := pubEnc != nil && !goja.IsUndefined(pubEnc) && !goja.IsNull(pubEnc)
	hasPrivateEncoding := privEnc != nil && !goja.IsUndefined(privEnc) && !goja.IsNull(privEnc)

	// 如果没有指定编码，返回 KeyObject
	if !hasPublicEncoding && !hasPrivateEncoding {
		return CreateKeyObject(runtime, publicKey, "ed448"),
			CreateKeyObject(runtime, privateKey, "ed448")
	}

	// 有编码要求
	var publicKeyOutput, privateKeyOutput goja.Value

	if hasPublicEncoding {
		if pubEncObj, ok := pubEnc.(*goja.Object); ok && pubEncObj != nil {
			publicKeyOutput = EncodePublicKey(runtime, []byte(publicKey), pubEncObj, "ed448")
		}
	} else {
		publicKeyOutput = CreateKeyObject(runtime, publicKey, "ed448")
	}

	if hasPrivateEncoding {
		if privEncObj, ok := privEnc.(*goja.Object); ok && privEncObj != nil {
			privateKeyOutput = EncodePrivateKey(runtime, []byte(privateKey), privEncObj, "ed448")
		}
	} else {
		privateKeyOutput = CreateKeyObject(runtime, privateKey, "ed448")
	}

	return publicKeyOutput, privateKeyOutput
}

// GenerateX25519KeyPair 生成 X25519 密钥对
func GenerateX25519KeyPair(runtime *goja.Runtime, options *goja.Object) (goja.Value, goja.Value) {
	// 生成私钥
	var privateKeyBytes [32]byte
	if _, err := rand.Read(privateKeyBytes[:]); err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成X25519密钥对失败: %w", err)))
	}

	// 计算公钥
	var publicKeyBytes [32]byte
	curve25519.ScalarBaseMult(&publicKeyBytes, &privateKeyBytes)

	// 检查编码选项
	pubEnc := options.Get("publicKeyEncoding")
	privEnc := options.Get("privateKeyEncoding")

	hasPublicEncoding := pubEnc != nil && !goja.IsUndefined(pubEnc) && !goja.IsNull(pubEnc)
	hasPrivateEncoding := privEnc != nil && !goja.IsUndefined(privEnc) && !goja.IsNull(privEnc)

	// 如果没有指定编码，返回 KeyObject
	if !hasPublicEncoding && !hasPrivateEncoding {
		return CreateKeyObject(runtime, publicKeyBytes[:], "x25519", true), // 明确指定为公钥
			CreateKeyObject(runtime, privateKeyBytes[:], "x25519", false) // 明确指定为私钥
	}

	// 导出为指定格式
	var publicKeyOutput, privateKeyOutput goja.Value

	if hasPublicEncoding {
		publicKeyOutput = EncodePublicKey(runtime, publicKeyBytes[:], pubEnc.ToObject(runtime), "x25519")
	} else {
		publicKeyOutput = CreateKeyObject(runtime, publicKeyBytes[:], "x25519", true) // 公钥
	}

	if hasPrivateEncoding {
		privateKeyOutput = EncodePrivateKey(runtime, privateKeyBytes[:], privEnc.ToObject(runtime), "x25519")
	} else {
		privateKeyOutput = CreateKeyObject(runtime, privateKeyBytes[:], "x25519", false) // 私钥
	}

	return publicKeyOutput, privateKeyOutput
}

// GenerateX448KeyPair 生成 X448 密钥对
// 注意：X448 需要第三方库支持，目前返回兼容 Node.js 的错误信息
func GenerateX448KeyPair(runtime *goja.Runtime, options *goja.Object) (goja.Value, goja.Value) {
	// 生成 X448 密钥对
	var publicKey, privateKey x448lib.Key
	x448lib.KeyGen(&publicKey, &privateKey)

	// 检查编码选项
	pubEnc := options.Get("publicKeyEncoding")
	privEnc := options.Get("privateKeyEncoding")

	hasPublicEncoding := pubEnc != nil && !goja.IsUndefined(pubEnc) && !goja.IsNull(pubEnc)
	hasPrivateEncoding := privEnc != nil && !goja.IsUndefined(privEnc) && !goja.IsNull(privEnc)

	// 如果没有指定编码，返回 KeyObject
	if !hasPublicEncoding && !hasPrivateEncoding {
		return CreateKeyObject(runtime, publicKey[:], "x448", true), // 明确指定为公钥
			CreateKeyObject(runtime, privateKey[:], "x448", false) // 明确指定为私钥
	}

	// 有编码要求
	var publicKeyOutput, privateKeyOutput goja.Value

	if hasPublicEncoding {
		if pubEncObj, ok := pubEnc.(*goja.Object); ok && pubEncObj != nil {
			publicKeyOutput = EncodePublicKey(runtime, publicKey[:], pubEncObj, "x448")
		}
	} else {
		publicKeyOutput = CreateKeyObject(runtime, publicKey[:], "x448", true) // 公钥
	}

	if hasPrivateEncoding {
		if privEncObj, ok := privEnc.(*goja.Object); ok && privEncObj != nil {
			privateKeyOutput = EncodePrivateKey(runtime, privateKey[:], privEncObj, "x448")
		}
	} else {
		privateKeyOutput = CreateKeyObject(runtime, privateKey[:], "x448", false) // 私钥
	}

	return publicKeyOutput, privateKeyOutput
}

// GenerateDSAKeyPair 生成 DSA 密钥对
func GenerateDSAKeyPair(runtime *goja.Runtime, options *goja.Object) (goja.Value, goja.Value) {
	// 获取 modulusLength - 严格类型验证
	modulusLengthVal := options.Get("modulusLength")
	if modulusLengthVal == nil || goja.IsUndefined(modulusLengthVal) || goja.IsNull(modulusLengthVal) {
		panic(runtime.NewTypeError("The \"options.modulusLength\" property must be of type number. Received undefined"))
	}
	// 验证是否为数字类型
	if exported := modulusLengthVal.Export(); exported != nil {
		if _, ok := exported.(string); ok {
			panic(runtime.NewTypeError("The \"options.modulusLength\" property must be of type number. Received string"))
		}
	}
	modulusLength := int(modulusLengthVal.ToInteger())

	// 获取 divisorLength (可选) - 严格类型验证
	// Node.js 行为：当未显式提供 divisorLength 时，根据 modulusLength 使用匹配的标准组合：
	// - 1024 -> 160
	// - 2048 -> 256
	// - 3072 -> 256
	// 仅当用户显式提供 divisorLength 时才覆盖默认值
	divisorLength := 0
	divisorLengthVal := options.Get("divisorLength")
	if divisorLengthVal != nil && !goja.IsUndefined(divisorLengthVal) && !goja.IsNull(divisorLengthVal) {
		// 验证是否为数字类型
		if exported := divisorLengthVal.Export(); exported != nil {
			if _, ok := exported.(string); ok {
				panic(runtime.NewTypeError("The \"options.divisorLength\" property must be of type number. Received string"))
			}
			if intVal, ok := exported.(int64); ok {
				divisorLength = int(intVal)
			} else if floatVal, ok := exported.(float64); ok {
				divisorLength = int(floatVal)
			} else if intVal, ok := exported.(int); ok {
				divisorLength = intVal
			} else {
				// 尝试调用 ToInteger
				divisorLength = int(divisorLengthVal.ToInteger())
			}
		}
		// 验证 divisorLength 不能为 0 或负数
		if divisorLength <= 0 {
			panic(runtime.NewTypeError(fmt.Sprintf("The value of \"options.divisorLength\" is out of range. It must be > 0. Received %d", divisorLength)))
		}
	} else {
		// 未显式提供 divisorLength，根据 modulusLength 选择标准默认值
		switch modulusLength {
		case 1024:
			divisorLength = 160
		case 2048, 3072:
			// Node.js 在 2048/3072 下默认使用 N=256
			divisorLength = 256
		default:
			// 其它 modulusLength 交由后续组合校验抛错
			divisorLength = 0
		}
	}

	// 验证 DSA modulusLength 和 divisorLength 的合法组合
	// 根据 FIPS 186-4 标准：
	// - L=1024, N=160
	// - L=2048, N=224 或 256
	// - L=3072, N=256
	validCombination := false
	switch modulusLength {
	case 1024:
		if divisorLength == 160 {
			validCombination = true
		}
	case 2048:
		if divisorLength == 224 || divisorLength == 256 {
			validCombination = true
		}
	case 3072:
		if divisorLength == 256 {
			validCombination = true
		}
	}

	if !validCombination {
		panic(runtime.NewTypeError(fmt.Sprintf("Invalid DSA parameter combination: modulusLength=%d, divisorLength=%d. Valid combinations are: 1024/160, 2048/224, 2048/256, 3072/256", modulusLength, divisorLength)))
	}

	// 生成 DSA 参数
	var params dsa.Parameters
	var L dsa.ParameterSizes

	switch modulusLength {
	case 1024:
		L = dsa.L1024N160
	case 2048:
		if divisorLength == 256 {
			L = dsa.L2048N256
		} else {
			L = dsa.L2048N224
		}
	case 3072:
		L = dsa.L3072N256
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("Invalid DSA modulus length: %d", modulusLength)))
	}

	// 生成参数
	if err := dsa.GenerateParameters(&params, rand.Reader, L); err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成DSA参数失败: %w", err)))
	}

	// 生成密钥对
	var privateKey dsa.PrivateKey
	privateKey.Parameters = params
	if err := dsa.GenerateKey(&privateKey, rand.Reader); err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成DSA密钥对失败: %w", err)))
	}

	// 检查编码选项
	pubEnc := options.Get("publicKeyEncoding")
	privEnc := options.Get("privateKeyEncoding")

	hasPublicEncoding := pubEnc != nil && !goja.IsUndefined(pubEnc) && !goja.IsNull(pubEnc)
	hasPrivateEncoding := privEnc != nil && !goja.IsUndefined(privEnc) && !goja.IsNull(privEnc)

	// 如果没有指定编码，返回 KeyObject
	if !hasPublicEncoding && !hasPrivateEncoding {
		return CreateKeyObject(runtime, &privateKey.PublicKey, "dsa"),
			CreateKeyObject(runtime, &privateKey, "dsa")
	}

	// 导出为指定格式
	var publicKeyOutput, privateKeyOutput goja.Value

	if hasPublicEncoding {
		publicKeyOutput = EncodePublicKey(runtime, &privateKey.PublicKey, pubEnc.ToObject(runtime), "dsa")
	} else {
		publicKeyOutput = CreateKeyObject(runtime, &privateKey.PublicKey, "dsa")
	}

	if hasPrivateEncoding {
		privateKeyOutput = EncodePrivateKey(runtime, &privateKey, privEnc.ToObject(runtime), "dsa")
	} else {
		privateKeyOutput = CreateKeyObject(runtime, &privateKey, "dsa")
	}

	return publicKeyOutput, privateKeyOutput
}

// GenerateDHKeyPair 生成 DH (Diffie-Hellman) 密钥对
func GenerateDHKeyPair(runtime *goja.Runtime, options *goja.Object) (goja.Value, goja.Value) {
	// 获取 primeLength, prime, 和 group
	primeLengthVal := options.Get("primeLength")
	primeVal := options.Get("prime")
	groupVal := options.Get("group")

	hasPrimeLength := primeLengthVal != nil && !goja.IsUndefined(primeLengthVal) && !goja.IsNull(primeLengthVal)
	hasPrime := primeVal != nil && !goja.IsUndefined(primeVal) && !goja.IsNull(primeVal)
	hasGroup := groupVal != nil && !goja.IsUndefined(groupVal) && !goja.IsNull(groupVal)

	// Node.js 要求至少有其中之一
	if !hasPrimeLength && !hasPrime && !hasGroup {
		panic(runtime.NewGoError(fmt.Errorf("At least one of the group, prime, or primeLength options is required")))
	}

	var dhParams *DHParameters

	// 优先使用 group（标准组）
	if hasGroup {
		groupName := groupVal.String()
		dhParams = getDHStandardGroup(groupName)
		if dhParams == nil {
			panic(runtime.NewGoError(fmt.Errorf("Unknown DH group: %s", groupName)))
		}
	} else if hasPrime {
		// 使用提供的 prime
		panic(runtime.NewGoError(fmt.Errorf("Custom prime parameter is not yet fully supported")))
	} else if hasPrimeLength {
		// 使用 primeLength 生成新的素数 - 严格类型验证
		if exported := primeLengthVal.Export(); exported != nil {
			if _, ok := exported.(string); ok {
				panic(runtime.NewTypeError("The \"options.primeLength\" property must be of type number. Received string"))
			}
		}
		primeLength := int(primeLengthVal.ToInteger())

		generator := 2 // 默认生成器
		generatorVal := options.Get("generator")
		if generatorVal != nil && !goja.IsUndefined(generatorVal) && !goja.IsNull(generatorVal) {
			// 严格验证 generator 必须是数字
			if exported := generatorVal.Export(); exported != nil {
				if _, ok := exported.(string); ok {
					panic(runtime.NewTypeError("The \"options.generator\" property must be of type number. Received string"))
				}
			}
			generator = int(generatorVal.ToInteger())
		}

		// 验证参数
		if primeLength < 512 {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid prime length %d (minimum 512)", primeLength)))
		}
		if generator != 2 && generator != 5 {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid generator %d (must be 2 or 5)", generator)))
		}

		// 生成安全素数 p (Sophie Germain prime: p = 2q + 1, where q is also prime)
		prime, err := generateSafePrime(primeLength)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("生成DH安全素数失败: %w", err)))
		}

		// 创建 DH 参数
		dhParams = &DHParameters{
			P: prime,
			G: big.NewInt(int64(generator)),
		}
	}

	// 生成私钥 (随机数 < p)
	privateKeyInt, err := rand.Int(rand.Reader, new(big.Int).Sub(dhParams.P, big.NewInt(1)))
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成DH私钥失败: %w", err)))
	}
	// 确保私钥至少为 2
	if privateKeyInt.Cmp(big.NewInt(2)) < 0 {
		privateKeyInt = big.NewInt(2)
	}

	// 生成公钥 y = g^x mod p
	publicKeyInt := new(big.Int).Exp(dhParams.G, privateKeyInt, dhParams.P)

	// 创建密钥对对象
	dhPublicKey := &DHPublicKey{
		Parameters: *dhParams,
		Y:          publicKeyInt,
	}

	dhPrivateKey := &DHPrivateKey{
		Parameters: *dhParams,
		X:          privateKeyInt,
		Y:          publicKeyInt,
	}

	// 检查编码选项
	pubEnc := options.Get("publicKeyEncoding")
	privEnc := options.Get("privateKeyEncoding")

	hasPublicEncoding := pubEnc != nil && !goja.IsUndefined(pubEnc) && !goja.IsNull(pubEnc)
	hasPrivateEncoding := privEnc != nil && !goja.IsUndefined(privEnc) && !goja.IsNull(privEnc)

	// 如果没有指定编码，返回 KeyObject
	if !hasPublicEncoding && !hasPrivateEncoding {
		return CreateKeyObject(runtime, dhPublicKey, "dh"),
			CreateKeyObject(runtime, dhPrivateKey, "dh")
	}

	// 导出为指定格式
	var publicKeyOutput, privateKeyOutput goja.Value

	if hasPublicEncoding {
		publicKeyOutput = EncodeDHPublicKey(runtime, dhPublicKey, pubEnc.ToObject(runtime))
	} else {
		publicKeyOutput = CreateKeyObject(runtime, dhPublicKey, "dh")
	}

	if hasPrivateEncoding {
		privateKeyOutput = EncodeDHPrivateKey(runtime, dhPrivateKey, privEnc.ToObject(runtime))
	} else {
		privateKeyOutput = CreateKeyObject(runtime, dhPrivateKey, "dh")
	}

	return publicKeyOutput, privateKeyOutput
}

// EncodePublicKey 将公钥编码为指定格式
func EncodePublicKey(runtime *goja.Runtime, publicKey interface{}, encoding *goja.Object, keyType string) goja.Value {
	typeVal := encoding.Get("type")
	formatVal := encoding.Get("format")

	if goja.IsUndefined(formatVal) || goja.IsNull(formatVal) {
		panic(runtime.NewTypeError("publicKeyEncoding 需要 format 属性"))
	}

	// 安全地获取格式字符串
	format := safeGetString(formatVal, "format", runtime)

	// 验证格式
	if format != "pem" && format != "der" && format != "jwk" {
		panic(runtime.NewTypeError(fmt.Sprintf("The property 'options.publicKeyEncoding.format' is invalid. Received '%s'", format)))
	}

	// JWK 格式不需要 type 字段
	if format == "jwk" {
		return EncodePublicKeyJWK(runtime, publicKey, keyType)
	}

	// PEM 和 DER 格式需要 type 字段
	if goja.IsUndefined(typeVal) || goja.IsNull(typeVal) {
		panic(runtime.NewTypeError("publicKeyEncoding 需要 type 属性 (当 format 为 pem 或 der 时)"))
	}

	// 安全地获取类型字符串
	encType := safeGetString(typeVal, "type", runtime)

	// 验证类型
	if encType != "spki" && encType != "pkcs1" {
		panic(runtime.NewTypeError(fmt.Sprintf("The property 'options.publicKeyEncoding.type' is invalid. Received '%s'", encType)))
	}

	// 将公钥编码为 DER
	var derBytes []byte
	var err error

	if encType == "spki" {
		// X25519/X448/Ed448 的公钥是字节数组，需要特殊处理
		if keyBytes, ok := publicKey.([]byte); ok {
			if keyType == "x25519" {
				derBytes, err = MarshalX25519PublicKey(keyBytes)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码X25519公钥失败: %w", err)))
				}
			} else if keyType == "x448" {
				derBytes, err = MarshalX448PublicKey(keyBytes)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码X448公钥失败: %w", err)))
				}
			} else if keyType == "ed448" {
				derBytes, err = MarshalEd448PublicKeyPKIX(keyBytes)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码Ed448公钥失败: %w", err)))
				}
			} else {
				panic(runtime.NewGoError(fmt.Errorf("不支持的字节数组密钥类型: %s", keyType)))
			}
		} else if ed448Pub, ok := publicKey.(ed448lib.PublicKey); ok && keyType == "ed448" {
			// Ed448 使用自定义编码
			derBytes, err = MarshalEd448PublicKeyPKIX([]byte(ed448Pub))
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("编码Ed448公钥失败: %w", err)))
			}
		} else if ed25519Pub, ok := publicKey.(ed25519.PublicKey); ok && keyType == "ed25519" {
			// Ed25519 使用自定义编码以确保兼容性
			derBytes, err = MarshalEd25519PublicKeyPKIX(ed25519Pub)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("编码Ed25519公钥失败: %w", err)))
			}
		} else if dsaPub, ok := publicKey.(*dsa.PublicKey); ok && keyType == "dsa" {
			// DSA 需要手动编码
			derBytes, err = MarshalDSAPublicKeyPKIX(dsaPub)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("编码DSA公钥失败: %w", err)))
			}
		} else if ecPub, ok := publicKey.(*ecdsa.PublicKey); ok && keyType == "ec" {
			// 检查是否是 secp256k1
			if ecPub.Curve == btcec.S256() {
				// secp256k1 需要自定义编码
				derBytes, err = MarshalSecp256k1PublicKeyPKIX(ecPub)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码secp256k1公钥失败: %w", err)))
				}
			} else {
				// 其他标准曲线使用 x509
				derBytes, err = x509.MarshalPKIXPublicKey(publicKey)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码公钥失败: %w", err)))
				}
			}
		} else {
			derBytes, err = x509.MarshalPKIXPublicKey(publicKey)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("编码公钥失败: %w", err)))
			}
		}
	} else if encType == "pkcs1" {
		// PKCS1 仅适用于 RSA
		if rsaPub, ok := publicKey.(*rsa.PublicKey); ok {
			derBytes = x509.MarshalPKCS1PublicKey(rsaPub)
		} else {
			panic(runtime.NewTypeError("pkcs1 编码仅适用于 RSA 密钥"))
		}
	}

	// 返回 DER 或 PEM
	if format == "der" {
		return CreateBuffer(runtime, derBytes)
	}

	// PEM 编码
	var pemType string
	if encType == "pkcs1" {
		pemType = "RSA PUBLIC KEY"
	} else {
		pemType = "PUBLIC KEY"
	}

	pemBytes := pem.EncodeToMemory(&pem.Block{
		Type:  pemType,
		Bytes: derBytes,
	})

	return runtime.ToValue(string(pemBytes))
}

// EncodePrivateKey 将私钥编码为指定格式
func EncodePrivateKey(runtime *goja.Runtime, privateKey interface{}, encoding *goja.Object, keyType string) goja.Value {
	typeVal := encoding.Get("type")
	formatVal := encoding.Get("format")

	if goja.IsUndefined(formatVal) || goja.IsNull(formatVal) {
		panic(runtime.NewTypeError("privateKeyEncoding 需要 format 属性"))
	}

	// 安全地获取格式字符串
	format := safeGetString(formatVal, "format", runtime)

	// 验证格式
	if format != "pem" && format != "der" && format != "jwk" {
		panic(runtime.NewTypeError(fmt.Sprintf("The property 'options.privateKeyEncoding.format' is invalid. Received '%s'", format)))
	}

	// JWK 格式不需要 type 字段
	if format == "jwk" {
		return EncodePrivateKeyJWK(runtime, privateKey, keyType)
	}

	// PEM 和 DER 格式需要 type 字段
	if goja.IsUndefined(typeVal) || goja.IsNull(typeVal) {
		panic(runtime.NewTypeError("privateKeyEncoding 需要 type 属性 (当 format 为 pem 或 der 时)"))
	}

	// 安全地获取类型字符串
	encType := safeGetString(typeVal, "type", runtime)

	// 获取加密选项
	cipherVal := encoding.Get("cipher")
	passphraseVal := encoding.Get("passphrase")

	hasCipher := cipherVal != nil && !goja.IsUndefined(cipherVal) && !goja.IsNull(cipherVal)
	hasPassphrase := passphraseVal != nil && !goja.IsUndefined(passphraseVal) && !goja.IsNull(passphraseVal)

	// 将私钥编码为 DER
	var derBytes []byte
	var err error

	if encType == "pkcs8" {
		// X25519/X448/Ed448 的私钥是字节数组，需要特殊处理
		if keyBytes, ok := privateKey.([]byte); ok {
			if keyType == "x25519" {
				derBytes, err = MarshalX25519PrivateKey(keyBytes)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码X25519私钥失败: %w", err)))
				}
			} else if keyType == "x448" {
				derBytes, err = MarshalX448PrivateKey(keyBytes)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码X448私钥失败: %w", err)))
				}
			} else if keyType == "ed448" {
				derBytes, err = MarshalEd448PrivateKeyPKCS8(keyBytes)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码Ed448私钥失败: %w", err)))
				}
			} else {
				panic(runtime.NewGoError(fmt.Errorf("不支持的字节数组私钥类型: %s", keyType)))
			}
		} else if ed448Priv, ok := privateKey.(ed448lib.PrivateKey); ok && keyType == "ed448" {
			// Ed448 使用自定义编码
			derBytes, err = MarshalEd448PrivateKeyPKCS8([]byte(ed448Priv))
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("编码Ed448私钥失败: %w", err)))
			}
		} else if ed25519Priv, ok := privateKey.(ed25519.PrivateKey); ok && keyType == "ed25519" {
			// Ed25519 使用自定义编码以确保兼容性
			derBytes, err = MarshalEd25519PrivateKeyPKCS8(ed25519Priv)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("编码Ed25519私钥失败: %w", err)))
			}
		} else if dsaPriv, ok := privateKey.(*dsa.PrivateKey); ok && keyType == "dsa" {
			// DSA 需要手动编码
			derBytes, err = MarshalDSAPrivateKeyPKCS8(dsaPriv)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("编码DSA私钥失败: %w", err)))
			}
		} else if ecPriv, ok := privateKey.(*ecdsa.PrivateKey); ok && keyType == "ec" {
			// 检查是否是 secp256k1
			if ecPriv.Curve == btcec.S256() {
				// secp256k1 需要自定义编码
				derBytes, err = MarshalSecp256k1PrivateKeyPKCS8(ecPriv)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码secp256k1私钥失败: %w", err)))
				}
			} else {
				// 其他标准曲线使用 x509
				derBytes, err = x509.MarshalPKCS8PrivateKey(privateKey)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码私钥失败: %w", err)))
				}
			}
		} else {
			derBytes, err = x509.MarshalPKCS8PrivateKey(privateKey)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("编码私钥失败: %w", err)))
			}
		}
	} else if encType == "pkcs1" {
		// PKCS1 仅适用于 RSA
		if rsaPriv, ok := privateKey.(*rsa.PrivateKey); ok {
			derBytes = x509.MarshalPKCS1PrivateKey(rsaPriv)
		} else {
			panic(runtime.NewTypeError("pkcs1 编码仅适用于 RSA 密钥"))
		}
	} else if encType == "sec1" {
		// SEC1 仅适用于 EC 私钥
		if ecPriv, ok := privateKey.(*ecdsa.PrivateKey); ok {
			// Go 标准库 x509.MarshalECPrivateKey 不支持 secp256k1，需要走自定义编码
			if ecPriv.Curve == btcec.S256() {
				derBytes, err = MarshalSecp256k1PrivateKeySEC1(ecPriv)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码secp256k1 EC私钥失败: %w", err)))
				}
			} else {
				derBytes, err = x509.MarshalECPrivateKey(ecPriv)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("编码EC私钥失败: %w", err)))
				}
			}
		} else {
			panic(runtime.NewTypeError("sec1 编码仅适用于 EC 密钥"))
		}
	} else {
		panic(runtime.NewTypeError(fmt.Sprintf("The property 'options.privateKeyEncoding.type' is invalid. Received '%s'", encType)))
	}

	// 返回 DER 或 PEM
	if format == "der" {
		return CreateBuffer(runtime, derBytes)
	}

	// PEM 编码
	var pemBlock *pem.Block
	var pemType string

	if encType == "pkcs1" {
		pemType = "RSA PRIVATE KEY"
	} else if encType == "sec1" {
		pemType = "EC PRIVATE KEY"
	} else {
		pemType = "PRIVATE KEY"
	}

	pemBlock = &pem.Block{
		Type:  pemType,
		Bytes: derBytes,
	}

	// 如果指定了加密
	if hasCipher && hasPassphrase {
		// 安全地获取 cipher 和 passphrase 字符串
		cipher := safeGetString(cipherVal, "cipher", runtime)
		passphrase := safeGetString(passphraseVal, "passphrase", runtime)

		if encType == "pkcs8" {
			// PKCS#8 使用本地 PBES2 加密实现，与 DecryptPKCS8PrivateKeyLocal 完全对齐
			pemBlock, err = encryptPEMBlock(pemBlock, cipher, passphrase)
			if err != nil {
				panic(runtime.NewGoError(err))
			}
		} else {
			// PKCS1/SEC1 仍然使用传统 PEM 加密（Proc-Type + DEK-Info）
			pemCipher, isValid := CipherToPEMCipher(cipher)
			if !isValid {
				panic(runtime.NewGoError(fmt.Errorf("Unknown cipher: %s", cipher)))
			}

			pemBlock, err = x509.EncryptPEMBlock(rand.Reader, pemBlock.Type, pemBlock.Bytes, []byte(passphrase), pemCipher)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("加密私钥失败: %w", err)))
			}
		}
	}

	pemBytes := pem.EncodeToMemory(pemBlock)
	return runtime.ToValue(string(pemBytes))
}

// CipherToPEMCipher 将密码名称转换为 PEM 加密算法
// 返回 (cipher, isValid)
func CipherToPEMCipher(cipher string) (x509.PEMCipher, bool) {
	switch cipher {
	case "aes-128-cbc", "aes128":
		return x509.PEMCipherAES128, true
	case "aes-192-cbc", "aes192":
		return x509.PEMCipherAES192, true
	case "aes-256-cbc", "aes256":
		return x509.PEMCipherAES256, true
	case "des-ede3-cbc", "des3":
		return x509.PEMCipher3DES, true
	default:
		return 0, false // 无效的 cipher
	}
}

// EncodePublicKeyJWK 将公钥编码为 JWK 格式
func EncodePublicKeyJWK(runtime *goja.Runtime, publicKey interface{}, keyType string) goja.Value {
	jwk := runtime.NewObject()

	switch keyType {
	case "ed25519":
		if pub, ok := publicKey.(ed25519.PublicKey); ok {
			jwk.Set("kty", "OKP")
			jwk.Set("crv", "Ed25519")
			jwk.Set("x", EncodeBase64URL(pub))
		}
	case "ed448":
		if pubBytes, ok := publicKey.([]byte); ok {
			jwk.Set("kty", "OKP")
			jwk.Set("crv", "Ed448")
			jwk.Set("x", EncodeBase64URL(pubBytes))
		} else if pub, ok := publicKey.(ed448lib.PublicKey); ok {
			jwk.Set("kty", "OKP")
			jwk.Set("crv", "Ed448")
			jwk.Set("x", EncodeBase64URL([]byte(pub)))
		}
	case "x25519":
		if pubBytes, ok := publicKey.([]byte); ok {
			jwk.Set("kty", "OKP")
			jwk.Set("crv", "X25519")
			jwk.Set("x", EncodeBase64URL(pubBytes))
		}
	case "x448":
		if pubBytes, ok := publicKey.([]byte); ok {
			jwk.Set("kty", "OKP")
			jwk.Set("crv", "X448")
			jwk.Set("x", EncodeBase64URL(pubBytes))
		}
	case "ec":
		if pub, ok := publicKey.(*ecdsa.PublicKey); ok {
			jwk.Set("kty", "EC")
			// 设置曲线名称
			curveName := ""
			switch pub.Curve {
			case elliptic.P256():
				curveName = "P-256"
			case elliptic.P384():
				curveName = "P-384"
			case elliptic.P521():
				curveName = "P-521"
			case btcec.S256():
				curveName = "secp256k1"
			}
			jwk.Set("crv", curveName)
			// 需要固定长度的坐标，填充到曲线字节大小
			curveBytes := (pub.Curve.Params().BitSize + 7) / 8
			xBytes := pub.X.Bytes()
			yBytes := pub.Y.Bytes()
			// 左填充零
			if len(xBytes) < curveBytes {
				paddedX := make([]byte, curveBytes)
				copy(paddedX[curveBytes-len(xBytes):], xBytes)
				xBytes = paddedX
			}
			if len(yBytes) < curveBytes {
				paddedY := make([]byte, curveBytes)
				copy(paddedY[curveBytes-len(yBytes):], yBytes)
				yBytes = paddedY
			}
			jwk.Set("x", EncodeBase64URL(xBytes))
			jwk.Set("y", EncodeBase64URL(yBytes))
		}
	case "rsa":
		if pub, ok := publicKey.(*rsa.PublicKey); ok {
			jwk.Set("kty", "RSA")
			jwk.Set("n", EncodeBase64URL(pub.N.Bytes()))
			jwk.Set("e", EncodeBase64URL(big.NewInt(int64(pub.E)).Bytes()))
		}
	}

	return jwk
}

// EncodePrivateKeyJWK 将私钥编码为 JWK 格式
func EncodePrivateKeyJWK(runtime *goja.Runtime, privateKey interface{}, keyType string) goja.Value {
	jwk := runtime.NewObject()

	switch keyType {
	case "ed25519":
		if priv, ok := privateKey.(ed25519.PrivateKey); ok {
			jwk.Set("kty", "OKP")
			jwk.Set("crv", "Ed25519")
			// Ed25519 私钥是 64 字节，前 32 字节是种子，后 32 字节是公钥
			jwk.Set("d", EncodeBase64URL(priv[:32]))
			jwk.Set("x", EncodeBase64URL(priv[32:]))
		}
	case "ed448":
		if privBytes, ok := privateKey.([]byte); ok && len(privBytes) == ed448lib.PrivateKeySize {
			jwk.Set("kty", "OKP")
			jwk.Set("crv", "Ed448")
			// Ed448 私钥的前 57 字节是私钥种子，后 57 字节是公钥
			jwk.Set("d", EncodeBase64URL(privBytes[:57]))
			jwk.Set("x", EncodeBase64URL(privBytes[57:]))
		} else if priv, ok := privateKey.(ed448lib.PrivateKey); ok {
			jwk.Set("kty", "OKP")
			jwk.Set("crv", "Ed448")
			privBytes := []byte(priv)
			jwk.Set("d", EncodeBase64URL(privBytes[:57]))
			jwk.Set("x", EncodeBase64URL(privBytes[57:]))
		}
	case "x25519":
		if privBytes, ok := privateKey.([]byte); ok && len(privBytes) == 32 {
			jwk.Set("kty", "OKP")
			jwk.Set("crv", "X25519")
			// 计算公钥
			var publicKeyBytes [32]byte
			var privateKeyArr [32]byte
			copy(privateKeyArr[:], privBytes)
			curve25519.ScalarBaseMult(&publicKeyBytes, &privateKeyArr)
			jwk.Set("d", EncodeBase64URL(privBytes))
			jwk.Set("x", EncodeBase64URL(publicKeyBytes[:]))
		}
	case "x448":
		if privBytes, ok := privateKey.([]byte); ok && len(privBytes) == 56 {
			jwk.Set("kty", "OKP")
			jwk.Set("crv", "X448")
			// 计算公钥
			var publicKey, privateKey x448lib.Key
			copy(privateKey[:], privBytes)
			x448lib.KeyGen(&publicKey, &privateKey)
			jwk.Set("d", EncodeBase64URL(privBytes))
			jwk.Set("x", EncodeBase64URL(publicKey[:]))
		}
	case "ec":
		if priv, ok := privateKey.(*ecdsa.PrivateKey); ok {
			jwk.Set("kty", "EC")
			// 设置曲线名称
			curveName := ""
			switch priv.Curve {
			case elliptic.P256():
				curveName = "P-256"
			case elliptic.P384():
				curveName = "P-384"
			case elliptic.P521():
				curveName = "P-521"
			case btcec.S256():
				curveName = "secp256k1"
			}
			jwk.Set("crv", curveName)
			// 需要固定长度的坐标，填充到曲线字节大小
			curveBytes := (priv.Curve.Params().BitSize + 7) / 8
			xBytes := priv.X.Bytes()
			yBytes := priv.Y.Bytes()
			dBytes := priv.D.Bytes()
			// 左填充零
			if len(xBytes) < curveBytes {
				paddedX := make([]byte, curveBytes)
				copy(paddedX[curveBytes-len(xBytes):], xBytes)
				xBytes = paddedX
			}
			if len(yBytes) < curveBytes {
				paddedY := make([]byte, curveBytes)
				copy(paddedY[curveBytes-len(yBytes):], yBytes)
				yBytes = paddedY
			}
			if len(dBytes) < curveBytes {
				paddedD := make([]byte, curveBytes)
				copy(paddedD[curveBytes-len(dBytes):], dBytes)
				dBytes = paddedD
			}
			jwk.Set("x", EncodeBase64URL(xBytes))
			jwk.Set("y", EncodeBase64URL(yBytes))
			jwk.Set("d", EncodeBase64URL(dBytes))
		}
	case "rsa":
		if priv, ok := privateKey.(*rsa.PrivateKey); ok {
			jwk.Set("kty", "RSA")
			jwk.Set("n", EncodeBase64URL(priv.N.Bytes()))
			jwk.Set("e", EncodeBase64URL(big.NewInt(int64(priv.E)).Bytes()))
			jwk.Set("d", EncodeBase64URL(priv.D.Bytes()))
			jwk.Set("p", EncodeBase64URL(priv.Primes[0].Bytes()))
			jwk.Set("q", EncodeBase64URL(priv.Primes[1].Bytes()))
			// 计算 dp, dq, qi
			// dp = d mod (p-1)
			// dq = d mod (q-1)
			// qi = q^-1 mod p
			one := big.NewInt(1)
			pMinus1 := new(big.Int).Sub(priv.Primes[0], one)
			qMinus1 := new(big.Int).Sub(priv.Primes[1], one)
			dp := new(big.Int).Mod(priv.D, pMinus1)
			dq := new(big.Int).Mod(priv.D, qMinus1)
			qi := new(big.Int).ModInverse(priv.Primes[1], priv.Primes[0])
			jwk.Set("dp", EncodeBase64URL(dp.Bytes()))
			jwk.Set("dq", EncodeBase64URL(dq.Bytes()))
			jwk.Set("qi", EncodeBase64URL(qi.Bytes()))
		}
	}

	return jwk
}

// ============================================================================
// 🔥 DH (Diffie-Hellman) 支持
// ============================================================================

// DHParameters DH 参数
type DHParameters struct {
	P *big.Int // 素数 p
	G *big.Int // 生成器 g
}

// DHPublicKey DH 公钥
type DHPublicKey struct {
	Parameters DHParameters
	Y          *big.Int // 公钥值 y = g^x mod p
}

// DHPrivateKey DH 私钥
type DHPrivateKey struct {
	Parameters DHParameters
	X          *big.Int // 私钥值 x
	Y          *big.Int // 对应的公钥值
}

// generateSafePrime 动态生成安全素数（与 Node.js 行为一致）
// 安全素数：p 是素数，且 (p-1)/2 也是素数（Sophie Germain prime）
func generateSafePrime(bits int) (*big.Int, error) {
	if bits < 512 {
		return nil, fmt.Errorf("素数长度必须至少为 512 位")
	}

	// 对于常用的标准长度，优先使用 RFC 定义的预计算素数（速度更快）
	if p := getStandardDHPrime(bits); p != nil {
		return p, nil
	}

	// 其他长度动态生成安全素数
	return generateSophieGermainPrime(bits)
}

// getStandardDHPrime 返回标准 RFC 定义的 DH 素数（如果存在）
func getStandardDHPrime(bits int) *big.Int {
	switch bits {
	case 768:
		// RFC 2409 - 768-bit MODP Group (Oakley Group 1)
		p, _ := new(big.Int).SetString("1552518092300708935130918131258481755631334049434514313202351194902966239949102107258669453876591642442910007680288864229150803718918046342632727613031282983744380820890196288509170691316593175367469551763119843371637221007210577919", 10)
		return p
	case 1024:
		// RFC 2409 - 1024-bit MODP Group (Oakley Group 2)
		p, _ := new(big.Int).SetString("179769313486231590770839156793787453197860296048756011706444423684197180216158519368947833795864925541502180565485980503646440548199239100050792877003355816639229553136239076508735759914822574862575007425302077447712589550957937778424442426617334727629299387668709205606050270810842907692932019128194467627007", 10)
		return p
	case 1536:
		// RFC 3526 - 1536-bit MODP Group (Group 5)
		p, _ := new(big.Int).SetString("2410312426921032588552076022197566074856950548502459942654116941958108831682612228890093858261341614673227141477904012196503648957050582631942730706805009223062734745341073406696246014589361659774041027169249453200378729434170325843778659198143763193776859869524088940195577346119843545301547043747207749969763750084308926339295559968882457872412993810129130294592999947926365264059284647209730384947211681434464714438488520940127459844288859336526896320919633919", 10)
		return p
	case 2048:
		// RFC 3526 - 2048-bit MODP Group (Group 14)
		p, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
		return p
	case 3072:
		// RFC 3526 - 3072-bit MODP Group (Group 15)
		p, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF", 16)
		return p
	case 4096:
		// RFC 3526 - 4096-bit MODP Group (Group 16)
		p, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C934063199FFFFFFFFFFFFFFFF", 16)
		return p
	default:
		return nil
	}
}

// generateSophieGermainPrime 动态生成 Sophie Germain 素数
// 这是一个安全素数：p 是素数，且 q = (p-1)/2 也是素数
func generateSophieGermainPrime(bits int) (*big.Int, error) {
	if bits < 512 {
		return nil, fmt.Errorf("素数长度必须至少为 512 位")
	}

	// 使用 crypto/rand 生成高质量随机数
	one := big.NewInt(1)
	two := big.NewInt(2)

	// 最大尝试次数，防止无限循环
	maxAttempts := bits * 5

	for attempt := 0; attempt < maxAttempts; attempt++ {
		// 生成一个随机的 (bits-1) 位素数 q
		q, err := rand.Prime(rand.Reader, bits-1)
		if err != nil {
			return nil, fmt.Errorf("生成随机素数失败: %w", err)
		}

		// 计算 p = 2q + 1
		p := new(big.Int).Mul(q, two)
		p.Add(p, one)

		// 检查 p 是否是素数
		// 使用 Miller-Rabin 素性测试，20 轮足够确保准确性
		if p.ProbablyPrime(20) {
			// 确保 p 的位数正确
			if p.BitLen() == bits {
				return p, nil
			}
		}
	}

	return nil, fmt.Errorf("在 %d 次尝试后未能生成 %d 位安全素数", maxAttempts, bits)
}

// EncodeDHPublicKey 编码 DH 公钥
func EncodeDHPublicKey(runtime *goja.Runtime, publicKey *DHPublicKey, encoding *goja.Object) goja.Value {
	formatVal := encoding.Get("format")
	if goja.IsUndefined(formatVal) || goja.IsNull(formatVal) {
		panic(runtime.NewTypeError("publicKeyEncoding 需要 format 属性"))
	}

	// 安全地获取格式字符串
	format := safeGetString(formatVal, "format", runtime)

	typeVal := encoding.Get("type")
	if goja.IsUndefined(typeVal) || goja.IsNull(typeVal) {
		panic(runtime.NewTypeError("publicKeyEncoding 需要 type 属性"))
	}

	// 安全地获取类型字符串
	encType := safeGetString(typeVal, "type", runtime)

	if encType != "spki" {
		panic(runtime.NewTypeError("DH 公钥仅支持 spki 类型"))
	}

	// 编码为 SPKI/DER
	derBytes, err := MarshalDHPublicKeyPKIX(publicKey)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("编码DH公钥失败: %w", err)))
	}

	if format == "der" {
		return CreateBuffer(runtime, derBytes)
	}

	// PEM 格式
	pemBytes := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: derBytes,
	})

	return runtime.ToValue(string(pemBytes))
}

// EncodeDHPrivateKey 编码 DH 私钥
func EncodeDHPrivateKey(runtime *goja.Runtime, privateKey *DHPrivateKey, encoding *goja.Object) goja.Value {
	formatVal := encoding.Get("format")
	if goja.IsUndefined(formatVal) || goja.IsNull(formatVal) {
		panic(runtime.NewTypeError("privateKeyEncoding 需要 format 属性"))
	}

	// 安全地获取格式字符串
	format := safeGetString(formatVal, "format", runtime)

	typeVal := encoding.Get("type")
	if goja.IsUndefined(typeVal) || goja.IsNull(typeVal) {
		panic(runtime.NewTypeError("privateKeyEncoding 需要 type 属性"))
	}

	// 安全地获取类型字符串
	encType := safeGetString(typeVal, "type", runtime)

	if encType != "pkcs8" {
		panic(runtime.NewTypeError("DH 私钥仅支持 pkcs8 类型"))
	}

	// 编码为 PKCS#8/DER
	derBytes, err := MarshalDHPrivateKeyPKCS8(privateKey)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("编码DH私钥失败: %w", err)))
	}

	if format == "der" {
		return CreateBuffer(runtime, derBytes)
	}

	// PEM 格式
	pemBytes := pem.EncodeToMemory(&pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: derBytes,
	})

	return runtime.ToValue(string(pemBytes))
}

// MarshalDHPublicKeyPKIX 将 DH 公钥编码为 SPKI 格式
func MarshalDHPublicKeyPKIX(pub *DHPublicKey) ([]byte, error) {
	// DH OID: 1.2.840.113549.1.3.1
	oidDH := asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 3, 1}

	// 编码参数
	type dhParameters struct {
		P, G *big.Int
	}
	paramsBytes, err := asn1.Marshal(dhParameters{
		P: pub.Parameters.P,
		G: pub.Parameters.G,
	})
	if err != nil {
		return nil, err
	}

	// 编码公钥值
	pubBytes, err := asn1.Marshal(pub.Y)
	if err != nil {
		return nil, err
	}

	// 创建 SPKI 结构
	type subjectPublicKeyInfo struct {
		Algorithm pkix.AlgorithmIdentifier
		PublicKey asn1.BitString
	}

	spki := subjectPublicKeyInfo{
		Algorithm: pkix.AlgorithmIdentifier{
			Algorithm:  oidDH,
			Parameters: asn1.RawValue{FullBytes: paramsBytes},
		},
		PublicKey: asn1.BitString{
			Bytes:     pubBytes,
			BitLength: len(pubBytes) * 8,
		},
	}

	return asn1.Marshal(spki)
}

// MarshalDHPrivateKeyPKCS8 将 DH 私钥编码为 PKCS#8 格式
func MarshalDHPrivateKeyPKCS8(priv *DHPrivateKey) ([]byte, error) {
	// DH OID: 1.2.840.113549.1.3.1
	oidDH := asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 3, 1}

	// 编码参数
	type dhParameters struct {
		P, G *big.Int
	}
	paramsBytes, err := asn1.Marshal(dhParameters{
		P: priv.Parameters.P,
		G: priv.Parameters.G,
	})
	if err != nil {
		return nil, err
	}

	// 编码私钥值
	privBytes, err := asn1.Marshal(priv.X)
	if err != nil {
		return nil, err
	}

	// 创建 PKCS#8 结构
	type pkcs8 struct {
		Version    int
		Algo       pkix.AlgorithmIdentifier
		PrivateKey []byte
	}

	pkcs8Struct := pkcs8{
		Version: 0,
		Algo: pkix.AlgorithmIdentifier{
			Algorithm:  oidDH,
			Parameters: asn1.RawValue{FullBytes: paramsBytes},
		},
		PrivateKey: privBytes,
	}

	return asn1.Marshal(pkcs8Struct)
}

// ============================================================================
// 🔥 secp256k1 编码支持
// ============================================================================

// secp256k1 OID: 1.3.132.0.10
var oidSecp256k1 = asn1.ObjectIdentifier{1, 3, 132, 0, 10}

// MarshalSecp256k1PublicKeyPKIX 将 secp256k1 公钥编码为 SPKI 格式
func MarshalSecp256k1PublicKeyPKIX(pub *ecdsa.PublicKey) ([]byte, error) {
	// 将公钥编码为未压缩格式 (04 || X || Y)
	pubKeyBytes := make([]byte, 65)
	pubKeyBytes[0] = 0x04
	pub.X.FillBytes(pubKeyBytes[1:33])
	pub.Y.FillBytes(pubKeyBytes[33:65])

	// 创建 SPKI 结构
	type subjectPublicKeyInfo struct {
		Algorithm pkix.AlgorithmIdentifier
		PublicKey asn1.BitString
	}

	spki := subjectPublicKeyInfo{
		Algorithm: pkix.AlgorithmIdentifier{
			Algorithm:  asn1.ObjectIdentifier{1, 2, 840, 10045, 2, 1}, // EC public key OID
			Parameters: asn1.RawValue{FullBytes: mustMarshalASN1(oidSecp256k1)},
		},
		PublicKey: asn1.BitString{
			Bytes:     pubKeyBytes,
			BitLength: len(pubKeyBytes) * 8,
		},
	}

	return asn1.Marshal(spki)
}

// MarshalSecp256k1PrivateKeySEC1 将 secp256k1 私钥编码为 SEC1 ECPrivateKey 格式
func MarshalSecp256k1PrivateKeySEC1(priv *ecdsa.PrivateKey) ([]byte, error) {
	// 私钥值（32字节）
	privKeyBytes := priv.D.FillBytes(make([]byte, 32))

	// 公钥（未压缩格式 04 || X || Y）
	pubKeyBytes := make([]byte, 65)
	pubKeyBytes[0] = 0x04
	priv.X.FillBytes(pubKeyBytes[1:33])
	priv.Y.FillBytes(pubKeyBytes[33:65])

	// SEC1 ECPrivateKey 结构
	type ecPrivateKey struct {
		Version    int
		PrivateKey []byte
		Parameters asn1.RawValue  `asn1:"optional,explicit,tag:0"`
		PublicKey  asn1.BitString `asn1:"optional,explicit,tag:1"`
	}

	sec1 := ecPrivateKey{
		Version:    1,
		PrivateKey: privKeyBytes,
		Parameters: asn1.RawValue{
			Class:      2, // Context-specific
			Tag:        0,
			IsCompound: true,
			Bytes:      mustMarshalASN1(oidSecp256k1),
		},
		PublicKey: asn1.BitString{
			Bytes:     pubKeyBytes,
			BitLength: len(pubKeyBytes) * 8,
		},
	}

	return asn1.Marshal(sec1)
}

// MarshalSecp256k1PrivateKeyPKCS8 将 secp256k1 私钥编码为 PKCS#8 格式
func MarshalSecp256k1PrivateKeyPKCS8(priv *ecdsa.PrivateKey) ([]byte, error) {
	// 使用 SEC1 格式编码私钥
	// ECPrivateKey ::= SEQUENCE {
	//   version        INTEGER { ecPrivkeyVer1(1) }
	//   privateKey     OCTET STRING
	//   parameters [0] ECParameters OPTIONAL
	//   publicKey  [1] BIT STRING OPTIONAL
	// }

	// 私钥值（32字节）
	privKeyBytes := priv.D.FillBytes(make([]byte, 32))

	// 公钥（未压缩格式）
	pubKeyBytes := make([]byte, 65)
	pubKeyBytes[0] = 0x04
	priv.X.FillBytes(pubKeyBytes[1:33])
	priv.Y.FillBytes(pubKeyBytes[33:65])

	// SEC1 格式
	type ecPrivateKey struct {
		Version    int
		PrivateKey []byte
		Parameters asn1.RawValue  `asn1:"optional,explicit,tag:0"`
		PublicKey  asn1.BitString `asn1:"optional,explicit,tag:1"`
	}

	sec1 := ecPrivateKey{
		Version:    1,
		PrivateKey: privKeyBytes,
		Parameters: asn1.RawValue{
			Class:      2, // Context-specific
			Tag:        0,
			IsCompound: true,
			Bytes:      mustMarshalASN1(oidSecp256k1),
		},
		PublicKey: asn1.BitString{
			Bytes:     pubKeyBytes,
			BitLength: len(pubKeyBytes) * 8,
		},
	}

	sec1Bytes, err := asn1.Marshal(sec1)
	if err != nil {
		return nil, err
	}

	// 包装为 PKCS#8
	type pkcs8 struct {
		Version    int
		Algo       pkix.AlgorithmIdentifier
		PrivateKey []byte
	}

	pkcs8Struct := pkcs8{
		Version: 0,
		Algo: pkix.AlgorithmIdentifier{
			Algorithm:  asn1.ObjectIdentifier{1, 2, 840, 10045, 2, 1}, // EC public key OID
			Parameters: asn1.RawValue{FullBytes: mustMarshalASN1(oidSecp256k1)},
		},
		PrivateKey: sec1Bytes,
	}

	return asn1.Marshal(pkcs8Struct)
}

// mustMarshalASN1 辅助函数，用于编码 ASN.1
func mustMarshalASN1(val interface{}) []byte {
	b, err := asn1.Marshal(val)
	if err != nil {
		panic(err)
	}
	return b
}

// MarshalEd448PublicKeyPKIX 将 Ed448 公钥编码为 PKIX 格式
func MarshalEd448PublicKeyPKIX(publicKey []byte) ([]byte, error) {
	// Ed448 的 OID: 1.3.101.113
	oidEd448 := asn1.ObjectIdentifier{1, 3, 101, 113}

	type publicKeyInfo struct {
		Algorithm pkix.AlgorithmIdentifier
		PublicKey asn1.BitString
	}

	spki := publicKeyInfo{
		Algorithm: pkix.AlgorithmIdentifier{
			Algorithm: oidEd448,
		},
		PublicKey: asn1.BitString{
			Bytes:     publicKey,
			BitLength: len(publicKey) * 8,
		},
	}

	return asn1.Marshal(spki)
}

// MarshalEd448PrivateKeyPKCS8 将 Ed448 私钥编码为 PKCS#8 格式
func MarshalEd448PrivateKeyPKCS8(privateKey []byte) ([]byte, error) {
	// Ed448 的 OID: 1.3.101.113
	oidEd448 := asn1.ObjectIdentifier{1, 3, 101, 113}

	type privateKeyInfo struct {
		Version             int
		PrivateKeyAlgorithm pkix.AlgorithmIdentifier
		PrivateKey          []byte
	}

	// 将私钥包装在 OCTET STRING 中
	privKeyBytes, err := asn1.Marshal(privateKey)
	if err != nil {
		return nil, err
	}

	pkcs8 := privateKeyInfo{
		Version: 0,
		PrivateKeyAlgorithm: pkix.AlgorithmIdentifier{
			Algorithm: oidEd448,
		},
		PrivateKey: privKeyBytes,
	}

	return asn1.Marshal(pkcs8)
}

// ============================================================================
// 🔥 secp256k1 解析支持
// ============================================================================

// ParseSecp256k1PrivateKeyPKCS8 解析 PKCS#8 格式的 secp256k1 私钥
func ParseSecp256k1PrivateKeyPKCS8(der []byte) (*ecdsa.PrivateKey, error) {
	type privateKeyInfo struct {
		Version             int
		PrivateKeyAlgorithm pkix.AlgorithmIdentifier
		PrivateKey          []byte
	}

	var pkcs8 privateKeyInfo
	if _, err := asn1.Unmarshal(der, &pkcs8); err != nil {
		return nil, fmt.Errorf("failed to unmarshal PKCS#8: %w", err)
	}

	// 检查是否是 EC 密钥 (OID: 1.2.840.10045.2.1)
	oidEC := asn1.ObjectIdentifier{1, 2, 840, 10045, 2, 1}
	if !pkcs8.PrivateKeyAlgorithm.Algorithm.Equal(oidEC) {
		return nil, fmt.Errorf("not an EC key")
	}

	// 检查曲线参数是否是 secp256k1 (OID: 1.3.132.0.10)
	if len(pkcs8.PrivateKeyAlgorithm.Parameters.FullBytes) == 0 {
		return nil, fmt.Errorf("missing curve parameters")
	}

	var curveOID asn1.ObjectIdentifier
	if _, err := asn1.Unmarshal(pkcs8.PrivateKeyAlgorithm.Parameters.FullBytes, &curveOID); err != nil {
		return nil, fmt.Errorf("failed to unmarshal curve OID: %w", err)
	}

	if !curveOID.Equal(oidSecp256k1) {
		return nil, fmt.Errorf("not a secp256k1 key")
	}

	// 解析 SEC1 私钥
	return ParseSecp256k1PrivateKeySEC1(pkcs8.PrivateKey)
}

// ParseSecp256k1PrivateKeySEC1 解析 SEC1 格式的 secp256k1 私钥
func ParseSecp256k1PrivateKeySEC1(der []byte) (*ecdsa.PrivateKey, error) {
	type ecPrivateKey struct {
		Version       int
		PrivateKey    []byte
		NamedCurveOID asn1.ObjectIdentifier `asn1:"optional,explicit,tag:0"`
		PublicKey     asn1.BitString        `asn1:"optional,explicit,tag:1"`
	}

	var sec1 ecPrivateKey
	if _, err := asn1.Unmarshal(der, &sec1); err != nil {
		return nil, fmt.Errorf("failed to unmarshal SEC1: %w", err)
	}

	// 使用 btcec 的 S256 曲线
	curve := btcec.S256()

	// 创建私钥
	privKey := new(ecdsa.PrivateKey)
	privKey.PublicKey.Curve = curve
	privKey.D = new(big.Int).SetBytes(sec1.PrivateKey)

	// 计算公钥
	privKey.PublicKey.X, privKey.PublicKey.Y = curve.ScalarBaseMult(sec1.PrivateKey)

	return privKey, nil
}

// ParseSecp256k1PublicKeyPKIX 解析 SPKI 格式的 secp256k1 公钥
func ParseSecp256k1PublicKeyPKIX(der []byte) (*ecdsa.PublicKey, error) {
	type subjectPublicKeyInfo struct {
		Algorithm        pkix.AlgorithmIdentifier
		SubjectPublicKey asn1.BitString
	}

	var spki subjectPublicKeyInfo
	if _, err := asn1.Unmarshal(der, &spki); err != nil {
		return nil, fmt.Errorf("failed to unmarshal SPKI: %w", err)
	}

	// 检查是否是 EC 密钥
	oidEC := asn1.ObjectIdentifier{1, 2, 840, 10045, 2, 1}
	if !spki.Algorithm.Algorithm.Equal(oidEC) {
		return nil, fmt.Errorf("not an EC key")
	}

	// 检查曲线参数
	var curveOID asn1.ObjectIdentifier
	if _, err := asn1.Unmarshal(spki.Algorithm.Parameters.FullBytes, &curveOID); err != nil {
		return nil, fmt.Errorf("failed to unmarshal curve OID: %w", err)
	}

	if !curveOID.Equal(oidSecp256k1) {
		return nil, fmt.Errorf("not a secp256k1 key")
	}

	// 解析公钥点（未压缩格式：04 || X || Y）
	pubKeyBytes := spki.SubjectPublicKey.Bytes
	if len(pubKeyBytes) != 65 || pubKeyBytes[0] != 0x04 {
		return nil, fmt.Errorf("invalid secp256k1 public key format")
	}

	curve := btcec.S256()
	pubKey := new(ecdsa.PublicKey)
	pubKey.Curve = curve
	pubKey.X = new(big.Int).SetBytes(pubKeyBytes[1:33])
	pubKey.Y = new(big.Int).SetBytes(pubKeyBytes[33:65])

	return pubKey, nil
}

// ============================================================================
// 🔥 Ed448 解析支持
// ============================================================================

// ParseEd448PrivateKeyPKCS8 解析 PKCS#8 格式的 Ed448 私钥
func ParseEd448PrivateKeyPKCS8(der []byte) (ed448lib.PrivateKey, error) {
	type privateKeyInfo struct {
		Version             int
		PrivateKeyAlgorithm pkix.AlgorithmIdentifier
		PrivateKey          []byte
	}

	var pkcs8 privateKeyInfo
	if _, err := asn1.Unmarshal(der, &pkcs8); err != nil {
		return nil, fmt.Errorf("failed to unmarshal PKCS#8: %w", err)
	}

	// 检查是否是 Ed448 (OID: 1.3.101.113)
	oidEd448 := asn1.ObjectIdentifier{1, 3, 101, 113}
	if !pkcs8.PrivateKeyAlgorithm.Algorithm.Equal(oidEd448) {
		return nil, fmt.Errorf("not an Ed448 key")
	}

	// 解析私钥（OCTET STRING 包装）
	var privKeyBytes []byte
	if _, err := asn1.Unmarshal(pkcs8.PrivateKey, &privKeyBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal Ed448 private key: %w", err)
	}

	if len(privKeyBytes) != ed448lib.PrivateKeySize {
		return nil, fmt.Errorf("invalid Ed448 private key length: %d", len(privKeyBytes))
	}

	return ed448lib.PrivateKey(privKeyBytes), nil
}

// ParseEd448PublicKeyPKIX 解析 SPKI 格式的 Ed448 公钥
func ParseEd448PublicKeyPKIX(der []byte) (ed448lib.PublicKey, error) {
	type subjectPublicKeyInfo struct {
		Algorithm        pkix.AlgorithmIdentifier
		SubjectPublicKey asn1.BitString
	}

	var spki subjectPublicKeyInfo
	if _, err := asn1.Unmarshal(der, &spki); err != nil {
		return nil, fmt.Errorf("failed to unmarshal SPKI: %w", err)
	}

	// 检查是否是 Ed448 (OID: 1.3.101.113)
	oidEd448 := asn1.ObjectIdentifier{1, 3, 101, 113}
	if !spki.Algorithm.Algorithm.Equal(oidEd448) {
		return nil, fmt.Errorf("not an Ed448 key")
	}

	pubKeyBytes := spki.SubjectPublicKey.Bytes
	if len(pubKeyBytes) != ed448lib.PublicKeySize {
		return nil, fmt.Errorf("invalid Ed448 public key length: %d", len(pubKeyBytes))
	}

	return ed448lib.PublicKey(pubKeyBytes), nil
}

// ============================================================================
// 🔥 DH 标准组支持（RFC 3526）
// ============================================================================

// ParseDHPublicKey 解析 DH 公钥 PEM
func ParseDHPublicKey(pemStr string) (*DHPublicKey, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, fmt.Errorf("failed to decode DH public key PEM")
	}

	// 解析 SPKI 结构
	type subjectPublicKeyInfo struct {
		Algorithm pkix.AlgorithmIdentifier
		PublicKey asn1.BitString
	}

	var spki subjectPublicKeyInfo
	if _, err := asn1.Unmarshal(block.Bytes, &spki); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DH public key: %w", err)
	}

	// 解析参数
	type dhParameters struct {
		P, G *big.Int
	}
	var params dhParameters
	if _, err := asn1.Unmarshal(spki.Algorithm.Parameters.FullBytes, &params); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DH parameters: %w", err)
	}

	// 解析公钥值
	var y *big.Int
	if _, err := asn1.Unmarshal(spki.PublicKey.Bytes, &y); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DH public key value: %w", err)
	}

	return &DHPublicKey{
		Parameters: DHParameters{P: params.P, G: params.G},
		Y:          y,
	}, nil
}

// ParseDHPrivateKey 解析 DH 私钥 PEM
func ParseDHPrivateKey(pemStr string) (*DHPrivateKey, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, fmt.Errorf("failed to decode DH private key PEM")
	}

	// 解析 PKCS#8 结构
	type pkcs8 struct {
		Version    int
		Algo       pkix.AlgorithmIdentifier
		PrivateKey []byte
	}

	var pkcs8Struct pkcs8
	if _, err := asn1.Unmarshal(block.Bytes, &pkcs8Struct); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DH private key: %w", err)
	}

	// 解析参数
	type dhParameters struct {
		P, G *big.Int
	}
	var params dhParameters
	if _, err := asn1.Unmarshal(pkcs8Struct.Algo.Parameters.FullBytes, &params); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DH parameters: %w", err)
	}

	// 解析私钥值
	var x *big.Int
	if _, err := asn1.Unmarshal(pkcs8Struct.PrivateKey, &x); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DH private key value: %w", err)
	}

	// 计算公钥 y = g^x mod p
	y := new(big.Int).Exp(params.G, x, params.P)

	return &DHPrivateKey{
		Parameters: DHParameters{P: params.P, G: params.G},
		X:          x,
		Y:          y,
	}, nil
}

// getDHStandardGroup 获取标准 DH 组参数
func getDHStandardGroup(groupName string) *DHParameters {
	switch groupName {
	case "modp1": // 768-bit MODP Group (RFC 2409)
		p, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A63A3620FFFFFFFFFFFFFFFF", 16)
		return &DHParameters{P: p, G: big.NewInt(2)}

	case "modp2": // 1024-bit MODP Group (RFC 2409)
		p, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE65381FFFFFFFFFFFFFFFF", 16)
		return &DHParameters{P: p, G: big.NewInt(2)}

	case "modp5": // 1536-bit MODP Group (RFC 3526)
		p, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA237327FFFFFFFFFFFFFFFF", 16)
		return &DHParameters{P: p, G: big.NewInt(2)}

	case "modp14": // 2048-bit MODP Group (RFC 3526)
		p, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
		return &DHParameters{P: p, G: big.NewInt(2)}

	case "modp15": // 3072-bit MODP Group (RFC 3526)
		p, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF", 16)
		return &DHParameters{P: p, G: big.NewInt(2)}

	case "modp16": // 4096-bit MODP Group (RFC 3526)
		p, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C934063199FFFFFFFFFFFFFFFF", 16)
		return &DHParameters{P: p, G: big.NewInt(2)}

	case "modp17": // 6144-bit MODP Group (RFC 3526)
		p, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C93402849236C3FAB4D27C7026C1D4DCB2602646DEC9751E763DBA37BDF8FF9406AD9E530EE5DB382F413001AEB06A53ED9027D831179727B0865A8918DA3EDBEBCF9B14ED44CE6CBACED4BB1BDB7F1447E6CC254B332051512BD7AF426FB8F401378CD2BF5983CA01C64B92ECF032EA15D1721D03F482D7CE6E74FEF6D55E702F46980C82B5A84031900B1C9E59E7C97FBEC7E8F323A97A7E36CC88BE0F1D45B7FF585AC54BD407B22B4154AACC8F6D7EBF48E1D814CC5ED20F8037E0A79715EEF29BE32806A1D58BB7C5DA76F550AA3D8A1FBFF0EB19CCB1A313D55CDA56C9EC2EF29632387FE8D76E3C0468043E8F663F4860EE12BF2D5B0B7474D6E694F91E6DCC4024FFFFFFFFFFFFFFFF", 16)
		return &DHParameters{P: p, G: big.NewInt(2)}

	case "modp18": // 8192-bit MODP Group (RFC 3526)
		p, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C93402849236C3FAB4D27C7026C1D4DCB2602646DEC9751E763DBA37BDF8FF9406AD9E530EE5DB382F413001AEB06A53ED9027D831179727B0865A8918DA3EDBEBCF9B14ED44CE6CBACED4BB1BDB7F1447E6CC254B332051512BD7AF426FB8F401378CD2BF5983CA01C64B92ECF032EA15D1721D03F482D7CE6E74FEF6D55E702F46980C82B5A84031900B1C9E59E7C97FBEC7E8F323A97A7E36CC88BE0F1D45B7FF585AC54BD407B22B4154AACC8F6D7EBF48E1D814CC5ED20F8037E0A79715EEF29BE32806A1D58BB7C5DA76F550AA3D8A1FBFF0EB19CCB1A313D55CDA56C9EC2EF29632387FE8D76E3C0468043E8F663F4860EE12BF2D5B0B7474D6E694F91E6DBE115974A3926F12FEE5E438777CB6A932DF8CD8BEC4D073B931BA3BC832B68D9DD300741FA7BF8AFC47ED2576F6936BA424663AAB639C5AE4F5683423B4742BF1C978238F16CBE39D652DE3FDB8BEFC848AD922222E04A4037C0713EB57A81A23F0C73473FC646CEA306B4BCBC8862F8385DDFA9D4B7FA2C087E879683303ED5BDD3A062B3CF5B3A278A66D2A13F83F44F82DDF310EE074AB6A364597E899A0255DC164F31CC50846851DF9AB48195DED7EA1B1D510BD7EE74D73FAF36BC31ECFA268359046F4EB879F924009438B481C6CD7889A002ED5EE382BC9190DA6FC026E479558E4475677E9AA9E3050E2765694DFC81F56E880B96E7160C980DD98EDD3DFFFFFFFFFFFFFFFFF", 16)
		return &DHParameters{P: p, G: big.NewInt(2)}

	default:
		return nil
	}
}
