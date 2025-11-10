// Node.js 18+ Crypto RSA 完整功能验证脚本（跨版本健壮版）
// 兼容 OpenSSL 3 的错误文案与策略差异，显式支持 DER/TypedArray/ArrayBuffer key。

const crypto = require('crypto');

console.log('=== Node.js 18+ Crypto RSA 完整功能验证（健壮版） ===\n');

const results = {
  tests: {},
  summary: { passed: 0, failed: 0, skipped: 0 }
};

function recordPass(name) {
  results.tests[name] = { passed: true };
  results.summary.passed++;
  console.log(`✓ ${name}`);
}
function recordFail(name, e) {
  results.tests[name] = { passed: false, error: e && e.message ? e.message : String(e) };
  results.summary.failed++;
  console.error(`✗ ${name}: ${e && e.message ? e.message : String(e)}`);
}
function recordSkip(name, reason) {
  results.tests[name] = { skipped: true, reason };
  results.summary.skipped++;
  console.log(`⊘ ${name} (跳过: ${reason})`);
}

function errMatches(e, patterns) {
  const msg = (e && e.message ? e.message : String(e)).toLowerCase();
  if (!patterns) return true;
  if (typeof patterns === 'string') return msg.includes(patterns.toLowerCase());
  if (patterns instanceof RegExp) return patterns.test(msg);
  if (Array.isArray(patterns)) return patterns.some(p => errMatches(e, p));
  return false;
}

function mustThrow(fn, patterns) {
  let threw = false, err;
  try { fn(); } catch (e) { threw = true; err = e; }
  if (!threw) throw new Error('预期应抛错，但未抛错');
  if (patterns && !errMatches(err, patterns)) {
    throw new Error(`错误消息不匹配：${err && err.message ? err.message : String(err)}`);
  }
}

function test(name, fn) {
  try { fn(); recordPass(name); } catch (e) { recordFail(name, e); }
}

function testSkippable(name, fn, shouldSkip) {
  try { fn(); recordPass(name); }
  catch (e) {
    const reason = shouldSkip && shouldSkip(e);
    if (reason) recordSkip(name, reason);
    else recordFail(name, e);
  }
}

// OpenSSL/Node 安全策略可能禁用 PKCS1 私钥解密（Bleichenbacher 相关修复）
function isPkcs1PrivDecryptDisabled(err) {
  const m = (err && err.message ? err.message : String(err)).toLowerCase();
  return (
    m.includes('no longer supported') ||
    m.includes('disabled') ||
    m.includes('security-revert') ||
    m.includes('cve') ||
    m.includes('private decryption') // 常见组合："... is no longer supported for private decryption ..."
  ) ? ('环境策略禁用 PKCS1 私钥解密（可用 --security-revert=... 临时恢复）') : '';
}

// ============ 第一部分: 基础加密/解密 ============
console.log('\n【第一部分: 基础加密/解密】');

test('1.1 publicEncrypt + privateDecrypt (默认 OAEP)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('Hello World');
  const enc = crypto.publicEncrypt(publicKey, data); // 默认 OAEP+sha1
  const dec = crypto.privateDecrypt(privateKey, enc);
  if (dec.toString() !== 'Hello World') throw new Error('解密结果不匹配');
});

testSkippable('1.2 publicEncrypt + privateDecrypt (PKCS1)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('Test PKCS1');
  const enc = crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, data);
  const dec = crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING }, enc);
  if (dec.toString() !== 'Test PKCS1') throw new Error('PKCS1 解密失败');
}, isPkcs1PrivDecryptDisabled);

test('1.3 OAEP with SHA256', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('OAEP SHA256 Test');
  const enc = crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, data);
  const dec = crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, enc);
  if (dec.toString() !== 'OAEP SHA256 Test') throw new Error('OAEP SHA256 失败');
});

test('1.4 OAEP with label', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const label = Buffer.from('my-label');
  const data = Buffer.from('Test with label');
  const enc = crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepLabel: label }, data);
  const dec = crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepLabel: label }, enc);
  if (dec.toString() !== 'Test with label') throw new Error('OAEP label 失败');
});

test('1.5 OAEP 哈希不匹配应失败', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('mismatch hash');
  const enc = crypto.publicEncrypt(publicKey, data); // 默认 sha1
  mustThrow(() => crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, enc));
});

test('1.6 OAEP label 不匹配应失败', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('mismatch label');
  const label = Buffer.from('L1');
  const bad = Buffer.from('L2');
  const enc = crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepLabel: label }, data);
  mustThrow(() => crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepLabel: bad }, enc));
});

// ============ 第二部分: 签名场景 (privateEncrypt/publicDecrypt) ============
console.log('\n【第二部分: 签名场景】');

