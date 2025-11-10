const crypto = require('crypto');

/**
 * X25519 和 X448 密钥对生成测试
 * 用于密钥交换的曲线
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

// 测试 1: X25519 PEM 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519', {
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
    'X25519 生成 PEM',
    isValid,
    'X25519密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('X25519 生成 PEM', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 2: X25519 返回 KeyObject
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
  
  const isKeyObject = typeof publicKey === 'object' && 
                      typeof privateKey === 'object' &&
                      publicKey.asymmetricKeyType === 'x25519' &&
                      privateKey.asymmetricKeyType === 'x25519';
  
  addResult(
    'X25519 返回 KeyObject',
    isKeyObject,
    'KeyObject对象',
    `类型=${publicKey.asymmetricKeyType}`
  );
} catch (err) {
  addResult('X25519 返回 KeyObject', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 3: X25519 DER 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519', {
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
    'X25519 DER 格式',
    isValidPublic && isValidPrivate,
    'DER格式Buffer',
    `公钥Buffer长度=${publicKey.length}, 私钥Buffer长度=${privateKey.length}`
  );
} catch (err) {
  addResult('X25519 DER 格式', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 4: X448 PEM 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x448', {
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
    'X448 生成 PEM',
    isValid,
    'X448密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('X448 生成 PEM', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 5: X448 返回 KeyObject
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x448');
  
  const isKeyObject = typeof publicKey === 'object' && 
                      typeof privateKey === 'object' &&
                      publicKey.asymmetricKeyType === 'x448' &&
                      privateKey.asymmetricKeyType === 'x448';
  
  addResult(
    'X448 返回 KeyObject',
    isKeyObject,
    'KeyObject对象',
    `类型=${publicKey.asymmetricKeyType}`
  );
} catch (err) {
  addResult('X448 返回 KeyObject', false, '成功生成', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== X25519/X448 测试结果 ==========\n');
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

