// buf.entries() - Complete Tests
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
  const iter = buf.entries();
  return typeof iter.next === 'function';
});

test('迭代所有索引和值', () => {
  const buf = Buffer.from([1, 2, 3]);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[0][0] === 0 && entries[0][1] === 1;
});

test('for...of 循环', () => {
  const buf = Buffer.from([1, 2, 3]);
  let count = 0;
  for (const [index, value] of buf.entries()) {
    count++;
  }
  return count === 3;
});

test('空 buffer', () => {
  const buf = Buffer.alloc(0);
  const entries = Array.from(buf.entries());
  return entries.length === 0;
});

test('解构赋值', () => {
  const buf = Buffer.from([10, 20, 30]);
  const [[i0, v0], [i1, v1]] = buf.entries();
  return i0 === 0 && v0 === 10 && i1 === 1 && v1 === 20;
});

test('Array.from 转换', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Array.from(buf.entries());
  return arr[2][0] === 2 && arr[2][1] === 3;
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
