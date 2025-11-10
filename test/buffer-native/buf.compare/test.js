// buf.compare() - Complete Tests
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

test('相等的 buffer', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  return buf1.compare(buf2) === 0;
});

test('buf1 < buf2', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abd');
  return buf1.compare(buf2) < 0;
});

test('buf1 > buf2', () => {
  const buf1 = Buffer.from('abd');
  const buf2 = Buffer.from('abc');
  return buf1.compare(buf2) > 0;
});

test('不同长度 - buf1 较短', () => {
  const buf1 = Buffer.from('ab');
  const buf2 = Buffer.from('abc');
  return buf1.compare(buf2) < 0;
});

test('指定范围比较', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  return buf1.compare(buf2, 0, 5, 0, 5) < 0;
});

test('部分范围相等', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('xellx');
  return buf1.compare(buf2, 1, 4, 1, 4) === 0;
});

test('与自身比较', () => {
  const buf = Buffer.from('test');
  return buf.compare(buf) === 0;
});

test('空 buffer 比较', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  return buf1.compare(buf2) === 0;
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
