// buf.writeUInt16BE/LE() - Memory Views Tests
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

// DataView 互操作
test('writeUInt16BE: 与 DataView 一致', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const view = new DataView(ab);

  buf.writeUInt16BE(0x1234, 0);
  return view.getUint16(0, false) === 0x1234;
});

test('writeUInt16LE: 与 DataView 一致', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const view = new DataView(ab);

  buf.writeUInt16LE(0x1234, 0);
  return view.getUint16(0, true) === 0x1234;
});

test('writeUInt16BE: DataView 写入后 Buffer 读取', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const view = new DataView(ab);

  view.setUint16(0, 0xABCD, false);
  return buf.readUInt16BE(0) === 0xABCD;
});

test('writeUInt16LE: DataView 写入后 Buffer 读取', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const view = new DataView(ab);

  view.setUint16(0, 0xABCD, true);
  return buf.readUInt16LE(0) === 0xABCD;
});

// TypedArray 互操作
test('writeUInt16BE: 与 Uint16Array 交互', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const u16 = new Uint16Array(ab);

  buf.writeUInt16BE(0x1234, 0);
  return u16[0] === 0x3412 || u16[0] === 0x1234;
});

test('writeUInt16LE: 与 Uint16Array 交互', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const u16 = new Uint16Array(ab);

  buf.writeUInt16LE(0x1234, 0);
  return u16[0] === 0x1234 || u16[0] === 0x3412;
});

test('writeUInt16BE: Uint8Array 视图验证字节序', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const u8 = new Uint8Array(ab);

  buf.writeUInt16BE(0x1234, 0);
  return u8[0] === 0x12 && u8[1] === 0x34;
});

test('writeUInt16LE: Uint8Array 视图验证字节序', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const u8 = new Uint8Array(ab);

  buf.writeUInt16LE(0x1234, 0);
  return u8[0] === 0x34 && u8[1] === 0x12;
});

// 多视图同步
test('writeUInt16BE: 多个 Buffer 视图同步', () => {
  const ab = new ArrayBuffer(8);
  const buf1 = Buffer.from(ab, 0, 4);
  const buf2 = Buffer.from(ab, 0, 4);

  buf1.writeUInt16BE(0x1234, 0);
  return buf2.readUInt16BE(0) === 0x1234;
});

test('writeUInt16LE: 多个 Buffer 视图同步', () => {
  const ab = new ArrayBuffer(8);
  const buf1 = Buffer.from(ab, 0, 4);
  const buf2 = Buffer.from(ab, 0, 4);

  buf1.writeUInt16LE(0x1234, 0);
  return buf2.readUInt16LE(0) === 0x1234;
});

// offset 偏移视图
test('writeUInt16BE: ArrayBuffer 偏移视图', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab, 2, 4);
  const u8 = new Uint8Array(ab);

  buf.writeUInt16BE(0x1234, 0);
  return u8[2] === 0x12 && u8[3] === 0x34;
});

test('writeUInt16LE: ArrayBuffer 偏移视图', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab, 2, 4);
  const u8 = new Uint8Array(ab);

  buf.writeUInt16LE(0x1234, 0);
  return u8[2] === 0x34 && u8[3] === 0x12;
});

// subarray 行为
test('writeUInt16BE: subarray 共享内存', () => {
  const buf = Buffer.alloc(8);
  const sub = buf.subarray(2, 6);

  sub.writeUInt16BE(0x1234, 0);
  return buf[2] === 0x12 && buf[3] === 0x34;
});

test('writeUInt16LE: subarray 共享内存', () => {
  const buf = Buffer.alloc(8);
  const sub = buf.subarray(2, 6);

  sub.writeUInt16LE(0x1234, 0);
  return buf[2] === 0x34 && buf[3] === 0x12;
});

test('writeUInt16BE: subarray 的 subarray', () => {
  const buf = Buffer.alloc(10);
  const sub1 = buf.subarray(1, 9);
  const sub2 = sub1.subarray(1, 5);

  sub2.writeUInt16BE(0xABCD, 0);
  return buf[2] === 0xAB && buf[3] === 0xCD;
});

test('writeUInt16LE: subarray 的 subarray', () => {
  const buf = Buffer.alloc(10);
  const sub1 = buf.subarray(1, 9);
  const sub2 = sub1.subarray(1, 5);

  sub2.writeUInt16LE(0xABCD, 0);
  return buf[2] === 0xCD && buf[3] === 0xAB;
});

// 零拷贝验证
test('writeUInt16BE: slice 是视图非副本', () => {
  const buf = Buffer.alloc(8);
  const slice = buf.slice(2, 6);

  slice.writeUInt16BE(0x1234, 0);
  return buf[2] === 0x12 && buf[3] === 0x34;
});

test('writeUInt16LE: slice 是视图非副本', () => {
  const buf = Buffer.alloc(8);
  const slice = buf.slice(2, 6);

  slice.writeUInt16LE(0x1234, 0);
  return buf[2] === 0x34 && buf[3] === 0x12;
});

// 重叠区域
test('writeUInt16BE: 写入不影响相邻区域', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  buf.writeUInt16BE(0x0000, 2);
  return buf[0] === 0xFF && buf[1] === 0xFF &&
         buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0xFF && buf[5] === 0xFF;
});

test('writeUInt16LE: 写入不影响相邻区域', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  buf.writeUInt16LE(0x0000, 2);
  return buf[0] === 0xFF && buf[1] === 0xFF &&
         buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0xFF && buf[5] === 0xFF;
});

// 对齐测试
test('writeUInt16BE: 非对齐地址写入', () => {
  const buf = Buffer.alloc(5);
  buf.writeUInt16BE(0x1234, 1);
  return buf[1] === 0x12 && buf[2] === 0x34;
});

test('writeUInt16LE: 非对齐地址写入', () => {
  const buf = Buffer.alloc(5);
  buf.writeUInt16LE(0x1234, 1);
  return buf[1] === 0x34 && buf[2] === 0x12;
});

test('writeUInt16BE: 奇数 offset', () => {
  const buf = Buffer.alloc(5);
  buf.writeUInt16BE(0xABCD, 3);
  return buf[3] === 0xAB && buf[4] === 0xCD;
});

test('writeUInt16LE: 奇数 offset', () => {
  const buf = Buffer.alloc(5);
  buf.writeUInt16LE(0xABCD, 3);
  return buf[3] === 0xCD && buf[4] === 0xAB;
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
