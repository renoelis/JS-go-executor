# 配额更新逻辑修复说明

## 🐛 问题描述

### 原始问题

增购配额时，只增加了`remaining_quota`，没有增加`total_quota`，导致逻辑矛盾：

```json
// 创建Token: total=100, remaining=100
{
  "total_quota": 100,
  "remaining_quota": 100
}

// 使用1次: total=100, remaining=99
{
  "total_quota": 100,
  "remaining_quota": 99
}

// 增购200次: total=100, remaining=299 ❌
{
  "total_quota": 100,      // 没变！
  "remaining_quota": 299   // 99 + 200
}
```

**问题**：
- ❌ `remaining_quota` > `total_quota` （299 > 100）
- ❌ `consumed_quota` 计算错误（100 - 299 = -199）
- ❌ 不符合业务逻辑

---

## ✅ 修复方案

### 修复逻辑

**增购时同时增加`total_quota`和`remaining_quota`**

```json
// 增购200次: total=300, remaining=299 ✅
{
  "total_quota": 300,      // 100 + 200 ✅
  "remaining_quota": 299   // 99 + 200 ✅
}
```

**优点**：
- ✅ 逻辑清晰：total = consumed + remaining
- ✅ 符合直觉：增购就是增加总额度
- ✅ 便于统计：可以看出用户购买了多少

---

## 🔧 代码修改

### 修改文件

`repository/token_repository.go` - `UpdateQuota`方法

### 修改前

```go
var newQuota int
switch operation {
case "add":
    // 增加配额
    currentQuota := 0
    if tokenInfo.RemainingQuota != nil {
        currentQuota = *tokenInfo.RemainingQuota
    }
    newQuota = currentQuota + *amount  // ❌ 只增加remaining
    
// ...
}

// 更新数据库
query := `
    UPDATE access_tokens 
    SET remaining_quota = ?, quota_synced_at = NOW()  -- ❌ 只更新remaining
    WHERE access_token = ? AND is_active = 1
`
_, err = r.db.ExecContext(ctx, query, newQuota, token)
```

### 修改后

```go
var newRemainingQuota int
var newTotalQuota int

switch operation {
case "add":
    // 增加配额：同时增加 remaining 和 total
    currentRemaining := 0
    if tokenInfo.RemainingQuota != nil {
        currentRemaining = *tokenInfo.RemainingQuota
    }
    currentTotal := 0
    if tokenInfo.TotalQuota != nil {
        currentTotal = *tokenInfo.TotalQuota
    }
    newRemainingQuota = currentRemaining + *amount
    newTotalQuota = currentTotal + *amount  // ✅ 同时增加总配额
    
// ...
}

// 更新数据库（同时更新 remaining_quota 和 total_quota）
query := `
    UPDATE access_tokens 
    SET remaining_quota = ?, total_quota = ?, quota_synced_at = NOW()  -- ✅ 同时更新
    WHERE access_token = ? AND is_active = 1
`
_, err = r.db.ExecContext(ctx, query, newRemainingQuota, newTotalQuota, token)
```

---

## 📊 三种操作的行为

### 1. add（增购）

**逻辑**：同时增加total和remaining

```json
// 原始状态
{
  "total_quota": 100,
  "remaining_quota": 75,
  "consumed_quota": 25
}

// 增购50次
{
  "total_quota": 150,      // 100 + 50
  "remaining_quota": 125,  // 75 + 50
  "consumed_quota": 25     // 不变
}
```

**公式**：
```
new_total = old_total + amount
new_remaining = old_remaining + amount
consumed = new_total - new_remaining
```

---

### 2. set（设置）

**逻辑**：只设置remaining，total不变

```json
// 原始状态
{
  "total_quota": 100,
  "remaining_quota": 75,
  "consumed_quota": 25
}

// 设置为50次
{
  "total_quota": 100,      // 不变
  "remaining_quota": 50,   // 设置为50
  "consumed_quota": 50     // 100 - 50
}
```

**用途**：手动调整剩余配额（不常用）

---

### 3. reset（重置）

**逻辑**：将remaining重置为total

```json
// 原始状态
{
  "total_quota": 100,
  "remaining_quota": 75,
  "consumed_quota": 25
}

// 重置
{
  "total_quota": 100,      // 不变
  "remaining_quota": 100,  // 重置为total
  "consumed_quota": 0      // 100 - 100
}
```

**用途**：重置配额，清空消耗记录

---

## 🎯 实际示例

### 场景：用户套餐升级

