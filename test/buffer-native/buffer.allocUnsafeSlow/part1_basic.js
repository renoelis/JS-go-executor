// Buffer.allocUnsafeSlow() - Complete Tests
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


test('分配指定大小', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.length === 10;
});

test('分配零大小', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0;
});

test('返回 Buffer 实例', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  return Buffer.isBuffer(buf);
});

test('不使用内部池', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.length === 10;
});

test('RangeError: 负数', () => {
  try {
    Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('TypeError: 字符串参数', () => {
  try {
    Buffer.allocUnsafeSlow('10');
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