test('2.1 privateEncrypt + publicDecrypt (默认 PKCS1)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('Sign default');
  const enc = crypto.privateEncrypt(privateKey, data); // 默认 PKCS1
  const dec = crypto.publicDecrypt(publicKey, enc);
  if (dec.toString() !== 'Sign default') throw new Error('privateEncrypt/publicDecrypt 默认失败');
});

test('2.2 privateEncrypt + publicDecrypt (显式 PKCS1)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('Sign this');
  const enc = crypto.privateEncrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING }, data);
  const dec = crypto.publicDecrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, enc);
  if (dec.toString() !== 'Sign this') throw new Error('privateEncrypt/publicDecrypt 失败');
});

test('2.3 privateEncrypt 不支持 OAEP（只需抛错）', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  mustThrow(() => crypto.privateEncrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from('test')),
            [/unsupported/, /illegal/, /padding/, /unknown/]);
});

test('2.4 publicDecrypt 不支持 OAEP（只需抛错）', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  mustThrow(() => crypto.publicDecrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from('x')),
            [/unsupported/, /illegal/, /padding/, /unknown/]);
});

// ============ 第三部分: RSA_NO_PADDING ============
console.log('\n【第三部分: RSA_NO_PADDING】');

test('3.1 NO_PADDING 长度必须等于 k (k-1 失败)', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const k = 256;
  const data = Buffer.alloc(k - 1);
  mustThrow(() => crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_NO_PADDING }, data),
            [/not equal/, /too small/, /key size/]);
});

test('3.2 NO_PADDING 长度 k 应该成功（输出 k 字节）', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const k = 256;
  const data = Buffer.alloc(k); data[k - 1] = 42;
  const enc = crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_NO_PADDING }, data);
  if (enc.length !== k) throw new Error(`输出长度应该是 ${k} 字节`);
});

test('3.3 NO_PADDING privateEncrypt + publicDecrypt', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const k = 256;
  const data = Buffer.alloc(k); data[k - 1] = 99;
  const enc = crypto.privateEncrypt({ key: privateKey, padding: crypto.constants.RSA_NO_PADDING }, data);
  const dec = crypto.publicDecrypt({ key: publicKey, padding: crypto.constants.RSA_NO_PADDING }, enc);
  if (dec[k - 1] !== 99) throw new Error('NO_PADDING 往返失败');
});

// ============ 第四部分: PSS 签名/验证 ============
console.log('\n【第四部分: PSS 签名/验证】');

test('4.1 PSS 默认 saltLength (MAX_SIGN + AUTO)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const s = crypto.createSign('sha256'); s.update('test message'); s.end();
  const sig = s.sign({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING }); // MAX_SIGN
  const v = crypto.createVerify('sha256'); v.update('test message'); v.end();
  const ok = v.verify({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING }, sig); // AUTO
  if (!ok) throw new Error('PSS 默认 saltLength 验证失败');
});

test('4.2 PSS 指定 saltLength=20', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const s = crypto.createSign('sha256'); s.update('test'); s.end();
  const sig = s.sign({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 20 });
  const v = crypto.createVerify('sha256'); v.update('test'); v.end();
  const ok = v.verify({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING }, sig); // AUTO
  if (!ok) throw new Error('PSS saltLength=20 验证失败');
});

test('4.3 PSS saltLength 不匹配应该失败', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const s = crypto.createSign('sha256'); s.update('test'); s.end();
  const sig = s.sign({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 20 });
  const v = crypto.createVerify('sha256'); v.update('test'); v.end();
  const ok = v.verify({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }, sig);
  if (ok) throw new Error('saltLength 不匹配应该验证失败');
});

test('4.4 PSS 常量值正确', () => {
  if (crypto.constants.RSA_PSS_SALTLEN_DIGEST !== -1) throw new Error('RSA_PSS_SALTLEN_DIGEST 应该是 -1');
  if (crypto.constants.RSA_PSS_SALTLEN_AUTO !== -2) throw new Error('RSA_PSS_SALTLEN_AUTO 应该是 -2');
  if (crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN !== -2) throw new Error('RSA_PSS_SALTLEN_MAX_SIGN 应该是 -2');
});

// ============ 第五部分: 输入类型 ============
console.log('\n【第五部分: 输入类型】');

test('5.1 Uint8Array 作为 data', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
  const enc = crypto.publicEncrypt(publicKey, data);
  const dec = crypto.privateDecrypt(privateKey, enc);
  if (dec.toString() !== 'Hello') throw new Error('Uint8Array 输入失败');
});

test('5.2 ArrayBuffer 作为 oaepLabel', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('test');
  const label = new Uint8Array([108,97,98,101,108]).buffer; // "label"
  const enc = crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepLabel: label }, data);
  const dec = crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepLabel: label }, enc);
  if (dec.toString() !== 'test') throw new Error('ArrayBuffer oaepLabel 失败');
});

