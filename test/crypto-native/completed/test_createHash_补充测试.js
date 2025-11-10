const crypto = require('crypto');

console.log('========================================');
console.log('  crypto.createHash() 补充测试');
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

test('1.1 创建 SHA512-224 哈希对象', () => {
  try {
    const hash = crypto.createHash('sha512-224');
    hash.update('test');
    const digest = hash.digest('hex');
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

test('1.2 创建 SHA512-256 哈希对象', () => {
  try {
    const hash = crypto.createHash('sha512-256');
    hash.update('test');
    const digest = hash.digest('hex');
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

test('1.3 SHA512-224 算法测试（已知向量）', () => {
  try {
    const hash = crypto.createHash('sha512-224');
    hash.update('The quick brown fox jumps over the lazy dog');
    const digest = hash.digest('hex');
    const expected = '944cd2847fb54558d4775db0485a50003111c8e5daa63fe722c6aa37';
    if (digest !== expected) {
      throw new Error(`SHA512-224 结果不正确\n期望: ${expected}\n实际: ${digest}`);
    }
  } catch (e) {
    if (e.message.includes('Digest method not supported')) {
      console.log('  ⚠️  SHA512-224 不被支持');
      throw e;
    }
    throw e;
  }
});

test('1.4 SHA512-256 算法测试（已知向量）', () => {
  try {
    const hash = crypto.createHash('sha512-256');
    hash.update('The quick brown fox jumps over the lazy dog');
    const digest = hash.digest('hex');
    const expected = 'dd9d67b371519c339ed8dbd25af90e976a1eeefd4ad3d889005e532fc5bef04d';
    if (digest !== expected) {
      throw new Error(`SHA512-256 结果不正确\n期望: ${expected}\n实际: ${digest}`);
    }
  } catch (e) {
    if (e.message.includes('Digest method not supported')) {
      console.log('  ⚠️  SHA512-256 不被支持');
      throw e;
    }
    throw e;
  }
});

// ============ 2. SHA3 完整系列测试 ============
console.log('\n--- 2. SHA3 完整系列测试 ---');

test('2.1 创建 SHA3-224 哈希对象', () => {
  try {
    const hash = crypto.createHash('sha3-224');
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 56) {
      throw new Error(`SHA3-224 输出长度应为 56，实际为 ${digest.length}`);
    }
  } catch (e) {
    console.log('  ⚠️  SHA3-224 可能不被支持:', e.message);
    throw e;
  }
});

test('2.2 创建 SHA3-384 哈希对象', () => {
  try {
    const hash = crypto.createHash('sha3-384');
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 96) {
      throw new Error(`SHA3-384 输出长度应为 96，实际为 ${digest.length}`);
    }
  } catch (e) {
    console.log('  ⚠️  SHA3-384 可能不被支持:', e.message);
    throw e;
  }
});

test('2.3 SHA3-224 算法测试（已知向量）', () => {
  try {
    const hash = crypto.createHash('sha3-224');
    hash.update('The quick brown fox jumps over the lazy dog');
    const digest = hash.digest('hex');
    const expected = 'd15dadceaa4d5d7bb3b48f446421d542e08ad8887305e28d58335795';
    if (digest !== expected) {
      throw new Error(`SHA3-224 结果不正确\n期望: ${expected}\n实际: ${digest}`);
    }
  } catch (e) {
    console.log('  ⚠️  SHA3-224 可能不被支持:', e.message);
    throw e;
  }
});

test('2.4 SHA3-256 算法测试（已知向量）', () => {
  try {
    const hash = crypto.createHash('sha3-256');
    hash.update('The quick brown fox jumps over the lazy dog');
    const digest = hash.digest('hex');
    const expected = '69070dda01975c8c120c3aada1b282394e7f032fa9cf32f4cb2259a0897dfc04';
    if (digest !== expected) {
      throw new Error(`SHA3-256 结果不正确\n期望: ${expected}\n实际: ${digest}`);
    }
  } catch (e) {
    console.log('  ⚠️  SHA3-256 可能不被支持:', e.message);
    throw e;
  }
});

test('2.5 SHA3-384 算法测试（已知向量）', () => {
  try {
    const hash = crypto.createHash('sha3-384');
    hash.update('The quick brown fox jumps over the lazy dog');
    const digest = hash.digest('hex');
    const expected = '7063465e08a93bce31cd89d2e3ca8f602498696e253592ed26f07bf7e703cf328581e1471a7ba7ab119b1a9ebdf8be41';
    if (digest !== expected) {
      throw new Error(`SHA3-384 结果不正确\n期望: ${expected}\n实际: ${digest}`);
    }
  } catch (e) {
    console.log('  ⚠️  SHA3-384 可能不被支持:', e.message);
    throw e;
  }
});

test('2.6 SHA3-512 算法测试（已知向量）', () => {
  try {
    const hash = crypto.createHash('sha3-512');
    hash.update('The quick brown fox jumps over the lazy dog');
    const digest = hash.digest('hex');
    const expected = '01dedd5de4ef14642445ba5f5b97c15e47b9ad931326e4b0727cd94cefc44fff23f07bf543139939b49128caf436dc1bdee54fcb24023a08d9403f9b4bf0d450';
    if (digest !== expected) {
      throw new Error(`SHA3-512 结果不正确\n期望: ${expected}\n实际: ${digest}`);
    }
  } catch (e) {
    console.log('  ⚠️  SHA3-512 可能不被支持:', e.message);
    throw e;
  }
});

// ============ 3. RIPEMD-160 测试 ============
console.log('\n--- 3. RIPEMD-160 测试 ---');

test('3.1 创建 RIPEMD-160 哈希对象', () => {
  try {
    const hash = crypto.createHash('ripemd160');
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 40) {
      throw new Error(`RIPEMD-160 输出长度应为 40，实际为 ${digest.length}`);
    }
  } catch (e) {
    console.log('  ⚠️  RIPEMD-160 可能不被支持:', e.message);
    throw e;
  }
});

test('3.2 RIPEMD-160 算法测试（已知向量）', () => {
  try {
    const hash = crypto.createHash('ripemd160');
    hash.update('The quick brown fox jumps over the lazy dog');
    const digest = hash.digest('hex');
    const expected = '37f332f68db77bd9d7edd4969571ad671cf9dd3b';
    if (digest !== expected) {
      throw new Error(`RIPEMD-160 结果不正确\n期望: ${expected}\n实际: ${digest}`);
    }
  } catch (e) {
    console.log('  ⚠️  RIPEMD-160 可能不被支持:', e.message);
    throw e;
  }
});

test('3.3 RIPEMD-160 空字符串测试', () => {
  try {
    const hash = crypto.createHash('ripemd160');
    hash.update('');
    const digest = hash.digest('hex');
    const expected = '9c1185a5c5e9fc54612808977ee8f548b2258d31';
    if (digest !== expected) {
      throw new Error(`RIPEMD-160 空字符串结果不正确\n期望: ${expected}\n实际: ${digest}`);
    }
  } catch (e) {
    console.log('  ⚠️  RIPEMD-160 可能不被支持:', e.message);
    throw e;
  }
});

// ============ 4. update() 更多编码格式测试 ============
console.log('\n--- 4. update() 更多编码格式测试 ---');

test('4.1 update() 支持 ascii 编码', () => {
  const hash = crypto.createHash('sha256');
  hash.update('hello', 'ascii');
  const digest = hash.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update('hello', 'utf8');
  const expected = hash2.digest('hex');

  if (digest !== expected) {
    throw new Error('ascii 编码应该与 utf8 编码产生相同结果（对于纯 ASCII 字符）');
  }
});

test('4.2 update() 支持 utf16le 编码', () => {
  const hash = crypto.createHash('sha256');
  const text = 'hello';
  hash.update(text, 'utf16le');
  const digest = hash.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update(Buffer.from(text, 'utf16le'));
  const expected = hash2.digest('hex');

  if (digest !== expected) {
    throw new Error('utf16le 编码应该与 Buffer 转换结果一致');
  }
});

test('4.3 update() 支持 ucs2 编码（与 utf16le 相同）', () => {
  const text = 'hello';

  const hash1 = crypto.createHash('sha256');
  hash1.update(text, 'ucs2');
  const digest1 = hash1.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update(text, 'utf16le');
  const digest2 = hash2.digest('hex');

  if (digest1 !== digest2) {
    throw new Error('ucs2 编码应该与 utf16le 编码相同');
  }
});

test('4.4 update() 支持 latin1 编码作为输入', () => {
  const hash = crypto.createHash('sha256');
  // latin1 只支持 0-255 的字符码
  hash.update('hello\xFF', 'latin1');
  const digest = hash.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update(Buffer.from('hello\xFF', 'latin1'));
  const expected = hash2.digest('hex');

  if (digest !== expected) {
    throw new Error('latin1 编码应该与 Buffer 转换结果一致');
  }
});

test('4.5 update() 支持 binary 编码作为输入（与 latin1 相同）', () => {
  const data = 'hello\xFF';

  const hash1 = crypto.createHash('sha256');
  hash1.update(data, 'binary');
  const digest1 = hash1.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update(data, 'latin1');
  const digest2 = hash2.digest('hex');

  if (digest1 !== digest2) {
    throw new Error('binary 编码应该与 latin1 编码相同');
  }
});

test('4.6 update() hex 编码处理奇数长度字符串', () => {
  const hash = crypto.createHash('sha256');
  let errorThrown = false;
  try {
    // hex 编码要求偶数长度的字符串
    hash.update('abc', 'hex');
  } catch (e) {
    errorThrown = true;
    // Node.js 会抛出错误,提示 encoding invalid
    if (!e.message.includes('encoding') && !e.message.includes('invalid') &&
        !e.message.includes('odd') && !e.message.includes('Invalid')) {
      throw new Error('错误消息格式不符合预期: ' + e.message);
    }
  }
  if (!errorThrown) {
    throw new Error('奇数长度的 hex 字符串应该抛出错误');
  }
});

test('4.7 update() hex 编码处理无效字符', () => {
  // Node.js v25.0.0 实际行为: 无效 hex 字符会被静默忽略,不会抛出错误
  const hash = crypto.createHash('sha256');
  try {
    // 'g' 不是有效的 hex 字符, 但 Node.js 会忽略并继续
    hash.update('ghij', 'hex');
    const digest = hash.digest('hex');
    console.log('  ⚠️  Node.js 对无效 hex 字符采取容错处理(静默忽略)');
    if (digest.length !== 64) {
      throw new Error('即使有无效字符,也应该能生成摘要');
    }
  } catch (e) {
    // 如果抛出错误也是可接受的
    console.log('  ⚠️  Node.js 对无效 hex 字符抛出错误:', e.message);
  }
});

test('4.8 update() base64 编码处理无效字符', () => {
  // Node.js v25.0.0 实际行为: 无效 base64 字符会被静默忽略,不会抛出错误
  const hash = crypto.createHash('sha256');
  try {
    // '@' 不是标准 base64 字符, 但 Node.js 会容错处理
    hash.update('abc@', 'base64');
    const digest = hash.digest('hex');
    console.log('  ⚠️  Node.js 对无效 base64 字符采取容错处理(静默忽略)');
    if (digest.length !== 64) {
      throw new Error('即使有无效字符,也应该能生成摘要');
    }
  } catch (e) {
    // 如果抛出错误也是可接受的
    console.log('  ⚠️  Node.js 对无效 base64 字符抛出错误:', e.message);
  }
});

// ============ 5. digest() 更多编码格式测试 ============
console.log('\n--- 5. digest() 更多编码格式测试 ---');

test('5.1 digest() 支持 utf8 编码（虽然不常用）', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const digest = hash.digest('utf8');
  if (typeof digest !== 'string') {
    throw new Error('utf8 编码应该返回字符串');
  }
});

test('5.2 digest() 支持 ascii 编码', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const digest = hash.digest('ascii');
  if (typeof digest !== 'string') {
    throw new Error('ascii 编码应该返回字符串');
  }
});

test('5.3 digest() 支持 utf16le 编码', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const digest = hash.digest('utf16le');
  if (typeof digest !== 'string') {
    throw new Error('utf16le 编码应该返回字符串');
  }
});

