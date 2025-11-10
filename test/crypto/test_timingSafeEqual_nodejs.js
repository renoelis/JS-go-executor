const crypto = require('crypto');

console.log('========================================');
console.log('  Node.js crypto.timingSafeEqual() 测试');
console.log('  Node.js 版本:', process.version);
console.log('========================================\n');

let testCount = 0;
let passCount = 0;
let failCount = 0;
const testResults = [];

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
    testResults.push({
      number: testNumber,
      name: name,
      status: 'failed',
      error: e.message
    });
  }
}

// ============ 1. 基本功能测试 ============
console.log('\n--- 1. 基本功能测试 ---');

test('1.1 相同的 Buffer 应该返回 true', () => {
  const a = Buffer.from('secret');
  const b = Buffer.from('secret');
  const result = crypto.timingSafeEqual(a, b);
  if (result !== true) {
    throw new Error('期望返回 true，实际返回 ' + result);
  }
});

test('1.2 不同的 Buffer 应该返回 false', () => {
  const a = Buffer.from('secret');
  const b = Buffer.from('public');
  const result = crypto.timingSafeEqual(a, b);
  if (result !== false) {
    throw new Error('期望返回 false，实际返回 ' + result);
  }
});

test('1.3 长度不同应该抛出错误', () => {
  const a = Buffer.from('secret');
  const b = Buffer.from('secrets');
  let errorThrown = false;
  try {
    crypto.timingSafeEqual(a, b);
  } catch (e) {
    errorThrown = true;
    if (!e.message.includes('same byte length') && !e.message.includes('same length')) {
      throw new Error('错误消息不正确: ' + e.message);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误但没有');
  }
});

test('1.4 支持 Uint8Array', () => {
  const a = new Uint8Array([1, 2, 3, 4]);
  const b = new Uint8Array([1, 2, 3, 4]);
  const result = crypto.timingSafeEqual(a, b);
  if (result !== true) {
    throw new Error('期望返回 true，实际返回 ' + result);
  }
});

test('1.5 支持混合类型（Buffer 和 Uint8Array）', () => {
  const a = Buffer.from([1, 2, 3, 4]);
  const b = new Uint8Array([1, 2, 3, 4]);
  const result = crypto.timingSafeEqual(a, b);
  if (result !== true) {
    throw new Error('期望返回 true，实际返回 ' + result);
  }
});

// ============ 2. 实际使用场景 ============
console.log('\n--- 2. 实际使用场景 ---');

test('2.1 HMAC 签名验证（正确签名）', () => {
  const secret = 'my-secret-key';
  const message = 'important message';
  
  const hmac1 = crypto.createHmac('sha256', secret);
  hmac1.update(message);
  const signature1 = hmac1.digest();
  
  const hmac2 = crypto.createHmac('sha256', secret);
  hmac2.update(message);
  const signature2 = hmac2.digest();
  
  const isValid = crypto.timingSafeEqual(signature1, signature2);
  if (isValid !== true) {
    throw new Error('HMAC 签名验证失败');
  }
});

test('2.2 HMAC 签名验证（错误签名）', () => {
  const secret = 'my-secret-key';
  const message = 'important message';
  
  const hmac1 = crypto.createHmac('sha256', secret);
  hmac1.update(message);
  const correctSignature = hmac1.digest();
  
  const hmac2 = crypto.createHmac('sha256', secret);
  hmac2.update('tampered message');
  const wrongSignature = hmac2.digest();
  
  const isValid = crypto.timingSafeEqual(correctSignature, wrongSignature);
  if (isValid !== false) {
    throw new Error('错误的签名应该返回 false');
  }
});

// ============ 3. 边界情况测试 ============
console.log('\n--- 3. 边界情况测试 ---');

test('3.1 空 Buffer', () => {
  const a = Buffer.from([]);
  const b = Buffer.from([]);
  const result = crypto.timingSafeEqual(a, b);
  if (result !== true) {
    throw new Error('空 Buffer 应该相等');
  }
});

test('3.2 单字节差异', () => {
  const a = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const b = Buffer.from([0x01, 0x02, 0x03, 0x05]);
  const result = crypto.timingSafeEqual(a, b);
  if (result !== false) {
    throw new Error('单字节差异应该返回 false');
  }
});

test('3.3 全零 Buffer', () => {
  const a = Buffer.alloc(32);
  const b = Buffer.alloc(32);
  const result = crypto.timingSafeEqual(a, b);
  if (result !== true) {
    throw new Error('全零 Buffer 应该相等');
  }
});

// ============ 4. 错误处理测试 ============
console.log('\n--- 4. 错误处理测试 ---');

test('4.1 参数不足应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.timingSafeEqual(Buffer.from('test'));
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('参数不足应该抛出错误');
  }
});

test('4.2 非 Buffer 类型应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.timingSafeEqual('string1', 'string2');
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('非 Buffer 类型应该抛出错误');
  }
});

// ============ 测试总结 ============
console.log('\n========================================');
console.log('测试总结:');
console.log(`  总计: ${testCount} 个测试`);
console.log(`  通过: ${passCount} 个`);
console.log(`  失败: ${failCount} 个`);
console.log('========================================');

if (failCount > 0) {
  console.log('\n失败的测试:');
  testResults.filter(t => t.status === 'failed').forEach(t => {
    console.log(`  [${t.number}] ${t.name}`);
    console.log(`      错误: ${t.error}`);
  });
}

// 返回测试结果（用于自动化测试）
return {
  total: testCount,
  passed: passCount,
  failed: failCount,
  results: {
    passed: testResults.filter(t => t.status === 'passed').map(t => `[${t.number}] ${t.name}`),
    failed: testResults.filter(t => t.status === 'failed').map(t => ({
      test: `[${t.number}] ${t.name}`,
      error: t.error
    }))
  }
};
