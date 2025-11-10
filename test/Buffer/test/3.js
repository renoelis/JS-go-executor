// test-hash-no-assert.js
const crypto = require('node:crypto');

let passed = 0;
let failed = 0;
function ok(name, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`✅ ${name}${extra ? ' — ' + extra : ''}`);
  } else {
    failed++;
    console.error(`❌ ${name}${extra ? ' — ' + extra : ''}`);
  }
}

console.log('Node version:', process.version);

// 1) digest() 默认 Buffer；指定编码返回字符串
(function () {
  const hBuf = crypto.createHash('sha256').update('hello').digest();
  const hHex = crypto.createHash('sha256').update('hello').digest('hex');
  const hB64 = crypto.createHash('sha256').update('hello').digest('base64');
  const hLat = crypto.createHash('sha256').update('hello').digest('latin1');

  ok('digest() 默认返回 Buffer', Buffer.isBuffer(hBuf));
  ok("digest('hex') 返回字符串", typeof hHex === 'string');
  ok("digest('base64') 返回字符串", typeof hB64 === 'string');
  ok("digest('latin1') 返回字符串", typeof hLat === 'string');
})();

// 2) 多种输入类型一致性
(function () {
  const buf = Buffer.from('hello', 'utf8');
  const u8 = new Uint8Array(buf);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const dv = new DataView(ab);

  const hStr = crypto.createHash('sha256').update('hello', 'utf8').digest('hex');
  const hBuf = crypto.createHash('sha256').update(buf).digest('hex');
  const hU8  = crypto.createHash('sha256').update(u8).digest('hex');
  const hDV  = crypto.createHash('sha256').update(dv).digest('hex');

  const hexInput = Buffer.from('hello', 'utf8').toString('hex');
  const hHexIn = crypto.createHash('sha256').update(hexInput, 'hex').digest('hex');

  ok('字符串 vs Buffer 一致', hStr === hBuf);
  ok('Buffer vs Uint8Array 一致', hBuf === hU8);
  ok('Uint8Array vs DataView 一致', hU8 === hDV);
  ok("以 'hex' 编码字符串作为输入一致", hHexIn === hBuf);
})();

// 3) hash.copy() 复制中间状态 & 已完成后复制抛错
(function () {
  const h = crypto.createHash('sha256');
  h.update('part1');
  const snap1 = h.copy().digest('hex');
  h.update('part2');
  const snap2 = h.copy().digest('hex');
  h.update('part3');
  const final = h.digest('hex');

  ok('copy() 快照1 与 快照2 不同（通常如此）', snap1 !== snap2);
  ok('快照2 与最终结果不同（通常如此）', snap2 !== final);

  let threw = false;
  try { h.copy(); } catch (e) { threw = true; }
  ok('已 digest() 的 Hash 再 copy() 会抛错', threw === true);
})();

// 4) getHashes() 至少包含常见算法
(function () {
  const hashes = crypto.getHashes().map(s => s.toLowerCase());
  const must = ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'];
  const missing = must.filter(n => !hashes.includes(n));
  ok('getHashes() 包含常见 MD5/SHA 家族', missing.length === 0,
     missing.length ? `缺少: ${missing.join(', ')}` : '');
  console.log('可用摘要算法数量:', hashes.length);
  console.log('示例列表:', hashes.slice(0, 53));
})();

// 5) （可选）别名 rsa-sha256 与 sha256 等价（若存在）
(function () {
  const hashes = crypto.getHashes().map(s => s.toLowerCase());
  if (hashes.includes('rsa-sha256')) {
    const a = crypto.createHash('sha256').update('hello').digest('hex');
    const b = crypto.createHash('rsa-sha256').update('hello').digest('hex');
    ok("存在时 'rsa-sha256' 与 'sha256' 等价", a === b);
  } else {
    console.log('ℹ️ 本环境未列出 rsa-sha256，跳过该检查');
  }
})();

console.log(`\n结果总结：${passed} 通过，${failed} 失败`);
if (failed === 0) {
  console.log('All tests passed ✅');
} else {
  console.log('Some tests failed ❗请检查上面的失败项');
}
