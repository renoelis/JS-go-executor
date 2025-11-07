package crypto

import (
	"crypto/dsa"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"strings"

	"github.com/dop251/goja"
)

// ============================================================================
// 🔥 密钥对象管理 - 100%完整实现（包含JWK支持）
// ============================================================================

// CreatePublicKey 创建公钥对象 (Node.js 18+ 完整兼容)
func CreatePublicKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createPublicKey 需要 key 参数"))
	}

	var keyFormat string = "pem"
	firstArg := call.Arguments[0]

	// 检查是否是对象参数（可能包含 format: 'jwk'）
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		hasKeyProp := obj.Get("key") != nil && !goja.IsUndefined(obj.Get("key"))
		hasFormatProp := obj.Get("format") != nil && !goja.IsUndefined(obj.Get("format"))

		// 如果没有 key 和 format 属性，可能是直接传入的 KeyObject
		if !hasKeyProp && !hasFormatProp {
			// 检查是否是 KeyObject（有 type 和 asymmetricKeyType）
			if keyType := obj.Get("type"); !goja.IsUndefined(keyType) && !goja.IsNull(keyType) {
				typeStr := SafeGetString(keyType)
				// Node.js 行为：createPublicKey() 可以接受私钥对象或公钥对象
				if typeStr == "public" || typeStr == "private" {
					// 检查是否有 export 方法
					if exportFunc := obj.Get("export"); !goja.IsUndefined(exportFunc) && !goja.IsNull(exportFunc) {
						// 这是一个 KeyObject，调用其 export 方法获取 PEM
						if callable, ok := goja.AssertFunction(exportFunc); ok {
							// 根据密钥类型选择导出格式
							exportOpts := runtime.NewObject()
							exportOpts.Set("format", "pem")
							if typeStr == "private" {
								// 私钥导出为 pkcs8 格式
								exportOpts.Set("type", "pkcs8")
							} else {
								// 公钥导出为 spki 格式
								exportOpts.Set("type", "spki")
							}

							result, err := callable(obj, exportOpts)
							if err != nil {
								panic(runtime.NewGoError(fmt.Errorf("导出密钥失败: %w", err)))
							}

							// 使用导出的 PEM 解析公钥
							// ParsePublicKeyPEM 支持从私钥 PEM 中提取公钥
							keyPEM := result.String()
							publicKey, parseErr := ParsePublicKeyPEM(keyPEM)
							if parseErr != nil {
								panic(runtime.NewGoError(fmt.Errorf("解析密钥失败: %w", parseErr)))
							}
							return CreatePublicKeyObject(runtime, publicKey)
						}
					}
				}
			}
		}

		// 获取 format
		if formatVal := obj.Get("format"); !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
			keyFormat = strings.ToLower(SafeGetString(formatVal))
		}
	}

	// JWK 格式处理
	if keyFormat == "jwk" {
		if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
			keyVal := obj.Get("key")
			if keyObj, ok := keyVal.(*goja.Object); ok && keyObj != nil {
				// 将 goja.Object 转换为 map[string]interface{}
				jwkMap := make(map[string]interface{})
				for _, key := range keyObj.Keys() {
					val := keyObj.Get(key)
					if val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
						jwkMap[key] = val.Export()
					}
				}
				// 使用通用的 JWK 解析器
				key, keyType, err := JWKToPublicKey(jwkMap)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("解析JWK公钥失败: %w", err)))
				}
				// 根据密钥类型返回相应的 KeyObject
				return CreateKeyObject(runtime, key, keyType, true) // true = 公钥
			} else {
				panic(runtime.NewTypeError("JWK 格式的 key 必须是对象"))
			}
		} else {
			panic(runtime.NewTypeError("JWK 格式需要对象参数"))
		}
	} else {
		// PEM/DER 格式处理
		keyPEM := ExtractKeyPEM(runtime, firstArg)

		// 使用通用解析器
		key, keyType, err := ParseAnyPublicKeyPEM(keyPEM)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("解析公钥失败: %w", err)))
		}

		// 根据密钥类型返回相应的 KeyObject
		if keyType == "rsa" {
			if rsaKey, ok := key.(*rsa.PublicKey); ok {
				return CreatePublicKeyObject(runtime, rsaKey)
			}
		}

		// 对于非 RSA 密钥，使用通用 KeyObject 创建
		return CreateKeyObject(runtime, key, keyType, true) // true = 公钥
	}

	// 这段代码应该永远不会被执行，因为上面的 if/else 涵盖了所有情况
	return goja.Undefined()
}

