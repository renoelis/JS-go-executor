// Buffer.byteLength() - Encoding Tests
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

// UTF-8 编码
test('utf8 编码 - ASCII', () => {
  const len = Buffer.byteLength('hello', 'utf8');
  return len === 5;
});

test('utf8 编码 - 中文', () => {
  const len = Buffer.byteLength('你好', 'utf8');
  return len === 6;
});

test('utf-8 编码（带连字符）', () => {
  const len = Buffer.byteLength('hello', 'utf-8');
  return len === 5;
});

// UTF-16LE 编码
test('utf16le 编码 - ASCII', () => {
  const len = Buffer.byteLength('hello', 'utf16le');
  // 每个字符 2 字节
  return len === 10;
});

test('utf16le 编码 - 中文', () => {
  const len = Buffer.byteLength('你好', 'utf16le');
  // 每个字符 2 字节
  return len === 4;
});

test('ucs2 编码（utf16le 别名）', () => {
  const len1 = Buffer.byteLength('hello', 'ucs2');
  const len2 = Buffer.byteLength('hello', 'utf16le');
  return len1 === len2 && len1 === 10;
});

test('ucs-2 编码（带连字符）', () => {
  const len = Buffer.byteLength('hello', 'ucs-2');
  return len === 10;
});

// Latin1 编码
test('latin1 编码 - ASCII', () => {
  const len = Buffer.byteLength('hello', 'latin1');
  return len === 5;
});

test('latin1 编码 - 扩展字符', () => {
  const len = Buffer.byteLength('café', 'latin1');
  // latin1 每个字符 1 字节
  return len === 4;
});

test('binary 编码（latin1 别名）', () => {
  const len1 = Buffer.byteLength('hello', 'binary');
  const len2 = Buffer.byteLength('hello', 'latin1');
  return len1 === len2 && len1 === 5;
});

// ASCII 编码
test('ascii 编码', () => {
  const len = Buffer.byteLength('hello', 'ascii');
  return len === 5;
});

test('ascii 编码 - 非 ASCII 字符被截断', () => {
  const len = Buffer.byteLength('你好', 'ascii');
  // 非 ASCII 字符会被处理，但长度计算基于字符数
  return len === 2;
});

// Base64 编码
test('base64 编码 - 标准字符串', () => {
  const len = Buffer.byteLength('aGVsbG8=', 'base64');
  // base64 解码后的字节长度
  return len === 5;
});

test('base64 编码 - 无填充', () => {
  const len = Buffer.byteLength('aGVsbG8', 'base64');
  return len === 5;
});

test('base64 编码 - 空字符串', () => {
  const len = Buffer.byteLength('', 'base64');
  return len === 0;
});

test('base64url 编码', () => {
  const len = Buffer.byteLength('aGVsbG8', 'base64url');
  return len === 5;
});

// Hex 编码
test('hex 编码 - 基本测试', () => {
  const len = Buffer.byteLength('68656c6c6f', 'hex');
  // hex 每两个字符代表 1 字节
  return len === 5;
});

test('hex 编码 - 大写字母', () => {
  const len = Buffer.byteLength('68656C6C6F', 'hex');
  return len === 5;
});

test('hex 编码 - 奇数长度', () => {
  const len = Buffer.byteLength('68656c6c6', 'hex');
  // 奇数长度，最后一个字符被忽略或当作 0 补齐
  return len === 4;
});

test('hex 编码 - 空字符串', () => {
  const len = Buffer.byteLength('', 'hex');
  return len === 0;
});

// 大小写不敏感测试
test('编码名称大小写不敏感 - UTF8', () => {
  const len1 = Buffer.byteLength('hello', 'UTF8');
  const len2 = Buffer.byteLength('hello', 'utf8');
  return len1 === len2;
});

test('编码名称大小写不敏感 - HEX', () => {
  const len1 = Buffer.byteLength('68656c6c6f', 'HEX');
  const len2 = Buffer.byteLength('68656c6c6f', 'hex');
  return len1 === len2;
});

test('编码名称大小写不敏感 - BASE64', () => {
  const len1 = Buffer.byteLength('aGVsbG8=', 'BASE64');
  const len2 = Buffer.byteLength('aGVsbG8=', 'base64');
  return len1 === len2;
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
