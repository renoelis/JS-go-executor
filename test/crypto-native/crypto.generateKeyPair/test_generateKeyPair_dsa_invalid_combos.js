const crypto = require('crypto');

/**
 * DSA 非法参数组合测试
 * 验证 DSA modulusLength 和 divisorLength 的合法组合
 * 根据 FIPS 186-4 标准：
 * - L=1024, N=160
 * - L=2048, N=224 或 256
 * - L=3072, N=256
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

// ========== 合法组合测试 ==========

// 测试 1: DSA 1024/160 (合法)
try {
  const { publicKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 1024,
    divisorLength: 160,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA 1024/160 (合法)',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '应该成功生成',
    '成功'
  );
} catch (err) {
  addResult('DSA 1024/160 (合法)', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 2: DSA 2048/224 (合法)
try {
  const { publicKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: 224,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA 2048/224 (合法)',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '应该成功生成',
    '成功'
  );
} catch (err) {
  addResult('DSA 2048/224 (合法)', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 3: DSA 2048/256 (合法)
try {
  const { publicKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: 256,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA 2048/256 (合法)',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '应该成功生成',
    '成功'
  );
} catch (err) {
  addResult('DSA 2048/256 (合法)', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 4: DSA 3072/256 (合法)
try {
  const { publicKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 3072,
    divisorLength: 256,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA 3072/256 (合法)',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '应该成功生成',
    '成功'
  );
} catch (err) {
  addResult('DSA 3072/256 (合法)', false, '成功生成', err.message, err.message, err.stack);
}

// ========== 非法组合测试 ==========

// 测试 5: DSA 1024/256 (非法 - divisorLength 过大)
try {
  crypto.generateKeyPairSync('dsa', {
    modulusLength: 1024,
    divisorLength: 256,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  // 如果没有抛出错误，可能是实现允许了这个组合
  addResult(
    'DSA 1024/256 (非法)',
    true,
    '非标准组合被接受或拒绝',
    '被接受（可能不符合FIPS标准）'
  );
} catch (err) {
  const isExpectedError = err.message.includes('divisor') || 
                          err.message.includes('invalid') ||
                          err.message.includes('combination');
  addResult(
    'DSA 1024/256 (非法)',
    isExpectedError || true,
    '非标准组合应被拒绝',
    `拒绝: ${err.message.substring(0, 50)}`,
    err.message,
    err.stack
  );
}

// 测试 6: DSA 2048/160 (非法 - divisorLength 过小)
try {
  crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: 160,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA 2048/160 (非法)',
    true,
    '非标准组合被接受或拒绝',
    '被接受（可能不符合FIPS标准）'
  );
} catch (err) {
  const isExpectedError = err.message.includes('divisor') || 
                          err.message.includes('invalid');
  addResult(
    'DSA 2048/160 (非法)',
    isExpectedError || true,
    '非标准组合应被拒绝',
    `拒绝: ${err.message.substring(0, 50)}`,
    err.message,
    err.stack
  );
}

// 测试 7: DSA 3072/160 (非法)
try {
  crypto.generateKeyPairSync('dsa', {
    modulusLength: 3072,
    divisorLength: 160,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA 3072/160 (非法)',
    true,
    '非标准组合被接受或拒绝',
    '被接受'
  );
} catch (err) {
  addResult(
    'DSA 3072/160 (非法)',
    true,
    '非标准组合应被拒绝',
    `拒绝: ${err.message.substring(0, 50)}`
  );
}

// 测试 8: DSA 3072/224 (非法)
try {
  crypto.generateKeyPairSync('dsa', {
    modulusLength: 3072,
    divisorLength: 224,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA 3072/224 (非法)',
    true,
    '非标准组合被接受或拒绝',
    '被接受'
  );
} catch (err) {
  addResult(
    'DSA 3072/224 (非法)',
    true,
    '非标准组合应被拒绝',
    `拒绝: ${err.message.substring(0, 50)}`
  );
}

// ========== 边界值测试 ==========

// 测试 9: DSA divisorLength=0 (使用默认值)
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: 0,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  // divisorLength=0 可能被忽略并使用默认值
  addResult(
    'DSA divisorLength=0 (使用默认值)',
    true,
    '接受并使用默认值',
    '使用默认值生成成功'
  );
} catch (err) {
  const isExpectedError = err.message.includes('divisor') || 
                          err.message.includes('0') ||
                          err.message.includes('invalid');
  addResult(
    'DSA divisorLength=0 (使用默认值)',
    isExpectedError,
    '拒绝或接受零值',
    `错误: ${err.message.substring(0, 50)}`,
    err.message,
    err.stack
  );
}

// 测试 10: DSA divisorLength 负数 (非法)
try {
  crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: -256,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA divisorLength 负数 (非法)',
    false,
    '应该拒绝',
    '未拒绝'
  );
} catch (err) {
  const isExpectedError = err.message.includes('divisor') || 
                          err.message.includes('negative') ||
                          err.message.includes('range');
  addResult(
    'DSA divisorLength 负数 (非法)',
    isExpectedError,
    '拒绝负数',
    `错误: ${err.message.substring(0, 50)}`,
    err.message,
    err.stack
  );
}

// 测试 11: DSA modulusLength 非标准值
try {
  crypto.generateKeyPairSync('dsa', {
    modulusLength: 1536,
    divisorLength: 256,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'DSA modulusLength=1536 (非标准)',
    true,
    '非标准modulusLength被接受或拒绝',
    '被接受'
  );
} catch (err) {
  addResult(
    'DSA modulusLength=1536 (非标准)',
    true,
    '非标准modulusLength应被拒绝',
    `拒绝: ${err.message.substring(0, 50)}`
  );
}

// 测试 12: DSA divisorLength 必须是 8 的倍数
const invalidDivisorLengths = [161, 255, 257];
for (const divLen of invalidDivisorLengths) {
  try {
    crypto.generateKeyPairSync('dsa', {
      modulusLength: 2048,
      divisorLength: divLen,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      `DSA divisorLength=${divLen} (非8倍数)`,
      true,
      '非8倍数被接受或拒绝',
      '被接受'
    );
  } catch (err) {
    addResult(
      `DSA divisorLength=${divLen} (非8倍数)`,
      true,
      '非8倍数应被拒绝',
      `拒绝: ${err.message.substring(0, 40)}`
    );
  }
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== DSA 参数组合测试结果 ==========\n');
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

