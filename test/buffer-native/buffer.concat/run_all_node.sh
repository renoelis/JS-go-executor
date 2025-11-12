#!/bin/bash

# Buffer.concat() - 完整测试套件执行脚本
# 运行所有 Buffer.concat() 测试用例

echo "================================"
echo "Buffer.concat() 测试开始"
echo "Node 版本: $(node --version)"
echo "================================"
echo ""

# 测试文件列表
tests=(
  "part1_concat_basic.js"
  "part2_concat_types.js"
  "part3_concat_totalLength.js"
  "part4_concat_errors.js"
  "part5_concat_edge_cases.js"
  "part6_concat_encodings.js"
  "part7_concat_advanced.js"
  "part8_concat_combinations.js"
  "part9_concat_extreme.js"
  "part10_concat_deep_missing.js"
  "part11_concat_api_interactions.js"
  "part12_concat_read_write.js"
  "part13_concat_ultra_deep.js"
  "part14_concat_special_objects.js"
  "part15_concat_async_errors.js"
  "part16_additional_api_coverage.js"
)

# 初始化计数器
total_tests=0
passed_tests=0
failed_tests=0

# 遍历执行每个测试文件
for test_file in "${tests[@]}"; do
  echo "----------------------------------------"
  echo "运行: $test_file"
  echo "----------------------------------------"

  # 执行测试并捕获输出
  output=$(node "$test_file" 2>&1)
  exit_code=$?

  # 打印输出
  echo "$output"

  # 解析 JSON 结果（如果可能）
  if echo "$output" | grep -q '"success"'; then
    # 提取统计信息
    test_total=$(echo "$output" | grep -o '"total": [0-9]*' | grep -o '[0-9]*')
    test_passed=$(echo "$output" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*')
    test_failed=$(echo "$output" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*')

    if [ -n "$test_total" ]; then
      total_tests=$((total_tests + test_total))
      passed_tests=$((passed_tests + test_passed))
      failed_tests=$((failed_tests + test_failed))
    fi
  fi

  echo ""
done

# 打印总结
echo "========================================"
echo "所有测试执行完毕"
echo "========================================"
echo "总用例数: $total_tests"
echo "通过: $passed_tests ✅"
echo "失败: $failed_tests ❌"

if [ $total_tests -gt 0 ]; then
  success_rate=$(awk "BEGIN {printf \"%.2f\", ($passed_tests/$total_tests)*100}")
  echo "成功率: $success_rate%"
fi

echo "========================================"

# 根据失败数设置退出码
if [ $failed_tests -gt 0 ]; then
  exit 1
else
  exit 0
fi
