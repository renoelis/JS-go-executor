const crypto = require('crypto');

/**
 * publicKeyEncoding 和 privateKeyEncoding 特殊组合测试
 * 测试各种编码参数组合
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

// 测试 1: 只提供 publicKeyEncoding
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    }
  });
  
  const publicIsPem = typeof publicKey === 'string' && 
                      publicKey.includes('-----BEGIN PUBLIC KEY-----');
  const privateIsKeyObject = typeof privateKey === 'object' && 
                              privateKey.asymmetricKeyType === 'rsa';
  
  addResult(
    '只提供 publicKeyEncoding',
    publicIsPem && privateIsKeyObject,
    'public=PEM, private=KeyObject',
    `public类型=${typeof publicKey}, private类型=${typeof privateKey}`
  );
} catch (err) {
  addResult('只提供 publicKeyEncoding', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 2: 只提供 privateKeyEncoding
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const publicIsKeyObject = typeof publicKey === 'object' && 
                             publicKey.asymmetricKeyType === 'rsa';
  const privateIsPem = typeof privateKey === 'string' && 
                       privateKey.includes('-----BEGIN PRIVATE KEY-----');
  
  addResult(
    '只提供 privateKeyEncoding',
    publicIsKeyObject && privateIsPem,
    'public=KeyObject, private=PEM',
    `public类型=${typeof publicKey}, private类型=${typeof privateKey}`
  );
} catch (err) {
  addResult('只提供 privateKeyEncoding', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 3: 两者都不提供（返回 KeyObject）
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  const bothAreKeyObject = typeof publicKey === 'object' && 
                           typeof privateKey === 'object' &&
                           publicKey.asymmetricKeyType === 'rsa' &&
                           privateKey.asymmetricKeyType === 'rsa';
  
  addResult(
    '不提供任何 encoding（返回KeyObject）',
    bothAreKeyObject,
    '两者都是KeyObject',
    `public=${publicKey.asymmetricKeyType}, private=${privateKey.asymmetricKeyType}`
  );
} catch (err) {
  addResult('不提供任何 encoding（返回KeyObject）', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 4: public=PEM, private=DER
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });
  
  const publicIsPem = typeof publicKey === 'string' && 
                      publicKey.includes('-----BEGIN PUBLIC KEY-----');
  const privateIsDer = Buffer.isBuffer(privateKey) && privateKey.length > 0;
  
  addResult(
    'public=PEM, private=DER',
    publicIsPem && privateIsDer,
    '混合格式',
    `public=PEM, private=Buffer(${privateKey.length})`
  );
} catch (err) {
  addResult('public=PEM, private=DER', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 5: public=DER, private=PEM
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const publicIsDer = Buffer.isBuffer(publicKey) && publicKey.length > 0;
  const privateIsPem = typeof privateKey === 'string' && 
                       privateKey.includes('-----BEGIN PRIVATE KEY-----');
  
  addResult(
    'public=DER, private=PEM',
    publicIsDer && privateIsPem,
    '混合格式',
    `public=Buffer(${publicKey.length}), private=PEM`
  );
} catch (err) {
  addResult('public=DER, private=PEM', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 6: public=JWK, private=PEM
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
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
  
  const publicIsJwk = typeof publicKey === 'object' && publicKey.kty === 'RSA';
  const privateIsPem = typeof privateKey === 'string' && 
                       privateKey.includes('-----BEGIN PRIVATE KEY-----');
  
  addResult(
    'public=JWK, private=PEM',
    publicIsJwk && privateIsPem,
    '混合格式',
    `public=JWK, private=PEM`
  );
} catch (err) {
  addResult('public=JWK, private=PEM', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 7: public=PEM, private=JWK
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
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
  
  const publicIsPem = typeof publicKey === 'string' && 
                      publicKey.includes('-----BEGIN PUBLIC KEY-----');
  const privateIsJwk = typeof privateKey === 'object' && privateKey.kty === 'RSA';
  
  addResult(
    'public=PEM, private=JWK',
    publicIsPem && privateIsJwk,
    '混合格式',
    `public=PEM, private=JWK`
  );
} catch (err) {
  addResult('public=PEM, private=JWK', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 8: RSA PKCS1 public + PKCS8 private
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const publicIsPkcs1 = publicKey.includes('-----BEGIN RSA PUBLIC KEY-----');
  const privateIsPkcs8 = privateKey.includes('-----BEGIN PRIVATE KEY-----');
  
  addResult(
    'RSA PKCS1 public + PKCS8 private',
    publicIsPkcs1 && privateIsPkcs8,
    '混合类型',
    `public=PKCS1, private=PKCS8`
  );
} catch (err) {
  addResult('RSA PKCS1 public + PKCS8 private', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 9: RSA SPKI public + PKCS1 private
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem'
    }
  });
  
  const publicIsSpki = publicKey.includes('-----BEGIN PUBLIC KEY-----');
  const privateIsPkcs1 = privateKey.includes('-----BEGIN RSA PRIVATE KEY-----');
  
  addResult(
    'RSA SPKI public + PKCS1 private',
    publicIsSpki && privateIsPkcs1,
    '混合类型',
    `public=SPKI, private=PKCS1`
  );
} catch (err) {
  addResult('RSA SPKI public + PKCS1 private', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 10: EC public=PEM, private=DER
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });
  
  const publicIsPem = typeof publicKey === 'string' && 
                      publicKey.includes('-----BEGIN PUBLIC KEY-----');
  const privateIsDer = Buffer.isBuffer(privateKey) && privateKey.length > 0;
  
  addResult(
    'EC public=PEM, private=DER',
    publicIsPem && privateIsDer,
    '混合格式',
    `public=PEM, private=Buffer(${privateKey.length})`
  );
} catch (err) {
  addResult('EC public=PEM, private=DER', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 11: Ed25519 只提供 publicKeyEncoding
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    }
  });
  
  const publicIsPem = typeof publicKey === 'string' && 
                      publicKey.includes('-----BEGIN PUBLIC KEY-----');
  const privateIsKeyObject = typeof privateKey === 'object' && 
                              privateKey.asymmetricKeyType === 'ed25519';
  
  addResult(
    'Ed25519 只提供 publicKeyEncoding',
    publicIsPem && privateIsKeyObject,
    'public=PEM, private=KeyObject',
    `public=PEM, private=${privateKey.asymmetricKeyType}`
  );
} catch (err) {
  addResult('Ed25519 只提供 publicKeyEncoding', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 12: Ed25519 public=JWK, private=JWK
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
  
  const publicIsJwk = typeof publicKey === 'object' && 
                      publicKey.kty === 'OKP' && 
                      publicKey.crv === 'Ed25519';
  const privateIsJwk = typeof privateKey === 'object' && 
                       privateKey.kty === 'OKP';
  
  addResult(
    'Ed25519 public=JWK, private=JWK',
    publicIsJwk && privateIsJwk,
    '两者都是JWK',
    `public.kty=${publicKey.kty}, private.kty=${privateKey.kty}`
  );
} catch (err) {
  addResult('Ed25519 public=JWK, private=JWK', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 13: DH 只提供 privateKeyEncoding
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('dh', {
    primeLength: 2048,
    generator: 2,
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const publicIsKeyObject = typeof publicKey === 'object' && 
                             publicKey.asymmetricKeyType === 'dh';
  const privateIsPem = typeof privateKey === 'string' && 
                       privateKey.includes('-----BEGIN PRIVATE KEY-----');
  
  addResult(
    'DH 只提供 privateKeyEncoding',
    publicIsKeyObject && privateIsPem,
    'public=KeyObject, private=PEM',
    `public=${publicKey.asymmetricKeyType}, private=PEM`
  );
} catch (err) {
  addResult('DH 只提供 privateKeyEncoding', false, '成功生成', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== Encoding 组合测试结果 ==========\n');
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


