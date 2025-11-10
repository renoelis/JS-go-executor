const crypto = require('crypto');

console.log('========================================');
console.log('  RSA 综合测试 - Part 5: KeyObject 与高级功能');
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

// ============ 1. KeyObject 基础属性 ============
console.log('\n--- 1. KeyObject 基础属性 ---');

test('1.1 公钥 asymmetricKeyType', () => {
  const keyObj = crypto.createPublicKey(publicKey);
  if (keyObj.asymmetricKeyType !== 'rsa') throw new Error(`应该是 'rsa'，实际是 '${keyObj.asymmetricKeyType}'`);
});

test('1.2 私钥 asymmetricKeyType', () => {
  const keyObj = crypto.createPrivateKey(privateKey);
  if (keyObj.asymmetricKeyType !== 'rsa') throw new Error(`应该是 'rsa'，实际是 '${keyObj.asymmetricKeyType}'`);
});

test('1.3 公钥 type 属性', () => {
  const keyObj = crypto.createPublicKey(publicKey);
  if (keyObj.type !== 'public') throw new Error(`应该是 'public'，实际是 '${keyObj.type}'`);
});

test('1.4 私钥 type 属性', () => {
  const keyObj = crypto.createPrivateKey(privateKey);
  if (keyObj.type !== 'private') throw new Error(`应该是 'private'，实际是 '${keyObj.type}'`);
});

test('1.5 asymmetricKeyDetails - modulusLength', () => {
  const keyObj = crypto.createPublicKey(publicKey);
  const details = keyObj.asymmetricKeyDetails;
  if (!details) throw new Error('asymmetricKeyDetails 不应该为空');
  if (details.modulusLength !== 2048) throw new Error(`modulusLength 应该是 2048，实际是 ${details.modulusLength}`);
});

test('1.6 asymmetricKeyDetails - publicExponent', () => {
  const keyObj = crypto.createPublicKey(publicKey);
  const details = keyObj.asymmetricKeyDetails;
  if (!details.publicExponent) throw new Error('publicExponent 不应该为空');
  // 默认是 65537 (0x10001)
  const exp = details.publicExponent;
  if (typeof exp !== 'bigint' && typeof exp !== 'number') {
    throw new Error('publicExponent 应该是 number 或 bigint');
  }
});

// ============ 2. KeyObject.export() - 格式转换 ============
console.log('\n--- 2. KeyObject.export() - 格式转换 ---');

test('2.1 公钥 export PEM SPKI', () => {
  const keyObj = crypto.createPublicKey(publicKey);
  const pem = keyObj.export({ format: 'pem', type: 'spki' });
  if (typeof pem !== 'string') throw new Error('应该返回字符串');
  if (!pem.includes('BEGIN PUBLIC KEY')) throw new Error('应该是 SPKI 格式');
});

test('2.2 公钥 export PEM PKCS1', () => {
  const keyObj = crypto.createPublicKey(publicKey);
  const pem = keyObj.export({ format: 'pem', type: 'pkcs1' });
  if (typeof pem !== 'string') throw new Error('应该返回字符串');
  if (!pem.includes('BEGIN RSA PUBLIC KEY')) throw new Error('应该是 PKCS1 格式');
});

test('2.3 公钥 export DER SPKI', () => {
  const keyObj = crypto.createPublicKey(publicKey);
  const der = keyObj.export({ format: 'der', type: 'spki' });
  if (!Buffer.isBuffer(der)) throw new Error('应该返回 Buffer');
  if (der.length === 0) throw new Error('DER 数据不应该为空');
});

test('2.4 公钥 export DER PKCS1', () => {
  const keyObj = crypto.createPublicKey(publicKey);
  const der = keyObj.export({ format: 'der', type: 'pkcs1' });
  if (!Buffer.isBuffer(der)) throw new Error('应该返回 Buffer');
  if (der.length === 0) throw new Error('DER 数据不应该为空');
});

test('2.5 公钥 export JWK', () => {
  const keyObj = crypto.createPublicKey(publicKey);
  const jwk = keyObj.export({ format: 'jwk' });
  if (typeof jwk !== 'object') throw new Error('应该返回对象');
  if (jwk.kty !== 'RSA') throw new Error('kty 应该是 RSA');
  if (!jwk.n) throw new Error('缺少 n');
  if (!jwk.e) throw new Error('缺少 e');
});

