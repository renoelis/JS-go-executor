// buffer.isUtf8() - Part 6: Continuation Bytes Validation Tests
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

// 延续字节必须是 10xxxxxx 格式（0x80-0xBF）

// 2 字节序列的延续字节测试
test('2 字节序列 - 延续字节 0x80 (最小有效)', () => {
  const buf = Buffer.from([0xC2, 0x80]); // U+0080
  return isUtf8(buf) === true;
});

test('2 字节序列 - 延续字节 0xBF (最大有效)', () => {
  const buf = Buffer.from([0xC2, 0xBF]); // U+00BF
  return isUtf8(buf) === true;
});

test('2 字节序列 - 延续字节 0x7F (无效)', () => {
  const buf = Buffer.from([0xC2, 0x7F]); // 0x7F = 01111111，不是 10xxxxxx
  return isUtf8(buf) === false;
});

test('2 字节序列 - 延续字节 0xC0 (无效)', () => {
  const buf = Buffer.from([0xC2, 0xC0]); // 0xC0 = 11000000，不是 10xxxxxx
  return isUtf8(buf) === false;
});

test('2 字节序列 - 延续字节 0x00 (无效)', () => {
  const buf = Buffer.from([0xC2, 0x00]); // 0x00 = 00000000，不是 10xxxxxx
  return isUtf8(buf) === false;
});

test('2 字节序列 - 延续字节 0xFF (无效)', () => {
  const buf = Buffer.from([0xC2, 0xFF]); // 0xFF = 11111111，不是 10xxxxxx
  return isUtf8(buf) === false;
});

// 3 字节序列的延续字节测试
test('3 字节序列 - 两个延续字节都有效', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0x80]); // U+0800
  return isUtf8(buf) === true;
});

test('3 字节序列 - 第 1 个延续字节 0x80 (最小)', () => {
  const buf = Buffer.from([0xE1, 0x80, 0x80]); // U+1000
  return isUtf8(buf) === true;
});

test('3 字节序列 - 第 1 个延续字节 0xBF (最大)', () => {
  const buf = Buffer.from([0xE1, 0xBF, 0xBF]); // U+1FFF
  return isUtf8(buf) === true;
});

test('3 字节序列 - 第 1 个延续字节 0x7F (无效)', () => {
  const buf = Buffer.from([0xE0, 0x7F, 0x80]);
  return isUtf8(buf) === false;
});

test('3 字节序列 - 第 1 个延续字节 0xC0 (无效)', () => {
  const buf = Buffer.from([0xE0, 0xC0, 0x80]);
  return isUtf8(buf) === false;
});

test('3 字节序列 - 第 2 个延续字节 0x7F (无效)', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0x7F]);
  return isUtf8(buf) === false;
});

test('3 字节序列 - 第 2 个延续字节 0xC0 (无效)', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0xC0]);
  return isUtf8(buf) === false;
});

test('3 字节序列 - 两个延续字节都无效', () => {
  const buf = Buffer.from([0xE0, 0x41, 0x42]); // ASCII 'A', 'B'
  return isUtf8(buf) === false;
});

// 4 字节序列的延续字节测试
test('4 字节序列 - 三个延续字节都有效', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x80]); // U+10000
  return isUtf8(buf) === true;
});

test('4 字节序列 - 第 1 个延续字节 0x80 (最小)', () => {
  const buf = Buffer.from([0xF1, 0x80, 0x80, 0x80]);
  return isUtf8(buf) === true;
});

