// buf.readBigUInt64BE() - TypedArray 互操作性测试
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

// 从 Uint8Array 创建的 Buffer
test('从 Uint8Array 创建的 Buffer', () => {
  const arr = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00]);
  const buf = Buffer.from(arr);
  return buf.readBigUInt64BE(0) === 256n;
});

// 从 ArrayBuffer 创建的 Buffer
test('从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(8);
  const view = new DataView(ab);
  view.setBigUint64(0, 12345n, false); // Big-Endian
  const buf = Buffer.from(ab);
  return buf.readBigUInt64BE(0) === 12345n;
});

// Buffer.from(TypedArray) 各种类型
test('从 Uint16Array 创建', () => {
  const arr = new Uint16Array([0x0000, 0x0000, 0x0000, 0x0001]);
  const buf = Buffer.from(new Uint8Array(arr.buffer));
  const value = buf.readBigUInt64BE(0);
  return typeof value === 'bigint' && value >= 0n;
});

test('从 Uint32Array 创建', () => {
  const arr = new Uint32Array([0x00000000, 0x00000001]);
  const buf = Buffer.from(new Uint8Array(arr.buffer));
  const value = buf.readBigUInt64BE(0);
  return typeof value === 'bigint' && value >= 0n;
});

// Buffer 与 DataView 比较
test('与 DataView.getBigUint64 一致（Big-Endian）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(9876543210n, 0);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
});

test('与 DataView 比较 - 最大值', () => {
  const buf = Buffer.alloc(8);
  const max = 18446744073709551615n;
  buf.writeBigUInt64BE(max, 0);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
});

test('与 DataView 比较 - 零', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0n, 0);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
});

// Buffer.subarray 测试
test('从 subarray 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(55555n, 8);
  const sub = buf.subarray(8);
  return sub.readBigUInt64BE(0) === 55555n;
});

test('subarray 的 offset', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64BE(77777n, 16);
  const sub = buf.subarray(8);
  return sub.readBigUInt64BE(8) === 77777n;
});

// Buffer.slice 测试
test('从 slice 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(66666n, 8);
  const sliced = buf.slice(8);
  return sliced.readBigUInt64BE(0) === 66666n;
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
