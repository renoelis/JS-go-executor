// buf.writeInt32BE() - 字节序与编码测试
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

// Big-Endian 字节序测试
test('字节序：0x12345678 的 BE 表示', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0x12345678, 0);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78;
});

test('字节序：0x01020304 的 BE 表示', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0x01020304, 0);
  return buf[0] === 0x01 && buf[1] === 0x02 && buf[2] === 0x03 && buf[3] === 0x04;
});

test('字节序：0x7ABBCCDD 的 BE 表示', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0x7ABBCCDD, 0);
  return buf[0] === 0x7A && buf[1] === 0xBB && buf[2] === 0xCC && buf[3] === 0xDD;
});

test('字节序：验证最高字节在前', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0x7F000000, 0);
  return buf[0] === 0x7F && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('字节序：验证最低字节在后', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0x000000FF, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0xFF;
});

// 与 LE 对比
test('BE vs LE：同一值不同字节序', () => {
  const bufBE = Buffer.allocUnsafe(4);
  const bufLE = Buffer.allocUnsafe(4);
  bufBE.writeInt32BE(0x12345678, 0);
  bufLE.writeInt32LE(0x12345678, 0);
  return bufBE[0] === 0x12 && bufLE[0] === 0x78 && bufBE[3] === 0x78 && bufLE[3] === 0x12;
});

test('BE vs LE：负数的不同表示', () => {
  const bufBE = Buffer.allocUnsafe(4);
  const bufLE = Buffer.allocUnsafe(4);
  bufBE.writeInt32BE(-1, 0);
  bufLE.writeInt32LE(-1, 0);
  return bufBE[0] === 0xFF && bufLE[0] === 0xFF && bufBE[3] === 0xFF && bufLE[3] === 0xFF;
});

test('BE vs LE：非对称数字', () => {
  const bufBE = Buffer.allocUnsafe(4);
  const bufLE = Buffer.allocUnsafe(4);
  bufBE.writeInt32BE(0x11223344, 0);
  bufLE.writeInt32LE(0x11223344, 0);
  return bufBE[0] === bufLE[3] && bufBE[1] === bufLE[2] && bufBE[2] === bufLE[1] && bufBE[3] === bufLE[0];
});

// 读写一致性测试
test('读写一致：写入后读回相同', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(123456, 0);
  const value = buf.readInt32BE(0);
  return value === 123456;
});

test('读写一致：负数写入读回', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-123456, 0);
  const value = buf.readInt32BE(0);
  return value === -123456;
});

test('读写一致：最大值写入读回', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(2147483647, 0);
  const value = buf.readInt32BE(0);
  return value === 2147483647;
});

test('读写一致：最小值写入读回', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-2147483648, 0);
  const value = buf.readInt32BE(0);
  return value === -2147483648;
});

test('读写一致：零写入读回', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0, 0);
  const value = buf.readInt32BE(0);
  return value === 0;
});

// 多次写入覆盖测试
test('覆盖写入：完全覆盖', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x22222222, 0);
  return buf[0] === 0x22 && buf[1] === 0x22 && buf[2] === 0x22 && buf[3] === 0x22;
});

test('覆盖写入：部分覆盖', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x22222222, 2);
  return buf[0] === 0x11 && buf[1] === 0x11 && buf[2] === 0x22 && buf[5] === 0x22;
});

// 字节对齐测试
test('字节对齐：4 字节对齐写入', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x22222222, 4);
  buf.writeInt32BE(0x33333333, 8);
  buf.writeInt32BE(0x44444444, 12);
  return buf[0] === 0x11 && buf[4] === 0x22 && buf[8] === 0x33 && buf[12] === 0x44;
});

test('字节对齐：非对齐写入', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeInt32BE(0x11111111, 1);
  buf.writeInt32BE(0x22222222, 5);
  buf.writeInt32BE(0x33333333, 9);
  return buf[1] === 0x11 && buf[5] === 0x22 && buf[9] === 0x33;
});

// 位模式测试
test('位模式：全 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0x00000000, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('位模式：全 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-1, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('位模式：交替位 0x55555555', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0x55555555, 0);
  return buf[0] === 0x55 && buf[1] === 0x55 && buf[2] === 0x55 && buf[3] === 0x55;
});

test('位模式：交替位 0xAAAAAAAA', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-1431655766, 0);
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
