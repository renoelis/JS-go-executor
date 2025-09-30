# 🐳 Docker部署指南

## 📁 文件说明

```
go-executor/
├── docker-compose.yml       # 开发环境配置
├── docker-compose.prod.yml  # 生产环境配置
├── env.development         # 开发环境变量（详细注释）
├── env.production          # 生产环境变量（详细注释）
└── Dockerfile              # Docker镜像构建文件
```

## 🚀 快速部署

### 开发环境
```bash
# 启动开发环境
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 生产环境
```bash
# 启动生产环境
docker-compose -f docker-compose.prod.yml up -d --build

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 停止服务
docker-compose -f docker-compose.prod.yml down
```

## 🔧 环境变量配置

### 开发环境 (env.development)
- **Runtime池**: 50个
- **最大并发**: 500
- **执行超时**: 10秒
- **日志模式**: debug
- **调试日志**: 启用

### 生产环境 (env.production)
- **Runtime池**: 200个
- **最大并发**: 2000
- **执行超时**: 5秒
- **日志模式**: release
- **调试日志**: 禁用

## 📊 服务端点

部署成功后，服务将在以下端点可用：

- **主要API**: http://localhost:3002/flow/codeblock
- **健康检查**: http://localhost:3002/health
- **状态统计**: http://localhost:3002/flow/status
- **系统限制**: http://localhost:3002/flow/limits

## 🛠️ 自定义配置

如需调整配置，编辑对应的环境变量文件：

```bash
# 编辑开发环境配置
vim env.development

# 编辑生产环境配置
vim env.production
```

所有环境变量都有详细的注释说明用途和建议值。

## 📈 监控

使用健康检查端点监控服务状态：

```bash
# 检查服务健康状态
curl http://localhost:3002/health

# 查看详细统计信息
curl http://localhost:3002/flow/status
```
