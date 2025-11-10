# 配额系统 API 调用指南

## 📚 目录

- [1. 创建Token（支持配额）](#1-创建token支持配额)
- [2. 查询配额](#2-查询配额)
- [3. 更新配额（增购/重置）](#3-更新配额增购重置)
- [4. 查询配额消耗日志](#4-查询配额消耗日志)
- [5. 执行代码（消耗配额）](#5-执行代码消耗配额)
- [6. 查询清理服务状态](#6-查询清理服务状态)
- [7. 手动触发清理](#7-手动触发清理)

---

## 1. 创建Token（支持配额）

### 接口信息

```
POST /flow/tokens
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}
```

### 配额类型说明

| 类型 | 说明 | expires_at | total_quota |
|------|------|-----------|-------------|
| `time` | 仅时间限制 | 必填 | null |
| `count` | 仅次数限制 | null | 必填 |
| `hybrid` | 时间+次数双重限制 | 必填 | 必填 |

---

### 1.1 创建time类型Token（仅时间限制）

**请求示例**：

```bash
curl -X POST "http://localhost:3002/flow/tokens" \
  -H "Authorization: Bearer dev_admin_token_for_testing_only" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "workspace_001",
    "email": "user@example.com",
    "operation": "add",
    "days": 30
  }'
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "ws_id": "workspace_001",
    "email": "user@example.com",
    "access_token": "flow_abc123...",
    "created_at": "2025-10-18 23:00:00",
    "expires_at": "2025-11-17 23:00:00",
    "operation_type": "add",
    "is_active": true,
    "quota_type": "time",
    "total_quota": null,
    "remaining_quota": null
  },
  "message": "Token创建成功",
  "timestamp": "2025-10-18 23:00:00"
}
```

**特点**：
- ✅ 30天内无限次使用
- ✅ 过期后自动失效
- ✅ 不限制调用次数

---

### 1.2 创建count类型Token（仅次数限制）

**请求示例**：

```bash
curl -X POST "http://localhost:3002/flow/tokens" \
  -H "Authorization: Bearer dev_admin_token_for_testing_only" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "workspace_002",
    "email": "user@example.com",
    "operation": "unlimited",
    "quota_type": "count",
    "total_quota": 100
  }'
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": 2,
    "ws_id": "workspace_002",
    "email": "user@example.com",
    "access_token": "flow_def456...",
    "created_at": "2025-10-18 23:00:00",
    "expires_at": null,
    "operation_type": "unlimited",
    "is_active": true,
    "quota_type": "count",
    "total_quota": 100,
    "remaining_quota": 100
  },
  "message": "Token创建成功",
  "timestamp": "2025-10-18 23:00:00"
}
```

**特点**：
- ✅ 永不过期
- ✅ 限制100次调用
- ✅ 用完后自动失效

---

### 1.3 创建hybrid类型Token（时间+次数双重限制）

**请求示例**：

```bash
curl -X POST "http://localhost:3002/flow/tokens" \
  -H "Authorization: Bearer dev_admin_token_for_testing_only" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "workspace_003",
    "email": "user@example.com",
    "operation": "add",
    "days": 7,
    "quota_type": "hybrid",
    "total_quota": 50
  }'
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": 3,
    "ws_id": "workspace_003",
    "email": "user@example.com",
    "access_token": "flow_ghi789...",
    "created_at": "2025-10-18 23:00:00",
    "expires_at": "2025-10-25 23:00:00",
    "operation_type": "add",
    "is_active": true,
    "quota_type": "hybrid",
    "total_quota": 50,
    "remaining_quota": 50
  },
  "message": "Token创建成功",
  "timestamp": "2025-10-18 23:00:00"
}
```

**特点**：
- ✅ 7天内有效
- ✅ 限制50次调用
- ✅ 满足任一条件即失效（过期或用完）

---

## 2. 查询配额

### 接口信息

```
GET /flow/tokens/{token}/quota
Authorization: Bearer {ADMIN_TOKEN}
```

### 请求示例

```bash
curl -X GET "http://localhost:3002/flow/tokens/flow_abc123.../quota" \
  -H "Authorization: Bearer dev_admin_token_for_testing_only"
```

### 响应示例

#### 2.1 count类型配额

```json
{
  "success": true,
  "data": {
    "quota_type": "count",
    "total_quota": 100,
    "remaining_quota": 75,
    "consumed_quota": 25,
    "quota_synced_at": "2025-10-18 23:30:00"
  },
  "timestamp": "2025-10-18 23:30:01"
}
```

#### 2.2 time类型配额

```json
{
  "success": true,
  "data": {
    "quota_type": "time",
    "total_quota": null,
    "remaining_quota": null,
    "consumed_quota": 0,
    "quota_synced_at": null
  },
  "timestamp": "2025-10-18 23:30:01"
}
```

#### 2.3 hybrid类型配额

```json
{
  "success": true,
  "data": {
    "quota_type": "hybrid",
    "total_quota": 50,
    "remaining_quota": 30,
    "consumed_quota": 20,
    "quota_synced_at": "2025-10-18 23:30:00"
  },
  "timestamp": "2025-10-18 23:30:01"
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `quota_type` | string | 配额类型：time/count/hybrid |
| `total_quota` | int/null | 总配额（time类型为null） |
| `remaining_quota` | int/null | 剩余配额 |
| `consumed_quota` | int | 已消耗配额 |
| `quota_synced_at` | string/null | 最后同步时间 |

---

## 3. 更新配额（增购/重置）

### 接口信息

```
PUT /flow/tokens/{token}
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}
```

### 3.1 增加配额

**请求示例**：

```bash
curl -X PUT "http://localhost:3002/flow/tokens/flow_abc123..." \
  -H "Authorization: Bearer dev_admin_token_for_testing_only" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "unlimited",
    "quota_operation": "add",
    "quota_amount": 50
  }'
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": 2,
    "ws_id": "workspace_002",
    "email": "user@example.com",
    "access_token": "flow_abc123...",
    "quota_type": "count",
    "total_quota": 100,
    "remaining_quota": 125,
    "quota_synced_at": "2025-10-18 23:35:00",
    "updated_at": "2025-10-18 23:35:00"
  },
  "message": "Token更新成功",
  "timestamp": "2025-10-18 23:35:00"
}
```

**说明**：
- 原剩余：75次
- 增加：50次
- 新剩余：125次（75+50）

---

### 3.2 重置配额

**请求示例**：

```bash
curl -X PUT "http://localhost:3002/flow/tokens/flow_abc123..." \
  -H "Authorization: Bearer dev_admin_token_for_testing_only" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "unlimited",
    "quota_operation": "reset",
    "quota_amount": 100
  }'
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": 2,
    "ws_id": "workspace_002",
    "email": "user@example.com",
    "access_token": "flow_abc123...",
    "quota_type": "count",
    "total_quota": 100,
    "remaining_quota": 100,
    "quota_synced_at": "2025-10-18 23:36:00",
    "updated_at": "2025-10-18 23:36:00"
  },
  "message": "Token更新成功",
  "timestamp": "2025-10-18 23:36:00"
}
```

**说明**：
- 原剩余：25次
- 重置为：100次
- 新剩余：100次

---

## 4. 查询配额消耗日志

### 接口信息

```
GET /flow/tokens/{token}/quota/logs?page=1&page_size=10
Authorization: Bearer {ADMIN_TOKEN}
```

### 请求示例

```bash
curl -X GET "http://localhost:3002/flow/tokens/flow_abc123.../quota/logs?page=1&page_size=10" \
  -H "Authorization: Bearer dev_admin_token_for_testing_only"
