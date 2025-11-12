#!/bin/bash

# Buffer.byteLength API 完整测试套件
# 本脚本用于在 Node.js v25.0.0 环境下执行所有测试

echo "=========================================="
echo "Buffer.byteLength API 测试套件"
echo "Node 版本: $(node --version)"
echo "=========================================="
echo ""

# 测试文件列表
tests=(
  "part1_basic.js"
  "part2_encodings.js"
  "part3_types.js"
  "part4_errors.js"
  "part5_edge_cases.js"
  "part6_compatibility.js"
  "part7_advanced_edge_cases.js"
  "part8_cross_validation.js"
  "part9_extreme_scenarios.js"
  "part10_deep_coverage.js"
  "part11_additional_coverage.js"
)

total_tests=0
passed_tests=0
failed_tests=0

# 执行每个测试文件
for test_file in "${tests[@]}"; do
  echo "----------------------------------------"
  echo "执行: $test_file"
  echo "----------------------------------------"

  result=$(node "$test_file" 2>&1)
  echo "$result"

  # 提取测试结果
  if echo "$result" | grep -q '"success": true'; then
    file_passed=$(echo "$result" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*')
    file_total=$(echo "$result" | grep -o '"total": [0-9]*' | grep -o '[0-9]*')
    passed_tests=$((passed_tests + file_passed))
    total_tests=$((total_tests + file_total))
    echo "✅ $test_file 通过"
  else
    # 统计失败的用例
    file_failed=$(echo "$result" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*')
    file_total=$(echo "$result" | grep -o '"total": [0-9]*' | grep -o '[0-9]*')
    file_passed=$(echo "$result" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*')

    if [ -n "$file_total" ]; then
      passed_tests=$((passed_tests + file_passed))
      total_tests=$((total_tests + file_total))
      failed_tests=$((failed_tests + file_failed))
    fi
    echo "❌ $test_file 存在失败用例"
  fi

  echo ""
done

# 汇总结果
echo "=========================================="
echo "测试汇总"
echo "=========================================="
echo "总用例数: $total_tests"
echo "通过: $passed_tests"
echo "失败: $failed_tests"

if [ $total_tests -gt 0 ]; then
  success_rate=$(awk "BEGIN {printf \"%.2f\", ($passed_tests/$total_tests)*100}")
  echo "成功率: $success_rate%"
fi

echo "=========================================="

# 根据结果设置退出码
if [ $failed_tests -eq 0 ] && [ $total_tests -gt 0 ]; then
  echo "✅ 所有测试通过！"
  exit 0
else
  echo "❌ 存在失败的测试"
  exit 1
fi
