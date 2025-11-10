# 配额系统 API 快速参考

## 🚀 快速开始

### 环境变量

```bash
export ADMIN_TOKEN="dev_admin_token_for_testing_only"
export API_URL="http://localhost:3002"
```

---

## 📋 API 列表

| 接口 | 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|------|
| 创建Token | POST | `/flow/tokens` | Admin | 创建带配额的Token |
| 查询配额 | GET | `/flow/tokens/:token/quota` | Admin | 查询剩余配额 |
| 更新配额 | PUT | `/flow/tokens/:token` | Admin | 增购/重置配额 |
| 配额日志 | GET | `/flow/tokens/:token/quota/logs` | Admin | 查询消耗记录 |
| 执行代码 | POST | `/flow/codeblock` | User | 执行代码（消耗配额） |
| 清理状态 | GET | `/flow/quota/cleanup/stats` | Admin | 查询清理服务状态 |
| 触发清理 | POST | `/flow/quota/cleanup/trigger` | Admin | 手动触发清理 |

---

## 🎯 常用命令

### 1. 创建Token

#### Time类型（30天无限次）
```bash
curl -X POST "${API_URL}/flow/tokens" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "workspace_001",
    "email": "user@example.com",
    "operation": "add",
    "days": 30
  }'
```

#### Count类型（永久100次）
```bash
curl -X POST "${API_URL}/flow/tokens" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "workspace_002",
    "email": "user@example.com",
    "operation": "unlimited",
    "quota_type": "count",
    "total_quota": 100
  }'
```

#### Hybrid类型（7天10次）
```bash
curl -X POST "${API_URL}/flow/tokens" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "workspace_003",
    "email": "user@example.com",
    "operation": "add",
    "days": 7,
    "quota_type": "hybrid",
    "total_quota": 10
  }'
```

---

### 2. 查询配额

```bash
curl -X GET "${API_URL}/flow/tokens/YOUR_TOKEN/quota" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

**响应示例**：
```json
{
  "quota_type": "count",
  "total_quota": 100,
  "remaining_quota": 75,
  "consumed_quota": 25
}
```

---

### 3. 增加配额

```bash
curl -X PUT "${API_URL}/flow/tokens/YOUR_TOKEN" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "unlimited",
    "quota_operation": "add",
    "quota_amount": 50
  }'
```

---

### 4. 重置配额

```bash
curl -X PUT "${API_URL}/flow/tokens/YOUR_TOKEN" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "unlimited",
    "quota_operation": "reset",
    "quota_amount": 100
  }'
```

---

### 5. 查询配额日志

```bash
curl -X GET "${API_URL}/flow/tokens/YOUR_TOKEN/quota/logs?page=1&page_size=10" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

### 6. 执行代码（用户）

```bash
# Base64编码代码
CODE=$(echo 'const result = input.a + input.b; return result;' | base64)

curl -X POST "${API_URL}/flow/codeblock" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"codebase64\": \"${CODE}\",
    \"input\": {\"a\": 10, \"b\": 20}
  }"
```

---

### 7. 查询清理状态

```bash
curl -X GET "${API_URL}/flow/quota/cleanup/stats" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

### 8. 手动触发清理

```bash
curl -X POST "${API_URL}/flow/quota/cleanup/trigger" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## 🔍 配额类型对比

| 类型 | 时间限制 | 次数限制 | 使用场景 |
|------|---------|---------|---------|
| **time** | ✅ 有 | ❌ 无 | 按时间订阅 |
| **count** | ❌ 无 | ✅ 有 | 按次计费 |
| **hybrid** | ✅ 有 | ✅ 有 | 试用/套餐 |

---

## 📊 响应状态码

| 状态码 | 说明 | 场景 |
|--------|------|------|
| 200 | 成功 | 正常响应 |
| 400 | 参数错误 | 请求格式错误 |
| 401 | 未授权 | Token无效 |
| 403 | 权限不足 | 需要管理员权限 |
| 429 | 配额不足 | 配额已用完 |
| 500 | 服务器错误 | 系统异常 |

---

## 🎨 配额操作类型

