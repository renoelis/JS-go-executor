const smCrypto = require('sm-crypto-v2');

// SM2 加密/解密测试 - 现在使用 CSPRNG 生成密钥
const sm2 = smCrypto.sm2;
const keypair = sm2.generateKeyPairHex();

// SM3 哈希测试
const sm3 = smCrypto.sm3;
const hash = sm3('hello world');

// SM4 加密/解密测试
const sm4 = smCrypto.sm4;
const encrypted = sm4.encrypt('plaintext', '0123456789abcdeffedcba9876543210');

// 返回测试结果
return  {
  success: true,
  message: "sm-crypto 国密算法模块测试成功（使用 Go crypto/rand CSPRNG）",
  results: {
    sm2: {
      publicKey: keypair.publicKey.substring(0, 20) + "...",
      privateKey: keypair.privateKey.substring(0, 20) + "...",
      keyLength: {
        public: keypair.publicKey.length,
        private: keypair.privateKey.length
      }
    },
    sm3: {
      input: "hello world",
      hash: hash,
      hashLength: hash.length
    },
    sm4: {
      plaintext: "plaintext",
      encrypted: encrypted,
      encryptedLength: encrypted.length
    }
  },
  security: "使用 Go crypto/rand 密码学安全随机数生成器",
  timestamp: new Date().toISOString()
};