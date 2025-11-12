#!/bin/bash

# buffer.atob() 测试套件 - Node.js v25.0.0
# 执行所有测试脚本并生成报告

echo "======================================"
echo "buffer.atob() 测试套件"
echo "Node.js 版本: $(node --version)"
echo "======================================"
echo ""

# 测试文件列表
tests=(
  "part1_atob_basic.js"
  "part2_atob_types.js"
  "part3_atob_errors.js"
  "part4_atob_encodings.js"
  "part5_atob_edge_cases.js"
  "part6_atob_safety.js"
  "part7_atob_round_trip.js"
  "part8_atob_edge_behaviors.js"
  "part9_atob_extreme_compat.js"
  "part10_atob_final_compat.js"
  "part11_atob_deep_gap_filling.js"
  "part12_atob_ultimate_gap_filling.js"
  "part13_atob_ultimate_deep_gap.js"
  "part14_atob_extreme_objects.js"
  "part15_deep_spec_compliance.js"
  "part16_extreme_performance.js"
)

total_tests=0
total_passed=0
total_failed=0
failed_files=()

# 执行每个测试文件
for test_file in "${tests[@]}"; do
  echo "--------------------------------------"
  echo "执行: $test_file"
  echo "--------------------------------------"

  # 运行测试
  output=$(node "$test_file" 2>&1)
  exit_code=$?

  # 输出结果
  echo "$output"
  echo ""

  # 解析结果（从 JSON 输出中提取）
  if echo "$output" | grep -q '"success": true'; then
    passed=$(echo "$output" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*')
    failed=$(echo "$output" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*')
    total=$(echo "$output" | grep -o '"total": [0-9]*' | grep -o '[0-9]*')

    total_tests=$((total_tests + total))
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))

    echo "✅ $test_file 通过"
  else
    echo "❌ $test_file 失败"
    failed_files+=("$test_file")

    # 尝试提取测试数量
    if echo "$output" | grep -q '"total":'; then
      passed=$(echo "$output" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*' || echo "0")
      failed=$(echo "$output" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*' || echo "0")
      total=$(echo "$output" | grep -o '"total": [0-9]*' | grep -o '[0-9]*' || echo "0")

      total_tests=$((total_tests + total))
      total_passed=$((total_passed + passed))
      total_failed=$((total_failed + failed))
    fi
  fi

  echo ""
done

# 生成总结报告
echo "======================================"
echo "测试总结"
echo "======================================"
echo "总测试数: $total_tests"
echo "通过: $total_passed"
echo "失败: $total_failed"

if [ $total_tests -gt 0 ]; then
  success_rate=$(awk "BEGIN {printf \"%.2f\", ($total_passed / $total_tests) * 100}")
  echo "成功率: $success_rate%"
fi

echo ""

if [ ${#failed_files[@]} -eq 0 ]; then
  echo "✅ 所有测试文件通过！"
  exit 0
else
  echo "❌ 以下测试文件失败:"
  for file in "${failed_files[@]}"; do
    echo "  - $file"
  done
  exit 1
fi
