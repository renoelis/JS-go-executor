const crypto = require('crypto');

/**
 * DSA 和 DH (Diffie-Hellman) 密钥对生成测试
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

// 测试 1: DSA 基本生成
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: 256,
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
    'DSA 生成 (2048/256)',
    isValid,
    'DSA密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('DSA 生成 (2048/256)', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 2: DSA divisorLength=224
try {
  const { publicKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: 224,
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
    'DSA divisorLength=224',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('DSA divisorLength=224', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 3: DSA DER 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dsa', {
    modulusLength: 2048,
    divisorLength: 256,
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
    'DSA DER 格式',
    isValidPublic && isValidPrivate,
    'DER格式Buffer',
    `公钥Buffer长度=${publicKey.length}, 私钥Buffer长度=${privateKey.length}`
  );
} catch (err) {
  addResult('DSA DER 格式', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 4: DH 基本生成
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 2048,
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
  
  const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
  
  addResult(
    'DH 生成 (2048, g=2)',
    isValid,
    'DH密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('DH 生成 (2048, g=2)', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 5: DH 不同生成元
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 1024,
    generator: 5,
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
    'DH 生成 (1024, g=5)',
    isValid,
    'DH密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('DH 生成 (1024, g=5)', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 6: DH DER 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 2048,
    generator: 2,
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
    'DH DER 格式',
    isValidPublic && isValidPrivate,
    'DER格式Buffer',
    `公钥Buffer长度=${publicKey.length}, 私钥Buffer长度=${privateKey.length}`
  );
} catch (err) {
  addResult('DH DER 格式', false, '成功生成', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== DSA/DH 测试结果 ==========\n');
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

