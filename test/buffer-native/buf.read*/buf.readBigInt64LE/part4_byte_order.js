// buf.readBigInt64LE() - 字节序（Little-Endian）验证
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

// 字节序验证 - Little-Endian（低位字节在前）
test('字节序验证：0x01 在低位 = 1n', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigInt64LE(0) === 1n;
});

test('字节序验证：0x0100 在低位 = 256n', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigInt64LE(0) === 256n;
});

test('字节序验证：0x010000 在低位 = 65536n', () => {
  const buf = Buffer.from([0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigInt64LE(0) === 65536n;
});

test('字节序验证：0x0807060504030201（LE）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  return buf.readBigInt64LE(0) === 578437695752307201n;
});

test('字节序验证：0xFFFFFFFFFFFFFFFF = -1n', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readBigInt64LE(0) === -1n;
});

test('字节序验证：0x80 在高位 = -2^63（最小值）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  return buf.readBigInt64LE(0) === -9223372036854775808n;
});

test('字节序验证：0x7F 在高位 = 2^63-1（最大值）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readBigInt64LE(0) === 9223372036854775807n;
});

// 二进制补码验证
test('二进制补码：-2n', () => {
  const buf = Buffer.from([0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readBigInt64LE(0) === -2n;
});

test('二进制补码：-256n', () => {
  const buf = Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readBigInt64LE(0) === -256n;
});

test('二进制补码：-65536n', () => {
  const buf = Buffer.from([0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readBigInt64LE(0) === -65536n;
});

// 混合正负值
test('混合值：0x80000000 在低位 = 2147483648n', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigInt64LE(0) === 2147483648n;
});

test('混合值：0x80000000 在低位（负数）= -2147483648n', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readBigInt64LE(0) === -2147483648n;
});

// 特殊模式
test('全零字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigInt64LE(0) === 0n;
});

test('交替模式：0xAAAAAAAAAAAAAAAA', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readBigInt64LE(0) === -6148914691236517206n;
});

test('交替模式：0x5555555555555555', () => {
  const buf = Buffer.from([0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55]);
  return buf.readBigInt64LE(0) === 6148914691236517205n;
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
