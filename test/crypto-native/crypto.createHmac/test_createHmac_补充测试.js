const crypto = require('crypto');

console.log('========================================');
console.log('  crypto.createHmac() 补充测试');
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
    console.log('✅ 通过');
    testResults.push({
      number: testNumber,
      name: name,
      status: 'passed',
      error: null
    });
  } catch (e) {
    failCount++;
    console.log('❌ 失败:', e.message);
    testResults.push({
      number: testNumber,
      name: name,
      status: 'failed',
      error: e.message
    });
  }
}

// ============ 1. SHA512 变种算法测试 ============
console.log('\n--- 1. SHA512 变种算法测试 ---');

test('1.1 SHA512-224 基本 HMAC 生成', () => {
  try {
    const hmac = crypto.createHmac('sha512-224', 'test-key');
    hmac.update('test data');
    const digest = hmac.digest('hex');
    if (digest.length !== 56) {
      throw new Error(`SHA512-224 输出长度应为 56，实际为 ${digest.length}`);
    }
  } catch (e) {
    if (e.message.includes('Digest method not supported')) {
      console.log('  ⚠️  SHA512-224 不被支持');
      throw e;
    }
    throw e;
  }
});

test('1.2 SHA512-256 基本 HMAC 生成', () => {
  try {
    const hmac = crypto.createHmac('sha512-256', 'test-key');
    hmac.update('test data');
    const digest = hmac.digest('hex');
    if (digest.length !== 64) {
      throw new Error(`SHA512-256 输出长度应为 64，实际为 ${digest.length}`);
    }
  } catch (e) {
    if (e.message.includes('Digest method not supported')) {
      console.log('  ⚠️  SHA512-256 不被支持');
      throw e;
    }
    throw e;
  }
});

test('1.3 SHA512-224 与 SHA512-256 输出应该不同', () => {
  try {
    const hmac1 = crypto.createHmac('sha512-224', 'key');
    hmac1.update('data');
    const digest1 = hmac1.digest('hex');

    const hmac2 = crypto.createHmac('sha512-256', 'key');
    hmac2.update('data');
    const digest2 = hmac2.digest('hex');

    if (digest1.length === digest2.length) {
      throw new Error('SHA512-224 和 SHA512-256 输出长度应该不同');
    }
  } catch (e) {
    if (e.message.includes('Digest method not supported')) {
      console.log('  ⚠️  SHA512 变种可能不被支持');
      throw e;
    }
    throw e;
  }
});

// ============ 2. SHA3 完整系列测试 ============
console.log('\n--- 2. SHA3 完整系列测试 ---');

test('2.1 SHA3-224 基本 HMAC 生成', () => {
  try {
    const hmac = crypto.createHmac('sha3-224', 'test-key');
    hmac.update('test data');
    const digest = hmac.digest('hex');
    if (digest.length !== 56) {
      throw new Error(`SHA3-224 输出长度应为 56，实际为 ${digest.length}`);
    }
  } catch (e) {
    console.log('  ⚠️  SHA3-224 可能不被支持:', e.message);
    throw e;
  }
});

test('2.2 SHA3-384 基本 HMAC 生成', () => {
  try {
    const hmac = crypto.createHmac('sha3-384', 'test-key');
    hmac.update('test data');
    const digest = hmac.digest('hex');
    if (digest.length !== 96) {
      throw new Error(`SHA3-384 输出长度应为 96，实际为 ${digest.length}`);
    }
  } catch (e) {
    console.log('  ⚠️  SHA3-384 可能不被支持:', e.message);
    throw e;
  }
});

test('2.3 SHA3 系列输出长度验证', () => {
  const sha3Algos = [
    { name: 'sha3-224', expectedLen: 56 },
    { name: 'sha3-256', expectedLen: 64 },
    { name: 'sha3-384', expectedLen: 96 },
    { name: 'sha3-512', expectedLen: 128 }
  ];

  for (const algo of sha3Algos) {
    try {
      const hmac = crypto.createHmac(algo.name, 'key');
      hmac.update('data');
      const digest = hmac.digest('hex');
      if (digest.length !== algo.expectedLen) {
        throw new Error(`${algo.name} 长度期望 ${algo.expectedLen}，实际 ${digest.length}`);
      }
    } catch (e) {
      if (!e.message.includes('Digest method not supported')) {
        throw e;
      }
    }
  }
});

