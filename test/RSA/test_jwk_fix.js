// JWK 格式测试 - 验证修复

const crypto = require('crypto');

console.log('========================================');
console.log('  JWK 格式测试（修复验证）');
console.log('========================================\n');

// 生成测试密钥对
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048
});

console.log('✓ 密钥对生成成功');

// 测试 1: 公钥导出为 JWK
console.log('\n[测试 1] 公钥导出为 JWK');
const publicJwk = publicKey.export({ format: 'jwk' });
console.log('✓ 公钥 JWK:', JSON.stringify(publicJwk, null, 2));

// 测试 2: 从 JWK 导入公钥（完整字段）
console.log('\n[测试 2] 从 JWK 导入公钥（完整字段）');
try {
  const importedPublicKey = crypto.createPublicKey({
    key: publicJwk,
    format: 'jwk'
  });
  console.log('✓ 从完整 JWK 导入公钥成功');
  console.log('  - type:', importedPublicKey.type);
  console.log('  - asymmetricKeyType:', importedPublicKey.asymmetricKeyType);
} catch (err) {
  console.error('✗ 失败:', err.message);
}

// 测试 3: 从 JWK 导入公钥（最小字段）
console.log('\n[测试 3] 从 JWK 导入公钥（最小字段 - kty, n, e）');
try {
  const minimalJwk = {
    kty: publicJwk.kty,
    n: publicJwk.n,
    e: publicJwk.e
  };
  console.log('最小 JWK:', JSON.stringify(minimalJwk, null, 2));
  
  const importedPublicKey = crypto.createPublicKey({
    key: minimalJwk,
    format: 'jwk'
  });
  console.log('✓ 从最小 JWK 导入公钥成功');
  console.log('  - type:', importedPublicKey.type);
  console.log('  - asymmetricKeyType:', importedPublicKey.asymmetricKeyType);
} catch (err) {
  console.error('✗ 失败:', err.message);
  console.error('  Stack:', err.stack);
}

// 测试 4: 私钥导出为 JWK
console.log('\n[测试 4] 私钥导出为 JWK');
const privateJwk = privateKey.export({ format: 'jwk' });
console.log('✓ 私钥 JWK 字段:', Object.keys(privateJwk).join(', '));

// 测试 5: 从 JWK 导入私钥
console.log('\n[测试 5] 从 JWK 导入私钥');
try {
  const importedPrivateKey = crypto.createPrivateKey({
    key: privateJwk,
    format: 'jwk'
  });
  console.log('✓ 从 JWK 导入私钥成功');
  console.log('  - type:', importedPrivateKey.type);
  console.log('  - asymmetricKeyType:', importedPrivateKey.asymmetricKeyType);
} catch (err) {
  console.error('✗ 失败:', err.message);
}

// 测试 6: JWK 往返转换（公钥）
console.log('\n[测试 6] JWK 往返转换（公钥）');
try {
  const jwk1 = publicKey.export({ format: 'jwk' });
  const keyObj = crypto.createPublicKey({ key: jwk1, format: 'jwk' });
  const jwk2 = keyObj.export({ format: 'jwk' });
  
  if (jwk1.n === jwk2.n && jwk1.e === jwk2.e && jwk1.kty === jwk2.kty) {
    console.log('✓ JWK 往返转换一致');
  } else {
    console.error('✗ JWK 往返转换不一致');
  }
} catch (err) {
  console.error('✗ 失败:', err.message);
}

// 测试 7: JWK 往返转换（私钥）
console.log('\n[测试 7] JWK 往返转换（私钥）');
try {
  const jwk1 = privateKey.export({ format: 'jwk' });
  const keyObj = crypto.createPrivateKey({ key: jwk1, format: 'jwk' });
  const jwk2 = keyObj.export({ format: 'jwk' });
  
  if (jwk1.n === jwk2.n && jwk1.d === jwk2.d && jwk1.kty === jwk2.kty) {
    console.log('✓ JWK 往返转换一致');
  } else {
    console.error('✗ JWK 往返转换不一致');
  }
} catch (err) {
  console.error('✗ 失败:', err.message);
}

// 测试 8: 使用 JWK 密钥进行加密解密
console.log('\n[测试 8] 使用 JWK 密钥进行加密解密');
try {
  const publicJwk = publicKey.export({ format: 'jwk' });
  const privateJwk = privateKey.export({ format: 'jwk' });
  
  const pubKeyObj = crypto.createPublicKey({ key: publicJwk, format: 'jwk' });
  const privKeyObj = crypto.createPrivateKey({ key: privateJwk, format: 'jwk' });
  
  const plaintext = Buffer.from('Hello JWK!', 'utf8');
  const encrypted = crypto.publicEncrypt(pubKeyObj, plaintext);
  const decrypted = crypto.privateDecrypt(privKeyObj, encrypted);
  
  if (decrypted.toString('utf8') === 'Hello JWK!') {
    console.log('✓ JWK 密钥加密解密成功');
  } else {
    console.error('✗ 解密结果不匹配');
  }
} catch (err) {
  console.error('✗ 失败:', err.message);
}

console.log('\n========================================');
console.log('  JWK 测试完成');
console.log('========================================');

