#!/bin/bash

# Buffer Symbol.iterator 完整测试套件
# 使用 Node.js v25.0.0 运行所有测试

echo "=========================================="
echo "Buffer Symbol.iterator Test Suite"
echo "Node.js version: $(node --version)"
echo "=========================================="
echo ""

# 测试脚本列表
tests=(
  "part1_basic_iteration.js"
  "part2_input_types.js"
  "part3_boundary_empty.js"
  "part4_iterator_protocol.js"
  "part5_error_handling.js"
  "part6_documentation_compliance.js"
  "part7_node_behavior_edges.js"
  "part8_combination_scenarios.js"
  "part9_extreme_compatibility.js"
  "part10_deep_edge_cases.js"
  "part11_iterator_lifecycle.js"
  "part12_performance_memory.js"
  "part13_es_specification.js"
  "part14_exception_recovery.js"
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

  if node "$test"; then
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
