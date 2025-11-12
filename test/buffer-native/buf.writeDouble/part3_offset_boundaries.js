// buf.writeDoubleBE/LE - Offset and Boundary Tests
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

// offset 边界测试 - writeDoubleBE
test('writeDoubleBE offset 为 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeDoubleBE(3.14, 0);
  return result === 8;
});

test('writeDoubleBE offset 刚好允许写入', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleBE(3.14, 8);
  return result === 16;
});

test('writeDoubleBE offset 为最大合法值', () => {
  const buf = Buffer.alloc(100);
  const result = buf.writeDoubleBE(3.14, 92);
  return result === 100;
});

// offset 边界测试 - writeDoubleLE
test('writeDoubleLE offset 为 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeDoubleLE(3.14, 0);
  return result === 8;
});

test('writeDoubleLE offset 刚好允许写入', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleLE(3.14, 8);
  return result === 16;
});

test('writeDoubleLE offset 为最大合法值', () => {
  const buf = Buffer.alloc(100);
  const result = buf.writeDoubleLE(3.14, 92);
  return result === 100;
});

// Buffer 大小边界
test('writeDoubleBE 在刚好 8 字节的 Buffer 中', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1.23);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - 1.23) < 0.0001;
});

test('writeDoubleLE 在刚好 8 字节的 Buffer 中', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(1.23);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - 1.23) < 0.0001;
});

test('writeDoubleBE 在大 Buffer 边界位置', () => {
  const buf = Buffer.alloc(1000);
  buf.writeDoubleBE(456.789, 992);
  const readBack = buf.readDoubleBE(992);
  return Math.abs(readBack - 456.789) < 0.0001;
});

test('writeDoubleLE 在大 Buffer 边界位置', () => {
  const buf = Buffer.alloc(1000);
  buf.writeDoubleLE(456.789, 992);
  const readBack = buf.readDoubleLE(992);
  return Math.abs(readBack - 456.789) < 0.0001;
});

// 验证不会越界写入
test('writeDoubleBE 不影响后续字节', () => {
  const buf = Buffer.alloc(16);
  buf.fill(0xff);
  buf.writeDoubleBE(1.0, 0);
  return buf[8] === 0xff && buf[15] === 0xff;
});

test('writeDoubleLE 不影响后续字节', () => {
  const buf = Buffer.alloc(16);
  buf.fill(0xff);
  buf.writeDoubleLE(1.0, 0);
  return buf[8] === 0xff && buf[15] === 0xff;
});

test('writeDoubleBE 不影响前面字节', () => {
  const buf = Buffer.alloc(16);
  buf.fill(0xaa);
  buf.writeDoubleBE(1.0, 8);
  return buf[0] === 0xaa && buf[7] === 0xaa;
});

test('writeDoubleLE 不影响前面字节', () => {
  const buf = Buffer.alloc(16);
  buf.fill(0xaa);
  buf.writeDoubleLE(1.0, 8);
  return buf[0] === 0xaa && buf[7] === 0xaa;
});

// 中间位置写入
test('writeDoubleBE 在 Buffer 中间位置', () => {
  const buf = Buffer.alloc(24);
  buf.writeDoubleBE(111.222, 8);
  const readBack = buf.readDoubleBE(8);
  return Math.abs(readBack - 111.222) < 0.0001;
});

test('writeDoubleLE 在 Buffer 中间位置', () => {
  const buf = Buffer.alloc(24);
  buf.writeDoubleLE(111.222, 8);
  const readBack = buf.readDoubleLE(8);
  return Math.abs(readBack - 111.222) < 0.0001;
});

// 连续位置写入验证
test('writeDoubleBE 连续写入不互相影响', () => {
  const buf = Buffer.alloc(32);
  buf.writeDoubleBE(1.1, 0);
  buf.writeDoubleBE(2.2, 8);
  buf.writeDoubleBE(3.3, 16);
  buf.writeDoubleBE(4.4, 24);

  return Math.abs(buf.readDoubleBE(0) - 1.1) < 0.0001 &&
         Math.abs(buf.readDoubleBE(8) - 2.2) < 0.0001 &&
         Math.abs(buf.readDoubleBE(16) - 3.3) < 0.0001 &&
         Math.abs(buf.readDoubleBE(24) - 4.4) < 0.0001;
});

test('writeDoubleLE 连续写入不互相影响', () => {
  const buf = Buffer.alloc(32);
  buf.writeDoubleLE(1.1, 0);
  buf.writeDoubleLE(2.2, 8);
  buf.writeDoubleLE(3.3, 16);
  buf.writeDoubleLE(4.4, 24);

  return Math.abs(buf.readDoubleLE(0) - 1.1) < 0.0001 &&
         Math.abs(buf.readDoubleLE(8) - 2.2) < 0.0001 &&
         Math.abs(buf.readDoubleLE(16) - 3.3) < 0.0001 &&
         Math.abs(buf.readDoubleLE(24) - 4.4) < 0.0001;
});

// 覆盖写入
test('writeDoubleBE 覆盖已有数据', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.456);
  buf.writeDoubleBE(789.012);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - 789.012) < 0.0001;
});

test('writeDoubleLE 覆盖已有数据', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(123.456);
  buf.writeDoubleLE(789.012);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - 789.012) < 0.0001;
});

// offset 省略时默认为 0
test('writeDoubleBE 省略 offset 参数', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeDoubleBE(2.718);
  const readBack = buf.readDoubleBE(0);
  return result === 8 && Math.abs(readBack - 2.718) < 0.0001;
});

test('writeDoubleLE 省略 offset 参数', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeDoubleLE(2.718);
  const readBack = buf.readDoubleLE(0);
  return result === 8 && Math.abs(readBack - 2.718) < 0.0001;
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
