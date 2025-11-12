#!/bin/bash

# Buffer.allocUnsafe 测试执行脚本
# Node.js v25.0.0 环境

echo "=== Buffer.allocUnsafe 测试开始 ==="
echo "Node.js 版本: $(node --version)"
echo ""

# 测试文件列表
TEST_FILES=(
    "part1_basic.js"
    "part2_types.js"
    "part3_errors.js"
    "part4_memory.js"
    "part5_edge_cases.js"
    "part6_performance.js"
    "part7_combinations.js"
    "part8_extreme.js"
    "part9_deep_boundary.js"
    "part10_memory_safety.js"
    "part11_platform_compat.js"
    "part12_historical_compat.js"
    "part13_concurrent.js"
    "part14_poolsize_and_constants.js"
    "part15_error_types.js"
    "part16_function_properties.js"
    "part17_deep_coverage_补漏.js"
    "part18_advanced_gap_filling.js"
)

# 总体统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 执行每个测试文件
for test_file in "${TEST_FILES[@]}"; do
    echo "执行测试文件: $test_file"
    echo "----------------------------------------"

    # 执行测试并捕获输出
    OUTPUT=$(node "$test_file" 2>&1)
    EXIT_CODE=$?

    if [ $EXIT_CODE -ne 0 ]; then
        echo "❌ 测试执行失败 (退出码: $EXIT_CODE)"
        echo "$OUTPUT"
        ((FAILED_TESTS++))
    else
        # 解析JSON输出
        SUCCESS=$(echo "$OUTPUT" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' ')
        SUMMARY=$(echo "$OUTPUT" | grep -o '"total":[^,]*"passed":[^,]*"failed":[^}]*' | head -1)

        if [ "$SUCCESS" = "true" ]; then
            echo "✅ 测试通过"
        else
            echo "❌ 测试失败"
        fi

        if [ -n "$SUMMARY" ]; then
            echo "统计: $SUMMARY"

            # 提取具体数字
            TOTAL=$(echo "$SUMMARY" | grep -o '"total":[^,]*' | cut -d':' -f2)
            PASSED=$(echo "$SUMMARY" | grep -o '"passed":[^,]*' | cut -d':' -f2)
            FAILED=$(echo "$SUMMARY" | grep -o '"failed":[^,]*' | cut -d':' -f2)

            TOTAL_TESTS=$((TOTAL_TESTS + TOTAL))
            PASSED_TESTS=$((PASSED_TESTS + PASSED))
            FAILED_TESTS=$((FAILED_TESTS + FAILED))
        fi

        # 显示详细结果
        echo "$OUTPUT" | grep -E '✅|❌' | head -10
    fi

    echo ""
done

# 总体总结
echo "========================================"
echo "=== Buffer.allocUnsafe 测试总结 ==="
echo "========================================"
echo "总测试数量: $TOTAL_TESTS"
echo "通过测试: $PASSED_TESTS"
echo "失败测试: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo "✅ 所有测试通过!"
    exit 0
else
    echo "❌ 有测试失败!"
    exit 1
fi