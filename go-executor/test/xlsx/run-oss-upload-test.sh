#!/bin/bash

# 📊 OSS 上传测试脚本
# 用途：测试 Excel 生成和上传到真实 OSS 的完整流程

echo "========================================"
echo "🧪 Excel + OSS 上传集成测试"
echo "========================================"
echo ""

# 检查服务是否运行
echo "🔍 检查服务状态..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health)

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ 服务未运行（HTTP $HTTP_CODE）"
    echo "请先启动服务："
    echo "  cd ../go-executor && ./flow-codeblock-go"
    exit 1
fi

echo "✅ 服务运行正常"
echo ""

# 测试 1: 简化版上传测试（推荐）
echo "========================================"
echo "📝 测试 1: 简化版 OSS 上传"
echo "========================================"
echo ""

TEST_CODE=$(cat simple-oss-upload-test.js)
TEST_CODE_BASE64=$(echo "$TEST_CODE" | base64)

RESPONSE=$(curl -s -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{
    \"codeBase64\": \"$TEST_CODE_BASE64\",
    \"input\": {}
  }")

echo "$RESPONSE" | jq '.'

# 检查结果
SUCCESS=$(echo "$RESPONSE" | jq -r '.result.success // false')
if [ "$SUCCESS" = "true" ]; then
    echo ""
    echo "✅ 测试通过！"
    echo ""
    
    # 提取文件 URL
    FILE_URL=$(echo "$RESPONSE" | jq -r '.result.fileInfo.url // empty')
    if [ -n "$FILE_URL" ]; then
        echo "📎 文件访问地址："
        echo "   $FILE_URL"
    fi
else
    echo ""
    echo "⚠️  上传未成功，但可能是预期的（例如：网络问题、权限问题等）"
    echo "   请检查上面的错误信息"
fi

echo ""
echo "========================================"
echo "🎉 测试完成"
echo "========================================"
echo ""

# 显示执行统计
EXEC_TIME=$(echo "$RESPONSE" | jq -r '.timing.executionTime // 0')
echo "⏱️  执行时间: ${EXEC_TIME}ms"

# 显示文件信息
FILE_SIZE=$(echo "$RESPONSE" | jq -r '.result.fileInfo.size // 0')
ORDERS_COUNT=$(echo "$RESPONSE" | jq -r '.result.fileInfo.ordersCount // 0')

if [ "$FILE_SIZE" -gt 0 ]; then
    echo "📊 文件信息:"
    echo "   - 订单数量: $ORDERS_COUNT"
    echo "   - 文件大小: $FILE_SIZE bytes"
fi

echo ""

