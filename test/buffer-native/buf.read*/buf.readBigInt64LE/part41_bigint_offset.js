// buf.readBigInt64LE() - BigInt 作为 offset 参数测试
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

// BigInt 作为 offset
test('offset = 0n (BigInt)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(12345n, 0);
    const result = buf.readBigInt64LE(0n);
    return result === 12345n;
  } catch (e) {
    // BigInt 作为 offset 可能抛出 TypeError
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = 1n (BigInt)', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigInt64LE(1n);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = -1n (负 BigInt)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(-1n);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = 9007199254740992n (大 BigInt)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(9007199254740992n);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = BigInt(0)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(99999n, 0);
    const result = buf.readBigInt64LE(BigInt(0));
    return result === 99999n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = BigInt(8)', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigInt64LE(77777n, 8);
    const result = buf.readBigInt64LE(BigInt(8));
    return result === 77777n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 极端 BigInt 值
test('offset = 2n ** 63n (超大 BigInt)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(2n ** 63n);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = -(2n ** 63n) (超小 BigInt)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(-(2n ** 63n));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
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
