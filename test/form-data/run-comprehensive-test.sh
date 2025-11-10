#!/bin/bash

# FormData 综合测试脚本

set -e

API_URL="${API_URL:-http://localhost:3002/flow/codeblock}"
TEST_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🧪 FormData 综合测试 (Node.js v22.2.0 标准)"
echo "============================================================"
echo ""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base64 编码
echo "📦 准备测试..."
encoded=$(cat "$TEST_DIR/formdata-comprehensive-test.js" | base64 | tr -d '\n')

# 发送请求
echo "🚀 执行测试..."
echo ""
response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"input\": {}, \"codeBase64\": \"$encoded\", \"timeout\": 60000}")

# 检查结果
success=$(echo "$response" | jq -r '.success // .result.success // false')
total=$(echo "$response" | jq -r '.result.total // 0')
passed=$(echo "$response" | jq -r '.result.passed // 0')
failed=$(echo "$response" | jq -r '.result.failed // 0')

# 分类统计
nodejs_passed=$(echo "$response" | jq -r '.result.sections.nodejs.passed // 0')
nodejs_total=$((nodejs_passed + $(echo "$response" | jq -r '.result.sections.nodejs.failed // 0')))
webapi_passed=$(echo "$response" | jq -r '.result.sections.webapi.passed // 0')
webapi_total=$((webapi_passed + $(echo "$response" | jq -r '.result.sections.webapi.failed // 0')))
errors_passed=$(echo "$response" | jq -r '.result.sections.errors.passed // 0')
errors_total=$((errors_passed + $(echo "$response" | jq -r '.result.sections.errors.failed // 0')))

echo "============================================================"
echo "📊 测试结果"
echo "============================================================"
echo -e "总计: ${BLUE}$total${NC} 个测试"
echo -e "通过: ${GREEN}$passed${NC} 个"
echo -e "失败: ${RED}$failed${NC} 个"
echo ""
echo "分类统计:"
echo -e "  ${BLUE}Node.js FormData:${NC} $nodejs_passed/$nodejs_total 通过"
echo -e "  ${BLUE}Web API FormData:${NC} $webapi_passed/$webapi_total 通过"
echo -e "  ${BLUE}错误处理测试:${NC}   $errors_passed/$errors_total 通过"
echo ""

if [ "$success" = "true" ]; then
    echo -e "${GREEN}🎉 所有测试通过!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有 $failed 个测试失败${NC}"
    echo ""
    echo "查看详细结果:"
    echo "$response" | jq '.result'
    exit 1
fi








