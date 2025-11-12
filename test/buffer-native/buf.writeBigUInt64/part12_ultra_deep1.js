// buf.writeBigUInt64BE/LE - 超深度补充轮1：位运算与二进制边界
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

// ===== 位运算边界（每一位的独立性）=====

test('writeBigUInt64BE - 只有第1位为1 (0x0000000000000001n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x0000000000000001n, 0);
  return buf.toString('hex') === '0000000000000001';
});

test('writeBigUInt64LE - 只有第1位为1 (0x0000000000000001n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0000000000000001n, 0);
  return buf.toString('hex') === '0100000000000000';
});

test('writeBigUInt64BE - 只有第32位为1 (0x0000000080000000n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x0000000080000000n, 0);
  return buf.toString('hex') === '0000000080000000';
});

test('writeBigUInt64LE - 只有第32位为1 (0x0000000080000000n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0000000080000000n, 0);
  return buf.toString('hex') === '0000008000000000';
});

test('writeBigUInt64BE - 只有第64位为1 (0x8000000000000000n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x8000000000000000n, 0);
  return buf.toString('hex') === '8000000000000000';
});

test('writeBigUInt64LE - 只有第64位为1 (0x8000000000000000n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x8000000000000000n, 0);
  return buf.toString('hex') === '0000000000000080';
});

test('writeBigUInt64BE - 除第1位外全1 (0xFFFFFFFFFFFFFFFEn)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFEn, 0);
  return buf.toString('hex') === 'fffffffffffffffe';
});

test('writeBigUInt64LE - 除第1位外全1 (0xFFFFFFFFFFFFFFFEn)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0xFFFFFFFFFFFFFFFEn, 0);
  return buf.toString('hex') === 'feffffffffffffff';
});

test('writeBigUInt64BE - 除第64位外全1 (0x7FFFFFFFFFFFFFFFn)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x7FFFFFFFFFFFFFFFn, 0);
  return buf.toString('hex') === '7fffffffffffffff';
});

test('writeBigUInt64LE - 除第64位外全1 (0x7FFFFFFFFFFFFFFFn)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x7FFFFFFFFFFFFFFFn, 0);
  return buf.toString('hex') === 'ffffffffffffff7f';
});

// ===== 连续字节进位边界 =====

test('writeBigUInt64BE - 进位边界 0xFF (255n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(255n, 0);
  return buf.toString('hex') === '00000000000000ff';
});

test('writeBigUInt64BE - 进位边界 0x100 (256n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(256n, 0);
  return buf.toString('hex') === '0000000000000100';
});

test('writeBigUInt64BE - 进位边界 0xFFFF (65535n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(65535n, 0);
  return buf.toString('hex') === '000000000000ffff';
});

test('writeBigUInt64BE - 进位边界 0x10000 (65536n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(65536n, 0);
  return buf.toString('hex') === '0000000000010000';
});

test('writeBigUInt64BE - 进位边界 0xFFFFFF (16777215n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(16777215n, 0);
  return buf.toString('hex') === '0000000000ffffff';
});

test('writeBigUInt64BE - 进位边界 0x1000000 (16777216n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(16777216n, 0);
  return buf.toString('hex') === '0000000001000000';
});

test('writeBigUInt64BE - 进位边界 0xFFFFFFFF (4294967295n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(4294967295n, 0);
  return buf.toString('hex') === '00000000ffffffff';
});

test('writeBigUInt64BE - 进位边界 0x100000000 (4294967296n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(4294967296n, 0);
  return buf.toString('hex') === '0000000100000000';
});

test('writeBigUInt64LE - 进位边界 0xFF (255n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(255n, 0);
  return buf.toString('hex') === 'ff00000000000000';
});

test('writeBigUInt64LE - 进位边界 0x100 (256n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(256n, 0);
  return buf.toString('hex') === '0001000000000000';
});

// ===== 重叠写入测试 =====

test('writeBigUInt64BE - 重叠写入 offset=0 和 offset=4', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0x1111111111111111n, 0);
  buf.writeBigUInt64BE(0x2222222222222222n, 4);
  return buf.slice(0, 4).toString('hex') === '11111111' &&
         buf.slice(4, 12).toString('hex') === '2222222222222222';
});

test('writeBigUInt64LE - 重叠写入 offset=0 和 offset=4', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0x1111111111111111n, 0);
  buf.writeBigUInt64LE(0x2222222222222222n, 4);
  return buf.slice(0, 4).toString('hex') === '11111111' &&
         buf.slice(4, 12).toString('hex') === '2222222222222222';
});

