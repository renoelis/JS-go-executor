#!/bin/bash

# 测试 axios 获取多个 Set-Cookie 的能力

echo "======================================"
echo "测试 axios Set-Cookie 多值支持"
echo "======================================"
echo ""

# 进入项目根目录
cd "$(dirname "$0")/../.." || exit 1

# 检查服务是否运行
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "❌ 错误: 服务未运行"
    echo "请先启动服务: go run cmd/main.go"
    exit 1
fi

echo "✓ 服务已运行"
echo ""

# 运行测试
echo "运行测试..."
echo ""

curl -X POST http://localhost:8080/api/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token-123" \
  -d @- << 'EOF' | jq '.'
{
  "code": "$(cat test/axios/set-cookie-test.js)",
  "input": {}
}
EOF

echo ""
echo "======================================"
echo "测试完成"
echo "======================================"
