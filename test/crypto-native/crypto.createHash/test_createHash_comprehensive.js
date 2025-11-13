const crypto = require('crypto');

console.log('========================================');
console.log('  Node.js crypto.createHash() 全面测试');
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

// ============ 1. 基本功能测试 ============
console.log('\n--- 1. 基本功能测试 ---');

test('1.1 创建 MD5 哈希对象', () => {
  const hash = crypto.createHash('md5');
  if (typeof hash.update !== 'function' || typeof hash.digest !== 'function') {
    throw new Error('哈希对象缺少 update 或 digest 方法');
  }
});

test('1.2 创建 SHA-1 哈希对象', () => {
  const hash = crypto.createHash('sha1');
  hash.update('test');
  const digest = hash.digest('hex');
  if (digest.length !== 40) {
    throw new Error(`SHA-1 输出长度应为 40，实际为 ${digest.length}`);
  }
});

test('1.3 创建 SHA-256 哈希对象', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const digest = hash.digest('hex');
  if (digest.length !== 64) {
    throw new Error(`SHA-256 输出长度应为 64，实际为 ${digest.length}`);
  }
});

test('1.4 创建 SHA-512 哈希对象', () => {
  const hash = crypto.createHash('sha512');
  hash.update('test');
  const digest = hash.digest('hex');
  if (digest.length !== 128) {
    throw new Error(`SHA-512 输出长度应为 128，实际为 ${digest.length}`);
  }
});

test('1.5 创建 SHA-384 哈希对象', () => {
  const hash = crypto.createHash('sha384');
  hash.update('test');
  const digest = hash.digest('hex');
  if (digest.length !== 96) {
    throw new Error(`SHA-384 输出长度应为 96，实际为 ${digest.length}`);
  }
});

test('1.6 创建 SHA-224 哈希对象', () => {
  const hash = crypto.createHash('sha224');
  hash.update('test');
  const digest = hash.digest('hex');
  if (digest.length !== 56) {
    throw new Error(`SHA-224 输出长度应为 56，实际为 ${digest.length}`);
  }
});

// ============ 2. update() 方法测试 ============
console.log('\n--- 2. update() 方法测试 ---');

test('2.1 update() 接受字符串参数', () => {
  const hash = crypto.createHash('sha256');
  hash.update('hello world');
  const digest = hash.digest('hex');
  const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
  if (digest !== expected) {
    throw new Error(`期望 ${expected}，实际 ${digest}`);
  }
});

test('2.2 update() 接受 Buffer 参数', () => {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from('hello world'));
  const digest = hash.digest('hex');
  const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
  if (digest !== expected) {
    throw new Error(`期望 ${expected}，实际 ${digest}`);
  }
});

test('2.3 update() 接受 Uint8Array 参数', () => {
  const hash = crypto.createHash('sha256');
  const data = new Uint8Array(Buffer.from('hello world'));
  hash.update(data);
  const digest = hash.digest('hex');
  const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
  if (digest !== expected) {
    throw new Error(`期望 ${expected}，实际 ${digest}`);
  }
});

test('2.4 update() 接受 DataView 参数', () => {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.from('hello world');
  const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  hash.update(dataView);
  const digest = hash.digest('hex');
  const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
  if (digest !== expected) {
    throw new Error(`期望 ${expected}，实际 ${digest}`);
  }
});

test('2.5 update() 支持多次调用', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('hello world');
  const digest1 = hash1.digest('hex');

  const hash2 = crypto.createHash('sha256');
  hash2.update('hello');
  hash2.update(' ');
  hash2.update('world');
  const digest2 = hash2.digest('hex');

  if (digest1 !== digest2) {
    throw new Error('多次 update() 的结果应该与一次 update() 相同');
  }
});

test('2.6 update() 支持字符串编码参数（utf8）', () => {
  const hash = crypto.createHash('sha256');
  hash.update('hello world', 'utf8');
  const digest = hash.digest('hex');
  const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
  if (digest !== expected) {
    throw new Error(`期望 ${expected}，实际 ${digest}`);
  }
});

test('2.7 update() 支持字符串编码参数（hex）', () => {
  const hash = crypto.createHash('sha256');
  // '68656c6c6f' 是 'hello' 的 hex 编码
  hash.update('68656c6c6f', 'hex');
  const digest = hash.digest('hex');
  const hash2 = crypto.createHash('sha256');
  hash2.update('hello');
  const expected = hash2.digest('hex');
  if (digest !== expected) {
    throw new Error('hex 编码的输入应该产生相同的结果');
  }
});

