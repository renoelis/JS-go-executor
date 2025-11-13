#!/bin/bash

# Buffer.constants - Node.js v25.0.0 测试执行脚本
# 执行所有测试文件并汇总结果

# 切换到脚本所在目录
cd "$(dirname "$0")"

echo "=========================================="
echo "Buffer.constants 完整测试套件"
echo "Node.js 版本: $(node --version)"
echo "工作目录: $(pwd)"
echo "=========================================="
echo ""

# 测试文件列表
test_files=(
  "part1_basic.js"
  "part2_values.js"
  "part3_immutability.js"
  "part4_edge_cases.js"
  "part5_compatibility.js"
  "part6_exact_values.js"
  "part7_behavior_edges.js"
  "part8_advanced_scenarios.js"
  "part9_extreme_cases.js"
  "part10_prototype_depth.js"
  "part11_alias_module.js"
  "part12_precise_boundaries.js"
  "part13_type_coercion.js"
  "part14_buffer_methods.js"
  "part15_complete_coverage.js"
  "part16_deep_gap_analysis.js"
)

# 计数器
total_files=0
passed_files=0
failed_files=0

# 遍历执行每个测试文件
for file in "${test_files[@]}"; do
  echo "----------------------------------------"
  echo "执行: $file"
  echo "----------------------------------------"

  total_files=$((total_files + 1))

  # 执行测试文件
  if node "$file" > /dev/null 2>&1; then
    echo "✅ $file 执行成功"
    passed_files=$((passed_files + 1))
  else
    echo "❌ $file 执行失败"
    failed_files=$((failed_files + 1))
  fi

  # 显示详细结果
  node "$file"
  echo ""
done

# 输出汇总
echo "=========================================="
echo "测试汇总"
echo "=========================================="
echo "总文件数: $total_files"
echo "成功: $passed_files"
echo "失败: $failed_files"
echo "成功率: $(awk "BEGIN {printf \"%.2f\", ($passed_files/$total_files)*100}")%"
echo "=========================================="

# 根据结果设置退出码
if [ $failed_files -eq 0 ]; then
  echo "✅ 所有测试通过！"
  exit 0
else
  echo "❌ 存在失败的测试"
  exit 1
fi
