// 测试 Node.js 原生的 KeyObject 幂等性行为

const crypto = require('crypto');

console.log('Node.js 版本:', process.version);
console.log('========================================\n');

// 测试 1: 标准 publicExponent (65537)
console.log('[测试 1] 标准 publicExponent (65537)');
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 65537
  });
  
  console.log('✓ 密钥生成成功');
  console.log('  publicKey 类型:', typeof publicKey);
  console.log('  publicKey.type:', publicKey.type);
  console.log('  publicKey.asymmetricKeyType:', publicKey.asymmetricKeyType);
  
  // 尝试再调用 createPublicKey
  const keyObj = crypto.createPublicKey(publicKey);
  console.log('✓ createPublicKey(publicKey) 成功');
  console.log('  返回的 keyObj === publicKey:', keyObj === publicKey);
  
} catch (err) {
  console.error('✗ 失败:', err.message);
}

console.log('\n========================================\n');

// 测试 2: 非标准 publicExponent (3)
console.log('[测试 2] 非标准 publicExponent (3)');
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 3
  });
  
  console.log('✓ 密钥生成成功');
  console.log('  publicKey 类型:', typeof publicKey);
  console.log('  publicKey.type:', publicKey.type);
  console.log('  publicExponent:', publicKey.asymmetricKeyDetails.publicExponent);
  
  // 尝试再调用 createPublicKey
  const keyObj = crypto.createPublicKey(publicKey);
  console.log('✓ createPublicKey(publicKey) 成功');
  console.log('  返回的 keyObj === publicKey:', keyObj === publicKey);
  
} catch (err) {
  console.error('✗ 失败:', err.message);
  console.error('  Stack:', err.stack);
}

console.log('\n========================================\n');

// 测试 3: 使用 encoding 选项生成（返回字符串而不是 KeyObject）
console.log('[测试 3] 使用 publicKeyEncoding 生成（返回 PEM 字符串）');
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 3,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  console.log('✓ 密钥生成成功');
  console.log('  publicKey 类型:', typeof publicKey);
  console.log('  是字符串:', typeof publicKey === 'string');
  console.log('  PEM 前缀:', publicKey.substring(0, 30));
  
  // 从 PEM 创建 KeyObject
  const keyObj = crypto.createPublicKey(publicKey);
  console.log('✓ createPublicKey(pemString) 成功');
  console.log('  keyObj.type:', keyObj.type);
  console.log('  publicExponent:', keyObj.asymmetricKeyDetails.publicExponent);
  
} catch (err) {
  console.error('✗ 失败:', err.message);
}

console.log('\n========================================\n');

// 测试 4: 从私钥 KeyObject 创建公钥
console.log('[测试 4] 从私钥 KeyObject 创建公钥');
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 17
  });
  
  console.log('✓ 密钥生成成功');
  
  // 从私钥创建公钥
  const derivedPublicKey = crypto.createPublicKey(privateKey);
  console.log('✓ createPublicKey(privateKey) 成功');
  console.log('  derivedPublicKey.type:', derivedPublicKey.type);
  console.log('  publicExponent:', derivedPublicKey.asymmetricKeyDetails.publicExponent);
  
} catch (err) {
  console.error('✗ 失败:', err.message);
}

