// buf.readDoubleLE() - Complete Tests
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
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(3.14159265359, 0);
  return Math.abs(buf.readDoubleLE(0) - 3.14159265359) < 0.000000001;
});

test('读取负浮点数', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-2.718281828, 0);
  return Math.abs(buf.readDoubleLE(0) - (-2.718281828)) < 0.000000001;
});

test('读取零', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(0, 0);
  return buf.readDoubleLE(0) === 0;
});

test('读取 Infinity', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Infinity, 0);
  return buf.readDoubleLE(0) === Infinity;
});

test('读取 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(NaN, 0);
  return Number.isNaN(buf.readDoubleLE(0));
});

test('读取最大值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.MAX_VALUE, 0);
  return buf.readDoubleLE(0) === Number.MAX_VALUE;
});

test('offset 测试', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(1.5, 8);
  return buf.readDoubleLE(8) === 1.5;
});

test('RangeError: offset 超出', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('高精度往返', () => {
  const buf = Buffer.alloc(8);
  const value = Math.PI;
  buf.writeDoubleLE(value, 0);
  return Math.abs(buf.readDoubleLE(0) - value) < 1e-15;
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