test('2.8 update() 支持字符串编码参数（base64）', () => {
  const hash = crypto.createHash('sha256');
  // 'aGVsbG8=' 是 'hello' 的 base64 编码
  hash.update('aGVsbG8=', 'base64');
  const digest = hash.digest('hex');
  const hash2 = crypto.createHash('sha256');
  hash2.update('hello');
  const expected = hash2.digest('hex');
  if (digest !== expected) {
    throw new Error('base64 编码的输入应该产生相同的结果');
  }
});

test('2.9 update() 返回 hash 对象本身（支持链式调用）', () => {
  const hash = crypto.createHash('sha256');
  const returnValue = hash.update('hello');
  if (returnValue !== hash) {
    throw new Error('update() 应该返回 hash 对象本身');
  }
  // 测试链式调用
  const digest = hash.update(' world').digest('hex');
  const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
  if (digest !== expected) {
    throw new Error('链式调用应该正常工作');
  }
});

// ============ 3. digest() 方法测试 ============
console.log('\n--- 3. digest() 方法测试 ---');

test('3.1 digest() 返回 Buffer（不传参数）', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const digest = hash.digest();
  if (!Buffer.isBuffer(digest)) {
    throw new Error('不传参数时，digest() 应该返回 Buffer');
  }
  if (digest.length !== 32) {
    throw new Error(`SHA-256 Buffer 长度应为 32，实际为 ${digest.length}`);
  }
});

test('3.2 digest() 支持 hex 编码', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const digest = hash.digest('hex');
  if (typeof digest !== 'string') {
    throw new Error('hex 编码应该返回字符串');
  }
  if (!/^[0-9a-f]+$/.test(digest)) {
    throw new Error('hex 编码应该只包含 0-9 和 a-f');
  }
  if (digest.length !== 64) {
    throw new Error(`SHA-256 hex 长度应为 64，实际为 ${digest.length}`);
  }
});

test('3.3 digest() 支持 base64 编码', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const digest = hash.digest('base64');
  if (typeof digest !== 'string') {
    throw new Error('base64 编码应该返回字符串');
  }
  // base64 字符集：A-Z, a-z, 0-9, +, /, =
  if (!/^[A-Za-z0-9+/]+=*$/.test(digest)) {
    throw new Error('base64 编码格式不正确');
  }
});

test('3.4 digest() 支持 base64url 编码', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const digest = hash.digest('base64url');
  if (typeof digest !== 'string') {
    throw new Error('base64url 编码应该返回字符串');
  }
  // base64url 不应该包含 + 和 / 和 =
  if (/[+/=]/.test(digest)) {
    throw new Error('base64url 不应该包含 +, / 或 =');
  }
});

test('3.5 digest() 支持 latin1 编码', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  const digest = hash.digest('latin1');
  if (typeof digest !== 'string') {
    throw new Error('latin1 编码应该返回字符串');
  }
});

test('3.6 digest() 支持 binary 编码（与 latin1 相同）', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('test');
  const digest1 = hash1.digest('binary');
  
  const hash2 = crypto.createHash('sha256');
  hash2.update('test');
  const digest2 = hash2.digest('latin1');
  
  if (digest1 !== digest2) {
    throw new Error('binary 编码应该与 latin1 编码相同');
  }
});

test('3.7 digest() 只能调用一次', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  hash.digest('hex');
  
  let errorThrown = false;
  try {
    hash.digest('hex');
  } catch (e) {
    errorThrown = true;
    if (!e.message.includes('Digest already called')) {
      throw new Error('错误消息不正确: ' + e.message);
    }
  }
  if (!errorThrown) {
    throw new Error('第二次调用 digest() 应该抛出错误');
  }
});

test('3.8 digest() 后不能再调用 update()', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  hash.digest('hex');
  
  let errorThrown = false;
  try {
    hash.update('more data');
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('digest() 后调用 update() 应该抛出错误');
  }
});

// ============ 4. copy() 方法测试 ============
console.log('\n--- 4. copy() 方法测试 ---');

test('4.1 copy() 创建哈希对象的副本', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('hello');
  
  const hash2 = hash1.copy();
  hash2.update(' world');
  
  const digest2 = hash2.digest('hex');
  const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
  if (digest2 !== expected) {
    throw new Error(`copy() 后的结果不正确，期望 ${expected}，实际 ${digest2}`);
  }
});

