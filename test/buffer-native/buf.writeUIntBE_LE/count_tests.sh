#!/bin/bash

cd "$(dirname "$0")"

total=0
passed=0

for f in part*.js; do
  result=$(node "$f" 2>&1)
  t=$(echo "$result" | grep '"total"' | grep -o '[0-9]*' | head -1)
  p=$(echo "$result" | grep '"passed"' | grep -o '[0-9]*' | head -1)

  if [ -n "$t" ] && [ -n "$p" ]; then
    total=$((total + t))
    passed=$((passed + p))
    echo "$f: $p/$t passed"
  fi
done

echo ""
echo "======================================"
echo "总测试用例: $total"
echo "总通过: $passed"
echo "总失败: $((total - passed))"
if [ $total -gt 0 ]; then
  success_rate=$(awk "BEGIN {printf \"%.2f\", ($passed/$total)*100}")
  echo "成功率: ${success_rate}%"
fi
echo "======================================"
