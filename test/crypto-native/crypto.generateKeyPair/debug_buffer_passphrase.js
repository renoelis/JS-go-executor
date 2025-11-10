const crypto = require('crypto');

console.log('测试 Buffer passphrase');

const passphrase = Buffer.from('buffer-password-test');
console.log('passphrase Buffer:', passphrase);
console.log('passphrase String:', passphrase.toString());
console.log('passphrase length:', passphrase.length);

try {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  });
  
  console.log('生成成功，私钥前50字符:', privateKey.substring(0, 50));
  console.log('包含ENCRYPTED:', privateKey.includes('ENCRYPTED'));
  
  // 尝试用 Buffer 解密
  try {
    const privKeyObj = crypto.createPrivateKey({
      key: privateKey,
      passphrase: passphrase
    });
    
    return {
      success: true,
      message: '生成和解密都成功',
      keyType: privKeyObj.type
    };
  } catch (err) {
    return {
      success: false,
      error: '解密失败: ' + err.message,
      stack: err.stack
    };
  }
} catch (err) {
  return {
    success: false,
    error: '生成失败: ' + err.message,
    stack: err.stack
  };
}




