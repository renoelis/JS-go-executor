#!/bin/bash

# ============================================================================
# qs.formats 所有测试的批量执行脚本
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="http://localhost:3002/flow/codeblock"
ACCESS_TOKEN="flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15"

echo "======================================================================"
echo "开始执行 qs.formats 所有测试（在 Go + goja 服务中）"
echo "======================================================================"
echo ""

# 定义测试文件列表
TESTS=(
  "test_formats_nodejs.js:基础功能测试"
  "test_formats_edge_cases_nodejs.js:边界情况测试"
  "test_formats_comprehensive.js:综合完整测试"
)

TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0
FAILED_TESTS_DETAILS=()

# 遍历执行每个测试
for test_info in "${TESTS[@]}"; do
  IFS=':' read -r test_file test_name <<< "$test_info"
  
  echo "======================================================================"
  echo "测试文件: $test_file"
  echo "测试名称: $test_name"
  echo "======================================================================"
  
  # 编码文件为 base64
  CODE=$(base64 < "$SCRIPT_DIR/$test_file")
  
  # 发送请求
  RESPONSE=$(curl -s --location "$BASE_URL" \
    --header 'Content-Type: application/json' \
    --header "accessToken: $ACCESS_TOKEN" \
    --data "{\"codebase64\": \"$CODE\", \"input\": {}}")
  
  # 解析结果
  SUCCESS=$(echo "$RESPONSE" | jq -r '.result.success')
  SUMMARY=$(echo "$RESPONSE" | jq -r '.result.summary')
  FAILED_TESTS=$(echo "$RESPONSE" | jq -r '.result.failedTests')
  
  TOTAL=$(echo "$SUMMARY" | jq -r '.total')
  PASSED=$(echo "$SUMMARY" | jq -r '.passed')
  FAILED=$(echo "$SUMMARY" | jq -r '.failed')
  SUCCESS_RATE=$(echo "$SUMMARY" | jq -r '.successRate')
  
  # 累加总数
  TOTAL_TESTS=$((TOTAL_TESTS + TOTAL))
  TOTAL_PASSED=$((TOTAL_PASSED + PASSED))
  TOTAL_FAILED=$((TOTAL_FAILED + FAILED))
  
  # 输出结果
  echo "执行结果: $SUCCESS"
  echo "总数: $TOTAL | 通过: $PASSED | 失败: $FAILED | 成功率: $SUCCESS_RATE"
  
  if [ "$FAILED" -gt 0 ]; then
    echo ""
    echo "❌ 失败的测试用例:"
    echo "$FAILED_TESTS" | jq -r '.[] | "  - \(.name)\n    期望: \(.expected)\n    实际: \(.actual)"'
    FAILED_TESTS_DETAILS+=("$test_name: $FAILED 个失败")
  else
    echo "✅ 所有测试通过！"
  fi
  
  echo ""
done

# 输出总结
echo "======================================================================"
echo "测试总结"
echo "======================================================================"
echo "总测试数: $TOTAL_TESTS"
echo "通过: $TOTAL_PASSED"
echo "失败: $TOTAL_FAILED"
echo "成功率: $(awk "BEGIN {printf \"%.2f\", ($TOTAL_PASSED/$TOTAL_TESTS)*100}")%"
echo ""

if [ "$TOTAL_FAILED" -gt 0 ]; then
  echo "❌ 有失败的测试:"
  for detail in "${FAILED_TESTS_DETAILS[@]}"; do
    echo "  - $detail"
  done
  exit 1
else
  echo "✅ 所有测试全部通过！"
  exit 0
fi

