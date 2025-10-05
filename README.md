# Flow-CodeBlock Go版本

基于Go+goja的高性能JavaScript代码执行器，专为高并发、低延迟场景设计。

## 📖 快速导航

- [🚀 核心特性](#-核心特性) | [📊 性能对比](#-性能对比) | [🏗️ 项目结构](#️-项目结构)
- [🚀 快速开始](#-快速开始) | [📡 API接口](#-api接口) | [🔧 配置参数](#-配置参数)
- [💡 代码示例](#-代码示例) | [📚 完整文档](#-文档) | [🔍 故障排查](#-故障排查)

### 🔗 重要文档链接
- **[模块增强文档](ENHANCED_MODULES.md)** ⭐ 所有可用模块的详细文档
- **[认证和限流快速开始](认证和限流快速开始指南.md)** ⭐ 认证和限流功能使用指南
- **[认证和限流实施方案](认证和限流实现方案评估.md)** - 详细的技术架构文档
- **[测试报告](测试报告.md)** - 完整的功能测试报告
- **[XLSX 模块使用指南](test/xlsx/README.md)** - Excel 文件处理完整教程
- **[Console 控制功能](CONSOLE_CONTROL_FEATURE.md)** - Console 输出控制说明
- **[优雅关闭实施报告](GRACEFUL_SHUTDOWN_FINAL_REPORT.md)** - Graceful Shutdown 实现详情
- **[环境变量配置](env.example)** - 完整的环境变量配置说明

## 🚀 核心特性

### ⚡ 超高性能
- **1000+并发支持**: 每个goroutine仅占用2KB内存
- **低延迟响应**: 5-50ms响应时间
- **智能执行路由**: 同步代码用Runtime池，异步代码用EventLoop
- **动态Runtime池**: 自动扩缩容(最小50-最大200)，空闲超时释放
- **LRU代码缓存**: 编译后的代码自动缓存，避免重复编译
- **智能并发限制**: 基于系统内存自动计算最优并发数

### 🛡️ 安全沙箱
- **危险函数禁用**: eval等危险函数被完全禁用
- **危险模块禁用**: fs、path、child_process等模块被拦截
- **代码解析级检查**: 在执行前检测危险模式和不支持语法
- **多层沙箱防护**: 6层防护机制（Function、constructor、Reflect、Proxy等）
- **资源限制**: 代码长度、执行时间、输入输出大小限制
- **友好错误提示**: 中文错误消息和模块引入建议

### 🔐 认证和限流 (v2.1+)
- **Token认证**: 基于数据库的Token认证机制，支持过期时间管理
- **管理员认证**: 独立的管理员Token，用于管理接口访问控制
- **三层限流**: 热/温/冷数据层架构，95%+缓存命中率
- **动态限流**: 支持每秒突发限制和每分钟窗口限制
- **混合缓存**: 内存LRU + Redis，响应时间< 1ms
- **降级保护**: Redis故障自动降级，连续错误自动禁用
- **完善监控**: 缓存统计、限流统计、命中率分析

### 📦 丰富的模块生态

#### 核心模块
- **Buffer**: 100% Node.js Buffer API兼容，无缝数据转换
- **Crypto**: Go原生crypto + crypto-js双模块(77+方法)，支持RSA/AES/HMAC等
- **Fetch API**: 完整的现代Fetch API实现，支持所有HTTP方法
- **Axios**: 基于Fetch的axios兼容层(95%+ API兼容)，推荐用于文件操作

#### 工具库
- **Date-fns**: 完整的date-fns库支持，时间处理利器
- **Lodash**: 工具函数库，数据处理必备
- **QS**: 查询字符串解析和序列化
- **Pinyin**: 中文拼音转换
- **UUID**: UUID生成(v1/v4)

#### Excel处理
- **XLSX**: ⭐ Go原生Excel操作(基于excelize v2.9.1)
  - 高性能：读取55K行/秒，写入17K行/秒
  - 流式处理：内存占用降低80%
  - 零文件系统：纯内存操作，直接OSS集成
  - 支持：读写、流式读写、分批处理、公式计算

#### 高级功能
- **FormData**: 流式处理，支持大文件上传(最大500MB可配置)
- **Blob/File**: Web标准Blob和File对象，完整实现
- **AbortController**: 请求取消功能
- **URLSearchParams**: 完整的迭代器支持

### 🔧 架构设计

#### 模块注册器架构
- **统一模块管理**: ModuleRegistry 统一管理所有增强模块
- **ModuleEnhancer接口**: 标准化的模块注册、设置和清理流程
- **优雅关闭支持**: 所有模块实现 Close() 方法，确保资源正确释放
- **可扩展性**: 新模块只需实现 ModuleEnhancer 接口即可集成

#### 智能日志系统
- **环境自适应**: 开发环境彩色输出，生产环境JSON格式
- **日志级别**: 开发环境DEBUG，生产环境INFO
- **Fallback机制**: Logger未初始化时自动降级到标准库log
- **缓冲刷新**: 关键位置确保日志完整输出

#### Console控制机制
- **环境默认**: 开发环境允许console，生产环境禁用
- **显式配置**: 通过ALLOW_CONSOLE环境变量覆盖默认行为
- **友好提示**: 禁用时提供清晰的错误信息和解决方案

### 📊 性能对比

| 指标 | Node.js版本 | Go+goja版本 | 提升倍数 |
|------|-------------|-------------|----------|
| 1000并发内存 | 3-10GB | 200-500MB | **6-20x** |
| 请求延迟 | 50-200ms | 5-50ms | **2-10x** |
| 部署大小 | 500MB+ | 50MB | **10x** |
| 启动时间 | 10-30s | 1-3s | **5-10x** |

## 🏗️ 项目结构

```
go-executor/
├── cmd/
│   └── main.go              # 主程序入口，优雅关闭处理
├── config/
│   ├── config.go            # 配置管理，智能并发限制计算
│   ├── database.go          # 🔥 MySQL数据库配置
│   └── redis.go             # 🔥 Redis配置
├── controller/
│   ├── executor_controller.go # HTTP控制器
│   └── token_controller.go    # 🔥 Token管理控制器
├── middleware/              # 🔥 中间件
│   ├── auth.go              # Token认证中间件
│   ├── admin_auth.go        # 管理员认证中间件
│   └── rate_limiter.go      # 限流中间件
├── model/
│   ├── request.go           # 请求模型
│   ├── response.go          # 响应模型
│   ├── executor.go          # 执行器模型
│   ├── token.go             # 🔥 Token数据模型
│   └── rate_limit.go        # 🔥 限流数据模型
├── repository/              # 🔥 数据访问层
│   └── token_repository.go  # Token数据访问
├── service/
│   ├── executor_service.go  # 执行器核心服务
│   ├── executor_helpers.go  # 辅助方法
│   ├── module_registry.go   # 模块注册器（统一管理）
│   ├── cache_service.go     # 🔥 混合缓存服务（内存+Redis）
│   ├── token_service.go     # 🔥 Token业务逻辑
│   ├── rate_limiter_service.go    # 🔥 限流业务逻辑
│   └── rate_limiter_tiers.go      # 🔥 三层限流存储
├── router/
│   └── router.go            # 路由配置（集成认证和限流）
├── utils/
│   ├── logger.go            # 日志系统
│   ├── lru_cache.go         # LRU缓存
│   ├── generic_lru_cache.go # 泛型LRU缓存
│   ├── code_analyzer.go     # 代码分析器
│   └── string_helper.go     # 🔥 字符串辅助函数
├── enhance_modules/         # 模块增强器
│   ├── buffer_enhancement.go     # Buffer API实现
│   ├── crypto_enhancement.go     # Crypto双模块实现
│   ├── fetch_enhancement.go      # Fetch API实现
│   ├── axios_enhancement.go      # Axios兼容层
│   ├── datefns_enhancement.go    # Date-fns支持
│   ├── lodash_enhancement.go     # Lodash工具库
│   ├── qs_enhancement.go         # QS查询字符串
│   ├── pinyin_enhancement.go     # 拼音转换
│   ├── uuid_enhancement.go       # UUID生成
│   ├── xlsx_enhancement.go       # ⭐ XLSX Excel操作
│   ├── formdata_streaming.go     # FormData流式处理
│   ├── formdata_nodejs.go        # FormData Node.js兼容
│   ├── blob_file_api.go          # Blob/File对象
│   └── body_types.go             # HTTP请求体类型
├── scripts/
│   └── init.sql             # 🔥 数据库初始化脚本
├── assets/
│   ├── embedded.go          # 嵌入式资源
│   ├── crypto-js.min.js     # CryptoJS库
│   ├── axios.js             # Axios库
│   └── external-libs/       # 其他外部库
├── utils/
│   ├── code_analyzer.go     # 代码分析器（智能路由）
│   ├── lru_cache.go         # LRU缓存
│   ├── generic_lru_cache.go # 通用LRU缓存（验证缓存）
│   └── logger.go            # 🔥 智能日志系统
├── test/                    # 完整的测试套件
│   ├── axios/               # Axios测试（27个用例）
│   ├── Buffer/              # Buffer测试
│   ├── crypto/              # Crypto测试
│   ├── fetch/               # Fetch API测试
│   ├── xlsx/                # XLSX测试（31个用例）
│   └── ...                  # 其他功能测试
├── go.mod                   # Go模块定义
├── Dockerfile               # Docker镜像构建
├── docker-compose.yml       # Docker编排配置
├── env.example              # 环境变量示例
├── ENHANCED_MODULES.md      # 模块增强文档
├── CONSOLE_CONTROL_FEATURE.md # Console控制功能文档
├── GRACEFUL_SHUTDOWN_FINAL_REPORT.md # 优雅关闭实施报告
└── README.md                # 项目文档
```

## 🚀 快速开始

### 方式1: 直接运行

```bash
# 1. 安装依赖
go mod tidy

# 2. 启动服务（开发模式）
go run cmd/main.go

# 或者编译后运行
go build -o flow-codeblock-go cmd/main.go
./flow-codeblock-go

# 3. 测试接口
curl -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d '{
    "input": {"name": "World", "count": 5},
    "codebase64": "'$(echo 'return "Hello " + input.name + "! Count: " + input.count;' | base64)'"
  }'
```

### 方式2: Docker部署 ⭐

#### 开发环境（本地测试）

```bash
# 使用一键启动脚本（推荐）
./dev_start.sh

# 或手动启动
docker-compose up -d
docker-compose logs -f
```

#### 生产环境

```bash
# 使用一键部署脚本（推荐）
./deploy_production.sh

# 或手动部署
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f
```

📚 **详细文档**:
- [Docker 环境配置对比](DOCKER_ENVIRONMENTS.md) - 开发/生产/测试环境详细说明
- [生产环境部署指南](PRODUCTION_DEPLOYMENT.md) - 完整的生产部署流程
- [旧版 Docker 文档](DOCKER.md) - 基础 Docker 使用说明

### 方式3: 使用环境变量

```bash
# 复制环境变量示例文件
cp env.example .env

# 编辑配置（可选）
# vim .env

# 使用环境变量启动
export $(cat .env | xargs)
go run cmd/main.go
```

## 📡 API接口

### POST /flow/codeblock - 执行JavaScript代码

**请求格式:**
```json
{
  "input": {
    "name": "Go+goja",
    "numbers": [1, 2, 3, 4, 5]
  },
  "codebase64": "cmV0dXJuICJIZWxsbyAiICsgaW5wdXQubmFtZTs="
}
```

**成功响应:**
```json
{
  "success": true,
  "result": "Hello Go+goja",
  "executionId": "a1b2c3d4e5f6g7h8",
  "timing": {
    "executionTime": 15,
    "totalTime": 15
  },
  "timestamp": "2024-01-01T10:30:00Z"
}
```

**错误响应:**
```json
{
  "success": false,
  "error": {
    "type": "SecurityError",
    "message": "代码包含危险模式 'eval(': eval函数可执行任意代码"
  },
  "timing": {
    "executionTime": 2,
    "totalTime": 2
  },
  "timestamp": "2024-01-01T10:30:00Z"
}
```

**错误类型:**
- `ValidationError`: 参数验证错误（缺少return语句、代码过长等）
- `SecurityError`: 安全检查失败（危险函数、危险模块等）
- `SyntaxError`: 语法错误
- `ReferenceError`: 引用错误（变量未定义）
- `TypeError`: 类型错误
- `RuntimeError`: 运行时错误
- `TimeoutError`: 执行超时
- `ConcurrencyError`: 系统繁忙
- `ConsoleDisabledError`: Console被禁用

### GET /flow/health - 健康检查（详细）

**响应示例:**
```json
{
  "status": "healthy",
  "service": "flow-codeblock-go",
  "version": "2.0",
  "timestamp": "2024-01-01T10:30:00Z",
  "runtime": {
    "poolSize": 100,
    "maxConcurrent": 1000,
    "currentExecutions": 5,
    "totalExecutions": 1520,
    "successRate": "98.5%"
  },
  "memory": {
    "alloc": "45.2MB",
    "totalAlloc": "1.2GB",
    "sys": "128.5MB",
    "numGC": 23
  },
  "warmup": {
    "status": "completed",
    "modules": ["crypto-js", "axios", "date-fns", "lodash", "qs", "pinyin", "uuid"],
    "totalModules": 7,
    "successCount": 7,
    "elapsed": "125ms",
    "timestamp": "2024-01-01T10:00:00Z"
  }
}
```

### GET /flow/status - 执行统计（兼容Node.js版本）

**响应示例:**
```json
{
  "success": true,
  "status": "running",
  "uptime": 3600.5,
  "startTime": "2024-01-01T10:00:00Z",
  "nodeVersion": "go1.24.3",
  "memory": {
    "rss": "128.5MB",
    "heapUsed": "45.2MB",
    "heapTotal": "64.0MB",
    "external": "8.3MB",
    "executor": "go-goja",
    "executorStats": {
      "currentExecutions": 5,
      "maxConcurrent": 1000,
      "queueLength": 0,
      "total": 1520,
      "successful": 1498,
      "failed": 22,
      "successRate": "98.5%",
      "syncExecutions": 1200,
      "asyncExecutions": 320
    }
  },
  "cache": {
    "codeCompilation": {
      "size": 85,
      "maxSize": 100,
      "hitRate": 65.2
    },
    "codeValidation": {
      "size": 90,
      "maxSize": 100,
      "hitRate": 72.8
    },
    "runtimePoolHealth": {
      "totalRuntimes": 100,
      "healthyRuntimes": 98
    }
  },
  "limits": {
    "executionTimeout": "300s",
    "maxCodeLength": "65535字节 (64KB)",
    "maxConcurrent": 1000,
    "maxResultSize": "5MB"
  },
  "timestamp": "2024-01-01T10:30:00Z"
}
```

### GET /flow/limits - 系统限制信息

获取系统资源限制配置。

### GET /health - 简单健康检查

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:30:00Z",
  "service": "flow-codeblock-go",
  "version": "2.0"
}
```

### GET / - API信息

获取服务基本信息和可用端点。

## 🔧 配置参数

通过环境变量配置（参见 `env.example`）：

### 运行环境配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `ENVIRONMENT` | production | 运行环境：development 或 production |
| `ALLOW_CONSOLE` | （根据环境） | 显式控制是否允许console输出 |
| `PORT` | 3002 | HTTP服务端口 |
| `GIN_MODE` | release | Gin运行模式 |

**Console控制说明**：
- `development` 环境：默认允许 console（便于调试）
- `production` 环境：默认禁用 console（提升性能）
- `ALLOW_CONSOLE` 可显式覆盖：true/false, 1/0, yes/no, on/off

### Runtime池配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `RUNTIME_POOL_SIZE` | 100 | 初始Runtime池大小 |
| `MIN_RUNTIME_POOL_SIZE` | 50 | 最小池大小（动态收缩下限） |
| `MAX_RUNTIME_POOL_SIZE` | 200 | 最大池大小（动态扩展上限） |
| `RUNTIME_IDLE_TIMEOUT_MIN` | 5 | Runtime空闲超时（分钟） |

### 并发和资源限制

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `MAX_CONCURRENT_EXECUTIONS` | （智能计算） | 最大并发执行数 |
| `MAX_CODE_LENGTH` | 65535 | 代码长度限制(64KB) |
| `MAX_INPUT_SIZE` | 2097152 | 输入数据限制(2MB) |
| `MAX_RESULT_SIZE` | 5242880 | 结果大小限制(5MB) |
| `EXECUTION_TIMEOUT_MS` | 300000 | 执行超时(300秒) |

**智能并发限制**：
- 基于系统内存自动计算最优并发数
- 考虑CPU核心数和可用内存
- 每个请求平均占用10MB内存
- 自动设置合理边界（100-2000）

### 缓存配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `CODE_CACHE_SIZE` | 100 | LRU代码缓存大小 |

### Fetch API配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `FETCH_TIMEOUT_MS` | 30000 | Fetch请求超时(30秒) |
| `MAX_FORMDATA_SIZE_MB` | 100 | FormData最大大小(MB) |
| `MAX_FILE_SIZE_MB` | 50 | 单文件最大大小(MB) |
| `FORMDATA_STREAMING_THRESHOLD_MB` | 1 | 流式处理阈值(MB) |
| `FORMDATA_BUFFER_SIZE` | 2097152 | FormData缓冲区大小 |
| `ENABLE_CHUNKED_UPLOAD` | 1 | 启用分块上传 |
| `MAX_BLOB_FILE_SIZE_MB` | 100 | Blob/File最大大小(MB) |

### Go运行时配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `GOMAXPROCS` | CPU核心数 | Go最大处理器数 |
| `GOGC` | 100 | GC目标百分比 |

### 推荐配置场景

**低负载（开发/测试）:**
```bash
ENVIRONMENT=development
MIN_RUNTIME_POOL_SIZE=20
MAX_RUNTIME_POOL_SIZE=50
RUNTIME_IDLE_TIMEOUT_MIN=3
MAX_CONCURRENT_EXECUTIONS=100
```

**中等负载（小型生产）:**
```bash
ENVIRONMENT=production
MIN_RUNTIME_POOL_SIZE=50
MAX_RUNTIME_POOL_SIZE=150
RUNTIME_IDLE_TIMEOUT_MIN=5
MAX_CONCURRENT_EXECUTIONS=500
```

**高负载（大型生产）:**
```bash
ENVIRONMENT=production
MIN_RUNTIME_POOL_SIZE=100
MAX_RUNTIME_POOL_SIZE=300
RUNTIME_IDLE_TIMEOUT_MIN=10
MAX_CONCURRENT_EXECUTIONS=1000
```

**极高负载（企业级）:**
```bash
ENVIRONMENT=production
MIN_RUNTIME_POOL_SIZE=200
MAX_RUNTIME_POOL_SIZE=500
RUNTIME_IDLE_TIMEOUT_MIN=15
MAX_CONCURRENT_EXECUTIONS=2000
```

## 🧪 压力测试

### 运行压测

```bash
# 1. 启动服务
go run cmd/main.go

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
✅ **模块生态**: 已支持主流npm模块（Buffer、Crypto、Axios、Lodash等）  
✅ **智能路由**: 自动选择最佳执行策略（同步/异步）  
✅ **智能日志**: 环境自适应，开发生产两种模式
✅ **优雅关闭**: 完整的资源清理机制

### 限制

⚠️ **进度事件**: 文件上传/下载进度事件不支持  
⚠️ **调试体验**: 相比Node.js调试工具较少  

### 已支持的功能

✅ **核心模块**
- Buffer (100% Node.js API兼容)
- Crypto (Go原生 + crypto-js双模块)
- URL/URLSearchParams
- Process (受限版本)

✅ **HTTP客户端**
- Fetch API (完整实现)
- Axios (95%+ API兼容)
- FormData (流式处理)
- AbortController (请求取消)

✅ **工具库**
- Date-fns (日期处理)
- Lodash (工具函数)
- QS (查询字符串)
- Pinyin (拼音转换)
- UUID (UUID生成)
- XLSX (Excel文件处理，Go原生实现)

✅ **异步支持**
- Promise/then/catch
- async/await (goja v2025-06-30+)
- setTimeout/setInterval
- EventLoop (goja_nodejs)

✅ **安全特性**
- 代码解析级安全检查
- 危险函数/模块禁用
- 友好错误提示
- 执行超时保护
- 6层沙箱防护

## 🛠️ 开发计划

### 第一阶段 ✅ (已完成)
- [x] 基础JavaScript执行器
- [x] Runtime池管理（支持动态扩缩容）
- [x] HTTP API接口
- [x] 安全沙箱（代码解析级检查）
- [x] 1000并发压测
- [x] 智能执行路由（同步/异步自动识别）
- [x] LRU代码缓存

### 第二阶段 ✅ (已完成)
- [x] 常用模块兼容层 (Buffer, Crypto, Fetch, Axios, Lodash等)
- [x] FormData流式处理
- [x] Blob/File对象实现
- [x] XLSX Excel处理模块（Go原生高性能实现）
- [x] 代码编译缓存优化
- [x] 模块嵌入式部署
- [x] 动态Runtime池健康管理
- [x] 文件大小限制机制（6层防护）
- [x] 模块注册器架构（统一管理）
- [x] 智能日志系统
- [x] Console控制功能
- [x] 优雅关闭支持（Graceful Shutdown）
- [x] 智能并发限制计算

### 第三阶段 ✅ (已完成 - v2.1)
- [x] 认证和限流机制（Token认证 + 管理员认证）
- [x] 三层限流架构（热/温/冷数据层）
- [x] 混合缓存系统（内存LRU + Redis）
- [x] Token管理接口（创建/查询/更新/删除）
- [x] 缓存和限流统计接口
- [x] 降级保护机制（Redis/MySQL故障自动降级）
- [x] 完整测试覆盖（25684+测试，100%通过）
- [x] 支持1000+并发（实测通过）

### 第四阶段 (长期规划)
- [ ] 性能持续优化
- [ ] 监控和日志系统完善
- [ ] 分布式执行支持
- [ ] WebAssembly模块支持

## 📚 文档

### 核心文档
- **[ENHANCED_MODULES.md](ENHANCED_MODULES.md)** - 完整的模块增强文档
- **[认证和限流快速开始](认证和限流快速开始指南.md)** ⭐ 认证和限流功能使用指南
- **[认证和限流实施方案](认证和限流实现方案评估.md)** - 详细的技术架构文档（37页）
- **[CONSOLE_CONTROL_FEATURE.md](CONSOLE_CONTROL_FEATURE.md)** - Console控制功能文档
- **[GRACEFUL_SHUTDOWN_FINAL_REPORT.md](GRACEFUL_SHUTDOWN_FINAL_REPORT.md)** - 优雅关闭实施报告
- **[env.example](env.example)** - 环境变量配置示例

### 模块文档
- **[XLSX README](test/xlsx/README.md)** - ⭐ XLSX模块使用指南
- **[Axios测试套件](test/axios/)** - Axios完整测试用例

### 测试文档
- **[测试报告](测试报告.md)** - 功能测试报告（20个测试，100%通过）
- **[压力测试完整报告](压力测试完整报告.md)** - 压力测试详细分析
- **[高并发测试报告](高并发测试报告.md)** - 500和1000并发测试报告
- **[Bug修复和压力测试总结](Bug修复和压力测试总结.md)** - Bug修复总结
- **[最终测试完成报告](最终测试完成报告.md)** - 完整测试总结（25684+测试）
- **[测试用例](test/)** - 完整的功能测试示例
- **[XLSX测试套件](test/xlsx/)** - XLSX模块测试(31个测试，100%通过)

## 🔐 认证和限流使用

### 快速开始

#### 1. 启动服务（需要MySQL和Redis）

```bash
# 使用Docker Compose启动依赖
docker-compose -f docker-compose.test.yml up -d

# 初始化数据库
mysql -u flow_user -pflow_password < scripts/init.sql

# 配置环境变量
export DB_HOST=localhost
export DB_USER=flow_user
export DB_PASSWORD=flow_password
export ADMIN_TOKEN=qingflow7676
export REDIS_ENABLED=true

# 启动服务
./flow-codeblock-go
```

#### 2. 创建Token（需要管理员认证）

```bash
curl -X POST http://localhost:3002/flow/tokens \
  -H "accessToken: qingflow7676" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "my_workspace",
    "email": "user@example.com",
    "operation": "add",
    "days": 30,
    "rate_limit_per_minute": 60,
    "rate_limit_burst": 10
  }'
```

**响应：**
```json
{
  "success": true,
  "data": {
    "access_token": "flow_a1b2c3d4e5f6...",
    "ws_id": "my_workspace",
    "email": "user@example.com",
    "expires_at": "2025-11-04T10:00:00Z",
    "rate_limit_per_minute": 60,
    "rate_limit_burst": 10
  }
}
```

#### 3. 使用Token执行代码

```bash
curl -X POST http://localhost:3002/flow/codeblock \
  -H "accessToken: flow_a1b2c3d4e5f6..." \
  -H "Content-Type: application/json" \
  -d '{
    "codebase64": "Y29uc3QgcmVzdWx0ID0gaW5wdXQuYSArIGlucHV0LmI7CnJldHVybiByZXN1bHQ7",
    "input": {"a": 10, "b": 20}
  }'
```

**响应（包含限流信息）：**
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 2025-10-05T10:01:00Z
X-RateLimit-Burst-Limit: 10

{
  "success": true,
  "result": 30,
  "timing": {
    "executionTime": 0,
    "totalTime": 0
  }
}
```

### API端点

#### 公开端点（无需认证）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/health` | 简单健康检查 |
| GET | `/` | API信息 |

#### 用户端点（需要Token认证）

| 方法 | 路径 | 描述 | 限流 |
|------|------|------|------|
| POST | `/flow/codeblock` | 执行JavaScript代码 | ✅ 基于Token配置 |

#### 管理端点（需要管理员认证）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/flow/health` | 详细健康检查 |
| GET | `/flow/status` | 执行统计信息 |
| GET | `/flow/limits` | 系统限制信息 |
| POST | `/flow/tokens` | 创建Token |
| GET | `/flow/tokens` | 查询Token |
| PUT | `/flow/tokens/:token` | 更新Token |
| DELETE | `/flow/tokens/:token` | 删除Token |
| GET | `/flow/cache/stats` | 缓存统计 |
| GET | `/flow/rate-limit/stats` | 限流统计 |

### 性能指标

**经过25684+次测试验证：**

| 指标 | 数值 |
|------|------|
| 最高QPS | 364 (1000并发) |
| 最低延迟 | 2.74ms (1000并发) |
| 缓存命中率 | 100% |
| 支持并发 | 1000+ |
| 测试通过率 | 100% |

**多实例扩展：**
- 10实例：3000-5000 QPS
- 20实例：6000-10000 QPS

---

## 💡 代码示例

### 1. 基础同步执行
```javascript
const result = input.numbers.reduce((sum, n) => sum + n, 0);
return { 
  sum: result,
  average: result / input.numbers.length 
};
```

### 2. 使用Crypto模块
```javascript
const crypto = require('crypto');

// 哈希计算
const hash = crypto.createHash('sha256')
  .update('Hello World')
  .digest('hex');

// HMAC
const hmac = crypto.createHmac('sha256', 'secret-key')
  .update('message')
  .digest('hex');

// RSA加密
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048
});

const encrypted = crypto.publicEncrypt(publicKey, Buffer.from('secret'));
const decrypted = crypto.privateDecrypt(privateKey, encrypted);

return { hash, hmac, decrypted: decrypted.toString() };
```

### 3. 使用Axios发送HTTP请求
```javascript
const axios = require('axios');

return new Promise((resolve) => {
  setTimeout(() => {
    axios.get('https://api.github.com/users/github')
      .then(response => {
        resolve({
          name: response.data.name,
          followers: response.data.followers
        });
      });
  }, 100);
});
```

### 4. 使用Lodash处理数据
```javascript
const _ = require('lodash');

const users = input.users;
const grouped = _.groupBy(users, 'role');
const sorted = _.orderBy(users, ['age'], ['desc']);

return {
  grouped,
  oldest: sorted[0]
};
```

### 5. FormData文件上传
```javascript
const axios = require('axios');
const FormData = require('form-data');

const formData = new FormData();
formData.append('name', 'document');
formData.append('type', 'pdf');

return axios.post('https://api.example.com/upload', formData, {
  headers: formData.getHeaders()
}).then(response => response.data);
```

### 6. Excel文件处理
```javascript
const xlsx = require('xlsx');
const axios = require('axios');

return new Promise((resolve) => {
  setTimeout(() => {
    // 从 OSS 下载 Excel
    axios.get(input.excelUrl, { responseType: 'arraybuffer' })
      .then(response => {
        const buffer = Buffer.from(response.data);
        
        // 读取并处理
        const workbook = xlsx.read(buffer);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);
        
        // 业务逻辑处理
        const processed = data
          .filter(row => row.amount > 1000)
          .map(row => ({
            ...row,
            tax: row.amount * 0.1,
            total: row.amount * 1.1
          }));
        
        // 生成新 Excel
        const newWorkbook = xlsx.utils.book_new();
        const newSheet = xlsx.utils.json_to_sheet(processed);
        xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'Processed');
        
        const outputBuffer = xlsx.write(newWorkbook, { type: 'buffer' });
        
        // 上传到 OSS
        return axios.put(input.targetUrl, outputBuffer, {
          headers: { 
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        });
      })
      .then(() => {
        resolve({ success: true, count: processed.length });
      });
  }, 100);
});
```

### 7. Excel大文件流式处理
```javascript
const xlsx = require('xlsx');

// 假设从 URL 下载了大文件（100MB）
const buffer = largeExcelBuffer;

let totalAmount = 0;
let count = 0;

// 流式读取（内存占用低）
xlsx.readStream(buffer, 'Sheet1', (row) => {
  const amount = parseFloat(row.Amount) || 0;
  if (amount > 5000) {
    totalAmount += amount;
    count++;
  }
});

return {
  highValueCount: count,
  totalAmount,
  average: totalAmount / count
};
```

### 8. async/await 语法支持
```javascript
const axios = require('axios');

// 直接使用 async/await（goja v2025-06-30+ 支持）
async function fetchUserData() {
  const response = await axios.get('https://api.example.com/user/123');
  return response.data;
}

return await fetchUserData();
```

## 🔍 故障排查

### Runtime池相关

**问题：服务启动后内存占用高**
- 检查 `RUNTIME_POOL_SIZE` 和 `MAX_RUNTIME_POOL_SIZE` 配置
- 减少初始池大小，依赖动态扩展
- 调整 `RUNTIME_IDLE_TIMEOUT_MIN` 加快空闲Runtime释放

**问题：高并发时出现超时**
- 增加 `MAX_CONCURRENT_EXECUTIONS` 
- 增加 `MAX_RUNTIME_POOL_SIZE`
- 检查代码是否有性能瓶颈
- 查看 `/flow/status` 接口的并发统计

### 代码执行相关

**问题：提示 "代码中缺少 return 语句"**
- 确保代码中包含至少一个 `return` 语句
- 不能只使用 `console.log()`，必须返回结果

**问题：async/await 语法支持**
- ✅ 完全支持 async/await (goja v2025-06-30+)
- 可以直接使用 `async function` 和 `await` 表达式
- 也可以继续使用 Promise 链式调用（向后兼容）

**问题：提示 "禁止使用 fs 模块"**
- 出于安全考虑，文件系统模块已被禁用
- 使用HTTP请求或其他方式替代文件操作

**问题：console不可用**
- 检查 `ENVIRONMENT` 和 `ALLOW_CONSOLE` 配置
- 开发环境默认允许，生产环境默认禁用
- 可通过 `ALLOW_CONSOLE=true` 显式启用
- 详见 [Console控制功能文档](CONSOLE_CONTROL_FEATURE.md)

### 性能相关

**问题：代码执行较慢**
- 检查是否使用了同步代码（同步代码性能更好）
- 查看 `/flow/status` 接口的 `syncExecutions` 和 `asyncExecutions` 比例
- 考虑启用代码缓存（默认已启用）
- 查看缓存命中率（应 > 60%）

**问题：内存持续增长**
- 检查是否有内存泄漏的代码
- 调整 `GOGC` 参数控制GC频率
- 查看 `/flow/health` 接口的内存统计

### Excel/文件上传相关

**问题：Excel 文件上传失败，提示 "文件大小超过限制"**
- 检查文件大小是否超过 `MAX_FILE_SIZE_MB`（默认50MB）
- 检查 `MAX_FORMDATA_SIZE_MB`（默认100MB）
- 检查 `MAX_BLOB_FILE_SIZE_MB`（默认100MB）
- 调整相应的环境变量配置

**问题：大Excel文件处理内存占用高**
- 使用流式API：`xlsx.readStream()` 或 `xlsx.createWriteStream()`
- 流式处理可降低80%内存占用
- 大文件（> 10MB）建议使用流式模式

**问题：Excel 文件下载超时**
- 增加 `EXECUTION_TIMEOUT_MS`（大文件建议600000 = 10分钟）
- 检查网络连接质量
- 使用 axios 而非 fetch（axios有更严格的超时控制）

### 日志相关

**问题：日志未输出或不完整**
- 检查 `ENVIRONMENT` 配置（development/production）
- 开发环境：彩色输出，DEBUG级别
- 生产环境：JSON格式，INFO级别
- 日志系统有fallback机制，未初始化时自动降级

**问题：关闭日志未显示**
- 优雅关闭过程中的日志会被刷新
- 如需查看详细关闭日志，使用 `docker-compose logs`
- 参考 [优雅关闭实施报告](GRACEFUL_SHUTDOWN_FINAL_REPORT.md)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

### 贡献指南
1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

---

**⚡ Go + goja = 高性能 + 简单部署 + 低资源消耗**

**📦 支持主流npm模块 + 智能执行路由 + 动态资源管理**

**🏗️ 模块化架构 + 统一管理 + 优雅关闭**
