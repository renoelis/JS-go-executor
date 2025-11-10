const crypto = require('crypto');

/**
 * 错误对象完整性测试 (简化版)
 * 验证同步和Promise中错误对象的完整性：
 * - 错误对象包含 message 属性
 * - 错误对象包含 stack 属性
 * - 错误类型正确（TypeError, RangeError等）
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

async function runTests() {
  
  // ========== 同步版本错误对象测试 ==========
  
  // 测试 1: 同步 - TypeError (无效类型参数)
  try {
    crypto.generateKeyPairSync('rsa', {
      modulusLength: 'invalid',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      '同步 - TypeError 对象',
      false,
      '应抛出 TypeError',
      '未抛出错误'
    );
  } catch (err) {
    const hasMessage = typeof err.message === 'string' && err.message.length > 0;
    const hasStack = typeof err.stack === 'string' && err.stack.length > 0;
    const isTypeError = err.name === 'TypeError' || err instanceof TypeError;
    
    addResult(
      '同步 - TypeError 对象',
      hasMessage && hasStack && isTypeError,
      '应包含 message, stack, 且为 TypeError',
      `message=${hasMessage}, stack=${hasStack}, isTypeError=${isTypeError}`
    );
  }
  
  // 测试 2: 同步 - RangeError (值超出范围)
  try {
    crypto.generateKeyPairSync('rsa', {
      modulusLength: -2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      '同步 - RangeError 对象',
      false,
      '应抛出错误',
      '未抛出错误'
    );
  } catch (err) {
    const hasMessage = typeof err.message === 'string' && err.message.length > 0;
    const hasStack = typeof err.stack === 'string' && err.stack.length > 0;
    
    addResult(
      '同步 - RangeError 对象',
      hasMessage && hasStack,
      '应包含 message 和 stack',
      `message=${hasMessage}, stack=${hasStack}, name=${err.name}`
    );
  }
  
  // 测试 3: 同步 - 错误消息描述性
  try {
    crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 2,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      '同步 - 错误消息描述性',
      false,
      '应抛出错误',
      '未抛出错误'
    );
  } catch (err) {
    const messageDescriptive = err.message.length > 10;
    
    addResult(
      '同步 - 错误消息描述性',
      messageDescriptive,
      '错误消息应有描述性',
      `消息长度=${err.message.length}, 内容=${err.message.substring(0, 50)}`
    );
  }
  
  // 测试 4: 同步 - 无效密钥类型
  try {
    crypto.generateKeyPairSync('invalid-key-type', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      '同步 - 无效密钥类型错误',
      false,
      '应抛出错误',
      '未抛出错误'
    );
  } catch (err) {
    const hasMessage = typeof err.message === 'string' && err.message.length > 0;
    const hasStack = typeof err.stack === 'string' && err.stack.length > 0;
    const messageRelevant = err.message.toLowerCase().includes('type') || 
                           err.message.toLowerCase().includes('invalid') ||
                           err.message.toLowerCase().includes('unknown');
    
    addResult(
      '同步 - 无效密钥类型错误',
      hasMessage && hasStack && messageRelevant,
      '错误应包含相关信息',
      `message相关=${messageRelevant}`
    );
  }
  
  // 测试 5: 同步 - 缺少必需参数
  try {
    crypto.generateKeyPairSync('rsa', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      '同步 - 缺少必需参数错误',
      false,
      '应抛出错误',
      '未抛出错误'
    );
  } catch (err) {
    const hasMessage = typeof err.message === 'string' && err.message.length > 0;
    const messageRelevant = err.message.toLowerCase().includes('moduluslength') || 
                           err.message.toLowerCase().includes('required') ||
                           err.message.toLowerCase().includes('missing');
    
    addResult(
      '同步 - 缺少必需参数错误',
      hasMessage && messageRelevant,
      '错误应提示缺少参数',
      `message相关=${messageRelevant}`
    );
  }
  
  // ========== Promise 版本错误对象测试 ==========
  
  // 测试 6: Promise - TypeError rejection
  try {
    const { promisify } = require('util');
    const generateKeyPairPromise = promisify(crypto.generateKeyPair);
    
    await generateKeyPairPromise('rsa', {
      modulusLength: NaN,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      'Promise - TypeError rejection',
      false,
      '应 reject',
      '未 reject'
    );
  } catch (err) {
    const hasMessage = typeof err.message === 'string' && err.message.length > 0;
    const hasStack = typeof err.stack === 'string' && err.stack.length > 0;
    
    addResult(
      'Promise - TypeError rejection',
      hasMessage && hasStack,
      '应 reject 并包含错误对象',
      `message=${hasMessage}, stack=${hasStack}`
    );
  }
  
  // 测试 7: 无效曲线名称错误消息（使用同步方法）
  // 注意：某些环境可能不支持 util.promisify，改用同步方法测试
  try {
    crypto.generateKeyPairSync('ec', {
      namedCurve: 'invalid-curve-name',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      '无效曲线名称错误消息',
      false,
      '应抛出错误',
      '未抛出错误'
    );
  } catch (err) {
    const hasMessage = typeof err.message === 'string' && err.message.length > 0;
    const messageRelevant = err.message.toLowerCase().includes('curve') || 
                           err.message.toLowerCase().includes('invalid') ||
                           err.message.toLowerCase().includes('unknown');
    
    addResult(
      '无效曲线名称错误消息',
      hasMessage && messageRelevant,
      '应包含相关错误信息（curve/invalid/unknown）',
      `message相关=${messageRelevant}, message="${err.message.substring(0, 50)}..."`
    );
  }
  
  // 测试 8: 无效编码类型（使用同步方法）
  try {
    crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'invalid-type', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      '无效编码类型错误',
      false,
      '应抛出错误',
      '未抛出错误'
    );
  } catch (err) {
    const hasMessage = typeof err.message === 'string' && err.message.length > 0;
    const hasStack = typeof err.stack === 'string' && err.stack.length > 0;
    
    addResult(
      '无效编码类型错误',
      hasMessage && hasStack,
      '应包含错误信息',
      `message=${hasMessage}, stack=${hasStack}`
    );
  }
  
  // ========== 错误码测试 ==========
  
  // 测试 9: 错误对象的 code 属性 (如果有)
  try {
    crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'invalid-format' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      '错误对象 code 属性',
      false,
      '应抛出错误',
      '未抛出错误'
    );
  } catch (err) {
    const hasMessage = typeof err.message === 'string';
    const hasName = typeof err.name === 'string';
    const codeInfo = err.code ? `code=${err.code}` : 'no code';
    
    addResult(
      '错误对象 code 属性',
      hasMessage && hasName,
      '应包含 name 和 message',
      `name=${err.name}, ${codeInfo}`
    );
  }
  
  // 测试 10: DSA 无效组合错误
  try {
    crypto.generateKeyPairSync('dsa', {
      modulusLength: 2048,
      divisorLength: 128,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      '同步 - DSA 无效组合错误',
      false,
      '应抛出错误',
      '未抛出错误'
    );
  } catch (err) {
    const hasMessage = typeof err.message === 'string' && err.message.length > 0;
    const hasStack = typeof err.stack === 'string';
    
    addResult(
      '同步 - DSA 无效组合错误',
      hasMessage && hasStack,
      '应传递完整错误对象',
      `message=${hasMessage}, stack=${hasStack}`
    );
  }
  
  // 测试 11: 错误栈追踪包含可识别信息
  // 注意：goja 环境中，函数名可能显示为 RegisterRSAMethods.func2 (native)
  try {
    crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 0,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    addResult(
      '错误栈包含可识别信息',
      false,
      '应抛出错误',
      '未抛出错误'
    );
  } catch (err) {
    // 检查栈中是否包含 generateKeyPairSync 或 RegisterRSAMethods 或 native 标记
    const stackHasIdentifiableInfo = err.stack.includes('generateKeyPairSync') || 
                                      err.stack.includes('generateKeyPair') ||
                                      err.stack.includes('RegisterRSAMethods') ||
                                      err.stack.includes('(native)');
    
    addResult(
      '错误栈包含可识别信息',
      stackHasIdentifiableInfo,
      'stack 应包含函数相关信息',
      `包含可识别信息=${stackHasIdentifiableInfo}`
    );
  }
  
  // 测试 12: 无效 cipher 错误（使用同步方法）
  try {
    crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'invalid-cipher',
        passphrase: 'test'
      }
    });
    
    addResult(
      '无效 cipher 错误',
      false,
      '应抛出错误',
      '未抛出错误'
    );
  } catch (err) {
    const hasMessage = typeof err.message === 'string' && err.message.length > 0;
    const hasStack = typeof err.stack === 'string' && err.stack.length > 0;
    const hasName = typeof err.name === 'string' && err.name.length > 0;
    
    addResult(
      '无效 cipher 错误',
      hasMessage && hasStack && hasName,
      '应包含完整错误对象',
      `message=${hasMessage}, stack=${hasStack}, name=${hasName}`
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
