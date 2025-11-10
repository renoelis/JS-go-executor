// buf.keys() - Complete Tests
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


test('返回迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return typeof iter.next === 'function';
});

test('迭代所有索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('for...of 循环', () => {
  const buf = Buffer.from([1, 2, 3]);
  const indices = [];
  for (const key of buf.keys()) {
    indices.push(key);
  }
  return indices.length === 3 && indices[1] === 1;
});

test('空 buffer', () => {
  const buf = Buffer.alloc(0);
  const keys = Array.from(buf.keys());
  return keys.length === 0;
});

test('扩展运算符', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = [...buf.keys()];
  return keys.length === 3 && keys[0] === 0;
});

test('Array.from 转换', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = Array.from(buf.keys());
  return arr.length === 5 && arr[4] === 4;
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
