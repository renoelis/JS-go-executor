const crypto = require('crypto');

console.log('========================================');
console.log('  RSA 综合测试 - Part 4: Hash/HMAC');
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

// ============ 1. createHash 基础功能 ============
console.log('\n--- 1. createHash 基础功能 ---');

test('1.1 SHA-256 哈希', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const digest = hash.digest();
  if (!Buffer.isBuffer(digest)) throw new Error('应该返回 Buffer');
  if (digest.length !== 32) throw new Error('SHA-256 应该是 32 字节');
});

test('1.2 SHA-1 哈希', () => {
  const hash = crypto.createHash('sha1');
  hash.update('test');
  const digest = hash.digest();
  if (digest.length !== 20) throw new Error('SHA-1 应该是 20 字节');
});

test('1.3 SHA-224 哈希', () => {
  const hash = crypto.createHash('sha224');
  hash.update('test');
  const digest = hash.digest();
  if (digest.length !== 28) throw new Error('SHA-224 应该是 28 字节');
});

test('1.4 SHA-384 哈希', () => {
  const hash = crypto.createHash('sha384');
  hash.update('test');
  const digest = hash.digest();
  if (digest.length !== 48) throw new Error('SHA-384 应该是 48 字节');
});

test('1.5 SHA-512 哈希', () => {
  const hash = crypto.createHash('sha512');
  hash.update('test');
  const digest = hash.digest();
  if (digest.length !== 64) throw new Error('SHA-512 应该是 64 字节');
});

test('1.6 MD5 哈希', () => {
  const hash = crypto.createHash('md5');
  hash.update('test');
  const digest = hash.digest();
  if (digest.length !== 16) throw new Error('MD5 应该是 16 字节');
});

// ============ 2. createHash 算法别名 ============
console.log('\n--- 2. createHash 算法别名 ---');

test('2.1 RSA-SHA256 别名', () => {
  const hash = crypto.createHash('RSA-SHA256');
  hash.update('test');
  const digest = hash.digest();
  if (digest.length !== 32) throw new Error('应该是 SHA-256');
});

test('2.2 sha-256 别名 (带连字符)', () => {
  const hash = crypto.createHash('sha-256');
  hash.update('test');
  const digest = hash.digest();
  if (digest.length !== 32) throw new Error('应该是 SHA-256');
});

test('2.3 RSA-SHA512 别名', () => {
  const hash = crypto.createHash('RSA-SHA512');
  hash.update('test');
  const digest = hash.digest();
  if (digest.length !== 64) throw new Error('应该是 SHA-512');
});

// ============ 3. createHash update() 二进制输入 ============
console.log('\n--- 3. createHash update() 二进制输入 ---');

test('3.1 update() - Buffer 输入', () => {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from([1, 2, 3, 4]));
  const digest = hash.digest();
  if (!Buffer.isBuffer(digest)) throw new Error('应该返回 Buffer');
});

test('3.2 update() - TypedArray 输入', () => {
  const hash = crypto.createHash('sha256');
  hash.update(new Uint8Array([5, 6, 7, 8]));
  const digest = hash.digest();
  if (!Buffer.isBuffer(digest)) throw new Error('应该返回 Buffer');
});

test('3.3 update() - ArrayBuffer 应该失败', () => {
  // Node.js 行为：Hash.update() 不接受 ArrayBuffer，只接受 TypedArray
  // 必须通过 TypedArray 视图来访问 ArrayBuffer 的数据
  const buffer = new ArrayBuffer(10);
  try {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);  // 直接传入 ArrayBuffer 应该失败
    throw new Error('应该抛出错误');
  } catch (e) {
    // Node.js: "The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView"
    if (e.message === '应该抛出错误') throw e;
    // 只要抛错就行，不限制错误消息
  }
});

