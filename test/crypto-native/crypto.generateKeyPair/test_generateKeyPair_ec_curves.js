const crypto = require('crypto');

/**
 * EC 更多曲线支持测试
 * 测试 Node.js 支持的其他椭圆曲线
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

// Node.js 可能支持的所有 EC 曲线
const ecCurves = [
  // NIST 推荐曲线
  { name: 'prime256v1', alias: 'P-256' },
  { name: 'secp256k1', alias: 'Bitcoin curve' },
  { name: 'secp384r1', alias: 'P-384' },
  { name: 'secp521r1', alias: 'P-521' },
  
  // 其他 NIST 曲线
  { name: 'prime192v1', alias: 'P-192' },
  { name: 'secp224r1', alias: 'P-224' },
  
  // 其他曲线
  { name: 'secp256r1', alias: 'Same as prime256v1' },
  { name: 'prime192v2', alias: 'P-192 variant 2' },
  { name: 'prime192v3', alias: 'P-192 variant 3' },
  { name: 'prime239v1', alias: 'P-239 variant 1' },
  { name: 'prime239v2', alias: 'P-239 variant 2' },
  { name: 'prime239v3', alias: 'P-239 variant 3' },
  
  // SEC 曲线
  { name: 'secp112r1', alias: 'SEC curve' },
  { name: 'secp112r2', alias: 'SEC curve' },
  { name: 'secp128r1', alias: 'SEC curve' },
  { name: 'secp128r2', alias: 'SEC curve' },
  { name: 'secp160k1', alias: 'SEC curve' },
  { name: 'secp160r1', alias: 'SEC curve' },
  { name: 'secp160r2', alias: 'SEC curve' },
  { name: 'secp192k1', alias: 'SEC curve' },
  { name: 'secp224k1', alias: 'SEC curve' },
  { name: 'secp256k1', alias: 'SEC curve (Bitcoin)' },
  
  // Brainpool 曲线
  { name: 'brainpoolP160r1', alias: 'Brainpool' },
  { name: 'brainpoolP160t1', alias: 'Brainpool' },
  { name: 'brainpoolP192r1', alias: 'Brainpool' },
  { name: 'brainpoolP192t1', alias: 'Brainpool' },
  { name: 'brainpoolP224r1', alias: 'Brainpool' },
  { name: 'brainpoolP224t1', alias: 'Brainpool' },
  { name: 'brainpoolP256r1', alias: 'Brainpool' },
  { name: 'brainpoolP256t1', alias: 'Brainpool' },
  { name: 'brainpoolP320r1', alias: 'Brainpool' },
  { name: 'brainpoolP320t1', alias: 'Brainpool' },
  { name: 'brainpoolP384r1', alias: 'Brainpool' },
  { name: 'brainpoolP384t1', alias: 'Brainpool' },
  { name: 'brainpoolP512r1', alias: 'Brainpool' },
  { name: 'brainpoolP512t1', alias: 'Brainpool' }
];

// 测试所有曲线
for (const curve of ecCurves) {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: curve.name,
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
      `EC curve: ${curve.name}`,
      isValid,
      `支持 ${curve.alias}`,
      `生成成功`
    );
  } catch (err) {
    // 某些曲线可能不被支持，这是正常的
    const isExpectedUnsupported = err.message.includes('curve') || 
                                  err.message.includes('Unknown') ||
                                  err.message.includes('not supported');
    
    if (isExpectedUnsupported) {
      addResult(
        `EC curve: ${curve.name}`,
        true,
        `可能不支持 ${curve.alias}`,
        `不支持（这是正常的）: ${err.message.substring(0, 50)}...`
      );
    } else {
      addResult(
        `EC curve: ${curve.name}`,
        false,
        `成功生成或预期的不支持错误`,
        err.message,
        err.message,
        err.stack
      );
    }
  }
}

// 测试主要曲线的 JWK 格式
const mainCurves = [
  { name: 'prime256v1', jwkCrv: 'P-256' },
  { name: 'secp256k1', jwkCrv: 'secp256k1' },
  { name: 'secp384r1', jwkCrv: 'P-384' },
  { name: 'secp521r1', jwkCrv: 'P-521' }
];

for (const curve of mainCurves) {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: curve.name,
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
                    publicKey.crv && publicKey.x && publicKey.y;
    
    addResult(
      `EC JWK: ${curve.name}`,
      isValid ? true : false,
      `JWK格式 crv=${curve.jwkCrv}`,
      isValid ? `kty=${publicKey.kty}, crv=${publicKey.crv}` : 'JWK验证失败'
    );
  } catch (err) {
    addResult(
      `EC JWK: ${curve.name}`,
      false,
      '成功生成JWK',
      err.message,
      err.message,
      err.stack
    );
  }
}

// 测试主要曲线的 KeyObject
for (const curve of mainCurves) {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: curve.name
    });
    
    const details = publicKey.asymmetricKeyDetails;
    const isValid = publicKey.asymmetricKeyType === 'ec' &&
                    details && details.namedCurve === curve.name;
    
    addResult(
      `EC KeyObject: ${curve.name}`,
      isValid ? true : false,
      `KeyObject with namedCurve=${curve.name}`,
      isValid ? `namedCurve=${details?.namedCurve}` : 'KeyObject验证失败'
    );
  } catch (err) {
    addResult(
      `EC KeyObject: ${curve.name}`,
      false,
      '成功生成KeyObject',
      err.message,
      err.message,
      err.stack
    );
  }
}

// 输出结果
const summary = {
  total: testResults.total,
  pass: testResults.pass,
  fail: testResults.fail
};

console.log('\n========== EC 曲线支持测试结果 ==========\n');

// 分类输出
const supported = testResults.detail.filter(d => d.pass && d.got.includes('生成成功'));
const unsupported = testResults.detail.filter(d => d.pass && d.got.includes('不支持'));
const failed = testResults.detail.filter(d => !d.pass);

console.log('✅ 支持的曲线:');
for (const detail of supported) {
  console.log(`   ${detail.case}`);
}

console.log('\n⚪ 不支持的曲线（正常）:');
for (const detail of unsupported) {
  console.log(`   ${detail.case}`);
}

if (failed.length > 0) {
  console.log('\n❌ 失败的测试:');
  for (const detail of failed) {
    console.log(`   ${detail.case}`);
    console.log(`      期望: ${detail.expect}`);
    console.log(`      实际: ${detail.got}`);
    if (detail.error) {
      console.log(`      错误: ${detail.error}`);
    }
  }
}

console.log('\n========== 汇总 ==========');
console.log(`总计: ${summary.total}`);
console.log(`通过: ${summary.pass} ✅`);
console.log(`失败: ${summary.fail} ❌`);
console.log(`支持的曲线: ${supported.length}`);
console.log(`不支持的曲线: ${unsupported.length}`);
console.log(`成功率: ${((summary.pass / summary.total) * 100).toFixed(2)}%`);

const result = {
  success: summary.fail === 0,
  summary,
  supportedCurves: supported.map(d => d.case),
  unsupportedCurves: unsupported.map(d => d.case),
  detail: testResults.detail
};

console.log('\n' + JSON.stringify(result, null, 2));
return result;

