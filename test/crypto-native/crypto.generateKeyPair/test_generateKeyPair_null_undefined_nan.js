const crypto = require('crypto');

/**
 * null/undefined/NaN 处理测试
 * 测试各种空值和特殊值的处理：
 * - null
 * - undefined
 * - NaN
 * - Infinity
 * - 空字符串
 * - 空对象
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

// ========== modulusLength 特殊值测试 ==========

// 测试 1: modulusLength = NaN
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: NaN,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=NaN',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA modulusLength=NaN',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 2: modulusLength = Infinity
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: Infinity,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=Infinity',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA modulusLength=Infinity',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 3: modulusLength = -Infinity
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: -Infinity,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=-Infinity',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA modulusLength=-Infinity',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 4: modulusLength = null
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: null,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=null',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA modulusLength=null',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 5: modulusLength = undefined (应使用默认值或报错)
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: undefined,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA modulusLength=undefined',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA modulusLength=undefined',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 6: 缺少 modulusLength
try {
  crypto.generateKeyPairSync('rsa', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA 缺少 modulusLength',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA 缺少 modulusLength',
    err.message.includes('modulusLength') || err.message.includes('required'),
    '应抛出 modulusLength 必需错误',
    `错误: ${err.message}`
  );
}

// ========== publicExponent 特殊值测试 ==========

// 测试 7: publicExponent = NaN
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: NaN,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA publicExponent=NaN',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA publicExponent=NaN',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 8: publicExponent = Infinity
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: Infinity,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA publicExponent=Infinity',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA publicExponent=Infinity',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 9: publicExponent = null
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: null,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'RSA publicExponent=null',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'RSA publicExponent=null',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// ========== passphrase 特殊值测试 ==========

// 测试 10: passphrase = null
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: null
    }
  });
  
  addResult(
    'passphrase=null',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'passphrase=null',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 11: passphrase = undefined
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: undefined
    }
  });
  
  addResult(
    'passphrase=undefined',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'passphrase=undefined',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 12: passphrase = 空字符串
try {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: ''
    }
  });
  
  const isEncrypted = privateKey && privateKey.includes('ENCRYPTED');
  addResult(
    'passphrase=空字符串',
    isEncrypted,
    '应成功生成加密私钥',
    isEncrypted ? '成功生成加密私钥' : '生成成功但未加密'
  );
} catch (err) {
  addResult(
    'passphrase=空字符串',
    false,
    '应成功生成加密私钥',
    `错误: ${err.message}`,
    err.message,
    err.stack
  );
}

// 测试 13: passphrase = 数字 (类型错误)
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: 12345
    }
  });
  
  addResult(
    'passphrase=数字',
    false,
    '应抛出类型错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'passphrase=数字',
    true,
    '应抛出类型错误',
    `错误: ${err.message}`
  );
}

// ========== namedCurve 特殊值测试 ==========

// 测试 14: namedCurve = null
try {
  crypto.generateKeyPairSync('ec', {
    namedCurve: null,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'EC namedCurve=null',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'EC namedCurve=null',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 15: namedCurve = undefined
try {
  crypto.generateKeyPairSync('ec', {
    namedCurve: undefined,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'EC namedCurve=undefined',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'EC namedCurve=undefined',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 16: namedCurve = 空字符串
try {
  crypto.generateKeyPairSync('ec', {
    namedCurve: '',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'EC namedCurve=空字符串',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'EC namedCurve=空字符串',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 17: 缺少 namedCurve
try {
  crypto.generateKeyPairSync('ec', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'EC 缺少 namedCurve',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'EC 缺少 namedCurve',
    err.message.includes('namedCurve') || err.message.includes('required'),
    '应抛出 namedCurve 必需错误',
    `错误: ${err.message}`
  );
}

// ========== options 为 null/undefined 测试 ==========

// 测试 18: options = null
try {
  crypto.generateKeyPairSync('rsa', null);
  
  addResult(
    'options=null',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'options=null',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 19: options = undefined
try {
  crypto.generateKeyPairSync('rsa', undefined);
  
  addResult(
    'options=undefined',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'options=undefined',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 20: options = 空对象
try {
  crypto.generateKeyPairSync('rsa', {});
  
  addResult(
    'options=空对象',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'options=空对象',
    err.message.includes('modulusLength') || err.message.includes('required'),
    '应抛出必需参数错误',
    `错误: ${err.message}`
  );
}

// ========== type 特殊值测试 ==========

// 测试 21: type = null
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: null, format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'publicKeyEncoding.type=null',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'publicKeyEncoding.type=null',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 22: type = undefined
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: undefined, format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'publicKeyEncoding.type=undefined',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'publicKeyEncoding.type=undefined',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 23: format = null
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: null },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  addResult(
    'publicKeyEncoding.format=null',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'publicKeyEncoding.format=null',
    true,
    '应抛出错误',
    `错误: ${err.message}`
  );
}

// 测试 24: cipher = null (有 passphrase)
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: null,
      passphrase: 'test'
    }
  });
  
  addResult(
    'cipher=null (有passphrase)',
    false,
    '应抛出错误',
    '未抛出错误'
  );
} catch (err) {
  addResult(
    'cipher=null (有passphrase)',
    true,
    '应抛出错误',
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