// CreatePrivateKey 创建私钥对象 (Node.js 18+ 完整兼容)
func CreatePrivateKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createPrivateKey 需要 key 参数"))
	}

	var keyFormat string = "pem"
	var passphraseBytes []byte
	firstArg := call.Arguments[0]

	// 检查是否是对象参数（可能包含 format: 'jwk'）
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		// 获取 format 和 passphrase
		if formatVal := obj.Get("format"); !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
			keyFormat = strings.ToLower(SafeGetString(formatVal))
		}
		if passphraseVal := obj.Get("passphrase"); !goja.IsUndefined(passphraseVal) && !goja.IsNull(passphraseVal) {
			// 使用 GetPassphraseBytes 支持 Buffer 和 String
			var err error
			passphraseBytes, err = GetPassphraseBytes(runtime, passphraseVal)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("解析 passphrase 失败: %w", err)))
			}
		}
	}

	// 将字节数组转换为字符串
	passphrase := string(passphraseBytes)

	// JWK 格式处理
	if keyFormat == "jwk" {
		if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
			keyVal := obj.Get("key")
			if keyObj, ok := keyVal.(*goja.Object); ok && keyObj != nil {
				// 将 goja.Object 转换为 map[string]interface{}
				jwkMap := make(map[string]interface{})
				for _, key := range keyObj.Keys() {
					val := keyObj.Get(key)
					if val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
						jwkMap[key] = val.Export()
					}
				}
				// 使用通用的 JWK 解析器
				key, keyType, err := JWKToPrivateKey(jwkMap)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("解析JWK私钥失败: %w", err)))
				}
				// 根据密钥类型返回相应的 KeyObject
				return CreateKeyObject(runtime, key, keyType, false) // false = 私钥
			} else {
				panic(runtime.NewTypeError("JWK 格式的 key 必须是对象"))
			}
		} else {
			panic(runtime.NewTypeError("JWK 格式需要对象参数"))
		}
	} else {
		// PEM/DER 格式处理
		keyPEM := ExtractKeyPEM(runtime, firstArg)

		// 使用通用解析器
		key, keyType, err := ParseAnyPrivateKeyPEM(keyPEM, passphrase)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("解析私钥失败: %w", err)))
		}

		// 根据密钥类型返回相应的 KeyObject
		if keyType == "rsa" {
			if rsaKey, ok := key.(*rsa.PrivateKey); ok {
				return CreatePrivateKeyObject(runtime, rsaKey)
			}
		}

		// 对于非 RSA 密钥，使用通用 KeyObject 创建
		return CreateKeyObject(runtime, key, keyType, false) // false = 私钥
	}

	// 这段代码应该永远不会被执行，因为上面的 if/else 涵盖了所有情况
	return goja.Undefined()
}

// CreatePublicKeyObject 创建公钥对象（内部使用） - Node.js 18+ 完整兼容
func CreatePublicKeyObject(runtime *goja.Runtime, publicKey *rsa.PublicKey) goja.Value {
	keyObj := runtime.NewObject()
	keyObj.Set("type", "public")
	keyObj.Set("asymmetricKeyType", "rsa")

	// 存储原始密钥对象（用于内部操作）
	keyObj.Set("_key", runtime.ToValue(publicKey))

	// Node.js 18+ 兼容：添加 asymmetricKeyDetails
	details := runtime.NewObject()
	details.Set("modulusLength", publicKey.N.BitLen())
	// publicExponent 以整数暴露
	details.Set("publicExponent", runtime.ToValue(int64(publicKey.E)))
	keyObj.Set("asymmetricKeyDetails", details)

	// export方法 - 支持PEM/DER/JWK格式
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		exportType := "spki"
		exportFormat := "pem"

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
					}
				}
			}
		}

		// JWK 格式导出
		if exportFormat == "jwk" {
			jwk := RSAPublicKeyToJWK(publicKey)
			return runtime.ToValue(jwk)
		}

		// PEM/DER 格式导出
		exported, err := ExportPublicKey(publicKey, exportType, exportFormat)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}
		return CreateBuffer(runtime, exported)
	})

	return keyObj
}