```

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量（最大100） |

### 响应示例

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 101,
        "token": "flow_abc123...",
        "ws_id": "workspace_002",
        "email": "user@example.com",
        "quota_before": 76,
        "quota_after": 75,
        "quota_change": -1,
        "action": "consume",
        "request_id": "req_xyz789",
        "execution_success": true,
        "execution_error_type": null,
        "execution_error_message": null,
        "created_at": "2025-10-18 23:30:00"
      },
      {
        "id": 100,
        "token": "flow_abc123...",
        "ws_id": "workspace_002",
        "email": "user@example.com",
        "quota_before": 77,
        "quota_after": 76,
        "quota_change": -1,
        "action": "consume",
        "request_id": "req_abc456",
        "execution_success": true,
        "execution_error_type": null,
        "execution_error_message": null,
        "created_at": "2025-10-18 23:29:55"
      },
      {
        "id": 99,
        "token": "flow_abc123...",
        "ws_id": "workspace_002",
        "email": "user@example.com",
        "quota_before": 0,
        "quota_after": 100,
        "quota_change": 100,
        "action": "init",
        "request_id": null,
        "execution_success": null,
        "execution_error_type": null,
        "execution_error_message": null,
        "created_at": "2025-10-18 23:00:00"
      }
    ],
    "page": 1,
    "page_size": 10,
    "total": 3,
    "total_pages": 1
  },
  "timestamp": "2025-10-18 23:40:00"
}
```

