const crypto = require('crypto');

/**
 * EdDSA 密钥对生成测试
 * 测试 Ed25519 和 Ed448 密钥对生成
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

// 测试 1: Ed25519 PEM 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
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
    'Ed25519 生成 PEM',
    isValid,
    'Ed25519密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('Ed25519 生成 PEM', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 2: Ed25519 返回 KeyObject
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  
  const isKeyObject = typeof publicKey === 'object' && 
                      typeof privateKey === 'object' &&
                      publicKey.asymmetricKeyType === 'ed25519' &&
                      privateKey.asymmetricKeyType === 'ed25519';
  
  addResult(
    'Ed25519 返回 KeyObject',
    isKeyObject,
    'KeyObject对象',
    `类型=${publicKey.asymmetricKeyType}`
  );
} catch (err) {
  addResult('Ed25519 返回 KeyObject', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 3: Ed25519 KeyObject 导出
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  
  const isValid = typeof publicPem === 'string' && 
                  typeof privatePem === 'string' &&
                  publicPem.includes('-----BEGIN PUBLIC KEY-----');
  
  addResult(
    'Ed25519 KeyObject 导出为 PEM',
    isValid,
    'PEM字符串',
    `导出成功=${isValid}`
  );
} catch (err) {
  addResult('Ed25519 KeyObject 导出为 PEM', false, '成功导出', err.message, err.message, err.stack);
}

// 测试 4: Ed25519 DER 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
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
    'Ed25519 DER 格式',
    isValidPublic && isValidPrivate,
    'DER格式Buffer',
    `公钥Buffer长度=${publicKey.length}, 私钥Buffer长度=${privateKey.length}`
  );
} catch (err) {
  addResult('Ed25519 DER 格式', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 5: Ed25519 JWK 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
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
                  typeof privateKey === 'object' &&
                  publicKey.kty === 'OKP' &&
                  publicKey.crv === 'Ed25519';
  
  addResult(
    'Ed25519 JWK 格式',
    isValid,
    'JWK对象',
    `kty=${publicKey.kty}, crv=${publicKey.crv}`
  );
} catch (err) {
  addResult('Ed25519 JWK 格式', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 6: Ed25519 密钥可用性测试（签名/验证）
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  
  const data = Buffer.from('test data for ed25519');
  const signature = crypto.sign(null, data, privateKey);
  const verified = crypto.verify(null, data, publicKey, signature);
  
  addResult(
    'Ed25519 密钥可用性测试',
    verified === true,
    '签名验证成功',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('Ed25519 密钥可用性测试', false, '签名验证成功', err.message, err.message, err.stack);
}

// 测试 7: Ed448 PEM 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed448', {
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
    'Ed448 生成 PEM',
    isValid,
    'Ed448密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('Ed448 生成 PEM', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 8: Ed448 返回 KeyObject
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed448');
  
  const isKeyObject = typeof publicKey === 'object' && 
                      typeof privateKey === 'object' &&
                      publicKey.asymmetricKeyType === 'ed448' &&
                      privateKey.asymmetricKeyType === 'ed448';
  
  addResult(
    'Ed448 返回 KeyObject',
    isKeyObject,
    'KeyObject对象',
    `类型=${publicKey.asymmetricKeyType}`
  );
} catch (err) {
  addResult('Ed448 返回 KeyObject', false, '成功生成', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== EdDSA 测试结果 ==========\n');
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

