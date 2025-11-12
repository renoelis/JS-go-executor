#!/bin/bash

# Node.js v25.0.0 测试脚本执行器
# 用于 buf.writeIntBE() 和 buf.writeIntLE() 测试

echo "==================================="
echo "Node.js v25.0.0 Buffer.writeIntBE/LE 测试"
echo "==================================="
echo ""

# 检查Node.js版本
NODE_VERSION=$(node --version)
echo "当前Node.js版本: $NODE_VERSION"
echo ""

# 执行所有测试文件
TEST_FILES=(
    "part1_basic.js"
    "part2_byte_lengths.js"
    "part3_errors.js"
    "part4_boundaries.js"
    "part5_memory_safety.js"
    "part6_edge_cases.js"
    "part7_combinations.js"
    "part8_extreme_scenarios.js"
    "part9_deep_dive.js"
    "part10_micro_edge_cases.js"
    "part11_final_edge_cases.js"
    "part12_number_precision.js"
    "part13_special_types.js"
    "part14_buffer_variants.js"
    "part15_extreme_validation.js"
)

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

for test_file in "${TEST_FILES[@]}"; do
    echo "-----------------------------------"
    echo "执行测试: $test_file"
    echo "-----------------------------------"

    if node "$test_file"; then
        echo "✅ $test_file 执行完成"
    else
        echo "❌ $test_file 执行失败"
        ((FAILED_TESTS++))
    fi
    echo ""
done

echo "==================================="
echo "测试总结"
echo "==================================="
echo "测试文件: ${#TEST_FILES[@]}"
echo ""

# 重新分析结果以获取准确统计
echo "详细结果分析:"
for test_file in "${TEST_FILES[@]}"; do
    echo ""
    echo "分析 $test_file:"
    node -e "
        const result = require('./$test_file');
        if (result && result.summary) {
            console.log('  总测试数:', result.summary.total);
            console.log('  通过数:', result.summary.passed);
            console.log('  失败数:', result.summary.failed);
            console.log('  成功率:', result.summary.successRate);
        }
    " 2>/dev/null || echo "  无法解析结果文件"
done

echo ""
echo "==================================="
echo "所有测试执行完成"
echo "==================================="

# 返回适当的退出码
if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 所有测试通过!"
    exit 0
else
    echo "❌ 有 $FAILED_TESTS 个测试文件执行失败"
    exit 1
fi