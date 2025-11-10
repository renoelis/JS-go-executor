#!/bin/bash

# Blob/File API 精细化修复测试运行脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

function print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
}

function print_section() {
    echo ""
    echo -e "${CYAN}=========================================="
    echo -e "  $1"
    echo -e "==========================================${NC}"
    echo ""
}

print_section "Blob/File API 精细化修复测试"

# 检查服务是否运行
print_info "检查服务状态..."
if ! curl -s http://localhost:3002/health > /dev/null 2>&1; then
    print_error "服务未运行！请先启动服务："
    echo "  ./dev_start.sh"
    exit 1
fi
print_success "服务正在运行"

# 获取 token（从环境变量或使用默认值）
TOKEN=${ACCESS_TOKEN:-"your_test_token_here"}

print_section "运行精细化修复测试"

# 运行测试
print_info "执行测试脚本..."

RESPONSE=$(curl -s -X POST http://localhost:3002/flow/codeblock \
    -H "Content-Type: application/json" \
    -H "accessToken: ${TOKEN}" \
    -d @test/Blob/blob_refinement_test.js)

# 检查响应
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "测试执行成功"
    
    # 提取测试结果
    PASSED=$(echo "$RESPONSE" | jq -r '.result.passed // 0')
    FAILED=$(echo "$RESPONSE" | jq -r '.result.failed // 0')
    TOTAL=$(echo "$RESPONSE" | jq -r '.result.total // 0')
    SUCCESS_RATE=$(echo "$RESPONSE" | jq -r '.result.successRate // "0%"')
    
    print_section "测试结果"
    echo -e "${GREEN}通过: ${PASSED}${NC}"
    echo -e "${RED}失败: ${FAILED}${NC}"
    echo "总计: ${TOTAL}"
    echo "成功率: ${SUCCESS_RATE}"
    
    # 显示详细日志
    print_section "详细日志"
    echo "$RESPONSE" | jq -r '.result.logs[]?' 2>/dev/null || echo "无日志"
    
    # 检查是否全部通过
    if [ "$FAILED" -eq 0 ]; then
        print_section "🎉 所有测试通过！"
        exit 0
    else
        print_section "⚠️  有测试失败"
        
        # 显示失败的测试
        echo -e "${YELLOW}失败的测试:${NC}"
        echo "$RESPONSE" | jq -r '.result.details | to_entries[] | select(.value == false) | "  - " + .key' 2>/dev/null
        
        exit 1
    fi
else
    print_error "测试执行失败"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi
