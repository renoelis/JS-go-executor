// buf.readBigInt64LE() - ArrayBuffer 和 SharedArrayBuffer 源测试
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

// 从 ArrayBuffer 创建的 Buffer
test('从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(8);
  const view = new DataView(ab);
  view.setBigInt64(0, 100n, true); // Little-Endian
  const buf = Buffer.from(ab);
  return buf.readBigInt64LE(0) === 100n;
});

// 从 ArrayBuffer 的部分创建
test('从 ArrayBuffer 的部分创建', () => {
  const ab = new ArrayBuffer(16);
  const view = new DataView(ab);
  view.setBigInt64(8, 200n, true); // Little-Endian
  const buf = Buffer.from(ab, 8, 8);
  return buf.readBigInt64LE(0) === 200n;
});

// 从 Uint8Array 创建（底层是 ArrayBuffer）
test('从 Uint8Array 创建', () => {
  const arr = new Uint8Array([144, 1, 0, 0, 0, 0, 0, 0]); // 400n in LE
  const buf = Buffer.from(arr);
  return buf.readBigInt64LE(0) === 400n;
});

// 从 Uint8Array 的 buffer 创建
test('从 Uint8Array 的 buffer 创建', () => {
  const arr = new Uint8Array(16);
  const view = new DataView(arr.buffer);
  view.setBigInt64(0, 500n, true); // Little-Endian
  const buf = Buffer.from(arr.buffer, 0, 8);
  return buf.readBigInt64LE(0) === 500n;
});

// 从 Int8Array 创建
test('从 Int8Array 创建', () => {
  const arr = new Int8Array([88, 2, 0, 0, 0, 0, 0, 0]); // 600n in LE
  const buf = Buffer.from(arr.buffer);
  return buf.readBigInt64LE(0) === 600n;
});

// 从 DataView 的 buffer 创建
test('从 DataView 的 buffer 创建', () => {
  const ab = new ArrayBuffer(8);
  const view = new DataView(ab);
  view.setBigInt64(0, 700n, true); // Little-Endian
  const buf = Buffer.from(view.buffer);
  return buf.readBigInt64LE(0) === 700n;
});

// ArrayBuffer 和 Buffer 共享内存
test('ArrayBuffer 和 Buffer 共享内存', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  buf.writeBigInt64LE(800n, 0);
  const view = new DataView(ab);
  return view.getBigInt64(0, true) === 800n;
});

// 修改 ArrayBuffer 影响 Buffer
test('修改 ArrayBuffer 影响 Buffer', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const view = new DataView(ab);
  view.setBigInt64(0, 900n, true); // Little-Endian
  return buf.readBigInt64LE(0) === 900n;
});

// 从大 ArrayBuffer 的偏移位置创建
test('从大 ArrayBuffer 的偏移位置创建', () => {
  const ab = new ArrayBuffer(32);
  const view = new DataView(ab);
  view.setBigInt64(16, 1000n, true); // Little-Endian
  const buf = Buffer.from(ab, 16, 8);
  return buf.readBigInt64LE(0) === 1000n;
});

// 从 Float64Array 的 buffer 创建
test('从 Float64Array 的 buffer 创建', () => {
  const arr = new Float64Array(1);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigInt64LE(1100n, 0);
  return buf.readBigInt64LE(0) === 1100n;
});

// 从 BigInt64Array 的 buffer 创建
test('从 BigInt64Array 的 buffer 创建', () => {
  const arr = new BigInt64Array([1200n]);
  const buf = Buffer.from(arr.buffer);
  // BigInt64Array 使用平台字节序，需要根据平台调整
  // 这里只验证能读取
  const result = buf.readBigInt64LE(0);
  return typeof result === 'bigint';
});

// 零长度 ArrayBuffer
test('零长度 ArrayBuffer', () => {
  const ab = new ArrayBuffer(0);
  const buf = Buffer.from(ab);
  return buf.length === 0;
});

// 从 ArrayBuffer 创建后读取越界
test('从 ArrayBuffer 创建后读取越界', () => {
  try {
    const ab = new ArrayBuffer(8);
    const buf = Buffer.from(ab);
    buf.readBigInt64LE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 从 Uint16Array 的 buffer 创建
test('从 Uint16Array 的 buffer 创建', () => {
  const arr = new Uint16Array(4);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigInt64LE(1300n, 0);
  return buf.readBigInt64LE(0) === 1300n;
});

// 从 Uint32Array 的 buffer 创建
test('从 Uint32Array 的 buffer 创建', () => {
  const arr = new Uint32Array(2);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigInt64LE(1400n, 0);
  return buf.readBigInt64LE(0) === 1400n;
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
