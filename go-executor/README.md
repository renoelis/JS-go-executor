# Flow-CodeBlock Go版本

基于Go+goja的高性能JavaScript代码执行器，专为高并发、低延迟、同步响应场景设计。

## 🚀 核心特性

### ⚡ 超高性能
- **1000+并发支持**: 每个goroutine仅占用2KB内存
- **低延迟响应**: 预估5-50ms响应时间
- **同步执行**: 天然支持同步编程模型
- **Runtime池化**: 预创建100个goja Runtime实例

### 🛡️ 安全沙箱
- **危险函数禁用**: eval, Function, setTimeout等
- **全局对象隔离**: 禁用global, window等
- **代码静态检查**: 危险模式检测
- **资源限制**: 代码长度、执行时间、结果大小限制

### 📊 性能对比 (预估)

| 指标 | Node.js版本 | Go+goja版本 | 提升倍数 |
|------|-------------|-------------|----------|
| 1000并发内存 | 3-10GB | 200-500MB | **6-20x** |
| 请求延迟 | 50-200ms | 5-50ms | **2-10x** |
| 部署大小 | 500MB+ | 50MB | **10x** |
| 启动时间 | 10-30s | 1-3s | **5-10x** |

## 🏗️ 项目结构

```
go-executor/
├── main.go              # 主程序入口
├── executor.go          # JavaScript执行器核心
├── go.mod              # Go模块定义
├── Dockerfile          # Docker镜像构建
├── docker-compose.yml  # Docker编排配置
├── benchmark/          # 压力测试工具
│   ├── load_test.go    # 1000并发压测脚本
│   └── go.mod          # 压测工具模块
└── README.md           # 项目文档
```

## 🚀 快速开始

### 方式1: 直接运行

```bash
# 1. 安装依赖
go mod tidy

# 2. 启动服务
go run .

# 3. 测试接口
curl -X POST http://localhost:3002/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": {"name": "World", "count": 5},
    "codebase64": "'$(echo 'return "Hello " + input.name + "! Count: " + input.count;' | base64)'"
  }'
```

### 方式2: Docker部署

```bash
# 1. 构建并启动
docker-compose up -d

# 2. 查看日志
docker-compose logs -f

# 3. 健康检查
curl http://localhost:3002/health
```

## 📡 API接口

### POST /execute - 执行JavaScript代码

**请求示例:**
```json
{
  "input": {
    "name": "Go+goja",
    "numbers": [1, 2, 3, 4, 5]
  },
  "codebase64": "cmV0dXJuICJIZWxsbyAiICsgaW5wdXQubmFtZTs="
}
```

**响应示例:**
```json
{
  "success": true,
  "result": "Hello Go+goja",
  "timing": {
    "executionTime": 15,
    "totalTime": 15
  },
  "timestamp": "2024-01-01T10:30:00Z"
}
```

### GET /health - 健康检查

**响应示例:**
```json
{
  "status": "healthy",
  "service": "flow-codeblock-go",
  "version": "1.0.0",
  "runtime": {
    "poolSize": 100,
    "maxConcurrent": 1000,
    "currentExecutions": 5,
    "totalExecutions": 1520,
    "successRate": "98.5%"
  },
  "memory": {
    "alloc": "45.2MB",
    "sys": "128.5MB",
    "numGC": 23
  }
}
```

### GET /stats - 执行统计

获取详细的执行统计信息。

## 🔧 配置参数

通过环境变量配置：

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `RUNTIME_POOL_SIZE` | 100 | Runtime池大小 |
| `MAX_CONCURRENT_EXECUTIONS` | 1000 | 最大并发执行数 |
| `MAX_CODE_LENGTH` | 65535 | 代码长度限制(字节) |
| `MAX_INPUT_SIZE` | 2097152 | 输入数据限制(2MB) |
| `MAX_RESULT_SIZE` | 5242880 | 结果大小限制(5MB) |
| `EXECUTION_TIMEOUT_MS` | 5000 | 执行超时(毫秒) |
| `GOMAXPROCS` | 0 | Go最大处理器数 |
| `GOGC` | 100 | GC目标百分比 |

## 🧪 压力测试

### 运行压测

```bash
# 1. 启动服务
go run .

# 2. 运行压力测试 (另一个终端)
cd benchmark
go run load_test.go
```

### 测试场景

压测工具包含三个级别的测试：

1. **预热测试**: 100并发, 1000请求
2. **中等压力**: 500并发, 5000请求  
3. **高压力**: 1000并发, 10000请求

### 测试用例

- 简单计算 (加法运算)
- 字符串处理 (模板拼接)
- 数组处理 (求和、平均值)
- JSON处理 (对象转换)
- 数学计算 (多种数学运算)

### 预期性能指标

- **QPS**: 1000+ 请求/秒
- **延迟**: 5-50ms 平均响应时间
- **成功率**: 99.9%+
- **内存使用**: < 500MB (1000并发)

## 🎯 与Node.js版本对比

### 优势

✅ **内存效率**: 6-20倍内存节省  
✅ **并发能力**: 轻松支持1000+并发  
✅ **响应延迟**: 2-10倍延迟降低  
✅ **部署简单**: 单二进制文件，无依赖  
✅ **启动速度**: 5-10倍启动加速  

### 限制

⚠️ **模块生态**: 需要Go实现常用npm模块  
⚠️ **异步支持**: goja对Promise支持有限  
⚠️ **调试体验**: 相比Node.js调试工具较少  

## 🛠️ 开发计划

### 第一阶段 ✅ (已完成)
- [x] 基础JavaScript执行器
- [x] Runtime池管理
- [x] HTTP API接口
- [x] 安全沙箱
- [x] 1000并发压测

### 第二阶段 (计划中)
- [ ] 常用模块兼容层 (axios, lodash等)
- [ ] 数据库连接支持 (mysql2, mssql)
- [ ] 认证和限流机制
- [ ] 管理接口实现

### 第三阶段 (计划中)
- [ ] 完整功能对等
- [ ] 性能优化调整
- [ ] 生产环境部署
- [ ] 监控和日志系统

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

**⚡ Go + goja = 高性能 + 简单部署 + 低资源消耗**

