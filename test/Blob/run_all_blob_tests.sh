#!/bin/bash

# Blob/File API 完整测试套件
# 运行所有 Blob/File 相关测试

set -e

echo "========================================"
echo "  Blob/File API 完整测试套件"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 服务器配置
SERVER_URL="http://localhost:3002/flow/codeblock"
ACCESS_TOKEN="${ACCESS_TOKEN:-test_token_12345}"

# 检查服务器是否运行
echo "检查服务器状态..."
if ! curl -s -f "${SERVER_URL%/flow/codeblock}/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ 服务器未运行！${NC}"
    echo "请先启动服务器: ./dev_start.sh"
    exit 1
fi
echo -e "${GREEN}✅ 服务器运行中${NC}"
echo ""

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 运行单个测试的函数
run_test() {
    local test_name=$1
    local test_file=$2
    
    echo "========================================"
    echo "  运行: ${test_name}"
    echo "========================================"
    
    # 读取测试文件
    if [ ! -f "${test_file}" ]; then
        echo -e "${RED}❌ 测试文件不存在: ${test_file}${NC}"
        return 1
    fi
    
    # 构建 JSON 请求体
    local code=$(cat "${test_file}" | jq -Rs .)
    local json_body=$(cat <<EOF
{
    "code": ${code},
    "timeout": 10000
}
EOF
)
    
    # 发送请求
    local response=$(curl -s -X POST "${SERVER_URL}" \
        -H "Content-Type: application/json" \
        -H "accessToken: ${ACCESS_TOKEN}" \
        -d "${json_body}")
    
    # 解析结果
    local success=$(echo "${response}" | jq -r '.success // false')
    
    if [ "${success}" = "true" ]; then
        local passed=$(echo "${response}" | jq -r '.result.passed // 0')
        local failed=$(echo "${response}" | jq -r '.result.failed // 0')
        local total=$(echo "${response}" | jq -r '.result.total // 0')
        local rate=$(echo "${response}" | jq -r '.result.successRate // "0"')
        
        echo ""
        echo "结果: ${passed}/${total} 通过 (${rate}%)"
        
        TOTAL_TESTS=$((TOTAL_TESTS + total))
        PASSED_TESTS=$((PASSED_TESTS + passed))
        FAILED_TESTS=$((FAILED_TESTS + failed))
        
        if [ "${failed}" -eq 0 ]; then
            echo -e "${GREEN}✅ 所有测试通过！${NC}"
        else
            echo -e "${YELLOW}⚠️  有 ${failed} 个测试失败${NC}"
            
            # 显示失败的测试
            echo ""
            echo "失败的测试:"
            echo "${response}" | jq -r '.result.details | to_entries[] | select(.value == false) | "  - " + .key'
        fi
    else
        echo -e "${RED}❌ 测试执行失败${NC}"
        echo "错误信息:"
        echo "${response}" | jq -r '.error // .message // "未知错误"'
        return 1
    fi
    
    echo ""
}

# 运行所有测试
echo "开始运行测试..."
echo ""

# 测试 1: 精细化修复测试
run_test "精细化修复测试" "test/Blob/blob_refinement_test.js"

# 测试 2: 符合性测试
run_test "符合性测试" "test/Blob/blob_file_compliance_test.js"

# 测试 3: P0-P1 修复测试
run_test "P0-P1 修复测试" "test/Blob/p0_p1_fixes_test.js"

# 测试 4: P0-P1-P2 修复测试
run_test "P0-P1-P2 修复测试" "test/Blob/p0_p1_p2_fixes_test.js"

# 总结
echo "========================================"
echo "  测试总结"
echo "========================================"
echo "总测试数: ${TOTAL_TESTS}"
echo "通过: ${PASSED_TESTS}"
echo "失败: ${FAILED_TESTS}"

if [ ${TOTAL_TESTS} -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; ${PASSED_TESTS} * 100 / ${TOTAL_TESTS}" | bc)
    echo "成功率: ${SUCCESS_RATE}%"
fi

echo ""

if [ ${FAILED_TESTS} -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有 ${FAILED_TESTS} 个测试失败${NC}"
    exit 1
fi
