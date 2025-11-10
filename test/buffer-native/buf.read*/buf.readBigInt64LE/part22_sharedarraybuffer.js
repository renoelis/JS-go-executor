// buf.readBigInt64LE() - SharedArrayBuffer 和特殊 ArrayBuffer 测试
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

// ArrayBuffer 创建的 Buffer
test('从 ArrayBuffer 创建并读取', () => {
  const ab = new ArrayBuffer(8);
  const view = new DataView(ab);
  view.setBigInt64(0, 12345n, true); // Little-Endian
  const buf = Buffer.from(ab);
  return buf.readBigInt64LE(0) === 12345n;
});

// ArrayBuffer 的 slice
test('从 ArrayBuffer.slice 创建并读取', () => {
  const ab = new ArrayBuffer(16);
  const view = new DataView(ab);
  view.setBigInt64(8, 99999n, true);
  const sliced = ab.slice(8, 16);
  const buf = Buffer.from(sliced);
  return buf.readBigInt64LE(0) === 99999n;
});

// Uint8Array 的 buffer 属性
test('从 Uint8Array.buffer 创建并读取', () => {
  const arr = new Uint8Array(16);
  const view = new DataView(arr.buffer);
  view.setBigInt64(4, 77777n, true);
  const buf = Buffer.from(arr.buffer, 4, 8);
  return buf.readBigInt64LE(0) === 77777n;
});

// 多个 TypedArray 视图共享同一 ArrayBuffer
test('多个视图共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(16);
  const view1 = new DataView(ab);
  view1.setBigInt64(0, 11111n, true);
  view1.setBigInt64(8, 22222n, true);
  
  const buf1 = Buffer.from(ab, 0, 8);
  const buf2 = Buffer.from(ab, 8, 8);
  
  return buf1.readBigInt64LE(0) === 11111n && buf2.readBigInt64LE(0) === 22222n;
});

// 零长度 ArrayBuffer
test('零长度 ArrayBuffer 应抛出错误', () => {
  try {
    const ab = new ArrayBuffer(0);
    const buf = Buffer.from(ab);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 长度不足的 ArrayBuffer
test('长度不足的 ArrayBuffer 应抛出错误', () => {
  try {
    const ab = new ArrayBuffer(7);
    const buf = Buffer.from(ab);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Int8Array 视图
test('从 Int8Array 创建并读取', () => {
  const arr = new Int8Array([0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const buf = Buffer.from(arr);
  return buf.readBigInt64LE(0) === 100n;
});

// Uint16Array 视图（注意字节序）
test('从 Uint16Array 创建并读取', () => {
  const arr = new Uint16Array(4);
  const view = new DataView(arr.buffer);
  view.setBigInt64(0, 55555n, true);
  const buf = Buffer.from(arr.buffer);
  return buf.readBigInt64LE(0) === 55555n;
});

// Float64Array 视图
test('从 Float64Array.buffer 创建并读取', () => {
  const arr = new Float64Array(2);
  const view = new DataView(arr.buffer);
  view.setBigInt64(0, 88888n, true);
  const buf = Buffer.from(arr.buffer, 0, 8);
  return buf.readBigInt64LE(0) === 88888n;
});

// BigInt64Array 视图
test('从 BigInt64Array 创建并读取', () => {
  const arr = new BigInt64Array(2);
  arr[0] = 123456n;
  const buf = Buffer.from(arr.buffer, 0, 8);
  // 注意：BigInt64Array 使用平台字节序，这里我们只验证能读取
  const result = buf.readBigInt64LE(0);
  return typeof result === 'bigint';
});

// 从 DataView 的 buffer 创建
test('从 DataView.buffer 创建并读取', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  dv.setBigInt64(0, 33333n, true);
  const buf = Buffer.from(dv.buffer);
  return buf.readBigInt64LE(0) === 33333n;
});

// 修改 ArrayBuffer 后读取
test('修改 ArrayBuffer 后 Buffer 同步更新', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const view = new DataView(ab);
  view.setBigInt64(0, 44444n, true);
  return buf.readBigInt64LE(0) === 44444n;
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
