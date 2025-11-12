// Buffer.alloc() - Part 3: Encoding Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// utf8 编码（默认）
test('编码 utf8 - 基本 ASCII 字符', () => {
  const buf = Buffer.alloc(10, 'test', 'utf8');
  const expected = Buffer.from('testtestte', 'utf8');
  return buf.equals(expected);
});

test('编码 utf8 - 多字节字符', () => {
  const buf = Buffer.alloc(9, '中文', 'utf8');
  const charBuf = Buffer.from('中文', 'utf8');
  return buf[0] === charBuf[0] && buf[1] === charBuf[1] && buf[2] === charBuf[2];
});

test('编码 utf8 - emoji', () => {
  const buf = Buffer.alloc(8, '😀', 'utf8');
  const emojiBuf = Buffer.from('😀', 'utf8');
  return buf[0] === emojiBuf[0] && buf[1] === emojiBuf[1];
});

test('编码 utf8 - 空字符串', () => {
  const buf = Buffer.alloc(5, '', 'utf8');
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

// hex 编码
test('编码 hex - 有效十六进制字符串', () => {
  const buf = Buffer.alloc(10, '41', 'hex');
  return buf[0] === 0x41 && buf[1] === 0x41;
});

test('编码 hex - 多字节十六进制（偶数长度）', () => {
  const buf = Buffer.alloc(8, '4142', 'hex');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x41 && buf[3] === 0x42;
});

test('编码 hex - 空字符串', () => {
  const buf = Buffer.alloc(5, '', 'hex');
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

test('编码 hex - 奇数长度十六进制（应报错或处理）', () => {
  try {
    const buf = Buffer.alloc(5, '4', 'hex');
    return buf.length === 5;
  } catch (e) {
    return true;
  }
});

test('编码 hex - 大写字母（偶数长度）', () => {
  const buf = Buffer.alloc(8, 'ABCD', 'hex');
  return buf[0] === 0xAB && buf[1] === 0xCD && buf[2] === 0xAB && buf[3] === 0xCD;
});

test('编码 hex - 小写字母（偶数长度）', () => {
  const buf = Buffer.alloc(8, 'abcd', 'hex');
  return buf[0] === 0xab && buf[1] === 0xcd && buf[2] === 0xab && buf[3] === 0xcd;
});

test('编码 hex - FF（最大值）', () => {
  const buf = Buffer.alloc(6, 'FF', 'hex');
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF;
});

test('编码 hex - 00（最小值）', () => {
  const buf = Buffer.alloc(6, '00', 'hex');
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00;
});

// base64 编码
test('编码 base64 - 基本 base64 字符串', () => {
  const buf = Buffer.alloc(11, 'aGVsbG8gd29ybGQ=', 'base64');
  const expected = Buffer.from('hello world', 'utf8');
  return buf.equals(expected);
});

test('编码 base64 - 无填充的 base64', () => {
  const buf = Buffer.alloc(8, 'dGVzdA', 'base64');
  const expected = Buffer.from('test', 'utf8');
  return buf[0] === expected[0] && buf[1] === expected[1];
});

test('编码 base64 - 空字符串', () => {
  const buf = Buffer.alloc(5, '', 'base64');
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

test('编码 base64 - 重复填充', () => {
  const buf = Buffer.alloc(16, 'YWJj', 'base64');
  const decoded = Buffer.from('YWJj', 'base64');
  return buf[0] === decoded[0] && buf[1] === decoded[1] && buf[2] === decoded[2];
});

// ascii 编码
test('编码 ascii - 基本 ASCII 字符', () => {
  const buf = Buffer.alloc(10, 'hello', 'ascii');
  const expected = Buffer.from('hellohello', 'ascii');
  return buf.equals(expected);
});

test('编码 ascii - 空字符串', () => {
  const buf = Buffer.alloc(5, '', 'ascii');
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

test('编码 ascii - 数字字符', () => {
  const buf = Buffer.alloc(6, '123', 'ascii');
  const expected = Buffer.from('123123', 'ascii');
  return buf.equals(expected);
});

// latin1 编码
test('编码 latin1 - 基本字符', () => {
  const buf = Buffer.alloc(10, 'test', 'latin1');
  const expected = Buffer.from('testtestte', 'latin1');
  return buf.equals(expected);
});

test('编码 latin1 - 空字符串', () => {
  const buf = Buffer.alloc(5, '', 'latin1');
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

test('编码 latin1 - 扩展 ASCII', () => {
  const buf = Buffer.alloc(6, '\xE9', 'latin1');
  return buf[0] === 0xE9 && buf[1] === 0xE9;
});

// utf16le 编码
test('编码 utf16le - 基本字符', () => {
  const buf = Buffer.alloc(10, 'ab', 'utf16le');
  const expected = Buffer.from('ab', 'utf16le');
  return buf[0] === expected[0] && buf[1] === expected[1];
});

test('编码 utf16le - 空字符串', () => {
  const buf = Buffer.alloc(5, '', 'utf16le');
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

test('编码 utf16le - 中文字符', () => {
  const buf = Buffer.alloc(10, '中', 'utf16le');
  const expected = Buffer.from('中', 'utf16le');
  return buf[0] === expected[0] && buf[1] === expected[1];
});

// ucs2 编码（utf16le 的别名）
test('编码 ucs2 - 基本字符', () => {
  const buf = Buffer.alloc(8, 'ab', 'ucs2');
  const expected = Buffer.from('ab', 'ucs2');
  return buf[0] === expected[0] && buf[1] === expected[1];
});

test('编码 ucs2 - 空字符串', () => {
  const buf = Buffer.alloc(5, '', 'ucs2');
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

// binary 编码（latin1 的别名）
test('编码 binary - 基本字符', () => {
  const buf = Buffer.alloc(10, 'test', 'binary');
  const expected = Buffer.from('testtestte', 'binary');
  return buf.equals(expected);
});

test('编码 binary - 空字符串', () => {
  const buf = Buffer.alloc(5, '', 'binary');
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

// base64url 编码
test('编码 base64url - 基本 base64url 字符串', () => {
  const buf = Buffer.alloc(10, 'dGVzdA', 'base64url');
  const decoded = Buffer.from('dGVzdA', 'base64url');
  return buf[0] === decoded[0];
});

test('编码 base64url - 空字符串', () => {
  const buf = Buffer.alloc(5, '', 'base64url');
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

// 不指定编码（默认 utf8）
test('不指定编码 - 默认为 utf8', () => {
  const buf1 = Buffer.alloc(10, 'test');
  const buf2 = Buffer.alloc(10, 'test', 'utf8');
  return buf1.equals(buf2);
});

// 编码大小写不敏感
test('编码名大写 - UTF8', () => {
  const buf = Buffer.alloc(10, 'test', 'UTF8');
  const expected = Buffer.from('testtestte', 'utf8');
  return buf.equals(expected);
});

test('编码名大写 - HEX', () => {
  const buf = Buffer.alloc(6, '4142', 'HEX');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x41;
});

test('编码名混合大小写 - Base64', () => {
  const buf = Buffer.alloc(8, 'dGVzdA', 'Base64');
  const decoded = Buffer.from('dGVzdA', 'base64');
  return buf[0] === decoded[0];
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
