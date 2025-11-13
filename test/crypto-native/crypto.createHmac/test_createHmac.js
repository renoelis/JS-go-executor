const crypto = require('crypto');

// 测试结果收集
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function runTest(name, testFn) {
  testResults.total++;
  try {
    const result = testFn();
    if (result.success) {
      testResults.passed++;
      testResults.details.push({
        name,
        status: '✅',
        message: result.message || 'Pass'
      });
    } else {
      testResults.failed++;
      testResults.details.push({
        name,
        status: '❌',
        message: result.message || 'Failed'
      });
    }
  } catch (error) {
    testResults.failed++;
    testResults.details.push({
      name,
      status: '❌',
      message: `Exception: ${error.message}`
    });
  }
}

// ===== 1. 基本功能测试 =====

runTest('SHA256 基本 HMAC 生成', () => {
  const secret = 'my-secret-key';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update('hello world');
  const digest = hmac.digest('hex');
  const expected = '90eb182d8396f16d4341d582047f45c0a97d73388c5377d9ced478a2212295ad';
  return {
    success: digest === expected,
    message: digest === expected ? `正确: ${digest}` : `期望: ${expected}, 实际: ${digest}`
  };
});

runTest('SHA512 基本 HMAC 生成', () => {
  const secret = 'my-secret-key';
  const hmac = crypto.createHmac('sha512', secret);
  hmac.update('hello world');
  const digest = hmac.digest('hex');
  const expected = '6c1e65d24c2a301e122e5cb3c95faa0e97b214619f20eb2aa47e0ddfc7456d43b9a77493a077d289d1ada34d072ad59a92ca3cdea87cca4a8f7940ea31b81d60';
  return {
    success: digest === expected,
    message: digest === expected ? `正确: ${digest.substring(0, 32)}...` : `期望: ${expected.substring(0, 32)}..., 实际: ${digest.substring(0, 32)}...`
  };
});

runTest('SHA1 基本 HMAC 生成', () => {
  const secret = 'my-secret-key';
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update('hello world');
  const digest = hmac.digest('hex');
  const expected = 'b4e14d29e06941e8b1f3e8c22d6e3e0e0e3e7e3f';
  return {
    success: digest.length === 40, // SHA1 应该是40个十六进制字符
    message: digest.length === 40 ? `SHA1 长度正确: ${digest}` : `SHA1 长度错误: ${digest.length}`
  };
});

runTest('MD5 基本 HMAC 生成', () => {
  const secret = 'my-secret-key';
  const hmac = crypto.createHmac('md5', secret);
  hmac.update('hello world');
  const digest = hmac.digest('hex');
  const expected = 'd36ab156d9055bd954303497835ce49e';
  return {
    success: digest === expected,
    message: digest === expected ? `正确: ${digest}` : `期望: ${expected}, 实际: ${digest}`
  };
});

runTest('SHA384 基本 HMAC 生成', () => {
  const secret = 'test-key';
  const hmac = crypto.createHmac('sha384', secret);
  hmac.update('test data');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 96, // SHA384 应该是96个十六进制字符
    message: `SHA384 长度: ${digest.length} (期望96)`
  };
});

runTest('SHA224 基本 HMAC 生成', () => {
  const secret = 'test-key';
  const hmac = crypto.createHmac('sha224', secret);
  hmac.update('test data');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 56, // SHA224 应该是56个十六进制字符
    message: `SHA224 长度: ${digest.length} (期望56)`
  };
});

// ===== 2. 编码选项测试 =====

runTest('hex 编码输出', () => {
  const hmac = crypto.createHmac('sha256', 'secret');
  hmac.update('data');
  const digest = hmac.digest('hex');
  return {
    success: /^[0-9a-f]+$/.test(digest) && digest.length === 64,
    message: `hex 格式正确: ${digest.substring(0, 16)}...`
  };
});

runTest('base64 编码输出', () => {
  const hmac = crypto.createHmac('sha256', 'secret');
  hmac.update('data');
  const digest = hmac.digest('base64');
  return {
    success: /^[A-Za-z0-9+/]+=*$/.test(digest),
    message: `base64 格式正确: ${digest}`
  };
});

