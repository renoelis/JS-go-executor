// buf.length - Part 3: TypedArray and ArrayBuffer
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

// TypedArray 测试
test('从 Uint8Array 创建的长度', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(arr);
  return buf.length === 5;
});

test('从 Uint16Array 创建的长度', () => {
  const arr = new Uint16Array([1, 2, 3]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 6; // 3 个元素 * 2 字节
});

test('从 Uint32Array 创建的长度', () => {
  const arr = new Uint32Array([1, 2]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 8; // 2 个元素 * 4 字节
});

test('从 Int8Array 创建的长度', () => {
  const arr = new Int8Array([1, 2, 3, 4]);
  const buf = Buffer.from(arr);
  return buf.length === 4;
});

test('从 Int16Array 创建的长度', () => {
  const arr = new Int16Array([1, 2, 3]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 6;
});

test('从 Int32Array 创建的长度', () => {
  const arr = new Int32Array([1, 2]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 8;
});

test('从 Float32Array 创建的长度', () => {
  const arr = new Float32Array([1.5, 2.5]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 8; // 2 个元素 * 4 字节
});

test('从 Float64Array 创建的长度', () => {
  const arr = new Float64Array([1.5, 2.5]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 16; // 2 个元素 * 8 字节
});

// ArrayBuffer 测试
test('从 ArrayBuffer 创建的长度', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  return buf.length === 10;
});

test('从空 ArrayBuffer 创建的长度', () => {
  const ab = new ArrayBuffer(0);
  const buf = Buffer.from(ab);
  return buf.length === 0;
});

test('从 ArrayBuffer 的部分创建', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2, 5);
  return buf.length === 5;
});

// BigInt TypedArray 测试
test('从 BigInt64Array 创建的长度', () => {
  const arr = new BigInt64Array([1n, 2n]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 16; // 2 个元素 * 8 字节
});

test('从 BigUint64Array 创建的长度', () => {
  const arr = new BigUint64Array([1n, 2n]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 16;
});

// Uint8ClampedArray 测试
test('从 Uint8ClampedArray 创建的长度', () => {
  const arr = new Uint8ClampedArray([1, 2, 3, 4, 5]);
  const buf = Buffer.from(arr);
  return buf.length === 5;
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