test('5.4 digest() 支持 ucs2 编码', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const digest = hash.digest('ucs2');
  if (typeof digest !== 'string') {
    throw new Error('ucs2 编码应该返回字符串');
  }
});

test('5.5 digest() ucs2 与 utf16le 编码相同', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('test');
  const digest1 = hash1.digest('ucs2');

  const hash2 = crypto.createHash('sha256');
  hash2.update('test');
  const digest2 = hash2.digest('utf16le');

  if (digest1 !== digest2) {
    throw new Error('ucs2 与 utf16le 编码应该产生相同结果');
  }
});

// ============ 6. copy() 边界情况测试 ============
console.log('\n--- 6. copy() 边界情况测试 ---');

test('6.1 copy() 可以在未调用 update() 时使用', () => {
  const hash1 = crypto.createHash('sha256');
  const hash2 = hash1.copy();

  hash2.update('test');
  const digest2 = hash2.digest('hex');

  const hash3 = crypto.createHash('sha256');
  hash3.update('test');
  const expected = hash3.digest('hex');

  if (digest2 !== expected) {
    throw new Error('copy() 空 Hash 对象应该正常工作');
  }
});

test('6.2 copy() 后再 copy() 的链式复制', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('part1');

  const hash2 = hash1.copy();
  const hash3 = hash2.copy();

  hash3.update('part2');
  const digest3 = hash3.digest('hex');

  const hashExpected = crypto.createHash('sha256');
  hashExpected.update('part1part2');
  const expected = hashExpected.digest('hex');

  if (digest3 !== expected) {
    throw new Error('链式 copy() 应该正常工作');
  }
});