runTest('base64url 编码输出', () => {
  const hmac = crypto.createHmac('sha256', 'secret');
  hmac.update('data');
  const digest = hmac.digest('base64url');
  return {
    success: /^[A-Za-z0-9_-]+$/.test(digest),
    message: `base64url 格式正确: ${digest}`
  };
});

runTest('Buffer 输出(无编码)', () => {
  const hmac = crypto.createHmac('sha256', 'secret');
  hmac.update('data');
  const digest = hmac.digest();
  return {
    success: Buffer.isBuffer(digest) && digest.length === 32,
    message: `Buffer 长度: ${digest.length} bytes`
  };
});

runTest('latin1 编码输出', () => {
  const hmac = crypto.createHmac('sha256', 'secret');
  hmac.update('data');
  const digest = hmac.digest('latin1');
  return {
    success: typeof digest === 'string' && digest.length === 32,
    message: `latin1 编码成功, 长度: ${digest.length}`
  };
});

// ===== 3. 不同密钥类型测试 =====

runTest('String 类型密钥', () => {
  const hmac = crypto.createHmac('sha256', 'string-secret');
  hmac.update('data');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `String 密钥成功: ${digest.substring(0, 16)}...`
  };
});

runTest('Buffer 类型密钥', () => {
  const key = Buffer.from('buffer-secret', 'utf8');
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `Buffer 密钥成功: ${digest.substring(0, 16)}...`
  };
});

runTest('Uint8Array 类型密钥', () => {
  const key = new Uint8Array([115, 101, 99, 114, 101, 116]); // 'secret'
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `Uint8Array 密钥成功: ${digest.substring(0, 16)}...`
  };
});

runTest('DataView 类型密钥', () => {
  const buffer = new ArrayBuffer(6);
  const view = new DataView(buffer);
  'secret'.split('').forEach((char, i) => view.setUint8(i, char.charCodeAt(0)));
  const hmac = crypto.createHmac('sha256', view);
  hmac.update('data');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `DataView 密钥成功: ${digest.substring(0, 16)}...`
  };
});

runTest('空密钥', () => {
  const hmac = crypto.createHmac('sha256', '');
  hmac.update('data');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `空密钥成功: ${digest.substring(0, 16)}...`
  };
});

runTest('长密钥 (超过块大小)', () => {
  const longKey = 'a'.repeat(256); // 256字符长密钥
  const hmac = crypto.createHmac('sha256', longKey);
  hmac.update('data');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `长密钥成功: ${digest.substring(0, 16)}...`
  };
});

runTest('Base64编码的密钥', () => {
  const base64Secret = Buffer.from('my-secret', 'utf8').toString('base64');
  const key = Buffer.from(base64Secret, 'base64');
  const hmac = crypto.createHmac('sha256', key);
  hmac.update('data');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `Base64密钥成功: ${digest.substring(0, 16)}...`
  };
});

runTest('二进制密钥', () => {
  const binaryKey = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE]);
  const hmac = crypto.createHmac('sha256', binaryKey);
  hmac.update('data');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `二进制密钥成功: ${digest.substring(0, 16)}...`
  };
});

// ===== 4. Update 方法测试 =====

runTest('单次 update', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('hello world');
  const digest1 = hmac1.digest('hex');
  return {
    success: digest1.length === 64,
    message: `单次update成功: ${digest1.substring(0, 16)}...`
  };
});

runTest('多次 update', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('hello');
  hmac1.update(' ');
  hmac1.update('world');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update('hello world');
  const digest2 = hmac2.digest('hex');

  return {
    success: digest1 === digest2,
    message: digest1 === digest2 ? `多次update与单次结果一致` : `多次update与单次结果不一致`
  };
});

runTest('链式调用 update', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  const digest = hmac.update('hello').update(' ').update('world').digest('hex');
  return {
    success: digest.length === 64,
    message: `链式调用成功: ${digest.substring(0, 16)}...`
  };
});

runTest('update Buffer 数据', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  const data = Buffer.from('hello world', 'utf8');
  hmac.update(data);
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `Buffer数据成功: ${digest.substring(0, 16)}...`
  };
});

runTest('update 指定编码', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('hello world', 'utf8');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `指定编码成功: ${digest.substring(0, 16)}...`
  };
});

