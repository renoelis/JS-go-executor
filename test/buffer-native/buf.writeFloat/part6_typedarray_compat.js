// buf.writeFloatBE/LE() - TypedArray 兼容性测试
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

// Uint8Array 作为 this
test('writeFloatBE 在 Uint8Array 上调用', () => {
  const arr = new Uint8Array(4);
  Buffer.prototype.writeFloatBE.call(arr, 42.5, 0);
  const buf = Buffer.from(arr.buffer);
  const value = buf.readFloatBE(0);
  return value === 42.5;
});

test('writeFloatLE 在 Uint8Array 上调用', () => {
  const arr = new Uint8Array(4);
  Buffer.prototype.writeFloatLE.call(arr, 42.5, 0);
  const buf = Buffer.from(arr.buffer);
  const value = buf.readFloatLE(0);
  return value === 42.5;
});

// 其他 TypedArray 类型
test('writeFloatBE 在 Int8Array 上调用', () => {
  const arr = new Int8Array(4);
  Buffer.prototype.writeFloatBE.call(arr, 10.5, 0);
  const buf = Buffer.from(arr.buffer);
  const value = buf.readFloatBE(0);
  return value === 10.5;
});

test('writeFloatLE 在 Int8Array 上调用', () => {
  const arr = new Int8Array(4);
  Buffer.prototype.writeFloatLE.call(arr, 10.5, 0);
  const buf = Buffer.from(arr.buffer);
  const value = buf.readFloatLE(0);
  return value === 10.5;
});

test('writeFloatBE 在 Uint16Array 上调用会抛出错误', () => {
  const arr = new Uint16Array(2);
  try {
    Buffer.prototype.writeFloatBE.call(arr, 15.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer bounds') || e.message.includes('out of range');
  }
});

test('writeFloatLE 在 Uint16Array 上调用会抛出错误', () => {
  const arr = new Uint16Array(2);
  try {
    Buffer.prototype.writeFloatLE.call(arr, 15.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer bounds') || e.message.includes('out of range');
  }
});

test('writeFloatBE 在 Uint32Array 上调用会抛出错误', () => {
  const arr = new Uint32Array(1);
  try {
    Buffer.prototype.writeFloatBE.call(arr, 20.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer bounds') || e.message.includes('out of range');
  }
});

test('writeFloatLE 在 Uint32Array 上调用会抛出错误', () => {
  const arr = new Uint32Array(1);
  try {
    Buffer.prototype.writeFloatLE.call(arr, 20.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer bounds') || e.message.includes('out of range');
  }
});

test('writeFloatBE 在 Float32Array 上调用会抛出错误', () => {
  const arr = new Float32Array(1);
  try {
    Buffer.prototype.writeFloatBE.call(arr, 25.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer bounds') || e.message.includes('out of range');
  }
});

test('writeFloatLE 在 Float32Array 上调用会抛出错误', () => {
  const arr = new Float32Array(1);
  try {
    Buffer.prototype.writeFloatLE.call(arr, 25.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer bounds') || e.message.includes('out of range');
  }
});

test('writeFloatBE 在 Float64Array 上调用需要足够空间', () => {
  const arr = new Float64Array(1);
  try {
    Buffer.prototype.writeFloatBE.call(arr, 30.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer bounds') || e.message.includes('out of range');
  }
});

test('writeFloatLE 在 Float64Array 上调用需要足够空间', () => {
  const arr = new Float64Array(1);
  try {
    Buffer.prototype.writeFloatLE.call(arr, 30.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer bounds') || e.message.includes('out of range');
  }
});

// DataView 视图
test('writeFloatBE 在 DataView 包装的 buffer 上调用', () => {
  const arrayBuffer = new ArrayBuffer(8);
  const view = new Uint8Array(arrayBuffer);
  Buffer.prototype.writeFloatBE.call(view, 35.5, 0);
  const buf = Buffer.from(arrayBuffer);
  const value = buf.readFloatBE(0);
  return value === 35.5;
});

test('writeFloatLE 在 DataView 包装的 buffer 上调用', () => {
  const arrayBuffer = new ArrayBuffer(8);
  const view = new Uint8Array(arrayBuffer);
  Buffer.prototype.writeFloatLE.call(view, 35.5, 0);
  const buf = Buffer.from(arrayBuffer);
  const value = buf.readFloatLE(0);
  return value === 35.5;
});

// TypedArray 的 subarray
test('writeFloatBE 在 TypedArray subarray 上调用', () => {
  const arr = new Uint8Array(10);
  const sub = arr.subarray(2, 6);
  Buffer.prototype.writeFloatBE.call(sub, 40.5, 0);
  const buf = Buffer.from(sub.buffer, sub.byteOffset, sub.byteLength);
  const value = buf.readFloatBE(0);
  return value === 40.5;
});

test('writeFloatLE 在 TypedArray subarray 上调用', () => {
  const arr = new Uint8Array(10);
  const sub = arr.subarray(2, 6);
  Buffer.prototype.writeFloatLE.call(sub, 40.5, 0);
  const buf = Buffer.from(sub.buffer, sub.byteOffset, sub.byteLength);
  const value = buf.readFloatLE(0);
  return value === 40.5;
});

// Buffer.from 创建的不同类型 buffer
test('writeFloatBE 在 Buffer.from(ArrayBuffer) 上调用', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  buf.writeFloatBE(45.5, 0);
  const value = buf.readFloatBE(0);
  return value === 45.5;
});

test('writeFloatLE 在 Buffer.from(ArrayBuffer) 上调用', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  buf.writeFloatLE(45.5, 0);
  const value = buf.readFloatLE(0);
  return value === 45.5;
});

test('writeFloatBE 在 Buffer.from(TypedArray) 上调用', () => {
  const arr = new Uint8Array(4);
  const buf = Buffer.from(arr);
  buf.writeFloatBE(50.5, 0);
  const value = buf.readFloatBE(0);
  return value === 50.5;
});

test('writeFloatLE 在 Buffer.from(TypedArray) 上调用', () => {
  const arr = new Uint8Array(4);
  const buf = Buffer.from(arr);
  buf.writeFloatLE(50.5, 0);
  const value = buf.readFloatLE(0);
  return value === 50.5;
});

// Buffer.alloc vs Buffer.allocUnsafe
test('writeFloatBE 在 Buffer.alloc 上调用', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(55.5, 0);
  const value = buf.readFloatBE(0);
  return value === 55.5;
});

test('writeFloatLE 在 Buffer.alloc 上调用', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(55.5, 0);
  const value = buf.readFloatLE(0);
  return value === 55.5;
});

test('writeFloatBE 在 Buffer.allocUnsafe 上调用', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(60.5, 0);
  const value = buf.readFloatBE(0);
  return value === 60.5;
});

test('writeFloatLE 在 Buffer.allocUnsafe 上调用', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(60.5, 0);
  const value = buf.readFloatLE(0);
  return value === 60.5;
});

test('writeFloatBE 在 Buffer.allocUnsafeSlow 上调用', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeFloatBE(65.5, 0);
  const value = buf.readFloatBE(0);
  return value === 65.5;
});

test('writeFloatLE 在 Buffer.allocUnsafeSlow 上调用', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeFloatLE(65.5, 0);
  const value = buf.readFloatLE(0);
  return value === 65.5;
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
