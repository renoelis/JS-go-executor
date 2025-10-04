#!/bin/bash

# 📊 XLSX 错误处理测试运行脚本

echo "========================================"
echo "🧪 XLSX 模块错误处理测试"
echo "========================================"
echo ""
echo "测试场景："
echo "  1. 无效的 URL 下载"
echo "  2. 无效的 Buffer 数据"
echo "  3. 不存在的工作表"
echo "  4. 空数据处理"
echo "  5. 网络超时处理"
echo "  6. 上传权限错误"
echo "  7. 特殊字符处理"
echo "  8. 超大数据量处理"
echo "  9. 类型转换错误"
echo " 10. 性能限制处理"
echo ""

# 检查服务状态
echo "🔍 检查服务状态..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health)

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ 服务未运行（HTTP $HTTP_CODE）"
    echo "请先启动服务："
    echo "  cd ../../go-executor && ./flow-codeblock-go"
    exit 1
fi

echo "✅ 服务运行正常"
echo ""

# 读取测试代码
TEST_CODE=$(cat error-handling-test.js)
TEST_CODE_BASE64=$(echo "$TEST_CODE" | base64)

echo "📤 发送测试请求..."
echo "⚠️  注意：此测试包含网络请求，可能需要 30-60 秒"
echo ""

# 执行测试
RESPONSE=$(curl -s -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{
    \"codeBase64\": \"$TEST_CODE_BASE64\",
    \"input\": {}
  }")

# 显示结果
echo "$RESPONSE" | jq '.'

# 提取关键信息
echo ""
echo "========================================"
echo "📊 测试结果摘要"
echo "========================================"

SUCCESS=$(echo "$RESPONSE" | jq -r '.result.success // false')
PASSED=$(echo "$RESPONSE" | jq -r '.result.passedTests // 0')
FAILED=$(echo "$RESPONSE" | jq -r '.result.failedTests // 0')
EXEC_TIME=$(echo "$RESPONSE" | jq -r '.timing.executionTime // 0')

echo "总体结果: $([ "$SUCCESS" = "true" ] && echo "✅ 全部通过" || echo "⚠️ 部分失败")"
echo "通过测试: $PASSED / 10"
echo "失败测试: $FAILED / 10"
echo "执行时间: ${EXEC_TIME}ms"
echo ""

# 按类别显示结果
echo "按类别统计:"
echo ""

echo "网络错误处理:"
echo "  - 无效 URL: $(echo "$RESPONSE" | jq -r '.result.categories.networkErrors.invalidUrl // false' | sed 's/true/✅/;s/false/❌/')"
echo "  - 超时处理: $(echo "$RESPONSE" | jq -r '.result.categories.networkErrors.timeout // false' | sed 's/true/✅/;s/false/❌/')"
echo "  - 上传错误: $(echo "$RESPONSE" | jq -r '.result.categories.networkErrors.uploadError // false' | sed 's/true/✅/;s/false/❌/')"
echo ""

echo "数据错误处理:"
echo "  - 无效 Buffer: $(echo "$RESPONSE" | jq -r '.result.categories.dataErrors.invalidBuffer // false' | sed 's/true/✅/;s/false/❌/')"
echo "  - 不存在工作表: $(echo "$RESPONSE" | jq -r '.result.categories.dataErrors.nonExistentSheet // false' | sed 's/true/✅/;s/false/❌/')"
echo "  - 空数据: $(echo "$RESPONSE" | jq -r '.result.categories.dataErrors.emptyData // false' | sed 's/true/✅/;s/false/❌/')"
echo "  - 类型转换: $(echo "$RESPONSE" | jq -r '.result.categories.dataErrors.typeConversion // false' | sed 's/true/✅/;s/false/❌/')"
echo ""

echo "边界情况:"
echo "  - 特殊字符: $(echo "$RESPONSE" | jq -r '.result.categories.edgeCases.specialCharacters // false' | sed 's/true/✅/;s/false/❌/')"
echo "  - 大数据集: $(echo "$RESPONSE" | jq -r '.result.categories.edgeCases.largeDataset // false' | sed 's/true/✅/;s/false/❌/')"
echo "  - 性能限制: $(echo "$RESPONSE" | jq -r '.result.categories.edgeCases.performanceLimits // false' | sed 's/true/✅/;s/false/❌/')"
echo ""

# 显示性能数据（如果有）
LARGE_DATASET_SPEED=$(echo "$RESPONSE" | jq -r '.result.results.test8.writeSpeed // empty')
if [ -n "$LARGE_DATASET_SPEED" ]; then
    echo "性能指标:"
    echo "  - 大数据写入速度: $LARGE_DATASET_SPEED 行/秒"
    READ_SPEED=$(echo "$RESPONSE" | jq -r '.result.results.test8.readSpeed // empty')
    echo "  - 大数据读取速度: $READ_SPEED 行/秒"
    FILE_SIZE=$(echo "$RESPONSE" | jq -r '.result.results.test8.fileSizeKB // empty')
    echo "  - 1000行文件大小: ${FILE_SIZE} KB"
fi

echo ""
echo "========================================"
echo "🎉 测试完成"
echo "========================================"






