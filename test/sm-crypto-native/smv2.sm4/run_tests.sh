#!/bin/bash

# SM4 完整测试套件运行脚本
# 基于 sm-crypto-v2 v1.15.0

echo "========================================"
echo "SM4 完整测试套件"
echo "基于 sm-crypto-v2 v1.15.0"
echo "========================================"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 测试文件列表
TEST_FILES=(
  "test_sm4_ecb_part1.js"
  "test_sm4_cbc_part2.js"
  "test_sm4_gcm_part3.js"
  "test_sm4_stream_modes_part4.js"
  "test_sm4_edge_cases_part5.js"
)

# 总计数器
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0

# 运行每个测试文件
for TEST_FILE in "${TEST_FILES[@]}"; do
  echo "----------------------------------------"
  echo "运行: $TEST_FILE"
  echo "----------------------------------------"
  
  # 运行测试
  RESULT=$(node "$SCRIPT_DIR/$TEST_FILE" 2>&1)
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ 测试执行成功"
    
    # 解析结果
    PASSED=$(echo "$RESULT" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*' | tail -1)
    FAILED=$(echo "$RESULT" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*' | tail -1)
    TOTAL=$(echo "$RESULT" | grep -o '"total": [0-9]*' | grep -o '[0-9]*' | tail -1)
    
    if [ -n "$PASSED" ] && [ -n "$TOTAL" ]; then
      echo "通过: $PASSED / $TOTAL"
      TOTAL_TESTS=$((TOTAL_TESTS + TOTAL))
      TOTAL_PASSED=$((TOTAL_PASSED + PASSED))
      TOTAL_FAILED=$((TOTAL_FAILED + FAILED))
    fi
  else
    echo "❌ 测试执行失败 (退出码: $EXIT_CODE)"
    echo "$RESULT"
  fi
  
  echo ""
done

# 输出总结
echo "========================================"
echo "测试总结"
echo "========================================"
echo "总测试数: $TOTAL_TESTS"
echo "通过: $TOTAL_PASSED"
echo "失败: $TOTAL_FAILED"

if [ $TOTAL_FAILED -eq 0 ]; then
  PASS_RATE="100.00"
else
  PASS_RATE=$(echo "scale=2; $TOTAL_PASSED * 100 / $TOTAL_TESTS" | bc)
fi

echo "通过率: $PASS_RATE%"
echo "========================================"

if [ $TOTAL_FAILED -eq 0 ]; then
  echo "✅ 所有测试通过！"
  exit 0
else
  echo "❌ 存在失败的测试"
  exit 1
fi

