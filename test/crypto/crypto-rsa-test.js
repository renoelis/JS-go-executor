// Node.js crypto 模块 - RSA 加密/解密和签名/验证功能测试
const crypto = require('crypto');

let results = {
  passed: 0,
  failed: 0,
  tests: []
};

function addResult(testName, passed, message) {
  results.tests.push({ test: testName, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

// 测试用的 RSA 密钥对 (2048位)
const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy4JUuiFVAWAp2Cxul7qZ
VBnsyzjcpuisc0wsg5t+Gs6p2KFEoPbw65A5wvD6dFy5AYV7yprxxqOXZSkyVXGg
4GSUWCLUdzX5QXaUaDp9iLJWkiQ7IXU8UPoFsYQ445ZPz7/S8H7onS5QD7i3UaBM
bex/fypjggbLXckNwxEJyoP9AgVKBuxG1lkopQmJsUWXzdwNjiDrnNls8uLVwEHu
7hc448EAitlEhRGUoRT9RzurWcir104cVmt8I19krVlHu1BzlhOxjaMWIk7PlKlS
65U6QUGNu8mvmzyhFSWTanmsqXIjqhz/IESr2ES1Kp/V8avci3evsVP7RtiO/VUw
dQIDAQAB
-----END PUBLIC KEY-----`;

const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDLglS6IVUBYCnY
LG6XuplUGezLONym6KxzTCyDm34azqnYoUSg9vDrkDnC8Pp0XLkBhXvKmvHGo5dl
KTJVcaDgZJRYItR3NflBdpRoOn2IslaSJDshdTxQ+gWxhDjjlk/Pv9LwfuidLlAP
uLdRoExt7H9/KmOCBstdyQ3DEQnKg/0CBUoG7EbWWSilCYmxRZfN3A2OIOuc2Wzy
4tXAQe7uFzjjwQCK2USFEZShFP1HO6tZyKvXThxWa3wjX2StWUe7UHOWE7GNoxYi
Ts+UqVLrlTpBQY27ya+bPKEVJZNqeaypciOqHP8gRKvYRLUqn9Xxq9yLd6+xU/tG
2I79VTB1AgMBAAECggEACe9tcn7RFxWaRV758TdfZ+8yE8PNZeqjDKfx3mT3dZiU
SyqoXpFftqheYYmBOLAUKiJZpk0FM7Tl3b7yoaBAAeR3J4xfwgglCJCg8yuz2DoY
pt7U8i+2h5+FKqLxYg8DC3nqcupHMfFCYFocvQPt50nt+YfYvs7VG9mGbfkFeNj9
daDQblg3AB+zUgXk/SfJu0q3Xfe9SqfLAuFNWWBMuXb+sdy6a20pbBlYW1/BYI4z
Jo93kx0aVDSi18TTY6fbdEHO9Q+/OxfGglAP+6fcfjQP9zeHIVpBJU3R0U9+zGvm
jbGeBnbX3titAuIQwaH/lWgnMxtseEEUAQUefcRl8QKBgQDnnx2SYcZs0PTxzecw
o8m7xTIYaBzKntisZ4Y1UnKYqt9Gj/3MdxKAT3PL05J5EnVPcgOE3uJAixLjTSUz
/LCTw7fhWxCqwiaNskXVwF0/YIlyEWPHhyyaoGzre9Mzg3WOYryWpqF7SDO6UU8O
r82EyyYRxpjvsZsrP1vfBumEnQKBgQDg7b60yr33wjRzgxBYFqnBdprxSw2rbBfn
BDxSwzYa30PvicbxA6/5mM95xdwSAOFtP0tcxbgddbxJ6X8wNiPfmtcp8dL0pRR3
8rCUE3CCmGdXvz/NQZW4j4RyqHWICQukNachjN/dKazb9YfcrCD98e965U4pR/gp
b3QVyZ9XuQKBgQDb3suvnWlC+sjKkW8ZWSGzQWpgiNRr84YzgsJ/85gdHHd/AEko
ww+pBcMiheDRVZhOpih5BSs5oct4Qk9CnmjwnCX9ovibYFpAwC5Szpy2AOn4glF5
ovPQhOFgWNcQW4ZId6oWSG+aG9wezfiCNJifqkilLyUWxD5MO4T2nhUmcQKBgQDK
CIJNffYYPtZCEy1xEho0bcZKifGjUho+JO3SIQnOJVCuLgEFpxw/g2SIqpI7kZLq
P/n/QJFZ1NDlStg1g8vBIyG0yUOE/2pdOx4kQznB9AaPKHe0c/55ol+DZZD8ObO9
MXwHhLPnwXFEuUvpiKqxrsg+iQ0lw0FCZpvMnieD8QKBgQCwDON9KTunKDTlyxwy
0MbeQXbSbERxJRJCJuH6zu92LQFpmJ8b98Q6YuUhjJ3nwitvlBQXRiSu6Hc6p1zS
Tm0Bmfwr3ixcId+uhrInfjET1jPm9kxjVHAZrCLiXsgmoWbm2R4HTHoc/CCfF2bu
QoNEBrNSGHvpu4fSniDc8spuuA==
-----END PRIVATE KEY-----`;

//
// 测试 1: publicEncrypt() + privateDecrypt() - 基本功能
//
try {
  const plaintext = "Hello, RSA Encryption!";
  
  // 公钥加密
  const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(plaintext));
  
  // 私钥解密
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  const decryptedText = decrypted.toString('utf8');
  
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 1: publicEncrypt + privateDecrypt 基本功能',
    passed,
    passed ? `加密/解密成功: "${plaintext}" -> "${decryptedText}"` : `解密结果不匹配: "${decryptedText}"`
  );
} catch (error) {
  addResult('测试 1: publicEncrypt + privateDecrypt 基本功能', false, `异常: ${error.message}`);
}

//
// 测试 2: publicEncrypt() - 加密短字符串
//
try {
  const plaintext = "Hi";
  const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(plaintext));
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  const decryptedText = decrypted.toString('utf8');
  
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 2: RSA 加密短字符串',
    passed,
    passed ? `成功加密/解密短字符串: "${plaintext}"` : `解密失败: "${decryptedText}"`
  );
} catch (error) {
  addResult('测试 2: RSA 加密短字符串', false, `异常: ${error.message}`);
}

