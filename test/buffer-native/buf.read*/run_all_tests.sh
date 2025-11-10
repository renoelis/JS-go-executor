#!/bin/bash

# buf.read* API 完整测试运行脚本
# 用于验证所有 read* 方法在 Go + goja 服务中的表现

set -e

BASE_DIR="/Users/Code/Go-product/Flow-codeblock_goja"
TEST_DIR="$BASE_DIR/test/buffer-native/buf.read*"
API_URL="http://localhost:3002/flow/codeblock"
ACCESS_TOKEN="flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15"

echo "=========================================="
echo "Buffer read* API 完整测试"
echo "=========================================="
echo ""

# 定义所有 read* API 目录（更新为实际目录名）
apis=(
  "buf.readInt8"
  "buf.readInt16BE、buf.readInt16LE"
  "buf.readInt32BE、buf.readInt32LE"
  "buf.readIntBE、buf.readIntLE"
  "buf.readUInt8"
  "buf.readUInt16BE、buf.readUInt16LE"
  "buf.readUInt32BE、buf.readUInt32LE"
  "buf.readUIntBE、buf.readUIntLE"
  "buf.readBigInt64BE"
  "buf.readBigInt64LE"
  "buf.readBigUInt64BE"
  "buf.readBigUInt64LE"
  "buf.readFloatBE"
  "buf.readFloatLE"
  "buf.readDoubleBE"
  "buf.readDoubleLE"
)

total_tests=0
total_passed=0
total_failed=0
failed_apis=()

# 遍历每个 API
for api in "${apis[@]}"; do
  echo "=========================================="
  echo "测试 API: $api"
  echo "=========================================="
  
  api_total=0
  api_passed=0
  api_failed=0
  
  api_dir="$TEST_DIR/$api"
  
  # 检查目录是否存在
  if [ ! -d "$api_dir" ]; then
    echo "⚠️  目录不存在: $api"
    echo ""
    continue
  fi
  
  # 查找该目录下的所有 .js 测试文件
  for test_path in "$api_dir"/*.js; do
    # 检查文件是否存在（处理没有匹配文件的情况）
    if [ ! -f "$test_path" ]; then
      continue
    fi
    
    test_file=$(basename "$test_path")
    
    # 检查文件是否存在
    if [ ! -f "$test_path" ]; then
      echo "⚠️  测试文件不存在: $test_file"
      continue
    fi
    
    echo "运行: $test_file"
    
    # Base64 编码测试文件
    CODE=$(base64 < "$test_path")
    
    # 发送请求并获取结果
    RESPONSE=$(curl -s --location "$API_URL" \
      --header 'Content-Type: application/json' \
      --header "accessToken: $ACCESS_TOKEN" \
      --data "{\"codebase64\": \"$CODE\", \"input\": {}}")
    
    # 检查请求是否成功
    if [ $? -ne 0 ]; then
      echo "❌ 请求失败"
      continue
    fi
    
    # 解析结果
    success=$(echo "$RESPONSE" | jq -r '.success')
    
    if [ "$success" != "true" ]; then
      echo "❌ 代码执行失败"
      echo "$RESPONSE" | jq '.error'
      continue
    fi
    
    # 获取测试统计
    test_total=$(echo "$RESPONSE" | jq -r '.result.summary.total // 0')
    test_passed=$(echo "$RESPONSE" | jq -r '.result.summary.passed // 0')
    test_failed=$(echo "$RESPONSE" | jq -r '.result.summary.failed // 0')
    success_rate=$(echo "$RESPONSE" | jq -r '.result.summary.successRate // "0%"')
    
    # 累加到 API 总数
    api_total=$((api_total + test_total))
    api_passed=$((api_passed + test_passed))
    api_failed=$((api_failed + test_failed))
    
    # 显示结果
    if [ "$test_failed" -eq 0 ]; then
      echo "  ✅ $test_file: $test_passed/$test_total ($success_rate)"
    else
      echo "  ⚠️  $test_file: $test_passed/$test_total ($success_rate)"
      echo "  失败的测试:"
      echo "$RESPONSE" | jq -r '.result.tests[] | select(.status == "❌") | "    - " + .name'
    fi
  done
  
  # 累加到总数
  total_tests=$((total_tests + api_total))
  total_passed=$((total_passed + api_passed))
  total_failed=$((total_failed + api_failed))
  
  # API 总结
  if [ "$api_failed" -eq 0 ]; then
    echo "✅ $api: 全部通过 ($api_passed/$api_total)"
  else
    echo "⚠️  $api: 部分失败 ($api_passed/$api_total)"
    failed_apis+=("$api")
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
  echo ""
  
  if [ "$total_failed" -eq 0 ]; then
    echo "🎉 所有测试通过！Buffer read* API 与 Node.js v25.0.0 完全兼容！"
    exit 0
  else
    echo "⚠️  有 $total_failed 个测试失败"
    echo ""
    echo "失败的 API:"
    for failed_api in "${failed_apis[@]}"; do
      echo "  - $failed_api"
    done
    exit 1
  fi
else
  echo ""
  echo "❌ 没有运行任何测试"
  exit 1
fi
