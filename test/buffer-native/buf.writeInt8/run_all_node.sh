#!/bin/bash

# buf.writeInt8() - Node.js v25.0.0 测试执行脚本
# 说明：本脚本在 Node.js v25.0.0 环境下执行所有 writeInt8 相关测试

echo "=================================="
echo "buf.writeInt8() 测试套件"
echo "Node.js 版本要求: v25.0.0"
echo "=================================="
echo ""

# 检查 Node.js 版本
NODE_VERSION=$(node -v)
echo "当前 Node.js 版本: $NODE_VERSION"
echo ""

# 测试文件列表
TEST_FILES=(
  "part1_basic.js"
  "part2_types.js"
  "part3_errors.js"
  "part4_edge_cases.js"
  "part5_safety.js"
  "part6_value_coercion.js"
  "part7_performance.js"
  "part8_extreme_compat.js"
  "part9_deep_boundaries.js"
  "part10_round2_deep.js"
  "part11_deep_missing_tests.js"
  "part12_ultimate_edge_cases.js"
  "part13_extreme_scenarios.js"
)

# 统计变量
TOTAL_FILES=0
PASSED_FILES=0
FAILED_FILES=0

# 执行每个测试文件
for file in "${TEST_FILES[@]}"; do
  TOTAL_FILES=$((TOTAL_FILES + 1))
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "执行测试: $file"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # 执行测试文件
  OUTPUT=$(node "$file" 2>&1)
  EXIT_CODE=$?

  # 解析测试结果
  if echo "$OUTPUT" | grep -q '"success": true'; then
    echo "✅ $file - 通过"
    PASSED_FILES=$((PASSED_FILES + 1))
  else
    echo "❌ $file - 失败"
    FAILED_FILES=$((FAILED_FILES + 1))
  fi

  # 显示详细输出
  echo "$OUTPUT"
  echo ""
done

# 输出汇总
echo "=================================="
echo "测试汇总"
echo "=================================="
echo "总文件数: $TOTAL_FILES"
echo "通过: $PASSED_FILES"
echo "失败: $FAILED_FILES"
echo "成功率: $(awk "BEGIN {printf \"%.2f\", ($PASSED_FILES/$TOTAL_FILES)*100}")%"
echo "=================================="

# 返回退出码
if [ $FAILED_FILES -eq 0 ]; then
  exit 0
else
  exit 1
fi
