const crypto = require('crypto');

/**
 * JWK 格式深度验证测试
 * 验证 JWK (JSON Web Key) 格式的完整性：
 * - RSA JWK 字段完整性（n, e, d, p, q, dp, dq, qi）
 * - EC JWK 字段完整性（kty, crv, x, y, d）
 * - Ed25519/Ed448 JWK 字段
 * - JWK 与 PEM/DER 格式互转一致性
 * - 私钥 JWK 包含私有字段验证
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

// ========== RSA JWK 测试 ==========

// 测试 1: RSA 公钥 JWK 字段
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'jwk'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const hasRequiredFields = publicKey.kty === 'RSA' &&
                            typeof publicKey.n === 'string' &&
                            typeof publicKey.e === 'string';
  
  const noPrivateFields = !publicKey.d && !publicKey.p && !publicKey.q &&
                          !publicKey.dp && !publicKey.dq && !publicKey.qi;
  
  addResult(
    'RSA 公钥 JWK 字段',
    hasRequiredFields && noPrivateFields,
    'kty, n, e 存在，私有字段不存在',
    `kty=${publicKey.kty}, n=${!!publicKey.n}, e=${!!publicKey.e}, 无私有字段=${noPrivateFields}`
  );
} catch (err) {
  addResult('RSA 公钥 JWK 字段', false, '字段完整', err.message, err.message, err.stack);
}

// 测试 2: RSA 私钥 JWK 完整字段
try {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'jwk'
    }
  });
  
  const hasPublicFields = privateKey.kty === 'RSA' &&
                          typeof privateKey.n === 'string' &&
                          typeof privateKey.e === 'string';
  
  const hasPrivateFields = typeof privateKey.d === 'string' &&
                           typeof privateKey.p === 'string' &&
                           typeof privateKey.q === 'string' &&
                           typeof privateKey.dp === 'string' &&
                           typeof privateKey.dq === 'string' &&
                           typeof privateKey.qi === 'string';
  
  addResult(
    'RSA 私钥 JWK 完整字段',
    hasPublicFields && hasPrivateFields,
    '公有和私有字段都存在',
    `公有字段=${hasPublicFields}, 私有字段=${hasPrivateFields}`
  );
} catch (err) {
  addResult('RSA 私钥 JWK 完整字段', false, '字段完整', err.message, err.message, err.stack);
}

// 测试 3: RSA JWK n 和 e 的 Base64URL 编码验证
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'jwk'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  // Base64URL 应该不包含 +, /, = 字符
  const isBase64URL = !publicKey.n.includes('+') &&
                      !publicKey.n.includes('/') &&
                      !publicKey.n.includes('=') &&
                      !publicKey.e.includes('+') &&
                      !publicKey.e.includes('/') &&
                      !publicKey.e.includes('=');
  
  addResult(
    'RSA JWK Base64URL 编码',
    isBase64URL,
    'n 和 e 应为 Base64URL 编码',
    `n长度=${publicKey.n.length}, e长度=${publicKey.e.length}, 符合Base64URL=${isBase64URL}`
  );
} catch (err) {
  addResult('RSA JWK Base64URL 编码', false, '正确编码', err.message, err.message, err.stack);
}

// 测试 4: RSA JWK 可用性验证
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'jwk'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'jwk'
    }
  });
  
  // 从 JWK 重新创建 KeyObject
  const publicKeyObj = crypto.createPublicKey({ key: publicKey, format: 'jwk' });
  const privateKeyObj = crypto.createPrivateKey({ key: privateKey, format: 'jwk' });
  
  const data = Buffer.from('test jwk usage');
  const signature = crypto.sign('sha256', data, privateKeyObj);
  const verified = crypto.verify('sha256', data, publicKeyObj, signature);
  
  addResult(
    'RSA JWK 可用性',
    verified === true,
    'JWK可用于签名验证',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('RSA JWK 可用性', false, 'JWK可用', err.message, err.message, err.stack);
}

// 测试 5: RSA JWK 与 PEM 互转一致性
try {
  const { publicKey: pemPublic, privateKey: pemPrivate } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  // 导出为 JWK
  const publicJwk = pemPublic.export({ format: 'jwk' });
  const privateJwk = pemPrivate.export({ format: 'jwk' });
  
  // 从 JWK 重新导入
  const publicKeyObj = crypto.createPublicKey({ key: publicJwk, format: 'jwk' });
  const privateKeyObj = crypto.createPrivateKey({ key: privateJwk, format: 'jwk' });
  
  // 验证签名
  const data = Buffer.from('test consistency');
  const signature = crypto.sign('sha256', data, privateKeyObj);
  const verified = crypto.verify('sha256', data, publicKeyObj, signature);
  
  // 也能用原始的 PEM KeyObject 验证
  const verifiedOriginal = crypto.verify('sha256', data, pemPublic, signature);
  
  addResult(
    'RSA JWK-PEM 互转一致性',
    verified === true && verifiedOriginal === true,
    'JWK与PEM格式互转后仍可用',
    `JWK验证=${verified}, PEM验证=${verifiedOriginal}`
  );
} catch (err) {
  addResult('RSA JWK-PEM 互转一致性', false, '互转一致', err.message, err.message, err.stack);
}

// ========== EC JWK 测试 ==========

// 测试 6: EC 公钥 JWK 字段
try {
  const { publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'jwk'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const hasRequiredFields = publicKey.kty === 'EC' &&
                            publicKey.crv === 'P-256' &&
                            typeof publicKey.x === 'string' &&
                            typeof publicKey.y === 'string';
  
  const noPrivateField = !publicKey.d;
  
  addResult(
    'EC 公钥 JWK 字段',
    hasRequiredFields && noPrivateField,
    'kty, crv, x, y 存在，d 不存在',
    `kty=${publicKey.kty}, crv=${publicKey.crv}, x=${!!publicKey.x}, y=${!!publicKey.y}, d=${!!publicKey.d}`
  );
} catch (err) {
  addResult('EC 公钥 JWK 字段', false, '字段完整', err.message, err.message, err.stack);
}

// 测试 7: EC 私钥 JWK 完整字段
try {
  const { privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'jwk'
    }
  });
  
  const hasAllFields = privateKey.kty === 'EC' &&
                       privateKey.crv === 'P-256' &&
                       typeof privateKey.x === 'string' &&
                       typeof privateKey.y === 'string' &&
                       typeof privateKey.d === 'string';
  
  addResult(
    'EC 私钥 JWK 完整字段',
    hasAllFields,
    'kty, crv, x, y, d 都存在',
    `kty=${privateKey.kty}, crv=${privateKey.crv}, x=${!!privateKey.x}, y=${!!privateKey.y}, d=${!!privateKey.d}`
  );
} catch (err) {
  addResult('EC 私钥 JWK 完整字段', false, '字段完整', err.message, err.message, err.stack);
}

// 测试 8: EC 不同曲线的 crv 映射
const ecCurveMapping = [
  { namedCurve: 'prime256v1', expectedCrv: 'P-256' },
  { namedCurve: 'secp384r1', expectedCrv: 'P-384' },
  { namedCurve: 'secp521r1', expectedCrv: 'P-521' }
];

for (const { namedCurve, expectedCrv } of ecCurveMapping) {
  try {
    const { publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: namedCurve,
      publicKeyEncoding: {
        type: 'spki',
        format: 'jwk'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    const isCorrect = publicKey.crv === expectedCrv;
    
    addResult(
      `EC JWK ${namedCurve} -> ${expectedCrv}`,
      isCorrect,
      `crv应为${expectedCrv}`,
      `实际crv=${publicKey.crv}`
    );
  } catch (err) {
    addResult(`EC JWK ${namedCurve} -> ${expectedCrv}`, false, 'crv映射正确', err.message, err.message, err.stack);
  }
}

// 测试 9: EC JWK 可用性
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
  
  const publicKeyObj = crypto.createPublicKey({ key: publicKey, format: 'jwk' });
  const privateKeyObj = crypto.createPrivateKey({ key: privateKey, format: 'jwk' });
  
  const data = Buffer.from('test ec jwk');
  const signature = crypto.sign('sha256', data, privateKeyObj);
  const verified = crypto.verify('sha256', data, publicKeyObj, signature);
  
  addResult(
    'EC JWK 可用性',
    verified === true,
    'JWK可用于签名验证',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('EC JWK 可用性', false, 'JWK可用', err.message, err.message, err.stack);
}

// ========== Ed25519 JWK 测试 ==========

// 测试 10: Ed25519 公钥 JWK 字段
try {
  const { publicKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'jwk'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const hasRequiredFields = publicKey.kty === 'OKP' &&
                            publicKey.crv === 'Ed25519' &&
                            typeof publicKey.x === 'string';
  
  const noPrivateField = !publicKey.d;
  
  addResult(
    'Ed25519 公钥 JWK 字段',
    hasRequiredFields && noPrivateField,
    'kty=OKP, crv=Ed25519, x存在, d不存在',
    `kty=${publicKey.kty}, crv=${publicKey.crv}, x=${!!publicKey.x}, d=${!!publicKey.d}`
  );
} catch (err) {
  addResult('Ed25519 公钥 JWK 字段', false, '字段完整', err.message, err.message, err.stack);
}

// 测试 11: Ed25519 私钥 JWK 完整字段
try {
  const { privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'jwk'
    }
  });
  
  const hasAllFields = privateKey.kty === 'OKP' &&
                       privateKey.crv === 'Ed25519' &&
                       typeof privateKey.x === 'string' &&
                       typeof privateKey.d === 'string';
  
  addResult(
    'Ed25519 私钥 JWK 完整字段',
    hasAllFields,
    'kty, crv, x, d 都存在',
    `kty=${privateKey.kty}, crv=${privateKey.crv}, x=${!!privateKey.x}, d=${!!privateKey.d}`
  );
} catch (err) {
  addResult('Ed25519 私钥 JWK 完整字段', false, '字段完整', err.message, err.message, err.stack);
}

// 测试 12: Ed25519 JWK 可用性
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
  
  const publicKeyObj = crypto.createPublicKey({ key: publicKey, format: 'jwk' });
  const privateKeyObj = crypto.createPrivateKey({ key: privateKey, format: 'jwk' });
  
  const data = Buffer.from('test ed25519 jwk');
  const signature = crypto.sign(null, data, privateKeyObj);
  const verified = crypto.verify(null, data, publicKeyObj, signature);
  
  addResult(
    'Ed25519 JWK 可用性',
    verified === true,
    'JWK可用于签名验证',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('Ed25519 JWK 可用性', false, 'JWK可用', err.message, err.message, err.stack);
}

// ========== Ed448 JWK 测试 ==========

// 测试 13: Ed448 公钥 JWK 字段
try {
  const { publicKey } = crypto.generateKeyPairSync('ed448', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'jwk'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const hasRequiredFields = publicKey.kty === 'OKP' &&
                            publicKey.crv === 'Ed448' &&
                            typeof publicKey.x === 'string';
  
  addResult(
    'Ed448 公钥 JWK 字段',
    hasRequiredFields,
    'kty=OKP, crv=Ed448, x存在',
    `kty=${publicKey.kty}, crv=${publicKey.crv}, x=${!!publicKey.x}`
  );
} catch (err) {
  addResult('Ed448 公钥 JWK 字段', false, '字段完整', err.message, err.message, err.stack);
}

// 测试 14: Ed448 私钥 JWK 完整字段
try {
  const { privateKey } = crypto.generateKeyPairSync('ed448', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'jwk'
    }
  });
  
  const hasAllFields = privateKey.kty === 'OKP' &&
                       privateKey.crv === 'Ed448' &&
                       typeof privateKey.x === 'string' &&
                       typeof privateKey.d === 'string';
  
  addResult(
    'Ed448 私钥 JWK 完整字段',
    hasAllFields,
    'kty, crv, x, d 都存在',
    `kty=${privateKey.kty}, crv=${privateKey.crv}, x=${!!privateKey.x}, d=${!!privateKey.d}`
  );
} catch (err) {
  addResult('Ed448 私钥 JWK 完整字段', false, '字段完整', err.message, err.message, err.stack);
}

// ========== X25519 JWK 测试 ==========

// 测试 15: X25519 公钥 JWK 字段
try {
  const { publicKey } = crypto.generateKeyPairSync('x25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'jwk'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const hasRequiredFields = publicKey.kty === 'OKP' &&
                            publicKey.crv === 'X25519' &&
                            typeof publicKey.x === 'string';
  
  addResult(
    'X25519 公钥 JWK 字段',
    hasRequiredFields,
    'kty=OKP, crv=X25519, x存在',
    `kty=${publicKey.kty}, crv=${publicKey.crv}, x=${!!publicKey.x}`
  );
} catch (err) {
  addResult('X25519 公钥 JWK 字段', false, '字段完整', err.message, err.message, err.stack);
}

// 测试 16: X25519 私钥 JWK 完整字段
try {
  const { privateKey } = crypto.generateKeyPairSync('x25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'jwk'
    }
  });
  
  const hasAllFields = privateKey.kty === 'OKP' &&
                       privateKey.crv === 'X25519' &&
                       typeof privateKey.x === 'string' &&
                       typeof privateKey.d === 'string';
  
  addResult(
    'X25519 私钥 JWK 完整字段',
    hasAllFields,
    'kty, crv, x, d 都存在',
    `kty=${privateKey.kty}, crv=${privateKey.crv}, x=${!!privateKey.x}, d=${!!privateKey.d}`
  );
} catch (err) {
  addResult('X25519 私钥 JWK 完整字段', false, '字段完整', err.message, err.message, err.stack);
}

// 测试 17: X25519 JWK 可用性（密钥交换）
try {
  const { publicKey: pubJwk1, privateKey: privJwk1 } = crypto.generateKeyPairSync('x25519', {
    publicKeyEncoding: { type: 'spki', format: 'jwk' },
    privateKeyEncoding: { type: 'pkcs8', format: 'jwk' }
  });
  
  const { publicKey: pubJwk2, privateKey: privJwk2 } = crypto.generateKeyPairSync('x25519', {
    publicKeyEncoding: { type: 'spki', format: 'jwk' },
    privateKeyEncoding: { type: 'pkcs8', format: 'jwk' }
  });
  
  const pub1 = crypto.createPublicKey({ key: pubJwk1, format: 'jwk' });
  const priv1 = crypto.createPrivateKey({ key: privJwk1, format: 'jwk' });
  const pub2 = crypto.createPublicKey({ key: pubJwk2, format: 'jwk' });
  const priv2 = crypto.createPrivateKey({ key: privJwk2, format: 'jwk' });
  
  const shared1 = crypto.diffieHellman({ privateKey: priv1, publicKey: pub2 });
  const shared2 = crypto.diffieHellman({ privateKey: priv2, publicKey: pub1 });
  
  const isEqual = shared1.equals(shared2);
  
  addResult(
    'X25519 JWK 密钥交换',
    isEqual,
    'JWK可用于密钥交换',
    `共享密钥相等=${isEqual}`
  );
} catch (err) {
  addResult('X25519 JWK 密钥交换', false, 'JWK可用', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== JWK 深度验证测试结果 ==========\n');
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



