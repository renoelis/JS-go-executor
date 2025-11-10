const crypto = require('crypto');

/**
 * Options 参数类型验证测试
 * 验证各种无效的 options 参数类型
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

// 测试 1: modulusLength 为字符串
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: '2048',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('modulusLength 字符串类型', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('number') || err.message.includes('type');
  addResult('modulusLength 字符串类型', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 2: modulusLength 为 null
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: null,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('modulusLength null', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('modulusLength') || err.message.includes('required');
  addResult('modulusLength null', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 3: publicKeyEncoding 不是对象
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: 'invalid',
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('publicKeyEncoding 非对象', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('object') || 
                          err.message.includes('encoding') || 
                          err.message.includes('invalid');
  addResult('publicKeyEncoding 非对象', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 4: publicKeyEncoding 为 null（可能被忽略）
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: null,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  // null 可能被当作 undefined 处理，返回 KeyObject
  addResult('publicKeyEncoding null', true, 'null被接受（视为undefined）', '接受null值');
} catch (err) {
  const isExpectedError = err.message.includes('encoding') || err.message.includes('object');
  addResult('publicKeyEncoding null', isExpectedError, '拒绝或接受null', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 5: format 字段缺失
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('publicKeyEncoding 缺少 format', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('format') || err.message.includes('required');
  addResult('publicKeyEncoding 缺少 format', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 6: type 字段缺失
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('publicKeyEncoding 缺少 type', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('type') || err.message.includes('required');
  addResult('publicKeyEncoding 缺少 type', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 7: namedCurve 为数字
try {
  crypto.generateKeyPairSync('ec', {
    namedCurve: 256,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('namedCurve 数字类型', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('string') || err.message.includes('curve');
  addResult('namedCurve 数字类型', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 8: passphrase 为数字
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: 123456
    }
  });
  addResult('passphrase 数字类型', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('string') || err.message.includes('passphrase');
  addResult('passphrase 数字类型', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 9: publicExponent 为字符串
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: '65537',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('publicExponent 字符串类型', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('number') || err.message.includes('type');
  addResult('publicExponent 字符串类型', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 10: saltLength 为字符串
try {
  crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    saltLength: '32',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('saltLength 字符串类型', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('number') || err.message.includes('type');
  addResult('saltLength 字符串类型', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 11: hashAlgorithm 为数字
try {
  crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 256,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('hashAlgorithm 数字类型', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('string') || err.message.includes('type');
  addResult('hashAlgorithm 数字类型', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 12: generator 为字符串
try {
  crypto.generateKeyPairSync('dh', {
    primeLength: 2048,
    generator: '2',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('generator 字符串类型', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('number') || err.message.includes('type');
  addResult('generator 字符串类型', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 13: primeLength 为字符串
try {
  crypto.generateKeyPairSync('dh', {
    primeLength: '2048',
    generator: 2,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('primeLength 字符串类型', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('number') || err.message.includes('type');
  addResult('primeLength 字符串类型', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 14: divisorLength 为字符串
try {
  crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: '256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  addResult('divisorLength 字符串类型', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('number') || err.message.includes('type');
  addResult('divisorLength 字符串类型', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 15: 空 options 对象（RSA应失败）
try {
  crypto.generateKeyPairSync('rsa', {});
  addResult('空 options (RSA)', false, '应拒绝', '未拒绝');
} catch (err) {
  const isExpectedError = err.message.includes('modulusLength') || err.message.includes('required');
  addResult('空 options (RSA)', isExpectedError, '拒绝', `错误: ${err.message.substring(0, 50)}`, err.message, err.stack);
}

// 测试 16: 空 options 对象（Ed25519应成功，因为不需要参数）
try {
  const { publicKey } = crypto.generateKeyPairSync('ed25519', {});
  addResult('空 options (Ed25519)', publicKey.type === 'public', 'Ed25519不需要参数', '成功');
} catch (err) {
  addResult('空 options (Ed25519)', false, '应成功', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== Options 类型验证测试结果 ==========\n');
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

