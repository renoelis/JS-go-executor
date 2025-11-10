// RSA-PSS 密钥生成测试（独立测试，无需服务器）

const crypto = require('crypto');

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failCount++;
    console.error(`✗ ${name}:`, err.message);
  }
}

console.log('========================================');
console.log('  RSA-PSS 密钥生成测试');
console.log('========================================\n');

test('1. 生成 RSA-PSS 密钥对', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 32
  });
  
  if (publicKey.type !== 'public') throw new Error('publicKey.type 应为 public');
  if (publicKey.asymmetricKeyType !== 'rsa-pss') throw new Error('asymmetricKeyType 应为 rsa-pss');
  if (privateKey.type !== 'private') throw new Error('privateKey.type 应为 private');
  if (privateKey.asymmetricKeyType !== 'rsa-pss') throw new Error('privateKey.asymmetricKeyType 应为 rsa-pss');
});

test('2. asymmetricKeyDetails 字段（有参数）', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 32
  });
  
  const det = publicKey.asymmetricKeyDetails;
  if (det.modulusLength !== 2048) throw new Error('modulusLength 应为 2048');
  if (det.hashAlgorithm !== 'sha256') throw new Error('hashAlgorithm 应为 sha256');
  if (det.mgf1HashAlgorithm !== 'sha256') throw new Error('mgf1HashAlgorithm 应为 sha256');
  if (det.saltLength !== 32) throw new Error('saltLength 应为 32');
});

test('3. 使用 RSA-PSS 密钥签名和验证', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 32
  });
  
  const data = Buffer.from('RSA-PSS test data');
  
  const sign = crypto.createSign('sha256');
  sign.update(data);
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
  });
  
  if (signature.length !== 256) throw new Error(`签名长度应为 256，实际为 ${signature.length}`);
  
  const verify = crypto.createVerify('sha256');
  verify.update(data);
  const isValid = verify.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
  }, signature);
  
  if (!isValid) throw new Error('验证失败');
});

test('4. RSA-PSS 无参数时 details 为 undefined', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048
    // 不指定 hashAlgorithm, mgf1HashAlgorithm, saltLength
  });
  
  const det = publicKey.asymmetricKeyDetails;
  // Node.js 行为：不指定参数时，这些字段应为 undefined
  if (det.hashAlgorithm !== undefined) throw new Error(`hashAlgorithm 应为 undefined，实际为 ${det.hashAlgorithm}`);
  if (det.mgf1HashAlgorithm !== undefined) throw new Error(`mgf1HashAlgorithm 应为 undefined，实际为 ${det.mgf1HashAlgorithm}`);
  if (det.saltLength !== undefined) throw new Error(`saltLength 应为 undefined，实际为 ${det.saltLength}`);
});

test('5. RSA-PSS 部分参数（自动推导）', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha512'
    // 不指定 mgf1HashAlgorithm 和 saltLength，应该自动推导
  });
  
  const det = publicKey.asymmetricKeyDetails;
  if (det.hashAlgorithm !== 'sha512') throw new Error('hashAlgorithm 应为 sha512');
  if (det.mgf1HashAlgorithm !== 'sha512') throw new Error('mgf1HashAlgorithm 应自动等于 hashAlgorithm');
  if (det.saltLength !== 64) throw new Error('saltLength 应自动等于 SHA-512 长度 (64)');
});

test('6. RSA-PSS 密钥导出 PEM', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    saltLength: 32
  });
  
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  
  if (!pubPem.includes('BEGIN PUBLIC KEY')) throw new Error('公钥 PEM 格式错误');
  if (!privPem.includes('BEGIN PRIVATE KEY')) throw new Error('私钥 PEM 格式错误');
});

test('7. RSA-PSS 密钥导出 DER', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256'
  });
  
  const der = publicKey.export({ type: 'spki', format: 'der' });
  if (!Buffer.isBuffer(der)) throw new Error('DER 应返回 Buffer');
  if (der.length < 100) throw new Error('DER 长度异常');
});

test('8. RSA-PSS 密钥导出 JWK 应该失败', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256'
  });
  
  // Node.js 不支持 RSA-PSS 导出为 JWK
  try {
    const jwk = publicKey.export({ format: 'jwk' });
    throw new Error('应该抛出错误');
  } catch (err) {
    if (err.message === '应该抛出错误') throw err;
    if (!err.message.includes('Unsupported JWK Key Type')) throw new Error(`错误消息不匹配: ${err.message}`);
  }
});

test('9. 普通 rsa 类型仍然可用', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  if (publicKey.asymmetricKeyType !== 'rsa') throw new Error('普通 rsa 类型应为 rsa');
  const det = publicKey.asymmetricKeyDetails;
  // 普通 rsa 不应该有 PSS 字段
  if (det.hashAlgorithm !== undefined) throw new Error('普通 rsa 不应有 hashAlgorithm');
});

console.log('\n========================================');
console.log(`总计: ${testCount} 个测试`);
console.log(`通过: ${passCount}`);
console.log(`失败: ${failCount}`);
console.log(`成功率: ${((passCount / testCount) * 100).toFixed(1)}%`);
console.log('========================================');

if (failCount > 0) {
  process.exit(1);
}

