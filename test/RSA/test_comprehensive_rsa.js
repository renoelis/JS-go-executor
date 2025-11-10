// Node.js 18+ Crypto RSA 完整功能验证脚本
// 验证所有实现的功能点，包括安全特性和边界情况
const crypto = require('crypto');

console.log('=== Node.js 18+ Crypto RSA 完整功能验证 ===\n');

const results = {
  tests: {},
  summary: { passed: 0, failed: 0, skipped: 0 }
};

function test(name, fn) {
  try {
    fn();
    results.tests[name] = { passed: true };
    results.summary.passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    results.tests[name] = { passed: false, error: e.message };
    results.summary.failed++;
    console.error(`✗ ${name}: ${e.message}`);
  }
}

function skip(name, reason) {
  results.tests[name] = { skipped: true, reason };
  results.summary.skipped++;
  console.log(`⊘ ${name} (跳过: ${reason})`);
}

// ============ 第一部分: 基础加密/解密测试 ============
console.log('\n【第一部分: 基础加密/解密】');

test('1.1 publicEncrypt + privateDecrypt (默认 OAEP)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = Buffer.from('Hello World');
  const encrypted = crypto.publicEncrypt(publicKey, data);
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  if (decrypted.toString() !== 'Hello World') {
    throw new Error('解密结果不匹配');
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
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, encrypted);
  if (decrypted.toString() !== 'Test PKCS1') {
    throw new Error('PKCS1 解密失败');
  }
});

test('1.3 OAEP with SHA256', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = Buffer.from('OAEP SHA256 Test');
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
  if (decrypted.toString() !== 'OAEP SHA256 Test') {
    throw new Error('OAEP SHA256 失败');
  }
});

test('1.4 OAEP with label', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = Buffer.from('Test with label');
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
  if (decrypted.toString() !== 'Test with label') {
    throw new Error('OAEP label 失败');
  }
});

// ============ 第二部分: 签名场景 (privateEncrypt/publicDecrypt) ============
console.log('\n【第二部分: 签名场景】');

test('2.1 privateEncrypt + publicDecrypt (PKCS1)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = Buffer.from('Sign this');
  const encrypted = crypto.privateEncrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, data);
  const decrypted = crypto.publicDecrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, encrypted);
  if (decrypted.toString() !== 'Sign this') {
    throw new Error('privateEncrypt/publicDecrypt 失败');
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
  if (encrypted.length !== k) {
    throw new Error(`输出长度应该是 ${k} 字节`);
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
    throw new Error('NO_PADDING 往返失败');
  }
});

// ============ 第四部分: PSS 签名/验证 ============
console.log('\n【第四部分: PSS 签名/验证】');

test('4.1 PSS 默认 saltLength (MAX_SIGN + AUTO)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const sign = crypto.createSign('sha256');
  sign.update('test message');
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
    // 不指定 saltLength，应该使用 MAX_SIGN
  });
  
  const verify = crypto.createVerify('sha256');
  verify.update('test message');
  const valid = verify.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
    // 不指定 saltLength，应该使用 AUTO
  }, signature);
  
  if (!valid) {
    throw new Error('PSS 默认 saltLength 验证失败');
  }
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
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
    // AUTO 应该能验证 saltLength=20 的签名
  }, signature);
  
  if (!valid) {
    throw new Error('PSS saltLength=20 验证失败');
  }
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
    saltLength: 32 // 不匹配
  }, signature);
  
  if (valid) {
    throw new Error('saltLength 不匹配应该验证失败');
  }
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

// ============ 第五部分: 输入类型测试 ============
console.log('\n【第五部分: 输入类型】');

test('5.1 Uint8Array 作为 data', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
  const encrypted = crypto.publicEncrypt(publicKey, data);
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  if (decrypted.toString() !== 'Hello') {
    throw new Error('Uint8Array 输入失败');
  }
});

test('5.2 ArrayBuffer 作为 oaepLabel', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = Buffer.from('test');
  const labelArray = new Uint8Array([108, 97, 98, 101, 108]); // "label"
  const label = labelArray.buffer;
  
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
  
  if (decrypted.toString() !== 'test') {
    throw new Error('ArrayBuffer oaepLabel 失败');
  }
});

test('5.3 空 oaepLabel', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = Buffer.from('test');
  const emptyLabel = new Uint8Array(0);
  
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepLabel: emptyLabel
  }, data);
  
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepLabel: emptyLabel
  }, encrypted);
  
  if (decrypted.toString() !== 'test') {
    throw new Error('空 oaepLabel 失败');
  }
});

// ============ 第六部分: 私钥当公钥用 ============
console.log('\n【第六部分: 私钥当公钥用】');

test('6.1 publicEncrypt 接受私钥 PEM', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  const data = Buffer.from('test');
  const encrypted = crypto.publicEncrypt(privateKey, data);
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  if (decrypted.toString() !== 'test') {
    throw new Error('私钥当公钥用失败');
  }
});

