// verify-sm-crypto-v2.js
// Node >= 18 recommended.
// 覆盖点：sm2(密钥/压缩/比较/校验/预计算/加解密[C1C3C2&C1C2C3, ASN1, 输入输出变体]/签名验签[der/hash/pointPool/userId/publicKey]/密钥交换[含身份/不含身份])
//       sm3(哈希/HMAC/KDF)，sm4(ECB/CBC/GCM，padding=pkcs7/none，输出string/array)
//
// 参考：README API（功能清单与用法）、SM3 & SM4-GCM 标准向量
// README: https://github.com/Cubelrti/sm-crypto-v2
// SM3('abc') = 66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0
// SM4-GCM 向量（IETF draft-yang-tls-tls13-sm-suites-06 A.1）
;(async () => {
const { sm2, sm3, kdf, sm4 } = require('sm-crypto-v2');

const startTime = Date.now();
const results = { passed: 0, failed: 0, tests: [] };

function toHex(u8) {
  if (typeof u8 === 'string') return u8.toLowerCase();
  return Buffer.from(u8).toString('hex').toLowerCase();
}
function fromHex(hex) {
  return new Uint8Array(Buffer.from(hex.replace(/\s+/g, ''), 'hex'));
}
function toU8(input) {
  if (input instanceof Uint8Array) return input;
  if (typeof input === 'string') return new TextEncoder().encode(input);
  return new Uint8Array(input);
}
function assert(cond, msg, extra = {}) {
  if (!cond) {
    const e = new Error(msg);
    Object.assign(e, extra);
    throw e;
  }
}
async function run(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    const d = Date.now() - t0;
    results.passed++;
    results.tests.push({ name, status: 'passed', duration: `${d}ms`, detail });
  } catch (err) {
    const d = Date.now() - t0;
    results.failed++;
    results.tests.push({
      name,
      status: 'failed',
      duration: `${d}ms`,
      error: (err && (err.stack || err.message)) || String(err)
    });
  }
}

// ======== sm2: keypair / compress / compare / verify / RNG pool ========
let publicKey, privateKey; // 供汇总截断展示
await run('sm2.generateKeyPairHex()', async () => {
  const kp = sm2.generateKeyPairHex();
  assert(kp.publicKey && kp.privateKey, 'Keypair empty');
  publicKey = kp.publicKey;
  privateKey = kp.privateKey;

  // 自定义随机种子（仅测试，不建议生产）
  const kp2 = sm2.generateKeyPairHex('123123123123123');
  assert(kp2.publicKey && kp2.privateKey, 'Keypair with seed failed');

  // RNG 池初始化
  if (sm2.initRNGPool) {
    await sm2.initRNGPool();
  }

  return {
    publicKey: publicKey.slice(0, 20) + '...',
    privateKey: privateKey.slice(0, 20) + '...'
  };
});

await run('sm2.compressPublicKeyHex / comparePublicKeyHex / verifyPublicKey', async () => {
    const comp = sm2.compressPublicKeyHex(publicKey);
    // 正例：等价 & 可验证（无压缩和压缩两种格式）
    assert(sm2.comparePublicKeyHex(publicKey, comp), 'comparePublicKeyHex mismatch');
    assert(sm2.verifyPublicKey(publicKey) === true, 'verifyPublicKey(uncompressed) failed');
    assert(sm2.verifyPublicKey(comp) === true, 'verifyPublicKey(compressed) failed');
  
    // 负例：篡改 1 个 nibble；库可能抛错或返回 false —— 两种都算“识别为非法”
    const badPub = publicKey.slice(0, -1) + (publicKey.slice(-1) === 'a' ? 'b' : 'a');
    let negOK = false;
    try {
      const r = sm2.verifyPublicKey(badPub);
      negOK = (r === false);
    } catch {
      negOK = true; // 抛错也视为识别非法点 → 通过
    }
    assert(negOK, 'verifyPublicKey should fail or throw on bad key');
  
    return { compressedPrefix: comp.slice(0, 20) + '...' };
  });

// ======== sm2: encryption/decryption C1C3C2 & C1C2C3 + ASN.1 + I/O 变体 ========
await run('sm2.doEncrypt/doDecrypt (C1C3C2 string, asn1=false)', async () => {
  const msg = 'hello sm2: 中国标准';
  const cipherMode = 1; // C1C3C2
  const enc = sm2.doEncrypt(msg, publicKey, cipherMode, { asn1: false });
  const dec = sm2.doDecrypt(enc, privateKey, cipherMode, { asn1: false });
  assert(dec === msg, 'sm2 decrypt mismatch');
  return { cipherPrefix: String(enc).slice(0, 20) + '...' };
});

await run('sm2.doEncrypt/doDecrypt (C1C2C3 array I/O, asn1=true)', async () => {
  const msgU8 = toU8('array-input-测试');
  const cipherMode = 0; // C1C2C3
  const enc = sm2.doEncrypt(msgU8, publicKey, cipherMode, { asn1: true });
  const dec = sm2.doDecrypt(enc, privateKey, cipherMode, { asn1: true, output: 'array' });
  assert(toHex(dec) === toHex(msgU8), 'sm2 decrypt (array) mismatch');
  return { ctLen: (typeof enc === 'string' ? enc.length : enc.byteLength) };
});

// 预计算公钥用于加密/验签
await run('sm2.precomputePublicKey for encrypt/verify', async () => {
  const pre = sm2.precomputePublicKey(publicKey);
  const msg = 'precompute test';
  const sig = sm2.doSignature(msg, privateKey, { hash: true });
  const ok = sm2.doVerifySignature(msg, sig, pre, { hash: true });
  assert(ok, 'verify with precomputed public key failed');

  const enc = sm2.doEncrypt(msg, pre, 1);
  const dec = sm2.doDecrypt(enc, privateKey, 1);
  assert(dec === msg, 'decrypt with precomputed public key failed');
  
  // 尝试多种方式获取 Point 对象的可读表示
  let preStr = '';
  
  // 方法1: 检查是否有 toHex 方法
  if (typeof pre.toHex === 'function') {
    preStr = '<Point ' + pre.toHex().slice(0, 16);
  }
  // 方法2: 检查 toString 并验证返回值是否有效
  else if (typeof pre.toString === 'function') {
    const str = pre.toString();
    if (str && !str.startsWith('[object')) {
      preStr = str;
    }
  }
  // 方法3: 尝试访问坐标属性
  if (!preStr && pre.x && pre.y) {
    preStr = `<Point x=${String(pre.x).slice(0, 10)}... y=${String(pre.y).slice(0, 10)}...>`;
  }
  // 方法4: 尝试直接访问内部属性或使用对象键
  if (!preStr) {
    try {
      const keys = Object.keys(pre);
      if (keys.length > 0) {
        preStr = `<Point keys=[${keys.slice(0, 3).join(',')}]>`;
      } else {
        preStr = '<Point (precomputed)>';
      }
    } catch {
      preStr = '<Point (precomputed)>';
    }
  }
  
  return { precomputedPrefix: preStr.slice(0, 30) + '...' };
});

// ======== sm2: signature / verify in all combos ========
await run('sm2.doSignature/doVerifySignature (pure)', async () => {
  const msg = 'sign-me';
  const sig = sm2.doSignature(msg, privateKey);
  assert(sm2.doVerifySignature(msg, sig, publicKey), 'verify failed');

  // 负例：消息不同
  assert(!sm2.doVerifySignature(msg + 'x', sig, publicKey), 'verify should fail on different msg');
  return { sigPrefix: sig.slice(0, 20) + '...' };
});

await run('sm2 signature with pointPool', async () => {
  const pool = [sm2.getPoint(), sm2.getPoint(), sm2.getPoint(), sm2.getPoint()];
  const msg = 'pointPool';
  const sig = sm2.doSignature(msg, privateKey, { pointPool: pool });
  assert(sm2.doVerifySignature(msg, sig, publicKey), 'verify(pointPool) failed');
  return { poolSize: pool.length };
});

await run('sm2 signature with DER encode/decode', async () => {
  const msg = 'der-encoding';
  const sig = sm2.doSignature(msg, privateKey, { der: true });
  assert(sm2.doVerifySignature(msg, sig, publicKey, { der: true }), 'verify(der) failed');
  return { sigDERPrefix: sig.slice(0, 20) + '...' };
});

await run('sm2 signature with SM3 hash', async () => {
  const msg = 'hash=true';
  const sig = sm2.doSignature(msg, privateKey, { hash: true });
  assert(sm2.doVerifySignature(msg, sig, publicKey, { hash: true }), 'verify(hash) failed');
  return { sigPrefix: sig.slice(0, 20) + '...' };
});

await run('sm2 signature with SM3 hash + publicKey shortcut', async () => {
  const msg = 'hash+pk';
  const sig = sm2.doSignature(msg, privateKey, { hash: true, publicKey });
  assert(sm2.doVerifySignature(msg, sig, publicKey, { hash: true, publicKey }), 'verify(hash+pk) failed');
  return { ok: true };
});

await run('sm2 signature with userId (Z) parameter', async () => {
  const msg = 'userId=alice';
  const userId = 'testUserId';
  const sig = sm2.doSignature(msg, privateKey, { hash: true, publicKey, userId });
  assert(sm2.doVerifySignature(msg, sig, publicKey, { hash: true, userId }), 'verify(userId) failed');

  // 负例：不同 userId 验证应失败
  assert(!sm2.doVerifySignature(msg, sig, publicKey, { hash: true, userId: 'wrongId' }), 'verify should fail on wrong userId');
  return { userId };
});

// ======== sm2: key exchange (含身份 / 不含身份) ========
await run('sm2.calculateSharedKey (no identity)', async () => {
  const A = sm2.generateKeyPairHex();
  const B = sm2.generateKeyPairHex();
  const eA = sm2.generateKeyPairHex();
  const eB = sm2.generateKeyPairHex();

  const len = 233; // 任意长度（bit），库内部按规范派生
  const KA = sm2.calculateSharedKey(A, eA, B.publicKey, eB.publicKey, len);
  const KB = sm2.calculateSharedKey(B, eB, A.publicKey, eA.publicKey, len, true);
  assert(toHex(KA) === toHex(KB), 'shared key mismatch (no identity)');
  return { keyLenBytes: toU8(KA).length };
});

await run('sm2.calculateSharedKey (with identity strings)', async () => {
  const A = sm2.generateKeyPairHex();
  const B = sm2.generateKeyPairHex();
  const eA = sm2.generateKeyPairHex();
  const eB = sm2.generateKeyPairHex();
  const idA = 'alice@yahoo.com';
  const idB = 'bob@yahoo.com';
  const len = 233;

  const KA = sm2.calculateSharedKey(A, eA, B.publicKey, eB.publicKey, len, false, idA, idB);
  const KB = sm2.calculateSharedKey(B, eB, A.publicKey, eA.publicKey, len, true, idB, idA);
  assert(toHex(KA) === toHex(KB), 'shared key mismatch (with identity)');
  return { keyLenBytes: toU8(KA).length };
});

// ======== sm3: hash / HMAC / KDF ========
await run('sm3("abc") vs standard vector', async () => {
  const h = sm3('abc');
  const expect = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
  assert(toHex(h) === expect, 'SM3(abc) vector mismatch', { got: toHex(h) });
  return { hash: toHex(h) };
});

await run('sm3 HMAC basic sanity', async () => {
  const key1 = '00'.repeat(64); // 512-bit zero key（hex）
  const key2 = '11'.repeat(64);
  const m = 'hmac-input';
  const h1 = sm3(m, { key: key1 });
  const h2 = sm3(m, { key: key2 });
  assert(typeof h1 === 'string' && h1.length === 64, 'HMAC output format');
  assert(h1 !== h2, 'HMAC different keys should differ');
  return { h1: h1.slice(0, 16) + '...', h2: h2.slice(0, 16) + '...' };
});

await run('sm3 KDF length & determinism', async () => {
  const out16 = kdf('kdf-seed', 16); // 16 bytes
  const out32 = kdf('kdf-seed', 32); // 32 bytes
  const s16 = toHex(out16), s32 = toHex(out32);
  assert((out16.length ?? (s16.length / 2)) === 16, 'KDF 16 bytes length mismatch');
  assert((out32.length ?? (s32.length / 2)) === 32, 'KDF 32 bytes length mismatch');
  // 同一输入长度应确定性一致
  const out32b = kdf('kdf-seed', 32);
  assert(toHex(out32b) === toHex(out32), 'KDF determinism mismatch');
  return { kdf16: s16.slice(0, 16) + '...', kdf32: s32.slice(0, 16) + '...' };
});

// ======== sm4: ECB/CBC/GCM 各模式 ========
await run('sm4 ECB default (pkcs#7) roundtrip string', async () => {
  const msg = 'hello world! 我是 juneandgreen.';
  const key = '0123456789abcdeffedcba9876543210';
  const ct = sm4.encrypt(msg, key); // 默认 ECB+pkcs7 string->hex
  const pt = sm4.decrypt(ct, key);
  assert(pt === msg, 'SM4 ECB roundtrip failed');
  return { ctPrefix: ct.slice(0, 20) + '...' };
});

await run('sm4 ECB no-padding + array I/O', async () => {
  // 构造 32 字节整块（2个块）消息，避免 padding
  const msgU8 = new Uint8Array(32).fill(0x41); // 'A' * 32
  const key = fromHex('0123456789abcdeffedcba9876543210');
  const ct = sm4.encrypt(msgU8, key, { padding: 'none', output: 'array' });
  const pt = sm4.decrypt(ct, key, { padding: 'none', output: 'array' });
  assert(toHex(pt) === toHex(msgU8), 'SM4 ECB no-padding roundtrip failed');
  return { blocks: 2, ctLen: ct.length };
});

await run('sm4 CBC roundtrip with IV', async () => {
  const msg = 'CBC-模式-测试-🙂🙂🙂';
  const key = '0123456789abcdeffedcba9876543210';
  const iv = 'fedcba98765432100123456789abcdef';
  const ct = sm4.encrypt(msg, key, { mode: 'cbc', iv });
  const pt = sm4.decrypt(ct, key, { mode: 'cbc', iv });
  assert(pt === msg, 'SM4 CBC roundtrip failed');
  return { ivPrefix: iv.slice(0, 16) + '...' };
});

await run('sm4 GCM against RFC8998 test vector (ciphertext & tag match)', async () => {
    const key = '0123456789ABCDEFFEDCBA9876543210'.toLowerCase();
    const iv  = '00001234567800000000ABCD'.toLowerCase();
    const aad = 'FEEDFACEDEADBEEFFEEDFACEDEADBEEFABADDAD2'.toLowerCase();
  
    // 注意：RFC8998 的 Plaintext 是“十六进制字节串”，不是 ASCII 文本
    const ptHex =
      'AAAAAAAAAAAAAAAABBBBBBBBBBBBBBBB' +
      'CCCCCCCCCCCCCCCCDDDDDDDDDDDDDDDD' +
      'EEEEEEEEEEEEEEEEFFFFFFFFFFFFFFFF' +
      'EEEEEEEEEEEEEEEEAAAAAAAAAAAAAAAA';
    const plaintextBytes = fromHex(ptHex); // <-- 关键：按 hex 解为字节
  
    const expCT =
      ('17F399F08C67D5EE19D0DC9969C4BB7D' +
       '5FD46FD3756489069157B282BB200735' +
       'D82710CA5C22F0CCFA7CBF93D496AC15' +
       'A56834CBCF98C397B4024A2691233B8D').toLowerCase();
    const expTag = '83DE3541E4C2B58177E065A9BF7B62EC'.toLowerCase();
  
    const enc = sm4.encrypt(plaintextBytes, key, {
      mode: 'gcm',
      iv,
      associatedData: fromHex(aad), // 传字节更稳妥
      output: 'string',
      outputTag: true
    });
    assert(enc && enc.output && enc.tag, 'GCM encrypt should return {output, tag}');
    assert(enc.output.toLowerCase() === expCT, 'GCM ciphertext mismatch');
    assert(enc.tag.toLowerCase() === expTag, 'GCM tag mismatch');
  
    const dec = sm4.decrypt(enc.output, key, {
      mode: 'gcm',
      iv,
      associatedData: fromHex(aad),
      tag: enc.tag,
      output: 'array'
    });
    assert(toHex(dec) === toHex(plaintextBytes), 'GCM decrypt mismatch');
  
    return { ok: true, tag: enc.tag };
  });

// ========== 汇总输出 ==========
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

})();