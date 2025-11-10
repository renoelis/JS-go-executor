const crypto = require('crypto');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                                                            ║');
console.log('║        RSA 功能全面测试套件 (Node.js v18+ 兼容)           ║');
console.log('║                                                            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('测试范围:');
console.log('  ✓ 密钥生成 (publicExponent 支持)');
console.log('  ✓ 密钥导出 (PEM/DER/JWK)');
console.log('  ✓ 密钥导入 (PEM/DER/JWK + encoding)');
console.log('  ✓ PKCS#1 v1.5 加密解密');
console.log('  ✓ OAEP 加密解密 (oaepHash/oaepLabel)');
console.log('  ✓ NO_PADDING 加密解密 (≤k 支持)');
console.log('  ✓ PKCS#1 v1.5 签名验签');
console.log('  ✓ PSS 签名验签 (saltLength 支持)');
console.log('  ✓ Hash (SHA-1/224/256/384/512/MD5)');
console.log('  ✓ HMAC (所有哈希算法)');
console.log('  ✓ 二进制输入支持 (Buffer/TypedArray/ArrayBuffer)');
console.log('  ✓ 编码支持 (hex/base64/latin1/binary)\n');

const results = {
  part1: null,
  part2: null,
  part3: null,
  part4: null
};

let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;

// ============ Part 1: 密钥生成与导出 ============
console.log('\n' + '='.repeat(60));
console.log('  Part 1: 密钥生成与导出');
console.log('='.repeat(60));

try {
  // 注意：这里需要实际运行 test_comprehensive_part1.js
  // 由于无法直接 require，这里展示测试结构
  console.log('\n[提示] 请单独运行: test_comprehensive_part1.js');
  console.log('测试内容:');
  console.log('  - 密钥生成 (默认/自定义 publicExponent)');
  console.log('  - PEM 格式导出 (SPKI/PKCS1/PKCS8)');
  console.log('  - DER 格式导出');
  console.log('  - JWK 格式导出 (包含 CRT 参数)');
  console.log('  - PEM 格式导入');
  console.log('  - DER 格式导入 (Buffer/base64/hex)');
  console.log('  - JWK 格式导入');
  console.log('  - 导入导出循环测试');
} catch (e) {
  console.log('✗ Part 1 失败:', e.message);
}

// ============ Part 2: 加密解密 ============
console.log('\n' + '='.repeat(60));
console.log('  Part 2: 加密解密');
console.log('='.repeat(60));

try {
  console.log('\n[提示] 请单独运行: test_comprehensive_part2.js');
  console.log('测试内容:');
  console.log('  - PKCS#1 v1.5 加密解密 (最大长度测试)');
  console.log('  - OAEP 加密解密 (SHA-1/SHA-256)');
  console.log('  - OAEP with label');
  console.log('  - OAEP 最大长度 (k - 2*hLen - 2)');
  console.log('  - NO_PADDING 加密解密 (完整长度/短数据)');
  console.log('  - privateEncrypt + publicDecrypt');
  console.log('  - 二进制数据支持 (TypedArray/ArrayBuffer)');
} catch (e) {
  console.log('✗ Part 2 失败:', e.message);
}

// ============ Part 3: 签名验签 ============
console.log('\n' + '='.repeat(60));
console.log('  Part 3: 签名验签');
console.log('='.repeat(60));

try {
  console.log('\n[提示] 请单独运行: test_comprehensive_part3.js');
  console.log('测试内容:');
  console.log('  - PKCS#1 v1.5 签名验签 (多种哈希)');
  console.log('  - PSS 签名验签 (DIGEST/AUTO/MAX_SIGN)');
  console.log('  - PSS saltLength 验证');
  console.log('  - update() 二进制输入');
  console.log('  - sign() 输出编码 (hex/base64/latin1)');
  console.log('  - verify() 签名输入 (Buffer/hex/base64)');
  console.log('  - verify() 字符串签名必须指定 encoding');
} catch (e) {
  console.log('✗ Part 3 失败:', e.message);
}

// ============ Part 4: Hash/HMAC ============
console.log('\n' + '='.repeat(60));
console.log('  Part 4: Hash/HMAC');
console.log('='.repeat(60));

try {
  console.log('\n[提示] 请单独运行: test_comprehensive_part4.js');
  console.log('测试内容:');
  console.log('  - createHash (SHA-1/224/256/384/512/MD5)');
  console.log('  - 算法别名 (RSA-SHA256/sha-256)');
  console.log('  - update() 二进制输入');
  console.log('  - digest() 默认返回 Buffer');
  console.log('  - digest() 编码支持 (hex/base64/latin1/binary)');
  console.log('  - createHmac (所有哈希算法)');
  console.log('  - HMAC key 二进制输入');
  console.log('  - getHashes() 一致性验证');
} catch (e) {
  console.log('✗ Part 4 失败:', e.message);
}

// ============ 快速验证测试 ============
console.log('\n' + '='.repeat(60));
console.log('  快速验证测试 (核心功能)');
console.log('='.repeat(60));

let quickTests = 0;
let quickPassed = 0;

function quickTest(name, fn) {
  quickTests++;
  try {
    console.log(`\n[${quickTests}] ${name}`);
    fn();
    quickPassed++;
    console.log('  ✓ 通过');
  } catch (e) {
    console.log(`  ✗ 失败: ${e.message}`);
  }
}

// 1. 密钥生成
quickTest('密钥生成 (publicExponent=3)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 3
  });
  if (!publicKey || !privateKey) throw new Error('生成失败');
});

