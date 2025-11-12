#!/bin/bash

# buf.writeDoubleBE/LE - Node.js v25.0.0 Test Runner

echo "=========================================="
echo "buf.writeDoubleBE/LE - Node.js Tests"
echo "包含深度查缺补漏测试"
echo "Node Version: $(node --version)"
echo "=========================================="
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 统计
total=0
passed=0
failed=0

# 运行所有测试
for file in "$SCRIPT_DIR"/part*.js; do
  filename=$(basename "$file")
  echo "Running: $filename"

  result=$(node "$file")

  # 提取统计
  file_total=$(echo "$result" | grep '"total"' | grep -o '[0-9]\+' | head -1)
  file_passed=$(echo "$result" | grep '"passed"' | grep -o '[0-9]\+' | head -1)
  file_failed=$(echo "$result" | grep '"failed"' | grep -o '[0-9]\+' | head -1)

  if [ -n "$file_total" ]; then
    total=$((total + file_total))
    passed=$((passed + file_passed))
    failed=$((failed + file_failed))

    if [ "$file_failed" -eq 0 ]; then
      echo "  ✅ $file_passed/$file_total passed"
    else
      echo "  ❌ $file_passed/$file_total passed, $file_failed failed"
    fi
  fi
  echo ""
done

echo "======================================"
echo "Summary"
echo "======================================"
echo "Total:  $total"
echo "Passed: $passed"
echo "Failed: $failed"
echo ""

if [ "$failed" -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
