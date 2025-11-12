// buf.writeBigUInt64BE/LE - 第4轮：组合场景与特殊输入补充
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

// ===== 2 的幂次边界值补充 =====

test('writeBigUInt64BE - 写入 2^8-1 (255n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(255n, 0);
  return buf.toString('hex') === '00000000000000ff';
});

test('writeBigUInt64LE - 写入 2^8-1 (255n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(255n, 0);
  return buf.toString('hex') === 'ff00000000000000';
});

test('writeBigUInt64BE - 写入 2^8 (256n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(256n, 0);
  return buf.toString('hex') === '0000000000000100';
});

test('writeBigUInt64LE - 写入 2^8 (256n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(256n, 0);
  return buf.toString('hex') === '0001000000000000';
});

test('writeBigUInt64BE - 写入 2^24-1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(16777215n, 0);
  return buf.toString('hex') === '0000000000ffffff';
});

test('writeBigUInt64LE - 写入 2^24-1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(16777215n, 0);
  return buf.toString('hex') === 'ffffff0000000000';
});

test('writeBigUInt64BE - 写入 2^40-1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(1099511627775n, 0);
  return buf.toString('hex') === '000000ffffffffff';
});

test('writeBigUInt64LE - 写入 2^40-1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(1099511627775n, 0);
  return buf.toString('hex') === 'ffffffffff000000';
});

test('writeBigUInt64BE - 写入 2^48-1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(281474976710655n, 0);
  return buf.toString('hex') === '0000ffffffffffff';
});

test('writeBigUInt64LE - 写入 2^48-1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(281474976710655n, 0);
  return buf.toString('hex') === 'ffffffffffff0000';
});

test('writeBigUInt64BE - 写入 2^56-1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(72057594037927935n, 0);
  return buf.toString('hex') === '00ffffffffffffff';
});

test('writeBigUInt64LE - 写入 2^56-1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(72057594037927935n, 0);
  return buf.toString('hex') === 'ffffffffffffff00';
});

// ===== 所有字节位模式 =====

test('writeBigUInt64BE - 写入交替位模式 0xAA55AA55AA55AA55n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0xAA55AA55AA55AA55n, 0);
  return buf.toString('hex') === 'aa55aa55aa55aa55';
});

test('writeBigUInt64LE - 写入交替位模式 0xAA55AA55AA55AA55n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0xAA55AA55AA55AA55n, 0);
  return buf.toString('hex') === '55aa55aa55aa55aa';
});

test('writeBigUInt64BE - 写入递增模式 0x0123456789ABCDEFn', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x0123456789ABCDEFn, 0);
  return buf.toString('hex') === '0123456789abcdef';
});

test('writeBigUInt64LE - 写入递增模式 0x0123456789ABCDEFn', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0123456789ABCDEFn, 0);
  return buf.toString('hex') === 'efcdab8967452301';
});

// ===== offset 与 value 的各种组合 =====

test('writeBigUInt64BE - offset=0, value=0n', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0n, 0);
  return result === 8 && buf.toString('hex') === '0000000000000000';
});

test('writeBigUInt64LE - offset=0, value=0n', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0n, 0);
  return result === 8 && buf.toString('hex') === '0000000000000000';
});

test('writeBigUInt64BE - offset=0, value=max', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(18446744073709551615n, 0);
  return result === 8 && buf.toString('hex') === 'ffffffffffffffff';
});

test('writeBigUInt64LE - offset=0, value=max', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(18446744073709551615n, 0);
  return result === 8 && buf.toString('hex') === 'ffffffffffffffff';
});

// ===== 从 Buffer.allocUnsafe 创建并覆盖 =====

test('writeBigUInt64BE - 完全覆盖 allocUnsafe buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigUInt64BE(0xFEDCBA9876543210n, 0);
  return buf.toString('hex') === 'fedcba9876543210';
});

test('writeBigUInt64LE - 完全覆盖 allocUnsafe buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigUInt64LE(0xFEDCBA9876543210n, 0);
  return buf.toString('hex') === '1032547698badcfe';
});

// ===== 读回验证（与 readBigUInt64 配合） =====

test('writeBigUInt64BE - 写入后读回相同值', () => {
  const buf = Buffer.alloc(8);
  const original = 0x123456789ABCDEFn;
  buf.writeBigUInt64BE(original, 0);
  const readBack = buf.readBigUInt64BE(0);
  return readBack === original;
});

test('writeBigUInt64LE - 写入后读回相同值', () => {
  const buf = Buffer.alloc(8);
  const original = 0x123456789ABCDEFn;
  buf.writeBigUInt64LE(original, 0);
  const readBack = buf.readBigUInt64LE(0);
  return readBack === original;
});

test('writeBigUInt64BE - 写入最大值后读回', () => {
  const buf = Buffer.alloc(8);
  const maxVal = 18446744073709551615n;
  buf.writeBigUInt64BE(maxVal, 0);
  const readBack = buf.readBigUInt64BE(0);
  return readBack === maxVal;
});

test('writeBigUInt64LE - 写入最大值后读回', () => {
  const buf = Buffer.alloc(8);
  const maxVal = 18446744073709551615n;
  buf.writeBigUInt64LE(maxVal, 0);
  const readBack = buf.readBigUInt64LE(0);
  return readBack === maxVal;
});

test('writeBigUInt64BE - 写入 0 后读回', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0n, 0);
  const readBack = buf.readBigUInt64BE(0);
  return readBack === 0n;
});

test('writeBigUInt64LE - 写入 0 后读回', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0n, 0);
  const readBack = buf.readBigUInt64LE(0);
  return readBack === 0n;
});

// ===== 多次写入同一 buffer =====

test('writeBigUInt64BE - 同一 buffer 多次写入不同值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x1111111111111111n, 0);
  buf.writeBigUInt64BE(0x2222222222222222n, 0);
  buf.writeBigUInt64BE(0x3333333333333333n, 0);
  return buf.toString('hex') === '3333333333333333';
});

test('writeBigUInt64LE - 同一 buffer 多次写入不同值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x1111111111111111n, 0);
  buf.writeBigUInt64LE(0x2222222222222222n, 0);
  buf.writeBigUInt64LE(0x3333333333333333n, 0);
  return buf.toString('hex') === '3333333333333333';
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
