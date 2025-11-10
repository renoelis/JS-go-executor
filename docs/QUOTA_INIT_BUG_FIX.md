# Redis配额初始化Bug修复说明

## 🐛 问题描述

### 症状

1. **查询Token信息**：`remaining_quota: 99`（数据库值，正确）
2. **查询配额接口**：`remaining_quota: 0`（Redis值，错误）
3. **执行代码**：报错"配额不足"

### 数据对比

**数据库（正确）**：
```sql
SELECT remaining_quota, total_quota FROM access_tokens 
WHERE access_token = 'flow_8a549db415ac427fa09cb6c65fd513c718a9e78e6c573f4489e21f102e3b7cb4';

-- 结果：remaining_quota=99, total_quota=100
```

**Redis（错误）**：
```bash
redis-cli GET "flow:quota:flow_8a549db415ac427fa09cb6c65fd513c718a9e78e6c573f4489e21f102e3b7cb4"

# 结果：0
```

---

## 🔍 根本原因

### 错误的初始化逻辑

**文件**：`service/quota_service.go`

```go
// ❌ 错误：使用 TotalQuota 初始化Redis
func (s *QuotaService) InitQuota(ctx context.Context, tokenInfo *model.TokenInfo) error {
    key := s.getRedisKey(tokenInfo.AccessToken)
    
    // ❌ 使用 TotalQuota (100) 初始化
    err := s.redis.Set(ctx, key, *tokenInfo.TotalQuota, 0).Err()
    
    return nil
}
```

### 执行流程

```
1. 创建Token
   ├─ DB: total_quota=100, remaining_quota=100
   └─ Redis: 100 (使用TotalQuota初始化) ✅

2. 执行代码（第1次）
   ├─ Redis: 100 → 99 (DECR)
   └─ DB: remaining_quota=99 (异步同步) ✅

3. 执行代码（第2次）
   ├─ Redis: 99 → 98 (DECR)
   └─ DB: remaining_quota=98 (异步同步) ✅

...

100. 执行代码（第100次）
   ├─ Redis: 1 → 0 (DECR)
   └─ DB: remaining_quota=0 (异步同步) ✅

101. 执行代码（第101次）
   ├─ Redis: 0 → -1 (DECR)
   └─ ❌ 配额不足！
```

**但是实际情况**：

```
1. 创建Token
   ├─ DB: total_quota=100, remaining_quota=100
   └─ Redis: 100 (使用TotalQuota初始化) ✅

2. 执行代码（第1次）
   ├─ Redis: 100 → 99 (DECR)
   └─ DB: remaining_quota=99 (异步同步) ✅

3. 服务重启或Redis清空
   └─ Redis: (空)

4. 查询配额
   ├─ Redis: (空) → 从DB加载
   ├─ DB: remaining_quota=99
   └─ Redis: 100 (❌ 错误！使用TotalQuota而不是RemainingQuota)

5. 执行代码（第2次）
   ├─ Redis: 100 → 99 (DECR)
   └─ 配额被重置了！❌
```

---

## ✅ 修复方案

### 修复InitQuota

**使用 `RemainingQuota` 而不是 `TotalQuota` 初始化Redis**

```go
// ✅ 正确：使用 RemainingQuota 初始化Redis
func (s *QuotaService) InitQuota(ctx context.Context, tokenInfo *model.TokenInfo) error {
    key := s.getRedisKey(tokenInfo.AccessToken)
    
    // ✅ 使用 RemainingQuota 初始化
    initialQuota := *tokenInfo.RemainingQuota
    err := s.redis.Set(ctx, key, initialQuota, 0).Err()
    
    utils.Info("Redis配额初始化成功",
        zap.String("token", utils.MaskToken(tokenInfo.AccessToken)),
        zap.Int("remaining_quota", initialQuota),
        zap.Int("total_quota", *tokenInfo.TotalQuota))
    
    return nil
}
```

---

### 修复GetRemainingQuota

**从DB加载时也使用 `RemainingQuota`**

```go
// ✅ 正确：从DB加载时使用 RemainingQuota
func (s *QuotaService) GetRemainingQuota(ctx context.Context, token string) (int, error) {
    key := s.getRedisKey(token)

    // 先从Redis查询
    remaining, err := s.redis.Get(ctx, key).Int()
    if err == redis.Nil {
        // Redis不存在，从DB加载
        quota, err := s.repo.GetQuotaFromDB(ctx, token)
        if err != nil {
            return 0, err
        }
        if quota == nil {
            return 0, fmt.Errorf("该Token未设置配额")
        }
        
        // ✅ 加载到Redis（使用DB中的remaining_quota）
        s.redis.Set(ctx, key, *quota, 0)
        return *quota, nil
    }

    return remaining, nil
}
```

---

## 🔧 修复已有Token的Redis配额