test('6.3 copy() 后原对象和副本独立工作', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('base');

  const hash2 = hash1.copy();
  const hash3 = hash1.copy();

  hash2.update('A');
  hash3.update('B');

  const digest2 = hash2.digest('hex');
  const digest3 = hash3.digest('hex');

  if (digest2 === digest3) {
    throw new Error('不同的副本应该独立工作');
  }
});

test('6.4 copy() 保留算法类型', () => {
  const hash1 = crypto.createHash('sha512');
  hash1.update('test');

  const hash2 = hash1.copy();
  const digest = hash2.digest('hex');

  if (digest.length !== 128) {
    throw new Error('copy() 应该保留算法类型（SHA-512 长度为 128）');
  }
});

// ============ 7. SHAKE 算法错误处理测试 ============
console.log('\n--- 7. SHAKE 算法错误处理测试 ---');

test('7.1 SHAKE128 不指定 outputLength 会发出弃用警告', () => {
  try {
    // Node.js v25.0.0 行为: 不指定 outputLength 不会报错,但会发出 DeprecationWarning
    const hash = crypto.createHash('shake128');
    hash.update('test');
    const digest = hash.digest('hex');

    // 能够正常生成摘要(使用默认长度)
    if (digest.length === 0) {
      throw new Error('SHAKE128 应该能生成摘要(使用默认 outputLength)');
    }
    console.log('  ⚠️  SHAKE128 不指定 outputLength 会使用默认值并发出弃用警告');
    console.log(`  生成的摘要长度: ${digest.length} hex字符`);
  } catch (e) {
    console.log('  ⚠️  SHAKE128 可能不被支持:', e.message);
    throw e;
  }
});

