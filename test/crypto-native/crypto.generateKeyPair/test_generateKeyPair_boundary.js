const crypto = require('crypto');

/**
 * 边界值和极端情况测试
 * 测试各种参数的边界值
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

// 测试 1: RSA modulusLength=1024（最小推荐值）
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=1024',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA modulusLength=1024', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 2: RSA modulusLength=3072
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 3072,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=3072',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA modulusLength=3072', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 3: RSA modulusLength=8192（大密钥）
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 8192,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=8192',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA modulusLength=8192', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 4: RSA publicExponent=3
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 3,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA publicExponent=3',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA publicExponent=3', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 5: RSA publicExponent=0x3（十六进制）
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0x3,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA publicExponent=0x3',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA publicExponent=0x3', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 6: DH primeLength=512
try {
  const { publicKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 512,
    generator: 2,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DH primeLength=512',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('DH primeLength=512', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 7: DH primeLength=4096
try {
  const { publicKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 4096,
    generator: 2,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DH primeLength=4096',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('DH primeLength=4096', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 8: DH generator=5
try {
  const { publicKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 2048,
    generator: 5,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DH generator=5',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('DH generator=5', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 9: DSA modulusLength=1024, divisorLength=160
try {
  const { publicKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 1024,
    divisorLength: 160,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA 1024/160',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('DSA 1024/160', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 10: DSA modulusLength=2048, divisorLength=224
try {
  const { publicKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: 224,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA 2048/224',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('DSA 2048/224', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 11: DSA modulusLength=3072, divisorLength=256
try {
  const { publicKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 3072,
    divisorLength: 256,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA 3072/256',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('DSA 3072/256', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 12: RSA-PSS saltLength=0
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 0,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA-PSS saltLength=0',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA-PSS saltLength=0', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 13: RSA-PSS saltLength=64
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 64,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA-PSS saltLength=64',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA-PSS saltLength=64', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 14: RSA-PSS hashAlgorithm=sha1
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha1',
    mgf1HashAlgorithm: 'sha1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA-PSS hashAlgorithm=sha1',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA-PSS hashAlgorithm=sha1', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 15: RSA-PSS hashAlgorithm=sha384
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha384',
    mgf1HashAlgorithm: 'sha384',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA-PSS hashAlgorithm=sha384',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA-PSS hashAlgorithm=sha384', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 16: RSA-PSS hashAlgorithm=sha512
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha512',
    mgf1HashAlgorithm: 'sha512',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA-PSS hashAlgorithm=sha512',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA-PSS hashAlgorithm=sha512', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 17: 超长 passphrase
try {
  const longPassphrase = 'x'.repeat(1000);
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: longPassphrase
    }
  });
  
  addResult(
    '超长 passphrase (1000字符)',
    privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----'),
    '成功加密',
    '成功'
  );
} catch (err) {
  addResult('超长 passphrase (1000字符)', false, '成功加密', err.message, err.message, err.stack);
}

// 测试 18: 特殊字符 passphrase
try {
  const specialPassphrase = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: specialPassphrase
    }
  });
  
  addResult(
    '特殊字符 passphrase',
    privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----'),
    '成功加密',
    '成功'
  );
} catch (err) {
  addResult('特殊字符 passphrase', false, '成功加密', err.message, err.message, err.stack);
}

// 测试 19: Unicode passphrase
try {
  const unicodePassphrase = '密码🔐中文🇨🇳测试';
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: unicodePassphrase
    }
  });
  
  addResult(
    'Unicode passphrase',
    privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----'),
    '成功加密',
    '成功'
  );
} catch (err) {
  addResult('Unicode passphrase', false, '成功加密', err.message, err.message, err.stack);
}

// 测试 20: 单字符 passphrase
try {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: 'x'
    }
  });
  
  addResult(
    '单字符 passphrase',
    privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----'),
    '成功加密',
    '成功'
  );
} catch (err) {
  addResult('单字符 passphrase', false, '成功加密', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== 边界值测试结果 ==========\n');
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

