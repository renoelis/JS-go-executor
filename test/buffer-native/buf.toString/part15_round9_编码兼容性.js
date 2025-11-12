// Round 9: Edge encodings, legacy compatibility, Node.js v25 specific behaviors
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

// Node.js v25 编码支持确认
test('utf8 encoding supported', () => {
  return Buffer.from('test').toString('utf8') === 'test';
});

test('hex encoding supported', () => {
  return Buffer.from([0xAB]).toString('hex') === 'ab';
});

test('base64 encoding supported', () => {
  return typeof Buffer.from('test').toString('base64') === 'string';
});

test('base64url encoding supported', () => {
  return typeof Buffer.from('test').toString('base64url') === 'string';
});

test('ascii encoding supported', () => {
  return Buffer.from('test').toString('ascii') === 'test';
});

test('latin1 encoding supported', () => {
  return Buffer.from('test').toString('latin1') === 'test';
});

test('binary encoding supported (legacy alias)', () => {
  return Buffer.from('test').toString('binary') === 'test';
});

test('ucs2 encoding supported', () => {
  return Buffer.from('hi', 'ucs2').toString('ucs2') === 'hi';
});

test('utf16le encoding supported', () => {
  return Buffer.from('hi', 'utf16le').toString('utf16le') === 'hi';
});

// 编码名称大小写不敏感
test('UTF8 uppercase', () => {
  return Buffer.from('test').toString('UTF8') === 'test';
});

test('Utf8 mixed case', () => {
  return Buffer.from('test').toString('Utf8') === 'test';
});

test('HEX uppercase', () => {
  return Buffer.from([0xAB]).toString('HEX') === 'ab';
});

test('Base64 mixed case', () => {
  return typeof Buffer.from('test').toString('Base64') === 'string';
});

test('ASCII uppercase', () => {
  return Buffer.from('test').toString('ASCII') === 'test';
});

test('Latin1 mixed case', () => {
  return Buffer.from('test').toString('Latin1') === 'test';
});

test('UCS2 uppercase', () => {
  return Buffer.from('hi', 'ucs2').toString('UCS2') === 'hi';
});

test('UTF16LE mixed case', () => {
  return Buffer.from('hi', 'utf16le').toString('Utf16LE') === 'hi';
});

// 编码别名的完整支持
test('utf-8 with dash', () => {
  return Buffer.from('test').toString('utf-8') === 'test';
});

test('ucs-2 with dash', () => {
  return Buffer.from('hi', 'ucs2').toString('ucs-2') === 'hi';
});

test('utf-16le with dash', () => {
  return Buffer.from('hi', 'utf16le').toString('utf-16le') === 'hi';
});

