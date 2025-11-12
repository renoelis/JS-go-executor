// buffer.isUtf8() - Part 7: Overlong Encoding Tests
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

// 过长编码是指使用比必要更多的字节来编码一个字符
// UTF-8 要求使用最短的编码形式

// ASCII 字符的过长编码（应该是 1 字节，但用了 2/3/4 字节）
test('过长编码 - ASCII "A" (0x41) 用 2 字节', () => {
  const buf = Buffer.from([0xC1, 0x81]); // 应该是 0x41
  return isUtf8(buf) === false;
});

test('过长编码 - ASCII "A" (0x41) 用 3 字节', () => {
  const buf = Buffer.from([0xE0, 0x81, 0x81]); // 应该是 0x41
  return isUtf8(buf) === false;
});

test('过长编码 - ASCII "A" (0x41) 用 4 字节', () => {
  const buf = Buffer.from([0xF0, 0x80, 0x81, 0x81]); // 应该是 0x41
  return isUtf8(buf) === false;
});

test('过长编码 - NULL (0x00) 用 2 字节', () => {
  const buf = Buffer.from([0xC0, 0x80]); // 应该是 0x00
  return isUtf8(buf) === false;
});

test('过长编码 - NULL (0x00) 用 3 字节', () => {
  const buf = Buffer.from([0xE0, 0x80, 0x80]); // 应该是 0x00
  return isUtf8(buf) === false;
});

test('过长编码 - NULL (0x00) 用 4 字节', () => {
  const buf = Buffer.from([0xF0, 0x80, 0x80, 0x80]); // 应该是 0x00
  return isUtf8(buf) === false;
});

test('过长编码 - "/" (0x2F) 用 2 字节', () => {
  const buf = Buffer.from([0xC0, 0xAF]); // 应该是 0x2F
  return isUtf8(buf) === false;
});

test('过长编码 - "/" (0x2F) 用 3 字节', () => {
  const buf = Buffer.from([0xE0, 0x80, 0xAF]); // 应该是 0x2F
  return isUtf8(buf) === false;
});

test('过长编码 - 0x7F 用 2 字节', () => {
  const buf = Buffer.from([0xC1, 0xBF]); // 应该是 0x7F
  return isUtf8(buf) === false;
});

// 2 字节范围的过长编码（应该是 2 字节，但用了 3/4 字节）
test('过长编码 - U+0080 用 3 字节', () => {
  const buf = Buffer.from([0xE0, 0x82, 0x80]); // 应该是 0xC2 0x80
  return isUtf8(buf) === false;
});

test('过长编码 - U+0080 用 4 字节', () => {
  const buf = Buffer.from([0xF0, 0x80, 0x82, 0x80]); // 应该是 0xC2 0x80
  return isUtf8(buf) === false;
});

test('过长编码 - U+07FF 用 3 字节', () => {
  const buf = Buffer.from([0xE0, 0x9F, 0xBF]); // 应该是 0xDF 0xBF
  return isUtf8(buf) === false;
});

test('过长编码 - U+07FF 用 4 字节', () => {
  const buf = Buffer.from([0xF0, 0x80, 0x9F, 0xBF]); // 应该是 0xDF 0xBF
  return isUtf8(buf) === false;
});

test('过长编码 - U+00FF 用 3 字节', () => {
  const buf = Buffer.from([0xE0, 0x83, 0xBF]); // 应该是 0xC3 0xBF
  return isUtf8(buf) === false;
});

// 3 字节范围的过长编码（应该是 3 字节，但用了 4 字节）
test('过长编码 - U+0800 用 4 字节', () => {
  const buf = Buffer.from([0xF0, 0x80, 0xA0, 0x80]); // 应该是 0xE0 0xA0 0x80
  return isUtf8(buf) === false;
});

test('过长编码 - U+FFFF 用 4 字节', () => {
  const buf = Buffer.from([0xF0, 0x8F, 0xBF, 0xBF]); // 应该是 0xEF 0xBF 0xBF
  return isUtf8(buf) === false;
});

test('过长编码 - U+D7FF 用 4 字节', () => {
  const buf = Buffer.from([0xF0, 0x8D, 0x9F, 0xBF]); // 应该是 0xED 0x9F 0xBF
  return isUtf8(buf) === false;
});

test('过长编码 - U+E000 用 4 字节', () => {
  const buf = Buffer.from([0xF0, 0x8E, 0x80, 0x80]); // 应该是 0xEE 0x80 0x80
  return isUtf8(buf) === false;
});

// 0xC0 和 0xC1 永远不是有效的 UTF-8 起始字节
test('0xC0 后跟任何延续字节 - 0xC0 0x80', () => {
  const buf = Buffer.from([0xC0, 0x80]);
  return isUtf8(buf) === false;
});

