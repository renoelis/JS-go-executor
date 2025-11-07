package crypto

import (
	"github.com/dop251/goja"
)

// ============================================================================
// 🌉 Goja 桥接层 - 将 Go 函数暴露给 JavaScript
// ============================================================================

// RegisterCryptoMethods 注册所有 crypto 方法到对象（纯 Go 原生实现）
func RegisterCryptoMethods(runtime *goja.Runtime, cryptoObj *goja.Object, _ interface{}) error {
	// Hash 和 HMAC
	if err := RegisterHashMethods(runtime, cryptoObj); err != nil {
		return err
	}

	// Random 方法
	if err := RegisterRandomMethods(runtime, cryptoObj); err != nil {
		return err
	}

	// RSA 方法
	if err := RegisterRSAMethods(runtime, cryptoObj); err != nil {
		return err
	}

	// 密钥管理
	if err := RegisterKeyMethods(runtime, cryptoObj); err != nil {
		return err
	}

	// 签名和验证
	if err := RegisterSignMethods(runtime, cryptoObj); err != nil {
		return err
	}

	// 常量和辅助方法
	if err := RegisterCryptoConstants(runtime, cryptoObj); err != nil {
		return err
	}

	return nil
}

// RegisterHashMethods 注册 Hash 和 HMAC 相关方法
func RegisterHashMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	cryptoObj.Set("createHash", func(call goja.FunctionCall) goja.Value {
		return CreateHash(call, runtime)
	})

	cryptoObj.Set("createHmac", func(call goja.FunctionCall) goja.Value {
		return CreateHmac(call, runtime)
	})

	cryptoObj.Set("timingSafeEqual", func(call goja.FunctionCall) goja.Value {
		return TimingSafeEqual(call, runtime)
	})

	return nil
}

// RegisterRandomMethods 注册随机数相关方法
func RegisterRandomMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	cryptoObj.Set("randomBytes", func(call goja.FunctionCall) goja.Value {
		return RandomBytes(call, runtime)
	})

	cryptoObj.Set("randomUUID", func(call goja.FunctionCall) goja.Value {
		return RandomUUID(call, runtime)
	})

	cryptoObj.Set("getRandomValues", func(call goja.FunctionCall) goja.Value {
		return GetRandomValues(call, runtime)
	})

	cryptoObj.Set("randomFillSync", func(call goja.FunctionCall) goja.Value {
		return RandomFillSync(call, runtime)
	})

	cryptoObj.Set("randomFill", func(call goja.FunctionCall) goja.Value {
		return RandomFill(call, runtime)
	})

	cryptoObj.Set("randomInt", func(call goja.FunctionCall) goja.Value {
		return RandomInt(call, runtime)
	})

	return nil
}

// RegisterRSAMethods 注册 RSA 加密解密方法
func RegisterRSAMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	cryptoObj.Set("generateKeyPair", func(call goja.FunctionCall) goja.Value {
		return GenerateKeyPair(call, runtime)
	})

	cryptoObj.Set("generateKeyPairSync", func(call goja.FunctionCall) goja.Value {
		return GenerateKeyPairSync(call, runtime)
	})

	cryptoObj.Set("publicEncrypt", func(call goja.FunctionCall) goja.Value {
		return PublicEncrypt(call, runtime)
	})

	cryptoObj.Set("privateDecrypt", func(call goja.FunctionCall) goja.Value {
		return PrivateDecrypt(call, runtime)
	})

	cryptoObj.Set("privateEncrypt", func(call goja.FunctionCall) goja.Value {
		return PrivateEncrypt(call, runtime)
	})

	cryptoObj.Set("publicDecrypt", func(call goja.FunctionCall) goja.Value {
		return PublicDecrypt(call, runtime)
	})

	return nil
}

// RegisterKeyMethods 注册密钥管理方法
func RegisterKeyMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	cryptoObj.Set("createPublicKey", func(call goja.FunctionCall) goja.Value {
		return CreatePublicKey(call, runtime)
	})

	cryptoObj.Set("createPrivateKey", func(call goja.FunctionCall) goja.Value {
		return CreatePrivateKey(call, runtime)
	})

	return nil
}

