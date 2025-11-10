#!/bin/bash

# buf.readUInt32BE & buf.readUInt32LE Node 本地环境测试脚本
# 用于在 Node.js v25.0.0 环境下验证所有测试文件

echo "=========================================="
echo "buf.readUInt32BE & buf.readUInt32LE Node 本地测试"
echo "=========================================="
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 测试文件列表
TEST_FILES=(
  "test.js"
  "part2_edge_cases.js"
  "part3_endianness_verification.js"
  "part4_boundary_tests.js"
  "part5_invalid_offset_types.js"
  "part6_typedarray_compatibility.js"
  "part7_special_values.js"
  "part8_buffer_sources.js"
  "part9_method_integrity.js"
  "part10_extreme_edge_cases.js"
  "part11_value_range.js"
  "part12_real_world_patterns.js"
  "part13_memory_and_performance.js"
  "part14_missing_coverage.js"
)

# 统计变量
TOTAL_FILES=0
PASSED_FILES=0
FAILED_FILES=0
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0

# 遍历执行所有测试文件
for TEST_FILE in "${TEST_FILES[@]}"; do
  TEST_PATH="$SCRIPT_DIR/$TEST_FILE"
  
  if [ ! -f "$TEST_PATH" ]; then
    echo "⚠️  测试文件不存在: $TEST_FILE"
    continue
  fi
  
  TOTAL_FILES=$((TOTAL_FILES + 1))
  
  echo "运行测试: $TEST_FILE"
  echo "------------------------------------------"
  
  # 执行测试并捕获输出
  OUTPUT=$(node "$TEST_PATH" 2>&1)
  EXIT_CODE=$?
  
  # 解析 JSON 结果
  if [ $EXIT_CODE -eq 0 ]; then
    # 提取测试统计信息
    SUCCESS=$(echo "$OUTPUT" | grep -o '"success": *[^,]*' | head -1 | awk '{print $2}' | tr -d ',')
    PASSED=$(echo "$OUTPUT" | grep -o '"passed": *[0-9]*' | head -1 | awk '{print $2}')
    FAILED=$(echo "$OUTPUT" | grep -o '"failed": *[0-9]*' | head -1 | awk '{print $2}')
    TOTAL=$(echo "$OUTPUT" | grep -o '"total": *[0-9]*' | head -1 | awk '{print $2}')
    
    if [ "$SUCCESS" = "true" ]; then
      echo "✅ 通过: $PASSED/$TOTAL"
      PASSED_FILES=$((PASSED_FILES + 1))
    else
      echo "❌ 失败: $FAILED/$TOTAL 个用例失败"
      FAILED_FILES=$((FAILED_FILES + 1))
      
      # 显示失败的测试用例
      echo ""
      echo "失败的测试用例:"
      echo "$OUTPUT" | grep -A 5 '"status": "❌"' | head -20
    fi
    
    # 累加统计
    TOTAL_TESTS=$((TOTAL_TESTS + TOTAL))
    TOTAL_PASSED=$((TOTAL_PASSED + PASSED))
    TOTAL_FAILED=$((TOTAL_FAILED + FAILED))
  else
    echo "❌ 执行错误"
    echo "$OUTPUT"
    FAILED_FILES=$((FAILED_FILES + 1))
  fi
  
  echo ""
done

# 输出总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo "测试文件总数: $TOTAL_FILES"
echo "通过的文件: $PASSED_FILES"
echo "失败的文件: $FAILED_FILES"
echo ""
echo "测试用例总数: $TOTAL_TESTS"
echo "通过的用例: $TOTAL_PASSED"
echo "失败的用例: $TOTAL_FAILED"
echo ""

if [ $FAILED_FILES -eq 0 ]; then
  echo "🎉 所有测试通过！Node.js 环境测试完成"
  exit 0
else
  echo "⚠️  有 $FAILED_FILES 个测试文件失败"
  exit 1
fi
