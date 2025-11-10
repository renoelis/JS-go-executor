// buf.readFloatBE() - 最终边缘场景补充测试
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

// Map/Set 作为 offset
test('offset = new Map()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new Map());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new Set()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new Set());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new WeakMap()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new WeakMap());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new WeakSet()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new WeakSet());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Promise 作为 offset
test('offset = Promise.resolve(0)（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(Promise.resolve(0));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// ArrayBuffer 作为 offset
test('offset = new ArrayBuffer(4)（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new ArrayBuffer(4));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Error 对象作为 offset
test('offset = new Error()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new Error());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new TypeError()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new TypeError());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Buffer 作为 offset
test('offset = Buffer.from([0])（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(Buffer.from([0]));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// TypedArray 作为 offset
test('offset = new Uint8Array([0])（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new Uint8Array([0]));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new Int32Array([0])（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new Int32Array([0]));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// DataView 作为 offset
test('offset = new DataView(new ArrayBuffer(4))（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new DataView(new ArrayBuffer(4)));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 类数组对象作为 offset
test('offset = { length: 0 }（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE({ length: 0 });
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = { 0: 0, length: 1 }（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE({ 0: 0, length: 1 });
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 特殊数值表示
test('offset = 4（整数值有效）', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(123.456, 4);
  const result = buf.readFloatBE(4);
  return Math.abs(result - 123.456) < 0.001;
});

test('offset = 0（整数零有效）', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(789.012, 0);
  const result = buf.readFloatBE(0);
  return Math.abs(result - 789.012) < 0.001;
});

// 极端 offset 值
test('offset = Number.MIN_SAFE_INTEGER（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 2**31（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(2**31);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 2**32（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(2**32);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
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