// RegisterSignMethods 注册签名和验证方法
func RegisterSignMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	// 使用支持多算法的新函数（RSA, Ed25519, ECDSA）
	cryptoObj.Set("createSign", func(call goja.FunctionCall) goja.Value {
		return CreateSignMulti(call, runtime)
	})

	cryptoObj.Set("createVerify", func(call goja.FunctionCall) goja.Value {
		return CreateVerifyMulti(call, runtime)
	})

	cryptoObj.Set("sign", func(call goja.FunctionCall) goja.Value {
		return SignMulti(call, runtime)
	})

	cryptoObj.Set("verify", func(call goja.FunctionCall) goja.Value {
		return VerifyMulti(call, runtime)
	})

	// Diffie-Hellman 密钥交换
	cryptoObj.Set("diffieHellman", func(call goja.FunctionCall) goja.Value {
		return DiffieHellman(call, runtime)
	})

	return nil
}

// RegisterCryptoConstants 注册常量
func RegisterCryptoConstants(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	// crypto.constants
	constants := runtime.NewObject()

	// RSA Padding 常量
	constants.Set("RSA_NO_PADDING", 3)
	constants.Set("RSA_PKCS1_PADDING", 1)
	constants.Set("RSA_PKCS1_OAEP_PADDING", 4)
	constants.Set("RSA_PKCS1_PSS_PADDING", 6)
	constants.Set("RSA_X931_PADDING", 5)

	// RSA PSS saltLength 常量
	constants.Set("RSA_PSS_SALTLEN_DIGEST", -1)
	constants.Set("RSA_PSS_SALTLEN_MAX_SIGN", -2)
	constants.Set("RSA_PSS_SALTLEN_AUTO", -2)

	cryptoObj.Set("constants", constants)

	// getHashes() - 返回支持的哈希算法列表
	// 与 Node.js v25.0.0 保持 100% 一致（52个算法）
	cryptoObj.Set("getHashes", func(call goja.FunctionCall) goja.Value {
		hashes := []string{
			// RSA 签名算法（OpenSSL 命名）
			"RSA-MD5",
			"RSA-RIPEMD160",
			"RSA-SHA1",
			"RSA-SHA1-2",
			"RSA-SHA224",
			"RSA-SHA256",
			"RSA-SHA3-224",
			"RSA-SHA3-256",
			"RSA-SHA3-384",
			"RSA-SHA3-512",
			"RSA-SHA384",
			"RSA-SHA512",
			"RSA-SHA512/224",
			"RSA-SHA512/256",
			"RSA-SM3",
			// BLAKE2 系列
			"blake2b512",
			"blake2s256",
			// PKCS#1 v1.5 签名算法（SHA-3）
			"id-rsassa-pkcs1-v1_5-with-sha3-224",
			"id-rsassa-pkcs1-v1_5-with-sha3-256",
			"id-rsassa-pkcs1-v1_5-with-sha3-384",
			"id-rsassa-pkcs1-v1_5-with-sha3-512",
			// MD5 系列
			"md5",
			"md5-sha1",
			"md5WithRSAEncryption",
			// RIPEMD 系列
			"ripemd",
			"ripemd160",
			"ripemd160WithRSA",
			"rmd160",
			// SHA-1 系列
			"sha1",
			"sha1WithRSAEncryption",
			// SHA-2 系列
			"sha224",
			"sha224WithRSAEncryption",
			"sha256",
			"sha256WithRSAEncryption",
			// SHA-3 系列
			"sha3-224",
			"sha3-256",
			"sha3-384",
			"sha3-512",
			// SHA-384
			"sha384",
			"sha384WithRSAEncryption",
			// SHA-512 系列
			"sha512",
			"sha512-224",
			"sha512-224WithRSAEncryption",
			"sha512-256",
			"sha512-256WithRSAEncryption",
			"sha512WithRSAEncryption",
			// SHAKE 系列（可扩展输出函数）
			"shake128",
			"shake256",
			// SM3（国密算法）
			"sm3",
			"sm3WithRSAEncryption",
			// SSL3 相关
			"ssl3-md5",
			"ssl3-sha1",
		}
		return runtime.ToValue(hashes)
	})

	// getCurves() - 返回支持的椭圆曲线列表
	cryptoObj.Set("getCurves", func(call goja.FunctionCall) goja.Value {
		curves := []string{"secp256k1", "prime256v1", "secp384r1", "secp521r1"}
		return runtime.ToValue(curves)
	})

	// getCiphers() - 返回支持的加密算法列表
	cryptoObj.Set("getCiphers", func(call goja.FunctionCall) goja.Value {
		ciphers := []string{"aes-128-cbc", "aes-256-cbc", "aes-128-gcm", "aes-256-gcm"}
		return runtime.ToValue(ciphers)
	})

	return nil
}
