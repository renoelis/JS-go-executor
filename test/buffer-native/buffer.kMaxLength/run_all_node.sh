#!/bin/bash

# Buffer.kMaxLength 完整测试套件
# 使用 Node.js v25.0.0 运行所有测试

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Buffer.kMaxLength Test Suite"
echo "Node.js version: $(node --version)"
echo "Test directory: $SCRIPT_DIR"
echo "=========================================="
echo ""

# 测试脚本列表
tests=(
  "test.js"
  "part1_basic.js"
  "part2_buffer_alloc.js"
  "part3_buffer_operations.js"
  "part4_type_edge_cases.js"
  "part5_comparison.js"
  "part6_read_write_methods.js"
  "part7_tostring_methods.js"
  "part8_edge_cases.js"
  "part9_advanced_read_write.js"
  "part10_encoding_special.js"
  "part11_arraybuffer_typedarray.js"
  "part12_error_handling.js"
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

  if node "$SCRIPT_DIR/$test"; then
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