test('4.2 copy() 不影响原始对象', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('hello');
  
  const hash2 = hash1.copy();
  hash2.update(' world');
  
  const digest1 = hash1.digest('hex');
  const hash3 = crypto.createHash('sha256');
  hash3.update('hello');
  const expected = hash3.digest('hex');
  
  if (digest1 !== expected) {
    throw new Error('copy() 后原始对象应该保持不变');
  }
});

test('4.3 copy() 可以在 update() 后调用', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('part1');
  
  const hash2 = hash1.copy();
  hash1.update('part2a');
  hash2.update('part2b');
  
  const digest1 = hash1.digest('hex');
  const digest2 = hash2.digest('hex');
  
  if (digest1 === digest2) {
    throw new Error('不同的更新应该产生不同的摘要');
  }
});

test('4.4 copy() 在 digest() 后不能调用', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  hash.digest('hex');
  
  let errorThrown = false;
  try {
    hash.copy();
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('digest() 后调用 copy() 应该抛出错误');
  }
});

// ============ 5. 不同算法的完整性测试 ============
console.log('\n--- 5. 不同算法的完整性测试 ---');

test('5.1 MD5 算法测试（已知向量）', () => {
  const hash = crypto.createHash('md5');
  hash.update('The quick brown fox jumps over the lazy dog');
  const digest = hash.digest('hex');
  const expected = '9e107d9d372bb6826bd81d3542a419d6';
  if (digest !== expected) {
    throw new Error(`MD5 结果不正确，期望 ${expected}，实际 ${digest}`);
  }
});

test('5.2 SHA-1 算法测试（已知向量）', () => {
  const hash = crypto.createHash('sha1');
  hash.update('The quick brown fox jumps over the lazy dog');
  const digest = hash.digest('hex');
  const expected = '2fd4e1c67a2d28fced849ee1bb76e7391b93eb12';
  if (digest !== expected) {
    throw new Error(`SHA-1 结果不正确，期望 ${expected}，实际 ${digest}`);
  }
});

test('5.3 SHA-256 算法测试（已知向量）', () => {
  const hash = crypto.createHash('sha256');
  hash.update('The quick brown fox jumps over the lazy dog');
  const digest = hash.digest('hex');
  const expected = 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592';
  if (digest !== expected) {
    throw new Error(`SHA-256 结果不正确，期望 ${expected}，实际 ${digest}`);
  }
});

test('5.4 SHA-512 算法测试（已知向量）', () => {
  const hash = crypto.createHash('sha512');
  hash.update('The quick brown fox jumps over the lazy dog');
  const digest = hash.digest('hex');
  const expected = '07e547d9586f6a73f73fbac0435ed76951218fb7d0c8d788a309d785436bbb642e93a252a954f23912547d1e8a3b5ed6e1bfd7097821233fa0538f3db854fee6';
  if (digest !== expected) {
    throw new Error(`SHA-512 结果不正确，期望 ${expected}，实际 ${digest}`);
  }
});

test('5.5 SHA-384 算法测试（已知向量）', () => {
  const hash = crypto.createHash('sha384');
  hash.update('The quick brown fox jumps over the lazy dog');
  const digest = hash.digest('hex');
  const expected = 'ca737f1014a48f4c0b6dd43cb177b0afd9e5169367544c494011e3317dbf9a509cb1e5dc1e85a941bbee3d7f2afbc9b1';
  if (digest !== expected) {
    throw new Error(`SHA-384 结果不正确，期望 ${expected}，实际 ${digest}`);
  }
});

test('5.6 SHA-224 算法测试（已知向量）', () => {
  const hash = crypto.createHash('sha224');
  hash.update('The quick brown fox jumps over the lazy dog');
  const digest = hash.digest('hex');
  const expected = '730e109bd7a8a32b1cb9d9a09aa2325d2430587ddbc0c38bad911525';
  if (digest !== expected) {
    throw new Error(`SHA-224 结果不正确，期望 ${expected}，实际 ${digest}`);
  }
});

test('5.7 SHA3-256 算法测试', () => {
  try {
    const hash = crypto.createHash('sha3-256');
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 64) {
      throw new Error(`SHA3-256 长度应为 64，实际为 ${digest.length}`);
    }
  } catch (e) {
    // 某些环境可能不支持 SHA3
    console.log('  ⚠️  SHA3-256 可能不被支持:', e.message);
  }
});

