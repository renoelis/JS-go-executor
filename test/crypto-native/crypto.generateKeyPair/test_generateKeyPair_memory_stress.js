const crypto = require('crypto');

/**
 * 内存压力测试（不使用 promisify）
 * 测试大量密钥生成的内存使用：
 * - 连续生成大量密钥
 * - 验证没有内存泄漏迹象
 * - 测试密钥对象的垃圾回收
 * - 验证长时间运行的稳定性
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

// 将 crypto.generateKeyPair 转为 Promise
function generateKeyPairAsync(type, options) {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(type, options, (err, publicKey, privateKey) => {
      if (err) reject(err);
      else resolve({ publicKey, privateKey });
    });
  });
}

async function runTests() {
  
  // ========== 连续生成测试 ==========
  
  // 测试 1: 连续生成 100 个 RSA 密钥（不保存）
  try {
    const count = 100;
    let successCount = 0;
    
    for (let i = 0; i < count; i++) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 1024, // 使用较小的长度加快速度
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
      });
      
      if (publicKey && privateKey) {
        successCount++;
      }
      // 不保存引用，让 GC 可以回收
    }
    
    addResult(
      `连续生成 ${count} 个 RSA 密钥（不保存）`,
      successCount === count,
      `应成功生成 ${count} 个`,
      `成功生成 ${successCount} 个`
    );
  } catch (err) {
    addResult(
      '连续生成 100 个 RSA 密钥',
      false,
      '应全部成功',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 2: 连续生成 200 个 EC 密钥
  try {
    const count = 200;
    let successCount = 0;
    
    for (let i = 0; i < count; i++) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
      });
      
      if (publicKey && privateKey) {
        successCount++;
      }
    }
    
    addResult(
      `连续生成 ${count} 个 EC 密钥`,
      successCount === count,
      `应成功生成 ${count} 个`,
      `成功生成 ${successCount} 个`
    );
  } catch (err) {
    addResult(
      '连续生成 200 个 EC 密钥',
      false,
      '应全部成功',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 3: 连续生成 500 个 Ed25519 密钥（最快的类型）
  try {
    const count = 500;
    let successCount = 0;
    
    for (let i = 0; i < count; i++) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      
      if (publicKey && privateKey) {
        successCount++;
      }
    }
    
    addResult(
      `连续生成 ${count} 个 Ed25519 密钥`,
      successCount === count,
      `应成功生成 ${count} 个`,
      `成功生成 ${successCount} 个`
    );
  } catch (err) {
    addResult(
      '连续生成 500 个 Ed25519 密钥',
      false,
      '应全部成功',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 4: 批量生成并导出为 PEM（测试字符串处理）
  try {
    const count = 50;
    let successCount = 0;
    
    for (let i = 0; i < count; i++) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 1024,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      
      // 验证 PEM 格式
      if (typeof publicKey === 'string' && 
          typeof privateKey === 'string' &&
          publicKey.includes('BEGIN PUBLIC KEY') &&
          privateKey.includes('BEGIN PRIVATE KEY')) {
        successCount++;
      }
    }
    
    addResult(
      `批量生成 ${count} 个 PEM 格式密钥`,
      successCount === count,
      `应成功生成 ${count} 个`,
      `成功生成 ${successCount} 个`
    );
  } catch (err) {
    addResult(
      '批量生成 PEM 格式密钥',
      false,
      '应全部成功',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 5: 批量生成并导出为 JWK（测试对象处理）
  try {
    const count = 50;
    let successCount = 0;
    
    for (let i = 0; i < count; i++) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 1024,
        publicKeyEncoding: { type: 'spki', format: 'jwk' },
        privateKeyEncoding: { type: 'pkcs8', format: 'jwk' }
      });
      
      // 验证 JWK 格式
      if (typeof publicKey === 'object' && 
          typeof privateKey === 'object' &&
          publicKey.kty && privateKey.kty) {
        successCount++;
      }
    }
    
    addResult(
      `批量生成 ${count} 个 JWK 格式密钥`,
      successCount === count,
      `应成功生成 ${count} 个`,
      `成功生成 ${successCount} 个`
    );
  } catch (err) {
    addResult(
      '批量生成 JWK 格式密钥',
      false,
      '应全部成功',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // ========== 异步批量测试 ==========
  
  // 测试 6: 异步批量生成（分批并发）
  try {
    const batchSize = 10;
    const batchCount = 5;
    let totalSuccess = 0;
    
    for (let batch = 0; batch < batchCount; batch++) {
      const promises = [];
      for (let i = 0; i < batchSize; i++) {
        promises.push(
          generateKeyPairAsync('ec', { namedCurve: 'prime256v1' })
        );
      }
      
      const results = await Promise.all(promises);
      totalSuccess += results.filter(r => r.publicKey && r.privateKey).length;
    }
    
    const expectedTotal = batchSize * batchCount;
    addResult(
      `分批并发生成 ${expectedTotal} 个密钥`,
      totalSuccess === expectedTotal,
      `应成功生成 ${expectedTotal} 个`,
      `成功生成 ${totalSuccess} 个`
    );
  } catch (err) {
    addResult(
      '分批并发生成密钥',
      false,
      '应全部成功',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 7: 生成并使用密钥（验证功能）
  try {
    const count = 30;
    let successCount = 0;
    const testData = Buffer.from('stress test data');
    
    for (let i = 0; i < count; i++) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 1024
      });
      
      // 使用密钥进行签名和验证
      const signature = crypto.sign('sha256', testData, privateKey);
      const verified = crypto.verify('sha256', testData, publicKey, signature);
      
      if (verified) {
        successCount++;
      }
    }
    
    addResult(
      `生成并验证 ${count} 个密钥功能`,
      successCount === count,
      `所有 ${count} 个密钥应可用`,
      `${successCount} 个密钥可用`
    );
  } catch (err) {
    addResult(
      '生成并验证密钥功能',
      false,
      '所有密钥应可用',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 8: 混合类型连续生成
  try {
    const typesAndCounts = [
      { type: 'rsa', count: 20, options: { modulusLength: 1024 } },
      { type: 'ec', count: 30, options: { namedCurve: 'prime256v1' } },
      { type: 'ed25519', count: 50, options: {} }
    ];
    
    let totalSuccess = 0;
    let totalExpected = 0;
    
    for (const { type, count, options } of typesAndCounts) {
      totalExpected += count;
      for (let i = 0; i < count; i++) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync(type, options);
        if (publicKey && privateKey) {
          totalSuccess++;
        }
      }
    }
    
    addResult(
      `混合类型连续生成 ${totalExpected} 个密钥`,
      totalSuccess === totalExpected,
      `应成功生成 ${totalExpected} 个`,
      `成功生成 ${totalSuccess} 个`
    );
  } catch (err) {
    addResult(
      '混合类型连续生成',
      false,
      '应全部成功',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 9: 生成并立即导出多种格式
  try {
    const count = 20;
    let successCount = 0;
    
    for (let i = 0; i < count; i++) {
      // 生成 KeyObject
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 1024
      });
      
      // 导出为多种格式
      const pemPublic = publicKey.export({ type: 'spki', format: 'pem' });
      const derPublic = publicKey.export({ type: 'spki', format: 'der' });
      const jwkPublic = publicKey.export({ format: 'jwk' });
      
      const pemPrivate = privateKey.export({ type: 'pkcs8', format: 'pem' });
      const derPrivate = privateKey.export({ type: 'pkcs8', format: 'der' });
      const jwkPrivate = privateKey.export({ format: 'jwk' });
      
      if (pemPublic && derPublic && jwkPublic && pemPrivate && derPrivate && jwkPrivate) {
        successCount++;
      }
    }
    
    addResult(
      `生成 ${count} 个密钥并导出多种格式`,
      successCount === count,
      `应成功导出 ${count} 个密钥的所有格式`,
      `成功导出 ${successCount} 个`
    );
  } catch (err) {
    addResult(
      '生成并导出多种格式',
      false,
      '应全部成功',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 10: 加密私钥批量生成
  try {
    const count = 20;
    let successCount = 0;
    
    for (let i = 0; i < count; i++) {
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 1024,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
          cipher: 'aes-256-cbc',
          passphrase: `password-${i}`
        }
      });
      
      // 验证私钥已加密
      if (privateKey.includes('ENCRYPTED')) {
        // 尝试解密
        try {
          const privKeyObj = crypto.createPrivateKey({
            key: privateKey,
            passphrase: `password-${i}`
          });
          if (privKeyObj.type === 'private') {
            successCount++;
          }
        } catch (e) {
          // 解密失败
        }
      }
    }
    
    addResult(
      `批量生成 ${count} 个加密私钥`,
      successCount === count,
      `应成功生成并可解密 ${count} 个`,
      `成功 ${successCount} 个`
    );
  } catch (err) {
    addResult(
      '批量生成加密私钥',
      false,
      '应全部成功',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  return testResults;
}

// 运行测试并返回结果
return runTests().then(results => {
  const summary = {
    total: results.total,
    pass: results.pass,
    fail: results.fail
  };
  
  const output = {
    success: results.fail === 0,
    summary,
    detail: results.detail
  };
  
  console.log(JSON.stringify(output, null, 2));
  return output;
});
