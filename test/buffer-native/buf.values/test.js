// buf.values() - Complete Tests
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
  const iter = buf.values();
  return typeof iter.next === 'function';
});

test('迭代所有值', () => {
  const buf = Buffer.from([1, 2, 3]);
  const values = Array.from(buf.values());
  return values.length === 3 && values[0] === 1 && values[2] === 3;
});

test('for...of 循环', () => {
  const buf = Buffer.from([10, 20, 30]);
  const vals = [];
  for (const value of buf.values()) {
    vals.push(value);
  }
  return vals.length === 3 && vals[1] === 20;
});

test('空 buffer', () => {
  const buf = Buffer.alloc(0);
  const values = Array.from(buf.values());
  return values.length === 0;
});

test('扩展运算符', () => {
  const buf = Buffer.from([5, 10, 15]);
  const values = [...buf.values()];
  return values.length === 3 && values[2] === 15;
});

test('与 Symbol.iterator 等价', () => {
  const buf = Buffer.from([1, 2, 3]);
  const v1 = Array.from(buf.values());
  const v2 = Array.from(buf);
  return v1.length === v2.length && v1[0] === v2[0];
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
