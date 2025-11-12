// buf.writeBigInt64BE/LE - Basic Functionality Tests
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

// 基本写入功能 - Big Endian
test('writeBigInt64BE - 基本写入正整数', () => {
  const buf = Buffer.allocUnsafe(8);
  const offset = buf.writeBigInt64BE(0x0102030405060708n, 0);
  if (offset !== 8) return false;
  if (buf[0] !== 0x01) return false;
  if (buf[1] !== 0x02) return false;
  if (buf[7] !== 0x08) return false;
  return true;
});

test('writeBigInt64BE - 写入零', () => {
  const buf = Buffer.allocUnsafe(8);
  const offset = buf.writeBigInt64BE(0n, 0);
  if (offset !== 8) return false;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('writeBigInt64BE - 写入负数', () => {
  const buf = Buffer.allocUnsafe(8);
  const offset = buf.writeBigInt64BE(-1n, 0);
  if (offset !== 8) return false;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0xFF) return false;
  }
  return true;
});

test('writeBigInt64BE - 写入最大正数', () => {
  const buf = Buffer.allocUnsafe(8);
  const maxInt64 = 0x7FFFFFFFFFFFFFFFn;
  const offset = buf.writeBigInt64BE(maxInt64, 0);
  if (offset !== 8) return false;
  if (buf[0] !== 0x7F) return false;
  if (buf[7] !== 0xFF) return false;
  return true;
});

test('writeBigInt64BE - 写入最小负数', () => {
  const buf = Buffer.allocUnsafe(8);
  const minInt64 = -0x8000000000000000n;
  const offset = buf.writeBigInt64BE(minInt64, 0);
  if (offset !== 8) return false;
  if (buf[0] !== 0x80) return false;
  for (let i = 1; i < 8; i++) {
    if (buf[i] !== 0x00) return false;
  }
  return true;
});

// 基本写入功能 - Little Endian
test('writeBigInt64LE - 基本写入正整数', () => {
  const buf = Buffer.allocUnsafe(8);
  const offset = buf.writeBigInt64LE(0x0102030405060708n, 0);
  if (offset !== 8) return false;
  if (buf[0] !== 0x08) return false;
  if (buf[1] !== 0x07) return false;
  if (buf[7] !== 0x01) return false;
  return true;
});

test('writeBigInt64LE - 写入零', () => {
  const buf = Buffer.allocUnsafe(8);
  const offset = buf.writeBigInt64LE(0n, 0);
  if (offset !== 8) return false;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('writeBigInt64LE - 写入负数', () => {
  const buf = Buffer.allocUnsafe(8);
  const offset = buf.writeBigInt64LE(-1n, 0);
  if (offset !== 8) return false;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0xFF) return false;
  }
  return true;
});

test('writeBigInt64LE - 写入最大正数', () => {
  const buf = Buffer.allocUnsafe(8);
  const maxInt64 = 0x7FFFFFFFFFFFFFFFn;
  const offset = buf.writeBigInt64LE(maxInt64, 0);
  if (offset !== 8) return false;
  if (buf[0] !== 0xFF) return false;
  if (buf[7] !== 0x7F) return false;
  return true;
});

test('writeBigInt64LE - 写入最小负数', () => {
  const buf = Buffer.allocUnsafe(8);
  const minInt64 = -0x8000000000000000n;
  const offset = buf.writeBigInt64LE(minInt64, 0);
  if (offset !== 8) return false;
  if (buf[7] !== 0x80) return false;
  for (let i = 0; i < 7; i++) {
    if (buf[i] !== 0x00) return false;
  }
  return true;
});

// 不同 offset 位置写入
test('writeBigInt64BE - offset = 0', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(0x1122334455667788n, 0);
  if (buf[0] !== 0x11) return false;
  if (buf[7] !== 0x88) return false;
  if (buf[8] !== 0x00) return false;
  return true;
});

test('writeBigInt64BE - offset = 8', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(0x1122334455667788n, 8);
  if (buf[0] !== 0x00) return false;
  if (buf[8] !== 0x11) return false;
  if (buf[15] !== 0x88) return false;
  return true;
});

test('writeBigInt64BE - offset = 1', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(0x1122334455667788n, 1);
  if (buf[0] !== 0x00) return false;
  if (buf[1] !== 0x11) return false;
  if (buf[8] !== 0x88) return false;
  if (buf[9] !== 0x00) return false;
  return true;
});

test('writeBigInt64LE - offset = 0', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(0x1122334455667788n, 0);
  if (buf[0] !== 0x88) return false;
  if (buf[7] !== 0x11) return false;
  if (buf[8] !== 0x00) return false;
  return true;
});

test('writeBigInt64LE - offset = 8', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(0x1122334455667788n, 8);
  if (buf[0] !== 0x00) return false;
  if (buf[8] !== 0x88) return false;
  if (buf[15] !== 0x11) return false;
  return true;
});

test('writeBigInt64LE - offset = 1', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(0x1122334455667788n, 1);
  if (buf[0] !== 0x00) return false;
  if (buf[1] !== 0x88) return false;
  if (buf[8] !== 0x11) return false;
  if (buf[9] !== 0x00) return false;
  return true;
});

// 多次写入覆盖
test('writeBigInt64BE - 多次写入同一位置', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x1111111111111111n, 0);
  buf.writeBigInt64BE(0x2222222222222222n, 0);
  if (buf[0] !== 0x22) return false;
  if (buf[7] !== 0x22) return false;
  return true;
});

test('writeBigInt64LE - 多次写入同一位置', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x1111111111111111n, 0);
  buf.writeBigInt64LE(0x2222222222222222n, 0);
  if (buf[0] !== 0x22) return false;
  if (buf[7] !== 0x22) return false;
  return true;
});

// 返回值验证
test('writeBigInt64BE - 返回值为 offset + 8', () => {
  const buf = Buffer.alloc(16);
  if (buf.writeBigInt64BE(123n, 0) !== 8) return false;
  if (buf.writeBigInt64BE(456n, 5) !== 13) return false;
  if (buf.writeBigInt64BE(789n, 8) !== 16) return false;
  return true;
});

test('writeBigInt64LE - 返回值为 offset + 8', () => {
  const buf = Buffer.alloc(16);
  if (buf.writeBigInt64LE(123n, 0) !== 8) return false;
  if (buf.writeBigInt64LE(456n, 5) !== 13) return false;
  if (buf.writeBigInt64LE(789n, 8) !== 16) return false;
  return true;
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
