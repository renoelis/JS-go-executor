// buffer.isUtf8() - Part 1: Basic Functionality Tests
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

// 基本功能测试
test('有效 UTF-8 - ASCII 字符', () => {
  const buf = Buffer.from('hello world', 'utf8');
  return isUtf8(buf) === true;
});

test('有效 UTF-8 - 中文字符', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  return isUtf8(buf) === true;
});

test('有效 UTF-8 - Emoji', () => {
  const buf = Buffer.from('😀🎉🌟', 'utf8');
  return isUtf8(buf) === true;
});

test('有效 UTF-8 - 混合字符', () => {
  const buf = Buffer.from('Hello 世界 😀', 'utf8');
  return isUtf8(buf) === true;
});

test('有效 UTF-8 - 日文', () => {
  const buf = Buffer.from('こんにちは', 'utf8');
  return isUtf8(buf) === true;
});

test('有效 UTF-8 - 韩文', () => {
  const buf = Buffer.from('안녕하세요', 'utf8');
  return isUtf8(buf) === true;
});

test('有效 UTF-8 - 俄文', () => {
  const buf = Buffer.from('Привет', 'utf8');
  return isUtf8(buf) === true;
});

test('有效 UTF-8 - 阿拉伯文', () => {
  const buf = Buffer.from('مرحبا', 'utf8');
  return isUtf8(buf) === true;
});

test('空 Buffer', () => {
  const buf = Buffer.from([]);
  return isUtf8(buf) === true; // 空被视为有效 UTF-8
});

test('单字节 UTF-8 (ASCII)', () => {
  const buf = Buffer.from([0x41]); // 'A'
  return isUtf8(buf) === true;
});

// 无效 UTF-8 序列
test('无效 UTF-8 - 孤立的延续字节', () => {
  const buf = Buffer.from([0x80]); // 延续字节但没有起始字节
  return isUtf8(buf) === false;
});

test('无效 UTF-8 - 不完整的 2 字节序列', () => {
  const buf = Buffer.from([0xC2]); // 2 字节序列的起始但缺少延续字节
  return isUtf8(buf) === false;
});

test('无效 UTF-8 - 不完整的 3 字节序列', () => {
  const buf = Buffer.from([0xE0, 0xA0]); // 3 字节序列但只有 2 字节
  return isUtf8(buf) === false;
});

test('无效 UTF-8 - 不完整的 4 字节序列', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80]); // 4 字节序列但只有 3 字节
  return isUtf8(buf) === false;
});

test('无效 UTF-8 - 过长编码', () => {
  const buf = Buffer.from([0xC0, 0x80]); // 'A' 的过长编码（应该是 0x41）
  return isUtf8(buf) === false;
});

test('无效 UTF-8 - 超出 Unicode 范围', () => {
  const buf = Buffer.from([0xF4, 0x90, 0x80, 0x80]); // > U+10FFFF
  return isUtf8(buf) === false;
});

test('无效 UTF-8 - 代理对编码', () => {
  const buf = Buffer.from([0xED, 0xA0, 0x80]); // U+D800 (高代理)
  return isUtf8(buf) === false;
});

// Uint8Array 测试
test('Uint8Array - 有效 UTF-8', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(arr) === true;
});

test('Uint8Array - 无效 UTF-8', () => {
  const arr = new Uint8Array([0x80, 0x80]);
  return isUtf8(arr) === false;
});

// ArrayBuffer 测试
test('ArrayBuffer - 有效 UTF-8', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  const bytes = Buffer.from('Hello', 'utf8');
  bytes.forEach((b, i) => view[i] = b);
  return isUtf8(ab) === true;
});

test('ArrayBuffer - 无效 UTF-8', () => {
  const ab = new ArrayBuffer(2);
  const view = new Uint8Array(ab);
  view[0] = 0x80;
  view[1] = 0x80;
  return isUtf8(ab) === false;
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
