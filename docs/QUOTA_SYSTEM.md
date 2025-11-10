# Token配额系统使用文档

## 📋 概述

Token配额系统支持基于**次数**的Token失效机制，与现有的**时间**限制并存，提供更灵活的Token管理方式。

---

## 🎯 配额类型

| 类型 | 说明 | 失效条件 |
|------|------|---------|
| `time` | 仅时间限制（默认） | 到期时间 |
| `count` | 仅次数限制 | 配额耗尽 |
| `hybrid` | 时间+次数双重限制 | 到期时间 **或** 配额耗尽（满足任一条件即失效） |

---

## 🚀 快速开始

### 1. 数据库迁移

```bash
# 执行迁移脚本
mysql -u root -p flow_codeblock_go < scripts/migrations/001_add_quota_support.sql
```

### 2. 配置Redis AOF持久化

编辑 `redis.conf`：

```conf
# 开启AOF持久化
appendonly yes

# 每秒同步一次（推荐）
appendfsync everysec

# AOF文件路径
appendfilename "appendonly.aof"
```

重启Redis：

```bash
redis-server /path/to/redis.conf
```

### 3. 重启应用

```bash
# 停止旧服务
pkill -f flow-codeblock-go

# 启动新服务
./flow-codeblock-go
```

---

## 📝 API使用示例

### 创建次数限制Token

```bash
curl -X POST http://localhost:8080/flow/tokens \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "workspace_001",
    "email": "user@example.com",
    "operation": "unlimited",
    "quota_type": "count",
    "total_quota": 1000,
    "rate_limit_per_minute": 60
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
    "access_token": "flow_a1b2c3d4...",
    "quota_type": "count",
    "total_quota": 1000,
    "remaining_quota": 1000,
    "created_at": "2025-10-18 22:30:00"
  }
}
```

---

### 创建时间+次数双重限制Token

```bash
curl -X POST http://localhost:8080/flow/tokens \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "workspace_002",
    "email": "vip@example.com",
    "operation": "add",
    "days": 30,
    "quota_type": "hybrid",
    "total_quota": 10000,
    "rate_limit_per_minute": 100
  }'
```

---

### 查询配额

```bash
curl -X GET "http://localhost:8080/flow/tokens/flow_xxx/quota" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "quota_type": "count",
    "total_quota": 1000,
    "remaining_quota": 742,
    "consumed_quota": 258,
    "quota_synced_at": "2025-10-18 22:35:00"
  }
}
```

---

### 查询配额消耗日志

```bash
curl -X GET "http://localhost:8080/flow/tokens/flow_xxx/quota/logs?start_date=2025-10-01&end_date=2025-10-18&page=1&page_size=100" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 12345,
        "token": "flow_xxx",
        "quota_before": 743,
        "quota_after": 742,
        "quota_change": -1,
        "action": "consume",
        "request_id": "req_abc123",
        "execution_success": true,
        "created_at": "2025-10-18 22:35:30"
      }
    ],
    "total": 258,
    "page": 1,
    "page_size": 100,
    "total_pages": 3
  }
}
```

---

### 增购配额

```bash
curl -X PUT "http://localhost:8080/flow/tokens/flow_xxx" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "unlimited",
    "quota_operation": "add",
    "quota_amount": 500
  }'
```

**配额操作类型**：

- `add`: 在当前剩余基础上增加（续费场景）
- `set`: 直接设置为指定值（管理员校正）
- `reset`: 重置为 `total_quota` 初始值（重置场景）

---

## 🔍 配额消耗逻辑

### 调用即消耗

**无论代码执行成功还是失败，只要调用了接口就消耗1次配额。**

```
请求到达
  ↓
预扣配额（Redis DECR）
  ↓
配额不足？→ 返回429错误
  ↓
执行代码
  ↓
记录审计日志（异步）
  ↓
返回结果
```

### 配额不足响应

```json
{
  "success": false,
  "error": {
    "type": "QuotaExceeded",
    "message": "配额不足: 配额不足"
  },
  "timestamp": "2025-10-18 22:40:00",
  "request_id": "req_xyz789"
}
```

---

## 📊 监控与运维

### 查看配额服务状态

```bash
curl -X GET "http://localhost:8080/flow/cache-write-pool/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "sync_queue_len": 12,
    "sync_queue_cap": 10000,
    "log_queue_len": 45,
    "log_queue_cap": 10000,
    "sync_interval": "5s",
    "sync_batch_size": 500
  }
}
```

---

### 数据清理

**自动清理**（推荐）：

```bash
# 创建定时任务
crontab -e

# 每天凌晨3点清理6个月前的日志
0 3 * * * mysql -u root -p'PASSWORD' flow_codeblock_go -e "DELETE FROM token_quota_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH) LIMIT 10000;"
```

**手动清理**：

```bash
# 执行清理脚本
./scripts/cleanup_quota_logs.sh
```

---

## ⚠️ 注意事项

### 1. Redis持久化

- **必须开启AOF**：防止Redis重启导致配额数据丢失
- **建议配置**：`appendfsync everysec`（每秒同步）
- **数据丢失风险**：最多丢失5秒内的配额消耗

### 2. 并发安全

- Redis `DECR` 命令保证原子性
- 不会出现超扣或重复扣减
- 高并发下性能稳定（QPS > 8000）

### 3. 故障降级

- Redis故障时自动降级到数据库模式
- 性能会下降但不会中断服务
- 建议监控Redis可用性

### 4. 审计日志

- 异步批量写入，不影响主流程性能
- 队列满时会丢弃日志（记录WARNING）
- 建议定期清理历史数据

---

## 🐛 故障排查

### 问题1：配额扣减后Redis数据不一致

**原因**：Redis未开启持久化，重启后数据丢失

**解决**：

```bash
# 检查Redis配置
redis-cli CONFIG GET appendonly

# 如果返回 "no"，开启AOF
redis-cli CONFIG SET appendonly yes
redis-cli CONFIG REWRITE
```

---

### 问题2：配额查询返回旧值

**原因**：Redis同步延迟（最多5秒）

**解决**：正常现象，等待5秒后自动同步

---

### 问题3：审计日志缺失

**原因**：日志队列满（队列容量10000）

**解决**：

1. 检查队列状态：`GET /cache-write-pool/stats`
2. 增加队列容量（修改 `quota_service.go` 中的 `logChan` 容量）
3. 优化数据库写入性能

---

## 📈 性能指标

| 指标 | 值 | 说明 |
|------|-----|------|
| QPS（Redis模式） | 8,000+ | 配额检查+扣减 |
| QPS（DB降级） | 500 | 数据库UPDATE性能 |
| 延迟（P95） | 60ms | 包含配额扣减 |
| 同步间隔 | 5秒 | Redis→DB批量同步 |
| 批次大小 | 500条 | 每批最多500条记录 |
| 队列容量 | 10,000 | 同步队列+日志队列 |

---

## 📚 相关文档

- [数据库迁移脚本](../scripts/migrations/001_add_quota_support.sql)
- [Redis配置指南](./REDIS_CONFIG.md)
- [API完整文档](./API.md)

---

## 🆘 技术支持

如有问题，请联系技术团队或提交Issue。