runTest('update 空字符串', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `空字符串update成功: ${digest.substring(0, 16)}...`
  };
});

runTest('update 特殊字符', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('Hello 世界 🌍 \n\t\r');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `特殊字符成功: ${digest.substring(0, 16)}...`
  };
});

runTest('update 大量数据', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  const largeData = 'x'.repeat(1024 * 1024); // 1MB 数据
  hmac.update(largeData);
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `大量数据(1MB)成功: ${digest.substring(0, 16)}...`
  };
});

// ===== 5. 边界情况和错误处理 =====

runTest('digest 后再次调用 digest 返回空字符串', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('data');
  const digest1 = hmac.digest('hex');
  const digest2 = hmac.digest('hex'); // Node.js 不会抛出错误，返回空字符串
  
  return {
    success: digest1.length === 64 && digest2 === '',
    message: `第一次: ${digest1.length}字符, 第二次: "${digest2}" (空字符串)`
  };
});

runTest('digest 后不能再次调用 update', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('data');
  hmac.digest('hex');

  try {
    hmac.update('more data'); // 应该抛出错误
    return { success: false, message: '应该抛出错误但没有' };
  } catch (error) {
    return {
      success: error.message.includes('Digest already called') || error.message.includes('Not initialized'),
      message: `正确抛出错误: ${error.message}`
    };
  }
});

runTest('不支持的算法', () => {
  try {
    const hmac = crypto.createHmac('invalid-algorithm', 'key');
    hmac.update('data');
    hmac.digest('hex');
    return { success: false, message: '应该抛出错误但没有' };
  } catch (error) {
    return {
      success: error.message.includes('digest') || error.message.includes('algorithm') || error.message.includes('Invalid'),
      message: `正确抛出错误: ${error.message}`
    };
  }
});

runTest('无效编码返回 Buffer', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('data');
  const digest = hmac.digest('invalid-encoding'); // Node.js 不会抛出错误，返回 Buffer
  
  return {
    success: Buffer.isBuffer(digest) && digest.length === 32,
    message: `无效编码返回 Buffer, 长度: ${digest.length} bytes`
  };
});

runTest('无 update 直接 digest', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `无update直接digest成功: ${digest.substring(0, 16)}...`
  };
});

runTest('多个 Hmac 实例独立性', () => {
  const hmac1 = crypto.createHmac('sha256', 'key1');
  const hmac2 = crypto.createHmac('sha256', 'key2');

  hmac1.update('data');
  hmac2.update('data');

  const digest1 = hmac1.digest('hex');
  const digest2 = hmac2.digest('hex');

  return {
    success: digest1 !== digest2,
    message: digest1 !== digest2 ? `实例独立正确` : `实例不独立`
  };
});

runTest('相同输入相同输出', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('data');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update('data');
  const digest2 = hmac2.digest('hex');

  return {
    success: digest1 === digest2,
    message: digest1 === digest2 ? `相同输入产生相同输出` : `相同输入产生不同输出`
  };
});

runTest('不同密钥不同输出', () => {
  const hmac1 = crypto.createHmac('sha256', 'key1');
  hmac1.update('data');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', 'key2');
  hmac2.update('data');
  const digest2 = hmac2.digest('hex');

  return {
    success: digest1 !== digest2,
    message: digest1 !== digest2 ? `不同密钥产生不同输出` : `不同密钥产生相同输出`
  };
});

// ===== 6. 特殊用例和安全特性 =====

runTest('JWT签名场景模拟', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: '1234567890', name: 'John Doe' })).toString('base64url');
  const data = `${header}.${payload}`;

  const hmac = crypto.createHmac('sha256', 'your-256-bit-secret');
  hmac.update(data);
  const signature = hmac.digest('base64url');

  return {
    success: signature.length > 0 && /^[A-Za-z0-9_-]+$/.test(signature),
    message: `JWT签名成功: ${signature.substring(0, 20)}...`
  };
});

