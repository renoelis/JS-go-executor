# Dockerfile 方案对比

## 问题：原本的 Dockerfile 为什么不行？

### 原因分析

```dockerfile
# 原本的 Dockerfile（第 11-17 行）
COPY go.mod go.sum ./          # ✅ 复制依赖配置
RUN go mod download            # ❌ 失败！找不到 ./fork_goja/goja
COPY . .                       # ✅ 现在才复制 fork_goja 目录
```

**核心问题**：`go mod download` 执行时，`fork_goja` 目录还不存在！

### 详细错误流程

```
步骤 1: COPY go.mod go.sum ./
  ├─ Docker 容器内：/app/go.mod ✅
  ├─ Docker 容器内：/app/go.sum ✅
  └─ Docker 容器内：/app/fork_goja/ ❌ 不存在

步骤 2: RUN go mod download
  ├─ 读取 go.mod
  ├─ 发现：replace github.com/dop251/goja => ./fork_goja/goja
  ├─ 查找：/app/fork_goja/goja
  └─ 错误：找不到路径！❌

步骤 3: COPY . .
  └─ 现在才复制 fork_goja 目录（太晚了）
```

## 三种解决方案

### 方案 1：调整复制顺序（推荐用于生产）

```dockerfile
FROM golang:1.25.3-alpine AS builder
WORKDIR /app

# 1. 复制依赖配置
COPY go.mod go.sum ./

# 2. 🔥 先复制 fork_goja 目录
COPY fork_goja ./fork_goja

# 3. 下载依赖（现在能找到了）
RUN go mod download

# 4. 复制其他源代码
COPY . .

# 5. 编译
RUN go build -o flow-codeblock-go ./cmd/main.go
```

**优点**：
- ✅ 利用 Docker 层缓存
- ✅ fork_goja 不变时，不重新下载依赖
- ✅ 适合生产环境

**缺点**：
- ❌ 仍需要网络下载其他依赖
- ❌ 可能遇到 TLS 版本问题

### 方案 2：一次性复制所有文件

```dockerfile
FROM golang:1.25.3-alpine AS builder
WORKDIR /app

# 1. 复制依赖配置
COPY go.mod go.sum ./

# 2. 🔥 直接复制所有文件
COPY . .

# 3. 下载依赖
RUN go mod download

# 4. 编译
RUN go build -o flow-codeblock-go ./cmd/main.go
```

**优点**：
- ✅ 简单直接
- ✅ 不会遗漏文件

**缺点**：
- ❌ 失去 Docker 层缓存优势
- ❌ 任何文件改动都会重新下载依赖
- ❌ 仍需要网络

### 方案 3：本地预编译（当前使用）

```dockerfile
FROM alpine:latest
WORKDIR /app

# 直接复制已编译的二进制文件
COPY ./flow-codeblock-go .
COPY templates ./templates
COPY assets/elements ./assets/elements

CMD ["./flow-codeblock-go"]
```

**编译命令**：
```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o flow-codeblock-go cmd/main.go
```

**优点**：
- ✅ 完全避免网络问题
- ✅ 构建速度极快（秒级）
- ✅ 确定性强（使用已验证的二进制）
- ✅ 镜像体积小

**缺点**：
- ❌ 需要手动交叉编译
- ❌ 不适合自动化 CI/CD
- ❌ 需要记得重新编译

## 方案选择建议

### 开发/测试环境
使用**方案 3（本地预编译）**：
- 快速迭代
- 避免网络问题
- 确保使用修复后的代码

### 生产环境
使用**方案 1（调整复制顺序）**：
- 完整的构建流程
- 利用 Docker 缓存
- 适合 CI/CD

### CI/CD 环境
根据网络情况选择：
- **网络良好**：方案 1
- **网络受限**：方案 3 + 自动化脚本

## 实际测试结果

### 原本的 Dockerfile
```bash
$ docker-compose build
...
=> ERROR [builder 5/7] RUN go mod download
------
go: filippo.io/edwards25519@v1.1.0: Get "https://proxy.golang.org/...": 
remote error: tls: protocol version not supported
------
```

### 方案 1（Dockerfile.fixed）
```bash
$ docker-compose -f docker-compose.yml build
# 如果网络正常，会成功
# 如果网络受限，仍会失败
```

### 方案 3（Dockerfile.local）
```bash
$ CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o flow-codeblock-go cmd/main.go
$ docker-compose -f docker-compose.yml build
✅ 成功！构建时间：6.4s
```

## 网络问题的根本原因

```
remote error: tls: protocol version not supported
```

这是因为：
1. Go Proxy 服务器要求较新的 TLS 版本
2. 你的网络环境限制了 TLS 协议版本
3. 无法连接到 `proxy.golang.org` 或 `goproxy.cn`

### 临时解决方案

使用本地预编译（方案 3）完全避开网络问题。

### 长期解决方案

1. **等待 Go Proxy 索引完成**（10-30 分钟）
2. **配置企业代理**（如果在公司网络）
3. **使用 VPN**（绕过 TLS 限制）
4. **提交 PR 到官方 goja**（最终方案）

## 文件对比

| 文件 | 用途 | 网络依赖 | 构建速度 |
|------|------|----------|----------|
| `Dockerfile` | 原始版本 | ✅ 需要 | ❌ 失败 |
| `Dockerfile.fixed` | 修复版本 | ✅ 需要 | ⚠️ 取决于网络 |
| `Dockerfile.local` | 本地版本 | ❌ 不需要 | ✅ 快（6s） |

## 当前状态（已更新）

**✅ 已恢复为标准 Dockerfile**
- 使用多阶段构建，在容器内编译
- 配置了国内 Go 代理（`GOPROXY=https://goproxy.cn,direct`）解决 TLS 版本限制问题
- 使用远程仓库依赖（`github.com/renoelis/goja v0.0.1-typedarray-fix`）
- 已验证构建成功 ✅

**构建方式**：
```bash
# 标准 Docker 构建
docker build -t flow-codeblock-go:latest .

# 或使用 docker-compose
docker-compose build
```

**关键改进**：
1. ✅ 使用远程仓库，不再需要本地 `fork_goja` 目录
2. ✅ 配置国内代理，解决 TLS 版本限制问题
3. ✅ 标准多阶段构建，利用 Docker 层缓存
4. ✅ 适合 CI/CD 自动化流程

**历史方案（已弃用）**：
- ~~`Dockerfile.local`（本地预编译）~~ - 不再需要
- ~~本地路径依赖~~ - 已切换为远程仓库