### 日志字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 日志ID |
| `token` | string | Token（脱敏） |
| `ws_id` | string | 工作区ID |
| `email` | string | 用户邮箱 |
| `quota_before` | int | 操作前配额 |
| `quota_after` | int | 操作后配额 |
| `quota_change` | int | 配额变化（负数=消耗，正数=增加） |
| `action` | string | 操作类型：init/consume/add/reset |
| `request_id` | string/null | 请求ID |
| `execution_success` | bool/null | 执行是否成功 |
| `execution_error_type` | string/null | 错误类型 |
| `execution_error_message` | string/null | 错误信息 |
| `created_at` | string | 创建时间 |

### 操作类型说明

| action | 说明 | quota_change |
|--------|------|-------------|
| `init` | 初始化配额 | 正数 |
| `consume` | 消耗配额 | -1 |
| `add` | 增加配额 | 正数 |
| `reset` | 重置配额 | 可正可负 |

---

## 5. 执行代码（消耗配额）

### 接口信息

```
POST /flow/codeblock
Content-Type: application/json
Authorization: Bearer {TOKEN}
```

### 请求示例

```bash
curl -X POST "http://localhost:3002/flow/codeblock" \
  -H "Authorization: Bearer flow_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "codebase64": "Y29uc3QgcmVzdWx0ID0gaW5wdXQuYSArIGlucHV0LmI7CnJldHVybiByZXN1bHQ7",
    "input": {
      "a": 10,
      "b": 20
    }
  }'
```

**代码内容**（Base64解码后）：
```javascript
const result = input.a + input.b;
return result;
```

### 响应示例

#### 5.1 执行成功（配额充足）

```json
{
  "success": true,
  "result": 30,
  "timing": {
    "executionTime": 5,
    "totalTime": 5
  },
  "timestamp": "2025-10-18 23:45:00",
  "request_id": "req_xyz789"
}
```

**配额变化**：
- 执行前：76次
- 执行后：75次
- 消耗：1次

---

#### 5.2 配额不足

```json
{
  "success": false,
  "error": {
    "type": "QuotaExceeded",
    "message": "配额不足: 配额不足"
  },
  "timing": {
    "executionTime": 0,
    "totalTime": 2
  },
  "timestamp": "2025-10-18 23:46:00",
  "request_id": "req_abc456"
}
```

**HTTP状态码**：429 Too Many Requests

**说明**：
- 配额已用完
- 不会执行代码
- 不会扣减配额

---

#### 5.3 执行失败（仍消耗配额）

```json
{
  "success": false,
  "error": {
    "type": "RuntimeError",
    "message": "ReferenceError: undefined_var is not defined",
    "stack": "..."
  },
  "timing": {
    "executionTime": 3,
    "totalTime": 3
  },
  "timestamp": "2025-10-18 23:47:00",
  "request_id": "req_def789"
}
```

**配额变化**：
- 执行前：75次
- 执行后：74次
- 消耗：1次（即使失败也消耗）

---

## 6. 查询清理服务状态

### 接口信息

```
GET /flow/quota/cleanup/stats
Authorization: Bearer {ADMIN_TOKEN}
```

### 请求示例

```bash
curl -X GET "http://localhost:3002/flow/quota/cleanup/stats" \
  -H "Authorization: Bearer dev_admin_token_for_testing_only"
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "retention_days": 90,
    "cleanup_interval": "24h0m0s",
    "batch_size": 10000,
    "last_cleanup_time": "2025-10-18 00:00:00",
    "next_cleanup_time": "2025-10-19 00:00:00",
    "last_cleanup_count": 1523,
    "total_cleaned_count": 45678
  },
  "timestamp": "2025-10-18 23:50:00"
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `enabled` | bool | 是否启用自动清理 |
| `retention_days` | int | 日志保留天数 |
| `cleanup_interval` | string | 清理间隔 |
| `batch_size` | int | 每批删除数量 |
| `last_cleanup_time` | string | 最后清理时间 |
| `next_cleanup_time` | string | 下次清理时间 |
| `last_cleanup_count` | int | 最后清理数量 |
| `total_cleaned_count` | int | 累计清理数量 |

---

## 7. 手动触发清理

### 接口信息

```
POST /flow/quota/cleanup/trigger
Authorization: Bearer {ADMIN_TOKEN}
```

### 请求示例

```bash
curl -X POST "http://localhost:3002/flow/quota/cleanup/trigger" \
  -H "Authorization: Bearer dev_admin_token_for_testing_only"
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "deleted_count": 1523,
    "retention_days": 90
  },
  "message": "清理任务已触发",
  "timestamp": "2025-10-18 23:55:00"
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `deleted_count` | int | 本次删除数量 |
| `retention_days` | int | 保留天数 |

