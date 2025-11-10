// buf.readInt8() - Complete Tests
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

test('读取正数', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(127, 0);
  return buf.readInt8(0) === 127;
});

test('读取负数', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(-128, 0);
  return buf.readInt8(0) === -128;
});

test('读取零', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(0, 0);
  return buf.readInt8(0) === 0;
});

test('offset 测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(100, 3);
  return buf.readInt8(3) === 100;
});

test('RangeError: offset 超出', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readInt8(2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('往返测试', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(100, 0);
  return buf.readInt8(0) === 100;
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
