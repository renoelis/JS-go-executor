# 🏗️ Crypto 模块架构文档

## 📚 目录结构

```
enhance_modules/
├── crypto/                          # crypto 核心实现子包
│   ├── types.go                     # 类型定义、常量
│   ├── utils.go                     # 工具函数（类型转换、Buffer创建等）
│   ├── bridge.go                    # 桥接层（JS函数注册）
│   ├── hash.go                      # Hash/HMAC 实现
│   ├── random.go                    # 随机数生成
│   ├── jwk.go                       # JWK 格式支持
│   ├── rsa_keygen.go                # RSA 密钥生成
│   ├── rsa_encrypt.go               # RSA 加密解密
│   ├── rsa_sign.go                  # RSA 签名验证
│   └── keys.go                      # 密钥对象管理
└── crypto_enhancement.go            # 主入口（薄桥接层）
```

## 🔌 架构模式

采用 **桥接模式（Bridge Pattern）**：

```
JavaScript 代码
    ↓
crypto_enhancement.go (主入口)
    ↓
crypto/bridge.go (桥接层)
    ↓
crypto/* (具体实现)
```

## 📝 如何添加新算法

### 示例：添加 AES 加密支持

#### 步骤 1：创建 crypto/aes.go

```go
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"github.com/dop251/goja"
)

// CreateCipheriv 创建加密器
func CreateCipheriv(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("createCipheriv 需要 algorithm, key, iv 参数"))
	}

	algorithm := call.Arguments[0].String()
	keyBytes, _ := ConvertToBytes(runtime, call.Arguments[1])
	ivBytes, _ := ConvertToBytes(runtime, call.Arguments[2])

	// 创建 AES cipher
	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	// 根据算法选择模式
	var stream cipher.Stream
	switch algorithm {
	case "aes-128-cbc", "aes-256-cbc":
		stream = cipher.NewCBCEncrypter(block, ivBytes)
	// ... 其他模式
	}

	// 创建 Cipher 对象
	cipherObj := runtime.NewObject()
	var buffer []byte

	cipherObj.Set("update", func(call goja.FunctionCall) goja.Value {
		data, _ := ConvertToBytes(runtime, call.Arguments[0])
		// 加密逻辑
		encrypted := make([]byte, len(data))
		stream.XORKeyStream(encrypted, data)
		buffer = append(buffer, encrypted...)
		return CreateBuffer(runtime, encrypted)
	})

	cipherObj.Set("final", func(call goja.FunctionCall) goja.Value {
		// 返回最后的数据（如果有padding）
		return CreateBuffer(runtime, []byte{})
	})

	return cipherObj
}

// CreateDecipheriv 创建解密器
func CreateDecipheriv(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	// 类似 CreateCipheriv 的实现
	// ...
}
```

#### 步骤 2：在 crypto/bridge.go 中注册

```go
// RegisterAESMethods 注册 AES 加密解密方法
func RegisterAESMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	cryptoObj.Set("createCipheriv", func(call goja.FunctionCall) goja.Value {
		return CreateCipheriv(call, runtime)
	})

	cryptoObj.Set("createDecipheriv", func(call goja.FunctionCall) goja.Value {
		return CreateDecipheriv(call, runtime)
	})

	return nil
}

// 在 RegisterCryptoMethods 中添加调用
func RegisterCryptoMethods(runtime *goja.Runtime, cryptoObj *goja.Object, cache *CryptoJSCache) error {
	// ... 现有注册 ...

	// 🆕 AES 方法
	if err := RegisterAESMethods(runtime, cryptoObj); err != nil {
		return err
	}

	return nil
}
```

#### 步骤 3：使用

```javascript
const crypto = require('crypto');

// AES-256-CBC 加密
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

let encrypted = cipher.update('Hello World', 'utf8', 'hex');
encrypted += cipher.final('hex');

// 解密
const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
let decrypted = decipher.update(encrypted, 'hex', 'utf8');
decrypted += decipher.final('utf8');

console.log(decrypted); // 'Hello World'
```

