#!/bin/bash

# writeInt16BE 完整测试执行脚本
# 需要 Node.js v25.0.0 环境

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================"
echo "Buffer.writeInt16BE() 完整测试套件"
echo "Node 版本: $(node --version)"
echo "测试目录: $SCRIPT_DIR"
echo "======================================"
echo ""

# 测试文件列表
tests=(
  "part1_basic.js"
  "part2_types.js"
  "part3_errors.js"
  "part4_boundaries.js"
  "part5_compatibility.js"
  "part6_round3_edge_cases.js"
  "part7_round4_combinations.js"
  "part8_round5_extreme.js"
  "part9_round6_numeric_coercion.js"
  "part10_round7_memory_views.js"
  "part11_round8_ultimate_edge_cases.js"
  "part12_round9_advanced_edge_cases.js"
  "part13_round10_ultimate_stress.js"
)

# 统计变量
total_tests=0
total_passed=0
total_failed=0
failed_files=()

# 遍历执行所有测试
for test_file in "${tests[@]}"; do
  echo "----------------------------------------"
  echo "执行: $test_file"
  echo "----------------------------------------"

  # 执行测试并捕获输出
  output=$(node "$SCRIPT_DIR/$test_file" 2>&1)
  exit_code=$?

  # 显示输出
  echo "$output"

  # 解析 JSON 结果
  if [ $exit_code -eq 0 ]; then
    # 提取统计信息
    passed=$(echo "$output" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*')
    failed=$(echo "$output" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*')
    total=$(echo "$output" | grep -o '"total": [0-9]*' | grep -o '[0-9]*')

    if [ -n "$passed" ] && [ -n "$failed" ] && [ -n "$total" ]; then
      total_tests=$((total_tests + total))
      total_passed=$((total_passed + passed))
      total_failed=$((total_failed + failed))

      if [ "$failed" -gt 0 ]; then
        failed_files+=("$test_file")
      fi
    fi
  else
    echo "❌ 测试文件执行失败: $test_file"
    failed_files+=("$test_file")
  fi

  echo ""
done

# 显示总结
echo "======================================"
echo "测试总结"
echo "======================================"
echo "总测试数: $total_tests"
echo "通过: $total_passed ✅"
echo "失败: $total_failed ❌"

if [ $total_tests -gt 0 ]; then
  success_rate=$(awk "BEGIN {printf \"%.2f\", ($total_passed/$total_tests)*100}")
  echo "成功率: $success_rate%"
fi

echo ""

if [ ${#failed_files[@]} -gt 0 ]; then
  echo "失败的测试文件:"
  for file in "${failed_files[@]}"; do
    echo "  - $file"
  done
  exit 1
else
  echo "🎉 所有测试通过！"
  exit 0
fi
