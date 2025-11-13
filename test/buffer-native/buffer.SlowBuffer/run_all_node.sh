#!/bin/bash

# Buffer.SlowBuffer 完整测试套件
# 使用 Node.js v25.0.0 运行所有测试

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Buffer.SlowBuffer Test Suite"
echo "Node.js version: $(node --version)"
echo "Test directory: $SCRIPT_DIR"
echo "=========================================="
echo ""

# 测试脚本列表
tests=(
  "part1_api_removal.js"
  "part2_replacement_basic.js"
  "part3_replacement_types.js"
  "part4_replacement_errors.js"
  "part5_replacement_memory.js"
  "part6_historical_behavior.js"
  "part7_constants_limits.js"
  "part8_buffer_methods.js"
  "part9_encodings.js"
  "part10_edge_cases.js"
  "part11_typedarray_deep.js"
  "part12_extreme_final.js"
  "part13_readwrite_variable.js"
  "part14_internal_methods.js"
  "part15_static_methods.js"
  "part16_array_methods.js"
  "part17_module_functions.js"
  "part18_documented_behaviors.js"
)

# 统计变量
total_suites=0
passed_suites=0
failed_suites=0
total_tests=0
passed_tests=0
failed_tests=0

# 运行每个测试文件
for test in "${tests[@]}"; do
  echo "Running: $test"
  echo "----------------------------------------"

  total_suites=$((total_suites + 1))

  # 运行测试并捕获输出
  output=$(node "$SCRIPT_DIR/$test" 2>&1)
  exit_code=$?

  # 解析 JSON 输出获取详细统计 (使用 sed/awk 替代 grep -P)
  if echo "$output" | grep -q '"success"'; then
    test_total=$(echo "$output" | sed -n 's/.*"total":[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
    test_passed=$(echo "$output" | sed -n 's/.*"passed":[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
    test_failed=$(echo "$output" | sed -n 's/.*"failed":[[:space:]]*\([0-9]*\).*/\1/p' | head -1)

    if [ -n "$test_total" ]; then
      total_tests=$((total_tests + test_total))
      passed_tests=$((passed_tests + test_passed))
      failed_tests=$((failed_tests + test_failed))
    fi
  fi

  # 显示测试输出
  echo "$output"

  # 判断测试是否通过
  if [ $exit_code -eq 0 ] && echo "$output" | grep -q '"success":[[:space:]]*true'; then
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
echo "Passed Suites: $passed_suites"
echo "Failed Suites: $failed_suites"
echo ""
echo "Total Test Cases: $total_tests"
echo "Passed Test Cases: $passed_tests"
echo "Failed Test Cases: $failed_tests"
echo ""

if [ $failed_suites -eq 0 ] && [ $failed_tests -eq 0 ]; then
  echo "✅ All test suites and test cases passed!"
  exit 0
else
  echo "❌ Some tests failed"
  echo "   - Failed Suites: $failed_suites"
  echo "   - Failed Test Cases: $failed_tests"
  exit 1
fi
