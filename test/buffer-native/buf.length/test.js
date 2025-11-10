// buf.length - Complete Tests
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


test('alloc 的长度', () => {
  const buf = Buffer.alloc(10);
  return buf.length === 10;
});

test('from 字符串的长度', () => {
  const buf = Buffer.from('hello');
  return buf.length === 5;
});

test('from 数组的长度', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.length === 5;
});

test('空 buffer 长度为 0', () => {
  const buf = Buffer.alloc(0);
  return buf.length === 0;
});

test('slice 后的长度', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(2, 7);
  return slice.length === 5;
});

test('subarray 后的长度', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(3, 8);
  return sub.length === 5;
});

test('中文字符串的字节长度', () => {
  const buf = Buffer.from('你好');
  return buf.length === 6; // UTF-8 每个中文 3 字节
});

test('length 只读', () => {
  const buf = Buffer.alloc(5);
  const original = buf.length;
  try {
    buf.length = 100;
  } catch (e) {
    // 可能抛出错误或静默失败
  }
  return buf.length === original;
});

test('length 与 byteLength 一致', () => {
  const buf = Buffer.alloc(10);
  return buf.length === buf.byteLength;
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
