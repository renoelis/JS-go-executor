#!/bin/bash

# buf.values() - Node.js v25.0.0 完整测试执行脚本

echo "=========================================="
echo "Buffer.prototype.values() 测试套件"
echo "Node.js 版本: $(node --version)"
echo "=========================================="
echo ""

# 测试文件列表
test_files=(
  "part1_values_basic.js"
  "part2_values_types.js"
  "part3_values_errors.js"
  "part4_values_iteration.js"
  "part5_values_edge_cases.js"
  "part6_round2_docs_coverage.js"
  "part7_round3_actual_behavior.js"
  "part8_round4_combinations.js"
  "part9_round5_extreme_cases.js"
  "part10_deep_internal_state.js"
  "part11_deep_underlying.js"
  "part12_deep_concurrent.js"
  "part13_deepest_iterator.js"
  "part14_deepest_methods.js"
  "part15_deepest_extreme.js"
  "part16_advanced_prototype.js"
  "part17_typedarray_methods.js"
  "part18_read_write_encoding.js"
  "part19_deep_missing_coverage.js"
  "part20_extreme_edge_cases.js"
  "part21_lifecycle_and_scope.js"
  "part22_data_integrity_and_structures.js"
  "part23_extreme_scenarios.js"
)

# 统计变量
total_tests=0
total_passed=0
total_failed=0
failed_files=()

# 执行每个测试文件
for file in "${test_files[@]}"; do
  echo "运行测试: $file"
  echo "------------------------------------------"

  # 执行测试并捕获输出
  output=$(node "$file" 2>&1)
  exit_code=$?

  # 解析 JSON 结果
  if echo "$output" | grep -q '"success"'; then
    # 提取统计信息
    passed=$(echo "$output" | grep -o '"passed": [0-9]*' | head -1 | grep -o '[0-9]*')
    failed=$(echo "$output" | grep -o '"failed": [0-9]*' | head -1 | grep -o '[0-9]*')
    total=$(echo "$output" | grep -o '"total": [0-9]*' | head -1 | grep -o '[0-9]*')
    success=$(echo "$output" | grep -o '"success": [a-z]*' | head -1 | sed 's/"success": //')

    total_tests=$((total_tests + total))
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))

    if [ "$success" = "true" ] && [ "$failed" -eq 0 ]; then
      echo "✅ $file: 通过 $passed/$total 个测试"
    else
      echo "❌ $file: 通过 $passed/$total 个测试，失败 $failed 个"
      failed_files+=("$file")
    fi
  else
    echo "❌ $file: 执行失败或格式错误"
    echo "$output"
    failed_files+=("$file")
  fi

  echo ""
done

# 输出总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo "总测试数: $total_tests"
echo "通过: $total_passed"
echo "失败: $total_failed"

# 计算成功率（兼容 macOS 和 Linux）
if [ $total_tests -gt 0 ]; then
  success_rate=$(echo "scale=2; ($total_passed * 100) / $total_tests" | bc)
  echo "成功率: ${success_rate}%"
else
  echo "成功率: N/A"
fi

if [ ${#failed_files[@]} -eq 0 ]; then
  echo ""
  echo "🎉 所有测试通过！"
  exit 0
else
  echo ""
  echo "⚠️  以下测试文件有失败："
  for file in "${failed_files[@]}"; do
    echo "  - $file"
  done
  exit 1
fi