//
// 测试 3: publicEncrypt() - 加密中文字符
//
try {
  const plaintext = "你好，世界！RSA加密测试";
  const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(plaintext, 'utf8'));
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  const decryptedText = decrypted.toString('utf8');
  
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 3: RSA 加密中文字符',
    passed,
    passed ? `成功加密/解密中文: "${plaintext}"` : `解密失败: "${decryptedText}"`
  );
} catch (error) {
  addResult('测试 3: RSA 加密中文字符', false, `异常: ${error.message}`);
}

//
// 测试 4: publicEncrypt() - 加密特殊字符
//
try {
  const plaintext = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
  const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(plaintext));
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  const decryptedText = decrypted.toString('utf8');
  
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 4: RSA 加密特殊字符',
    passed,
    passed ? `成功加密/解密特殊字符` : `解密失败`
  );
} catch (error) {
  addResult('测试 4: RSA 加密特殊字符', false, `异常: ${error.message}`);
}

//
// 测试 5: publicEncrypt() - 加密 JSON 数据
//
try {
  const jsonData = { user: "Alice", age: 30, roles: ["admin", "user"] };
  const plaintext = JSON.stringify(jsonData);
  
  const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(plaintext));
  const decrypted = crypto.privateDecrypt(privateKey, encrypted);
  const decryptedText = decrypted.toString('utf8');
  const parsedData = JSON.parse(decryptedText);
  
  const passed = parsedData.user === "Alice" && parsedData.age === 30 && parsedData.roles.length === 2;
  
  addResult(
    '测试 5: RSA 加密 JSON 数据',
    passed,
    passed ? `成功加密/解密 JSON 数据` : `解密或解析失败`
  );
} catch (error) {
  addResult('测试 5: RSA 加密 JSON 数据', false, `异常: ${error.message}`);
}

