#!/bin/bash

# 🚀 XLSX 流式 API 性能对比测试运行脚本

echo "========================================"
echo "🚀 XLSX 流式 API 性能对比测试"
echo "========================================"
echo ""

# 检查服务状态
echo "🔍 检查服务状态..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health)

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ 服务未运行（HTTP $HTTP_CODE）"
    echo "请先启动服务："
    echo "  cd ../../go-executor && ./flow-codeblock-go"
    exit 1
fi

echo "✅ 服务运行正常"
echo ""

# 读取测试代码
TEST_CODE=$(cat "$(dirname "$0")/performance-comparison-test.js")
TEST_CODE_BASE64=$(echo "$TEST_CODE" | base64)

echo "📤 发送测试请求..."
echo ""

# 执行测试
RESPONSE=$(curl -s -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{
    \"codebase64\": \"$TEST_CODE_BASE64\",
    \"input\": {}
  }")

# 显示结果 - 提取日志和结果
echo "📋 测试日志:"
echo "----------------------------------------"
echo "$RESPONSE" | jq -r '.logs // "无日志输出"'
echo "----------------------------------------"
echo ""
echo "📊 测试结果:"
echo "$RESPONSE" | jq -r '.result // .error // "测试失败"'

echo ""
echo "========================================"
echo "✅ 测试完成"
echo "========================================"