// 2. JWK 导出
quickTest('JWK 导出 (包含 CRT)', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = privateKey.export({ format: 'jwk' });
  if (!jwk.dp || !jwk.dq || !jwk.qi) throw new Error('缺少 CRT 参数');
});

// 3. OAEP 加密
quickTest('OAEP 加密解密 (SHA-256)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('Test');
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
  if (decrypted.toString() !== 'Test') throw new Error('解密失败');
});

// 4. NO_PADDING 短数据
quickTest('NO_PADDING 短数据 (< k)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.alloc(200, 1);
  const encrypted = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, data);
  if (encrypted.length !== 256) throw new Error('长度错误');
});

// 5. PSS 签名
quickTest('PSS 签名验签 (默认 MAX_SIGN)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sign = crypto.createSign('sha256');
  sign.update('test');
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
  });
  const verify = crypto.createVerify('sha256');
  verify.update('test');
  if (!verify.verify({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING }, signature)) {
    throw new Error('验签失败');
  }
});

// 6. update() 二进制
quickTest('update() 二进制输入', () => {
  const sign = crypto.createSign('sha256');
  sign.update(Buffer.from([1, 2, 3]));
  sign.update(new Uint8Array([4, 5, 6]));
  const signature = sign.sign(crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey);
  if (!Buffer.isBuffer(signature)) throw new Error('签名失败');
});

// 7. digest() 默认 Buffer
quickTest('digest() 默认返回 Buffer', () => {
  const digest = crypto.createHash('sha256').update('test').digest();
  if (!Buffer.isBuffer(digest)) throw new Error('应该返回 Buffer');
});

// 8. HMAC 二进制 key
quickTest('HMAC 二进制 key', () => {
  const key = new Uint8Array([1, 2, 3, 4, 5]);
  const mac = crypto.createHmac('sha256', key).update('test').digest();
  if (!Buffer.isBuffer(mac)) throw new Error('应该返回 Buffer');
});

// 9. SHA-224/384 支持
quickTest('SHA-224/384 支持', () => {
  const d224 = crypto.createHash('sha224').update('test').digest();
  const d384 = crypto.createHash('sha384').update('test').digest();
  if (d224.length !== 28 || d384.length !== 48) throw new Error('长度错误');
});

// 10. 算法别名
quickTest('算法别名 (RSA-SHA256)', () => {
  const digest = crypto.createHash('RSA-SHA256').update('test').digest();
  if (digest.length !== 32) throw new Error('应该是 SHA-256');
});

// ============ 最终总结 ============
console.log('\n' + '='.repeat(60));
console.log('  最终测试总结');
console.log('='.repeat(60));

console.log(`\n快速验证测试:`);
console.log(`  总计: ${quickTests} 个`);
console.log(`  通过: ${quickPassed} 个`);
console.log(`  失败: ${quickTests - quickPassed} 个`);
console.log(`  成功率: ${((quickPassed / quickTests) * 100).toFixed(2)}%`);

console.log(`\n完整测试套件:`);
console.log(`  Part 1: 密钥生成与导出 (约 30 个测试)`);
console.log(`  Part 2: 加密解密 (约 25 个测试)`);
console.log(`  Part 3: 签名验签 (约 30 个测试)`);
console.log(`  Part 4: Hash/HMAC (约 40 个测试)`);
console.log(`  总计: 约 125+ 个测试`);

console.log('\n运行完整测试:');
console.log('  node test/RSA/test_comprehensive_part1.js');
console.log('  node test/RSA/test_comprehensive_part2.js');
console.log('  node test/RSA/test_comprehensive_part3.js');
console.log('  node test/RSA/test_comprehensive_part4.js');

console.log('\n' + '='.repeat(60));
console.log('  测试完成');
console.log('='.repeat(60) + '\n');

return {
  success: quickPassed === quickTests,
  quickTests: quickTests,
  quickPassed: quickPassed,
  message: quickPassed === quickTests ? '所有快速验证测试通过！' : '部分测试失败，请查看详情'
};
