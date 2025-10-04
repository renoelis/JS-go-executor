#!/bin/bash

echo "🔍 运行类型处理调试测试..."
echo ""

# 检查服务
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health)
if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ 服务未运行"
    exit 1
fi

# 读取测试代码并正确编码
TEST_CODE_BASE64=$(cat debug-type-test.js | base64)

# 执行测试
RESPONSE=$(curl -s -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{\"codeBase64\": \"$TEST_CODE_BASE64\", \"input\": {}}")

# 检查是否成功
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
    echo "✅ 测试执行成功"
    echo ""
    echo "$RESPONSE" | jq -r '.result'
else
    echo "❌ 测试执行失败"
    echo "$RESPONSE" | jq '.'
fi

