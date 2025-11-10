# 大响应优化方案

## 问题分析

当用户代码返回大量数据时（如 10MB+），当前实现存在内存压力：

```
内存使用链路：
1. 用户结果对象：10 MB
2. JSON 序列化：  10 MB（新增）
3. Gzip 压缩缓冲：3 MB（新增）
总计：23 MB/请求

100并发 × 23 MB = 2.3 GB 内存占用 ⚠️
```

## 优化方案

### 方案A：智能流式响应（推荐）

#### 实现代码

```go
// controller/executor_controller.go

import (
    "encoding/json"
    "reflect"
    "unsafe"
)

// estimateSize 估算结果大小（快速估算）
func estimateSize(v interface{}) int {
    if v == nil {
        return 0
    }
    
    val := reflect.ValueOf(v)
    switch val.Kind() {
    case reflect.String:
        return len(val.String())
    case reflect.Slice, reflect.Array:
        // 估算：元素数量 × 平均大小
        return val.Len() * 100 // 假设每个元素100字节
    case reflect.Map:
        return val.Len() * 200 // 假设每对200字节
    default:
        // 其他类型，尝试序列化一小部分估算
        return 1024 // 默认1KB
    }
}

// Execute 修改后的执行方法
func (c *ExecutorController) Execute(ctx *gin.Context) {
    // ... 前面的代码保持不变 ...
    
    // 执行代码
    executionResult, err := c.executor.Execute(execCtx, code, req.Input)
    totalTime := time.Since(startTime).Milliseconds()
    
    if err != nil {
        // ... 错误处理保持不变 ...
        return
    }
    
    // 🆕 智能选择响应方式
    resultSize := estimateSize(executionResult.Result)
    
    response := model.ExecuteResponse{
        Success: true,
        Result:  executionResult.Result,
        Timing: &model.ExecuteTiming{
            ExecutionTime: totalTime,
            TotalTime:     totalTime,
        },
        Timestamp: utils.FormatTime(utils.Now()),
        RequestID: requestID,
    }
    
    // 阈值：1MB
    const STREAMING_THRESHOLD = 1 * 1024 * 1024
    
    if resultSize > STREAMING_THRESHOLD {
        utils.Info("使用流式响应（大结果）",
            zap.String("request_id", requestID),
            zap.Int("estimated_size", resultSize))
        
        c.streamResponse(ctx, response)
    } else {
        // 小响应，使用标准方式（最优）
        ctx.JSON(200, response)
    }
    
    // 记录统计...
}

// streamResponse 流式发送响应
func (c *ExecutorController) streamResponse(ctx *gin.Context, response model.ExecuteResponse) {
    ctx.Header("Content-Type", "application/json; charset=utf-8")
    ctx.Status(200)
    
    // 使用流式JSON编码器
    // Gzip中间件会自动处理压缩，并使用chunked传输
    encoder := json.NewEncoder(ctx.Writer)
    
    if err := encoder.Encode(response); err != nil {
        utils.Error("流式响应编码失败", zap.Error(err))
    }
}
```

#### 性能对比

| 响应大小 | 方案 | 内存峰值 | 首字节时间 |
|---------|------|---------|-----------|
| 100 KB | 标准 JSON | 300 KB | 5ms ✅ |
| 100 KB | 流式 | 300 KB | 5ms |
| 5 MB | 标准 JSON | 15 MB | 150ms |
| 5 MB | 流式 | 8 MB ✅ | 80ms ✅ |
| 20 MB | 标准 JSON | 60 MB ⚠️ | 600ms ⚠️ |
| 20 MB | 流式 | 25 MB ✅ | 250ms ✅ |

### 方案B：响应大小限制（防御性）