```bash
# 1. 创建Token（100次）
curl -X POST "${API_URL}/flow/tokens" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "user_001",
    "email": "user@example.com",
    "operation": "unlimited",
    "quota_type": "count",
    "total_quota": 100
  }'

# 响应
{
  "total_quota": 100,
  "remaining_quota": 100,
  "consumed_quota": 0
}

# 2. 用户使用25次
# ... 执行代码25次 ...

# 查询配额
{
  "total_quota": 100,
  "remaining_quota": 75,
  "consumed_quota": 25
}

# 3. 用户升级套餐（增购200次）
curl -X PUT "${API_URL}/flow/tokens/YOUR_TOKEN" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "unlimited",
    "quota_operation": "add",
    "quota_amount": 200
  }'

# 响应（修复后）✅
{
  "total_quota": 300,      // 100 + 200
  "remaining_quota": 275,  // 75 + 200
  "consumed_quota": 25     // 300 - 275
}

# 响应（修复前）❌
{
  "total_quota": 100,      // 没变
  "remaining_quota": 275,  // 75 + 200
  "consumed_quota": -175   // 100 - 275（错误！）
}
```

---

## 🔍 验证方法

### 测试脚本

```bash
#!/bin/bash

API_URL="http://localhost:3002"
ADMIN_TOKEN="dev_admin_token_for_testing_only"

# 1. 创建Token
echo "1. 创建Token（100次）"
RESPONSE=$(curl -s -X POST "${API_URL}/flow/tokens" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "test_user",
    "email": "test@example.com",
    "operation": "unlimited",
    "quota_type": "count",
    "total_quota": 100
  }')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.access_token')
echo "Token: $TOKEN"
echo "$RESPONSE" | jq '.data | {total_quota, remaining_quota}'

# 2. 执行代码（消耗1次）
echo -e "\n2. 执行代码（消耗1次）"
CODE=$(echo 'return "test";' | base64)
curl -s -X POST "${API_URL}/flow/codeblock" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"codebase64\": \"${CODE}\", \"input\": {}}" > /dev/null

sleep 2  # 等待同步

# 3. 查询配额
echo -e "\n3. 查询配额（应该是99）"
curl -s -X GET "${API_URL}/flow/tokens/${TOKEN}/quota" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq '.data'

# 4. 增购50次
echo -e "\n4. 增购50次"
RESPONSE=$(curl -s -X PUT "${API_URL}/flow/tokens/${TOKEN}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "unlimited",
    "quota_operation": "add",
    "quota_amount": 50
  }')

echo "$RESPONSE" | jq '.data | {total_quota, remaining_quota}'

# 5. 验证配额
echo -e "\n5. 验证配额"
QUOTA=$(curl -s -X GET "${API_URL}/flow/tokens/${TOKEN}/quota" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

TOTAL=$(echo "$QUOTA" | jq -r '.data.total_quota')
REMAINING=$(echo "$QUOTA" | jq -r '.data.remaining_quota')
CONSUMED=$(echo "$QUOTA" | jq -r '.data.consumed_quota')

echo "Total: $TOTAL"
echo "Remaining: $REMAINING"
echo "Consumed: $CONSUMED"

# 验证逻辑
if [ $TOTAL -eq 150 ] && [ $REMAINING -eq 149 ] && [ $CONSUMED -eq 1 ]; then
  echo -e "\n✅ 配额逻辑正确！"
  echo "  total(150) = consumed(1) + remaining(149)"
else
  echo -e "\n❌ 配额逻辑错误！"
  echo "  total($TOTAL) ≠ consumed($CONSUMED) + remaining($REMAINING)"
fi
```

### 预期结果

```
1. 创建Token（100次）
{
  "total_quota": 100,
  "remaining_quota": 100
}

2. 执行代码（消耗1次）

3. 查询配额（应该是99）
{
  "total_quota": 100,
  "remaining_quota": 99,
  "consumed_quota": 1
}

4. 增购50次
{
  "total_quota": 150,
  "remaining_quota": 149
}

5. 验证配额
Total: 150
Remaining: 149
Consumed: 1

✅ 配额逻辑正确！
  total(150) = consumed(1) + remaining(149)
```

---

## 📝 consumed_quota 计算逻辑

### 修复后的计算

在`controller/token_controller.go`的`GetQuota`方法中：

```go
// 计算已消耗配额
// 注意：增购后remaining可能大于total，此时consumed应该为0
consumedQuota := 0
if totalQuota > remainingQuota {
    consumedQuota = totalQuota - remainingQuota
}
```

**修复后**：
- total=150, remaining=149 → consumed=1 ✅
- total=100, remaining=100 → consumed=0 ✅

**修复前**：
- total=100, remaining=299 → consumed=-199 ❌（需要判断）

---

## 🎉 总结

### 修复内容

1. ✅ 增购时同时增加`total_quota`和`remaining_quota`
2. ✅ 保持逻辑一致：total = consumed + remaining
3. ✅ 三种操作行为明确：add/set/reset

### 影响范围

- **API**: PUT /flow/tokens/:token（quota_operation=add）
- **数据库**: access_tokens表的total_quota字段
- **逻辑**: consumed_quota计算逻辑

### 升级说明

- ✅ 向后兼容（不影响现有Token）
- ✅ 新增购的Token会正确更新total
- ✅ 建议重新部署后测试增购功能

---

**修复版本**: v2.2  
**修复时间**: 2025-10-19  
**影响接口**: PUT /flow/tokens/:token