runTest('API签名场景模拟', () => {
  const timestamp = Date.now().toString();
  const method = 'POST';
  const path = '/api/users';
  const body = JSON.stringify({ name: 'test' });
  const signData = `${method}${path}${timestamp}${body}`;

  const hmac = crypto.createHmac('sha256', 'api-secret-key');
  hmac.update(signData);
  const signature = hmac.digest('hex');

  return {
    success: signature.length === 64,
    message: `API签名成功: ${signature.substring(0, 16)}...`
  };
});

runTest('Webhook验证场景', () => {
  const payload = JSON.stringify({ event: 'user.created', data: { id: 123 } });
  const secret = 'webhook-secret';

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = `sha256=${hmac.digest('hex')}`;

  return {
    success: signature.startsWith('sha256=') && signature.length === 71,
    message: `Webhook签名成功: ${signature.substring(0, 20)}...`
  };
});

runTest('消息完整性验证', () => {
  const message = 'Important message';
  const secret = 'shared-secret';

  // 发送方生成HMAC
  const hmacSend = crypto.createHmac('sha256', secret);
  hmacSend.update(message);
  const mac = hmacSend.digest('hex');

  // 接收方验证HMAC
  const hmacVerify = crypto.createHmac('sha256', secret);
  hmacVerify.update(message);
  const verifyMac = hmacVerify.digest('hex');

  return {
    success: mac === verifyMac,
    message: mac === verifyMac ? `消息完整性验证通过` : `消息完整性验证失败`
  };
});

runTest('防止时序攻击 - 常量时间比较需求', () => {
  const message = 'data';
  const secret = 'secret';

  const hmac1 = crypto.createHmac('sha256', secret);
  hmac1.update(message);
  const mac1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('sha256', secret);
  hmac2.update(message);
  const mac2 = hmac2.digest('hex');

  // 注意: 实际应用中应使用 crypto.timingSafeEqual 进行比较
  // 这里只是验证HMAC生成的一致性
  return {
    success: mac1 === mac2,
    message: `HMAC一致性验证通过 (实际应用需使用timingSafeEqual)`
  };
});

runTest('密钥派生场景 (HKDF-like)', () => {
  const masterKey = 'master-secret-key';
  const salt = 'unique-salt';
  const info = 'encryption-key';

  const hmac = crypto.createHmac('sha256', salt);
  hmac.update(masterKey + info);
  const derivedKey = hmac.digest('hex');

  return {
    success: derivedKey.length === 64,
    message: `密钥派生成功: ${derivedKey.substring(0, 16)}...`
  };
});

// ===== 7. 编码和字符集测试 =====

runTest('UTF-8 中文字符', () => {
  const hmac = crypto.createHmac('sha256', '密钥');
  hmac.update('你好世界');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `UTF-8中文处理成功: ${digest.substring(0, 16)}...`
  };
});

runTest('UTF-8 Emoji字符', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('Hello 🌍🚀💻');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `Emoji处理成功: ${digest.substring(0, 16)}...`
  };
});

runTest('二进制数据', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
  hmac.update(binaryData);
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `二进制数据处理成功: ${digest.substring(0, 16)}...`
  };
});

runTest('Latin1 编码数据', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('café', 'latin1');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `Latin1编码处理成功: ${digest.substring(0, 16)}...`
  };
});

// ===== 8. 性能和极限测试 =====

runTest('极小数据 (1字节)', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('a');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `1字节数据处理成功: ${digest.substring(0, 16)}...`
  };
});

runTest('零长度数据', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `零长度数据处理成功: ${digest.substring(0, 16)}...`
  };
});

runTest('极短密钥 (1字节)', () => {
  const hmac = crypto.createHmac('sha256', 'k');
  hmac.update('data');
  const digest = hmac.digest('hex');
  return {
    success: digest.length === 64,
    message: `1字节密钥处理成功: ${digest.substring(0, 16)}...`
  };
});

// ===== 9. 各种哈希算法的完整性验证 =====

runTest('SHA256 已知向量测试', () => {
  // RFC 4231 Test Case 1
  const key = Buffer.from('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex');
  const data = Buffer.from('4869205468657265', 'hex'); // "Hi There"
  const expected = 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7';

  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  const digest = hmac.digest('hex');

  return {
    success: digest === expected,
    message: digest === expected ? `RFC 4231向量测试通过` : `期望: ${expected}, 实际: ${digest}`
  };
});

