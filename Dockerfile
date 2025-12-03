##########
# Flow-CodeBlock Go 版本 Dockerfile（多阶段构建，容器内启用 cgo + OpenSSL）
##########

############################
# 第一阶段：在 Linux 容器内构建二进制
############################
FROM golang:1.25-alpine AS builder

# 安装构建依赖：
# - build-base: 提供 gcc/make 等（cgo 需要）
# - openssl-dev: 提供 OpenSSL 头文件和静态/动态库
# - pkgconfig: 支持 #cgo pkg-config: openssl
# - argon2-dev: 提供 libargon2 和 argon2.h，支持 cgo Argon2d 实现的编译链接
RUN apk add --no-cache \
    build-base \
    openssl-dev \
    pkgconfig \
    argon2-dev

WORKDIR /app

# 先复制 go.mod/go.sum 并预拉依赖，加速构建
COPY go.mod go.sum ./
RUN go mod download

# 再复制剩余源码
COPY . .

# 在容器内启用 cgo 构建（目标架构与容器平台一致）
ENV CGO_ENABLED=1
RUN go build -o flow-codeblock-go cmd/main.go

############################
# 第二阶段：精简运行时镜像（Alpine）
############################
FROM alpine:latest

# 安装 ca-certificates、tzdata、curl（健康检查使用）、argon2-libs（提供 libargon2.so.1）以及 openssl（提供 OpenSSL 运行时库）
RUN apk --no-cache add ca-certificates tzdata curl argon2-libs openssl

# 创建非 root 用户
RUN addgroup -g 1000 appuser && \
    adduser -D -s /bin/sh -u 1000 -G appuser appuser

# 设置工作目录
WORKDIR /app

# 从构建阶段复制已编译好的二进制
COPY --from=builder /app/flow-codeblock-go .

# 复制 templates 目录（测试工具页面）
COPY templates ./templates

# 仅复制需要暴露的静态资源
COPY assets/elements ./assets/elements
COPY assets/script-manager ./assets/script-manager

# 修改文件所有权
RUN chown -R appuser:appuser /app

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 3002

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3002}/health || exit 1

# 启动应用
CMD ["./flow-codeblock-go"]
