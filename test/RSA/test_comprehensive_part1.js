const crypto = require('crypto');

console.log('========================================');
console.log('  RSA 综合测试 - Part 1: 密钥生成与导出');
console.log('========================================\n');

let testCount = 0;
let passCount = 0;
let failCount = 0;
const testResults = []; // 存储所有测试结果

function test(name, fn) {
  testCount++;
  const testNumber = testCount;
  try {
    console.log(`\n[测试 ${testNumber}] ${name}`);
    fn();
    passCount++;
    console.log('✓ 通过');
    testResults.push({
      number: testNumber,
      name: name,
      status: 'passed',
      error: null
    });
  } catch (e) {
    failCount++;
    console.log('✗ 失败:', e.message);
    if (e.stack) console.log('Stack:', e.stack);
    testResults.push({
      number: testNumber,
      name: name,
      status: 'failed',
      error: e.message,
      stack: e.stack
    });
  }
}

// ============ 1. 密钥生成 ============
console.log('\n--- 1. 密钥生成测试 ---');

test('1.1 默认 publicExponent (65537)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  if (!publicKey || !privateKey) throw new Error('密钥生成失败');
});

test('1.2 自定义 publicExponent = 3', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 3
  });
  if (!publicKey || !privateKey) throw new Error('密钥生成失败');
});

test('1.3 自定义 publicExponent = 17', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 17
  });
  if (!publicKey || !privateKey) throw new Error('密钥生成失败');
});

test('1.4 非法 publicExponent (偶数) 应失败', () => {
  try {
    crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 4
    });
    throw new Error('应该抛出错误');
  } catch (e) {
    // Node.js: "pub exponent out of range"
    // 我们的实现: "odd number"
    if (!e.message.includes('odd') && !e.message.includes('out of range')) throw e;
  }
});

test('1.5 非法 publicExponent (< 3) 应失败', () => {
  try {
    crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 2
    });
    throw new Error('应该抛出错误');
  } catch (e) {
    // Node.js: "pub exponent out of range"
    // 我们的实现: "odd number" 或 ">= 3"
    if (!e.message.includes('odd') && !e.message.includes('>=') && !e.message.includes('out of range')) throw e;
  }
});

// ============ 2. 密钥导出 - PEM 格式 ============
console.log('\n--- 2. 密钥导出 - PEM 格式 ---');

const { publicKey: testPubKey, privateKey: testPrivKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048
});

test('2.1 导出公钥 - SPKI PEM', () => {
  const pem = testPubKey.export({ type: 'spki', format: 'pem' });
  if (!pem.includes('BEGIN PUBLIC KEY')) throw new Error('PEM 格式错误');
});

test('2.2 导出公钥 - PKCS1 PEM', () => {
  const pem = testPubKey.export({ type: 'pkcs1', format: 'pem' });
  if (!pem.includes('BEGIN RSA PUBLIC KEY')) throw new Error('PEM 格式错误');
});

test('2.3 导出私钥 - PKCS8 PEM', () => {
  const pem = testPrivKey.export({ type: 'pkcs8', format: 'pem' });
  if (!pem.includes('BEGIN PRIVATE KEY')) throw new Error('PEM 格式错误');
});

test('2.4 导出私钥 - PKCS1 PEM', () => {
  const pem = testPrivKey.export({ type: 'pkcs1', format: 'pem' });
  if (!pem.includes('BEGIN RSA PRIVATE KEY')) throw new Error('PEM 格式错误');
});

// ============ 3. 密钥导出 - DER 格式 ============
console.log('\n--- 3. 密钥导出 - DER 格式 ---');

test('3.1 导出公钥 - SPKI DER', () => {
  const der = testPubKey.export({ type: 'spki', format: 'der' });
  if (!Buffer.isBuffer(der) || der.length === 0) throw new Error('DER 格式错误');
});

test('3.2 导出公钥 - PKCS1 DER', () => {
  const der = testPubKey.export({ type: 'pkcs1', format: 'der' });
  if (!Buffer.isBuffer(der) || der.length === 0) throw new Error('DER 格式错误');
});

test('3.3 导出私钥 - PKCS8 DER', () => {
  const der = testPrivKey.export({ type: 'pkcs8', format: 'der' });
  if (!Buffer.isBuffer(der) || der.length === 0) throw new Error('DER 格式错误');
});

test('3.4 导出私钥 - PKCS1 DER', () => {
  const der = testPrivKey.export({ type: 'pkcs1', format: 'der' });
  if (!Buffer.isBuffer(der) || der.length === 0) throw new Error('DER 格式错误');
});

// ============ 4. 密钥导出 - JWK 格式 ============
console.log('\n--- 4. 密钥导出 - JWK 格式 ---');

test('4.1 导出公钥 - JWK', () => {
  const jwk = testPubKey.export({ format: 'jwk' });
  if (jwk.kty !== 'RSA') throw new Error('JWK kty 错误');
  if (!jwk.n || !jwk.e) throw new Error('JWK 缺少必要字段');
});

