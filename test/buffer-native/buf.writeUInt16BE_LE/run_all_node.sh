#!/bin/bash

# Node.js v25.0.0 测试执行脚本
# 测试 buf.writeUInt16BE 和 buf.writeUInt16LE

echo "======================================"
echo "Buffer.writeUInt16BE/LE 测试套件"
echo "Node.js 版本: $(node --version)"
echo "======================================"
echo ""

# 测试文件列表
tests=(
  "part1_basic.js"
  "part2_types.js"
  "part3_errors.js"
  "part4_edge_cases.js"
  "part5_buffer_variants.js"
  "part6_numeric_coercion.js"
  "part7_memory_views.js"
  "part8_ultimate_edge_cases.js"
  "part9_round2_doc_alignment.js"
  "part10_round3_behavior_edge.js"
  "part11_round4_combination.js"
  "part12_round5_extreme.js"
  "part13_round6_deep_gap_check.js"
  "part14_round7_real_world.js"
  "part15_round8_performance.js"
  "part16_round9_deep_arraylike_and_typedarray.js"
  "part17_round10_ultra_deep_edge_cases.js"
)

total_tests=0
total_passed=0
total_failed=0
failed_files=()

# 执行所有测试
for test_file in "${tests[@]}"; do
  if [ ! -f "$test_file" ]; then
    echo "⚠️  跳过不存在的文件: $test_file"
    echo ""
    continue
  fi

  echo "运行: $test_file"
  echo "--------------------------------------"

  output=$(node "$test_file" 2>&1)
  exit_code=$?

  if [ $exit_code -ne 0 ]; then
    echo "❌ 执行失败 (退出码: $exit_code)"
    echo "$output"
    failed_files+=("$test_file")
  else
    # 解析 JSON 输出
    success=$(echo "$output" | grep -o '"success":[^,]*' | head -1 | cut -d':' -f2 | tr -d ' ')
    passed=$(echo "$output" | grep -o '"passed":[^,]*' | head -1 | cut -d':' -f2 | tr -d ' ')
    failed=$(echo "$output" | grep -o '"failed":[^,]*' | head -1 | cut -d':' -f2 | tr -d ' ')
    total=$(echo "$output" | grep -o '"total":[^,]*' | head -1 | cut -d':' -f2 | tr -d ' ')

    if [ "$success" = "true" ]; then
      echo "✅ 全部通过: $passed/$total"
    else
      echo "❌ 存在失败: $passed 通过, $failed 失败 (共 $total)"
      failed_files+=("$test_file")
    fi

    total_tests=$((total_tests + total))
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))
  fi

  echo ""
done

# 汇总报告
echo "======================================"
echo "汇总报告"
echo "======================================"
echo "总测试数: $total_tests"
echo "通过: $total_passed"
echo "失败: $total_failed"

if [ $total_tests -gt 0 ]; then
  success_rate=$(awk "BEGIN {printf \"%.2f\", ($total_passed / $total_tests) * 100}")
  echo "成功率: $success_rate%"
fi

if [ ${#failed_files[@]} -gt 0 ]; then
  echo ""
  echo "失败的测试文件:"
  for file in "${failed_files[@]}"; do
    echo "  - $file"
  done
  echo ""
  exit 1
else
  echo ""
  echo "🎉 所有测试通过！"
  echo ""
  exit 0
fi
