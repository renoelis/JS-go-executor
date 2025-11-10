#!/bin/bash

# buf.readBigInt64BE() 完整测试运行脚本
# 用于验证 readBigInt64BE 方法在 Go + goja 服务中的表现

set -e

BASE_DIR="/Users/Code/Go-product/Flow-codeblock_goja"
TEST_DIR="$BASE_DIR/test/buffer-native/buf.read*/buf.readBigInt64BE"
API_URL="http://localhost:3002/flow/codeblock"
ACCESS_TOKEN="flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15"

echo "=========================================="
echo "buf.readBigInt64BE() 完整测试"
echo "=========================================="
echo ""

# 测试文件列表（排序以确保一致性）
tests=(
  "part1_basic.js"
  "part2_edge_cases.js"
  "part3_offset_validation.js"
  "part4_byte_order.js"
  "part5_buffer_types.js"
  "part6_return_type.js"
  "part7_comprehensive.js"
  "part8_special_cases.js"
  "part9_endianness_comparison.js"
  "part10_performance.js"
  "part11_context_validation.js"
  "part12_memory_safety.js"
  "part13_typedarray_interop.js"
  "part14_frozen_sealed_buffers.js"
  "part15_numeric_string_offset.js"
  "part16_method_integrity.js"
  "part17_this_context.js"
  "part18_extra_arguments.js"
  "part19_buffer_subarray.js"
  "part20_arraybuffer_source.js"
  "part21_strict_mode.js"
  "part22_sharedarraybuffer.js"
  "part23_buffer_pool_reuse.js"
  "part24_error_messages.js"
  "part25_offset_coercion.js"
  "part26_multiple_reads.js"
  "part27_buffer_state.js"
  "part28_dataview_comparison.js"
  "part29_special_offset_values.js"
  "part30_method_chaining.js"
  "part31_prototype_pollution.js"
  "part32_signed_unsigned_comparison.js"
  "part33_symbol_toprimitive.js"
  "part34_extreme_buffers.js"
  "part35_method_descriptor.js"
  "part36_non_buffer_objects.js"
  "part37_bigint_edge_values.js"
  "part38_buffer_modifications.js"
)

total_tests=0
total_passed=0
total_failed=0
failed_files=()

# 运行每个测试文件
for test_file in "${tests[@]}"; do
  echo "----------------------------------------"
  echo "运行测试: $test_file"
  echo "----------------------------------------"
  
  # 检查文件是否存在
  if [ ! -f "$TEST_DIR/$test_file" ]; then
    echo "❌ 测试文件不存在: $test_file"
    echo ""
    continue
  fi
  
  # Base64 编码测试文件
  CODE=$(base64 < "$TEST_DIR/$test_file")
  
  # 发送请求并获取结果
  RESPONSE=$(curl -s --location "$API_URL" \
    --header 'Content-Type: application/json' \
    --header "accessToken: $ACCESS_TOKEN" \
    --data "{\"codebase64\": \"$CODE\", \"input\": {}}")
  
  # 检查请求是否成功
  if [ $? -ne 0 ]; then
    echo "❌ 请求失败"
    echo ""
    failed_files+=("$test_file")
    continue
  fi
  
  # 解析结果
  success=$(echo "$RESPONSE" | jq -r '.success')
  
  if [ "$success" != "true" ]; then
    echo "❌ 代码执行失败"
    echo "$RESPONSE" | jq '.error'
    echo ""
    failed_files+=("$test_file")
    continue
  fi
  
  # 获取测试统计
  test_total=$(echo "$RESPONSE" | jq -r '.result.summary.total // 0')
  test_passed=$(echo "$RESPONSE" | jq -r '.result.summary.passed // 0')
  test_failed=$(echo "$RESPONSE" | jq -r '.result.summary.failed // 0')
  success_rate=$(echo "$RESPONSE" | jq -r '.result.summary.successRate // "0%"')
  
  # 累加总数
  total_tests=$((total_tests + test_total))
  total_passed=$((total_passed + test_passed))
  total_failed=$((total_failed + test_failed))
  
  # 显示结果
  if [ "$test_failed" -eq 0 ]; then
    echo "✅ 全部通过: $test_passed/$test_total ($success_rate)"
  else
    echo "⚠️  部分失败: $test_passed/$test_total ($success_rate)"
    echo ""
    echo "失败的测试:"
    echo "$RESPONSE" | jq -r '.result.tests[] | select(.status == "❌") | "  - " + .name'
    failed_files+=("$test_file")
  fi
  
  echo ""
done

# 显示总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo "总测试数: $total_tests"
echo "通过: $total_passed"
echo "失败: $total_failed"

if [ "$total_tests" -gt 0 ]; then
  success_percentage=$(awk "BEGIN {printf \"%.2f\", ($total_passed/$total_tests)*100}")
  echo "成功率: $success_percentage%"
  
  if [ "$total_failed" -eq 0 ]; then
    echo ""
    echo "🎉 所有测试通过！buf.readBigInt64BE() 与 Node.js v25.0.0 完全兼容！"
    exit 0
  else
    echo ""
    echo "⚠️  有 $total_failed 个测试失败"
    if [ ${#failed_files[@]} -gt 0 ]; then
      echo ""
      echo "失败的文件:"
      for file in "${failed_files[@]}"; do
        echo "  - $file"
      done
    fi
    exit 1
  fi
else
  echo ""
  echo "❌ 没有运行任何测试"
  exit 1
fi
