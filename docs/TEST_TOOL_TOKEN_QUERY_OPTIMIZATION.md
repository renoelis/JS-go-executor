# 测试工具Token查询优化说明

## 🎯 优化目标

优化Token查询功能，支持两种查询方式，并自动填充已有Token。

---

## ✅ 优化内容

### 1. 新增Token直接查询方式

**位置**：查询弹窗顶部

**功能**：
- 🎯 直接输入完整Token进行查询
- 🔍 调用API：`GET /flow/tokens/{token}/quota`
- ⚡ 优先级高于ws_id+email查询

**特点**：
- ✅ 无需知道ws_id和email
- ✅ 快速查询单个Token信息
- ✅ 自动填充已有Token

---

### 2. 保留ws_id + email查询方式

**位置**：查询弹窗中部（分隔线下方）

**功能**：
- 📋 输入Workspace ID
- 📧 输入Email
- 🔍 调用API：`GET /flow/query-token?ws_id=xxx&email=xxx`

**特点**：
- ✅ 查询该用户的所有Token
- ✅ 支持多Token选择
- ✅ 可过滤已失效Token

---

### 3. 智能自动填充

**触发时机**：点击"🔍 查询Token"按钮打开弹窗时

**逻辑**：
```javascript
// 获取当前Access Token输入框的值
const currentToken = document.getElementById('accessToken').value.trim();

// 如果已填充Token，自动带入查询框
if (currentToken) {
    document.getElementById('queryTokenDirect').value = currentToken;
}
```

**场景**：
1. 用户已经填充了Token
2. 点击"查询Token"按钮
3. 弹窗自动填充该Token
4. 用户可以直接点击"查询"

---

## 📊 两种查询方式对比

| 特性 | Token直接查询 | ws_id + email查询 |
|------|--------------|------------------|
| **输入内容** | 完整Token | Workspace ID + Email |
| **查询结果** | 单个Token信息 | 该用户的所有Token |
| **API接口** | `/flow/tokens/{token}/quota` | `/flow/query-token` |
| **优先级** | 高（优先使用） | 低（备选方案） |
| **适用场景** | 已知Token，查询详情 | 不知道Token，查询列表 |
| **自动填充** | ✅ 支持 | ❌ 不支持 |

---

## 🎨 UI设计

### 弹窗布局

```
┌────────────────────────────────────┐
│  🔍 查询 Token 信息            ×  │
├────────────────────────────────────┤
│  💡 提示：点击右上角 × 或取消按钮  │
├────────────────────────────────────┤
│                                    │
│  🎯 Token（直接查询）              │  ← 方式1
│  ┌──────────────────────────────┐ │
│  │ flow_abc123...               │ │  ← 自动填充
│  └──────────────────────────────┘ │
│  💡 如果填写了Token，将直接查询... │
│                                    │
│  ─────────── 或者 ───────────     │  ← 分隔线
│                                    │
│  📋 Workspace ID                   │  ← 方式2
│  ┌──────────────────────────────┐ │
│  │                              │ │
│  └──────────────────────────────┘ │
│                                    │
│  📧 Email                          │
│  ┌──────────────────────────────┐ │
│  │                              │ │
│  └──────────────────────────────┘ │
│  💡 同时填写可查询该用户的所有...  │
│                                    │
│  ☑ 包含已失效的Token              │
│                                    │
│  ┌──────────┐  ┌──────────┐      │
│  │ ❌ 取消  │  │ 🔍 查询  │      │
│  └──────────┘  └──────────┘      │
└────────────────────────────────────┘
```

---

## 💡 使用场景

### 场景1：已填充Token，快速查询

**用户操作**：
1. 在主界面填充Token：`flow_abc123...`
2. 点击"🔍 查询Token"按钮
3. 弹窗自动填充该Token
4. 直接点击"🔍 查询"

**系统行为**：
```javascript
// 自动填充
queryTokenDirect.value = "flow_abc123...";

// 查询API
GET /flow/tokens/flow_abc123.../quota
```

**显示结果**：
```
✅ 查询成功！找到 1 个 Token

配额类型: 🔢 次数限制（永久有效）
配额使用情况: 75 / 100 次
失效时间: 永久有效
```

---

### 场景2：手动输入Token查询

**用户操作**：
1. 点击"🔍 查询Token"按钮
2. 手动输入Token：`flow_def456...`
3. 点击"🔍 查询"

**系统行为**：
```javascript
// 查询API
GET /flow/tokens/flow_def456.../quota
```

**显示结果**：
```
✅ 查询成功！找到 1 个 Token

配额类型: ⏰ 时间限制（不限次数）
失效时间: 2025-10-20 12:00:00
```

---

### 场景3：通过ws_id + email查询多个Token

**用户操作**：
1. 点击"🔍 查询Token"按钮
2. 输入Workspace ID：`test_ws`
3. 输入Email：`user@example.com`
4. 点击"🔍 查询"

