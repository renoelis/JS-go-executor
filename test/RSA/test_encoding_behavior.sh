#!/bin/bash

# 测试我们的 Go 实现与 Node.js 的行为一致性

echo "=== 测试 1: sign() 使用 utf8 编码 ==="
CODE1=$(cat << 'EOF' | base64
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

try {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const sig = sign.sign(privateKey, 'utf8');
  return { success: true, type: typeof sig, length: sig.length, message: 'utf8 编码成功' };
} catch (e) {
  return { success: false, error: e.message };
}
EOF
)

curl --location 'http://localhost:3002/flow/codeblock' \
--header 'Content-Type: application/json' \
--header 'accessToken: flow_dfff6cb46b3c4b6fb49ce561811ce642503052b7517c98201518111cac23869e' \
--data "{\"codebase64\": \"$CODE1\", \"input\": {}}" 2>/dev/null | jq -r '.output'

echo ""
echo "=== 测试 2: sign() 使用 utf-8 编码（带连字符）==="
CODE2=$(cat << 'EOF' | base64
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

try {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const sig = sign.sign(privateKey, 'utf-8');
  return { success: true, type: typeof sig, length: sig.length, message: 'utf-8 编码成功' };
} catch (e) {
  return { success: false, error: e.message };
}
EOF
)

curl --location 'http://localhost:3002/flow/codeblock' \
--header 'Content-Type: application/json' \
--header 'accessToken: flow_dfff6cb46b3c4b6fb49ce561811ce642503052b7517c98201518111cac23869e' \
--data "{\"codebase64\": \"$CODE2\", \"input\": {}}" 2>/dev/null | jq -r '.output'

echo ""
echo "=== 测试 3: verify() 字符串签名不指定 encoding ==="
CODE3=$(cat << 'EOF' | base64
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

try {
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const result = verify.verify(publicKey, "random_string_signature");
  return { success: true, result: result, message: '字符串签名不指定 encoding 成功（返回 false）' };
} catch (e) {
  return { success: false, error: e.message };
}
EOF
)

curl --location 'http://localhost:3002/flow/codeblock' \
--header 'Content-Type: application/json' \
--header 'accessToken: flow_dfff6cb46b3c4b6fb49ce561811ce642503052b7517c98201518111cac23869e' \
--data "{\"codebase64\": \"$CODE3\", \"input\": {}}" 2>/dev/null | jq -r '.output'

echo ""
echo "=== 测试 4: sign() 使用无效编码（应该失败）==="
CODE4=$(cat << 'EOF' | base64
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

try {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const sig = sign.sign(privateKey, 'invalid_encoding_xyz');
  return { success: true, message: '不应该成功！' };
} catch (e) {
  return { success: false, error: e.message, message: '正确：无效编码应该抛出错误' };
}
EOF
)

curl --location 'http://localhost:3002/flow/codeblock' \
--header 'Content-Type: application/json' \
--header 'accessToken: flow_dfff6cb46b3c4b6fb49ce561811ce642503052b7517c98201518111cac23869e' \
--data "{\"codebase64\": \"$CODE4\", \"input\": {}}" 2>/dev/null | jq -r '.output'

echo ""
echo "=== Node.js 原生行为对比 ==="
echo "测试 1: Node.js 原生 - utf8 编码"
node -e "
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
try {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const sig = sign.sign(privateKey, 'utf8');
  console.log('✓ Node.js 支持 utf8:', typeof sig, ', 长度:', sig.length);
} catch (e) {
  console.log('✗ Node.js 抛出错误:', e.message);
}
"

echo ""
echo "测试 2: Node.js 原生 - 字符串签名不指定 encoding"
node -e "
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
try {
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const result = verify.verify(publicKey, 'random_string');
  console.log('✓ Node.js 接受字符串（返回:', result, ')');
} catch (e) {
  console.log('✗ Node.js 抛出错误:', e.message);
}
"

