// Buffer.isBuffer() - 各种数据类型测试
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

// TypedArray 系列测试
test('Uint16Array 返回 false', () => {
  const arr = new Uint16Array(5);
  return Buffer.isBuffer(arr) === false;
});

test('Uint32Array 返回 false', () => {
  const arr = new Uint32Array(5);
  return Buffer.isBuffer(arr) === false;
});

test('Int16Array 返回 false', () => {
  const arr = new Int16Array(5);
  return Buffer.isBuffer(arr) === false;
});

test('Int32Array 返回 false', () => {
  const arr = new Int32Array(5);
  return Buffer.isBuffer(arr) === false;
});

test('Float32Array 返回 false', () => {
  const arr = new Float32Array(5);
  return Buffer.isBuffer(arr) === false;
});

test('Float64Array 返回 false', () => {
  const arr = new Float64Array(5);
  return Buffer.isBuffer(arr) === false;
});

test('BigInt64Array 返回 false', () => {
  const arr = new BigInt64Array(5);
  return Buffer.isBuffer(arr) === false;
});

test('BigUint64Array 返回 false', () => {
  const arr = new BigUint64Array(5);
  return Buffer.isBuffer(arr) === false;
});

test('Uint8ClampedArray 返回 false', () => {
  const arr = new Uint8ClampedArray(5);
  return Buffer.isBuffer(arr) === false;
});

// DataView 测试
test('DataView 返回 false', () => {
  const ab = new ArrayBuffer(10);
  const dv = new DataView(ab);
  return Buffer.isBuffer(dv) === false;
});

// 数字类型测试
test('整数 0 返回 false', () => {
  return Buffer.isBuffer(0) === false;
});

test('负数返回 false', () => {
  return Buffer.isBuffer(-123) === false;
});

test('浮点数返回 false', () => {
  return Buffer.isBuffer(3.14) === false;
});

test('NaN 返回 false', () => {
  return Buffer.isBuffer(NaN) === false;
});

test('Infinity 返回 false', () => {
  return Buffer.isBuffer(Infinity) === false;
});

test('-Infinity 返回 false', () => {
  return Buffer.isBuffer(-Infinity) === false;
});

test('BigInt 返回 false', () => {
  return Buffer.isBuffer(BigInt(123)) === false;
});

// 字符串类型测试
test('空字符串返回 false', () => {
  return Buffer.isBuffer('') === false;
});

test('长字符串返回 false', () => {
  const longStr = 'a'.repeat(10000);
  return Buffer.isBuffer(longStr) === false;
});

test('Unicode 字符串返回 false', () => {
  return Buffer.isBuffer('你好世界🌍') === false;
});

// 对象类型测试
test('Function 返回 false', () => {
  return Buffer.isBuffer(function() {}) === false;
});

test('箭头函数返回 false', () => {
  return Buffer.isBuffer(() => {}) === false;
});

test('Date 返回 false', () => {
  return Buffer.isBuffer(new Date()) === false;
});

test('RegExp 返回 false', () => {
  return Buffer.isBuffer(/test/) === false;
});

test('Error 返回 false', () => {
  return Buffer.isBuffer(new Error('test')) === false;
});

test('Map 返回 false', () => {
  return Buffer.isBuffer(new Map()) === false;
});

test('Set 返回 false', () => {
  return Buffer.isBuffer(new Set()) === false;
});

test('WeakMap 返回 false', () => {
  return Buffer.isBuffer(new WeakMap()) === false;
});

test('WeakSet 返回 false', () => {
  return Buffer.isBuffer(new WeakSet()) === false;
});

test('Promise 返回 false', () => {
  return Buffer.isBuffer(Promise.resolve()) === false;
});

test('Symbol 返回 false', () => {
  return Buffer.isBuffer(Symbol('test')) === false;
});

// 类数组对象测试
test('类数组对象返回 false', () => {
  const arrayLike = { 0: 1, 1: 2, 2: 3, length: 3 };
  return Buffer.isBuffer(arrayLike) === false;
});

test('Arguments 对象返回 false', () => {
  function getArgs() {
    return arguments;
  }
  return Buffer.isBuffer(getArgs(1, 2, 3)) === false;
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
