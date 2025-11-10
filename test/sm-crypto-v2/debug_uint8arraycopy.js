// 调试 SM2 Uint8Array I/O
const { sm2 } = require('sm-crypto-v2');
const Buffer = require('buffer').Buffer;

function eqBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// 生成密钥对
const { publicKey, privateKey } = sm2.generateKeyPairHex();

// 准备测试数据
const msgU8 = new Uint8Array(Buffer.from('u8-path', 'utf8'));

// 加密
const cipher = sm2.doEncrypt(msgU8, publicKey, 1, { asn1: false });

// 解密 - 尝试不同的配置
const plain1 = sm2.doDecrypt(cipher, privateKey, 1, { asn1: false, inputEncoding: 'hex', outputEncoding: 'array' });
const plain2 = sm2.doDecrypt(cipher, privateKey, 1, { asn1: false });
const plain3 = sm2.doDecrypt(cipher, privateKey, 1);

const result = {
  original: {
    type: Object.prototype.toString.call(msgU8),
    length: msgU8.length,
    value: Array.from(msgU8),
    asString: Buffer.from(msgU8).toString('utf8')
  },
  cipher: {
    type: typeof cipher,
    length: cipher ? cipher.length : 0,
    preview: cipher ? cipher.substring(0, 40) + '...' : null
  },
  plain1_withOptions: {
    type: Object.prototype.toString.call(plain1),
    value: plain1,
    isArray: Array.isArray(plain1),
    isUint8Array: plain1 instanceof Uint8Array,
    length: plain1 ? plain1.length : 0,
    firstBytes: plain1 ? Array.from(plain1).slice(0, 10) : null,
    asString: plain1 ? (typeof plain1 === 'string' ? plain1 : Buffer.from(plain1).toString('utf8')) : null,
    equals: plain1 ? eqBytes(plain1, msgU8) : false
  },
  plain2_noOutputEncoding: {
    type: typeof plain2,
    value: typeof plain2 === 'string' ? plain2 : 'not a string',
    length: plain2 ? plain2.length : 0
  },
  plain3_minimal: {
    type: typeof plain3,
    value: typeof plain3 === 'string' ? plain3 : 'not a string',
    length: plain3 ? plain3.length : 0
  },
  test: {
    bytesEqual: plain1 ? eqBytes(plain1, msgU8) : false,
    plain1IsTruthy: !!plain1,
    msgU8IsTruthy: !!msgU8
  }
};

console.log(result);
