// SM2/SM3/SM4 无死角功能验证（基于 sm-crypto-v2）
// 兼容 Node / Goja，纯同步实现（除可选 RNG 测试外）
// ----------------------------------------------------

const startTime = Date.now();
const { sm2, sm3, sm4, kdf } = require('sm-crypto-v2');
const Buffer = require('buffer').Buffer;

// ---------- 小工具 ----------
const toHex   = (u8) => Buffer.from(u8).toString('hex');
const fromHex = (hex) => new Uint8Array(Buffer.from(hex, 'hex'));
const eqBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const cloneU8 = (u8) => new Uint8Array(u8); // 保护原密文
const mutate  = (u8) => { const x = cloneU8(u8); x[0] ^= 1; return x; };

const results = { passed: 0, failed: 0, tests: [] };
function test(name, fn) {
  const t0 = Date.now();
  try {
    const ok = fn();
    const dt = `${Date.now() - t0}ms`;
    if (ok) results.tests.push({ name, status: 'passed', duration: dt }), results.passed++;
    else    results.tests.push({ name, status: 'failed', duration: dt, error: 'assertion failed' }), results.failed++;
  } catch (e) {
    results.tests.push({ name, status: 'failed', duration: `${Date.now() - t0}ms`, error: e && e.message || String(e) });
    results.failed++;
  }
}
const expectThrow = (fn) => { try { fn(); return false; } catch { return true; } };

// ---------- 环境探测 ----------
test('BigInt 可用', () => typeof BigInt(1) === 'bigint');

// ---------- SM2：密钥对 ----------
const { publicKey, privateKey } = sm2.generateKeyPairHex();
test('SM2 生成密钥对（hex）', () =>
  typeof publicKey === 'string' && typeof privateKey === 'string' && publicKey.length > 60);

// 新增：可复现密钥（种子）
test('SM2 生成密钥对（同种子可复现）', () => {
  const a = sm2.generateKeyPairHex('seed-abc');
  const b = sm2.generateKeyPairHex('seed-abc');
  return a.publicKey === b.publicKey && a.privateKey === b.privateKey;
});

// 新增：公钥压缩/等价 & 校验
test('SM2 公钥压缩/等价与校验', () => {
  const comp = sm2.compressPublicKeyHex(publicKey);
  return sm2.comparePublicKeyHex(publicKey, comp)
      && sm2.verifyPublicKey(publicKey)
      && sm2.verifyPublicKey(comp);
});

// 新增：预计算公钥（加密/验签可用）
test('SM2 预计算公钥用于加密/验签', () => {
  const pre = sm2.precomputePublicKey(publicKey);
  const msg = 'precompute-ok';
  const c   = sm2.doEncrypt(msg, pre, 1, { asn1: false });
  const p   = sm2.doDecrypt(c, privateKey, 1, { asn1: false });
  const sig = sm2.doSignature(msg, privateKey, { hash: true });
  const ok  = sm2.doVerifySignature(msg, sig, pre, { hash: true });
  return p === msg && ok === true;
});

// ---------- SM2：加密/解密 ----------
test('SM2 加/解密 C1C3C2（hex I/O）', () => {
  const msg = 'hello-国密';
  const c = sm2.doEncrypt(msg, publicKey, 1, { asn1: false });
  const p = sm2.doDecrypt(c, privateKey, 1, { asn1: false });
  return p === msg;
});

test('SM2 加/解密 C1C2C3（hex I/O）', () => {
  const msg = 'legacy-layout';
  const c = sm2.doEncrypt(msg, publicKey, 0, { asn1: false });
  const p = sm2.doDecrypt(c, privateKey, 0, { asn1: false });
  return p === msg;
});

test('SM2 ASN.1 编码密文解密成功', () => {
  const msg = 'asn1-mode';
  const c = sm2.doEncrypt(msg, publicKey, 1, { asn1: true });
  const p = sm2.doDecrypt(c, privateKey, 1, { asn1: true });
  return p === msg;
});

test('SM2 Uint8Array 输入/输出', () => {
  const msgU8 = new Uint8Array(Buffer.from('u8-path', 'utf8'));
  const c = sm2.doEncrypt(msgU8, publicKey, 1, { asn1: false });
  const p = sm2.doDecrypt(c, privateKey, 1, { asn1: false, output: 'array' });
  return eqBytes(p, msgU8);
});