test('3.4 update() - 多次调用', () => {
  const hash = crypto.createHash('sha256');
  hash.update('part1');
  hash.update(Buffer.from('part2'));
  hash.update(new Uint8Array([1, 2, 3]));
  const digest = hash.digest();
  if (!Buffer.isBuffer(digest)) throw new Error('应该返回 Buffer');
});

test('3.5 update() - 链式调用', () => {
  const digest = crypto.createHash('sha256')
    .update('part1')
    .update('part2')
    .digest();
  if (!Buffer.isBuffer(digest)) throw new Error('应该返回 Buffer');
});

// ============ 4. createHash digest() 编码 ============
console.log('\n--- 4. createHash digest() 编码 ---');

test('4.1 digest() 默认返回 Buffer', () => {
  const digest = crypto.createHash('sha256').update('test').digest();
  if (!Buffer.isBuffer(digest)) throw new Error('应该返回 Buffer');
});

test('4.2 digest("hex") 返回十六进制字符串', () => {
  const digest = crypto.createHash('sha256').update('test').digest('hex');
  if (typeof digest !== 'string') throw new Error('应该返回字符串');
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error('应该是 64 字符的 hex');
});

test('4.3 digest("base64") 返回 Base64 字符串', () => {
  const digest = crypto.createHash('sha256').update('test').digest('base64');
  if (typeof digest !== 'string') throw new Error('应该返回字符串');
  try {
    Buffer.from(digest, 'base64');
  } catch (e) {
    throw new Error('应该是有效的 base64');
  }
});

test('4.4 digest("latin1") 返回单字节字符串', () => {
  const digest = crypto.createHash('sha256').update('test').digest('latin1');
  if (typeof digest !== 'string') throw new Error('应该返回字符串');
  if (digest.length !== 32) throw new Error('应该是 32 字符');
});

test('4.5 digest("binary") 返回单字节字符串', () => {
  const digest = crypto.createHash('sha256').update('test').digest('binary');
  if (typeof digest !== 'string') throw new Error('应该返回字符串');
  if (digest.length !== 32) throw new Error('应该是 32 字符');
});

// ============ 5. createHmac 基础功能 ============
console.log('\n--- 5. createHmac 基础功能 ---');

test('5.1 HMAC-SHA256', () => {
  const hmac = crypto.createHmac('sha256', 'secret');
  hmac.update('test');
  const mac = hmac.digest();
  if (!Buffer.isBuffer(mac)) throw new Error('应该返回 Buffer');
  if (mac.length !== 32) throw new Error('HMAC-SHA256 应该是 32 字节');
});

test('5.2 HMAC-SHA512', () => {
  const hmac = crypto.createHmac('sha512', 'secret');
  hmac.update('test');
  const mac = hmac.digest();
  if (mac.length !== 64) throw new Error('HMAC-SHA512 应该是 64 字节');
});

test('5.3 HMAC-SHA224', () => {
  const hmac = crypto.createHmac('sha224', 'secret');
  hmac.update('test');
  const mac = hmac.digest();
  if (mac.length !== 28) throw new Error('HMAC-SHA224 应该是 28 字节');
});

test('5.4 HMAC-SHA384', () => {
  const hmac = crypto.createHmac('sha384', 'secret');
  hmac.update('test');
  const mac = hmac.digest();
  if (mac.length !== 48) throw new Error('HMAC-SHA384 应该是 48 字节');
});

// ============ 6. createHmac key 二进制输入 ============
console.log('\n--- 6. createHmac key 二进制输入 ---');

test('6.1 key - Buffer 输入', () => {
  const hmac = crypto.createHmac('sha256', Buffer.from('secret'));
  hmac.update('test');
  const mac = hmac.digest();
  if (!Buffer.isBuffer(mac)) throw new Error('应该返回 Buffer');
});

test('6.2 key - TypedArray 输入', () => {
  const key = new Uint8Array([1, 2, 3, 4, 5]);
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('test');
  const mac = hmac.digest();
  if (!Buffer.isBuffer(mac)) throw new Error('应该返回 Buffer');
});