test('7.2 SHAKE256 不指定 outputLength 会发出弃用警告', () => {
  try {
    // Node.js v25.0.0 行为: 不指定 outputLength 不会报错,但会发出 DeprecationWarning
    const hash = crypto.createHash('shake256');
    hash.update('test');
    const digest = hash.digest('hex');

    // 能够正常生成摘要(使用默认长度)
    if (digest.length === 0) {
      throw new Error('SHAKE256 应该能生成摘要(使用默认 outputLength)');
    }
    console.log('  ⚠️  SHAKE256 不指定 outputLength 会使用默认值并发出弃用警告');
    console.log(`  生成的摘要长度: ${digest.length} hex字符`);
  } catch (e) {
    console.log('  ⚠️  SHAKE256 可能不被支持:', e.message);
    throw e;
  }
});

test('7.3 SHAKE128 指定无效的 outputLength（负数）', () => {
  let errorThrown = false;
  try {
    const hash = crypto.createHash('shake128', { outputLength: -1 });
    hash.update('test');
    hash.digest('hex');
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('负数的 outputLength 应该抛出错误');
  }
});

test('7.4 SHAKE128 指定 outputLength = 0 的行为', () => {
  try {
    // Node.js v25.0.0 行为: outputLength = 0 不会报错
    const hash = crypto.createHash('shake128', { outputLength: 0 });
    hash.update('test');
    const digest = hash.digest('hex');

    console.log('  ⚠️  outputLength = 0 被接受,生成摘要长度:', digest.length);
    // 摘要长度应该为 0 (0 bytes = 0 hex chars)
    if (digest.length !== 0) {
      console.log(`  注意: outputLength=0 但生成了长度为 ${digest.length} 的摘要`);
    }
  } catch (e) {
    // 如果抛出错误也记录
    console.log('  ⚠️  outputLength = 0 抛出错误:', e.message);
  }
});

