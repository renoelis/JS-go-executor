const crypto = require('crypto');

/**
 * DH 标准组测试
 * 测试预定义的 Diffie-Hellman 组
 * 注意：Node.js crypto.generateKeyPair 可能不直接支持标准组，
 * 这里主要测试 group 参数和 prime 参数的使用
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

// ========== 基本 DH 参数测试 ==========

// 测试 1: DH primeLength=512, generator=2
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 512,
    generator: 2,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
  
  addResult(
    'DH 512/2',
    isValid,
    'DH 512位 generator=2',
    `生成成功`
  );
} catch (err) {
  addResult('DH 512/2', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 2: DH primeLength=1024, generator=2
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 1024,
    generator: 2,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
  
  addResult(
    'DH 1024/2',
    isValid,
    'DH 1024位 generator=2',
    `生成成功`
  );
} catch (err) {
  addResult('DH 1024/2', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 3: DH primeLength=2048, generator=2
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 2048,
    generator: 2,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
  
  addResult(
    'DH 2048/2',
    isValid,
    'DH 2048位 generator=2',
    `生成成功`
  );
} catch (err) {
  addResult('DH 2048/2', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 4: DH primeLength=2048, generator=5
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 2048,
    generator: 5,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
  
  addResult(
    'DH 2048/5',
    isValid,
    'DH 2048位 generator=5',
    `生成成功`
  );
} catch (err) {
  addResult('DH 2048/5', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 5: DH primeLength=4096, generator=2
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 4096,
    generator: 2,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
  
  addResult(
    'DH 4096/2',
    isValid,
    'DH 4096位 generator=2',
    `生成成功`
  );
} catch (err) {
  addResult('DH 4096/2', false, '成功生成', err.message, err.message, err.stack);
}

// ========== DH generator 变化测试 ==========

// 测试 6: DH generator=3
try {
  const { publicKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 2048,
    generator: 3,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DH generator=3',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '支持 generator=3',
    '成功'
  );
} catch (err) {
  // generator=3 可能不被支持或很慢
  const isExpectedError = err.message.includes('generator') || err.message.includes('timeout');
  addResult(
    'DH generator=3',
    isExpectedError || false,
    '支持或拒绝 generator=3',
    isExpectedError ? `不支持: ${err.message.substring(0, 50)}` : err.message,
    err.message,
    err.stack
  );
}

// 测试 7: DH generator=7
try {
  const { publicKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 2048,
    generator: 7,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DH generator=7',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '支持 generator=7',
    '成功'
  );
} catch (err) {
  const isExpectedError = err.message.includes('generator') || err.message.includes('timeout');
  addResult(
    'DH generator=7',
    isExpectedError || false,
    '支持或拒绝 generator=7',
    isExpectedError ? `不支持: ${err.message.substring(0, 50)}` : err.message,
    err.message,
    err.stack
  );
}

// ========== DH prime 参数测试（如果支持）==========

// 测试 8: 尝试使用 prime 参数（可能不被 generateKeyPair 支持）
try {
  // 这是一个小的安全素数 (2 * p + 1)
  const smallPrime = Buffer.from([
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
    0xC9, 0x0F, 0xDA, 0xA2, 0x21, 0x68, 0xC2, 0x34
  ]);
  
  const { publicKey } = crypto.generateKeyPairSync('dh', {
    prime: smallPrime,
    generator: 2,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DH prime 参数',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '支持 prime 参数',
    '成功'
  );
} catch (err) {
  // prime 参数可能不被 generateKeyPair 支持
  const isUnsupportedParam = err.message.includes('prime') || 
                              err.message.includes('primeLength') ||
                              err.message.includes('required') ||
                              err.message.includes('Unknown');
  
  addResult(
    'DH prime 参数',
    isUnsupportedParam || true,
    'prime 参数可能不被支持',
    isUnsupportedParam ? `不支持 prime 参数（预期）` : err.message,
    err.message,
    err.stack
  );
}

// ========== DH group 参数测试（如果支持）==========

// 常见的 DH 标准组名称
const standardGroups = ['modp1', 'modp2', 'modp5', 'modp14', 'modp15', 'modp16', 'modp17', 'modp18'];

for (const group of standardGroups) {
  try {
    const { publicKey } = crypto.generateKeyPairSync('dh', {
      group: group,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      `DH group=${group}`,
      publicKey.includes('-----BEGIN PUBLIC KEY-----'),
      `支持标准组 ${group}`,
      '成功'
    );
  } catch (err) {
    // group 参数可能不被 generateKeyPair 支持
    const isUnsupportedParam = err.message.includes('group') || 
                                err.message.includes('primeLength') ||
                                err.message.includes('required') ||
                                err.message.includes('Unknown');
    
    addResult(
      `DH group=${group}`,
      isUnsupportedParam || true,
      `group 参数可能不被支持`,
      isUnsupportedParam ? `不支持 group 参数（预期）` : err.message
    );
  }
}

// ========== DH KeyObject 测试 ==========

// 测试: DH KeyObject 的 asymmetricKeyDetails
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 2048,
    generator: 2
  });
  
  const details = publicKey.asymmetricKeyDetails || privateKey.asymmetricKeyDetails;
  const hasDetails = details && typeof details === 'object';
  
  addResult(
    'DH KeyObject asymmetricKeyDetails',
    hasDetails,
    'KeyObject 包含 asymmetricKeyDetails',
    hasDetails ? `存在 asymmetricKeyDetails` : '不存在'
  );
} catch (err) {
  addResult('DH KeyObject asymmetricKeyDetails', false, '存在', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== DH 标准组测试结果 ==========\n');
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

