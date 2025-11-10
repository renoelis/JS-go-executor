#!/bin/bash
# date-fns 完整测试套件运行脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# API 端点
BASE_URL="http://localhost:3002/flow/codeblock"

echo "=========================================="
echo "🚀 date-fns 完整测试套件"
echo "=========================================="
echo ""

# 测试文件列表 (文件路径|测试名称|预期测试数)
TESTS=(
    "test/date-fns/date-fns-test.js|date-fns 基础功能测试|8"
    "test/date-fns/date-fns-async-test.js|date-fns 异步操作测试|8"
)

# 运行单个测试的函数
run_test() {
    local test_file=$1
    local test_name=$2
    local expected_count=$3
    
    echo ""
    echo "----------------------------------------"
    echo -e "${YELLOW}运行: ${test_name}${NC}"
    echo "文件: ${test_file}"
    echo "预期测试数: ${expected_count}"
    echo "----------------------------------------"
    
    # 检查文件是否存在
    if [ ! -f "${test_file}" ]; then
        echo -e "${RED}❌ 测试文件不存在: ${test_file}${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # Base64 编码并发送请求
    CODE_BASE64=$(cat "${test_file}" | base64 | tr -d '\n')
    
    RESPONSE=$(curl -s -X POST "${BASE_URL}" \
        -H "Content-Type: application/json" \
        -d "{
            \"input\": {},
            \"codeBase64\": \"${CODE_BASE64}\",
            \"timeout\": 60000
        }")
    
    # 检查响应
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
    
    if [ "$SUCCESS" == "true" ]; then
        RESULT=$(echo "$RESPONSE" | jq -r '.result')
        PASSED=$(echo "$RESULT" | jq -r '.passed // 0')
        FAILED=$(echo "$RESULT" | jq -r '.failed // 0')
        
        echo -e "${GREEN}✅ 测试执行成功${NC}"
        echo "$RESULT" | jq '.'
        
        TOTAL_TESTS=$((TOTAL_TESTS + PASSED + FAILED))
        PASSED_TESTS=$((PASSED_TESTS + PASSED))
        FAILED_TESTS=$((FAILED_TESTS + FAILED))
        
        if [ "$FAILED" -eq 0 ]; then
            echo -e "${GREEN}✅ ${test_name} 全部通过 (${PASSED}/${expected_count})${NC}"
        else
            echo -e "${RED}❌ ${test_name} 部分失败 (通过:${PASSED}, 失败:${FAILED})${NC}"
        fi
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error')
        echo -e "${RED}❌ 测试执行失败${NC}"
        echo "$ERROR" | jq '.'
        
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 检查服务是否运行
echo "🔍 检查服务状态..."
if ! curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo -e "${RED}❌ 服务未运行，请先启动服务:${NC}"
    echo "   cd go-executor && ./flow-codeblock-go"
    exit 1
fi
echo -e "${GREEN}✅ 服务运行正常${NC}"

# 运行所有测试
for test_info in "${TESTS[@]}"; do
    IFS='|' read -r file name count <<< "$test_info"
    run_test "$file" "$name" "$count"
done

# 测试总结
echo ""
echo "=========================================="
echo "📊 测试结果汇总"
echo "=========================================="
echo -e "总测试数: ${TOTAL_TESTS}"
echo -e "${GREEN}通过: ${PASSED_TESTS}${NC}"
echo -e "${RED}失败: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    SUCCESS_RATE="100.00"
else
    SUCCESS_RATE=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
fi

echo "成功率: ${SUCCESS_RATE}%"
echo "=========================================="

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有测试失败，请检查详细日志${NC}"
    exit 1
fi

