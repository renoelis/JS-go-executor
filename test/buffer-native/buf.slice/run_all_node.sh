#!/bin/bash

# Node 本地环境测试脚本 - buf.slice

echo "================================================"
echo "开始执行 buf.slice 测试（Node 本地环境）"
echo "================================================"
echo ""

TEST_DIR="/Users/Code/Go-product/Flow-codeblock_goja/test/buffer-native/buf.slice"

total_tests=0
total_passed=0
total_failed=0

# 测试文件列表
test_files=(
  "part1_slice_basic.js"
  "part2_slice_types.js"
  "part3_slice_errors.js"
  "part4_slice_encodings.js"
  "part5_slice_safety.js"
  "part6_slice_docs_supplement.js"
  "part7_slice_edge_behaviors.js"
  "part8_slice_combinations.js"
  "part9_slice_extreme.js"
  "part10_slice_deep_supplement.js"
  "part11_slice_method_interactions.js"
  "part12_slice_exhaustive.js"
  "part13_slice_advanced.js"
  "part14_slice_edge_cases.js"
  "part15_slice_operator_tests.js"
  "part16_final_coverage.js"
  "part17_deep_edge_cases.js"
  "part18_performance_edge.js"
  "part19_final_gaps.js"
)

for test_file in "${test_files[@]}"; do
  echo "执行测试: $test_file"
  echo "----------------------------------------"

  result=$(node "$TEST_DIR/$test_file" 2>&1)

  if [ $? -eq 0 ]; then
    echo "$result" | jq '.'

    # 提取统计信息
    passed=$(echo "$result" | jq -r '.summary.passed // 0')
    failed=$(echo "$result" | jq -r '.summary.failed // 0')
    total=$(echo "$result" | jq -r '.summary.total // 0')

    total_tests=$((total_tests + total))
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))
  else
    echo "❌ 执行失败: $test_file"
    echo "$result"
    total_failed=$((total_failed + 1))
  fi

  echo ""
done

echo "================================================"
echo "测试汇总"
echo "================================================"
echo "总测试数: $total_tests"
echo "通过: $total_passed"
echo "失败: $total_failed"

if [ $total_failed -eq 0 ]; then
  echo "✅ 所有测试通过！"
  exit 0
else
  echo "❌ 有 $total_failed 个测试失败"
  exit 1
fi
