#!/bin/bash

# Fetch API 新增测试运行脚本
# 运行所有新增的 Fetch API 测试

echo "========================================"
echo "Fetch API 新增测试套件"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 服务地址
API_URL="http://localhost:3002/flow/codeblock"

# 测试文件列表
declare -a TEST_FILES=(
    "fetch-http-methods-test.js"
    "fetch-response-types-test.js"
    "fetch-headers-iterators-test.js"
    "fetch-clone-test.js"
    "fetch-urlsearchparams-test.js"
    "fetch-body-edge-cases-test.js"
)

# （测试文件名称通过 get_test_name 函数获取）

# 统计变量
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0
TEST_COUNT=0

# 获取测试名称
get_test_name() {
    local test_file=$1
    case "$test_file" in
        "fetch-http-methods-test.js")
            echo "HTTP 方法测试 (DELETE/HEAD/OPTIONS/PATCH)"
            ;;
        "fetch-response-types-test.js")
            echo "Response 类型测试 (blob/arrayBuffer/重复读取)"
            ;;
        "fetch-headers-iterators-test.js")
            echo "Headers 迭代器测试 (entries/keys/values/forEach)"
            ;;
        "fetch-clone-test.js")
            echo "Clone API 测试 (Response.clone/Request.clone)"
            ;;
        "fetch-urlsearchparams-test.js")
            echo "URLSearchParams 完整测试"
            ;;
        "fetch-body-edge-cases-test.js")
            echo "Body 边界情况测试"
            ;;
        *)
            echo "$test_file"
            ;;
    esac
}

# 运行单个测试
run_test() {
    local test_file=$1
    local test_name=$(get_test_name "$test_file")
    
    TEST_COUNT=$((TEST_COUNT + 1))
    
    echo -e "${YELLOW}[$TEST_COUNT/${#TEST_FILES[@]}] 运行: $test_name${NC}"
    echo "文件: $test_file"
    echo "----------------------------------------"
    
    # 读取测试文件并编码
    local base64_code=$(cat "test/fetch/$test_file" | base64)
    
    # 发送请求
    local response=$(curl -s --location "$API_URL" \
        --header 'Content-Type: application/json' \
        --data "{\"input\": {}, \"codebase64\": \"$base64_code\"}")
    
    # 解析结果
    local total=$(echo "$response" | jq -r '.result.total // 0')
    local passed=$(echo "$response" | jq -r '.result.passed // 0')
    local failed=$(echo "$response" | jq -r '.result.failed // 0')
    
    # 累加统计
    TOTAL_TESTS=$((TOTAL_TESTS + total))
    TOTAL_PASSED=$((TOTAL_PASSED + passed))
    TOTAL_FAILED=$((TOTAL_FAILED + failed))
    
    # 显示结果
    if [ "$failed" -eq 0 ] && [ "$passed" -gt 0 ]; then
        echo -e "${GREEN}✅ 通过: $passed/$total${NC}"
    else
        echo -e "${RED}❌ 失败: $failed/$total (通过: $passed)${NC}"
    fi
    
    echo ""
    
    # 短暂延迟，避免请求过快
    sleep 1
}

# 主函数
main() {
    echo "开始运行 ${#TEST_FILES[@]} 个测试文件..."
    echo ""
    
    # 切换到项目根目录
    cd "$(dirname "$0")/../.." || exit 1
    
    # 检查服务是否运行
    if ! curl -s "$API_URL" > /dev/null 2>&1; then
        echo -e "${RED}❌ 错误: 服务未运行 (${API_URL})${NC}"
        echo "请先启动服务：cd go-executor && ./flow-codeblock-go"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 服务运行中${NC}"
    echo ""
    
    # 运行所有测试
    for test_file in "${TEST_FILES[@]}"; do
        run_test "$test_file"
    done
    
    # 显示总结
    echo "========================================"
    echo "测试总结"
    echo "========================================"
    echo "测试文件: ${#TEST_FILES[@]} 个"
    echo "总测试用例: $TOTAL_TESTS 个"
    echo -e "通过: ${GREEN}$TOTAL_PASSED${NC} 个"
    echo -e "失败: ${RED}$TOTAL_FAILED${NC} 个"
    
    if [ "$TOTAL_FAILED" -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ 所有测试通过！${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}❌ 部分测试失败${NC}"
        exit 1
    fi
}

# 运行主函数
main

