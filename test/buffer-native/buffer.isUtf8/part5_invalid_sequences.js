// buffer.isUtf8() - Part 5: Invalid UTF-8 Sequences (Detailed)
const { Buffer, isUtf8 } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 孤立的延续字节（10xxxxxx）
test('孤立延续字节 - 0x80', () => {
  const buf = Buffer.from([0x80]);
  return isUtf8(buf) === false;
});

test('孤立延续字节 - 0xBF', () => {
  const buf = Buffer.from([0xBF]);
  return isUtf8(buf) === false;
});

test('多个孤立延续字节', () => {
  const buf = Buffer.from([0x80, 0x81, 0x82]);
  return isUtf8(buf) === false;
});

test('有效字符后跟孤立延续字节', () => {
  const buf = Buffer.from([0x41, 0x80]); // 'A' + 孤立字节
  return isUtf8(buf) === false;
});

// 不完整的 2 字节序列（110xxxxx 10xxxxxx）
test('2 字节序列 - 缺少延续字节 (0xC2)', () => {
  const buf = Buffer.from([0xC2]);
  return isUtf8(buf) === false;
});

test('2 字节序列 - 缺少延续字节 (0xDF)', () => {
  const buf = Buffer.from([0xDF]);
  return isUtf8(buf) === false;
});

test('2 字节序列 - 起始字节在末尾', () => {
  const buf = Buffer.from([0x41, 0x42, 0xC2]); // "AB" + 起始字节
  return isUtf8(buf) === false;
});

test('2 字节序列 - 错误的延续字节', () => {
  const buf = Buffer.from([0xC2, 0x41]); // 延续字节应该是 10xxxxxx，0x41 = 01000001
  return isUtf8(buf) === false;
});

test('2 字节序列 - 延续字节超出范围 (0xC0)', () => {
  const buf = Buffer.from([0xC2, 0xC0]); // 0xC0 = 11000000，不是延续字节
  return isUtf8(buf) === false;
});

// 不完整的 3 字节序列（1110xxxx 10xxxxxx 10xxxxxx）
test('3 字节序列 - 只有起始字节 (0xE0)', () => {
  const buf = Buffer.from([0xE0]);
  return isUtf8(buf) === false;
});

test('3 字节序列 - 只有起始字节 (0xEF)', () => {
  const buf = Buffer.from([0xEF]);
  return isUtf8(buf) === false;
});

test('3 字节序列 - 只有 1 个延续字节 (0xE0 0xA0)', () => {
  const buf = Buffer.from([0xE0, 0xA0]);
  return isUtf8(buf) === false;
});

test('3 字节序列 - 第 1 个延续字节错误', () => {
  const buf = Buffer.from([0xE0, 0x41, 0x80]); // 第 2 字节应该是 10xxxxxx
  return isUtf8(buf) === false;
});

test('3 字节序列 - 第 2 个延续字节错误', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0x41]); // 第 3 字节应该是 10xxxxxx
  return isUtf8(buf) === false;
});

test('3 字节序列 - 起始字节在末尾', () => {
  const buf = Buffer.from([0x41, 0xE0]); // 'A' + 起始字节
  return isUtf8(buf) === false;
});

