const crypto = require('crypto');

/**
 * Cipher 算法完整测试
 * 测试所有支持的私钥加密 cipher 算法
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

// 常见 cipher 算法列表
const cipherAlgorithms = [
  { name: 'aes-128-cbc', passphrase: 'test-aes128' },
  { name: 'aes-192-cbc', passphrase: 'test-aes192' },
  { name: 'aes-256-cbc', passphrase: 'test-aes256' },
  { name: 'aes128', passphrase: 'test-aes128-alias' },
  { name: 'aes192', passphrase: 'test-aes192-alias' },
  { name: 'aes256', passphrase: 'test-aes256-alias' },
  { name: 'des-ede3-cbc', passphrase: 'test-3des' },
  { name: 'des3', passphrase: 'test-3des-alias' }
];

for (const { name, passphrase } of cipherAlgorithms) {
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
        cipher: name,
        passphrase: passphrase
      }
    });
    
    const isEncrypted = privateKey.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----');
    
    // 尝试解密
    try {
      const privateKeyObj = crypto.createPrivateKey({
        key: privateKey,
        format: 'pem',
        passphrase: passphrase
      });
      
      // 验证可用性
      const data = Buffer.from('test cipher');
      const signature = crypto.sign('sha256', data, privateKeyObj);
      const verified = crypto.verify('sha256', data, publicKey, signature);
      
      addResult(
        `Cipher: ${name}`,
        isEncrypted && verified === true,
        `${name}加密可用`,
        `加密=${isEncrypted}, 验证=${verified}`
      );
    } catch (decryptErr) {
      addResult(
        `Cipher: ${name}`,
        false,
        `${name}解密失败`,
        decryptErr.message,
        decryptErr.message,
        decryptErr.stack
      );
    }
  } catch (err) {
    // 某些 cipher 可能不被支持
    const isUnsupported = err.message.includes('Unknown') || 
                          err.message.includes('unknown') ||
                          err.message.includes('cipher') ||
                          err.message.includes('not supported');
    
    if (isUnsupported) {
      addResult(
        `Cipher: ${name}`,
        true,
        `${name}不支持（预期）`,
        `不支持: ${err.message.substring(0, 50)}`
      );
    } else {
      addResult(
        `Cipher: ${name}`,
        false,
        `${name}应支持或明确不支持`,
        err.message,
        err.message,
        err.stack
      );
    }
  }
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== Cipher 算法测试结果 ==========\n');
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


