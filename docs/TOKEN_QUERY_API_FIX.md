# Token查询接口修复说明

## 🐛 问题描述

### 症状

前端使用Token直接查询时报错：

```
❌ 缺少管理员访问令牌，请在请求头中提供accessToken
```

### 原因分析

**前端代码**：
```javascript
// ❌ 错误：调用管理员接口，需要管理员Token
queryUrl = `${apiUrl}/flow/tokens/${tokenDirect}/quota`;
```

**后端路由**：
```go
// ❌ 这是管理员接口，需要认证
adminGroup.GET("/tokens/:token/quota", tokenController.GetQuota)
```

**问题**：
- `GET /flow/tokens/:token/quota` 是**管理员接口**
- 需要在请求头中传递管理员Token
- 测试工具不应该要求用户输入管理员Token

---

## ✅ 解决方案

### 方案概述

**统一使用公开接口** `/flow/query-token`，支持两种查询方式：
1. Token直接查询：`?token=xxx`
2. ws_id + email查询：`?ws_id=xxx&email=xxx`

---

### 后端修改

**文件**：`controller/token_controller.go`

#### 修改前

```go
// 验证必填参数
if req.WsID == "" || req.Email == "" {
    utils.RespondError(c, http.StatusBadRequest,
        utils.ErrorTypeValidation,
        "ws_id 和 email 为必填参数",
        nil)
    return
}
```

**问题**：只支持ws_id + email查询

---

#### 修改后

```go
// 🔥 验证参数：支持两种查询方式
// 方式1：直接通过Token查询
// 方式2：通过ws_id + email查询
if req.Token == "" && (req.WsID == "" || req.Email == "") {
    utils.RespondError(c, http.StatusBadRequest,
        utils.ErrorTypeValidation,
        "请提供 token，或者同时提供 ws_id 和 email",
        nil)
    return
}
```

**改进**：
- ✅ 支持Token直接查询
- ✅ 支持ws_id + email查询
- ✅ 灵活的参数验证

---

### 前端修改

**文件**：`templates/test-tool.html`

#### 修改前

```javascript
if (tokenDirect) {
    // ❌ 错误：调用管理员接口
    queryUrl = `${apiUrl}/flow/tokens/${tokenDirect}/quota`;
    queryMethod = 'token';
} else if (wsId && email) {
    // ✅ 正确：调用公开接口
    queryUrl = `${apiUrl}/flow/query-token?ws_id=${wsId}&email=${email}`;
    queryMethod = 'wsid_email';
}
```

**问题**：
- Token查询使用管理员接口
- ws_id+email查询使用公开接口
- 不一致，导致Token查询失败

---

#### 修改后

```javascript
if (tokenDirect) {
    // ✅ 正确：统一使用公开接口
    queryUrl = `${apiUrl}/flow/query-token?token=${tokenDirect}`;
    queryMethod = 'token';
} else if (wsId && email) {
    // ✅ 正确：统一使用公开接口
    queryUrl = `${apiUrl}/flow/query-token?ws_id=${wsId}&email=${email}`;
    queryMethod = 'wsid_email';
}
```

**改进**：
- ✅ 统一使用公开接口
- ✅ 不需要管理员Token
- ✅ 两种查询方式都可用

---

## 📊 API对比

### 管理员接口（需要认证）

**接口**：`GET /flow/tokens/:token/quota`

**权限**：需要管理员Token

**请求示例**：
```bash
curl -X GET "http://localhost:3002/flow/tokens/flow_abc123.../quota" \
  -H "Authorization: Bearer dev_admin_token_for_testing_only"
```

**适用场景**：
- ✅ 后台管理系统
- ✅ 管理员操作
- ❌ 测试工具（不适合）

---

### 公开接口（无需认证）

**接口**：`GET /flow/query-token`

**权限**：无需认证（有IP限流）

**请求示例1（Token查询）**：
```bash
curl -X GET "http://localhost:3002/flow/query-token?token=flow_abc123..."
```

**返回格式**：
```json
{
  "success": true,
  "data": {
    "count": 1,
    "tokens": [
      {
        "access_token": "flow_abc123...",
        "quota_type": "count",
        "total_quota": 100,
        "remaining_quota": 99,
        ...
      }
    ]
  }
}
```

