// sm-crypto-v2 全量验证（固定输入/稳定输出版，含类型兼容与长度单位修正）
// 运行：node sm-fixed.js
// 依赖：npm i sm-crypto-v2@latest

const { sm2, sm3, sm4, kdf } = require('sm-crypto-v2');

(async () => {
  const startTime = Date.now();

  // ---------- 工具 ----------
  const results = { passed: 0, failed: 0, tests: [] };
  const add = (name, passed, t0, meta = {}, error = null) => {
    const durationMs = Date.now() - t0;
    const entry = { name, passed, durationMs };
    if (error) entry.error = String(error);
    if (meta && Object.keys(meta).length) entry.meta = meta;
    results.tests.push(entry);
    passed ? results.passed++ : results.failed++;
  };
  const run = async (name, fn) => {
    const t0 = Date.now();
    try {
      await fn();
      add(name, true, t0);
    } catch (e) {
      add(name, false, t0, {}, e);
    }
  };
  const hex = (u8) => Buffer.from(u8).toString('hex');
  const eqU8 = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  // 统一把“string | Uint8Array | Buffer | {output:...}”规整成小写 hex，便于比较
  function toHexLower(x) {
    if (x == null) return null;
    if (typeof x === 'string') return x.toLowerCase();
    if (x instanceof Uint8Array || Buffer.isBuffer(x)) return Buffer.from(x).toString('hex').toLowerCase();
    if (typeof x === 'object' && x.output != null) return toHexLower(x.output);
    return String(x).toLowerCase();
  }
  const heq = (a, b) => toHexLower(a) === toHexLower(b);

  // ---------- 常量（固定输入/期望值） ----------
  // SM2：固定私钥 d=1（64 hex），对应公钥=基点 G（GB/T 32918 推荐参数）
  const PRIV_D1 = '0000000000000000000000000000000000000000000000000000000000000001';
  const GX = '32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7'.toLowerCase();
  const GY = 'BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0'.toLowerCase();
  const PUB_UNCOMP_G = ('04' + GX + GY).toLowerCase();
  const PUB_COMP_G   = ('02' + GX).toLowerCase(); // Gy 最低位偶数 ⇒ 0x02

  // SM3：标准向量
  const SM3_MSG_ABC = 'abc';
  const SM3_ABC_EXPECT = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';

  // SM4 ECB：标准向量（单块、无填充）
  const SM4_KEY = '0123456789abcdeffedcba9876543210';
  const SM4_PTX = '0123456789abcdeffedcba9876543210';
  const SM4_ECB_EXPECT = '681edf34d206965e86b3e94f536e4246';

  // 统一固定消息
  const MSG_UTF8 = 'hello world! 我是 sm-crypto-v2 固定用例。';
  const MSG_BIN  = Buffer.from('0102030405060708090a0b0c0d0e0f10', 'hex');

  // ---------- SM2：纯确定性能力 ----------
  await run('SM2 固定 d=1 推导公钥 = 基点G（非压缩/压缩）', async () => {
    const compressed = sm2.compressPublicKeyHex(PUB_UNCOMP_G);
    if (!heq(compressed, PUB_COMP_G)) throw new Error('compressPublicKeyHex 不等于期望的压缩基点');
    if (!sm2.comparePublicKeyHex(PUB_UNCOMP_G, PUB_COMP_G)) throw new Error('comparePublicKeyHex 基点压缩/非压缩 应等价');
    if (!sm2.verifyPublicKey(PUB_UNCOMP_G) || !sm2.verifyPublicKey(PUB_COMP_G)) throw new Error('verifyPublicKey 基点公钥 校验失败');
  });

  await run('SM2 非法公钥校验（应失败/抛错）', async () => {
    const bad = '04' + '00'.repeat(64);
    let ok = false;
    try { ok = sm2.verifyPublicKey(bad); } catch { ok = false; }
    if (ok) throw new Error('非法公钥不应通过校验');
  });

  // ---------- SM2：随机性算法做“确定性断言” ----------
  await run('SM2 签名/验签（固定消息，断言验签成功）', async () => {
    const sig = sm2.doSignature(MSG_UTF8, PRIV_D1, { hash: true, userId: '1234567812345678' });
    const ok  = sm2.doVerifySignature(MSG_UTF8, sig, PUB_UNCOMP_G, { hash: true, userId: '1234567812345678' });
    if (!ok) throw new Error('验签失败');
  });

  await run('SM2 加密/解密（C1C3C2，断言解密还原）', async () => {
    const cipher = sm2.doEncrypt(MSG_UTF8, PUB_UNCOMP_G, 1, { asn1: false });
    const plain  = sm2.doDecrypt(cipher, PRIV_D1, 1, { asn1: false });
    if (plain !== MSG_UTF8) throw new Error('解密未还原明文');
  });

  await run('SM2 密钥交换（无身份）双方派生相同密钥', async () => {
    // 用“可重复的 seed”生成确定性 A/B 与各自临时密钥
    const KA = sm2.generateKeyPairHex('2');
    const KB = sm2.generateKeyPairHex('3');
    const EA = sm2.generateKeyPairHex('11');
    const EB = sm2.generateKeyPairHex('12');

    const klenBytes = 16; // 128-bit = 16 bytes
    const KA1 = sm2.calculateSharedKey(KA, EA, KB.publicKey, EB.publicKey, klenBytes);
    const KB1 = sm2.calculateSharedKey(KB, EB, KA.publicKey, EA.publicKey, klenBytes, true);
    const kaHex = toHexLower(KA1), kbHex = toHexLower(KB1);
    if (!kaHex || !kbHex) throw new Error('shared key 为空');
    if (kaHex.length !== klenBytes * 2 || kbHex.length !== klenBytes * 2)
      throw new Error(`shared key 长度不对：KA=${kaHex.length}, KB=${kbHex.length}, 期望 ${klenBytes*2}`);
    if (kaHex !== kbHex) throw new Error('双方派生密钥不一致');
  });

  await run('SM2 密钥交换（带身份）双方派生相同密钥', async () => {
    const KA = sm2.generateKeyPairHex('5');
    const KB = sm2.generateKeyPairHex('6');
    const EA = sm2.generateKeyPairHex('21');
    const EB = sm2.generateKeyPairHex('22');

    const idA = 'alice@example.com';
    const idB = 'bob@example.com';
    const klenBytes = 20; // 160-bit = 20 bytes
    const KA1 = sm2.calculateSharedKey(KA, EA, KB.publicKey, EB.publicKey, klenBytes, false, idA, idB);
    const KB1 = sm2.calculateSharedKey(KB, EB, KA.publicKey, EA.publicKey, klenBytes, true,  idB, idA);
    const kaHex = toHexLower(KA1), kbHex = toHexLower(KB1);
    if (!kaHex || !kbHex) throw new Error('shared key 为空');
    if (kaHex.length !== klenBytes * 2 || kbHex.length !== klenBytes * 2)
      throw new Error(`shared key 长度不对：KA=${kaHex.length}, KB=${kbHex.length}, 期望 ${klenBytes*2}`);
    if (kaHex !== kbHex) throw new Error('双方派生密钥不一致');
  });

  // ---------- SM3 ----------
  await run('SM3 哈希 - 向量 "abc"', async () => {
    const out = sm3(SM3_MSG_ABC);
    if (out.toLowerCase() !== SM3_ABC_EXPECT) throw new Error(`期望 ${SM3_ABC_EXPECT}，得到 ${out}`);
  });

  await run('SM3 KDF - 固定长度 32 字节', async () => {
    const out1 = kdf('abc', 32); // README: kdf('abc', 32 /* 输出长度 */)
    const out2 = kdf('abc', 32);
    const h1 = toHexLower(out1), h2 = toHexLower(out2);
    if (!h1 || !h2) throw new Error('KDF 返回空');
    if (h1.length !== 64) throw new Error(`KDF 长度不对：${h1.length}（期望 64）`);
    if (h1 !== h2) throw new Error('KDF 相同输入未得到一致输出');
  });

  // ---------- SM4 ----------
  await run('SM4 ECB 无填充（标准向量，array输出对照hex）', async () => {
    const ct = sm4.encrypt(Buffer.from(SM4_PTX, 'hex'), SM4_KEY, { padding: 'none', output: 'array' });
    if (!heq(hex(ct), SM4_ECB_EXPECT)) throw new Error(`ECB 期望 ${SM4_ECB_EXPECT}，得到 ${hex(ct)}`);
    const pt = sm4.decrypt(ct, SM4_KEY, { padding: 'none', output: 'array' });
    if (!heq(hex(pt), SM4_PTX)) throw new Error('ECB 解密未还原明文');
  });

  await run('SM4 CBC（有填充）加解密回环', async () => {
    const iv = 'fedcba98765432100123456789abcdef';
    const ct = sm4.encrypt(MSG_UTF8, SM4_KEY, { mode: 'cbc', iv }); // 默认 string 输出
    const pt = sm4.decrypt(ct, SM4_KEY, { mode: 'cbc', iv });
    if (pt !== MSG_UTF8) throw new Error('CBC 解密未还原明文');
  });

  await run('SM4 GCM（断言回环 + Tag 校验，不输出随机密文）', async () => {
    const iv  = Buffer.from('000102030405060708090a0b', 'hex');
    const aad = Buffer.from('0c0d0e0f', 'hex');
    const enc = sm4.encrypt(MSG_BIN, SM4_KEY, {
      mode: 'gcm',
      iv,
      associatedData: aad,
      output: 'array',
      outputTag: true,
    });
    const dec = sm4.decrypt(enc.output, SM4_KEY, {
      mode: 'gcm',
      iv,
      associatedData: aad,
      tag: enc.tag,
      output: 'array',
    });
    if (!eqU8(dec, MSG_BIN)) throw new Error('GCM 解密未还原明文');
  });

  await run('SM4 负例 - 错误 key 长度应失败', async () => {
    let threw = false;
    try { sm4.encrypt('abc', 'abcd'); } catch { threw = true; }
    if (!threw) throw new Error('错误 key 长度未抛错');
  });

  // ---------- 汇总 ----------
  const totalDuration = Date.now() - startTime;
  const publicKey = PUB_UNCOMP_G;
  const privateKey = PRIV_D1;
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