#!/bin/bash

# buf.readUIntBE & buf.readUIntLE 本地 Node.js 测试脚本
# 用于在本地 Node.js v25.0.0 环境中验证所有测试

set -e

TEST_DIR="/Users/Code/Go-product/Flow-codeblock_goja/test/buffer-native/buf.read*/buf.readUIntBE、buf.readUIntLE"

echo "=========================================="
echo "buf.readUIntBE & buf.readUIntLE 本地 Node.js 测试"
echo "Node 版本: $(node --version)"
echo "=========================================="
echo ""

# 测试文件列表
tests=(
  "part1_basic.js"
  "part2_bytelength_validation.js"
  "part3_endianness_verification.js"
  "part4_boundary_tests.js"
  "part5_invalid_types.js"
  "part6_buffer_sources.js"
  "part7_special_values.js"
  "part8_real_world_patterns.js"
  "part9_method_integrity.js"
  "part10_extreme_edge_cases.js"
  "part11_memory_and_performance.js"
  "part12_value_range.js"
  "part13_missing_coverage.js"
  "test.js"
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
  
  # 运行测试文件并捕获输出
  output=$(node "$TEST_DIR/$test_file" 2>&1)
  
  # 检查是否成功执行
  if [ $? -ne 0 ]; then
    echo "❌ 执行失败"
    echo "$output"
    echo ""
    continue
  fi
  
  # 解析 JSON 结果
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
  if [ "$test_failed" -eq 0 ]; then
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
    echo "🎉 所有测试通过！可以继续在 Go + goja 环境中测试"
    exit 0
  else
    echo ""
    echo "⚠️  有 $total_failed 个测试失败，需要修复测试脚本"
    exit 1
  fi
else
  echo ""
  echo "❌ 没有运行任何测试"
  exit 1
fi
