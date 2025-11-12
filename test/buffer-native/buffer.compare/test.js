// Buffer.compare() - Complete Tests
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
  return Buffer.compare(buf1, buf2) === 0;
});

test('buf1 < buf2', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abd');
  return Buffer.compare(buf1, buf2) < 0;
});

test('buf1 > buf2', () => {
  const buf1 = Buffer.from('abd');
  const buf2 = Buffer.from('abc');
  return Buffer.compare(buf1, buf2) > 0;
});

test('不同长度', () => {
  const buf1 = Buffer.from('ab');
  const buf2 = Buffer.from('abc');
  return Buffer.compare(buf1, buf2) < 0;
});

test('用于排序', () => {
  const arr = [
    Buffer.from('zzz'),
    Buffer.from('aaa'),
    Buffer.from('mmm')
  ];
  arr.sort(Buffer.compare);
  return arr[0].toString() === 'aaa' && arr[2].toString() === 'zzz';
});

test('TypeError: 非 Buffer 参数', () => {
  try {
    Buffer.compare('not a buffer', Buffer.alloc(1));
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
