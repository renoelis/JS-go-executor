const crypto = require('crypto');

console.log('========================================');
console.log('  RSA 综合测试 - Part 2: 加密解密');
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

// ============ 1. PKCS#1 v1.5 加密解密 ============
console.log('\n--- 1. PKCS#1 v1.5 加密解密 ---');

test('1.1 publicEncrypt + privateDecrypt (默认 OAEP)', () => {
  const data = Buffer.from('Hello World');
  const encrypted = crypto.publicEncrypt(publicKey, data);
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  if (decrypted.toString() !== 'Hello World') throw new Error('解密结果不匹配');
});

test('1.2 publicEncrypt + privateDecrypt (显式 PKCS1)', () => {
  const data = Buffer.from('Test Message');
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, encrypted);
  if (decrypted.toString() !== 'Test Message') throw new Error('解密结果不匹配');
});

test('1.3 privateEncrypt + publicDecrypt (PKCS1)', () => {
  const data = Buffer.from('Signature Test');
  const encrypted = crypto.privateEncrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, data);
  const decrypted = crypto.publicDecrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, encrypted);
  if (decrypted.toString() !== 'Signature Test') throw new Error('解密结果不匹配');
});

test('1.4 最大数据长度测试 (k-11)', () => {
  const maxLen = 256 - 11; // 2048位 = 256字节，PKCS1 需要 11 字节
  const data = Buffer.alloc(maxLen, 'A');
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, encrypted);
  if (decrypted.length !== maxLen) throw new Error('解密长度不匹配');
});

test('1.5 超长数据应失败', () => {
  try {
    const data = Buffer.alloc(300, 'A'); // 超过 k-11
    crypto.publicEncrypt(publicKey, data);
    throw new Error('应该抛出错误');
  } catch (e) {
    if (!e.message.includes('too large')) throw e;
  }
});

// ============ 2. OAEP 加密解密 ============
console.log('\n--- 2. OAEP 加密解密 ---');

test('2.1 OAEP 默认 (SHA-1)', () => {
  const data = Buffer.from('OAEP Test');
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
  }, encrypted);
  if (decrypted.toString() !== 'OAEP Test') throw new Error('解密结果不匹配');
});

test('2.2 OAEP with SHA-256', () => {
  const data = Buffer.from('OAEP SHA256');
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, encrypted);
  if (decrypted.toString() !== 'OAEP SHA256') throw new Error('解密结果不匹配');
});

test('2.3 OAEP with label', () => {
  const data = Buffer.from('OAEP Label Test');
  const label = Buffer.from('my-label');
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepLabel: label
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepLabel: label
  }, encrypted);
  if (decrypted.toString() !== 'OAEP Label Test') throw new Error('解密结果不匹配');
});

test('2.4 OAEP label 不匹配应失败', () => {
  try {
    const data = Buffer.from('Test');
    const encrypted = crypto.publicEncrypt({
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepLabel: Buffer.from('label1')
    }, data);
    crypto.privateDecrypt({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepLabel: Buffer.from('label2')
    }, encrypted);
    throw new Error('应该抛出错误');
  } catch (e) {
    // Node.js: "oaep decoding error"
    // 我们的实现: "decrypt" 或 "failed"
    if (!e.message.includes('decrypt') && !e.message.includes('failed') && !e.message.includes('oaep') && !e.message.includes('decoding')) throw e;
  }
});

test('2.5 OAEP 最大数据长度 (k - 2*hLen - 2)', () => {
  const hLen = 32; // SHA-256
  const maxLen = 256 - 2 * hLen - 2; // = 190
  const data = Buffer.alloc(maxLen, 'B');
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, encrypted);
  if (decrypted.length !== maxLen) throw new Error('解密长度不匹配');
});

// ============ 3. NO_PADDING 加密解密 ============
console.log('\n--- 3. NO_PADDING 加密解密 ---');

test('3.1 NO_PADDING - 完整长度 (k 字节)', () => {
  const data = Buffer.alloc(256, 1); // 2048位 = 256字节
  data[0] = 0; // 确保 < n
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, encrypted);
  if (decrypted.length !== 256) throw new Error('解密长度不匹配');
});

test('3.2 NO_PADDING - 短数据 (< k 字节，左补零)', () => {
  // NO_PADDING 需要手动补零到密钥长度
  const data = Buffer.alloc(256, 0); // 必须是 256 字节
  // 填充实际数据到末尾
  for (let i = 0; i < 200; i++) {
    data[56 + i] = 2; // 前 56 字节是 0，后 200 字节是 2
  }
  
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, data);
  if (encrypted.length !== 256) throw new Error('加密结果应为 256 字节');
  
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, encrypted);
  if (decrypted.length !== 256) throw new Error('解密结果应为 256 字节');
  // 前 56 字节应该是 0
  for (let i = 0; i < 56; i++) {
    if (decrypted[i] !== 0) throw new Error(`字节 ${i} 应该是 0`);
  }
  // 后 200 字节应该是 2
  for (let i = 56; i < 256; i++) {
    if (decrypted[i] !== 2) throw new Error(`字节 ${i} 应该是 2`);
  }
});

test('3.3 NO_PADDING - privateEncrypt + publicDecrypt', () => {
  const data = Buffer.alloc(256, 3);
  data[0] = 0;
  const encrypted = crypto.privateEncrypt({
    key: privateKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, data);
  const decrypted = crypto.publicDecrypt({
    key: publicKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, encrypted);
  if (decrypted.length !== 256) throw new Error('解密长度不匹配');
});

test('3.4 NO_PADDING - 超长数据应失败', () => {
  try {
    const data = Buffer.alloc(300, 4);
    crypto.publicEncrypt({
      key: publicKey,
      padding: crypto.constants.RSA_NO_PADDING
    }, data);
    throw new Error('应该抛出错误');
  } catch (e) {
    // Node.js: "data too large" 或 "data too small"
    // 我们的实现: "data length not equal" 或 "too large"
    if (!e.message.includes('too large') && !e.message.includes('too small') && !e.message.includes('not equal')) throw e;
  }
});

// ============ 4. 二进制数据支持 ============
console.log('\n--- 4. 二进制数据支持 ---');

test('4.1 TypedArray 输入', () => {
  const data = new Uint8Array([1, 2, 3, 4, 5]);
  const encrypted = crypto.publicEncrypt(publicKey, data);
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  if (decrypted[0] !== 1 || decrypted[4] !== 5) throw new Error('解密结果不匹配');
});

test('4.2 ArrayBuffer 输入', () => {
  const buffer = new ArrayBuffer(10);
  const view = new Uint8Array(buffer);
  view.fill(42);
  const encrypted = crypto.publicEncrypt(publicKey, buffer);
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  if (decrypted[0] !== 42) throw new Error('解密结果不匹配');
});

// ============ 总结 ============
console.log('\n========================================');
console.log('  Part 2 测试总结');
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