test('2.6 私钥 export PEM PKCS8', () => {
  const keyObj = crypto.createPrivateKey(privateKey);
  const pem = keyObj.export({ format: 'pem', type: 'pkcs8' });
  if (typeof pem !== 'string') throw new Error('应该返回字符串');
  if (!pem.includes('BEGIN PRIVATE KEY')) throw new Error('应该是 PKCS8 格式');
});

test('2.7 私钥 export PEM PKCS1', () => {
  const keyObj = crypto.createPrivateKey(privateKey);
  const pem = keyObj.export({ format: 'pem', type: 'pkcs1' });
  if (typeof pem !== 'string') throw new Error('应该返回字符串');
  if (!pem.includes('BEGIN RSA PRIVATE KEY')) throw new Error('应该是 PKCS1 格式');
});

test('2.8 私钥 export DER PKCS8', () => {
  const keyObj = crypto.createPrivateKey(privateKey);
  const der = keyObj.export({ format: 'der', type: 'pkcs8' });
  if (!Buffer.isBuffer(der)) throw new Error('应该返回 Buffer');
  if (der.length === 0) throw new Error('DER 数据不应该为空');
});

test('2.9 私钥 export JWK', () => {
  const keyObj = crypto.createPrivateKey(privateKey);
  const jwk = keyObj.export({ format: 'jwk' });
  if (typeof jwk !== 'object') throw new Error('应该返回对象');
  if (jwk.kty !== 'RSA') throw new Error('kty 应该是 RSA');
  if (!jwk.n || !jwk.e || !jwk.d) throw new Error('缺少必要字段');
});

// ============ 3. 加密私钥导出 ============
console.log('\n--- 3. 加密私钥导出 ---');

test('3.1 加密私钥 - aes-256-cbc', () => {
  const keyObj = crypto.createPrivateKey(privateKey);
  const encrypted = keyObj.export({
    format: 'pem',
    type: 'pkcs8',
    cipher: 'aes-256-cbc',
    passphrase: 'secret123'
  });
  if (typeof encrypted !== 'string') throw new Error('应该返回字符串');
  if (!encrypted.includes('ENCRYPTED')) throw new Error('应该是加密的私钥');
});

test('3.2 加密私钥 - aes-128-cbc', () => {
  const keyObj = crypto.createPrivateKey(privateKey);
  const encrypted = keyObj.export({
    format: 'pem',
    type: 'pkcs8',
    cipher: 'aes-128-cbc',
    passphrase: 'secret123'
  });
  if (!encrypted.includes('ENCRYPTED')) throw new Error('应该是加密的私钥');
});

test('3.3 加密私钥 - des-ede3-cbc', () => {
  const keyObj = crypto.createPrivateKey(privateKey);
  const encrypted = keyObj.export({
    format: 'pem',
    type: 'pkcs8',
    cipher: 'des-ede3-cbc',
    passphrase: 'secret123'
  });
  if (!encrypted.includes('ENCRYPTED')) throw new Error('应该是加密的私钥');
});

test('3.4 加密私钥导入 - 正确的 passphrase', () => {
  const keyObj = crypto.createPrivateKey(privateKey);
  const encrypted = keyObj.export({
    format: 'pem',
    type: 'pkcs8',
    cipher: 'aes-256-cbc',
    passphrase: 'correct'
  });
  
  const decrypted = crypto.createPrivateKey({
    key: encrypted,
    format: 'pem',
    passphrase: 'correct'
  });
  
  if (decrypted.type !== 'private') throw new Error('解密失败');
});

test('3.5 加密私钥导入 - 错误的 passphrase 应失败', () => {
  const keyObj = crypto.createPrivateKey(privateKey);
  const encrypted = keyObj.export({
    format: 'pem',
    type: 'pkcs8',
    cipher: 'aes-256-cbc',
    passphrase: 'correct'
  });
  
  try {
    crypto.createPrivateKey({
      key: encrypted,
      format: 'pem',
      passphrase: 'wrong'
    });
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
    // 密码错误，符合预期
  }
});

// ============ 4. crypto.constants 验证 ============
console.log('\n--- 4. crypto.constants 验证 ---');

test('4.1 RSA_PKCS1_PADDING 值', () => {
  if (crypto.constants.RSA_PKCS1_PADDING !== 1) {
    throw new Error(`RSA_PKCS1_PADDING 应该是 1，实际是 ${crypto.constants.RSA_PKCS1_PADDING}`);
  }
});

test('4.2 RSA_NO_PADDING 值', () => {
  if (crypto.constants.RSA_NO_PADDING !== 3) {
    throw new Error(`RSA_NO_PADDING 应该是 3，实际是 ${crypto.constants.RSA_NO_PADDING}`);
  }
});

