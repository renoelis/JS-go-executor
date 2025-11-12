#!/bin/bash

# buffer.compare() Tests Runner
# Node.js v25.0.0 Local Test Execution Script

echo "🚀 开始执行 buffer.compare() 全套测试..."
echo "📍 测试目录: test/buffer-native/buffer.compare"
echo "🎯 Node.js 版本: $(node --version)"
echo "⏰ 执行时间: $(date)"
echo ""

test_files=(
    "part1_compare_basic.js"
    "part2_compare_types.js"
    "part3_compare_errors.js"
    "part4_compare_large.js"
    "part5_compare_edge_cases.js"
    "part6_compare_ranges.js"
    "part7_compare_static.js"
    "part8_compare_complex.js"
    "part9_compare_extreme.js"
    "part10_deep_performance.js"
    "part11_memory_management.js"
    "part12_parameter_coercion.js"
    "part13_sorting_applications.js"
    "part14_range_boundaries.js"
    "part15_encoding_scenarios.js"
    "part16_static_advanced.js"
    "part17_compatibility_extreme.js"
    "part18_this_binding.js"
    "part19_strict_type_check.js"
    "part20_negative_values.js"
    "part21_allocation_methods.js"
    "part22_complex_scenarios.js"
)

total_tests=0
total_passed=0
total_failed=0
failed_files=()

echo "📋 测试文件清单:"
for file in "${test_files[@]}"; do
    echo "  - $file"
done
echo ""

echo "🧪 开始执行测试..."
echo "================================================================================"

for file in "${test_files[@]}"; do
    echo "📂 正在执行: $file"

    if [ -f "test/buffer-native/buffer.compare/$file" ]; then
        output=$(node "test/buffer-native/buffer.compare/$file" 2>&1)
        exit_code=$?

        if [ $exit_code -eq 0 ]; then
            echo "✅ $file 执行成功"

            # 提取测试统计信息
            passed=$(echo "$output" | grep -o '"passed":[[:space:]]*[0-9]\+' | grep -o '[0-9]\+')
            failed=$(echo "$output" | grep -o '"failed":[[:space:]]*[0-9]\+' | grep -o '[0-9]\+')
            total=$(echo "$output" | grep -o '"total":[[:space:]]*[0-9]\+' | grep -o '[0-9]\+')

            if [ -n "$passed" ] && [ -n "$failed" ] && [ -n "$total" ]; then
                echo "   📊 测试结果: $passed/$total 通过"
                total_tests=$((total_tests + total))
                total_passed=$((total_passed + passed))
                total_failed=$((total_failed + failed))

                if [ "$failed" -gt 0 ]; then
                    failed_files+=("$file ($failed 失败)")
                fi
            else
                echo "   ⚠️  无法解析测试结果"
            fi
        else
            echo "❌ $file 执行失败 (退出码: $exit_code)"
            echo "   错误信息: $output"
            total_failed=$((total_failed + 1))
            failed_files+=("$file (执行失败)")
        fi
    else
        echo "❌ 文件不存在: test/buffer-native/buffer.compare/$file"
        total_failed=$((total_failed + 1))
        failed_files+=("$file (文件不存在)")
    fi

    echo "--------------------------------------------------------------------------------"
done

echo ""
echo "🏆 测试执行完成!"
echo "================================================================================"
echo "📈 总体统计:"
echo "   📁 总测试文件数: ${#test_files[@]}"
echo "   🧪 总测试用例数: $total_tests"
echo "   ✅ 通过用例数: $total_passed"
echo "   ❌ 失败用例数: $total_failed"

if [ $total_tests -gt 0 ]; then
    success_rate=$(echo "scale=2; $total_passed * 100 / $total_tests" | bc -l 2>/dev/null || echo "0")
    echo "   📊 成功率: ${success_rate}%"
fi

if [ ${#failed_files[@]} -gt 0 ]; then
    echo ""
    echo "❌ 失败的文件列表:"
    for failed_file in "${failed_files[@]}"; do
        echo "   - $failed_file"
    done
fi

echo ""
if [ $total_failed -eq 0 ]; then
    echo "🎉 所有测试全部通过! buffer.compare() 实现符合 Node.js v25.0.0 标准"
else
    echo "⚠️  存在 $total_failed 个失败用例，需要检查实现"
fi

echo "================================================================================"
echo "🏁 执行结束时间: $(date)"