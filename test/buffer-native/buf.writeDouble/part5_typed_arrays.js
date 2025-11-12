// buf.writeDoubleBE/LE - TypedArray and View Tests
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

// Uint8Array 上调用 writeDouble 方法
test('writeDoubleBE 在 Uint8Array 上工作', () => {
  const arr = new Uint8Array(8);
  const buf = Buffer.from(arr.buffer);
  buf.writeDoubleBE(3.14);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - 3.14) < 0.0001;
});

test('writeDoubleLE 在 Uint8Array 上工作', () => {
  const arr = new Uint8Array(8);
  const buf = Buffer.from(arr.buffer);
  buf.writeDoubleLE(3.14);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - 3.14) < 0.0001;
});

// Buffer 视图测试
test('writeDoubleBE 通过 Buffer 视图修改原始 ArrayBuffer', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  buf.writeDoubleBE(123.456, 0);

  const view = new DataView(ab);
  const readBack = view.getFloat64(0, false);
  return Math.abs(readBack - 123.456) < 0.0001;
});

test('writeDoubleLE 通过 Buffer 视图修改原始 ArrayBuffer', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  buf.writeDoubleLE(123.456, 0);

  const view = new DataView(ab);
  const readBack = view.getFloat64(0, true);
  return Math.abs(readBack - 123.456) < 0.0001;
});

// 共享内存测试
test('writeDoubleBE 修改影响共享相同内存的视图', () => {
  const ab = new ArrayBuffer(16);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);

  buf1.writeDoubleBE(999.888, 0);
  const readBack = buf2.readDoubleBE(0);
  return Math.abs(readBack - 999.888) < 0.0001;
});

test('writeDoubleLE 修改影响共享相同内存的视图', () => {
  const ab = new ArrayBuffer(16);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);

  buf1.writeDoubleLE(999.888, 0);
  const readBack = buf2.readDoubleLE(0);
  return Math.abs(readBack - 999.888) < 0.0001;
});

// Buffer.slice 视图测试
test('writeDoubleBE 在 slice 视图上工作', () => {
  const buf = Buffer.alloc(24);
  const slice = buf.subarray(8, 16);
  slice.writeDoubleBE(777.666);
  const readBack = buf.readDoubleBE(8);
  return Math.abs(readBack - 777.666) < 0.0001;
});

test('writeDoubleLE 在 slice 视图上工作', () => {
  const buf = Buffer.alloc(24);
  const slice = buf.subarray(8, 16);
  slice.writeDoubleLE(777.666);
  const readBack = buf.readDoubleLE(8);
  return Math.abs(readBack - 777.666) < 0.0001;
});

// 不同 TypedArray 类型
test('writeDoubleBE 在 Float64Array 底层 buffer', () => {
  const f64 = new Float64Array(4);
  const buf = Buffer.from(f64.buffer);
  buf.writeDoubleBE(1.414, 0);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - 1.414) < 0.0001;
});

test('writeDoubleLE 在 Float64Array 底层 buffer', () => {
  const f64 = new Float64Array(4);
  const buf = Buffer.from(f64.buffer);
  buf.writeDoubleLE(1.414, 0);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - 1.414) < 0.0001;
});

test('writeDoubleBE 在 Int32Array 底层 buffer', () => {
  const i32 = new Int32Array(4);
  const buf = Buffer.from(i32.buffer);
  buf.writeDoubleBE(2.718, 0);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - 2.718) < 0.0001;
});

test('writeDoubleLE 在 Int32Array 底层 buffer', () => {
  const i32 = new Int32Array(4);
  const buf = Buffer.from(i32.buffer);
  buf.writeDoubleLE(2.718, 0);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - 2.718) < 0.0001;
});

// offset 在视图中的位置
test('writeDoubleBE 在 subarray 中使用相对 offset', () => {
  const buf = Buffer.alloc(32);
  const sub = buf.subarray(8, 24);
  sub.writeDoubleBE(555.444, 0);
  const readBack = buf.readDoubleBE(8);
  return Math.abs(readBack - 555.444) < 0.0001;
});

test('writeDoubleLE 在 subarray 中使用相对 offset', () => {
  const buf = Buffer.alloc(32);
  const sub = buf.subarray(8, 24);
  sub.writeDoubleLE(555.444, 0);
  const readBack = buf.readDoubleLE(8);
  return Math.abs(readBack - 555.444) < 0.0001;
});

test('writeDoubleBE 在 subarray 中使用非零 offset', () => {
  const buf = Buffer.alloc(32);
  const sub = buf.subarray(8, 24);
  sub.writeDoubleBE(333.222, 8);
  const readBack = buf.readDoubleBE(16);
  return Math.abs(readBack - 333.222) < 0.0001;
});

test('writeDoubleLE 在 subarray 中使用非零 offset', () => {
  const buf = Buffer.alloc(32);
  const sub = buf.subarray(8, 24);
  sub.writeDoubleLE(333.222, 8);
  const readBack = buf.readDoubleLE(16);
  return Math.abs(readBack - 333.222) < 0.0001;
});

// 跨越视图边界应该抛出错误
test('writeDoubleBE 在 subarray 越界抛出错误', () => {
  const buf = Buffer.alloc(32);
  const sub = buf.subarray(8, 16);
  try {
    sub.writeDoubleBE(1.0, 1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeDoubleLE 在 subarray 越界抛出错误', () => {
  const buf = Buffer.alloc(32);
  const sub = buf.subarray(8, 16);
  try {
    sub.writeDoubleLE(1.0, 1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

// DataView 互操作
test('writeDoubleBE 与 DataView 互操作 - BE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(12.34);

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const readBack = view.getFloat64(0, false);
  return Math.abs(readBack - 12.34) < 0.0001;
});

test('writeDoubleLE 与 DataView 互操作 - LE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(12.34);

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const readBack = view.getFloat64(0, true);
  return Math.abs(readBack - 12.34) < 0.0001;
});

test('DataView 写入后 Buffer 可以读取 - BE', () => {
  const buf = Buffer.alloc(8);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  view.setFloat64(0, 56.78, false);

  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - 56.78) < 0.0001;
});

test('DataView 写入后 Buffer 可以读取 - LE', () => {
  const buf = Buffer.alloc(8);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  view.setFloat64(0, 56.78, true);

  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - 56.78) < 0.0001;
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