test('4.3 RSA_PKCS1_OAEP_PADDING 值', () => {
  if (crypto.constants.RSA_PKCS1_OAEP_PADDING !== 4) {
    throw new Error(`RSA_PKCS1_OAEP_PADDING 应该是 4，实际是 ${crypto.constants.RSA_PKCS1_OAEP_PADDING}`);
  }
});

test('4.4 RSA_PKCS1_PSS_PADDING 值', () => {
  if (crypto.constants.RSA_PKCS1_PSS_PADDING !== 6) {
    throw new Error(`RSA_PKCS1_PSS_PADDING 应该是 6，实际是 ${crypto.constants.RSA_PKCS1_PSS_PADDING}`);
  }
});

test('4.5 RSA_PSS_SALTLEN_DIGEST 值', () => {
  if (crypto.constants.RSA_PSS_SALTLEN_DIGEST !== -1) {
    throw new Error(`RSA_PSS_SALTLEN_DIGEST 应该是 -1，实际是 ${crypto.constants.RSA_PSS_SALTLEN_DIGEST}`);
  }
});

test('4.6 RSA_PSS_SALTLEN_MAX_SIGN 值', () => {
  if (crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN !== -2) {
    throw new Error(`RSA_PSS_SALTLEN_MAX_SIGN 应该是 -2，实际是 ${crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN}`);
  }
});

test('4.7 RSA_PSS_SALTLEN_AUTO 值', () => {
  if (crypto.constants.RSA_PSS_SALTLEN_AUTO !== -2) {
    throw new Error(`RSA_PSS_SALTLEN_AUTO 应该是 -2，实际是 ${crypto.constants.RSA_PSS_SALTLEN_AUTO}`);
  }
});

// ============ 5. 错误处理 - 无效输入 ============
console.log('\n--- 5. 错误处理 - 无效输入 ---');

test('5.1 createPublicKey - 无效的 PEM', () => {
  try {
    crypto.createPublicKey('invalid pem string');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
    // 预期的错误
  }
});

test('5.2 createPublicKey - 空字符串', () => {
  try {
    crypto.createPublicKey('');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
    // 预期的错误
  }
});

test('5.3 createPublicKey - 无效的 JWK (缺少 n)', () => {
  try {
    crypto.createPublicKey({
      key: { kty: 'RSA', e: 'AQAB' },
      format: 'jwk'
    });
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
    // 预期的错误
  }
});

test('5.4 createPublicKey - 无效的 JWK (缺少 e)', () => {
  try {
    crypto.createPublicKey({
      key: { kty: 'RSA', n: 'test' },
      format: 'jwk'
    });
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
    // 预期的错误
  }
});

test('5.5 createPublicKey - 错误的 kty', () => {
  try {
    crypto.createPublicKey({
      key: { kty: 'EC', n: 'test', e: 'AQAB' },
      format: 'jwk'
    });
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
    // 预期的错误
  }
});

test('5.6 createPrivateKey - 无效的 PEM', () => {
  try {
    crypto.createPrivateKey('invalid private key');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
    // 预期的错误
  }
});

test('5.7 createPrivateKey - 公钥当私钥', () => {
  try {
    const pubPem = publicKey.export({ format: 'pem', type: 'spki' });
    crypto.createPrivateKey(pubPem);
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message === '应该抛出错误') throw e;
    // 预期的错误
  }
});

// ============ 6. 格式互转测试 ============
console.log('\n--- 6. 格式互转测试 ---');

test('6.1 PEM → DER → PEM 往返', () => {
  const pem1 = publicKey.export({ format: 'pem', type: 'spki' });
  const der = publicKey.export({ format: 'der', type: 'spki' });
  const keyObj = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
  const pem2 = keyObj.export({ format: 'pem', type: 'spki' });
  
  // 去掉空白字符比较
  const normalize = (s) => s.replace(/\s/g, '');
  if (normalize(pem1) !== normalize(pem2)) {
    throw new Error('PEM 往返后不一致');
  }
});

test('6.2 PEM → JWK → PEM 往返', () => {
  const jwk = publicKey.export({ format: 'jwk' });
  const keyObj = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const pem = keyObj.export({ format: 'pem', type: 'spki' });
  
  if (!pem.includes('BEGIN PUBLIC KEY')) throw new Error('转换失败');
});

test('6.3 SPKI → PKCS1 转换', () => {
  const spki = publicKey.export({ format: 'pem', type: 'spki' });
  const keyObj = crypto.createPublicKey(spki);
  const pkcs1 = keyObj.export({ format: 'pem', type: 'pkcs1' });
  
  if (!pkcs1.includes('BEGIN RSA PUBLIC KEY')) throw new Error('转换失败');
});