// 新增：布局不匹配应失败（抛错或明文不一致）
test('SM2 解密布局不匹配会失败', () => {
  const msg = 'layout-mismatch';
  const c = sm2.doEncrypt(msg, publicKey, 1, { asn1: false });
  const ok = expectThrow(() => sm2.doDecrypt(c, privateKey, 0, { asn1: false }));
  return ok || (sm2.doDecrypt(c, privateKey, 0, { asn1: false }) !== msg);
});

// ---------- SM2：签名/验签 ----------
test('SM2 纯签名/验签（无 hash/der）', () => {
  const msg = 'pure-sign';
  const sig = sm2.doSignature(msg, privateKey);
  return sm2.doVerifySignature(msg, sig, publicKey) === true;
});

test('SM2 只 DER（无 hash）', () => {
  const msg = 'der-only';
  const sig = sm2.doSignature(msg, privateKey, { der: true });
  return sm2.doVerifySignature(msg, sig, publicKey, { der: true }) === true;
});

test('SM2 签名/验签（hash + publicKey 优化）', () => {
  const msg = 'hash-with-pk';
  const sig = sm2.doSignature(msg, privateKey, { hash: true, publicKey });
  return sm2.doVerifySignature(msg, sig, publicKey, { hash: true, publicKey }) === true;
});

test('SM2 签名/验签（DER + hash + userId）', () => {
  const msg = 'sign-message';
  const sig = sm2.doSignature(msg, privateKey, { der: true, hash: true, userId: 'Alice' });
  return sm2.doVerifySignature(msg, sig, publicKey, { der: true, hash: true, userId: 'Alice' }) === true;
});

// 新增：pointPool 加速（可验即可）
test('SM2 签名 pointPool（可验）', () => {
  const pool = [sm2.getPoint(), sm2.getPoint(), sm2.getPoint(), sm2.getPoint()];
  const msg = 'point-pool';
  const sig = sm2.doSignature(msg, privateKey, { pointPool: pool });
  return sm2.doVerifySignature(msg, sig, publicKey) === true;
});

// 新增：负例（消息被改应验签失败）
test('SM2 验签失败用例（消息被改）', () => {
  const msg = 'abc123';
  const sig = sm2.doSignature(msg, privateKey, { hash: true });
  return sm2.doVerifySignature(msg + 'x', sig, publicKey, { hash: true }) === false;
});

// ---------- 新增：SM2 密钥交换 ----------
test('SM2 密钥交换（无身份）', () => {
  const A = sm2.generateKeyPairHex();
  const B = sm2.generateKeyPairHex();
  const aE = sm2.generateKeyPairHex();
  const bE = sm2.generateKeyPairHex();
  const ka = sm2.calculateSharedKey(A, aE, B.publicKey, bE.publicKey, 32);
  const kb = sm2.calculateSharedKey(B, bE, A.publicKey, aE.publicKey, 32, true);
  return typeof ka === 'string' && typeof kb === 'string' && ka.length % 2 === 0 && ka === kb;
});

test('SM2 密钥交换（带身份）', () => {
  const A = sm2.generateKeyPairHex();
  const B = sm2.generateKeyPairHex();
  const aE = sm2.generateKeyPairHex();
  const bE = sm2.generateKeyPairHex();
  const ka = sm2.calculateSharedKey(A, aE, B.publicKey, bE.publicKey, 16, false, 'alice', 'bob');
  const kb = sm2.calculateSharedKey(B, bE, A.publicKey, aE.publicKey, 16, true, 'bob', 'alice');
  return typeof ka === 'string' && ka === kb;
});

// ---------- SM3 / KDF ----------
test('SM3 哈希一致性', () => sm3('abc') === sm3('abc'));
test('SM3 HMAC（hex 与 U8 密钥一致）', () => {
  const mac1 = sm3('payload', { key: '001122' });
  const mac2 = sm3('payload', { key: fromHex('001122') });
  return mac1 === mac2;
});
test('SM3 HMAC 负例（不同密钥不等）', () => {
  const mac1 = sm3('payload', { key: '001122' });
  const mac2 = sm3('payload', { key: '001123' });
  return mac1 !== mac2;
});
test('KDF 输出长度=32 字节', () => {
  const out = kdf('shared-secret', 32);
  return typeof out === 'string' ? out.length === 64 : out.byteLength === 32;
});

