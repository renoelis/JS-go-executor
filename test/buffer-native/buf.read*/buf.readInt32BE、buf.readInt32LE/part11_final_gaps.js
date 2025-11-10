// 最终查缺补漏 - BigInt和函数类型offset
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

// === BigInt 类型 offset ===

test('offset = 0n (BigInt) 应该抛出TypeError - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(0n);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = 1n (BigInt) 应该抛出TypeError - LE', () => {
  try {
    const buf = Buffer.from([0x00, 0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(1n);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = BigInt(2) 应该抛出TypeError - BE', () => {
  try {
    const buf = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(BigInt(2));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === 函数类型 offset ===

test('offset = () => 0 (箭头函数) 应该抛出TypeError - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(() => 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = function() { return 0 } 应该抛出TypeError - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(function() { return 0; });
    return false;
  } catch (e) {
    return e.name === 'TypeError';
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
