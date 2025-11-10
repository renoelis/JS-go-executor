const crypto = require('crypto');

console.log('测试空字符串 passphrase');

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase: ''
  }
});

console.log('私钥前50个字符:', privateKey.substring(0, 50));
console.log('包含ENCRYPTED:', privateKey.includes('ENCRYPTED'));

return {
  success: privateKey.includes('ENCRYPTED'),
  encrypted: privateKey.includes('ENCRYPTED'),
  preview: privateKey.substring(0, 100)
};




