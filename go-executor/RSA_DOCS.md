# RSA 非对称加密文档

## 概述

本模块提供完整的 RSA 非对称加密支持，100% 兼容 Node.js crypto 模块的 RSA 相关 API。所有功能均使用 Go 原生 `crypto/rsa` 和 `crypto/x509` 实现，性能优异且安全可靠。

## 功能特性

### 支持的功能

| 特性 | 支持内容 | 说明 |
|------|----------|------|
| **密钥长度** | 1024, 2048, 4096 bits | 支持所有标准 RSA 密钥长度 |
| **哈希算法** | SHA-1, SHA-256, SHA-384, SHA-512 | 支持所有主流哈希算法 |
| **加密填充** | OAEP, PKCS1v15 | `RSA_PKCS1_OAEP_PADDING`, `RSA_PKCS1_PADDING` |
| **签名填充** | PSS, PKCS1v15 | `RSA_PKCS1_PSS_PADDING`, `RSA_PKCS1_PADDING` |
| **OAEP 哈希** | SHA-1, SHA-256, SHA-384, SHA-512 | `oaepHash` 参数支持 |
| **PSS 盐长度** | 自定义盐长度 | `saltLength` 参数支持 |
| **密钥格式** | PKCS#1, PKCS#8 | 自动识别 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----BEGIN PRIVATE KEY-----` |

### 支持的 API

| 方法 | 支持状态 | 说明 |
|------|----------|------|
| `crypto.generateKeyPairSync()` | ✅ 完整支持 | 生成 RSA 密钥对 |
| `crypto.publicEncrypt()` | ✅ 完整支持 | RSA 公钥加密 |
| `crypto.privateDecrypt()` | ✅ 完整支持 | RSA 私钥解密 |
| `crypto.createSign()` | ✅ 完整支持 | 创建签名对象 |
| `crypto.createVerify()` | ✅ 完整支持 | 创建验签对象 |
| `crypto.sign()` | ✅ 完整支持 | 简化签名 API |
| `crypto.verify()` | ✅ 完整支持 | 简化验签 API |
| `crypto.constants` | ✅ 完整支持 | RSA 填充常量 |

## 使用示例

### 1. 生成密钥对

```javascript
const crypto = require('crypto');

// 生成 2048 位 RSA 密钥对
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048
});

console.log('公钥:', publicKey);
console.log('私钥:', privateKey);
```

### 2. 加密和解密

#### OAEP 填充（推荐）

```javascript
const crypto = require('crypto');

// 准备数据
const message = Buffer.from('Hello RSA!', 'utf8');

// 使用 OAEP 填充加密
const encrypted = crypto.publicEncrypt({
  key: publicKey,
  padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  oaepHash: 'sha256'
}, message);

// 解密
const decrypted = crypto.privateDecrypt({
  key: privateKey,
  padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  oaepHash: 'sha256'
}, encrypted);

console.log(decrypted.toString('utf8')); // "Hello RSA!"
```

#### PKCS1v15 填充

```javascript
// 使用 PKCS1v15 填充加密（兼容性更好）
const encrypted = crypto.publicEncrypt({
  key: publicKey,
  padding: crypto.constants.RSA_PKCS1_PADDING
}, message);

const decrypted = crypto.privateDecrypt({
  key: privateKey,
  padding: crypto.constants.RSA_PKCS1_PADDING
}, encrypted);
```

### 3. 签名和验签

#### PSS 模式（推荐 - 完整 API）

```javascript
const crypto = require('crypto');

const message = Buffer.from('Message to sign', 'utf8');

// 创建签名
const signer = crypto.createSign('sha256');
signer.update(message);
signer.end();

const signature = signer.sign({
  key: privateKey,
  padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
  saltLength: 32
});

// 验证签名
const verifier = crypto.createVerify('sha256');
verifier.update(message);
verifier.end();

const isValid = verifier.verify({
  key: publicKey,
  padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
  saltLength: 32
}, signature);

console.log('PSS 签名验证:', isValid); // true
```

#### PKCS1v15 模式（兼容性好）

```javascript
// 创建签名
const signer = crypto.createSign('sha256');
signer.update(message);
signer.end();

const signature = signer.sign({
  key: privateKey,
  padding: crypto.constants.RSA_PKCS1_PADDING
});

// 验证签名
const verifier = crypto.createVerify('sha256');
verifier.update(message);
verifier.end();

const isValid = verifier.verify({
  key: publicKey,
  padding: crypto.constants.RSA_PKCS1_PADDING
}, signature);
```

#### 简化 API

```javascript
// 简化签名
const signature = crypto.sign('sha256', message, {
  key: privateKey,
  padding: crypto.constants.RSA_PKCS1_PADDING
});

// 简化验签
const isValid = crypto.verify('sha256', message, publicKey, signature);
console.log('PKCS1 签名验证:', isValid); // true
```

### 4. 使用外部密钥

支持 PKCS#1 和 PKCS#8 两种 PEM 格式，自动识别：

```javascript
// PKCS#8 格式（通常由 openssl 生成）
const pkcs8PrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----`;