// ============ 3. RIPEMD-160 测试 ============
console.log('\n--- 3. RIPEMD-160 测试 ---');

test('3.1 RIPEMD-160 基本 HMAC 生成', () => {
  try {
    const hmac = crypto.createHmac('ripemd160', 'test-key');
    hmac.update('test data');
    const digest = hmac.digest('hex');
    if (digest.length !== 40) {
      throw new Error(`RIPEMD-160 输出长度应为 40，实际为 ${digest.length}`);
    }
  } catch (e) {
    console.log('  ⚠️  RIPEMD-160 可能不被支持:', e.message);
    throw e;
  }
});

test('3.2 RIPEMD-160 与 SHA1 长度相同但结果不同', () => {
  try {
    const hmac1 = crypto.createHmac('ripemd160', 'key');
    hmac1.update('data');
    const digest1 = hmac1.digest('hex');

    const hmac2 = crypto.createHmac('sha1', 'key');
    hmac2.update('data');
    const digest2 = hmac2.digest('hex');

    if (digest1.length !== digest2.length) {
      throw new Error('RIPEMD-160 和 SHA1 应该都是 40 字符');
    }
    if (digest1 === digest2) {
      throw new Error('RIPEMD-160 和 SHA1 应该产生不同结果');
    }
  } catch (e) {
    if (e.message.includes('Digest method not supported')) {
      console.log('  ⚠️  RIPEMD-160 可能不被支持');
      throw e;
    }
    throw e;
  }
});

// ============ 4. BLAKE2 系列测试 ============
console.log('\n--- 4. BLAKE2 系列测试 ---');

test('4.1 BLAKE2b512 基本 HMAC 生成', () => {
  try {
    const hmac = crypto.createHmac('blake2b512', 'test-key');
    hmac.update('test data');
    const digest = hmac.digest('hex');
    if (digest.length !== 128) {
      throw new Error(`BLAKE2b512 输出长度应为 128，实际为 ${digest.length}`);
    }
  } catch (e) {
    console.log('  ⚠️  BLAKE2b512 可能不被支持:', e.message);
    throw e;
  }
});

test('4.2 BLAKE2s256 基本 HMAC 生成', () => {
  try {
    const hmac = crypto.createHmac('blake2s256', 'test-key');
    hmac.update('test data');
    const digest = hmac.digest('hex');
    if (digest.length !== 64) {
      throw new Error(`BLAKE2s256 输出长度应为 64，实际为 ${digest.length}`);
    }
  } catch (e) {
    console.log('  ⚠️  BLAKE2s256 可能不被支持:', e.message);
    throw e;
  }
});

// ============ 5. update() 更多编码格式测试 ============
console.log('\n--- 5. update() 更多编码格式测试 ---');

test('5.1 update() 支持 ascii 编码', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('hello', 'ascii');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update('hello', 'utf8');
  const digest2 = hmac2.digest('hex');

  if (digest1 !== digest2) {
    throw new Error('ascii 编码应该与 utf8 编码产生相同结果（对于纯 ASCII 字符）');
  }
});

test('5.2 update() 支持 utf16le 编码', () => {
  const text = 'hello';
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update(text, 'utf16le');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update(Buffer.from(text, 'utf16le'));
  const digest2 = hmac2.digest('hex');

  if (digest1 !== digest2) {
    throw new Error('utf16le 编码应该与 Buffer 转换结果一致');
  }
});

test('5.3 update() 支持 ucs2 编码（与 utf16le 相同）', () => {
  const text = 'hello';

  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update(text, 'ucs2');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update(text, 'utf16le');
  const digest2 = hmac2.digest('hex');

  if (digest1 !== digest2) {
    throw new Error('ucs2 编码应该与 utf16le 编码相同');
  }
});

