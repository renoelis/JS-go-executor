#!/bin/bash

# Flow-CodeBlock Go 编译脚本
# 用于 Docker 部署前的交叉编译

set -e

echo "=========================================="
echo "Flow-CodeBlock Go 交叉编译"
echo "=========================================="
echo ""

# 检查是否有未提交的更改
if [[ -n $(git status -s) ]]; then
    echo "⚠️  警告：有未提交的更改"
    git status -s
    echo ""
fi

# 显示当前 goja 版本
echo "📦 当前 goja 版本："
cd fork_goja/goja
GOJA_COMMIT=$(git rev-parse --short HEAD)
GOJA_DATE=$(git log -1 --format=%cd --date=short)
echo "   Commit: $GOJA_COMMIT"
echo "   Date: $GOJA_DATE"
cd ../..
echo ""

# 编译
echo "🔨 开始编译..."
echo "   目标平台: linux/amd64"
echo "   CGO: 禁用"
echo ""

CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o flow-codeblock-go cmd/main.go

if [ $? -eq 0 ]; then
    FILE_SIZE=$(ls -lh flow-codeblock-go | awk '{print $5}')
    echo "✅ 编译成功！"
    echo "   文件: flow-codeblock-go"
    echo "   大小: $FILE_SIZE"
    echo ""
    echo "📝 下一步："
    echo "   docker-compose build && docker-compose up -d"
else
    echo "❌ 编译失败"
    exit 1
fi
