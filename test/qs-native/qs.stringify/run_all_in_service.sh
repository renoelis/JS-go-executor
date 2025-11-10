#!/bin/bash

# qs.stringify 所有批次服务测试脚本
# 在 Go + goja 服务中运行所有测试批次

set -e

BASE_DIR="/Users/Code/Go-product/Flow-codeblock_goja/test/qs-native/qs.stringify"
API_URL="http://localhost:3002/flow/codeblock"
ACCESS_TOKEN="flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15"

echo "======================================"
echo "qs.stringify 服务测试 - 全批次运行"
echo "======================================"
echo ""

total_batches=0
passed_batches=0
failed_batches=0
total_cases=0
total_pass=0
total_fail=0

for batch_file in "$BASE_DIR"/test_stringify_batch*.js; do
  batch_name=$(basename "$batch_file")
  total_batches=$((total_batches + 1))
  
  echo ">>> 批次: $batch_name"
  
  # Base64 编码
  CODE=$(base64 < "$batch_file")
  
  # 调用服务
  response=$(curl --silent --location "$API_URL" \
    --header 'Content-Type: application/json' \
    --header "accessToken: $ACCESS_TOKEN" \
    --data "{\"codebase64\": \"$CODE\", \"input\": {}}")
  
  # 提取结果
  success=$(echo "$response" | jq -r '.result.success // false')
  pass_count=$(echo "$response" | jq -r '.result.summary.pass // 0')
  fail_count=$(echo "$response" | jq -r '.result.summary.fail // 0')
  total_count=$(echo "$response" | jq -r '.result.summary.total // 0')
  
  total_cases=$((total_cases + total_count))
  total_pass=$((total_pass + pass_count))
  total_fail=$((total_fail + fail_count))
  
  if [ "$success" = "true" ]; then
    echo "✅ 通过: $pass_count/$total_count"
    passed_batches=$((passed_batches + 1))
  else
    echo "❌ 失败: $pass_count/$total_count (失败: $fail_count)"
    failed_batches=$((failed_batches + 1))
    
    # 显示失败的用例
    echo "$response" | jq -r '.result.detail[] | select(.pass == false) | "  - ❌ \(.case): 期望=\(.expect), 实际=\(.got)"' | head -10
  fi
  
  echo ""
done

echo "======================================"
echo "总结"
echo "======================================"
echo "批次总数: $total_batches"
echo "批次通过: $passed_batches"
echo "批次失败: $failed_batches"
echo ""
echo "用例总数: $total_cases"
echo "用例通过: $total_pass"
echo "用例失败: $total_fail"
echo ""

if [ $failed_batches -eq 0 ]; then
  echo "🎉 所有批次全部通过！"
  exit 0
else
  echo "⚠️  部分批次存在失败，请检查上述详情"
  exit 1
fi