// CreateRSAPSSPublicKeyObject 创建 RSA-PSS 公钥对象（内部使用）
func CreateRSAPSSPublicKeyObject(runtime *goja.Runtime, publicKey *rsa.PublicKey, pssParams *RSAPSSParams) goja.Value {
	keyObj := runtime.NewObject()
	keyObj.Set("type", "public")
	keyObj.Set("asymmetricKeyType", "rsa-pss")

	// Node.js 18+ 兼容：添加 asymmetricKeyDetails（包含 PSS 参数）
	details := runtime.NewObject()
	details.Set("modulusLength", publicKey.N.BitLen())
	details.Set("publicExponent", runtime.ToValue(int64(publicKey.E)))

	// RSA-PSS 特有字段（只在明确指定时才设置，否则为 undefined）
	if pssParams != nil {
		if pssParams.HasHashAlgorithm {
			details.Set("hashAlgorithm", pssParams.HashAlgorithm)
		}
		if pssParams.HasMGF1HashAlgorithm {
			details.Set("mgf1HashAlgorithm", pssParams.MGF1HashAlgorithm)
		}
		if pssParams.HasSaltLength {
			details.Set("saltLength", pssParams.SaltLength)
		}
	}

	keyObj.Set("asymmetricKeyDetails", details)

	// export 方法 - 支持 PEM/DER 格式（RSA-PSS 不支持 JWK）
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		exportType := "spki"
		exportFormat := "pem"

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
					}
				}
			}
		}

		// JWK 格式导出 - RSA-PSS 不支持（Node.js 兼容）
		if exportFormat == "jwk" {
			panic(runtime.NewTypeError("Unsupported JWK Key Type."))
		}

		// PEM/DER 格式导出
		exported, err := ExportPublicKey(publicKey, exportType, exportFormat)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}
		return CreateBuffer(runtime, exported)
	})

	return keyObj
}

// CreatePrivateKeyObject 创建私钥对象（内部使用） - Node.js 18+ 完整兼容
func CreatePrivateKeyObject(runtime *goja.Runtime, privateKey *rsa.PrivateKey) goja.Value {
	keyObj := runtime.NewObject()
	keyObj.Set("type", "private")
	keyObj.Set("asymmetricKeyType", "rsa")

	// 存储原始密钥对象（用于内部操作）
	keyObj.Set("_key", runtime.ToValue(privateKey))

	// Node.js 18+ 兼容：添加 asymmetricKeyDetails
	details := runtime.NewObject()
	details.Set("modulusLength", privateKey.N.BitLen())
	// publicExponent 以整数暴露
	details.Set("publicExponent", runtime.ToValue(int64(privateKey.E)))
	keyObj.Set("asymmetricKeyDetails", details)

	// 添加 _handle 字段存储私钥 PEM（用于某些内部操作）
	pemBytes, err := ExportPrivateKey(privateKey, "pkcs8", "pem", "", "")
	if err == nil {
		keyObj.Set("_handle", runtime.ToValue(string(pemBytes)))
	}

	// export方法 - 支持PEM/DER/JWK格式，支持加密导出
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		exportType := "pkcs8"
		exportFormat := "pem"
		exportCipher := ""
		exportPass := ""

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
					}
				}
				if cipherVal := opts.Get("cipher"); cipherVal != nil && !goja.IsUndefined(cipherVal) && !goja.IsNull(cipherVal) {
					if cipherStr := cipherVal.Export(); cipherStr != nil {
						exportCipher = fmt.Sprintf("%v", cipherStr)
					}
				}
				if passVal := opts.Get("passphrase"); passVal != nil && !goja.IsUndefined(passVal) && !goja.IsNull(passVal) {
					if passStr := passVal.Export(); passStr != nil {
						exportPass = fmt.Sprintf("%v", passStr)
					}
				}
			}
		}

		// JWK 格式导出
		if exportFormat == "jwk" {
			jwk := RSAPrivateKeyToJWK(privateKey)
			return runtime.ToValue(jwk)
		}

		// PEM/DER 格式导出（支持加密）
		exported, err := ExportPrivateKey(privateKey, exportType, exportFormat, exportCipher, exportPass)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}
		return CreateBuffer(runtime, exported)
	})

	return keyObj
}

