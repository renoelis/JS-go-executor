# Token配额系统部署指南

## 📋 部署清单

### ✅ 已完成的修改

1. **数据库表结构**
   - ✅ `access_tokens` 表增加配额字段（`quota_type`, `total_quota`, `remaining_quota`, `quota_synced_at`）
   - ✅ 新增 `token_quota_logs` 审计日志表

2. **代码实现**
   - ✅ Model层：增加配额相关字段和方法
   - ✅ Repository层：配额操作方法（同步、更新、查询日志）
   - ✅ Service层：QuotaService（Redis配额管理+异步审计日志）
   - ✅ Controller层：配额消耗钩子+查询API
   - ✅ 路由：配额查询接口

3. **文档**
   - ✅ 使用文档：`docs/QUOTA_SYSTEM.md`
   - ✅ 清理脚本：`scripts/cleanup_quota_logs.sh`

---

## 🚀 部署步骤

### 1. 备份数据（重要！）

```bash
# 备份数据库
mysqldump -u root -p flow_codeblock_go > backup_$(date +%Y%m%d_%H%M%S).sql

# 备份Redis（如果有重要数据）
redis-cli --rdb dump.rdb
```

---

### 2. 配置Redis AOF持久化

**✅ 自动配置（推荐）**

**无需手动配置！**应用启动时会自动检查并启用AOF。

查看启动日志确认：

```bash
tail -f app.log | grep "Redis AOF"
```

**预期输出**：

```
[INFO] 检查Redis AOF持久化配置...
[INFO] ✅ Redis AOF持久化已启用
[INFO] Redis AOF配置详情 appendonly=yes appendfsync=everysec ...
```

**手动配置（可选）**

如果自动配置失败，可以手动配置：

```bash
# 方式1：运行时配置（临时）
redis-cli CONFIG SET appendonly yes
redis-cli CONFIG REWRITE
```

验证配置：

```bash
redis-cli CONFIG GET appendonly
# 应该返回：
# 1) "appendonly"
# 2) "yes"
```

---

### 3. 初始化数据库

```bash
# 执行初始化脚本（已包含配额表）
mysql -u root -p flow_codeblock_go < scripts/init.sql
```

验证表结构：

```sql
-- 检查access_tokens表是否有配额字段
DESC access_tokens;

-- 检查token_quota_logs表是否存在
SHOW TABLES LIKE 'token_quota_logs';
```

---

### 4. 编译部署应用

```bash
# 编译
go build -o flow-codeblock-go cmd/main.go

# 停止旧服务
pkill -f flow-codeblock-go

# 启动新服务
nohup ./flow-codeblock-go > app.log 2>&1 &

# 查看启动日志
tail -f app.log
```

---

### 5. 验证功能

#### 5.1 创建次数限制Token

```bash
curl -X POST http://localhost:8080/flow/tokens \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "test_workspace",
    "email": "test@example.com",
    "operation": "unlimited",
    "quota_type": "count",
    "total_quota": 10,
    "rate_limit_per_minute": 60
  }'
```

**预期响应**：

```json
{
  "success": true,
  "data": {
    "access_token": "flow_xxx...",
    "quota_type": "count",
    "total_quota": 10,
    "remaining_quota": 10
  }
}
```

#### 5.2 测试配额消耗

```bash
# 使用刚创建的Token执行代码
TOKEN="flow_xxx..."

curl -X POST http://localhost:8080/flow/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code_base64": "Y29uc29sZS5sb2coIkhlbGxvIik="
  }'
```

#### 5.3 查询剩余配额

```bash
curl -X GET "http://localhost:8080/flow/tokens/$TOKEN/quota" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**预期响应**：

```json
{
  "success": true,
  "data": {
    "quota_type": "count",
    "total_quota": 10,
    "remaining_quota": 9,
    "consumed_quota": 1
  }
}
```

#### 5.4 查询消耗日志

```bash
curl -X GET "http://localhost:8080/flow/tokens/$TOKEN/quota/logs?page=1&page_size=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 6. 配置日志清理（可选）

**✅ 默认已启用内置自动清理服务！**

应用内置了自动清理服务，默认配置：
- 保留180天（6个月）
- 每24小时清理一次
- 无需额外配置

**自定义配置**（可选）：

```bash
# 调整保留天数
export QUOTA_CLEANUP_RETENTION_DAYS=90

# 调整清理间隔（小时）
export QUOTA_CLEANUP_INTERVAL_HOURS=12

# 禁用自动清理（如果想用crontab）
export QUOTA_CLEANUP_ENABLED=false
```

**使用Crontab方式**（不推荐）：

如果禁用了内置服务，可以使用crontab：

```bash
# 编辑crontab
crontab -e

# 添加定时任务（每天凌晨3点清理6个月前的日志）
0 3 * * * /path/to/scripts/cleanup_quota_logs.sh >> /var/log/quota_cleanup.log 2>&1
```

详见：[配额清理服务文档](./QUOTA_CLEANUP_SERVICE.md)

---

## 🔍 监控检查

### 检查Redis配额数据

```bash
# 查看所有配额Key
redis-cli KEYS "quota:*"

# 查看某个Token的配额
redis-cli GET "quota:flow_xxx..."
```

