#!/bin/bash

# buf.write() 测试脚本 - Node.js v25.0.0
# 执行所有 write 相关的测试

echo "========================================"
echo "Buffer.prototype.write() 完整测试套件"
echo "Node 版本: $(node --version)"
echo "========================================"
echo ""

# 测试文件列表
tests=(
  "part1_write_basic.js"
  "part2_write_encodings.js"
  "part3_write_errors.js"
  "part4_write_edge_cases.js"
  "part5_write_safety.js"
  "part6_write_multibyte.js"
  "part7_write_param_combinations.js"
  "part8_write_performance.js"
  "part9_round2_doc_coverage.js"
  "part10_round2_edge_values.js"
  "part11_round3_behavior_verification.js"
  "part12_round4_script_coverage.js"
  "part13_round5_extreme_scenarios.js"
  "part14_round6_missing_scenarios.js"
  "part15_round7_targeted_tests.js"
  "part16_round8_special_interactions.js"
  "part17_round9_final_comprehensive.js"
  "part18_deep_missing_coverage.js"
  "part20_ultimate_edge_cases.js"
  "part21_final_deep_dive.js"
)

# 统计变量
total_tests=0
total_passed=0
total_failed=0
failed_files=()

# 执行每个测试文件
for test_file in "${tests[@]}"; do
  echo "----------------------------------------"
  echo "运行: $test_file"
  echo "----------------------------------------"

  # 执行测试并捕获输出
  output=$(node "$test_file" 2>&1)
  exit_code=$?

  # 解析 JSON 结果
  if echo "$output" | grep -q '"success"'; then
    # 提取测试统计
    passed=$(echo "$output" | grep -o '"passed": [0-9]*' | head -1 | awk -F': ' '{print $2}')
    failed=$(echo "$output" | grep -o '"failed": [0-9]*' | head -1 | awk -F': ' '{print $2}')
    total=$(echo "$output" | grep -o '"total": [0-9]*' | head -1 | awk -F': ' '{print $2}')
    
    # 累加统计
    total_tests=$((total_tests + total))
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))

    # 显示结果
    if [ "$failed" -eq 0 ]; then
      echo "✅ 通过: $passed/$total"
    else
      echo "❌ 失败: $failed/$total (通过: $passed)"
      failed_files+=("$test_file")
    fi
  else
    echo "❌ 执行错误或输出格式异常"
    echo "$output"
    failed_files+=("$test_file")
  fi

  echo ""
done

# 输出总结
echo "========================================"
echo "测试总结"
echo "========================================"
echo "总测试数: $total_tests"
echo "通过: $total_passed"
echo "失败: $total_failed"

if [ "$total_tests" -gt 0 ]; then
  success_rate=$(echo "scale=2; $total_passed * 100 / $total_tests" | bc)
  echo "成功率: ${success_rate}%"
fi
echo ""

# 列出失败的文件
if [ ${#failed_files[@]} -gt 0 ]; then
  echo "失败的测试文件:"
  for file in "${failed_files[@]}"; do
    echo "  - $file"
  done
  echo ""
  exit 1
else
  echo "🎉 所有测试通过！"
  echo ""
  exit 0
fi
