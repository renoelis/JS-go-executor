#!/bin/bash

# Response Body Cancel 测试脚本

echo "=================================="
echo "Response Body Cancel 测试"
echo "=================================="
echo ""

# 检查服务是否运行
if ! curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo "❌ 服务未运行，请先启动服务:"
    echo "   docker-compose up -d"
    echo ""
    exit 1
fi

echo "✅ 服务正在运行"
echo ""

# 运行测试
echo "执行 response.body.cancel() 测试..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3002/api/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token-001" \
  -d @- <<'EOF'
{
  "code": "// Response Body Cancel 快速测试\nvar results = [];\n\n// 测试 1: body.cancel 方法存在\nfetch('https://httpbin.org/bytes/1024')\n  .then(function(response) {\n    var hasCancel = typeof response.body.cancel === 'function';\n    results.push({ test: 'body.cancel exists', passed: hasCancel });\n    \n    if (hasCancel) {\n      return response.body.cancel();\n    }\n  })\n  .then(function() {\n    results.push({ test: 'cancel() executed', passed: true });\n    return fetch('https://httpbin.org/status/200');\n  })\n  .then(function(response) {\n    results.push({ test: 'status check', passed: response.status === 200 });\n    return response.body.cancel();\n  })\n  .then(function() {\n    results.push({ test: 'immediate cancel', passed: true });\n    \n    // 输出结果\n    console.log('\\n测试结果:');\n    results.forEach(function(r) {\n      console.log(r.passed ? '✅' : '❌', r.test);\n    });\n    \n    var allPassed = results.every(function(r) { return r.passed; });\n    console.log('\\n总结:', allPassed ? '所有测试通过' : '部分测试失败');\n    \n    return { success: allPassed, results: results };\n  })\n  .catch(function(error) {\n    console.log('测试出错:', error.message);\n    return { success: false, error: error.message, results: results };\n  });"
}
EOF
)

echo "$RESPONSE" | jq '.'

# 检查结果
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

echo ""
if [ "$SUCCESS" = "true" ]; then
    echo "🎉 测试通过！"
    exit 0
else
    echo "⚠️  测试失败或有错误"
    exit 1
fi











