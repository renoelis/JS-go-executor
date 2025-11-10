#!/bin/bash

# 在 Go+goja 服务中测试 qs.stringify() 脚本

echo "════════════════════════════════════════════════════════"
echo "  qs.stringify() Go+goja 服务测试"
echo "════════════════════════════════════════════════════════"
echo ""

# 测试文件列表
batches=(
  "test_stringify_batch1_basic.js"
  "test_stringify_batch2_options.js"
  "test_stringify_batch3_advanced.js"
  "test_stringify_batch4_edge_cases.js"
  "test_stringify_batch5_security.js"
)

# 统计变量
total_tests=0
total_pass=0
total_fail=0
failed_batches=()

# API endpoint
API_URL="http://localhost:3002/flow/codeblock"
ACCESS_TOKEN="flow_dfff6cb46b3c4b6fb49ce561811ce642503052b7517c98201518111cac23869e"

# 运行每个批次
batch_count=0
for batch in "${batches[@]}"; do
  batch_count=$((batch_count + 1))
  echo "────────────────────────────────────────────────────────"
  echo "测试批次 $batch_count/${#batches[@]}: $batch"
  echo "────────────────────────────────────────────────────────"
  
  # 检查文件是否存在
  if [ ! -f "$batch" ]; then
    echo "❌ 错误: 文件 $batch 不存在"
    failed_batches+=("$batch (文件不存在)")
    continue
  fi
  
  # Base64 编码
  CODE=$(base64 < "$batch")
  
  # 发送请求
  response=$(curl -s --location "$API_URL" \
    --header 'Content-Type: application/json' \
    --header "accessToken: $ACCESS_TOKEN" \
    --data "{\"codebase64\": \"$CODE\", \"input\": {}}")
  
  # 提取 result 字段（服务的实际返回）
  result=$(echo "$response" | jq -r '.result')
  
  if [ "$result" = "null" ] || [ -z "$result" ]; then
    echo "❌ 错误: 服务返回异常"
    echo "响应: $response"
    failed_batches+=("$batch (服务异常)")
    continue
  fi
  
  # 提取统计信息
  pass=$(echo "$result" | jq -r '.summary.pass // 0')
  total=$(echo "$result" | jq -r '.summary.total // 0')
  fail=$(echo "$result" | jq -r '.summary.fail // 0')
  success=$(echo "$result" | jq -r '.success // false')
  
  total_tests=$((total_tests + total))
  total_pass=$((total_pass + pass))
  total_fail=$((total_fail + fail))
  
  # 显示结果
  if [ "$success" = "true" ] && [ "$fail" -eq 0 ]; then
    echo "✅ 批次 $batch_count 通过: $pass/$total"
  else
    echo "❌ 批次 $batch_count 失败: $pass/$total (失败: $fail)"
    failed_batches+=("$batch ($fail 失败)")
    
    # 显示失败的测试用例
    echo ""
    echo "失败的测试用例:"
    echo "$result" | jq -r '.detail[] | select(.pass == false) | "  - \(.case): 期望 [\(.expect)] 得到 [\(.got)]"'
  fi
  
  echo ""
done

# 显示总结
echo "════════════════════════════════════════════════════════"
echo "  测试总结"
echo "════════════════════════════════════════════════════════"
echo "总批次数: ${#batches[@]}"
echo "通过批次: $((${#batches[@]} - ${#failed_batches[@]}))"
echo "失败批次: ${#failed_batches[@]}"
echo ""
echo "总测试数: $total_tests"
echo "通过: $total_pass ✅"
echo "失败: $total_fail ❌"
echo ""

if [ ${#failed_batches[@]} -gt 0 ]; then
  echo "失败的批次:"
  for failed in "${failed_batches[@]}"; do
    echo "  - $failed"
  done
  echo ""
fi

# 计算通过率
if [ $total_tests -gt 0 ]; then
  pass_rate=$(awk "BEGIN {printf \"%.2f\", ($total_pass / $total_tests) * 100}")
  echo "通过率: $pass_rate%"
else
  echo "通过率: N/A"
fi

echo "════════════════════════════════════════════════════════"

# 返回适当的退出码
if [ $total_fail -eq 0 ] && [ ${#failed_batches[@]} -eq 0 ]; then
  echo ""
  echo "🎉 所有测试通过！Go+goja 服务与 Node.js 行为完全一致！"
  exit 0
else
  echo ""
  echo "⚠️  存在失败的测试，需要修复 Go 实现"
  exit 1
fi

