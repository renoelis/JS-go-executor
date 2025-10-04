#!/bin/bash

# 📊 XLSX 综合测试运行脚本
# 覆盖所有真实场景：读取、流式读取、写入、流式写入、下载修改上传

echo "========================================"
echo "🧪 XLSX 模块综合测试"
echo "========================================"
echo ""
echo "测试场景："
echo "  1. 从 URL 下载并读取 Excel"
echo "  2. 流式读取 Excel（逐行处理）"
echo "  3. 创建新 Excel 并直接写入 OSS"
echo "  4. 下载 → 修改数据 → 上传到 OSS"
echo "  5. 流式写入大量数据到 OSS"
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
TEST_CODE=$(cat comprehensive-xlsx-test.js)
TEST_CODE_BASE64=$(echo "$TEST_CODE" | base64)

echo "📤 发送测试请求..."
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
echo "通过测试: $PASSED / 5"
echo "失败测试: $FAILED / 5"
echo "执行时间: ${EXEC_TIME}ms"
echo ""

# 显示每个测试的结果
echo "详细结果:"
echo "  测试 1: $(echo "$RESPONSE" | jq -r '.result.results.test1.success // false' | sed 's/true/✅ 成功/;s/false/❌ 失败/')"
echo "  测试 2: $(echo "$RESPONSE" | jq -r '.result.results.test2.success // false' | sed 's/true/✅ 成功/;s/false/❌ 失败/')"
echo "  测试 3: $(echo "$RESPONSE" | jq -r '.result.results.test3.success // false' | sed 's/true/✅ 成功/;s/false/❌ 失败/')"
echo "  测试 4: $(echo "$RESPONSE" | jq -r '.result.results.test4.success // false' | sed 's/true/✅ 成功/;s/false/❌ 失败/')"
echo "  测试 5: $(echo "$RESPONSE" | jq -r '.result.results.test5.success // false' | sed 's/true/✅ 成功/;s/false/❌ 失败/')"
echo ""

# 显示上传的文件 URL
echo "📎 上传的文件:"
TEST3_URL=$(echo "$RESPONSE" | jq -r '.result.results.test3.url // empty')
TEST4_URL=$(echo "$RESPONSE" | jq -r '.result.results.test4.url // empty')
TEST5_URL=$(echo "$RESPONSE" | jq -r '.result.results.test5.url // empty')

[ -n "$TEST3_URL" ] && echo "  测试 3: $TEST3_URL"
[ -n "$TEST4_URL" ] && echo "  测试 4: $TEST4_URL"
[ -n "$TEST5_URL" ] && echo "  测试 5: $TEST5_URL"

echo ""
echo "========================================"
echo "🎉 测试完成"
echo "========================================"






