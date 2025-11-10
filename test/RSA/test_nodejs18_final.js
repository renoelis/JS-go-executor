// Node.js 18+ Crypto 兼容性最终验证脚本
const crypto = require('crypto');

console.log('=== Node.js 18+ Crypto 兼容性验证 ===\n');

const results = {
  tests: {},
  summary: { passed: 0, failed: 0 }
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

// 测试1: KeyObject 返回
test('KeyObject 返回', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  if (publicKey.type !== 'public' || privateKey.type !== 'private') {
    throw new Error('类型不对');
  }
});

// 测试2: KeyObject.export()
test('KeyObject.export()', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const der = privateKey.export({ type: 'pkcs8', format: 'der' });
  if (!pem.includes('BEGIN PRIVATE KEY') || !Buffer.isBuffer(der)) {
    throw new Error('导出格式不对');
  }
});

// 测试3: Buffer.isBuffer()
test('Buffer.isBuffer()', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'der' }
  });
  if (!Buffer.isBuffer(publicKey)) {
    throw new Error('DER 格式应该返回 Buffer');
  }
});

// 测试4: PKCS#1 公钥
test('PKCS#1 公钥格式', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' }
  });
  const encrypted = crypto.publicEncrypt(publicKey, Buffer.from('test'));
  if (encrypted.length === 0) throw new Error('加密失败');
});

// 测试5: 3072 位密钥
test('3072 位密钥生成', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 3072,
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  });
  if (publicKey.length === 0) throw new Error('生成失败');
});

// 测试6: RSA-SHA256 命名
test('RSA-SHA256 哈希命名', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  const sign = crypto.createSign('RSA-SHA256');
  sign.update('test');
  const sig = sign.sign(privateKey);
  if (sig.length === 0) throw new Error('签名失败');
});

// 测试7: DER 格式输入
test('DER 格式密钥输入', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const publicDer = publicKey.export({ type: 'spki', format: 'der' });
  const encrypted = crypto.publicEncrypt({
    key: publicDer,
    format: 'der',
    type: 'spki'
  }, Buffer.from('test'));
  if (encrypted.length === 0) throw new Error('DER 加密失败');
});

// 测试8: OAEP label
test('OAEP label 支持', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  const label = Buffer.from('test-label');
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256',
    oaepLabel: label
  }, Buffer.from('test'));
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256',
    oaepLabel: label
  }, encrypted);
  if (decrypted.toString() !== 'test') throw new Error('label 支持失败');
});

// 测试9: PSS 常量
test('PSS saltLength 常量', () => {
  if (crypto.constants.RSA_PSS_SALTLEN_DIGEST !== -1 ||
      crypto.constants.RSA_PSS_SALTLEN_AUTO !== -2) {
    throw new Error('常量值不对');
  }
});

// 测试10: PSS 密钥大小验证（应该失败）
test('PSS 密钥大小验证', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  const sign = crypto.createSign('sha512');
  sign.update('test');
  try {
    sign.sign({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
    });
    throw new Error('应该拒绝但没有拒绝');
  } catch (e) {
    if (!e.message.includes('too large for key size')) {
      throw new Error('错误消息不对: ' + e.message);
    }
    // 正确拒绝，测试通过
  }
});

// 测试11: 异步 generateKeyPair
test('异步 generateKeyPair', () => {
  let callbackCalled = false;
  crypto.generateKeyPair('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  }, (err, pub, priv) => {
    if (err) throw err;
    callbackCalled = true;
    if (!pub || !priv) throw new Error('密钥为空');
  });
  // 注意：在同步环境中回调会立即执行
  if (!callbackCalled) throw new Error('回调未执行');
});

console.log('\n========================================');
console.log(`总计: ${results.summary.passed + results.summary.failed} 个测试`);
console.log(`通过: ${results.summary.passed}`);
console.log(`失败: ${results.summary.failed}`);
console.log(`成功率: ${((results.summary.passed / (results.summary.passed + results.summary.failed)) * 100).toFixed(1)}%`);
console.log('========================================\n');

return {
  success: results.summary.failed === 0,
  allPassed: results.summary.failed === 0,
  summary: results.summary,
  tests: results.tests,
  message: results.summary.failed === 0 
    ? '✅ 所有 Node.js 18+ 功能测试通过！' 
    : `❌ ${results.summary.failed} 个测试失败`
};

