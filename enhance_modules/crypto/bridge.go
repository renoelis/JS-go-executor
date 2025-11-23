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

	// KDF（PBKDF2 / scrypt / HKDF）
	if err := RegisterKDFMethods(runtime, cryptoObj); err != nil {
		return err
	}

	// Random 方法
	if err := RegisterRandomMethods(runtime, cryptoObj); err != nil {
		return err
	}

	// 对称加密 (OpenSSL/cgo 实现)
	if err := RegisterCipherMethods(runtime, cryptoObj); err != nil {
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

	// WebCrypto (webcrypto.getRandomValues / webcrypto.subtle.digest 等)
	if err := RegisterWebCrypto(runtime, cryptoObj); err != nil {
		return err
	}

	// X509Certificate 类
	cryptoObj.Set("X509Certificate", func(call goja.ConstructorCall) *goja.Object {
		return NewX509Certificate(call, runtime)
	})

	// Certificate 类（SPKAC 支持，兼容 Node.js legacy 接口）
	// 创建构造函数并添加静态方法
	certCtor := runtime.ToValue(func(call goja.ConstructorCall) *goja.Object {
		return NewCertificate(call, runtime)
	})

	// 将构造函数转为对象以添加静态方法
	certObj := certCtor.ToObject(runtime)
	certObj.Set("exportPublicKey", func(call goja.FunctionCall) goja.Value {
		return CertificateExportPublicKey(call, runtime)
	})
	certObj.Set("exportChallenge", func(call goja.FunctionCall) goja.Value {
		return CertificateExportChallenge(call, runtime)
	})
	certObj.Set("verifySpkac", func(call goja.FunctionCall) goja.Value {
		return CertificateVerifySpkac(call, runtime)
	})
	cryptoObj.Set("Certificate", certObj)

	// 常量和辅助方法
	if err := RegisterCryptoConstants(runtime, cryptoObj); err != nil {
		return err
	}

	return nil
}