test('0xC0 后跟任何延续字节 - 0xC0 0xBF', () => {
  const buf = Buffer.from([0xC0, 0xBF]);
  return isUtf8(buf) === false;
});

test('0xC0 后跟任何延续字节 - 0xC0 0xAA', () => {
  const buf = Buffer.from([0xC0, 0xAA]);
  return isUtf8(buf) === false;
});

test('0xC1 后跟任何延续字节 - 0xC1 0x80', () => {
  const buf = Buffer.from([0xC1, 0x80]);
  return isUtf8(buf) === false;
});

test('0xC1 后跟任何延续字节 - 0xC1 0xBF', () => {
  const buf = Buffer.from([0xC1, 0xBF]);
  return isUtf8(buf) === false;
});

test('0xC1 后跟任何延续字节 - 0xC1 0xAA', () => {
  const buf = Buffer.from([0xC1, 0xAA]);
  return isUtf8(buf) === false;
});

// 0xE0 的过长编码边界
test('0xE0 + 0x80-0x9F - 过长编码 (0xE0 0x80 0x80)', () => {
  const buf = Buffer.from([0xE0, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('0xE0 + 0x80-0x9F - 过长编码 (0xE0 0x9F 0xBF)', () => {
  const buf = Buffer.from([0xE0, 0x9F, 0xBF]);
  return isUtf8(buf) === false;
});

test('0xE0 + 0xA0 - 有效最小值 (0xE0 0xA0 0x80)', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0x80]); // U+0800
  return isUtf8(buf) === true;
});

// 0xF0 的过长编码边界
test('0xF0 + 0x80-0x8F - 过长编码 (0xF0 0x80 0x80 0x80)', () => {
  const buf = Buffer.from([0xF0, 0x80, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('0xF0 + 0x80-0x8F - 过长编码 (0xF0 0x8F 0xBF 0xBF)', () => {
  const buf = Buffer.from([0xF0, 0x8F, 0xBF, 0xBF]);
  return isUtf8(buf) === false;
});

test('0xF0 + 0x90 - 有效最小值 (0xF0 0x90 0x80 0x80)', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x80]); // U+10000
  return isUtf8(buf) === true;
});

// 混合过长编码和有效字符
test('有效字符 + 过长编码', () => {
  const buf = Buffer.from([0x41, 0xC0, 0x80]); // 'A' + 过长的 NULL
  return isUtf8(buf) === false;
});

test('过长编码 + 有效字符', () => {
  const buf = Buffer.from([0xC0, 0x80, 0x41]); // 过长的 NULL + 'A'
  return isUtf8(buf) === false;
});

test('多个过长编码', () => {
  const buf = Buffer.from([0xC0, 0x80, 0xC1, 0x81]); // 两个过长编码
  return isUtf8(buf) === false;
});

// 特殊字符的过长编码
test('过长编码 - "<" (0x3C) 用 2 字节', () => {
  const buf = Buffer.from([0xC0, 0xBC]); // 应该是 0x3C
  return isUtf8(buf) === false;
});

test('过长编码 - ">" (0x3E) 用 2 字节', () => {
  const buf = Buffer.from([0xC0, 0xBE]); // 应该是 0x3E
  return isUtf8(buf) === false;
});

test('过长编码 - "&" (0x26) 用 3 字节', () => {
  const buf = Buffer.from([0xE0, 0x80, 0xA6]); // 应该是 0x26
  return isUtf8(buf) === false;
});

test('过长编码 - "\'" (0x27) 用 3 字节', () => {
  const buf = Buffer.from([0xE0, 0x80, 0xA7]); // 应该是 0x27
  return isUtf8(buf) === false;
});

test('过长编码 - "\\" (0x5C) 用 2 字节', () => {
  const buf = Buffer.from([0xC1, 0x9C]); // 应该是 0x5C
  return isUtf8(buf) === false;
});

// 过长编码的所有可能形式
test('过长 2 字节 - 最小 (0xC0 0x80)', () => {
  const buf = Buffer.from([0xC0, 0x80]);
  return isUtf8(buf) === false;
});

test('过长 2 字节 - 最大 (0xC1 0xBF)', () => {
  const buf = Buffer.from([0xC1, 0xBF]);
  return isUtf8(buf) === false;
});

test('过长 3 字节 - 最小 (0xE0 0x80 0x80)', () => {
  const buf = Buffer.from([0xE0, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('过长 3 字节 - 边界 (0xE0 0x9F 0xBF)', () => {
  const buf = Buffer.from([0xE0, 0x9F, 0xBF]);
  return isUtf8(buf) === false;
});

test('过长 4 字节 - 最小 (0xF0 0x80 0x80 0x80)', () => {
  const buf = Buffer.from([0xF0, 0x80, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('过长 4 字节 - 边界 (0xF0 0x8F 0xBF 0xBF)', () => {
  const buf = Buffer.from([0xF0, 0x8F, 0xBF, 0xBF]);
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