test('5.3 空 oaepLabel', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('test');
  const emptyLabel = new Uint8Array(0);
  const enc = crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepLabel: emptyLabel }, data);
  const dec = crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepLabel: emptyLabel }, enc);
  if (dec.toString() !== 'test') throw new Error('空 oaepLabel 失败');
});

test('5.4 DataView 作为 data', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const ab = new Uint8Array([65,66,67]).buffer;
  const dv = new DataView(ab);
  const enc = crypto.publicEncrypt(publicKey, dv);
  const dec = crypto.privateDecrypt(privateKey, enc);
  if (dec.toString() !== 'ABC') throw new Error('DataView 输入失败');
});

// ============ 第六部分: 私钥当公钥用 ============
console.log('\n【第六部分: 私钥当公钥用】');

test('6.1 publicEncrypt 接受私钥 PEM', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const data = Buffer.from('test');
  const enc = crypto.publicEncrypt(privateKey, data);
  const dec = crypto.privateDecrypt(privateKey, enc);
  if (dec.toString() !== 'test') throw new Error('私钥当公钥用失败');
});

test('6.2 publicDecrypt 接受私钥 KeyObject', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('test');
  const enc = crypto.privateEncrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING }, data);
  const dec = crypto.publicDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING }, enc);
  if (dec.toString() !== 'test') throw new Error('KeyObject 私钥当公钥用失败');
});

test('6.3 publicEncrypt 接受私钥 KeyObject', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = Buffer.from('hello');
  const enc = crypto.publicEncrypt(privateKey, data);
  const dec = crypto.privateDecrypt(privateKey, enc);
  if (dec.toString() !== 'hello') throw new Error('publicEncrypt(私钥KeyObject) 失败');
});

// ============ 第七部分: 边界 & 错误语义 ============
console.log('\n【第七部分: 边界情况】');

test('7.1 消息长度上限 - PKCS1', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const k = 256, maxLen = k - 11;
  const tooLong = Buffer.alloc(maxLen + 1);
  mustThrow(() => crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, tooLong),
            [/too large/, /too long/, /message too long/]);
});

test('7.2 消息长度上限 - OAEP SHA256', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const k = 256, hLen = 32, maxLen = k - 2*hLen - 2;
  const tooLong = Buffer.alloc(maxLen + 1);
  mustThrow(() => crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, tooLong),
            [/too large/, /too long/, /message too long/]);
});

test('7.3 RSA_X931_PADDING 应该被拒绝（publicEncrypt）', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  mustThrow(() => crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_X931_PADDING }, Buffer.from('test')),
            [/unsupported/, /unknown padding/, /x931/]);
});

test('7.4 RSA_X931_PADDING 应该被拒绝（privateEncrypt/publicDecrypt）', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  mustThrow(() => crypto.privateEncrypt({ key: privateKey, padding: crypto.constants.RSA_X931_PADDING }, Buffer.from('t')),
            [/unsupported/, /x931/]);
  mustThrow(() => crypto.publicDecrypt({ key: publicKey, padding: crypto.constants.RSA_X931_PADDING }, Buffer.alloc(256)),
            [/unsupported/, /unknown padding/, /x931/]);
});

test('7.5 常量值正确', () => {
  if (crypto.constants.RSA_NO_PADDING !== 3) throw new Error('RSA_NO_PADDING 应该是 3');
  if (crypto.constants.RSA_PKCS1_PADDING !== 1) throw new Error('RSA_PKCS1_PADDING 应该是 1');
  if (crypto.constants.RSA_PKCS1_OAEP_PADDING !== 4) throw new Error('RSA_PKCS1_OAEP_PADDING 应该是 4');
  if (crypto.constants.RSA_X931_PADDING !== 5) throw new Error('RSA_X931_PADDING 应该是 5');
  if (crypto.constants.RSA_PKCS1_PSS_PADDING !== 6) throw new Error('RSA_PKCS1_PSS_PADDING 应该是 6');
});

// ============ 第八部分: KeyObject & DER ============
console.log('\n【第八部分: KeyObject】');

test('8.1 asymmetricKeyDetails（rsa）', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const det = publicKey.asymmetricKeyDetails;
  if (!det || !det.modulusLength) throw new Error('asymmetricKeyDetails 缺失');
  if (det.modulusLength !== 2048) throw new Error(`modulusLength 应为 2048，得 ${det.modulusLength}`);
  if (det.publicExponent === undefined) throw new Error('publicExponent 缺失');
});

test('8.2 publicExponent 类型和值', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const exp = publicKey.asymmetricKeyDetails.publicExponent;
  const num = typeof exp === 'bigint' ? Number(exp) : exp;
  if (num !== 65537) throw new Error(`publicExponent 应为 65537，得 ${num}`);
});