// 不支持的编码行为
test('unsupported encoding "utf32" throws or defaults', () => {
  try {
    const result = Buffer.from('test').toString('utf32');
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

test('unsupported encoding "iso-8859-1" may map to latin1 or throw', () => {
  try {
    const result = Buffer.from('test').toString('iso-8859-1');
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

test('unsupported encoding "windows-1252" throws or defaults', () => {
  try {
    const result = Buffer.from('test').toString('windows-1252');
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

test('numeric encoding throws or defaults', () => {
  try {
    const result = Buffer.from('test').toString(123);
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

// 空字符串编码名称
test('empty string encoding throws or defaults to utf8', () => {
  try {
    const result = Buffer.from('test').toString('');
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

// 特殊字符的编码正确性
test('newline in utf8', () => {
  const buf = Buffer.from('\n');
  return buf.toString() === '\n' && buf.length === 1;
});

test('tab in utf8', () => {
  const buf = Buffer.from('\t');
  return buf.toString() === '\t' && buf.length === 1;
});

test('carriage return in utf8', () => {
  const buf = Buffer.from('\r');
  return buf.toString() === '\r' && buf.length === 1;
});

test('backspace in utf8', () => {
  const buf = Buffer.from('\b');
  return buf.toString() === '\b' && buf.length === 1;
});

test('form feed in utf8', () => {
  const buf = Buffer.from('\f');
  return buf.toString() === '\f' && buf.length === 1;
});

test('vertical tab in utf8', () => {
  const buf = Buffer.from('\v');
  return buf.toString() === '\v' && buf.length === 1;
});

test('bell character in utf8', () => {
  const buf = Buffer.from('\x07');
  return buf.toString() === '\x07' && buf.length === 1;
});

test('escape character in utf8', () => {
  const buf = Buffer.from('\x1B');
  return buf.toString() === '\x1B' && buf.length === 1;
});

// ASCII 控制字符范围
test('ASCII NUL (0x00)', () => {
  const buf = Buffer.from([0x00]);
  return buf.toString('ascii').charCodeAt(0) === 0;
});

test('ASCII SOH (0x01)', () => {
  const buf = Buffer.from([0x01]);
  return buf.toString('ascii').charCodeAt(0) === 1;
});

test('ASCII DEL (0x7F)', () => {
  const buf = Buffer.from([0x7F]);
  return buf.toString('ascii').charCodeAt(0) === 0x7F;
});

// Latin1 扩展字符
test('Latin1 non-breaking space (0xA0)', () => {
  const buf = Buffer.from([0xA0]);
  return buf.toString('latin1').charCodeAt(0) === 0xA0;
});

test('Latin1 copyright sign (0xA9)', () => {
  const buf = Buffer.from([0xA9]);
  return buf.toString('latin1').charCodeAt(0) === 0xA9;
});

test('Latin1 registered sign (0xAE)', () => {
  const buf = Buffer.from([0xAE]);
  return buf.toString('latin1').charCodeAt(0) === 0xAE;
});

test('Latin1 degree sign (0xB0)', () => {
  const buf = Buffer.from([0xB0]);
  return buf.toString('latin1').charCodeAt(0) === 0xB0;
});

test('Latin1 micro sign (0xB5)', () => {
  const buf = Buffer.from([0xB5]);
  return buf.toString('latin1').charCodeAt(0) === 0xB5;
});

test('Latin1 ÿ (0xFF)', () => {
  const buf = Buffer.from([0xFF]);
  return buf.toString('latin1').charCodeAt(0) === 0xFF;
});

// Hex 编码的特定模式
test('hex: all F', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  return buf.toString('hex') === 'ffffff';
});

test('hex: alternating 0 and F', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0xFF]);
  return buf.toString('hex') === '00ff00ff';
});

test('hex: palindrome bytes', () => {
  const buf = Buffer.from([0x12, 0x34, 0x43, 0x21]);
  return buf.toString('hex') === '12344321';
});

// Base64 填充验证
test('base64: 1 byte padding', () => {
  const buf = Buffer.from('a');
  const b64 = buf.toString('base64');
  return b64.length === 4 && b64.endsWith('==');
});

test('base64: 2 bytes padding', () => {
  const buf = Buffer.from('ab');
  const b64 = buf.toString('base64');
  return b64.length === 4 && b64.endsWith('=') && !b64.endsWith('==');
});

test('base64: 3 bytes no padding', () => {
  const buf = Buffer.from('abc');
  const b64 = buf.toString('base64');
  return b64.length === 4 && !b64.includes('=');
});

test('base64url: no padding for 1 byte', () => {
  const buf = Buffer.from('a');
  const b64url = buf.toString('base64url');
  return !b64url.includes('=');
});

test('base64url: no padding for 2 bytes', () => {
  const buf = Buffer.from('ab');
  const b64url = buf.toString('base64url');
  return !b64url.includes('=');
});

test('base64url: URL-safe characters', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  const b64url = buf.toString('base64url');
  return b64url.includes('-') || b64url.includes('_');
});

// UCS2/UTF16LE 字节序
test('ucs2: little-endian byte order', () => {
  const buf = Buffer.from([0x41, 0x00, 0x42, 0x00]);
  return buf.toString('ucs2') === 'AB';
});

test('utf16le: little-endian byte order', () => {
  const buf = Buffer.from([0x41, 0x00, 0x42, 0x00]);
  return buf.toString('utf16le') === 'AB';
});

test('ucs2: Chinese characters', () => {
  const str = '你好';
  const buf = Buffer.from(str, 'ucs2');
  return buf.toString('ucs2') === str;
});

test('utf16le: emoji (surrogate pairs)', () => {
  const str = '😀';
  const buf = Buffer.from(str, 'utf16le');
  return buf.toString('utf16le') === str;
});

// 极端 UTF-8 边界
test('UTF-8: 1-byte boundary (0x7F)', () => {
  const buf = Buffer.from([0x7F]);
  return buf.toString('utf8').charCodeAt(0) === 0x7F;
});

test('UTF-8: 2-byte start (0xC2)', () => {
  const buf = Buffer.from([0xC2, 0xA0]);
  return buf.toString('utf8').charCodeAt(0) === 0xA0;
});

test('UTF-8: 3-byte start (0xE0)', () => {
  const buf = Buffer.from([0xE0, 0xA4, 0x85]);
  return buf.toString('utf8').length === 1;
});

test('UTF-8: 4-byte start (0xF0)', () => {
  const buf = Buffer.from([0xF0, 0x9F, 0x98, 0x80]);
  return buf.toString('utf8') === '😀';
});

// 往返一致性验证
test('roundtrip: utf8 Chinese', () => {
  const original = '这是一个测试';
  const buf = Buffer.from(original, 'utf8');
  return buf.toString('utf8') === original;
});

test('roundtrip: utf8 emoji', () => {
  const original = '😀😃😄😁😆';
  const buf = Buffer.from(original, 'utf8');
  return buf.toString('utf8') === original;
});

test('roundtrip: utf8 mixed', () => {
  const original = 'Hello世界🌍';
  const buf = Buffer.from(original, 'utf8');
  return buf.toString('utf8') === original;
});

const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
