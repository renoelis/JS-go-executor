// buf.equals() - Complete Tests
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


test('相同内容', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  return buf1.equals(buf2) === true;
});

test('不同内容', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  return buf1.equals(buf2) === false;
});

test('不同长度', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hi');
  return buf1.equals(buf2) === false;
});

test('空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  return buf1.equals(buf2) === true;
});

test('与自身比较', () => {
  const buf = Buffer.from('test');
  return buf.equals(buf) === true;
});

test('Uint8Array 参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  return buf.equals(arr) === true;
});

test('TypeError: 非 Buffer', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals('hello');
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
