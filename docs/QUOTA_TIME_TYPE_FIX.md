# Time类型Token配额检查Bug修复

## 🐛 问题描述

### 症状

time类型的Token在执行代码时报错"配额不足"：

```json
// Token信息
{
  "quota_type": "time",
  "total_quota": null,
  "remaining_quota": null,
  "expires_at": "2025-10-20 00:35:30"
}

// 执行代码时报错
{
  "success": false,
  "error": {
    "type": "QuotaExceeded",
    "message": "配额不足: 配额不足"
  }
}
```

**预期行为**：time类型应该**不检查配额**，只检查时间

**实际行为**：被错误地检查了配额，导致无法使用

---

## 🔍 根本原因

### 问题代码

**文件**：`controller/executor_controller.go`

```go
// ❌ 修复前：所有Token都检查配额
if token != "" && c.quotaService != nil {
    _, _, err := c.quotaService.ConsumeQuota(...)
    if err != nil {
        // 返回配额不足错误
    }
}
```

### 执行流程

```
1. 用户执行代码
   ↓
2. executor_controller.go 调用 ConsumeQuota()
   ↓
3. quota_service.go 尝试从Redis扣减配额
   ↓
4. Redis中没有key（time类型未初始化）
   ↓
5. 调用 loadQuotaFromDBAndConsume()
   ↓
6. 从DB查询 remaining_quota = null
   ↓
7. 判断 quota == nil || *quota <= 0
   ↓
8. 返回"配额不足"错误 ❌
```

### 关键问题

1. **time类型Token**：`remaining_quota = null`
2. **InitQuota跳过**：time类型不初始化Redis
3. **ConsumeQuota未判断**：没有检查Token类型就扣减配额
4. **null被当作0**：`quota == nil` 被判断为配额不足

---

## ✅ 修复方案

### 核心思路

**在执行代码前检查Token类型，time类型跳过配额检查**

### 修复代码

**文件**：`controller/executor_controller.go`

```go
// ✅ 修复后：只对需要配额检查的Token进行扣减
// 🔥 获取Token信息，检查是否需要配额检查
tokenInfoValue, exists := ctx.Get("tokenInfo")
needsQuotaCheck := false
if exists {
    if tokenInfo, ok := tokenInfoValue.(*model.TokenInfo); ok {
        needsQuotaCheck = tokenInfo.NeedsQuotaCheck()
    }
}

// 🔥 只对需要配额检查的Token（count/hybrid类型）进行配额扣减
if token != "" && c.quotaService != nil && needsQuotaCheck {
    _, _, err := c.quotaService.ConsumeQuota(...)
    if err != nil {
        // 返回配额不足错误
    }
}
```

### NeedsQuotaCheck() 方法

**文件**：`model/token.go`

```go
// NeedsQuotaCheck 是否需要配额检查
func (t *TokenInfo) NeedsQuotaCheck() bool {
    return t.IsCountBased() && t.TotalQuota != nil
}

// IsCountBased 是否基于次数的配额模式
func (t *TokenInfo) IsCountBased() bool {
    return t.QuotaType == "count" || t.QuotaType == "hybrid"
}
```

**判断逻辑**：
- `quota_type = "time"` → `IsCountBased() = false` → `NeedsQuotaCheck() = false`
- `quota_type = "count"` → `IsCountBased() = true` → `NeedsQuotaCheck() = true`
- `quota_type = "hybrid"` → `IsCountBased() = true` → `NeedsQuotaCheck() = true`

---

## 📊 修复后的行为

### Time类型（仅时间限制）

```json
{
  "quota_type": "time",
  "total_quota": null,
  "remaining_quota": null,
  "expires_at": "2025-10-20"
}
```

**行为**：
- ✅ 不检查配额
- ✅ 只检查过期时间
- ✅ 过期前无限次使用

---

### Count类型（仅次数限制）

```json
{
  "quota_type": "count",
  "total_quota": 100,
  "remaining_quota": 75,
  "expires_at": null
}
```

**行为**：
- ✅ 检查配额
- ✅ 不检查时间
- ✅ 用完100次后失效

---

### Hybrid类型（时间+次数）

```json
{
  "quota_type": "hybrid",
  "total_quota": 50,
  "remaining_quota": 30,
  "expires_at": "2025-10-20"
}
```

**行为**：
- ✅ 检查配额
- ✅ 检查时间
- ✅ 满足任一条件即失效

---

## 🎯 测试验证

### 测试1：Time类型Token

