// buf.readInt8() - 完整数值范围测试
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

// 负数范围测试（-128 到 -1）
test('读取 -2', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(-2, 0);
  return buf.readInt8(0) === -2;
});

test('读取 -10', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(-10, 0);
  return buf.readInt8(0) === -10;
});

test('读取 -50', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(-50, 0);
  return buf.readInt8(0) === -50;
});

test('读取 -100', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(-100, 0);
  return buf.readInt8(0) === -100;
});

test('读取 -127（最小值 + 1）', () => {
  const buf = Buffer.from([0x81]);
  return buf.readInt8(0) === -127;
});

// 正数范围测试（1 到 127）
test('读取 2', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(2, 0);
  return buf.readInt8(0) === 2;
});

test('读取 10', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(10, 0);
  return buf.readInt8(0) === 10;
});

test('读取 50', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(50, 0);
  return buf.readInt8(0) === 50;
});

test('读取 100', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(100, 0);
  return buf.readInt8(0) === 100;
});

test('读取 126（最大值 - 1）', () => {
  const buf = Buffer.from([0x7E]);
  return buf.readInt8(0) === 126;
});

// 二进制补码边界测试
test('读取 0x7F（127，最大正数）', () => {
  const buf = Buffer.from([0x7F]);
  return buf.readInt8(0) === 127;
});

test('读取 0x80（-128，最小负数）', () => {
  const buf = Buffer.from([0x80]);
  return buf.readInt8(0) === -128;
});

test('读取 0xFE（-2）', () => {
  const buf = Buffer.from([0xFE]);
  return buf.readInt8(0) === -2;
});

test('读取 0x01（1）', () => {
  const buf = Buffer.from([0x01]);
  return buf.readInt8(0) === 1;
});

// 十六进制值系列测试
test('读取 0x10（16）', () => {
  const buf = Buffer.from([0x10]);
  return buf.readInt8(0) === 16;
});

test('读取 0x20（32）', () => {
  const buf = Buffer.from([0x20]);
  return buf.readInt8(0) === 32;
});

test('读取 0x40（64）', () => {
  const buf = Buffer.from([0x40]);
  return buf.readInt8(0) === 64;
});

test('读取 0x90（-112）', () => {
  const buf = Buffer.from([0x90]);
  return buf.readInt8(0) === -112;
});

test('读取 0xA0（-96）', () => {
  const buf = Buffer.from([0xA0]);
  return buf.readInt8(0) === -96;
});

test('读取 0xC0（-64）', () => {
  const buf = Buffer.from([0xC0]);
  return buf.readInt8(0) === -64;
});

test('读取 0xE0（-32）', () => {
  const buf = Buffer.from([0xE0]);
  return buf.readInt8(0) === -32;
});

test('读取 0xF0（-16）', () => {
  const buf = Buffer.from([0xF0]);
  return buf.readInt8(0) === -16;
});

// 连续值测试
test('连续读取多个不同值', () => {
  const buf = Buffer.from([127, -128, 0, 50, -50]);
  return buf.readInt8(0) === 127 &&
         buf.readInt8(1) === -128 &&
         buf.readInt8(2) === 0 &&
         buf.readInt8(3) === 50 &&
         buf.readInt8(4) === -50;
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