test('writeBigUInt64BE - 重叠写入 offset=0 和 offset=2', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0xAAAAAAAAAAAAAAAAn, 0);
  buf.writeBigUInt64BE(0xBBBBBBBBBBBBBBBBn, 2);
  return buf.slice(0, 2).toString('hex') === 'aaaa' &&
         buf.slice(2, 10).toString('hex') === 'bbbbbbbbbbbbbbbb';
});

test('writeBigUInt64LE - 重叠写入 offset=0 和 offset=2', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0xAAAAAAAAAAAAAAAAn, 0);
  buf.writeBigUInt64LE(0xBBBBBBBBBBBBBBBBn, 2);
  return buf.slice(0, 2).toString('hex') === 'aaaa' &&
         buf.slice(2, 10).toString('hex') === 'bbbbbbbbbbbbbbbb';
});

// ===== 素数边界值 =====

const primes = [2n, 3n, 5n, 7n, 11n, 13n, 251n, 257n, 65521n, 65537n];

primes.forEach((p, idx) => {
  test(`writeBigUInt64BE - 素数 ${p}n`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(p, 0);
    const readBack = buf.readBigUInt64BE(0);
    return readBack === p;
  });

  test(`writeBigUInt64LE - 素数 ${p}n`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(p, 0);
    const readBack = buf.readBigUInt64LE(0);
    return readBack === p;
  });
});

// ===== 交替字节模式 =====

test('writeBigUInt64BE - 交替模式 0x00FF00FF00FF00FFn', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x00FF00FF00FF00FFn, 0);
  return buf[0] === 0x00 && buf[1] === 0xFF && buf[2] === 0x00 && buf[3] === 0xFF &&
         buf[4] === 0x00 && buf[5] === 0xFF && buf[6] === 0x00 && buf[7] === 0xFF;
});

test('writeBigUInt64LE - 交替模式 0x00FF00FF00FF00FFn', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x00FF00FF00FF00FFn, 0);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0xFF && buf[3] === 0x00 &&
         buf[4] === 0xFF && buf[5] === 0x00 && buf[6] === 0xFF && buf[7] === 0x00;
});

test('writeBigUInt64BE - 交替模式 0xFF00FF00FF00FF00n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0xFF00FF00FF00FF00n, 0);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0xFF && buf[3] === 0x00 &&
         buf[4] === 0xFF && buf[5] === 0x00 && buf[6] === 0xFF && buf[7] === 0x00;
});

test('writeBigUInt64LE - 交替模式 0xFF00FF00FF00FF00n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0xFF00FF00FF00FF00n, 0);
  return buf[0] === 0x00 && buf[1] === 0xFF && buf[2] === 0x00 && buf[3] === 0xFF &&
         buf[4] === 0x00 && buf[5] === 0xFF && buf[6] === 0x00 && buf[7] === 0xFF;
});

test('writeBigUInt64BE - 递增模式 0x0102030405060708n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x0102030405060708n, 0);
  return buf[0] === 0x01 && buf[1] === 0x02 && buf[2] === 0x03 && buf[3] === 0x04 &&
         buf[4] === 0x05 && buf[5] === 0x06 && buf[6] === 0x07 && buf[7] === 0x08;
});

test('writeBigUInt64LE - 递增模式 0x0102030405060708n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0102030405060708n, 0);
  return buf[0] === 0x08 && buf[1] === 0x07 && buf[2] === 0x06 && buf[3] === 0x05 &&
         buf[4] === 0x04 && buf[5] === 0x03 && buf[6] === 0x02 && buf[7] === 0x01;
});

test('writeBigUInt64BE - 递减模式 0x0807060504030201n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x0807060504030201n, 0);
  return buf[0] === 0x08 && buf[1] === 0x07 && buf[2] === 0x06 && buf[3] === 0x05 &&
         buf[4] === 0x04 && buf[5] === 0x03 && buf[6] === 0x02 && buf[7] === 0x01;
});

test('writeBigUInt64LE - 递减模式 0x0807060504030201n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0807060504030201n, 0);
  return buf[0] === 0x01 && buf[1] === 0x02 && buf[2] === 0x03 && buf[3] === 0x04 &&
         buf[4] === 0x05 && buf[5] === 0x06 && buf[6] === 0x07 && buf[7] === 0x08;
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
