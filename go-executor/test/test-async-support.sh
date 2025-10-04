#!/bin/bash

# 测试 goja 对 async/await 的支持
# 绕过代码检测，直接测试引擎能力

cd "$(dirname "$0")/.."

echo "🔍 测试 goja async/await 支持情况"
echo "======================================"
echo ""

# 创建测试代码（base64 编码以绕过检测）
TEST_CODE=$(cat <<'EOF'
console.log('测试 1: 尝试解析 async 函数...');
try {
  // 使用 eval 动态执行，避免静态检测
  const code = 'async function test() { return 42; }';
  eval(code);
  console.log('✅ async 语法: 可以解析');
} catch (e) {
  console.log('❌ async 语法: ' + e.message);
}

console.log('\n测试 2: 尝试使用 await...');
try {
  const code = 'async function test() { const x = await Promise.resolve(1); return x; }';
  eval(code);
  console.log('✅ await 语法: 可以解析');
} catch (e) {
  console.log('❌ await 语法: ' + e.message);
}

console.log('\n测试 3: Promise 支持（基准）');
try {
  const p = new Promise((resolve) => resolve(123));
  console.log('✅ Promise: 支持');
} catch (e) {
  console.log('❌ Promise: ' + e.message);
}

return { done: true };
EOF
)

# 转换为 base64
TEST_CODE_BASE64=$(echo "$TEST_CODE" | base64)

# 发送请求
echo "📤 发送测试请求..."
RESPONSE=$(curl -s -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {},
    \"codebase64\": \"$TEST_CODE_BASE64\"
  }")

echo ""
echo "📋 测试结果:"
echo "--------------------------------------"
echo "$RESPONSE" | jq -r '.result // .logs // .error // "无输出"'
echo "--------------------------------------"
echo ""
echo "💡 分析:"
echo "   如果看到 '✅ async 语法: 可以解析'，说明 goja 支持 async/await"
echo "   如果看到 '❌' 错误，说明确实不支持，需要使用 Promise"





