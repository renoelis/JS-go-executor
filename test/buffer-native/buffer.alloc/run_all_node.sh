#!/bin/bash

# Buffer.alloc() 测试套件 - Node.js v25.0.0
# 本脚本执行所有 Buffer.alloc 相关的测试用例

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$SCRIPT_DIR"

echo "========================================="
echo "Buffer.alloc() 测试套件"
echo "环境: Node.js $(node -v)"
echo "测试目录: $TEST_DIR"
echo "========================================="
echo ""

TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0
FAILED_FILES=()

run_test_file() {
  local file=$1
  local filename=$(basename "$file")
  
  echo "-----------------------------------"
  echo "执行: $filename"
  echo "-----------------------------------"
  
  if output=$(node "$file" 2>&1); then
    echo "$output"
    
    passed=$(echo "$output" | grep -o '"passed": [0-9]*' | grep -o '[0-9]*' || echo "0")
    failed=$(echo "$output" | grep -o '"failed": [0-9]*' | grep -o '[0-9]*' || echo "0")
    total=$(echo "$output" | grep -o '"total": [0-9]*' | grep -o '[0-9]*' || echo "0")
    
    TOTAL_TESTS=$((TOTAL_TESTS + total))
    TOTAL_PASSED=$((TOTAL_PASSED + passed))
    TOTAL_FAILED=$((TOTAL_FAILED + failed))
    
    if [ "$failed" != "0" ]; then
      FAILED_FILES+=("$filename")
      echo "❌ $filename: $failed 个失败"
    else
      echo "✅ $filename: 全部通过"
    fi
  else
    echo "❌ $filename 执行失败"
    echo "$output"
    FAILED_FILES+=("$filename")
  fi
  
  echo ""
}

# 按顺序执行所有测试文件
test_files=(
  "part1_basic.js"
  "part2_fill_values.js"
  "part3_encodings.js"
  "part4_errors.js"
  "part5_edge_cases.js"
  "part6_safety.js"
  "part7_compatibility.js"
  "part8_special_cases.js"
  "part9_extreme_tests.js"
  "part10_deep_coverage.js"
  "part11_encoding_deep_dive.js"
)

for file in "${test_files[@]}"; do
  if [ -f "$TEST_DIR/$file" ]; then
    run_test_file "$TEST_DIR/$file"
  else
    echo "⚠️  警告: 文件不存在 - $file"
    echo ""
  fi
done

echo "========================================="
echo "测试总结"
echo "========================================="
echo "总测试数: $TOTAL_TESTS"
echo "通过: $TOTAL_PASSED"
echo "失败: $TOTAL_FAILED"

if [ $TOTAL_TESTS -gt 0 ]; then
  success_rate=$(awk "BEGIN {printf \"%.2f\", ($TOTAL_PASSED / $TOTAL_TESTS) * 100}")
  echo "成功率: ${success_rate}%"
fi

echo ""

if [ ${#FAILED_FILES[@]} -gt 0 ]; then
  echo "失败的文件:"
  for file in "${FAILED_FILES[@]}"; do
    echo "  - $file"
  done
  echo ""
  exit 1
else
  echo "✅ 所有测试通过！"
  echo ""
  exit 0
fi
