// buf.readBigUInt64LE() - Complete Tests
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

test('offset 测试', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(12345n, 8);
  return buf.readBigUInt64LE(8) === 12345n;
});

test('RangeError: offset 超出', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('往返测试', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(12345n, 0);
  return buf.readBigUInt64LE(0) === 12345n;
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
