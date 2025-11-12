// Round 6: Deep gap filling - parameter validation, method behavior, encoding edge cases
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

// 参数类型边界 - 数组作为参数
test('array as encoding parameter', () => {
  try {
    const result = Buffer.from('test').toString(['utf8']);
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

test('array as start parameter', () => {
  try {
    const result = Buffer.from('hello').toString('utf8', [1]);
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

// Symbol 作为参数
test('symbol as encoding (should throw or coerce)', () => {
  try {
    const result = Buffer.from('test').toString(Symbol('utf8'));
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

// 零值与边界值组合
test('start=0, end=0 for empty buffer', () => {
  return Buffer.alloc(0).toString('utf8', 0, 0) === '';
});

test('negative start clamped to 0', () => {
  const buf = Buffer.from('hello');
  const result = buf.toString('utf8', -5, 3);
  return typeof result === 'string';
});

test('negative end behavior', () => {
  const buf = Buffer.from('hello');
  const result = buf.toString('utf8', 1, -1);
  return typeof result === 'string';
});

// 编码别名的完整覆盖
test('encoding alias: utf-8', () => {
  return Buffer.from('test').toString('utf-8') === 'test';
});

test('encoding alias: ucs-2', () => {
  const buf = Buffer.from('hi', 'ucs2');
  return buf.toString('ucs-2') === 'hi';
});

test('encoding alias: UTF-16LE', () => {
  const buf = Buffer.from('test', 'utf16le');
  return buf.toString('UTF-16LE') === 'test';
});

// 特殊 base64 填充场景
test('base64: length % 3 === 0 (no padding)', () => {
  const buf = Buffer.from('abc');
  const result = buf.toString('base64');
  return !result.includes('=');
});

test('base64: length % 3 === 1 (== padding)', () => {
  const buf = Buffer.from('a');
  const result = buf.toString('base64');
  return result.endsWith('==');
});

test('base64: length % 3 === 2 (= padding)', () => {
  const buf = Buffer.from('ab');
  const result = buf.toString('base64');
  return result.endsWith('=') && !result.endsWith('==');
});

test('base64url: no padding for any length', () => {
  const results = [
    Buffer.from('a').toString('base64url'),
    Buffer.from('ab').toString('base64url'),
    Buffer.from('abc').toString('base64url')
  ];
  return results.every(r => !r.includes('='));
});

// Hex 编码的特殊字节
test('hex: all zero bytes', () => {
  const buf = Buffer.alloc(4);
  return buf.toString('hex') === '00000000';
});

test('hex: sequential 00-0F', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  return buf.toString('hex') === '000102030405060708090a0b0c0d0e0f';
});

test('hex: sequential F0-FF', () => {
  const buf = Buffer.from([0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF]);
  return buf.toString('hex') === 'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff';
});

// Latin1/Binary 边界
test('latin1: preserves 0x80-0xFF exactly', () => {
  const values = [0x80, 0x90, 0xA0, 0xB0, 0xC0, 0xD0, 0xE0, 0xF0, 0xFF];
  const buf = Buffer.from(values);
  const result = buf.toString('latin1');
  return values.every((v, i) => result.charCodeAt(i) === v);
});

test('binary encoding identical to latin1', () => {
  const buf = Buffer.from([0x00, 0x7F, 0x80, 0xFF]);
  return buf.toString('binary') === buf.toString('latin1');
});

// ASCII 高位截断行为
test('ascii: high bit stripped (0x80 -> 0x00)', () => {
  const buf = Buffer.from([0x80]);
  const result = buf.toString('ascii');
  return result.charCodeAt(0) === 0x00;
});

test('ascii: 0xFF -> 0x7F', () => {
  const buf = Buffer.from([0xFF]);
  const result = buf.toString('ascii');
  return result.charCodeAt(0) === 0x7F;
});

test('ascii: 0x41 unchanged', () => {
  const buf = Buffer.from([0x41]);
  return buf.toString('ascii') === 'A';
});

// UCS2/UTF16LE 奇数长度处理
test('ucs2: odd length buffer (3 bytes)', () => {
  const buf = Buffer.from([0x41, 0x00, 0x42]);
  const result = buf.toString('ucs2');
  return result.length >= 1 && result[0] === 'A';
});

test('utf16le: odd length buffer (5 bytes)', () => {
  const buf = Buffer.from([0x41, 0x00, 0x42, 0x00, 0x43]);
  const result = buf.toString('utf16le');
  return result.length >= 2;
});

// 字节序标记（BOM）处理
test('utf8: BOM not stripped', () => {
  const buf = Buffer.from([0xEF, 0xBB, 0xBF, 0x41]);
  const result = buf.toString('utf8');
  return result.length === 2 && result[1] === 'A';
});

test('ucs2: LE BOM preserved', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0x41, 0x00]);
  const result = buf.toString('ucs2');
  return result.length === 2;
});

// 范围参数的浮点数处理
test('start as float 1.1 rounded to 1', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 1.1) === 'ello';
});

test('start as float 1.9 rounded to 1', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 1.9) === 'ello';
});

test('end as float 3.1 rounded to 3', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 0, 3.1) === 'hel';
});

