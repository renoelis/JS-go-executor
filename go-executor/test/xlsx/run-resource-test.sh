#!/bin/bash

echo "========================================"
echo "🔒 XLSX 资源管理测试"
echo "========================================"
echo "测试目标："
echo "  ✅ close() 方法存在性"
echo "  ✅ 重复 close() 幂等性"
echo "  ✅ xlsx.read() 支持 close()"
echo "  ✅ Try-Finally 模式"
echo "  ✅ 异常情况下的资源释放"
echo "  ✅ 多对象独立管理"
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
echo "📤 发送资源管理测试请求..."
echo ""

# 读取测试代码
TEST_CODE=$(cat resource-management-test.js)

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
PASSED_TESTS=$(echo "$RESPONSE" | jq -r '.result.passedTests // 0')
TOTAL_TESTS=$(echo "$RESPONSE" | jq -r '.result.totalTests // 0')
EXECUTION_TIME=$(echo "$RESPONSE" | jq -r '.timing.executionTime // 0')

echo ""
echo "========================================"
echo "📊 测试结果摘要"
echo "========================================"

if [ "$SUCCESS" = "true" ]; then
    echo "✅ 总体状态: 成功"
    echo "✅ 所有资源管理测试通过"
else
    echo "⚠️  总体状态: 部分失败"
fi

echo ""
echo "通过测试: $PASSED_TESTS / $TOTAL_TESTS"
echo "执行时间: ${EXECUTION_TIME}ms"

echo ""
echo "资源管理检查:"
# 提取各项测试结果
TEST1=$(echo "$RESPONSE" | jq -r '.result.details.test1.success // false')
TEST2=$(echo "$RESPONSE" | jq -r '.result.details.test2.success // false')
TEST3=$(echo "$RESPONSE" | jq -r '.result.details.test3.success // false')
TEST4=$(echo "$RESPONSE" | jq -r '.result.details.test4.success // false')
TEST5=$(echo "$RESPONSE" | jq -r '.result.details.test5.success // false')
TEST6=$(echo "$RESPONSE" | jq -r '.result.details.test6.success // false')

echo "  - close() 方法存在: $([ "$TEST1" = "true" ] && echo "✅" || echo "❌")"
echo "  - 重复 close 幂等性: $([ "$TEST2" = "true" ] && echo "✅" || echo "❌")"
echo "  - xlsx.read() 支持: $([ "$TEST3" = "true" ] && echo "✅" || echo "❌")"
echo "  - Try-Finally 模式: $([ "$TEST4" = "true" ] && echo "✅" || echo "❌")"
echo "  - 异常情况处理: $([ "$TEST5" = "true" ] && echo "✅" || echo "❌")"
echo "  - 多对象独立管理: $([ "$TEST6" = "true" ] && echo "✅" || echo "❌")"

echo ""
echo "最佳实践:"
BEST_PRACTICE=$(echo "$RESPONSE" | jq -r '.result.bestPractice // ""')
if [ -n "$BEST_PRACTICE" ]; then
    echo "  $BEST_PRACTICE"
fi

echo ""
echo "========================================"

if [ "$SUCCESS" = "true" ] && [ "$PASSED_TESTS" = "$TOTAL_TESTS" ]; then
    echo "🎉 资源管理测试完全通过！"
    echo "   ✅ close() 方法正常工作"
    echo "   ✅ 幂等性保证"
    echo "   ✅ 异常安全"
    echo "   ✅ 推荐使用 try-finally 模式"
    exit 0
else
    echo "⚠️  部分测试失败"
    echo "   请检查详细输出排查问题"
    exit 1
fi

echo "========================================"






