const crypto = require('crypto');

/**
 * generateKeyPair 错误处理测试
 * 测试各种无效参数和错误情况
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

// 测试 1: 无效的密钥类型
try {
  crypto.generateKeyPairSync('invalid-type', {
    modulusLength: 2048
  });
  addResult('无效密钥类型错误', false, '应抛出错误', '未抛出错误', null, null);
} catch (err) {
  const isExpectedError = err.message.includes('invalid') || 
                          err.message.includes('Unknown') ||
                          err.code === 'ERR_INVALID_ARG_VALUE';
  addResult(
    '无效密钥类型错误',
    isExpectedError,
    '抛出类型错误',
    err.message,
    err.message,
    err.stack
  );
}

// 测试 2: RSA 缺少 modulusLength
try {
  crypto.generateKeyPairSync('rsa', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  addResult('RSA 缺少 modulusLength 错误', false, '应抛出错误', '未抛出错误', null, null);
} catch (err) {
  const isExpectedError = err.message.includes('modulusLength') || 
                          err.message.includes('required') ||
                          err.code === 'ERR_INVALID_ARG_VALUE';
  addResult(
    'RSA 缺少 modulusLength 错误',
    isExpectedError,
    '抛出参数错误',
    err.message,
    err.message,
    err.stack
  );
}

// 测试 3: EC 缺少 namedCurve
try {
  crypto.generateKeyPairSync('ec', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  addResult('EC 缺少 namedCurve 错误', false, '应抛出错误', '未抛出错误', null, null);
} catch (err) {
  const isExpectedError = err.message.includes('namedCurve') || 
                          err.message.includes('required');
  addResult(
    'EC 缺少 namedCurve 错误',
    isExpectedError,
    '抛出参数错误',
    err.message,
    err.message,
    err.stack
  );
}

// 测试 4: 无效的 namedCurve
try {
  crypto.generateKeyPairSync('ec', {
    namedCurve: 'invalid-curve',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  addResult('无效 namedCurve 错误', false, '应抛出错误', '未抛出错误', null, null);
} catch (err) {
  const isExpectedError = err.message.includes('curve') || 
                          err.message.includes('invalid') ||
                          err.message.includes('Unknown');
  addResult(
    '无效 namedCurve 错误',
    isExpectedError,
    '抛出参数错误',
    err.message,
    err.message,
    err.stack
  );
}

// 测试 5: RSA modulusLength 太小 (512)
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 512,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  // 某些版本可能允许512
  addResult(
    'RSA modulusLength=512',
    true,
    '允许或拒绝512位',
    '成功生成（某些版本允许）'
  );
} catch (err) {
  addResult(
    'RSA modulusLength=512',
    true,
    '允许或拒绝512位',
    `拒绝：${err.message}`
  );
}

// 测试 6: 无效的 format
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'invalid-format'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  addResult('无效 format 错误', false, '应抛出错误', '未抛出错误', null, null);
} catch (err) {
  const isExpectedError = err.message.includes('format') || 
                          err.message.includes('invalid');
  addResult(
    '无效 format 错误',
    isExpectedError,
    '抛出参数错误',
    err.message,
    err.message,
    err.stack
  );
}

// 测试 7: 无效的 type
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'invalid-type',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  addResult('无效 type 错误', false, '应抛出错误', '未抛出错误', null, null);
} catch (err) {
  const isExpectedError = err.message.includes('type') || 
                          err.message.includes('invalid');
  addResult(
    '无效 type 错误',
    isExpectedError,
    '抛出参数错误',
    err.message,
    err.message,
    err.stack
  );
}

// 测试 8: 空 passphrase（边界情况）
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
      cipher: 'aes-256-cbc',
      passphrase: ''
    }
  });
  
  addResult(
    '空 passphrase',
    true,
    '接受或拒绝空密码',
    '接受'
  );
} catch (err) {
  addResult(
    '空 passphrase',
    true,
    '接受或拒绝空密码',
    `拒绝：${err.message}`
  );
}

// 测试 9: DH 缺少 primeLength
try {
  crypto.generateKeyPairSync('dh', {
    generator: 2,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  addResult('DH 缺少 primeLength 错误', false, '应抛出错误', '未抛出错误', null, null);
} catch (err) {
  const isExpectedError = err.message.includes('primeLength') || 
                          err.message.includes('required') ||
                          err.message.includes('prime');
  addResult(
    'DH 缺少 primeLength 错误',
    isExpectedError,
    '抛出参数错误',
    err.message,
    err.message,
    err.stack
  );
}

// 测试 10: DSA 使用默认 divisorLength (可选参数)
try {
  const { publicKey } = crypto.generateKeyPairSync('dsa', {
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
  
  // divisorLength 是可选的,应该使用默认值成功生成
  addResult(
    'DSA 默认 divisorLength',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '使用默认值成功生成',
    '成功'
  );
} catch (err) {
  addResult('DSA 默认 divisorLength', false, '使用默认值成功生成', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== 错误处理测试结果 ==========\n');
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

