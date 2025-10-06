# Flow-CodeBlock Go API 接口完整文档

## 📅 文档版本：v2.3
## 📅 更新日期：2025-10-05

---

## 🆕 v2.3 更新内容

- ✅ 所有接口统一返回 `request_id` 字段（用于请求追踪）
- ✅ 代码执行接口移除 `executionId` 字段，统一使用 `request_id`
- ✅ 响应格式标准化，支持请求链路追踪
- ✅ 增强的日志系统，所有日志包含 `request_id`

---

## 📖 目录

1. [接口概览](#接口概览)
2. [认证说明](#认证说明)
3. [请求追踪（Request ID）](#请求追踪request-id) 🆕
4. [公开接口](#公开接口)
5. [代码执行接口](#代码执行接口)
6. [Token管理接口](#token管理接口)
7. [系统监控接口](#系统监控接口)
8. [缓存管理接口](#缓存管理接口)
9. [错误码说明](#错误码说明)
10. [使用示例](#使用示例)

---

## 接口概览

### 接口分类

| 分类 | 接口数量 | 认证要求 | 限流策略 |
|------|---------|---------|---------|
| 公开接口 | 2 | 无 | 全局IP限流 |
| 代码执行 | 1 | Token认证 | 智能IP限流 + Token限流 |
| Token管理 | 4 | 管理员认证 | 无 |
| 系统监控 | 3 | 管理员认证 | 无 |
| 缓存管理 | 5 | 管理员认证 | 无 |

### 基础信息

**服务地址：** `http://localhost:3002`

**Content-Type：** `application/json`

**字符编码：** `UTF-8`

---

## 认证说明

### 1. Token认证（用户）

**用途：** 代码执行接口

**Header：**
```
accessToken: {{accessToken}}
```

**示例：**
```bash
curl -X POST http://localhost:3002/flow/codeblock \
  -H "accessToken: flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7" \
  -H "Content-Type: application/json" \
  -d '{"input": {}, "codebase64": "Y29uc29sZS5sb2coMSk="}'
```

### 2. 管理员认证

**用途：** Token管理、系统监控、缓存管理接口

**Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**示例：**
```bash
curl http://localhost:3002/flow/tokens \
  -H "Authorization: Bearer qingflow7676"
```

---

## 请求追踪（Request ID）

### 🆕 什么是 Request ID？

`request_id` 是为每个 API 请求生成的唯一标识符（UUID 格式），用于：

1. **请求追踪**：关联同一请求的所有日志
2. **问题排查**：用户报告问题时提供 request_id，快速定位
3. **性能分析**：追踪慢请求，分析性能瓶颈
4. **分布式追踪**：在微服务间传递请求ID

### 📋 Request ID 的特点

- **格式**：UUID v4（36字符）
  - 示例：`96ff0a85-d8dd-440a-923f-59690bcb8e0d`
- **生成时机**：请求到达时自动生成
- **传递方式**：
  - 客户端可以在请求头中提供：`X-Request-ID: your-id`
  - 如果没有提供，服务器自动生成
- **返回位置**：
  - 响应体中：`"request_id": "..."`
  - 响应头中：`X-Request-ID: ...`

### 🔍 如何使用 Request ID

#### 1. 客户端获取

```javascript
// 从响应体获取
const response = await fetch('/flow/codeblock', { ... });
const data = await response.json();
console.log('Request ID:', data.request_id);

// 从响应头获取
const requestId = response.headers.get('X-Request-ID');
```

#### 2. 主动传递（可选）

```bash
# 客户端可以主动提供 request_id（用于分布式追踪）
curl -X POST http://localhost:3002/flow/codeblock \
  -H "X-Request-ID: my-custom-request-id-123" \
  -H "accessToken: xxx" \
  -d '{ ... }'
```

#### 3. 问题排查

```bash
# 用户报告问题，提供 request_id
Request ID: 96ff0a85-d8dd-440a-923f-59690bcb8e0d

# 运维人员在日志中搜索
docker-compose logs flow-codeblock-go | grep "96ff0a85-d8dd-440a-923f-59690bcb8e0d"

# 输出：该请求的完整调用链
[INFO]  代码执行请求开始 (request_id=96ff0a85...)
[DEBUG] Token认证成功 (request_id=96ff0a85...)
[DEBUG] 开始执行代码 (request_id=96ff0a85...)
[INFO]  代码执行成功 (request_id=96ff0a85...)
```

### 📊 所有接口都返回 request_id

| 接口类型 | 是否返回 request_id | 示例 |
|---------|-------------------|------|
| 代码执行 | ✅ 是 | `POST /flow/codeblock` |
| Token管理 | ✅ 是 | `POST /flow/tokens` |
| 系统监控 | ✅ 是 | `GET /flow/health` |
| 缓存管理 | ✅ 是 | `DELETE /flow/cache` |
| 公开接口 | ✅ 是 | `GET /health` |

---

## 公开接口

### 1. 健康检查

**接口：** `GET /health`

**描述：** 检查服务是否正常运行

**认证：** 无需认证

**限流：** 全局IP限流（50 QPS，突发100）

**请求参数：** 无

**响应示例：**
```json
{
  "service": "flow-codeblock-go",
  "status": "healthy",
  "timestamp": "2025-10-05 16:42:53",
  "version": "1.0.0"
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| service | string | 服务名称 |
| status | string | 服务状态（healthy/unhealthy） |
| timestamp | string | 当前时间（格式：yyyy-MM-dd HH:mm:ss，东八区） |
| version | string | 服务版本 |

**调用示例：**
```bash
curl http://localhost:3002/health
```

---

### 2. 根路径

**接口：** `GET /`

**描述：** 服务欢迎页面

**认证：** 无需认证

**限流：** 全局IP限流（50 QPS，突发100）

**请求参数：** 无

**响应示例：**
```json
{
  "message": "Flow-CodeBlock Go Executor",
  "version": "1.0.0",
  "status": "running"
}
```

**调用示例：**
```bash
curl http://localhost:3002/
```

---

## 代码执行接口

### 执行JavaScript代码

**接口：** `POST /flow/codeblock`

**描述：** 执行JavaScript代码并返回结果

**认证：** 需要Token认证

**限流策略：**
1. **智能IP限流**（根据认证状态动态切换）
   - 认证失败的IP：50 QPS，突发100（严格）
   - 认证成功的IP：200 QPS，突发400（宽松）
2. **Token限流**（根据Token配置）
   - 默认：60次/分钟，突发10

**请求Header：**
```
accessToken: {{accessToken}}
Content-Type: application/json
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| input | object | 是 | 输入数据，可以是任意JSON对象 |
| codebase64 | string | 是 | Base64编码的JavaScript代码 |

**请求示例：**
```json
{
  "input": {
    "name": "张三",
    "age": 25,
    "items": [1, 2, 3]
  },
  "codebase64": "cmV0dXJuIHsKICByZXN1bHQ6IGlucHV0LmFnZSAqIDIsCiAgbmFtZTogaW5wdXQubmFtZQp9Ow=="
}
```

**代码示例（解码前）：**
```javascript
return {
  result: input.age * 2,
  name: input.name
};
```

**⚠️ 重要说明：**
- ❌ **不允许使用 `console.log()` 等console方法**
- ✅ 请使用 `return` 语句返回需要的数据
- ✅ 可以在返回对象中包含调试信息

**成功响应：**
```json
{
  "success": true,
  "result": {
    "result": 50,
    "name": "张三"
  },
  "timing": {
    "executionTime": 15,
    "totalTime": 15
  },
  "timestamp": "2025-10-05 16:30:00",
  "request_id": "96ff0a85-d8dd-440a-923f-59690bcb8e0d"
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 执行是否成功 |
| result | any | 代码返回的结果（return的内容） |
| timing.executionTime | number | 代码执行耗时（毫秒） |
| timing.totalTime | number | 总耗时（毫秒，包括验证等） |
| timestamp | string | 执行时间（东八区，格式：yyyy-MM-dd HH:mm:ss） |
| request_id | string | 🆕 请求唯一标识（UUID格式，用于追踪和排查） |

**错误响应：**
```json
{
  "success": false,
  "error": {
    "type": "SyntaxError",
    "message": "语法错误: Unexpected token"
  },
  "timing": {
    "executionTime": 0,
    "totalTime": 5
  },
  "timestamp": "2025-10-05 16:30:00",
  "request_id": "c72a95dd-9548-4b62-94f5-4a657d7de924"
}
```

**错误字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 固定为false |
| error.type | string | 错误类型（如：SyntaxError, ReferenceError, TimeoutError等） |
| error.message | string | 错误详细信息 |
| timing.executionTime | number | 代码执行耗时（毫秒） |
| timing.totalTime | number | 总耗时（毫秒） |
| timestamp | string | 执行时间 |
| request_id | string | 🆕 请求唯一标识（用于问题排查） |

**调用示例：**

```bash
# 1. 准备JavaScript代码
CODE='return { 
  result: input.age * 2,
  message: "计算完成"
};'

# 2. Base64编码
CODE_BASE64=$(echo -n "$CODE" | base64)

# 3. 调用接口
curl -X POST http://localhost:3002/flow/codeblock \
  -H "accessToken: flow_test_token_123456" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {\"age\": 25},
    \"codebase64\": \"$CODE_BASE64\"
  }"
```

**支持的功能：**
- ✅ 标准JavaScript语法（ES6+）
- ✅ async/await异步操作
- ✅ fetch API（HTTP请求）
- ✅ axios（HTTP客户端）
- ✅ lodash（工具库）
- ✅ date-fns（日期处理）
- ✅ crypto-js（加密）
- ✅ Buffer（二进制处理）
- ✅ FormData（表单数据）
- ✅ 更多增强模块...

**使用限制：**
- ❌ **不支持 `console.log()` 等console方法**
- ❌ 不支持访问文件系统
- ❌ 不支持执行系统命令
- ✅ 所有输出请通过 `return` 语句返回

---

## Token管理接口

### 1. 创建Token

**接口：** `POST /flow/tokens`

**描述：** 创建新的访问Token

**认证：** 需要管理员认证

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
Content-Type: application/json
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ws_id | string | 是 | 工作空间ID |
| email | string | 是 | 用户邮箱（需符合邮箱格式） |
| operation | string | 是 | 操作类型：`add`/`set`/`unlimited` |
| days | int | 条件 | 有效天数（operation为add时必填） |
| specific_date | string | 否 | 指定过期日期（支持格式：`yyyy-MM-dd` 或 `yyyy-MM-dd HH:mm:ss`） |
| rate_limit_per_minute | int | 否 | 每分钟请求限制（默认：60） |
| rate_limit_burst | int | 否 | 突发请求限制（默认：10） |
| rate_limit_window_seconds | int | 否 | 限流窗口秒数（默认：60） |

**operation说明：**

| 值 | 说明 | 需要days | 过期时间 |
|------|------|---------|---------|
| add | 新增指定天数 | 是 | 当前时间 + days天 |
| set | 设置到指定日期 | 否 | specific_date |
| unlimited | 永不过期 | 否 | null |

**请求示例1：创建有期限Token**
```json
{
  "ws_id": "workspace_001",
  "email": "user@example.com",
  "operation": "add",
  "days": 365,
  "rate_limit_per_minute": 60,
  "rate_limit_burst": 10,
  "rate_limit_window_seconds": 60
}
```

**请求示例2：创建无限期Token**
```json
{
  "ws_id": "workspace_001",
  "email": "user@example.com",
  "operation": "unlimited"
}
```

**成功响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ws_id": "workspace_001",
    "email": "user@example.com",
    "access_token": "flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7",
    "created_at": "2025-10-05 16:30:00",
    "expires_at": "2026-10-05 16:30:00",
    "operation_type": "add",
    "is_active": true,
    "rate_limit_per_minute": 60,
    "rate_limit_burst": 10,
    "rate_limit_window_seconds": 60,
    "updated_at": "2025-10-05 16:30:00"
  },
  "message": "Token创建成功",
  "timestamp": "2025-10-05 16:30:00"
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | Token ID |
| ws_id | string | 工作空间ID |
| email | string | 用户邮箱 |
| access_token | string | 访问Token（68位） |
| created_at | string | 创建时间（格式：yyyy-MM-dd HH:mm:ss，东八区） |
| expires_at | string/null | 过期时间（格式：yyyy-MM-dd HH:mm:ss，东八区，null表示永不过期） |
| operation_type | string | 操作类型 |
| is_active | boolean | 是否激活 |
| rate_limit_per_minute | int/null | 每分钟限制（null表示不限流） |
| rate_limit_burst | int/null | 突发限制 |
| rate_limit_window_seconds | int | 限流窗口秒数 |
| updated_at | string | 更新时间（格式：yyyy-MM-dd HH:mm:ss，东八区） |

**调用示例：**
```bash
curl -X POST http://localhost:3002/flow/tokens \
  -H "Authorization: Bearer qingflow7676" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "workspace_001",
    "email": "user@example.com",
    "operation": "add",
    "days": 365,
    "rate_limit_per_minute": 60,
    "rate_limit_burst": 10
  }'
```

---

### 2. 更新Token

**接口：** `PUT /flow/tokens/:token`

**描述：** 更新已存在的Token配置

**认证：** 需要管理员认证

**URL参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 要更新的Token值 |

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
Content-Type: application/json
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operation | string | 是 | 操作类型：`set`/`unlimited` |
| specific_date | string | 条件 | 指定过期日期（operation为set时必填，支持格式：`yyyy-MM-dd` 或 `yyyy-MM-dd HH:mm:ss`） |
| rate_limit_per_minute | int | 否 | 每分钟请求限制 |
| rate_limit_burst | int | 否 | 突发请求限制 |
| rate_limit_window_seconds | int | 否 | 限流窗口秒数 |

**请求示例1：更新过期时间（仅日期）**
```json
{
  "operation": "set",
  "specific_date": "2026-12-31"
}
```

**请求示例2：更新过期时间（完整时间）**
```json
{
  "operation": "set",
  "specific_date": "2026-12-31 18:30:00"
}
```

**请求示例3：更新限流配置**
```json
{
  "operation": "set",
  "specific_date": "2026-12-31 23:59:59",
  "rate_limit_per_minute": 120,
  "rate_limit_burst": 20
}
```

**请求示例4：设置为无限期**
```json
{
  "operation": "unlimited"
}
```

**⏰ specific_date 时间格式说明：**

支持两种格式：

1. **仅日期格式：** `yyyy-MM-dd`
   - 示例：`"2026-12-31"`
   - 效果：过期时间为 `2026-12-31 00:00:00`（当天零点）

2. **完整时间格式：** `yyyy-MM-dd HH:mm:ss`
   - 示例：`"2026-12-31 18:30:00"`
   - 效果：过期时间为 `2026-12-31 18:30:00`（指定时间）

**注意：** 所有时间均为东八区（上海/北京时间）

**成功响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ws_id": "workspace_001",
    "email": "user@example.com",
    "access_token": "flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7",
    "created_at": "2025-10-05 16:30:00",
    "expires_at": "2026-12-31 23:59:59",
    "operation_type": "set",
    "is_active": true,
    "rate_limit_per_minute": 120,
    "rate_limit_burst": 20,
    "rate_limit_window_seconds": 60,
    "updated_at": "2025-10-05 17:00:00"
  },
  "message": "Token更新成功",
  "timestamp": "2025-10-05 17:00:00"
}
```

**调用示例：**
```bash
curl -X PUT http://localhost:3002/flow/tokens/flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7 \
  -H "Authorization: Bearer qingflow7676" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "set",
    "specific_date": "2026-12-31",
    "rate_limit_per_minute": 120
  }'
```

---

### 3. 删除Token

**接口：** `DELETE /flow/tokens/:token`

**描述：** 删除指定的Token

**认证：** 需要管理员认证

**URL参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 要删除的Token值 |

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**请求参数：** 无

**成功响应：**
```json
{
  "success": true,
  "message": "Token删除成功",
  "timestamp": "2025-10-05 17:00:00"
}
```

**调用示例：**
```bash
curl -X DELETE http://localhost:3002/flow/tokens/flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7 \
  -H "Authorization: Bearer qingflow7676"
```

---

### 4. 查询Token

**接口：** `GET /flow/tokens`

**描述：** 查询Token信息（支持智能脱敏）

**认证：** 需要管理员认证

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ws_id | string | 否 | 工作空间ID |
| email | string | 否 | 用户邮箱 |
| token | string | 否 | Token值 |

**注意：** 必须提供至少一个查询参数

**智能脱敏规则：**

| 查询参数 | Token显示 | 示例 |
|---------|----------|------|
| 只输入 `ws_id` | **脱敏** | `flow_d3f9b65725***` |
| 只输入 `email` | **脱敏** | `flow_d3f9b65725***` |
| `ws_id` + `email` | **完整** | `flow_d3f9b65725704d0f...` |
| 输入 `token` | **完整** | `flow_d3f9b65725704d0f...` |

**请求示例1：按ws_id查询（Token脱敏）**
```bash
GET /flow/tokens?ws_id=workspace_001
```

**响应示例1：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ws_id": "workspace_001",
      "email": "user1@example.com",
      "access_token": "flow_d3f9b65725***",
      "created_at": "2025-10-05 16:30:00",
      "expires_at": "2026-10-05 16:30:00",
      "is_active": true,
      "rate_limit_per_minute": 60
    },
    {
      "id": 2,
      "ws_id": "workspace_001",
      "email": "user2@example.com",
      "access_token": "flow_43c53725f0***",
      "created_at": "2025-10-05 16:35:00",
      "expires_at": "2026-10-05T16:35:00+08:00",
      "is_active": true,
      "rate_limit_per_minute": 60
    }
  ],
  "count": 2,
  "timestamp": "2025-10-05 17:00:00"
}
```

**请求示例2：按ws_id和email查询（Token完整）**
```bash
GET /flow/tokens?ws_id=workspace_001&email=user1@example.com
```

**响应示例2：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ws_id": "workspace_001",
      "email": "user1@example.com",
      "access_token": "flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7",
      "created_at": "2025-10-05 16:30:00",
      "expires_at": "2026-10-05 16:30:00",
      "operation_type": "add",
      "is_active": true,
      "rate_limit_per_minute": 60,
      "rate_limit_burst": 10,
      "rate_limit_window_seconds": 60,
      "updated_at": "2025-10-05 16:30:00"
    }
  ],
  "count": 1,
  "timestamp": "2025-10-05 17:00:00"
}
```

**请求示例3：按token查询（Token完整）**
```bash
GET /flow/tokens?token=flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7
```

**响应示例3：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ws_id": "workspace_001",
      "email": "user1@example.com",
      "access_token": "flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7",
      "created_at": "2025-10-05 16:30:00",
      "expires_at": "2026-10-05 16:30:00",
      "operation_type": "add",
      "is_active": true,
      "rate_limit_per_minute": 60,
      "rate_limit_burst": 10,
      "rate_limit_window_seconds": 60,
      "updated_at": "2025-10-05 16:30:00"
    }
  ],
  "count": 1,
  "timestamp": "2025-10-05 17:00:00"
}
```

**调用示例：**
```bash
# 查询工作空间的所有Token（脱敏）
curl "http://localhost:3002/flow/tokens?ws_id=workspace_001" \
  -H "Authorization: Bearer qingflow7676"

# 查询特定用户的Token（完整）
curl "http://localhost:3002/flow/tokens?ws_id=workspace_001&email=user@example.com" \
  -H "Authorization: Bearer qingflow7676"

# 查询特定Token（完整）
curl "http://localhost:3002/flow/tokens?token=flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7" \
  -H "Authorization: Bearer qingflow7676"
```

---

## 系统监控接口

### 1. 详细健康检查

**接口：** `GET /flow/health`

**描述：** 获取详细的系统健康状态

**认证：** 需要管理员认证

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**请求参数：** 无

**成功响应：**
```json
{
  "service": "flow-codeblock-go",
  "status": "healthy",
  "timestamp": "2025-10-05 17:48:27",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "ping": "0.83ms"
  },
  "redis": {
    "status": "connected",
    "ping": "0.54ms"
  },
  "runtime": {
    "poolSize": 100,
    "maxConcurrent": 1600,
    "currentExecutions": 0,
    "totalExecutions": 0,
    "successRate": "0.0%"
  },
  "memory": {
    "alloc": "177.1 MB",
    "totalAlloc": "373.1 MB",
    "sys": "205.6 MB",
    "numGC": 15
  },
  "warmup": {
    "status": "completed",
    "modules": [
      "crypto-js",
      "axios",
      "date-fns",
      "lodash",
      "qs",
      "pinyin",
      "uuid"
    ],
    "totalModules": 7,
    "successCount": 7,
    "elapsed": "3.75µs",
    "elapsedMs": 0,
    "timestamp": "2025-10-05 17:48:16"
  }
}
```

**💡 说明：** JSON对象的字段顺序由结构体定义顺序决定，实际响应会按照定义顺序输出。

**响应字段说明：**

**基础字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| service | string | 服务名称 |
| status | string | 服务状态（healthy/unhealthy） |
| timestamp | string | 当前时间（格式：yyyy-MM-dd HH:mm:ss，东八区） |
| version | string | 服务版本 |

**database（数据库连接信息）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 连接状态（connected/disconnected） |
| ping | string | 响应时间（如：2.42ms，error表示连接失败） |

**redis（Redis连接信息）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 连接状态（connected/disconnected） |
| ping | string | 响应时间（如：0.54ms，error表示连接失败） |

**runtime（运行时信息）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| poolSize | int | 当前运行时池大小 |
| maxConcurrent | int | 最大并发执行数 |
| currentExecutions | int | 当前正在执行的任务数 |
| totalExecutions | int | 总执行次数 |
| successRate | string | 成功率（百分比） |

**memory（内存信息）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| alloc | string | 当前分配的内存（已格式化） |
| totalAlloc | string | 累计分配的内存（已格式化） |
| sys | string | 从系统获取的内存（已格式化） |
| numGC | int | 垃圾回收次数 |

**warmup（模块预热信息）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 预热状态（completed/not_started/failed） |
| modules | array | 已预热的模块列表 |
| totalModules | int | 总模块数 |
| successCount | int | 成功预热的模块数 |
| elapsed | string | 预热耗时（格式化字符串） |
| elapsedMs | int | 预热耗时（毫秒） |
| timestamp | string | 预热完成时间（格式：yyyy-MM-dd HH:mm:ss，东八区） |

**调用示例：**
```bash
curl http://localhost:3002/flow/health \
  -H "Authorization: Bearer qingflow7676"
```

---

### 2. 系统统计

**接口：** `GET /flow/status`

**描述：** 获取系统运行统计信息

**认证：** 需要管理员认证

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**请求参数：** 无

**成功响应：**
```json
{
  "success": true,
  "data": {
    "totalExecutions": 15620,
    "successfulExecutions": 15620,
    "failedExecutions": 0,
    "currentExecutions": 5,
    "successRate": 100.0,
    "avgExecutionTime": 25,
    "totalExecutionTime": 390500,
    "syncExecutions": 10000,
    "asyncExecutions": 5620,
    "circuitBreakerTrips": 0,
    "memStats": {
      "alloc": 268435456,
      "totalAlloc": 1073741824,
      "sys": 536870912,
      "numGC": 150
    }
  },
  "timestamp": "2025-10-05 17:00:00"
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| totalExecutions | int64 | 总执行次数 |
| successfulExecutions | int64 | 成功执行次数 |
| failedExecutions | int64 | 失败执行次数 |
| currentExecutions | int64 | 当前正在执行的数量 |
| successRate | float64 | 成功率（%） |
| avgExecutionTime | int64 | 平均执行时间（毫秒） |
| totalExecutionTime | int64 | 总执行时间（毫秒） |
| syncExecutions | int64 | 同步执行次数 |
| asyncExecutions | int64 | 异步执行次数 |
| circuitBreakerTrips | int64 | 熔断器触发次数 |
| memStats | object | 内存统计信息 |

**调用示例：**
```bash
curl http://localhost:3002/flow/status \
  -H "Authorization: Bearer qingflow7676"
```

---

### 3. 系统限制

**接口：** `GET /flow/limits`

**描述：** 获取系统配置的各项限制

**认证：** 需要管理员认证

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**请求参数：** 无

**成功响应：**
```json
{
  "success": true,
  "data": {
    "execution": {
      "maxCodeLength": 65535,
      "maxCodeLengthStr": "65535字节 (63KB)",
      "maxInputSize": 2097152,
      "maxInputSizeStr": "2.00MB",
      "maxResultSize": 5242880,
      "maxResultSizeStr": "5.00MB",
      "timeout": 300000,
      "timeoutStr": "300秒",
      "allowConsole": false
    },
    "concurrency": {
      "maxConcurrent": 1600,
      "poolSize": 100,
      "minPoolSize": 50,
      "maxPoolSize": 200,
      "idleTimeout": 5,
      "idleTimeoutStr": "5分钟"
    },
    "cache": {
      "codeCacheSize": 100
    },
    "circuitBreaker": {
      "enabled": true,
      "minRequests": 100,
      "failureRatio": 0.9,
      "timeout": 10,
      "timeoutStr": "10秒",
      "maxRequests": 100
    },
    "rateLimit": {
      "preAuthIP": {
        "rate": 10,
        "burst": 20
      },
      "postAuthIP": {
        "rate": 200,
        "burst": 400
      },
      "globalIP": {
        "rate": 50,
        "burst": 100
      }
    },
    "database": {
      "host": "localhost",
      "port": 3306,
      "database": "flow_codeblock_go",
      "maxOpenConns": 100,
      "maxIdleConns": 20,
      "connMaxLifetime": 60,
      "connMaxLifetimeStr": "60分钟",
      "connMaxIdleTime": 10,
      "connMaxIdleTimeStr": "10分钟"
    },
    "redis": {
      "enabled": true,
      "host": "localhost",
      "port": 6379,
      "db": 0,
      "poolSize": 100,
      "minIdleConns": 10,
      "dialTimeout": 5,
      "readTimeout": 3,
      "writeTimeout": 3,
      "maxRetries": 3
    }
  },
  "timestamp": "2025-10-05 17:52:00"
}
```

**响应字段说明：**

**execution（执行限制）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| maxCodeLength | int | 最大代码长度（字节） |
| maxCodeLengthStr | string | 最大代码长度（格式化字符串） |
| maxInputSize | int | 最大输入大小（字节） |
| maxInputSizeStr | string | 最大输入大小（格式化字符串） |
| maxResultSize | int | 最大结果大小（字节） |
| maxResultSizeStr | string | 最大结果大小（格式化字符串） |
| timeout | int | 执行超时时间（毫秒） |
| timeoutStr | string | 执行超时时间（格式化字符串） |
| allowConsole | boolean | 是否允许console输出（生产环境：false） |

**concurrency（并发控制）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| maxConcurrent | int | 最大并发执行数 |
| poolSize | int | 当前运行时池大小 |
| minPoolSize | int | 最小运行时池大小 |
| maxPoolSize | int | 最大运行时池大小 |
| idleTimeout | int | 空闲超时时间（分钟） |
| idleTimeoutStr | string | 空闲超时时间（格式化字符串） |

**cache（缓存配置）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| codeCacheSize | int | 代码缓存大小 |

**circuitBreaker（熔断器配置）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| enabled | boolean | 是否启用熔断器 |
| minRequests | int | 最小请求数（触发熔断的最小样本） |
| failureRatio | float | 失败率阈值（0.0-1.0） |
| timeout | int | Open状态持续时间（秒） |
| timeoutStr | string | Open状态持续时间（格式化字符串） |
| maxRequests | int | Half-Open状态最大探测请求数 |

**rateLimit（IP限流配置）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| preAuthIP.rate | int | 认证前IP限流速率（QPS） |
| preAuthIP.burst | int | 认证前IP突发限制 |
| postAuthIP.rate | int | 认证后IP限流速率（QPS） |
| postAuthIP.burst | int | 认证后IP突发限制 |
| globalIP.rate | int | 全局IP限流速率（QPS） |
| globalIP.burst | int | 全局IP突发限制 |

**database（数据库配置）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| host | string | 数据库主机地址 |
| port | int | 数据库端口 |
| database | string | 数据库名称 |
| maxOpenConns | int | 最大打开连接数 |
| maxIdleConns | int | 最大空闲连接数 |
| connMaxLifetime | int | 连接最大生命周期（分钟） |
| connMaxLifetimeStr | string | 连接最大生命周期（格式化字符串） |
| connMaxIdleTime | int | 连接最大空闲时间（分钟） |
| connMaxIdleTimeStr | string | 连接最大空闲时间（格式化字符串） |

**redis（Redis配置）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| enabled | boolean | 是否启用Redis |
| host | string | Redis主机地址 |
| port | int | Redis端口 |
| db | int | Redis数据库编号 |
| poolSize | int | 连接池大小 |
| minIdleConns | int | 最小空闲连接数 |
| dialTimeout | int | 连接超时时间（秒） |
| readTimeout | int | 读取超时时间（秒） |
| writeTimeout | int | 写入超时时间（秒） |
| maxRetries | int | 最大重试次数 |

**调用示例：**
```bash
curl http://localhost:3002/flow/limits \
  -H "Authorization: Bearer qingflow7676"
```

---

## 缓存管理接口

### 1. 缓存统计

**接口：** `GET /flow/cache/stats`

**描述：** 获取Token缓存统计信息

**认证：** 需要管理员认证

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**请求参数：** 无

**成功响应：**
```json
{
  "success": true,
  "data": {
    "hotCache": {
      "size": 500,
      "capacity": 1000,
      "hits": 15000,
      "misses": 100,
      "hitRate": 99.33
    },
    "redisCache": {
      "enabled": true,
      "hits": 50,
      "misses": 50,
      "hitRate": 50.0
    },
    "totalHits": 15050,
    "totalMisses": 150,
    "overallHitRate": 99.01
  },
  "timestamp": "2025-10-05 17:00:00"
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| hotCache.size | int | 热缓存当前大小 |
| hotCache.capacity | int | 热缓存容量 |
| hotCache.hits | int | 热缓存命中次数 |
| hotCache.misses | int | 热缓存未命中次数 |
| hotCache.hitRate | float64 | 热缓存命中率（%） |
| redisCache.enabled | boolean | Redis缓存是否启用 |
| redisCache.hits | int | Redis缓存命中次数 |
| redisCache.misses | int | Redis缓存未命中次数 |
| redisCache.hitRate | float64 | Redis缓存命中率（%） |
| totalHits | int | 总命中次数 |
| totalMisses | int | 总未命中次数 |
| overallHitRate | float64 | 总体命中率（%） |

**调用示例：**
```bash
curl http://localhost:3002/flow/cache/stats \
  -H "Authorization: Bearer qingflow7676"
```

---

### 2. 限流统计

**接口：** `GET /flow/rate-limit/stats`

**描述：** 获取Token限流统计信息和缓存写入池状态

**认证：** 需要管理员认证

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**请求参数：** 无

**成功响应：**
```json
{
  "success": true,
  "data": {
    "hot_tier": {
      "size": 150,
      "max_size": 500,
      "utilization_percent": 30
    },
    "warm_tier": {
      "enabled": true,
      "size": 200,
      "ttl": 3600
    },
    "cold_tier": {
      "enabled": true,
      "batch_buffer_size": 10,
      "batch_size": 100,
      "table_name": "token_rate_limit_history"
    },
    "hit_rate": {
      "hot_hits": 14000,
      "warm_hits": 500,
      "cold_hits": 100,
      "misses": 50,
      "hot_rate": 95.5,
      "warm_rate": 3.4,
      "overall": 98.9
    }
  },
  "write_pool": {
    "workers": 15,
    "queue_size": 1500,
    "queue_used": 23,
    "queue_available": 1477,
    "total_submitted": 15650,
    "total_processed": 15627,
    "total_success": 15600,
    "total_failed": 20,
    "total_timeout": 7,
    "submit_blocked": 5
  },
  "timestamp": "2025-10-05 18:47:49"
}
```

**响应字段说明：**

**data（限流统计）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| hot_tier.size | int | 热层当前大小 |
| hot_tier.max_size | int | 热层最大容量 |
| hot_tier.utilization_percent | int | 热层使用率（%） |
| warm_tier.enabled | boolean | 温层（Redis）是否启用 |
| warm_tier.size | int | 温层当前大小 |
| warm_tier.ttl | int | 温层TTL（秒） |
| cold_tier.enabled | boolean | 冷层（MySQL）是否启用 |
| cold_tier.batch_buffer_size | int | 冷层批量缓冲区大小 |
| cold_tier.batch_size | int | 冷层批量写入大小 |
| cold_tier.table_name | string | 冷层数据表名 |
| hit_rate.hot_hits | int64 | 热层命中次数 |
| hit_rate.warm_hits | int64 | 温层命中次数 |
| hit_rate.cold_hits | int64 | 冷层命中次数 |
| hit_rate.misses | int64 | 未命中次数 |
| hit_rate.hot_rate | float64 | 热层命中率（%） |
| hit_rate.warm_rate | float64 | 温层命中率（%） |
| hit_rate.overall | float64 | 总体命中率（%） |

**write_pool（缓存写入池统计）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| workers | int | Worker goroutine 数量 |
| queue_size | int | 队列总大小 |
| queue_used | int | 队列已使用数量 |
| queue_available | int | 队列可用数量 |
| total_submitted | int64 | 总提交任务数 |
| total_processed | int64 | 总处理任务数 |
| total_success | int64 | 成功执行任务数 |
| total_failed | int64 | 失败执行任务数 |
| total_timeout | int64 | 超时任务数 |
| submit_blocked | int64 | 提交阻塞次数 |

**调用示例：**
```bash
curl http://localhost:3002/flow/rate-limit/stats \
  -H "Authorization: Bearer qingflow7676"
```

---

### 3. 清空缓存

**接口：** `DELETE /flow/cache`

**描述：** 清空所有Token缓存

**认证：** 需要管理员认证

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**请求参数：** 无

**成功响应：**
```json
{
  "success": true,
  "message": "缓存已清空",
  "timestamp": "2025-10-05 17:00:00"
}
```

**调用示例：**
```bash
curl -X DELETE http://localhost:3002/flow/cache \
  -H "Authorization: Bearer qingflow7676"
```

---

### 4. 清除Token限流缓存

**接口：** `DELETE /flow/rate-limit/:token`

**描述：** 清除指定Token的限流缓存

**认证：** 需要管理员认证

**URL参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | Token值 |

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**请求参数：** 无

**成功响应：**
```json
{
  "success": true,
  "message": "限流缓存已清除",
  "timestamp": "2025-10-05 17:00:00"
}
```

**调用示例：**
```bash
curl -X DELETE http://localhost:3002/flow/rate-limit/flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7 \
  -H "Authorization: Bearer qingflow7676"
```

---

### 5. 缓存写入池统计

**接口：** `GET /flow/cache-write-pool/stats`

**描述：** 获取缓存写入池的实时状态和统计信息

**认证：** 需要管理员认证

**请求Header：**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**请求参数：** 无

**成功响应：**
```json
{
  "success": true,
  "data": {
    "workers": 15,
    "queue_size": 1500,
    "queue_used": 23,
    "queue_available": 1477,
    "total_submitted": 15650,
    "total_processed": 15627,
    "total_success": 15600,
    "total_failed": 20,
    "total_timeout": 7,
    "submit_blocked": 5
  }
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| workers | int | Worker goroutine 数量（配置固定） |
| queue_size | int | 队列总大小（配置固定） |
| queue_used | int | 队列当前已使用数量 |
| queue_available | int | 队列当前可用数量 |
| total_submitted | int64 | 总提交任务数（累计） |
| total_processed | int64 | 总处理任务数（累计） |
| total_success | int64 | 成功执行任务数（累计） |
| total_failed | int64 | 失败执行任务数（累计） |
| total_timeout | int64 | 超时任务数（累计） |
| submit_blocked | int64 | 提交阻塞次数（累计） |

**健康指标判断：**

| 指标 | 健康值 | 警告阈值 | 说明 |
|------|--------|---------|------|
| queue_used / queue_size | < 50% | > 70% | 队列占用率过高说明处理能力不足 |
| submit_blocked / total_submitted | < 1% | > 5% | 阻塞率过高说明队列经常满 |
| total_success / total_processed | > 95% | < 90% | 成功率低说明 Redis 可能故障 |
| queue_available | > 750 | < 300 | 可用槽位过少需要调整配置 |

**调用示例：**
```bash
curl http://localhost:3002/flow/cache-write-pool/stats \
  -H "Authorization: Bearer qingflow7676"
```

**使用场景：**
- 监控缓存写入池健康状态
- 判断是否需要调整 workers 或 queue_size 配置
- 排查 Redis 写入问题
- 评估系统负载

**配置调整建议：**

| 现象 | 可能原因 | 建议调整 |
|------|---------|---------|
| queue_used 持续 > 70% | Workers 不足 | 增加 `CACHE_WRITE_POOL_WORKERS` 到 20-30 |
| submit_blocked > 5% | 队列太小 | 增加 `CACHE_WRITE_POOL_QUEUE_SIZE` 到 2000-3000 |
| total_failed 持续增加 | Redis 故障 | 检查 Redis 连接和性能 |
| total_timeout 增加 | Redis 响应慢 | 优化 Redis 配置或增加资源 |

---

## 错误码说明

### HTTP状态码

| 状态码 | 说明 | 场景 |
|--------|------|------|
| 200 | 成功 | 请求成功处理 |
| 400 | 请求参数错误 | 参数格式错误、缺少必填参数 |
| 401 | 未授权 | Token无效、Token过期、缺少认证 |
| 403 | 禁止访问 | 管理员Token错误 |
| 404 | 资源不存在 | Token不存在 |
| 429 | 请求过多 | 触发限流 |
| 500 | 服务器错误 | 内部错误 |

### 错误响应格式

```json
{
  "success": false,
  "error": "错误信息",
  "timestamp": "2025-10-05 17:00:00"
}
```

### 常见错误

#### 1. Token认证失败

**状态码：** 401

**响应：**
```json
{
  "success": false,
  "error": "Token无效或已过期",
  "timestamp": "2025-10-05 17:00:00"
}
```

#### 2. IP限流触发

**状态码：** 429

**响应：**
```json
{
  "success": false,
  "error": {
    "type": "IPRateLimitError",
    "message": "IP 请求频率超限，请稍后再试（认证阶段限制）",
    "limit": {
      "rate": 50,
      "burst": 100
    }
  },
  "timestamp": "2025-10-05 17:00:00"
}
```

#### 3. Token限流触发

**状态码：** 429

**响应：**
```json
{
  "success": false,
  "error": {
    "type": "RateLimitError",
    "message": "请求频率超限，请稍后再试",
    "limit": {
      "per_minute": 60,
      "burst": 10,
      "window_seconds": 60
    }
  },
  "timestamp": "2025-10-05 17:00:00"
}
```

#### 4. 代码执行错误

**状态码：** 200（执行失败也返回200）

**响应：**
```json
{
  "success": false,
  "error": {
    "type": "ReferenceError",
    "message": "变量未定义: xxx"
  },
  "console": [],
  "executionTime": 5,
  "timestamp": "2025-10-05 17:00:00"
}
```

#### 5. 参数错误

**状态码：** 400

**响应：**
```json
{
  "success": false,
  "error": "请求参数错误: ws_id不能为空",
  "timestamp": "2025-10-05 17:00:00"
}
```

---

## 使用示例

### 完整工作流程示例

#### 1. 创建Token

```bash
# 创建一个有效期365天的Token
curl -X POST http://localhost:3002/flow/tokens \
  -H "Authorization: Bearer qingflow7676" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "my_workspace",
    "email": "developer@example.com",
    "operation": "add",
    "days": 365,
    "rate_limit_per_minute": 60,
    "rate_limit_burst": 10
  }'

# 响应会返回access_token，保存它
# access_token: flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7
```

#### 2. 执行代码

```bash
# 准备JavaScript代码
CODE='
const result = {
  sum: input.numbers.reduce((a, b) => a + b, 0),
  count: input.numbers.length,
  message: "计算完成"
};
return result;
'

# Base64编码
CODE_BASE64=$(echo -n "$CODE" | base64)

# 执行代码
curl -X POST http://localhost:3002/flow/codeblock \
  -H "accessToken: flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"numbers\": [1, 2, 3, 4, 5]
    },
    \"codebase64\": \"$CODE_BASE64\"
  }"

# 响应
# {
#   "success": true,
#   "data": {
#     "sum": 15,
#     "count": 5,
#     "message": "计算完成"
#   },
#   "executionTime": 12
# }
```

#### 3. 查询Token信息

```bash
# 查询Token详细信息
curl "http://localhost:3002/flow/tokens?token=flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7" \
  -H "Authorization: Bearer qingflow7676"
```

#### 4. 更新Token配置

```bash
# 提高限流配置
curl -X PUT http://localhost:3002/flow/tokens/flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7 \
  -H "Authorization: Bearer qingflow7676" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "set",
    "specific_date": "2026-12-31",
    "rate_limit_per_minute": 120,
    "rate_limit_burst": 20
  }'
```

#### 5. 监控系统状态

```bash
# 查看系统统计
curl http://localhost:3002/flow/status \
  -H "Authorization: Bearer qingflow7676"

# 查看缓存统计
curl http://localhost:3002/flow/cache/stats \
  -H "Authorization: Bearer qingflow7676"

# 查看限流统计
curl http://localhost:3002/flow/rate-limit/stats \
  -H "Authorization: Bearer qingflow7676"
```

---

### Node.js示例

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3002';
const ADMIN_TOKEN = 'qingflow7676';
const ACCESS_TOKEN = 'flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7';

// 1. 创建Token
async function createToken() {
  const response = await axios.post(`${BASE_URL}/flow/tokens`, {
    ws_id: 'my_workspace',
    email: 'developer@example.com',
    operation: 'add',
    days: 365,
    rate_limit_per_minute: 60,
    rate_limit_burst: 10
  }, {
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Token创建成功:', response.data.data.access_token);
  return response.data.data.access_token;
}

// 2. 执行代码
async function executeCode(token) {
  const code = `
    const result = {
      sum: input.numbers.reduce((a, b) => a + b, 0),
      count: input.numbers.length,
      message: "计算完成"
    };
    return result;
  `;
  
  const codeBase64 = Buffer.from(code).toString('base64');
  
  const response = await axios.post(`${BASE_URL}/flow/codeblock`, {
    input: {
      numbers: [1, 2, 3, 4, 5]
    },
    codebase64: codeBase64
  }, {
    headers: {
      'accessToken': token,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('执行结果:', response.data);
  return response.data;
}

// 3. 查询Token
async function queryToken(wsId, email) {
  const response = await axios.get(`${BASE_URL}/flow/tokens`, {
    params: { ws_id: wsId, email: email },
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  });
  
  console.log('Token信息:', response.data);
  return response.data;
}

// 主函数
async function main() {
  try {
    // 创建Token
    const token = await createToken();
    
    // 执行代码
    await executeCode(token);
    
    // 查询Token
    await queryToken('my_workspace', 'developer@example.com');
    
  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
  }
}

main();
```

---

### Python示例

```python
import requests
import base64
import json

BASE_URL = 'http://localhost:3002'
ADMIN_TOKEN = 'qingflow7676'
ACCESS_TOKEN = 'flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7'

# 1. 创建Token
def create_token():
    url = f'{BASE_URL}/flow/tokens'
    headers = {
        'Authorization': f'Bearer {ADMIN_TOKEN}',
        'Content-Type': 'application/json'
    }
    data = {
        'ws_id': 'my_workspace',
        'email': 'developer@example.com',
        'operation': 'add',
        'days': 365,
        'rate_limit_per_minute': 60,
        'rate_limit_burst': 10
    }
    
    response = requests.post(url, headers=headers, json=data)
    result = response.json()
    
    print('Token创建成功:', result['data']['access_token'])
    return result['data']['access_token']

# 2. 执行代码
def execute_code(token):
    code = '''
const result = {
  sum: input.numbers.reduce((a, b) => a + b, 0),
  count: input.numbers.length,
  message: "计算完成"
};
return result;
    '''
    
    code_base64 = base64.b64encode(code.encode()).decode()
    
    url = f'{BASE_URL}/flow/codeblock'
    headers = {
        'accessToken': token,
        'Content-Type': 'application/json'
    }
    data = {
        'input': {
            'numbers': [1, 2, 3, 4, 5]
        },
        'codebase64': code_base64
    }
    
    response = requests.post(url, headers=headers, json=data)
    result = response.json()
    
    print('执行结果:', json.dumps(result, indent=2, ensure_ascii=False))
    return result

# 3. 查询Token
def query_token(ws_id, email):
    url = f'{BASE_URL}/flow/tokens'
    headers = {
        'Authorization': f'Bearer {ADMIN_TOKEN}'
    }
    params = {
        'ws_id': ws_id,
        'email': email
    }
    
    response = requests.get(url, headers=headers, params=params)
    result = response.json()
    
    print('Token信息:', json.dumps(result, indent=2, ensure_ascii=False))
    return result

# 主函数
def main():
    try:
        # 创建Token
        token = create_token()
        
        # 执行代码
        execute_code(token)
        
        # 查询Token
        query_token('my_workspace', 'developer@example.com')
        
    except Exception as e:
        print('错误:', str(e))

if __name__ == '__main__':
    main()
```

---

## 附录

### A. 限流策略总览

| 限流层级 | 触发条件 | QPS限制 | 突发限制 | 说明 |
|---------|---------|---------|---------|------|
| 全局IP限流 | 所有公开接口 | 50 | 100 | 防止DDoS |
| 智能IP限流（PreAuth） | 认证失败的IP | 50 | 100 | 防止暴力破解 |
| 智能IP限流（PostAuth） | 认证成功的IP | 200 | 400 | 防止极端滥用 |
| Token限流 | 每个Token独立 | 可配置 | 可配置 | 按Token配额限流 |

### B. Token格式说明

**格式：** `flow_` + 64位十六进制字符串

**示例：** `flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7`

**长度：** 68位（5位前缀 + 63位下划线 + 64位哈希）

**生成方式：** SHA-256哈希

### C. 时间格式说明

**统一格式：** `yyyy-MM-dd HH:mm:ss`

**示例：** `2025-10-05 17:30:00`

**时区：** 东八区（上海/北京时间，UTC+8）

**输入格式（specific_date参数）：**
- 完整格式：`yyyy-MM-dd HH:mm:ss`（如：`2025-12-31 18:30:00`）
- 日期格式：`yyyy-MM-dd`（如：`2025-12-31`，时间默认为 `00:00:00`）

**输出格式（所有响应）：**
- 统一格式：`yyyy-MM-dd HH:mm:ss`
- 所有时间字段：`created_at`, `expires_at`, `updated_at`, `timestamp`, `startTime` 等

### D. Base64编码说明

**JavaScript代码需要Base64编码后传递**

**编码方式：**
```bash
# Linux/Mac
echo -n "return { result: 1 }" | base64

# Node.js
Buffer.from('return { result: 1 }').toString('base64')

# Python
import base64
base64.b64encode(b'return { result: 1 }').decode()
```

---

## 🎉 文档完成

**版本：** v2.2  
**更新日期：** 2025-10-05  
**文档状态：** ✅ 完整  

**包含内容：**
- ✅ 15个接口详细说明
- ✅ 完整的请求/响应示例
- ✅ 请求追踪（Request ID）说明 🆕
- ✅ 缓存写入池监控
- ✅ 错误码说明
- ✅ Node.js和Python示例代码
- ✅ 限流策略说明
- ✅ Token脱敏规则
- ✅ 配置调整建议

---

## 📝 版本历史

### v2.3 (2025-10-05)

**重要变更**：
- 🆕 所有接口统一返回 `request_id` 字段
- 🔄 代码执行接口：移除 `executionId` 字段，统一使用 `request_id`
- ✅ 增强的日志系统，所有日志包含 `request_id`
- ✅ 支持客户端主动传递 `X-Request-ID` 请求头

**迁移指南**：
```javascript
// 旧代码（v2.2及之前）
const executionId = response.data.executionId;  // ❌ 不再存在

// 新代码（v2.3+）
const requestId = response.data.request_id;     // ✅ 使用 request_id
```

### v2.2 (2025-10-04)

- ✅ 完善的错误响应格式
- ✅ 统一的响应结构
- ✅ 缓存写入池监控接口

### v2.1 (2025-10-03)

- ✅ Token 认证和限流系统
- ✅ 三层缓存架构
- ✅ IP 限流（认证前/后/全局）

### v2.0 (2025-10-01)

- ✅ Go + goja 重构完成
- ✅ 高性能执行引擎
- ✅ 完整的模块生态

---

**如有疑问，请联系开发团队。** 📞
