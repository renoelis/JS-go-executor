// Buffer.isEncoding - part4: 边缘情况与特殊字符串
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

// 空字符串和空白字符
test('空字符串应返回 false', () => {
  return Buffer.isEncoding('') === false;
});

test('单个空格应返回 false', () => {
  return Buffer.isEncoding(' ') === false;
});

test('多个空格应返回 false', () => {
  return Buffer.isEncoding('   ') === false;
});

test('制表符应返回 false', () => {
  return Buffer.isEncoding('\t') === false;
});

test('换行符应返回 false', () => {
  return Buffer.isEncoding('\n') === false;
});

test('回车符应返回 false', () => {
  return Buffer.isEncoding('\r') === false;
});

test('utf8 前置空格应返回 false', () => {
  return Buffer.isEncoding(' utf8') === false;
});

test('utf8 后置空格应返回 false', () => {
  return Buffer.isEncoding('utf8 ') === false;
});

test('utf8 前后空格应返回 false', () => {
  return Buffer.isEncoding(' utf8 ') === false;
});

// 特殊字符和符号
test('带下划线 utf_8 应返回 false', () => {
  return Buffer.isEncoding('utf_8') === false;
});

test('带点号 utf.8 应返回 false', () => {
  return Buffer.isEncoding('utf.8') === false;
});

test('带斜杠 utf/8 应返回 false', () => {
  return Buffer.isEncoding('utf/8') === false;
});

test('带反斜杠 utf\\8 应返回 false', () => {
  return Buffer.isEncoding('utf\\8') === false;
});

test('带冒号 utf:8 应返回 false', () => {
  return Buffer.isEncoding('utf:8') === false;
});

// 拼写错误和变体
test('utf88 拼写错误应返回 false', () => {
  return Buffer.isEncoding('utf88') === false;
});

test('utf 不完整应返回 false', () => {
  return Buffer.isEncoding('utf') === false;
});

test('utf8le 错误组合应返回 false', () => {
  return Buffer.isEncoding('utf8le') === false;
});

test('utf16 缺少 le 应返回 false', () => {
  return Buffer.isEncoding('utf16') === false;
});

test('utf16be big-endian 应返回 false', () => {
  return Buffer.isEncoding('utf16be') === false;
});

test('base32 不支持应返回 false', () => {
  return Buffer.isEncoding('base32') === false;
});

test('base85 不支持应返回 false', () => {
  return Buffer.isEncoding('base85') === false;
});

// 数字字符串
test('字符串 "0" 应返回 false', () => {
  return Buffer.isEncoding('0') === false;
});

test('字符串 "1" 应返回 false', () => {
  return Buffer.isEncoding('1') === false;
});

test('字符串 "123" 应返回 false', () => {
  return Buffer.isEncoding('123') === false;
});

// 其他边缘情况
test('单字符 u 应返回 false', () => {
  return Buffer.isEncoding('u') === false;
});

test('单字符 h 应返回 false', () => {
  return Buffer.isEncoding('h') === false;
});

test('双连字符 utf--8 应返回 false', () => {
  return Buffer.isEncoding('utf--8') === false;
});

test('多个连字符 utf-8- 应返回 false', () => {
  return Buffer.isEncoding('utf-8-') === false;
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
