const crypto = require('crypto');

/**
 * 真并发测试（不使用 promisify）
 * 测试多个异步密钥生成同时执行：
 * - 多个 Promise 同时运行
 * - 验证所有密钥都不同
 * - 验证并发安全性
 * - 验证密钥质量不受并发影响
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
  
  // ========== RSA 并发测试 ==========
  
  // 测试 1: 10 个 RSA 密钥对同时生成
  try {
    const promises = [];
    const count = 10;
    
    for (let i = 0; i < count; i++) {
      promises.push(
        generateKeyPairAsync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'der' },
          privateKeyEncoding: { type: 'pkcs8', format: 'der' }
        })
      );
    }
    
    const results = await Promise.all(promises);
    
    // 验证所有密钥都生成成功
    const allSuccess = results.every(r => r.publicKey && r.privateKey);
    
    // 验证所有公钥都不同
    const publicKeys = results.map(r => r.publicKey.toString('base64'));
    const uniquePublicKeys = new Set(publicKeys);
    const allUnique = uniquePublicKeys.size === count;
    
    addResult(
      `并发生成 ${count} 个 RSA 密钥`,
      allSuccess && allUnique,
      '所有密钥应成功生成且唯一',
      `成功=${allSuccess}, 唯一=${allUnique}, 生成数=${results.length}`
    );
  } catch (err) {
    addResult(
      '并发生成 10 个 RSA 密钥',
      false,
      '所有密钥应成功生成且唯一',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 2: 50 个 EC 密钥对同时生成
  try {
    const promises = [];
    const count = 50;
    
    for (let i = 0; i < count; i++) {
      promises.push(
        generateKeyPairAsync('ec', {
          namedCurve: 'prime256v1',
          publicKeyEncoding: { type: 'spki', format: 'der' },
          privateKeyEncoding: { type: 'pkcs8', format: 'der' }
        })
      );
    }
    
    const results = await Promise.all(promises);
    
    const allSuccess = results.every(r => r.publicKey && r.privateKey);
    const publicKeys = results.map(r => r.publicKey.toString('base64'));
    const uniquePublicKeys = new Set(publicKeys);
    const allUnique = uniquePublicKeys.size === count;
    
    addResult(
      `并发生成 ${count} 个 EC 密钥`,
      allSuccess && allUnique,
      '所有密钥应成功生成且唯一',
      `成功=${allSuccess}, 唯一=${allUnique}, 生成数=${results.length}`
    );
  } catch (err) {
    addResult(
      '并发生成 50 个 EC 密钥',
      false,
      '所有密钥应成功生成且唯一',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 3: 混合类型并发生成
  try {
    const promises = [
      generateKeyPairAsync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
      }),
      generateKeyPairAsync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
      }),
      generateKeyPairAsync('ed25519', {}),
      generateKeyPairAsync('x25519', {}),
      generateKeyPairAsync('dsa', {
        modulusLength: 2048,
        divisorLength: 256,
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
      })
    ];
    
    const results = await Promise.all(promises);
    
    const allSuccess = results.every(r => r.publicKey && r.privateKey);
    
    addResult(
      '混合类型并发生成 (RSA/EC/Ed25519/X25519/DSA)',
      allSuccess,
      '所有不同类型密钥应同时成功生成',
      `成功=${allSuccess}, 生成数=${results.length}`
    );
  } catch (err) {
    addResult(
      '混合类型并发生成',
      false,
      '所有不同类型密钥应同时成功生成',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 4: 并发生成并验证密钥可用性
  try {
    const promises = [];
    const count = 20;
    
    for (let i = 0; i < count; i++) {
      promises.push(
        generateKeyPairAsync('rsa', {
          modulusLength: 2048
        })
      );
    }
    
    const results = await Promise.all(promises);
    
    // 验证每个密钥对都能正常签名和验证
    const testData = Buffer.from('concurrent test data');
    let allValid = true;
    
    for (const { publicKey, privateKey } of results) {
      const signature = crypto.sign('sha256', testData, privateKey);
      const verified = crypto.verify('sha256', testData, publicKey, signature);
      if (!verified) {
        allValid = false;
        break;
      }
    }
    
    addResult(
      `并发生成 ${count} 个密钥并验证可用性`,
      allValid,
      '所有密钥应可用于签名验证',
      `所有密钥可用=${allValid}`
    );
  } catch (err) {
    addResult(
      '并发生成并验证密钥可用性',
      false,
      '所有密钥应可用于签名验证',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 5: Ed25519 大量并发
  try {
    const promises = [];
    const count = 100;
    
    for (let i = 0; i < count; i++) {
      promises.push(generateKeyPairAsync('ed25519', {}));
    }
    
    const results = await Promise.all(promises);
    
    const allSuccess = results.every(r => r.publicKey && r.privateKey);
    
    // 检查公钥唯一性
    const publicKeys = results.map(r => r.publicKey.export({ type: 'spki', format: 'der' }).toString('base64'));
    const uniquePublicKeys = new Set(publicKeys);
    const allUnique = uniquePublicKeys.size === count;
    
    addResult(
      `并发生成 ${count} 个 Ed25519 密钥`,
      allSuccess && allUnique,
      '所有密钥应成功生成且唯一',
      `成功=${allSuccess}, 唯一=${allUnique}, 生成数=${results.length}`
    );
  } catch (err) {
    addResult(
      '并发生成 100 个 Ed25519 密钥',
      false,
      '所有密钥应成功生成且唯一',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 6: 加密私钥并发生成
  try {
    const promises = [];
    const count = 10;
    
    for (let i = 0; i < count; i++) {
      promises.push(
        generateKeyPairAsync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: `password-${i}`
          }
        })
      );
    }
    
    const results = await Promise.all(promises);
    
    const allEncrypted = results.every(r => 
      r.privateKey.includes('ENCRYPTED') && r.publicKey.includes('BEGIN PUBLIC KEY')
    );
    
    // 验证每个密钥用对应密码可解密
    let allDecryptable = true;
    for (let i = 0; i < count; i++) {
      try {
        crypto.createPrivateKey({
          key: results[i].privateKey,
          passphrase: `password-${i}`
        });
      } catch (e) {
        allDecryptable = false;
        break;
      }
    }
    
    addResult(
      `并发生成 ${count} 个加密私钥`,
      allEncrypted && allDecryptable,
      '所有私钥应加密且可解密',
      `加密=${allEncrypted}, 可解密=${allDecryptable}`
    );
  } catch (err) {
    addResult(
      '并发生成加密私钥',
      false,
      '所有私钥应加密且可解密',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 7: 不同 modulusLength 并发
  try {
    const modulusLengths = [1024, 2048, 3072, 4096];
    const promises = modulusLengths.map(length => 
      generateKeyPairAsync('rsa', {
        modulusLength: length,
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
      })
    );
    
    const results = await Promise.all(promises);
    
    const allSuccess = results.every(r => r.publicKey && r.privateKey);
    
    addResult(
      '不同 modulusLength 并发生成',
      allSuccess,
      '不同大小的密钥应同时成功生成',
      `成功=${allSuccess}, 生成数=${results.length}`
    );
  } catch (err) {
    addResult(
      '不同 modulusLength 并发生成',
      false,
      '不同大小的密钥应同时成功生成',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 8: EC 不同曲线并发
  try {
    const curves = ['prime256v1', 'secp256k1', 'secp384r1', 'secp521r1'];
    const promises = curves.map(curve => 
      generateKeyPairAsync('ec', {
        namedCurve: curve,
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
      })
    );
    
    const results = await Promise.all(promises);
    
    const allSuccess = results.every(r => r.publicKey && r.privateKey);
    
    addResult(
      'EC 不同曲线并发生成',
      allSuccess,
      '不同曲线应同时成功生成',
      `成功=${allSuccess}, 生成数=${results.length}`
    );
  } catch (err) {
    addResult(
      'EC 不同曲线并发生成',
      false,
      '不同曲线应同时成功生成',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 9: Promise.race 测试（确保至少一个能快速完成）
  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        generateKeyPairAsync('ed25519', {})
      );
    }
    
    const firstResult = await Promise.race(promises);
    
    const success = firstResult.publicKey && firstResult.privateKey;
    
    addResult(
      'Promise.race 测试（最快完成）',
      success,
      '至少一个应快速完成',
      `成功=${success}`
    );
  } catch (err) {
    addResult(
      'Promise.race 测试',
      false,
      '至少一个应快速完成',
      `错误: ${err.message}`,
      err.message,
      err.stack
    );
  }
  
  // 测试 10: 并发错误处理
  try {
    const promises = [
      // 有效的请求
      generateKeyPairAsync('rsa', { modulusLength: 2048 }),
      generateKeyPairAsync('ec', { namedCurve: 'prime256v1' }),
      // 无效的请求（应该失败）
      generateKeyPairAsync('rsa', { modulusLength: -2048 }).catch(e => ({ error: e })),
      generateKeyPairAsync('ec', { namedCurve: 'invalid' }).catch(e => ({ error: e })),
      // 更多有效请求
      generateKeyPairAsync('ed25519', {})
    ];
    
    const results = await Promise.all(promises);
    
    // 前两个和最后一个应该成功
    const validResults = [results[0], results[1], results[4]];
    const allValidSuccess = validResults.every(r => r.publicKey && r.privateKey);
    
    // 中间两个应该有错误
    const errorResults = [results[2], results[3]];
    const allErrorsCaught = errorResults.every(r => r.error);
    
    addResult(
      '并发请求中的错误处理',
      allValidSuccess && allErrorsCaught,
      '有效请求应成功，无效请求应失败',
      `有效成功=${allValidSuccess}, 错误捕获=${allErrorsCaught}`
    );
  } catch (err) {
    addResult(
      '并发请求中的错误处理',
      false,
      '有效请求应成功，无效请求应失败',
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
