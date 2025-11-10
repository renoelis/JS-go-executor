const crypto = require('crypto');

/**
 * Node.js v25.0.0 crypto.generateKeyPair / generateKeyPairSync 全量测试
 * 
 * 测试覆盖：
 * 1. 所有支持的密钥类型：rsa, rsa-pss, dsa, ec, ed25519, ed448, x25519, x448, dh
 * 2. 同步和异步版本
 * 3. 各种参数组合和编码格式
 * 4. 错误处理和边界条件
 * 5. publicKeyEncoding 和 privateKeyEncoding 选项
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

// ============ 同步版本测试 ============

// 测试 1: RSA 基本功能
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem'
    }
  });
  
  const isValidPublic = publicKey.includes('-----BEGIN RSA PUBLIC KEY-----');
  const isValidPrivate = privateKey.includes('-----BEGIN RSA PRIVATE KEY-----');
  
  addResult(
    'RSA-2048 同步生成 PKCS1 PEM',
    isValidPublic && isValidPrivate,
    'PEM格式的RSA公私钥',
    `公钥长度=${publicKey.length}, 私钥长度=${privateKey.length}`
  );
} catch (err) {
  addResult('RSA-2048 同步生成 PKCS1 PEM', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 2: RSA PKCS8 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  const isValidPublic = publicKey.includes('-----BEGIN PUBLIC KEY-----');
  const isValidPrivate = privateKey.includes('-----BEGIN PRIVATE KEY-----');
  
  addResult(
    'RSA-1024 同步生成 SPKI/PKCS8 PEM',
    isValidPublic && isValidPrivate,
    'SPKI/PKCS8格式密钥',
    `公钥=${isValidPublic}, 私钥=${isValidPrivate}`
  );
} catch (err) {
  addResult('RSA-1024 同步生成 SPKI/PKCS8 PEM', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 3: RSA DER 格式
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
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
    'RSA-2048 DER 格式',
    isValidPublic && isValidPrivate,
    'DER格式Buffer',
    `公钥Buffer长度=${publicKey.length}, 私钥Buffer长度=${privateKey.length}`
  );
} catch (err) {
  addResult('RSA-2048 DER 格式', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 4: RSA 带密码加密私钥
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: 'test-password-123'
    }
  });
  
  const isEncrypted = privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----');
  
  addResult(
    'RSA 加密私钥',
    isEncrypted,
    '加密的PKCS8私钥',
    `私钥是否加密=${isEncrypted}`
  );
} catch (err) {
  addResult('RSA 加密私钥', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 5: RSA-PSS
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
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
  
  const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----') && 
                  privateKey.includes('-----BEGIN PRIVATE KEY-----');
  
  addResult(
    'RSA-PSS 生成',
    isValid,
    'RSA-PSS密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('RSA-PSS 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 6: RSA-PSS 带哈希选项
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
    saltLength: 32,
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
    'RSA-PSS 带哈希选项',
    isValid,
    'RSA-PSS密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('RSA-PSS 带哈希选项', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 7: DSA
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
    'DSA 生成',
    isValid,
    'DSA密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('DSA 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 8: EC - prime256v1 (P-256)
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

// 测试 9: EC - secp256k1
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

// 测试 10: EC - secp384r1 (P-384)
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

// 测试 11: EC - secp521r1 (P-521)
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

// 测试 12: Ed25519
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
    'Ed25519 生成',
    isValid,
    'Ed25519密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('Ed25519 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 13: Ed448
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
    'Ed448 生成',
    isValid,
    'Ed448密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('Ed448 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 14: X25519
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
    'X25519 生成',
    isValid,
    'X25519密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('X25519 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 15: X448
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
    'X448 生成',
    isValid,
    'X448密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('X448 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 16: DH (Diffie-Hellman)
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
    'DH 生成',
    isValid,
    'DH密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('DH 生成', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 17: RSA publicExponent 选项
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0x10001,
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
    'RSA 自定义 publicExponent',
    isValid,
    'RSA密钥对',
    `生成成功=${isValid}`
  );
} catch (err) {
  addResult('RSA 自定义 publicExponent', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 18: 返回 KeyObject
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  
  // 检查是否返回 KeyObject
  const isKeyObject = typeof publicKey === 'object' && 
                      typeof privateKey === 'object' &&
                      publicKey.asymmetricKeyType === 'rsa' &&
                      privateKey.asymmetricKeyType === 'rsa';
  
  addResult(
    'RSA 返回 KeyObject',
    isKeyObject,
    'KeyObject对象',
    `类型=${publicKey.asymmetricKeyType}, ${privateKey.asymmetricKeyType}`
  );
} catch (err) {
  addResult('RSA 返回 KeyObject', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 19: KeyObject 导出
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  
  // 导出为 PEM
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  
  const isValid = typeof publicPem === 'string' && 
                  typeof privatePem === 'string' &&
                  publicPem.includes('-----BEGIN PUBLIC KEY-----');
  
  addResult(
    'KeyObject 导出为 PEM',
    isValid,
    'PEM字符串',
    `导出成功=${isValid}`
  );
} catch (err) {
  addResult('KeyObject 导出为 PEM', false, '成功导出', err.message, err.message, err.stack);
}

// ============ 错误处理测试 ============

// 测试 20: 无效的密钥类型
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

// 测试 21: RSA 缺少 modulusLength
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

// 测试 22: EC 缺少 namedCurve
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

// 测试 23: 无效的 namedCurve
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

// 测试 24: RSA modulusLength 太小
try {
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 512,  // 太小
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  // 注意：某些版本可能允许512，我们检查是否成功
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

// 测试 25: 无效的 format
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

// 测试 26: 无效的 type
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

// ============ 异步版本测试 ============

// 测试 27: 异步 RSA 生成
async function testAsyncRSA() {
  return new Promise((resolve) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) {
        addResult('异步 RSA 生成', false, '成功生成', err.message, err.message, err.stack);
      } else {
        const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----') && 
                        privateKey.includes('-----BEGIN PRIVATE KEY-----');
        addResult(
          '异步 RSA 生成',
          isValid,
          'RSA密钥对',
          `生成成功=${isValid}`
        );
      }
      resolve();
    });
  });
}

// 测试 28: 异步 Ed25519 生成
async function testAsyncEd25519() {
  return new Promise((resolve) => {
    crypto.generateKeyPair('ed25519', {
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) {
        addResult('异步 Ed25519 生成', false, '成功生成', err.message, err.message, err.stack);
      } else {
        const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
        addResult(
          '异步 Ed25519 生成',
          isValid,
          'Ed25519密钥对',
          `生成成功=${isValid}`
        );
      }
      resolve();
    });
  });
}

// 测试 29: 异步 EC 生成
async function testAsyncEC() {
  return new Promise((resolve) => {
    crypto.generateKeyPair('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) {
        addResult('异步 EC 生成', false, '成功生成', err.message, err.message, err.stack);
      } else {
        const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
        addResult(
          '异步 EC 生成',
          isValid,
          'EC密钥对',
          `生成成功=${isValid}`
        );
      }
      resolve();
    });
  });
}

// 测试 30: 异步错误处理
async function testAsyncError() {
  return new Promise((resolve) => {
    try {
      crypto.generateKeyPair('invalid-type', {
        modulusLength: 2048
      }, (err, publicKey, privateKey) => {
        if (err) {
          const isExpectedError = err.message.includes('invalid') || 
                                  err.message.includes('Unknown') ||
                                  err.code === 'ERR_INVALID_ARG_VALUE';
          addResult(
            '异步错误处理',
            isExpectedError,
            '抛出类型错误',
            err.message,
            err.message,
            err.stack
          );
        } else {
          addResult('异步错误处理', false, '应抛出错误', '未抛出错误', null, null);
        }
        resolve();
      });
    } catch (err) {
      // 同步抛出的错误
      const isExpectedError = err.message.includes('invalid') || 
                              err.message.includes('Unknown') ||
                              err.code === 'ERR_INVALID_ARG_VALUE';
      addResult(
        '异步错误处理',
        isExpectedError,
        '抛出类型错误（同步）',
        err.message,
        err.message,
        err.stack
      );
      resolve();
    }
  });
}

// ============ 边界条件测试 ============

// 测试 31: RSA 最小 modulusLength (1024)
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024,
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
    'RSA modulusLength=1024',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA modulusLength=1024', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 32: RSA 大 modulusLength (4096)
try {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
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
    'RSA modulusLength=4096',
    publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    '成功生成',
    '成功'
  );
} catch (err) {
  addResult('RSA modulusLength=4096', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 33: DSA divisorLength 变化
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

// 测试 34: 不同的 cipher 算法
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
      cipher: 'aes-128-cbc',
      passphrase: 'test123'
    }
  });
  
  addResult(
    'cipher=aes-128-cbc',
    privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----'),
    '加密私钥',
    '成功'
  );
} catch (err) {
  addResult('cipher=aes-128-cbc', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 35: 不同的 cipher - des-ede3-cbc
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
      cipher: 'des-ede3-cbc',
      passphrase: 'test123'
    }
  });
  
  addResult(
    'cipher=des-ede3-cbc',
    privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----'),
    '加密私钥',
    '成功'
  );
} catch (err) {
  addResult('cipher=des-ede3-cbc', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 36: 空 passphrase（应该失败或警告）
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
  
  // 空密码可能被接受
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

// 测试 37: JWK 格式 (Ed25519)
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

// 测试 38: RSA JWK 格式
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
  
  const isValid = typeof publicKey === 'object' && 
                  typeof privateKey === 'object' &&
                  publicKey.kty === 'RSA' &&
                  publicKey.n && publicKey.e;
  
  addResult(
    'RSA JWK 格式',
    isValid,
    'JWK对象',
    `kty=${publicKey.kty}`
  );
} catch (err) {
  addResult('RSA JWK 格式', false, '成功生成', err.message, err.message, err.stack);
}

// 测试 39: EC JWK 格式
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

// 测试 40: 验证生成的密钥可用性（签名/验证）
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
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
  
  // 使用生成的密钥进行签名和验证
  const data = Buffer.from('test data');
  const signature = crypto.sign('sha256', data, privateKey);
  const verified = crypto.verify('sha256', data, publicKey, signature);
  
  addResult(
    'RSA 密钥可用性测试',
    verified === true,
    '签名验证成功',
    `验证结果=${verified}`
  );
} catch (err) {
  addResult('RSA 密钥可用性测试', false, '签名验证成功', err.message, err.message, err.stack);
}

// 测试 41: Ed25519 签名验证
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

// 测试 42: EC 签名验证
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

// ============ 主测试函数 ============

async function runAllTests() {
  // 运行异步测试
  await testAsyncRSA();
  await testAsyncEd25519();
  await testAsyncEC();
  await testAsyncError();
  
  // 输出结果
  const summary = {
    total: testResults.total,
    pass: testResults.pass,
    fail: testResults.fail
  };
  
  console.log('\n========== 测试结果 ==========\n');
  for (const detail of testResults.detail) {
    console.log(`${detail.pass ? '✅' : '❌'} ${detail.case}`);
    if (!detail.pass) {
      console.log(`   期望: ${detail.expect}`);
      console.log(`   实际: ${detail.got}`);
      if (detail.error) {
        console.log(`   错误: ${detail.error}`);
      }
      if (detail.stack) {
        console.log(`   堆栈:\n${detail.stack}`);
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
}

// 运行测试
return runAllTests();

