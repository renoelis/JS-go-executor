const crypto = require('crypto');

console.log('========================================');
console.log('  RSA 综合测试 - Part 3: 签名验签');
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

// 生成测试密钥
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048
});

// ============ 1. PKCS#1 v1.5 签名验签 ============
console.log('\n--- 1. PKCS#1 v1.5 签名验签 ---');

test('1.1 SHA-256 签名验签 (默认)', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test message');
  const signature = sign.sign(privateKey);
  
  const verify = crypto.createVerify('sha256');
  verify.update('test message');
  const valid = verify.verify(publicKey, signature);
  if (!valid) throw new Error('验签失败');
});

test('1.2 SHA-256 签名验签 (显式 PKCS1)', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test message');
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  });
  
  const verify = crypto.createVerify('sha256');
  verify.update('test message');
  const valid = verify.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, signature);
  if (!valid) throw new Error('验签失败');
});

test('1.3 多种哈希算法 - SHA-1', () => {
  const sign = crypto.createSign('sha1');
  sign.update('test');
  const signature = sign.sign(privateKey);
  
  const verify = crypto.createVerify('sha1');
  verify.update('test');
  if (!verify.verify(publicKey, signature)) throw new Error('验签失败');
});

test('1.4 多种哈希算法 - SHA-512', () => {
  const sign = crypto.createSign('sha512');
  sign.update('test');
  const signature = sign.sign(privateKey);
  
  const verify = crypto.createVerify('sha512');
  verify.update('test');
  if (!verify.verify(publicKey, signature)) throw new Error('验签失败');
});

test('1.5 错误的消息应验签失败', () => {
  const sign = crypto.createSign('sha256');
  sign.update('original message');
  const signature = sign.sign(privateKey);
  
  const verify = crypto.createVerify('sha256');
  verify.update('tampered message');
  const valid = verify.verify(publicKey, signature);
  if (valid) throw new Error('应该验签失败');
});

// ============ 2. PSS 签名验签 ============
console.log('\n--- 2. PSS 签名验签 ---');

test('2.1 PSS 默认参数', () => {
  const sign = crypto.createSign('sha256');
  sign.update('pss test');
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
  });
  
  const verify = crypto.createVerify('sha256');
  verify.update('pss test');
  const valid = verify.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
  }, signature);
  if (!valid) throw new Error('验签失败');
});

test('2.2 PSS saltLength = DIGEST (-1)', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
  });
  
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const valid = verify.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
  }, signature);
  if (!valid) throw new Error('验签失败');
});

test('2.3 PSS saltLength = AUTO (-2)', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_AUTO
  });
  
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const valid = verify.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_AUTO
  }, signature);
  if (!valid) throw new Error('验签失败');
});

test('2.4 PSS saltLength = 32', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32
  });
  
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const valid = verify.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32
  }, signature);
  if (!valid) throw new Error('验签失败');
});

test('2.5 PSS 非法 saltLength 应失败', () => {
  try {
    const sign = crypto.createSign('sha256');
    sign.update('test');
    sign.sign({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: -99
    });
    throw new Error('应该抛出错误');
  } catch (e) {
    // Node.js: "invalid salt length"
    // 我们的实现: "Invalid saltLength"
    const msg = e.message.toLowerCase();
    if (!msg.includes('salt') || !msg.includes('length')) throw e;
  }
});

// ============ 3. update() 二进制输入 ============
console.log('\n--- 3. update() 二进制输入 ---');

test('3.1 update() - Buffer 输入', () => {
  const sign = crypto.createSign('sha256');
  sign.update(Buffer.from([1, 2, 3, 4]));
  const signature = sign.sign(privateKey);
  
  const verify = crypto.createVerify('sha256');
  verify.update(Buffer.from([1, 2, 3, 4]));
  if (!verify.verify(publicKey, signature)) throw new Error('验签失败');
});

test('3.2 update() - TypedArray 输入', () => {
  const sign = crypto.createSign('sha256');
  sign.update(new Uint8Array([5, 6, 7, 8]));
  const signature = sign.sign(privateKey);
  
  const verify = crypto.createVerify('sha256');
  verify.update(new Uint8Array([5, 6, 7, 8]));
  if (!verify.verify(publicKey, signature)) throw new Error('验签失败');
});

test('3.3 update() - 多次调用', () => {
  const sign = crypto.createSign('sha256');
  sign.update('part1');
  sign.update(Buffer.from('part2'));
  sign.update(new Uint8Array([1, 2, 3]));
  const signature = sign.sign(privateKey);
  
  const verify = crypto.createVerify('sha256');
  verify.update('part1');
  verify.update(Buffer.from('part2'));
  verify.update(new Uint8Array([1, 2, 3]));
  if (!verify.verify(publicKey, signature)) throw new Error('验签失败');
});

// ============ 4. sign() 输出编码 ============
console.log('\n--- 4. sign() 输出编码 ---');

test('4.1 sign() 默认返回 Buffer', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign(privateKey);
  if (!Buffer.isBuffer(signature)) throw new Error('应该返回 Buffer');
});

test('4.2 sign() 返回 hex', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign(privateKey, 'hex');
  if (typeof signature !== 'string') throw new Error('应该返回字符串');
  if (!/^[0-9a-f]+$/.test(signature)) throw new Error('应该是 hex 格式');
});

test('4.3 sign() 返回 base64', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign(privateKey, 'base64');
  if (typeof signature !== 'string') throw new Error('应该返回字符串');
  // base64 验证
  try {
    Buffer.from(signature, 'base64');
  } catch (e) {
    throw new Error('应该是 base64 格式');
  }
});

test('4.4 sign() 返回 latin1', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign(privateKey, 'latin1');
  if (typeof signature !== 'string') throw new Error('应该返回字符串');
});

test('4.5 sign() utf8 编码（实际上是支持的）', () => {
  // 注意：虽然 utf8 对二进制数据不推荐，但 Node.js 实际上支持这个编码
  // 这是为了与 Node.js Buffer 的编码系统保持一致
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const sig = sign.sign(privateKey, 'utf8');
  // 应该成功返回字符串
  if (typeof sig !== 'string') throw new Error('应该返回字符串');
  if (sig.length === 0) throw new Error('签名不应为空');
});

test('5.3 verify() - base64 字符串签名', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign(privateKey, 'base64');
  
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  if (!verify.verify(publicKey, signature, 'base64')) throw new Error('验签失败');
});

test('5.4 verify() - 字符串签名无 encoding（默认 binary）', () => {
  // Node.js 行为：当传入字符串签名但不指定 encoding 时，
  // 不会抛出错误，而是将字符串当作 binary (latin1) 处理
  // 由于签名不匹配，会返回 false
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const result = verify.verify(publicKey, "some_string_signature");
  // 应该返回 false（因为签名不正确）
  if (result !== false) throw new Error('应该返回 false');
});

test('5.5 verify() - TypedArray 签名', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign(privateKey);
  
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const sigArray = new Uint8Array(signature);
  if (!verify.verify(publicKey, sigArray)) throw new Error('验签失败');
});

// ============ 总结 ============
console.log('\n========================================')
console.log('  Part 3 测试总结');
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
