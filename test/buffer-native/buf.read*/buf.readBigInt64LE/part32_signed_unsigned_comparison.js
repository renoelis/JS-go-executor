// buf.readBigInt64LE() - 有符号与无符号对比测试
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

// 正数范围：有符号和无符号应相同
test('正数：readBigInt64LE 与 readBigUInt64LE 结果相同', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  return buf.readBigInt64LE(0) === buf.readBigUInt64LE(0);
});

test('零：readBigInt64LE 与 readBigUInt64LE 结果相同', () => {
  const buf = Buffer.alloc(8);
  return buf.readBigInt64LE(0) === buf.readBigUInt64LE(0);
});

test('最大正数（2^63-1）：readBigInt64LE 与 readBigUInt64LE 结果相同', () => {
  const buf = Buffer.alloc(8);
  const max = 9223372036854775807n;
  buf.writeBigInt64LE(max, 0);
  return buf.readBigInt64LE(0) === buf.readBigUInt64LE(0);
});

// 负数范围：有符号和无符号应不同
test('负数 -1：readBigInt64LE 返回 -1n', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readBigInt64LE(0) === -1n;
});

test('负数 -1：readBigUInt64LE 返回 2^64-1', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readBigUInt64LE(0) === 18446744073709551615n;
});

test('最小有符号数（-2^63）：readBigInt64LE 正确', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  return buf.readBigInt64LE(0) === -9223372036854775808n;
});

test('最小有符号数（-2^63）：readBigUInt64LE 返回 2^63', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  return buf.readBigUInt64LE(0) === 9223372036854775808n;
});

// 边界转换测试
test('0x7FFFFFFFFFFFFFFF：有符号最大值 = 无符号中间值', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  const signed = buf.readBigInt64LE(0);
  const unsigned = buf.readBigUInt64LE(0);
  return signed === 9223372036854775807n && unsigned === 9223372036854775807n;
});

test('0x8000000000000000：有符号最小值 vs 无符号 2^63', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  const signed = buf.readBigInt64LE(0);
  const unsigned = buf.readBigUInt64LE(0);
  return signed === -9223372036854775808n && unsigned === 9223372036854775808n;
});

// 符号位测试
test('符号位为0：两种方法结果相同', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigInt64LE(0) === buf.readBigUInt64LE(0);
});

test('符号位为1：两种方法结果不同', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x81]);
  const signed = buf.readBigInt64LE(0);
  const unsigned = buf.readBigUInt64LE(0);
  return signed < 0n && unsigned > 0n && signed !== unsigned;
});

// 二进制补码验证
test('-2 的有符号表示 vs 无符号表示', () => {
  const buf = Buffer.from([0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  const signed = buf.readBigInt64LE(0);
  const unsigned = buf.readBigUInt64LE(0);
  return signed === -2n && unsigned === 18446744073709551614n;
});

test('-256 的有符号表示 vs 无符号表示', () => {
  const buf = Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  const signed = buf.readBigInt64LE(0);
  const unsigned = buf.readBigUInt64LE(0);
  return signed === -256n && unsigned === 18446744073709551360n;
});

// 转换关系测试
test('负数转无符号：-1 + 2^64 = 无符号值', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  const signed = buf.readBigInt64LE(0);
  const unsigned = buf.readBigUInt64LE(0);
  return signed + (1n << 64n) === unsigned;
});

test('负数转无符号：-2^63 + 2^64 = 2^63', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  const signed = buf.readBigInt64LE(0);
  const unsigned = buf.readBigUInt64LE(0);
  return signed + (1n << 64n) === unsigned;
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
