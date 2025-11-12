#!/bin/bash

# Buffer.from() 完整测试套件
# 使用 Node.js v25.0.0 运行所有测试

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Buffer.from() Test Suite"
echo "Node.js version: $(node --version)"
echo "Test directory: $SCRIPT_DIR"
echo "=========================================="
echo ""

# 测试脚本列表
tests=(
  "part1_basic_v2.js"
  "part2_edge_cases.js"
  "part3_errors.js"
  "part4_array_like_objects.js"
  "part5_buffer_copy_tests.js"
  "part6_encoding_details.js"
  "part7_string_encoding_edges.js"
  "part8_performance_memory.js"
  "part9_documentation_compliance.js"
  "part10_node_behavior_edges.js"
  "part11_combination_scenarios.js"
  "part12_extreme_compatibility.js"
  "part13_missing_encoding.js"
  "part14_missing_arraybuffer.js"
  "part15_missing_array_objects.js"
  "part16_missing_error_boundaries.js"
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
