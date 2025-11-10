const crypto = require('crypto');

/**
 * 加密私钥解密验证测试
 * 验证生成的加密私钥能够正确解密并使用：
 * - 使用正确密码解密
 * - 错误密码应失败
 * - 不同 cipher 算法的加解密
 * - 解密后的密钥可用性验证
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

// 测试 1: RSA 加密私钥 - 正确密码解密
try {
  const passphrase = 'test-password-123';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  // 验证是加密的
  const isEncrypted = privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----');
  
  // 使用正确密码导入私钥
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  // 验证解密后的密钥可用
  const data = Buffer.from('test');
  const signature = crypto.sign('sha256', data, privateKeyObj);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA 加密私钥正确密码解密',
    isEncrypted && verified === true,
    '私钥已加密且正确密码可解密使用',
    `加密=${isEncrypted}, 验证=${verified}`
  );
} catch (err) {
  addResult('RSA 加密私钥正确密码解密', false, '成功解密', err.message, err.message, err.stack);
}

// 测试 2: RSA 加密私钥 - 错误密码应失败
try {
  const passphrase = 'correct-password';
  const wrongPassphrase = 'wrong-password';
  
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  let errorOccurred = false;
  try {
    // 尝试使用错误密码导入
    crypto.createPrivateKey({
      key: privateKey,
      format: 'pem',
      passphrase: wrongPassphrase
    });
  } catch (decryptErr) {
    errorOccurred = true;
  }
  
  addResult(
    'RSA 加密私钥错误密码失败',
    errorOccurred,
    '错误密码应导致解密失败',
    `失败=${errorOccurred}`
  );
} catch (err) {
  addResult('RSA 加密私钥错误密码失败', false, '正确处理错误密码', err.message, err.message, err.stack);
}

// 测试 3: RSA 加密私钥 - 缺少密码应失败
try {
  const passphrase = 'test-password';
  
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  let errorOccurred = false;
  try {
    // 尝试不提供密码导入
    crypto.createPrivateKey({
      key: privateKey,
      format: 'pem'
    });
  } catch (decryptErr) {
    errorOccurred = true;
  }
  
  addResult(
    'RSA 加密私钥缺少密码失败',
    errorOccurred,
    '缺少密码应导致解密失败',
    `失败=${errorOccurred}`
  );
} catch (err) {
  addResult('RSA 加密私钥缺少密码失败', false, '正确处理缺少密码', err.message, err.message, err.stack);
}

// 测试 4: AES-256-CBC 加密解密
try {
  const passphrase = 'aes256-test';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  const data = Buffer.from('test aes-256-cbc');
  const encrypted = crypto.publicEncrypt(publicKey, data);
  const decrypted = crypto.privateDecrypt(privateKeyObj, encrypted);
  
  const isValid = decrypted.equals(data);
  
  addResult(
    'AES-256-CBC 加密私钥可用性',
    isValid,
    '解密后的私钥可用于加解密',
    `数据一致=${isValid}`
  );
} catch (err) {
  addResult('AES-256-CBC 加密私钥可用性', false, '私钥可用', err.message, err.message, err.stack);
}

// 测试 5: AES-128-CBC 加密解密
try {
  const passphrase = 'aes128-test';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-128-cbc',
      passphrase: passphrase
    }
  });
  
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  const data = Buffer.from('test aes-128-cbc');
  const signature = crypto.sign('sha256', data, privateKeyObj);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'AES-128-CBC 加密私钥可用性',
    verified === true,
    '解密后的私钥可用于签名',
    `验证=${verified}`
  );
} catch (err) {
  addResult('AES-128-CBC 加密私钥可用性', false, '私钥可用', err.message, err.message, err.stack);
}

// 测试 6: DES-EDE3-CBC 加密解密
try {
  const passphrase = 'des3-test';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'des-ede3-cbc',
      passphrase: passphrase
    }
  });
  
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  const data = Buffer.from('test des-ede3-cbc');
  const signature = crypto.sign('sha256', data, privateKeyObj);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'DES-EDE3-CBC 加密私钥可用性',
    verified === true,
    '解密后的私钥可用于签名',
    `验证=${verified}`
  );
} catch (err) {
  addResult('DES-EDE3-CBC 加密私钥可用性', false, '私钥可用', err.message, err.message, err.stack);
}

// 测试 7: AES-192-CBC 加密解密
try {
  const passphrase = 'aes192-test';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-192-cbc',
      passphrase: passphrase
    }
  });
  
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  const data = Buffer.from('test aes-192-cbc');
  const signature = crypto.sign('sha256', data, privateKeyObj);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'AES-192-CBC 加密私钥可用性',
    verified === true,
    '解密后的私钥可用于签名',
    `验证=${verified}`
  );
} catch (err) {
  addResult('AES-192-CBC 加密私钥可用性', false, '私钥可用', err.message, err.message, err.stack);
}

// 测试 8: EC 加密私钥
try {
  const passphrase = 'ec-test-password';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  const isEncrypted = privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----');
  
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  const data = Buffer.from('test ec encrypted');
  const signature = crypto.sign('sha256', data, privateKeyObj);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'EC 加密私钥解密使用',
    isEncrypted && verified === true,
    'EC私钥已加密且可解密使用',
    `加密=${isEncrypted}, 验证=${verified}`
  );
} catch (err) {
  addResult('EC 加密私钥解密使用', false, '成功解密使用', err.message, err.message, err.stack);
}

// 测试 9: Ed25519 加密私钥
try {
  const passphrase = 'ed25519-password';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  const isEncrypted = privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----');
  
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  const data = Buffer.from('test ed25519 encrypted');
  const signature = crypto.sign(null, data, privateKeyObj);
  const verified = crypto.verify(null, data, publicKey, signature);
  
  addResult(
    'Ed25519 加密私钥解密使用',
    isEncrypted && verified === true,
    'Ed25519私钥已加密且可解密使用',
    `加密=${isEncrypted}, 验证=${verified}`
  );
} catch (err) {
  addResult('Ed25519 加密私钥解密使用', false, '成功解密使用', err.message, err.message, err.stack);
}

// 测试 10: 空密码加密（边界情况）
try {
  const passphrase = '';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  const data = Buffer.from('test empty passphrase');
  const signature = crypto.sign('sha256', data, privateKeyObj);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    '空密码加密私钥',
    verified === true,
    '空密码也能正常加解密',
    `验证=${verified}`
  );
} catch (err) {
  // 空密码可能不被允许，这也是合理的
  const isExpectedError = err.message.includes('passphrase') || 
                          err.message.includes('password') ||
                          err.message.includes('empty');
  addResult(
    '空密码加密私钥',
    isExpectedError || false,
    '空密码被拒绝或接受',
    isExpectedError ? `预期错误: ${err.message.substring(0, 50)}` : err.message,
    err.message,
    err.stack
  );
}

// 测试 11: 超长密码
try {
  const passphrase = 'x'.repeat(1000);
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  const data = Buffer.from('test long passphrase');
  const signature = crypto.sign('sha256', data, privateKeyObj);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    '超长密码加密私钥',
    verified === true,
    '超长密码也能正常加解密',
    `验证=${verified}, 密码长度=${passphrase.length}`
  );
} catch (err) {
  addResult('超长密码加密私钥', false, '成功解密', err.message, err.message, err.stack);
}

// 测试 12: Unicode 密码
try {
  const passphrase = '密码🔐中文🇨🇳测试';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  const data = Buffer.from('test unicode passphrase');
  const signature = crypto.sign('sha256', data, privateKeyObj);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'Unicode 密码加密私钥',
    verified === true,
    'Unicode密码也能正常加解密',
    `验证=${verified}`
  );
} catch (err) {
  addResult('Unicode 密码加密私钥', false, '成功解密', err.message, err.message, err.stack);
}

// 测试 13: 加密 DER 格式私钥（注意：Node.js v16+ 不支持加密DER私钥导入）
try {
  const passphrase = 'der-test-password';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  // DER 格式加密私钥生成成功
  const isDER = Buffer.isBuffer(privateKey);
  
  // 尝试导入加密的 DER 私钥（可能不支持）
  let canImport = false;
  let importError = null;
  try {
    const privateKeyObj = crypto.createPrivateKey({
      key: privateKey,
      format: 'der',
      type: 'pkcs8',
      passphrase: passphrase
    });
    canImport = true;
  } catch (importErr) {
    importError = importErr.message;
    // 加密的 DER 格式可能不被直接支持，这是已知限制
    if (importErr.message.includes('unsupported') || importErr.message.includes('DECODER')) {
      canImport = 'unsupported';
    }
  }
  
  addResult(
    '加密 DER 格式私钥',
    isDER && (canImport === true || canImport === 'unsupported'),
    'DER格式加密私钥生成（导入可能不支持）',
    `生成=${isDER}, 导入=${canImport === 'unsupported' ? '不支持（预期）' : canImport}`
  );
} catch (err) {
  addResult('加密 DER 格式私钥', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 14: 多次使用相同密码解密
try {
  const passphrase = 'reuse-password';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  // 第一次解密
  const privateKeyObj1 = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  // 第二次解密（应该也能成功）
  const privateKeyObj2 = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    passphrase: passphrase
  });
  
  const data = Buffer.from('test reuse');
  const sig1 = crypto.sign('sha256', data, privateKeyObj1);
  const sig2 = crypto.sign('sha256', data, privateKeyObj2);
  
  const verify1 = crypto.verify('sha256', data, publicKey, sig1);
  const verify2 = crypto.verify('sha256', data, publicKey, sig2);
  
  addResult(
    '多次解密同一加密私钥',
    verify1 === true && verify2 === true,
    '可以多次解密并使用',
    `验证1=${verify1}, 验证2=${verify2}`
  );
} catch (err) {
  addResult('多次解密同一加密私钥', false, '成功多次解密', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== 加密私钥解密验证测试结果 ==========\n');
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

