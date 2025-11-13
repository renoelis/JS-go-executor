#!/bin/bash

# buf.byteOffset Node.js 环境完整测试运行脚本
# 用于验证所有测试文件在本地 Node.js v25.0.0 环境中的表现

set -e

TEST_DIR="/Users/Code/Go-product/Flow-codeblock_goja/test/buffer-native/buf.byteOffset"

echo "=========================================="
echo "buf.byteOffset API Node.js 环境测试"
echo "=========================================="
echo "Node.js 版本: $(node --version)"
echo ""

# 测试文件列表
tests=(
  "test.js"
  "test_additional.js"
  "test_supplement.js"
  "part1_function_properties.js"
  "part2_deep_boundary_cases.js"
  "part3_final_gap_analysis.js"
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
  cd "$TEST_DIR"
  output=$(node "$test_file" 2>&1)
  exit_code=$?
  
  if [ $exit_code -ne 0 ]; then
    echo "❌ 测试执行失败"
    echo "$output"
    echo ""
    continue
  fi
  
  # 解析JSON结果
  success=$(echo "$output" | jq -r '.success')
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
    echo "$output" | jq -r '.tests[] | select(.status == "❌") | "  - " + .name'
  fi
  
  echo ""
done

# 显示总结
echo "=========================================="
echo "Node.js 测试总结"
echo "=========================================="
echo "总测试数: $total_tests"
echo "通过: $total_passed"
echo "失败: $total_failed"

if [ "$total_tests" -gt 0 ]; then
  success_percentage=$(awk "BEGIN {printf \"%.2f\", ($total_passed/$total_tests)*100}")
  echo "成功率: $success_percentage%"
  
  if [ "$total_failed" -eq 0 ]; then
    echo ""
    echo "🎉 所有测试通过！buf.byteOffset API 与 Node.js v25.0.0 完全兼容！"
    exit 0
  else
    echo ""
    echo "⚠️  有 $total_failed 个测试失败，需要修复"
    exit 1
  fi
else
  echo ""
  echo "❌ 没有运行任何测试"
  exit 1
fi
