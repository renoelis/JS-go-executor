#!/bin/bash

set -e

echo "======================================"
echo "Running Buffer.allocUnsafeSlow Tests"
echo "======================================"

# Get absolute path
BASEDIR=$(dirname "$0")
BASEDIR=$(cd "$BASEDIR" && pwd)

echo "Test directory: $BASEDIR"
cd "$BASEDIR"

# Define test files
TEST_FILES=(
  "part1_basic.js"
  "part2_types.js"
  "part3_errors.js"
  "part4_boundaries.js"
  "part5_compatibility.js"
  "part6_official.js"
  "part7_edge_cases.js"
  "part8_combinations.js"
  "part9_extreme.js"
  "part10_function_properties.js"
  "part11_allocation_strategies.js"
  "part12_final_gap_analysis.js"
)

echo ""
echo "Node.js version: $(node --version)"
echo ""

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_FILES=""

# Run each test file
for FILE in "${TEST_FILES[@]}"; do
  echo "----------------------------------------"
  echo "Running $FILE"
  echo "----------------------------------------"

  if node "$FILE"; then
    echo "✅ $FILE completed successfully"
  else
    echo "❌ $FILE failed"
    FAILED_FILES="$FAILED_FILES $FILE"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  echo ""
done

# Summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo "Total test files: ${#TEST_FILES[@]}"
echo "Failed files: $FAILED_TESTS"
echo ""

if [ -n "$FAILED_FILES" ]; then
  echo "Failed files: $FAILED_FILES"
  echo ""
  echo "Some tests failed! Please check the output above."
  exit 1
else
  echo "✅ All tests passed!"
  echo ""
  echo "Buffer.allocUnsafeSlow test suite completed successfully."
fi