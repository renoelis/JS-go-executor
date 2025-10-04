#!/bin/bash

# Body Types 完整测试运行脚本
# 测试 body_types.go 和 blob_file_api.go 的所有功能

echo "========================================"
echo "Body Types 完整功能测试"
echo "========================================"
echo ""

# 设置颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 基础URL
BASE_URL="http://localhost:3002/flow/codeblock"

# 测试文件列表 (文件路径|测试名称|预期测试数)
TESTS=(
    "test/body-types/blob-file-complete-test.js|Blob/File API 完整功能测试|20"
    "test/body-types/urlsearchparams-complete-test.js|URLSearchParams 完整功能测试|25"
    "test/body-types/urlsearchparams-v22-features-test.js|URLSearchParams v22 新增功能测试|25"
    "test/body-types/typedarray-complete-test.js|TypedArray/ArrayBuffer 完整功能测试|30"
    "test/body-types/blob-file-test.js|Blob/File 基础测试（兼容性）|4"
    "test/body-types/urlsearchparams-test.js|URLSearchParams 基础测试（兼容性）|10"
    "test/body-types/typed-array-test.js|TypedArray 基础测试（兼容性）|8"
    "test/body-types/error-handling-test.js|错误处理测试|10"
)

# 运行单个测试
run_test() {
    local test_file=$1
    local test_name=$2
    local expected_count=$3
    
    echo "----------------------------------------"
    echo -e "${YELLOW}运行: $test_name${NC}"
    echo "文件: $test_file"
    echo "预期测试数: $expected_count"
    echo "----------------------------------------"
    
    # 读取测试文件并 base64 编码
    local code_base64=$(cat "$test_file" | base64)
    
    # 发送请求
    local response=$(curl -s -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -d "{\"input\": {}, \"codeBase64\": \"$code_base64\", \"timeout\": 60000}")
    
    # 检查响应
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        local success=$(echo "$response" | jq -r '.success')
        
        if [ "$success" = "true" ]; then
            echo -e "${GREEN}✅ 测试执行成功${NC}"
            
            # 获取结果
            local result=$(echo "$response" | jq -r '.result')
            echo "$result" | jq '.' 2>/dev/null || echo "$result"
            
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}❌ 测试执行失败${NC}"
            echo "$response" | jq '.'
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${RED}❌ 响应解析失败${NC}"
        echo "$response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo ""
    
    # 等待一下，避免请求过快
    sleep 2
}

# 检查服务是否运行
echo "检查服务状态..."
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}错误: 服务未运行 ($BASE_URL)${NC}"
    echo "请先启动 Go 服务："
    echo "  cd go-executor"
    echo "  ./flow-codeblock-go"
    exit 1
fi
echo -e "${GREEN}✅ 服务运行中${NC}"
echo ""

# 运行所有测试
for test_info in "${TESTS[@]}"; do
    IFS='|' read -r test_file test_name expected_count <<< "$test_info"
    run_test "$test_file" "$test_name" "$expected_count"
done

# 输出总结
echo "========================================"
echo "测试总结"
echo "========================================"
echo "总测试套件: $TOTAL_TESTS"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试套件通过！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有测试套件失败${NC}"
    exit 1
fi


