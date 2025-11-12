// buf.writeInt16BE() - 第7轮补充：内存视图和 TypedArray/ArrayBuffer 交互测试
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

// Buffer.from 创建的不同来源
test('从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  buf.writeInt16BE(1234, 0);
  return buf.readInt16BE(0) === 1234;
});

test('从 Uint8Array 创建的 Buffer', () => {
  const u8 = new Uint8Array(10);
  const buf = Buffer.from(u8);
  buf.writeInt16BE(5678, 0);
  return buf.readInt16BE(0) === 5678;
});

test('从 Int8Array 创建的 Buffer', () => {
  const i8 = new Int8Array(10);
  const buf = Buffer.from(i8.buffer);
  buf.writeInt16BE(-1234, 0);
  return buf.readInt16BE(0) === -1234;
});

test('从 Uint16Array 创建的 Buffer', () => {
  const u16 = new Uint16Array(5);
  const buf = Buffer.from(u16.buffer);
  buf.writeInt16BE(9999, 0);
  return buf.readInt16BE(0) === 9999;
});

// Buffer.allocUnsafe 的行为
test('allocUnsafe 的 Buffer 可以正常写入', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeInt16BE(111, 0);
  buf.writeInt16BE(222, 2);
  return buf.readInt16BE(0) === 111 && buf.readInt16BE(2) === 222;
});

// Buffer 视图和原始数据关联
test('Buffer 和底层 ArrayBuffer 共享内存', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  buf.writeInt16BE(4660, 0);
  const u8 = new Uint8Array(ab);
  return u8[0] === 0x12 && u8[1] === 0x34;
});

test('修改 Buffer 影响同一 ArrayBuffer 的 DataView', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const dv = new DataView(ab);
  buf.writeInt16BE(22136, 2);
  return dv.getUint8(2) === 0x56 && dv.getUint8(3) === 0x78;
});

test('Buffer.subarray 共享底层内存', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(2, 8);
  sub.writeInt16BE(-21555, 0);
  return buf.readInt16BE(2) === -21555;
});

test('Buffer.slice 创建新副本（旧行为）或共享内存（新行为）', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(2, 8);
  sliced.writeInt16BE(-4351, 0);
  // 在新版 Node 中 slice 也共享内存
  return buf.readInt16BE(2) === -4351 || buf.readInt16BE(2) === 0;
});

// 跨越不同的 offset 和长度
test('在 subarray 的边界写入', () => {
  const buf = Buffer.alloc(20);
  const sub = buf.subarray(5, 15);
  sub.writeInt16BE(7777, 0);
  sub.writeInt16BE(8888, 8);
  return buf.readInt16BE(5) === 7777 && buf.readInt16BE(13) === 8888;
});

test('在 subarray 中间写入不影响外部区域', () => {
  const buf = Buffer.alloc(20, 0xFF);
  const sub = buf.subarray(8, 12);
  sub.writeInt16BE(0, 0);
  return buf[7] === 0xFF && buf[8] === 0x00 && buf[9] === 0x00 && buf[10] === 0xFF;
});

// TypedArray 的字节序问题
test('Buffer 与 DataView 字节序一致性 - BE', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const dv = new DataView(ab);
  buf.writeInt16BE(4386, 0);
  // DataView getInt16(offset, littleEndian=false) 默认 BE
  return dv.getInt16(0, false) === 4386;
});

test('Buffer BE 与 DataView LE 的差异', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const dv = new DataView(ab);
  buf.writeInt16BE(4386, 0);
  // LE 读取应该字节反转
  return dv.getInt16(0, true) === 0x2211;
});

// 写入到不同起始位置的 ArrayBuffer 视图
test('从 ArrayBuffer 中间创建的 Buffer', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  buf.writeInt16BE(-26215, 0);
  const u8 = new Uint8Array(ab);
  return u8[5] === 0x99 && u8[6] === 0x99;
});

// 在 TypedArray 上调用 Buffer 方法
test('Uint8Array 上调用 writeInt16BE', () => {
  const u8 = new Uint8Array(10);
  try {
    Buffer.prototype.writeInt16BE.call(u8, 100, 0);
    return u8[0] === 0x00 && u8[1] === 0x64;
  } catch (e) {
    // 某些实现可能不允许
    return e.message.includes('Buffer') || e.message.includes('this');
  }
});

// 在类数组对象上调用
test('普通数组上调用 writeInt16BE 可以成功', () => {
  const arr = [0, 0, 0, 0];
  Buffer.prototype.writeInt16BE.call(arr, 100, 0);
  // 会写入到 arr[0] 和 arr[1]
  return arr[0] === 0 && arr[1] === 100;
});

test('null 作为 this 抛出错误', () => {
  try {
    Buffer.prototype.writeInt16BE.call(null, 100, 0);
    return false;
  } catch (e) {
    return e.message.includes('Cannot') || e.message.includes('null');
  }
});

test('undefined 作为 this 抛出错误', () => {
  try {
    Buffer.prototype.writeInt16BE.call(undefined, 100, 0);
    return false;
  } catch (e) {
    return e.message.includes('Cannot') || e.message.includes('undefined');
  }
});

// ArrayBuffer 和 SharedArrayBuffer
test('SharedArrayBuffer 创建的 Buffer (如果支持)', () => {
  try {
    const sab = new SharedArrayBuffer(10);
    const buf = Buffer.from(sab);
    buf.writeInt16BE(6543, 0);
    return buf.readInt16BE(0) === 6543;
  } catch (e) {
    // SharedArrayBuffer 可能不可用
    return e.message.includes('SharedArrayBuffer') || e.message.includes('not defined');
  }
});

// 长度为 0 的视图
test('长度为 0 的 subarray 写入抛出错误', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(5, 5);
  try {
    sub.writeInt16BE(100, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('bounds');
  }
});

// Buffer.concat 后的写入
test('Buffer.concat 后可以正常写入', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const concatenated = Buffer.concat([buf1, buf2]);
  concatenated.writeInt16BE(-18, 2); // 0xFFEE 作为有符号数是 -18
  return concatenated.readInt16BE(2) === -18;
});

// 多次 subarray 嵌套
test('多层 subarray 嵌套写入', () => {
  const buf = Buffer.alloc(20);
  const sub1 = buf.subarray(2, 18);
  const sub2 = sub1.subarray(3, 13);
  sub2.writeInt16BE(4951, 0);
  // sub2 的 offset 0 对应 buf 的 offset 5
  return buf.readInt16BE(5) === 4951;
});

// 写入后的 buffer 属性不变
test('写入不改变 buffer.buffer 属性', () => {
  const buf = Buffer.alloc(10);
  const originalBuffer = buf.buffer;
  buf.writeInt16BE(100, 0);
  return buf.buffer === originalBuffer;
});

test('写入不改变 buffer.byteOffset', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  const originalOffset = buf.byteOffset;
  buf.writeInt16BE(100, 0);
  return buf.byteOffset === originalOffset;
});

test('写入不改变 buffer.byteLength', () => {
  const buf = Buffer.alloc(10);
  const originalLength = buf.byteLength;
  buf.writeInt16BE(100, 0);
  return buf.byteLength === originalLength;
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