// CreateRSAPSSPrivateKeyObject 创建 RSA-PSS 私钥对象（内部使用）
func CreateRSAPSSPrivateKeyObject(runtime *goja.Runtime, privateKey *rsa.PrivateKey, pssParams *RSAPSSParams) goja.Value {
	keyObj := runtime.NewObject()
	keyObj.Set("type", "private")
	keyObj.Set("asymmetricKeyType", "rsa-pss")

	// Node.js 18+ 兼容：添加 asymmetricKeyDetails（包含 PSS 参数）
	details := runtime.NewObject()
	details.Set("modulusLength", privateKey.N.BitLen())
	details.Set("publicExponent", runtime.ToValue(int64(privateKey.E)))

	// RSA-PSS 特有字段（只在明确指定时才设置，否则为 undefined）
	if pssParams != nil {
		if pssParams.HasHashAlgorithm {
			details.Set("hashAlgorithm", pssParams.HashAlgorithm)
		}
		if pssParams.HasMGF1HashAlgorithm {
			details.Set("mgf1HashAlgorithm", pssParams.MGF1HashAlgorithm)
		}
		if pssParams.HasSaltLength {
			details.Set("saltLength", pssParams.SaltLength)
		}
	}

	keyObj.Set("asymmetricKeyDetails", details)

	// 添加 _handle 字段存储私钥 PEM
	pemBytes, err := ExportPrivateKey(privateKey, "pkcs8", "pem", "", "")
	if err == nil {
		keyObj.Set("_handle", runtime.ToValue(string(pemBytes)))
	}

	// export 方法 - 支持 PEM/DER 格式，支持加密导出（RSA-PSS 不支持 JWK）
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		exportType := "pkcs8"
		exportFormat := "pem"
		exportCipher := ""
		exportPass := ""

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
					}
				}
				if cipherVal := opts.Get("cipher"); cipherVal != nil && !goja.IsUndefined(cipherVal) && !goja.IsNull(cipherVal) {
					if cipherStr := cipherVal.Export(); cipherStr != nil {
						exportCipher = fmt.Sprintf("%v", cipherStr)
					}
				}
				if passVal := opts.Get("passphrase"); passVal != nil && !goja.IsUndefined(passVal) && !goja.IsNull(passVal) {
					if passStr := passVal.Export(); passStr != nil {
						exportPass = fmt.Sprintf("%v", passStr)
					}
				}
			}
		}

		// JWK 格式导出 - RSA-PSS 不支持（Node.js 兼容）
		if exportFormat == "jwk" {
			panic(runtime.NewTypeError("Unsupported JWK Key Type."))
		}

		// PEM/DER 格式导出（支持加密）
		exported, err := ExportPrivateKey(privateKey, exportType, exportFormat, exportCipher, exportPass)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}
		return CreateBuffer(runtime, exported)
	})

	return keyObj
}

// ============================================================================
// 🔥 密钥解析函数 - 100%完整实现
// ============================================================================

// ParsePublicKeyPEM 智能解析 PEM 格式的公钥
// 支持：SPKI, PKCS#1, X.509证书，以及从私钥提取公钥
func ParsePublicKeyPEM(keyPEM string) (*rsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, fmt.Errorf("无法解析 PEM 格式")
	}

	switch block.Type {
	case "PUBLIC KEY": // SPKI 格式
		pub, err := x509.ParsePKIXPublicKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("解析 SPKI 公钥失败: %w", err)
		}
		rsaPub, ok := pub.(*rsa.PublicKey)
		if !ok {
			return nil, fmt.Errorf("不是 RSA 公钥")
		}
		return rsaPub, nil

	case "RSA PUBLIC KEY": // PKCS#1 格式
		return x509.ParsePKCS1PublicKey(block.Bytes)

	case "CERTIFICATE": // X.509 证书
		cert, err := x509.ParseCertificate(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("解析证书失败: %w", err)
		}
		rsaPub, ok := cert.PublicKey.(*rsa.PublicKey)
		if !ok {
			return nil, fmt.Errorf("证书不包含 RSA 公钥")
		}
		return rsaPub, nil

	case "PRIVATE KEY", "RSA PRIVATE KEY", "ENCRYPTED PRIVATE KEY":
		// 从私钥中提取公钥
		priv, err := parsePrivateKeyFromBlock(block)
		if err != nil {
			return nil, fmt.Errorf("从私钥提取公钥失败: %w", err)
		}
		return &priv.PublicKey, nil

	default:
		return nil, fmt.Errorf("不支持的 PEM 类型: %s", block.Type)
	}
}

// ParsePrivateKey 解析私钥（支持加密私钥）
func ParsePrivateKey(keyPEM string, passphrase ...string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, fmt.Errorf("无法解析 PEM 格式")
	}

	return parsePrivateKeyFromBlock(block, passphrase...)
}