### 方案1：清空Redis（推荐）

**最简单的方法**：清空Redis，让系统从DB重新加载

```bash
# 连接Redis
docker exec -it flow-redis-dev redis-cli -a flow_redis_dev

# 查看所有配额key
KEYS "flow:quota:*"

# 删除所有配额key
DEL flow:quota:flow_8a549db415ac427fa09cb6c65fd513c718a9e78e6c573f4489e21f102e3b7cb4

# 或者删除所有配额key
redis-cli -a flow_redis_dev --scan --pattern "flow:quota:*" | xargs redis-cli -a flow_redis_dev DEL
```

**下次查询时**：系统会从DB重新加载，使用正确的 `remaining_quota`

---

### 方案2：手动修复Redis值

```bash
# 1. 查询DB中的remaining_quota
mysql -h localhost -P 3306 -u flow_user -pflow_password_dev flow_codeblock_go -e "
SELECT access_token, remaining_quota 
FROM access_tokens 
WHERE quota_type IN ('count', 'hybrid') AND is_active = 1;
"

# 2. 手动设置Redis值
redis-cli -a flow_redis_dev SET "flow:quota:flow_8a549db415ac427fa09cb6c65fd513c718a9e78e6c573f4489e21f102e3b7cb4" 99
```

---

### 方案3：重启服务并重新创建Token

```bash
# 1. 停止服务
docker-compose down

# 2. 清空Redis数据
docker volume rm flow-codeblock_goja_redis_data

# 3. 重启服务
./dev_start.sh

# 4. 重新创建Token
curl -X POST "http://localhost:3002/flow/tokens" \
  -H "Authorization: Bearer dev_admin_token_for_testing_only" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "test_workspace_001",
    "email": "test@example.com",
    "operation": "unlimited",
    "quota_type": "count",
    "total_quota": 100
  }'
```

---

## 📊 修复前后对比

### 修复前

**Token创建**：
```
DB: total_quota=100, remaining_quota=100
Redis: 100 (使用TotalQuota) ❌
```

**执行1次后**：
```
DB: total_quota=100, remaining_quota=99
Redis: 99 ✅
```

**Redis清空后重新加载**：
```
DB: total_quota=100, remaining_quota=99
Redis: 100 (使用TotalQuota) ❌ 配额被重置！
```

---

### 修复后

**Token创建**：
```
DB: total_quota=100, remaining_quota=100
Redis: 100 (使用RemainingQuota) ✅
```

**执行1次后**：
```
DB: total_quota=100, remaining_quota=99
Redis: 99 ✅
```

**Redis清空后重新加载**：
```
DB: total_quota=100, remaining_quota=99
Redis: 99 (使用RemainingQuota) ✅ 正确！
```

---

## 🎯 验证步骤

### 1. 清空Redis配额

```bash
docker exec -it flow-redis-dev redis-cli -a flow_redis_dev --scan --pattern "flow:quota:*" | xargs docker exec -i flow-redis-dev redis-cli -a flow_redis_dev DEL
```

### 2. 重启服务

```bash
./dev_start.sh
```

### 3. 查询配额（应该从DB重新加载）

```bash
curl -X GET "http://localhost:3002/flow/tokens/flow_8a549db415ac427fa09cb6c65fd513c718a9e78e6c573f4489e21f102e3b7cb4/quota" \
  -H "accessToken: dev_admin_token_for_testing_only"
```

**预期结果**：
```json
{
  "success": true,
  "data": {
    "remaining_quota": 99,  // ✅ 正确（从DB加载）
    "total_quota": 100
  }
}
```

### 4. 执行代码

```bash
CODE=$(echo 'return "Hello";' | base64)
curl -X POST "http://localhost:3002/flow/codeblock" \
  -H "Authorization: Bearer flow_8a549db415ac427fa09cb6c65fd513c718a9e78e6c573f4489e21f102e3b7cb4" \
  -H "Content-Type: application/json" \
  -d "{\"codebase64\": \"${CODE}\", \"input\": {}}"
```

**预期结果**：✅ 成功执行

---

## 🎉 总结

### 修复内容

1. ✅ `InitQuota` 使用 `RemainingQuota` 初始化Redis
2. ✅ `GetRemainingQuota` 从DB加载时使用 `RemainingQuota`
3. ✅ 清空Redis配额，让系统重新加载

### 影响范围

- ✅ 修复配额重置Bug
- ✅ 修复配额不足误报
- ✅ 确保Redis和DB一致

### 升级说明

- ✅ 需要重启服务
- ✅ 需要清空Redis配额
- ✅ 已有Token会自动修复

---

**修复版本**: v1.4  
**修复时间**: 2025-10-19  
**Bug严重性**: 高（配额计算错误）  
**影响范围**: 所有count和hybrid类型Token
