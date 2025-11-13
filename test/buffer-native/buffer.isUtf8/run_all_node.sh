#!/bin/bash

# Buffer.isUtf8() 完整测试套件
# 使用 Node.js v25.0.0 运行所有测试

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Buffer.isUtf8() Test Suite"
echo "Node.js version: $(node --version)"
echo "Test directory: $SCRIPT_DIR"
echo "=========================================="
echo ""

# 测试脚本列表
tests=(
  "part1_basic.js"
  "part2_edge_cases.js"
  "part3_typed_arrays.js"
  "part4_offset_length.js"
  "part5_invalid_sequences.js"
  "part6_continuation_bytes.js"
  "part7_overlong_encoding.js"
  "part8_unicode_ranges.js"
  "part9_mixed_scenarios.js"
  "part10_subarray_views.js"
  "part11_buffer_methods.js"
  "part12_special_unicode.js"
  "part13_parameter_coercion.js"
  "part14_extreme_cases.js"
  "part15_additional_edge_cases.js"
  "part16_function_properties.js"
  "part17_deep_boundary_cases.js"
  "part18_final_gap_analysis.js"
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
