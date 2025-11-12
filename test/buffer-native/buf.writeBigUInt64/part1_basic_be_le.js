// buf.writeBigUInt64BE/LE - 第1轮：基本功能测试
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

// ===== 基本写入功能 =====

test('writeBigUInt64BE - 写入最小值 0n', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0n, 0);
  return result === 8 &&
         buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUInt64LE - 写入最小值 0n', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0n, 0);
  return result === 8 &&
         buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUInt64BE - 写入最大值 2^64-1', () => {
  const buf = Buffer.alloc(8);
  const maxVal = 18446744073709551615n; // 2n**64n - 1n
  const result = buf.writeBigUInt64BE(maxVal, 0);
  return result === 8 &&
         buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF &&
         buf[4] === 0xFF && buf[5] === 0xFF && buf[6] === 0xFF && buf[7] === 0xFF;
});

test('writeBigUInt64LE - 写入最大值 2^64-1', () => {
  const buf = Buffer.alloc(8);
  const maxVal = 18446744073709551615n;
  const result = buf.writeBigUInt64LE(maxVal, 0);
  return result === 8 &&
         buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF &&
         buf[4] === 0xFF && buf[5] === 0xFF && buf[6] === 0xFF && buf[7] === 0xFF;
});

test('writeBigUInt64BE - 写入中间值 0x123456789ABCDEF0n', () => {
  const buf = Buffer.alloc(8);
  const val = 0x123456789ABCDEF0n;
  const result = buf.writeBigUInt64BE(val, 0);
  return result === 8 &&
         buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78 &&
         buf[4] === 0x9A && buf[5] === 0xBC && buf[6] === 0xDE && buf[7] === 0xF0;
});

test('writeBigUInt64LE - 写入中间值 0x123456789ABCDEF0n', () => {
  const buf = Buffer.alloc(8);
  const val = 0x123456789ABCDEF0n;
  const result = buf.writeBigUInt64LE(val, 0);
  return result === 8 &&
         buf[0] === 0xF0 && buf[1] === 0xDE && buf[2] === 0xBC && buf[3] === 0x9A &&
         buf[4] === 0x78 && buf[5] === 0x56 && buf[6] === 0x34 && buf[7] === 0x12;
});

test('writeBigUInt64BE - 写入 1n', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(1n, 0);
  return result === 8 &&
         buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x01;
});

test('writeBigUInt64LE - 写入 1n', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(1n, 0);
  return result === 8 &&
         buf[0] === 0x01 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUInt64BE - 写入 256n', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(256n, 0);
  return result === 8 &&
         buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x01 && buf[7] === 0x00;
});

test('writeBigUInt64LE - 写入 256n', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(256n, 0);
  return result === 8 &&
         buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

// ===== 返回值验证 =====

test('writeBigUInt64BE - 返回值等于 offset + 8 (offset=0)', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(123n, 0);
  return result === 8;
});

test('writeBigUInt64LE - 返回值等于 offset + 8 (offset=0)', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(123n, 0);
  return result === 8;
});

test('writeBigUInt64BE - 返回值等于 offset + 8 (offset=2)', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeBigUInt64BE(456n, 2);
  return result === 10;
});

test('writeBigUInt64LE - 返回值等于 offset + 8 (offset=2)', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeBigUInt64LE(456n, 2);
  return result === 10;
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
