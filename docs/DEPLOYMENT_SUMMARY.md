# Token查询验证码功能 - 完整部署总结

本文档总结了所有已完成的代码修改和待完成的前端集成步骤。

---

## ✅ 已完成的工作

### 1. 后端服务实现 ✅

#### 新增文件：
- ✅ `service/page_session_service.go` - Session服务（IP+UA绑定，HMAC签名）
- ✅ `service/email_webhook_service.go` - Webhook邮件服务
- ✅ `service/token_verify_service.go` - 验证码服务
- ✅ `templates/verify-code.js` - 独立的验证码功能JavaScript模块

#### 修改文件：
- ✅ `config/config.go` - 添加TokenVerifyConfig配置
- ✅ `model/token.go` - 添加验证码请求/响应模型
- ✅ `controller/token_controller.go` - 新增验证码接口
- ✅ `controller/executor_controller.go` - 添加Session创建逻辑
- ✅ `router/router.go` - 配置路由和静态资源
- ✅ `cmd/main.go` - 初始化服务

#### 文档：
- ✅ `docs/初步思路.md` - 完整技术方案
- ✅ `docs/TOKEN_VERIFY_CONFIG.md` - 环境变量配置指南
- ✅ `docs/FRONTEND_MODIFICATIONS.md` - 前端修改详细说明
- ✅ `docs/HTML_MODIFICATION_GUIDE.md` - HTML修改指南（针对压缩文件）
- ✅ `docs/DEPLOYMENT_SUMMARY.md` - 本文档

---

## 📋 待完成的前端集成

由于 `templates/test-tool.html` 已被压缩，需要手动添加验证码UI元素。

### 方法1：使用独立JS模块（推荐）✨

**优点**：简单快速，代码独立

**步骤**：

1. **在压缩的HTML中找到 `</body>` 标签，在之前插入**：

```html
{{if .VerifyCodeEnabled}}<script>const verifyCodeEnabled=true;const hasSession={{.HasSession}};</script><script src="/flow/assets/verify-code.js"></script>{{end}}
```

2. **在Token查询按钮区域（搜索 "查询 Token" 或 "showTokenQuery"）附近插入**：

```html
{{if .VerifyCodeEnabled}}<button id="sendCodeBtn" onclick="sendVerifyCode()" style="padding:10px 20px;background:#3498db;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">📧 发送验证码</button><div id="cooldownHint" style="margin-top:10px;font-size:12px;color:#e74c3c;display:none">请等待 <span id="cooldownSeconds">60</span> 秒后再次发送</div><div id="verifyCodeSection" style="display:none;margin-top:15px"><div style="display:flex;gap:10px"><div style="flex:1"><input type="text" id="verifyCodeInput" placeholder="请输入6位验证码" maxlength="6" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:4px"><div id="verifyCodeError" style="color:#e74c3c;font-size:12px;margin-top:5px;display:none"></div></div><button id="verifyBtn" onclick="verifyCodeAndQuery()" style="padding:10px 20px;background:#27ae60;color:#fff;border:none;border-radius:4px;cursor:pointer;white-space:nowrap;font-weight:600">✅ 验证并查询</button></div></div>{{else}}<button onclick="queryToken()">查询Token</button>{{end}}
```

3. **（可选）添加Token显示函数**：

在HTML的script区域添加：

```html
<script>function displayTokenResult(tokenData){console.log('Token信息:',tokenData);alert('✅ Token查询成功！\n\nAccess Token: '+tokenData.access_token);const tokenInput=document.getElementById('accessToken');if(tokenInput){tokenInput.value=tokenData.access_token;}}</script>
```

### 方法2：完全格式化重建（可选）

详见 `docs/HTML_MODIFICATION_GUIDE.md`

---

## 🔧 环境变量配置

在 `.env` 文件或环境中添加：

```bash
# ==================== Token查询验证码配置 ====================

# 是否启用验证码功能（渐进式部署，默认false）
TOKEN_VERIFY_ENABLED=false

# 是否启用Session防护（推荐启用）
PAGE_SESSION_ENABLED=true

# Session有效期（分钟，默认60分钟，自动续期）
PAGE_SESSION_TTL_MIN=60

# Session签名密钥（必须配置！生成方式: openssl rand -base64 32）
PAGE_SESSION_SECRET=your-generated-secret-here

# Webhook邮件服务URL（轻流Webhook地址）
EMAIL_WEBHOOK_URL=https://qingflow.com/api/qsource/xxx-xxx-xxx

# Webhook请求超时时间（秒，默认10秒）
EMAIL_WEBHOOK_TIMEOUT_SEC=10
```

