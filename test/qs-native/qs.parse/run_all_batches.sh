#!/bin/bash

# qs.parse() 批量测试执行脚本
# 用法: ./run_all_batches.sh [node|goja]

MODE=${1:-node}  # 默认使用 node
BASE_DIR="/Users/Code/Go-product/Flow-codeblock_goja"
TEST_DIR="$BASE_DIR/test/qs-native/qs.parse"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 qs.parse() 批量测试执行器"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "模式: $MODE"
echo ""

total_pass=0
total_fail=0
total_tests=0

# 测试批次列表
batches=(
  "test_parse_batch1_basic.js:批次1-基础功能"
  "test_parse_batch2_options.js:批次2-选项测试"
  "test_parse_batch3_delimiters.js:批次3-分隔符测试"
  "test_parse_batch4_security.js:批次4-安全测试"
  "test_parse_batch5_edge_cases.js:批次5-边界测试"
  "test_parse_comprehensive.js:批次6-综合测试"
  "test_parse_extreme_edge_cases.js:批次7-极端边缘情况测试"
  "test_parse_missing_coverage.js:批次8-缺失覆盖测试"
  "test_parse_nodejs.js:批次9-Node.js兼容性测试"
  "test_parse_part2.js:批次10-Part2测试"
  "test_parse_uncovered_cases.js:批次11-未覆盖测试"
)

run_node_test() {
  local file=$1
  echo "▶️  运行: $file"
  node "$TEST_DIR/$file" 2>&1 | tail -5
}

run_goja_test() {
  local file=$1
  echo "▶️  运行: $file (Go+goja服务)"
  
  CODE=$(base64 < "$TEST_DIR/$file")
  
  RESULT=$(curl -s --location 'http://localhost:3002/flow/codeblock' \
    --header 'Content-Type: application/json' \
    --header 'accessToken: flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15' \
    --data "{\"codebase64\": \"$CODE\", \"input\": {}}")
  
  # 检查是否成功
  SUCCESS=$(echo "$RESULT" | jq -r '.success')
  
  if [ "$SUCCESS" = "true" ]; then
    echo "$RESULT" | jq -r '.result.summary'
  else
    echo "❌ 执行失败:"
    echo "$RESULT" | jq -r '.error.message'
  fi
}

# 遍历所有批次
for batch in "${batches[@]}"; do
  IFS=':' read -r file desc <<< "$batch"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 $desc"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if [ "$MODE" = "node" ]; then
    run_node_test "$file"
  else
    run_goja_test "$file"
  fi
  
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 所有批次执行完成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