// 不完整的 4 字节序列（11110xxx 10xxxxxx 10xxxxxx 10xxxxxx）
test('4 字节序列 - 只有起始字节 (0xF0)', () => {
  const buf = Buffer.from([0xF0]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 只有起始字节 (0xF4)', () => {
  const buf = Buffer.from([0xF4]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 只有 1 个延续字节', () => {
  const buf = Buffer.from([0xF0, 0x90]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 只有 2 个延续字节', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 第 1 个延续字节错误', () => {
  const buf = Buffer.from([0xF0, 0x41, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 第 2 个延续字节错误', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x41, 0x80]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 第 3 个延续字节错误', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x41]);
  return isUtf8(buf) === false;
});

// 非法起始字节（1111110x 和 1111111x）
test('非法起始字节 - 0xF8', () => {
  const buf = Buffer.from([0xF8, 0x80, 0x80, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('非法起始字节 - 0xFC', () => {
  const buf = Buffer.from([0xFC, 0x80, 0x80, 0x80, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('非法起始字节 - 0xFE', () => {
  const buf = Buffer.from([0xFE]);
  return isUtf8(buf) === false;
});

test('非法起始字节 - 0xFF', () => {
  const buf = Buffer.from([0xFF]);
  return isUtf8(buf) === false;
});

// 非法 2 字节序列起始字节（0xC0, 0xC1）
test('非法 2 字节起始 - 0xC0 0x80', () => {
  const buf = Buffer.from([0xC0, 0x80]);
  return isUtf8(buf) === false; // 这是过长编码
});

test('非法 2 字节起始 - 0xC1 0xBF', () => {
  const buf = Buffer.from([0xC1, 0xBF]);
  return isUtf8(buf) === false; // 这是过长编码
});

// 特定 3 字节序列的验证
test('3 字节 0xE0 - 第 2 字节必须 >= 0xA0', () => {
  const buf = Buffer.from([0xE0, 0x9F, 0xBF]); // < 0xA0，过长编码
  return isUtf8(buf) === false;
});

test('3 字节 0xE0 - 第 2 字节 = 0xA0 (有效)', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0x80]); // U+0800
  return isUtf8(buf) === true;
});

test('3 字节 0xED - 第 2 字节必须 <= 0x9F (代理对)', () => {
  const buf = Buffer.from([0xED, 0xA0, 0x80]); // U+D800，代理对
  return isUtf8(buf) === false;
});

test('3 字节 0xED - 第 2 字节 = 0x9F (有效)', () => {
  const buf = Buffer.from([0xED, 0x9F, 0xBF]); // U+D7FF
  return isUtf8(buf) === true;
});

// 特定 4 字节序列的验证
test('4 字节 0xF0 - 第 2 字节必须 >= 0x90', () => {
  const buf = Buffer.from([0xF0, 0x8F, 0xBF, 0xBF]); // < 0x90，过长编码
  return isUtf8(buf) === false;
});

test('4 字节 0xF0 - 第 2 字节 = 0x90 (有效)', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x80]); // U+10000
  return isUtf8(buf) === true;
});

test('4 字节 0xF4 - 第 2 字节必须 <= 0x8F', () => {
  const buf = Buffer.from([0xF4, 0x90, 0x80, 0x80]); // > U+10FFFF
  return isUtf8(buf) === false;
});

test('4 字节 0xF4 - 第 2 字节 = 0x8F (有效)', () => {
  const buf = Buffer.from([0xF4, 0x8F, 0xBF, 0xBF]); // U+10FFFF
  return isUtf8(buf) === true;
});

test('4 字节 - 超过 0xF4 (0xF5)', () => {
  const buf = Buffer.from([0xF5, 0x80, 0x80, 0x80]);
  return isUtf8(buf) === false; // > U+10FFFF
});

// 代理对范围 (U+D800 到 U+DFFF)
test('代理对 - U+D800 (高代理起始)', () => {
  const buf = Buffer.from([0xED, 0xA0, 0x80]);
  return isUtf8(buf) === false;
});

test('代理对 - U+DBFF (高代理结束)', () => {
  const buf = Buffer.from([0xED, 0xAF, 0xBF]);
  return isUtf8(buf) === false;
});

test('代理对 - U+DC00 (低代理起始)', () => {
  const buf = Buffer.from([0xED, 0xB0, 0x80]);
  return isUtf8(buf) === false;
});

test('代理对 - U+DFFF (低代理结束)', () => {
  const buf = Buffer.from([0xED, 0xBF, 0xBF]);
  return isUtf8(buf) === false;
});

test('代理对前的字符 - U+D7FF (有效)', () => {
  const buf = Buffer.from([0xED, 0x9F, 0xBF]);
  return isUtf8(buf) === true;
});

test('代理对后的字符 - U+E000 (有效)', () => {
  const buf = Buffer.from([0xEE, 0x80, 0x80]);
  return isUtf8(buf) === true;
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
