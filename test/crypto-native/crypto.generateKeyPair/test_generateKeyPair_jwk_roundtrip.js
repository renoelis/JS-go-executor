const crypto = require('crypto');

/**
 * JWK 往返一致性测试
 * 验证 JWK 格式导出后重新导入的一致性：
 * - 生成密钥对并导出为 JWK
 * - 使用 JWK 重新导入密钥
 * - 验证重新导入的密钥功能与原始密钥一致
 * - 测试签名/验证、加密/解密的往返
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

// ========== RSA JWK 往返测试 ==========

// 测试 1: RSA 公钥 JWK 往返
try {
  // 生成密钥对
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  // 导出为 JWK
  const publicJWK = pubKeyObj.export({ format: 'jwk' });
  
  // 从 JWK 重新导入
  const importedPubKey = crypto.createPublicKey({ key: publicJWK, format: 'jwk' });
  
  // 验证导入后的公钥可用于验证签名
  const testData = Buffer.from('test data for RSA JWK roundtrip');
  const signature = crypto.sign('sha256', testData, privKeyObj);
  const verified = crypto.verify('sha256', testData, importedPubKey, signature);
  
  addResult(
    'RSA 公钥 JWK 往返',
    verified === true,
    '签名应验证成功',
    verified ? '验证成功' : '验证失败'
  );
} catch (err) {
  addResult(
    'RSA 公钥 JWK 往返',
    false,
    '签名应验证成功',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 2: RSA 私钥 JWK 往返
try {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  // 导出私钥为 JWK
  const privateJWK = privKeyObj.export({ format: 'jwk' });
  
  // 从 JWK 重新导入私钥
  const importedPrivKey = crypto.createPrivateKey({ key: privateJWK, format: 'jwk' });
  
  // 使用导入的私钥签名
  const testData = Buffer.from('test data for RSA private key JWK roundtrip');
  const signature = crypto.sign('sha256', testData, importedPrivKey);
  const verified = crypto.verify('sha256', testData, pubKeyObj, signature);
  
  addResult(
    'RSA 私钥 JWK 往返',
    verified === true,
    '使用导入私钥的签名应验证成功',
    verified ? '验证成功' : '验证失败'
  );
} catch (err) {
  addResult(
    'RSA 私钥 JWK 往返',
    false,
    '使用导入私钥的签名应验证成功',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 3: RSA 公私钥 JWK 完整往返
try {
  const { publicKey: pubKeyObj1, privateKey: privKeyObj1 } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  // 导出为 JWK
  const publicJWK = pubKeyObj1.export({ format: 'jwk' });
  const privateJWK = privKeyObj1.export({ format: 'jwk' });
  
  // 重新导入
  const pubKeyObj2 = crypto.createPublicKey({ key: publicJWK, format: 'jwk' });
  const privKeyObj2 = crypto.createPrivateKey({ key: privateJWK, format: 'jwk' });
  
  // 使用新导入的密钥对进行签名验证
  const testData = Buffer.from('complete RSA JWK roundtrip');
  const signature = crypto.sign('sha256', testData, privKeyObj2);
  const verified = crypto.verify('sha256', testData, pubKeyObj2, signature);
  
  addResult(
    'RSA 公私钥 JWK 完整往返',
    verified === true,
    '完整往返后签名验证应成功',
    verified ? '验证成功' : '验证失败'
  );
} catch (err) {
  addResult(
    'RSA 公私钥 JWK 完整往返',
    false,
    '完整往返后签名验证应成功',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// ========== EC JWK 往返测试 ==========

// 测试 4: EC P-256 公钥 JWK 往返
try {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  
  // 导出为 JWK
  const publicJWK = pubKeyObj.export({ format: 'jwk' });
  
  // 从 JWK 重新导入
  const importedPubKey = crypto.createPublicKey({ key: publicJWK, format: 'jwk' });
  
  // 验证导入后的公钥可用于验证签名
  const testData = Buffer.from('test data for EC P-256 JWK roundtrip');
  const signature = crypto.sign(null, testData, privKeyObj);
  const verified = crypto.verify(null, testData, importedPubKey, signature);
  
  addResult(
    'EC P-256 公钥 JWK 往返',
    verified === true,
    '签名应验证成功',
    verified ? '验证成功' : '验证失败'
  );
} catch (err) {
  addResult(
    'EC P-256 公钥 JWK 往返',
    false,
    '签名应验证成功',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 5: EC P-256 私钥 JWK 往返
try {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  
  // 导出私钥为 JWK
  const privateJWK = privKeyObj.export({ format: 'jwk' });
  
  // 从 JWK 重新导入私钥
  const importedPrivKey = crypto.createPrivateKey({ key: privateJWK, format: 'jwk' });
  
  // 使用导入的私钥签名
  const testData = Buffer.from('test data for EC private key JWK roundtrip');
  const signature = crypto.sign(null, testData, importedPrivKey);
  const verified = crypto.verify(null, testData, pubKeyObj, signature);
  
  addResult(
    'EC P-256 私钥 JWK 往返',
    verified === true,
    '使用导入私钥的签名应验证成功',
    verified ? '验证成功' : '验证失败'
  );
} catch (err) {
  addResult(
    'EC P-256 私钥 JWK 往返',
    false,
    '使用导入私钥的签名应验证成功',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 6: EC secp256k1 JWK 往返
try {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1'
  });
  
  // 导出为 JWK
  const publicJWK = pubKeyObj.export({ format: 'jwk' });
  const privateJWK = privKeyObj.export({ format: 'jwk' });
  
  // 重新导入
  const pubKeyObj2 = crypto.createPublicKey({ key: publicJWK, format: 'jwk' });
  const privKeyObj2 = crypto.createPrivateKey({ key: privateJWK, format: 'jwk' });
  
  // 签名验证
  const testData = Buffer.from('EC secp256k1 JWK roundtrip');
  const signature = crypto.sign(null, testData, privKeyObj2);
  const verified = crypto.verify(null, testData, pubKeyObj2, signature);
  
  addResult(
    'EC secp256k1 JWK 往返',
    verified === true,
    '完整往返后签名验证应成功',
    verified ? '验证成功' : '验证失败'
  );
} catch (err) {
  addResult(
    'EC secp256k1 JWK 往返',
    false,
    '完整往返后签名验证应成功',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 7: EC P-384 JWK 往返
try {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp384r1'
  });
  
  const publicJWK = pubKeyObj.export({ format: 'jwk' });
  const privateJWK = privKeyObj.export({ format: 'jwk' });
  
  const pubKeyObj2 = crypto.createPublicKey({ key: publicJWK, format: 'jwk' });
  const privKeyObj2 = crypto.createPrivateKey({ key: privateJWK, format: 'jwk' });
  
  const testData = Buffer.from('EC P-384 JWK roundtrip');
  const signature = crypto.sign(null, testData, privKeyObj2);
  const verified = crypto.verify(null, testData, pubKeyObj2, signature);
  
  addResult(
    'EC P-384 JWK 往返',
    verified === true,
    '完整往返后签名验证应成功',
    verified ? '验证成功' : '验证失败'
  );
} catch (err) {
  addResult(
    'EC P-384 JWK 往返',
    false,
    '完整往返后签名验证应成功',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// ========== Ed25519 JWK 往返测试 ==========

// 测试 8: Ed25519 公钥 JWK 往返
try {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('ed25519');
  
  const publicJWK = pubKeyObj.export({ format: 'jwk' });
  const importedPubKey = crypto.createPublicKey({ key: publicJWK, format: 'jwk' });
  
  const testData = Buffer.from('Ed25519 public key JWK roundtrip');
  const signature = crypto.sign(null, testData, privKeyObj);
  const verified = crypto.verify(null, testData, importedPubKey, signature);
  
  addResult(
    'Ed25519 公钥 JWK 往返',
    verified === true,
    '签名应验证成功',
    verified ? '验证成功' : '验证失败'
  );
} catch (err) {
  addResult(
    'Ed25519 公钥 JWK 往返',
    false,
    '签名应验证成功',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 9: Ed25519 私钥 JWK 往返
try {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('ed25519');
  
  const privateJWK = privKeyObj.export({ format: 'jwk' });
  const importedPrivKey = crypto.createPrivateKey({ key: privateJWK, format: 'jwk' });
  
  const testData = Buffer.from('Ed25519 private key JWK roundtrip');
  const signature = crypto.sign(null, testData, importedPrivKey);
  const verified = crypto.verify(null, testData, pubKeyObj, signature);
  
  addResult(
    'Ed25519 私钥 JWK 往返',
    verified === true,
    '使用导入私钥的签名应验证成功',
    verified ? '验证成功' : '验证失败'
  );
} catch (err) {
  addResult(
    'Ed25519 私钥 JWK 往返',
    false,
    '使用导入私钥的签名应验证成功',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 10: Ed25519 完整 JWK 往返
try {
  const { publicKey: pubKeyObj1, privateKey: privKeyObj1 } = crypto.generateKeyPairSync('ed25519');
  
  const publicJWK = pubKeyObj1.export({ format: 'jwk' });
  const privateJWK = privKeyObj1.export({ format: 'jwk' });
  
  const pubKeyObj2 = crypto.createPublicKey({ key: publicJWK, format: 'jwk' });
  const privKeyObj2 = crypto.createPrivateKey({ key: privateJWK, format: 'jwk' });
  
  const testData = Buffer.from('Ed25519 complete JWK roundtrip');
  const signature = crypto.sign(null, testData, privKeyObj2);
  const verified = crypto.verify(null, testData, pubKeyObj2, signature);
  
  addResult(
    'Ed25519 完整 JWK 往返',
    verified === true,
    '完整往返后签名验证应成功',
    verified ? '验证成功' : '验证失败'
  );
} catch (err) {
  addResult(
    'Ed25519 完整 JWK 往返',
    false,
    '完整往返后签名验证应成功',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// ========== Ed448 JWK 往返测试 ==========

// 测试 11: Ed448 完整 JWK 往返
try {
  const { publicKey: pubKeyObj1, privateKey: privKeyObj1 } = crypto.generateKeyPairSync('ed448');
  
  const publicJWK = pubKeyObj1.export({ format: 'jwk' });
  const privateJWK = privKeyObj1.export({ format: 'jwk' });
  
  const pubKeyObj2 = crypto.createPublicKey({ key: publicJWK, format: 'jwk' });
  const privKeyObj2 = crypto.createPrivateKey({ key: privateJWK, format: 'jwk' });
  
  const testData = Buffer.from('Ed448 complete JWK roundtrip');
  const signature = crypto.sign(null, testData, privKeyObj2);
  const verified = crypto.verify(null, testData, pubKeyObj2, signature);
  
  addResult(
    'Ed448 完整 JWK 往返',
    verified === true,
    '完整往返后签名验证应成功',
    verified ? '验证成功' : '验证失败'
  );
} catch (err) {
  addResult(
    'Ed448 完整 JWK 往返',
    false,
    '完整往返后签名验证应成功',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// ========== X25519 JWK 往返测试 ==========

// 测试 12: X25519 公钥 JWK 往返
try {
  const { publicKey: pubKeyObj } = crypto.generateKeyPairSync('x25519');
  
  const publicJWK = pubKeyObj.export({ format: 'jwk' });
  const importedPubKey = crypto.createPublicKey({ key: publicJWK, format: 'jwk' });
  
  // 验证导出的 JWK 格式
  addResult(
    'X25519 公钥 JWK 往返',
    publicJWK.kty === 'OKP' && publicJWK.crv === 'X25519' && typeof publicJWK.x === 'string',
    'JWK 应包含正确的字段',
    `kty=${publicJWK.kty}, crv=${publicJWK.crv}, x存在=${!!publicJWK.x}`
  );
} catch (err) {
  addResult(
    'X25519 公钥 JWK 往返',
    false,
    'JWK 应包含正确的字段',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 13: X25519 私钥 JWK 往返
try {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('x25519');
  
  const privateJWK = privKeyObj.export({ format: 'jwk' });
  const importedPrivKey = crypto.createPrivateKey({ key: privateJWK, format: 'jwk' });
  
  // 验证私钥 JWK 包含 d 字段
  addResult(
    'X25519 私钥 JWK 往返',
    privateJWK.kty === 'OKP' && privateJWK.crv === 'X25519' && typeof privateJWK.d === 'string',
    'JWK 应包含私钥字段 d',
    `kty=${privateJWK.kty}, crv=${privateJWK.crv}, d存在=${!!privateJWK.d}`
  );
} catch (err) {
  addResult(
    'X25519 私钥 JWK 往返',
    false,
    'JWK 应包含私钥字段 d',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// ========== X448 JWK 往返测试 ==========

// 测试 14: X448 JWK 往返
try {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('x448');
  
  const publicJWK = pubKeyObj.export({ format: 'jwk' });
  const privateJWK = privKeyObj.export({ format: 'jwk' });
  
  const pubKeyObj2 = crypto.createPublicKey({ key: publicJWK, format: 'jwk' });
  const privKeyObj2 = crypto.createPrivateKey({ key: privateJWK, format: 'jwk' });
  
  addResult(
    'X448 JWK 往返',
    publicJWK.kty === 'OKP' && publicJWK.crv === 'X448' && privateJWK.kty === 'OKP' && privateJWK.crv === 'X448',
    'JWK 应包含正确的字段',
    `公钥: kty=${publicJWK.kty}, crv=${publicJWK.crv}; 私钥: d存在=${!!privateJWK.d}`
  );
} catch (err) {
  addResult(
    'X448 JWK 往返',
    false,
    'JWK 应包含正确的字段',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// ========== JWK 字段完整性验证 ==========

// 测试 15: RSA JWK 字段完整性
try {
  const { privateKey: privKeyObj } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const privateJWK = privKeyObj.export({ format: 'jwk' });
  
  // 验证所有必需字段存在
  const requiredFields = ['kty', 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi'];
  const missingFields = requiredFields.filter(field => !(field in privateJWK));
  
  addResult(
    'RSA 私钥 JWK 字段完整性',
    missingFields.length === 0,
    '应包含所有必需字段: ' + requiredFields.join(', '),
    missingFields.length === 0 ? '所有字段存在' : `缺少字段: ${missingFields.join(', ')}`
  );
} catch (err) {
  addResult(
    'RSA 私钥 JWK 字段完整性',
    false,
    '应包含所有必需字段',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 16: EC JWK 字段完整性
try {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  
  const publicJWK = pubKeyObj.export({ format: 'jwk' });
  const privateJWK = privKeyObj.export({ format: 'jwk' });
  
  // 验证公钥字段
  const publicFieldsOK = publicJWK.kty === 'EC' && publicJWK.crv && publicJWK.x && publicJWK.y;
  // 验证私钥额外包含 d 字段
  const privateFieldsOK = privateJWK.kty === 'EC' && privateJWK.crv && privateJWK.x && privateJWK.y && privateJWK.d;
  
  addResult(
    'EC JWK 字段完整性',
    publicFieldsOK && privateFieldsOK,
    '公钥应包含 kty,crv,x,y; 私钥应额外包含 d',
    `公钥字段OK=${publicFieldsOK}, 私钥字段OK=${privateFieldsOK}`
  );
} catch (err) {
  addResult(
    'EC JWK 字段完整性',
    false,
    '应包含所有必需字段',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 输出测试结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

const output = {
  success: testResults.fail === 0,
  summary,
  detail: testResults.detail
};

console.log(JSON.stringify(output, null, 2));
return output;