//
// 测试 6: publicEncrypt() - 多次加密产生不同密文 (使用 OAEP 填充时会有随机性)
//
try {
  const plaintext = "Same message";
  const encrypted1 = crypto.publicEncrypt(publicKey, Buffer.from(plaintext));
  const encrypted2 = crypto.publicEncrypt(publicKey, Buffer.from(plaintext));
  
  const hex1 = encrypted1.toString('hex');
  const hex2 = encrypted2.toString('hex');
  
  // PKCS1 填充有随机性, 所以密文应该不同
  const isDifferent = hex1 !== hex2;
  
  // 但解密后应该相同
  const decrypted1 = crypto.privateDecrypt(privateKey, encrypted1).toString('utf8');
  const decrypted2 = crypto.privateDecrypt(privateKey, encrypted2).toString('utf8');
  const sameDecrypted = decrypted1 === plaintext && decrypted2 === plaintext;
  
  const passed = isDifferent && sameDecrypted;
  
  addResult(
    '测试 6: RSA 加密随机性 (相同明文不同密文)',
    passed,
    passed ? `密文不同但解密结果相同 (填充随机性正常)` : `随机性验证失败`
  );
} catch (error) {
  addResult('测试 6: RSA 加密随机性', false, `异常: ${error.message}`);
}

//
// 测试 7: sign() + verify() - 数字签名基本功能 (SHA256)
//
try {
  const message = "This is a message to be signed";
  
  // 使用私钥签名
  const signer = crypto.createSign('SHA256');
  signer.update(message);
  const signature = signer.sign(privateKey);
  
  // 使用公钥验证
  const verifier = crypto.createVerify('SHA256');
  verifier.update(message);
  const isValid = verifier.verify(publicKey, signature);
  
  addResult(
    '测试 7: sign + verify 数字签名 (SHA256)',
    isValid,
    isValid ? `签名验证成功` : `签名验证失败`
  );
} catch (error) {
  addResult('测试 7: sign + verify 数字签名 (SHA256)', false, `异常: ${error.message}`);
}

//
// 测试 8: sign() + verify() - 验证篡改检测
//
try {
  const message = "Original message";
  const tamperedMessage = "Tampered message";
  
  // 签名原始消息
  const signer = crypto.createSign('SHA256');
  signer.update(message);
  const signature = signer.sign(privateKey);
  
  // 验证篡改的消息 (应该失败)
  const verifier = crypto.createVerify('SHA256');
  verifier.update(tamperedMessage);
  const isValid = verifier.verify(publicKey, signature);
  
  const passed = !isValid; // 应该验证失败
  
  addResult(
    '测试 8: 数字签名篡改检测',
    passed,
    passed ? `正确检测到消息被篡改` : `未能检测到篡改 (验证应该失败)`
  );
} catch (error) {
  addResult('测试 8: 数字签名篡改检测', false, `异常: ${error.message}`);
}

//
// 测试 9: sign() + verify() - SHA1 签名
//
try {
  const message = "Message with SHA1";
  
  const signer = crypto.createSign('SHA1');
  signer.update(message);
  const signature = signer.sign(privateKey);
  
  const verifier = crypto.createVerify('SHA1');
  verifier.update(message);
  const isValid = verifier.verify(publicKey, signature);
  
  addResult(
    '测试 9: 数字签名 (SHA1)',
    isValid,
    isValid ? `SHA1 签名验证成功` : `SHA1 签名验证失败`
  );
} catch (error) {
  addResult('测试 9: 数字签名 (SHA1)', false, `异常: ${error.message}`);
}

//
// 测试 10: sign() + verify() - SHA512 签名
//
try {
  const message = "Message with SHA512";
  
  const signer = crypto.createSign('SHA512');
  signer.update(message);
  const signature = signer.sign(privateKey);
  
  const verifier = crypto.createVerify('SHA512');
  verifier.update(message);
  const isValid = verifier.verify(publicKey, signature);
  
  addResult(
    '测试 10: 数字签名 (SHA512)',
    isValid,
    isValid ? `SHA512 签名验证成功` : `SHA512 签名验证失败`
  );
} catch (error) {
  addResult('测试 10: 数字签名 (SHA512)', false, `异常: ${error.message}`);
}