---

## 🚀 渐进式部署流程

### 阶段1：测试兼容性（所有功能关闭）

```bash
TOKEN_VERIFY_ENABLED=false
PAGE_SESSION_ENABLED=false
```

**目的**：确保代码部署不影响现有功能

**验证**：
```bash
# 重新构建
docker-compose build

# 启动
docker-compose up -d

# 检查日志
docker logs flow-codeblock-go | grep -E "启动|错误"
```

---

### 阶段2：启用Session防护（验证码功能关闭）

```bash
TOKEN_VERIFY_ENABLED=false
PAGE_SESSION_ENABLED=true
PAGE_SESSION_SECRET=<生成的密钥>
```

**目的**：测试Session机制是否正常

**验证**：
1. 访问测试工具页面
2. F12 → Application → Cookies → 检查 `flow_page_session` Cookie
3. 查看控制台：应显示 "✅ Session已就绪"
4. 查看服务端日志：
   ```bash
   docker logs -f flow-codeblock-go | grep Session
   # 应该看到：创建页面Session  session_id=...
   ```

---

### 阶段3：配置轻流Webhook

在轻流管理后台：

1. **创建工作流**
   - 触发器：Webhook
   - 获取URL：`https://qingflow.com/api/qsource/xxx-xxx-xxx`

2. **添加发送邮件节点**
   
   **输入字段映射**：
   - `ws_id` → 工作空间ID
   - `email` → 收件人邮箱
   - `code` → 验证码
   
   **邮件模板**：
   ```
   主题：【Flow-CodeBlock】Token查询验证码
   
   您好，
   
   您正在查询Token信息，验证码为: {{code}}
   
   验证码有效期为5分钟，请及时使用。
   如非本人操作，请忽略此邮件。
   
   ---
   Flow-CodeBlock团队
   ```

3. **配置IP白名单**
   - 启用IP白名单
   - 添加服务器IP
   - 保存

4. **测试Webhook**
   ```bash
   curl -X POST https://qingflow.com/api/qsource/xxx-xxx-xxx \
     -H "Content-Type: application/json" \
     -d '{
       "ws_id": "test_workspace",
       "email": "your-email@example.com",
       "code": "123456"
     }'
   
   # 检查是否收到邮件
   ```

---

### 阶段4：完全启用（生产环境）

```bash
TOKEN_VERIFY_ENABLED=true
PAGE_SESSION_ENABLED=true
PAGE_SESSION_SECRET=<生成的密钥>
EMAIL_WEBHOOK_URL=<轻流Webhook URL>
```

**验证完整流程**：

1. 访问测试工具页面
2. 点击"查询Token"按钮（或你添加的"发送验证码"按钮）
3. 输入 ws_id 和 email
4. 点击"发送验证码"
5. 检查邮箱，输入收到的验证码
6. 点击"验证并查询"
7. 查看Token信息是否正确显示

---

## 📊 监控和日志

### 关键日志查看

```bash
# 查看Session相关日志
docker logs -f flow-codeblock-go | grep -E "Session|session"

# 查看验证码相关日志
docker logs -f flow-codeblock-go | grep -E "验证码|verify"

# 查看所有错误
docker logs -f flow-codeblock-go | grep -E "ERROR|WARN"
```

### 正常日志示例

```
INFO  Session服务已启用  ttl=1h0m0s
INFO  创建页面Session  session_id=abc123... ip=1.2.3.4 ttl=1h0m0s
INFO  Session验证通过并已续期  session_id=abc123... ip=1.2.3.4
INFO  验证码发送成功  email=u***r@example.com request_id=xxx
INFO  验证码验证通过  email=u***r@example.com ws_id=test
INFO  Token查询成功（验证码验证）  email=u***r@example.com
```

### 异常日志示例

```
WARN  Session验证失败  error=Session无效 ip=5.6.7.8
WARN  验证码错误  email=u***r@example.com remaining=2
WARN  请求过于频繁  ip=1.2.3.4
ERROR Webhook返回错误  status_code=500
```