```bash
# 1. 创建time类型Token
curl -X POST "http://localhost:3002/flow/tokens" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "test_time",
    "email": "time@example.com",
    "operation": "add",
    "days": 1,
    "quota_type": "time"
  }'

# 响应
{
  "quota_type": "time",
  "total_quota": null,
  "remaining_quota": null,
  "expires_at": "2025-10-20"
}

# 2. 执行代码（应该成功）
CODE=$(echo 'return "Hello";' | base64)
curl -X POST "http://localhost:3002/flow/codeblock" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"codebase64\": \"${CODE}\", \"input\": {}}"

# 预期结果：✅ 成功执行
{
  "success": true,
  "result": "Hello"
}

# 3. 多次执行（应该都成功）
for i in {1..10}; do
  curl -s -X POST "http://localhost:3002/flow/codeblock" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"codebase64\": \"${CODE}\", \"input\": {}}" | jq '.success'
done

# 预期结果：✅ 全部返回true（不限次数）
```

---

### 测试2：Count类型Token

```bash
# 1. 创建count类型Token（2次）
curl -X POST "http://localhost:3002/flow/tokens" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "test_count",
    "email": "count@example.com",
    "operation": "unlimited",
    "quota_type": "count",
    "total_quota": 2
  }'

# 2. 执行2次（应该成功）
curl -X POST "http://localhost:3002/flow/codeblock" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"codebase64\": \"${CODE}\", \"input\": {}}"

# 预期结果：✅ 第1次成功
# 预期结果：✅ 第2次成功

# 3. 执行第3次（应该失败）
curl -X POST "http://localhost:3002/flow/codeblock" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"codebase64\": \"${CODE}\", \"input\": {}}"

# 预期结果：❌ 配额不足
{
  "success": false,
  "error": {
    "type": "QuotaExceeded",
    "message": "配额不足: 配额不足"
  }
}
```

---

### 测试3：Hybrid类型Token

```bash
# 1. 创建hybrid类型Token（1天2次）
curl -X POST "http://localhost:3002/flow/tokens" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "test_hybrid",
    "email": "hybrid@example.com",
    "operation": "add",
    "days": 1,
    "quota_type": "hybrid",
    "total_quota": 2
  }'

# 2. 执行2次（应该成功）
# 预期结果：✅ 第1次成功
# 预期结果：✅ 第2次成功

# 3. 执行第3次（应该失败）
# 预期结果：❌ 配额不足

# 4. 等待1天后执行（应该失败）
# 预期结果：❌ Token已过期
```

---

## 📋 三种类型对比

| quota_type | 配额检查 | 时间检查 | 行为 |
|-----------|---------|---------|------|
| **time** | ❌ 不检查 | ✅ 检查 | 过期前无限次 |
| **count** | ✅ 检查 | ❌ 不检查 | 永久有限次 |
| **hybrid** | ✅ 检查 | ✅ 检查 | 时间+次数双重限制 |

---

## 🔧 相关代码

### 1. Token类型判断

**文件**：`model/token.go`

```go
// IsCountBased 是否基于次数的配额模式
func (t *TokenInfo) IsCountBased() bool {
    return t.QuotaType == "count" || t.QuotaType == "hybrid"
}

// NeedsQuotaCheck 是否需要配额检查
func (t *TokenInfo) NeedsQuotaCheck() bool {
    return t.IsCountBased() && t.TotalQuota != nil
}
```

### 2. 配额初始化

**文件**：`service/quota_service.go`

```go
// InitQuota 初始化Redis配额（Token创建时调用）
func (s *QuotaService) InitQuota(ctx context.Context, tokenInfo *model.TokenInfo) error {
    if !tokenInfo.NeedsQuotaCheck() {
        return nil // time模式跳过
    }
    // ... 初始化Redis配额
}
```

### 3. 配额消耗

**文件**：`controller/executor_controller.go`

```go
// 🔥 只对需要配额检查的Token（count/hybrid类型）进行配额扣减
if token != "" && c.quotaService != nil && needsQuotaCheck {
    _, _, err := c.quotaService.ConsumeQuota(...)
    // ...
}
```

---

## 🎉 总结

### 修复内容

1. ✅ 在执行代码前检查Token类型
2. ✅ time类型跳过配额检查
3. ✅ count/hybrid类型正常检查配额

### 影响范围

- **API**: POST /flow/codeblock
- **Token类型**: time类型
- **行为变化**: 从"报错配额不足"改为"正常执行"

### 升级说明

- ✅ 向后兼容
- ✅ 不影响count和hybrid类型
- ✅ 修复time类型无法使用的问题

---

**修复版本**: v2.3  
**修复时间**: 2025-10-19  
**Bug严重性**: 高（time类型完全无法使用）  
**影响接口**: POST /flow/codeblock