| 操作 | quota_operation | 说明 | 示例 |
|------|----------------|------|------|
| 增加 | `add` | 在当前基础上增加 | 75 + 50 = 125 |
| 重置 | `reset` | 重置为指定值 | → 100 |
| 修改总额 | - | 修改total_quota | 100 → 200 |

---

## 📝 日志操作类型

| action | 说明 | quota_change |
|--------|------|-------------|
| `init` | 初始化配额 | +100 |
| `consume` | 消耗配额 | -1 |
| `add` | 增加配额 | +50 |
| `reset` | 重置配额 | ±N |

---

## 🔧 测试脚本

### 完整测试流程

```bash
#!/bin/bash

# 1. 创建Token
TOKEN_RESPONSE=$(curl -s -X POST "${API_URL}/flow/tokens" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "test_workspace",
    "email": "test@example.com",
    "operation": "unlimited",
    "quota_type": "count",
    "total_quota": 10
  }')

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.data.access_token')
echo "Token创建成功: $TOKEN"

# 2. 查询配额
curl -s -X GET "${API_URL}/flow/tokens/${TOKEN}/quota" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq '.'

# 3. 执行代码
CODE=$(echo 'return "Hello World";' | base64)
curl -s -X POST "${API_URL}/flow/codeblock" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"codebase64\": \"${CODE}\", \"input\": {}}" | jq '.'

# 4. 查询配额（应该减少1）
curl -s -X GET "${API_URL}/flow/tokens/${TOKEN}/quota" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq '.'

# 5. 查询日志
curl -s -X GET "${API_URL}/flow/tokens/${TOKEN}/quota/logs?page=1&page_size=5" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq '.'
```

---

## 💡 使用技巧

### 1. 批量查询配额

```bash
# tokens.txt 包含多个Token
while read token; do
  echo "Token: $token"
  curl -s -X GET "${API_URL}/flow/tokens/${token}/quota" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq '.data'
  echo "---"
done < tokens.txt
```

### 2. 监控配额告警

```bash
# 检查配额是否低于10%
QUOTA=$(curl -s -X GET "${API_URL}/flow/tokens/${TOKEN}/quota" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

REMAINING=$(echo "$QUOTA" | jq -r '.data.remaining_quota')
TOTAL=$(echo "$QUOTA" | jq -r '.data.total_quota')

if [ $REMAINING -lt $((TOTAL / 10)) ]; then
  echo "⚠️ 配额告警: 剩余 ${REMAINING}/${TOTAL}"
fi
```

### 3. 自动续费

```bash
# 配额低于10时自动增加100
REMAINING=$(curl -s -X GET "${API_URL}/flow/tokens/${TOKEN}/quota" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq -r '.data.remaining_quota')

if [ $REMAINING -lt 10 ]; then
  curl -X PUT "${API_URL}/flow/tokens/${TOKEN}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "operation": "unlimited",
      "quota_operation": "add",
      "quota_amount": 100
    }'
  echo "✅ 自动续费成功"
fi
```

---

## 🎯 常见问题

### Q1: 配额不足怎么办？

```bash
# 增加配额
curl -X PUT "${API_URL}/flow/tokens/YOUR_TOKEN" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "unlimited",
    "quota_operation": "add",
    "quota_amount": 100
  }'
```

### Q2: 如何查看配额使用趋势？

```bash
# 查询最近100条日志
curl -X GET "${API_URL}/flow/tokens/YOUR_TOKEN/quota/logs?page=1&page_size=100" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq '.data.logs[] | select(.action=="consume")'
```

### Q3: 如何重置配额？

```bash
# 重置为100次
curl -X PUT "${API_URL}/flow/tokens/YOUR_TOKEN" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "unlimited",
    "quota_operation": "reset",
    "quota_amount": 100
  }'
```

---

## 📚 相关文档

- [详细API文档](QUOTA_API_GUIDE.md) - 完整的API调用说明
- [配额系统使用](QUOTA_SYSTEM.md) - 系统概述和使用指南
- [配额同步策略](QUOTA_SYNC_STRATEGY.md) - 同步机制说明
- [配额同步配置](QUOTA_SYNC_CONFIG.md) - 配置参数说明

---

**快速参考版本**: v1.0  
**最后更新**: 2025-10-18
