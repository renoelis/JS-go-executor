#!/bin/bash

# buf.set 完整测试运行脚本（Node.js 本地环境）
# 用于在 Node.js v25.0.0 环境中验证所有测试文件

set -e

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "buf.set API 完整测试 (Node.js 本地)"
echo "=========================================="
echo "Node 版本: $(node --version)"
echo ""

# 测试文件列表
tests=(
  "part1_basic.js"
  "part2_edge_cases.js"
  "part3_typed_arrays.js"
  "part4_memory_overlap.js"
  "part5_array_like.js"
  "part6_comprehensive_edge_cases.js"
  "part7_additional_coverage.js"
  "part8_spec_compliance.js"
  "part9_deep_coverage.js"
)

total_tests=0
total_passed=0
total_failed=0

# 运行每个测试文件
for test_file in "${tests[@]}"; do
  echo "----------------------------------------"
  echo "运行测试: $test_file"
  echo "----------------------------------------"
  
  # 检查文件是否存在
  if [ ! -f "$TEST_DIR/$test_file" ]; then
    echo "❌ 测试文件不存在: $test_file"
    echo ""
    continue
  fi
  
  # 运行测试并捕获输出
  output=$(node "$TEST_DIR/$test_file" 2>&1)
  exit_code=$?
  
  if [ $exit_code -ne 0 ]; then
    echo "❌ 测试执行失败"
    echo "$output"
    echo ""
    continue
  fi
  
  # 解析 JSON 结果
  success=$(echo "$output" | jq -r '.success // false')
  test_total=$(echo "$output" | jq -r '.summary.total // 0')
  test_passed=$(echo "$output" | jq -r '.summary.passed // 0')
  test_failed=$(echo "$output" | jq -r '.summary.failed // 0')
  success_rate=$(echo "$output" | jq -r '.summary.successRate // "0%"')
  
  # 累加总数
  total_tests=$((total_tests + test_total))
  total_passed=$((total_passed + test_passed))
  total_failed=$((total_failed + test_failed))
  
  # 显示结果
  if [ "$success" = "true" ]; then
    echo "✅ 全部通过: $test_passed/$test_total ($success_rate)"
  else
    echo "⚠️  部分失败: $test_passed/$test_total ($success_rate)"
    echo ""
    echo "失败的测试:"
    echo "$output" | jq -r '.tests[] | select(.status == "❌") | "  - " + .name + (if .error then " (" + .error + ")" else "" end)'
  fi
  
  echo ""
done

# 显示总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo "总测试数: $total_tests"
echo "通过: $total_passed"
echo "失败: $total_failed"

if [ "$total_tests" -gt 0 ]; then
  success_percentage=$(awk "BEGIN {printf \"%.2f\", ($total_passed/$total_tests)*100}")
  echo "成功率: $success_percentage%"
  
  if [ "$total_failed" -eq 0 ]; then
    echo ""
    echo "🎉 所有测试通过！buf.set API 在 Node.js v25.0.0 中表现完美！"
    exit 0
  else
    echo ""
    echo "⚠️  有 $total_failed 个测试失败"
    exit 1
  fi
else
  echo ""
  echo "❌ 没有运行任何测试"
  exit 1
fi
