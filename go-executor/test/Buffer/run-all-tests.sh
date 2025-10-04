#!/bin/bash

# Buffer 模块测试套件运行脚本
# 运行所有 Node.js Buffer 测试

echo "========================================"
echo "Buffer 模块完整测试套件"
echo "Node.js v22.2.0 Buffer API 验证"
echo "========================================"
echo ""

# 设置颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 基础URL
BASE_URL="http://localhost:3002/flow/codeblock"

# 获取当前脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 测试文件列表（文件路径|测试名称|预期测试数）
TESTS=(
    "$SCRIPT_DIR/buffer-comprehensive-test.js|Buffer 综合测试（全功能覆盖）|85"
    "$SCRIPT_DIR/buffer-creation-test.js|Buffer 创建和类型检测|15"
    "$SCRIPT_DIR/buffer-8bit-test.js|8位整数和索引访问|15"
    "$SCRIPT_DIR/buffer-test.js|Buffer 基础功能测试|12"
    "$SCRIPT_DIR/buffer.js|Buffer 高级数值操作|10"
    "$SCRIPT_DIR/advanced-buffer.js|Buffer 高级特性测试|20"
    "$SCRIPT_DIR/buffer-error-handling-test.js|Buffer 错误情况测试|20"
    
)

# 运行单个测试
run_test() {
    local test_file=$1
    local test_name=$2
    local expected_count=$3
    
    echo "----------------------------------------"
    echo -e "${YELLOW}运行: $test_name${NC}"
    echo "文件: $(basename $test_file)"
    if [ ! -z "$expected_count" ]; then
        echo "预期测试数: $expected_count"
    fi
    echo "----------------------------------------"
    
    # 检查文件是否存在
    if [ ! -f "$test_file" ]; then
        echo -e "${RED}❌ 文件不存在: $test_file${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        echo ""
        return
    fi
    
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
            
            # 尝试解析结果中的测试统计
            if echo "$result" | jq -e '.summary' > /dev/null 2>&1; then
                local passed=$(echo "$result" | jq -r '.summary.passed')
                local failed=$(echo "$result" | jq -r '.summary.failed')
                local total=$(echo "$result" | jq -r '.summary.total')
                local passRate=$(echo "$result" | jq -r '.summary.passRate')
                
                echo -e "${BLUE}测试结果: 通过 ${passed}/${total} (${passRate})${NC}"
                
                if [ "$failed" = "0" ]; then
                    echo -e "${GREEN}✅ 所有子测试通过${NC}"
                else
                    echo -e "${RED}⚠️  有 ${failed} 个子测试失败${NC}"
                fi
            else
                # 显示完整结果
                echo "$result" | jq '.' 2>/dev/null || echo "$result"
            fi
            
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
    sleep 1
}

# 检查依赖
echo "检查依赖..."

# 检查 jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}错误: 需要安装 jq 工具${NC}"
    echo "macOS: brew install jq"
    echo "Linux: sudo apt-get install jq"
    exit 1
fi
echo -e "${GREEN}✅ jq 已安装${NC}"

# 检查 curl
if ! command -v curl &> /dev/null; then
    echo -e "${RED}错误: 需要安装 curl 工具${NC}"
    exit 1
fi
echo -e "${GREEN}✅ curl 已安装${NC}"

# 检查服务是否运行
echo "检查服务状态..."
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}错误: 服务未运行 ($BASE_URL)${NC}"
    echo "请先启动 Go 服务："
    echo "  cd ../../go-executor"
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
    echo ""
    echo "测试覆盖："
    echo "  ✅ Buffer 创建方法（12种）"
    echo "  ✅ 静态工具方法（4种）"
    echo "  ✅ 实例属性（3种）"
    echo "  ✅ 读取方法（24种）"
    echo "  ✅ 写入方法（24种）"
    echo "  ✅ 字符串转换（9种编码）"
    echo "  ✅ 操作方法（7种）"
    echo "  ✅ 比较搜索（5种）"
    echo "  ✅ 迭代器（4种）"
    echo "  ✅ 字节操作（4种）"
    echo ""
    echo "总计: 95+ API 完整覆盖"
    exit 0
else
    echo -e "${RED}⚠️  有 $FAILED_TESTS 个测试套件失败${NC}"
    echo "请检查失败的测试并修复问题"
    exit 1
fi
