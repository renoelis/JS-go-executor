const { sm2, sm3, sm4, kdf } = require('sm-crypto-v2');

// ---------- 小工具 ----------
const toHex = (u8) => Buffer.from(u8).toString('hex');
const fromHex = (hex) => new Uint8Array(Buffer.from(hex, 'hex'));
const enc = (s) => new TextEncoder().encode(s); // Node 18+ 原生；若旧版可用 Buffer.from

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.error(`❌ ${name}`); }
}
function eqBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ---------- 环境探测 ----------
console.log('Node:', process.version, '| BigInt:', typeof BigInt(1));
check('BigInt 可用', typeof BigInt(1) === 'bigint');

// ---------- SM2：密钥对 ----------
const { publicKey, privateKey } = sm2.generateKeyPairHex();
check('SM2 生成密钥对（hex）', typeof publicKey === 'string' && typeof privateKey === 'string' && publicKey.length > 60);

// ---------- SM2：加密/解密 C1C3C2（默认=1） ----------
{
  const msg = 'hello-国密';
  const cipher = sm2.doEncrypt(msg, publicKey, 1, { asn1: false }); // hex
  const plain = sm2.doDecrypt(cipher, privateKey, 1, { asn1: false }); // string
  check('SM2 加/解密 C1C3C2（hex I/O）', plain === msg);
}

// ---------- SM2：加密/解密 C1C2C3（旧布局=0） ----------
{
  const msg = 'legacy-layout';
  const cipher = sm2.doEncrypt(msg, publicKey, 0, { asn1: false });
  const plain = sm2.doDecrypt(cipher, privateKey, 0, { asn1: false });
  check('SM2 加/解密 C1C2C3（hex I/O）', plain === msg);
}

// ---------- SM2：ASN.1 编码开关 ----------
{
  const msg = 'asn1-mode';
  const c_asn1 = sm2.doEncrypt(msg, publicKey, 1, { asn1: true });   // ASN.1 编码的密文（通常 hex）
  const p_asn1 = sm2.doDecrypt(c_asn1, privateKey, 1, { asn1: true });
  check('SM2 ASN.1 编码密文解密成功', p_asn1 === msg);
}

// ---------- SM2：Uint8Array I/O ----------
{
    const msgU8 = new Uint8Array(Buffer.from('u8-path', 'utf8'));
    const cipher = sm2.doEncrypt(msgU8, publicKey, 1, { asn1: false }); // 仍返回 hex（库内部会接受 U8）
    const plain = sm2.doDecrypt(cipher, privateKey, 1, { output: 'array', asn1: false }); // 使用 output: 'array'
   check('SM2 Uint8Array 输入输出', eqBytes(plain, msgU8));
}

// ---------- SM2：签名/验签（DER + SM3 + userId） ----------
{
  const msg = 'sign-message';
  const sig = sm2.doSignature(msg, privateKey, { der: true, hash: true, userId: 'Alice' });
  const ok  = sm2.doVerifySignature(msg, sig, publicKey, { der: true, hash: true, userId: 'Alice' });
  check('SM2 签名/验签（DER + hash + userId）', ok === true);
}

// ---------- SM3：哈希（hex） ----------
{
  const d1 = sm3('abc');
  const d2 = sm3('abc');
  check('SM3 哈希一致性', d1 === d2 && typeof d1 === 'string' && d1.length > 0);
}

// ---------- SM3：HMAC ----------
{
  const mac1 = sm3('payload', { key: '001122' });        // hex key
  const mac2 = sm3('payload', { key: fromHex('001122') }); // Uint8Array key
  check('SM3 HMAC（hex 与 U8 密钥一致）', mac1 === mac2);
}

// ---------- KDF（GM/T 0003） ----------
{
  const out = kdf('shared-secret', 32); // 32 字节
  check('KDF 输出长度=32 字节', typeof out === 'string' ? out.length === 64 : out.byteLength === 32);
}

// ---------- SM4：ECB ----------
{
  const key = '0123456789abcdeffedcba9876543210'; // 16字节=128-bit（hex）
  const c = sm4.encrypt('hello-sm4-ecb', key);    // 默认 ECB + PKCS#7
  const p = sm4.decrypt(c, key);
  check('SM4 ECB 加/解密', p === 'hello-sm4-ecb');
}

// ---------- SM4：CBC（hex I/O） ----------
{
  const key = '00112233445566778899aabbccddeeff';
  const iv  = '0102030405060708090a0b0c0d0e0f10';
  const c = sm4.encrypt('cbc-mode', key, { mode: 'cbc', iv });
  const p = sm4.decrypt(c, key, { mode: 'cbc', iv });
  check('SM4 CBC 加/解密（hex I/O）', p === 'cbc-mode');
}

// ---------- SM4：CTR / CFB / OFB（U8 I/O） ----------
{
  const key = fromHex('000102030405060708090a0b0c0d0e0f');
  const iv  = fromHex('0f0e0d0c0b0a09080706050403020100');
  const msg = enc('stream-modes');

  const modes = ['ctr', 'cfb', 'ofb'];
  const results = modes.map(mode => {
    const c = sm4.encrypt(msg, key, { mode, iv, output: 'array' });          // Uint8Array
    const p = sm4.decrypt(c,   key, { mode, iv, input: 'array', output: 'array' });
    return eqBytes(p, msg);
  });
  check('SM4 CTR/CFB/OFB（U8 I/O）', results.every(Boolean));
}

// ---------- SM4：GCM（AEAD，含 AAD + tag） ----------
{
  const key = '00112233445566778899aabbccddeeff';
  const iv  = 'aabbccddeeff001122334455';
  const aad = fromHex('112233'); // Associated Data
  const { output, tag } = sm4.encrypt('hello-gcm', key, { mode: 'gcm', iv, associatedData: aad, outputTag: true });
  const p = sm4.decrypt(output, key, { mode: 'gcm', iv, associatedData: aad, tag });
  check('SM4 GCM（含 AAD + tag）', p === 'hello-gcm');
}

// ---------- 汇总 ----------
console.log('----');
console.log(`通过: ${pass}, 失败: ${fail}`);
if (fail > 0) process.exitCode = 1;