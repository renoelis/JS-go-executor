#!/bin/bash

# 安全修复测试脚本
# 测试 ReDoS 防护和 Unicode 绕过防护

echo "======================================"
echo "安全修复功能测试"
echo "======================================"
echo ""

cd "$(dirname "$0")"

# 启动服务
echo "启动服务..."
PORT=3011 ./flow-codeblock-go > /tmp/test_security.log 2>&1 &
SERVER_PID=$!
sleep 3

echo "服务已启动 (PID: $SERVER_PID)"
echo ""

# 测试函数
test_code() {
    local test_name="$1"
    local code_b64="$2"
    local expect_success="$3"
    
    echo "【测试: $test_name】"
    result=$(curl -s -X POST http://localhost:3011/flow/codeblock \
        -H "Content-Type: application/json" \
        -d "{\"codeBase64\":\"$code_b64\"}" | jq -r '.success')
    
    if [ "$result" = "$expect_success" ]; then
        echo "✅ 通过 (success=$result)"
    else
        echo "❌ 失败 (expected=$expect_success, got=$result)"
        curl -s -X POST http://localhost:3011/flow/codeblock \
            -H "Content-Type: application/json" \
            -d "{\"codeBase64\":\"$code_b64\"}" | jq '.error'
    fi
    echo ""
}

# 测试 1: 正常代码（应该通过）
echo "=== 测试组 1: 正常代码 ==="
code1=$(echo 'return {message: "test"}' | base64)
test_code "正常代码" "$code1" "true"

# 测试 2: eval 检测（应该被拒绝）
echo "=== 测试组 2: eval 检测 ==="
code2=$(echo 'eval("return 1"); return 1' | base64)
test_code "eval (无空格)" "$code2" "false"

code3=$(echo 'eval ("return 1"); return 1' | base64)
test_code "eval (1个空格)" "$code3" "false"

code4=$(echo 'eval  ("return 1"); return 1' | base64)
test_code "eval (2个空格)" "$code4" "false"

code5=$(echo 'eval   ("return 1"); return 1' | base64)
test_code "eval (3个空格)" "$code5" "false"

# 测试 3: ReDoS 攻击防护（大量空格）
echo "=== 测试组 3: ReDoS 防护（大量空格） ==="
# 注意：即使有 100 个空格，也应该被快速拒绝（不会卡死）
code6=$(echo 'eval                                                                                                    ("return 1"); return 1' | base64)
echo "测试 eval + 100个空格（应快速响应，不卡死）..."
start_time=$(date +%s%N)
test_code "eval + 100空格" "$code6" "false"
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))  # 转换为毫秒
echo "⏱️  响应时间: ${duration}ms"
if [ $duration -lt 1000 ]; then
    echo "✅ ReDoS 防护有效（响应时间 < 1秒）"
else
    echo "⚠️  响应较慢（可能存在 ReDoS 风险）"
fi
echo ""

# 测试 4: Unicode 零宽字符绕过防护
echo "=== 测试组 4: Unicode 绕过防护 ==="

# 测试 4.1: 零宽空格 \u200B
code7=$(echo 'const obj = {}; obj.​constructor; return 1' | base64)  # 注意：​ 是零宽空格
test_code "零宽空格绕过 (\\u200B)" "$code7" "false"

# 测试 4.2: .constructor 正常检测
code8=$(echo 'const obj = {}; obj.constructor; return 1' | base64)
test_code "正常 .constructor" "$code8" "false"

# 测试 5: 正常代码不误报
echo "=== 测试组 5: 正常代码不误报 ==="
code9=$(echo 'const result = "evaluate your options"; return result' | base64)
test_code "包含 evaluate 单词" "$code9" "true"

code10=$(echo 'const data = {evaluation: "test"}; return data' | base64)
test_code "包含 evaluation 属性" "$code10" "true"

# 获取统计信息
echo "=== 缓存统计 ==="
curl -s http://localhost:3011/flow/status | jq '{
    codeValidation: .cache.codeValidation,
    codeCompilation: .cache.codeCompilation
}'

# 关闭服务
echo ""
echo "关闭服务..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo ""
echo "======================================"
echo "测试完成"
echo "======================================"
echo ""
echo "查看完整日志："
echo "  tail -n 50 /tmp/test_security.log"

