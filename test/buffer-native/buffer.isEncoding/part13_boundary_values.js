// Buffer.isEncoding - part13: 边界值与极端输入补充
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

// 编码名长度边界
test('最短有效编码名 hex（3 字符）', () => {
  return Buffer.isEncoding('hex') === true;
});

test('4 字符编码名 utf8', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('5 字符编码名 ascii', () => {
  return Buffer.isEncoding('ascii') === true;
});

test('6 字符编码名 latin1', () => {
  return Buffer.isEncoding('latin1') === true;
});

test('6 字符编码名 binary', () => {
  return Buffer.isEncoding('binary') === true;
});

test('7 字符编码名 utf16le', () => {
  return Buffer.isEncoding('utf16le') === true;
});

test('10 字符编码名 base64url', () => {
  return Buffer.isEncoding('base64url') === true;
});

// 编码名组合：连字符位置
test('utf-8 连字符在中间', () => {
  return Buffer.isEncoding('utf-8') === true;
});

test('ucs-2 连字符在中间', () => {
  return Buffer.isEncoding('ucs-2') === true;
});

test('-utf8 连字符在开头应返回 false', () => {
  return Buffer.isEncoding('-utf8') === false;
});

test('utf8- 连字符在末尾应返回 false', () => {
  return Buffer.isEncoding('utf8-') === false;
});

test('u-t-f-8 多个连字符应返回 false', () => {
  return Buffer.isEncoding('u-t-f-8') === false;
});

// 数字字符的位置
test('utf8 数字在末尾', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('8utf 数字在开头应返回 false', () => {
  return Buffer.isEncoding('8utf') === false;
});

test('u8tf 数字在中间应返回 false', () => {
  return Buffer.isEncoding('u8tf') === false;
});

test('base64 数字在中间', () => {
  return Buffer.isEncoding('base64') === true;
});

test('64base 数字在开头应返回 false', () => {
  return Buffer.isEncoding('64base') === false;
});

test('ba64se 数字在中间错误位置应返回 false', () => {
  return Buffer.isEncoding('ba64se') === false;
});

// 特殊前缀和后缀
test('utf16le 后缀 le', () => {
  return Buffer.isEncoding('utf16le') === true;
});

test('utf16be 后缀 be 应返回 false', () => {
  return Buffer.isEncoding('utf16be') === false;
});

test('utf16me 错误后缀应返回 false', () => {
  return Buffer.isEncoding('utf16me') === false;
});

test('utf16 缺少后缀应返回 false', () => {
  return Buffer.isEncoding('utf16') === false;
});

// base64 变体
test('base64 标准形式', () => {
  return Buffer.isEncoding('base64') === true;
});

test('base64url URL 安全形式', () => {
  return Buffer.isEncoding('base64url') === true;
});

test('base64-url 带连字符应返回 false', () => {
  return Buffer.isEncoding('base64-url') === false;
});

test('base64_url 带下划线应返回 false', () => {
  return Buffer.isEncoding('base64_url') === false;
});

// 字符替换测试
test('utf8 正确拼写', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('utf0 错误数字应返回 false', () => {
  return Buffer.isEncoding('utf0') === false;
});

test('utf9 错误数字应返回 false', () => {
  return Buffer.isEncoding('utf9') === false;
});

test('utg8 错误字母应返回 false', () => {
  return Buffer.isEncoding('utg8') === false;
});

test('uff8 错误字母应返回 false', () => {
  return Buffer.isEncoding('uff8') === false;
});

test('uft8 字母顺序错误应返回 false', () => {
  return Buffer.isEncoding('uft8') === false;
});

// 大小写组合边界
test('全小写 utf8', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('全大写 UTF8', () => {
  return Buffer.isEncoding('UTF8') === true;
});

test('首字母大写 Utf8', () => {
  return Buffer.isEncoding('Utf8') === true;
});

test('末字母大写 utf8', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('交替大小写 uTf8', () => {
  return Buffer.isEncoding('uTf8') === true;
});

test('交替大小写 UtF8', () => {
  return Buffer.isEncoding('UtF8') === true;
});

test('随机大小写 uTF8', () => {
  return Buffer.isEncoding('uTF8') === true;
});

// 编码名完整性测试
test('hex 完整拼写', () => {
  return Buffer.isEncoding('hex') === true;
});

test('he 不完整应返回 false', () => {
  return Buffer.isEncoding('he') === false;
});

test('hexx 多余字符应返回 false', () => {
  return Buffer.isEncoding('hexx') === false;
});

test('base64 完整拼写', () => {
  return Buffer.isEncoding('base64') === true;
});

test('base6 不完整应返回 false', () => {
  return Buffer.isEncoding('base6') === false;
});

test('base 不完整应返回 false', () => {
  return Buffer.isEncoding('base') === false;
});

test('base644 多余字符应返回 false', () => {
  return Buffer.isEncoding('base644') === false;
});

// 零和空值边界
test('空字符串应返回 false', () => {
  return Buffer.isEncoding('') === false;
});

test('单空格应返回 false', () => {
  return Buffer.isEncoding(' ') === false;
});

test('Tab 字符应返回 false', () => {
  return Buffer.isEncoding('\t') === false;
});

test('换行符应返回 false', () => {
  return Buffer.isEncoding('\n') === false;
});

test('null 应返回 false', () => {
  return Buffer.isEncoding(null) === false;
});

test('undefined 应返回 false', () => {
  return Buffer.isEncoding(undefined) === false;
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