// setFunctionNameAndLength 为函数设置 name 和 length 属性（不可写、不可枚举、可配置）
func setFunctionNameAndLength(runtime *goja.Runtime, fn goja.Value, name string, length int) {
	if fnObj := fn.ToObject(runtime); fnObj != nil {
		fnObj.DefineDataProperty("name", runtime.ToValue(name), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
		fnObj.DefineDataProperty("length", runtime.ToValue(length), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
	}
}

// RegisterKDFMethods 注册 KDF 相关方法
func RegisterKDFMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	cryptoObj.Set("pbkdf2Sync", func(call goja.FunctionCall) goja.Value {
		return PBKDF2Sync(call, runtime)
	})

	cryptoObj.Set("pbkdf2", func(call goja.FunctionCall) goja.Value {
		return PBKDF2(call, runtime)
	})

	cryptoObj.Set("scryptSync", func(call goja.FunctionCall) goja.Value {
		return ScryptSync(call, runtime)
	})

	cryptoObj.Set("scrypt", func(call goja.FunctionCall) goja.Value {
		return Scrypt(call, runtime)
	})

	cryptoObj.Set("hkdfSync", func(call goja.FunctionCall) goja.Value {
		return HKDFSync(call, runtime)
	})

	cryptoObj.Set("hkdf", func(call goja.FunctionCall) goja.Value {
		return HKDF(call, runtime)
	})

	cryptoObj.Set("argon2Sync", func(call goja.FunctionCall) goja.Value {
		return Argon2Sync(call, runtime)
	})

	cryptoObj.Set("argon2", func(call goja.FunctionCall) goja.Value {
		return Argon2(call, runtime)
	})

	return nil
}

// RegisterCipherMethods 注册对称加密相关方法
func RegisterCipherMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	// 先实现 createCipher/createDecipher（基于 EVP_BytesToKey）
	cryptoObj.Set("createCipher", func(call goja.FunctionCall) goja.Value {
		return CreateCipher(call, runtime)
	})

	cryptoObj.Set("createDecipher", func(call goja.FunctionCall) goja.Value {
		return CreateDecipher(call, runtime)
	})

	// 再实现推荐用法 createCipheriv/createDecipheriv
	cryptoObj.Set("createCipheriv", func(call goja.FunctionCall) goja.Value {
		return CreateCipheriv(call, runtime)
	})
	setFunctionNameAndLength(runtime, cryptoObj.Get("createCipheriv"), "createCipheriv", 4)

	cryptoObj.Set("createDecipheriv", func(call goja.FunctionCall) goja.Value {
		return CreateDecipheriv(call, runtime)
	})
	setFunctionNameAndLength(runtime, cryptoObj.Get("createDecipheriv"), "createDecipheriv", 4)

	// TODO: 后续补充兼容 Node 的 createCipher/createDecipher（基于 EVP_BytesToKey）

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

	cryptoObj.Set("generatePrime", func(call goja.FunctionCall) goja.Value {
		return GeneratePrime(call, runtime)
	})

	cryptoObj.Set("generatePrimeSync", func(call goja.FunctionCall) goja.Value {
		return GeneratePrimeSync(call, runtime)
	})

	cryptoObj.Set("checkPrime", func(call goja.FunctionCall) goja.Value {
		return CheckPrime(call, runtime)
	})

	cryptoObj.Set("checkPrimeSync", func(call goja.FunctionCall) goja.Value {
		return CheckPrimeSync(call, runtime)
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

	cryptoObj.Set("createSecretKey", func(call goja.FunctionCall) goja.Value {
		return CreateSecretKey(call, runtime)
	})

	cryptoObj.Set("generateKey", func(call goja.FunctionCall) goja.Value {
		return GenerateKey(call, runtime)
	})

	cryptoObj.Set("generateKeySync", func(call goja.FunctionCall) goja.Value {
		return GenerateKeySync(call, runtime)
	})

	// KEM - Key Encapsulation Mechanism
	cryptoObj.Set("encapsulate", func(call goja.FunctionCall) goja.Value {
		return Encapsulate(call, runtime)
	})

	cryptoObj.Set("decapsulate", func(call goja.FunctionCall) goja.Value {
		return Decapsulate(call, runtime)
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

	// 旧式 DH/ECDH API 兼容
	cryptoObj.Set("createDiffieHellman", func(call goja.FunctionCall) goja.Value {
		return CreateDiffieHellman(call, runtime)
	})

	cryptoObj.Set("createDiffieHellmanGroup", func(call goja.FunctionCall) goja.Value {
		return CreateDiffieHellmanGroup(call, runtime)
	})

	cryptoObj.Set("getDiffieHellman", func(call goja.FunctionCall) goja.Value {
		return GetDiffieHellman(call, runtime)
	})

	cryptoObj.Set("createECDH", func(call goja.FunctionCall) goja.Value {
		return CreateECDH(call, runtime)
	})

	// ECDH 静态方法对象（目前主要提供 ECDH.convertKey）
	ecdhObj := runtime.NewObject()
	ecdhObj.Set("convertKey", func(call goja.FunctionCall) goja.Value {
		return ECDHConvertKey(call, runtime)
	})
	cryptoObj.Set("ECDH", ecdhObj)

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
	// 在启用 cgo+OpenSSL 时，优先使用 OpenSSL EC_get_builtin_curves 的完整列表；
	// 在纯 Go 构建下，opensslGetCurves 会退化为当前实现支持的 4 条主流曲线。
	cryptoObj.Set("getCurves", func(call goja.FunctionCall) goja.Value {
		curves := opensslGetCurves()
		return runtime.ToValue(curves)
	})

	// getCiphers() - 返回支持的加密算法列表
	cryptoObj.Set("getCiphers", func(call goja.FunctionCall) goja.Value {
		// 与当前 Node.js 环境的 crypto.getCiphers() 输出保持一致
		ciphers := []string{
			"aes-128-cbc", "aes-128-ccm", "aes-128-cfb", "aes-128-cfb1", "aes-128-cfb8", "aes-128-ctr", "aes-128-ecb", "aes-128-gcm", "aes-128-ocb", "aes-128-ofb", "aes-128-xts",
			"aes-192-cbc", "aes-192-ccm", "aes-192-cfb", "aes-192-cfb1", "aes-192-cfb8", "aes-192-ctr", "aes-192-ecb", "aes-192-gcm", "aes-192-ocb", "aes-192-ofb",
			"aes-256-cbc", "aes-256-ccm", "aes-256-cfb", "aes-256-cfb1", "aes-256-cfb8", "aes-256-ctr", "aes-256-ecb", "aes-256-gcm", "aes-256-ocb", "aes-256-ofb", "aes-256-xts",
			"aes128", "aes128-wrap", "aes128-wrap-pad", "aes192", "aes192-wrap", "aes192-wrap-pad", "aes256", "aes256-wrap", "aes256-wrap-pad",
			"aria-128-cbc", "aria-128-ccm", "aria-128-cfb", "aria-128-cfb1", "aria-128-cfb8", "aria-128-ctr", "aria-128-ecb", "aria-128-gcm", "aria-128-ofb",
			"aria-192-cbc", "aria-192-ccm", "aria-192-cfb", "aria-192-cfb1", "aria-192-cfb8", "aria-192-ctr", "aria-192-ecb", "aria-192-gcm", "aria-192-ofb",
			"aria-256-cbc", "aria-256-ccm", "aria-256-cfb", "aria-256-cfb1", "aria-256-cfb8", "aria-256-ctr", "aria-256-ecb", "aria-256-gcm", "aria-256-ofb",
			"aria128", "aria192", "aria256",
			"camellia-128-cbc", "camellia-128-cfb", "camellia-128-cfb1", "camellia-128-cfb8", "camellia-128-ctr", "camellia-128-ecb", "camellia-128-ofb",
			"camellia-192-cbc", "camellia-192-cfb", "camellia-192-cfb1", "camellia-192-cfb8", "camellia-192-ctr", "camellia-192-ecb", "camellia-192-ofb",
			"camellia-256-cbc", "camellia-256-cfb", "camellia-256-cfb1", "camellia-256-cfb8", "camellia-256-ctr", "camellia-256-ecb", "camellia-256-ofb",
			"camellia128", "camellia192", "camellia256",
			"chacha20", "chacha20-poly1305",
			"des-ede", "des-ede-cbc", "des-ede-cfb", "des-ede-ecb", "des-ede-ofb",
			"des-ede3", "des-ede3-cbc", "des-ede3-cfb", "des-ede3-cfb1", "des-ede3-cfb8", "des-ede3-ecb", "des-ede3-ofb",
			"des3", "des3-wrap",
			"id-aes128-CCM", "id-aes128-GCM", "id-aes128-wrap", "id-aes128-wrap-pad",
			"id-aes192-CCM", "id-aes192-GCM", "id-aes192-wrap", "id-aes192-wrap-pad",
			"id-aes256-CCM", "id-aes256-GCM", "id-aes256-wrap", "id-aes256-wrap-pad",
			"id-smime-alg-CMS3DESwrap",
			"sm4", "sm4-cbc", "sm4-cfb", "sm4-ctr", "sm4-ecb", "sm4-ofb",
		}
		return runtime.ToValue(ciphers)
	})

	// getCipherInfo(nameOrNid[, options]) - 返回指定算法的基础信息
	cryptoObj.Set("getCipherInfo", func(call goja.FunctionCall) goja.Value {
		return GetCipherInfo(call, runtime)
	})

	return nil
}