test('5.4 update() 支持 binary 编码（与 latin1 相同）', () => {
  const data = 'hello\xFF';

  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update(data, 'binary');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update(data, 'latin1');
  const digest2 = hmac2.digest('hex');

  if (digest1 !== digest2) {
    throw new Error('binary 编码应该与 latin1 编码相同');
  }
});

test('5.5 update() hex 编码处理奇数长度字符串', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  let errorThrown = false;
  try {
    hmac.update('abc', 'hex');
  } catch (e) {
    errorThrown = true;
    if (!e.message.includes('encoding') && !e.message.includes('invalid') &&
        !e.message.includes('odd') && !e.message.includes('Invalid')) {
      throw new Error('错误消息格式不符合预期: ' + e.message);
    }
  }
  if (!errorThrown) {
    throw new Error('奇数长度的 hex 字符串应该抛出错误');
  }
});

// ============ 6. digest() 更多编码格式测试 ============
console.log('\n--- 6. digest() 更多编码格式测试 ---');

test('6.1 digest() 支持 utf8 编码', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('test');
  const digest = hmac.digest('utf8');
  if (typeof digest !== 'string') {
    throw new Error('utf8 编码应该返回字符串');
  }
});

test('6.2 digest() 支持 ascii 编码', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('test');
  const digest = hmac.digest('ascii');
  if (typeof digest !== 'string') {
    throw new Error('ascii 编码应该返回字符串');
  }
});

test('6.3 digest() 支持 utf16le 编码', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('test');
  const digest = hmac.digest('utf16le');
  if (typeof digest !== 'string') {
    throw new Error('utf16le 编码应该返回字符串');
  }
});

test('6.4 digest() 支持 ucs2 编码', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('test');
  const digest = hmac.digest('ucs2');
  if (typeof digest !== 'string') {
    throw new Error('ucs2 编码应该返回字符串');
  }
});

test('6.5 digest() 支持 binary 编码', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('test');
  const digest = hmac.digest('binary');
  if (typeof digest !== 'string') {
    throw new Error('binary 编码应该返回字符串');
  }
});

test('6.6 digest() ucs2 与 utf16le 编码相同', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('test');
  const digest1 = hmac1.digest('ucs2');

  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update('test');
  const digest2 = hmac2.digest('utf16le');

  if (digest1 !== digest2) {
    throw new Error('ucs2 与 utf16le 编码应该产生相同结果');
  }
});

// ============ 7. 更多密钥类型测试 ============
console.log('\n--- 7. 更多密钥类型测试 ---');

test('7.1 Int8Array 类型密钥', () => {
  const buffer = Buffer.from('secret');
  const key = new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  if (digest.length !== 64) {
    throw new Error('Int8Array 密钥应该正常工作');
  }
});

test('7.2 Uint16Array 类型密钥', () => {
  const buffer = Buffer.from('secret!!'); // 8 bytes for Uint16Array
  const key = new Uint16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  if (digest.length !== 64) {
    throw new Error('Uint16Array 密钥应该正常工作');
  }
});

test('7.3 Int32Array 类型密钥', () => {
  const buffer = Buffer.from('secret!!!!secret'); // 16 bytes
  const key = new Int32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  if (digest.length !== 64) {
    throw new Error('Int32Array 密钥应该正常工作');
  }
});

test('7.4 Float32Array 类型密钥', () => {
  const key = new Float32Array([1.5, 2.5, 3.5, 4.5]);
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  if (digest.length !== 64) {
    throw new Error('Float32Array 密钥应该正常工作');
  }
});

test('7.5 Float64Array 类型密钥', () => {
  const key = new Float64Array([1.5, 2.5, 3.5, 4.5]);
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  if (digest.length !== 64) {
    throw new Error('Float64Array 密钥应该正常工作');
  }
});

test('7.6 不同 TypedArray 视图相同底层数据产生相同 HMAC', () => {
  const buffer = Buffer.from('secret');

  const hmac1 = crypto.createHmac('sha256', new Uint8Array(buffer));
  hmac1.update('data');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
  hmac2.update('data');
  const digest2 = hmac2.digest('hex');

  if (digest1 !== digest2) {
    throw new Error('相同底层数据应该产生相同 HMAC');
  }
});