// PKCS#1 格式
const pkcs1PrivateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA32/A/hy2ax7q+Tqcv...
-----END RSA PRIVATE KEY-----`;

// 公钥格式
const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr3...
-----END PUBLIC KEY-----`;

// 两种私钥格式都可以直接使用
const encrypted = crypto.publicEncrypt(publicKey, message);
const decrypted1 = crypto.privateDecrypt(pkcs8PrivateKey, encrypted);
const decrypted2 = crypto.privateDecrypt(pkcs1PrivateKey, encrypted);
```

## RSA 常量

```javascript
const crypto = require('crypto');

// RSA 填充常量
crypto.constants.RSA_PKCS1_PADDING        // 1  - 传统 PKCS#1 v1.5 填充
crypto.constants.RSA_PKCS1_OAEP_PADDING   // 4  - OAEP 填充（加密推荐）
crypto.constants.RSA_PKCS1_PSS_PADDING    // 6  - PSS 填充（签名推荐）
```

## 完整示例

```javascript
const crypto = require('crypto');

try {
  // 1. 生成密钥对
  console.log('生成密钥对...');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });

  // 2. 测试加密解密
  console.log('测试加密解密...');
  const message = Buffer.from('RSA Test Message', 'utf8');
  
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, message);
  
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, encrypted);
  
  console.log('解密结果:', decrypted.toString('utf8'));
  console.log('加密解密: ✅ 通过');

  // 3. 测试 PSS 签名
  console.log('测试 PSS 签名...');
  const signerPSS = crypto.createSign('sha256');
  signerPSS.update(message);
  signerPSS.end();
  const signaturePSS = signerPSS.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32
  });
  
  const verifierPSS = crypto.createVerify('sha256');
  verifierPSS.update(message);
  verifierPSS.end();
  const isPSSValid = verifierPSS.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32
  }, signaturePSS);
  
  console.log('PSS 签名验证: ' + (isPSSValid ? '✅ 通过' : '❌ 失败'));

  // 4. 测试 PKCS1 签名（简化 API）
  console.log('测试 PKCS1 签名...');
  const signaturePKCS1 = crypto.sign('sha256', message, {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  });
  
  const isPKCS1Valid = crypto.verify('sha256', message, publicKey, signaturePKCS1);
  console.log('PKCS1 签名验证: ' + (isPKCS1Valid ? '✅ 通过' : '❌ 失败'));

  return {
    success: true,
    message: '所有 RSA 测试通过!',
    results: {
      encryption: true,
      pssSignature: isPSSValid,
      pkcs1Signature: isPKCS1Valid
    }
  };

} catch (error) {
  return {
    success: false,
    error: error.message
  };
}
```

## 技术细节

### 密钥格式自动识别

系统会自动识别并支持以下两种 PEM 格式：

1. **PKCS#1 格式**:
   - 标识: `-----BEGIN RSA PRIVATE KEY-----`
   - 通常由 `openssl genrsa` 生成
   - 只包含 RSA 密钥信息

2. **PKCS#8 格式**:
   - 标识: `-----BEGIN PRIVATE KEY-----`
   - 通常由 `openssl genpkey` 或现代工具生成
   - 包含算法标识符和密钥信息

### 哈希算法支持

所有操作支持以下哈希算法：
- `sha1` - SHA-1（不推荐用于新应用）
- `sha256` - SHA-256（推荐）
- `sha384` - SHA-384
- `sha512` - SHA-512

### 填充模式说明

**加密填充**:
- **OAEP** (Optimal Asymmetric Encryption Padding): 更安全，推荐使用
- **PKCS1v15**: 传统模式，兼容性好

**签名填充**:
- **PSS** (Probabilistic Signature Scheme): 更安全，推荐使用
- **PKCS1v15**: 传统模式，兼容性好

## 性能测试

基于 2048 位密钥的性能指标：
- 密钥生成: ~50-100ms
- 加密操作: ~1-2ms
- 解密操作: ~2-5ms
- 签名操作: ~2-5ms
- 验签操作: ~1-2ms

## 安全建议

1. **密钥长度**: 建议使用 2048 位或更长的密钥
2. **填充模式**: 
   - 加密时优先使用 OAEP
   - 签名时优先使用 PSS
3. **哈希算法**: 优先使用 SHA-256 或更强的算法
4. **密钥存储**: 私钥应安全存储，不要硬编码在代码中
5. **密钥轮换**: 定期更换密钥对

## 错误处理

常见错误及解决方案：

```javascript
try {
  // RSA 操作
} catch (error) {
  if (error.message.includes('failed to parse private key')) {
    console.error('密钥格式错误，请检查 PEM 格式是否正确');
  } else if (error.message.includes('failed to decode PEM block')) {
    console.error('PEM 解码失败，请检查密钥内容');
  } else if (error.message.includes('message too long')) {
    console.error('消息过长，RSA 加密有长度限制');
  } else {
    console.error('RSA 操作失败:', error.message);
  }
}
```

---

*本文档最后更新时间: 2025-09-30*
*版本: v1.0 - 完整 RSA 支持*
