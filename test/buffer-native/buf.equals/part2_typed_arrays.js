// buf.equals() - TypedArray Tests
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

// TypedArray 类型测试
// 注意：Node.js v25.0.0 的 buf.equals() 只接受 Buffer 或 Uint8Array

test('TypeError: Int8Array 参数', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new Int8Array([1, 2, 3]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('Uint16Array 转 Buffer 比较', () => {
  const buf = Buffer.from([0, 1, 0, 2]);
  const arr = new Uint16Array([256, 512]); // Little-endian: [0, 1, 0, 2]
  return buf.equals(Buffer.from(arr.buffer)) === true;
});

test('Int16Array 转 Buffer 比较 - 负数', () => {
  const buf = Buffer.from([255, 255, 0, 128]); // -1, -32768 in little-endian
  const arr = new Int16Array([-1, -32768]);
  return buf.equals(Buffer.from(arr.buffer)) === true;
});

test('Uint32Array 转 Buffer 比较', () => {
  const buf = Buffer.from([1, 0, 0, 0, 2, 0, 0, 0]);
  const arr = new Uint32Array([1, 2]);
  return buf.equals(Buffer.from(arr.buffer)) === true;
});

test('Int32Array 转 Buffer 比较 - 负数', () => {
  const buf = Buffer.from([255, 255, 255, 255]);
  const arr = new Int32Array([-1]);
  return buf.equals(Buffer.from(arr.buffer)) === true;
});

test('TypeError: Float32Array 参数', () => {
  try {
    const arr = new Float32Array([1.5, 2.5]);
    const buf = Buffer.from(arr.buffer);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: Float64Array 参数', () => {
  try {
    const arr = new Float64Array([1.5, 2.5]);
    const buf = Buffer.from(arr.buffer);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: Uint8ClampedArray 参数', () => {
  try {
    const buf = Buffer.from([0, 128, 255]);
    const arr = new Uint8ClampedArray([0, 128, 255]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: BigInt64Array 参数', () => {
  try {
    const arr = new BigInt64Array([1n, 2n]);
    const buf = Buffer.from(arr.buffer);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: BigUint64Array 参数', () => {
  try {
    const arr = new BigUint64Array([1n, 2n]);
    const buf = Buffer.from(arr.buffer);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('Uint8Array - 相同内容', () => {
  const buf = Buffer.from([255]);
  const uint8 = new Uint8Array([255]);
  return buf.equals(uint8) === true;
});

test('TypeError: DataView 参数', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    const arrayBuffer = new ArrayBuffer(4);
    const view = new DataView(arrayBuffer);
    view.setUint8(0, 1);
    view.setUint8(1, 2);
    view.setUint8(2, 3);
    view.setUint8(3, 4);
    buf.equals(view);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('空 Uint8Array', () => {
  const buf = Buffer.alloc(0);
  const arr = new Uint8Array(0);
  return buf.equals(arr) === true;
});

test('不同长度的 TypedArray', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2]);
  return buf.equals(arr) === false;
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