test('6.4 PKCS8 → PKCS1 转换 (私钥)', () => {
  const pkcs8 = privateKey.export({ format: 'pem', type: 'pkcs8' });
  const keyObj = crypto.createPrivateKey(pkcs8);
  const pkcs1 = keyObj.export({ format: 'pem', type: 'pkcs1' });
  
  if (!pkcs1.includes('BEGIN RSA PRIVATE KEY')) throw new Error('转换失败');
});

// ============ 7. 边界条件测试 ============
console.log('\n--- 7. 边界条件测试 ---');

test('7.1 最小密钥长度 - 1024 位', () => {
  const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024
  });
  const keyObj = crypto.createPublicKey(pub);
  const details = keyObj.asymmetricKeyDetails;
  if (details.modulusLength !== 1024) throw new Error('modulusLength 不正确');
});

test('7.2 大密钥长度 - 4096 位', () => {
  const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096
  });
  const keyObj = crypto.createPublicKey(pub);
  const details = keyObj.asymmetricKeyDetails;
  if (details.modulusLength !== 4096) throw new Error('modulusLength 不正确');
});

test('7.3 publicExponent = 3', () => {
  const { publicKey: pub } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 3
  });
  const keyObj = crypto.createPublicKey(pub);
  const details = keyObj.asymmetricKeyDetails;
  const exp = BigInt(details.publicExponent);
  if (exp !== 3n) throw new Error(`publicExponent 应该是 3，实际是 ${exp}`);
});

test('7.4 publicExponent = 65537 (默认)', () => {
  const { publicKey: pub } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 65537
  });
  const keyObj = crypto.createPublicKey(pub);
  const details = keyObj.asymmetricKeyDetails;
  const exp = BigInt(details.publicExponent);
  if (exp !== 65537n) throw new Error(`publicExponent 应该是 65537，实际是 ${exp}`);
});

// ============ 8. 密钥一致性验证 ============
console.log('\n--- 8. 密钥一致性验证 ---');

test('8.1 公钥从私钥提取一致性', () => {
  const privKeyObj = crypto.createPrivateKey(privateKey);
  const pubFromPriv = crypto.createPublicKey(privKeyObj);
  const pubDirect = crypto.createPublicKey(publicKey);
  
  const pem1 = pubFromPriv.export({ format: 'pem', type: 'spki' });
  const pem2 = pubDirect.export({ format: 'pem', type: 'spki' });
  
  const normalize = (s) => s.replace(/\s/g, '');
  if (normalize(pem1) !== normalize(pem2)) {
    throw new Error('从私钥提取的公钥与原公钥不一致');
  }
});

test('8.2 加密解密验证密钥对匹配', () => {
  const data = Buffer.from('test data');
  const encrypted = crypto.publicEncrypt(publicKey, data);
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  
  if (decrypted.toString() !== 'test data') {
    throw new Error('密钥对不匹配');
  }
});

test('8.3 签名验签验证密钥对匹配', () => {
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign(privateKey);
  
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  const valid = verify.verify(publicKey, signature);
  
  if (!valid) throw new Error('密钥对不匹配');
});

// ============ 9. getHashes() 和 getCiphers() ============
console.log('\n--- 9. getHashes() 和 getCiphers() ---');

test('9.1 getHashes() 返回数组', () => {
  const hashes = crypto.getHashes();
  if (!Array.isArray(hashes)) throw new Error('应该返回数组');
  if (hashes.length === 0) throw new Error('不应该为空');
});

test('9.2 getHashes() 包含常用算法', () => {
  const hashes = crypto.getHashes();
  const required = ['md5', 'sha1', 'sha256', 'sha512'];
  for (const algo of required) {
    if (!hashes.includes(algo)) {
      throw new Error(`缺少算法: ${algo}`);
    }
  }
});

test('9.3 getCiphers() 返回数组', () => {
  const ciphers = crypto.getCiphers();
  if (!Array.isArray(ciphers)) throw new Error('应该返回数组');
  if (ciphers.length === 0) throw new Error('不应该为空');
});

test('9.4 getCiphers() 包含 AES', () => {
  const ciphers = crypto.getCiphers();
  const hasAES = ciphers.some(c => c.includes('aes'));
  if (!hasAES) throw new Error('应该包含 AES 相关算法');
});

// ============ 总结 ============
console.log('\n========================================');
console.log('  Part 5 测试总结');
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
