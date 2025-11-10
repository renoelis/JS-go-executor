#!/bin/bash

echo "========================================="
echo "Running buf.subarray() Complete Test Suite"
echo "Node.js version: $(node --version)"
echo "========================================="
echo ""

TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_TESTS=0

run_test() {
  local file=$1
  local name=$2

  echo "Running: $name"
  echo "-----------------------------------------"

  result=$(node "$file")
  echo "$result"

  # 提取统计信息
  passed=$(echo "$result" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*')
  failed=$(echo "$result" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*')
  total=$(echo "$result" | grep -o '"total": [0-9]*' | grep -o '[0-9]*')

  TOTAL_PASSED=$((TOTAL_PASSED + passed))
  TOTAL_FAILED=$((TOTAL_FAILED + failed))
  TOTAL_TESTS=$((TOTAL_TESTS + total))

  echo ""
}

# 运行所有测试
run_test "part1_subarray_basic.js" "Part 1: Basic Functionality"
run_test "part2_subarray_boundaries.js" "Part 2: Boundary Cases"
run_test "part3_subarray_types.js" "Part 3: Input Types & TypedArray"
run_test "part4_subarray_errors.js" "Part 4: Error Cases"
run_test "part5_subarray_safety.js" "Part 5: Memory Safety"
run_test "part6_subarray_comparison.js" "Part 6: slice vs subarray"
run_test "part7_subarray_edge_behaviors.js" "Part 7: Edge Behaviors"
run_test "part8_subarray_combinations.js" "Part 8: Parameter Combinations"
run_test "part9_subarray_extreme.js" "Part 9: Extreme Cases"
run_test "part10_subarray_deep_supplement.js" "Part 10: Deep Supplement"
run_test "part11_subarray_advanced_edge.js" "Part 11: Advanced Edge"
run_test "part12_subarray_ultra_deep.js" "Part 12: Ultra Deep"
run_test "part13_subarray_final_exhaustive.js" "Part 13: Final Exhaustive"
run_test "part14_subarray_absolute_final.js" "Part 14: Absolute Final"
run_test "part15_subarray_operators_and_descriptors.js" "Part 15: Operators & Descriptors"

# 总结
echo "========================================="
echo "FINAL SUMMARY"
echo "========================================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $TOTAL_PASSED"
echo "Failed: $TOTAL_FAILED"

if [ $TOTAL_FAILED -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
