# Flow-CodeBlock Go 部署说明

## 快速部署

### 1. 编译二进制文件

```bash
./build.sh
```

或手动编译：

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o flow-codeblock-go cmd/main.go
```

### 2. 构建并启动 Docker 容器

```bash
docker-compose build && docker-compose up -d
```

### 3. 验证部署

```bash
# 检查健康状态
curl http://localhost:3002/health

# 运行测试
bash test/buffer-native/buf.index/run_all_tests.sh
```

## 为什么使用本地预编译？

### 当前方案（本地预编译）

```dockerfile
FROM alpine:latest
COPY ./flow-codeblock-go .
```

**优点**：
- ✅ 避免网络依赖问题
- ✅ 构建速度快（6秒）
- ✅ 使用修复后的 goja fork 版本
- ✅ 确定性强

**缺点**：
- ⚠️ 需要手动编译（已提供 build.sh 脚本）

### 传统方案（容器内编译）

```dockerfile
FROM golang:1.25.3-alpine AS builder
RUN go mod download
RUN go build ...
```

**问题**：
- ❌ 网络 TLS 版本限制
- ❌ Go Proxy 缓存延迟
- ❌ 本地路径依赖顺序问题

## 部署流程

### 开发环境

```bash
# 1. 修改代码
vim cmd/main.go

# 2. 编译
./build.sh

# 3. 重新部署
docker-compose down
docker-compose build
docker-compose up -d

# 4. 查看日志
docker logs -f flow-codeblock-go-dev
```

### 生产环境

```bash
# 1. 拉取最新代码
git pull

# 2. 编译
./build.sh

# 3. 使用生产配置部署
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 4. 验证
curl http://localhost:3002/health
```

## 关于 goja fork

当前使用修复了 TypedArray 极值转换问题的 goja fork 版本：

- **Fork 仓库**：https://github.com/renoelis/goja
- **修复 Commit**：bf0abe8fa39c34743161c32ba6ab4e1f0a3ef114
- **本地路径**：`./fork_goja/goja`
- **go.mod 配置**：`replace github.com/dop251/goja => ./fork_goja/goja`

### 修复的问题

```javascript
// 修复前
const arr = new Uint8Array(1);
arr[0] = Number.MAX_VALUE;
console.log(arr[0]); // 255 ❌

// 修复后
const arr = new Uint8Array(1);
arr[0] = Number.MAX_VALUE;
console.log(arr[0]); // 0 ✅
```

### 测试结果

- **总测试数**: 191
- **通过**: 189
- **失败**: 2（只读属性的合理差异）
- **成功率**: 98.95%

详见：[test/buffer-native/buf.index/TEST_SUMMARY.md](test/buffer-native/buf.index/TEST_SUMMARY.md)

## 故障排查

### 编译失败

```bash
# 检查 Go 版本
go version  # 需要 1.25+

# 清理缓存
go clean -cache
go mod tidy

# 重新编译
./build.sh
```

### Docker 构建失败

```bash
# 检查二进制文件
ls -lh flow-codeblock-go

# 检查 .dockerignore
cat .dockerignore | grep flow-codeblock-go
# 应该被注释掉：# flow-codeblock-go

# 清理 Docker 缓存
docker system prune -a
docker-compose build --no-cache
```

### 服务启动失败

```bash
# 查看日志
docker logs flow-codeblock-go-dev

# 检查环境变量
docker exec flow-codeblock-go-dev env | grep ADMIN_TOKEN

# 进入容器调试
docker exec -it flow-codeblock-go-dev sh
```

## 文件说明

| 文件 | 说明 |
|------|------|
| `Dockerfile` | Docker 镜像构建文件（使用本地预编译） |
| `Dockerfile.original.bak` | 原始 Dockerfile 备份 |
| `docker-compose.yml` | 开发环境配置 |
| `docker-compose.prod.yml` | 生产环境配置 |
| `build.sh` | 编译脚本 |
| `go.mod` | Go 依赖配置（包含 goja fork） |
| `fork_goja/goja/` | goja fork 源码 |

## 未来计划

1. ⏳ 等待 Go Proxy 索引完成
2. 📝 提交 PR 到官方 goja 仓库
3. ✅ 官方合并后切换回官方版本
4. 🔄 恢复容器内编译方案

## 相关文档

- [GOJA_FORK_USAGE.md](GOJA_FORK_USAGE.md) - goja fork 使用说明
- [DOCKERFILE_COMPARISON.md](DOCKERFILE_COMPARISON.md) - Dockerfile 方案对比
- [test/buffer-native/buf.index/README.md](test/buffer-native/buf.index/README.md) - 测试说明