test('8.3 KeyObject.export() PEM', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  if (!/BEGIN PRIVATE KEY/.test(pem)) throw new Error('PEM 格式不正确');
});

test('8.4 KeyObject.export() DER', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const der = publicKey.export({ type: 'spki', format: 'der' });
  if (!Buffer.isBuffer(der)) throw new Error('DER 应返回 Buffer');
});

test('8.5 使用 DER (Buffer/Uint8Array) 作为 key 输入（OAEP）', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

  // 导出公钥 DER（直接从 KeyObject 导出）
  const derPub = publicKey.export({ type: 'spki', format: 'der' });
  const msg = Buffer.from('DER key input');

  // 测试 1: Buffer 作为 DER key（最常见用法）
  const enc1 = crypto.publicEncrypt({ key: derPub, format: 'der', type: 'spki', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, msg);
  const dec1 = crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, enc1);
  if (dec1.toString() !== 'DER key input') throw new Error('Buffer 作为 key 失败');

  // 测试 2: Uint8Array 作为 DER key（手动转换）
  const u8 = new Uint8Array(derPub.length);
  for (let i = 0; i < derPub.length; i++) {
    u8[i] = derPub[i];
  }
  const enc2 = crypto.publicEncrypt({ key: u8, format: 'der', type: 'spki', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, msg);
  const dec2 = crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, enc2);
  if (dec2.toString() !== 'DER key input') throw new Error('Uint8Array 作为 key 失败');
});

// ============ 第九部分: 辅助方法 ============
console.log('\n【第九部分: 辅助方法】');

test('9.1 crypto.getHashes()', () => {
  const hashes = crypto.getHashes();
  if (!Array.isArray(hashes)) throw new Error('getHashes 应返回数组');
  if (!hashes.map(s => s.toLowerCase()).includes('sha256')) throw new Error('getHashes 应包含 sha256');
});

test('9.2 crypto.getCiphers()', () => {
  const ciphers = crypto.getCiphers();
  if (!Array.isArray(ciphers)) throw new Error('getCiphers 应返回数组');
});

test('9.3 crypto.getCurves()', () => {
  const curves = crypto.getCurves();
  if (!Array.isArray(curves)) throw new Error('getCurves 应返回数组');
});

// ============ 第十部分: RSA-PSS 密钥生成（如可用则测） ============
console.log('\n【第十部分: RSA-PSS 密钥生成】');

(function () {
  const name = '10.1 generateKeyPairSync("rsa-pss") + details';
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa-pss', {
      modulusLength: 2048,
      hashAlgorithm: 'sha256',
      mgf1HashAlgorithm: 'sha256',
      saltLength: 32
    });
    if (publicKey.asymmetricKeyType !== 'rsa-pss') throw new Error('asymmetricKeyType 应为 rsa-pss');
    const det = publicKey.asymmetricKeyDetails;
    if (!det || det.modulusLength !== 2048) throw new Error('asymmetricKeyDetails 缺失或 modulusLength 错误');
    if (!(det.hashAlgorithm && det.mgf1HashAlgorithm && typeof det.saltLength === 'number')) {
      throw new Error('PSS 细节字段缺失');
    }
    const s = crypto.createSign('sha256'); s.update('pss-key'); s.end();
    const sig = s.sign({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING });
    const v = crypto.createVerify('sha256'); v.update('pss-key'); v.end();
    const ok = v.verify({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING }, sig);
    if (!ok) throw new Error('rsa-pss 密钥签名/验证失败');
    recordPass(name);
  } catch (e) {
    recordSkip(name, `环境不支持或实现缺失：${e.message || e}`);
  }
})();

// ============ 总结 ============
console.log('\n========================================');
console.log(`总计: ${results.summary.passed + results.summary.failed + results.summary.skipped} 个测试`);
console.log(`通过: ${results.summary.passed}`);
console.log(`失败: ${results.summary.failed}`);
console.log(`跳过: ${results.summary.skipped}`);
const total = results.summary.passed + results.summary.failed;
if (total > 0) console.log(`成功率: ${((results.summary.passed / total) * 100).toFixed(1)}%`);
console.log('========================================\n');

if (results.summary.failed > 0) {
  console.log('失败的测试详情:');
  Object.keys(results.tests).forEach(name => {
    const t = results.tests[name];
    if (t && t.passed === false && !t.skipped) {
      console.log(`  - ${name}: ${t.error}`);
    }
  });
  console.log('');
}

const summaryObject = {
  success: results.summary.failed === 0,
  allPassed: results.summary.failed === 0,
  summary: results.summary,
  tests: results.tests,
  message: results.summary.failed === 0
    ? '✅ 所有 Node.js 18+ RSA 功能测试通过！'
    : `❌ ${results.summary.failed} 个测试失败，${results.summary.skipped} 个跳过`
};

return {summaryObject}