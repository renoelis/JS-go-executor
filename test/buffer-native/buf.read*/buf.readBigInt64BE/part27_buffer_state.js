// buf.readBigInt64BE() - Buffer 状态和特殊场景测试
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

// Buffer 填充模式
test('全 0xFF 填充的 Buffer', () => {
  const buf = Buffer.alloc(8, 0xFF);
  return buf.readBigInt64BE(0) === -1n;
});

test('全 0x00 填充的 Buffer', () => {
  const buf = Buffer.alloc(8, 0x00);
  return buf.readBigInt64BE(0) === 0n;
});

test('全 0x55 填充的 Buffer', () => {
  const buf = Buffer.alloc(8, 0x55);
  return buf.readBigInt64BE(0) === 6148914691236517205n;
});

test('全 0xAA 填充的 Buffer', () => {
  const buf = Buffer.alloc(8, 0xAA);
  return buf.readBigInt64BE(0) === -6148914691236517206n;
});

// Buffer.allocUnsafe 的随机内容
test('Buffer.allocUnsafe 写入后读取', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64BE(123456789n, 0);
  return buf.readBigInt64BE(0) === 123456789n;
});

test('Buffer.allocUnsafe 多次写入覆盖', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64BE(111n, 0);
  buf.writeBigInt64BE(222n, 0);
  buf.writeBigInt64BE(333n, 0);
  return buf.readBigInt64BE(0) === 333n;
});

// Buffer 复制后读取
test('Buffer.from 复制后读取', () => {
  const buf1 = Buffer.alloc(8);
  buf1.writeBigInt64BE(999n, 0);
  const buf2 = Buffer.from(buf1);
  return buf2.readBigInt64BE(0) === 999n;
});

test('复制后修改原 Buffer 不影响副本', () => {
  const buf1 = Buffer.alloc(8);
  buf1.writeBigInt64BE(100n, 0);
  const buf2 = Buffer.from(buf1);
  buf1.writeBigInt64BE(200n, 0);
  return buf2.readBigInt64BE(0) === 100n && buf1.readBigInt64BE(0) === 200n;
});

// slice 和 subarray 在 Node.js 中都共享内存
test('slice 共享内存，修改会影响原 Buffer', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(111n, 0);
  const sliced = buf.slice(0, 8);
  sliced.writeBigInt64BE(222n, 0);
  return buf.readBigInt64BE(0) === 222n && sliced.readBigInt64BE(0) === 222n;
});

test('subarray 共享内存，修改会影响原 Buffer', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(333n, 0);
  const sub = buf.subarray(0, 8);
  sub.writeBigInt64BE(444n, 0);
  return buf.readBigInt64BE(0) === 444n && sub.readBigInt64BE(0) === 444n;
});

// Buffer.concat 后读取
test('Buffer.concat 两个 Buffer', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeInt32BE(0x01020304, 0);
  buf2.writeInt32BE(0x05060708, 0);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readBigInt64BE(0) === 72623859790382856n;
});

test('Buffer.concat 多个 Buffer', () => {
  const bufs = [];
  for (let i = 0; i < 8; i++) {
    const b = Buffer.alloc(1);
    b.writeUInt8(i + 1, 0);
    bufs.push(b);
  }
  const buf = Buffer.concat(bufs);
  return buf.readBigInt64BE(0) === 72623859790382856n;
});

// Buffer 长度边界
test('恰好 8 字节 Buffer，offset=0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(12345n, 0);
  return buf.readBigInt64BE(0) === 12345n;
});

test('9 字节 Buffer，offset=0', () => {
  const buf = Buffer.alloc(9);
  buf.writeBigInt64BE(54321n, 0);
  return buf.readBigInt64BE(0) === 54321n;
});

test('9 字节 Buffer，offset=1', () => {
  const buf = Buffer.alloc(9);
  buf.writeBigInt64BE(99999n, 1);
  return buf.readBigInt64BE(1) === 99999n;
});

test('16 字节 Buffer，读取最后 8 字节', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(77777n, 8);
  return buf.readBigInt64BE(8) === 77777n;
});

// 大 Buffer
test('1024 字节 Buffer，读取中间位置', () => {
  const buf = Buffer.alloc(1024);
  buf.writeBigInt64BE(888888n, 512);
  return buf.readBigInt64BE(512) === 888888n;
});

test('大 Buffer 多个位置读取', () => {
  const buf = Buffer.alloc(1000);
  buf.writeBigInt64BE(111n, 0);
  buf.writeBigInt64BE(222n, 500);
  buf.writeBigInt64BE(333n, 992);
  return buf.readBigInt64BE(0) === 111n &&
         buf.readBigInt64BE(500) === 222n &&
         buf.readBigInt64BE(992) === 333n;
});

// Buffer 与 TypedArray 的交互
test('修改 Uint8Array 后通过 Buffer 读取', () => {
  const arr = new Uint8Array(8);
  const buf = Buffer.from(arr.buffer);
  arr[0] = 0x00;
  arr[1] = 0x00;
  arr[2] = 0x00;
  arr[3] = 0x00;
  arr[4] = 0x00;
  arr[5] = 0x00;
  arr[6] = 0x01;
  arr[7] = 0xF4;
  return buf.readBigInt64BE(0) === 500n;
});

// 零拷贝场景
test('subarray 零拷贝读取', () => {
  const buf = Buffer.alloc(32);
  buf.writeBigInt64BE(123n, 8);
  const sub = buf.subarray(8, 16);
  return sub.readBigInt64BE(0) === 123n;
});

test('多层 subarray 嵌套', () => {
  const buf = Buffer.alloc(32);
  buf.writeBigInt64BE(456n, 16);
  const sub1 = buf.subarray(8, 32);
  const sub2 = sub1.subarray(8, 16);
  return sub2.readBigInt64BE(0) === 456n;
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
