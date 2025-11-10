// buf.length - Part 2: Different Encodings
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

// 不同编码的字符串长度测试
test('utf8 编码字符串长度', () => {
  const buf = Buffer.from('hello', 'utf8');
  return buf.length === 5;
});

test('hex 编码字符串长度', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  return buf.length === 5;
});

test('base64 编码字符串长度', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello"
  return buf.length === 5;
});

test('latin1 编码字符串长度', () => {
  const buf = Buffer.from('hello', 'latin1');
  return buf.length === 5;
});

test('ascii 编码字符串长度', () => {
  const buf = Buffer.from('hello', 'ascii');
  return buf.length === 5;
});

test('utf16le 编码字符串长度', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.length === 10; // 每个字符 2 字节
});

test('ucs2 编码字符串长度', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return buf.length === 10; // ucs2 是 utf16le 的别名
});

test('binary 编码字符串长度', () => {
  const buf = Buffer.from('hello', 'binary');
  return buf.length === 5;
});

// 多字节字符测试
test('emoji 字符的字节长度', () => {
  const buf = Buffer.from('😀');
  return buf.length === 4; // UTF-8 编码的 emoji 是 4 字节
});

test('混合 ASCII 和中文的长度', () => {
  const buf = Buffer.from('hello你好');
  return buf.length === 11; // 5 (ASCII) + 6 (中文)
});

test('日文字符的字节长度', () => {
  const buf = Buffer.from('こんにちは');
  return buf.length === 15; // UTF-8 每个日文字符 3 字节
});

test('韩文字符的字节长度', () => {
  const buf = Buffer.from('안녕하세요');
  return buf.length === 15; // UTF-8 每个韩文字符 3 字节
});

test('特殊符号的字节长度', () => {
  const buf = Buffer.from('©®™');
  return buf.length === 7; // © (2) + ® (2) + ™ (3)
});

test('空字符串的长度', () => {
  const buf = Buffer.from('');
  return buf.length === 0;
});

test('只包含空格的字符串长度', () => {
  const buf = Buffer.from('   ');
  return buf.length === 3;
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
