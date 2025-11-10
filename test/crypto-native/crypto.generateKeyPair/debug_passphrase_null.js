const crypto = require('crypto');

console.log('测试 passphrase=null (有cipher)');

try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { 
      type: 'pkcs8', 
      format: 'pem', 
      cipher: 'aes-256-cbc', 
      passphrase: null 
    }
  });
  
  console.log('结果: 成功生成密钥 (不应该)');
  return { success: false, error: '应该抛出错误但没有' };
} catch (error) {
  console.log('结果: 抛出错误 (正确)');
  console.log('错误消息:', error.message);
  return { success: true, error: error.message };
}