// ============ 8. 更多错误处理测试 ============
console.log('\n--- 8. 更多错误处理测试 ---');

test('8.1 update() 传入 undefined 应该抛出错误', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  let errorThrown = false;
  try {
    hmac.update(undefined);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入 undefined 应该抛出错误');
  }
});

test('8.2 update() 传入数组应该抛出错误', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  let errorThrown = false;
  try {
    hmac.update([1, 2, 3]);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入数组应该抛出错误');
  }
});

test('8.3 createHmac 密钥传入 null 应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.createHmac('sha256', null);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('密钥为 null 应该抛出错误');
  }
});

test('8.4 createHmac 密钥传入 undefined 应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.createHmac('sha256', undefined);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('密钥为 undefined 应该抛出错误');
  }
});

test('8.5 createHmac 密钥传入数字应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.createHmac('sha256', 123);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('密钥为数字应该抛出错误');
  }
});

test('8.6 createHmac 密钥传入对象应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.createHmac('sha256', { key: 'value' });
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('密钥为对象应该抛出错误');
  }
});

test('8.7 digest(null) 的行为', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('data');
  const result = hmac.digest(null);
  if (!Buffer.isBuffer(result)) {
    throw new Error('传入 null 应该返回 Buffer（等同于不传参数）');
  }
});

test('8.8 第二次调用 digest() 返回空字符串', () => {
  // Node.js v25.0.0 行为: HMAC 第二次调用 digest() 不会抛出错误,而是返回空字符串
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('data');
  const digest1 = hmac.digest('hex');

  const digest2 = hmac.digest('hex');

  if (digest1.length !== 64) {
    throw new Error('第一次 digest 应该返回正常结果');
  }
  if (digest2 !== '') {
    throw new Error(`第二次 digest 应该返回空字符串，实际返回: "${digest2}"`);
  }
  console.log('  ⚠️  HMAC 第二次 digest() 返回空字符串(与 Hash 对象不同)');
});

test('8.9 createHmac 传入空字符串算法应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.createHmac('', 'key');
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('空字符串算法应该抛出错误');
  }
});

// ============ 9. RFC 4231 完整测试向量 ============
console.log('\n--- 9. RFC 4231 完整测试向量（HMAC-SHA256）---');

test('9.1 RFC 4231 Test Case 1', () => {
  const key = Buffer.from('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex');
  const data = Buffer.from('4869205468657265', 'hex'); // "Hi There"
  const expected = 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7';

  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  const digest = hmac.digest('hex');

  if (digest !== expected) {
    throw new Error(`RFC 4231-1 失败\n期望: ${expected}\n实际: ${digest}`);
  }
});

test('9.2 RFC 4231 Test Case 2', () => {
  const key = Buffer.from('4a656665', 'hex'); // "Jefe"
  const data = Buffer.from('7768617420646f2079612077616e7420666f72206e6f7468696e673f', 'hex'); // "what do ya want for nothing?"
  const expected = '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843';

  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  const digest = hmac.digest('hex');

  if (digest !== expected) {
    throw new Error(`RFC 4231-2 失败\n期望: ${expected}\n实际: ${digest}`);
  }
});

test('9.3 RFC 4231 Test Case 3', () => {
  const key = Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hex');
  const data = Buffer.from('dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', 'hex');
  const expected = '773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe';

  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  const digest = hmac.digest('hex');

  if (digest !== expected) {
    throw new Error(`RFC 4231-3 失败\n期望: ${expected}\n实际: ${digest}`);
  }
});

test('9.4 RFC 4231 Test Case 4', () => {
  const key = Buffer.from('0102030405060708090a0b0c0d0e0f10111213141516171819', 'hex');
  const data = Buffer.from('cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd', 'hex');
  const expected = '82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b';

  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  const digest = hmac.digest('hex');

  if (digest !== expected) {
    throw new Error(`RFC 4231-4 失败\n期望: ${expected}\n实际: ${digest}`);
  }
});