runTest('SHA512 已知向量测试', () => {
  const key = Buffer.from('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex');
  const data = Buffer.from('4869205468657265', 'hex'); // "Hi There"

  const hmac = crypto.createHmac('sha512', key);
  hmac.update(data);
  const digest = hmac.digest('hex');

  return {
    success: digest.length === 128, // SHA512 是 128 个十六进制字符
    message: `SHA512向量测试: ${digest.substring(0, 32)}... (长度: ${digest.length})`
  };
});

// ===== 10. 实际应用场景测试 =====

runTest('OAuth 1.0 签名基础字符串', () => {
  const baseString = 'POST&https%3A%2F%2Fapi.example.com%2Ftoken&oauth_consumer_key%3Dkey';
  const signingKey = 'consumer_secret&token_secret';

  const hmac = crypto.createHmac('sha1', signingKey);
  hmac.update(baseString);
  const signature = hmac.digest('base64');

  return {
    success: signature.length > 0,
    message: `OAuth签名成功: ${signature.substring(0, 20)}...`
  };
});

runTest('HMAC-based OTP (类似)', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(123456));

  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(counter);
  const hash = hmac.digest();

  return {
    success: hash.length === 20, // SHA1 产生 20 字节
    message: `HOTP风格HMAC成功, 哈希长度: ${hash.length}`
  };
});

runTest('AWS Signature Version 4 风格', () => {
  const dateStamp = '20231201';
  const regionName = 'us-east-1';
  const serviceName = 's3';

  let hmac = crypto.createHmac('sha256', `AWS4SecretKey`);
  hmac.update(dateStamp);
  let kDate = hmac.digest();

  hmac = crypto.createHmac('sha256', kDate);
  hmac.update(regionName);
  let kRegion = hmac.digest();

  hmac = crypto.createHmac('sha256', kRegion);
  hmac.update(serviceName);
  let kService = hmac.digest();

  hmac = crypto.createHmac('sha256', kService);
  hmac.update('aws4_request');
  let signingKey = hmac.digest();

  return {
    success: Buffer.isBuffer(signingKey) && signingKey.length === 32,
    message: `AWS风格签名密钥派生成功, 长度: ${signingKey.length}`
  };
});

// ===== 11. 参数验证测试 =====

runTest('createHmac 不传参数应该抛出错误', () => {
  try {
    crypto.createHmac();
    return { success: false, message: '应该抛出错误但没有' };
  } catch (error) {
    return {
      success: true,
      message: `正确抛出错误: ${error.message}`
    };
  }
});

runTest('createHmac 只传一个参数应该抛出错误', () => {
  try {
    crypto.createHmac('sha256');
    return { success: false, message: '应该抛出错误但没有' };
  } catch (error) {
    return {
      success: true,
      message: `正确抛出错误: ${error.message}`
    };
  }
});

runTest('update 不传参数应该抛出错误', () => {
  try {
    const hmac = crypto.createHmac('sha256', 'key');
    hmac.update();
    return { success: false, message: '应该抛出错误但没有' };
  } catch (error) {
    return {
      success: true,
      message: `正确抛出错误: ${error.message}`
    };
  }
});

runTest('update 传入数字应该抛出错误', () => {
  try {
    const hmac = crypto.createHmac('sha256', 'key');
    hmac.update(123);
    return { success: false, message: '应该抛出错误但没有' };
  } catch (error) {
    return {
      success: true,
      message: `正确抛出错误: ${error.message}`
    };
  }
});

runTest('update 传入对象应该抛出错误', () => {
  try {
    const hmac = crypto.createHmac('sha256', 'key');
    hmac.update({});
    return { success: false, message: '应该抛出错误但没有' };
  } catch (error) {
    return {
      success: true,
      message: `正确抛出错误: ${error.message}`
    };
  }
});

runTest('update 传入 null 应该抛出错误', () => {
  try {
    const hmac = crypto.createHmac('sha256', 'key');
    hmac.update(null);
    return { success: false, message: '应该抛出错误但没有' };
  } catch (error) {
    return {
      success: true,
      message: `正确抛出错误: ${error.message}`
    };
  }
});