test('4 字节序列 - 第 1 个延续字节 0xBF (最大)', () => {
  const buf = Buffer.from([0xF1, 0xBF, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

test('4 字节序列 - 第 1 个延续字节 0x7F (无效)', () => {
  const buf = Buffer.from([0xF0, 0x7F, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 第 1 个延续字节 0xC0 (无效)', () => {
  const buf = Buffer.from([0xF0, 0xC0, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 第 2 个延续字节 0x7F (无效)', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x7F, 0x80]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 第 2 个延续字节 0xC0 (无效)', () => {
  const buf = Buffer.from([0xF0, 0x90, 0xC0, 0x80]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 第 3 个延续字节 0x7F (无效)', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x7F]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 第 3 个延续字节 0xC0 (无效)', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0xC0]);
  return isUtf8(buf) === false;
});

test('4 字节序列 - 所有延续字节都无效', () => {
  const buf = Buffer.from([0xF0, 0x41, 0x42, 0x43]); // ASCII 'A', 'B', 'C'
  return isUtf8(buf) === false;
});

// 边界测试：延续字节的每个位
test('延续字节 - 0x80 (10000000)', () => {
  const buf = Buffer.from([0xC2, 0x80]);
  return isUtf8(buf) === true;
});

test('延续字节 - 0x81 (10000001)', () => {
  const buf = Buffer.from([0xC2, 0x81]);
  return isUtf8(buf) === true;
});

test('延续字节 - 0xAA (10101010)', () => {
  const buf = Buffer.from([0xC2, 0xAA]);
  return isUtf8(buf) === true;
});

test('延续字节 - 0xBE (10111110)', () => {
  const buf = Buffer.from([0xC2, 0xBE]);
  return isUtf8(buf) === true;
});

test('延续字节 - 0xBF (10111111)', () => {
  const buf = Buffer.from([0xC2, 0xBF]);
  return isUtf8(buf) === true;
});

// 多个字符的延续字节验证
test('多字符 - 第 1 个字符延续字节无效', () => {
  const buf = Buffer.from([0xC2, 0x41, 0xC2, 0x80]); // 第 1 个字符无效
  return isUtf8(buf) === false;
});

test('多字符 - 第 2 个字符延续字节无效', () => {
  const buf = Buffer.from([0xC2, 0x80, 0xC2, 0x41]); // 第 2 个字符无效
  return isUtf8(buf) === false;
});

test('多字符 - 中间字符延续字节无效', () => {
  const buf = Buffer.from([0xC2, 0x80, 0xC2, 0x41, 0xC2, 0x80]); // 中间字符无效
  return isUtf8(buf) === false;
});

// 延续字节数量不匹配
test('2 字节序列 - 多余的延续字节', () => {
  const buf = Buffer.from([0xC2, 0x80, 0x80]); // 第 3 个字节是孤立的延续字节
  return isUtf8(buf) === false;
});

test('3 字节序列 - 多余的延续字节', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0x80, 0x80]); // 第 4 个字节是孤立的延续字节
  return isUtf8(buf) === false;
});

test('4 字节序列 - 多余的延续字节', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x80, 0x80]); // 第 5 个字节是孤立的延续字节
  return isUtf8(buf) === false;
});

// 特殊延续字节组合
test('连续多个有效延续字节（孤立）', () => {
  const buf = Buffer.from([0x80, 0x81, 0x82, 0x83]);
  return isUtf8(buf) === false; // 所有都是孤立的延续字节
});

test('有效字符 + 孤立延续字节 + 有效字符', () => {
  const buf = Buffer.from([0x41, 0x80, 0x42]); // 'A' + 孤立 + 'B'
  return isUtf8(buf) === false;
});

test('2 字节序列 + 孤立延续字节', () => {
  const buf = Buffer.from([0xC2, 0x80, 0x80]); // 有效 2 字节 + 孤立
  return isUtf8(buf) === false;
});

test('孤立延续字节 + 2 字节序列', () => {
  const buf = Buffer.from([0x80, 0xC2, 0x80]); // 孤立 + 有效 2 字节
  return isUtf8(buf) === false;
});

// 起始字节后面没有足够的延续字节
test('2 字节起始 + 0 个延续字节', () => {
  const buf = Buffer.from([0xC2]);
  return isUtf8(buf) === false;
});

test('3 字节起始 + 0 个延续字节', () => {
  const buf = Buffer.from([0xE0]);
  return isUtf8(buf) === false;
});

test('3 字节起始 + 1 个延续字节', () => {
  const buf = Buffer.from([0xE0, 0xA0]);
  return isUtf8(buf) === false;
});

test('4 字节起始 + 0 个延续字节', () => {
  const buf = Buffer.from([0xF0]);
  return isUtf8(buf) === false;
});

test('4 字节起始 + 1 个延续字节', () => {
  const buf = Buffer.from([0xF0, 0x90]);
  return isUtf8(buf) === false;
});

test('4 字节起始 + 2 个延续字节', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80]);
  return isUtf8(buf) === false;
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
