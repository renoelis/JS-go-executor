// buf.readBigInt64LE() - 基础功能测试
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

// 基本读取测试
test('读取正数 BigInt', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  return buf.readBigInt64LE(0) === 100n;
});

test('读取负数 BigInt', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-100n, 0);
  return buf.readBigInt64LE(0) === -100n;
});

test('读取零', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0n, 0);
  return buf.readBigInt64LE(0) === 0n;
});

test('读取最大值 (2^63-1)', () => {
  const buf = Buffer.alloc(8);
  const max = 9223372036854775807n;
  buf.writeBigInt64LE(max, 0);
  return buf.readBigInt64LE(0) === max;
});

test('读取最小值 (-2^63)', () => {
  const buf = Buffer.alloc(8);
  const min = -9223372036854775808n;
  buf.writeBigInt64LE(min, 0);
  return buf.readBigInt64LE(0) === min;
});

// offset 默认值
test('offset 默认值为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(12345n, 0);
  return buf.readBigInt64LE() === 12345n;
});

// 不同 offset 位置
test('offset = 0', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(111n, 0);
  return buf.readBigInt64LE(0) === 111n;
});

test('offset = 8', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(222n, 8);
  return buf.readBigInt64LE(8) === 222n;
});

test('offset = buf.length - 8（边界）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(333n, 8);
  return buf.readBigInt64LE(8) === 333n;
});

// 往返测试
test('写入后读取一致性', () => {
  const buf = Buffer.alloc(8);
  const value = 9876543210n;
  buf.writeBigInt64LE(value, 0);
  return buf.readBigInt64LE(0) === value;
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
