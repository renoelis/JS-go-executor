// Buffer.byteLength() - Input Types Tests
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

// Buffer 输入
test('Buffer 作为输入', () => {
  const buf = Buffer.from('hello');
  const len = Buffer.byteLength(buf);
  return len === 5;
});

test('空 Buffer', () => {
  const buf = Buffer.alloc(0);
  const len = Buffer.byteLength(buf);
  return len === 0;
});

test('大 Buffer', () => {
  const buf = Buffer.alloc(1000);
  const len = Buffer.byteLength(buf);
  return len === 1000;
});

test('Buffer 带编码参数（编码被忽略）', () => {
  const buf = Buffer.from('hello');
  const len = Buffer.byteLength(buf, 'hex');
  // 对 Buffer，编码参数应该被忽略
  return len === 5;
});

// TypedArray 输入
test('Uint8Array 作为输入', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const len = Buffer.byteLength(arr);
  return len === 5;
});

test('Uint16Array 作为输入', () => {
  const arr = new Uint16Array([1, 2, 3]);
  const len = Buffer.byteLength(arr);
  // Uint16Array 每个元素 2 字节
  return len === 6;
});

test('Uint32Array 作为输入', () => {
  const arr = new Uint32Array([1, 2]);
  const len = Buffer.byteLength(arr);
  // Uint32Array 每个元素 4 字节
  return len === 8;
});

test('Int8Array 作为输入', () => {
  const arr = new Int8Array([1, 2, 3, 4]);
  const len = Buffer.byteLength(arr);
  return len === 4;
});

test('Float32Array 作为输入', () => {
  const arr = new Float32Array([1.0, 2.0]);
  const len = Buffer.byteLength(arr);
  // Float32Array 每个元素 4 字节
  return len === 8;
});

test('Float64Array 作为输入', () => {
  const arr = new Float64Array([1.0]);
  const len = Buffer.byteLength(arr);
  // Float64Array 每个元素 8 字节
  return len === 8;
});

test('空 TypedArray', () => {
  const arr = new Uint8Array(0);
  const len = Buffer.byteLength(arr);
  return len === 0;
});

// ArrayBuffer 输入
test('ArrayBuffer 作为输入', () => {
  const ab = new ArrayBuffer(10);
  const len = Buffer.byteLength(ab);
  return len === 10;
});

test('空 ArrayBuffer', () => {
  const ab = new ArrayBuffer(0);
  const len = Buffer.byteLength(ab);
  return len === 0;
});

test('大 ArrayBuffer', () => {
  const ab = new ArrayBuffer(1000);
  const len = Buffer.byteLength(ab);
  return len === 1000;
});

// SharedArrayBuffer 输入
test('SharedArrayBuffer 作为输入', () => {
  const sab = new SharedArrayBuffer(10);
  const len = Buffer.byteLength(sab);
  return len === 10;
});

test('空 SharedArrayBuffer', () => {
  const sab = new SharedArrayBuffer(0);
  const len = Buffer.byteLength(sab);
  return len === 0;
});

// DataView 输入
test('DataView 作为输入', () => {
  const ab = new ArrayBuffer(10);
  const dv = new DataView(ab);
  const len = Buffer.byteLength(dv);
  return len === 10;
});

test('DataView 部分视图', () => {
  const ab = new ArrayBuffer(20);
  const dv = new DataView(ab, 5, 10);
  const len = Buffer.byteLength(dv);
  // DataView 的 byteLength 是 10
  return len === 10;
});

test('空 DataView', () => {
  const ab = new ArrayBuffer(0);
  const dv = new DataView(ab);
  const len = Buffer.byteLength(dv);
  return len === 0;
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
