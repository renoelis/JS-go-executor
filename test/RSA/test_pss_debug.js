const crypto = require('crypto');

console.log('=== PSS saltLength 调试测试 ===\n');

// 生成密钥
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048
});

console.log('常量值:');
console.log('RSA_PSS_SALTLEN_DIGEST:', crypto.constants.RSA_PSS_SALTLEN_DIGEST);
console.log('RSA_PSS_SALTLEN_AUTO:', crypto.constants.RSA_PSS_SALTLEN_AUTO);
console.log('RSA_PSS_SALTLEN_MAX_SIGN:', crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN);
console.log('');

try {
  console.log('测试 1: 使用 SALTLEN_DIGEST (-1)');
  const sign1 = crypto.createSign('sha256');
  sign1.update('test message');
  const signature1 = sign1.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
  });
  console.log('✓ 签名成功，长度:', signature1.length);
  
  const verify1 = crypto.createVerify('sha256');
  verify1.update('test message');
  const valid1 = verify1.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
  }, signature1);
  console.log('✓ 验证结果:', valid1);
} catch (e) {
  console.log('✗ 错误:', e.message);
  console.log('Stack:', e.stack);
}

console.log('');

try {
  console.log('测试 2: 使用 SALTLEN_AUTO (-2)');
  const sign2 = crypto.createSign('sha256');
  sign2.update('test message');
  const signature2 = sign2.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_AUTO
  });
  console.log('✓ 签名成功，长度:', signature2.length);
  
  const verify2 = crypto.createVerify('sha256');
  verify2.update('test message');
  const valid2 = verify2.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_AUTO
  }, signature2);
  console.log('✓ 验证结果:', valid2);
} catch (e) {
  console.log('✗ 错误:', e.message);
  console.log('Stack:', e.stack);
}

console.log('');

try {
  console.log('测试 3: 使用具体值 saltLength=32');
  const sign3 = crypto.createSign('sha256');
  sign3.update('test message');
  const signature3 = sign3.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32
  });
  console.log('✓ 签名成功，长度:', signature3.length);
  
  const verify3 = crypto.createVerify('sha256');
  verify3.update('test message');
  const valid3 = verify3.verify({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32
  }, signature3);
  console.log('✓ 验证结果:', valid3);
} catch (e) {
  console.log('✗ 错误:', e.message);
  console.log('Stack:', e.stack);
}

return { success: true };
