#!/bin/bash

# 数据竞态检测测试脚本
# 使用 Go 的 -race 标志检测所有的数据竞态条件

set -e

echo "🔍 开始数据竞态检测测试..."
echo ""

cd "$(dirname "$0")/.."

# 设置测试环境变量
export RUNTIME_POOL_SIZE=10
export MAX_CONCURRENT_EXECUTIONS=50
export EXECUTION_TIMEOUT_MS=5000

# 运行所有测试并启用竞态检测
echo "📋 运行所有单元测试（启用 -race）..."
go test -race -v -timeout 60s ./...

echo ""
echo "✅ 数据竞态检测完成！"
echo ""
echo "如果没有检测到竞态条件，说明代码线程安全。"
echo "如果检测到竞态条件，会显示详细的堆栈信息。"





