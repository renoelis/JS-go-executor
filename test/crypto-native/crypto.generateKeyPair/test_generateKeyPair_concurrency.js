const crypto = require('crypto');

/**
 * 并发安全测试
 * 验证多次并发生成密钥的随机性和安全性
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

// 测试 1: 连续生成的 RSA 密钥应不同
try {
  const keys = [];
  for (let i = 0; i < 5; i++) {
    const { publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'der' }
    });
    keys.push(publicKey);
  }
  
  // 检查所有密钥是否唯一
  const uniqueKeys = new Set();
  for (const key of keys) {
    uniqueKeys.add(key.toString('base64'));
  }
  
  const allUnique = uniqueKeys.size === keys.length;
  
  addResult(
    'RSA 连续生成唯一性',
    allUnique,
    '每次生成的密钥应不同',
    `生成${keys.length}个密钥，唯一${uniqueKeys.size}个`
  );
} catch (err) {
  addResult('RSA 连续生成唯一性', false, '密钥唯一', err.message, err.message, err.stack);
}

// 测试 2: 连续生成的 EC 密钥应不同
try {
  const keys = [];
  for (let i = 0; i < 5; i++) {
    const { publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'der' }
    });
    keys.push(publicKey);
  }
  
  const uniqueKeys = new Set();
  for (const key of keys) {
    uniqueKeys.add(key.toString('base64'));
  }
  
  const allUnique = uniqueKeys.size === keys.length;
  
  addResult(
    'EC 连续生成唯一性',
    allUnique,
    '每次生成的密钥应不同',
    `生成${keys.length}个密钥，唯一${uniqueKeys.size}个`
  );
} catch (err) {
  addResult('EC 连续生成唯一性', false, '密钥唯一', err.message, err.message, err.stack);
}

// 测试 3: 连续生成的 Ed25519 密钥应不同
try {
  const keys = [];
  for (let i = 0; i < 5; i++) {
    const { publicKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' }
    });
    keys.push(publicKey);
  }
  
  const uniqueKeys = new Set();
  for (const key of keys) {
    uniqueKeys.add(key.toString('base64'));
  }
  
  const allUnique = uniqueKeys.size === keys.length;
  
  addResult(
    'Ed25519 连续生成唯一性',
    allUnique,
    '每次生成的密钥应不同',
    `生成${keys.length}个密钥，唯一${uniqueKeys.size}个`
  );
} catch (err) {
  addResult('Ed25519 连续生成唯一性', false, '密钥唯一', err.message, err.message, err.stack);
}

// 测试 4: 异步并发生成（Promise.all）
async function testConcurrentAsync() {
  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(new Promise((resolve, reject) => {
        crypto.generateKeyPair('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'der' },
          privateKeyEncoding: { type: 'pkcs8', format: 'der' }
        }, (err, publicKey, privateKey) => {
          if (err) reject(err);
          else resolve({ publicKey, privateKey });
        });
      }));
    }
    
    const results = await Promise.all(promises);
    
    const uniquePublicKeys = new Set();
    const uniquePrivateKeys = new Set();
    for (const { publicKey, privateKey } of results) {
      uniquePublicKeys.add(publicKey.toString('base64'));
      uniquePrivateKeys.add(privateKey.toString('base64'));
    }
    
    const allUnique = uniquePublicKeys.size === results.length &&
                      uniquePrivateKeys.size === results.length;
    
    addResult(
      'RSA 并发异步生成唯一性',
      allUnique,
      '并发生成的密钥应不同',
      `生成${results.length}对密钥，公钥唯一${uniquePublicKeys.size}个，私钥唯一${uniquePrivateKeys.size}个`
    );
  } catch (err) {
    addResult('RSA 并发异步生成唯一性', false, '密钥唯一', err.message, err.message, err.stack);
  }
}

// 测试 5: RSA 不同 modulusLength 连续生成
try {
  const sizes = [1024, 2048, 1024, 2048, 1024];
  const keys = [];
  
  for (const size of sizes) {
    const { publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: size,
      publicKeyEncoding: { type: 'spki', format: 'der' }
    });
    keys.push({ size, key: publicKey });
  }
  
  // 检查相同大小的密钥是否不同
  const key1024_1 = keys[0].key.toString('base64');
  const key1024_2 = keys[2].key.toString('base64');
  const key1024_3 = keys[4].key.toString('base64');
  
  const allDifferent = key1024_1 !== key1024_2 && 
                       key1024_2 !== key1024_3 &&
                       key1024_1 !== key1024_3;
  
  addResult(
    'RSA 相同大小密钥唯一性',
    allDifferent,
    '相同modulusLength的密钥应不同',
    `1024位密钥都不同=${allDifferent}`
  );
} catch (err) {
  addResult('RSA 相同大小密钥唯一性', false, '密钥唯一', err.message, err.message, err.stack);
}

// 测试 6: 检查私钥的随机性（基本统计）
try {
  const privateKeys = [];
  for (let i = 0; i < 10; i++) {
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });
    privateKeys.push(privateKey);
  }
  
  // 检查密钥长度和中间部分的字节变化（跳过固定的ASN.1头部）
  const midBytes = privateKeys.map(key => key[100]); // 检查中间位置而不是开头
  const uniqueMidBytes = new Set(midBytes);
  
  // 每个密钥都应该不同
  const allUnique = privateKeys.length === new Set(privateKeys.map(k => k.toString('hex'))).size;
  
  addResult(
    'RSA 私钥随机性基本检查',
    allUnique && uniqueMidBytes.size > 1,
    '私钥应显示随机性',
    `10个私钥全部唯一=${allUnique}, 中间字节有${uniqueMidBytes.size}种不同值`
  );
} catch (err) {
  addResult('RSA 私钥随机性基本检查', false, '有随机性', err.message, err.message, err.stack);
}

// 主测试执行函数
async function runAllTests() {
  // 运行异步并发测试
  await testConcurrentAsync();
  
  // 输出结果
  const summary = {
    total: testResults.total,
    pass: testResults.pass,
    fail: testResults.fail
  };
  
  console.log('\n========== 并发安全测试结果 ==========\n');
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

// 运行所有测试
return runAllTests();

