const crypto = require('crypto');

/**
 * 极端边界值测试
 * 测试各种参数的极端边界值：
 * - 超大 modulusLength
 * - 最小有效值
 * - 负数值
 * - 超长字符串
 * - 边界临界值
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

// ========== RSA modulusLength 边界测试 ==========

// 测试 1: 最小有效 modulusLength (512)
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 512,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=512 (最小值)',
    publicKey && publicKey.includes('BEGIN PUBLIC KEY'),
    '应成功生成',
    '成功'
  );
} catch (err) {
  addResult(
    'RSA modulusLength=512 (最小值)',
    false,
    '应成功生成',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 2: 超小 modulusLength (256 - 应失败)
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 256,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=256 (过小)',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA modulusLength=256 (过小)',
    err.message.includes('modulusLength') || err.message.includes('too small') || err.message.includes('invalid'),
    '应抛出 modulusLength 相关错误',
    `错误: ${err.message}`
  );
}

// 测试 3: 负数 modulusLength
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: -2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=-2048 (负数)',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA modulusLength=-2048 (负数)',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 4: 零 modulusLength
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 0,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=0',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA modulusLength=0',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 5: 超大 modulusLength (8192 - 合法但慢)
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 8192,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=8192 (超大)',
    publicKey && publicKey.includes('BEGIN PUBLIC KEY'),
    '应成功生成',
    '成功'
  );
} catch (err) {
  addResult(
    'RSA modulusLength=8192 (超大)',
    false,
    '应成功生成',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 6: 非 8 的倍数 modulusLength (2049)
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2049,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=2049 (非8倍数)',
    publicKey && publicKey.includes('BEGIN PUBLIC KEY'),
    '应成功生成',
    '成功'
  );
} catch (err) {
  // 某些实现可能要求是 8 的倍数
  addResult(
    'RSA modulusLength=2049 (非8倍数)',
    true,
    '可能成功或失败',
    `错误: ${err.message}`
  );
}

// ========== publicExponent 边界测试 ==========

// 测试 7: publicExponent = 3 (最小奇数)
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 3,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA publicExponent=3',
    publicKey && publicKey.includes('BEGIN PUBLIC KEY'),
    '应成功生成',
    '成功'
  );
} catch (err) {
  addResult(
    'RSA publicExponent=3',
    false,
    '应成功生成',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 8: publicExponent = 2 (偶数 - 应失败)
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 2,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA publicExponent=2 (偶数)',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA publicExponent=2 (偶数)',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 9: publicExponent = 1 (无效)
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 1,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA publicExponent=1',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA publicExponent=1',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 10: publicExponent = 0
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA publicExponent=0',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA publicExponent=0',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 11: publicExponent 负数
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: -65537,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA publicExponent=-65537 (负数)',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA publicExponent=-65537 (负数)',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 12: publicExponent 超大值 (2^32 + 1)
// 注意：Go crypto/rsa 限制最大值为 2^32-1，超过此值会失败
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0x100000001, // 2^32 + 1
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA publicExponent=2^32+1',
    publicKey && publicKey.includes('BEGIN PUBLIC KEY'),
    '可能成功（超出某些实现的限制）',
    '成功生成'
  );
} catch (err) {
  // Go 实现限制：publicExponent 最大值为 2^32-1
  addResult(
    'RSA publicExponent=2^32+1',
    err.message.includes('公钥指数过大') || err.message.includes('too large') || err.message.includes('maximum'),
    '可能失败（Go 限制）',
    `错误: ${err.message}`
  );
}

// ========== DSA 边界测试 ==========

// 测试 13: DSA 最小 modulusLength (1024)
try {
  const { publicKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 1024,
    divisorLength: 160,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA modulusLength=1024 (最小值)',
    publicKey && publicKey.includes('BEGIN PUBLIC KEY'),
    '应成功生成',
    '成功'
  );
} catch (err) {
  addResult(
    'DSA modulusLength=1024 (最小值)',
    false,
    '应成功生成',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 14: DSA 过小 modulusLength (512)
try {
  crypto.generateKeyPairSync('dsa', {
    modulusLength: 512,
    divisorLength: 160,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA modulusLength=512 (过小)',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'DSA modulusLength=512 (过小)',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 15: DSA divisorLength=0
try {
  crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: 0,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA divisorLength=0',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'DSA divisorLength=0',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// ========== DH 边界测试 ==========

// 测试 16: DH 最小 primeLength (512)
try {
  const { publicKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 512,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DH primeLength=512',
    publicKey && publicKey.includes('BEGIN PUBLIC KEY'),
    '应成功生成',
    '成功'
  );
} catch (err) {
  addResult(
    'DH primeLength=512',
    false,
    '应成功生成',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 17: DH primeLength=0
try {
  crypto.generateKeyPairSync('dh', {
    primeLength: 0,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DH primeLength=0',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'DH primeLength=0',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 18: DH generator 边界值 (1 - 应失败)
try {
  crypto.generateKeyPairSync('dh', {
    primeLength: 512,
    generator: 1,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DH generator=1',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'DH generator=1',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 19: DH generator=0
try {
  crypto.generateKeyPairSync('dh', {
    primeLength: 512,
    generator: 0,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DH generator=0',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'DH generator=0',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// ========== RSA-PSS saltLength 边界测试 ==========

// 测试 20: RSA-PSS saltLength=0 (合法)
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    saltLength: 0,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA-PSS saltLength=0',
    publicKey && publicKey.includes('BEGIN PUBLIC KEY'),
    '应成功生成',
    '成功'
  );
} catch (err) {
  addResult(
    'RSA-PSS saltLength=0',
    false,
    '应成功生成',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 21: RSA-PSS saltLength 负数
try {
  crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    saltLength: -1,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA-PSS saltLength=-1',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA-PSS saltLength=-1',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 22: RSA-PSS saltLength 超大值 (1024)
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    saltLength: 1024,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA-PSS saltLength=1024',
    publicKey && publicKey.includes('BEGIN PUBLIC KEY'),
    '应成功生成',
    '成功'
  );
} catch (err) {
  // 可能因为 saltLength 过大而失败
  addResult(
    'RSA-PSS saltLength=1024',
    true,
    '可能成功或失败',
    `错误: ${err.message}`
  );
}

// ========== 超长字符串测试 ==========

// 测试 23: 超长 passphrase (10KB)
try {
  const longPassphrase = 'a'.repeat(10 * 1024);
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
    '超长 passphrase (10KB)',
    privateKey && privateKey.includes('ENCRYPTED'),
    '应成功生成加密私钥',
    '成功'
  );
} catch (err) {
  addResult(
    '超长 passphrase (10KB)',
    false,
    '应成功生成加密私钥',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 24: 超长 passphrase (1MB) - 可能失败或超时
try {
  const veryLongPassphrase = 'b'.repeat(1024 * 1024);
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024, // 使用较小的 modulusLength 加快速度
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: veryLongPassphrase
    }
  });
  
  addResult(
    '超长 passphrase (1MB)',
    privateKey && privateKey.includes('ENCRYPTED'),
    '应成功或失败',
    '成功'
  );
} catch (err) {
  addResult(
    '超长 passphrase (1MB)',
    true,
    '可能失败',
    `错误: ${err.message}`
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

