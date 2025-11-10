const crypto = require('crypto');

console.log('========================================');
console.log('  RSA 边界与极端情况测试 (Node.js 兼容版)');
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

// ============ 1. 密钥长度极端值 ============
console.log('\n--- 1. 密钥长度极端值 ---');

test('1.1 最小可用密钥 - 512 位 (不安全)', () => {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 512
    });
    if (!publicKey || !privateKey) throw new Error('密钥生成失败');
  } catch (e) {
    if (!e.message.includes('512') && !e.message.includes('too small')) throw e;
  }
});

test('1.2 标准最小密钥 - 1024 位', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024
  });
  if (!publicKey || !privateKey) throw new Error('密钥生成失败');
});

test('1.3 推荐密钥 - 2048 位', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  if (!publicKey || !privateKey) throw new Error('密钥生成失败');
});

test('1.4 高安全密钥 - 4096 位', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096
  });
  if (!publicKey || !privateKey) throw new Error('密钥生成失败');
});

test('1.5 非标准密钥长度 - 3072 位', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 3072
  });
  if (!publicKey || !privateKey) throw new Error('密钥生成失败');
});

// ============ 2. publicExponent 边界值 ============
console.log('\n--- 2. publicExponent 边界值 ---');

test('2.1 最小 publicExponent - 3', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 3
  });
  const details = publicKey.asymmetricKeyDetails;
  const exp = BigInt(details.publicExponent);
  if (exp !== 3n) throw new Error(`应该是 3，实际是 ${exp}`);
});

test('2.2 常用 publicExponent - 17', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 17
  });
  const details = publicKey.asymmetricKeyDetails;
  const exp = BigInt(details.publicExponent);
  if (exp !== 17n) throw new Error(`应该是 17，实际是 ${exp}`);
});

test('2.3 标准 publicExponent - 65537 (0x10001)', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 65537
  });
  const details = publicKey.asymmetricKeyDetails;
  const exp = BigInt(details.publicExponent);
  if (exp !== 65537n) throw new Error(`应该是 65537，实际是 ${exp}`);
});

test('2.4 无效 publicExponent - 偶数应失败', () => {
  try {
    crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 4
    });
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
  }
});

test('2.5 无效 publicExponent - 1 应失败', () => {
  try {
    crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 1
    });
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
  }
});

// ============ 3. 加密数据长度边界 ============
console.log('\n--- 3. 加密数据长度边界 ---');

const { publicKey: testPubKey, privateKey: testPrivKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048
});

test('3.1 PKCS1 - 空数据', () => {
  const data = Buffer.alloc(0);
  const encrypted = crypto.publicEncrypt(testPubKey, data);
  const decrypted = crypto.privateDecrypt(testPrivKey, encrypted);
  if (decrypted.length !== 0) throw new Error('解密结果应该为空');
});

test('3.2 PKCS1 - 1 字节数据', () => {
  const data = Buffer.from([0x42]);
  const encrypted = crypto.publicEncrypt(testPubKey, data);
  const decrypted = crypto.privateDecrypt(testPrivKey, encrypted);
  if (decrypted[0] !== 0x42) throw new Error('解密结果不匹配');
});

test('3.3 PKCS1 - 最大长度 (k-11)', () => {
  // 2048位 = 256字节，PKCS1 最大 = 256 - 11 = 245
  const maxLen = 245;
  const data = Buffer.alloc(maxLen, 0xFF);
  const encrypted = crypto.publicEncrypt(testPubKey, data);
  const decrypted = crypto.privateDecrypt(testPrivKey, encrypted);
  if (decrypted.length !== maxLen) throw new Error('解密长度不匹配');
});

test('3.4 PKCS1 - 超过最大长度 1 字节', () => {
  try {
    const data = Buffer.alloc(246, 0xFF);
    crypto.publicEncrypt(testPubKey, data);
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
    if (!e.message.includes('too large') && !e.message.includes('data')) throw e;
  }
});