## 🔍 模块职责

### types.go - 类型定义
- 常量定义（MaxRandomBytesSize等）
- 结构体定义（CryptoJSCache, HashState等）
- 不包含业务逻辑

### utils.go - 工具函数
- `ConvertToBytes()` - 类型转换
- `CreateBuffer()` - Buffer对象创建
- `ExtractKeyPEM()` - 密钥提取
- `SafeGetString()` - 安全字符串获取

### hash.go - Hash功能
- `CreateHash()` - 创建Hash对象
- `CreateHmac()` - 创建HMAC对象
- 支持所有主流Hash算法
- 支持 update/digest/copy 链式调用

### random.go - 随机数
- `RandomBytes()` - 随机字节生成
- `RandomUUID()` - UUID生成
- `GetRandomValues()` - Web Crypto API兼容
- `RandomInt()` - 安全随机整数

### jwk.go - JWK支持
- RSA公钥/私钥 ↔ JWK 互转
- base64url编码
- CRT参数处理

### rsa_keygen.go - RSA密钥生成
- `GenerateKeyPair()` - 异步生成
- `GenerateKeyPairSync()` - 同步生成
- 支持自定义 publicExponent
- 支持多种导出格式

### rsa_encrypt.go - RSA加密
- `PublicEncrypt()` / `PrivateDecrypt()`
- `PrivateEncrypt()` / `PublicDecrypt()`
- 支持PKCS#1, OAEP, NO_PADDING
- 常量时间unpadding（安全）

### rsa_sign.go - RSA签名
- `CreateSign()` / `CreateVerify()`
- `Sign()` / `Verify()`
- 支持PKCS#1和PSS
- PSS saltLength完整支持

### keys.go - 密钥管理
- `CreatePublicKey()` / `CreatePrivateKey()`
- KeyObject完整实现
- 支持PEM/DER/JWK格式
- 智能密钥解析

### bridge.go - 桥接层
- 统一注册所有方法
- 加载crypto-js
- 管理编译缓存
- 提供注册函数

## 🎯 设计原则

1. **单一职责** - 每个文件只负责一个功能域
2. **开闭原则** - 对扩展开放，对修改关闭
3. **依赖倒置** - 依赖抽象而非具体实现
4. **接口隔离** - 最小化模块间依赖
5. **DRY原则** - 工具函数复用，避免重复

## 🧪 测试策略

### 单元测试
每个子模块可以独立测试：
```go
func TestHashFunctions(t *testing.T) {
	runtime := goja.New()
	cryptoObj := runtime.NewObject()
	crypto.RegisterHashMethods(runtime, cryptoObj)
	// 测试Hash功能
}
```

### 集成测试
测试完整的crypto环境：
```go
func TestFullCrypto(t *testing.T) {
	ce := NewCryptoEnhancer()
	runtime := goja.New()
	ce.SetupCryptoEnvironment(runtime)
	// 测试完整功能
}
```

## 🚀 性能优化

### 编译缓存
- crypto-js 只编译一次（sync.Once）
- 共享编译后的程序对象

### 内存优化
- 按需加载crypto-js
- 复用Buffer对象
- 避免不必要的内存分配

### 安全性
- 常量时间算法（防timing攻击）
- DoS防护（大小限制）
- 参数严格验证

## 📖 最佳实践

### 1. 添加新功能时
- 创建独立的 .go 文件
- 在 bridge.go 中添加注册函数
- 编写对应的测试用例
- 更新文档

### 2. 修改现有功能时
- 只修改相关的单个文件
- 确保测试通过
- 保持向后兼容

### 3. 代码风格
- 遵循 sm_crypto 的命名规范
- 函数名使用 PascalCase（导出）
- 注释清晰、完整
- 错误处理统一

---

**文档版本：** 1.0  
**最后更新：** 2025-11-05  
**维护者：** Flow-codeblock Team