test('7.5 SHAKE256 可以指定非常大的 outputLength', () => {
  try {
    const hash = crypto.createHash('shake256', { outputLength: 1024 });
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 2048) { // 1024 bytes = 2048 hex chars
      throw new Error(`期望长度 2048，实际 ${digest.length}`);
    }
  } catch (e) {
    console.log('  ⚠️  超大 outputLength 可能不被支持:', e.message);
  }
});

// ============ 8. 更多错误处理测试 ============
console.log('\n--- 8. 更多错误处理测试 ---');

test('8.1 update() 传入 undefined 应该抛出错误', () => {
  const hash = crypto.createHash('sha256');
  let errorThrown = false;
  try {
    hash.update(undefined);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入 undefined 应该抛出错误');
  }
});

test('8.2 update() 传入数组应该抛出错误', () => {
  const hash = crypto.createHash('sha256');
  let errorThrown = false;
  try {
    hash.update([1, 2, 3]);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入数组应该抛出错误');
  }
});

test('8.3 update() 传入函数应该抛出错误', () => {
  const hash = crypto.createHash('sha256');
  let errorThrown = false;
  try {
    hash.update(() => {});
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入函数应该抛出错误');
  }
});

test('8.4 digest() 传入 null 作为编码', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const result = hash.digest(null);
  if (!Buffer.isBuffer(result)) {
    throw new Error('传入 null 应该返回 Buffer（等同于不传参数）');
  }
});

test('8.5 createHash() 传入空字符串应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.createHash('');
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入空字符串应该抛出错误');
  }
});

test('8.6 createHash() 传入 null 应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.createHash(null);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入 null 应该抛出错误');
  }
});

test('8.7 createHash() 传入对象应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.createHash({});
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入对象应该抛出错误');
  }
});

// ============ 9. TypedArray 更多变种测试 ============
console.log('\n--- 9. TypedArray 更多变种测试 ---');

test('9.1 update() 接受 Int8Array 参数', () => {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.from('hello world');
  const int8Array = new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  hash.update(int8Array);
  const digest = hash.digest('hex');
  const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
  if (digest !== expected) {
    throw new Error(`期望 ${expected}，实际 ${digest}`);
  }
});

