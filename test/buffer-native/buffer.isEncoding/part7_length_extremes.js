// Buffer.isEncoding - part7: 字符串长度极端情况
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

// 短字符串
test('长度为 1 的字符串 "u" 应返回 false', () => {
  return Buffer.isEncoding('u') === false;
});

test('长度为 2 的字符串 "ut" 应返回 false', () => {
  return Buffer.isEncoding('ut') === false;
});

test('长度为 3 的字符串 "utf" 应返回 false', () => {
  return Buffer.isEncoding('utf') === false;
});

test('长度为 3 的字符串 "hex" 应返回 true', () => {
  return Buffer.isEncoding('hex') === true;
});

// 长字符串
test('非常长的无效编码名（100 字符）应返回 false', () => {
  const longString = 'a'.repeat(100);
  return Buffer.isEncoding(longString) === false;
});

test('非常长的无效编码名（1000 字符）应返回 false', () => {
  const longString = 'invalid'.repeat(143); // 约 1000 字符
  return Buffer.isEncoding(longString) === false;
});

test('utf8 后跟大量空格应返回 false', () => {
  const stringWithSpaces = 'utf8' + ' '.repeat(100);
  return Buffer.isEncoding(stringWithSpaces) === false;
});

test('大量空格后跟 utf8 应返回 false', () => {
  const stringWithSpaces = ' '.repeat(100) + 'utf8';
  return Buffer.isEncoding(stringWithSpaces) === false;
});

// 重复字符
test('重复的 utf8utf8 应返回 false', () => {
  return Buffer.isEncoding('utf8utf8') === false;
});

test('重复的 hexhex 应返回 false', () => {
  return Buffer.isEncoding('hexhex') === false;
});

test('重复的 base64base64 应返回 false', () => {
  return Buffer.isEncoding('base64base64') === false;
});

// 相似但错误的长编码名
test('utf8888 多余字符应返回 false', () => {
  return Buffer.isEncoding('utf8888') === false;
});

test('base64urlurl 重复部分应返回 false', () => {
  return Buffer.isEncoding('base64urlurl') === false;
});

test('utf16lelele 重复后缀应返回 false', () => {
  return Buffer.isEncoding('utf16lelele') === false;
});

// 编码名的各种变体
test('utf 后跟多个数字 utf8888 应返回 false', () => {
  return Buffer.isEncoding('utf8888') === false;
});

test('base 后跟多个数字 base646464 应返回 false', () => {
  return Buffer.isEncoding('base646464') === false;
});

// 极短有效编码名
test('最短的有效编码名 hex（3 字符）应返回 true', () => {
  return Buffer.isEncoding('hex') === true;
});

test('短编码名 ucs2（4 字符）应返回 true', () => {
  return Buffer.isEncoding('ucs2') === true;
});

test('短编码名 utf8（4 字符）应返回 true', () => {
  return Buffer.isEncoding('utf8') === true;
});

// 包含换行符的长字符串
test('包含换行符的字符串应返回 false', () => {
  return Buffer.isEncoding('utf8\nutf8') === false;
});

test('多行字符串应返回 false', () => {
  return Buffer.isEncoding('utf8\r\nutf8') === false;
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
