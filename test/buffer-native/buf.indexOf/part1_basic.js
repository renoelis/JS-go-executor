// buf.indexOf() - Complete Tests
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


test('查找字符串', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world') === 6;
});

test('未找到返回 -1', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('foo') === -1;
});

test('查找数字', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.indexOf(3) === 2;
});

test('查找 Buffer', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf(Buffer.from('world')) === 6;
});

test('指定 byteOffset', () => {
  const buf = Buffer.from('hello hello');
  return buf.indexOf('hello', 1) === 6;
});

test('从开头查找', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('h') === 0;
});

test('空字符串', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('') === 0;
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
