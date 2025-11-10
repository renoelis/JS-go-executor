# 内存保护系统（Memory Guard）

## 概述

为了解决高并发场景下 goja JavaScript 执行导致的内存占用问题（每个请求约 150-200MB），我们实现了一个完整的内存保护系统。

## 问题背景

**典型场景：**
```
容器内存限制: 2GB
单个请求内存: 200MB
并发执行: 10 个请求
实际占用: 2000MB = 2GB ❌ 接近 OOM
```

**goja 的内存特性：**
- JavaScript 对象在 goja 中比 JSON 大 10 倍
- 100,000 个对象 ≈ 140MB 内存占用
- 无法提前限制 goja 的内存使用

## 解决方案

### 三层防护机制

```
┌─────────────────────────────────────────────┐
│  第 1 层：内存保护器（Memory Guard）           │
│  - 实时监控系统内存使用率                      │
│  - 根据内存压力动态限制并发数                  │
│  - 内存不足时拒绝新请求（快速失败）            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  第 2 层：导出阶段检查（先估算后导出）         │
│  - 估算 JSON 大小，超限立即拒绝               │
│  - 避免创建 Go 导出对象（节省 30-50MB）      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  第 3 层：Docker 内存限制（最终防线）          │
│  - 容器级别的硬限制                          │
│  - 触发 OOM Killer 保护宿主机                │
└─────────────────────────────────────────────┘
```

## 核心功能

### 1. 实时内存监控

```go
type MemoryGuard struct {
    maxMemoryPercent   float64  // 最大内存使用率（80%）
    warningMemory      float64  // 警告阈值（70%）
    criticalMemory     float64  // 危险阈值（85%）
    checkInterval      time.Duration  // 检查间隔（5秒）
    currentConcurrency int32    // 当前允许的并发数（动态调整）
}
```

### 2. 动态并发控制

根据内存压力自动调整并发数：

| 内存使用率 | 动作 | 并发数调整 |
|-----------|------|-----------|
| < 60% | NORMAL | 保持基础并发（10） |
| 60-70% | STABLE | 保持当前并发 |
| 70-80% | WARNING | 减少 25%（7-8） |
| 80-85% | HIGH | 减少 50%（5） |
| > 85% | CRITICAL | 只允许当前活跃任务 |

### 3. 快速失败机制

```go
// 内存不足时立即拒绝
if memPercent > criticalPercent {
    return error("内存压力过高，拒绝执行")
}

// 获取不到执行权限时超时返回
ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
if err := memoryGuard.Acquire(ctx); err != nil {
    return error("等待执行超时")
}
defer memoryGuard.Release()
```

## 配置说明

### 环境变量

```bash
# 内存保护器配置
MEMORY_GUARD_ENABLED=true                  # 是否启用（默认：true，强烈推荐）
MEMORY_GUARD_MAX_PERCENT=0.80              # 最大内存使用率（80%）
MEMORY_GUARD_WARNING_PERCENT=0.70          # 警告阈值（70%）
MEMORY_GUARD_CRITICAL_PERCENT=0.85         # 危险阈值（85%）
MEMORY_GUARD_CHECK_INTERVAL_SEC=5          # 检查间隔（5秒）
MEMORY_GUARD_ESTIMATED_MEM_PER_REQ_MB=200  # 每请求估算内存（200MB）
```

### Docker Compose 示例

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G  # 容器内存限制
        reservations:
          memory: 1G  # 最小保留内存
    environment:
      - MAX_CONCURRENT=10                      # 基础并发数
      - MEMORY_GUARD_ENABLED=true              # 启用内存保护
      - MEMORY_GUARD_MAX_PERCENT=0.80         # 1.6GB 时开始限流
      - MEMORY_GUARD_CRITICAL_PERCENT=0.85    # 1.7GB 时拒绝新请求