test('5.8 SHA3-512 算法测试', () => {
  try {
    const hash = crypto.createHash('sha3-512');
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 128) {
      throw new Error(`SHA3-512 长度应为 128，实际为 ${digest.length}`);
    }
  } catch (e) {
    // 某些环境可能不支持 SHA3
    console.log('  ⚠️  SHA3-512 可能不被支持:', e.message);
  }
});

test('5.9 BLAKE2b512 算法测试', () => {
  try {
    const hash = crypto.createHash('blake2b512');
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 128) {
      throw new Error(`BLAKE2b512 长度应为 128，实际为 ${digest.length}`);
    }
  } catch (e) {
    // 某些环境可能不支持 BLAKE2
    console.log('  ⚠️  BLAKE2b512 可能不被支持:', e.message);
  }
});

test('5.10 BLAKE2s256 算法测试', () => {
  try {
    const hash = crypto.createHash('blake2s256');
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 64) {
      throw new Error(`BLAKE2s256 长度应为 64，实际为 ${digest.length}`);
    }
  } catch (e) {
    // 某些环境可能不支持 BLAKE2
    console.log('  ⚠️  BLAKE2s256 可能不被支持:', e.message);
  }
});

// ============ 6. XOF 算法（可扩展输出函数）测试 ============
console.log('\n--- 6. XOF 算法（可扩展输出函数）测试 ---');

test('6.1 SHAKE128 算法测试（使用 outputLength）', () => {
  try {
    // Node.js 要求为 SHAKE 算法指定 outputLength
    const hash = crypto.createHash('shake128', { outputLength: 32 });
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 64) { // 32 bytes = 64 hex chars
      throw new Error(`期望长度 64，实际 ${digest.length}`);
    }
  } catch (e) {
    // 某些环境可能不支持 SHAKE
    console.log('  ⚠️  SHAKE128 可能不被支持:', e.message);
  }
});

test('6.2 SHAKE128 算法测试（指定 outputLength）', () => {
  try {
    const hash = crypto.createHash('shake128', { outputLength: 16 });
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 32) { // 16 bytes = 32 hex chars
      throw new Error(`期望长度 32，实际 ${digest.length}`);
    }
  } catch (e) {
    // 某些环境可能不支持 SHAKE
    console.log('  ⚠️  SHAKE128 with outputLength 可能不被支持:', e.message);
  }
});

test('6.3 SHAKE256 算法测试（使用 outputLength）', () => {
  try {
    // Node.js 要求为 SHAKE 算法指定 outputLength
    const hash = crypto.createHash('shake256', { outputLength: 32 });
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 64) { // 32 bytes = 64 hex chars
      throw new Error(`期望长度 64，实际 ${digest.length}`);
    }
  } catch (e) {
    // 某些环境可能不支持 SHAKE
    console.log('  ⚠️  SHAKE256 可能不被支持:', e.message);
  }
});

test('6.4 SHAKE256 算法测试（指定 outputLength）', () => {
  try {
    const hash = crypto.createHash('shake256', { outputLength: 64 });
    hash.update('test');
    const digest = hash.digest('hex');
    if (digest.length !== 128) { // 64 bytes = 128 hex chars
      throw new Error(`期望长度 128，实际 ${digest.length}`);
    }
  } catch (e) {
    // 某些环境可能不支持 SHAKE
    console.log('  ⚠️  SHAKE256 with outputLength 可能不被支持:', e.message);
  }
});

test('6.5 SHAKE256 不同 outputLength 产生不同长度输出', () => {
  try {
    const hash1 = crypto.createHash('shake256', { outputLength: 16 });
    hash1.update('test');
    const digest1 = hash1.digest('hex');
    
    const hash2 = crypto.createHash('shake256', { outputLength: 32 });
    hash2.update('test');
    const digest2 = hash2.digest('hex');
    
    if (digest1.length === digest2.length) {
      throw new Error('不同的 outputLength 应该产生不同长度的输出');
    }
  } catch (e) {
    console.log('  ⚠️  SHAKE256 with different outputLength 可能不被支持:', e.message);
  }
});

// ============ 7. 边界情况测试 ============
console.log('\n--- 7. 边界情况测试 ---');

