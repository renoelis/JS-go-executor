# 配额扣减原子操作说明

## 🎯 为什么需要原子操作？

在高并发场景下，如果使用简单的"查询-计算-更新"流程扣减配额，可能出现以下问题：

### ❌ 非原子操作的问题

```go
// 错误示例：非原子操作
quotaBefore := getQuota(token)  // 1. 查询：100
quotaAfter := quotaBefore - 1   // 2. 计算：99
updateQuota(token, quotaAfter)  // 3. 更新：99
```

**并发问题**：

```
时间线：
T1: 查询配额 → 100
T2: 查询配额 → 100  (T1还没更新)
T1: 计算 → 99
T2: 计算 → 99  (使用了旧值)
T1: 更新 → 99
T2: 更新 → 99  (覆盖了T1的更新)

结果：执行了2次，但配额只扣减了1次！❌
```

---

## ✅ 原子操作解决方案

### 1. Redis原子操作（主要方案）

```go
// Redis DECR命令是原子的
remaining := redis.Decr("quota:token")

// 并发安全：
// T1: DECR → 99
// T2: DECR → 98  (自动使用T1更新后的值)
```

**优势**：
- ✅ 原子性：Redis单线程模型保证
- ✅ 高性能：QPS > 8000
- ✅ 简单：一条命令完成

---

### 2. 数据库原子操作（降级方案）

当Redis不可用时，使用数据库原子操作：

```sql
-- 原子扣减SQL
UPDATE access_tokens 
SET remaining_quota = remaining_quota - 1,
    quota_synced_at = NOW()
WHERE access_token = ? 
  AND is_active = 1 
  AND remaining_quota > 0;  -- 关键：确保不会扣成负数
```

**关键点**：

1. **UPDATE ... SET column = column - 1**
   - 数据库在执行时会加行锁
   - 其他事务必须等待当前事务完成
   - 保证原子性

2. **WHERE remaining_quota > 0**
   - 确保配额不会扣成负数
   - 如果配额为0，UPDATE不会执行
   - `rowsAffected = 0` 表示配额不足

3. **检查影响行数**
   ```go
   rowsAffected, _ := result.RowsAffected()
   if rowsAffected == 0 {
       return errors.New("配额不足")
   }
   ```

---

## 🔍 实现细节

### Repository层实现

```go
// DecrementQuotaAtomic 原子扣减配额
func (r *TokenRepository) DecrementQuotaAtomic(ctx context.Context, token string) (int, int, error) {
    // 1. 原子扣减
    query := `
        UPDATE access_tokens 
        SET remaining_quota = remaining_quota - 1,
            quota_synced_at = NOW()
        WHERE access_token = ? 
          AND is_active = 1 
          AND remaining_quota > 0
    `
    
    result, err := r.db.ExecContext(ctx, query, token)
    if err != nil {
        return 0, 0, fmt.Errorf("扣减配额失败: %w", err)
    }
    
    // 2. 检查是否成功
    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        return 0, 0, fmt.Errorf("配额不足或Token不存在")
    }
    
    // 3. 查询扣减后的值
    var quotaAfter int
    selectQuery := `SELECT remaining_quota FROM access_tokens WHERE access_token = ?`
    err = r.db.GetContext(ctx, &quotaAfter, selectQuery, token)
    if err != nil {
        return 0, 0, fmt.Errorf("查询扣减后配额失败: %w", err)
    }
    
    // 4. 计算扣减前的值
    quotaBefore := quotaAfter + 1
    
    return quotaBefore, quotaAfter, nil
}
```

---

### Service层使用

```go
// consumeQuotaFromDB 从DB扣减配额（降级方案）
func (s *QuotaService) consumeQuotaFromDB(ctx context.Context, token string, ...) (int, int, error) {
    // 🔥 使用原子操作扣减配额
    quotaBefore, quotaAfter, err := s.repo.DecrementQuotaAtomic(ctx, token)
    if err != nil {
        return 0, 0, fmt.Errorf("DB原子扣减配额失败: %w", err)
    }
    
    // 记录日志
    s.logQuotaChange(token, wsID, email, quotaBefore, quotaAfter, "consume", ...)
    
    return quotaBefore, quotaAfter, nil
}
```