test('6.3 key - ArrayBuffer 输入', () => {
  const buffer = new ArrayBuffer(10);
  const view = new Uint8Array(buffer);
  view.fill(42);
  const hmac = crypto.createHmac('sha256', buffer);
  hmac.update('test');
  const mac = hmac.digest();
  if (!Buffer.isBuffer(mac)) throw new Error('应该返回 Buffer');
});

// ============ 7. createHmac update() 二进制输入 ============
console.log('\n--- 7. createHmac update() 二进制输入 ---');

test('7.1 update() - Buffer 输入', () => {
  const hmac = crypto.createHmac('sha256', 'secret');
  hmac.update(Buffer.from([1, 2, 3, 4]));
  const mac = hmac.digest();
  if (!Buffer.isBuffer(mac)) throw new Error('应该返回 Buffer');
});

test('7.2 update() - TypedArray 输入', () => {
  const hmac = crypto.createHmac('sha256', 'secret');
  hmac.update(new Uint8Array([5, 6, 7, 8]));
  const mac = hmac.digest();
  if (!Buffer.isBuffer(mac)) throw new Error('应该返回 Buffer');
});

test('7.3 update() - 多次调用', () => {
  const hmac = crypto.createHmac('sha256', 'secret');
  hmac.update('part1');
  hmac.update(Buffer.from('part2'));
  hmac.update(new Uint8Array([1, 2, 3]));
  const mac = hmac.digest();
  if (!Buffer.isBuffer(mac)) throw new Error('应该返回 Buffer');
});

// ============ 8. createHmac digest() 编码 ============
console.log('\n--- 8. createHmac digest() 编码 ---');

test('8.1 digest() 默认返回 Buffer', () => {
  const mac = crypto.createHmac('sha256', 'secret').update('test').digest();
  if (!Buffer.isBuffer(mac)) throw new Error('应该返回 Buffer');
});

test('8.2 digest("hex") 返回十六进制字符串', () => {
  const mac = crypto.createHmac('sha256', 'secret').update('test').digest('hex');
  if (typeof mac !== 'string') throw new Error('应该返回字符串');
  if (!/^[0-9a-f]{64}$/.test(mac)) throw new Error('应该是 64 字符的 hex');
});

test('8.3 digest("base64") 返回 Base64 字符串', () => {
  const mac = crypto.createHmac('sha256', 'secret').update('test').digest('base64');
  if (typeof mac !== 'string') throw new Error('应该返回字符串');
});

test('8.4 digest("latin1") 返回单字节字符串', () => {
  const mac = crypto.createHmac('sha256', 'secret').update('test').digest('latin1');
  if (typeof mac !== 'string') throw new Error('应该返回字符串');
});

// ============ 9. getHashes() 一致性 ============
console.log('\n--- 9. getHashes() 一致性 ---');

test('9.1 getHashes() 返回算法列表', () => {
  const hashes = crypto.getHashes();
  if (!Array.isArray(hashes)) throw new Error('应该返回数组');
  if (hashes.length === 0) throw new Error('不应该为空');
});

test('9.2 getHashes() 包含基础算法', () => {
  const hashes = crypto.getHashes();
  const required = ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'];
  for (const algo of required) {
    if (!hashes.includes(algo)) throw new Error(`缺少算法: ${algo}`);
  }
});

test('9.3 getHashes() 中的算法都能用', () => {
  const hashes = crypto.getHashes();
  let tested = 0;
  for (const algo of hashes) {
    if (tested >= 10) break; // 只测试前 10 个
    try {
      const hash = crypto.createHash(algo);
      hash.update('test');
      hash.digest();
      tested++;
    } catch (e) {
      throw new Error(`算法 ${algo} 无法使用: ${e.message}`);
    }
  }
  if (tested === 0) throw new Error('没有测试任何算法');
});

// ============ 总结 ============
console.log('\n========================================')
console.log('  Part 4 测试总结');
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
