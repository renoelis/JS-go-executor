# Flow-CodeBlock Go版本

基于Go+goja的高性能JavaScript代码执行器，专为高并发、低延迟场景设计。

## 📖 快速导航

- [🚀 核心特性](#-核心特性) | [📊 性能对比](#-性能对比) | [🎨 在线测试工具](#-在线测试工具)
- [🏗️ 项目结构](#️-项目结构) | [🚀 快速开始](#-快速开始) | [📡 API接口](#-api接口)
- [🔧 配置参数](#-配置参数) | [💡 代码示例](#-代码示例) | [📚 完整文档](#-文档) | [🔍 故障排查](#-故障排查)

## 🚀 核心特性

### ⚡ 超高性能
- **1000+并发支持**: 每个goroutine仅占用2KB内存
- **低延迟响应**: 5-50ms响应时间
- **智能执行路由**: 同步代码用Runtime池，异步代码用EventLoop
- **动态Runtime池**: 自动扩缩容(最小50-最大200)，空闲超时释放
- **LRU代码缓存**: 编译后的代码自动缓存，避免重复编译
- **智能并发限制**: 基于系统内存自动计算最优并发数

### 📊 统计分析功能 (v2.5+)
- **模块使用统计**: 实时追踪各模块使用频率、成功率、活跃天数
- **用户活跃度分析**: 按天/范围统计用户调用次数、模块使用情况
- **执行详情记录**: 完整记录每次执行的模块、耗时、状态等
- **智能聚合**: 自动按天聚合统计数据，支持单日/范围查询
- **可视化友好**: JSON格式响应，易于接入图表系统
- **异步记录**: 统计写入不阻塞主流程，零性能影响

### 🛡️ 安全沙箱

#### 代码层安全
- **危险函数禁用**: eval、globalThis、window、self 等危险函数被完全禁用
- **危险模块禁用**: fs、path、child_process等模块被拦截
- **代码解析级检查**: 在执行前检测危险模式和不支持语法
- **多层沙箱防护**: 5层防护机制（Function.constructor 删除、Function 冻结、Reflect/Proxy 禁用）
- **白名单策略**: 保留必要的 prototype.constructor 以支持库功能（lodash, date-fns 等）
- **静态代码分析**: 检测用户代码中的 constructor 访问，防止恶意利用
- **无限循环检测 (v2.4+)**: 智能检测 while(true)/while(1)/for(;;)/do-while，排除注释和字符串中的误判
- **资源限制**: 代码长度、执行时间、输入输出大小限制
- **友好错误提示**: 中文错误消息和模块引入建议

#### 网络层安全 (v2.5.1+)
- **SSRF 防护**: 防止服务端请求伪造攻击，保护内网资源
- **智能环境判断**: 根据部署环境自动启用/禁用防护
  - 公有云（production）: 自动启用，禁止访问私有 IP
  - 本地开发（development）: 自动禁用，允许访问内网
- **私有 IP 拦截**: 阻止访问 127.0.0.1, 10.x.x.x, 172.16-31.x.x, 192.168.x.x
- **云平台保护**: 阻止访问云平台元数据服务（AWS/阿里云/腾讯云）
- **DNS 重绑定防护**: 解析域名后检查所有 IP，防止绕过
- **灵活配置**: 支持本地/私有云部署时允许内网访问

### 🔐 认证和限流 (v2.1+)
- **Token认证**: 基于数据库的Token认证机制，支持过期时间管理
- **管理员认证**: 独立的管理员Token，用于管理接口访问控制
- **三层限流**: 热/温/冷数据层架构，95%+缓存命中率
- **动态限流**: 支持每秒突发限制和每分钟窗口限制
- **混合缓存**: 内存LRU + Redis，响应时间< 1ms
- **降级保护**: Redis故障自动降级，连续错误自动禁用
- **完善监控**: 缓存统计、限流统计、命中率分析

### 🔒 CORS 跨域控制 (v2.3+)
- **智能识别**: 自动识别服务端调用（无Origin头）vs 前端调用（有Origin头）
- **多层策略**: 
  - 🔓 **服务端调用**：始终允许（无 Origin 头）
  - 🔓 **同域前端**：始终允许（无论是否配置白名单）
  - 🔓 **白名单域名**：允许配置额外的可信域名
  - 🔒 **其他跨域**：一律拒绝
- **白名单机制**: 通过 `ALLOWED_ORIGINS` 环境变量配置额外可信域名
- **灵活配置**: 支持逗号分隔多个域名，适配开发、测试、生产等不同环境
- **安全审计**: 拒绝跨域请求时自动记录日志，便于安全审计

**配置示例**：
```bash
# 生产环境（推荐）：只允许服务端和同域调用
ALLOWED_ORIGINS=

# 开发环境：额外允许本地前端调用（服务端和同域仍然允许）
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# 生产环境（有独立前端域名）：额外允许可信域名（服务端和同域仍然允许）
ALLOWED_ORIGINS=https://your-frontend.com,https://admin.your-company.com
```

**重要说明**：
- ✅ **服务端调用和同域前端始终可以访问**，无论 `ALLOWED_ORIGINS` 如何配置
- ✅ `ALLOWED_ORIGINS` 用于**额外**允许其他可信域名的跨域访问
- ❌ 未在白名单中的跨域请求会被拒绝（403）

### 📦 丰富的模块生态

#### 核心模块
- **Buffer**: 100% Node.js Buffer API兼容，无缝数据转换
- **Crypto**: Go原生crypto + crypto-js双模块(77+方法)，支持RSA/AES/HMAC等
- **Fetch API**: 完整的现代Fetch API实现，支持所有HTTP方法
- **Axios**: 基于Fetch的axios兼容层(95%+ API兼容)，推荐用于文件操作

#### 工具库
- **Date-fns**: 完整的date-fns库支持，时间处理利器（预加载）
- **Lodash**: 工具函数库，数据处理必备（按需加载）
- **QS**: 查询字符串解析和序列化（预加载）
- **UUID**: UUID生成(v1/v4)（按需加载）
- ~~**Pinyin**: 中文拼音转换~~ (v2.2已移除，节省 1.6GB 内存)

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

### 🎨 在线测试工具

Flow-CodeBlock 提供了一个功能强大的**在线测试工具**，无需编写 API 请求代码即可快速测试和调试 JavaScript 代码执行。

#### 访问地址
```
http://your-server:3002/flow/test-tool
```

#### 核心功能
- ✅ **专业代码编辑器**: 集成 Ace Editor，支持语法高亮、代码补全、实时错误检查
- ✅ **全屏编辑模式**: 一键切换大屏编辑，提供更舒适的代码编写体验（500px 高度 + 全屏模式）
- ✅ **完整示例库**: 预置 8 种完整示例（简单计算、Axios 请求、Fetch API、Lodash、加密、日期处理、XLSX 处理等）
- ✅ **Token 查询**: 通过 ws_id 和 email 快速查询和填充 Access Token（支持单/多 Token 智能展示）
- ✅ **Base64 编解码**: 内置编解码工具，支持一键复制和验证
- ✅ **实时执行结果**: 黑色终端风格的结果展示区，支持语法高亮和 JSON 格式化
- ✅ **响应式设计**: 桌面两栏布局，移动端自动切换单栏，完美适配各种设备
- ✅ **环境变量配置**: 支持通过环境变量自定义 API URL、外部链接等
- ✅ **⏹️ 取消执行功能** (v2.4.5+): 支持取消长时间运行的代码，按钮智能切换运行/取消状态
- ✅ **📱 移动端优化** (v2.4.5+): 完美支持手机和平板访问，单栏布局、大按钮、自适应字体

#### 配置说明

通过环境变量自定义测试工具（详见 `TEST_TOOL_CONFIG.md`）：

```bash
# API 服务地址
TEST_TOOL_API_URL=http://localhost:3002/flow/codeblock

# 外部链接
TEST_TOOL_AI_URL=https://qingflow.com/pc-ultron/share/agent/289302286342078465
TEST_TOOL_HELP_URL=https://exiao.yuque.com/ixwxsb/cqfg2y/or5052bo2dtukro2
TEST_TOOL_APPLY_URL=https://qingflow.com/f/9cah24om6402
TEST_TOOL_EXAMPLE_URL=https://exiao.yuque.com/rlf3k1/oanb79/tlty7ic7szfr2v7v?singleDoc#
```

#### 预置代码示例

| 示例类型 | 功能说明 | 使用场景 |
|---------|---------|---------|
| 简单计算 | 基础数据处理和计算 | 入门学习 |
| Axios 请求 | HTTP GET 请求和数据处理 | API 调用 |
| Fetch API | 现代 Fetch API 使用 | 标准 Web 请求 |
| Lodash | 数据分组和排序 | 复杂数据处理 |
| 数据加密 | SHA256/HMAC 加密 | 安全功能 |
| 日期处理 | Date-fns 日期格式化 | 时间处理 |
| XLSX 读取 | 从 URL 读取 Excel | 表格数据处理 |

#### 使用流程

1. **访问测试工具页面**
2. **查询或输入 Access Token**（点击"查询 Token"按钮，输入 ws_id 和 email）
3. **选择完整示例**（在 Input 参数区点击示例按钮，自动加载 Input 和代码）
4. **编辑代码**（可使用全屏编辑器获得更好体验）
5. **运行测试**（点击"▶️ 运行代码"查看执行结果）
6. **取消执行**（如果代码执行时间过长，点击"⏹️ 取消执行"立即中止）
7. **查看结果**（支持 JSON 格式化和错误信息高亮）

#### 技术特点

- **Ace Editor 本地部署**: 不依赖外部 CDN，国内访问稳定（加载时间 < 20ms）
- **轻量级集成**: 编辑器资源总大小 ~960KB，对性能影响微乎其微
- **智能 Token 管理**: 自动检测单/多 Token 场景，提供最佳用户体验
- **移动端完美适配**: 支持小屏手机(< 375px)、普通手机(375-768px)、平板(769-1024px)、桌面(> 1024px)
- **环境变量驱动**: 所有配置均可通过环境变量修改，无需改代码

### 💾 内存优化（v2.2+）

| 配置 | 20 Runtime | 200 Runtime | Docker 限制 |
|------|-----------|------------|------------|
| 优化配置（推荐） | 88MB (4%) | 900MB-1.5GB | 2GB ✅ |
| 完整预加载 | 570MB (28%) | 5.7GB | 8GB |
| 包含 pinyin | 2GB (100%) ❌ | 21.7GB | 24GB ❌ |

**优化策略**:
- ✅ **共享编译缓存**: 所有模块使用 `sync.Once`，只编译一次
- ✅ **精简预加载**: 只预加载常用小库（date-fns, qs, crypto-js）
- ✅ **按需加载**: 大库和不常用库按需加载（lodash, uuid）
- ✅ **移除 pinyin**: 节省 1.6GB (20 Runtime) 或 16GB (200 Runtime)

## 🏗️ 项目结构

```
Flow-codeblock_goja/
├── cmd/
│   └── main.go              # 主程序入口，优雅关闭处理
├── config/
│   ├── config.go            # 配置管理，智能并发限制计算
│   ├── database.go          # 🔥 MySQL数据库配置
│   └── redis.go             # 🔥 Redis配置
├── controller/
│   ├── executor_controller.go # HTTP控制器 + 测试工具页面
│   ├── token_controller.go    # 🔥 Token管理控制器 + 公开Token查询
│   └── stats_controller.go    # 📊 统计分析控制器
├── middleware/              # 🔥 中间件
│   ├── auth.go              # Token认证中间件
│   ├── admin_auth.go        # 管理员认证中间件
│   ├── rate_limiter.go      # 限流中间件
│   ├── request_id.go        # 请求ID追踪中间件
│   ├── smart_ip_rate_limiter.go  # 智能IP限流
│   └── global_ip_rate_limiter.go # 全局IP限流
├── model/
│   ├── request.go           # 请求模型
│   ├── response.go          # 响应模型
│   ├── executor.go          # 执行器模型
│   ├── token.go             # 🔥 Token数据模型
│   ├── rate_limit.go        # 🔥 限流数据模型
│   ├── api_response.go      # 统一API响应模型
│   ├── stats.go             # 📊 统计数据模型
│   └── stats_response.go    # 📊 统计响应模型
├── repository/              # 🔥 数据访问层
│   └── token_repository.go  # Token数据访问
├── service/
│   ├── executor_service.go  # 执行器核心服务
│   ├── executor_helpers.go  # 辅助方法
│   ├── module_registry.go   # 模块注册器（统一管理）
│   ├── cache_service.go     # 🔥 混合缓存服务（内存+Redis）
│   ├── token_service.go     # 🔥 Token业务逻辑
│   ├── rate_limiter_service.go    # 🔥 限流业务逻辑
│   ├── rate_limiter_tiers.go      # 🔥 三层限流存储
│   ├── stats_service.go     # 📊 统计分析服务
│   └── cache_write_pool.go  # 缓存写入池
├── router/
│   └── router.go            # 路由配置（集成认证和限流）
├── enhance_modules/         # 模块增强器
│   ├── buffer_enhancement.go     # Buffer API实现
│   ├── crypto_enhancement.go     # Crypto双模块实现
│   ├── fetch_enhancement.go      # Fetch API实现
│   ├── axios_enhancement.go      # Axios兼容层
│   ├── datefns_enhancement.go    # Date-fns支持
│   ├── lodash_enhancement.go     # Lodash工具库
│   ├── qs_enhancement.go         # QS查询字符串
│   ├── pinyin_enhancement.go     # 拼音转换（已弃用，v2.2+）
│   ├── uuid_enhancement.go       # UUID生成
│   ├── xlsx_enhancement.go       # ⭐ XLSX Excel操作
│   ├── formdata_streaming.go     # FormData流式处理
│   ├── formdata_nodejs.go        # FormData Node.js兼容
│   ├── blob_file_api.go          # Blob/File对象
│   ├── body_types.go             # HTTP请求体类型
│   └── js_memory_limiter.go      # JavaScript内存限制器
├── scripts/
│   ├── init.sql             # 🔥 数据库初始化脚本（含统计表）
│   ├── stats_tables.sql     # 📊 统计功能数据表
│   ├── check_security.sh    # 安全检查脚本
│   └── test-race.sh         # 竞态条件测试
├── templates/               # 🎨 HTML模板
│   └── test-tool.html       # 在线测试工具页面
├── assets/
│   ├── embedded.go          # 嵌入式资源（包含Ace Editor）
│   ├── codemirror/          # 🎨 Ace Editor本地资源
│   │   ├── ace.js           # Ace编辑器核心
│   │   ├── mode-javascript.js # JavaScript语法模式
│   │   ├── mode-json.js     # JSON语法模式
│   │   ├── theme-monokai.js   # Monokai主题
│   │   ├── worker-javascript.js # JS语法检查Worker
│   │   └── worker-json.js   # JSON语法检查Worker
│   ├── elements/            # UI元素资源
│   │   └── LOGO.png         # Logo图片
│   └── external-libs/       # 其他外部库（6个JS文件）
├── utils/
│   ├── code_analyzer.go     # 代码分析器（智能路由）
│   ├── code_lexer.go        # 代码词法分析器
│   ├── lru_cache.go         # LRU缓存
│   ├── generic_lru_cache.go # 泛型LRU缓存（验证缓存）
│   ├── logger.go            # 🔥 智能日志系统
│   ├── module_parser.go     # 📊 模块解析器（统计用）
│   ├── context_keys.go      # Context键管理
│   ├── string_helper.go     # 字符串辅助函数
│   ├── time_helper.go       # 时间辅助函数
│   ├── response.go          # 响应辅助函数
│   └── ordered_json.go      # 有序JSON处理
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
docker-compose up -d
docker-compose logs -f
```

#### 生产环境

```bash
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f
```

**生产环境配置建议**（200 Runtime）:
```yaml
# docker-compose.prod.yml
memory: 2GB    # 优化后只需 2GB（移除 pinyin 前需要 24GB）
cpus: '2.0'    # 2核 CPU

# env.production
RUNTIME_POOL_SIZE=200
MAX_CONCURRENT_EXECUTIONS=1600
GOGC=100
```

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
    "modules": ["crypto-js", "axios", "date-fns", "lodash", "qs", "uuid"],
    "totalModules": 6,
    "successCount": 6,
    "elapsed": "125ms",
    "timestamp": "2024-01-01T10:00:00Z"
  }
}
```

### GET /flow/status - 执行统计

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

### GET /flow/test-tool - 在线测试工具

访问功能完善的在线测试工具页面，支持可视化代码编辑、执行和调试。

**功能特性:**
- 🎨 专业代码编辑器（Ace Editor，语法高亮、代码补全）
- 📦 8种完整示例（一键加载Input和代码）
- 🔍 Token查询功能（ws_id + email）
- 🔐 Base64编解码工具
- 📊 实时执行结果展示
- 🖥️ 全屏编辑模式

### GET /flow/query-token - 公开Token查询

通过 `ws_id` 和 `email` 查询Token信息（无需管理员认证）。

**请求参数:**
```
GET /flow/query-token?ws_id=my_workspace&email=user@example.com
```

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ws_id": "my_workspace",
      "email": "user@example.com",
      "access_token": "flow_a1b2c3d4...",
      "created_at": "2025-10-06 10:00:00",
      "expires_at": "2025-11-05 10:00:00",
      "is_active": true,
      "rate_limit_per_minute": 60,
      "rate_limit_burst": 10
    }
  ]
}
```

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

| 环境变量 | 默认值 | 说明 | 推荐值 |
|----------|--------|------|--------|
| `RUNTIME_POOL_SIZE` | 100 | 初始Runtime池大小 | 20 (开发) / 200 (生产) |
| `MIN_RUNTIME_POOL_SIZE` | 50 | 最小池大小（动态收缩下限） | 10 (开发) / 100 (生产) |
| `MAX_RUNTIME_POOL_SIZE` | 200 | 最大池大小（动态扩展上限） | 50 (开发) / 200 (生产) |
| `RUNTIME_IDLE_TIMEOUT_MIN` | 5 | Runtime空闲超时（分钟） | 5 |

**内存计算**:
- 每个 Runtime 约占用 13-15MB（不含大库）
- 20 Runtime ≈ 260-300MB
- 200 Runtime ≈ 2.6-3GB（推荐 Docker 限制 4-6GB）

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

### SSRF 防护配置 🛡️

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `ENABLE_SSRF_PROTECTION` | （智能判断） | 是否启用 SSRF 防护 |
| `ALLOW_PRIVATE_IP` | （智能判断） | 是否允许访问私有 IP |

**智能判断规则**：
- `production` 环境：默认启用防护，禁止私有 IP
- `development` 环境：默认禁用防护，允许私有 IP
- 可通过环境变量显式覆盖

**使用场景**：
```bash
# 公有云部署（推荐）
ENABLE_SSRF_PROTECTION=true
ALLOW_PRIVATE_IP=false

# 本地/私有云部署
ENABLE_SSRF_PROTECTION=true
ALLOW_PRIVATE_IP=true

# 开发环境
ENABLE_SSRF_PROTECTION=false
```

### Fetch API配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `FETCH_TIMEOUT_MS` | 30000 | Fetch请求超时(30秒) |
| **下载限制（新方案）** | | |
| `MAX_RESPONSE_SIZE_MB` | 1 | 🔥 缓冲读取限制(arrayBuffer/blob/text/json) |
| `MAX_STREAMING_SIZE_MB` | 100 | 🔥 流式读取限制(getReader) |
| **上传限制（新方案）** | | |
| `MAX_BUFFERED_FORMDATA_MB` | 1 | 🔥 缓冲上传限制(Web FormData+Blob、Node.js form-data+Buffer) |
| `MAX_STREAMING_FORMDATA_MB` | 100 | 🔥 流式上传限制(Node.js form-data+Stream) |
| **其他配置** | | |
| `MAX_FILE_SIZE_MB` | 50 | 单文件最大大小(MB) |
| `FORMDATA_BUFFER_SIZE` | 2097152 | FormData缓冲区大小(字节) |
| `ENABLE_CHUNKED_UPLOAD` | 1 | 启用分块传输编码 |
| `MAX_BLOB_FILE_SIZE_MB` | 100 | Blob/File最大大小(MB) |

### XLSX 模块配置

| 环境变量 | 默认值 | 说明 | 推荐值 |
|----------|--------|------|--------|
| `XLSX_MAX_SNAPSHOT_SIZE_MB` | 5 | Copy-on-Read模式的最大文件大小 | 2MB (低内存) / 5MB (标准) / 10MB (高内存) |
| `XLSX_MAX_ROWS` | 100000 | 🔥 最大行数限制 | 50000 (低内存) / 100000 (标准) / 200000 (高内存) |
| `XLSX_MAX_COLS` | 100 | 🔥 最大列数限制 | 50-200 |

**说明**：
- **文件大小限制**：`xlsx.read()` 会将整个文件加载到内存，超过限制将拒绝并提示使用流式API
- **行数限制**：防止处理超大行数的Excel文件导致内存溢出，流式API也受此限制
- **列数限制**：防止处理超多列的Excel文件导致内存溢出，主要防止恶意构造的文件
- **内存优化**：大文件（> 10MB）或大数据量建议使用 `xlsx.readStream()` 流式处理

### Go运行时配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `GOMAXPROCS` | CPU核心数 | Go最大处理器数 |
| `GOGC` | 100 | GC目标百分比 |

### 熔断器配置 (Circuit Breaker)

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `CIRCUIT_BREAKER_ENABLED` | true | 是否启用熔断器 |
| `CIRCUIT_BREAKER_MIN_REQUESTS` | 100 | 触发熔断的最小请求数 |
| `CIRCUIT_BREAKER_FAILURE_RATIO` | 0.9 | 失败率阈值（0.0-1.0，90%） |
| `CIRCUIT_BREAKER_TIMEOUT_SEC` | 10 | Open状态持续时间（秒） |
| `CIRCUIT_BREAKER_MAX_REQUESTS` | 100 | Half-Open状态探测请求数 |

**熔断器作用**：
- 防止雪崩效应：当系统过载时自动熔断，避免级联故障
- 快速失败：失败率超过阈值时快速拒绝请求，保护系统
- 自动恢复：经过timeout后进入half-open状态，尝试恢复服务

### 测试工具配置 (Test Tool)

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `TEST_TOOL_API_URL` | http://localhost:3002/flow/codeblock | API服务地址 |
| `TEST_TOOL_AI_URL` | https://qingflow.com/... | 轻翼AI助手链接 |
| `TEST_TOOL_HELP_URL` | https://exiao.yuque.com/... | 帮助文档链接 |
| `TEST_TOOL_APPLY_URL` | https://qingflow.com/... | 申请服务链接 |
| `TEST_TOOL_EXAMPLE_URL` | https://exiao.yuque.com/... | 示例文档链接 |

**配置说明**：所有链接均可自定义

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
- Pinyin (拼音转换)，不嵌入使用
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
- SSRF 防护（v2.5.1+）

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

### 第四阶段 ✅ (已完成 - v2.2-2.3)
- [x] 内存优化（移除pinyin，节省95.7%内存）
- [x] 共享编译缓存优化
- [x] 熔断器机制（防止雪崩效应）
- [x] 在线测试工具（Web UI）
  - [x] Ace Editor代码编辑器（本地部署）
  - [x] 8种完整示例库
  - [x] Token查询功能
  - [x] Base64编解码工具
  - [x] 全屏编辑模式
  - [x] 环境变量配置支持
- [x] 公开Token查询API
- [x] 静态资源本地化（Ace Editor ~960KB）

### 第五阶段 ✅ (已完成 - v2.5)
- [x] 📊 统计分析功能
  - [x] 模块使用统计（按天/范围）
  - [x] 用户活跃度分析
  - [x] 执行详情记录
  - [x] 智能聚合和查询
  - [x] 完整的统计API接口
- [x] 🛡️ SSRF 防护功能（v2.5.1）
  - [x] 私有 IP 拦截（127.0.0.1, 10.x, 172.16-31.x, 192.168.x）
  - [x] 云平台元数据服务保护（AWS/阿里云/腾讯云）
  - [x] DNS 重绑定防护
  - [x] 智能环境判断（公有云/本地自动适配）
  - [x] 灵活配置（支持本地部署允许内网）
- [x] 模块解析器（自动识别代码中的require）
- [x] 统一API响应格式
- [x] 请求ID追踪系统

### 第六阶段 (长期规划)
- [ ] 性能持续优化
- [ ] 监控和日志系统完善
- [ ] 统计数据可视化仪表盘
- [ ] 分布式执行支持
- [ ] WebAssembly模块支持
- [ ] 测试工具功能增强（代码版本管理、历史记录等）


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
| GET | `/flow/test-tool` | ⭐ 在线测试工具页面 |
| GET | `/flow/query-token` | Token查询（需要ws_id+email参数） |
| GET | `/flow/assets/*` | 静态资源（Ace Editor等） |

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
| GET | `/flow/stats/modules` | 📊 模块使用统计 |
| GET | `/flow/stats/modules/:module_name` | 📊 特定模块详细统计 |
| GET | `/flow/stats/users` | 📊 用户活跃度统计 |

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

## 📊 统计功能使用

### 快速开始

统计功能可以帮助你了解代码执行的各项指标，包括模块使用情况和用户活跃度。

#### 1. 查询模块使用统计

```bash
# 查询单日模块使用情况
curl -X GET "http://localhost:3002/flow/stats/modules?date=2025-10-15" \
  -H "accessToken: qingflow7676"

# 查询日期范围内的模块使用情况
curl -X GET "http://localhost:3002/flow/stats/modules?start_date=2025-10-01&end_date=2025-10-15" \
  -H "accessToken: qingflow7676"
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_executions": 5526,
      "total_modules": 8,
      "require_usage_rate": "38.1"
    },
    "modules": [
      {
        "module": "axios",
        "usage_count": 1250,
        "success_count": 1232,
        "success_rate": "98.5",
        "percentage": "22.6"
      }
    ]
  }
}
```

#### 2. 查询用户活跃度统计

```bash
# 查询用户活跃度（支持分页）
curl -X GET "http://localhost:3002/flow/stats/users?date=2025-10-15&page=1&page_size=20" \
  -H "accessToken: qingflow7676"

# 查询特定工作空间的用户活跃度
curl -X GET "http://localhost:3002/flow/stats/users?ws_id=my_workspace&start_date=2025-10-01&end_date=2025-10-15" \
  -H "accessToken: qingflow7676"
```

#### 3. 查询特定模块的详细统计

```bash
# 查询 axios 模块的详细使用情况
curl -X GET "http://localhost:3002/flow/stats/modules/axios?start_date=2025-10-01&end_date=2025-10-15" \
  -H "accessToken: qingflow7676"
```

### 统计数据说明

- **模块使用统计**: 显示各模块的使用次数、成功率、占比等
- **用户活跃度**: 显示每个用户的调用次数、模块使用情况
- **执行详情**: 记录每次执行的完整信息（模块、耗时、状态等）

### 数据库表结构

统计功能使用三张表：

1. **code_execution_stats** - 执行详情表（每次执行的完整记录）
2. **module_usage_stats** - 模块使用聚合表（按天统计）
3. **user_activity_stats** - 用户活跃度聚合表（按天统计）

详见 `scripts/stats_tables.sql` 和 `STATS_FEATURE.md`

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

### Runtime池和内存相关

**问题：服务启动后内存占用高**
- 检查 `RUNTIME_POOL_SIZE` 和 `MAX_RUNTIME_POOL_SIZE` 配置
- 减少初始池大小，依赖动态扩展
- 调整 `RUNTIME_IDLE_TIMEOUT_MIN` 加快空闲Runtime释放
- **检查预加载策略**: 移除不需要的大库（v2.2+ 已默认移除 pinyin 等大型库）

**问题：内存使用率接近 100%，容器 OOM**
- ⚠️ **关键**: 检查是否预加载了大型库（如已移除的 pinyin 库曾占用 73% 内存）
- 移除不需要的模块注册（v2.2+ 已移除 pinyin 模块）
- 增加 Docker 内存限制
- 优化预加载策略：只预加载常用小库（date-fns, qs, crypto-js）
- 大库改为按需加载（lodash, uuid）

**问题：高并发时出现超时**
- 增加 `MAX_CONCURRENT_EXECUTIONS` 
- 增加 `MAX_RUNTIME_POOL_SIZE`
- 检查代码是否有性能瓶颈
- 查看 `/flow/status` 接口的并发统计
- 检查内存使用率，确保 < 80%

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

## 📝 版本更新记录

### v2.5.1 (2025-10-15) - SSRF 防护功能 🛡️
- ✨ 新增 SSRF (Server-Side Request Forgery) 防护功能
  - **私有 IP 拦截**: 阻止访问内网地址（127.0.0.1, 10.x, 172.16-31.x, 192.168.x）
  - **云平台保护**: 阻止访问云平台元数据服务（AWS 169.254.169.254, 阿里云 100.100.100.200）
  - **DNS 重绑定防护**: 域名解析后再次检查 IP，防止绕过
- 🧠 智能环境判断
  - production 环境：自动启用防护，禁止私有 IP（公有云部署）
  - development 环境：自动禁用防护，允许私有 IP（本地开发）
- 🔧 灵活配置
  - `ENABLE_SSRF_PROTECTION`: 显式控制是否启用防护
  - `ALLOW_PRIVATE_IP`: 本地/私有云部署可配置允许内网访问
- 🧪 完整测试覆盖（15+ 测试用例，100% 通过）
- 📚 详细文档：`SSRF_PROTECTION.md`、`SSRF_DEPLOYMENT_GUIDE.md`

### v2.5.0 (2025-10-15) - 统计分析功能 📊
- ✨ 新增完整的统计分析系统
  - **模块使用统计**: 追踪各模块使用频率、成功率、活跃天数
  - **用户活跃度分析**: 统计用户调用次数、模块偏好
  - **执行详情记录**: 完整记录每次执行的详细信息
- 📊 三个新的统计API接口
  - `GET /flow/stats/modules` - 模块使用统计（支持单日/范围查询）
  - `GET /flow/stats/modules/:module_name` - 特定模块详细统计
  - `GET /flow/stats/users` - 用户活跃度统计（支持分页）
- 🗄️ 新增三张统计数据表
  - `code_execution_stats` - 执行详情表
  - `module_usage_stats` - 模块使用聚合表
  - `user_activity_stats` - 用户活跃度聚合表
- 🔧 模块解析器（自动识别代码中使用的模块）
- 🎯 统一API响应格式（`model.StatsAPIResponse`）
- ⚡ 异步统计记录（零性能影响）
- 📚 完整的统计功能文档

### v2.4.6 (2025-10-09) - 错误行号定位修复
- 🐛 修复错误行号定位不准确问题：同步和异步代码错误行号现在完全准确
- 🔧 EventLoop 偏移量修正：从 5 行修正为 9 行 (异步代码路径)
- 🔧 Runtime Pool 偏移量：保持 4 行不变 (同步代码路径,原来就是正确的)
- ✅ 全面覆盖：编译时错误和运行时错误都已修复
- 💡 用户体验提升：错误提示与代码编辑器行号完全一致，大幅提升调试效率
- 📚 详细文档：`ERROR_LINE_NUMBER_FIX_V2.4.6.md`

### v2.4.5 (2025-10-09) - 测试工具取消执行 + 移动端优化
- ✨ 新增代码执行取消功能：支持取消长时间运行的代码请求
- 🎨 智能按钮切换：运行时按钮自动变为"⏹️ 取消执行"（红色脉冲动画）
- 🔧 使用 AbortController API：实现真正的请求中止，立即释放前端等待状态
- 💡 友好用户体验：取消后显示明确提示信息，按钮状态自动恢复
- 📱 移动端完美适配：支持手机和平板访问，响应式布局、大按钮、自适应字体
- 🎯 多断点支持：小屏手机(< 375px)、普通手机(375-768px)、平板(769-1024px)、桌面(> 1024px)
- 📚 详细文档：`CANCEL_EXECUTION_FEATURE.md`、`MOBILE_RESPONSIVE_DESIGN.md`

### v2.4.4 (2025-10-09) - 字符串转义处理修复
- 🐛 修复字符串转义解析 Bug：正确处理 `"test\\"` 等场景
- 🔍 改进转义检测：统计连续反斜杠数量，奇偶判断
- 🛡️ 安全提升：修复无限循环检测、console 检测等可能被绕过的问题
- ✅ 新增 9 个测试场景，100% 通过
- 📚 详细文档：`STRING_ESCAPE_FIX_V2.4.4.md`

### v2.4.3 (2025-10-09) - Runtime 池计数修复
- 🐛 修复 Runtime 池计数不一致问题
- 🔧 区分从池获取和临时创建的归还逻辑
- 📊 确保 `currentPoolSize` 始终准确反映实际池大小
- 📚 详细文档：`RUNTIME_POOL_COUNT_FIX_V2.4.3.md`

### v2.4.2 (2025-10-09) - FormData Goroutine 泄漏修复
- 🐛 修复 FormData io.Pipe Goroutine 阻塞泄漏
- ⚡ Context 取消优化：从最多 300 秒等待 → 立即响应（< 1ms）
- 🔧 添加 Context 字段到 FormDataStreamConfig
- 📚 详细文档：`FORMDATA_PIPE_LEAK_FIX_V2.md`

### v2.4.1 (2025-10-09) - 无限循环检测增强
- 🔍 修复循环外的 return 被误判为安全的问题
- 🎯 实现括号匹配逻辑，确保 break/return 在循环体内
- ✅ 新增 3 个测试场景（循环外 return、嵌套循环等）

### v2.4 (2025-10-09) - 无限循环检测优化
- 🔍 新增 `while(1)` 和 `do-while` 循环检测（覆盖率 +8%）
- 🎯 改进 break/return 检测：排除注释和字符串中的误判（准确度 +10%）
- 💬 优化错误提示：明确告知有 300 秒超时保护
- ✅ 新增完整测试用例（12 个测试场景，100% 通过）
- 📚 详细文档：`INFINITE_LOOP_DETECTION_V2.4.md`

### v2.3 (2025-10-06) - 在线测试工具
- ✨ 新增在线测试工具（`/flow/test-tool`）
- 🎨 集成 Ace Editor 代码编辑器（本地部署，~960KB）
- 📦 预置 8 种完整示例（简单计算、Axios、Fetch、Lodash、加密、日期、XLSX等）
- 🔍 新增公开 Token 查询 API（`/flow/query-token`）
- 🖥️ 全屏编辑模式（500px 主编辑器 + 全屏模式）
- ⚙️ 环境变量驱动配置（API URL、外部链接等）
- 📊 智能 Token 展示（单/多 Token 自动适配）
- 🔐 Base64 编解码工具集成

### v2.2 (2025-10) - 内存优化
- 🚀 移除 pinyin 模块，节省 95.7% 内存（200 Runtime: 21.7GB → 900MB）
- 💾 共享编译缓存优化（`sync.Once` 确保只编译一次）
- 🎯 优化预加载策略（只预加载常用小库）
- 🔥 新增熔断器机制（防止雪崩效应）
- 📈 Docker 内存需求大幅降低（2GB 可运行 200 Runtime）

### v2.1 (2025-09) - 认证和限流
- 🔐 Token 认证机制（基于数据库）
- 🛡️ 三层限流架构（热/温/冷数据层）
- 💾 混合缓存系统（内存 LRU + Redis）
- 📊 完整管理接口（Token 管理、统计、监控）
- 🔄 降级保护机制（Redis/MySQL 故障自动降级）
- ✅ 1000+ 并发压测通过

### v2.0 (2025-08) - 基础架构
- ⚡ Go + goja 基础执行器
- 📦 主流 npm 模块支持（Buffer、Crypto、Axios、Lodash 等）
- 🎯 智能执行路由（同步/异步自动识别）
- 🏊 动态 Runtime 池（自动扩缩容）
- 🔒 多层安全沙箱（6 层防护）
- 📊 LRU 代码缓存

---

**⚡ Go + goja = 高性能 + 简单部署 + 低资源消耗**

**📦 支持主流npm模块 + 智能执行路由 + 动态资源管理**

**🏗️ 模块化架构 + 统一管理 + 优雅关闭 + 在线测试工具**
