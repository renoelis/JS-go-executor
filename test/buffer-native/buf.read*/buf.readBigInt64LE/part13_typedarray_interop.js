// buf.readBigInt64LE() - TypedArray 互操作测试
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

// 从 Int8Array 创建
test('从 Int8Array 创建的 Buffer', () => {
  const arr = new Int8Array([0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const buf = Buffer.from(arr.buffer);
  return buf.readBigInt64LE(0) === 100n;
});

// 从 Uint16Array 创建
test('从 Uint16Array 创建的 Buffer', () => {
  const arr = new Uint16Array(4);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigInt64LE(12345n, 0);
  return buf.readBigInt64LE(0) === 12345n;
});

// 从 Int32Array 创建
test('从 Int32Array 创建的 Buffer', () => {
  const arr = new Int32Array(2);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigInt64LE(99999n, 0);
  return buf.readBigInt64LE(0) === 99999n;
});

// 从 Float32Array 创建
test('从 Float32Array 创建的 Buffer', () => {
  const arr = new Float32Array(2);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigInt64LE(777n, 0);
  return buf.readBigInt64LE(0) === 777n;
});

// 从 Float64Array 创建
test('从 Float64Array 创建的 Buffer', () => {
  const arr = new Float64Array(1);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigInt64LE(888n, 0);
  return buf.readBigInt64LE(0) === 888n;
});

// 从 BigInt64Array 创建
test('从 BigInt64Array 创建的 Buffer', () => {
  const arr = new BigInt64Array([12345n]);
  const buf = Buffer.from(arr.buffer);
  // BigInt64Array 使用平台字节序，需要验证读取
  const result = buf.readBigInt64LE(0);
  return typeof result === 'bigint';
});

// 从 BigUint64Array 创建
test('从 BigUint64Array 创建的 Buffer', () => {
  const arr = new BigUint64Array([12345n]);
  const buf = Buffer.from(arr.buffer);
  const result = buf.readBigInt64LE(0);
  return typeof result === 'bigint';
});

// DataView 互操作
test('DataView 写入，Buffer 读取', () => {
  const ab = new ArrayBuffer(8);
  const view = new DataView(ab);
  view.setBigInt64(0, 99999n, true); // false = little-endian
  const buf = Buffer.from(ab);
  return buf.readBigInt64LE(0) === 99999n;
});

test('Buffer 写入，DataView 读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(88888n, 0);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return view.getBigInt64(0, true) === 88888n;
});

// 共享 ArrayBuffer
test('共享 ArrayBuffer - Uint8Array 修改', () => {
  const ab = new ArrayBuffer(8);
  const arr = new Uint8Array(ab);
  const buf = Buffer.from(ab);
  
  buf.writeBigInt64LE(100n, 0);
  arr[0] = 0xFF;
  
  const result = buf.readBigInt64LE(0);
  // LE: 0xFF 在低位，结果是 255
  return result === 255n;
});

test('共享 ArrayBuffer - Buffer 修改', () => {
  const ab = new ArrayBuffer(8);
  const arr = new Uint8Array(ab);
  const buf = Buffer.from(ab);
  
  arr.fill(0);
  buf.writeBigInt64LE(200n, 0);
  
  return buf.readBigInt64LE(0) === 200n;
});

// 不同 offset 的 TypedArray
test('TypedArray 带 offset', () => {
  const ab = new ArrayBuffer(16);
  const arr = new Uint8Array(ab, 4, 8);
  const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  buf.writeBigInt64LE(333n, 0);
  return buf.readBigInt64LE(0) === 333n;
});

// 跨 TypedArray 边界
test('跨 TypedArray 视图边界', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  buf.writeBigInt64LE(111n, 0);
  buf.writeBigInt64LE(222n, 8);
  
  const view1 = new DataView(ab, 0, 8);
  const view2 = new DataView(ab, 8, 8);
  
  return view1.getBigInt64(0, true) === 111n && 
         view2.getBigInt64(0, true) === 222n;
});

// Buffer 和 TypedArray 长度一致性
test('Buffer 和 TypedArray 长度一致', () => {
  const arr = new Uint8Array(8);
  const buf = Buffer.from(arr.buffer);
  return buf.length === arr.length;
});

// 零长度 TypedArray
test('零长度 TypedArray', () => {
  const arr = new Uint8Array(0);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 0;
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
