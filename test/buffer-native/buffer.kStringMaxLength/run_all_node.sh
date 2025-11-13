#!/bin/bash

# Buffer.kStringMaxLength - Complete Test Suite Runner
# Run all test parts for Node.js v25.0.0

echo "=========================================="
echo "Buffer.kStringMaxLength - Complete Tests"
echo "Node.js version: $(node --version)"
echo "=========================================="
echo ""

# 测试文件列表
tests=(
  "part1_basic.js"
  "part2_value_validation.js"
  "part3_immutability.js"
  "part4_practical_usage.js"
  "part5_relationships.js"
  "part6_error_scenarios.js"
  "part7_edge_cases.js"
  "part8_integration.js"
  "part9_extreme.js"
  "part10_additional_methods.js"
  "part11_numeric_operations.js"
  "part12_encoding_validation.js"
  "test.js"
)

# 统计变量
total_tests=0
total_passed=0
total_failed=0
failed_files=()

# 运行每个测试文件
for test_file in "${tests[@]}"; do
  echo "Running: $test_file"
  echo "----------------------------------------"

  # 执行测试并捕获输出
  output=$(node "$test_file" 2>&1)
  exit_code=$?

  # 打印输出
  echo "$output"

  # 解析结果（从 JSON 输出中提取）
  if echo "$output" | grep -q '"success": true'; then
    echo "✅ $test_file PASSED"
  else
    echo "❌ $test_file FAILED"
    failed_files+=("$test_file")
  fi

  # 提取统计信息
  passed=$(echo "$output" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*' | tail -1)
  failed=$(echo "$output" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*' | tail -1)

  if [ -n "$passed" ]; then
    total_passed=$((total_passed + passed))
  fi

  if [ -n "$failed" ]; then
    total_failed=$((total_failed + failed))
  fi

  echo ""
done

# 计算总数
total_tests=$((total_passed + total_failed))

# 计算成功率
if [ $total_tests -gt 0 ]; then
  success_rate=$(awk "BEGIN {printf \"%.2f\", ($total_passed / $total_tests) * 100}")
else
  success_rate="0.00"
fi

# 输出总结
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total Tests:  $total_tests"
echo "Passed:       $total_passed ✅"
echo "Failed:       $total_failed ❌"
echo "Success Rate: $success_rate%"
echo ""

# 如果有失败的文件，列出来
if [ ${#failed_files[@]} -gt 0 ]; then
  echo "Failed Files:"
  for file in "${failed_files[@]}"; do
    echo "  - $file"
  done
  echo ""
fi

# 返回退出码
if [ $total_failed -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed."
  exit 1
fi
