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
  const arr = new Uint8Array([0x12, 0x34, 0x56]);
  const buf = Buffer.from(arr);
  return buf.readUInt16BE(0) === 0x1234;
});

test('LE: 从 Uint8Array 创建 Buffer', () => {
  const arr = new Uint8Array([0x12, 0x34, 0x56]);
  const buf = Buffer.from(arr);
  return buf.readUInt16LE(0) === 0x3412;
});

// ArrayBuffer 转 Buffer
test('BE: 从 ArrayBuffer 创建 Buffer', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 0x12;
  view[1] = 0x34;
  view[2] = 0x56;
  view[3] = 0x78;
  const buf = Buffer.from(ab);
  return buf.readUInt16BE(0) === 0x1234 && buf.readUInt16BE(2) === 0x5678;
});

test('LE: 从 ArrayBuffer 创建 Buffer', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 0x12;
  view[1] = 0x34;
  view[2] = 0x56;
  view[3] = 0x78;
  const buf = Buffer.from(ab);
  return buf.readUInt16LE(0) === 0x3412 && buf.readUInt16LE(2) === 0x7856;
});

// Uint16Array 转 Buffer
test('BE: 从 Uint16Array 创建 Buffer', () => {
  const arr = new Uint16Array([0x1234, 0x5678]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 4;
});

test('LE: 从 Uint16Array 创建 Buffer', () => {
  const arr = new Uint16Array([0x1234, 0x5678]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 4;
});

// Int8Array 转 Buffer
test('BE: 从 Int8Array 创建 Buffer', () => {
  const arr = new Int8Array([0x12, 0x34]);
  const buf = Buffer.from(arr);
  return buf.readUInt16BE(0) === 0x1234;
});

test('LE: 从 Int8Array 创建 Buffer', () => {
  const arr = new Int8Array([0x12, 0x34]);
  const buf = Buffer.from(arr);
  return buf.readUInt16LE(0) === 0x3412;
});

// Buffer.from 与 TypedArray 的交互
test('BE: Buffer.from(Uint8Array) 多次读取', () => {
  const arr = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]);
  const buf = Buffer.from(arr);
  return buf.readUInt16BE(0) === 0xAABB && buf.readUInt16BE(2) === 0xCCDD;
});

test('LE: Buffer.from(Uint8Array) 多次读取', () => {
  const arr = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]);
  const buf = Buffer.from(arr);
  return buf.readUInt16LE(0) === 0xBBAA && buf.readUInt16LE(2) === 0xDDCC;
});

// 共享 ArrayBuffer
test('BE: 共享 ArrayBuffer 修改', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  const buf = Buffer.from(ab);
  view[0] = 0x12;
  view[1] = 0x34;
  return buf.readUInt16BE(0) === 0x1234;
});

test('LE: 共享 ArrayBuffer 修改', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  const buf = Buffer.from(ab);
  view[0] = 0x12;
  view[1] = 0x34;
  return buf.readUInt16LE(0) === 0x3412;
});

// DataView 兼容性
test('BE: DataView 与 Buffer 对比', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setUint16(0, 0x1234, false);
  const buf = Buffer.from(ab);
  return buf.readUInt16BE(0) === 0x1234;
});

test('LE: DataView 与 Buffer 对比', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setUint16(0, 0x1234, true);
  const buf = Buffer.from(ab);
  return buf.readUInt16LE(0) === 0x1234;
});

// 空 TypedArray
test('BE: 空 Uint8Array (应抛出错误)', () => {
  try {
    const arr = new Uint8Array(0);
    const buf = Buffer.from(arr);
    buf.readUInt16BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 空 Uint8Array (应抛出错误)', () => {
  try {
    const arr = new Uint8Array(0);
    const buf = Buffer.from(arr);
    buf.readUInt16LE(0);
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