---

## 🔒 并发安全性保证

### 场景1：高并发扣减

```
并发请求：
T1: DecrementQuotaAtomic(token) → 100 → 99
T2: DecrementQuotaAtomic(token) → 等待T1完成 → 99 → 98
T3: DecrementQuotaAtomic(token) → 等待T2完成 → 98 → 97

结果：3次请求，配额正确扣减3次 ✅
```

### 场景2：配额不足

```
当前配额：1

T1: DecrementQuotaAtomic(token) → 1 → 0 ✅
T2: DecrementQuotaAtomic(token) → WHERE remaining_quota > 0 → rowsAffected=0 → 返回错误 ✅

结果：T2正确返回"配额不足" ✅
```

### 场景3：Redis与DB同时扣减

```
正常流程：
1. Redis DECR → 成功 → 返回
2. 异步同步到DB（5秒批量）

降级流程：
1. Redis DECR → 失败
2. DB原子扣减 → 成功 → 返回

不会同时扣减 ✅
```

---

## 📊 性能对比

| 方案 | QPS | 延迟 | 并发安全 | 说明 |
|------|-----|------|---------|------|
| Redis DECR | 8,000+ | < 5ms | ✅ | 主要方案 |
| DB原子UPDATE | 500-1000 | 20-50ms | ✅ | 降级方案 |
| 非原子操作 | 1,000+ | 10ms | ❌ | **不推荐** |

---

## ⚠️ 注意事项

### 1. 数据库隔离级别

确保数据库使用合适的隔离级别：

```sql
-- MySQL默认：REPEATABLE READ（可重复读）
-- 足够保证UPDATE的原子性

-- 如果使用READ COMMITTED，也能保证原子性
-- 因为UPDATE会加行锁
```

### 2. 死锁风险

原子操作会加行锁，理论上可能死锁：

```
T1: UPDATE token1 → 锁定
T2: UPDATE token2 → 锁定
T1: UPDATE token2 → 等待T2
T2: UPDATE token1 → 等待T1
→ 死锁！
```

**但在配额场景不会发生**：
- 每次只UPDATE一个token
- 没有跨token的事务
- 不会形成循环等待

### 3. 性能优化

```sql
-- 确保有索引
CREATE INDEX idx_access_token ON access_tokens(access_token);
CREATE INDEX idx_remaining_quota ON access_tokens(remaining_quota);

-- 避免全表扫描
EXPLAIN SELECT * FROM access_tokens WHERE access_token = ?;
```

---

## 🧪 测试验证

### 并发测试

```go
func TestConcurrentDecrement(t *testing.T) {
    token := "test_token"
    initialQuota := 100
    concurrency := 50
    
    // 初始化配额
    setQuota(token, initialQuota)
    
    // 并发扣减
    var wg sync.WaitGroup
    for i := 0; i < concurrency; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            DecrementQuotaAtomic(token)
        }()
    }
    wg.Wait()
    
    // 验证结果
    finalQuota := getQuota(token)
    expected := initialQuota - concurrency
    
    assert.Equal(t, expected, finalQuota, "配额应该正确扣减")
}
```

---

## 📚 相关资料

- [MySQL锁机制](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- [Redis原子操作](https://redis.io/commands/decr)
- [数据库事务隔离级别](https://en.wikipedia.org/wiki/Isolation_(database_systems))

---

## 🎉 总结

### ✅ 优势

1. **并发安全**：数据库行锁保证原子性
2. **配额准确**：不会出现超扣或漏扣
3. **性能可接受**：降级方案QPS 500+
4. **代码简洁**：一条SQL完成扣减

### 🔄 降级策略

```
Redis可用 → Redis DECR（高性能）
    ↓
Redis故障 → DB原子UPDATE（降级）
    ↓
都不可用 → 返回错误
```

**推荐**：使用Redis作为主要方案，DB原子操作作为降级方案，保证高性能和高可用！
