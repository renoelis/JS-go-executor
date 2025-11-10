# Token查询验证码功能 - 环境变量配置说明

## 📋 快速开始

### 1. 生成Session密钥

```bash
openssl rand -base64 32
```

### 2. 配置环境变量

在 `.env` 文件或环境中添加以下配置：

```bash
# ==================== Token查询验证码配置 ====================

# 🔐 是否启用验证码功能（渐进式部署）
# 默认: false（先测试，确认无误后改为true）
TOKEN_VERIFY_ENABLED=false

# 🔐 是否启用Session防护（推荐启用）
# 默认: true
PAGE_SESSION_ENABLED=true

# 🔐 Session有效期（分钟）
# 默认: 60分钟
# 说明: Session会自动续期，活跃用户可持续使用
PAGE_SESSION_TTL_MIN=60

# 🔐 Session签名密钥（必须配置）
# 生成方式: openssl rand -base64 32
# ⚠️ 重要: 至少32位，生产环境务必设置
PAGE_SESSION_SECRET=your-generated-secret-here

# 🔐 Webhook邮件服务URL
# 说明: 轻流或其他平台的Webhook接收地址
# 示例: https://qingflow.com/api/qsource/xxx-xxx-xxx
EMAIL_WEBHOOK_URL=

# 🔐 Webhook请求超时时间（秒）
# 默认: 10秒
EMAIL_WEBHOOK_TIMEOUT_SEC=10
```

---

## 🚀 渐进式部署方案

### 阶段1：测试兼容性（功能关闭）

```bash
TOKEN_VERIFY_ENABLED=false
PAGE_SESSION_ENABLED=false
```

**目的**: 确保代码部署不影响现有功能

---

### 阶段2：测试Session防护（验证码关闭）

```bash
TOKEN_VERIFY_ENABLED=false
PAGE_SESSION_ENABLED=true
PAGE_SESSION_SECRET=<生成的密钥>
```

**目的**: 测试Session机制是否正常工作

**验证方法**:
1. 访问测试工具页面
2. 打开浏览器开发者工具 → Application → Cookies
3. 检查是否存在 `flow_page_session` Cookie
4. 查看服务端日志，应显示 "Session创建成功"

---

### 阶段3：完全启用（生产环境）

```bash
TOKEN_VERIFY_ENABLED=true
PAGE_SESSION_ENABLED=true
PAGE_SESSION_SECRET=<生成的密钥>
EMAIL_WEBHOOK_URL=<轻流Webhook URL>
```

**前置条件**:
- 已配置轻流Webhook工作流
- 已将服务器IP添加到轻流白名单
- 已测试邮件发送功能

---

## 🔧 轻流Webhook配置

### 1. 创建工作流

1. 登录轻流管理后台
2. 创建新工作流
3. 设置触发器：**Webhook触发**
4. 获取Webhook URL（格式：`https://qingflow.com/api/qsource/xxx`）

### 2. 配置发送邮件节点

**输入字段映射**：
- `ws_id`: 用户工作空间ID
- `email`: 收件人邮箱
- `code`: 验证码（6位数字）

**邮件模板示例**：
```
主题: 【Flow-CodeBlock】Token查询验证码

正文:
您好，

您正在查询Token信息，验证码为: {{code}}

验证码有效期为5分钟，请及时使用。
如非本人操作，请忽略此邮件。

---
Flow-CodeBlock团队
```

### 3. 配置IP白名单（重要）

在轻流Webhook设置中：
- 启用IP白名单
- 添加服务器IP地址
- 保存配置

---

## 🔐 安全配置建议

### 1. Session密钥管理

✅ **必须做**:
- 使用强随机密钥（至少32位）
- 定期轮换密钥（建议每季度）
- 密钥不提交到Git仓库

❌ **禁止**:
- 使用弱密码或默认值
- 在代码中硬编码密钥
- 多个环境共用同一密钥

### 2. Webhook URL保护

✅ **必须做**:
- 配置IP白名单（仅允许服务器IP）
- URL不暴露给前端
- URL不提交到Git仓库

### 3. HTTPS配置（生产环境）

生产环境应启用HTTPS，修改 `executor_controller.go`:

```go
ctx.SetCookie(
    "flow_page_session",  
    signedCookie,         
    3600,                 
    "/",                  
    "",                   
    true,  // ← 改为 true（HTTPS）
    true,  
)
```

---

## 📊 监控和日志

### 查看Session创建日志

```bash
# Docker环境
docker logs -f flow-codeblock-go | grep Session

# 应该看到：
# INFO  Session创建成功并设置Cookie  session_id=abc123...
```

### 查看验证码发送日志

```bash
docker logs -f flow-codeblock-go | grep 验证码

# 应该看到：
# INFO  验证码发送成功  email=u***r@example.com  request_id=xxx
```

### 监控异常

关注以下日志：
- `Session验证失败`
- `验证码错误`
- `请求过于频繁`
- `Webhook返回错误`

---

## ❓ 常见问题 FAQ

### Q1: 部署后会影响现有用户吗？
**A**: 不会。默认`TOKEN_VERIFY_ENABLED=false`，功能关闭，完全向后兼容。

### Q2: Session过期后用户怎么办？
**A**: Session采用自动续期机制，活跃用户可无限期使用。只有超过1小时不活跃才会过期，刷新页面即可重新创建。

### Q3: 如何测试功能是否正常？
**A**: 
1. 访问测试工具页面
2. F12查看控制台，应显示 "✅ Session已就绪"
3. 在 Application→Cookies 中查看 `flow_page_session`
4. 尝试发送验证码测试完整流程

### Q4: Webhook调用失败怎么办？
**A**: 
1. 检查 `EMAIL_WEBHOOK_URL` 配置是否正确
2. 确认服务器IP已添加到轻流白名单
3. 查看服务端日志中的错误信息
4. 使用 curl 测试 Webhook URL 是否可访问

### Q5: 如何关闭验证码功能？
**A**: 设置 `TOKEN_VERIFY_ENABLED=false`，重启服务即可。

---

## 📝 配置检查清单

部署前请确认：

- [ ] 已生成强随机Session密钥
- [ ] 已配置 `PAGE_SESSION_SECRET`
- [ ] 已配置轻流Webhook工作流
- [ ] 已配置 `EMAIL_WEBHOOK_URL`
- [ ] 已将服务器IP添加到轻流白名单
- [ ] 已测试邮件发送功能
- [ ] 已设置 `TOKEN_VERIFY_ENABLED=false`（初次部署）
- [ ] 已查看服务启动日志确认配置加载

---

**文档版本**: v1.0  
**最后更新**: 2025-11-05  
**相关文档**: `docs/初步思路.md`