### 检查数据库同步

```sql
-- 查看最近同步的Token
SELECT 
  access_token, 
  remaining_quota, 
  quota_synced_at 
FROM access_tokens 
WHERE quota_type IN ('count', 'hybrid')
ORDER BY quota_synced_at DESC 
LIMIT 10;
```

### 检查审计日志

```sql
-- 查看最近的配额消耗
SELECT * FROM token_quota_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- 统计今天的消耗
SELECT 
  COUNT(*) AS total_consume,
  SUM(CASE WHEN execution_success = 1 THEN 1 ELSE 0 END) AS success_count,
  SUM(CASE WHEN execution_success = 0 THEN 1 ELSE 0 END) AS failed_count
FROM token_quota_logs 
WHERE action = 'consume' 
  AND DATE(created_at) = CURDATE();
```

### 检查服务状态

#### 配额服务队列状态

```bash
curl -X GET "http://localhost:8080/flow/cache-write-pool/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**预期响应**：

```json
{
  "success": true,
  "data": {
    "sync_queue_len": 0,
    "sync_queue_cap": 10000,
    "log_queue_len": 0,
    "log_queue_cap": 10000,
    "sync_interval": "5s",
    "sync_batch_size": 500
  }
}
```

#### 清理服务状态

```bash
curl -X GET "http://localhost:8080/flow/quota/cleanup/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**预期响应**：

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "retention_days": 180,
    "cleanup_interval": "24h0m0s",
    "batch_size": 10000,
    "last_cleanup_time": "2025-10-18 03:00:15",
    "last_cleanup_count": 15234,
    "total_cleaned_count": 1523456,
    "next_cleanup_time": "2025-10-19 03:00:15"
  }
}
```

---

## ⚠️ 常见问题

### 问题1：Redis配额数据丢失

**症状**：重启Redis后，配额回到旧值

**原因**：AOF未开启

**解决**：

```bash
# 检查AOF状态
redis-cli CONFIG GET appendonly

# 开启AOF
redis-cli CONFIG SET appendonly yes
redis-cli CONFIG REWRITE
```

---

### 问题2：配额扣减不生效

**症状**：调用接口后配额没有减少

**排查**：

1. 检查Token类型：

```bash
curl -X GET "http://localhost:8080/flow/tokens?token=$TOKEN" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

确认 `quota_type` 是 `count` 或 `hybrid`

2. 检查Redis连接：

```bash
redis-cli PING
# 应该返回：PONG
```

3. 查看应用日志：

```bash
tail -f app.log | grep -i quota
```

---

### 问题3：审计日志缺失

**症状**：配额消耗了，但日志表没有记录

**原因**：日志队列满或数据库写入失败

**排查**：

1. 检查队列状态（参考上面的监控检查）
2. 查看应用日志中的WARNING：

```bash
grep "审计日志队列已满" app.log
grep "批量插入审计日志失败" app.log
```

3. 检查数据库连接和权限

---

### 问题4：性能下降

**症状**：接口响应变慢

**排查**：

1. 检查Redis性能：

```bash
redis-cli --latency
```

2. 检查数据库慢查询：

```sql
SHOW PROCESSLIST;
SELECT * FROM information_schema.PROCESSLIST WHERE TIME > 1;
```

3. 检查审计日志表大小：

```sql
SELECT 
  TABLE_NAME,
  ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS size_mb,
  TABLE_ROWS
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'flow_codeblock_go' 
  AND TABLE_NAME = 'token_quota_logs';
```

如果表太大，执行清理：

```bash
./scripts/cleanup_quota_logs.sh
```

---

## 📊 性能基准

| 指标 | 目标值 | 说明 |
|------|--------|------|
| QPS（Redis模式） | > 8,000 | 配额检查+扣减 |
| 延迟（P95） | < 100ms | 包含配额扣减 |
| Redis同步延迟 | < 5秒 | 批量同步间隔 |
| 日志写入延迟 | < 5秒 | 批量写入间隔 |
| 队列容量 | 10,000 | 同步+日志队列 |

---

## 🔄 回滚方案

如果部署后出现问题，可以快速回滚：

### 1. 回滚代码

```bash
# 停止新服务
pkill -f flow-codeblock-go

# 启动旧版本
./flow-codeblock-go.old &
```

### 2. 回滚数据库（可选）

```bash
# 删除配额字段（如果需要）
mysql -u root -p flow_codeblock_go <<EOF
ALTER TABLE access_tokens 
  DROP COLUMN quota_type,
  DROP COLUMN total_quota,
  DROP COLUMN remaining_quota,
  DROP COLUMN quota_synced_at;

DROP TABLE IF EXISTS token_quota_logs;
EOF
```

### 3. 恢复备份

```bash
# 恢复数据库备份
mysql -u root -p flow_codeblock_go < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📚 相关文档

- [使用文档](./QUOTA_SYSTEM.md)
- [API文档](./API.md)
- [数据库初始化脚本](../scripts/init.sql)
- [清理脚本](../scripts/cleanup_quota_logs.sh)

---

## 🆘 技术支持

如有问题，请联系技术团队。