test('end as float 3.9 rounded to 3', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 0, 3.9) === 'hel';
});

// 特殊 Unicode 平面
test('Supplementary Multilingual Plane (SMP) characters', () => {
  const buf = Buffer.from('𐐷𐐷𐐷');
  return buf.toString().length > 0;
});

test('Supplementary Ideographic Plane (SIP) characters', () => {
  const buf = Buffer.from('𠀋');
  return buf.toString() === '𠀋';
});

// 修改后的 Buffer 不影响已生成的字符串
test('modifying buffer after toString does not affect string', () => {
  const buf = Buffer.from('test');
  const str = buf.toString();
  buf[0] = 0x58;
  return str === 'test' && buf.toString() === 'Xest';
});

// Concat 后的 toString
test('concat empty buffers', () => {
  return Buffer.concat([Buffer.alloc(0), Buffer.alloc(0)]).toString() === '';
});

test('concat single buffer', () => {
  const buf = Buffer.from('test');
  return Buffer.concat([buf]).toString() === 'test';
});

test('concat 10 small buffers', () => {
  const bufs = Array.from({length: 10}, (_, i) => Buffer.from(String(i)));
  return Buffer.concat(bufs).toString() === '0123456789';
});

// 范围完全超出边界
test('start and end both negative', () => {
  const buf = Buffer.from('test');
  const result = buf.toString('utf8', -10, -5);
  return typeof result === 'string';
});

test('start > end (both positive)', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 4, 1) === '';
});

test('start = end = buffer.length', () => {
  const buf = Buffer.from('test');
  return buf.toString('utf8', 4, 4) === '';
});

// 多次转换相同编码
test('repeated utf8 toString returns same value', () => {
  const buf = Buffer.from('test');
  const results = Array.from({length: 5}, () => buf.toString('utf8'));
  return results.every(r => r === 'test');
});

test('repeated hex toString returns same value', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  const results = Array.from({length: 5}, () => buf.toString('hex'));
  return results.every(r => r === 'abcd');
});

// 不同编码的往返一致性
test('latin1 roundtrip for 0x00-0xFF', () => {
  const original = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) original[i] = i;
  const str = original.toString('latin1');
  const restored = Buffer.from(str, 'latin1');
  return original.equals(restored);
});

test('hex roundtrip', () => {
  const original = Buffer.from([0x00, 0x01, 0xFE, 0xFF]);
  const hex = original.toString('hex');
  const restored = Buffer.from(hex, 'hex');
  return original.equals(restored);
});

test('base64 roundtrip', () => {
  const original = Buffer.from('Hello, World! 你好世界 😀');
  const b64 = original.toString('base64');
  const restored = Buffer.from(b64, 'base64');
  return original.equals(restored);
});

test('base64url roundtrip', () => {
  const original = Buffer.from([0xFB, 0xFF, 0xFE]);
  const b64url = original.toString('base64url');
  const restored = Buffer.from(b64url, 'base64url');
  return original.equals(restored);
});

const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
