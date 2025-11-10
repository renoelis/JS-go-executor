const crypto = require('crypto');

/**
 * 密钥实际使用验证测试
 * 验证生成的密钥在实际场景中的可用性：
 * - RSA 加解密和签名验证
 * - EC 签名验证和 ECDH 密钥交换
 * - Ed25519/Ed448 签名验证
 * - X25519/X448 密钥交换
 * - DH 密钥交换
 * - DSA 签名验证
 */

const testResults = {
  total: 0,
  pass: 0,
  fail: 0,
  detail: []
};

function addResult(caseName, pass, expect, got, error = null, stack = null) {
  testResults.total++;
  if (pass) {
    testResults.pass++;
  } else {
    testResults.fail++;
  }
  const result = {
    case: caseName,
    pass,
    expect,
    got,
    error
  };
  if (stack) {
    result.stack = stack;
  }
  testResults.detail.push(result);
}

// ========== RSA 测试 ==========

// 测试 1: RSA 签名验证
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const data = Buffer.from('test message for RSA signature');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  // 验证错误数据应失败
  const wrongData = Buffer.from('wrong message');
  const wrongVerified = crypto.verify('sha256', wrongData, publicKey, signature);
  
  addResult(
    'RSA 签名验证',
    verified === true && wrongVerified === false,
    '正确数据验证通过，错误数据验证失败',
    `正确=${verified}, 错误=${wrongVerified}`
  );
} catch (err) {
  addResult('RSA 签名验证', false, '成功签名验证', err.message, err.message, err.stack);
}

// 测试 2: RSA 公钥加密，私钥解密
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const plaintext = Buffer.from('secret message');
  const encrypted = crypto.publicEncrypt(publicKey, plaintext);
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  
  const isValid = decrypted.toString() === plaintext.toString();
  
  addResult(
    'RSA 公钥加密私钥解密',
    isValid,
    '加解密成功且数据一致',
    `原文=${plaintext.toString()}, 解密=${decrypted.toString()}`
  );
} catch (err) {
  addResult('RSA 公钥加密私钥解密', false, '成功加解密', err.message, err.message, err.stack);
}

// 测试 3: RSA 私钥加密，公钥解密
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const plaintext = Buffer.from('test data');
  const encrypted = crypto.privateEncrypt(privateKey, plaintext);
  const decrypted = crypto.publicDecrypt(publicKey, encrypted);
  
  const isValid = decrypted.toString() === plaintext.toString();
  
  addResult(
    'RSA 私钥加密公钥解密',
    isValid,
    '加解密成功',
    `一致=${isValid}`
  );
} catch (err) {
  addResult('RSA 私钥加密公钥解密', false, '成功加解密', err.message, err.message, err.stack);
}

// 测试 4: RSA-PSS 签名验证
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 32
  });
  
  const data = Buffer.from('test message for RSA-PSS');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA-PSS 签名验证',
    verified === true,
    '签名验证通过',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS 签名验证', false, '成功签名验证', err.message, err.message, err.stack);
}

// ========== EC 测试 ==========

// 测试 5: EC 签名验证 (prime256v1)
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  
  const data = Buffer.from('test message for EC signature');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  // 验证错误签名应失败
  const wrongSignature = Buffer.from(signature);
  wrongSignature[0] ^= 0xFF; // 修改一个字节
  const wrongVerified = crypto.verify('sha256', data, publicKey, wrongSignature);
  
  addResult(
    'EC prime256v1 签名验证',
    verified === true && wrongVerified === false,
    '正确签名通过，错误签名失败',
    `正确=${verified}, 错误=${wrongVerified}`
  );
} catch (err) {
  addResult('EC prime256v1 签名验证', false, '成功签名验证', err.message, err.message, err.stack);
}

