// buf.readBigInt64LE() - 内存安全和数据完整性测试
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

// Buffer 修改后的读取
test('修改 Buffer 后读取新值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  const r1 = buf.readBigInt64LE(0);
  buf.writeBigInt64LE(200n, 0);
  const r2 = buf.readBigInt64LE(0);
  return r1 === 100n && r2 === 200n;
});

// 部分修改
test('部分修改 Buffer 后读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);
  buf[0] = 0xFF;
  const result = buf.readBigInt64LE(0);
  // LE: 0xFF 在低位，结果是 0x1020304050607FF
  return result === 0x1020304050607FFn;
});

test('修改中间字节后读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);
  buf[4] = 0xAA;
  const result = buf.readBigInt64LE(0);
  return result === 0x10203AA05060708n;
});

// 填充后读取
test('fill 后读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  return buf.readBigInt64LE(0) === -1n;
});

test('fill 部分区域后读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0x00);
  buf.fill(0xFF, 0, 4);
  const result = buf.readBigInt64LE(0);
  // LE: 前4字节为 0xFF，后4字节为 0x00，结果是 0xFFFFFFFF
  return result === 0xFFFFFFFFn;
});

// copy 操作
test('copy 后读取', () => {
  const buf1 = Buffer.alloc(8);
  buf1.writeBigInt64LE(12345n, 0);
  const buf2 = Buffer.alloc(8);
  buf1.copy(buf2);
  return buf2.readBigInt64LE(0) === 12345n;
});

test('部分 copy 后读取', () => {
  const buf1 = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const buf2 = Buffer.alloc(8);
  buf1.copy(buf2, 0, 0, 4);
  const result = buf2.readBigInt64LE(0);
  return result === 0x04030201n;
});

// slice 共享内存
test('slice 共享内存 - 修改原 Buffer', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(100n, 4);
  const sliced = buf.slice(4, 12);
  buf.writeBigInt64LE(200n, 4);
  return sliced.readBigInt64LE(0) === 200n;
});

test('slice 共享内存 - 修改 slice', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(100n, 4);
  const sliced = buf.slice(4, 12);
  sliced.writeBigInt64LE(300n, 0);
  return buf.readBigInt64LE(4) === 300n;
});

// subarray 共享内存
test('subarray 共享内存 - 修改原 Buffer', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(111n, 8);
  const sub = buf.subarray(8, 16);
  buf.writeBigInt64LE(222n, 8);
  return sub.readBigInt64LE(0) === 222n;
});

test('subarray 共享内存 - 修改 subarray', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(111n, 8);
  const sub = buf.subarray(8, 16);
  sub.writeBigInt64LE(333n, 0);
  return buf.readBigInt64LE(8) === 333n;
});

// 零拷贝验证
test('Buffer.from(buffer) 创建新副本', () => {
  const buf1 = Buffer.alloc(8);
  buf1.writeBigInt64LE(100n, 0);
  const buf2 = Buffer.from(buf1);
  buf1.writeBigInt64LE(200n, 0);
  return buf2.readBigInt64LE(0) === 100n;
});

// 并发读取
test('多次读取不互相干扰', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(999n, 0);
  const r1 = buf.readBigInt64LE(0);
  const r2 = buf.readBigInt64LE(0);
  const r3 = buf.readBigInt64LE(0);
  return r1 === r2 && r2 === r3 && r3 === 999n;
});

// 覆盖写入
test('完全覆盖写入后读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(111n, 0);
  buf.writeBigInt64LE(222n, 0);
  buf.writeBigInt64LE(333n, 0);
  return buf.readBigInt64LE(0) === 333n;
});

// 交叉覆盖
test('交叉覆盖写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(0x0102030405060708n, 0);
  buf.writeBigInt64LE(0x1112131415161718n, 4);
  // offset=4 的写入会覆盖 offset=0 的后 4 字节
  const r1 = buf.readBigInt64LE(0);
  const r2 = buf.readBigInt64LE(4);
  return r2 === 0x1112131415161718n;
});

// 读取后 Buffer 内容不变
test('读取不修改 Buffer 内容', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const before = Buffer.from(buf);
  buf.readBigInt64LE(0);
  return buf.equals(before);
});

// 多线程安全（JavaScript 是单线程，但测试数据一致性）
test('连续快速读写一致性', () => {
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 100; i++) {
    const value = BigInt(i);
    buf.writeBigInt64LE(value, 0);
    if (buf.readBigInt64LE(0) !== value) {
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
