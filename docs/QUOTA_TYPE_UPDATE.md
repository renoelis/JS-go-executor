# Token配额类型更新功能

## 📝 功能说明

支持通过更新接口修改Token的配额类型（quota_type），实现以下转换：
- **count → time**: 从计次改为按时间
- **count → hybrid**: 从计次改为双重限制
- **time → count**: 从按时间改为计次
- **time → hybrid**: 从按时间改为双重限制
- **hybrid → count/time**: 从双重限制改为单一限制

---

## 🔧 API接口

### 接口信息

```http
PUT /flow/tokens/:token
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| operation | string | ✅ | 操作类型 | set, unlimited |
| quota_type | string | ❌ | 配额类型 | time, count, hybrid |
| quota_operation | string | ❌ | 配额操作 | add, set, reset |
| quota_amount | int | ❌ | 配额数量 | - |
| specific_date | string | ❌ | 指定到期日期 | YYYY-MM-DD HH:MM:SS |
| rate_limit_per_minute | int | ❌ | 每分钟限流 | - |
| rate_limit_burst | int | ❌ | 突发限流 | - |
| rate_limit_window_seconds | int | ❌ | 限流窗口 | - |

---

## 📋 使用场景

### 场景1: 将计次Token改为按时间计费

**原始Token**:
```json
{
  "quota_type": "count",
  "total_quota": 1000,
  "remaining_quota": 500,
  "expires_at": null
}
```

**更新请求**:
```bash
curl -X PUT http://localhost:3002/flow/tokens/flow_abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{
    "operation": "set",
    "quota_type": "time",
    "specific_date": "2025-12-31 23:59:59"
  }'
```

**更新后**:
```json
{
  "quota_type": "time",
  "total_quota": 1000,
  "remaining_quota": 500,
  "expires_at": "2025-12-31 23:59:59"
}
```

**效果**: 
- ✅ 配额类型从 count 变为 time
- ✅ 设置过期时间
- ✅ 保留原有的配额数量（但不再检查）

---

### 场景2: 将时间Token改为计次

**原始Token**:
```json
{
  "quota_type": "time",
  "total_quota": 0,
  "remaining_quota": 0,
  "expires_at": "2025-12-31 23:59:59"
}
```

**更新请求**:
```bash
curl -X PUT http://localhost:3002/flow/tokens/flow_abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{
    "operation": "unlimited",
    "quota_type": "count",
    "quota_operation": "set",
    "quota_amount": 1000
  }'
```

**更新后**:
```json
{
  "quota_type": "count",
  "total_quota": 1000,
  "remaining_quota": 1000,
  "expires_at": null
}
```

**效果**:
- ✅ 配额类型从 time 变为 count
- ✅ 设置配额为1000次
- ✅ 移除过期时间限制

---

### 场景3: 将单一限制改为双重限制

**原始Token**:
```json
{
  "quota_type": "count",
  "total_quota": 5000,
  "remaining_quota": 3000,
  "expires_at": null
}
```

**更新请求**:
```bash
curl -X PUT http://localhost:3002/flow/tokens/flow_abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{
    "operation": "set",
    "quota_type": "hybrid",
    "specific_date": "2025-06-30 23:59:59"
  }'
```

**更新后**:
```json
{
  "quota_type": "hybrid",
  "total_quota": 5000,
  "remaining_quota": 3000,
  "expires_at": "2025-06-30 23:59:59"
}
```

**效果**:
- ✅ 配额类型从 count 变为 hybrid
- ✅ 保留原有的配额次数
- ✅ 添加时间限制

---

## ⚠️ 注意事项

### 1. 配额数据保留

修改配额类型时，原有的 `total_quota` 和 `remaining_quota` 会保留：

```
count → time:  配额数据保留但不再检查
time → count:  需要通过quota_operation设置新配额
hybrid → time: 配额数据保留但不再检查
hybrid → count: 配额数据保留，移除时间限制
```

### 2. Redis缓存同步

修改配额类型后，建议：
1. 清除Redis中的配额缓存（自动处理）
2. 下次请求时会从DB重新加载

### 3. 配额类型行为差异

| 类型 | 检查配额次数 | 检查过期时间 | 典型场景 |
|------|-------------|-------------|---------|
| **time** | ❌ | ✅ | 月度订阅（无限次） |
| **count** | ✅ | ❌ | 预付费包（永久有效） |
| **hybrid** | ✅ | ✅ | 月度订阅+配额限制 |

### 4. 建议的转换流程

**count → time**:
```bash
# 步骤1: 更新配额类型为time
PUT /flow/tokens/:token
{
  "operation": "set",
  "quota_type": "time",
  "specific_date": "2025-12-31 23:59:59"
}

