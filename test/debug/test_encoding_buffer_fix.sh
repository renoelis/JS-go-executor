#!/bin/bash
# 批量测试 encodingBuffer 状态重置是否生效

echo "=== 批量测试 encodingBuffer 修复 ==="
echo ""

PASSED=0
FAILED=0

# 连续执行 50 次相同的测试
for i in {1..50}; do
    echo "第 $i 次测试..."

    CODE=$(cat <<'EOF'
const { Buffer } = require('buffer');

// 测试 hex 转换 (使用 encodingBuffer 池)
const buf1 = Buffer.alloc(100 * 1024); // 100KB
const hex1 = buf1.toString('hex');

// 测试 base64 转换 (使用 encodingBuffer 池)
const buf2 = Buffer.alloc(100 * 1024); // 100KB
const b64 = buf2.toString('base64');

// 验证结果
const result = {
    success: hex1.length === 200000 && b64.length > 0,
    hex_length: hex1.length,
    b64_length: b64.length
};

return result;
EOF
)

    RESULT=$(curl --location 'http://localhost:3002/flow/codeblock' \
        --header 'Content-Type: application/json' \
        --header 'accessToken: flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15' \
        --data "{\"codebase64\": \"$(echo "$CODE" | base64)\", \"input\": {}}" \
        2>/dev/null | jq -r '.result.success')

    if [ "$RESULT" == "true" ]; then
        echo "  ✅ 通过"
        ((PASSED++))
    else
        echo "  ❌ 失败 (result=$RESULT)"
        ((FAILED++))
    fi

    sleep 0.1
done

echo ""
echo "=== 测试结果 ==="
echo "总数: 50"
echo "通过: $PASSED"
echo "失败: $FAILED"
echo "成功率: $(awk "BEGIN {printf \"%.2f\", $PASSED/50*100}")%"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "🎉 所有测试通过! encodingBuffer 状态重置修复成功!"
    exit 0
else
    echo ""
    echo "⚠️  仍有失败,需要进一步调查"
    exit 1
fi
