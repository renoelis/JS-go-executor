// buf.writeUInt16BE/LE() - TypedArray and Buffer Variants
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

// Uint8Array 作为 Buffer
test('writeUInt16BE: Uint8Array 实例', () => {
  const arr = new Uint8Array(4);
  const buf = Buffer.from(arr.buffer);
  buf.writeUInt16BE(0x1234, 0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: Uint8Array 实例', () => {
  const arr = new Uint8Array(4);
  const buf = Buffer.from(arr.buffer);
  buf.writeUInt16LE(0x1234, 0);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

// Buffer 子类
test('writeUInt16BE: Buffer.from 创建', () => {
  const buf = Buffer.from([0, 0, 0, 0]);
  buf.writeUInt16BE(0xABCD, 1);
  return buf[1] === 0xAB && buf[2] === 0xCD;
});

test('writeUInt16LE: Buffer.from 创建', () => {
  const buf = Buffer.from([0, 0, 0, 0]);
  buf.writeUInt16LE(0xABCD, 1);
  return buf[1] === 0xCD && buf[2] === 0xAB;
});

test('writeUInt16BE: Buffer.allocUnsafe 创建', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt16BE(0x1234, 0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: Buffer.allocUnsafe 创建', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt16LE(0x1234, 0);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

// slice 视图
test('writeUInt16BE: 在 slice 上写入影响原 buffer', () => {
  const buf = Buffer.alloc(6);
  const slice = buf.slice(1, 5);
  slice.writeUInt16BE(0x1234, 0);
  return buf[1] === 0x12 && buf[2] === 0x34;
});

test('writeUInt16LE: 在 slice 上写入影响原 buffer', () => {
  const buf = Buffer.alloc(6);
  const slice = buf.slice(1, 5);
  slice.writeUInt16LE(0x1234, 0);
  return buf[1] === 0x34 && buf[2] === 0x12;
});

test('writeUInt16BE: slice 边界检查', () => {
  const buf = Buffer.alloc(6);
  const slice = buf.slice(2, 4);
  slice.writeUInt16BE(0xABCD, 0);
  return buf[2] === 0xAB && buf[3] === 0xCD && slice.length === 2;
});

test('writeUInt16LE: slice 边界检查', () => {
  const buf = Buffer.alloc(6);
  const slice = buf.slice(2, 4);
  slice.writeUInt16LE(0xABCD, 0);
  return buf[2] === 0xCD && buf[3] === 0xAB && slice.length === 2;
});

test('writeUInt16BE: slice 越界应报错', () => {
  const buf = Buffer.alloc(6);
  const slice = buf.slice(2, 4);
  try {
    slice.writeUInt16BE(0x1234, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: slice 越界应报错', () => {
  const buf = Buffer.alloc(6);
  const slice = buf.slice(2, 4);
  try {
    slice.writeUInt16LE(0x1234, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 不同来源的 Buffer
test('writeUInt16BE: Buffer.concat 结果', () => {
  const buf1 = Buffer.from([0x11, 0x22]);
  const buf2 = Buffer.from([0x33, 0x44]);
  const buf = Buffer.concat([buf1, buf2]);
  buf.writeUInt16BE(0xABCD, 1);
  return buf[1] === 0xAB && buf[2] === 0xCD;
});

test('writeUInt16LE: Buffer.concat 结果', () => {
  const buf1 = Buffer.from([0x11, 0x22]);
  const buf2 = Buffer.from([0x33, 0x44]);
  const buf = Buffer.concat([buf1, buf2]);
  buf.writeUInt16LE(0xABCD, 1);
  return buf[1] === 0xCD && buf[2] === 0xAB;
});

// ArrayBuffer 支持
test('writeUInt16BE: 从 ArrayBuffer 创建', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  buf.writeUInt16BE(0x1234, 0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: 从 ArrayBuffer 创建', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  buf.writeUInt16LE(0x1234, 0);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

// 共享内存场景
test('writeUInt16BE: 多个 Buffer 共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(8);
  const buf1 = Buffer.from(ab, 0, 4);
  const buf2 = Buffer.from(ab, 4, 4);
  buf1.writeUInt16BE(0x1234, 0);
  buf2.writeUInt16BE(0x5678, 0);
  const view = new Uint8Array(ab);
  return view[0] === 0x12 && view[1] === 0x34 && view[4] === 0x56 && view[5] === 0x78;
});

test('writeUInt16LE: 多个 Buffer 共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(8);
  const buf1 = Buffer.from(ab, 0, 4);
  const buf2 = Buffer.from(ab, 4, 4);
  buf1.writeUInt16LE(0x1234, 0);
  buf2.writeUInt16LE(0x5678, 0);
  const view = new Uint8Array(ab);
  return view[0] === 0x34 && view[1] === 0x12 && view[4] === 0x78 && view[5] === 0x56;
});

// 填充场景
test('writeUInt16BE: 覆盖预填充的 buffer', () => {
  const buf = Buffer.alloc(4, 0xFF);
  buf.writeUInt16BE(0x0000, 1);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0xFF;
});

test('writeUInt16LE: 覆盖预填充的 buffer', () => {
  const buf = Buffer.alloc(4, 0xFF);
  buf.writeUInt16LE(0x0000, 1);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0xFF;
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
