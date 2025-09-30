# 文档索引

## 📚 主要文档

### 核心文档

1. **[ENHANCED_MODULES.md](ENHANCED_MODULES.md)** - 🌟 **主文档**
   - 所有增强模块的完整说明
   - Buffer、Crypto、异步支持等模块详细介绍
   - 架构设计和使用指南
   - 版本历史和更新记录
   - **推荐首先阅读此文档**

2. **[README.md](README.md)** - 项目概述
   - 项目简介和快速开始
   - API 接口说明
   - 部署指南

### 专项文档

3. **[RSA_DOCS.md](RSA_DOCS.md)** - 🔐 **RSA 完整指南**
   - RSA 非对称加密完整使用指南
   - 密钥生成、加密/解密、签名/验签
   - PKCS#1 和 PKCS#8 格式支持
   - 完整代码示例和最佳实践
   - **推荐 RSA 使用者详细阅读**

4. **[RSA_IMPLEMENTATION.md](RSA_IMPLEMENTATION.md)** - RSA 实现细节
   - RSA 技术实现说明
   - 内部架构和代码结构

5. **[DOCKER.md](DOCKER.md)** - Docker 部署指南
   - Docker 容器化部署说明
   - 环境配置和运行指南

## 🎯 快速导航

### 按功能查找

- **Buffer 功能**: 查看 [ENHANCED_MODULES.md - Buffer 模块](ENHANCED_MODULES.md#1-buffer-模块增强)
- **Crypto 功能**: 查看 [ENHANCED_MODULES.md - Crypto 模块](ENHANCED_MODULES.md#2-crypto-模块增强-分离架构)
- **RSA 功能**: 查看 [RSA_DOCS.md](RSA_DOCS.md) 或 [ENHANCED_MODULES.md - RSA 模块](ENHANCED_MODULES.md#-rsa-非对称加密模块)
- **异步支持**: 查看 [ENHANCED_MODULES.md - 异步支持](ENHANCED_MODULES.md#3-异步支持模块)
- **安全检查**: 查看 [ENHANCED_MODULES.md - 安全检查](ENHANCED_MODULES.md#-安全检查模块)

### 按用途查找

#### 我想开始使用
→ 阅读 [README.md](README.md) 和 [ENHANCED_MODULES.md](ENHANCED_MODULES.md) 的概述部分

#### 我想使用 Buffer
→ 阅读 [ENHANCED_MODULES.md - Buffer 模块](ENHANCED_MODULES.md#1-buffer-模块增强)

#### 我想使用加密功能
→ 阅读 [ENHANCED_MODULES.md - Crypto 模块](ENHANCED_MODULES.md#2-crypto-模块增强-分离架构)

#### 我想使用 RSA 加密
→ **强烈推荐**阅读 [RSA_DOCS.md](RSA_DOCS.md) 获取完整指南

#### 我想部署到 Docker
→ 阅读 [DOCKER.md](DOCKER.md)

#### 我想了解版本更新
→ 查看 [ENHANCED_MODULES.md - 版本历史](ENHANCED_MODULES.md#-版本历史)

## 📖 推荐阅读顺序

### 新用户推荐顺序

1. **[README.md](README.md)** - 快速了解项目
2. **[ENHANCED_MODULES.md](ENHANCED_MODULES.md)** - 详细了解所有功能
3. **[RSA_DOCS.md](RSA_DOCS.md)** - 如果需要使用 RSA 功能

### RSA 用户推荐顺序

1. **[RSA_DOCS.md](RSA_DOCS.md)** - RSA 完整使用指南
2. **[ENHANCED_MODULES.md - RSA 章节](ENHANCED_MODULES.md#-rsa-非对称加密模块)** - RSA 功能概览
3. **测试文件**: `../test/RSA-test.js` - 实际代码示例

### 开发者推荐顺序

1. **[ENHANCED_MODULES.md](ENHANCED_MODULES.md)** - 架构设计和实现
2. **[RSA_IMPLEMENTATION.md](RSA_IMPLEMENTATION.md)** - RSA 实现细节
3. **源码**: `crypto_enhancement.go`, `buffer_enhancement.go`

## 🔧 源码文件

| 文件 | 说明 |
|------|------|
| `crypto_enhancement.go` | Crypto 模块增强器（包含 RSA 实现） |
| `buffer_enhancement.go` | Buffer 模块增强器 |
| `executor.go` | JavaScript 执行器核心 |
| `main.go` | 服务入口 |

## 🧪 测试文件

位于 `../test/` 目录：

| 文件 | 说明 |
|------|------|
| `RSA-test.js` | RSA 完整功能测试 |
| `buffer-test.js` | Buffer 功能测试 |
| `crypto-*.js` | 各种 Crypto 功能测试 |

## 📝 文档更新

- **最后更新**: 2025-09-30
- **当前版本**: v4.1
- **主要更新**: 完整 RSA 支持，PKCS#1/PKCS#8 格式自动识别

---

*如有疑问，请优先查阅相关文档。如果文档未能解答您的问题，欢迎提出反馈。*