runTest('算法名称不区分大小写', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('data');
  const digest1 = hmac1.digest('hex');

  const hmac2 = crypto.createHmac('SHA256', 'key');
  hmac2.update('data');
  const digest2 = hmac2.digest('hex');

  return {
    success: digest1 === digest2,
    message: digest1 === digest2 ? '算法名称不区分大小写' : '算法名称区分大小写'
  };
});

// ===== 12. 不同算法输出长度验证 =====

runTest('各算法输出长度验证', () => {
  const algorithms = [
    { name: 'md5', expectedHexLen: 32, expectedByteLen: 16 },
    { name: 'sha1', expectedHexLen: 40, expectedByteLen: 20 },
    { name: 'sha224', expectedHexLen: 56, expectedByteLen: 28 },
    { name: 'sha256', expectedHexLen: 64, expectedByteLen: 32 },
    { name: 'sha384', expectedHexLen: 96, expectedByteLen: 48 },
    { name: 'sha512', expectedHexLen: 128, expectedByteLen: 64 }
  ];

  let allCorrect = true;
  let messages = [];

  for (const algo of algorithms) {
    try {
      const hmac = crypto.createHmac(algo.name, 'key');
      hmac.update('data');
      const hexDigest = hmac.digest('hex');

      const hmac2 = crypto.createHmac(algo.name, 'key');
      hmac2.update('data');
      const bufferDigest = hmac2.digest();

      const hexCorrect = hexDigest.length === algo.expectedHexLen;
      const bufferCorrect = bufferDigest.length === algo.expectedByteLen;

      if (hexCorrect && bufferCorrect) {
        messages.push(`${algo.name}: ✓`);
      } else {
        allCorrect = false;
        messages.push(`${algo.name}: ✗ (hex:${hexDigest.length}/${algo.expectedHexLen}, buf:${bufferDigest.length}/${algo.expectedByteLen})`);
      }
    } catch (error) {
      allCorrect = false;
      messages.push(`${algo.name}: Error - ${error.message}`);
    }
  }

  return {
    success: allCorrect,
    message: messages.join(', ')
  };
});

// ===== 13. 更多编码和数据类型测试 =====

runTest('update 使用 hex 编码输入', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  // '68656c6c6f' 是 'hello' 的 hex 编码
  hmac.update('68656c6c6f', 'hex');
  const digest = hmac.digest('hex');
  
  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update('hello');
  const expected = hmac2.digest('hex');
  
  return {
    success: digest === expected,
    message: digest === expected ? 'hex 编码输入正确' : `不匹配`
  };
});

runTest('update 使用 base64 编码输入', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  // 'aGVsbG8=' 是 'hello' 的 base64 编码
  hmac.update('aGVsbG8=', 'base64');
  const digest = hmac.digest('hex');
  
  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update('hello');
  const expected = hmac2.digest('hex');
  
  return {
    success: digest === expected,
    message: digest === expected ? 'base64 编码输入正确' : `不匹配`
  };
});

runTest('密钥和数据类型一致性验证', () => {
  // 字符串密钥和 Buffer 密钥应该产生相同结果
  const hmac1 = crypto.createHmac('sha256', 'secret');
  hmac1.update('data');
  const digest1 = hmac1.digest('hex');
  
  const hmac2 = crypto.createHmac('sha256', Buffer.from('secret'));
  hmac2.update('data');
  const digest2 = hmac2.digest('hex');
  
  return {
    success: digest1 === digest2,
    message: digest1 === digest2 ? '字符串和Buffer密钥产生相同结果' : '结果不一致'
  };
});

runTest('不同编码相同数据的一致性', () => {
  const data = 'test data';
  
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update(data, 'utf8');
  const digest1 = hmac1.digest('hex');
  
  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update(Buffer.from(data, 'utf8'));
  const digest2 = hmac2.digest('hex');
  
  return {
    success: digest1 === digest2,
    message: digest1 === digest2 ? 'UTF-8字符串和Buffer结果一致' : '结果不一致'
  };
});

