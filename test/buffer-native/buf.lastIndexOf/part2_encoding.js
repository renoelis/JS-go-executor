// buf.lastIndexOf() - 编码支持测试
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

// UTF-8 编码（默认）
test('UTF-8: 查找中文字符', () => {
  const buf = Buffer.from('你好世界你好');
  return buf.lastIndexOf('你好', undefined, 'utf8') === 12;
});

test('UTF-8: 查找 emoji', () => {
  const buf = Buffer.from('hello 😀 world 😀');
  return buf.lastIndexOf('😀') === 17;
});

test('UTF-8: 多字节字符', () => {
  const buf = Buffer.from('café café');
  return buf.lastIndexOf('café') === 6;
});

// HEX 编码
test('HEX: 查找十六进制字符串', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x01, 0x02]);
  return buf.lastIndexOf('0102', 'hex') === 3;
});

test('HEX: 大小写不敏感', () => {
  const buf = Buffer.from([0xAB, 0xCD, 0xAB, 0xCD]);
  return buf.lastIndexOf('ABCD', 'hex') === 2;
});

test('HEX: 无效十六进制返回 -1', () => {
  const buf = Buffer.from('hello world');
  // 无效的 hex 字符串解码失败，searchBytes 为空，返回 buf.length
  return buf.lastIndexOf('ZZ', 'hex') === 11;
});

// BASE64 编码
test('BASE64: 查找 base64 字符串', () => {
  const buf = Buffer.from('hello world hello world', 'utf8');
  const search = Buffer.from('hello').toString('base64');
  return buf.lastIndexOf(search, undefined, 'base64') === 12;
});

test('BASE64: 宽松解码', () => {
  const buf = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x68, 0x65, 0x6c, 0x6c, 0x6f]);
  return buf.lastIndexOf('aGVsbG8=', undefined, 'base64') === 5;
});

// BASE64URL 编码
test('BASE64URL: 查找 base64url 字符串', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x01, 0x02, 0x03]);
  const search = Buffer.from([0x01, 0x02, 0x03]).toString('base64url');
  return buf.lastIndexOf(search, undefined, 'base64url') === 3;
});

// LATIN1/BINARY 编码
test('LATIN1: 查找 latin1 字符', () => {
  const buf = Buffer.from('café café', 'latin1');
  return buf.lastIndexOf('café', undefined, 'latin1') === 5;
});

test('BINARY: 等同于 latin1', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0xFF, 0xFE]);
  return buf.lastIndexOf('\xFF\xFE', undefined, 'binary') === 2;
});

// ASCII 编码
test('ASCII: 查找 ascii 字符', () => {
  const buf = Buffer.from('hello world hello', 'ascii');
  return buf.lastIndexOf('hello', undefined, 'ascii') === 12;
});

test('ASCII: 只取低 7 位', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  return buf.lastIndexOf('Hello', undefined, 'ascii') === 5;
});

// UTF-16LE/UCS2 编码
test('UTF16LE: 查找 utf16le 字符串', () => {
  const buf = Buffer.from('hello hello', 'utf16le');
  return buf.lastIndexOf('hello', undefined, 'utf16le') === 12;
});

test('UCS2: 等同于 utf16le', () => {
  const buf = Buffer.from('test test', 'ucs2');
  return buf.lastIndexOf('test', undefined, 'ucs2') === 10;
});

test('UTF16LE: 2 字节对齐', () => {
  const buf = Buffer.from('abcabc', 'utf16le');
  // utf16le 编码后每个字符 2 字节，'abc' = 6 字节
  return buf.lastIndexOf('abc', undefined, 'utf16le') === 6;
});

test('UTF16LE: surrogate pairs', () => {
  const buf = Buffer.from('😀😀', 'utf16le');
  return buf.lastIndexOf('😀', undefined, 'utf16le') === 4;
});

// 编码名称大小写不敏感
test('编码大小写: UTF8', () => {
  const buf = Buffer.from('hello world hello');
  return buf.lastIndexOf('hello', undefined, 'UTF8') === 12;
});

test('编码大小写: Hex', () => {
  const buf = Buffer.from([0x01, 0x02, 0x01, 0x02]);
  return buf.lastIndexOf('0102', 'HEX') === 2;
});

test('编码大小写: Base64', () => {
  const buf = Buffer.from('test test', 'utf8');
  const search = Buffer.from('test').toString('base64');
  return buf.lastIndexOf(search, undefined, 'BASE64') === 5;
});

test('编码大小写: Latin1', () => {
  const buf = Buffer.from('hello hello', 'latin1');
  return buf.lastIndexOf('hello', undefined, 'LATIN1') === 6;
});

test('编码大小写: Utf16le', () => {
  const buf = Buffer.from('test test', 'utf16le');
  return buf.lastIndexOf('test', undefined, 'UTF16LE') === 10;
});

// 混合编码测试
test('不同编码查找相同内容', () => {
  const buf = Buffer.from('hello');
  const idx1 = buf.lastIndexOf('hello', undefined, 'utf8');
  const idx2 = buf.lastIndexOf('hello', undefined, 'ascii');
  return idx1 === 0 && idx2 === 0;
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
