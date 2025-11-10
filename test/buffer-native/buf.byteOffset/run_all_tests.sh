#!/bin/bash

# buf.byteOffset 完整测试运行脚本
# 用于验证所有测试文件在 Go + goja 服务中的表现

set -e

BASE_DIR="/Users/Code/Go-product/Flow-codeblock_goja"
TEST_DIR="$BASE_DIR/test/buffer-native/buf.byteOffset"
API_URL="http://localhost:3002/flow/codeblock"
ACCESS_TOKEN="flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15"

echo "=========================================="
echo "buf.byteOffset API 完整测试"
echo "=========================================="
echo ""

# 测试文件列表
tests=(
  "test_additional.js"
  "test_supplement.js"
  "test.js"
)

total_tests=0
total_passed=0
total_failed=0

for test_file in "${tests[@]}"; do
  echo "正在测试: $test_file"
  echo "----------------------------------------"
  
  CODE=$(base64 < "$TEST_DIR/$test_file")
  
  result=$(curl -s --location "$API_URL" \
    --header 'Content-Type: application/json' \
    --header "accessToken: $ACCESS_TOKEN" \
    --data "{\"codebase64\": \"$CODE\", \"input\": {}}")
  
  # 提取统计信息
  success=$(echo "$result" | jq -r '.result.success')
  tests_count=$(echo "$result" | jq -r '.result.summary.total')
  passed=$(echo "$result" | jq -r '.result.summary.passed')
  failed=$(echo "$result" | jq -r '.result.summary.failed')
  rate=$(echo "$result" | jq -r '.result.summary.successRate')
  
  echo "测试数: $tests_count"
  echo "通过: $passed"
  echo "失败: $failed"
  echo "成功率: $rate"
  
  total_tests=$((total_tests + tests_count))
  total_passed=$((total_passed + passed))
  total_failed=$((total_failed + failed))
  
  if [ "$success" = "true" ]; then
    echo "✅ 所有测试通过"
  else
    echo "❌ 部分测试失败"
    # 显示失败的测试
    echo "$result" | jq '.result.tests[] | select(.status == "❌")'
  fi
  
  echo ""
done

echo "=========================================="
echo "总体统计"
echo "=========================================="
echo "总测试数: $total_tests"
echo "总通过: $total_passed"
echo "总失败: $total_failed"
success_rate=$(echo "scale=2; $total_passed * 100 / $total_tests" | bc)
echo "总成功率: ${success_rate}%"
echo ""

if [ $total_failed -eq 0 ]; then
  echo "🎉 所有测试全部通过！buf.byteOffset API 已完整对齐 Node.js v25.0.0"
  exit 0
else
  echo "⚠️  仍有 $total_failed 个测试未通过"
  exit 1
fi

