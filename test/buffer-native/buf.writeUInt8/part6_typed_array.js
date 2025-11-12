// buf.writeUInt8() - TypedArray 兼容性测试
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

// Uint8Array
test('Uint8Array 调用 writeUInt8', () => {
  const arr = new Uint8Array(4);
  Buffer.prototype.writeUInt8.call(arr, 123, 0);
  return arr[0] === 123;
});

test('Uint8Array 写入多个值', () => {
  const arr = new Uint8Array(4);
  Buffer.prototype.writeUInt8.call(arr, 11, 0);
  Buffer.prototype.writeUInt8.call(arr, 22, 1);
  Buffer.prototype.writeUInt8.call(arr, 33, 2);
  Buffer.prototype.writeUInt8.call(arr, 44, 3);
  return arr[0] === 11 && arr[1] === 22 && arr[2] === 33 && arr[3] === 44;
});

// Uint8ClampedArray
test('Uint8ClampedArray 调用 writeUInt8', () => {
  const arr = new Uint8ClampedArray(4);
  Buffer.prototype.writeUInt8.call(arr, 123, 0);
  return arr[0] === 123;
});

// 其他 TypedArray
test('Uint16Array 调用 writeUInt8', () => {
  const arr = new Uint16Array(4);
  try {
    Buffer.prototype.writeUInt8.call(arr, 123, 0);
    return arr[0] === 123;
  } catch (e) {
    return true;
  }
});

test('Uint32Array 调用 writeUInt8', () => {
  const arr = new Uint32Array(4);
  try {
    Buffer.prototype.writeUInt8.call(arr, 123, 0);
    return arr[0] === 123;
  } catch (e) {
    return true;
  }
});

test('Int8Array 调用 writeUInt8', () => {
  const arr = new Int8Array(4);
  try {
    Buffer.prototype.writeUInt8.call(arr, 123, 0);
    return arr[0] === 123;
  } catch (e) {
    return true;
  }
});

// Buffer 与 Uint8Array 互操作
test('Buffer 从 Uint8Array 创建后写入', () => {
  const arr = new Uint8Array(4);
  const buf = Buffer.from(arr);
  buf.writeUInt8(123, 0);
  return buf[0] === 123;
});

test('写入影响底层 ArrayBuffer', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  buf.writeUInt8(123, 0);
  const view = new Uint8Array(ab);
  return view[0] === 123;
});

test('多个视图共享底层 ArrayBuffer', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const view = new Uint8Array(ab);
  buf.writeUInt8(99, 0);
  return view[0] === 99 && buf[0] === 99;
});

// Buffer.from ArrayBuffer 不同 offset
test('Buffer.from ArrayBuffer 指定 offset', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab, 2, 4);
  buf.writeUInt8(111, 0);
  const fullView = new Uint8Array(ab);
  return fullView[2] === 111 && buf[0] === 111;
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
