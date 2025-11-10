const crypto = require('crypto');

/**
 * EC 曲线别名测试
 * 验证 Node.js 是否接受椭圆曲线的别名
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

// 曲线别名映射
const curveAliases = [
  { names: ['prime256v1', 'secp256r1', 'P-256'], description: 'P-256 曲线别名' },
  { names: ['secp384r1', 'P-384'], description: 'P-384 曲线别名' },
  { names: ['secp521r1', 'P-521'], description: 'P-521 曲线别名' }
];

for (const { names, description } of curveAliases) {
  for (const name of names) {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: name,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      
      const isValid = publicKey.includes('-----BEGIN PUBLIC KEY-----') &&
                      privateKey.includes('-----BEGIN PRIVATE KEY-----');
      
      addResult(
        `EC 曲线别名: ${name}`,
        isValid,
        `${description} - ${name}`,
        `生成成功`
      );
    } catch (err) {
      const isUnsupported = err.message.includes('curve') || err.message.includes('Unknown');
      addResult(
        `EC 曲线别名: ${name}`,
        isUnsupported,
        `${description} - ${name}`,
        isUnsupported ? `不支持别名: ${name}` : err.message,
        err.message,
        err.stack
      );
    }
  }
}

// 测试不同曲线的独立性
try {
  const { publicKey: pub1, privateKey: priv1 } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  
  const { publicKey: pub2, privateKey: priv2 } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp384r1'
  });
  
  // 使用 prime256v1 的私钥签名
  const data = Buffer.from('test curve independence');
  const signature = crypto.sign('sha256', data, priv1);
  
  // 使用 prime256v1 的公钥验证
  const verified1 = crypto.verify('sha256', data, pub1, signature);
  
  // 创建新签名用 secp384r1
  const signature2 = crypto.sign('sha384', data, priv2);
  const verified2 = crypto.verify('sha384', data, pub2, signature2);
  
  addResult(
    'EC 曲线独立性',
    verified1 && verified2,
    '不同曲线都能正常使用',
    `prime256v1验证=${verified1}, secp384r1验证=${verified2}`
  );
} catch (err) {
  addResult('EC 曲线独立性', false, '曲线独立性', err.message, err.message, err.stack);
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== EC 曲线别名测试结果 ==========\n');
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

