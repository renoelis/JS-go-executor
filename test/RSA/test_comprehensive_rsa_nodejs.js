// Node.js 18+ RSA 综合测试 (Node.js 兼容版)
const crypto = require('crypto');

console.log('========================================');
console.log('  RSA 综合功能测试 (Node.js 兼容版)');
console.log('========================================\n');

let testCount = 0;
let passCount = 0;
let failCount = 0;
const testResults = {};

function test(name, fn) {
  testCount++;
  try {
    console.log(`\n[测试 ${testCount}] ${name}`);
    fn();
    passCount++;
    console.log('✓ 通过');
    testResults[name] = { passed: true };
  } catch (e) {
    failCount++;
    console.log('✗ 失败:', e.message);
    if (e.stack) console.log('Stack:', e.stack);
    testResults[name] = { passed: false, error: e.message };
  }
}

// ============ 第一部分: 基础加密解密 ============
console.log('\n【第一部分: 基础加密解密】');

test('1.1 publicEncrypt + privateDecrypt (默认 OAEP)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = Buffer.from('Hello RSA');
  const encrypted = crypto.publicEncrypt(publicKey, data);
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  if (decrypted.toString() !== 'Hello RSA') {
    throw new Error('解密失败');
  }
});

test('1.2 publicEncrypt + privateDecrypt (PKCS1)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = Buffer.from('Test PKCS1');
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, data);
  
  // Node.js v22+ 禁用了 PKCS1 私钥解密（安全限制）
  try {
    const decrypted = crypto.privateDecrypt({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, encrypted);
    if (decrypted.toString() !== 'Test PKCS1') {
      throw new Error('PKCS1 解密失败');
    }
  } catch (e) {
    // Node.js v22+ 会抛出 "RSA_PKCS1_PADDING is no longer supported"
    if (e.message.includes('no longer supported') || e.message.includes('CVE-2024')) {
      console.log('  ⚠️  Node.js v22+ 安全限制：PKCS1 私钥解密已禁用');
      // 测试通过（预期行为）
    } else {
      throw e;
    }
  }
});

test('1.3 OAEP with SHA256', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
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
  if (decrypted.toString() !== 'OAEP SHA256') {
    throw new Error('OAEP SHA256 解密失败');
  }
});

test('1.4 OAEP with label', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = Buffer.from('test');
  const label = Buffer.from('my-label');
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256',
    oaepLabel: label
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256',
    oaepLabel: label
  }, encrypted);
  if (decrypted.toString() !== 'test') {
    throw new Error('OAEP label 解密失败');
  }
});

// ============ 第二部分: privateEncrypt / publicDecrypt ============
console.log('\n【第二部分: privateEncrypt / publicDecrypt】');

test('2.1 privateEncrypt + publicDecrypt (PKCS1)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = Buffer.from('Private encrypt');
  const encrypted = crypto.privateEncrypt(privateKey, data);
  const decrypted = crypto.publicDecrypt(publicKey, encrypted);
  if (decrypted.toString() !== 'Private encrypt') {
    throw new Error('privateEncrypt 解密失败');
  }
});

test('2.2 privateEncrypt 不支持 OAEP', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  try {
    crypto.privateEncrypt({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    }, Buffer.from('test'));
    throw new Error('应该拒绝 OAEP 但没有');
  } catch (e) {
    // 兼容不同的错误消息格式
    // 我们的实现: "不支持" 或 "Unsupported"
    // Node.js: "illegal or unsupported padding mode"
    if (!e.message.includes('不支持') && 
        !e.message.includes('Unsupported') &&
        !e.message.includes('unsupported padding')) {
      throw new Error('错误消息不正确: ' + e.message);
    }
  }
});

// ============ 第三部分: RSA_NO_PADDING ============
console.log('\n【第三部分: RSA_NO_PADDING】');

test('3.1 NO_PADDING 长度必须等于 k', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const k = 256; // 2048 bits = 256 bytes
  const data = Buffer.alloc(k - 1);
  try {
    crypto.publicEncrypt({
      key: publicKey,
      padding: crypto.constants.RSA_NO_PADDING
    }, data);
    throw new Error('应该拒绝长度 k-1');
  } catch (e) {
    // 兼容不同的错误消息格式
    // Node.js: "not equal" 或 "长度"
    // 我们的实现: "too small" 或 "data too small for key size"
    if (!e.message.includes('not equal') && 
        !e.message.includes('长度') && 
        !e.message.includes('too small') &&
        !e.message.includes('key size')) {
      throw new Error('错误消息不正确: ' + e.message);
    }
  }
});

