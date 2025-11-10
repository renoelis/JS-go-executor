#!/bin/bash

# qs.stringify() 批量测试运行脚本
# 用于本地 Node.js 环境验证

set -e

echo "════════════════════════════════════════════════════════"
echo "  qs.stringify() 完整测试套件"
echo "  qs 版本: v6.14.0"
echo "  Node.js 版本: $(node --version)"
echo "════════════════════════════════════════════════════════"
echo ""

# 测试文件列表
batches=(
  "test_stringify_batch1_basic.js"
  "test_stringify_batch2_options.js"
  "test_stringify_batch3_advanced.js"
  "test_stringify_batch4_edge_cases.js"
  "test_stringify_batch5_security.js"
)

# 统计变量
total_tests=0
total_pass=0
total_fail=0
batch_count=0
failed_batches=()

# 运行每个批次
for batch in "${batches[@]}"; do
  batch_count=$((batch_count + 1))
  echo "────────────────────────────────────────────────────────"
  echo "运行批次 $batch_count/${#batches[@]}: $batch"
  echo "────────────────────────────────────────────────────────"
  
  # 检查文件是否存在
  if [ ! -f "$batch" ]; then
    echo "❌ 错误: 文件 $batch 不存在"
    failed_batches+=("$batch (文件不存在)")
    continue
  fi
  
  # 运行测试
  output=$(node "$batch" 2>&1)
  exit_code=$?
  
  # 显示输出
  echo "$output"
  echo ""
  
  # 提取统计信息
  pass=$(echo "$output" | grep -o '"pass": [0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
  total=$(echo "$output" | grep -o '"total": [0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
  fail=$(echo "$output" | grep -o '"fail": [0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
  
  total_tests=$((total_tests + total))
  total_pass=$((total_pass + pass))
  total_fail=$((total_fail + fail))
  
  # 判断批次是否通过
  if [ "$fail" -eq 0 ] && [ "$total" -gt 0 ]; then
    echo "✅ 批次 $batch_count 通过: $pass/$total"
  else
    failed_batches+=("$batch ($fail 失败)")
    echo "❌ 批次 $batch_count 失败: $pass/$total"
  fi
  
  echo ""
done

# 显示总结
echo "════════════════════════════════════════════════════════"
echo "  测试总结"
echo "════════════════════════════════════════════════════════"
echo "总批次数: ${#batches[@]}"
echo "通过批次: $((${#batches[@]} - ${#failed_batches[@]}))"
echo "失败批次: ${#failed_batches[@]}"
echo ""
echo "总测试数: $total_tests"
echo "通过: $total_pass ✅"
echo "失败: $total_fail ❌"
echo ""

if [ ${#failed_batches[@]} -gt 0 ]; then
  echo "失败的批次:"
  for failed in "${failed_batches[@]}"; do
    echo "  - $failed"
  done
  echo ""
fi

# 计算通过率
if [ $total_tests -gt 0 ]; then
  pass_rate=$(awk "BEGIN {printf \"%.2f\", ($total_pass / $total_tests) * 100}")
  echo "通过率: $pass_rate%"
else
  echo "通过率: N/A"
fi

echo "════════════════════════════════════════════════════════"

# 返回适当的退出码
if [ $total_fail -eq 0 ] && [ ${#failed_batches[@]} -eq 0 ]; then
  echo ""
  echo "🎉 所有测试通过！"
  exit 0
else
  echo ""
  echo "⚠️  存在失败的测试"
  exit 1
fi