// 测试 6: EC ECDH 密钥交换 (prime256v1)
try {
  // 生成两对密钥
  const { publicKey: publicKey1, privateKey: privateKey1 } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  
  const { publicKey: publicKey2, privateKey: privateKey2 } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  
  // 使用 diffieHellman API（Node.js 推荐方式）
  const sharedSecret1 = crypto.diffieHellman({
    privateKey: privateKey1,
    publicKey: publicKey2
  });
  
  const sharedSecret2 = crypto.diffieHellman({
    privateKey: privateKey2,
    publicKey: publicKey1
  });
  
  const isEqual = sharedSecret1.equals(sharedSecret2);
  
  addResult(
    'EC prime256v1 ECDH 密钥交换',
    isEqual,
    '双方计算的共享密钥相同',
    `密钥长度=${sharedSecret1.length}, 相等=${isEqual}`
  );
} catch (err) {
  addResult('EC prime256v1 ECDH 密钥交换', false, '成功密钥交换', err.message, err.message, err.stack);
}

// 测试 7: EC 签名验证 (secp256k1)
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1'
  });
  
  const data = Buffer.from('test message for secp256k1');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'EC secp256k1 签名验证',
    verified === true,
    '签名验证通过',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('EC secp256k1 签名验证', false, '成功签名验证', err.message, err.message, err.stack);
}

// 测试 8: EC 签名验证 (secp384r1)
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp384r1'
  });
  
  const data = Buffer.from('test message for secp384r1');
  const signature = crypto.sign('sha384', data, privateKey);
  const verified = crypto.verify('sha384', data, publicKey, signature);
  
  addResult(
    'EC secp384r1 签名验证',
    verified === true,
    '签名验证通过',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('EC secp384r1 签名验证', false, '成功签名验证', err.message, err.message, err.stack);
}

// ========== Ed25519 测试 ==========

// 测试 9: Ed25519 签名验证
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  
  const data = Buffer.from('test message for Ed25519 signature');
  const signature = crypto.sign(null, data, privateKey);
  const verified = crypto.verify(null, data, publicKey, signature);
  
  // 验证错误数据应失败
  const wrongData = Buffer.from('wrong message for Ed25519');
  const wrongVerified = crypto.verify(null, wrongData, publicKey, signature);
  
  addResult(
    'Ed25519 签名验证',
    verified === true && wrongVerified === false,
    '正确数据验证通过，错误数据验证失败',
    `正确=${verified}, 错误=${wrongVerified}`
  );
} catch (err) {
  addResult('Ed25519 签名验证', false, '成功签名验证', err.message, err.message, err.stack);
}

// 测试 10: Ed25519 签名长度验证
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  
  const data = Buffer.from('test');
  const signature = crypto.sign(null, data, privateKey);
  
  // Ed25519 签名应该是 64 字节
  const isCorrectLength = signature.length === 64;
  
  addResult(
    'Ed25519 签名长度',
    isCorrectLength,
    '签名长度为64字节',
    `实际长度=${signature.length}`
  );
} catch (err) {
  addResult('Ed25519 签名长度', false, '签名长度正确', err.message, err.message, err.stack);
}

// 测试 11: Ed25519 跨格式验证（PEM 导出后验证）
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  // 重新导入为 KeyObject
  const pubKeyObj = crypto.createPublicKey(publicKey);
  const privKeyObj = crypto.createPrivateKey(privateKey);
  
  const data = Buffer.from('test cross-format');
  const signature = crypto.sign(null, data, privKeyObj);
  const verified = crypto.verify(null, data, pubKeyObj, signature);
  
  addResult(
    'Ed25519 跨格式验证',
    verified === true,
    'PEM导出后重新导入仍可验证',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('Ed25519 跨格式验证', false, '成功验证', err.message, err.message, err.stack);
}

// ========== Ed448 测试 ==========

// 测试 12: Ed448 签名验证
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed448');
  
  const data = Buffer.from('test message for Ed448 signature');
  const signature = crypto.sign(null, data, privateKey);
  const verified = crypto.verify(null, data, publicKey, signature);
  
  addResult(
    'Ed448 签名验证',
    verified === true,
    '签名验证通过',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('Ed448 签名验证', false, '成功签名验证', err.message, err.message, err.stack);
}