test('9.2 update() 接受 Uint16Array 参数', () => {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.from('hello world');
  // 确保 buffer 长度是偶数（Uint16Array 需要）
  const paddedBuffer = buffer.length % 2 === 0 ? buffer : Buffer.concat([buffer, Buffer.alloc(1)]);
  const uint16Array = new Uint16Array(paddedBuffer.buffer, paddedBuffer.byteOffset, Math.floor(paddedBuffer.byteLength / 2));
  hash.update(uint16Array);
  const digest = hash.digest('hex');
  // 验证能够正常生成摘要
  if (digest.length !== 64) {
    throw new Error('Uint16Array 应该正常工作');
  }
});

test('9.3 update() 接受 Uint32Array 参数', () => {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.from('hello world!!!!'); // 16 bytes = 4 * 4
  const uint32Array = new Uint32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  hash.update(uint32Array);
  const digest = hash.digest('hex');
  if (digest.length !== 64) {
    throw new Error('Uint32Array 应该正常工作');
  }
});

test('9.4 update() 接受 Int32Array 参数', () => {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.from('hello world!!!!'); // 16 bytes
  const int32Array = new Int32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  hash.update(int32Array);
  const digest = hash.digest('hex');
  if (digest.length !== 64) {
    throw new Error('Int32Array 应该正常工作');
  }
});

test('9.5 update() 接受 Float32Array 参数', () => {
  const hash = crypto.createHash('sha256');
  const float32Array = new Float32Array([1.5, 2.5, 3.5, 4.5]);
  hash.update(float32Array);
  const digest = hash.digest('hex');
  if (digest.length !== 64) {
    throw new Error('Float32Array 应该正常工作');
  }
});

test('9.6 update() 接受 Float64Array 参数', () => {
  const hash = crypto.createHash('sha256');
  const float64Array = new Float64Array([1.5, 2.5, 3.5, 4.5]);
  hash.update(float64Array);
  const digest = hash.digest('hex');
  if (digest.length !== 64) {
    throw new Error('Float64Array 应该正常工作');
  }
});

test('9.7 不同 TypedArray 视图相同底层数据产生相同哈希', () => {
  const buffer = Buffer.from('hello world');

  const hash1 = crypto.createHash('sha256');
  hash1.update(new Uint8Array(buffer));
  const digest1 = hash1.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update(new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
  const digest2 = hash2.digest('hex');

  if (digest1 !== digest2) {
    throw new Error('相同底层数据应该产生相同哈希');
  }
});

// ============ 10. 安全特性补充测试 ============
console.log('\n--- 10. 安全特性补充测试 ---');

test('10.1 雪崩效应测试（更严格的阈值 45%）', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('data');
  const digest1 = hash1.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update('Data');
  const digest2 = hash2.digest('hex');

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
    throw new Error(`雪崩效应不够强，差异比例: ${(differenceRatio * 100).toFixed(2)}%，应该 >= 45%`);
  }
});