**请求示例2（ws_id + email查询）**：
```bash
curl -X GET "http://localhost:3002/flow/query-token?ws_id=test_ws&email=user@example.com"
```

**返回格式**：
```json
{
  "success": true,
  "data": {
    "count": 2,
    "tokens": [
      {
        "access_token": "flow_abc123...",
        ...
      },
      {
        "access_token": "flow_def456...",
        ...
      }
    ]
  }
}
```

**适用场景**：
- ✅ 测试工具
- ✅ 前端应用
- ✅ 公开查询

---

## 🔧 技术细节

### 后端参数验证逻辑

```go
// TokenQueryRequest 结构
type TokenQueryRequest struct {
    Token string `form:"token" json:"token"`  // 方式1：Token直接查询
    WsID  string `form:"ws_id" json:"ws_id"`  // 方式2：ws_id
    Email string `form:"email" json:"email"`  // 方式2：email
}

// 验证逻辑
if req.Token == "" && (req.WsID == "" || req.Email == "") {
    // 错误：既没有Token，也没有ws_id+email
    return error
}

// 查询逻辑
if req.Token != "" {
    // 通过Token查询
    return GetTokenByToken(req.Token)
} else {
    // 通过ws_id + email查询
    return GetTokensByWsIDAndEmail(req.WsID, req.Email)
}
```

---

### 前端查询逻辑

```javascript
async function queryToken() {
    const tokenDirect = document.getElementById('queryTokenDirect').value.trim();
    const wsId = document.getElementById('queryWsId').value.trim();
    const email = document.getElementById('queryEmail').value.trim();
    const apiUrl = document.getElementById('apiUrl').value.trim();

    // 🔥 智能判断查询方式
    let queryUrl = '';
    let queryMethod = '';
    
    if (tokenDirect) {
        // 方式1：Token直接查询
        queryUrl = `${apiUrl}/flow/query-token?token=${encodeURIComponent(tokenDirect)}`;
        queryMethod = 'token';
    } else if (wsId && email) {
        // 方式2：ws_id + email查询
        queryUrl = `${apiUrl}/flow/query-token?ws_id=${encodeURIComponent(wsId)}&email=${encodeURIComponent(email)}`;
        queryMethod = 'wsid_email';
    } else {
        // 验证失败
        showAlertInModal('❌ 请输入 Token，或者同时输入 Workspace ID 和 Email', 'error');
        return;
    }
    
    // 发起查询
    const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    const result = await response.json();
    
    // 🔥 统一处理返回数据（两种查询方式返回格式相同）
    // 返回格式：{ data: { count: 1, tokens: [...] } }
    let tokens = result.data.tokens || [];
    
    // 显示结果
    handleTokensResult(tokens);
}
```

---

## 📋 修复前后对比

### 修复前

**Token直接查询**：
```
请求：GET /flow/tokens/flow_abc123.../quota
结果：❌ 缺少管理员访问令牌
```

**ws_id + email查询**：
```
请求：GET /flow/query-token?ws_id=xxx&email=xxx
结果：✅ 成功
```

**问题**：
- ❌ Token查询失败
- ❌ 需要管理员Token
- ❌ 用户体验差

---

### 修复后

**Token直接查询**：
```
请求：GET /flow/query-token?token=flow_abc123...
结果：✅ 成功
```

**ws_id + email查询**：
```
请求：GET /flow/query-token?ws_id=xxx&email=xxx
结果：✅ 成功
```

**改进**：
- ✅ 两种方式都成功
- ✅ 无需管理员Token
- ✅ 统一使用公开接口

---

## 🎉 总结

### 修复内容

1. ✅ 后端支持Token直接查询
2. ✅ 前端统一使用公开接口
3. ✅ 无需管理员Token
4. ✅ 两种查询方式都可用

### 修改的文件

- ✅ `controller/token_controller.go` - 修改参数验证逻辑
- ✅ `templates/test-tool.html` - 统一使用公开接口

### 影响范围

- ✅ 向后兼容
- ✅ 不影响现有功能
- ✅ 修复Token直接查询

---

**修复版本**: v1.3  
**修复时间**: 2025-10-19  
**Bug严重性**: 高（Token直接查询完全无法使用）  
**影响接口**: `GET /flow/query-token`