test('3.5 OAEP SHA-256 - 最大长度 (k - 2*32 - 2)', () => {
  const maxLen = 256 - 2 * 32 - 2;  // = 190
  const data = Buffer.alloc(maxLen, 0xAA);
  const encrypted = crypto.publicEncrypt({
    key: testPubKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: testPrivKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, encrypted);
  if (decrypted.length !== maxLen) throw new Error('解密长度不匹配');
});

test('3.6 OAEP SHA-512 - 最大长度 (k - 2*64 - 2)', () => {
  const maxLen = 256 - 2 * 64 - 2;  // = 126
  const data = Buffer.alloc(maxLen, 0xBB);
  const encrypted = crypto.publicEncrypt({
    key: testPubKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha512'
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: testPrivKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha512'
  }, encrypted);
  if (decrypted.length !== maxLen) throw new Error('解密长度不匹配');
});

test('3.7 NO_PADDING - 精确 k 字节', () => {
  const data = Buffer.alloc(256, 0x01);
  data[0] = 0;  // 确保 < n
  const encrypted = crypto.publicEncrypt({
    key: testPubKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: testPrivKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, encrypted);
  if (decrypted.length !== 256) throw new Error('解密长度不匹配');
});

test('3.8 NO_PADDING - 少于 k 字节应失败', () => {
  try {
    const data = Buffer.alloc(200, 0x02);
    crypto.publicEncrypt({
      key: testPubKey,
      padding: crypto.constants.RSA_NO_PADDING
    }, data);
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
    if (!e.message.includes('too small') && !e.message.includes('size')) throw e;
  }
});

test('3.9 NO_PADDING - 多于 k 字节应失败', () => {
  try {
    const data = Buffer.alloc(300, 0x03);
    crypto.publicEncrypt({
      key: testPubKey,
      padding: crypto.constants.RSA_NO_PADDING
    }, data);
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
    if (!e.message.includes('too large') && !e.message.includes('size')) throw e;
  }
});

// ============ 4. 特殊字符和编码边界 ============
console.log('\n--- 4. 特殊字符和编码边界 ---');

test('4.1 加密全 0 数据', () => {
  const data = Buffer.alloc(100, 0x00);
  const encrypted = crypto.publicEncrypt(testPubKey, data);
  const decrypted = crypto.privateDecrypt(testPrivKey, encrypted);
  // 使用 Buffer.compare 代替 equals
  if (Buffer.compare(decrypted, data) !== 0) throw new Error('解密结果不匹配');
});

test('4.2 加密全 0xFF 数据', () => {
  const data = Buffer.alloc(100, 0xFF);
  const encrypted = crypto.publicEncrypt(testPubKey, data);
  const decrypted = crypto.privateDecrypt(testPrivKey, encrypted);
  if (Buffer.compare(decrypted, data) !== 0) throw new Error('解密结果不匹配');
});

test('4.3 加密随机二进制数据', () => {
  const data = crypto.randomBytes(100);
  const encrypted = crypto.publicEncrypt(testPubKey, data);
  const decrypted = crypto.privateDecrypt(testPrivKey, encrypted);
  if (Buffer.compare(decrypted, data) !== 0) throw new Error('解密结果不匹配');
});

test('4.4 加密 UTF-8 多字节字符', () => {
  const data = Buffer.from('Hello 世界 🌍 مرحبا');
  const encrypted = crypto.publicEncrypt(testPubKey, data);
  const decrypted = crypto.privateDecrypt(testPrivKey, encrypted);
  if (decrypted.toString('utf8') !== 'Hello 世界 🌍 مرحبا') {
    throw new Error('解密结果不匹配');
  }
});

// ============ 5. PSS saltLength 边界 ============
console.log('\n--- 5. PSS saltLength 边界 ---');

test('5.1 PSS saltLength = 0', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign({
    key: testPrivKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 0
  });
  
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const valid = verify.verify({
    key: testPubKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 0
  }, signature);
  
  if (!valid) throw new Error('验签失败');
});

test('5.2 PSS saltLength = 最大值', () => {
  const maxSalt = 222;
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign({
    key: testPrivKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: maxSalt
  });
  
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const valid = verify.verify({
    key: testPubKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: maxSalt
  }, signature);
  
  if (!valid) throw new Error('验签失败');
});

test('5.3 PSS saltLength 超过最大值应失败', () => {
  try {
    const sign = crypto.createSign('sha256');
    sign.update('test');
    sign.sign({
      key: testPrivKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 300
    });
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
  }
});

// ============ 6. Hash 输入边界 ============
console.log('\n--- 6. Hash 输入边界 ---');

test('6.1 Hash - 空输入', () => {
  const hash = crypto.createHash('sha256');
  hash.update('');
  const digest = hash.digest();
  if (!Buffer.isBuffer(digest)) throw new Error('应该返回 Buffer');
  if (digest.length !== 32) throw new Error('SHA-256 应该是 32 字节');
});

test('6.2 Hash - 单字节输入', () => {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from([0x42]));
  const digest = hash.digest();
  if (digest.length !== 32) throw new Error('SHA-256 应该是 32 字节');
});

test('6.3 Hash - 大量数据 (1MB)', () => {
  const hash = crypto.createHash('sha256');
  const chunk = Buffer.alloc(1024, 0xAA);
  for (let i = 0; i < 1024; i++) {
    hash.update(chunk);
  }
  const digest = hash.digest();
  if (digest.length !== 32) throw new Error('SHA-256 应该是 32 字节');
});

test('6.4 HMAC - 空 key', () => {
  const hmac = crypto.createHmac('sha256', '');
  hmac.update('test');
  const mac = hmac.digest();
  if (mac.length !== 32) throw new Error('HMAC-SHA256 应该是 32 字节');
});

test('6.5 HMAC - 长 key (> block size)', () => {
  const longKey = Buffer.alloc(128, 0xFF);
  const hmac = crypto.createHmac('sha256', longKey);
  hmac.update('test');
  const mac = hmac.digest();
  if (mac.length !== 32) throw new Error('HMAC-SHA256 应该是 32 字节');
});

// ============ 7. 格式转换边界 ============
console.log('\n--- 7. 格式转换边界 ---');

test('7.1 PEM 最小有效长度', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024
  });
  const pem = publicKey.export({ format: 'pem', type: 'spki' });
  const keyObj = crypto.createPublicKey(pem);
  if (keyObj.type !== 'public') throw new Error('导入失败');
});

test('7.2 DER 往返转换', () => {
  const der1 = testPubKey.export({ format: 'der', type: 'spki' });
  const keyObj = crypto.createPublicKey({ key: der1, format: 'der', type: 'spki' });
  const der2 = keyObj.export({ format: 'der', type: 'spki' });
  // 使用 Buffer.compare 代替 equals
  if (Buffer.compare(der1, der2) !== 0) throw new Error('DER 往返不一致');
});

test('7.3 JWK 最小字段', () => {
  const jwk = testPubKey.export({ format: 'jwk' });
  const minimalJwk = {
    kty: jwk.kty,
    n: jwk.n,
    e: jwk.e
  };
  const keyObj = crypto.createPublicKey({ key: minimalJwk, format: 'jwk' });
  if (keyObj.type !== 'public') throw new Error('导入失败');
});

// ============ 总结 ============
console.log('\n========================================');
console.log('  边界测试总结 (Node.js 兼容版)');
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
