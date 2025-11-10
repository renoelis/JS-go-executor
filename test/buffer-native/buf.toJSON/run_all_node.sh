#!/bin/bash

# Run all Node.js toJSON tests

echo "========================================"
echo "Running Buffer.prototype.toJSON Tests"
echo "Node.js version: $(node --version)"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 测试文件列表
tests=(
  "part1_toJSON_basic.js"
  "part2_toJSON_stringify.js"
  "part3_toJSON_typedarray.js"
  "part4_toJSON_edge_cases.js"
  "part5_toJSON_errors.js"
  "part6_toJSON_special_cases.js"
  "part7_toJSON_combinations.js"
  "part8_toJSON_extreme_cases.js"
  "part9_toJSON_method_properties.js"
  "part10_toJSON_advanced_types.js"
  "part11_toJSON_encoding_edge_cases.js"
  "part12_toJSON_special_indices.js"
  "part13_toJSON_buffer_methods.js"
  "part14_toJSON_deep_scenarios.js"
  "part15_toJSON_overrides.js"
  "part16_toJSON_value_conversion.js"
  "part17_toJSON_parse_reviver.js"
  "part18_toJSON_buffer_integration.js"
)

total_passed=0
total_failed=0
total_tests=0

# 运行每个测试文件
for test_file in "${tests[@]}"; do
  echo "----------------------------------------"
  echo "Running: $test_file"
  echo "----------------------------------------"

  result=$(node "$SCRIPT_DIR/$test_file" 2>&1)
  echo "$result"

  # 从 JSON 输出中提取统计信息
  passed=$(echo "$result" | grep -o '"passed"[[:space:]]*:[[:space:]]*[0-9]*' | tail -1 | grep -o '[0-9]*')
  failed=$(echo "$result" | grep -o '"failed"[[:space:]]*:[[:space:]]*[0-9]*' | tail -1 | grep -o '[0-9]*')

  if [ -n "$passed" ] && [ -n "$failed" ]; then
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))
    total_tests=$((total_tests + passed + failed))
  fi

  echo ""
done

echo "========================================"
echo "Overall Summary"
echo "========================================"
echo "Total Tests: $total_tests"
echo "Passed: $total_passed"
echo "Failed: $total_failed"

if [ $total_failed -eq 0 ]; then
  echo "Status: ✅ ALL TESTS PASSED"
  exit 0
else
  success_rate=$(awk "BEGIN {printf \"%.2f\", ($total_passed / $total_tests) * 100}")
  echo "Success Rate: ${success_rate}%"
  echo "Status: ❌ SOME TESTS FAILED"
  exit 1
fi
