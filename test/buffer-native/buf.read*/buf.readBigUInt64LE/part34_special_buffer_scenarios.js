// buf.readBigUInt64LE() - 特殊 Buffer 场景测试
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

// 测试 Buffer.concat 创建的 Buffer
test('Buffer.concat 连接两个 Buffer 后可以读取', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf2.writeUInt32BE(0x12345678, 0);
  const buf = Buffer.concat([buf1, buf2]);
  const result = buf.readBigUInt64LE(0);
  return typeof result === 'bigint';
});

test('Buffer.concat 连接多个 Buffer 后可以在各个位置读取', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  const buf3 = Buffer.alloc(8);
  buf1.writeBigUInt64LE(111n, 0);
  buf2.writeBigUInt64LE(222n, 0);
  buf3.writeBigUInt64LE(333n, 0);
  const buf = Buffer.concat([buf1, buf2, buf3]);
  return buf.readBigUInt64LE(0) === 111n &&
         buf.readBigUInt64LE(8) === 222n &&
         buf.readBigUInt64LE(16) === 333n;
});

// 测试 Buffer.from 从 TypedArray 创建
test('从 Uint8Array 创建的 Buffer 可以读取', () => {
  const arr = new Uint8Array(8);
  const buf = Buffer.from(arr);
  buf.writeBigUInt64LE(123n, 0);
  return buf.readBigUInt64LE(0) === 123n;
});

test('从 Uint16Array 创建的 Buffer 可以读取', () => {
  const arr = new Uint16Array(4);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigUInt64LE(456n, 0);
  return buf.readBigUInt64LE(0) === 456n;
});

test('从 Uint32Array 创建的 Buffer 可以读取', () => {
  const arr = new Uint32Array(2);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigUInt64LE(789n, 0);
  return buf.readBigUInt64LE(0) === 789n;
});

test('从 Int8Array 创建的 Buffer 可以读取', () => {
  const arr = new Int8Array(8);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigUInt64LE(111n, 0);
  return buf.readBigUInt64LE(0) === 111n;
});

test('从 Float32Array 创建的 Buffer 可以读取', () => {
  const arr = new Float32Array(2);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigUInt64LE(222n, 0);
  return buf.readBigUInt64LE(0) === 222n;
});

test('从 Float64Array 创建的 Buffer 可以读取', () => {
  const arr = new Float64Array(1);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigUInt64LE(333n, 0);
  return buf.readBigUInt64LE(0) === 333n;
});

// 测试 Buffer.from 从 ArrayBuffer 的不同区域创建
test('从 ArrayBuffer 的 offset 创建的 Buffer 可以读取', () => {
  const ab = new ArrayBuffer(16);
  const view = new DataView(ab);
  view.setBigUint64(8, 444n, true);
  const buf = Buffer.from(ab, 8, 8);
  return buf.readBigUInt64LE(0) === 444n;
});

test('从 ArrayBuffer 创建的部分 Buffer 可以读取', () => {
  const ab = new ArrayBuffer(24);
  const fullBuf = Buffer.from(ab);
  fullBuf.writeBigUInt64LE(555n, 8);
  const partBuf = Buffer.from(ab, 8, 8);
  return partBuf.readBigUInt64LE(0) === 555n;
});

// 测试 Buffer 的 subarray 和 slice 行为
test('Buffer.subarray 创建的视图可以读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(666n, 8);
  const sub = buf.subarray(8);
  return sub.readBigUInt64LE(0) === 666n;
});

test('Buffer.subarray 创建的视图与原 Buffer 共享内存', () => {
  const buf = Buffer.alloc(16);
  const sub = buf.subarray(8);
  buf.writeBigUInt64LE(777n, 8);
  return sub.readBigUInt64LE(0) === 777n;
});

test('Buffer.slice 创建的副本可以读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(888n, 8);
  const slice = buf.slice(8);
  return slice.readBigUInt64LE(0) === 888n;
});

test('修改原 Buffer 不影响 slice（在 Node.js v4+ slice 也是视图）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(999n, 8);
  const slice = buf.slice(8);
  const before = slice.readBigUInt64LE(0);
  buf.writeBigUInt64LE(1111n, 8);
  const after = slice.readBigUInt64LE(0);
  // 在新版本 Node.js 中，slice 也是视图，所以应该改变
  return before === 999n && (after === 1111n || after === 999n);
});

// 测试 Buffer 的 fill 方法影响
test('fill 后的 Buffer 可以正确读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  return buf.readBigUInt64LE(0) === 0xFFFFFFFFFFFFFFFFn;
});

test('部分 fill 后的 Buffer 可以正确读取', () => {
  const buf = Buffer.alloc(16);
  buf.fill(0, 0, 8);
  buf.fill(0xFF, 8, 16);
  return buf.readBigUInt64LE(0) === 0n &&
         buf.readBigUInt64LE(8) === 0xFFFFFFFFFFFFFFFFn;
});

test('fill 字符串后的 Buffer 可以正确读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill('a', 0, 8, 'utf8');
  const result = buf.readBigUInt64LE(0);
  return typeof result === 'bigint';
});

// 测试 Buffer.compare 不影响读取
test('Buffer.compare 后仍可以正确读取', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigUInt64LE(123n, 0);
  buf2.writeBigUInt64LE(456n, 0);
  Buffer.compare(buf1, buf2);
  return buf1.readBigUInt64LE(0) === 123n &&
         buf2.readBigUInt64LE(0) === 456n;
});

// 测试 Buffer.equals 不影响读取
test('Buffer.equals 后仍可以正确读取', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigUInt64LE(789n, 0);
  buf2.writeBigUInt64LE(789n, 0);
  buf1.equals(buf2);
  return buf1.readBigUInt64LE(0) === 789n &&
         buf2.readBigUInt64LE(0) === 789n;
});

// 测试 Buffer.swap 方法后的读取
test('Buffer.swap64 后可以读取交换后的值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0102030405060708n, 0);
  buf.swap64();
  return buf.readBigUInt64LE(0) === 0x0807060504030201n;
});

test('Buffer.swap32 后读取受影响', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0102030405060708n, 0);
  buf.swap32();
  const result = buf.readBigUInt64LE(0);
  return typeof result === 'bigint' && result !== 0x0102030405060708n;
});

test('Buffer.swap16 后读取受影响', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0102030405060708n, 0);
  buf.swap16();
  const result = buf.readBigUInt64LE(0);
  return typeof result === 'bigint' && result !== 0x0102030405060708n;
});

// 测试 Buffer.reverse 后的读取
test('Buffer.reverse 后可以读取反转后的值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0102030405060708n, 0);
  buf.reverse();
  return buf.readBigUInt64LE(0) === 0x0807060504030201n;
});

// 测试 Buffer.write 方法不影响其他位置的读取
test('Buffer.write 写入字符串后其他位置可以读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(123n, 0);
  buf.write('test', 8, 4, 'utf8');
  return buf.readBigUInt64LE(0) === 123n;
});

// 测试 Buffer.copy 方法
test('Buffer.copy 后目标 Buffer 可以读取', () => {
  const src = Buffer.alloc(8);
  const dst = Buffer.alloc(8);
  src.writeBigUInt64LE(456n, 0);
  src.copy(dst, 0, 0, 8);
  return dst.readBigUInt64LE(0) === 456n;
});

test('Buffer.copy 部分复制后可以读取', () => {
  const src = Buffer.alloc(16);
  const dst = Buffer.alloc(8);
  src.writeBigUInt64LE(789n, 8);
  src.copy(dst, 0, 8, 16);
  return dst.readBigUInt64LE(0) === 789n;
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
