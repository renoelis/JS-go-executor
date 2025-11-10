#!/bin/bash

echo "========================================"
echo "🔒 安全修复验证测试"
echo "========================================"
echo ""

API_URL="http://localhost:3002/flow/codeblock"

# 测试 1: 验证构造器链攻击被阻止
echo "测试 1: 构造器链攻击"
echo "----------------------------------------"
TEST_CODE=$(cat <<'EOF'
var obj = {};
var k = 'constr' + 'uctor';

try {
    var c = obj[k];
    
    if (c === undefined) {
        return {
            test: 1,
            name: '构造器链攻击',
            blocked: true,
            message: 'constructor 已被删除，攻击被阻止'
        };
    }
    
    if (c && c[k]) {
        try {
            var code = 'return 42';
            var result = c[k](code)();
            return {
                test: 1,
                name: '构造器链攻击',
                blocked: false,
                vulnerable: true,
                executed: result,
                message: '严重漏洞：可以执行任意代码'
            };
        } catch (err) {
            return {
                test: 1,
                name: '构造器链攻击',
                blocked: true,
                message: 'constructor.constructor 无法执行: ' + err.message
            };
        }
    }
} catch (e) {
    return {
        test: 1,
        name: '构造器链攻击',
        blocked: true,
        message: '访问被阻止: ' + e.message
    };
}
EOF
)

ENCODED=$(echo "$TEST_CODE" | base64)
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"input\": {}, \"codebase64\": \"$ENCODED\"}")

echo "$RESPONSE" | jq '.result'
echo ""

# 测试 2: 验证 lodash 功能正常
echo "测试 2: lodash 功能测试"
echo "----------------------------------------"
TEST_CODE=$(cat <<'EOF'
var _ = require('lodash');

try {
    var result = _.chunk([1, 2, 3, 4, 5, 6], 2);
    return {
        test: 2,
        name: 'lodash 功能',
        working: true,
        result: result,
        message: 'lodash 正常工作'
    };
} catch (e) {
    return {
        test: 2,
        name: 'lodash 功能',
        working: false,
        error: e.message
    };
}
EOF
)

ENCODED=$(echo "$TEST_CODE" | base64)
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"input\": {}, \"codebase64\": \"$ENCODED\"}")

echo "$RESPONSE" | jq '.result'
echo ""

# 测试 3: 验证 qs 功能正常
echo "测试 3: qs 功能测试"
echo "----------------------------------------"
TEST_CODE=$(cat <<'EOF'
var qs = require('qs');

try {
    var result = qs.stringify({ a: 1, b: 2, c: 3 });
    return {
        test: 3,
        name: 'qs 功能',
        working: true,
        result: result,
        message: 'qs 正常工作'
    };
} catch (e) {
    return {
        test: 3,
        name: 'qs 功能',
        working: false,
        error: e.message
    };
}
EOF
)

ENCODED=$(echo "$TEST_CODE" | base64)
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"input\": {}, \"codebase64\": \"$ENCODED\"}")

echo "$RESPONSE" | jq '.result'
echo ""

# 测试 4: 验证 crypto-js 功能正常
echo "测试 4: crypto-js 功能测试"
echo "----------------------------------------"
TEST_CODE=$(cat <<'EOF'
var CryptoJS = require('crypto-js');

try {
    var hash = CryptoJS.MD5('Hello World').toString();
    return {
        test: 4,
        name: 'crypto-js 功能',
        working: true,
        hash: hash,
        message: 'crypto-js 正常工作'
    };
} catch (e) {
    return {
        test: 4,
        name: 'crypto-js 功能',
        working: false,
        error: e.message
    };
}
EOF
)

ENCODED=$(echo "$TEST_CODE" | base64)
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"input\": {}, \"codebase64\": \"$ENCODED\"}")

echo "$RESPONSE" | jq '.result'
echo ""

# 测试 5: 验证 Function 被禁用
echo "测试 5: Function 禁用测试"
echo "----------------------------------------"
TEST_CODE=$(cat <<'EOF'
try {
    var F = Function;
    return {
        test: 5,
        name: 'Function 禁用',
        blocked: false,
        message: 'Function 仍然可访问'
    };
} catch (e) {
    return {
        test: 5,
        name: 'Function 禁用',
        blocked: true,
        message: 'Function 已被禁用: ' + e.message
    };
}
EOF
)

ENCODED=$(echo "$TEST_CODE" | base64)
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"input\": {}, \"codebase64\": \"$ENCODED\"}")

echo "$RESPONSE" | jq '.result'
echo ""

echo "========================================"
echo "测试完成"
echo "========================================"