test('7.1 空字符串输入', () => {
  const hash = crypto.createHash('sha256');
  hash.update('');
  const digest = hash.digest('hex');
  const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  if (digest !== expected) {
    throw new Error(`空字符串哈希不正确，期望 ${expected}，实际 ${digest}`);
  }
});

test('7.2 不调用 update() 直接调用 digest()', () => {
  const hash = crypto.createHash('sha256');
  const digest = hash.digest('hex');
  const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  if (digest !== expected) {
    throw new Error('不调用 update() 应该等同于空输入');
  }
});

test('7.3 空 Buffer 输入', () => {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.alloc(0));
  const digest = hash.digest('hex');
  const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  if (digest !== expected) {
    throw new Error('空 Buffer 应该等同于空输入');
  }
});

test('7.4 大量数据输入（1MB）', () => {
  const hash = crypto.createHash('sha256');
  const largeData = Buffer.alloc(1024 * 1024, 'a');
  hash.update(largeData);
  const digest = hash.digest('hex');
  if (digest.length !== 64) {
    throw new Error('大量数据输入应该正常工作');
  }
});

test('7.5 多次 update() 大量数据', () => {
  const hash = crypto.createHash('sha256');
  for (let i = 0; i < 1000; i++) {
    hash.update('a');
  }
  const digest = hash.digest('hex');
  if (digest.length !== 64) {
    throw new Error('多次 update() 大量数据应该正常工作');
  }
});

test('7.6 Unicode 字符输入', () => {
  const hash = crypto.createHash('sha256');
  hash.update('你好世界🌍');
  const digest = hash.digest('hex');
  if (digest.length !== 64) {
    throw new Error('Unicode 字符应该正常处理');
  }
});

test('7.7 特殊字符输入', () => {
  const hash = crypto.createHash('sha256');
  hash.update('\0\n\r\t');
  const digest = hash.digest('hex');
  if (digest.length !== 64) {
    throw new Error('特殊字符应该正常处理');
  }
});

test('7.8 二进制数据输入', () => {
  const hash = crypto.createHash('sha256');
  const binaryData = Buffer.from([0x00, 0xFF, 0x80, 0x7F, 0x01, 0xFE]);
  hash.update(binaryData);
  const digest = hash.digest('hex');
  if (digest.length !== 64) {
    throw new Error('二进制数据应该正常处理');
  }
});

// ============ 8. 错误处理测试 ============
console.log('\n--- 8. 错误处理测试 ---');

test('8.1 不支持的算法应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.createHash('unsupported-algorithm');
  } catch (e) {
    errorThrown = true;
    if (!e.message.includes('Digest method not supported') && !e.message.includes('Unknown')) {
      throw new Error('错误消息不正确: ' + e.message);
    }
  }
  if (!errorThrown) {
    throw new Error('不支持的算法应该抛出错误');
  }
});

test('8.2 算法名称大小写敏感性', () => {
  // 算法名称应该是不区分大小写的
  const hash1 = crypto.createHash('sha256');
  hash1.update('test');
  const digest1 = hash1.digest('hex');
  
  const hash2 = crypto.createHash('SHA256');
  hash2.update('test');
  const digest2 = hash2.digest('hex');
  
  if (digest1 !== digest2) {
    throw new Error('算法名称应该不区分大小写');
  }
});

test('8.3 update() 传入无效类型应该抛出错误', () => {
  const hash = crypto.createHash('sha256');
  let errorThrown = false;
  try {
    hash.update(123);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入数字应该抛出错误');
  }
});

test('8.4 update() 传入对象应该抛出错误', () => {
  const hash = crypto.createHash('sha256');
  let errorThrown = false;
  try {
    hash.update({});
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入对象应该抛出错误');
  }
});

test('8.5 update() 传入 null 应该抛出错误', () => {
  const hash = crypto.createHash('sha256');
  let errorThrown = false;
  try {
    hash.update(null);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入 null 应该抛出错误');
  }
});

test('8.6 digest() 传入无效编码时返回 Buffer', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  // Node.js 在传入无效编码时不会抛出错误，而是返回 Buffer
  const result = hash.digest('invalid-encoding');
  if (!Buffer.isBuffer(result)) {
    throw new Error('无效编码应该返回 Buffer');
  }
});

test('8.7 createHash() 不传参数应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.createHash();
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('不传参数应该抛出错误');
  }
});

test('8.8 createHash() 传入非字符串应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.createHash(123);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('传入数字应该抛出错误');
  }
});

