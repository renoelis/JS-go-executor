#!/bin/bash

# buf.swap16/swap32/swap64 - 本地 Node v25.0.0 测试执行脚本

echo "=========================================="
echo "Buffer swap16/32/64 Complete Test Suite"
echo "Node Version: $(node --version)"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FAILED_TESTS=0
TOTAL_PARTS=0

run_test() {
  local test_file=$1
  local test_name=$(basename "$test_file")

  echo "运行: $test_name"
  echo "----------------------------------------"

  TOTAL_PARTS=$((TOTAL_PARTS + 1))

  if node "$test_file"; then
    echo "✅ $test_name 通过"
  else
    echo "❌ $test_name 失败"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi

  echo ""
}

# 执行所有测试文件
run_test "$SCRIPT_DIR/part1_swap_basic.js"
run_test "$SCRIPT_DIR/part2_swap_types.js"
run_test "$SCRIPT_DIR/part3_swap_errors.js"
run_test "$SCRIPT_DIR/part4_swap_safety.js"
run_test "$SCRIPT_DIR/part5_swap_edge_cases.js"
run_test "$SCRIPT_DIR/part6_documentation_compliance.js"
run_test "$SCRIPT_DIR/part7_real_behavior_edges.js"
run_test "$SCRIPT_DIR/part8_final_coverage.js"
run_test "$SCRIPT_DIR/part9_deep_memory_scenarios.js"
run_test "$SCRIPT_DIR/part10_deep_error_boundaries.js"
run_test "$SCRIPT_DIR/part11_performance_stress.js"
run_test "$SCRIPT_DIR/part12_extreme_boundaries.js"
run_test "$SCRIPT_DIR/part13_byte_patterns_integrity.js"
run_test "$SCRIPT_DIR/part14_cross_method_interactions.js"
run_test "$SCRIPT_DIR/part15_typedarray_methods.js"
run_test "$SCRIPT_DIR/part16_deep_gap_filling.js"
run_test "$SCRIPT_DIR/part17_ultimate_edge_cases.js"

# 总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo "总计测试文件: $TOTAL_PARTS"
echo "通过: $((TOTAL_PARTS - FAILED_TESTS))"
echo "失败: $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo "🎉 所有测试通过！"
  exit 0
else
  echo "⚠️  有 $FAILED_TESTS 个测试文件失败"
  exit 1
fi
