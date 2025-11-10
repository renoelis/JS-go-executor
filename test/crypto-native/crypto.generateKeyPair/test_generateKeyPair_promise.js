const crypto = require('crypto');

/**
 * generateKeyPair Promise 版本测试
 * 测试 Promise 化的异步密钥对生成
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

// 手动 Promisify generateKeyPair（兼容 goja 环境）
function generateKeyPairAsync(type, options) {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(type, options, (err, publicKey, privateKey) => {
      if (err) {
        reject(err);
      } else {
        resolve({ publicKey, privateKey });
      }
    });
  });
}

// 测试 1: Promise RSA 生成
async function testPromiseRSA() {
  try {
    const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
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
      'Promise RSA 生成',
      isValid,
      'RSA密钥对',
      `生成成功=${isValid}`
    );
  } catch (err) {
    addResult('Promise RSA 生成', false, '成功生成', err.message, err.message, err.stack);
  }
}

// 测试 2: Promise Ed25519 生成
async function testPromiseEd25519() {
  try {
    const { publicKey, privateKey } = await generateKeyPairAsync('ed25519', {
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
      'Promise Ed25519 生成',
      isValid,
      'Ed25519密钥对',
      `生成成功=${isValid}`
    );
  } catch (err) {
    addResult('Promise Ed25519 生成', false, '成功生成', err.message, err.message, err.stack);
  }
}

// 测试 3: Promise EC 生成
async function testPromiseEC() {
  try {
    const { publicKey, privateKey } = await generateKeyPairAsync('ec', {
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
    
    const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
    
    addResult(
      'Promise EC 生成',
      isValid,
      'EC密钥对',
      `生成成功=${isValid}`
    );
  } catch (err) {
    addResult('Promise EC 生成', false, '成功生成', err.message, err.message, err.stack);
  }
}

// 测试 4: Promise 返回 KeyObject
async function testPromiseKeyObject() {
  try {
    const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
      modulusLength: 2048
    });
    
    const isKeyObject = typeof publicKey === 'object' && 
                        typeof privateKey === 'object' &&
                        publicKey.asymmetricKeyType === 'rsa' &&
                        privateKey.asymmetricKeyType === 'rsa';
    
    addResult(
      'Promise 返回 KeyObject',
      isKeyObject,
      'KeyObject对象',
      `类型=${publicKey.asymmetricKeyType}`
    );
  } catch (err) {
    addResult('Promise 返回 KeyObject', false, '成功生成', err.message, err.message, err.stack);
  }
}

// 测试 5: Promise 错误处理
async function testPromiseError() {
  try {
    await generateKeyPairAsync('invalid-type', {
      modulusLength: 2048
    });
    addResult('Promise 错误处理', false, '应抛出错误', '未抛出错误', null, null);
  } catch (err) {
    const isExpectedError = err.message.includes('invalid') || 
                            err.message.includes('Unknown') ||
                            err.code === 'ERR_INVALID_ARG_VALUE';
    addResult(
      'Promise 错误处理',
      isExpectedError,
      '抛出类型错误',
      err.message,
      err.message,
      err.stack
    );
  }
}

// 测试 6: Promise DH 生成
async function testPromiseDH() {
  try {
    const { publicKey, privateKey } = await generateKeyPairAsync('dh', {
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
      'Promise DH 生成',
      isValid,
      'DH密钥对',
      `生成成功=${isValid}`
    );
  } catch (err) {
    addResult('Promise DH 生成', false, '成功生成', err.message, err.message, err.stack);
  }
}

// 测试 7: Promise DSA 生成
async function testPromiseDSA() {
  try {
    const { publicKey, privateKey } = await generateKeyPairAsync('dsa', {
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
    
    const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
    
    addResult(
      'Promise DSA 生成',
      isValid,
      'DSA密钥对',
      `生成成功=${isValid}`
    );
  } catch (err) {
    addResult('Promise DSA 生成', false, '成功生成', err.message, err.message, err.stack);
  }
}

// 测试 8: Promise RSA-PSS 生成
async function testPromiseRSAPSS() {
  try {
    const { publicKey, privateKey } = await generateKeyPairAsync('rsa-pss', {
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
      'Promise RSA-PSS 生成',
      isValid,
      'RSA-PSS密钥对',
      `生成成功=${isValid}`
    );
  } catch (err) {
    addResult('Promise RSA-PSS 生成', false, '成功生成', err.message, err.message, err.stack);
  }
}

// 主测试函数
async function runAllTests() {
  await testPromiseRSA();
  await testPromiseEd25519();
  await testPromiseEC();
  await testPromiseKeyObject();
  await testPromiseError();
  await testPromiseDH();
  await testPromiseDSA();
  await testPromiseRSAPSS();
  
  // 输出结果
  const summary = {
    total: testResults.total,
    pass: testResults.pass,
    fail: testResults.fail
  };
  
  console.log('\n========== Promise 测试结果 ==========\n');
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
}

// 运行测试
return runAllTests();

