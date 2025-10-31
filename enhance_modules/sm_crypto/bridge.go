package sm_crypto

import "github.com/dop251/goja"

// ============================================================================
// 🌉 Goja 桥接层 - 将 Go 函数暴露给 JavaScript
// ============================================================================

// CreateSM2Object 创建 SM2 对象并注册所有函数
func CreateSM2Object(runtime *goja.Runtime) *goja.Object {
	obj := runtime.NewObject()

	// ============================================================================
	// 核心加密功能
	// ============================================================================
	obj.Set("generateKeyPairHex", func(call goja.FunctionCall) goja.Value {
		return GenerateKeyPairHex(call, runtime)
	})
	obj.Set("doEncrypt", func(call goja.FunctionCall) goja.Value {
		return DoEncrypt(call, runtime)
	})
	obj.Set("doDecrypt", func(call goja.FunctionCall) goja.Value {
		return DoDecrypt(call, runtime)
	})
	obj.Set("doSignature", func(call goja.FunctionCall) goja.Value {
		return DoSignature(call, runtime)
	})
	obj.Set("doVerifySignature", func(call goja.FunctionCall) goja.Value {
		return DoVerifySignature(call, runtime)
	})

	// ============================================================================
	// 密钥管理
	// ============================================================================
	obj.Set("getPublicKeyFromPrivateKey", func(call goja.FunctionCall) goja.Value {
		return GetPublicKeyFromPrivateKey(call, runtime)
	})
	obj.Set("compressPublicKeyHex", func(call goja.FunctionCall) goja.Value {
		return CompressPublicKeyHex(call, runtime)
	})
	obj.Set("comparePublicKeyHex", func(call goja.FunctionCall) goja.Value {
		return ComparePublicKeyHex(call, runtime)
	})
	obj.Set("verifyPublicKey", func(call goja.FunctionCall) goja.Value {
		return VerifyPublicKey(call, runtime)
	})

	// ============================================================================
	// 高级功能
	// ============================================================================
	obj.Set("getHash", func(call goja.FunctionCall) goja.Value {
		return GetHash(call, runtime)
	})
	obj.Set("getZ", func(call goja.FunctionCall) goja.Value {
		return GetZ(call, runtime)
	})
	obj.Set("calculateSharedKey", func(call goja.FunctionCall) goja.Value {
		return CalculateSharedKey(call, runtime)
	})
	obj.Set("ecdh", func(call goja.FunctionCall) goja.Value {
		return ECDH(call, runtime)
	})
	obj.Set("precomputePublicKey", func(call goja.FunctionCall) goja.Value {
		return PrecomputePublicKey(call, runtime)
	})
	obj.Set("getPoint", func(call goja.FunctionCall) goja.Value {
		return GetPoint(call, runtime)
	})

	// ============================================================================
	// 工具函数
	// ============================================================================
	obj.Set("hexToArray", func(call goja.FunctionCall) goja.Value {
		return HexToArray(call, runtime)
	})
	obj.Set("arrayToHex", func(call goja.FunctionCall) goja.Value {
		return ArrayToHex(call, runtime)
	})
	obj.Set("utf8ToHex", func(call goja.FunctionCall) goja.Value {
		return Utf8ToHexFunc(call, runtime)
	})
	obj.Set("arrayToUtf8", func(call goja.FunctionCall) goja.Value {
		return ArrayToUtf8Func(call, runtime)
	})
	obj.Set("leftPad", func(call goja.FunctionCall) goja.Value {
		return LeftPadFunc(call, runtime)
	})

	// initRNGPool: Go 版本不需要初始化随机数池，返回空函数
	obj.Set("initRNGPool", func(call goja.FunctionCall) goja.Value {
		return goja.Undefined()
	})

	// ============================================================================
	// 常量
	// ============================================================================
	obj.Set("EmptyArray", CreateUint8Array(runtime, []byte{}))

	return obj
}

// CreateSM3Function 创建 SM3 哈希函数
func CreateSM3Function(runtime *goja.Runtime) func(goja.FunctionCall) goja.Value {
	return func(call goja.FunctionCall) goja.Value {
		return SM3Hash(call, runtime)
	}
}

// CreateSM4Object 创建 SM4 对象
func CreateSM4Object(runtime *goja.Runtime) *goja.Object {
	obj := runtime.NewObject()

	obj.Set("encrypt", func(call goja.FunctionCall) goja.Value {
		return SM4Encrypt(call, runtime)
	})
	obj.Set("decrypt", func(call goja.FunctionCall) goja.Value {
		return SM4Decrypt(call, runtime)
	})
	obj.Set("sm4", func(call goja.FunctionCall) goja.Value {
		return SM4Core(call, runtime)
	})

	return obj
}

// CreateKDFFunction 创建 KDF 密钥派生函数
func CreateKDFFunction(runtime *goja.Runtime) func(goja.FunctionCall) goja.Value {
	return func(call goja.FunctionCall) goja.Value {
		return KDF(call, runtime)
	}
}