// 测试 13: Ed448 签名长度验证
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed448');
  
  const data = Buffer.from('test');
  const signature = crypto.sign(null, data, privateKey);
  
  // Ed448 签名应该是 114 字节
  const isCorrectLength = signature.length === 114;
  
  addResult(
    'Ed448 签名长度',
    isCorrectLength,
    '签名长度为114字节',
    `实际长度=${signature.length}`
  );
} catch (err) {
  addResult('Ed448 签名长度', false, '签名长度正确', err.message, err.message, err.stack);
}

// ========== X25519 测试 ==========

// 测试 14: X25519 密钥交换
try {
  const { publicKey: alicePublic, privateKey: alicePrivate } = crypto.generateKeyPairSync('x25519');
  const { publicKey: bobPublic, privateKey: bobPrivate } = crypto.generateKeyPairSync('x25519');
  
  // Alice 计算共享密钥
  const aliceShared = crypto.diffieHellman({
    privateKey: alicePrivate,
    publicKey: bobPublic
  });
  
  // Bob 计算共享密钥
  const bobShared = crypto.diffieHellman({
    privateKey: bobPrivate,
    publicKey: alicePublic
  });
  
  const isEqual = aliceShared.equals(bobShared);
  const isCorrectLength = aliceShared.length === 32; // X25519 共享密钥为 32 字节
  
  addResult(
    'X25519 密钥交换',
    isEqual && isCorrectLength,
    '双方计算的共享密钥相同且长度正确',
    `长度=${aliceShared.length}, 相等=${isEqual}`
  );
} catch (err) {
  addResult('X25519 密钥交换', false, '成功密钥交换', err.message, err.message, err.stack);
}

// 测试 15: X25519 密钥不同性
try {
  const { publicKey: pub1 } = crypto.generateKeyPairSync('x25519');
  const { publicKey: pub2 } = crypto.generateKeyPairSync('x25519');
  
  const key1 = pub1.export({ type: 'spki', format: 'der' });
  const key2 = pub2.export({ type: 'spki', format: 'der' });
  
  const isDifferent = !key1.equals(key2);
  
  addResult(
    'X25519 密钥唯一性',
    isDifferent,
    '每次生成的密钥应不同',
    `不同=${isDifferent}`
  );
} catch (err) {
  addResult('X25519 密钥唯一性', false, '密钥不同', err.message, err.message, err.stack);
}

// ========== X448 测试 ==========

// 测试 16: X448 密钥交换
try {
  const { publicKey: alicePublic, privateKey: alicePrivate } = crypto.generateKeyPairSync('x448');
  const { publicKey: bobPublic, privateKey: bobPrivate } = crypto.generateKeyPairSync('x448');
  
  const aliceShared = crypto.diffieHellman({
    privateKey: alicePrivate,
    publicKey: bobPublic
  });
  
  const bobShared = crypto.diffieHellman({
    privateKey: bobPrivate,
    publicKey: alicePublic
  });
  
  const isEqual = aliceShared.equals(bobShared);
  const isCorrectLength = aliceShared.length === 56; // X448 共享密钥为 56 字节
  
  addResult(
    'X448 密钥交换',
    isEqual && isCorrectLength,
    '双方计算的共享密钥相同且长度正确',
    `长度=${aliceShared.length}, 相等=${isEqual}`
  );
} catch (err) {
  addResult('X448 密钥交换', false, '成功密钥交换', err.message, err.message, err.stack);
}

// ========== DH 测试 ==========

