// buf.writeBigUInt64BE/LE - 别名测试
// 测试 writeBigUint64BE 和 writeBigUint64LE（小写 u）别名
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

// ===== 别名存在性测试 =====

test('writeBigUint64BE 别名存在', () => {
  return typeof Buffer.prototype.writeBigUint64BE === 'function';
});

test('writeBigUint64LE 别名存在', () => {
  return typeof Buffer.prototype.writeBigUint64LE === 'function';
});

test('writeBigUint64BE 和 writeBigUInt64BE 是同一个函数', () => {
  return Buffer.prototype.writeBigUint64BE === Buffer.prototype.writeBigUInt64BE;
});

test('writeBigUint64LE 和 writeBigUInt64LE 是同一个函数', () => {
  return Buffer.prototype.writeBigUint64LE === Buffer.prototype.writeBigUInt64LE;
});

// ===== 别名功能测试 =====

test('writeBigUint64BE - 写入 0n', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUint64BE(0n, 0);
  return result === 8 &&
         buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUint64LE - 写入 0n', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUint64LE(0n, 0);
  return result === 8 &&
         buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUint64BE - 写入最大值 2^64-1', () => {
  const buf = Buffer.alloc(8);
  const maxVal = 18446744073709551615n;
  const result = buf.writeBigUint64BE(maxVal, 0);
  return result === 8 &&
         buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF &&
         buf[4] === 0xFF && buf[5] === 0xFF && buf[6] === 0xFF && buf[7] === 0xFF;
});

test('writeBigUint64LE - 写入最大值 2^64-1', () => {
  const buf = Buffer.alloc(8);
  const maxVal = 18446744073709551615n;
  const result = buf.writeBigUint64LE(maxVal, 0);
  return result === 8 &&
         buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF &&
         buf[4] === 0xFF && buf[5] === 0xFF && buf[6] === 0xFF && buf[7] === 0xFF;
});

test('writeBigUint64BE - 写入 0x123456789ABCDEF0n', () => {
  const buf = Buffer.alloc(8);
  const val = 0x123456789ABCDEF0n;
  const result = buf.writeBigUint64BE(val, 0);
  return result === 8 &&
         buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78 &&
         buf[4] === 0x9A && buf[5] === 0xBC && buf[6] === 0xDE && buf[7] === 0xF0;
});

test('writeBigUint64LE - 写入 0x123456789ABCDEF0n', () => {
  const buf = Buffer.alloc(8);
  const val = 0x123456789ABCDEF0n;
  const result = buf.writeBigUint64LE(val, 0);
  return result === 8 &&
         buf[0] === 0xF0 && buf[1] === 0xDE && buf[2] === 0xBC && buf[3] === 0x9A &&
         buf[4] === 0x78 && buf[5] === 0x56 && buf[6] === 0x34 && buf[7] === 0x12;
});

test('writeBigUint64BE - 使用非零 offset', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeBigUint64BE(0xAABBCCDDEEFF0011n, 2);
  return result === 10 &&
         buf[0] === 0x00 && buf[1] === 0x00 &&
         buf[2] === 0xAA && buf[3] === 0xBB && buf[4] === 0xCC && buf[5] === 0xDD &&
         buf[6] === 0xEE && buf[7] === 0xFF && buf[8] === 0x00 && buf[9] === 0x11;
});

test('writeBigUint64LE - 使用非零 offset', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeBigUint64LE(0xAABBCCDDEEFF0011n, 2);
  return result === 10 &&
         buf[0] === 0x00 && buf[1] === 0x00 &&
         buf[2] === 0x11 && buf[3] === 0x00 && buf[4] === 0xFF && buf[5] === 0xEE &&
         buf[6] === 0xDD && buf[7] === 0xCC && buf[8] === 0xBB && buf[9] === 0xAA;
});

// ===== 别名错误处理 =====

test('writeBigUint64BE - 负值应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUint64BE(-1n, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
  }
});

test('writeBigUint64LE - 负值应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUint64LE(-1n, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
  }
});

test('writeBigUint64BE - 超出范围应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUint64BE(18446744073709551616n, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
  }
});

test('writeBigUint64LE - 超出范围应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUint64LE(18446744073709551616n, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
  }
});

test('writeBigUint64BE - 非 BigInt 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUint64BE(123, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigUint64LE - 非 BigInt 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUint64LE(123, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigUint64BE - offset 越界应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUint64BE(0n, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigUint64LE - offset 越界应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUint64LE(0n, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
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
