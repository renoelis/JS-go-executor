#!/bin/bash

# Buffer writeInt32BE 完整测试套件
# 使用 Node.js v25.0.0 运行所有测试

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Buffer writeInt32BE Test Suite"
echo "Node.js version: $(node --version)"
echo "Test directory: $SCRIPT_DIR"
echo "=========================================="
echo ""

# 测试脚本列表
tests=(
  "part1_basic.js"
  "part2_types.js"
  "part3_errors.js"
  "part4_boundary.js"
  "part5_encoding.js"
  "part6_safety.js"
  "part7_round2_docs.js"
  "part8_round3_actual.js"
  "part9_deep_numeric.js"
  "part10_deep_memory.js"
  "part11_deep_errors.js"
  "part12_deep_prototype.js"
  "part13_deep_interop.js"
  "part14_deep_coverage.js"
  "part15_final_edge_cases.js"
)

# 统计变量
total_suites=0
passed_suites=0
failed_suites=0

# 运行每个测试文件
for test in "${tests[@]}"; do
  echo "Running: $test"
  echo "----------------------------------------"

  total_suites=$((total_suites + 1))

  # 执行测试并捕获输出
  output=$(node "$SCRIPT_DIR/$test" 2>&1)
  
  # 检查测试结果中的 success 字段
  success=$(echo "$output" | jq -r '.success // false' 2>/dev/null)
  
  # 显示完整输出
  echo "$output"
  
  if [ "$success" = "true" ]; then
    passed_suites=$((passed_suites + 1))
    echo "✅ $test PASSED"
  else
    failed_suites=$((failed_suites + 1))
    echo "❌ $test FAILED"
  fi

  echo ""
  echo ""
done

# 输出总结
echo "=========================================="
echo "Test Suite Summary"
echo "=========================================="
echo "Total Suites: $total_suites"
echo "Passed: $passed_suites"
echo "Failed: $failed_suites"
echo ""

if [ $failed_suites -eq 0 ]; then
  echo "✅ All test suites passed!"
  exit 0
else
  echo "❌ Some test suites failed"
  exit 1
fi
