#!/bin/bash
cd "$(dirname "$0")"

echo "======================================"
echo "简单配置验证测试"
echo "======================================"
echo ""

# 测试 1: 拼写错误
echo "测试 1: RUNTIME_POOL_SIZE=100abc"
export RUNTIME_POOL_SIZE=100abc
export ENVIRONMENT=development
timeout 2s go run cmd/main.go 2>&1 | grep -E "WARN|环境变量|解析失败" | head -5
echo ""

# 测试 2: MIN 过小
echo "测试 2: MIN_RUNTIME_POOL_SIZE=5"
unset RUNTIME_POOL_SIZE
export MIN_RUNTIME_POOL_SIZE=5
timeout 2s go run cmd/main.go 2>&1 | grep -E "WARN|MIN_RUNTIME_POOL_SIZE|过小|调整" | head -5
echo ""

# 测试 3: 负数
echo "测试 3: RUNTIME_POOL_SIZE=-100"
export MIN_RUNTIME_POOL_SIZE=10
export RUNTIME_POOL_SIZE=-100
timeout 2s go run cmd/main.go 2>&1 | grep -E "WARN|RUNTIME_POOL_SIZE|MIN|调整" | head -5
echo ""

echo "测试完成！"
