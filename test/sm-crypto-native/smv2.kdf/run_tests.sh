#!/bin/bash

# sm-crypto-v2 KDF 测试运行脚本
# 支持在本地 Node.js 和 Go+goja 服务中运行测试

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "================================"
echo "sm-crypto-v2 KDF 测试套件"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ===== 1. 本地 Node.js 测试 =====
echo "📦 步骤 1: 本地 Node.js 测试"
echo "----------------------------"

echo -e "${YELLOW}运行基础测试...${NC}"
cd "$PROJECT_ROOT"
node "$SCRIPT_DIR/test_kdf_basic.js" > /tmp/kdf_basic_result.json
BASIC_SUCCESS=$(cat /tmp/kdf_basic_result.json | grep '"success"' | head -1 | grep -o 'true\|false')
BASIC_RATE=$(cat /tmp/kdf_basic_result.json | grep 'successRate' | head -1 | sed 's/.*: "\(.*\)".*/\1/')

if [ "$BASIC_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ 基础测试通过 (成功率: $BASIC_RATE)${NC}"
else
    echo -e "${RED}❌ 基础测试失败 (成功率: $BASIC_RATE)${NC}"
fi

echo ""
echo -e "${YELLOW}运行全面测试...${NC}"
node "$SCRIPT_DIR/test_kdf_comprehensive.js" > /tmp/kdf_comprehensive_result.json
COMP_SUCCESS=$(cat /tmp/kdf_comprehensive_result.json | grep '"success"' | head -1 | grep -o 'true\|false')
COMP_RATE=$(cat /tmp/kdf_comprehensive_result.json | grep 'successRate' | head -1 | sed 's/.*: "\(.*\)".*/\1/')
COMP_TOTAL=$(cat /tmp/kdf_comprehensive_result.json | grep '"total"' | head -1 | grep -o '[0-9]*')

if [ "$COMP_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ 全面测试通过 (共 $COMP_TOTAL 项, 成功率: $COMP_RATE)${NC}"
else
    echo -e "${RED}❌ 全面测试失败 (共 $COMP_TOTAL 项, 成功率: $COMP_RATE)${NC}"
    echo "失败的测试用例："
    cat /tmp/kdf_comprehensive_result.json | grep -A3 '"status": "❌"'
fi

echo ""
echo "================================"
echo "📊 Node.js 测试总结"
echo "================================"
echo "基础测试: $BASIC_RATE"
echo "全面测试: $COMP_RATE (共 $COMP_TOTAL 项)"
echo ""

# ===== 2. Go+goja 服务测试 =====
echo "================================"
echo "🚀 步骤 2: Go+goja 服务测试"
echo "================================"
echo ""

# 检查是否需要启动服务
if ! curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo -e "${YELLOW}服务未运行，尝试启动...${NC}"
    echo "提示：如需启动服务，请手动运行："
    echo "  cd $PROJECT_ROOT && docker-compose down && docker-compose build && docker-compose up -d"
    echo ""
    echo -e "${YELLOW}跳过服务测试${NC}"
else
    echo -e "${GREEN}✓ 服务已运行${NC}"
    echo ""
    
    # 运行基础测试
    echo -e "${YELLOW}在服务中运行基础测试...${NC}"
    CODE_BASIC=$(base64 < "$SCRIPT_DIR/test_kdf_basic.js")
    
    SERVICE_RESULT=$(curl -s --location 'http://localhost:3002/flow/codeblock' \
      --header 'Content-Type: application/json' \
      --header 'accessToken: flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15' \
      --data "{\"codebase64\": \"$CODE_BASIC\", \"input\": {}}" 2>/dev/null)
    
    SERVICE_SUCCESS=$(echo "$SERVICE_RESULT" | grep '"success"' | head -1 | grep -o 'true\|false')
    SERVICE_RATE=$(echo "$SERVICE_RESULT" | grep 'successRate' | head -1 | sed 's/.*: "\(.*\)".*/\1/')
    
    if [ "$SERVICE_SUCCESS" = "true" ]; then
        echo -e "${GREEN}✅ 服务基础测试通过 (成功率: $SERVICE_RATE)${NC}"
    else
        echo -e "${RED}❌ 服务基础测试失败 (成功率: $SERVICE_RATE)${NC}"
        echo "详细结果："
        echo "$SERVICE_RESULT" | jq '.'
    fi
    
    # 比较结果
    echo ""
    echo "================================"
    echo "🔍 Node.js vs Go+goja 对比"
    echo "================================"
    if [ "$BASIC_SUCCESS" = "$SERVICE_SUCCESS" ] && [ "$BASIC_RATE" = "$SERVICE_RATE" ]; then
        echo -e "${GREEN}✅ 完全一致！${NC}"
    else
        echo -e "${RED}⚠️  存在差异${NC}"
        echo "Node.js: $BASIC_SUCCESS ($BASIC_RATE)"
        echo "Go+goja: $SERVICE_SUCCESS ($SERVICE_RATE)"
    fi
fi

echo ""
echo "================================"
echo "✅ 测试完成"
echo "================================"
echo "详细结果已保存到："
echo "  - /tmp/kdf_basic_result.json"
echo "  - /tmp/kdf_comprehensive_result.json"
echo ""

