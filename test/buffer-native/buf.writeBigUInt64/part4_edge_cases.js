// buf.writeBigUInt64BE/LE - 第1轮：边界值与特殊输入测试
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

// ===== BigInt 边界值 =====

test('writeBigUInt64BE - 写入 2^32-1', () => {
  const buf = Buffer.alloc(8);
  const val = 4294967295n; // 2n**32n - 1n
  const result = buf.writeBigUInt64BE(val, 0);
  return result === 8 &&
         buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0xFF && buf[5] === 0xFF && buf[6] === 0xFF && buf[7] === 0xFF;
});

test('writeBigUInt64LE - 写入 2^32-1', () => {
  const buf = Buffer.alloc(8);
  const val = 4294967295n;
  const result = buf.writeBigUInt64LE(val, 0);
  return result === 8 &&
         buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUInt64BE - 写入 2^32', () => {
  const buf = Buffer.alloc(8);
  const val = 4294967296n; // 2n**32n
  const result = buf.writeBigUInt64BE(val, 0);
  return result === 8 &&
         buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x01 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUInt64LE - 写入 2^32', () => {
  const buf = Buffer.alloc(8);
  const val = 4294967296n;
  const result = buf.writeBigUInt64LE(val, 0);
  return result === 8 &&
         buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x01 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUInt64BE - 写入 2^63-1', () => {
  const buf = Buffer.alloc(8);
  const val = 9223372036854775807n; // 2n**63n - 1n
  const result = buf.writeBigUInt64BE(val, 0);
  return result === 8 &&
         buf[0] === 0x7F && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF &&
         buf[4] === 0xFF && buf[5] === 0xFF && buf[6] === 0xFF && buf[7] === 0xFF;
});

test('writeBigUInt64LE - 写入 2^63-1', () => {
  const buf = Buffer.alloc(8);
  const val = 9223372036854775807n;
  const result = buf.writeBigUInt64LE(val, 0);
  return result === 8 &&
         buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF &&
         buf[4] === 0xFF && buf[5] === 0xFF && buf[6] === 0xFF && buf[7] === 0x7F;
});

test('writeBigUInt64BE - 写入 2^63', () => {
  const buf = Buffer.alloc(8);
  const val = 9223372036854775808n; // 2n**63n
  const result = buf.writeBigUInt64BE(val, 0);
  return result === 8 &&
         buf[0] === 0x80 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUInt64LE - 写入 2^63', () => {
  const buf = Buffer.alloc(8);
  const val = 9223372036854775808n;
  const result = buf.writeBigUInt64LE(val, 0);
  return result === 8 &&
         buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x80;
});

test('writeBigUInt64BE - 写入 2^64-2（次最大值）', () => {
  const buf = Buffer.alloc(8);
  const val = 18446744073709551614n; // 2n**64n - 2n
  const result = buf.writeBigUInt64BE(val, 0);
  return result === 8 &&
         buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF &&
         buf[4] === 0xFF && buf[5] === 0xFF && buf[6] === 0xFF && buf[7] === 0xFE;
});

test('writeBigUInt64LE - 写入 2^64-2（次最大值）', () => {
  const buf = Buffer.alloc(8);
  const val = 18446744073709551614n;
  const result = buf.writeBigUInt64LE(val, 0);
  return result === 8 &&
         buf[0] === 0xFE && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF &&
         buf[4] === 0xFF && buf[5] === 0xFF && buf[6] === 0xFF && buf[7] === 0xFF;
});

// ===== 覆盖已有数据 =====

test('writeBigUInt64BE - 覆盖已有数据', () => {
  const buf = Buffer.alloc(8, 0xAA);
  buf.writeBigUInt64BE(0x1122334455667788n, 0);
  return buf[0] === 0x11 && buf[1] === 0x22 && buf[2] === 0x33 && buf[3] === 0x44 &&
         buf[4] === 0x55 && buf[5] === 0x66 && buf[6] === 0x77 && buf[7] === 0x88;
});

test('writeBigUInt64LE - 覆盖已有数据', () => {
  const buf = Buffer.alloc(8, 0xAA);
  buf.writeBigUInt64LE(0x1122334455667788n, 0);
  return buf[0] === 0x88 && buf[1] === 0x77 && buf[2] === 0x66 && buf[3] === 0x55 &&
         buf[4] === 0x44 && buf[5] === 0x33 && buf[6] === 0x22 && buf[7] === 0x11;
});

