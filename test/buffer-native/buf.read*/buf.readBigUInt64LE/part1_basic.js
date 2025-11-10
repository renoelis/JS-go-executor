// buf.readBigUInt64LE() - 基础功能测试
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
test('读取零', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0n, 0);
  return buf.readBigUInt64LE(0) === 0n;
});

test('读取正数 BigInt', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(100n, 0);
  return buf.readBigUInt64LE(0) === 100n;
});

test('读取最大值 (2^64-1)', () => {
  const buf = Buffer.alloc(8);
  const max = 18446744073709551615n;
  buf.writeBigUInt64LE(max, 0);
  return buf.readBigUInt64LE(0) === max;
});

test('读取中间值', () => {
  const buf = Buffer.alloc(8);
  const mid = 9223372036854775808n; // 2^63
  buf.writeBigUInt64LE(mid, 0);
  return buf.readBigUInt64LE(0) === mid;
});

// offset 默认值
test('offset 默认值为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(12345n, 0);
  return buf.readBigUInt64LE() === 12345n;
});

// 不同 offset 位置
test('offset = 0', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(111n, 0);
  return buf.readBigUInt64LE(0) === 111n;
});

test('offset = 8', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(222n, 8);
  return buf.readBigUInt64LE(8) === 222n;
});

test('offset = buf.length - 8（边界）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(333n, 8);
  return buf.readBigUInt64LE(8) === 333n;
});

// 往返测试
test('写入后读取一致性', () => {
  const buf = Buffer.alloc(8);
  const value = 9876543210n;
  buf.writeBigUInt64LE(value, 0);
  return buf.readBigUInt64LE(0) === value;
});

// Little-Endian 字节序验证
test('Little-Endian 字节序正确', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigUInt64LE(0) === 256n;
});

test('Little-Endian 低位字节在前', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigUInt64LE(0) === 1n; // 第一个字节是最低位
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