# 步骤2: (可选) 重置配额为0（因为不再检查）
PUT /flow/tokens/:token
{
  "operation": "unlimited",
  "quota_operation": "set",
  "quota_amount": 0
}
```

**time → count**:
```bash
# 步骤1: 更新配额类型并设置配额
PUT /flow/tokens/:token
{
  "operation": "unlimited",
  "quota_type": "count",
  "quota_operation": "set",
  "quota_amount": 1000
}
```

---

## 🧪 测试示例

### 完整测试脚本

```bash
#!/bin/bash

API_URL="http://localhost:3002"
ADMIN_TOKEN="your_admin_token"

# 1. 创建一个count类型的Token
echo "步骤1: 创建count类型Token..."
TOKEN=$(curl -s -X POST "$API_URL/flow/tokens" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "ws_id": "test_workspace",
    "email": "test@example.com",
    "operation": "unlimited",
    "quota_type": "count",
    "total_quota": 1000
  }' | jq -r '.data.access_token')

echo "创建的Token: $TOKEN"

# 2. 查询初始状态
echo -e "\n步骤2: 查询初始配额状态..."
curl -s -X GET "$API_URL/flow/tokens/$TOKEN/quota" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# 3. 将count类型改为time类型
echo -e "\n步骤3: 将count改为time..."
curl -s -X PUT "$API_URL/flow/tokens/$TOKEN" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "operation": "set",
    "quota_type": "time",
    "specific_date": "2025-12-31 23:59:59"
  }' | jq

# 4. 查询更新后状态
echo -e "\n步骤4: 查询更新后状态..."
curl -s -X GET "$API_URL/flow/tokens/$TOKEN/quota" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# 5. 再次将time改回count
echo -e "\n步骤5: 将time改回count..."
curl -s -X PUT "$API_URL/flow/tokens/$TOKEN" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "operation": "unlimited",
    "quota_type": "count",
    "quota_operation": "set",
    "quota_amount": 500
  }' | jq

# 6. 查询最终状态
echo -e "\n步骤6: 查询最终状态..."
curl -s -X GET "$API_URL/flow/tokens/$TOKEN/quota" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

echo -e "\n✅ 测试完成！"
```

---

## 📊 配额类型转换矩阵

| 从 → 到 | time | count | hybrid |
|---------|------|-------|--------|
| **time** | - | ✅ 需设置配额 | ✅ 保留时间+设置配额 |
| **count** | ✅ 需设置时间 | - | ✅ 保留配额+设置时间 |
| **hybrid** | ✅ 保留时间 | ✅ 保留配额 | - |

---

## ✅ 修复内容

### 代码修改

1. **model/token.go** - 添加QuotaType字段
   ```go
   type UpdateTokenRequest struct {
       // ...
       QuotaType string `json:"quota_type" binding:"omitempty,oneof=time count hybrid"`
   }
   ```

2. **repository/token_repository.go** - 支持更新quota_type
   ```go
   if req.QuotaType != "" {
       query = `UPDATE ... SET quota_type = ? ...`
   }
   ```

### 修复时间
- **日期**: 2025-10-19
- **版本**: v2.3

---

## 🎯 总结

### 新增功能
- ✅ 支持修改Token配额类型
- ✅ 支持所有类型间的转换
- ✅ 保留原有配额数据
- ✅ 向后兼容（quota_type可选）

### 使用场景
- 客户升级/降级套餐
- 业务模式调整（计次↔包月）
- 灵活的计费策略

### API示例
```bash
# 改为时间类型
PUT /flow/tokens/:token
{
  "operation": "set",
  "quota_type": "time",
  "specific_date": "2025-12-31 23:59:59"
}

# 改为计次类型
PUT /flow/tokens/:token
{
  "operation": "unlimited",
  "quota_type": "count",
  "quota_operation": "set",
  "quota_amount": 1000
}
```

---

**文档版本**: 1.0  
**最后更新**: 2025-10-19  
**相关文档**: 
- [配额系统文档](QUOTA_SYSTEM.md)
- [API调用指南](QUOTA_API_GUIDE.md)
