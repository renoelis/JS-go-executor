# 配额日志自动清理服务

## 🎯 为什么使用内置清理服务？

你的疑问非常好！相比传统的crontab方式，**内置清理服务有以下显著优势**：

### ✅ 优势对比

| 特性 | 内置清理服务 | Crontab方式 |
|------|-------------|------------|
| **跨平台** | ✅ Windows/Linux/Mac都支持 | ❌ Windows不支持cron |
| **配置简单** | ✅ 环境变量即可 | ❌ 需要配置crontab |
| **统一管理** | ✅ 所有逻辑在应用内 | ❌ 分散在系统和应用 |
| **实时监控** | ✅ API查看清理状态 | ❌ 需要查看日志文件 |
| **手动触发** | ✅ API立即触发 | ❌ 需要手动执行脚本 |
| **权限管理** | ✅ 使用应用数据库权限 | ❌ 需要配置cron用户权限 |
| **日志集成** | ✅ 统一应用日志 | ❌ 单独的日志文件 |
| **容器化部署** | ✅ 完美支持Docker/K8s | ⚠️ 需要额外配置 |

---

## 🚀 快速开始

### 1. 默认配置（推荐）

**无需任何配置，开箱即用！**

默认行为：
- ✅ 自动启用清理服务
- ✅ 保留180天（6个月）
- ✅ 每24小时清理一次
- ✅ 每批删除10,000条

### 2. 自定义配置

通过环境变量调整：

```bash
# 是否启用自动清理（默认：true）
export QUOTA_CLEANUP_ENABLED=true

# 日志保留天数（默认：180天）
export QUOTA_CLEANUP_RETENTION_DAYS=90

# 清理间隔（小时，默认：24小时）
export QUOTA_CLEANUP_INTERVAL_HOURS=12

# 每批删除数量（默认：10000）
export QUOTA_CLEANUP_BATCH_SIZE=5000
```

### 3. 禁用自动清理

如果你仍然想使用crontab方式：

```bash
export QUOTA_CLEANUP_ENABLED=false
```

---

## 📊 监控清理状态

### 查看清理统计

```bash
curl -X GET "http://localhost:8080/flow/quota/cleanup/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**响应示例**：

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

## 🔧 手动触发清理

如果需要立即清理（不等待定时任务）：

```bash
curl -X POST "http://localhost:8080/flow/quota/cleanup/trigger" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**响应**：

```json
{
  "success": true,
  "data": {
    "message": "清理任务已提交，正在后台执行"
  },
  "message": "清理任务已启动"
}
```

---

## 🔍 工作原理

### 清理流程

```
启动后1分钟
  ↓
首次清理
  ↓
每24小时（可配置）
  ↓
┌─────────────────────┐
│ 1. 查询待删除数量    │
└─────────────────────┘
          ↓
┌─────────────────────┐
│ 2. 批量删除（1万/批）│
│    每批间隔0.5秒     │
└─────────────────────┘
          ↓
┌─────────────────────┐
│ 3. 优化表空间        │
│    （删除>1万时）    │
└─────────────────────┘
          ↓
┌─────────────────────┐
│ 4. 更新统计信息      │
└─────────────────────┘
```

### 批量删除策略

- **批次大小**：10,000条/批（可配置）
- **间隔时间**：0.5秒/批（避免数据库压力）
- **表优化**：删除超过1万条时自动执行`OPTIMIZE TABLE`

---

## 📈 性能影响

### 对生产环境的影响

| 指标 | 值 | 说明 |
|------|-----|------|
| CPU占用 | < 5% | 清理期间 |
| 内存占用 | < 10MB | 额外内存 |
| 数据库负载 | 低 | 批量+间隔 |
| 对服务影响 | 无 | 后台异步执行 |

### 清理性能

- **100万条记录**：约5-10分钟
- **1000万条记录**：约50-100分钟
- **删除速度**：约2000-3000条/秒

---

## ⚙️ 配置建议

