#!/bin/bash

echo "========================================="
echo "Running Buffer.writeBigUInt64BE/LE Tests"
echo "Node Version: $(node --version)"
echo "========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOTAL=0
PASSED=0
FAILED=0

run_test() {
  local file=$1
  local filename=$(basename "$file")
  echo "Running $filename..."

  if node "$file"; then
    PASSED=$((PASSED + 1))
    echo "✅ $filename passed"
  else
    FAILED=$((FAILED + 1))
    echo "❌ $filename failed"
  fi

  TOTAL=$((TOTAL + 1))
  echo ""
}

for f in "$SCRIPT_DIR"/part*.js; do
  if [ -f "$f" ]; then
    run_test "$f"
  fi
done

echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total: $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "========================================="

if [ $FAILED -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
