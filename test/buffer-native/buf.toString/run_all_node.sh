#!/bin/bash
echo "========================================="
echo "Buffer.toString() Test Suite - Node v25.0.0"
echo "Node version: $(node --version)"
echo "========================================="
echo ""

tests=(
  "part1_basic.js"
  "part2_encodings.js"
  "part3_range.js"
  "part4_errors.js"
  "part5_types.js"
  "part6_edge_cases.js"
  "part7_multibyte.js"
  "part8_round2_补漏.js"
  "part9_round3_边界补充.js"
  "part10_round4_组合场景.js"
  "part11_round5_极端挑战.js"
  "part12_round6_深度查缺.js"
  "part13_round7_方法调用模式.js"
  "part14_round8_内存与稳定性.js"
  "part15_round9_编码兼容性.js"
  "part16_round10_终极边界.js"
)

total_files=0
passed_files=0
failed_files=0
total_tests=0
passed_tests=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for test_file in "${tests[@]}"; do
  total_files=$((total_files + 1))
  test_path="$SCRIPT_DIR/$test_file"
  
  echo "Running: $test_file"
  echo "-----------------------------------"
  
  if [ ! -f "$test_path" ]; then
    echo "File not found: $test_path"
    failed_files=$((failed_files + 1))
    echo ""
    continue
  fi
  
  output=$(node "$test_path" 2>&1)
  
  if echo "$output" | grep -q '"success": true'; then
    echo "PASSED $test_file"
    passed_files=$((passed_files + 1))
    
    file_total=$(echo "$output" | grep '"total":' | grep -o '[0-9]\+' | head -1)
    file_passed=$(echo "$output" | grep '"passed":' | grep -o '[0-9]\+' | head -1)
    
    if [ -n "$file_total" ]; then
      total_tests=$((total_tests + file_total))
      passed_tests=$((passed_tests + file_passed))
      echo "  -> $file_passed/$file_total tests passed"
    fi
  else
    echo "FAILED $test_file"
    failed_files=$((failed_files + 1))
  fi
  echo ""
done

echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Test files: $passed_files/$total_files passed"
echo "Test cases: $passed_tests/$total_tests passed"
if [ $total_files -gt 0 ]; then
  success_rate=$(echo "scale=2; ($passed_files * 100) / $total_files" | bc)
  echo "Success rate: ${success_rate}%"
fi
echo "========================================="

if [ $failed_files -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed!"
  exit 1
fi