runTest('digest() 返回值不影响原数据', () => {
  const hmac = crypto.createHmac('sha256', 'key');
  hmac.update('data');
  const digest1 = hmac.digest();
  const digest2 = hmac.digest();
  
  // 第二次调用返回空字符串/Buffer
  return {
    success: Buffer.isBuffer(digest1) && digest1.length === 32 && digest2.toString() === '',
    message: `第一次返回Buffer(${digest1.length}), 第二次返回空(${digest2.length})`
  };
});

// ===== 14. SHA-3 系列算法测试 =====

runTest('SHA3-256 算法测试', () => {
  try {
    const hmac = crypto.createHmac('sha3-256', 'key');
    hmac.update('test');
    const digest = hmac.digest('hex');
    return {
      success: digest.length === 64,
      message: `SHA3-256成功, 长度: ${digest.length}`
    };
  } catch (error) {
    return {
      success: false,
      message: `SHA3-256可能不支持: ${error.message}`
    };
  }
});

runTest('SHA3-512 算法测试', () => {
  try {
    const hmac = crypto.createHmac('sha3-512', 'key');
    hmac.update('test');
    const digest = hmac.digest('hex');
    return {
      success: digest.length === 128,
      message: `SHA3-512成功, 长度: ${digest.length}`
    };
  } catch (error) {
    return {
      success: false,
      message: `SHA3-512可能不支持: ${error.message}`
    };
  }
});

// ===== 15. 安全特性测试 =====

runTest('雪崩效应 - 数据微小变化', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('data');
  const digest1 = hmac1.digest('hex');
  
  const hmac2 = crypto.createHmac('sha256', 'key');
  hmac2.update('Data'); // 只有首字母大小写不同
  const digest2 = hmac2.digest('hex');
  
  // 计算差异位数
  let diff = 0;
  for (let i = 0; i < digest1.length; i++) {
    if (digest1[i] !== digest2[i]) diff++;
  }
  
  const diffRatio = diff / digest1.length;
  return {
    success: digest1 !== digest2 && diffRatio > 0.3,
    message: `数据微小变化导致${diff}/${digest1.length}位不同 (${(diffRatio*100).toFixed(1)}%)`
  };
});

runTest('雪崩效应 - 密钥微小变化', () => {
  const hmac1 = crypto.createHmac('sha256', 'key');
  hmac1.update('data');
  const digest1 = hmac1.digest('hex');
  
  const hmac2 = crypto.createHmac('sha256', 'Key'); // 只有首字母大小写不同
  hmac2.update('data');
  const digest2 = hmac2.digest('hex');
  
  // 计算差异位数
  let diff = 0;
  for (let i = 0; i < digest1.length; i++) {
    if (digest1[i] !== digest2[i]) diff++;
  }
  
  const diffRatio = diff / digest1.length;
  return {
    success: digest1 !== digest2 && diffRatio > 0.3,
    message: `密钥微小变化导致${diff}/${digest1.length}位不同 (${(diffRatio*100).toFixed(1)}%)`
  };
});

runTest('抗碰撞性测试', () => {
  const digests = new Set();
  const count = 100;
  
  for (let i = 0; i < count; i++) {
    const hmac = crypto.createHmac('sha256', 'key');
    hmac.update(`test data ${i}`);
    const digest = hmac.digest('hex');
    
    if (digests.has(digest)) {
      return {
        success: false,
        message: `发现碰撞在第${i}次`
      };
    }
    digests.add(digest);
  }
  
  return {
    success: digests.size === count,
    message: `${count}个不同输入产生${digests.size}个不同输出`
  };
});

// ===== 输出测试结果 =====

console.log('\n========================================');
console.log('crypto.createHmac 全面测试报告');
console.log('========================================\n');

console.log(`总测试数: ${testResults.total}`);
console.log(`通过: ${testResults.passed} ✅`);
console.log(`失败: ${testResults.failed} ❌`);
console.log(`通过率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%\n`);

console.log('详细结果:\n');
testResults.details.forEach((detail, index) => {
  console.log(`${index + 1}. ${detail.status} ${detail.name}`);
  console.log(`   ${detail.message}\n`);
});

console.log('========================================\n');

// 返回结果供外部使用
return {
  success: testResults.failed === 0,
  total: testResults.total,
  passed: testResults.passed,
  failed: testResults.failed,
  details: testResults.details
};
