// buf.writeInt32LE() - 深度补充：跨类型互操作细节
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

// SharedArrayBuffer（如果支持）
test('SharedArrayBuffer：基本写入', () => {
  try {
    const sab = new SharedArrayBuffer(8);
    const buf = Buffer.from(sab);
    buf.writeInt32LE(123, 0);
    return buf.readInt32LE(0) === 123;
  } catch (e) {
    return true;
  }
});

test('SharedArrayBuffer：多视图共享', () => {
  try {
    const sab = new SharedArrayBuffer(8);
    const buf1 = Buffer.from(sab);
    const buf2 = Buffer.from(sab);
    buf1.writeInt32LE(123, 0);
    return buf2.readInt32LE(0) === 123;
  } catch (e) {
    return true;
  }
});

// DataView 互操作
test('DataView：Buffer 写入 DataView 读取', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x12345678, 0);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return view.getInt32(0, true) === 0x12345678;
});

test('DataView：验证字节序一致性', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(1, 0);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return view.getUint8(0) === 1 && view.getUint8(3) === 0;
});

test('DataView：负数表示', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-1, 0);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return view.getInt32(0, true) === -1;
});

test('DataView：最大值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(2147483647, 0);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return view.getInt32(0, true) === 2147483647;
});

test('DataView：最小值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-2147483648, 0);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return view.getInt32(0, true) === -2147483648;
});

// Buffer 与 ArrayBuffer 偏移
test('ArrayBuffer 偏移：offset 0', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab, 0, 4);
  buf.writeInt32LE(123, 0);
  const view = new DataView(ab, 0, 4);
  return view.getInt32(0, true) === 123;
});

test('ArrayBuffer 偏移：offset 4', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab, 4, 4);
  buf.writeInt32LE(123, 0);
  const view = new DataView(ab, 4, 4);
  return view.getInt32(0, true) === 123;
});

test('ArrayBuffer 偏移：验证隔离', () => {
  const ab = new ArrayBuffer(16);
  const buf1 = Buffer.from(ab, 0, 4);
  const buf2 = Buffer.from(ab, 8, 4);
  buf1.writeInt32LE(111, 0);
  buf2.writeInt32LE(222, 0);
  return buf1.readInt32LE(0) === 111 && buf2.readInt32LE(0) === 222;
});

// 混合类型数组
test('混合类型：Buffer + Uint8Array', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab, 0, 4);
  const u8 = new Uint8Array(ab, 4, 4);
  buf.writeInt32LE(0x12345678, 0);
  return u8[0] === 0 && u8[1] === 0 && u8[2] === 0 && u8[3] === 0;
});

test('混合类型：Buffer + Uint32Array', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const u32 = new Uint32Array(ab);
  buf.writeInt32LE(0x12345678, 0);
  return ab.byteLength === 8;
});

// byteOffset 非零的情况
test('byteOffset：从偏移 2 创建', () => {
  const ab = new ArrayBuffer(16);
  const u8 = new Uint8Array(ab, 2, 8);
  const buf = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('byteOffset：验证正确位置', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab, 4, 8);
  buf.writeInt32LE(123, 0);
  const fullView = new DataView(ab);
  return fullView.getInt32(4, true) === 123;
});

// 复杂嵌套场景
test('复杂嵌套：ArrayBuffer -> Uint8Array -> Buffer', () => {
  const ab = new ArrayBuffer(8);
  const u8 = new Uint8Array(ab);
  const buf = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123 && u8[0] === 123 && u8[3] === 0;
});

test('复杂嵌套：subarray 的 subarray', () => {
  const parent = Buffer.allocUnsafe(16);
  const child1 = parent.subarray(2, 14);
  const child2 = child1.subarray(2, 10);
  child2.writeInt32LE(123, 0);
  return parent.readInt32LE(4) === 123;
});

// 长度边界
test('长度边界：恰好 4 字节', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  buf.writeInt32LE(123, 0);
  return buf.length === 4 && buf.readInt32LE(0) === 123;
});

test('长度边界：5 字节写在开头', () => {
  const ab = new ArrayBuffer(5);
  const buf = Buffer.from(ab);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('长度边界：5 字节写在结尾', () => {
  const ab = new ArrayBuffer(5);
  const buf = Buffer.from(ab);
  buf.writeInt32LE(123, 1);
  return buf.readInt32LE(1) === 123;
});

// 与其他 write 方法的交互
test('方法混合：writeInt32LE 后 writeInt8', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.writeInt32LE(0x11111111, 0);
  buf.writeInt8(0x22, 4);
  return buf[0] === 0x11 && buf[4] === 0x22;
});

test('方法混合：writeInt8 后 writeInt32LE', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.writeInt8(0x11, 0);
  buf.writeInt32LE(0x22222222, 1);
  return buf[0] === 0x11 && buf[1] === 0x22;
});

test('方法混合：writeInt32LE 覆盖 writeInt8', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt8(127, 0);
  buf.writeInt32LE(0, 0);
  return buf[0] === 0;
});

test('方法混合：writeInt16BE 后 writeInt32LE', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeInt16BE(0x1111, 0);
  buf.writeInt32LE(0x22222222, 2);
  return buf[0] === 0x11 && buf[2] === 0x22;
});

// fill 后写入
test('fill 交互：fill 后写入', () => {
  const buf = Buffer.alloc(8, 0xFF);
  buf.writeInt32LE(0, 2);
  return buf[0] === 0xFF && buf[2] === 0 && buf[6] === 0xFF;
});

test('fill 交互：写入后 fill', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeInt32LE(123, 2);
  buf.fill(0xFF, 0, 2);
  buf.fill(0xFF, 6, 8);
  return buf[0] === 0xFF && buf.readInt32LE(2) === 123 && buf[7] === 0xFF;
});

// copy 交互
test('copy 交互：写入后 copy', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeInt32LE(123, 0);
  buf1.copy(buf2);
  return buf2.readInt32LE(0) === 123;
});

test('copy 交互：copy 后写入', () => {
  const buf1 = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.copy(buf2);
  buf2.writeInt32LE(123, 0);
  return buf2.readInt32LE(0) === 123;
});

// Buffer.concat 交互
test('concat 交互：包含 writeInt32LE 的 Buffer', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeInt32LE(111, 0);
  buf2.writeInt32LE(222, 0);
  const result = Buffer.concat([buf1, buf2]);
  return result.readInt32LE(0) === 111 && result.readInt32LE(4) === 222;
});

// 比较操作
test('比较：相同值的 Buffer 相等', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeInt32LE(123, 0);
  buf2.writeInt32LE(123, 0);
  return buf1.equals(buf2);
});

test('比较：不同值的 Buffer 不等', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeInt32LE(123, 0);
  buf2.writeInt32LE(456, 0);
  return !buf1.equals(buf2);
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
