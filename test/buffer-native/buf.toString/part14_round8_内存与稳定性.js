// Round 8: Memory patterns, allocation edge cases, encoding stability
const { Buffer } = require('buffer');
const tests = [];
function test(n, f) {
  try {
    const p = f();
    tests.push({name: n, status: p ? '✅' : '❌', passed: p});
    console.log((p ? '✅' : '❌') + ' ' + n);
  } catch(e) {
    tests.push({name: n, status: '❌', passed: false, error: e.message});
    console.log('❌ ' + n + ': ' + e.message);
  }
}

// 内存分配模式
test('allocUnsafe then toString (uninitialized)', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0x61);
  return buf.toString() === 'aaaaa';
});

test('allocUnsafeSlow then toString', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(0x62);
  return buf.toString() === 'bbbbb';
});

test('alloc with fill string', () => {
  const buf = Buffer.alloc(10, 'abc');
  return buf.toString().startsWith('abc');
});

test('alloc with fill buffer', () => {
  const fill = Buffer.from([0x41, 0x42]);
  const buf = Buffer.alloc(6, fill);
  return buf.toString() === 'ABABAB';
});

test('alloc with single byte fill', () => {
  const buf = Buffer.alloc(5, 0x41);
  return buf.toString() === 'AAAAA';
});

// 视图和切片的内存共享
test('slice shares memory - modify original affects slice toString', () => {
  const original = Buffer.from('hello');
  const slice = original.slice(0, 3);
  original[0] = 0x58;
  return slice.toString() === 'Xel';
});

test('subarray shares memory - modify original affects subarray toString', () => {
  const original = Buffer.from('hello');
  const sub = original.subarray(0, 3);
  original[1] = 0x41;
  return sub.toString() === 'hAl';
});

test('Buffer.from creates independent copy', () => {
  const original = Buffer.from('test');
  const copy = Buffer.from(original);
  original[0] = 0x58;
  return copy.toString() === 'test' && original.toString() === 'Xest';
});

// 大 Buffer 的不同模式
test('8KB buffer filled with single char', () => {
  const buf = Buffer.alloc(8192, 0x61);
  const result = buf.toString();
  return result.length === 8192 && result[0] === 'a' && result[8191] === 'a';
});

test('10MB hex encoding', () => {
  const size = 10 * 1024 * 1024;
  const buf = Buffer.alloc(size, 0xAB);
  const result = buf.toString('hex');
  return result.length === size * 2 && result.substring(0, 4) === 'abab';
});

test('2MB base64 encoding', () => {
  const size = 2 * 1024 * 1024;
  const buf = Buffer.alloc(size, 0x41);
  const result = buf.toString('base64');
  return result.length > 0 && typeof result === 'string';
});

// 编码稳定性 - 多次编码同一数据
test('repeated hex encoding stability', () => {
  const buf = Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF]);
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(buf.toString('hex'));
  }
  return results.every(r => r === '0123456789abcdef');
});

test('repeated base64 encoding stability', () => {
  const buf = Buffer.from('test data for stability');
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(buf.toString('base64'));
  }
  const first = results[0];
  return results.every(r => r === first);
});

test('repeated utf8 encoding stability with emoji', () => {
  const buf = Buffer.from('😀😃😄😁');
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(buf.toString('utf8'));
  }
  return results.every(r => r === '😀😃😄😁');
});

// Buffer 池化行为（小 Buffer）
test('small buffer (< 4KB) allocation and toString', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.from('small');
    buffers.push(buf.toString());
  }
  return buffers.every(s => s === 'small');
});

test('many small allocations toString independently', () => {
  const results = [];
  for (let i = 0; i < 50; i++) {
    const buf = Buffer.from(String(i));
    results.push(buf.toString());
  }
  return results.length === 50 && results[0] === '0' && results[49] === '49';
});

// 写入后的 toString
test('write utf8 then toString', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 0, 'utf8');
  return buf.toString('utf8', 0, 5) === 'hello';
});

test('write hex then toString', () => {
  const buf = Buffer.alloc(4);
  buf.write('abcd', 0, 'hex');
  return buf.toString('hex') === 'abcd0000';
});

test('write base64 then toString', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('aGVsbG8=', 0, 'base64');
  return buf.toString('utf8', 0, written) === 'hello';
});

