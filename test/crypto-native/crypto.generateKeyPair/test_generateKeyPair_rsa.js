const crypto = require('crypto');

/**
 * RSA 密钥对生成测试
 * 测试 RSA 和 RSA-PSS 的各种参数组合
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

// 测试 1: RSA-2048 PKCS1 PEM
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem'
    }
  });
  
  const isValidPublic = publicKey.includes('-----BEGIN RSA PUBLIC KEY-----');
  const isValidPrivate = privateKey.includes('-----BEGIN RSA PRIVATE KEY-----');
  
  addResult(
    'RSA-2048 同步生成 PKCS1 PEM',
    isValidPublic && isValidPrivate,
    'PEM格式的RSA公私钥',
    `公钥长度=${publicKey.length}, 私钥长度=${privateKey.length}`
  );
} catch (err) {
  addResult('RSA-2048 同步生成 PKCS1 PEM', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 2: RSA-1024 SPKI/PKCS8 PEM
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const isValidPublic = publicKey.includes('-----BEGIN PUBLIC KEY-----');
  const isValidPrivate = privateKey.includes('-----BEGIN PRIVATE KEY-----');
  
  addResult(
    'RSA-1024 同步生成 SPKI/PKCS8 PEM',
    isValidPublic && isValidPrivate,
    'SPKI/PKCS8格式密钥',
    `公钥=${isValidPublic}, 私钥=${isValidPrivate}`
  );
} catch (err) {
  addResult('RSA-1024 同步生成 SPKI/PKCS8 PEM', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 3: RSA DER 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });
  
  const isValidPublic = Buffer.isBuffer(publicKey) && publicKey.length > 0;
  const isValidPrivate = Buffer.isBuffer(privateKey) && privateKey.length > 0;
  
  addResult(
    'RSA-2048 DER 格式',
    isValidPublic && isValidPrivate,
    'DER格式Buffer',
    `公钥Buffer长度=${publicKey.length}, 私钥Buffer长度=${privateKey.length}`
  );
} catch (err) {
  addResult('RSA-2048 DER 格式', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 4: RSA 带密码加密私钥 - AES-256-CBC
try {
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
      passphrase: 'test-password-123'
    }
  });
  
  const isEncrypted = privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----');
  
  addResult(
    'RSA 加密私钥 AES-256-CBC',
    isEncrypted,
    '加密的PKCS8私钥',
    `私钥是否加密=${isEncrypted}`
  );
} catch (err) {
  addResult('RSA 加密私钥 AES-256-CBC', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 5: RSA 加密私钥 - AES-128-CBC
try {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-128-cbc',
      passphrase: 'test123'
    }
  });
  
  addResult(
    'RSA 加密私钥 AES-128-CBC',
    privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----'),
    '加密私钥',
    '成功'
  );
} catch (err) {
  addResult('RSA 加密私钥 AES-128-CBC', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 6: RSA 加密私钥 - DES-EDE3-CBC
try {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'des-ede3-cbc',
      passphrase: 'test123'
    }
  });
  
  addResult(
    'RSA 加密私钥 DES-EDE3-CBC',
    privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----'),
    '加密私钥',
    '成功'
  );
} catch (err) {
  addResult('RSA 加密私钥 DES-EDE3-CBC', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 7: RSA 自定义 publicExponent
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0x10001,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
  
  addResult(
    'RSA 自定义 publicExponent',
    isValid,
    'RSA密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('RSA 自定义 publicExponent', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 8: RSA modulusLength=4096
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  addResult(
    'RSA modulusLength=4096',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA modulusLength=4096', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 9: RSA-PSS 基本生成
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----') && 
                  privateKey.includes('-----BEGIN PRIVATE KEY-----');
  
  addResult(
    'RSA-PSS 生成',
    isValid,
    'RSA-PSS密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('RSA-PSS 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 10: RSA-PSS 带哈希选项
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 32,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
  
  addResult(
    'RSA-PSS 带哈希选项',
    isValid,
    'RSA-PSS密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('RSA-PSS 带哈希选项', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 11: RSA JWK 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'jwk'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'jwk'
    }
  });
  
  const isValid = typeof publicKey === 'object' && 
                  typeof privateKey === 'object' &&
                  publicKey.kty === 'RSA' &&
                  publicKey.n && publicKey.e;
  
  addResult(
    'RSA JWK 格式',
    isValid,
    'JWK对象',
    `kty=${publicKey.kty}`
  );
} catch (err) {
  addResult('RSA JWK 格式', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 12: RSA 密钥可用性测试（签名/验证）
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const data = Buffer.from('test data');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA 密钥可用性测试',
    verified === true,
    '签名验证成功',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('RSA 密钥可用性测试', false, '签名验证成功', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== RSA 测试结果 ==========\n');
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

