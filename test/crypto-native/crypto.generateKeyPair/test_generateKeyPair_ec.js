const crypto = require('crypto');

/**
 * EC (椭圆曲线) 密钥对生成测试
 * 测试各种椭圆曲线: prime256v1, secp256k1, secp384r1, secp521r1
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

// 测试 1: EC prime256v1 (P-256) PEM
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
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
    'EC prime256v1 生成',
    isValid,
    'EC P-256密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('EC prime256v1 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 2: EC secp256k1
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
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
    'EC secp256k1 生成',
    isValid,
    'EC secp256k1密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('EC secp256k1 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 3: EC secp384r1 (P-384)
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp384r1',
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
    'EC secp384r1 生成',
    isValid,
    'EC P-384密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('EC secp384r1 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 4: EC secp521r1 (P-521)
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp521r1',
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
    'EC secp521r1 生成',
    isValid,
    'EC P-521密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('EC secp521r1 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 5: EC DER 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
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
    'EC DER 格式',
    isValidPublic && isValidPrivate,
    'DER格式Buffer',
    `公钥Buffer长度=${publicKey.length}, 私钥Buffer长度=${privateKey.length}`
  );
} catch (err) {
  addResult('EC DER 格式', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 6: EC JWK 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'jwk'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'jwk'
    }
  });
  
  const isValid = typeof publicKey === 'object' && 
                  publicKey.kty === 'EC' &&
                  publicKey.crv === 'P-256';
  
  addResult(
    'EC JWK 格式',
    isValid,
    'JWK对象',
    `kty=${publicKey.kty}, crv=${publicKey.crv}`
  );
} catch (err) {
  addResult('EC JWK 格式', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 7: EC 返回 KeyObject
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  
  const isKeyObject = typeof publicKey === 'object' && 
                      typeof privateKey === 'object' &&
                      publicKey.asymmetricKeyType === 'ec' &&
                      privateKey.asymmetricKeyType === 'ec';
  
  addResult(
    'EC 返回 KeyObject',
    isKeyObject,
    'KeyObject对象',
    `类型=${publicKey.asymmetricKeyType}, ${privateKey.asymmetricKeyType}`
  );
} catch (err) {
  addResult('EC 返回 KeyObject', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 8: EC 密钥可用性测试（签名/验证）
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  
  const data = Buffer.from('test data for ec');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'EC 密钥可用性测试',
    verified === true,
    '签名验证成功',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('EC 密钥可用性测试', false, '签名验证成功', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== EC 测试结果 ==========\n');
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

