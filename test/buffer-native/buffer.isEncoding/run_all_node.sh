#!/bin/bash

# Buffer.isEncoding() 完整测试套件
# 使用 Node.js v25.0.0 运行所有测试

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Buffer.isEncoding() Test Suite"
echo "Node.js version: $(node --version)"
echo "Test directory: $SCRIPT_DIR"
echo "=========================================="
echo ""

# 测试脚本列表
tests=(
  "part1_basic.js"
  "part2_case_sensitivity.js"
  "part3_type_errors.js"
  "part4_edge_cases.js"
  "part5_string_coercion.js"
  "part6_unicode_special.js"
  "part7_length_extremes.js"
  "part8_no_arguments.js"
  "part9_encoding_aliases.js"
  "part10_return_type.js"
  "part11_performance.js"
  "part12_combination.js"
  "part13_boundary_values.js"
  "part14_real_scenarios.js"
  "part15_extreme_cases.js"
  "part16_nodejs_compatibility.js"
  "part17_function_properties.js"
  "part18_deep_edge_cases.js"
  "part19_final_gap_analysis.js"
)

# 统计变量
total_suites=0
passed_suites=0
failed_suites=0

# 运行每个测试文件
for test in "${tests[@]}"; do
  echo "Running: $test"
  echo "----------------------------------------"

  total_suites=$((total_suites + 1))

  if node "$SCRIPT_DIR/$test"; then
    passed_suites=$((passed_suites + 1))
    echo "✅ $test PASSED"
  else
    failed_suites=$((failed_suites + 1))
    echo "❌ $test FAILED"
  fi

  echo ""
  echo ""
done

# 输出总结
echo "=========================================="
echo "Test Suite Summary"
echo "=========================================="
echo "Total Suites: $total_suites"
echo "Passed: $passed_suites"
echo "Failed: $failed_suites"
echo ""

if [ $failed_suites -eq 0 ]; then
  echo "✅ All test suites passed!"
  exit 0
else
  echo "❌ Some test suites failed"
  exit 1
fi