---

## 🐛 故障排查

### 问题1：Session创建失败

**症状**：控制台无 "Session已就绪" 提示

**排查**：
```bash
# 检查配置
docker exec flow-codeblock-go printenv | grep SESSION

# 检查Redis
docker exec flow-codeblock-go redis-cli KEYS "page_session:*"
```

**解决**：
- 确认 `PAGE_SESSION_ENABLED=true`
- 确认 `PAGE_SESSION_SECRET` 已配置
- 确认 Redis 正常运行

---

### 问题2：验证码发送失败

**症状**：点击发送验证码后报错

**排查**：
```bash
# 检查Webhook配置
docker exec flow-codeblock-go printenv | grep WEBHOOK

# 测试Webhook URL
curl -X POST $EMAIL_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"ws_id":"test","email":"test@example.com","code":"123456"}'
```

**解决**：
- 确认 `EMAIL_WEBHOOK_URL` 正确
- 确认服务器IP在轻流白名单中
- 检查网络是否能访问轻流

---

### 问题3：验证码验证失败

**症状**：输入正确验证码仍提示错误

**排查**：
```bash
# 检查Redis中的验证码
docker exec flow-codeblock-go redis-cli KEYS "token_verify_code:*"

# 查看验证码数据
docker exec flow-codeblock-go redis-cli GET "token_verify_code:email:ws_id"
```

**解决**：
- 检查验证码是否过期（5分钟TTL）
- 检查是否超过3次错误尝试
- 查看服务端日志了解详细错误

---

### 问题4：前端JS未加载

**症状**：点击按钮报错 "sendVerifyCode is not defined"

**排查**：
1. F12 → Network → 检查 `verify-code.js` 是否加载成功
2. 检查路由是否配置：访问 `/flow/assets/verify-code.js`

**解决**：
- 确认 `router/router.go` 中已添加路由
- 确认 `templates/verify-code.js` 文件存在
- 重启服务

---

## 📝 文件清单

### 新增文件

```
service/
├── page_session_service.go          # Session服务
├── email_webhook_service.go         # Webhook邮件服务
└── token_verify_service.go          # 验证码服务

templates/
└── verify-code.js                   # 验证码功能JS模块

docs/
├── 初步思路.md                       # 完整技术方案
├── TOKEN_VERIFY_CONFIG.md           # 环境变量配置
├── FRONTEND_MODIFICATIONS.md        # 前端修改说明
├── HTML_MODIFICATION_GUIDE.md       # HTML修改指南
└── DEPLOYMENT_SUMMARY.md            # 本文档
```

### 修改文件

```
config/config.go                     # 添加TokenVerifyConfig
model/token.go                       # 添加验证码模型
controller/token_controller.go       # 添加验证码接口
controller/executor_controller.go    # 添加Session创建
router/router.go                     # 配置路由
cmd/main.go                          # 初始化服务
```

---

## ✅ 最终检查清单

部署前确认：

**后端**：
- [ ] 所有新文件已创建
- [ ] 所有修改的文件已更新
- [ ] 环境变量已配置
- [ ] Session密钥已生成并配置
- [ ] 代码无linter错误

**轻流**：
- [ ] Webhook工作流已创建
- [ ] Webhook URL已获取并配置
- [ ] 邮件发送节点已配置
- [ ] IP白名单已添加服务器IP
- [ ] Webhook已测试通过

**前端**（待完成）：
- [ ] `verify-code.js` 引用已添加到HTML
- [ ] 验证码UI元素已添加到HTML
- [ ] `displayTokenResult` 函数已定义（可选）

**测试**：
- [ ] 服务启动无错误
- [ ] Session创建成功
- [ ] 验证码发送成功
- [ ] 验证码验证成功
- [ ] Token查询成功

---

## 🎉 下一步

1. ✅ **修改test-tool.html**（按照本文档"待完成的前端集成"部分）
2. ✅ **重新构建和部署**
3. ✅ **渐进式测试和启用**
4. ✅ **监控日志和性能**

---

**祝部署顺利！** 🚀

如有任何问题，请参考相关文档或查看日志排查。

**文档版本**: v1.0  
**最后更新**: 2025-11-05