test('9.5 RFC 4231 Test Case 6 (长密钥)', () => {
  const key = Buffer.from('aa'.repeat(131), 'hex'); // 131 bytes
  const data = Buffer.from('54657374205573696e67204c6172676572205468616e20426c6f636b2d53697a65204b6579202d2048617368204b6579204669727374', 'hex');
  const expected = '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54';

  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  const digest = hmac.digest('hex');

  if (digest !== expected) {
    throw new Error(`RFC 4231-6 失败\n期望: ${expected}\n实际: ${digest}`);
  }
});

test('9.6 RFC 4231 Test Case 7 (长密钥和长数据)', () => {
  const key = Buffer.from('aa'.repeat(131), 'hex'); // 131 bytes
  const data = Buffer.from('5468697320697320612074657374207573696e672061206c6172676572207468616e20626c6f636b2d73697a65206b657920616e642061206c6172676572207468616e20626c6f636b2d73697a6520646174612e20546865206b6579206e6565647320746f20626520686173686564206265666f7265206265696e6720757365642062792074686520484d414320616c676f726974686d2e', 'hex');
  const expected = '9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2';

  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  const digest = hmac.digest('hex');

  if (digest !== expected) {
    throw new Error(`RFC 4231-7 失败\n期望: ${expected}\n实际: ${digest}`);
  }
});

// ============ 10. 密钥长度边界测试 ============
console.log('\n--- 10. 密钥长度边界测试 ---');

test('10.1 密钥长度等于 SHA256 块大小 (64 字节)', () => {
  const key = Buffer.alloc(64, 'k'); // 64 bytes
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  if (digest.length !== 64) {
    throw new Error('64字节密钥应该正常工作');
  }
});

test('10.2 密钥长度小于块大小 (32 字节)', () => {
  const key = Buffer.alloc(32, 'k'); // 32 bytes
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  if (digest.length !== 64) {
    throw new Error('32字节密钥应该正常工作');
  }
});

test('10.3 密钥长度大于块大小 (128 字节)', () => {
  const key = Buffer.alloc(128, 'k'); // 128 bytes
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  if (digest.length !== 64) {
    throw new Error('128字节密钥应该正常工作');
  }
});

test('10.4 超长密钥 (1024 字节)', () => {
  const key = Buffer.alloc(1024, 'k');
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  if (digest.length !== 64) {
    throw new Error('1024字节密钥应该正常工作');
  }
});

test('10.5 密钥长度等于摘要长度 (32 字节)', () => {
  const key = Buffer.alloc(32, 'k');
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  if (digest.length !== 64) {
    throw new Error('密钥长度=摘要长度应该正常工作');
  }
});

test('10.6 不同长度密钥产生不同输出', () => {
  const key1 = Buffer.alloc(32, 'k');
  const hmac1 = crypto.createHmac('sha256', key1);
  hmac1.update('data');
  const digest1 = hmac1.digest('hex');

  const key2 = Buffer.alloc(64, 'k');
  const hmac2 = crypto.createHmac('sha256', key2);
  hmac2.update('data');
  const digest2 = hmac2.digest('hex');

  if (digest1 === digest2) {
    throw new Error('不同长度密钥应该产生不同输出');
  }
});

// ============ 11. crypto.timingSafeEqual 集成测试 ============
console.log('\n--- 11. crypto.timingSafeEqual 集成测试 ---');

test('11.1 使用 timingSafeEqual 验证 HMAC', () => {
  const message = 'important message';
  const secret = 'shared-secret';

  // 发送方生成 HMAC
  const hmac1 = crypto.createHmac('sha256', secret);
  hmac1.update(message);
  const mac1 = hmac1.digest();

  // 接收方验证 HMAC
  const hmac2 = crypto.createHmac('sha256', secret);
  hmac2.update(message);
  const mac2 = hmac2.digest();

  // 使用 timingSafeEqual 进行安全比较
  const isValid = crypto.timingSafeEqual(mac1, mac2);

  if (!isValid) {
    throw new Error('HMAC 验证应该通过');
  }
});

