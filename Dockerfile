# Flow-CodeBlock Go版本 Dockerfile
# 使用本地预编译二进制文件（避免网络依赖和构建时间）
#
# 编译命令：
#   CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o flow-codeblock-go cmd/main.go
#
# 说明：
#   - 使用修复了 TypedArray 极值转换问题的 goja fork 版本
#   - 本地路径依赖：replace github.com/dop251/goja => ./fork_goja/goja
#   - 避免 Docker 构建时的网络问题和依赖下载

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
