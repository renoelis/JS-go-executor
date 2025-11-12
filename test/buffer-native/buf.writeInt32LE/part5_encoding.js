// buf.writeInt32LE() - 字节序与编码测试
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

// Little-Endian 字节序测试
test('字节序：0x12345678 的 LE 表示', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x12345678, 0);
  return buf[0] === 0x78 && buf[1] === 0x56 && buf[2] === 0x34 && buf[3] === 0x12;
});

test('字节序：0x01020304 的 LE 表示', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x01020304, 0);
  return buf[0] === 0x04 && buf[1] === 0x03 && buf[2] === 0x02 && buf[3] === 0x01;
});

test('字节序：0x7ABBCCDD 的 LE 表示', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x7ABBCCDD, 0);
  return buf[0] === 0xDD && buf[1] === 0xCC && buf[2] === 0xBB && buf[3] === 0x7A;
});

test('字节序：验证最低字节在前', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x7F000000, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x7F;
});

test('字节序：验证最高字节在后', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x000000FF, 0);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

// 与 BE 对比
test('LE vs BE：同一值不同字节序', () => {
  const bufLE = Buffer.allocUnsafe(4);
  const bufBE = Buffer.allocUnsafe(4);
  bufLE.writeInt32LE(0x12345678, 0);
  bufBE.writeInt32BE(0x12345678, 0);
  return bufLE[0] === 0x78 && bufBE[0] === 0x12 && bufLE[3] === 0x12 && bufBE[3] === 0x78;
});

test('LE vs BE：负数的不同表示', () => {
  const bufLE = Buffer.allocUnsafe(4);
  const bufBE = Buffer.allocUnsafe(4);
  bufLE.writeInt32LE(-1, 0);
  bufBE.writeInt32BE(-1, 0);
  return bufLE[0] === 0xFF && bufBE[0] === 0xFF && bufLE[3] === 0xFF && bufBE[3] === 0xFF;
});

test('LE vs BE：非对称数字', () => {
  const bufLE = Buffer.allocUnsafe(4);
  const bufBE = Buffer.allocUnsafe(4);
  bufLE.writeInt32LE(0x11223344, 0);
  bufBE.writeInt32BE(0x11223344, 0);
  return bufLE[0] === bufBE[3] && bufLE[1] === bufBE[2] && bufLE[2] === bufBE[1] && bufLE[3] === bufBE[0];
});

// 读写一致性测试
test('读写一致：写入后读回相同', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(123456, 0);
  const value = buf.readInt32LE(0);
  return value === 123456;
});

test('读写一致：负数写入读回', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-123456, 0);
  const value = buf.readInt32LE(0);
  return value === -123456;
});

test('读写一致：最大值写入读回', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(2147483647, 0);
  const value = buf.readInt32LE(0);
  return value === 2147483647;
});

test('读写一致：最小值写入读回', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-2147483648, 0);
  const value = buf.readInt32LE(0);
  return value === -2147483648;
});

test('读写一致：零写入读回', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0, 0);
  const value = buf.readInt32LE(0);
  return value === 0;
});

// 多次写入覆盖测试
test('覆盖写入：完全覆盖', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x11111111, 0);
  buf.writeInt32LE(0x22222222, 0);
  return buf[0] === 0x22 && buf[1] === 0x22 && buf[2] === 0x22 && buf[3] === 0x22;
});

test('覆盖写入：部分覆盖', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeInt32LE(0x11111111, 0);
  buf.writeInt32LE(0x22222222, 2);
  return buf[0] === 0x11 && buf[1] === 0x11 && buf[2] === 0x22 && buf[5] === 0x22;
});

// 字节对齐测试
test('字节对齐：4 字节对齐写入', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeInt32LE(0x11111111, 0);
  buf.writeInt32LE(0x22222222, 4);
  buf.writeInt32LE(0x33333333, 8);
  buf.writeInt32LE(0x44444444, 12);
  return buf[0] === 0x11 && buf[4] === 0x22 && buf[8] === 0x33 && buf[12] === 0x44;
});

test('字节对齐：非对齐写入', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeInt32LE(0x11111111, 1);
  buf.writeInt32LE(0x22222222, 5);
  buf.writeInt32LE(0x33333333, 9);
  return buf[1] === 0x11 && buf[5] === 0x22 && buf[9] === 0x33;
});

// 位模式测试
test('位模式：全 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x00000000, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('位模式：全 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-1, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('位模式：交替位 0x55555555', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x55555555, 0);
  return buf[0] === 0x55 && buf[1] === 0x55 && buf[2] === 0x55 && buf[3] === 0x55;
});

test('位模式：交替位 0xAAAAAAAA', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-1431655766, 0);
  return buf[0] === 0xAA && buf[1] === 0xAA && buf[2] === 0xAA && buf[3] === 0xAA;
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
