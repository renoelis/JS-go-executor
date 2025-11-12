#!/bin/bash

# buffer.INSPECT_MAX_BYTES 完整测试套件
# 使用 Node.js v25.0.0 运行所有测试

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "buffer.INSPECT_MAX_BYTES Test Suite"
echo "Node.js version: $(node --version)"
echo "Test directory: $SCRIPT_DIR"
echo "=========================================="
echo ""

# 测试脚本列表
tests=(
  "part1_basic.js"
  "part2_mutability.js"
  "part3_edge_values.js"
  "part4_types.js"
  "part5_inspect_behavior.js"
  "part6_property_characteristics.js"
  "part7_error_codes.js"
  "part8_truncation_precision.js"
  "part9_buffer_types.js"
  "part10_extreme_scenarios.js"
  "part11_compatibility.js"
  "part12_deep_edge_cases.js"
  "part13_additional_gaps.js"
  "part14_implementation_details.js"
  "part15_ultimate_coverage.js"
)

# 统计变量
total_tests=0
passed_tests=0
failed_tests=0

# 运行每个测试文件
for test_file in "${tests[@]}"; do
  test_path="$SCRIPT_DIR/$test_file"

  if [ ! -f "$test_path" ]; then
    echo "⚠️  Test file not found: $test_file"
    continue
  fi

  echo "----------------------------------------"
  echo "Running: $test_file"
  echo "----------------------------------------"

  # 运行测试并捕获输出
  output=$(node "$test_path" 2>&1)
  exit_code=$?

  echo "$output"
  echo ""

  # 解析结果（从 JSON 输出中提取）
  if echo "$output" | grep -q '"success": true'; then
    echo "✅ $test_file PASSED"
  else
    echo "❌ $test_file FAILED"
  fi

  # 提取统计信息
  test_count=$(echo "$output" | grep -o '"total": [0-9]*' | grep -o '[0-9]*' | head -1)
  test_passed=$(echo "$output" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*' | head -1)
  test_failed=$(echo "$output" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*' | head -1)

  if [ -n "$test_count" ]; then
    total_tests=$((total_tests + test_count))
    passed_tests=$((passed_tests + test_passed))
    failed_tests=$((failed_tests + test_failed))
  fi

  echo ""
done

# 输出总体统计
echo "=========================================="
echo "Test Suite Summary"
echo "=========================================="
echo "Total tests:  $total_tests"
echo "Passed:       $passed_tests"
echo "Failed:       $failed_tests"

if [ $failed_tests -eq 0 ] && [ $total_tests -gt 0 ]; then
  echo ""
  echo "✅ All tests passed!"
  exit 0
else
  echo ""
  echo "❌ Some tests failed"
  exit 1
fi