test('11.2 timingSafeEqual 检测篡改', () => {
  const message = 'important message';
  const tamperedMessage = 'tampered message';
  const secret = 'shared-secret';

  const hmac1 = crypto.createHmac('sha256', secret);
  hmac1.update(message);
  const mac1 = hmac1.digest();

  const hmac2 = crypto.createHmac('sha256', secret);
  hmac2.update(tamperedMessage);
  const mac2 = hmac2.digest();

  const isValid = crypto.timingSafeEqual(mac1, mac2);

  if (isValid) {
    throw new Error('篡改的消息不应该验证通过');
  }
});

test('11.3 timingSafeEqual 要求长度相同', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('data');
  const mac1 = hmac1.digest();

  const hmac2 = crypto.createHmac('sha1', 'key');
  hmac2.update('data');
  const mac2 = hmac2.digest();

  let errorThrown = false;
  try {
    crypto.timingSafeEqual(mac1, mac2);
  } catch (e) {
    errorThrown = true;
    if (!e.message.includes('length') && !e.message.includes('size')) {
      throw new Error('错误消息应该提示长度不同: ' + e.message);
    }
  }

  if (!errorThrown) {
    throw new Error('不同长度的 Buffer 应该抛出错误');
  }
});

// ============ 12. 安全特性增强测试 ============
console.log('\n--- 12. 安全特性增强测试 ---');

test('12.1 雪崩效应测试（更严格阈值 45%）- 数据变化', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('data');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update('Data');
  const digest2 = hmac2.digest('hex');

  let differentChars = 0;
  for (let i = 0; i < digest1.length; i++) {
    if (digest1[i] !== digest2[i]) {
      differentChars++;
    }
  }
  const differenceRatio = differentChars / digest1.length;

  const result = differenceRatio >= 0.45 ? '✅' : '❌';
  console.log(`  ${result} 差异比例: ${(differenceRatio * 100).toFixed(2)}% (阈值: 45%)`);

  if (differenceRatio < 0.45) {
    throw new Error(`雪崩效应不够强，差异比例: ${(differenceRatio * 100).toFixed(2)}%`);
  }
});

test('12.2 雪崩效应测试（更严格阈值 45%）- 密钥变化', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('data');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'Key');
  hmac2.update('data');
  const digest2 = hmac2.digest('hex');

  let differentChars = 0;
  for (let i = 0; i < digest1.length; i++) {
    if (digest1[i] !== digest2[i]) {
      differentChars++;
    }
  }
  const differenceRatio = differentChars / digest1.length;

  const result = differenceRatio >= 0.45 ? '✅' : '❌';
  console.log(`  ${result} 差异比例: ${(differenceRatio * 100).toFixed(2)}% (阈值: 45%)`);

  if (differenceRatio < 0.45) {
    throw new Error(`雪崩效应不够强，差异比例: ${(differenceRatio * 100).toFixed(2)}%`);
  }
});

test('12.3 位级雪崩效应测试', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('test');
  const digest1 = hmac1.digest();

  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update('TEST');
  const digest2 = hmac2.digest();

  let differentBits = 0;
  for (let i = 0; i < digest1.length; i++) {
    const xor = digest1[i] ^ digest2[i];
    for (let bit = 0; bit < 8; bit++) {
      if (xor & (1 << bit)) {
        differentBits++;
      }
    }
  }

  const totalBits = digest1.length * 8;
  const bitDifferenceRatio = differentBits / totalBits;

  const result = bitDifferenceRatio >= 0.4 ? '✅' : '❌';
  console.log(`  ${result} 位差异比例: ${(bitDifferenceRatio * 100).toFixed(2)}% (阈值: 40%)`);

  if (bitDifferenceRatio < 0.4) {
    throw new Error(`位级雪崩效应不够强，差异比例: ${(bitDifferenceRatio * 100).toFixed(2)}%`);
  }
});

// ============ 13. getHashes() 验证 ============
console.log('\n--- 13. getHashes() 验证所有算法可用于 HMAC ---');

