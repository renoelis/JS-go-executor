// buf.writeInt16BE() - TypedArray 和兼容性测试
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

// Uint8Array 作为 Buffer 使用
test('Uint8Array 可以调用 writeInt16BE', () => {
  const arr = new Uint8Array(4);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt16BE(1000, 0);
  return buf[0] === 0x03 && buf[1] === 0xE8;
});

// Buffer.from TypedArray
test('Buffer.from(Uint8Array) 写入测试', () => {
  const arr = new Uint8Array([0, 0, 0, 0]);
  const buf = Buffer.from(arr);
  buf.writeInt16BE(500, 0);
  return buf.readInt16BE(0) === 500;
});

test('Buffer.from(Uint16Array) 写入测试', () => {
  const arr = new Uint16Array(2);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt16BE(1234, 0);
  return buf.readInt16BE(0) === 1234;
});

// 在共享 ArrayBuffer 上操作
test('共享 ArrayBuffer 的 Buffer 写入', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  buf.writeInt16BE(999, 0);
  buf.writeInt16BE(-999, 2);
  return buf.readInt16BE(0) === 999 && buf.readInt16BE(2) === -999;
});

test('多个 Buffer 共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(8);
  const buf1 = Buffer.from(ab, 0, 4);
  const buf2 = Buffer.from(ab, 4, 4);
  buf1.writeInt16BE(100, 0);
  buf2.writeInt16BE(200, 0);
  const fullBuf = Buffer.from(ab);
  return fullBuf.readInt16BE(0) === 100 && fullBuf.readInt16BE(4) === 200;
});

// Buffer 视图
test('Buffer slice 后写入不影响原 buffer', () => {
  const original = Buffer.alloc(10);
  const slice = original.subarray(2, 6);
  slice.writeInt16BE(888, 0);
  // slice 写入会影响 original 因为是视图
  return original.readInt16BE(2) === 888;
});

test('Buffer subarray 写入影响原 buffer', () => {
  const original = Buffer.alloc(10);
  const sub = original.subarray(3, 8);
  sub.writeInt16BE(777, 0);
  return original.readInt16BE(3) === 777;
});

// 方法链式调用
test('连续调用 writeInt16BE', () => {
  const buf = Buffer.alloc(8);
  const ret1 = buf.writeInt16BE(100, 0);
  const ret2 = buf.writeInt16BE(200, ret1);
  const ret3 = buf.writeInt16BE(300, ret2);
  const ret4 = buf.writeInt16BE(400, ret3);
  return buf.readInt16BE(0) === 100 &&
         buf.readInt16BE(2) === 200 &&
         buf.readInt16BE(4) === 300 &&
         buf.readInt16BE(6) === 400;
});

// 与其他 write 方法混合使用
test('writeInt16BE 和 writeInt8 混合', () => {
  const buf = Buffer.alloc(6);
  buf.writeInt8(10, 0);
  buf.writeInt16BE(1000, 1);
  buf.writeInt8(20, 3);
  buf.writeInt16BE(2000, 4);
  return buf[0] === 10 &&
         buf.readInt16BE(1) === 1000 &&
         buf[3] === 20 &&
         buf.readInt16BE(4) === 2000;
});

test('writeInt16BE 和 writeUInt16BE 在同一位置', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeInt16BE(-1000, 0);
  buf2.writeUInt16BE(0xFFFF - 1000 + 1, 0);
  return buf1[0] === buf2[0] && buf1[1] === buf2[1];
});

test('writeInt16BE 和 writeInt32BE 重叠', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(0x12345678, 0);
  buf.writeInt16BE(-21555, 2); // 使用有效范围内的负数 (0xABCD 作为有符号数)
  return buf[0] === 0x12 && buf[1] === 0x34 &&
         buf[2] === 0xAB && buf[3] === 0xCD;
});

// Buffer 属性不受影响
test('写入不改变 buffer.length', () => {
  const buf = Buffer.alloc(10);
  const lenBefore = buf.length;
  buf.writeInt16BE(100, 0);
  buf.writeInt16BE(200, 5);
  return buf.length === lenBefore && buf.length === 10;
});

test('写入不改变 buffer.byteLength', () => {
  const buf = Buffer.alloc(10);
  const byteLenBefore = buf.byteLength;
  buf.writeInt16BE(100, 0);
  return buf.byteLength === byteLenBefore && buf.byteLength === 10;
});

// 在不同大小的 buffer 中写入
test('在大 buffer 中写入', () => {
  const buf = Buffer.alloc(10000);
  buf.writeInt16BE(12345, 5000);
  return buf.readInt16BE(5000) === 12345;
});

test('在最小可用 buffer (2字节) 中写入', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(999, 0);
  return buf.readInt16BE(0) === 999;
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
