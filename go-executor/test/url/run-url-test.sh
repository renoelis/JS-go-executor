#!/bin/bash

# URL 模块测试脚本

set -e

API_URL="${API_URL:-http://localhost:3002/flow/codeblock}"
TEST_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🧪 Node.js url 模块测试"
echo "=========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base64 编码
echo "📦 准备测试..."
encoded=$(cat "$TEST_DIR/url-module-test.js" | base64 | tr -d '\n')

# 发送请求
echo "🚀 执行测试..."
response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"input\": {}, \"codeBase64\": \"$encoded\", \"timeout\": 60000}")

# 检查结果
success=$(echo "$response" | jq -r '.success // .result.success // false')
passed=$(echo "$response" | jq -r '.result.passed // 0')
failed=$(echo "$response" | jq -r '.result.failed // 0')

echo ""
echo "=========================================="
echo "📊 测试结果"
echo "=========================================="
echo -e "通过: ${GREEN}$passed${NC}"
echo -e "失败: ${RED}$failed${NC}"
echo ""

if [ "$success" = "true" ]; then
    echo -e "${GREEN}🎉 所有测试通过!${NC}"
    
    # 显示详细结果
    echo ""
    echo "详细输出:"
    echo "$response" | jq -r '.console // ""' 2>/dev/null || true
    
    exit 0
else
    echo -e "${RED}⚠️  有测试失败${NC}"
    
    # 显示错误详情
    errors=$(echo "$response" | jq -r '.result.errors // [] | .[]' 2>/dev/null)
    if [ -n "$errors" ]; then
        echo ""
        echo "错误详情:"
        echo "$errors"
    fi
    
    # 显示完整响应
    echo ""
    echo "完整响应:"
    echo "$response" | jq '.'
    
    exit 1
fi








