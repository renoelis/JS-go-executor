# Flow-CodeBlock Go版本 Dockerfile

FROM golang:1.25.3-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装必要的包
RUN apk add --no-cache git ca-certificates tzdata curl
# 复制go.mod和go.sum文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 构建应用（明确指定 cmd/main.go 作为入口）
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o flow-codeblock-go ./cmd/main.go

# 最终镜像
FROM alpine:latest

# 安装ca-certificates和tzdata
RUN apk --no-cache add ca-certificates tzdata curl

# 创建非root用户
RUN addgroup -g 1000 appuser && \
    adduser -D -s /bin/sh -u 1000 -G appuser appuser

# 设置工作目录
WORKDIR /app

# 从builder阶段复制二进制文件
COPY --from=builder /app/flow-codeblock-go .

# 复制 templates 目录（测试工具页面）
COPY --from=builder /app/templates ./templates

# 🆕 复制 assets/elements 目录（Logo等静态资源）
COPY --from=builder /app/assets/elements ./assets/elements

# 注意：
# 1. 所有外部库（crypto-js, lodash, uuid, pinyin等）都已通过 go:embed 嵌入到二进制文件中
# 2. Pinyin 字典已嵌入到二进制文件中（enhance_modules/pinyin/dict/*.json.gz）
# 3. 使用轻量级分词器，无需外部 GSE 数据文件
# 不需要再复制 external-libs 目录或 gse_data 目录

# 修改文件所有权
RUN chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 暴露端口（默认3002，运行时可通过环境变量覆盖）
EXPOSE 3002

# 健康检查（使用环境变量PORT，默认3002）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3002}/health || exit 1

# 启动应用
CMD ["./flow-codeblock-go"]

