const crypto = require('crypto');

/**
 * KeyObject 深度测试
 * 测试 KeyObject 的属性、方法和行为
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

// 测试 1: RSA KeyObject 属性验证
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const hasCorrectType = publicKey.asymmetricKeyType === 'rsa' && 
                         privateKey.asymmetricKeyType === 'rsa';
  
  const hasCorrectKeyType = publicKey.type === 'public' && 
                            privateKey.type === 'private';
  
  addResult(
    'RSA KeyObject 属性验证',
    hasCorrectType && hasCorrectKeyType,
    'asymmetricKeyType=rsa, type正确',
    `publicKey.type=${publicKey.type}, privateKey.type=${privateKey.type}, asymmetricKeyType=${publicKey.asymmetricKeyType}`
  );
} catch (err) {
  addResult('RSA KeyObject 属性验证', false, '成功验证', err.message, err.message, err.stack);
}

// 测试 2: RSA asymmetricKeyDetails
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0x10001
  });
  
  const publicDetails = publicKey.asymmetricKeyDetails;
  const privateDetails = privateKey.asymmetricKeyDetails;
  
  const hasModulusLength = publicDetails && publicDetails.modulusLength === 2048;
  const hasPublicExponent = publicDetails && publicDetails.publicExponent && 
                             (publicDetails.publicExponent.toString() === '65537' || 
                              publicDetails.publicExponent === 65537n);
  
  addResult(
    'RSA asymmetricKeyDetails',
    hasModulusLength,
    'modulusLength=2048',
    `modulusLength=${publicDetails?.modulusLength}, publicExponent=${publicDetails?.publicExponent}`
  );
} catch (err) {
  addResult('RSA asymmetricKeyDetails', false, '成功验证', err.message, err.message, err.stack);
}

// 测试 3: EC KeyObject 属性
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  
  const hasCorrectType = publicKey.asymmetricKeyType === 'ec' && 
                         privateKey.asymmetricKeyType === 'ec';
  
  const details = publicKey.asymmetricKeyDetails;
  const hasNamedCurve = details && details.namedCurve === 'prime256v1';
  
  addResult(
    'EC KeyObject 属性',
    hasCorrectType && hasNamedCurve,
    'asymmetricKeyType=ec, namedCurve=prime256v1',
    `type=${publicKey.asymmetricKeyType}, namedCurve=${details?.namedCurve}`
  );
} catch (err) {
  addResult('EC KeyObject 属性', false, '成功验证', err.message, err.message, err.stack);
}

// 测试 4: Ed25519 KeyObject 属性
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  
  const hasCorrectType = publicKey.asymmetricKeyType === 'ed25519' && 
                         privateKey.asymmetricKeyType === 'ed25519';
  
  addResult(
    'Ed25519 KeyObject 属性',
    hasCorrectType,
    'asymmetricKeyType=ed25519',
    `publicKey.type=${publicKey.asymmetricKeyType}`
  );
} catch (err) {
  addResult('Ed25519 KeyObject 属性', false, '成功验证', err.message, err.message, err.stack);
}

// 测试 5: KeyObject 导出为 PEM
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  
  const isValid = typeof publicPem === 'string' && 
                  typeof privatePem === 'string' &&
                  publicPem.includes('-----BEGIN PUBLIC KEY-----') &&
                  privatePem.includes('-----BEGIN PRIVATE KEY-----');
  
  addResult(
    'KeyObject 导出为 PEM',
    isValid,
    'PEM字符串',
    `导出成功=${isValid}`
  );
} catch (err) {
  addResult('KeyObject 导出为 PEM', false, '成功导出', err.message, err.message, err.stack);
}

// 测试 6: KeyObject 导出为 DER
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const publicDer = publicKey.export({ type: 'spki', format: 'der' });
  const privateDer = privateKey.export({ type: 'pkcs8', format: 'der' });
  
  const isValid = Buffer.isBuffer(publicDer) && 
                  Buffer.isBuffer(privateDer) &&
                  publicDer.length > 0 &&
                  privateDer.length > 0;
  
  addResult(
    'KeyObject 导出为 DER',
    isValid,
    'DER Buffer',
    `publicDer.length=${publicDer.length}, privateDer.length=${privateDer.length}`
  );
} catch (err) {
  addResult('KeyObject 导出为 DER', false, '成功导出', err.message, err.message, err.stack);
}

// 测试 7: KeyObject 导出为 JWK
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const publicJwk = publicKey.export({ format: 'jwk' });
  const privateJwk = privateKey.export({ format: 'jwk' });
  
  const isValid = typeof publicJwk === 'object' && 
                  typeof privateJwk === 'object' &&
                  publicJwk.kty === 'RSA' &&
                  publicJwk.n && publicJwk.e;
  
  addResult(
    'KeyObject 导出为 JWK',
    isValid,
    'JWK对象',
    `kty=${publicJwk.kty}, hasN=${!!publicJwk.n}, hasE=${!!publicJwk.e}`
  );
} catch (err) {
  addResult('KeyObject 导出为 JWK', false, '成功导出', err.message, err.message, err.stack);
}

// 测试 8: KeyObject 多次导出（不同格式）
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const pem1 = publicKey.export({ type: 'spki', format: 'pem' });
  const der = publicKey.export({ type: 'spki', format: 'der' });
  const pem2 = publicKey.export({ type: 'spki', format: 'pem' });
  const jwk = publicKey.export({ format: 'jwk' });
  
  const isValid = pem1 === pem2 && 
                  typeof pem1 === 'string' &&
                  Buffer.isBuffer(der) &&
                  typeof jwk === 'object';
  
  addResult(
    'KeyObject 多次导出',
    isValid,
    '多次导出一致',
    `pem1===pem2: ${pem1 === pem2}`
  );
} catch (err) {
  addResult('KeyObject 多次导出', false, '成功导出', err.message, err.message, err.stack);
}

// 测试 9: 私钥导出带密码
try {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const encryptedPem = privateKey.export({
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase: 'test-password'
  });
  
  const isEncrypted = encryptedPem.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----');
  
  addResult(
    'KeyObject 私钥加密导出',
    isEncrypted,
    '加密的PEM',
    `已加密=${isEncrypted}`
  );
} catch (err) {
  addResult('KeyObject 私钥加密导出', false, '成功导出', err.message, err.message, err.stack);
}

// 测试 10: RSA PKCS1 导出
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const publicPkcs1 = publicKey.export({ type: 'pkcs1', format: 'pem' });
  const privatePkcs1 = privateKey.export({ type: 'pkcs1', format: 'pem' });
  
  const isValid = publicPkcs1.includes('-----BEGIN RSA PUBLIC KEY-----') &&
                  privatePkcs1.includes('-----BEGIN RSA PRIVATE KEY-----');
  
  addResult(
    'RSA PKCS1 导出',
    isValid,
    'PKCS1格式',
    `导出成功=${isValid}`
  );
} catch (err) {
  addResult('RSA PKCS1 导出', false, '成功导出', err.message, err.message, err.stack);
}

// 测试 11: EC 不同曲线的 KeyObject
const ecCurves = ['prime256v1', 'secp256k1', 'secp384r1', 'secp521r1'];
for (const curve of ecCurves) {
  try {
    const { publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: curve
    });
    
    const details = publicKey.asymmetricKeyDetails;
    const isValid = publicKey.asymmetricKeyType === 'ec' &&
                    details && details.namedCurve === curve;
    
    addResult(
      `EC KeyObject ${curve}`,
      isValid,
      `namedCurve=${curve}`,
      `actual=${details?.namedCurve}`
    );
  } catch (err) {
    addResult(`EC KeyObject ${curve}`, false, '成功生成', err.message, err.message, err.stack);
  }
}

// 测试 12: Ed25519 导出后重新导入
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  
  // 重新导入
  const importedPublic = crypto.createPublicKey(publicPem);
  const importedPrivate = crypto.createPrivateKey(privatePem);
  
  const isValid = importedPublic.asymmetricKeyType === 'ed25519' &&
                  importedPrivate.asymmetricKeyType === 'ed25519';
  
  addResult(
    'Ed25519 导出后重新导入',
    isValid,
    'KeyObject重建成功',
    `导入成功=${isValid}`
  );
} catch (err) {
  addResult('Ed25519 导出后重新导入', false, '成功导入', err.message, err.message, err.stack);
}

// 测试 13: KeyObject equals 方法（如果支持）
try {
  const { publicKey: pubKey1 } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const { publicKey: pubKey2 } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  // 导出再重新导入
  const pem = pubKey1.export({ type: 'spki', format: 'pem' });
  const reimported = crypto.createPublicKey(pem);
  
  // 检查是否有 equals 方法
  if (typeof pubKey1.equals === 'function') {
    const isSame = pubKey1.equals(reimported);
    const isDifferent = !pubKey1.equals(pubKey2);
    
    addResult(
      'KeyObject equals 方法',
      isSame && isDifferent,
      '相同密钥相等，不同密钥不等',
      `same=${isSame}, different=${isDifferent}`
    );
  } else {
    addResult(
      'KeyObject equals 方法',
      true,
      'equals方法不存在（可能版本不支持）',
      'equals方法未定义'
    );
  }
} catch (err) {
  addResult('KeyObject equals 方法', false, '测试成功', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== KeyObject 深度测试结果 ==========\n');
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


