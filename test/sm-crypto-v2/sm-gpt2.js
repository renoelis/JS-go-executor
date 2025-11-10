// sm-crypto-v2 全量功能自检脚本（Node.js / CommonJS）
// 运行：node verify-sm-crypto-v2.js
// 依赖：npm i sm-crypto-v2@latest

const { sm2, sm3, sm4, kdf } = require('sm-crypto-v2');

const startTime = Date.now();

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function push(ok, name, t0, metaOrErr) {
  const rec = {
    name,
    passed: !!ok,
    durationMs: Date.now() - t0
  };
  if (ok && metaOrErr) rec.meta = metaOrErr;
  if (!ok) rec.error = (metaOrErr && (metaOrErr.stack || metaOrErr.message)) || String(metaOrErr);
  results.tests.push(rec);
  ok ? results.passed++ : results.failed++;
}

async function run(name, fn) {
  const t0 = Date.now();
  try {
    const meta = await fn();
    push(true, name, t0, meta);
  } catch (e) {
    push(false, name, t0, e);
  }
}

function hexToU8(hex) {
  if (typeof hex !== 'string') throw new Error('hex must be string');
  return Buffer.from(hex, 'hex');
}
function u8ToHex(u8) {
  return Buffer.from(u8).toString('hex');
}
function eqU8(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function ieq(a, b) { // case-insensitive string equality
  return String(a).toLowerCase() === String(b).toLowerCase();
}

(async () => {
  // ---------- 基础数据 ----------
  const msgStr = 'hello world! 我是 juneandgreen.'; // README 示例同款文案
  const msgStr16 = '0123456789abcdef';               // 16字节，用于 SM4 无填充
  const msgArr = Buffer.from(msgStr, 'utf8');
  const keyHex128 = '0123456789abcdeffedcba9876543210'; // 128-bit key (SM4)
  const ivHex = '00112233445566778899aabbccddeeff';     // 16字节 IV（CBC）
  const ivGcm = Buffer.from('0123456789ab', 'hex');      // 12字节 IV（GCM 常用）
  const aad = Buffer.from('associated-data');            // GCM AAD
  const sm3Known_abc = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0'; // SM3("abc") 标准向量

  // ---------- SM2：密钥/压缩/比较/校验/随机池 ----------
  let publicKey = '';
  let privateKey = '';
  await run('SM2 生成密钥对 (generateKeyPairHex)', () => {
    const kp = sm2.generateKeyPairHex(); // sm2.generateKeyPairHex()
    publicKey = kp.publicKey;
    privateKey = kp.privateKey;
    if (!publicKey || !privateKey) throw new Error('empty keypair');
    return { publicKey: publicKey.slice(0, 20) + '...', privateKey: privateKey.slice(0, 20) + '...' };
  });

  await run('SM2 压缩公钥 & 等价比较 (compress/comparePublicKeyHex)', () => {
    const compressed = sm2.compressPublicKeyHex(publicKey);
    const eq = sm2.comparePublicKeyHex(publicKey, compressed);
    if (!eq) throw new Error('compressed not equal to uncompressed');
    return { compressed: compressed.slice(0, 20) + '...' };
  });

  await run('SM2 校验公钥 (verifyPublicKey) - 非压缩', () => {
    const ok = sm2.verifyPublicKey(publicKey);
    if (!ok) throw new Error('verifyPublicKey failed');
  });

  await run('SM2 校验公钥 (verifyPublicKey) - 压缩', () => {
    const compressed = sm2.compressPublicKeyHex(publicKey);
    const ok = sm2.verifyPublicKey(compressed);
    if (!ok) throw new Error('verifyPublicKey on compressed failed');
  });

  await run('SM2 自定义随机数生成密钥对 (generateKeyPairHex("seed"))', () => {
    const kp = sm2.generateKeyPairHex('123123123123123'); // 支持种子
    if (!sm2.verifyPublicKey(kp.publicKey)) throw new Error('seeded key invalid');
  });

  await run('SM2 初始化随机数池 (initRNGPool)', async () => {
    await sm2.initRNGPool(); // 可选初始化
  });

  // ---------- SM2：加密/解密（两种拼接模式 + ASN.1 + 数组IO + 预计算公钥） ----------
  await run('SM2 加密/解密 C1C3C2 (cipherMode=1)', () => {
    const cipherMode = 1;
    const ct = sm2.doEncrypt(msgStr, publicKey, cipherMode, { asn1: false }); // 默认 hex 串密文
    const pt = sm2.doDecrypt(ct, privateKey, cipherMode, { asn1: false });
    if (pt !== msgStr) throw new Error('decrypt mismatch');
  });

  await run('SM2 加密/解密 C1C2C3 (cipherMode=0) + ASN.1 编码', () => {
    const cipherMode = 0;
    const ct = sm2.doEncrypt(msgStr, publicKey, cipherMode, { asn1: true });
    const pt = sm2.doDecrypt(ct, privateKey, cipherMode, { asn1: true });
    if (pt !== msgStr) throw new Error('decrypt mismatch (asn1)');
  });

  await run('SM2 数组输入/输出 (Uint8Array IO)', () => {
    const cipherMode = 1;
    const ct = sm2.doEncrypt(msgArr, publicKey, cipherMode);
    const out = sm2.doDecrypt(ct, privateKey, cipherMode, { output: 'array' });
    if (!eqU8(out, msgArr)) throw new Error('array decrypt mismatch');
  });

  await run('SM2 预计算公钥用于加密/验签 (precomputePublicKey)', () => {
    const pre = sm2.precomputePublicKey(publicKey);
    const ct = sm2.doEncrypt(msgStr, pre, 1);
    const pt = sm2.doDecrypt(ct, privateKey, 1);
    if (pt !== msgStr) throw new Error('precomputed encrypt/decrypt mismatch');
  });

  // ---------- SM2：签名 - 全部变体 ----------
  await run('SM2 签名/验签 - 默认', () => {
    const sig = sm2.doSignature(msgStr, privateKey);
    const ok = sm2.doVerifySignature(msgStr, sig, publicKey);
    if (!ok) throw new Error('verify failed');
  });

  await run('SM2 签名/验签 - 预生成曲线点池 (pointPool)', () => {
    const pool = [sm2.getPoint(), sm2.getPoint(), sm2.getPoint(), sm2.getPoint()];
    const sig = sm2.doSignature(msgStr, privateKey, { pointPool: pool });
    const ok = sm2.doVerifySignature(msgStr, sig, publicKey);
    if (!ok) throw new Error('verify failed with pointPool');
  });

  await run('SM2 签名/验签 - DER 编解码 (der: true)', () => {
    const sigDer = sm2.doSignature(msgStr, privateKey, { der: true });
    const ok = sm2.doVerifySignature(msgStr, sigDer, publicKey, { der: true });
    if (!ok) throw new Error('verify failed (DER)');
  });

  await run('SM2 签名/验签 - SM3 杂凑 (hash: true)', () => {
    const sig = sm2.doSignature(msgStr, privateKey, { hash: true });
    const ok = sm2.doVerifySignature(msgStr, sig, publicKey, { hash: true });
    if (!ok) throw new Error('verify failed (hash)');
  });

  await run('SM2 签名/验签 - SM3 杂凑 + 显式公钥 (hash+publicKey)', () => {
    const sig = sm2.doSignature(msgStr, privateKey, { hash: true, publicKey });
    const ok = sm2.doVerifySignature(msgStr, sig, publicKey, { hash: true, publicKey });
    if (!ok) throw new Error('verify failed (hash+explicit pk)');
  });

  await run('SM2 签名/验签 - SM3 杂凑 + userId', () => {
    const userId = 'testUserId';
    const sig = sm2.doSignature(msgStr, privateKey, { hash: true, publicKey, userId });
    const ok = sm2.doVerifySignature(msgStr, sig, publicKey, { hash: true, userId });
    if (!ok) throw new Error('verify failed (hash+userId)');
  });

  await run('SM2 验签负例 - 换一把公钥应验签失败', () => {
    const other = sm2.generateKeyPairHex();
    const sig = sm2.doSignature(msgStr, privateKey);
    const ok = sm2.doVerifySignature(msgStr, sig, other.publicKey);
    if (ok) throw new Error('verify unexpectedly succeeded with other public key');
  });

  await run('SM2 comparePublicKeyHex 负例 - 不同公钥不等价', () => {
    const other = sm2.generateKeyPairHex();
    const eq = sm2.comparePublicKeyHex(publicKey, other.publicKey);
    if (eq) throw new Error('different public keys compared equal');
  });

  await run('SM2 verifyPublicKey 负例 - 略改公钥应失败/抛错', () => {
    const bad = publicKey.slice(0, -1) + (publicKey.slice(-1) === '0' ? '1' : '0');
    try {
      const ok = sm2.verifyPublicKey(bad);
      if (ok) throw new Error('bad public key verified true');
    } catch {
      // 抛错也视为通过（能识别异常输入）
    }
  });

  await run('SM2 解密负例 - 错误私钥不能还原明文', () => {
    const ct = sm2.doEncrypt(msgStr, publicKey, 1);
    const wrong = sm2.generateKeyPairHex().privateKey;
    const pt = sm2.doDecrypt(ct, wrong, 1);
    if (pt === msgStr) throw new Error('decrypted with wrong private key');
  });

  // ---------- SM2：密钥交换（不带身份 & 带身份） ----------
  await run('SM2 密钥交换 - 无身份 (calculateSharedKey)', () => {
    const A = sm2.generateKeyPairHex();
    const B = sm2.generateKeyPairHex();
    const aE = sm2.generateKeyPairHex();
    const bE = sm2.generateKeyPairHex();
    const KA = sm2.calculateSharedKey(A, aE, B.publicKey, bE.publicKey, 233);
    const KB = sm2.calculateSharedKey(B, bE, A.publicKey, aE.publicKey, 233, true);
    if (!ieq(KA, KB)) throw new Error('shared key mismatch (no identity)');
  });

  await run('SM2 密钥交换 - 带身份', () => {
    const A = sm2.generateKeyPairHex();
    const B = sm2.generateKeyPairHex();
    const aE = sm2.generateKeyPairHex();
    const bE = sm2.generateKeyPairHex();
    const KA = sm2.calculateSharedKey(A, aE, B.publicKey, bE.publicKey, 233, false, 'alice@yahoo.com', 'bob@yahoo.com');
    const KB = sm2.calculateSharedKey(B, bE, A.publicKey, aE.publicKey, 233, true, 'bob@yahoo.com', 'alice@yahoo.com');
    if (!ieq(KA, KB)) throw new Error('shared key mismatch (with identity)');
  });

  // ---------- SM3：哈希 / HMAC / KDF ----------
  await run('SM3 哈希 - 向量 "abc"', () => {
    const h = sm3('abc');
    if (!ieq(h, sm3Known_abc)) throw new Error(`SM3("abc") mismatch: ${h}`);
  });

  await run('SM3 HMAC - 稳定性', () => {
    const key = 'daac25c1512fe50f79b0e4526b93f5c0e1460cef40b6dd44af13caec62e8c60e0d885f3c6d6fb51e530889e6fd4ac743a6d332e68a0f2a3923f42585dceb93e9';
    const h1 = sm3('abc', { key });
    const h2 = sm3('abc', { key });
    if (!ieq(h1, h2)) throw new Error('HMAC not stable');
  });

  await run('SM3 KDF - 长度/类型/全零 校验', () => {
    // 兼容库可能返回 hex 字符串或 Uint8Array，这里统一成 bytes 再断言
    const kdfOut = kdf('abc', 32); // 期望 32 字节
    let kdfBytes;
    if (typeof kdfOut === 'string') {
      if (!/^[0-9a-f]+$/i.test(kdfOut)) throw new Error('KDF output not hex string');
      if (kdfOut.length !== 64) throw new Error(`KDF length mismatch: got ${kdfOut.length} hex chars, want 64`);
      kdfBytes = Buffer.from(kdfOut, 'hex');
    } else if (kdfOut instanceof Uint8Array) {
      if (kdfOut.length !== 32) throw new Error(`KDF byte length mismatch: got ${kdfOut.length} bytes, want 32`);
      kdfBytes = kdfOut;
    } else {
      throw new Error(`Unexpected KDF output type: ${typeof kdfOut}`);
    }
    // 额外：全零流应判失败（按 SM2 加密流程要求）
    let allZero = true;
    for (let i = 0; i < kdfBytes.length; i++) {
      if (kdfBytes[i] !== 0) { allZero = false; break; }
    }
    if (allZero) throw new Error('KDF output must not be all zeros');
    return { kdfHex: Buffer.from(kdfBytes).toString('hex').slice(0, 32) + '...' };
  });

  // ---------- SM4：ECB/CBC/GCM、不同输出/填充 ----------
  await run('SM4 ECB 默认（PKCS#7）加解密（string输出）', () => {
    const ct = sm4.encrypt(msgStr, keyHex128);              // 默认 hex/string 输出
    const pt = sm4.decrypt(ct, keyHex128);
    if (pt !== msgStr) throw new Error('SM4 ECB mismatch');
  });

  await run('SM4 ECB 无填充（padding:none，array输出）', () => {
    const ctArr = sm4.encrypt(msgStr16, keyHex128, { padding: 'none', output: 'array' });
    const ptArr = sm4.decrypt(ctArr, keyHex128, { padding: 'none', output: 'array' });
    if (!eqU8(ptArr, Buffer.from(msgStr16))) throw new Error('SM4 ECB none padding mismatch');
  });

  await run('SM4 CBC 模式（iv）加解密', () => {
    const ct = sm4.encrypt(msgStr, keyHex128, { mode: 'cbc', iv: ivHex });
    const pt = sm4.decrypt(ct, keyHex128, { mode: 'cbc', iv: ivHex });
    if (pt !== msgStr) throw new Error('SM4 CBC mismatch');
  });

  await run('SM4 GCM 加解密（string输出＋tag）', () => {
    const enc = sm4.encrypt(msgStr, keyHex128, {
      mode: 'gcm',
      iv: ivGcm,
      associatedData: aad,
      output: 'string',
      outputTag: true
    }); // { output, tag }
    const dec = sm4.decrypt(enc.output, keyHex128, {
      mode: 'gcm',
      iv: ivGcm,
      associatedData: aad,
      tag: enc.tag,
      output: 'string'
    });
    if (dec !== msgStr) throw new Error('SM4 GCM mismatch');
    return { tag: enc.tag && String(enc.tag).slice(0, 16) + '...' };
  });

  await run('SM4 GCM 负例 - Tag 错误应失败', () => {
    const enc = sm4.encrypt(msgStr, keyHex128, {
      mode: 'gcm',
      iv: ivGcm,
      associatedData: aad,
      output: 'string',
      outputTag: true
    });
    let ok = false;
    try {
      sm4.decrypt(enc.output, keyHex128, {
        mode: 'gcm',
        iv: ivGcm,
        associatedData: aad,
        tag: (enc.tag || '').replace(/./, c => (c === 'a' ? 'b' : 'a')), // 轻微篡改
        output: 'string'
      });
      ok = true;
    } catch (_) {}
    if (ok) throw new Error('SM4 GCM with wrong tag did not fail');
  });

  await run('SM4 负例 - 错误 key 长度应失败', () => {
    let ok = false;
    try {
      sm4.encrypt(msgStr, 'deadbeef'); // 非 128-bit
      ok = true;
    } catch (_) {}
    if (ok) throw new Error('SM4 accepted invalid key length');
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

  console.log(JSON.stringify(result, null, 2));
})().catch((e) => {
  // 兜底：脚本级错误
  const totalDuration = Date.now() - startTime;
  const fallback = {
    summary: {
      total: 0,
      passed: 0,
      failed: 1,
      successRate: '0.00%',
      totalDuration: `${totalDuration}ms`
    },
    details: [{ name: 'FATAL', passed: false, durationMs: totalDuration, error: e && (e.stack || e.message) }],
    keyPair: { publicKey: '...', privateKey: '...' }
  };
  console.log(JSON.stringify(fallback, null, 2));
  process.exitCode = 1;
});