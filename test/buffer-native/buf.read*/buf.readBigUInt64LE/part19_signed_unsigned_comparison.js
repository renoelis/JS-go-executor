// buf.readBigUInt64LE() - 有符号与无符号对比测试
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
test('全 0xFF：readBigInt64LE 返回 -1n', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readBigInt64LE(0) === -1n;
});

test('全 0xFF：readBigUInt64LE 返回 2^64-1', () => {
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

// 不同字节模式
test('0x7F 开头：有符号为正，无符号也为正', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  const signed = buf.readBigInt64LE(0);
  const unsigned = buf.readBigUInt64LE(0);
  return signed === 9223372036854775807n && unsigned === 9223372036854775807n;
});

test('0x80 开头：有符号为负，无符号为正', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  const signed = buf.readBigInt64LE(0);
  const unsigned = buf.readBigUInt64LE(0);
  return signed < 0n && unsigned > 0n;
});

// LE vs BE 对比
test('readBigUInt64LE 与 readBigUInt64BE 不同（非对称值）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  return buf.readBigUInt64LE(0) !== buf.readBigUInt64BE(0);
});

test('readBigUInt64LE 与 readBigUInt64BE 相同（对称值）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x04, 0x03, 0x02, 0x01]);
  return buf.readBigUInt64LE(0) === buf.readBigUInt64BE(0);
});

// 范围验证
test('readBigUInt64LE 始终 >= 0', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readBigUInt64LE(0) >= 0n;
});

test('readBigUInt64LE 最大值 = 2^64-1', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readBigUInt64LE(0) === 18446744073709551615n;
});

test('readBigUInt64LE 最小值 = 0', () => {
  const buf = Buffer.alloc(8);
  return buf.readBigUInt64LE(0) === 0n;
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
