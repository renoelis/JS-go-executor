#!/bin/bash

# 所有库的综合测试脚本
# 用途: 验证所有导入的 JavaScript 库是否正常工作

set -e

API_URL="${API_URL:-http://localhost:3002/flow/codeblock}"
TEST_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🧪 Flow-CodeBlock JavaScript 库综合测试"
echo "=========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
run_test() {
    local test_name="$1"
    local test_file="$2"
    
    echo -n "测试 $test_name ... "
    
    # Base64 编码
    local encoded=$(cat "$TEST_DIR/$test_file" | base64 | tr -d '\n')
    
    # 发送请求
    local response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"input\": {}, \"codeBase64\": \"$encoded\", \"timeout\": 60000}")
    
    # 检查结果
    local success=$(echo "$response" | jq -r '.success // .result.success // false')
    
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✅ 通过${NC}"
        return 0
    else
        echo -e "${RED}❌ 失败${NC}"
        echo "$response" | jq '.error // .result.errors // .result' 2>/dev/null || echo "$response"
        return 1
    fi
}

# 测试计数
total=0
passed=0
failed=0

# 1. 综合测试
echo "📦 1. 所有模块综合测试"
echo "-------------------------------------------"
if run_test "All Modules" "all-modules-test.js"; then
    ((passed++))
else
    ((failed++))
fi
((total++))
echo ""

# 2. UUID 测试
echo "📦 2. UUID 模块测试"
echo "-------------------------------------------"
if run_test "UUID" "uuid-test.js"; then
    ((passed++))
else
    ((failed++))
fi
((total++))
echo ""

# 3. Pinyin 测试
echo "📦 3. Pinyin 模块测试"
echo "-------------------------------------------"
if run_test "Pinyin" "pinyin-test.js"; then
    ((passed++))
else
    ((failed++))
fi
((total++))
echo ""

# 4. Lodash 测试
echo "📦 4. Lodash 模块测试"
echo "-------------------------------------------"
if run_test "Lodash" "lodash-test.js"; then
    ((passed++))
else
    ((failed++))
fi
((total++))
echo ""

# 5. Qs 测试
echo "📦 5. Qs 模块测试"
echo "-------------------------------------------"
if run_test "Qs" "qs-test.js"; then
    ((passed++))
else
    ((failed++))
fi
((total++))
echo ""

# 6. 安全检查测试
echo "🔐 6. 安全检查测试"
echo "-------------------------------------------"
echo -n "测试 Security Restrictions ... "

encoded=$(cat "$TEST_DIR/security-test.js" | base64 | tr -d '\n')
response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"input\": {}, \"codeBase64\": \"$encoded\", \"timeout\": 60000}")

success=$(echo "$response" | jq -r '.success // false')
passed_count=$(echo "$response" | jq -r '.result.summary.passed // 0')
failed_count=$(echo "$response" | jq -r '.result.summary.failed // 0')
total_count=$(echo "$response" | jq -r '.result.summary.total // 0')

if [ "$success" = "true" ] && [ "$failed_count" = "0" ] && [ "$total_count" -gt "0" ]; then
    echo -e "${GREEN}✅ 通过 ($passed_count/$total_count)${NC}"
    echo "$response" | jq -r '.result.tests[]?'
    ((passed++))
else
    echo -e "${RED}❌ 失败 ($passed_count/$total_count)${NC}"
    echo "$response" | jq '.'
    ((failed++))
fi
((total++))
echo ""

# 总结
echo "=========================================="
echo "📊 测试总结"
echo "=========================================="
echo "总计: $total"
echo -e "通过: ${GREEN}$passed${NC}"
echo -e "失败: ${RED}$failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有 $failed 个测试失败${NC}"
    exit 1
fi

