// buf.lastIndexOf() - Complete Tests
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


test('最后出现', () => {
  const buf = Buffer.from('hello hello');
  return buf.lastIndexOf('hello') === 6;
});

test('未找到返回 -1', () => {
  const buf = Buffer.from('hello world');
  return buf.lastIndexOf('foo') === -1;
});

test('查找数字', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);
  return buf.lastIndexOf(2) === 3;
});

test('查找 Buffer', () => {
  const buf = Buffer.from('hello hello');
  return buf.lastIndexOf(Buffer.from('hello')) === 6;
});

test('指定 byteOffset', () => {
  const buf = Buffer.from('hello hello');
  return buf.lastIndexOf('hello', 5) === 0;
});

test('只有一个匹配', () => {
  const buf = Buffer.from('hello world');
  return buf.lastIndexOf('world') === 6;
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