```

## 实际效果

### 场景 A：正常负载

```
请求数: 5 个并发
内存占用: ~1GB (50%)
并发限制: 10（基础值）
状态: NORMAL
```

### 场景 B：高负载

```
请求数: 8 个并发
内存占用: ~1.5GB (75%)
并发限制: 7（减少 30%）
状态: WARNING
动作: 新请求需要等待
```

### 场景 C：过载

```
请求数: 10 个并发
内存占用: ~1.8GB (90%)
并发限制: 2（只允许活跃任务）
状态: CRITICAL
动作: 拒绝所有新请求
```

## 监控指标

### 获取统计信息

```go
stats := memoryGuard.GetStats()
// 返回:
// {
//   "total_requests": 1000,
//   "rejected_requests": 50,
//   "completed_requests": 950,
//   "active_tasks": 5,
//   "current_concurrency": 8,
//   "base_concurrency": 10,
//   "memory_percent": 72.5,
//   "memory_alloc_mb": 1450.23,
//   "memory_sys_mb": 2000.00
// }
```

### 日志示例

```
[INFO] 内存保护器初始化成功
  enabled=true
  max_memory_percent=80
  warning_percent=70
  critical_percent=85
  check_interval=5s
  estimated_mem_per_req_mb=200
  base_concurrency=10

[INFO] 内存保护器动态调整并发数
  action=WARNING
  memory_percent=75.2
  old_concurrency=10
  new_concurrency=7
  active_tasks=6

[WARN] 内存保护拒绝执行
  error="内存压力过高，拒绝执行（当前内存使用率 87.3%）"
  memory_stats={...}
```

## 性能影响

| 操作 | 耗时 | 影响 |
|------|------|------|
| 内存检查 | ~100μs | 可忽略 |
| 信号量获取 | ~10μs | 可忽略 |
| 并发调整 | ~1ms | 每 5 秒一次 |
| 总开销 | < 0.5% | 可接受 |

## 最佳实践

### 1. 合理设置并发数

```bash
# 计算公式：
# 容器内存限制 / 每请求内存 * 0.8（安全系数）
# 
# 例如：
# 2GB / 200MB * 0.8 = 8
MAX_CONCURRENT=8
```

### 2. 调整内存阈值

```bash
# 开发环境（宽松）
MEMORY_GUARD_MAX_PERCENT=0.85
MEMORY_GUARD_WARNING_PERCENT=0.75

# 生产环境（保守）
MEMORY_GUARD_MAX_PERCENT=0.75
MEMORY_GUARD_WARNING_PERCENT=0.65
```

### 3. 监控告警

```yaml
# Prometheus 指标（建议）
- memory_guard_rejected_requests_total
- memory_guard_active_tasks
- memory_guard_current_concurrency
- memory_guard_memory_percent

# 告警规则
- alert: HighMemoryPressure
  expr: memory_guard_memory_percent > 80
  for: 5m
  annotations:
    summary: "内存压力过高"
```

## 故障排查

### 问题：频繁拒绝请求

**原因：**
- 并发数设置过高
- 内存阈值过低
- 用户代码生成超大对象

**解决：**
```bash
# 1. 降低并发数
MAX_CONCURRENT=5

# 2. 调整阈值
MEMORY_GUARD_MAX_PERCENT=0.85

# 3. 限制返回数据大小
MAX_RESULT_SIZE=5242880  # 5MB
```

### 问题：内存仍然 OOM

**原因：**
- Docker 内存限制过小
- goja 内存泄漏
- 并发数仍然过高

**解决：**
```yaml
# 1. 增加容器内存
deploy:
  resources:
    limits:
      memory: 4G  # 从 2G 增加到 4G

# 2. 进一步降低并发
environment:
  - MAX_CONCURRENT=5
  - MEMORY_GUARD_MAX_PERCENT=0.70
```

## 未来优化

1. **精准预测**：基于历史数据预测每个请求的内存占用
2. **优先级队列**：高优先级请求优先获取执行权限
3. **自适应调整**：基于机器学习动态调整阈值
4. **分级限流**：根据 Token 等级设置不同的内存配额

## 相关文档

- [API 接口文档](../API接口完整文档.md)
- [部署文档](../DEPLOYMENT_READY.md)
- [配额系统文档](./QUOTA_SYSTEM.md)



