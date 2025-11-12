// Buffer.isEncoding - part9: 编码别名和历史兼容性测试
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

// latin1 的别名
test('latin1 编码应返回 true', () => {
  return Buffer.isEncoding('latin1') === true;
});

test('binary 编码（latin1 的别名）应返回 true', () => {
  return Buffer.isEncoding('binary') === true;
});

// utf16le 的别名
test('utf16le 编码应返回 true', () => {
  return Buffer.isEncoding('utf16le') === true;
});

test('ucs2 编码（utf16le 的别名）应返回 true', () => {
  return Buffer.isEncoding('ucs2') === true;
});

test('ucs-2 带连字符（utf16le 的别名）应返回 true', () => {
  return Buffer.isEncoding('ucs-2') === true;
});

// 不支持的别名或变体
test('iso-8859-1（不是 latin1 的别名）应返回 false', () => {
  return Buffer.isEncoding('iso-8859-1') === false;
});

test('iso8859-1 应返回 false', () => {
  return Buffer.isEncoding('iso8859-1') === false;
});

test('windows-1252 应返回 false', () => {
  return Buffer.isEncoding('windows-1252') === false;
});

test('cp1252 应返回 false', () => {
  return Buffer.isEncoding('cp1252') === false;
});

// utf 编码变体
test('utf8 应返回 true', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('utf-8 应返回 true', () => {
  return Buffer.isEncoding('utf-8') === true;
});

test('UTF8 大写应返回 true', () => {
  return Buffer.isEncoding('UTF8') === true;
});

test('UTF-8 大写应返回 true', () => {
  return Buffer.isEncoding('UTF-8') === true;
});

test('utf16 不带 le 应返回 false', () => {
  return Buffer.isEncoding('utf16') === false;
});

test('utf16be big-endian 应返回 false', () => {
  return Buffer.isEncoding('utf16be') === false;
});

test('utf32 应返回 false', () => {
  return Buffer.isEncoding('utf32') === false;
});

test('utf32le 应返回 false', () => {
  return Buffer.isEncoding('utf32le') === false;
});

// base64 变体
test('base64 应返回 true', () => {
  return Buffer.isEncoding('base64') === true;
});

test('base64url 应返回 true', () => {
  return Buffer.isEncoding('base64url') === true;
});

test('base-64 带连字符应返回 false', () => {
  return Buffer.isEncoding('base-64') === false;
});

test('base32 应返回 false', () => {
  return Buffer.isEncoding('base32') === false;
});

test('base16 应返回 false', () => {
  return Buffer.isEncoding('base16') === false;
});

// 其他常见编码（不支持）
test('gbk 中文编码应返回 false', () => {
  return Buffer.isEncoding('gbk') === false;
});

test('gb2312 应返回 false', () => {
  return Buffer.isEncoding('gb2312') === false;
});

test('gb18030 应返回 false', () => {
  return Buffer.isEncoding('gb18030') === false;
});

test('big5 繁体中文编码应返回 false', () => {
  return Buffer.isEncoding('big5') === false;
});

test('shift_jis 日文编码应返回 false', () => {
  return Buffer.isEncoding('shift_jis') === false;
});

test('euc-jp 应返回 false', () => {
  return Buffer.isEncoding('euc-jp') === false;
});

test('euc-kr 韩文编码应返回 false', () => {
  return Buffer.isEncoding('euc-kr') === false;
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
