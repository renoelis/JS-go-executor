#!/bin/bash

# Buffer.copyBytesFrom 完整测试套件
# 使用 Node.js v25.0.0 运行所有测试

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Buffer.copyBytesFrom Test Suite"
echo "Node.js version: $(node --version)"
echo "Test directory: $SCRIPT_DIR"
echo "=========================================="
echo ""

# 测试脚本列表
tests=(
  "part1_basic.js"
  "part2_edge_cases.js"
  "part3_all_typedarray_types.js"
  "part4_parameter_validation.js"
  "part5_offset_length_boundaries.js"
  "part6_copy_independence.js"
  "part7_special_values.js"
  "part8_byte_ordering.js"
  "part9_arraybuffer_views.js"
  "part10_complex_scenarios.js"
  "part11_round2_documentation.js"
  "part12_round3_node_behavior.js"
  "part13_round4_combinations.js"
  "part14_round5_extreme.js"
  "part15_deep_edge_cases.js"
  "part16_advanced_typedarray.js"
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