test('4.2 导出私钥 - JWK', () => {
  const jwk = testPrivKey.export({ format: 'jwk' });
  if (jwk.kty !== 'RSA') throw new Error('JWK kty 错误');
  if (!jwk.n || !jwk.e || !jwk.d) throw new Error('JWK 缺少必要字段');
  if (!jwk.p || !jwk.q) throw new Error('JWK 缺少素数');
  if (!jwk.dp || !jwk.dq || !jwk.qi) throw new Error('JWK 缺少 CRT 参数');
});

// ============ 5. 密钥导入 - PEM 格式 ============
console.log('\n--- 5. 密钥导入 - PEM 格式 ---');

const pubPem = testPubKey.export({ type: 'spki', format: 'pem' });
const privPem = testPrivKey.export({ type: 'pkcs8', format: 'pem' });

test('5.1 导入公钥 - PEM 字符串', () => {
  const key = crypto.createPublicKey(pubPem);
  if (!key) throw new Error('导入失败');
});

test('5.2 导入私钥 - PEM 字符串', () => {
  const key = crypto.createPrivateKey(privPem);
  if (!key) throw new Error('导入失败');
});

test('5.3 导入公钥 - PEM 对象', () => {
  const key = crypto.createPublicKey({ key: pubPem, format: 'pem' });
  if (!key) throw new Error('导入失败');
});

test('5.4 导入私钥 - PEM 对象', () => {
  const key = crypto.createPrivateKey({ key: privPem, format: 'pem' });
  if (!key) throw new Error('导入失败');
});

// ============ 6. 密钥导入 - DER 格式 ============
console.log('\n--- 6. 密钥导入 - DER 格式 ---');

const pubDer = testPubKey.export({ type: 'spki', format: 'der' });
const privDer = testPrivKey.export({ type: 'pkcs8', format: 'der' });

test('6.1 导入公钥 - DER Buffer', () => {
  const key = crypto.createPublicKey({
    key: pubDer,
    format: 'der',
    type: 'spki'
  });
  if (!key) throw new Error('导入失败');
});

test('6.2 导入私钥 - DER Buffer', () => {
  const key = crypto.createPrivateKey({
    key: privDer,
    format: 'der',
    type: 'pkcs8'
  });
  if (!key) throw new Error('导入失败');
});

test('6.3 导入公钥 - DER base64 字符串', () => {
  const key = crypto.createPublicKey({
    key: pubDer.toString('base64'),
    format: 'der',
    type: 'spki',
    encoding: 'base64'
  });
  if (!key) throw new Error('导入失败');
});

test('6.4 导入私钥 - DER hex 字符串', () => {
  const key = crypto.createPrivateKey({
    key: privDer.toString('hex'),
    format: 'der',
    type: 'pkcs8',
    encoding: 'hex'
  });
  if (!key) throw new Error('导入失败');
});

// ============ 7. 密钥导入 - JWK 格式 ============
console.log('\n--- 7. 密钥导入 - JWK 格式 ---');

const pubJwk = testPubKey.export({ format: 'jwk' });
const privJwk = testPrivKey.export({ format: 'jwk' });

test('7.1 导入公钥 - JWK', () => {
  const key = crypto.createPublicKey({ key: pubJwk, format: 'jwk' });
  if (!key) throw new Error('导入失败');
});

test('7.2 导入私钥 - JWK', () => {
  const key = crypto.createPrivateKey({ key: privJwk, format: 'jwk' });
  if (!key) throw new Error('导入失败');
});

test('7.3 JWK 导入导出循环 - 公钥', () => {
  const key1 = crypto.createPublicKey({ key: pubJwk, format: 'jwk' });
  const jwk2 = key1.export({ format: 'jwk' });
  if (jwk2.n !== pubJwk.n || jwk2.e !== pubJwk.e) throw new Error('JWK 不一致');
});

test('7.4 JWK 导入导出循环 - 私钥', () => {
  const key1 = crypto.createPrivateKey({ key: privJwk, format: 'jwk' });
  const jwk2 = key1.export({ format: 'jwk' });
  if (jwk2.d !== privJwk.d) throw new Error('JWK 不一致');
});

// ============ 总结 ============
console.log('\n========================================');
console.log('  Part 1 测试总结');
console.log('========================================');
console.log(`总计: ${testCount} 个测试`);
console.log(`通过: ${passCount} 个`);
console.log(`失败: ${failCount} 个`);
console.log(`成功率: ${((passCount / testCount) * 100).toFixed(2)}%`);

return { 
  success: failCount === 0,
  total: testCount,
  passed: passCount,
  failed: failCount,
  successRate: ((passCount / testCount) * 100).toFixed(2) + '%',
  tests: testResults,
  summary: {
    passed: testResults.filter(t => t.status === 'passed').map(t => `[${t.number}] ${t.name}`),
    failed: testResults.filter(t => t.status === 'failed').map(t => ({
      test: `[${t.number}] ${t.name}`,
      error: t.error
    }))
  }
};
