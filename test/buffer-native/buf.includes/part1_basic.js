// buf.includes() - Complete Tests
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


test('包含字符串', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world') === true;
});

test('不包含字符串', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('foo') === false;
});

test('包含数字', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.includes(3) === true;
});

test('包含 Buffer', () => {
  const buf = Buffer.from('hello world');
  return buf.includes(Buffer.from('world')) === true;
});

test('指定 byteOffset', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', 6) === true;
});

test('byteOffset 超过位置', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', 6) === false;
});

test('空字符串总是 true', () => {
  const buf = Buffer.from('hello');
  return buf.includes('') === true;
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