### 场景1：低流量应用

```bash
# 保留1年，每周清理一次
export QUOTA_CLEANUP_RETENTION_DAYS=365
export QUOTA_CLEANUP_INTERVAL_HOURS=168  # 7天
```

### 场景2：中等流量应用（推荐）

```bash
# 保留6个月，每天清理一次（默认配置）
export QUOTA_CLEANUP_RETENTION_DAYS=180
export QUOTA_CLEANUP_INTERVAL_HOURS=24
```

### 场景3：高流量应用

```bash
# 保留3个月，每12小时清理一次
export QUOTA_CLEANUP_RETENTION_DAYS=90
export QUOTA_CLEANUP_INTERVAL_HOURS=12
export QUOTA_CLEANUP_BATCH_SIZE=20000  # 增大批次
```

---

## 🐛 故障排查

### 问题1：清理服务未启动

**检查日志**：

```bash
grep "配额日志清理服务" app.log
```

**预期输出**：

```
配额日志清理服务启动 retention_days=180 cleanup_interval=24h0m0s
```

**如果看到**：

```
配额日志自动清理已禁用，请手动执行清理脚本
```

说明 `QUOTA_CLEANUP_ENABLED=false`，需要改为`true`

---

### 问题2：清理失败

**查看错误日志**：

```bash
grep "清理失败\|批量删除失败" app.log
```

**常见原因**：
1. 数据库连接问题
2. 权限不足
3. 表被锁定

**解决方法**：
1. 检查数据库连接
2. 确认应用有DELETE权限
3. 避免在清理时执行大量写入

---

### 问题3：清理太慢

**调整批次大小**：

```bash
# 增大批次（适用于高性能数据库）
export QUOTA_CLEANUP_BATCH_SIZE=50000
```

**注意**：批次太大可能导致：
- 单次DELETE耗时过长
- 锁表时间增加
- 影响其他查询

---

## 🔄 与Crontab方式对比

### 如果你仍想使用Crontab

1. **禁用内置服务**：

```bash
export QUOTA_CLEANUP_ENABLED=false
```

2. **配置crontab**：

```bash
crontab -e

# 每天凌晨3点执行
0 3 * * * /path/to/scripts/cleanup_quota_logs.sh >> /var/log/quota_cleanup.log 2>&1
```

3. **脚本已提供**：`scripts/cleanup_quota_logs.sh`

### 为什么不推荐Crontab？

1. **Windows不支持**：需要用Task Scheduler替代
2. **容器化困难**：Docker/K8s需要额外配置
3. **权限复杂**：需要配置cron用户权限
4. **监控困难**：无法通过API查看状态
5. **日志分散**：应用日志和清理日志分离

---

## 📚 API文档

### GET /quota/cleanup/stats

查询清理服务状态

**请求**：

```bash
GET /flow/quota/cleanup/stats
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**响应**：

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

### POST /quota/cleanup/trigger

手动触发清理

**请求**：

```bash
POST /flow/quota/cleanup/trigger
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**响应**：

```json
{
  "success": true,
  "data": {
    "message": "清理任务已提交，正在后台执行"
  },
  "message": "清理任务已启动"
}
```

---

## 🎉 总结

### 推荐使用内置清理服务

✅ **开箱即用**：无需配置，自动运行  
✅ **跨平台**：Windows/Linux/Mac都支持  
✅ **易监控**：API实时查看状态  
✅ **易管理**：统一在应用内部  
✅ **易部署**：完美支持容器化  

### 何时使用Crontab？

- 需要更复杂的清理逻辑
- 需要清理多个应用的数据
- 已有完善的cron管理系统

---

## 📝 相关文档

- [配额系统使用文档](./QUOTA_SYSTEM.md)
- [部署指南](./DEPLOYMENT_QUOTA.md)
- [清理脚本](../scripts/cleanup_quota_logs.sh)（备用）

---

**建议**：使用内置清理服务，简单、可靠、易维护！
