const crypto = require('crypto');

/**
 * generateKeyPair 异步版本测试
 * 测试回调方式的异步密钥对生成
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

// 测试 1: 异步 RSA 生成
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

// 测试 2: 异步 Ed25519 生成
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

// 测试 3: 异步 EC 生成
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

// 测试 4: 异步 X25519 生成
async function testAsyncX25519() {
  return new Promise((resolve) => {
    crypto.generateKeyPair('x25519', {
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
        addResult('异步 X25519 生成', false, '成功生成', err.message, err.message, err.stack);
      } else {
        const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
        addResult(
          '异步 X25519 生成',
          isValid,
          'X25519密钥对',
          `生成成功=${isValid}`
        );
      }
      resolve();
    });
  });
}

// 测试 5: 异步错误处理
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

// 测试 6: 异步返回 KeyObject
async function testAsyncKeyObject() {
  return new Promise((resolve) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048
    }, (err, publicKey, privateKey) => {
      if (err) {
        addResult('异步返回 KeyObject', false, '成功生成', err.message, err.message, err.stack);
      } else {
        const isKeyObject = typeof publicKey === 'object' && 
                            typeof privateKey === 'object' &&
                            publicKey.asymmetricKeyType === 'rsa' &&
                            privateKey.asymmetricKeyType === 'rsa';
        addResult(
          '异步返回 KeyObject',
          isKeyObject,
          'KeyObject对象',
          `类型=${publicKey.asymmetricKeyType}`
        );
      }
      resolve();
    });
  });
}

// 测试 7: 异步 DSA 生成
async function testAsyncDSA() {
  return new Promise((resolve) => {
    crypto.generateKeyPair('dsa', {
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
    }, (err, publicKey, privateKey) => {
      if (err) {
        addResult('异步 DSA 生成', false, '成功生成', err.message, err.message, err.stack);
      } else {
        const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----');
        addResult(
          '异步 DSA 生成',
          isValid,
          'DSA密钥对',
          `生成成功=${isValid}`
        );
      }
      resolve();
    });
  });
}

// 主测试函数
async function runAllTests() {
  await testAsyncRSA();
  await testAsyncEd25519();
  await testAsyncEC();
  await testAsyncX25519();
  await testAsyncError();
  await testAsyncKeyObject();
  await testAsyncDSA();
  
  // 输出结果
  const summary = {
    total: testResults.total,
    pass: testResults.pass,
    fail: testResults.fail
  };
  
  console.log('\n========== 异步测试结果 ==========\n');
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
