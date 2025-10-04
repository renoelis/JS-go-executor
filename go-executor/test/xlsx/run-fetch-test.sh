#!/bin/bash

# 📊 Fetch + XLSX 测试运行脚本

echo "=========================================="
echo "🌐 Fetch API + XLSX 测试"
echo "=========================================="
echo ""
echo "测试场景："
echo "  1. Fetch 下载 Excel 文件"
echo "  2. Fetch 下载并处理数据"
echo "  3. Fetch 上传 Excel 到 OSS"
echo "  4. Fetch 完整流程（下载 → 修改 → 上传）"
echo "  5. Fetch 错误处理（网络错误、超时等）"
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
TEST_CODE_BASE64=$(cat fetch-xlsx-test.js | base64)

echo "📤 发送测试请求..."
echo "⚠️  注意：此测试包含网络请求和文件上传，可能需要 20-30 秒"
echo ""

# 执行测试
RESPONSE=$(curl -s -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{\"codeBase64\": \"$TEST_CODE_BASE64\", \"input\": {}}")

# 显示结果
echo "$RESPONSE" | jq '.'

# 提取关键信息
echo ""
echo "=========================================="
echo "📊 测试结果摘要"
echo "=========================================="

SUCCESS=$(echo "$RESPONSE" | jq -r '.result.success // false')
PASSED=$(echo "$RESPONSE" | jq -r '.result.passedTests // 0')
FAILED=$(echo "$RESPONSE" | jq -r '.result.failedTests // 0')
EXEC_TIME=$(echo "$RESPONSE" | jq -r '.timing.executionTime // 0')

echo "总体结果: $([ "$SUCCESS" = "true" ] && echo "✅ 全部通过" || echo "⚠️ 部分失败")"
echo "通过测试: $PASSED / 5"
echo "失败测试: $FAILED / 5"
echo "执行时间: ${EXEC_TIME}ms"
echo ""

# 显示各测试结果
echo "详细结果:"
echo "  测试 1 (Fetch 下载): $(echo "$RESPONSE" | jq -r '.result.results.test1.success // false' | sed 's/true/✅ 通过/;s/false/❌ 失败/')"
echo "  测试 2 (数据处理): $(echo "$RESPONSE" | jq -r '.result.results.test2.success // false' | sed 's/true/✅ 通过/;s/false/❌ 失败/')"
echo "  测试 3 (Fetch 上传): $(echo "$RESPONSE" | jq -r '.result.results.test3.success // false' | sed 's/true/✅ 通过/;s/false/❌ 失败/')"
echo "  测试 4 (完整流程): $(echo "$RESPONSE" | jq -r '.result.results.test4.success // false' | sed 's/true/✅ 通过/;s/false/❌ 失败/')"
echo "  测试 5 (错误处理): $(echo "$RESPONSE" | jq -r '.result.results.test5.success // false' | sed 's/true/✅ 通过/;s/false/❌ 失败/')"
echo ""

# 显示上传的文件URL（如果有）
TEST3_URL=$(echo "$RESPONSE" | jq -r '.result.results.test3.url // empty')
if [ -n "$TEST3_URL" ]; then
    echo "上传的文件:"
    echo "  测试 3: $TEST3_URL"
fi

TEST4_URL=$(echo "$RESPONSE" | jq -r '.result.results.test4.url // empty')
if [ -n "$TEST4_URL" ]; then
    echo "  测试 4: $TEST4_URL"
fi

echo ""
echo "=========================================="
echo "🎉 测试完成"
echo "=========================================="






