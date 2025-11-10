// 补充遗漏场景测试
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

// === 特殊边界值 ===

test('读取 2147483646 (最大值-1) - BE', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFE]);
  return buf.readInt32BE(0) === 2147483646;
});

test('读取 2147483646 (最大值-1) - LE', () => {
  const buf = Buffer.from([0xFE, 0xFF, 0xFF, 0x7F]);
  return buf.readInt32LE(0) === 2147483646;
});

test('读取 -2147483647 (最小值+1) - BE', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x01]);
  return buf.readInt32BE(0) === -2147483647;
});

test('读取 -2147483647 (最小值+1) - LE', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x80]);
  return buf.readInt32LE(0) === -2147483647;
});

test('读取 -2 (0xFFFFFFFE) - BE', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFE]);
  return buf.readInt32BE(0) === -2;
});

test('读取 -2 (0xFFFFFFFE) - LE', () => {
  const buf = Buffer.from([0xFE, 0xFF, 0xFF, 0xFF]);
  return buf.readInt32LE(0) === -2;
});

test('读取 2 (0x00000002) - BE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x02]);
  return buf.readInt32BE(0) === 2;
});

test('读取 2 (0x00000002) - LE', () => {
  const buf = Buffer.from([0x02, 0x00, 0x00, 0x00]);
  return buf.readInt32LE(0) === 2;
});

// === 错误码验证 ===

test('越界错误应该包含 ERR_OUT_OF_RANGE 或 RangeError - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(2);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('越界错误应该包含 ERR_OUT_OF_RANGE 或 RangeError - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// === 覆盖写入测试 ===

test('覆盖写入后读取 - BE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x22222222, 0);
  buf.writeInt32BE(0x12345678, 0);
  return buf.readInt32BE(0) === 0x12345678;
});

test('覆盖写入后读取 - LE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(0x11111111, 0);
  buf.writeInt32LE(0x22222222, 0);
  buf.writeInt32LE(0x12345678, 0);
  return buf.readInt32LE(0) === 0x12345678;
});

// === 最小Buffer大小 ===

test('4字节Buffer（最小有效大小）- BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE(0) === 0x12345678 && buf.length === 4;
});

test('4字节Buffer（最小有效大小）- LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readInt32LE(0) === 0x12345678 && buf.length === 4;
});

// === 256的倍数值测试 ===

test('读取 256 (0x00000100) - BE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x01, 0x00]);
  return buf.readInt32BE(0) === 256;
});

test('读取 256 (0x00000100) - LE', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x00]);
  return buf.readInt32LE(0) === 256;
});

test('读取 65536 (0x00010000) - BE', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x00]);
  return buf.readInt32BE(0) === 65536;
});

test('读取 65536 (0x00010000) - LE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x01, 0x00]);
  return buf.readInt32LE(0) === 65536;
});

test('读取 16777216 (0x01000000) - BE', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  return buf.readInt32BE(0) === 16777216;
});

test('读取 16777216 (0x01000000) - LE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x01]);
  return buf.readInt32LE(0) === 16777216;
});

// === 负数256倍数 ===

test('读取 -256 - BE', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x00]);
  return buf.readInt32BE(0) === -256;
});

test('读取 -256 - LE', () => {
  const buf = Buffer.from([0x00, 0xFF, 0xFF, 0xFF]);
  return buf.readInt32LE(0) === -256;
});

test('读取 -65536 - BE', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0x00, 0x00]);
  return buf.readInt32BE(0) === -65536;
});

test('读取 -65536 - LE', () => {
  const buf = Buffer.from([0x00, 0x00, 0xFF, 0xFF]);
  return buf.readInt32LE(0) === -65536;
});

test('读取 -16777216 - BE', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00]);
  return buf.readInt32BE(0) === -16777216;
});

test('读取 -16777216 - LE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0xFF]);
  return buf.readInt32LE(0) === -16777216;
});

// === 奇怪的位模式 ===

test('位模式: 0x12121212 - BE', () => {
  const buf = Buffer.from([0x12, 0x12, 0x12, 0x12]);
  return buf.readInt32BE(0) === 0x12121212;
});

test('位模式: 0x12121212 - LE', () => {
  const buf = Buffer.from([0x12, 0x12, 0x12, 0x12]);
  return buf.readInt32LE(0) === 0x12121212;
});

test('位模式: 0xF0F0F0F0 - BE', () => {
  const buf = Buffer.from([0xF0, 0xF0, 0xF0, 0xF0]);
  return buf.readInt32BE(0) === -252645136;
});

test('位模式: 0x0F0F0F0F - LE', () => {
  const buf = Buffer.from([0x0F, 0x0F, 0x0F, 0x0F]);
  return buf.readInt32LE(0) === 0x0F0F0F0F;
});

// === 半字节边界 ===

test('半字节: 0x0000FFFF - BE', () => {
  const buf = Buffer.from([0x00, 0x00, 0xFF, 0xFF]);
  return buf.readInt32BE(0) === 65535;
});

test('半字节: 0xFFFF0000 - BE', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0x00, 0x00]);
  return buf.readInt32BE(0) === -65536;
});

test('半字节: 0x00FFFF00 - BE', () => {
  const buf = Buffer.from([0x00, 0xFF, 0xFF, 0x00]);
  return buf.readInt32BE(0) === 16776960;
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