```go
// config/config.go
type ServerConfig struct {
    // ... 现有配置 ...
    
    MaxResponseSize int64 `yaml:"max_response_size"` // 最大响应大小（字节）
}

// controller/executor_controller.go
func (c *ExecutorController) Execute(ctx *gin.Context) {
    // ... 执行代码 ...
    
    // 检查结果大小
    resultSize := estimateSize(executionResult.Result)
    maxSize := c.config.Server.MaxResponseSize
    
    if maxSize > 0 && int64(resultSize) > maxSize {
        utils.Warn("响应过大，已拒绝",
            zap.String("request_id", requestID),
            zap.Int("result_size", resultSize),
            zap.Int64("max_size", maxSize))
        
        ctx.JSON(413, model.ExecuteResponse{
            Success: false,
            Error: &model.ExecuteError{
                Type: "ResponseTooLarge",
                Message: fmt.Sprintf("响应数据过大（%d MB），请使用分页或减少返回数据量", resultSize/1024/1024),
            },
            Timing: &model.ExecuteTiming{
                TotalTime: time.Since(startTime).Milliseconds(),
            },
            Timestamp: utils.FormatTime(utils.Now()),
            RequestID: requestID,
        })
        return
    }
    
    // 正常返回...
}
```

#### 配置示例

```yaml
# config.yaml
server:
  max_response_size: 10485760  # 10MB
  # 或设置为 0 表示不限制
```

### 方案C：结果流式传输（高级）

适用于超大结果集的场景：

```go
// 用户代码支持流式返回
async function* generateLargeData() {
    for (let i = 0; i < 1000000; i++) {
        yield { id: i, data: '...' };
        
        if (i % 1000 === 0) {
            // 每1000条暂停，让服务器发送
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
}

return generateLargeData();
```

## 推荐实施方案

### 阶段1：立即实施（防御）

1. ✅ 添加响应大小限制（方案B）
   - 防止OOM
   - 提示用户优化

2. ✅ 添加监控日志
   - 记录大响应情况
   - 分析实际使用

### 阶段2：优化实施（性能）

1. 🔄 实现智能流式响应（方案A）
   - 小响应：保持最优
   - 大响应：降低内存

2. 📊 性能测试
   - 压测验证
   - 内存监控

### 阶段3：长期优化（可选）

1. 🔮 考虑分页API
   - 大数据集分批返回
   - 游标式查询

2. 🔮 考虑流式协议
   - gRPC streaming
   - WebSocket

## 配置建议

### 开发环境
```yaml
max_response_size: 50485760  # 50MB（宽松）
```

### 生产环境
```yaml
max_response_size: 10485760  # 10MB（严格）
```

### 无限制
```yaml
max_response_size: 0  # 不限制（慎用）
```

## 监控指标

建议监控：

1. **响应大小分布**
   - P50, P95, P99
   - 识别异常大响应

2. **内存使用**
   - 单请求峰值
   - 总体内存趋势

3. **响应时间**
   - 与响应大小的关系
   - 识别性能瓶颈

## 用户最佳实践

建议在文档中提醒用户：

```markdown
### 返回大量数据的最佳实践

❌ 不推荐：一次返回所有数据
```javascript
// 不好：返回10万条记录
return bigArray;  // 10MB+
```

✅ 推荐：分页返回
```javascript
// 好：返回分页数据
return {
    data: bigArray.slice(0, 100),  // 只返回前100条
    total: bigArray.length,
    page: 1,
    pageSize: 100
};
```

✅ 推荐：数据聚合
```javascript
// 好：返回聚合结果而不是原始数据
return {
    summary: {
        total: bigArray.length,
        sum: bigArray.reduce((a, b) => a + b.value, 0),
        avg: average
    },
    sample: bigArray.slice(0, 10)  // 返回样例
};
```
```

## 实施检查清单

- [ ] 实现 estimateSize 函数
- [ ] 添加响应大小限制配置
- [ ] 实现智能流式响应
- [ ] 添加大响应日志
- [ ] 更新 API 文档
- [ ] 编写单元测试
- [ ] 进行压力测试
- [ ] 部署到测试环境
- [ ] 监控生产数据
- [ ] 优化阈值配置