test('write latin1 then toString', () => {
  const buf = Buffer.alloc(5);
  buf.write('test', 0, 'latin1');
  return buf.toString('latin1', 0, 4) === 'test';
});

// Copy 操作后的 toString
test('copy then toString source', () => {
  const src = Buffer.from('source');
  const dst = Buffer.alloc(6);
  src.copy(dst);
  return src.toString() === 'source' && dst.toString() === 'source';
});

test('copy with offset then toString', () => {
  const src = Buffer.from('abc');
  const dst = Buffer.alloc(6, 0x2D);
  src.copy(dst, 2);
  return dst.toString() === '--abc-';
});

test('copy partial then toString', () => {
  const src = Buffer.from('hello');
  const dst = Buffer.alloc(3);
  src.copy(dst, 0, 1, 4);
  return dst.toString() === 'ell';
});

// Fill 操作后的 toString
test('fill with string then toString', () => {
  const buf = Buffer.alloc(10);
  buf.fill('abc');
  return buf.toString().startsWith('abc');
});

test('fill with buffer then toString', () => {
  const buf = Buffer.alloc(8);
  buf.fill(Buffer.from('ab'));
  return buf.toString() === 'abababab';
});

test('fill partial range then toString', () => {
  const buf = Buffer.alloc(10, 0x2D);
  buf.fill('abc', 2, 8);
  return buf.toString().substring(2, 8).startsWith('abc');
});

test('fill with encoding then toString', () => {
  const buf = Buffer.alloc(6);
  buf.fill('414243', 'hex');
  return buf.toString() === 'ABCABC';
});

// 交叉编码测试
test('write utf8 read hex', () => {
  const buf = Buffer.alloc(4);
  buf.write('AB', 0, 'utf8');
  return buf.toString('hex').startsWith('4142');
});

test('write hex read utf8', () => {
  const buf = Buffer.alloc(5);
  buf.write('4142434445', 'hex');
  return buf.toString('utf8') === 'ABCDE';
});

test('write base64 read utf8', () => {
  const buf = Buffer.alloc(10);
  buf.write('dGVzdA==', 'base64');
  return buf.toString('utf8', 0, 4) === 'test';
});

test('write utf8 read base64', () => {
  const buf = Buffer.from('hello');
  return buf.toString('base64') === 'aGVsbG8=';
});

// 零字节处理
test('single zero byte toString', () => {
  const buf = Buffer.from([0x00]);
  return buf.toString().length === 1 && buf.toString().charCodeAt(0) === 0;
});

test('multiple zero bytes toString', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00]);
  const result = buf.toString();
  return result.length === 3 && result === '\0\0\0';
});

test('zero bytes in hex', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.toString('hex') === '0000';
});

test('zero bytes in base64', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00]);
  return buf.toString('base64') === 'AAAA';
});

// 边界对齐测试
test('aligned 16-byte boundary', () => {
  const buf = Buffer.alloc(16, 0x41);
  return buf.toString() === 'A'.repeat(16);
});

test('aligned 64-byte boundary', () => {
  const buf = Buffer.alloc(64, 0x42);
  return buf.toString() === 'B'.repeat(64);
});

test('unaligned 17-byte buffer', () => {
  const buf = Buffer.alloc(17, 0x43);
  return buf.toString() === 'C'.repeat(17);
});

test('unaligned 63-byte buffer', () => {
  const buf = Buffer.alloc(63, 0x44);
  return buf.toString() === 'D'.repeat(63);
});

// 动态内容 toString
test('incrementing byte values', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10; i++) buf[i] = 0x41 + i;
  return buf.toString() === 'ABCDEFGHIJ';
});

test('decrementing byte values', () => {
  const buf = Buffer.alloc(5);
  for (let i = 0; i < 5; i++) buf[i] = 0x45 - i;
  return buf.toString() === 'EDCBA';
});

// 特殊 UTF-8 序列
test('2-byte UTF-8 character (€)', () => {
  const buf = Buffer.from('€');
  return buf.toString() === '€' && buf.length === 3;
});

test('3-byte UTF-8 character (中)', () => {
  const buf = Buffer.from('中');
  return buf.toString() === '中' && buf.length === 3;
});

test('4-byte UTF-8 character (𝐀)', () => {
  const buf = Buffer.from('𝐀');
  return buf.toString() === '𝐀' && buf.length === 4;
});

const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
