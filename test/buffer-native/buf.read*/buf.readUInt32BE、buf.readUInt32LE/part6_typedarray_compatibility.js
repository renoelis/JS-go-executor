// TypedArray 和 ArrayBuffer 兼容性测试
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

// Uint8Array 转 Buffer
test('BE: 从 Uint8Array 创建 Buffer', () => {
  const arr = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A]);
  const buf = Buffer.from(arr);
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: 从 Uint8Array 创建 Buffer', () => {
  const arr = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A]);
  const buf = Buffer.from(arr);
  return buf.readUInt32LE(0) === 0x78563412;
});

// ArrayBuffer 转 Buffer
test('BE: 从 ArrayBuffer 创建 Buffer', () => {
  const ab = new ArrayBuffer(8);
  const view = new Uint8Array(ab);
  view[0] = 0x12;
  view[1] = 0x34;
  view[2] = 0x56;
  view[3] = 0x78;
  view[4] = 0x9A;
  view[5] = 0xBC;
  view[6] = 0xDE;
  view[7] = 0xF0;
  const buf = Buffer.from(ab);
  return buf.readUInt32BE(0) === 0x12345678 && buf.readUInt32BE(4) === 0x9ABCDEF0;
});

test('LE: 从 ArrayBuffer 创建 Buffer', () => {
  const ab = new ArrayBuffer(8);
  const view = new Uint8Array(ab);
  view[0] = 0x12;
  view[1] = 0x34;
  view[2] = 0x56;
  view[3] = 0x78;
  view[4] = 0x9A;
  view[5] = 0xBC;
  view[6] = 0xDE;
  view[7] = 0xF0;
  const buf = Buffer.from(ab);
  return buf.readUInt32LE(0) === 0x78563412 && buf.readUInt32LE(4) === 0xF0DEBC9A;
});

// Uint32Array 转 Buffer
test('BE: 从 Uint32Array 创建 Buffer', () => {
  const arr = new Uint32Array([0x12345678, 0x9ABCDEF0]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 8;
});

test('LE: 从 Uint32Array 创建 Buffer', () => {
  const arr = new Uint32Array([0x12345678, 0x9ABCDEF0]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 8;
});

// Int8Array 转 Buffer
test('BE: 从 Int8Array 创建 Buffer', () => {
  const arr = new Int8Array([0x12, 0x34, 0x56, 0x78]);
  const buf = Buffer.from(arr);
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: 从 Int8Array 创建 Buffer', () => {
  const arr = new Int8Array([0x12, 0x34, 0x56, 0x78]);
  const buf = Buffer.from(arr);
  return buf.readUInt32LE(0) === 0x78563412;
});

// Buffer.from 与 TypedArray 的交互
test('BE: Buffer.from(Uint8Array) 多次读取', () => {
  const arr = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF, 0x11, 0x22]);
  const buf = Buffer.from(arr);
  return buf.readUInt32BE(0) === 0xAABBCCDD && buf.readUInt32BE(4) === 0xEEFF1122;
});

test('LE: Buffer.from(Uint8Array) 多次读取', () => {
  const arr = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF, 0x11, 0x22]);
  const buf = Buffer.from(arr);
  return buf.readUInt32LE(0) === 0xDDCCBBAA && buf.readUInt32LE(4) === 0x2211FFEE;
});

// 共享 ArrayBuffer
test('BE: 共享 ArrayBuffer 修改', () => {
  const ab = new ArrayBuffer(8);
  const view = new Uint8Array(ab);
  const buf = Buffer.from(ab);
  view[0] = 0x12;
  view[1] = 0x34;
  view[2] = 0x56;
  view[3] = 0x78;
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: 共享 ArrayBuffer 修改', () => {
  const ab = new ArrayBuffer(8);
  const view = new Uint8Array(ab);
  const buf = Buffer.from(ab);
  view[0] = 0x12;
  view[1] = 0x34;
  view[2] = 0x56;
  view[3] = 0x78;
  return buf.readUInt32LE(0) === 0x78563412;
});

// DataView 兼容性
test('BE: DataView 与 Buffer 对比', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  dv.setUint32(0, 0x12345678, false);
  const buf = Buffer.from(ab);
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: DataView 与 Buffer 对比', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  dv.setUint32(0, 0x12345678, true);
  const buf = Buffer.from(ab);
  return buf.readUInt32LE(0) === 0x12345678;
});

// 空 TypedArray
test('BE: 空 Uint8Array (应抛出错误)', () => {
  try {
    const arr = new Uint8Array(0);
    const buf = Buffer.from(arr);
    buf.readUInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 空 Uint8Array (应抛出错误)', () => {
  try {
    const arr = new Uint8Array(0);
    const buf = Buffer.from(arr);
    buf.readUInt32LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// TypedArray 长度不足
test('BE: Uint8Array 长度为 3 (应抛出错误)', () => {
  try {
    const arr = new Uint8Array([0x12, 0x34, 0x56]);
    const buf = Buffer.from(arr);
    buf.readUInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: Uint8Array 长度为 3 (应抛出错误)', () => {
  try {
    const arr = new Uint8Array([0x12, 0x34, 0x56]);
    const buf = Buffer.from(arr);
    buf.readUInt32LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