**系统行为**：
```javascript
// 查询API
GET /flow/query-token?ws_id=test_ws&email=user@example.com
```

**显示结果**：
```
✅ 查询成功！找到 3 个 Token

选择 Token（共 3 个）
┌────────────────────────────────┐
│ ✅ flow_abc... (2025-10-20)    │
│ ✅ flow_def... (永久)          │
│ ✅ flow_ghi... (2025-11-01)    │
└────────────────────────────────┘
```

---

### 场景4：Token优先，忽略ws_id和email

**用户操作**：
1. 输入Token：`flow_abc123...`
2. 同时输入ws_id：`test_ws`
3. 同时输入email：`user@example.com`
4. 点击"🔍 查询"

**系统行为**：
```javascript
// 🔥 优先使用Token查询
if (tokenDirect) {
    queryUrl = `/flow/tokens/${tokenDirect}/quota`;
    // 忽略ws_id和email
}
```

**结果**：只查询Token，不查询ws_id+email

---

## 🔧 技术实现

### 1. 自动填充逻辑

```javascript
function showTokenQuery() {
    document.getElementById('tokenModal').classList.add('show');
    document.getElementById('tokenResult').style.display = 'none';
    
    // 🔥 自动填充已有的Token（如果存在）
    const currentToken = document.getElementById('accessToken').value.trim();
    if (currentToken) {
        document.getElementById('queryTokenDirect').value = currentToken;
    } else {
        document.getElementById('queryTokenDirect').value = '';
    }
    
    // 清空ws_id和email
    document.getElementById('queryWsId').value = '';
    document.getElementById('queryEmail').value = '';
}
```

---

### 2. 智能查询逻辑

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
        // 方式1：直接通过Token查询（优先）
        queryUrl = `${apiUrl}/flow/tokens/${encodeURIComponent(tokenDirect)}/quota`;
        queryMethod = 'token';
    } else if (wsId && email) {
        // 方式2：通过ws_id + email查询
        queryUrl = `${apiUrl}/flow/query-token?ws_id=${encodeURIComponent(wsId)}&email=${encodeURIComponent(email)}`;
        queryMethod = 'wsid_email';
    } else {
        // 验证必填项
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
    
    // 🔥 根据查询方式处理返回数据
    let tokens = [];
    
    if (queryMethod === 'token') {
        // Token直接查询：返回单个Token信息
        tokens = [result.data];
    } else {
        // ws_id+email查询：返回Token列表
        tokens = Array.isArray(result.data) ? result.data : (result.data.tokens || []);
    }
    
    // 显示结果
    handleTokensResult(tokens);
}
```

---

### 3. 返回数据处理

#### Token直接查询

**API响应**：
```json
{
  "success": true,
  "data": {
    "access_token": "flow_abc123...",
    "quota_type": "count",
    "total_quota": 100,
    "remaining_quota": 75,
    "expires_at": null,
    "is_active": true
  }
}
```

**处理逻辑**：
```javascript
// 包装成数组
tokens = [result.data];

// 显示单个Token详情
displayTokenInfo(tokens[0]);
```

---

#### ws_id + email查询

**API响应**：
```json
{
  "success": true,
  "data": [
    {
      "access_token": "flow_abc123...",
      "quota_type": "count",
      "total_quota": 100,
      "remaining_quota": 75
    },
    {
      "access_token": "flow_def456...",
      "quota_type": "time",
      "expires_at": "2025-10-20 12:00:00"
    }
  ]
}
```

**处理逻辑**：
```javascript
// 直接使用数组
tokens = result.data;

// 显示Token选择器
displayTokenSelector(tokens);
```

---

## 📋 优化前后对比

### 优化前

**查询方式**：
- ✅ ws_id + email查询
- ❌ 不支持Token直接查询

**用户体验**：
- ❌ 已知Token也要输入ws_id和email
- ❌ 查询多个Token后还要选择
- ❌ 不会自动填充已有Token

---

### 优化后

**查询方式**：
- ✅ Token直接查询（优先）
- ✅ ws_id + email查询（备选）

**用户体验**：
- ✅ 已知Token直接查询，更快捷
- ✅ 自动填充已有Token，更智能
- ✅ 两种方式灵活切换，更方便

---

## 🎉 总结

### 优化内容

1. ✅ 新增Token直接查询方式
2. ✅ 保留ws_id + email查询方式
3. ✅ 智能自动填充已有Token
4. ✅ 优先级判断（Token > ws_id+email）

### 适用场景

- ✅ 已知Token，快速查询
- ✅ 不知道Token，通过ws_id+email查询
- ✅ 已填充Token，自动带入查询

### 用户体验

- ✅ 更快捷的查询方式
- ✅ 更智能的自动填充
- ✅ 更灵活的查询选项
- ✅ 更清晰的UI布局

---

**优化版本**: v1.2  
**优化时间**: 2025-10-19  
**影响文件**: `templates/test-tool.html`  
**新增API**: `GET /flow/tokens/{token}/quota`