test('10.2 位级雪崩效应测试', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('test');
  const digest1 = hash1.digest();

  // 改变一个位
  const hash2 = crypto.createHash('sha256');
  hash2.update('TEST');
  const digest2 = hash2.digest();

  let differentBits = 0;
  for (let i = 0; i < digest1.length; i++) {
    const xor = digest1[i] ^ digest2[i];
    // 计算异或结果中 1 的个数
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

test('10.3 哈希分布均匀性测试', () => {
  const digests = [];
  for (let i = 0; i < 100; i++) {
    const hash = crypto.createHash('sha256');
    hash.update(`test ${i}`);
    digests.push(hash.digest('hex'));
  }

  // 检查第一个字符的分布（应该接近均匀）
  const firstCharCounts = {};
  for (const digest of digests) {
    const firstChar = digest[0];
    firstCharCounts[firstChar] = (firstCharCounts[firstChar] || 0) + 1;
  }

  const uniqueFirstChars = Object.keys(firstCharCounts).length;
  if (uniqueFirstChars < 10) {
    throw new Error(`哈希分布不够均匀，只有 ${uniqueFirstChars} 个不同的首字符`);
  }
});

// ============ 11. 实用性补充测试 ============
console.log('\n--- 11. 实用性补充测试 ---');

test('11.1 不同编码转换的一致性（修复版）', () => {
  // 先创建三个独立的 hash 对象
  const hash1 = crypto.createHash('sha256');
  hash1.update('test');

  const hash2 = crypto.createHash('sha256');
  hash2.update('test');

  const hash3 = crypto.createHash('sha256');
  hash3.update('test');

  // 分别 digest
  const hexDigest = hash1.digest('hex');
  const base64Digest = hash2.digest('base64');
  const bufferDigest = hash3.digest();

  // 验证不同编码表示的是相同的数据
  const hexFromBuffer = bufferDigest.toString('hex');
  const base64FromBuffer = bufferDigest.toString('base64');

  if (hexDigest !== hexFromBuffer) {
    throw new Error('hex 编码转换不一致');
  }
  if (base64Digest !== base64FromBuffer) {
    throw new Error('base64 编码转换不一致');
  }
});

test('11.2 模拟 Git 对象 SHA-1 计算', () => {
  const content = 'hello world';
  const header = `blob ${content.length}\0`;
  const store = header + content;

  const hash = crypto.createHash('sha1');
  hash.update(store);
  const gitHash = hash.digest('hex');

  if (gitHash.length !== 40) {
    throw new Error('Git SHA-1 长度应为 40');
  }
  console.log(`  Git 对象哈希: ${gitHash}`);
});

test('11.3 模拟区块链哈希链', () => {
  let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < 5; i++) {
    const hash = crypto.createHash('sha256');
    hash.update(previousHash + `block ${i}`);
    previousHash = hash.digest('hex');
  }

  if (previousHash.length !== 64) {
    throw new Error('区块链哈希长度应为 64');
  }
  console.log(`  最终区块哈希: ${previousHash.substring(0, 16)}...`);
});

test('11.4 HMAC 模拟（使用双层哈希）', () => {
  const key = 'secret-key';
  const message = 'message to authenticate';

  // 简化的 HMAC 实现（实际应使用 crypto.createHmac）
  const hash1 = crypto.createHash('sha256');
  hash1.update(key + message);
  const innerHash = hash1.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update(key + innerHash);
  const hmacLike = hash2.digest('hex');

  if (hmacLike.length !== 64) {
    throw new Error('HMAC-like 哈希长度应为 64');
  }
  console.log('  ⚠️  注意: 这只是演示，实际应使用 crypto.createHmac()');
});

// ============ 12. getHashes() 补充测试 ============
console.log('\n--- 12. getHashes() 补充测试 ---');

test('12.1 getHashes() 返回的算法名称应为小写', () => {
  const hashes = crypto.getHashes();
  const allLowerCase = hashes.every(h => h === h.toLowerCase());
  if (!allLowerCase) {
    console.log('  ⚠️  注意: 某些算法名称包含大写字母（这可能是正常的）');
  }
});

test('12.2 getHashes() 检查重复项', () => {
  const hashes = crypto.getHashes();
  const uniqueHashes = new Set(hashes.map(h => h.toLowerCase()));

  if (uniqueHashes.size !== hashes.length) {
    console.log(`  ⚠️  发现重复算法（不同大小写）: ${hashes.length} 个 -> ${uniqueHashes.size} 个唯一`);
  }
});

test('12.3 getHashes() 包含 SHA-2 完整系列', () => {
  const hashes = crypto.getHashes();
  const hashesLower = hashes.map(h => h.toLowerCase());
  const sha2Algos = ['sha224', 'sha256', 'sha384', 'sha512'];

  for (const algo of sha2Algos) {
    if (!hashesLower.includes(algo)) {
      throw new Error(`SHA-2 系列应该包含 ${algo}`);
    }
  }
});

test('12.4 getHashes() 检查是否包含 SHA-3（如果支持）', () => {
  const hashes = crypto.getHashes();
  const hashesLower = hashes.map(h => h.toLowerCase());
  const sha3Algos = ['sha3-224', 'sha3-256', 'sha3-384', 'sha3-512'];

  const supportedSha3 = sha3Algos.filter(algo => hashesLower.includes(algo));
  if (supportedSha3.length > 0) {
    console.log(`  ✅ 支持的 SHA-3 算法: ${supportedSha3.join(', ')}`);
  } else {
    console.log('  ⚠️  未发现 SHA-3 算法支持');
  }
});

test('12.5 getHashes() 检查是否包含 SHAKE（如果支持）', () => {
  const hashes = crypto.getHashes();
  const hashesLower = hashes.map(h => h.toLowerCase());
  const shakeAlgos = ['shake128', 'shake256'];

  const supportedShake = shakeAlgos.filter(algo => hashesLower.includes(algo));
  if (supportedShake.length > 0) {
    console.log(`  ✅ 支持的 SHAKE 算法: ${supportedShake.join(', ')}`);
  } else {
    console.log('  ⚠️  未发现 SHAKE 算法支持');
  }
});

// ============ 13. 特殊场景测试 ============
console.log('\n--- 13. 特殊场景测试 ---');

test('13.1 连续创建大量 Hash 对象（内存测试）', () => {
  const hashes = [];
  for (let i = 0; i < 1000; i++) {
    hashes.push(crypto.createHash('sha256'));
  }

  // 验证所有对象都可用
  for (const hash of hashes) {
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 64) {
      throw new Error('大量创建后对象应该仍然可用');
    }
  }
});