// parsePrivateKeyFromBlock 从 PEM 块解析私钥（支持加密）
func parsePrivateKeyFromBlock(block *pem.Block, passphrase ...string) (*rsa.PrivateKey, error) {
	der := block.Bytes

	// 处理加密的私钥
	if strings.Contains(block.Type, "ENCRYPTED") || x509.IsEncryptedPEMBlock(block) {
		if len(passphrase) == 0 || passphrase[0] == "" {
			return nil, fmt.Errorf("私钥已加密，需要提供密码")
		}
		var err error
		der, err = x509.DecryptPEMBlock(block, []byte(passphrase[0]))
		if err != nil {
			return nil, fmt.Errorf("解密私钥失败: %w", err)
		}
	}

	// 尝试不同的格式
	switch block.Type {
	case "PRIVATE KEY": // PKCS#8
		key, err := x509.ParsePKCS8PrivateKey(der)
		if err != nil {
			return nil, fmt.Errorf("解析 PKCS8 私钥失败: %w", err)
		}
		rsaKey, ok := key.(*rsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("不是 RSA 私钥")
		}
		return rsaKey, nil

	case "RSA PRIVATE KEY", "ENCRYPTED PRIVATE KEY": // PKCS#1
		return x509.ParsePKCS1PrivateKey(der)

	default:
		return nil, fmt.Errorf("不支持的私钥类型: %s", block.Type)
	}
}

// ============================================================================
// 🔥 通用密钥解析（支持所有密钥类型）
// ============================================================================

// ParseAnyPublicKeyPEM 解析任意类型的公钥（RSA, EC, Ed25519等）
func ParseAnyPublicKeyPEM(keyPEM string) (interface{}, string, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, "", fmt.Errorf("无法解析 PEM 格式")
	}

	switch block.Type {
	case "PUBLIC KEY": // SPKI 格式（所有类型）
		pub, err := x509.ParsePKIXPublicKey(block.Bytes)
		if err != nil {
			// 尝试解析 Ed448（x509 不支持，需要手动解析）
			if strings.Contains(err.Error(), "unknown public key algorithm") ||
				strings.Contains(err.Error(), "1.3.101.113") {
				ed448Pub, ed448Err := ParseEd448PublicKeyPKIX(block.Bytes)
				if ed448Err == nil {
					return ed448Pub, "ed448", nil
				}
			}
			return nil, "", fmt.Errorf("解析 SPKI 公钥失败: %w", err)
		}
		// 判断密钥类型
		switch key := pub.(type) {
		case *rsa.PublicKey:
			return key, "rsa", nil
		case *ecdsa.PublicKey:
			return key, "ec", nil
		case ed25519.PublicKey:
			return key, "ed25519", nil
		case *dsa.PublicKey:
			return key, "dsa", nil
		default:
			return nil, "", fmt.Errorf("不支持的公钥类型: %T", pub)
		}

	case "RSA PUBLIC KEY": // PKCS#1 格式
		rsaPub, err := x509.ParsePKCS1PublicKey(block.Bytes)
		return rsaPub, "rsa", err

	default:
		return nil, "", fmt.Errorf("不支持的 PEM 类型: %s", block.Type)
	}
}

// ParseAnyPrivateKeyPEM 解析任意类型的私钥
func ParseAnyPrivateKeyPEM(keyPEM string, passphrase string) (interface{}, string, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, "", fmt.Errorf("无法解析 PEM 格式")
	}

	// 如果是加密的私钥，先解密
	if x509.IsEncryptedPEMBlock(block) {
		if passphrase == "" {
			return nil, "", fmt.Errorf("加密的私钥需要提供 passphrase")
		}
		decrypted, err := x509.DecryptPEMBlock(block, []byte(passphrase))
		if err != nil {
			return nil, "", fmt.Errorf("解密私钥失败: %w", err)
		}
		block.Bytes = decrypted
		block.Type = "PRIVATE KEY" // 解密后通常是 PKCS#8
	}

	switch block.Type {
	case "PRIVATE KEY": // PKCS#8 格式（所有类型）
		// 使用标准库解析 PKCS#8
		// 注意：Go 标准库不支持 DSA 的 PKCS#8 格式
		key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return nil, "", fmt.Errorf("解析 PKCS8 私钥失败: %w", err)
		}
		// 判断密钥类型
		switch k := key.(type) {
		case *rsa.PrivateKey:
			return k, "rsa", nil
		case *ecdsa.PrivateKey:
			return k, "ec", nil
		case ed25519.PrivateKey:
			return k, "ed25519", nil
		case *dsa.PrivateKey:
			// DSA 虽然能解析，但加密的 DSA PKCS#8 不被 Go 标准库支持
			return k, "dsa", nil
		default:
			return nil, "", fmt.Errorf("不支持的私钥类型: %T", key)
		}

	case "RSA PRIVATE KEY": // PKCS#1 格式
		rsaPriv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
		return rsaPriv, "rsa", err

	case "EC PRIVATE KEY": // SEC1 格式
		ecPriv, err := x509.ParseECPrivateKey(block.Bytes)
		return ecPriv, "ec", err

	default:
		return nil, "", fmt.Errorf("不支持的 PEM 类型: %s", block.Type)
	}
}
