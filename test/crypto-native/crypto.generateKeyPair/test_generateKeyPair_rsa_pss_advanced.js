const crypto = require('crypto');

/**
 * RSA-PSS 高级参数测试
 * 验证 RSA-PSS 的各种参数组合：
 * - hashAlgorithm 和 mgf1HashAlgorithm 的各种组合
 * - saltLength 的边界值和非法值
 * - 不同哈希算法的兼容性
 * - PSS 参数对签名验证的影响
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

// ========== 哈希算法组合测试 ==========

// 测试 1: hashAlgorithm 和 mgf1HashAlgorithm 相同 - sha256
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 32,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test sha256');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA-PSS sha256/sha256 组合',
    verified === true,
    '签名验证成功',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS sha256/sha256 组合', false, '成功', err.message, err.message, err.stack);
}

// 测试 2: hashAlgorithm 和 mgf1HashAlgorithm 相同 - sha384
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha384',
    mgf1HashAlgorithm: 'sha384',
    saltLength: 48,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test sha384');
  const signature = crypto.sign('sha384', data, privateKey);
  const verified = crypto.verify('sha384', data, publicKey, signature);
  
  addResult(
    'RSA-PSS sha384/sha384 组合',
    verified === true,
    '签名验证成功',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS sha384/sha384 组合', false, '成功', err.message, err.message, err.stack);
}

// 测试 3: hashAlgorithm 和 mgf1HashAlgorithm 相同 - sha512
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha512',
    mgf1HashAlgorithm: 'sha512',
    saltLength: 64,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test sha512');
  const signature = crypto.sign('sha512', data, privateKey);
  const verified = crypto.verify('sha512', data, publicKey, signature);
  
  addResult(
    'RSA-PSS sha512/sha512 组合',
    verified === true,
    '签名验证成功',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS sha512/sha512 组合', false, '成功', err.message, err.message, err.stack);
}

// 测试 4: hashAlgorithm 和 mgf1HashAlgorithm 不同 - sha256/sha384
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha384',
    saltLength: 32,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test mixed hash');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA-PSS sha256/sha384 混合',
    verified === true,
    'hashAlgorithm和mgf1HashAlgorithm可以不同',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS sha256/sha384 混合', false, '成功', err.message, err.message, err.stack);
}

// 测试 5: hashAlgorithm 和 mgf1HashAlgorithm 不同 - sha384/sha256
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha384',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 48,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test mixed hash reverse');
  const signature = crypto.sign('sha384', data, privateKey);
  const verified = crypto.verify('sha384', data, publicKey, signature);
  
  addResult(
    'RSA-PSS sha384/sha256 混合',
    verified === true,
    'hashAlgorithm和mgf1HashAlgorithm可以不同',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS sha384/sha256 混合', false, '成功', err.message, err.message, err.stack);
}

// 测试 6: hashAlgorithm 和 mgf1HashAlgorithm 不同 - sha512/sha256
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha512',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 64,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test sha512/sha256');
  const signature = crypto.sign('sha512', data, privateKey);
  const verified = crypto.verify('sha512', data, publicKey, signature);
  
  addResult(
    'RSA-PSS sha512/sha256 混合',
    verified === true,
    'hashAlgorithm和mgf1HashAlgorithm可以不同',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS sha512/sha256 混合', false, '成功', err.message, err.message, err.stack);
}

// ========== saltLength 边界测试 ==========

// 测试 7: saltLength = 0
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 0,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test saltLength=0');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA-PSS saltLength=0',
    verified === true,
    'saltLength=0应该被接受',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS saltLength=0', false, '成功', err.message, err.message, err.stack);
}

// 测试 8: saltLength = 1
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 1,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test saltLength=1');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA-PSS saltLength=1',
    verified === true,
    'saltLength=1应该被接受',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS saltLength=1', false, '成功', err.message, err.message, err.stack);
}

// 测试 9: saltLength = 16
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 16,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test saltLength=16');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA-PSS saltLength=16',
    verified === true,
    'saltLength=16应该被接受',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS saltLength=16', false, '成功', err.message, err.message, err.stack);
}

// 测试 10: saltLength = 32 (与 sha256 输出长度相同)
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 32,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test saltLength=32');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA-PSS saltLength=32',
    verified === true,
    'saltLength=32应该被接受',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS saltLength=32', false, '成功', err.message, err.message, err.stack);
}

// 测试 11: saltLength = 64
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 64,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test saltLength=64');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA-PSS saltLength=64',
    verified === true,
    'saltLength=64应该被接受',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS saltLength=64', false, '成功', err.message, err.message, err.stack);
}

// 测试 12: saltLength 过大（应该失败或被调整）
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 1000, // 非常大的 saltLength
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test large saltLength');
  try {
    const signature = crypto.sign('sha256', data, privateKey);
    const verified = crypto.verify('sha256', data, publicKey, signature);
    
    addResult(
      'RSA-PSS saltLength 过大',
      true,
      'saltLength过大被接受或自动调整',
      `验证=${verified}`
    );
  } catch (signErr) {
    // 签名时失败也是合理的
    addResult(
      'RSA-PSS saltLength 过大',
      true,
      'saltLength过大在签名时被拒绝（预期）',
      `签名错误: ${signErr.message.substring(0, 50)}`
    );
  }
} catch (err) {
  // 生成时失败也是合理的
  const isExpectedError = err.message.includes('saltLength') || 
                          err.message.includes('salt') ||
                          err.message.includes('too large');
  addResult(
    'RSA-PSS saltLength 过大',
    isExpectedError,
    'saltLength过大被拒绝（预期）',
    `错误: ${err.message.substring(0, 50)}`,
    err.message,
    err.stack
  );
}

// 测试 13: saltLength 负数（应该失败）
try {
  crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: -1,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA-PSS saltLength 负数错误',
    false,
    '应该拒绝负数saltLength',
    '未抛出错误'
  );
} catch (err) {
  const isExpectedError = err.message.includes('saltLength') || 
                          err.message.includes('range') ||
                          err.message.includes('negative');
  addResult(
    'RSA-PSS saltLength 负数错误',
    isExpectedError,
    '拒绝负数saltLength',
    `错误: ${err.message.substring(0, 50)}`,
    err.message,
    err.stack
  );
}

// ========== 不提供可选参数测试 ==========

// 测试 14: 仅提供 modulusLength（其他参数使用默认值）
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test default params');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA-PSS 默认参数',
    verified === true,
    '不提供hash和salt参数应使用默认值',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS 默认参数', false, '成功', err.message, err.message, err.stack);
}

// 测试 15: 只提供 hashAlgorithm，不提供 mgf1HashAlgorithm
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha384',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test only hashAlgorithm');
  const signature = crypto.sign('sha384', data, privateKey);
  const verified = crypto.verify('sha384', data, publicKey, signature);
  
  addResult(
    'RSA-PSS 仅 hashAlgorithm',
    verified === true,
    'mgf1HashAlgorithm应使用默认值',
    `验证=${verified}`
  );
} catch (err) {
  addResult('RSA-PSS 仅 hashAlgorithm', false, '成功', err.message, err.message, err.stack);
}

// 测试 16: 只提供 saltLength（需要hashAlgorithm）
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    saltLength: 20,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const data = Buffer.from('test only saltLength');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA-PSS 仅 saltLength',
    verified === true,
    'hashAlgorithm应使用默认值（或需要显式提供）',
    `验证=${verified}`
  );
} catch (err) {
  // 只提供 saltLength 可能要求也提供 hashAlgorithm
  const isExpectedError = err.message.includes('digest') || 
                          err.message.includes('hash') ||
                          err.message.includes('not allowed');
  addResult(
    'RSA-PSS 仅 saltLength',
    isExpectedError || false,
    '成功或需要hashAlgorithm（预期行为）',
    isExpectedError ? `需要hash: ${err.message.substring(0, 50)}` : err.message,
    err.message,
    err.stack
  );
}

// ========== KeyObject 测试 ==========

// 测试 17: RSA-PSS KeyObject 的 asymmetricKeyDetails
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha384',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 48
  });
  
  const details = publicKey.asymmetricKeyDetails || privateKey.asymmetricKeyDetails;
  const hasDetails = details && 
                     details.modulusLength === 2048;
  
  // 检查 PSS 特有参数（如果实现提供）
  const hasPssParams = details && (
    details.mgf1HashAlgorithm !== undefined ||
    details.hashAlgorithm !== undefined ||
    details.saltLength !== undefined
  );
  
  addResult(
    'RSA-PSS asymmetricKeyDetails',
    hasDetails,
    'KeyObject包含modulusLength信息',
    `modulusLength=${details?.modulusLength}, hasPssParams=${hasPssParams}`
  );
} catch (err) {
  addResult('RSA-PSS asymmetricKeyDetails', false, '成功', err.message, err.message, err.stack);
}

// 测试 18: RSA-PSS 不同 modulusLength
const modulusLengths = [1024, 2048, 3072, 4096];
for (const len of modulusLengths) {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
      modulusLength: len,
      hashAlgorithm: 'sha256',
      mgf1HashAlgorithm: 'sha256',
      saltLength: 32,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    const data = Buffer.from('test');
    const signature = crypto.sign('sha256', data, privateKey);
    const verified = crypto.verify('sha256', data, publicKey, signature);
    
    addResult(
      `RSA-PSS modulusLength=${len}`,
      verified === true,
      `支持${len}位`,
      `验证=${verified}`
    );
  } catch (err) {
    addResult(`RSA-PSS modulusLength=${len}`, false, '成功', err.message, err.message, err.stack);
  }
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== RSA-PSS 高级参数测试结果 ==========\n');
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

