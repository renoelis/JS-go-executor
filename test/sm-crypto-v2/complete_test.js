// SM2/SM3/SM4 完整功能测试
// 使用 sm-crypto-v2 进行国密算法测试

const { sm2, sm3, sm4, kdf } = require('sm-crypto-v2');
const Buffer = require('buffer').Buffer;

// ---------- 小工具 ----------
const toHex = (u8) => Buffer.from(u8).toString('hex');
const fromHex = (hex) => new Uint8Array(Buffer.from(hex, 'hex'));

function eqBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// 测试结果收集
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, testFn) {
  try {
    const result = testFn();
    if (result) {
      results.passed++;
      results.tests.push({ name, status: 'passed' });
    } else {
      results.failed++;
      results.tests.push({ name, status: 'failed', error: 'assertion failed' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

// ---------- 环境探测 ----------
test('BigInt 可用', () => {
  return typeof BigInt(1) === 'bigint';
});

// ---------- SM2：密钥对 ----------
const { publicKey, privateKey } = sm2.generateKeyPairHex();
test('SM2 生成密钥对（hex）', () => {
  return typeof publicKey === 'string' && typeof privateKey === 'string' && publicKey.length > 60;
});

// ---------- SM2：加密/解密 C1C3C2（默认=1） ----------
test('SM2 加/解密 C1C3C2（hex I/O）', () => {
  const msg = 'hello-国密';
  const cipher = sm2.doEncrypt(msg, publicKey, 1, { asn1: false }); // hex
  const plain = sm2.doDecrypt(cipher, privateKey, 1, { asn1: false }); // string
  return plain === msg;
});

// ---------- SM2：加密/解密 C1C2C3（旧布局=0） ----------
test('SM2 加/解密 C1C2C3（hex I/O）', () => {
  const msg = 'legacy-layout';
  const cipher = sm2.doEncrypt(msg, publicKey, 0, { asn1: false });
  const plain = sm2.doDecrypt(cipher, privateKey, 0, { asn1: false });
  return plain === msg;
});

// ---------- SM2：ASN.1 编码开关 ----------
test('SM2 ASN.1 编码密文解密成功', () => {
  const msg = 'asn1-mode';
  const c_asn1 = sm2.doEncrypt(msg, publicKey, 1, { asn1: true });   // ASN.1 编码的密文（通常 hex）
  const p_asn1 = sm2.doDecrypt(c_asn1, privateKey, 1, { asn1: true });
  return p_asn1 === msg;
});

// ---------- SM2：Uint8Array I/O ----------
test('SM2 Uint8Array 输入输出', () => {
  const msgU8 = new Uint8Array(Buffer.from('u8-path', 'utf8'));
  const cipher = sm2.doEncrypt(msgU8, publicKey, 1, { asn1: false }); // 仍返回 hex（库内部会接受 U8）
  const plain = sm2.doDecrypt(cipher, privateKey, 1, { output: 'array', asn1: false }); // 使用 output: 'array'
  return eqBytes(plain, msgU8);
});

// ---------- SM2：签名/验签（DER + SM3 + userId） ----------
test('SM2 签名/验签（DER + hash + userId）', () => {
  const msg = 'sign-message';
  const sig = sm2.doSignature(msg, privateKey, { der: true, hash: true, userId: 'Alice' });
  const ok  = sm2.doVerifySignature(msg, sig, publicKey, { der: true, hash: true, userId: 'Alice' });
  return ok === true;
});

// ---------- SM3：哈希（hex） ----------
test('SM3 哈希一致性', () => {
  const d1 = sm3('abc');
  const d2 = sm3('abc');
  return d1 === d2 && typeof d1 === 'string' && d1.length > 0;
});

// ---------- SM3：HMAC ----------
test('SM3 HMAC（hex 与 U8 密钥一致）', () => {
  const mac1 = sm3('payload', { key: '001122' });        // hex key
  const mac2 = sm3('payload', { key: fromHex('001122') }); // Uint8Array key
  return mac1 === mac2;
});

// ---------- KDF（GM/T 0003） ----------
test('KDF 输出长度=32 字节', () => {
  const out = kdf('shared-secret', 32); // 32 字节
  return typeof out === 'string' ? out.length === 64 : out.byteLength === 32;
});

// ---------- SM4：ECB ----------
test('SM4 ECB 加/解密', () => {
  const key = '0123456789abcdeffedcba9876543210'; // 16字节=128-bit（hex）
  const c = sm4.encrypt('hello-sm4-ecb', key);    // 默认 ECB + PKCS#7
  const p = sm4.decrypt(c, key);
  return p === 'hello-sm4-ecb';
});

// ---------- SM4：CBC（hex I/O） ----------
test('SM4 CBC 加/解密（hex I/O）', () => {
  const key = '00112233445566778899aabbccddeeff';
  const iv  = '0102030405060708090a0b0c0d0e0f10';
  const c = sm4.encrypt('cbc-mode', key, { mode: 'cbc', iv });
  const p = sm4.decrypt(c, key, { mode: 'cbc', iv });
  return p === 'cbc-mode';
});

// ---------- SM4：CTR / CFB / OFB（U8 I/O） ----------
test('SM4 CTR/CFB/OFB（U8 I/O）', () => {
  const key = fromHex('000102030405060708090a0b0c0d0e0f');
  const iv  = fromHex('0f0e0d0c0b0a09080706050403020100');
  
  // 使用 Buffer 代替 TextEncoder（Goja 兼容）
  const msg = new Uint8Array(Buffer.from('stream-modes', 'utf8'));

  const modes = ['ctr', 'cfb', 'ofb'];
  const allPassed = modes.every(mode => {
    const c = sm4.encrypt(msg, key, { mode, iv, output: 'array' });          // Uint8Array
    const p = sm4.decrypt(c,   key, { mode, iv, input: 'array', output: 'array' });
    return eqBytes(p, msg);
  });
  return allPassed;
});

// ---------- SM4：GCM（AEAD，含 AAD + tag） ----------
test('SM4 GCM（含 AAD + tag）', () => {
  const key = '00112233445566778899aabbccddeeff';
  const iv  = 'aabbccddeeff001122334455';
  const aad = fromHex('112233'); // Associated Data
  const { output, tag } = sm4.encrypt('hello-gcm', key, { mode: 'gcm', iv, associatedData: aad, outputTag: true });
  const p = sm4.decrypt(output, key, { mode: 'gcm', iv, associatedData: aad, tag });
  return p === 'hello-gcm';
});

// ---------- 返回测试结果 ----------
return {
  summary: {
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    successRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(2) + '%'
  },
  details: results.tests,
  // 附加信息
  keyPair: {
    publicKey: publicKey.substring(0, 20) + '...',
    privateKey: privateKey.substring(0, 20) + '...'
  }
};