test('13.1 验证常见算法都可用于 HMAC', () => {
  const hashes = crypto.getHashes();
  const commonAlgos = ['md5', 'sha1', 'sha256', 'sha512'];

  for (const algo of commonAlgos) {
    const algoLower = algo.toLowerCase();
    const found = hashes.some(h => h.toLowerCase() === algoLower);
    if (!found) {
      throw new Error(`常见算法 ${algo} 未在 getHashes() 中找到`);
    }

    // 验证可以用于 HMAC
    const hmac = crypto.createHmac(algo, 'key');
    hmac.update('test');
    const digest = hmac.digest('hex');
    if (digest.length === 0) {
      throw new Error(`算法 ${algo} 无法用于 HMAC`);
    }
  }
});

test('13.2 测试 getHashes() 返回的前10个算法', () => {
  const hashes = crypto.getHashes();
  let successCount = 0;

  for (let i = 0; i < Math.min(10, hashes.length); i++) {
    const algo = hashes[i];
    try {
      const hmac = crypto.createHmac(algo, 'key');
      hmac.update('test');
      hmac.digest('hex');
      successCount++;
    } catch (e) {
      console.log(`  ⚠️  算法 ${algo} 可能不支持 HMAC: ${e.message}`);
    }
  }

  if (successCount === 0) {
    throw new Error('至少应该有一些算法可用于 HMAC');
  }
  console.log(`  测试了 ${Math.min(10, hashes.length)} 个算法，${successCount} 个可用于 HMAC`);
});

// ============ 14. 特殊场景测试 ============
console.log('\n--- 14. 特殊场景测试 ---');

test('14.1 连续创建大量 HMAC 对象', () => {
  const hmacs = [];
  for (let i = 0; i < 1000; i++) {
    hmacs.push(crypto.createHmac('sha256', 'key' + i));
  }

  for (const hmac of hmacs) {
    hmac.update('test');
    const digest = hmac.digest('hex');
    if (digest.length !== 64) {
      throw new Error('大量创建后对象应该仍然可用');
    }
  }
});

test('14.2 交替使用不同算法', () => {
  const algorithms = ['md5', 'sha1', 'sha256', 'sha512'];
  const results = [];

  for (const algo of algorithms) {
    const hmac = crypto.createHmac(algo, 'key');
    hmac.update('test');
    results.push(hmac.digest('hex'));
  }

  if (new Set(results).size !== algorithms.length) {
    throw new Error('不同算法应该产生不同结果');
  }
});

test('14.3 极长的链式 update() 调用', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  let chainedHmac = hmac;

  for (let i = 0; i < 100; i++) {
    chainedHmac = chainedHmac.update('x');
  }

  const digest = chainedHmac.digest('hex');
  if (digest.length !== 64) {
    throw new Error('极长链式调用应该正常工作');
  }
});

test('14.4 空密钥与单字节密钥应产生不同结果', () => {
  const hmac1 = crypto.createHmac('sha256', '');
  hmac1.update('data');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'a');
  hmac2.update('data');
  const digest2 = hmac2.digest('hex');

  if (digest1 === digest2) {
    throw new Error('空密钥与单字节密钥应该产生不同结果');
  }
});

// ============ 测试总结 ============
console.log('\n========================================');
console.log('补充测试总结:');
console.log(`  总计: ${testCount} 个测试`);
console.log(`  通过: ${passCount} 个 ✅`);
console.log(`  失败: ${failCount} 个 ❌`);
console.log(`  通过率: ${((passCount / testCount) * 100).toFixed(2)}%`);
console.log('========================================');

if (failCount > 0) {
  console.log('\n失败的测试详情:');
  testResults.filter(t => t.status === 'failed').forEach(t => {
    console.log(`  ❌ [${t.number}] ${t.name}`);
    console.log(`      错误: ${t.error}`);
  });
}

if (passCount > 0 && failCount === 0) {
  console.log('\n所有补充测试通过! 🎉');
}

// 返回测试结果
const rs = {
  total: testCount,
  passed: passCount,
  failed: failCount,
  passRate: ((passCount / testCount) * 100).toFixed(2) + '%',
  results: {
    passed: testResults.filter(t => t.status === 'passed').map(t => `[${t.number}] ${t.name}`),
    failed: testResults.filter(t => t.status === 'failed').map(t => ({
      test: `[${t.number}] ${t.name}`,
      error: t.error
    }))
  }
};

console.log('\n' + JSON.stringify(rs, null, 2));

return rs;
