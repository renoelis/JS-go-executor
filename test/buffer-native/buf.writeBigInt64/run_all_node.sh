#!/bin/bash

# Node.js v25.0.0 Buffer.writeBigInt64BE/LE 完整测试套件
# 运行所有测试并汇总结果

echo "======================================"
echo "Buffer.writeBigInt64BE/LE 测试套件"
echo "Node.js 版本: $(node --version)"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 初始化计数器
total_tests=0
total_passed=0
total_failed=0

# 测试文件列表
test_files=(
  "part1_basic.js"
  "part2_errors.js"
  "part3_edge_cases.js"
  "part4_types.js"
  "part5_roundtrip.js"
  "part6_advanced.js"
  "part7_performance.js"
  "part8_extreme.js"
  "part9_deep_edge.js"
  "part10_final_validation.js"
  "part11_ultimate.js"
  "part12_deep_gap_filling.js"
  "part13_second_deep_filling.js"
)

# 运行每个测试文件
for file in "${test_files[@]}"; do
  echo "----------------------------------------"
  echo "运行: $file"
  echo "----------------------------------------"

  result=$(node "$file" 2>&1)

  if [ $? -eq 0 ]; then
    echo "$result"

    # 提取测试统计
    passed=$(echo "$result" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*')
    failed=$(echo "$result" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*')
    total=$(echo "$result" | grep -o '"total": [0-9]*' | grep -o '[0-9]*')

    total_tests=$((total_tests + total))
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))

    if [ "$failed" -eq 0 ]; then
      echo -e "${GREEN}✅ $file 全部通过${NC}"
    else
      echo -e "${RED}❌ $file 有 $failed 个失败${NC}"
    fi
  else
    echo -e "${RED}❌ $file 执行出错${NC}"
    echo "$result"
    total_failed=$((total_failed + 1))
  fi

  echo ""
done

# 输出汇总结果
echo "======================================"
echo "测试汇总"
echo "======================================"
echo "总测试数: $total_tests"
echo -e "通过: ${GREEN}$total_passed${NC}"
echo -e "失败: ${RED}$total_failed${NC}"

if [ $total_failed -eq 0 ]; then
  success_rate="100.00"
else
  success_rate=$(awk "BEGIN {printf \"%.2f\", ($total_passed/$total_tests)*100}")
fi

echo "成功率: ${success_rate}%"
echo "======================================"

# 返回码
if [ $total_failed -eq 0 ]; then
  echo -e "${GREEN}✅ 所有测试通过！${NC}"
  exit 0
else
  echo -e "${RED}❌ 有测试失败${NC}"
  exit 1
fi
