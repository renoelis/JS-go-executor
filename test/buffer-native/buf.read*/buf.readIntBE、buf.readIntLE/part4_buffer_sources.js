// 不同 Buffer 来源测试
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

// Buffer.from 不同来源
test('Buffer.from(array): readIntBE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('Buffer.from(array): readIntLE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('Buffer.alloc: readIntBE', () => {
  const buf = Buffer.alloc(4);
  buf[0] = 0x12;
  buf[1] = 0x34;
  buf[2] = 0x56;
  buf[3] = 0x78;
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('Buffer.alloc: readIntLE', () => {
  const buf = Buffer.alloc(4);
  buf[0] = 0x78;
  buf[1] = 0x56;
  buf[2] = 0x34;
  buf[3] = 0x12;
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('Buffer.allocUnsafe: readIntBE', () => {
  const buf = Buffer.allocUnsafe(4);
  buf[0] = 0x12;
  buf[1] = 0x34;
  buf[2] = 0x56;
  buf[3] = 0x78;
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('Buffer.allocUnsafe: readIntLE', () => {
  const buf = Buffer.allocUnsafe(4);
  buf[0] = 0x78;
  buf[1] = 0x56;
  buf[2] = 0x34;
  buf[3] = 0x12;
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('Buffer.from(ArrayBuffer): readIntBE', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 0x12;
  view[1] = 0x34;
  view[2] = 0x56;
  view[3] = 0x78;
  const buf = Buffer.from(ab);
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('Buffer.from(ArrayBuffer): readIntLE', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 0x78;
  view[1] = 0x56;
  view[2] = 0x34;
  view[3] = 0x12;
  const buf = Buffer.from(ab);
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('Buffer.from(Uint8Array): readIntBE', () => {
  const arr = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
  const buf = Buffer.from(arr);
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('Buffer.from(Uint8Array): readIntLE', () => {
  const arr = new Uint8Array([0x78, 0x56, 0x34, 0x12]);
  const buf = Buffer.from(arr);
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('Buffer.from(Buffer): readIntBE', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const buf2 = Buffer.from(buf1);
  return buf2.readIntBE(0, 4) === 0x12345678;
});

test('Buffer.from(Buffer): readIntLE', () => {
  const buf1 = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const buf2 = Buffer.from(buf1);
  return buf2.readIntLE(0, 4) === 0x12345678;
});

test('Buffer.concat: readIntBE', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x56, 0x78]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('Buffer.concat: readIntLE', () => {
  const buf1 = Buffer.from([0x78, 0x56]);
  const buf2 = Buffer.from([0x34, 0x12]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('buf.subarray(): readIntBE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x78, 0x00, 0x00]);
  const sub = buf.subarray(2, 6);
  return sub.readIntBE(0, 4) === 0x12345678;
});

test('buf.subarray(): readIntLE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x78, 0x56, 0x34, 0x12, 0x00, 0x00]);
  const sub = buf.subarray(2, 6);
  return sub.readIntLE(0, 4) === 0x12345678;
});

test('buf.slice(): readIntBE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x78, 0x00, 0x00]);
  const slice = buf.slice(2, 6);
  return slice.readIntBE(0, 4) === 0x12345678;
});

test('buf.slice(): readIntLE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x78, 0x56, 0x34, 0x12, 0x00, 0x00]);
  const slice = buf.slice(2, 6);
  return slice.readIntLE(0, 4) === 0x12345678;
});

// TypedArray 测试
test('Uint16Array 视图: readIntBE', () => {
  const ab = new ArrayBuffer(4);
  const u16 = new Uint16Array(ab);
  u16[0] = 0x3412; // 小端序存储
  u16[1] = 0x7856;
  const buf = Buffer.from(ab);
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('Int32Array 视图: readIntLE', () => {
  const ab = new ArrayBuffer(4);
  const i32 = new Int32Array(ab);
  i32[0] = 0x12345678;
  const buf = Buffer.from(ab);
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('DataView 视图: readIntBE', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setUint8(0, 0x12);
  dv.setUint8(1, 0x34);
  dv.setUint8(2, 0x56);
  dv.setUint8(3, 0x78);
  const buf = Buffer.from(ab);
  return buf.readIntBE(0, 4) === 0x12345678;
});

// 零拷贝验证（Node.js v3.0.0+ slice 和 subarray 行为相同，都是零拷贝）
test('subarray 零拷贝: 修改原 buffer 影响 subarray', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sub = buf.subarray(0, 4);
  const before = sub.readIntBE(0, 4);
  buf[0] = 0xFF;
  const after = sub.readIntBE(0, 4);
  // 0xFF345678 是负数因为高位是1，实际值是 -13258648
  return before !== after && before === 0x12345678 && after === -0xcba988;
});

test('slice 零拷贝: 修改原 buffer 影响 slice (Node v3.0.0+)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const slice = buf.slice(0, 4);
  const before = slice.readIntBE(0, 4);
  buf[0] = 0xFF;
  const after = slice.readIntBE(0, 4);
  // 0xFF345678 是负数因为高位是1，实际值是 -13258648
  return before !== after && before === 0x12345678 && after === -0xcba988;
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
