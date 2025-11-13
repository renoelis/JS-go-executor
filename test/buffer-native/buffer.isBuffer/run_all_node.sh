#!/bin/bash

# Buffer.isBuffer() 完整测试套件
# 使用 Node.js v25.0.0 运行所有测试

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Buffer.isBuffer() Test Suite"
echo "Node.js version: $(node --version)"
echo "Test directory: $SCRIPT_DIR"
echo "=========================================="
echo ""

# 测试脚本列表
tests=(
  "part1_basic.js"
  "part2_types.js"
  "part3_special_buffers.js"
  "part4_edge_cases.js"
  "part5_type_coercion.js"
  "part6_compatibility.js"
  "part7_documentation.js"
  "part8_node_behavior.js"
  "part9_combinations.js"
  "part10_extreme_cases.js"
  "part11_missing_scenarios.js"
  "part12_advanced_methods.js"
  "part13_array_methods.js"
  "part14_function_properties.js"
  "part15_extreme_parameters.js"
  "part16_performance_stress.js"
  "part17_final_gap_analysis.js"
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