test('writeBigUInt64BE - 部分覆盖（中间位置）', () => {
  const buf = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB]);
  buf.writeBigUInt64BE(0xFFEEDDCCBBAA9988n, 2);
  return buf[0] === 0x00 && buf[1] === 0x11 &&
         buf[2] === 0xFF && buf[3] === 0xEE && buf[4] === 0xDD && buf[5] === 0xCC &&
         buf[6] === 0xBB && buf[7] === 0xAA && buf[8] === 0x99 && buf[9] === 0x88 &&
         buf[10] === 0xAA && buf[11] === 0xBB;
});

test('writeBigUInt64LE - 部分覆盖（中间位置）', () => {
  const buf = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB]);
  buf.writeBigUInt64LE(0xFFEEDDCCBBAA9988n, 2);
  return buf[0] === 0x00 && buf[1] === 0x11 &&
         buf[2] === 0x88 && buf[3] === 0x99 && buf[4] === 0xAA && buf[5] === 0xBB &&
         buf[6] === 0xCC && buf[7] === 0xDD && buf[8] === 0xEE && buf[9] === 0xFF &&
         buf[10] === 0xAA && buf[11] === 0xBB;
});

// ===== 重复写入同一位置 =====

test('writeBigUInt64BE - 重复写入同一位置', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x1111111111111111n, 0);
  buf.writeBigUInt64BE(0x2222222222222222n, 0);
  return buf[0] === 0x22 && buf[7] === 0x22;
});

test('writeBigUInt64LE - 重复写入同一位置', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x1111111111111111n, 0);
  buf.writeBigUInt64LE(0x2222222222222222n, 0);
  return buf[0] === 0x22 && buf[7] === 0x22;
});

// ===== 交错写入 BE 和 LE =====

test('writeBigUInt64 - BE 写入后 LE 覆盖', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x1122334455667788n, 0);
  buf.writeBigUInt64LE(0x1122334455667788n, 0);
  return buf[0] === 0x88 && buf[1] === 0x77 && buf[2] === 0x66 && buf[3] === 0x55 &&
         buf[4] === 0x44 && buf[5] === 0x33 && buf[6] === 0x22 && buf[7] === 0x11;
});

test('writeBigUInt64 - LE 写入后 BE 覆盖', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x1122334455667788n, 0);
  buf.writeBigUInt64BE(0x1122334455667788n, 0);
  return buf[0] === 0x11 && buf[1] === 0x22 && buf[2] === 0x33 && buf[3] === 0x44 &&
         buf[4] === 0x55 && buf[5] === 0x66 && buf[6] === 0x77 && buf[7] === 0x88;
});

// ===== 多种 Buffer 类型 =====

test('writeBigUInt64BE - 在 Buffer.allocUnsafe 创建的 buffer 上写入', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeBigUInt64BE(0xAABBCCDDEEFF0011n, 0);
  return result === 8 &&
         buf[0] === 0xAA && buf[1] === 0xBB && buf[2] === 0xCC && buf[3] === 0xDD &&
         buf[4] === 0xEE && buf[5] === 0xFF && buf[6] === 0x00 && buf[7] === 0x11;
});

test('writeBigUInt64LE - 在 Buffer.allocUnsafe 创建的 buffer 上写入', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeBigUInt64LE(0xAABBCCDDEEFF0011n, 0);
  return result === 8 &&
         buf[0] === 0x11 && buf[1] === 0x00 && buf[2] === 0xFF && buf[3] === 0xEE &&
         buf[4] === 0xDD && buf[5] === 0xCC && buf[6] === 0xBB && buf[7] === 0xAA;
});

test('writeBigUInt64BE - 在 Buffer.from 创建的 buffer 上写入', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
  const result = buf.writeBigUInt64BE(0x0102030405060708n, 0);
  return result === 8 &&
         buf[0] === 0x01 && buf[1] === 0x02 && buf[2] === 0x03 && buf[3] === 0x04 &&
         buf[4] === 0x05 && buf[5] === 0x06 && buf[6] === 0x07 && buf[7] === 0x08;
});

test('writeBigUInt64LE - 在 Buffer.from 创建的 buffer 上写入', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
  const result = buf.writeBigUInt64LE(0x0102030405060708n, 0);
  return result === 8 &&
         buf[0] === 0x08 && buf[1] === 0x07 && buf[2] === 0x06 && buf[3] === 0x05 &&
         buf[4] === 0x04 && buf[5] === 0x03 && buf[6] === 0x02 && buf[7] === 0x01;
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
