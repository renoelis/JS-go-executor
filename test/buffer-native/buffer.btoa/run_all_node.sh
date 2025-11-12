#!/bin/bash

# buffer.btoa() - 完整测试套件执行脚本
# 用于在 Node.js v25.0.0 环境下执行所有测试

echo "=========================================="
echo "buffer.btoa() Node.js v25.0.0 测试套件"
echo "=========================================="
echo ""

# 检查 Node.js 版本
NODE_VERSION=$(node --version)
echo "当前 Node.js 版本: $NODE_VERSION"
echo ""

# 测试脚本列表
TESTS=(
  "part1_btoa_basic.js"
  "part2_btoa_types.js"
  "part3_btoa_errors.js"
  "part4_btoa_edge_cases.js"
  "part5_btoa_encoding.js"
  "part6_btoa_compatibility.js"
  "part7_btoa_round3_edge_branches.js"
  "part8_btoa_round4_combinations.js"
  "part9_btoa_round5_extreme.js"
  "part10_btoa_round6_bitlevel.js"
  "part11_btoa_round7_context_values.js"
  "part12_btoa_round8_performance.js"
)

# 统计变量
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0
FAILED_FILES=()

# 执行每个测试文件
for test_file in "${TESTS[@]}"; do
  echo "----------------------------------------"
  echo "执行: $test_file"
  echo "----------------------------------------"

  # 运行测试并捕获输出
  OUTPUT=$(node "$test_file" 2>&1)
  EXIT_CODE=$?

  # 解析 JSON 结果
  if [ $EXIT_CODE -eq 0 ]; then
    # 提取统计信息
    PASSED=$(echo "$OUTPUT" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*')
    FAILED=$(echo "$OUTPUT" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*')
    TOTAL=$(echo "$OUTPUT" | grep -o '"total": [0-9]*' | grep -o '[0-9]*')
    SUCCESS_RATE=$(echo "$OUTPUT" | grep -o '"successRate": "[0-9.]*%"' | grep -o '[0-9.]*')

    echo "✅ 测试通过: $PASSED"
    echo "❌ 测试失败: $FAILED"
    echo "📊 总计: $TOTAL"
    echo "📈 成功率: $SUCCESS_RATE%"

    TOTAL_TESTS=$((TOTAL_TESTS + TOTAL))
    TOTAL_PASSED=$((TOTAL_PASSED + PASSED))
    TOTAL_FAILED=$((TOTAL_FAILED + FAILED))

    if [ "$FAILED" != "0" ]; then
      FAILED_FILES+=("$test_file")
      echo ""
      echo "失败详情:"
      echo "$OUTPUT" | grep -A 5 '"status": "❌"'
    fi
  else
    echo "❌ 脚本执行失败 (退出码: $EXIT_CODE)"
    echo "$OUTPUT"
    FAILED_FILES+=("$test_file")
  fi

  echo ""
done

# 打印总结
echo "=========================================="
echo "测试执行完成 - 总结"
echo "=========================================="
echo "总测试数: $TOTAL_TESTS"
echo "✅ 通过: $TOTAL_PASSED"
echo "❌ 失败: $TOTAL_FAILED"

if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($TOTAL_PASSED / $TOTAL_TESTS) * 100}")
  echo "📈 总成功率: $SUCCESS_RATE%"
fi

if [ ${#FAILED_FILES[@]} -gt 0 ]; then
  echo ""
  echo "包含失败用例的文件:"
  for file in "${FAILED_FILES[@]}"; do
    echo "  - $file"
  done
  exit 1
else
  echo ""
  echo "🎉 所有测试通过！"
  exit 0
fi
