// buf.readBigInt64LE() - Buffer 修改和并发测试
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
test('读取后修改 Buffer 不影响已读取的值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  const value1 = buf.readBigInt64LE(0);
  buf.writeBigInt64LE(200n, 0);
  const value2 = buf.readBigInt64LE(0);
  return value1 === 100n && value2 === 200n;
});

// 读取时修改其他位置
test('读取时其他位置的值不影响读取结果', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(100n, 0);
  buf.writeBigInt64LE(200n, 8);
  const value1 = buf.readBigInt64LE(0);
  const value2 = buf.readBigInt64LE(8);
  return value1 === 100n && value2 === 200n;
});

// 部分字节修改
test('修改部分字节后读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0n, 0);
  buf[0] = 0x00;
  buf[1] = 0x00;
  buf[2] = 0x00;
  buf[3] = 0x00;
  buf[4] = 0x00;
  buf[5] = 0x00;
  buf[6] = 0x00;
  buf[7] = 0x01;
  return buf.readBigInt64LE(0) === 72057594037927936n;
});

test('修改单个字节影响读取结果', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0n, 0);
  buf[7] = 0xFF;
  return buf.readBigInt64LE(0) === -72057594037927936n;
});

test('修改最高字节影响符号位', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0n, 0);
  buf[0] = 0x80; // LE: 低位字节
  return buf.readBigInt64LE(0) === 128n;
});

// 连续读取
test('连续读取相同位置返回相同值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(12345n, 0);
  const v1 = buf.readBigInt64LE(0);
  const v2 = buf.readBigInt64LE(0);
  const v3 = buf.readBigInt64LE(0);
  return v1 === 12345n && v2 === 12345n && v3 === 12345n;
});

// 覆盖写入
test('覆盖写入后读取新值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  buf.writeBigInt64LE(200n, 0);
  buf.writeBigInt64LE(300n, 0);
  return buf.readBigInt64LE(0) === 300n;
});

// fill 操作后读取
test('fill(0) 后读取为 0n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(12345n, 0);
  buf.fill(0);
  return buf.readBigInt64LE(0) === 0n;
});

test('fill(0xFF) 后读取为 -1n', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  return buf.readBigInt64LE(0) === -1n;
});

test('fill(0x80) 后读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0x80);
  return buf.readBigInt64LE(0) === -9187201950435737472n;
});

// copy 操作
test('从另一个 Buffer copy 后读取', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigInt64LE(99999n, 0);
  buf1.copy(buf2, 0, 0, 8);
  return buf2.readBigInt64LE(0) === 99999n;
});

test('部分 copy 后读取', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigInt64LE(0x0807060504030201n, 0);
  buf2.fill(0);
  buf1.copy(buf2, 0, 0, 4); // 只复制前 4 字节
  const expected = 0x04030201n;
  return buf2.readBigInt64LE(0) === expected;
});

// slice 操作
test('slice 后的 Buffer 修改影响原 Buffer', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(100n, 0);
  const slice = buf.slice(0, 8);
  slice.writeBigInt64LE(200n, 0);
  return buf.readBigInt64LE(0) === 200n;
});

test('原 Buffer 修改影响 slice', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(100n, 0);
  const slice = buf.slice(0, 8);
  buf.writeBigInt64LE(300n, 0);
  return slice.readBigInt64LE(0) === 300n;
});

// subarray 操作
test('subarray 后的 Buffer 修改影响原 Buffer', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(100n, 0);
  const sub = buf.subarray(0, 8);
  sub.writeBigInt64LE(400n, 0);
  return buf.readBigInt64LE(0) === 400n;
});

test('原 Buffer 修改影响 subarray', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(100n, 0);
  const sub = buf.subarray(0, 8);
  buf.writeBigInt64LE(500n, 0);
  return sub.readBigInt64LE(0) === 500n;
});

// 交错读写
test('交错读写不同位置', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(111n, 0);
  const v1 = buf.readBigInt64LE(0);
  buf.writeBigInt64LE(222n, 8);
  const v2 = buf.readBigInt64LE(8);
  const v3 = buf.readBigInt64LE(0);
  return v1 === 111n && v2 === 222n && v3 === 111n;
});

// 零长度操作
test('零长度 fill 不影响读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(12345n, 0);
  buf.fill(0, 0, 0); // 零长度 fill
  return buf.readBigInt64LE(0) === 12345n;
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