test('3.2 NO_PADDING 长度 k 应该成功', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const k = 256;
  const data = Buffer.alloc(k);
  data[k - 1] = 42; // 设置最后一个字节
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, data);
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, encrypted);
  if (decrypted[k - 1] !== 42) {
    throw new Error('NO_PADDING 解密失败');
  }
});

test('3.3 NO_PADDING privateEncrypt + publicDecrypt', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const k = 256;
  const data = Buffer.alloc(k);
  data[k - 1] = 99;
  const encrypted = crypto.privateEncrypt({
    key: privateKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, data);
  const decrypted = crypto.publicDecrypt({
    key: publicKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, encrypted);
  if (decrypted[k - 1] !== 99) {
    throw new Error('NO_PADDING privateEncrypt 解密失败');
  }
});

// ============ 第四部分: PSS 签名 ============
console.log('\n【第四部分: PSS 签名】');

test('4.1 PSS 默认 saltLength (MAX_SIGN + AUTO)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const sign = crypto.createSign('sha256');
  sign.update('test data');
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
  });
  
  const verify = crypto.createVerify('sha256');
  verify.update('test data');
  const valid = verify.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
  }, signature);
  
  if (!valid) throw new Error('PSS 验签失败');
});

test('4.2 PSS 指定 saltLength=20', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 20
  });
  
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const valid = verify.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 20
  }, signature);
  
  if (!valid) throw new Error('PSS saltLength=20 验签失败');
});

test('4.3 PSS saltLength 不匹配应该失败', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 20
  });
  
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const valid = verify.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32
  }, signature);
  
  if (valid) throw new Error('saltLength 不匹配应该验签失败');
});

test('4.4 PSS 常量值正确', () => {
  if (crypto.constants.RSA_PSS_SALTLEN_DIGEST !== -1) {
    throw new Error('RSA_PSS_SALTLEN_DIGEST 应该是 -1');
  }
  if (crypto.constants.RSA_PSS_SALTLEN_AUTO !== -2) {
    throw new Error('RSA_PSS_SALTLEN_AUTO 应该是 -2');
  }
  if (crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN !== -2) {
    throw new Error('RSA_PSS_SALTLEN_MAX_SIGN 应该是 -2');
  }
});

// ============ 第五部分: TypedArray 支持 ============
console.log('\n【第五部分: TypedArray 支持】');

test('5.1 Uint8Array 作为 data', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
  const encrypted = crypto.publicEncrypt(publicKey, data);
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  if (decrypted.toString() !== 'Hello') {
    throw new Error('Uint8Array 解密失败');
  }
});

test('5.2 ArrayBuffer 作为 oaepLabel', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const label = new Uint8Array([1, 2, 3]).buffer;
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepLabel: label
  }, Buffer.from('test'));
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepLabel: label
  }, encrypted);
  if (decrypted.toString() !== 'test') {
    throw new Error('ArrayBuffer label 解密失败');
  }
});

test('5.3 空 oaepLabel', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepLabel: Buffer.alloc(0)
  }, Buffer.from('test'));
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepLabel: Buffer.alloc(0)
  }, encrypted);
  if (decrypted.toString() !== 'test') {
    throw new Error('空 label 解密失败');
  }
});

// ============ 第六部分: 密钥格式互操作 ============
console.log('\n【第六部分: 密钥格式互操作】');

test('6.1 publicEncrypt 接受私钥 PEM', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  const encrypted = crypto.publicEncrypt(privateKey, Buffer.from('test'));
  if (encrypted.length === 0) throw new Error('加密失败');
});

test('6.2 publicDecrypt 接受私钥 KeyObject', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const encrypted = crypto.privateEncrypt(privateKey, Buffer.from('test'));
  const decrypted = crypto.publicDecrypt(privateKey, encrypted);
  if (decrypted.toString() !== 'test') throw new Error('解密失败');
});

// ============ 第七部分: 边界条件 ============
console.log('\n【第七部分: 边界条件】');

