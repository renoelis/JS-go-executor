#!/bin/bash

echo "========================================"
echo "🔒 XLSX 模块安全漏洞测试"
echo "========================================"
echo "测试目标："
echo "  ✅ 正常 Buffer 处理"
echo "  ✅ 大 Buffer (10MB) 处理"
echo "  🛡️  恶意 Buffer (999MB) 拦截"
echo "  ⚙️  边界值 (100MB) 测试"
echo ""

# 检查服务是否运行
echo "🔍 检查服务状态..."
if curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ 服务运行正常"
else
    echo "❌ 服务未运行，请先启动服务"
    echo "   cd go-executor && ./flow-codeblock-go"
    exit 1
fi

echo ""
echo "📤 发送安全测试请求..."
echo "⚠️  注意：此测试可能需要 30-60 秒（包含大数据测试）"
echo ""

# 读取测试代码
TEST_CODE=$(cat security-test.js)

# Base64 编码
CODE_BASE64=$(echo "$TEST_CODE" | base64)

# 发送请求
RESPONSE=$(curl -s -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{
    \"codeBase64\": \"$CODE_BASE64\",
    \"input\": {}
  }")

# 输出结果
echo "$RESPONSE" | jq '.'

# 解析结果
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
SECURITY_STATUS=$(echo "$RESPONSE" | jq -r '.result.securityStatus // "UNKNOWN"')
PASSED_TESTS=$(echo "$RESPONSE" | jq -r '.result.passedTests // 0')
TOTAL_TESTS=$(echo "$RESPONSE" | jq -r '.result.totalTests // 0')
EXECUTION_TIME=$(echo "$RESPONSE" | jq -r '.timing.executionTime // 0')

echo ""
echo "========================================"
echo "📊 安全测试结果摘要"
echo "========================================"

if [ "$SUCCESS" = "true" ] && [ "$SECURITY_STATUS" = "SECURE" ]; then
    echo "✅ 安全状态: SECURE (安全)"
    echo "✅ 恶意 Buffer 攻击已被成功拦截"
else
    echo "❌ 安全状态: $SECURITY_STATUS"
    echo "⚠️  可能存在安全漏洞！"
fi

echo ""
echo "通过测试: $PASSED_TESTS / $TOTAL_TESTS"
echo "执行时间: ${EXECUTION_TIME}ms"

echo ""
echo "详细结果:"
echo "$RESPONSE" | jq -r '.result.criticalTests' 2>/dev/null | grep -v "^null$" || echo "  (详细信息请查看上方 JSON 输出)"

echo ""
echo "========================================"

if [ "$SUCCESS" = "true" ] && [ "$SECURITY_STATUS" = "SECURE" ]; then
    echo "🎉 安全测试通过！"
    echo "   🔒 内存攻击防护有效"
    echo "   ⚡ 性能优化已应用 (strconv.Itoa)"
    exit 0
else
    echo "⚠️  安全测试失败"
    echo "   请检查日志排查问题"
    exit 1
fi

echo "========================================"

