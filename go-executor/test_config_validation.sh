#!/bin/bash

# 环境变量校验测试脚本
# 用于验证 CONFIG_VALIDATION_ENHANCEMENT 的实施效果

echo "======================================"
echo "环境变量校验功能测试"
echo "======================================"
echo ""

# 保存原始环境变量
ORIGINAL_RUNTIME_POOL_SIZE="${RUNTIME_POOL_SIZE}"
ORIGINAL_MAX_CONCURRENT="${MAX_CONCURRENT_EXECUTIONS}"
ORIGINAL_MIN_POOL_SIZE="${MIN_RUNTIME_POOL_SIZE}"

# 测试 1: 正常配置（不应有警告）
echo "测试 1: 正常配置"
echo "设置: RUNTIME_POOL_SIZE=100"
export RUNTIME_POOL_SIZE=100
echo "预期: 无警告日志"
echo ""

# 测试 2: 拼写错误（应有警告）
echo "测试 2: 拼写错误"
echo "设置: RUNTIME_POOL_SIZE=100abc"
export RUNTIME_POOL_SIZE=100abc
echo "预期: [WARN] 环境变量解析失败，使用默认值"
echo "      key: RUNTIME_POOL_SIZE"
echo "      invalid_value: 100abc"
echo "      default: 100"
echo ""

# 测试 3: 中文字符（应有警告）
echo "测试 3: 中文字符"
echo "设置: MAX_CONCURRENT_EXECUTIONS=2千"
export MAX_CONCURRENT_EXECUTIONS="2千"
echo "预期: [WARN] 环境变量解析失败，使用默认值"
echo "      key: MAX_CONCURRENT_EXECUTIONS"
echo "      invalid_value: 2千"
echo ""

# 测试 4: 范围错误（应有警告）
echo "测试 4: 范围过小"
echo "设置: MIN_RUNTIME_POOL_SIZE=5"
export MIN_RUNTIME_POOL_SIZE=5
echo "预期: [WARN] MIN_RUNTIME_POOL_SIZE 过小，已调整"
echo "      original: 5"
echo "      adjusted: 10"
echo ""

# 测试 5: 负数（应有警告）
echo "测试 5: 负数"
echo "设置: RUNTIME_POOL_SIZE=-100"
export RUNTIME_POOL_SIZE=-100
echo "预期: [WARN] RUNTIME_POOL_SIZE 小于 MIN_RUNTIME_POOL_SIZE，已调整"
echo ""

echo "======================================"
echo "启动服务进行测试（3秒后自动退出）"
echo "======================================"
echo ""

# 启动服务并观察日志
cd "$(dirname "$0")"

# 检查是否已编译
if [ ! -f "./flow-codeblock-go" ]; then
    echo "编译 Go 服务..."
    go build -o flow-codeblock-go cmd/main.go
    if [ $? -ne 0 ]; then
        echo "编译失败"
        exit 1
    fi
fi

echo "启动服务，请观察日志中的 [WARN] 信息..."
echo "（3秒后自动退出）"
echo ""

# ✅ 使用 timeout 自动退出
timeout 3s ./flow-codeblock-go 2>&1 | grep -E "WARN|INFO|Flow-CodeBlock" | head -30

echo ""
echo "======================================"
echo "测试完成！"
echo "======================================"

# 恢复原始环境变量
export RUNTIME_POOL_SIZE="${ORIGINAL_RUNTIME_POOL_SIZE}"
export MAX_CONCURRENT_EXECUTIONS="${ORIGINAL_MAX_CONCURRENT}"
export MIN_RUNTIME_POOL_SIZE="${ORIGINAL_MIN_POOL_SIZE}"

