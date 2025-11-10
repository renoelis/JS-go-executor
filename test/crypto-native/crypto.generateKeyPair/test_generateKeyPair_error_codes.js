const crypto = require('crypto');

/**
 * 错误代码精确验证测试
 * 验证各种错误情况下的错误代码和消息
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

// 测试 1: 无效的密钥类型 - 检查 error.code
try {
  crypto.generateKeyPairSync('invalid-key-type', {
    modulusLength: 2048
  });
  addResult('无效密钥类型 error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_VALUE' || 
                          err.code === 'ERR_INVALID_ARG_TYPE' ||
                          err.message.includes('invalid') ||
                          err.message.includes('Unknown');
  addResult(
    '无效密钥类型 error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_VALUE 或相关错误',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 2: RSA 缺少 modulusLength
try {
  crypto.generateKeyPairSync('rsa', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('RSA 缺少 modulusLength error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_VALUE' || 
                          err.code === 'ERR_MISSING_ARGS' ||
                          err.message.includes('modulusLength') ||
                          err.message.includes('required');
  addResult(
    'RSA 缺少 modulusLength error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_VALUE 或包含modulusLength',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 3: EC 缺少 namedCurve
try {
  crypto.generateKeyPairSync('ec', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('EC 缺少 namedCurve error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_VALUE' || 
                          err.code === 'ERR_MISSING_ARGS' ||
                          err.message.includes('namedCurve') ||
                          err.message.includes('required');
  addResult(
    'EC 缺少 namedCurve error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_VALUE 或包含namedCurve',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 4: 无效的 namedCurve
try {
  crypto.generateKeyPairSync('ec', {
    namedCurve: 'non-existent-curve',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('无效 namedCurve error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_VALUE' || 
                          err.code === 'ERR_CRYPTO_UNKNOWN_CURVE' ||
                          err.message.includes('curve') ||
                          err.message.includes('invalid');
  addResult(
    '无效 namedCurve error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_VALUE 或相关错误',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 5: 无效的 format
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'xml' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('无效 format error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_VALUE' || 
                          err.code === 'ERR_INVALID_ARG_TYPE' ||
                          err.message.includes('format') ||
                          err.message.includes('invalid');
  addResult(
    '无效 format error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_VALUE 或相关错误',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 6: 无效的 type
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'invalid-type', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('无效 type error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_VALUE' || 
                          err.code === 'ERR_INVALID_ARG_TYPE' ||
                          err.message.includes('type') ||
                          err.message.includes('invalid');
  addResult(
    '无效 type error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_VALUE 或相关错误',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 7: DH 缺少 primeLength
try {
  crypto.generateKeyPairSync('dh', {
    generator: 2,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('DH 缺少 primeLength error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_VALUE' || 
                          err.code === 'ERR_MISSING_ARGS' ||
                          err.message.includes('primeLength') ||
                          err.message.includes('prime') ||
                          err.message.includes('required');
  addResult(
    'DH 缺少 primeLength error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_VALUE 或包含primeLength',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 8: DSA 缺少 modulusLength
try {
  crypto.generateKeyPairSync('dsa', {
    divisorLength: 256,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('DSA 缺少 modulusLength error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_VALUE' || 
                          err.code === 'ERR_MISSING_ARGS' ||
                          err.message.includes('modulusLength') ||
                          err.message.includes('required');
  addResult(
    'DSA 缺少 modulusLength error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_VALUE 或包含modulusLength',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 9: RSA modulusLength 不是数字
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 'not-a-number',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('RSA modulusLength 类型错误 error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_TYPE' || 
                          err.code === 'ERR_INVALID_ARG_VALUE' ||
                          err.message.includes('number') ||
                          err.message.includes('type');
  addResult(
    'RSA modulusLength 类型错误 error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_TYPE 或相关错误',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 10: RSA modulusLength 太小（负数）
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: -1,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('RSA modulusLength 负数 error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_OUT_OF_RANGE' || 
                          err.code === 'ERR_INVALID_ARG_VALUE' ||
                          err.message.includes('range') ||
                          err.message.includes('invalid');
  addResult(
    'RSA modulusLength 负数 error.code',
    hasCorrectCode,
    'ERR_OUT_OF_RANGE 或相关错误',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 11: cipher 需要 passphrase
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc'
      // 缺少 passphrase
    }
  });
  addResult('cipher 缺少 passphrase error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_VALUE' || 
                          err.code === 'ERR_MISSING_ARGS' ||
                          err.message.includes('passphrase') ||
                          err.message.includes('required');
  addResult(
    'cipher 缺少 passphrase error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_VALUE 或包含passphrase',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 12: 无效的 cipher
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'invalid-cipher-algorithm',
      passphrase: 'test123'
    }
  });
  addResult('无效 cipher error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_CRYPTO_UNKNOWN_CIPHER' || 
                          err.code === 'ERR_INVALID_ARG_VALUE' ||
                          err.message.includes('cipher') ||
                          err.message.includes('Unknown');
  addResult(
    '无效 cipher error.code',
    hasCorrectCode,
    'ERR_CRYPTO_UNKNOWN_CIPHER 或相关错误',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 13: RSA PKCS1 type 用于 EC（不兼容）
try {
  crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('EC 使用 PKCS1 type error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_VALUE' || 
                          err.code === 'ERR_CRYPTO_INCOMPATIBLE_KEY_OPTIONS' ||
                          err.message.includes('pkcs1') ||
                          err.message.includes('incompatible');
  addResult(
    'EC 使用 PKCS1 type error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_VALUE 或相关错误',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 14: publicExponent 不是数字
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 'not-a-number',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('publicExponent 类型错误 error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_INVALID_ARG_TYPE' || 
                          err.code === 'ERR_INVALID_ARG_VALUE' ||
                          err.message.includes('number') ||
                          err.message.includes('type');
  addResult(
    'publicExponent 类型错误 error.code',
    hasCorrectCode,
    'ERR_INVALID_ARG_TYPE 或相关错误',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 15: RSA-PSS 无效的 hashAlgorithm
try {
  crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'invalid-hash',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('RSA-PSS 无效 hashAlgorithm error.code', false, '应抛出错误', '未抛出错误');
} catch (err) {
  const hasCorrectCode = err.code === 'ERR_CRYPTO_UNKNOWN_HASH' || 
                          err.code === 'ERR_INVALID_ARG_VALUE' ||
                          err.message.includes('hash') ||
                          err.message.includes('Unknown');
  addResult(
    'RSA-PSS 无效 hashAlgorithm error.code',
    hasCorrectCode,
    'ERR_CRYPTO_UNKNOWN_HASH 或相关错误',
    `code=${err.code}, message=${err.message}`,
    err.message,
    err.stack
  );
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== 错误代码验证测试结果 ==========\n');
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