// ---------- SM4 ----------
test('SM4 ECB 加/解密（PKCS#7）', () => {
  const key = '0123456789abcdeffedcba9876543210';
  const c = sm4.encrypt('hello-sm4-ecb', key);
  const p = sm4.decrypt(c, key);
  return p === 'hello-sm4-ecb';
});

// 新增：ECB 不填充（padding: none，16 字节整块）
test('SM4 ECB 不填充（padding:none）', () => {
  const key = '0123456789abcdeffedcba9876543210';
  const msg = '1234567890abcdef'; // 16 字节
  const c = sm4.encrypt(msg, key, { padding: 'none' });
  const p = sm4.decrypt(c, key, { padding: 'none' });
  return p === msg;
});

test('SM4 CBC 加/解密（hex I/O）', () => {
  const key = '00112233445566778899aabbccddeeff';
  const iv  = '0102030405060708090a0b0c0d0e0f10';
  const c = sm4.encrypt('cbc-mode', key, { mode: 'cbc', iv });
  const p = sm4.decrypt(c, key, { mode: 'cbc', iv });
  return p === 'cbc-mode';
});

// 新增：CBC 错误 IV 长度应报错
test('SM4 CBC 错误 IV 长度抛错', () => {
  const key = '00112233445566778899aabbccddeeff';
  const bad = '01020304';
  return expectThrow(() => sm4.encrypt('x'.repeat(16), key, { mode: 'cbc', iv: bad }));
});

test('SM4 CTR/CFB/OFB（U8 I/O）', () => {
  const key = fromHex('000102030405060708090a0b0c0d0e0f');
  const iv  = fromHex('0f0e0d0c0b0a09080706050403020100');
  const msg = new Uint8Array(Buffer.from('stream-modes', 'utf8'));
  return ['ctr','cfb','ofb'].every(mode => {
    const c = sm4.encrypt(msg, key, { mode, iv, output: 'array' });
    const p = sm4.decrypt(c,   key, { mode, iv, input: 'array', output: 'array' });
    return eqBytes(p, msg);
  });
});

test('SM4 GCM（含 AAD + tag，U8 输出）', () => {
  const key = '00112233445566778899aabbccddeeff';
  const iv  = 'aabbccddeeff001122334455';
  const aad = fromHex('112233');
  const msg = new Uint8Array(Buffer.from('hello-gcm-u8', 'utf8'));
  const { output, tag } = sm4.encrypt(msg, key, { mode: 'gcm', iv, associatedData: aad, outputTag: true, output: 'array' });
  const p = sm4.decrypt(output, key, { mode: 'gcm', iv, associatedData: aad, tag, input: 'array', output: 'array' });
  return eqBytes(p, msg);
});

// 新增：GCM 认证失败应抛错
test('SM4 GCM 认证失败抛错', () => {
  const key = '00112233445566778899aabbccddeeff';
  const iv  = 'aabbccddeeff001122334455';
  const aad = fromHex('112233');
  const { output, tag } = sm4.encrypt('tamper', key, { mode: 'gcm', iv, associatedData: aad, outputTag: true, output: 'array' });
  return expectThrow(() => sm4.decrypt(mutate(output), key, { mode: 'gcm', iv, associatedData: aad, tag, input: 'array' }));
});

// 新增：GCM 不返回 tag（outputTag:false）
test('SM4 GCM（不返回 tag）', () => {
  const key = '00112233445566778899aabbccddeeff';
  const iv  = 'aabbccddeeff001122334455';
  const res = sm4.encrypt('no-tag', key, { mode: 'gcm', iv, outputTag: false });
  return typeof res === 'object' && typeof res.output === 'string' && res.tag === undefined;
});

// ---------- 汇总 ----------
const totalDuration = Date.now() - startTime;
const result = {
  summary: {
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    successRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(2) + '%',
    totalDuration: `${totalDuration}ms`
  },
  details: results.tests,
  keyPair: { publicKey: publicKey.slice(0, 20) + '...', privateKey: privateKey.slice(0, 20) + '...' }
};

console.log(result);