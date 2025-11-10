// buf.readBigUInt64BE() - Buffer 修改和状态测试
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

// 读取后修改 Buffer
test('读取后修改 Buffer 再读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(111n, 0);
  const first = buf.readBigUInt64BE(0);
  buf.writeBigUInt64BE(222n, 0);
  const second = buf.readBigUInt64BE(0);
  return first === 111n && second === 222n;
});

test('部分修改 Buffer 后读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFFn, 0);
  buf[0] = 0x00;
  const result = buf.readBigUInt64BE(0);
  return result === 0x00FFFFFFFFFFFFFFn;
});

test('修改单个字节影响读取结果', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0n, 0);
  buf[7] = 0x01;
  return buf.readBigUInt64BE(0) === 1n;
});

test('修改高位字节影响读取结果', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0n, 0);
  buf[0] = 0x01;
  return buf.readBigUInt64BE(0) === 0x0100000000000000n;
});

// 交替读写测试
test('交替读写多次', () => {
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 5; i++) {
    buf.writeBigUInt64BE(BigInt(i * 100), 0);
    if (buf.readBigUInt64BE(0) !== BigInt(i * 100)) {
      return false;
    }
  }
  return true;
});

test('在不同位置交替读写', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64BE(111n, 0);
  buf.writeBigUInt64BE(222n, 8);
  buf.writeBigUInt64BE(333n, 16);
  return buf.readBigUInt64BE(0) === 111n &&
         buf.readBigUInt64BE(8) === 222n &&
         buf.readBigUInt64BE(16) === 333n;
});

// Buffer 填充测试
test('fill 后读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  return buf.readBigUInt64BE(0) === 0xFFFFFFFFFFFFFFFFn;
});

test('fill 部分区域后读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0x00);
  buf.fill(0xFF, 4, 8);
  return buf.readBigUInt64BE(0) === 0x00000000FFFFFFFFn;
});

test('fill 0 后读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  buf.fill(0x00);
  return buf.readBigUInt64BE(0) === 0n;
});

// Buffer copy 测试
test('copy 到另一个 Buffer 后读取', () => {
  const src = Buffer.alloc(8);
  const dst = Buffer.alloc(8);
  src.writeBigUInt64BE(12345n, 0);
  src.copy(dst);
  return dst.readBigUInt64BE(0) === 12345n;
});

test('copy 部分数据后读取', () => {
  const src = Buffer.alloc(16);
  const dst = Buffer.alloc(8);
  src.writeBigUInt64BE(11111n, 0);
  src.writeBigUInt64BE(22222n, 8);
  src.copy(dst, 0, 8, 16);
  return dst.readBigUInt64BE(0) === 22222n;
});

// Buffer 重新分配测试
test('重新分配 Buffer 后读取', () => {
  let buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(999n, 0);
  const first = buf.readBigUInt64BE(0);
  buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(888n, 0);
  const second = buf.readBigUInt64BE(0);
  return first === 999n && second === 888n;
});

// 使用 set 方法修改 Buffer
test('使用 set 方法后读取', () => {
  const buf = Buffer.alloc(8);
  const arr = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00]);
  buf.set(arr);
  return buf.readBigUInt64BE(0) === 256n;
});

test('使用 set 部分修改后读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0x00);
  const arr = new Uint8Array([0xFF, 0xFF]);
  buf.set(arr, 6);
  return buf.readBigUInt64BE(0) === 0x000000000000FFFFn;
});

// Buffer 反转测试
test('reverse 后读取值改变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const before = buf.readBigUInt64BE(0);
  buf.reverse();
  const after = buf.readBigUInt64BE(0);
  return before !== after && after === 0x0807060504030201n;
});

// 多次写入同一位置
test('多次写入同一位置，最后一次生效', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(111n, 0);
  buf.writeBigUInt64BE(222n, 0);
  buf.writeBigUInt64BE(333n, 0);
  return buf.readBigUInt64BE(0) === 333n;
});

// 写入后立即读取
test('writeBigUInt64BE 后立即 readBigUInt64BE', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(123456789n, 0);
  return buf.readBigUInt64BE(0) === 123456789n;
});

test('连续写入不同位置后读取', () => {
  const buf = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) {
    buf.writeBigUInt64BE(BigInt(i * 1000), i * 8);
  }
  for (let i = 0; i < 4; i++) {
    if (buf.readBigUInt64BE(i * 8) !== BigInt(i * 1000)) {
      return false;
    }
  }
  return true;
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