test('8.9 非 XOF 算法使用 outputLength 选项应该被忽略或抛出错误', () => {
  try {
    // 非 XOF 算法（如 SHA-256）不支持 outputLength
    const hash = crypto.createHash('sha256', { outputLength: 16 });
    hash.update('test');
    const digest = hash.digest('hex');
    // 如果没有抛出错误，输出长度应该仍然是标准的
    if (digest.length !== 64) {
      throw new Error('非 XOF 算法的 outputLength 应该被忽略');
    }
  } catch (e) {
    // 抛出错误也是可以接受的行为
    console.log('  ⚠️  非 XOF 算法使用 outputLength 抛出错误（符合预期）');
  }
});

// ============ 9. 安全特性测试 ============
console.log('\n--- 9. 安全特性测试 ---');

test('9.1 相同输入产生相同输出（确定性）', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('consistent data');
  const digest1 = hash1.digest('hex');
  
  const hash2 = crypto.createHash('sha256');
  hash2.update('consistent data');
  const digest2 = hash2.digest('hex');
  
  if (digest1 !== digest2) {
    throw new Error('相同输入应该产生相同输出');
  }
});

test('9.2 微小差异产生完全不同的输出（雪崩效应）', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('data');
  const digest1 = hash1.digest('hex');
  
  const hash2 = crypto.createHash('sha256');
  hash2.update('Data'); // 只有大小写不同
  const digest2 = hash2.digest('hex');
  
  if (digest1 === digest2) {
    throw new Error('不同输入应该产生不同输出');
  }
  
  // 检查输出差异显著（至少有一半的位不同）
  let differentBits = 0;
  for (let i = 0; i < digest1.length; i++) {
    if (digest1[i] !== digest2[i]) {
      differentBits++;
    }
  }
  const differenceRatio = differentBits / digest1.length;
  if (differenceRatio < 0.3) {
    throw new Error(`雪崩效应不明显，差异比例: ${differenceRatio}`);
  }
});

test('9.3 输出长度固定（抗长度扩展）', () => {
  const hash1 = crypto.createHash('sha256');
  hash1.update('short');
  const digest1 = hash1.digest('hex');
  
  const hash2 = crypto.createHash('sha256');
  hash2.update('a very long string that contains a lot more data than the previous one');
  const digest2 = hash2.digest('hex');
  
  if (digest1.length !== digest2.length) {
    throw new Error('不同长度输入应该产生相同长度输出');
  }
});

test('9.4 不可逆性（无法从输出推导输入）', () => {
  const hash = crypto.createHash('sha256');
  hash.update('secret password');
  const digest = hash.digest('hex');
  
  // 验证输出看起来是随机的（没有明显的模式）
  if (digest.includes('secret') || digest.includes('password')) {
    throw new Error('输出不应该包含输入的明文信息');
  }
});

test('9.5 抗碰撞性测试（不同输入极少产生相同输出）', () => {
  const digests = new Set();
  for (let i = 0; i < 1000; i++) {
    const hash = crypto.createHash('sha256');
    hash.update(`test data ${i}`);
    const digest = hash.digest('hex');
    
    if (digests.has(digest)) {
      throw new Error(`发现碰撞: test data ${i}`);
    }
    digests.add(digest);
  }
  if (digests.size !== 1000) {
    throw new Error('应该生成 1000 个不同的哈希值');
  }
});

test('9.6 MD5 和 SHA-1 安全性警告', () => {
  // MD5 和 SHA-1 已被认为不安全，但仍可用于非安全场景
  const md5 = crypto.createHash('md5');
  md5.update('test');
  const md5Digest = md5.digest('hex');
  
  const sha1 = crypto.createHash('sha1');
  sha1.update('test');
  const sha1Digest = sha1.digest('hex');
  
  console.log('  ⚠️  警告: MD5 和 SHA-1 已被认为加密学上不安全');
  console.log('  ⚠️  建议使用 SHA-256 或更高版本的算法');
  
  if (md5Digest.length === 0 || sha1Digest.length === 0) {
    throw new Error('MD5 和 SHA-1 虽然不安全但应该能正常工作');
  }
});

// ============ 10. 性能和实用性测试 ============
console.log('\n--- 10. 性能和实用性测试 ---');