---

## 🔍 常见场景示例

### 场景1：创建试用Token（7天，10次）

```bash
# 1. 创建hybrid类型Token
curl -X POST "http://localhost:3002/flow/tokens" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "trial_user_001",
    "email": "trial@example.com",
    "operation": "add",
    "days": 7,
    "quota_type": "hybrid",
    "total_quota": 10
  }'

# 2. 用户使用Token执行代码
curl -X POST "http://localhost:3002/flow/codeblock" \
  -H "Authorization: Bearer flow_xxx..." \
  -H "Content-Type: application/json" \
  -d '{"codebase64": "...", "input": {}}'

# 3. 查询剩余配额
curl -X GET "http://localhost:3002/flow/tokens/flow_xxx.../quota" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

### 场景2：配额用完后续费

```bash
# 1. 查询当前配额
curl -X GET "http://localhost:3002/flow/tokens/flow_xxx.../quota" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# 响应：remaining_quota: 0

# 2. 增加配额
curl -X PUT "http://localhost:3002/flow/tokens/flow_xxx..." \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "unlimited",
    "quota_operation": "add",
    "quota_amount": 100
  }'

# 3. 验证配额
curl -X GET "http://localhost:3002/flow/tokens/flow_xxx.../quota" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# 响应：remaining_quota: 100
```

---

### 场景3：查看用户使用记录

```bash
# 1. 查询配额日志（最近20条）
curl -X GET "http://localhost:3002/flow/tokens/flow_xxx.../quota/logs?page=1&page_size=20" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# 2. 分析使用情况
# - 查看 action=consume 的记录
# - 查看 execution_success 字段
# - 统计成功/失败次数
```

---

### 场景4：监控清理服务

```bash
# 1. 查询清理状态
curl -X GET "http://localhost:3002/flow/quota/cleanup/stats" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# 2. 如果需要立即清理
curl -X POST "http://localhost:3002/flow/quota/cleanup/trigger" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# 3. 再次查询确认
curl -X GET "http://localhost:3002/flow/quota/cleanup/stats" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## 📊 错误码说明

| HTTP状态码 | 错误类型 | 说明 | 解决方案 |
|-----------|---------|------|---------|
| 200 | - | 成功 | - |
| 400 | BadRequest | 请求参数错误 | 检查请求体格式 |
| 401 | Unauthorized | 未授权 | 检查Token是否正确 |
| 403 | Forbidden | 权限不足 | 需要管理员Token |
| 404 | NotFound | Token不存在 | 检查Token是否有效 |
| 429 | QuotaExceeded | 配额不足 | 增加配额或等待续费 |
| 500 | InternalError | 服务器错误 | 查看服务器日志 |

---

## 🎯 最佳实践

### 1. Token管理

- ✅ 使用hybrid类型给试用用户（时间+次数双重保护）
- ✅ 使用count类型给付费用户（按次计费）
- ✅ 定期检查配额使用情况
- ✅ 配额不足时及时提醒用户

### 2. 配额监控

- ✅ 定期查询配额状态
- ✅ 设置配额告警（如剩余<10%）
- ✅ 分析配额日志，了解使用模式
- ✅ 监控清理服务状态

### 3. 安全建议

- ✅ 管理员Token使用强随机密码
- ✅ 不要在客户端暴露管理员Token
- ✅ 定期轮换管理员Token
- ✅ 记录所有管理操作日志

---

## 📚 相关文档

- [配额系统使用文档](QUOTA_SYSTEM.md)
- [配额同步策略](QUOTA_SYNC_STRATEGY.md)
- [配额同步配置](QUOTA_SYNC_CONFIG.md)
- [配额清理服务](QUOTA_CLEANUP_SERVICE.md)
- [配额原子操作](QUOTA_ATOMIC_OPERATION.md)

---

**文档版本**: v1.0  
**最后更新**: 2025-10-18  
**API版本**: v1