test('7.1 消息长度上限 - PKCS1', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const maxLen = 245; // 256 - 11
  const data = Buffer.alloc(maxLen);
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, data);
  if (encrypted.length === 0) throw new Error('加密失败');
});

test('7.2 消息长度上限 - OAEP SHA256', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const maxLen = 190; // 256 - 2*32 - 2
  const data = Buffer.alloc(maxLen);
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, data);
  if (encrypted.length === 0) throw new Error('加密失败');
});

test('7.3 RSA_X931_PADDING 应该被拒绝', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  try {
    crypto.publicEncrypt({
      key: publicKey,
      padding: crypto.constants.RSA_X931_PADDING
    }, Buffer.from('test'));
    throw new Error('应该拒绝 X9.31 padding');
  } catch (e) {
    // 兼容不同的错误消息格式
    // 我们的实现: "不支持" 或 "Unsupported"
    // Node.js: "unknown padding type"
    if (!e.message.includes('不支持') && 
        !e.message.includes('Unsupported') &&
        !e.message.includes('unknown padding')) {
      throw new Error('错误消息不正确: ' + e.message);
    }
  }
});

test('7.4 常量值正确', () => {
  if (crypto.constants.RSA_NO_PADDING !== 3) {
    throw new Error('RSA_NO_PADDING 应该是 3');
  }
  if (crypto.constants.RSA_PKCS1_PADDING !== 1) {
    throw new Error('RSA_PKCS1_PADDING 应该是 1');
  }
  if (crypto.constants.RSA_PKCS1_OAEP_PADDING !== 4) {
    throw new Error('RSA_PKCS1_OAEP_PADDING 应该是 4');
  }
});

// ============ 第八部分: KeyObject API ============
console.log('\n【第八部分: KeyObject API】');

test('8.1 KeyObject.asymmetricKeyDetails', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 65537
  });
  const details = publicKey.asymmetricKeyDetails;
  if (!details) throw new Error('asymmetricKeyDetails 不存在');
  if (details.modulusLength !== 2048) {
    throw new Error('modulusLength 不正确');
  }
  const exp = BigInt(details.publicExponent);
  if (exp !== 65537n) {
    throw new Error('publicExponent 不正确');
  }
});

test('8.2 publicExponent 类型', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 3
  });
  const exp = publicKey.asymmetricKeyDetails.publicExponent;
  if (typeof exp !== 'number' && typeof exp !== 'bigint') {
    throw new Error('publicExponent 类型不对');
  }
});

test('8.3 KeyObject.export() PEM 格式', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  if (!pem.includes('BEGIN PRIVATE KEY')) {
    throw new Error('PEM 格式不正确');
  }
});

test('8.4 KeyObject.export() DER 格式', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const der = publicKey.export({ type: 'spki', format: 'der' });
  if (!Buffer.isBuffer(der)) {
    throw new Error('DER 应该返回 Buffer');
  }
});

// ============ 第九部分: 算法列表 ============
console.log('\n【第九部分: 算法列表】');

test('9.1 crypto.getHashes()', () => {
  const hashes = crypto.getHashes();
  if (!Array.isArray(hashes)) throw new Error('应该返回数组');
  if (!hashes.includes('sha256')) throw new Error('应该包含 sha256');
});

test('9.2 crypto.getCiphers()', () => {
  const ciphers = crypto.getCiphers();
  if (!Array.isArray(ciphers)) throw new Error('应该返回数组');
});

test('9.3 crypto.getCurves()', () => {
  const curves = crypto.getCurves();
  if (!Array.isArray(curves)) throw new Error('应该返回数组');
});

// ============ 总结 ============
console.log('\n========================================');
console.log('  RSA 综合测试总结 (Node.js 兼容版)');
console.log('========================================');
console.log(`总计: ${testCount} 个测试`);
console.log(`通过: ${passCount} 个`);
console.log(`失败: ${failCount} 个`);
console.log(`成功率: ${((passCount / testCount) * 100).toFixed(2)}%`);

return {
  success: failCount === 0,
  allPassed: failCount === 0,
  summary: {
    passed: passCount,
    failed: failCount,
    skipped: 0
  },
  tests: testResults,
  message: failCount === 0 
    ? '✅ 所有 Node.js 18+ 功能测试通过！' 
    : `❌ ${failCount} 个测试失败`
};