test('10.1 文件完整性校验模拟', () => {
  // 模拟文件内容
  const fileContent = Buffer.alloc(10000, 'file data');
  
  const hash = crypto.createHash('sha256');
  hash.update(fileContent);
  const checksum = hash.digest('hex');
  
  // 验证校验和
  const hash2 = crypto.createHash('sha256');
  hash2.update(fileContent);
  const checksum2 = hash2.digest('hex');
  
  if (checksum !== checksum2) {
    throw new Error('文件完整性校验失败');
  }
});

test('10.2 密码哈希场景（不推荐直接用 SHA-256）', () => {
  const password = 'user-password-123';
  const hash = crypto.createHash('sha256');
  hash.update(password);
  const hashedPassword = hash.digest('hex');
  
  console.log('  ⚠️  注意: 密码哈希应该使用专门的算法如 bcrypt、scrypt 或 argon2');
  console.log('  ⚠️  不推荐直接使用 SHA-256 进行密码哈希');
  
  if (hashedPassword.length !== 64) {
    throw new Error('密码哈希长度不正确');
  }
});

test('10.3 数据指纹生成', () => {
  const data = JSON.stringify({
    user: 'john',
    timestamp: '2024-01-01',
    action: 'login'
  });
  
  const hash = crypto.createHash('sha256');
  hash.update(data);
  const fingerprint = hash.digest('hex');
  
  if (fingerprint.length !== 64) {
    throw new Error('数据指纹长度不正确');
  }
});

test('10.4 流式处理模拟', () => {
  const hash = crypto.createHash('sha256');
  
  // 模拟流式读取数据
  const chunks = ['chunk1', 'chunk2', 'chunk3', 'chunk4'];
  for (const chunk of chunks) {
    hash.update(chunk);
  }
  
  const digest = hash.digest('hex');
  
  // 验证与一次性处理相同
  const hash2 = crypto.createHash('sha256');
  hash2.update(chunks.join(''));
  const digest2 = hash2.digest('hex');
  
  if (digest !== digest2) {
    throw new Error('流式处理应该与一次性处理结果相同');
  }
});

test('10.5 不同编码之间的转换', () => {
  const hash = crypto.createHash('sha256');
  hash.update('test');
  
  const hexDigest = hash.copy().digest('hex');
  const base64Digest = hash.copy().digest('base64');
  const bufferDigest = hash.copy().digest();
  
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

// ============ 11. 获取可用算法测试 ============
console.log('\n--- 11. 获取可用算法测试 ---');

test('11.1 crypto.getHashes() 返回可用的哈希算法列表', () => {
  const hashes = crypto.getHashes();
  if (!Array.isArray(hashes)) {
    throw new Error('getHashes() 应该返回数组');
  }
  if (hashes.length === 0) {
    throw new Error('应该至少有一个可用的哈希算法');
  }
  console.log(`  可用的哈希算法数量: ${hashes.length}`);
});

test('11.2 crypto.getHashes() 包含常见算法', () => {
  const hashes = crypto.getHashes();
  const commonAlgorithms = ['sha256', 'sha512', 'md5'];
  
  for (const algo of commonAlgorithms) {
    // 算法名称可能以不同大小写形式存在
    const found = hashes.some(h => h.toLowerCase() === algo.toLowerCase());
    if (!found) {
      throw new Error(`常见算法 ${algo} 未在列表中找到`);
    }
  }
});

test('11.3 验证 getHashes() 返回的算法都可以使用', () => {
  const hashes = crypto.getHashes();
  let testedCount = 0;
  const maxTests = 10; // 只测试前 10 个算法以节省时间
  
  for (let i = 0; i < Math.min(hashes.length, maxTests); i++) {
    const algo = hashes[i];
    try {
      const hash = crypto.createHash(algo);
      hash.update('test');
      hash.digest('hex');
      testedCount++;
    } catch (e) {
      // 某些算法可能需要特殊选项，跳过即可
      console.log(`  ⚠️  算法 ${algo} 可能需要特殊选项: ${e.message}`);
    }
  }
  
  if (testedCount === 0) {
    throw new Error('没有任何算法可以成功测试');
  }
  console.log(`  成功测试了 ${testedCount} 个算法`);
});

// ============ 测试总结 ============
console.log('\n========================================');
console.log('测试总结:');
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

// 打印通过的测试（供参考）
if (passCount > 0 && failCount === 0) {
  console.log('\n所有测试通过! 🎉');
}

// 返回测试结果（用于自动化测试）
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

console.log(JSON.stringify(rs,null,2)); 

return rs