test('6.2 publicDecrypt 接受私钥 KeyObject', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const data = Buffer.from('test');
  const encrypted = crypto.privateEncrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, data);
  const decrypted = crypto.publicDecrypt({
    key: privateKey, // 传入私钥
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, encrypted);
  if (decrypted.toString() !== 'test') {
    throw new Error('KeyObject 私钥当公钥用失败');
  }
});

// ============ 第七部分: 边界情况和错误处理 ============
console.log('\n【第七部分: 边界情况】');

test('7.1 消息长度上限 - PKCS1', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const k = 256;
  const maxLen = k - 11;
  const tooLong = Buffer.alloc(maxLen + 1);
  
  try {
    crypto.publicEncrypt({
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, tooLong);
    throw new Error('应该拒绝过长消息');
  } catch (e) {
    if (!e.message.includes('too large') && !e.message.includes('太长')) {
      throw new Error('错误消息不正确: ' + e.message);
    }
  }
});

test('7.2 消息长度上限 - OAEP SHA256', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const k = 256;
  const hLen = 32; // SHA256
  const maxLen = k - 2 * hLen - 2;
  const tooLong = Buffer.alloc(maxLen + 1);
  
  try {
    crypto.publicEncrypt({
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    }, tooLong);
    throw new Error('应该拒绝过长消息');
  } catch (e) {
    if (!e.message.includes('too large') && !e.message.includes('太长')) {
      throw new Error('错误消息不正确: ' + e.message);
    }
  }
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
  if (crypto.constants.RSA_X931_PADDING !== 5) {
    throw new Error('RSA_X931_PADDING 应该是 5');
  }
  if (crypto.constants.RSA_PKCS1_PSS_PADDING !== 6) {
    throw new Error('RSA_PKCS1_PSS_PADDING 应该是 6');
  }
});

// ============ 第八部分: KeyObject 和 asymmetricKeyDetails ============
console.log('\n【第八部分: KeyObject】');

test('8.1 KeyObject.asymmetricKeyDetails', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const details = publicKey.asymmetricKeyDetails;
  if (!details || !details.modulusLength) {
    throw new Error('asymmetricKeyDetails 缺失');
  }
  if (details.modulusLength !== 2048) {
    throw new Error(`modulusLength 应该是 2048，实际是 ${details.modulusLength}`);
  }
  if (!details.publicExponent) {
    throw new Error('publicExponent 缺失');
  }
});

test('8.2 publicExponent 类型', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const exp = publicKey.asymmetricKeyDetails.publicExponent;
  // 应该是 BigInt 或 number，值应该是 65537
  const expValue = typeof exp === 'bigint' ? Number(exp) : exp;
  if (expValue !== 65537) {
    throw new Error(`publicExponent 应该是 65537，实际是 ${expValue}`);
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

// ============ 第九部分: 辅助方法 ============
console.log('\n【第九部分: 辅助方法】');

test('9.1 crypto.getHashes()', () => {
  const hashes = crypto.getHashes();
  if (!Array.isArray(hashes)) {
    throw new Error('getHashes 应该返回数组');
  }
  if (!hashes.includes('sha256')) {
    throw new Error('getHashes 应该包含 sha256');
  }
});

test('9.2 crypto.getCiphers()', () => {
  const ciphers = crypto.getCiphers();
  if (!Array.isArray(ciphers)) {
    throw new Error('getCiphers 应该返回数组');
  }
});

test('9.3 crypto.getCurves()', () => {
  const curves = crypto.getCurves();
  if (!Array.isArray(curves)) {
    throw new Error('getCurves 应该返回数组');
  }
});

// ============ 总结 ============
console.log('\n========================================');
console.log(`总计: ${results.summary.passed + results.summary.failed + results.summary.skipped} 个测试`);
console.log(`通过: ${results.summary.passed}`);
console.log(`失败: ${results.summary.failed}`);
console.log(`跳过: ${results.summary.skipped}`);
const total = results.summary.passed + results.summary.failed;
if (total > 0) {
  console.log(`成功率: ${((results.summary.passed / total) * 100).toFixed(1)}%`);
}
console.log('========================================\n');

// 详细失败信息
if (results.summary.failed > 0) {
  console.log('失败的测试详情:');
  Object.keys(results.tests).forEach(name => {
    if (!results.tests[name].passed && !results.tests[name].skipped) {
      console.log(`  - ${name}: ${results.tests[name].error}`);
    }
  });
  console.log('');
}

return {
  success: results.summary.failed === 0,
  allPassed: results.summary.failed === 0,
  summary: results.summary,
  tests: results.tests,
  message: results.summary.failed === 0 
    ? '✅ 所有 Node.js 18+ RSA 功能测试通过！' 
    : `❌ ${results.summary.failed} 个测试失败`
};