//
// 测试 11: sign() + verify() - 签名中文消息
//
try {
  const message = "这是一条需要签名的中文消息，用于测试数字签名功能。";
  
  const signer = crypto.createSign('SHA256');
  signer.update(message);
  const signature = signer.sign(privateKey);
  
  const verifier = crypto.createVerify('SHA256');
  verifier.update(message);
  const isValid = verifier.verify(publicKey, signature);
  
  addResult(
    '测试 11: 数字签名中文消息',
    isValid,
    isValid ? `中文消息签名验证成功` : `中文消息签名验证失败`
  );
} catch (error) {
  addResult('测试 11: 数字签名中文消息', false, `异常: ${error.message}`);
}

//
// 测试 12: sign() + verify() - 签名大文本
//
try {
  const message = "A".repeat(1000); // 1000 个 'A'
  
  const signer = crypto.createSign('SHA256');
  signer.update(message);
  const signature = signer.sign(privateKey);
  
  const verifier = crypto.createVerify('SHA256');
  verifier.update(message);
  const isValid = verifier.verify(publicKey, signature);
  
  addResult(
    '测试 12: 数字签名大文本 (1000 字符)',
    isValid,
    isValid ? `大文本签名验证成功` : `大文本签名验证失败`
  );
} catch (error) {
  addResult('测试 12: 数字签名大文本', false, `异常: ${error.message}`);
}

//
// 测试 13: sign() + verify() - 链式 update 调用
//
try {
  const part1 = "Hello, ";
  const part2 = "World!";
  
  // 分块更新
  const signer = crypto.createSign('SHA256');
  signer.update(part1);
  signer.update(part2);
  const signature = signer.sign(privateKey);
  
  // 一次性验证
  const verifier = crypto.createVerify('SHA256');
  verifier.update(part1 + part2);
  const isValid = verifier.verify(publicKey, signature);
  
  addResult(
    '测试 13: 数字签名链式 update',
    isValid,
    isValid ? `链式 update 签名验证成功` : `链式 update 签名验证失败`
  );
} catch (error) {
  addResult('测试 13: 数字签名链式 update', false, `异常: ${error.message}`);
}

//
// 测试 14: sign() - 签名格式验证 (hex) - Node.js 原生写法
//
try {
  const message = "Test message";
  
  const signer = crypto.createSign('SHA256');
  signer.update(message);
  const signature = signer.sign(privateKey, 'hex');
  
  // 验证是否为有效的 hex 字符串
  const isValidHex = /^[0-9a-f]+$/.test(signature);
  const isLongEnough = signature.length >= 256; // RSA-2048 签名至少 256 字节 = 512 hex 字符
  
  const passed = isValidHex && isLongEnough;
  
  addResult(
    '测试 14: 签名输出格式 (hex)',
    passed,
    passed ? `签名为有效的 hex 字符串, 长度: ${signature.length}` : `签名格式错误`
  );
} catch (error) {
  addResult('测试 14: 签名输出格式 (hex)', false, `异常: ${error.message}`);
}

//
// 测试 15: sign() - 签名格式验证 (base64) - Node.js 原生写法
//
try {
  const message = "Test message";
  
  const signer = crypto.createSign('SHA256');
  signer.update(message);
  const signature = signer.sign(privateKey, 'base64');
  
  // 验证是否为有效的 base64 字符串
  const isValidBase64 = /^[A-Za-z0-9+/=]+$/.test(signature);
  const isLongEnough = signature.length >= 340; // RSA-2048 base64 签名长度
  
  const passed = isValidBase64 && isLongEnough;
  
  addResult(
    '测试 15: 签名输出格式 (base64)',
    passed,
    passed ? `签名为有效的 base64 字符串, 长度: ${signature.length}` : `签名格式错误`
  );
} catch (error) {
  addResult('测试 15: 签名输出格式 (base64)', false, `异常: ${error.message}`);
}

//
// 返回结果
//
const testResults = {
  success: results.failed === 0,
  executionMode: 'Runtime池',
  timestamp: new Date().toISOString(),
  summary: {
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    passRate: `${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`
  },
  details: results.tests,
  note: '测试 Node.js crypto 模块的 RSA 加密/解密和数字签名/验证功能'
};


console.log(JSON.stringify(testResults,null,2)); 

return testResults