// 测试 17: DH 密钥交换（使用标准组）
try {
  // Alice 和 Bob 使用相同的标准组 'modp14'
  const { publicKey: alicePublic, privateKey: alicePrivate } = crypto.generateKeyPairSync('dh', {
    group: 'modp14'
  });
  
  const { publicKey: bobPublic, privateKey: bobPrivate } = crypto.generateKeyPairSync('dh', {
    group: 'modp14'
  });
  
  // 计算共享密钥
  const aliceShared = crypto.diffieHellman({
    privateKey: alicePrivate,
    publicKey: bobPublic
  });
  
  const bobShared = crypto.diffieHellman({
    privateKey: bobPrivate,
    publicKey: alicePublic
  });
  
  const isEqual = aliceShared.equals(bobShared);
  
  addResult(
    'DH 密钥交换',
    isEqual,
    '双方计算的共享密钥相同',
    `密钥长度=${aliceShared.length}, 相等=${isEqual}`
  );
} catch (err) {
  addResult('DH 密钥交换', false, '成功密钥交换', err.message, err.message, err.stack);
}

// ========== DSA 测试 ==========

// 测试 18: DSA 签名验证
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: 256
  });
  
  const data = Buffer.from('test message for DSA signature');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  // 验证错误数据应失败
  const wrongData = Buffer.from('wrong message');
  const wrongVerified = crypto.verify('sha256', wrongData, publicKey, signature);
  
  addResult(
    'DSA 签名验证',
    verified === true && wrongVerified === false,
    '正确数据验证通过，错误数据验证失败',
    `正确=${verified}, 错误=${wrongVerified}`
  );
} catch (err) {
  addResult('DSA 签名验证', false, '成功签名验证', err.message, err.message, err.stack);
}

// ========== 跨密钥类型测试 ==========

// 测试 19: 不同 RSA 密钥不能互相验证
try {
  const { publicKey: pub1, privateKey: priv1 } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const { publicKey: pub2 } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const data = Buffer.from('test');
  const signature = crypto.sign('sha256', data, priv1);
  
  const correctVerify = crypto.verify('sha256', data, pub1, signature);
  const wrongVerify = crypto.verify('sha256', data, pub2, signature);
  
  addResult(
    'RSA 密钥隔离性',
    correctVerify === true && wrongVerify === false,
    '不同密钥对无法互相验证',
    `正确密钥=${correctVerify}, 错误密钥=${wrongVerify}`
  );
} catch (err) {
  addResult('RSA 密钥隔离性', false, '密钥隔离', err.message, err.message, err.stack);
}

// 测试 20: 不同 EC 密钥不能互相验证
try {
  const { publicKey: pub1, privateKey: priv1 } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  const { publicKey: pub2 } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  
  const data = Buffer.from('test');
  const signature = crypto.sign('sha256', data, priv1);
  
  const correctVerify = crypto.verify('sha256', data, pub1, signature);
  const wrongVerify = crypto.verify('sha256', data, pub2, signature);
  
  addResult(
    'EC 密钥隔离性',
    correctVerify === true && wrongVerify === false,
    '不同密钥对无法互相验证',
    `正确密钥=${correctVerify}, 错误密钥=${wrongVerify}`
  );
} catch (err) {
  addResult('EC 密钥隔离性', false, '密钥隔离', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== 实际使用验证测试结果 ==========\n');
for (const detail of testResults.detail) {
  console.log(`${detail.pass ? '✅' : '❌'} ${detail.case}`);
  if (!detail.pass) {
    console.log(`   期望: ${detail.expect}`);
    console.log(`   实际: ${detail.got}`);
    if (detail.error) {
      console.log(`   错误: ${detail.error}`);
    }
  }
}

console.log('\n========== 汇总 ==========');
console.log(`总计: ${summary.total}`);
console.log(`通过: ${summary.pass} ✅`);
console.log(`失败: ${summary.fail} ❌`);
console.log(`成功率: ${((summary.pass / summary.total) * 100).toFixed(2)}%`);

const result = {
  success: summary.fail === 0,
  summary,
  detail: testResults.detail
};

console.log('\n' + JSON.stringify(result, null, 2));
return result;

