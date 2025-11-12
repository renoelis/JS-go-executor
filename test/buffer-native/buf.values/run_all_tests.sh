#!/bin/bash

# buf.values() - Go + goja 服务完整测试脚本
# 用于验证所有测试文件在 Go + goja 服务中的表现

set -e

BASE_DIR="/Users/Code/Go-product/Flow-codeblock_goja"
TEST_DIR="$BASE_DIR/test/buffer-native/buf.values"
API_URL="http://localhost:3002/flow/codeblock"
ACCESS_TOKEN="flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15"

echo "=========================================="
echo "Buffer.prototype.values() Go+goja 服务测试"
echo "=========================================="
echo ""

# 测试文件列表
tests=(
  "part1_values_basic.js"
  "part2_values_types.js"
  "part3_values_errors.js"
  "part4_values_iteration.js"
  "part5_values_edge_cases.js"
  "part6_round2_docs_coverage.js"
  "part7_round3_actual_behavior.js"
  "part8_round4_combinations.js"
  "part9_round5_extreme_cases.js"
  "part10_deep_internal_state.js"
  "part11_deep_underlying.js"
  "part12_deep_concurrent.js"
  "part13_deepest_iterator.js"
  "part14_deepest_methods.js"
  "part15_deepest_extreme.js"
  "part16_advanced_prototype.js"
  "part17_typedarray_methods.js"
  "part18_read_write_encoding.js"
  "part19_deep_missing_coverage.js"
  "part20_extreme_edge_cases.js"
  "part21_lifecycle_and_scope.js"
  "part22_data_integrity_and_structures.js"
  "part23_extreme_scenarios.js"
)

total_tests=0
total_passed=0
total_failed=0
failed_files=()

# 运行每个测试文件
for test_file in "${tests[@]}"; do
  echo "----------------------------------------"
  echo "运行测试: $test_file"
  echo "----------------------------------------"
  
  # 检查文件是否存在
  if [ ! -f "$TEST_DIR/$test_file" ]; then
    echo "❌ 测试文件不存在: $test_file"
    echo ""
    failed_files+=("$test_file (文件不存在)")
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
    failed_files+=("$test_file (请求失败)")
    continue
  fi
  
  # 解析结果
  success=$(echo "$RESPONSE" | jq -r '.success')
  
  if [ "$success" != "true" ]; then
    echo "❌ 代码执行失败"
    echo "$RESPONSE" | jq '.'
    echo ""
    failed_files+=("$test_file (执行失败)")
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
    failed_files+=("$test_file ($test_failed 个测试失败)")
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
  
  if [ "$total_failed" -eq 0 ] && [ ${#failed_files[@]} -eq 0 ]; then
    echo ""
    echo "🎉 所有测试通过！Buffer.values() API 与 Node.js v25.0.0 完全兼容！"
    exit 0
  else
    echo ""
    echo "⚠️  有失败的测试，需要修复:"
    for file in "${failed_files[@]}"; do
      echo "  - $file"
    done
    exit 1
  fi
else
  echo ""
  echo "❌ 没有运行任何测试"
  exit 1
fi
