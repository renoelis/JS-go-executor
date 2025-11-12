// buf.writeInt32BE() - 深度补充：内存与性能压力测试
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

// 大 Buffer 边界测试
test('大 Buffer：1KB', () => {
  const buf = Buffer.allocUnsafe(1024);
  buf.writeInt32BE(0x12345678, 1020);
  return buf.readInt32BE(1020) === 0x12345678;
});

test('大 Buffer：64KB', () => {
  const buf = Buffer.allocUnsafe(65536);
  buf.writeInt32BE(0x12345678, 65532);
  return buf.readInt32BE(65532) === 0x12345678;
});

test('大 Buffer：1MB', () => {
  const buf = Buffer.allocUnsafe(1024 * 1024);
  const offset = 1024 * 1024 - 4;
  buf.writeInt32BE(123456, offset);
  return buf.readInt32BE(offset) === 123456;
});

// 连续写入测试
test('连续写入：100次', () => {
  const buf = Buffer.allocUnsafe(400);
  for (let i = 0; i < 100; i++) {
    buf.writeInt32BE(i, i * 4);
  }
  return buf.readInt32BE(0) === 0 && buf.readInt32BE(396) === 99;
});

test('连续写入：1000次', () => {
  const buf = Buffer.allocUnsafe(4000);
  for (let i = 0; i < 1000; i++) {
    buf.writeInt32BE(i, i * 4);
  }
  return buf.readInt32BE(0) === 0 && buf.readInt32BE(3996) === 999;
});

// 交替读写
test('交替读写：写-读-写-读', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeInt32BE(111, 0);
  const v1 = buf.readInt32BE(0);
  buf.writeInt32BE(222, 4);
  const v2 = buf.readInt32BE(4);
  buf.writeInt32BE(333, 8);
  const v3 = buf.readInt32BE(8);
  return v1 === 111 && v2 === 222 && v3 === 333;
});

// 重叠写入测试
test('重叠写入：offset 0 和 2', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x22222222, 2);
  return buf[0] === 0x11 && buf[1] === 0x11 && buf[2] === 0x22 && buf[3] === 0x22;
});

test('重叠写入：offset 0 和 1', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x22222222, 1);
  return buf[0] === 0x11 && buf[1] === 0x22;
});

test('重叠写入：offset 0 和 3', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x22222222, 3);
  return buf[0] === 0x11 && buf[3] === 0x22;
});

// 同一位置反复写入
test('同位置写入：10次', () => {
  const buf = Buffer.allocUnsafe(4);
  for (let i = 0; i < 10; i++) {
    buf.writeInt32BE(i, 0);
  }
  return buf.readInt32BE(0) === 9;
});

test('同位置写入：100次', () => {
  const buf = Buffer.allocUnsafe(4);
  for (let i = 0; i < 100; i++) {
    buf.writeInt32BE(i, 0);
  }
  return buf.readInt32BE(0) === 99;
});

// Buffer 子数组嵌套
test('子数组嵌套：2层', () => {
  const parent = Buffer.allocUnsafe(16);
  const child1 = parent.subarray(0, 12);
  const child2 = child1.subarray(4, 12);
  child2.writeInt32BE(0x12345678, 0);
  return parent.readInt32BE(4) === 0x12345678;
});

test('子数组嵌套：3层', () => {
  const parent = Buffer.allocUnsafe(16);
  const child1 = parent.subarray(0, 12);
  const child2 = child1.subarray(2, 10);
  const child3 = child2.subarray(1, 7);
  child3.writeInt32BE(123, 0);
  return parent.readInt32BE(3) === 123;
});

// 多视图同时操作
test('多视图：2个视图写入', () => {
  const buf = Buffer.allocUnsafe(16);
  const view1 = buf.subarray(0, 8);
  const view2 = buf.subarray(8, 16);
  view1.writeInt32BE(111, 0);
  view2.writeInt32BE(222, 0);
  return buf.readInt32BE(0) === 111 && buf.readInt32BE(8) === 222;
});

test('多视图：重叠视图写入', () => {
  const buf = Buffer.allocUnsafe(16);
  const view1 = buf.subarray(0, 8);
  const view2 = buf.subarray(4, 12);
  view1.writeInt32BE(0x11111111, 4);
  view2.writeInt32BE(0x22222222, 0);
  return buf.readInt32BE(4) === 0x22222222;
});

// ArrayBuffer 共享
test('ArrayBuffer：多个 Buffer 共享', () => {
  const ab = new ArrayBuffer(16);
  const buf1 = Buffer.from(ab, 0, 8);
  const buf2 = Buffer.from(ab, 8, 8);
  buf1.writeInt32BE(111, 0);
  buf2.writeInt32BE(222, 0);
  const view = new DataView(ab);
  return view.getInt32(0, false) === 111 && view.getInt32(8, false) === 222;
});

test('ArrayBuffer：Buffer 与 TypedArray 共享', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  const u32 = new Uint32Array(ab);
  buf.writeInt32BE(0x12345678, 0);
  return ab.byteLength === 16;
});

// 零长度相关
test('零长度：offset 0', () => {
  try {
    const buf = Buffer.allocUnsafe(0);
    buf.writeInt32BE(123, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('零长度视图：subarray(0, 0)', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    const view = buf.subarray(0, 0);
    view.writeInt32BE(123, 0);
    return false;
  } catch (e) {
    return true;
  }
});

// 边界精确写入
test('边界精确：length - 4', () => {
  const buf = Buffer.allocUnsafe(100);
  const result = buf.writeInt32BE(123, 96);
  return result === 100 && buf.readInt32BE(96) === 123;
});

test('边界精确：length - 5（应失败）', () => {
  try {
    const buf = Buffer.allocUnsafe(100);
    buf.writeInt32BE(123, 97);
    return false;
  } catch (e) {
    return true;
  }
});

// 内存对齐相关
test('内存对齐：8 字节边界', () => {
  const buf = Buffer.allocUnsafe(32);
  buf.writeInt32BE(111, 0);
  buf.writeInt32BE(222, 8);
  buf.writeInt32BE(333, 16);
  buf.writeInt32BE(444, 24);
  return buf.readInt32BE(0) === 111 && buf.readInt32BE(24) === 444;
});

test('内存对齐：非对齐写入验证', () => {
  const buf = Buffer.allocUnsafe(32);
  buf.writeInt32BE(111, 1);
  buf.writeInt32BE(222, 9);
  buf.writeInt32BE(333, 17);
  buf.writeInt32BE(444, 25);
  return buf.readInt32BE(1) === 111 && buf.readInt32BE(25) === 444;
});

// offset 为 0 的各种情况
test('offset 0：明确传入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(123, 0);
  return buf.readInt32BE(0) === 123;
});

test('offset 0：省略参数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(123);
  return buf.readInt32BE(0) === 123;
});

test('offset 0：undefined', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(123, undefined);
  return buf.readInt32BE(0) === 123;
});

// 特殊值的连续写入
test('特殊值连续：0, -1, 最大, 最小', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeInt32BE(0, 0);
  buf.writeInt32BE(-1, 4);
  buf.writeInt32BE(2147483647, 8);
  buf.writeInt32BE(-2147483648, 12);
  return buf.readInt32BE(0) === 0 &&
         buf.readInt32BE(4) === -1 &&
         buf.readInt32BE(8) === 2147483647 &&
         buf.readInt32BE(12) === -2147483648;
});

// 写入后的字节完整性
test('字节完整性：写入后每个字节可读', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0x12345678, 0);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78;
});

test('字节完整性：负数的每个字节', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-1, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF;
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
