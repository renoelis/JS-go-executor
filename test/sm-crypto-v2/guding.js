/* smcrypto-full-selfcheck-fixed.js
   目标：无死角 + 异常分支，且固定输入→固定输出（跨环境一致）
   说明：
   - SM2 含：keypair/压缩/比较/校验/预计算、加解密（两种拼接+ASN.1+array）、签名验签（hash/der/userId/publicKey/pointPool）、密钥交换（含/不含身份）以及负例（坏公钥/坏私钥/错误解密）。
   - SM3 含：hash、HMAC、KDF，负例（KDF 非法长度、HMAC 非法key）。
   - SM4 含：ECB/CBC/GCM（string/array I/O），负例（无效 key/IV/GCM 错标签/缺标签）。
   - 所有可控随机性通过“固定数值种子”控制；对本质随机的值（签名/密文等）仅进行正确性断言，不写入输出字段，保证最终 JSON 稳定。
   - duration 与 totalDuration 固定为 "0ms"。
*/

;(async () => {
    const { sm2, sm3, sm4, kdf } = require('sm-crypto-v2');
  
    // ---------- 工具 ----------
    const results = { passed: 0, failed: 0, tests: [] };
    const OK = { ok: true };
    function hex(x) {
      if (typeof x === 'string') return x.toLowerCase();
      return Buffer.from(x).toString('hex').toLowerCase();
    }
    function u8(x) {
      if (x instanceof Uint8Array) return x;
      if (typeof x === 'string') return new TextEncoder().encode(x);
      return new Uint8Array(x);
    }
    function fromHex(h) {
      return new Uint8Array(Buffer.from(h.replace(/\s+/g, ''), 'hex'));
    }
    function assert(cond, msg) {
      if (!cond) throw new Error(msg);
    }
    async function run(name, fn) {
      try {
        const detail = await fn();
        results.passed++;
        results.tests.push({ name, status: 'passed', duration: '0ms', detail });
      } catch (err) {
        results.failed++;
        results.tests.push({
          name, status: 'failed', duration: '0ms',
          error: (err && (err.stack || err.message)) || String(err)
        });
      }
    }
  
    // ---------- 固定种子（可被 BigInt 解析的数值字符串） ----------
    const seedMain = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd';
    const seedA    = '0x1111111111111111222222222222222233333333333333334444444444444444';
    const seedB    = '0xaaaaaaaaaaaaaaaa5555555555555555cccccccccccccccc3333333333333333';
    const seedEA   = '0x9999999999999999888888888888888877777777777777776666666666666666';
    const seedEB   = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd';
  
    // 预生成固定 SM2 主密钥
    const { publicKey, privateKey } = sm2.generateKeyPairHex(seedMain);
  
    // ========================= SM2 =========================
  
    await run('SM2 01/17 generateKeyPairHex(固定数值种子)', async () => {
      const kp = sm2.generateKeyPairHex(seedMain);
      assert(kp.publicKey === publicKey && kp.privateKey === privateKey, '同种子应固定');
      return {
        publicKeyPrefix: publicKey.slice(0, 20) + '...',
        privateKeyPrefix: privateKey.slice(0, 20) + '...'
      };
    });
  
    await run('SM2 02/17 compress/compare/verifyPublicKey（正例+负例）', async () => {
      const comp = sm2.compressPublicKeyHex(publicKey);
      assert(sm2.comparePublicKeyHex(publicKey, comp), '压缩前后不等价');
      assert(sm2.verifyPublicKey(publicKey) === true, '校验失败(uncompressed)');
      assert(sm2.verifyPublicKey(comp) === true, '校验失败(compressed)');
      // 负例：坏点（抛错或 false 均视为识别非法）
      const bad = publicKey.slice(0, -1) + (publicKey.at(-1) === 'a' ? 'b' : 'a');
      let negOK = false;
      try { negOK = sm2.verifyPublicKey(bad) === false; } catch { negOK = true; }
      assert(negOK, '坏公钥未被识别');
      return { compressedPrefix: comp.slice(0, 20) + '...' };
    });
  
    await run('SM2 03/17 precomputePublicKey → 验签/加密 roundtrip', async () => {
      const pre = sm2.precomputePublicKey(publicKey);
      const msg = 'precompute-verify';
      const sig = sm2.doSignature(msg, privateKey, { hash: true });
      assert(sm2.doVerifySignature(msg, sig, pre, { hash: true }), '预计算公钥验签失败');
      const enc = sm2.doEncrypt(msg, pre, 1);
      const dec = sm2.doDecrypt(enc, privateKey, 1);
      assert(dec === msg, '预计算公钥解密不匹配');
      return OK;
    });
  
    await run('SM2 04/17 doEncrypt/doDecrypt（C1C3C2, asn1=false, string I/O）', async () => {
      const msg = 'hello sm2 固定测试';
      const enc = sm2.doEncrypt(msg, publicKey, 1, { asn1: false });
      const dec = sm2.doDecrypt(enc, privateKey, 1, { asn1: false });
      assert(dec === msg, '解密不匹配');
      return OK;
    });
  
    await run('SM2 05/17 doEncrypt/doDecrypt（C1C2C3, asn1=true, array I/O）', async () => {
      const msg = u8('array-输入-测试');
      const enc = sm2.doEncrypt(msg, publicKey, 0, { asn1: true });
      const dec = sm2.doDecrypt(enc, privateKey, 0, { asn1: true, output: 'array' });
      assert(hex(dec) === hex(msg), 'array 解密不匹配');
      return OK;
    });
  
    await run('SM2 06/17 doEncrypt/doDecrypt（C1C3C2, asn1=false, array I/O）', async () => {
      const msg = fromHex('00112233445566778899aabbccddeeff');
      const enc = sm2.doEncrypt(msg, publicKey, 1, { asn1: false });
      const dec = sm2.doDecrypt(enc, privateKey, 1, { asn1: false, output: 'array' });
      assert(hex(dec) === hex(msg), 'array 解密不匹配(asn1=false)');
      return OK;
    });
  
    await run('SM2 07/17 doSignature/doVerifySignature（hash=true, publicKey 快捷）', async () => {
      const m = 'sign-agnostic';
      const sig = sm2.doSignature(m, privateKey, { hash: true, publicKey });
      assert(sm2.doVerifySignature(m, sig, publicKey, { hash: true, publicKey }), '验签失败');
      assert(!sm2.doVerifySignature(m + 'x', sig, publicKey, { hash: true, publicKey }), '负例未失败');
      return OK;
    });
  
    await run('SM2 08/17 doSignature（DER）/doVerifySignature（DER）', async () => {
      const m = 'DER-encoding';
      const sigDER = sm2.doSignature(m, privateKey, { der: true });
      assert(sm2.doVerifySignature(m, sigDER, publicKey, { der: true }), 'DER 验签失败');
      return OK;
    });
  
    await run('SM2 09/17 doSignature（userId）/doVerifySignature（userId）', async () => {
      const m = 'Z-parameter';
      const userId = 'alice@example.com';
      const sig = sm2.doSignature(m, privateKey, { hash: true, publicKey, userId });
      assert(sm2.doVerifySignature(m, sig, publicKey, { hash: true, userId }), '带 userId 验签失败');
      assert(!sm2.doVerifySignature(m, sig, publicKey, { hash: true, userId: 'bob' }), '错误 userId 未失败');
      return OK;
    });
  
    await run('SM2 10/17 doSignature（pointPool）/doVerifySignature', async () => {
      const pool = [sm2.getPoint(), sm2.getPoint(), sm2.getPoint(), sm2.getPoint()];
      const m = 'point-pool';
      const sig = sm2.doSignature(m, privateKey, { pointPool: pool });
      assert(sm2.doVerifySignature(m, sig, publicKey), 'pointPool 验签失败');
      return { poolSize: pool.length };
    });
  
    await run('SM2 11/17 calculateSharedKey（固定种子，无身份）→ 输出SM3摘要', async () => {
      const A  = sm2.generateKeyPairHex(seedA);
      const B  = sm2.generateKeyPairHex(seedB);
      const eA = sm2.generateKeyPairHex(seedEA);
      const eB = sm2.generateKeyPairHex(seedEB);
      const len = 233;
      const KA = sm2.calculateSharedKey(A, eA, B.publicKey, eB.publicKey, len);
      const KB = sm2.calculateSharedKey(B, eB, A.publicKey, eA.publicKey, len, true);
      assert(hex(KA) === hex(KB), '共享密钥不一致');
      return { sharedKeySM3: sm3(hex(KA)) };
    });
  
    await run('SM2 12/17 calculateSharedKey（固定种子，含身份）→ 输出SM3摘要', async () => {
      const A  = sm2.generateKeyPairHex(seedA);
      const B  = sm2.generateKeyPairHex(seedB);
      const eA = sm2.generateKeyPairHex(seedEA);
      const eB = sm2.generateKeyPairHex(seedEB);
      const idA = 'alice@fixed';
      const idB = 'bob@fixed';
      const len = 233;
      const KA = sm2.calculateSharedKey(A, eA, B.publicKey, eB.publicKey, len, false, idA, idB);
      const KB = sm2.calculateSharedKey(B, eB, A.publicKey, eA.publicKey, len, true,  idB, idA);
      assert(hex(KA) === hex(KB), '共享密钥(含身份)不一致');
      return { sharedKeySM3: sm3(hex(KA)) };
    });
  
    await run('SM2 13/17 负例：doEncrypt(坏公钥) 应抛错或失败', async () => {
      const badPub = publicKey.slice(0, -2) + '00';
      let failed = false;
      try {
        sm2.doEncrypt('x', badPub, 1);
      } catch { failed = true; }
      assert(failed, '坏公钥未触发失败');
      return OK;
    });
  
    await run('SM2 14/17 负例：doSignature(坏私钥长度) 应抛错', async () => {
      let ok = false;
      try {
        sm2.doSignature('x', '1234'); // 明显长度不对
      } catch { ok = true; }
      assert(ok, '坏私钥未抛错');
      return OK;
    });
  
    await run('SM2 15/17 负例：doDecrypt(错误私钥) 应抛错或解密失败', async () => {
      const msg = 'secret';
      const enc = sm2.doEncrypt(msg, publicKey, 1);
      const wrongPriv = sm2.generateKeyPairHex('0x7777').privateKey;
      let bad = false;
      try {
        const dec = sm2.doDecrypt(enc, wrongPriv, 1);
        bad = dec !== msg; // 即使未抛错，也应不等于原文
      } catch { bad = true; }
      assert(bad, '错误私钥未导致失败');
      return OK;
    });
  
    await run('SM2 16/17 负例：verifyPublicKey(异常输入类型)', async () => {
      let ok = false;
      try {
        // @ts-ignore 故意传对象
        sm2.verifyPublicKey({ not: 'a-hex' });
      } catch { ok = true; }
      assert(ok, '异常类型未抛错');
      return OK;
    });
  
    await run('SM2 17/17 负例：comparePublicKeyHex(长度不匹配)', async () => {
      let ok = false;
      try {
        sm2.comparePublicKeyHex(publicKey, publicKey.slice(0, -2));
      } catch { ok = true; }
      assert(ok, '长度不匹配未抛错');
      return OK;
    });
  
    // ========================= SM3 =========================
  
    await run('SM3 01/05 sm3(\"abc\") 标准向量', async () => {
      const h = sm3('abc');
      assert(h === '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0', 'SM3 abc 不匹配');
      return { hash: h };
    });
  
    await run('SM3 02/05 HMAC（固定 key/message）', async () => {
      const key = '00'.repeat(64); // 512-bit 零
      const mac = sm3('fixed-hmac-input', { key });
      assert(typeof mac === 'string' && mac.length === 64, 'HMAC 输出格式异常');
      return { hmac: mac };
    });
  
    await run('SM3 03/05 KDF（固定种子与长度）', async () => {
      const out16 = kdf('kdf-fixed-seed', 16);
      const out32 = kdf('kdf-fixed-seed', 32);
      assert(out16.length === 16 && out32.length === 32, 'KDF 长度不匹配');
      return { kdf16: hex(out16), kdf32: hex(out32) };
    });
  
    await run('SM3 04/05 负例：KDF(长度<=0) 应抛错', async () => {
      let ok = false;
      try { kdf('x', 0); } catch { ok = true; }
      assert(ok, '非法长度未抛错');
      return OK;
    });
  
    await run('SM3 05/05 负例：HMAC 非法key（非hex字符串）', async () => {
      let ok = false;
      try { sm3('m', { key: 'not-hex-key!' }); } catch { ok = true; }
      // 某些实现可能容忍并当作普通字符串；这种情况下再用“与正确hex相等哈希不应出现”来兜底
      if (!ok) {
        ok = sm3('m', { key: '00' }) !== sm3('m', { key: 'not-hex-key!' });
      }
      assert(ok, '非法 HMAC key 未触发失败/区分');
      return OK;
    });
  
    // ========================= SM4 =========================
  
    await run('SM4 01/10 ECB（pkcs7）string I/O', async () => {
      const msg = 'hello world! 我是 juneandgreen.';
      const key = '0123456789abcdeffedcba9876543210';
      const ct  = sm4.encrypt(msg, key);
      const pt  = sm4.decrypt(ct, key);
      assert(pt === msg, 'ECB 解密不匹配');
      return { ciphertext: ct };
    });
  
    await run('SM4 02/10 ECB（no-padding）array I/O', async () => {
      const msg = new Uint8Array(32).fill(0x41); // 'A' * 32
      const key = fromHex('0123456789abcdeffedcba9876543210');
      const ct  = sm4.encrypt(msg, key, { padding: 'none', output: 'array' });
      const pt  = sm4.decrypt(ct, key, { padding: 'none', output: 'array' });
      assert(hex(pt) === hex(msg), 'ECB no-padding 解密不匹配');
      return { ciphertext: hex(ct) };
    });
  
    await run('SM4 03/10 CBC（固定 IV）string I/O', async () => {
      const msg = 'CBC-模式-固定-🙂🙂🙂';
      const key = '0123456789abcdeffedcba9876543210';
      const iv  = 'fedcba98765432100123456789abcdef';
      const ct  = sm4.encrypt(msg, key, { mode: 'cbc', iv });
      const pt  = sm4.decrypt(ct, key, { mode: 'cbc', iv });
      assert(pt === msg, 'CBC 解密不匹配');
      return { ciphertext: ct };
    });
  
    await run('SM4 04/10 CBC（array I/O）', async () => {
      const msg = fromHex('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff');
      const key = fromHex('0123456789abcdeffedcba9876543210');
      const iv  = fromHex('fedcba98765432100123456789abcdef');
      const ct  = sm4.encrypt(msg, key, { mode: 'cbc', iv, output: 'array', padding: 'pkcs7' });
      const pt  = sm4.decrypt(ct, key, { mode: 'cbc', iv, output: 'array', padding: 'pkcs7' });
      assert(hex(pt) === hex(msg), 'CBC array 解密不匹配');
      return { ciphertext: hex(ct) };
    });
  
    await run('SM4 05/10 GCM（RFC8998 A.1）string 输出', async () => {
      const key = '0123456789ABCDEFFEDCBA9876543210'.toLowerCase();
      const iv  = '00001234567800000000ABCD'.toLowerCase();
      const aad = 'FEEDFACEDEADBEEFFEEDFACEDEADBEEFABADDAD2'.toLowerCase();
      const ptHex =
        'AAAAAAAAAAAAAAAABBBBBBBBBBBBBBBB' +
        'CCCCCCCCCCCCCCCCDDDDDDDDDDDDDDDD' +
        'EEEEEEEEEEEEEEEEFFFFFFFFFFFFFFFF' +
        'EEEEEEEEEEEEEEEEAAAAAAAAAAAAAAAA';
      const expCT =
        ('17F399F08C67D5EE19D0DC9969C4BB7D' +
         '5FD46FD3756489069157B282BB200735' +
         'D82710CA5C22F0CCFA7CBF93D496AC15' +
         'A56834CBCF98C397B4024A2691233B8D').toLowerCase();
      const expTag = '83DE3541E4C2B58177E065A9BF7B62EC'.toLowerCase();
  
      const enc = sm4.encrypt(fromHex(ptHex), key, {
        mode: 'gcm', iv, associatedData: fromHex(aad), output: 'string', outputTag: true
      });
      assert(enc.output.toLowerCase() === expCT, 'GCM 密文不匹配');
      assert(enc.tag.toLowerCase() === expTag,   'GCM 标签不匹配');
  
      const dec = sm4.decrypt(enc.output, key, {
        mode: 'gcm', iv, associatedData: fromHex(aad), tag: enc.tag, output: 'array'
      });
      assert(hex(dec) === ptHex.toLowerCase(), 'GCM 解密不匹配');
      return { ciphertext: enc.output, tag: enc.tag };
    });
  
    await run('SM4 06/10 GCM（RFC8998 A.1）array 输出', async () => {
      const key = fromHex('0123456789ABCDEFFEDCBA9876543210');
      const iv  = fromHex('00001234567800000000ABCD');
      const aad = fromHex('FEEDFACEDEADBEEFFEEDFACEDEADBEEFABADDAD2');
      const pt  = fromHex(
        'AAAAAAAAAAAAAAAABBBBBBBBBBBBBBBB' +
        'CCCCCCCCCCCCCCCCDDDDDDDDDDDDDDDD' +
        'EEEEEEEEEEEEEEEEFFFFFFFFFFFFFFFF' +
        'EEEEEEEEEEEEEEEEAAAAAAAAAAAAAAAA'
      );
      const expCT = fromHex(
        '17F399F08C67D5EE19D0DC9969C4BB7D' +
        '5FD46FD3756489069157B282BB200735' +
        'D82710CA5C22F0CCFA7CBF93D496AC15' +
        'A56834CBCF98C397B4024A2691233B8D'
      );
      const expTag = fromHex('83DE3541E4C2B58177E065A9BF7B62EC');
  
      const enc = sm4.encrypt(pt, key, { mode: 'gcm', iv, associatedData: aad, output: 'array', outputTag: true });
      assert(hex(enc.output) === hex(expCT), 'GCM(array) 密文不匹配');
      assert(hex(enc.tag)    === hex(expTag), 'GCM(array) 标签不匹配');
  
      const dec = sm4.decrypt(enc.output, key, { mode: 'gcm', iv, associatedData: aad, tag: enc.tag, output: 'array' });
      assert(hex(dec) === hex(pt), 'GCM(array) 解密不匹配');
      return { ciphertext: hex(enc.output), tag: hex(enc.tag) };
    });
  
    await run('SM4 07/10 负例：CBC 无效 IV 长度', async () => {
      const key = '0123456789abcdeffedcba9876543210';
      const ivBad = '0011223344556677'; // 8字节，不足16
      let ok = false;
      try { sm4.encrypt('m', key, { mode: 'cbc', iv: ivBad }); } catch { ok = true; }
      assert(ok, '无效 IV 长度未抛错');
      return OK;
    });
  
    await run('SM4 08/10 负例：无效 key 长度', async () => {
      const keyBad = '0123456789abcdef0123'; // 太短
      let ok = false;
      try { sm4.encrypt('m', keyBad); } catch { ok = true; }
      assert(ok, '无效 key 长度未抛错');
      return OK;
    });
  
    await run('SM4 09/10 负例：GCM 错误标签解密失败/抛错', async () => {
      const key = '0123456789ABCDEFFEDCBA9876543210'.toLowerCase();
      const iv  = '00001234567800000000ABCD'.toLowerCase();
      const aad = 'FEEDFACEDEADBEEFFEEDFACEDEADBEEFABADDAD2'.toLowerCase();
      const pt  = fromHex('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
      const enc = sm4.encrypt(pt, key, { mode: 'gcm', iv, associatedData: fromHex(aad), output: 'string', outputTag: true });
      const wrongTag = enc.tag.slice(0, -2) + (enc.tag.slice(-2) === '00' ? '01' : '00');
      let bad = false;
      try {
        const dec = sm4.decrypt(enc.output, key, { mode: 'gcm', iv, associatedData: fromHex(aad), tag: wrongTag, output: 'array' });
        bad = hex(dec) !== hex(pt);
      } catch { bad = true; }
      assert(bad, 'GCM 错标签未导致失败');
      return OK;
    });
  
    await run('SM4 10/10 负例：GCM 缺少标签解密抛错', async () => {
      const key = '0123456789ABCDEFFEDCBA9876543210'.toLowerCase();
      const iv  = '00001234567800000000ABCD'.toLowerCase();
      const aad = 'FEEDFACEDEADBEEFFEEDFACEDEADBEEFABADDAD2'.toLowerCase();
      const pt  = '00112233445566778899aabbccddeeff';
      const enc = sm4.encrypt(fromHex(pt), key, { mode: 'gcm', iv, associatedData: fromHex(aad), output: 'string', outputTag: true });
      let ok = false;
      try {
        // @ts-ignore 故意不传 tag
        sm4.decrypt(enc.output, key, { mode: 'gcm', iv, associatedData: fromHex(aad), output: 'string' });
      } catch { ok = true; }
      assert(ok, '缺少 tag 未抛错');
      return OK;
    });
  
    // ---------- 汇总（固定） ----------
    const result = {
      summary: {
        total: results.passed + results.failed,
        passed: results.passed,
        failed: results.failed,
        successRate: ((results.passed / Math.max(1, results.passed + results.failed)) * 100).toFixed(2) + '%',
        totalDuration: '0ms'
      },
      details: results.tests,
      keyPair: {
        publicKey: publicKey.slice(0, 20) + '...',
        privateKey: privateKey.slice(0, 20) + '...'
      }
    };
  
    console.log(JSON.stringify(result, null, 2));
  })();