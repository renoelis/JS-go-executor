// buf.readFloatLE() - Complete Tests
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

test('读取正浮点数', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.14, 0);
  return buf.readFloatLE(0) - 3.14 < 0.0001;
});

test('读取负浮点数', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(-2.5, 0);
  return buf.readFloatLE(0) === -2.5;
});

test('读取零', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(0, 0);
  return buf.readFloatLE(0) === 0;
});

test('读取 Infinity', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(Infinity, 0);
  return buf.readFloatLE(0) === Infinity;
});

test('读取 NaN', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(NaN, 0);
  return Number.isNaN(buf.readFloatLE(0));
});

test('offset 测试', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(1.5, 4);
  return buf.readFloatLE(4) === 1.5;
});

test('RangeError: offset 超出', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: 负数 offset', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('往返测试', () => {
  const buf = Buffer.alloc(4);
  const value = 3.14159;
  buf.writeFloatLE(value, 0);
  return Math.abs(buf.readFloatLE(0) - value) < 0.0001;
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
