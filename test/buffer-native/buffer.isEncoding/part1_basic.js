// Buffer.isEncoding - part1: 基本功能与所有支持的编码
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

// 所有 Node.js 支持的编码
test('utf8 编码应返回 true', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('utf-8 编码（带连字符）应返回 true', () => {
  return Buffer.isEncoding('utf-8') === true;
});

test('utf16le 编码应返回 true', () => {
  return Buffer.isEncoding('utf16le') === true;
});

test('ucs2 编码应返回 true', () => {
  return Buffer.isEncoding('ucs2') === true;
});

test('ucs-2 编码（带连字符）应返回 true', () => {
  return Buffer.isEncoding('ucs-2') === true;
});

test('base64 编码应返回 true', () => {
  return Buffer.isEncoding('base64') === true;
});

test('base64url 编码应返回 true', () => {
  return Buffer.isEncoding('base64url') === true;
});

test('latin1 编码应返回 true', () => {
  return Buffer.isEncoding('latin1') === true;
});

test('binary 编码应返回 true', () => {
  return Buffer.isEncoding('binary') === true;
});

test('hex 编码应返回 true', () => {
  return Buffer.isEncoding('hex') === true;
});

test('ascii 编码应返回 true', () => {
  return Buffer.isEncoding('ascii') === true;
});

// 不支持的编码
test('unknown 编码应返回 false', () => {
  return Buffer.isEncoding('unknown') === false;
});

test('utf32 编码应返回 false', () => {
  return Buffer.isEncoding('utf32') === false;
});

test('iso-8859-1 编码应返回 false', () => {
  return Buffer.isEncoding('iso-8859-1') === false;
});

test('gbk 编码应返回 false', () => {
  return Buffer.isEncoding('gbk') === false;
});

test('big5 编码应返回 false', () => {
  return Buffer.isEncoding('big5') === false;
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
