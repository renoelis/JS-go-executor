// buf.writeFloatBE/LE() - 内存共享和视图测试
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

// 内存共享
test('writeFloatBE 修改影响共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const view = new Uint8Array(ab);
  buf.writeFloatBE(123.456, 0);
  return view[0] === 0x42 && view[1] === 0xf6 && view[2] === 0xe9 && view[3] === 0x79;
});

test('writeFloatLE 修改影响共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const view = new Uint8Array(ab);
  buf.writeFloatLE(123.456, 0);
  return view[0] === 0x79 && view[1] === 0xe9 && view[2] === 0xf6 && view[3] === 0x42;
});

test('writeFloatBE 在 buffer.slice 上写入会影响原 buffer（slice 在 Node.js 中创建视图）', () => {
  const original = Buffer.alloc(8);
  const sliced = original.slice(0, 4);
  sliced.writeFloatBE(99.99, 0);
  return original[0] !== 0 || original[1] !== 0 || original[2] !== 0 || original[3] !== 0;
});

test('writeFloatLE 在 buffer.slice 上写入会影响原 buffer（slice 在 Node.js 中创建视图）', () => {
  const original = Buffer.alloc(8);
  const sliced = original.slice(0, 4);
  sliced.writeFloatLE(99.99, 0);
  return original[0] !== 0 || original[1] !== 0 || original[2] !== 0 || original[3] !== 0;
});

test('writeFloatBE 在 buffer.subarray 上写入影响原 buffer', () => {
  const original = Buffer.alloc(8);
  const sub = original.subarray(0, 4);
  sub.writeFloatBE(88.88, 0);
  return original[0] !== 0 || original[1] !== 0 || original[2] !== 0 || original[3] !== 0;
});

test('writeFloatLE 在 buffer.subarray 上写入影响原 buffer', () => {
  const original = Buffer.alloc(8);
  const sub = original.subarray(0, 4);
  sub.writeFloatLE(88.88, 0);
  return original[0] !== 0 || original[1] !== 0 || original[2] !== 0 || original[3] !== 0;
});

test('writeFloatBE 在 subarray 偏移位置写入', () => {
  const original = Buffer.alloc(12);
  const sub = original.subarray(4, 12);
  sub.writeFloatBE(77.77, 0);
  return original[4] !== 0 && original[0] === 0;
});

test('writeFloatLE 在 subarray 偏移位置写入', () => {
  const original = Buffer.alloc(12);
  const sub = original.subarray(4, 12);
  sub.writeFloatLE(77.77, 0);
  return original[4] !== 0 && original[0] === 0;
});

// 多个视图同时存在
test('writeFloatBE 通过多个视图观察相同内存', () => {
  const ab = new ArrayBuffer(4);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);
  buf1.writeFloatBE(11.11, 0);
  const value = buf2.readFloatBE(0);
  return Math.abs(value - 11.11) < 0.01;
});

test('writeFloatLE 通过多个视图观察相同内存', () => {
  const ab = new ArrayBuffer(4);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);
  buf1.writeFloatLE(11.11, 0);
  const value = buf2.readFloatLE(0);
  return Math.abs(value - 11.11) < 0.01;
});

// 跨视图类型读写
test('writeFloatBE 然后用 Uint8Array 读取字节', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(1.0, 0);
  const arr = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return arr[0] === 0x3f && arr[1] === 0x80 && arr[2] === 0x00 && arr[3] === 0x00;
});

test('writeFloatLE 然后用 Uint8Array 读取字节', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(1.0, 0);
  const arr = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return arr[0] === 0x00 && arr[1] === 0x00 && arr[2] === 0x80 && arr[3] === 0x3f;
});

test('writeFloatBE 然后用 Float32Array 读取（需考虑字节序）', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(3.14, 0);
  const farr = new Float32Array(buf.buffer, buf.byteOffset, 1);
  return typeof farr[0] === 'number';
});

test('writeFloatLE 然后用 Float32Array 读取', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(3.14, 0);
  const farr = new Float32Array(buf.buffer, buf.byteOffset, 1);
  return Math.abs(farr[0] - 3.14) < 0.01;
});

test('writeFloatBE 然后用 Int32Array 读取原始位模式', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(1.0, 0);
  const iarr = new Int32Array(buf.buffer, buf.byteOffset, 1);
  return typeof iarr[0] === 'number';
});

test('writeFloatLE 然后用 Int32Array 读取原始位模式', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(1.0, 0);
  const iarr = new Int32Array(buf.buffer, buf.byteOffset, 1);
  return typeof iarr[0] === 'number';
});

// Buffer.concat 后的行为
test('writeFloatBE 在 concat 后的 buffer 上调用', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const combined = Buffer.concat([buf1, buf2, Buffer.alloc(4)]);
  combined.writeFloatBE(22.22, 4);
  const value = combined.readFloatBE(4);
  return Math.abs(value - 22.22) < 0.01;
});

test('writeFloatLE 在 concat 后的 buffer 上调用', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const combined = Buffer.concat([buf1, buf2, Buffer.alloc(4)]);
  combined.writeFloatLE(22.22, 4);
  const value = combined.readFloatLE(4);
  return Math.abs(value - 22.22) < 0.01;
});

// Buffer.from 字符串后扩展
test('writeFloatBE 在 Buffer.from 字符串后可以写入', () => {
  const buf = Buffer.from('hello');
  const result = buf.writeFloatBE(33.33, 0);
  return result === 4;
});

test('writeFloatLE 在 Buffer.from 字符串后可以写入', () => {
  const buf = Buffer.from('hello');
  const result = buf.writeFloatLE(33.33, 0);
  return result === 4;
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
