const crypto = require('crypto');

console.log('========================================');
console.log('  Hash/HMAC inputEncoding 测试');
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

// ============ 1. Hash update() inputEncoding 测试 ============
console.log('\n--- 1. Hash update() inputEncoding 测试 ---');

test('1.1 hex 编码输入', () => {
  // "Hello" 的 hex 编码是 "48656c6c6f"
  const hash1 = crypto.createHash('sha256');
  hash1.update('48656c6c6f', 'hex');
  const result1 = hash1.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update('Hello');
  const result2 = hash2.digest('hex');

  if (result1 !== result2) {
    throw new Error(`hex 编码解析错误: ${result1} !== ${result2}`);
  }
});

test('1.2 base64 编码输入', () => {
  // "Hello" 的 base64 编码是 "SGVsbG8="
  const hash1 = crypto.createHash('sha256');
  hash1.update('SGVsbG8=', 'base64');
  const result1 = hash1.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update('Hello');
  const result2 = hash2.digest('hex');

  if (result1 !== result2) {
    throw new Error(`base64 编码解析错误: ${result1} !== ${result2}`);
  }
});

test('1.3 latin1 编码输入', () => {
  // Latin1: 每个字符对应一个字节
  const hash1 = crypto.createHash('sha256');
  hash1.update('\x48\x65\x6c\x6c\x6f', 'latin1');
  const result1 = hash1.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update('Hello');
  const result2 = hash2.digest('hex');

  if (result1 !== result2) {
    throw new Error(`latin1 编码解析错误: ${result1} !== ${result2}`);
  }
});

test('1.4 utf8 编码输入（显式指定）', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('Hello', 'utf8');
  const result1 = hash1.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update('Hello');
  const result2 = hash2.digest('hex');

  if (result1 !== result2) {
    throw new Error(`utf8 编码解析错误: ${result1} !== ${result2}`);
  }
});

test('1.5 链式调用支持 inputEncoding', () => {
  const hash = crypto.createHash('sha256');
  const result = hash
    .update('48', 'hex')
    .update('65', 'hex')
    .update('6c6c6f', 'hex')
    .digest('hex');

  const expected = crypto.createHash('sha256').update('Hello').digest('hex');

  if (result !== expected) {
    throw new Error(`链式调用失败: ${result} !== ${expected}`);
  }
});

// ============ 2. HMAC update() inputEncoding 测试 ============
console.log('\n--- 2. HMAC update() inputEncoding 测试 ---');

test('2.1 HMAC hex 编码输入', () => {
  const hmac1 = crypto.createHmac('sha256', 'secret');
  hmac1.update('48656c6c6f', 'hex');
  const result1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'secret');
  hmac2.update('Hello');
  const result2 = hmac2.digest('hex');

  if (result1 !== result2) {
    throw new Error(`HMAC hex 编码解析错误: ${result1} !== ${result2}`);
  }
});

test('2.2 HMAC base64 编码输入', () => {
  const hmac1 = crypto.createHmac('sha256', 'secret');
  hmac1.update('SGVsbG8=', 'base64');
  const result1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'secret');
  hmac2.update('Hello');
  const result2 = hmac2.digest('hex');

  if (result1 !== result2) {
    throw new Error(`HMAC base64 编码解析错误: ${result1} !== ${result2}`);
  }
});

// ============ 3. 错误处理测试 ============
console.log('\n--- 3. 错误处理测试 ---');

test('3.1 无效的 hex 字符串应该抛出错误', () => {
  let errorThrown = false;
  try {
    const hash = crypto.createHash('sha256');
    hash.update('invalid hex', 'hex');
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('3.2 无效的 base64 字符串应该被宽松解析', () => {
  // Node.js 行为：base64 解码是宽松的，会忽略无效字符
  const hash = crypto.createHash('sha256');
  hash.update('invalid!!!', 'base64');
  const digest = hash.digest('hex');
  
  // 验证：'invalid!!!' 过滤后是 'invalid'，解码后应该有内容
  if (!digest || digest.length !== 64) {
    throw new Error('应该成功解码并返回 64 字符的 hex digest');
  }
});

test('3.3 不支持的编码应该当作 utf8 处理', () => {
  // Node.js 行为：不支持的编码会当作 utf8 处理，不抛出错误
  const hash1 = crypto.createHash('sha256');
  hash1.update('test', 'invalid-encoding');
  const digest1 = hash1.digest('hex');
  
  const hash2 = crypto.createHash('sha256');
  hash2.update('test', 'utf8');
  const digest2 = hash2.digest('hex');
  
  // 两个 digest 应该相同
  if (digest1 !== digest2) {
    throw new Error('不支持的编码应该当作 utf8 处理');
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

// 返回测试结果
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
