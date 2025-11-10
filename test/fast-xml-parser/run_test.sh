#!/bin/bash

# fast-xml-parser 模块测试脚本

echo "🧪 测试 fast-xml-parser 模块..."
echo "================================"

# 读取测试代码
TEST_CODE=$(cat test/fast-xml-parser/comprehensive_test.js)

# Base64 编码
CODE_BASE64=$(echo "$TEST_CODE" | base64)

# 调用 API
echo "📡 发送请求到服务器..."
RESPONSE=$(curl -s -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -H "accessToken: flow_dfff6cb46b3c4b6fb49ce561811ce642503052b7517c98201518111cac23869e" \
  -d "{
    \"codebase64\": \"$CODE_BASE64\",
    \"input\": {}
  }")

echo ""
echo "📋 响应结果:"
echo "$RESPONSE" | jq '.'

# 检查是否成功
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo ""
    echo "✅ fast-xml-parser 测试通过！"
    exit 0
else
    echo ""
    echo "❌ fast-xml-parser 测试失败！"
    exit 1
fi
