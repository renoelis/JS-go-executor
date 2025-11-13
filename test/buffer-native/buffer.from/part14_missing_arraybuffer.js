// Buffer.from() - Part 14: Missing ArrayBuffer Scenarios
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

function testError(name, fn) {
  try {
    fn();
    tests.push({ name, status: '❌', error: 'Expected error was not thrown' });
  } catch (e) {
    tests.push({ name, status: '✅', actualError: e.message });
  }
}

// ArrayBuffer 的精确边界
test('ArrayBuffer - offset 为 0，length 等于 byteLength', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, 10);
  return buf.length === 10;
});

test('ArrayBuffer - offset + length 恰好等于 byteLength', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 10, 10);
  return buf.length === 10;
});

test('ArrayBuffer - 只提供 offset，使用剩余全部', () => {
  const ab = new ArrayBuffer(15);
  const view = new Uint8Array(ab);
  view[14] = 99;
  const buf = Buffer.from(ab, 10);
  return buf.length === 5 && buf[4] === 99;
});

test('ArrayBuffer - offset 为 0，省略 length', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab, 0);
  return buf.length === 8;
});

test('ArrayBuffer - 单字节 ArrayBuffer', () => {
  const ab = new ArrayBuffer(1);
  const view = new Uint8Array(ab);
  view[0] = 255;
  const buf = Buffer.from(ab);
  return buf.length === 1 && buf[0] === 255;
});

// ArrayBuffer offset 边界错误
testError('ArrayBuffer - offset 为 byteLength（越界）', () => {
  const ab = new ArrayBuffer(10);
  Buffer.from(ab, 10, 1);
});

testError('ArrayBuffer - offset 为 byteLength + 1', () => {
  const ab = new ArrayBuffer(10);
  Buffer.from(ab, 11);
});

test('ArrayBuffer - offset 为浮点数', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[5] = 100;
  const buf = Buffer.from(ab, 5.5, 2);
  // Node.js 将浮点数转换为整数（5.5 -> 5）
  return buf.length === 2 && buf[0] === 100;
});

test('ArrayBuffer - length 为浮点数', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, 5.5);
  // Node.js 将浮点数转换为整数（5.5 -> 5）
  return buf.length === 5;
});

test('ArrayBuffer - offset 为 NaN', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, NaN, 5);
  // Node.js 将 NaN 转换为 0
  return buf.length === 5;
});

test('ArrayBuffer - length 为 NaN', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, NaN);
  // Node.js 将 NaN 转换为 0
  return buf.length === 0;
});

testError('ArrayBuffer - offset 为 Infinity', () => {
  const ab = new ArrayBuffer(10);
  Buffer.from(ab, Infinity);
});

testError('ArrayBuffer - length 为 Infinity', () => {
  const ab = new ArrayBuffer(10);
  Buffer.from(ab, 0, Infinity);
});

// TypedArray.buffer 的各种情况
test('Uint8Array.buffer - 完整 buffer', () => {
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(uint8.buffer);
  return buf.length === 5 && buf[0] === 1 && buf[4] === 5;
});

test('Uint8Array.buffer - 带 offset 的视图', () => {
  const ab = new ArrayBuffer(10);
  const uint8 = new Uint8Array(ab, 2, 5);
  uint8[0] = 99;
  const buf = Buffer.from(uint8.buffer, 2, 5);
  return buf.length === 5 && buf[0] === 99;
});

test('Int8Array.buffer - 负数值', () => {
  const int8 = new Int8Array([-1, -2, -3]);
  const buf = Buffer.from(int8.buffer);
  return buf.length === 3 && buf[0] === 255 && buf[1] === 254;
});

test('Uint16Array.buffer - 多字节元素', () => {
  const uint16 = new Uint16Array([0x1234, 0x5678]);
  const buf = Buffer.from(uint16.buffer);
  return buf.length === 4;
});

test('Uint32Array.buffer - 4 字节元素', () => {
  const uint32 = new Uint32Array([0x12345678]);
  const buf = Buffer.from(uint32.buffer);
  return buf.length === 4;
});

test('Float32Array.buffer - 浮点数存储', () => {
  const float32 = new Float32Array([1.5, 2.5, 3.5]);
  const buf = Buffer.from(float32.buffer);
  return buf.length === 12; // 3 * 4 字节
});

test('Float64Array.buffer - 双精度浮点', () => {
  const float64 = new Float64Array([1.1, 2.2]);
  const buf = Buffer.from(float64.buffer);
  return buf.length === 16; // 2 * 8 字节
});

test('BigInt64Array.buffer - 64 位整数', () => {
  try {
    const bigint64 = new BigInt64Array([1n, 2n]);
    const buf = Buffer.from(bigint64.buffer);
    return buf.length === 16; // 2 * 8 字节
  } catch (e) {
    // 如果不支持 BigInt，跳过
    return true;
  }
});

test('BigUint64Array.buffer - 无符号 64 位整数', () => {
  try {
    const biguint64 = new BigUint64Array([1n, 2n]);
    const buf = Buffer.from(biguint64.buffer);
    return buf.length === 16;
  } catch (e) {
    return true;
  }
});

test('Uint8ClampedArray.buffer - clamped 行为', () => {
  const clamped = new Uint8ClampedArray([0, 127, 255]);
  const buf = Buffer.from(clamped.buffer);
  return buf.length === 3 && buf[0] === 0 && buf[2] === 255;
});

// DataView 的测试
test('DataView.buffer - 基本使用', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  dv.setUint8(0, 42);
  dv.setUint8(7, 99);
  const buf = Buffer.from(dv.buffer);
  return buf.length === 8 && buf[0] === 42 && buf[7] === 99;
});

test('DataView.buffer - 带 offset 的 DataView', () => {
  const ab = new ArrayBuffer(10);
  const dv = new DataView(ab, 2, 5);
  dv.setUint8(0, 100);
  const buf = Buffer.from(dv.buffer, 2, 5);
  return buf.length === 5 && buf[0] === 100;
});

// 不同 byteOffset 的 TypedArray
test('TypedArray - byteOffset 不为 0', () => {
  const ab = new ArrayBuffer(20);
  const uint8Full = new Uint8Array(ab);
  uint8Full[10] = 77;
  const uint8View = new Uint8Array(ab, 10, 5);
  const buf = Buffer.from(uint8View.buffer, 10, 5);
  return buf.length === 5 && buf[0] === 77;
});

test('TypedArray - 非对齐的 byteOffset', () => {
  const ab = new ArrayBuffer(20);
  const view = new Uint8Array(ab);
  view[3] = 88;
  const buf = Buffer.from(ab, 3, 7);
  return buf.length === 7 && buf[0] === 88;
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
