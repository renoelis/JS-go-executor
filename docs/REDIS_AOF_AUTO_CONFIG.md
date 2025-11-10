# Redis AOF自动配置

## 🎯 为什么需要AOF？

配额系统使用Redis存储实时配额数据，**AOF持久化是必需的**，否则Redis重启后配额数据会丢失。

---

## ✅ 自动配置（推荐）

**无需手动配置！**应用启动时会自动检查并启用AOF。

### 工作流程

```
应用启动
  ↓
检查Redis AOF状态
  ↓
已启用？
  ├─ 是 → 记录日志，继续启动
  └─ 否 → 自动启用AOF
         ↓
     尝试持久化到redis.conf
         ↓
     验证配置
         ↓
     继续启动
```

### 启动日志示例

#### 场景1：AOF已启用

```
[INFO] 检查Redis AOF持久化配置...
[INFO] ✅ Redis AOF持久化已启用
[INFO] Redis AOF配置详情 appendonly=yes appendfsync=everysec ...
```

#### 场景2：自动启用AOF

```
[INFO] 检查Redis AOF持久化配置...
[WARN] ⚠️  Redis AOF持久化未启用，正在自动启用... current_value=no
[INFO] ✅ Redis AOF持久化已启用
[INFO] ✅ AOF配置已持久化到redis.conf
[INFO] Redis AOF配置详情 appendonly=yes appendfsync=everysec ...
```

#### 场景3：无法持久化（权限问题）

```
[INFO] 检查Redis AOF持久化配置...
[WARN] ⚠️  Redis AOF持久化未启用，正在自动启用... current_value=no
[INFO] ✅ Redis AOF持久化已启用
[WARN] ⚠️  无法持久化配置到redis.conf（可能是权限问题）
       impact=Redis重启后需要重新启用AOF
       solution=建议手动在redis.conf中设置 appendonly yes
```

---

## 🔧 自动优化配置

应用还会自动优化AOF相关配置：

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| `appendonly` | `yes` | 启用AOF |
| `appendfsync` | `everysec` | 每秒同步（平衡性能和安全） |
| `auto-aof-rewrite-percentage` | `100` | AOF文件增长100%时重写 |
| `auto-aof-rewrite-min-size` | `64mb` | 最小64MB才重写 |

---

## 📋 手动配置（可选）

如果自动配置失败或需要自定义，可以手动配置。

### 方式1：运行时配置（临时）

```bash
# 启用AOF
redis-cli CONFIG SET appendonly yes

# 持久化配置（需要写权限）
redis-cli CONFIG REWRITE
```

### 方式2：编辑redis.conf（永久）

```bash
# 编辑配置文件
vim /path/to/redis.conf

# 添加或修改以下配置
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# 重启Redis
redis-server /path/to/redis.conf
```

---

## 🔍 验证AOF状态

### 方式1：查看应用日志

```bash
grep "Redis AOF" app.log
```

### 方式2：直接查询Redis

```bash
redis-cli CONFIG GET appendonly
# 应该返回：
# 1) "appendonly"
# 2) "yes"
```

### 方式3：查看Redis信息

```bash
redis-cli INFO persistence | grep aof
```

**预期输出**：

```
aof_enabled:1
aof_rewrite_in_progress:0
aof_rewrite_scheduled:0
aof_last_rewrite_time_sec:-1
aof_current_rewrite_time_sec:-1
aof_last_bgrewrite_status:ok
aof_last_write_status:ok
aof_current_size:0
aof_base_size:0
aof_pending_rewrite:0
aof_buffer_length:0
aof_rewrite_buffer_length:0
aof_pending_bio_fsync:0
aof_delayed_fsync:0
```

---

## ⚠️ 常见问题

### 问题1：无法持久化配置

**症状**：

```
[WARN] ⚠️  无法持久化配置到redis.conf（可能是权限问题）
```

**原因**：
- Redis没有redis.conf文件的写权限
- Redis使用默认配置启动（未指定配置文件）

**影响**：
- AOF已启用，当前会话有效
- Redis重启后需要重新启用

**解决方法**：

1. **方法1：给Redis写权限**

```bash
# 找到redis.conf位置
redis-cli CONFIG GET dir

# 修改权限
sudo chown redis:redis /path/to/redis.conf
sudo chmod 644 /path/to/redis.conf
```

2. **方法2：手动编辑redis.conf**

```bash
# 编辑配置文件
vim /path/to/redis.conf

# 添加
appendonly yes

# 重启Redis
sudo systemctl restart redis
```

3. **方法3：使用配置文件启动**

```bash
redis-server /path/to/redis.conf
```

---

### 问题2：Docker容器中的Redis

**症状**：每次重启容器AOF都失效

**原因**：容器重启后Redis配置丢失

**解决方法**：

#### 方法1：使用Volume挂载配置文件

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf
      - redis-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf
```

```bash
# redis.conf
appendonly yes
appendfsync everysec
```

#### 方法2：使用命令行参数

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --appendfsync everysec
    volumes:
      - redis-data:/data
```

#### 方法3：自定义Dockerfile

```dockerfile
FROM redis:7-alpine

# 复制配置文件
COPY redis.conf /usr/local/etc/redis/redis.conf

# 使用配置文件启动
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
```

---

### 问题3：Kubernetes中的Redis

**解决方法**：使用ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    appendonly yes
    appendfsync everysec
    auto-aof-rewrite-percentage 100
    auto-aof-rewrite-min-size 64mb
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  template:
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
          - redis-server
          - /etc/redis/redis.conf
        volumeMounts:
        - name: config
          mountPath: /etc/redis
      volumes:
      - name: config
        configMap:
          name: redis-config
```

---

## 📊 AOF性能影响

### appendfsync 选项对比

| 选项 | 性能 | 安全性 | 数据丢失风险 | 推荐场景 |
|------|------|--------|-------------|---------|
| `always` | 慢 | 最高 | 几乎为0 | 金融系统 |
| `everysec` | 中 | 高 | 最多1秒 | **推荐（默认）** |
| `no` | 快 | 低 | 最多30秒 | 不推荐 |

### 性能数据

- **写入延迟增加**：< 5%
- **QPS影响**：< 10%
- **磁盘空间**：AOF文件约为数据大小的1-2倍

---

## 🎉 总结

### ✅ 推荐方式

**使用自动配置！**

- 无需手动配置
- 启动时自动检查和启用
- 自动优化配置
- 记录详细日志

### ⚠️ 注意事项

1. **Docker/K8s部署**：使用Volume或ConfigMap持久化配置
2. **权限问题**：确保Redis有写redis.conf的权限
3. **监控日志**：检查启动日志确认AOF已启用
4. **定期验证**：`redis-cli CONFIG GET appendonly`

---

## 📚 相关文档

- [配额系统文档](./QUOTA_SYSTEM.md)
- [部署指南](./DEPLOYMENT_QUOTA.md)
- [Redis官方文档](https://redis.io/docs/management/persistence/)

---

**建议**：使用自动配置，简单可靠！如果遇到问题，查看启动日志并按照提示操作。
