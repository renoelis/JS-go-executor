#!/bin/bash

# buf.writeIntBE/LE 完整测试运行脚本
# 用于验证所有测试文件在 Go + goja 服务中的表现

set -e

BASE_DIR="/Users/Code/Go-product/Flow-codeblock_goja"
TEST_DIR="$BASE_DIR/test/buffer-native/buf.writeIntBE_LE"
API_URL="http://localhost:3002/flow/codeblock"
ACCESS_TOKEN="flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15"

echo "=========================================="
echo "buf.writeIntBE/LE API 完整测试"
echo "=========================================="
echo ""

# 测试文件列表
tests=(
  "part1_basic.js"
  "part2_byte_lengths.js"
  "part3_errors.js"
  "part4_boundaries.js"
  "part5_memory_safety.js"
  "part6_edge_cases.js"
  "part7_combinations.js"
  "part8_extreme_scenarios.js"
  "part9_deep_dive.js"
  "part10_micro_edge_cases.js"
  "part11_final_edge_cases.js"
  "part12_number_precision.js"
  "part13_special_types.js"
  "part14_buffer_variants.js"
  "part15_extreme_validation.js"
  "part16_deep_gap_filling.js"
  "part17_ultimate_edge_cases.js"
  "part18_final_comprehensive.js"
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
  
  # Base64 编码测试文件
  CODE=$(base64 < "$TEST_DIR/$test_file")
  
  # 发送请求并获取结果
  RESPONSE=$(curl -s --location "$API_URL" \
    --header 'Content-Type: application/json' \
    --header "accessToken: $ACCESS_TOKEN" \
    --data "{\"codebase64\": \"$CODE\", \"input\": {}}")
  
  # 检查请求是否成功
  if [ $? -ne 0 ]; then
    echo "❌ 请求失败"
    echo ""
    continue
  fi
  
  # 解析结果
  success=$(echo "$RESPONSE" | jq -r '.success')
  
  if [ "$success" != "true" ]; then
    echo "❌ 代码执行失败"
    echo "$RESPONSE" | jq '.error'
    echo ""
    continue
  fi
  
  # 获取测试统计
  test_total=$(echo "$RESPONSE" | jq -r '.result.summary.total // 0')
  test_passed=$(echo "$RESPONSE" | jq -r '.result.summary.passed // 0')
  test_failed=$(echo "$RESPONSE" | jq -r '.result.summary.failed // 0')
  success_rate=$(echo "$RESPONSE" | jq -r '.result.summary.successRate // "0%"')
  
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
    echo "$RESPONSE" | jq -r '.result.tests[] | select(.status == "❌") | "  - " + .name'
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
    echo "🎉 所有测试通过！buf.writeIntBE/LE API 与 Node.js v25.0.0 完全兼容！"
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