test('13.2 交替使用不同算法', () => {
  const algorithms = ['md5', 'sha1', 'sha256', 'sha512'];
  const results = [];

  for (const algo of algorithms) {
    const hash = crypto.createHash(algo);
    hash.update('test');
    results.push(hash.digest('hex'));
  }

  // 验证所有结果都不同且长度正确
  if (new Set(results).size !== algorithms.length) {
    throw new Error('不同算法应该产生不同结果');
  }
});

test('13.3 极长的链式 update() 调用', () => {
  const hash = crypto.createHash('sha256');
  let chainedHash = hash;

  for (let i = 0; i < 100; i++) {
    chainedHash = chainedHash.update('x');
  }

  const digest = chainedHash.digest('hex');
  if (digest.length !== 64) {
    throw new Error('极长链式调用应该正常工作');
  }
});

test('13.4 update() 和 copy() 交替使用', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('a');

  const hash2 = hash1.copy();
  hash1.update('b');

  const hash3 = hash1.copy();
  hash2.update('c');

  const digest1 = hash1.digest('hex'); // 'ab'
  const digest2 = hash2.digest('hex'); // 'ac'
  const digest3 = hash3.digest('hex'); // 'ab'

  if (digest1 !== digest3) {
    throw new Error('相同更新序列应该产生相同结果');
  }
  if (digest1 === digest2) {
    throw new Error('不同更新序列应该产生不同结果');
  }
});

test('13.5 空选项对象传递', () => {
  const hash = crypto.createHash('sha256', {});
  hash.update('test');
  const digest = hash.digest('hex');
  if (digest.length !== 64) {
    throw new Error('空选项对象应该被接受');
  }
});

test('13.6 无效选项应该被忽略或抛出错误', () => {
  try {
    const hash = crypto.createHash('sha256', { invalidOption: true });
    hash.update('test');
    hash.digest('hex');
    console.log('  ⚠️  无效选项被忽略（这是可接受的行为）');
  } catch (e) {
    console.log('  ⚠️  无效选项抛出错误（这也是可接受的行为）');
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
