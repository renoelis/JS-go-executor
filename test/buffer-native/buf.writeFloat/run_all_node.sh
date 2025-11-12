#!/bin/bash

# Node.js v25.0.0 Buffer.prototype.writeFloatBE/LE 测试套件
# 本脚本在 Node.js 本地环境执行所有测试

echo "=========================================="
echo "Buffer.prototype.writeFloatBE/LE 测试开始"
echo "Node 版本: $(node --version)"
echo "=========================================="
echo ""

# 测试文件列表
tests=(
  "part1_basic.js"
  "part2_types.js"
  "part3_errors.js"
  "part4_boundary.js"
  "part5_float_specific.js"
  "part6_typedarray_compat.js"
  "part7_memory_views.js"
  "part8_combination.js"
  "part9_extreme.js"
  "part10_offset_deep.js"
  "part11_value_deep.js"
  "part12_byte_level.js"
  "part13_params_errors.js"
  "part14_performance.js"
  "part15_ieee754_deep.js"
  "part16_cross_methods.js"
  "part17_real_scenarios.js"
  "part18_consistency.js"
  "part19_deep_completeness.js"
)

# 统计变量
total=0
passed=0
failed=0

# 执行每个测试文件
for test_file in "${tests[@]}"; do
  echo "运行测试: $test_file"
  echo "----------------------------------------"

  # 执行测试并捕获输出
  output=$(node "$test_file" 2>&1)
  exit_code=$?

  # 解析 JSON 输出
  if echo "$output" | grep -q '"success": true'; then
    echo "✅ $test_file 通过"
    ((passed++))
  else
    echo "❌ $test_file 失败"
    echo "$output"
    ((failed++))
  fi

  ((total++))
  echo ""
done

echo "=========================================="
echo "测试汇总"
echo "=========================================="
echo "总计: $total"
echo "通过: $passed"
echo "失败: $failed"
echo "成功率: $(awk "BEGIN {printf \"%.2f\", ($passed/$total)*100}")%"
echo "=========================================="

if [ $failed -eq 0 ]; then
  echo "✅ 所有测试通过！"
  exit 0
else
  echo "❌ 存在失败的测试"
  exit 1
fi
