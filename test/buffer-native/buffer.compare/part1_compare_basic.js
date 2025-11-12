// buffer.compare() - Basic Functionality Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (pass) {
      console.log('✅', name);
    } else {
      console.log('❌', name);
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌', name, '-', e.message);
  }
}

test('基本比较相等', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('基本比较小于', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 3, 3]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('基本比较大于', () => {
  const buf1 = Buffer.from([2, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2);
  return result > 0;
});

test('不同长度比较 - 相同前缀', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3, 4]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('不同长度比较 - 短前缀大', () => {
  const buf1 = Buffer.from([2, 2, 3]);
  const buf2 = Buffer.from([2, 2, 3, 4]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('空buffer比较', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('空buffer与非空buffer比较', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.from([1]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('单字节buffer比较', () => {
  const buf1 = Buffer.from([255]);
  const buf2 = Buffer.from([0]);
  const result = buf1.compare(buf2);
  return result > 0;
});

test('相同buffer对象比较', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = buf.compare(buf);
  return result === 0;
});

test('字符串内容比较', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('字符串内容比较不同', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abd');
  const result = buf1.compare(buf2);
  return result < 0;
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