# Flow-CodeBlock Go版本 Dockerfile
# 使用本地预编译二进制文件（避免在 Docker 内部拉取依赖和构建）
#
# 编译命令（在宿主机执行）：
#   CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o flow-codeblock-go cmd/main.go
#
# 说明：
#   - go.mod 中通过 replace 使用自己的 goja/goja_nodejs fork 远程仓库
#     replace github.com/dop251/goja        => github.com/renoelis/goja v0.0.1-typedarray-fix.0.20251113131334-b6e882900a3f
#     replace github.com/dop251/goja_nodejs => github.com/renoelis/goja_nodejs v0.0.0-20251113104424-2311df426c6b
#   - Docker 镜像只复制已编译好的二进制，不在容器中执行 go build

FROM alpine:latest

# 安装ca-certificates和tzdata
RUN apk --no-cache add ca-certificates tzdata curl

# 创建非root用户
RUN addgroup -g 1000 appuser && \
    adduser -D -s /bin/sh -u 1000 -G appuser appuser

# 设置工作目录
WORKDIR /app

# 复制本地已编译的二进制文件
COPY ./flow-codeblock-go .

# 复制 templates 目录（测试工具页面）
COPY templates ./templates

# 复制 assets/elements 目录（Logo等静态资源）
COPY assets/elements ./assets/elements

# 修改文件所有权
RUN chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 3002

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3002}/health || exit 1

# 启动应用
CMD ["./flow-codeblock-go"]
