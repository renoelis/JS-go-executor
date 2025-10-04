#!/bin/bash

# 模块预热测试脚本
# 用于验证启动时预编译功能

set -e

echo "========================================="
echo "模块预热功能测试"
echo "========================================="
echo ""

# 1. 编译服务
echo "📦 步骤 1: 编译服务..."
cd "$(dirname "$0")"
go build -o flow-codeblock-go cmd/main.go
echo "✅ 编译成功"
echo ""

# 2. 启动服务（后台）
echo "🚀 步骤 2: 启动服务（捕获预热日志）..."
./flow-codeblock-go > warmup_test.log 2>&1 &
SERVER_PID=$!
echo "✅ 服务已启动 (PID: $SERVER_PID)"
echo ""

# 3. 等待服务初始化
echo "⏳ 步骤 3: 等待服务初始化..."
sleep 3

# 4. 检查预热日志
echo "📋 步骤 4: 检查预热日志..."
if grep -q "开始预热嵌入式模块" warmup_test.log; then
    echo "✅ 找到预热开始日志"
else
    echo "❌ 未找到预热开始日志"
fi

if grep -q "模块预热完成" warmup_test.log; then
    echo "✅ 找到预热完成日志"
    grep "模块预热完成" warmup_test.log
else
    echo "❌ 未找到预热完成日志"
fi
echo ""

# 5. 检查模块预编译日志
echo "📊 步骤 5: 检查各模块预编译情况..."
modules=("crypto-js" "axios" "date-fns" "lodash" "qs" "pinyin" "uuid")
for module in "${modules[@]}"; do
    if grep -q "预编译模块.*module=$module" warmup_test.log; then
        echo "✅ $module - 已预编译"
    else
        echo "⚠️  $module - 未找到预编译日志"
    fi
done
echo ""

# 6. 测试健康检查
echo "🏥 步骤 6: 测试服务健康状态..."
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✅ 服务健康检查正常"
else
    echo "❌ 服务健康检查失败"
fi
echo ""

# 7. 测试模块加载（测试首次请求无编译延迟）
echo "🧪 步骤 7: 测试模块首次加载..."

# 测试 lodash
echo "  测试 lodash..."
RESPONSE=$(curl -s -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {},
    \"codebase64\": \"$(echo 'const _ = require("lodash"); return _.VERSION;' | base64)\"
  }")

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "  ✅ lodash 加载成功"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | grep -E "(success|result|executionTime)" || echo "$RESPONSE"
else
    echo "  ❌ lodash 加载失败"
fi
echo ""

# 测试 crypto
echo "  测试 crypto..."
RESPONSE=$(curl -s -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {},
    \"codebase64\": \"$(echo 'const crypto = require(\"crypto\"); const hash = crypto.createHash(\"md5\"); hash.update(\"test\"); return hash.digest(\"hex\");' | base64)\"
  }")

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "  ✅ crypto 加载成功"
else
    echo "  ❌ crypto 加载失败"
fi
echo ""

# 8. 清理
echo "🧹 步骤 8: 清理..."
kill $SERVER_PID 2>/dev/null || true
sleep 1
echo "✅ 服务已停止"
echo ""

# 9. 显示完整日志（可选）
echo "========================================="
echo "📄 完整启动日志（前 50 行）："
echo "========================================="
head -50 warmup_test.log
echo ""
echo "========================================="
echo "测试完成！"
echo "========================================="
echo ""
echo "💡 提示："
echo "  - 完整日志保存在: warmup_test.log"
echo "  - 如需查看: cat warmup_test.log"
echo ""



