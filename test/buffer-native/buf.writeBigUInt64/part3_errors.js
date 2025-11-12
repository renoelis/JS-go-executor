// buf.writeBigUInt64BE/LE - 第1轮：错误路径测试
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

// ===== value 参数类型错误 =====

test('writeBigUInt64BE - value 不是 BigInt（number）应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(123, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigUInt64LE - value 不是 BigInt（number）应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(123, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigUInt64BE - value 是 string 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE('123', 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigUInt64LE - value 是 string 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE('123', 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigUInt64BE - value 是 undefined 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(undefined, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigUInt64LE - value 是 undefined 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(undefined, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigUInt64BE - value 是 null 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(null, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigUInt64LE - value 是 null 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(null, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigUInt64BE - value 是对象应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE({}, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigUInt64LE - value 是对象应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE({}, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

// ===== value 范围错误 =====

test('writeBigUInt64BE - value < 0（负数）应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(-1n, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
  }
});

test('writeBigUInt64LE - value < 0（负数）应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(-1n, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
  }
});

test('writeBigUInt64BE - value > 2^64-1 应抛错', () => {
  const buf = Buffer.alloc(8);
  const overflowVal = 18446744073709551616n; // 2n**64n
  try {
    buf.writeBigUInt64BE(overflowVal, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
  }
});

test('writeBigUInt64LE - value > 2^64-1 应抛错', () => {
  const buf = Buffer.alloc(8);
  const overflowVal = 18446744073709551616n;
  try {
    buf.writeBigUInt64LE(overflowVal, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
  }
});

test('writeBigUInt64BE - value 远大于 2^64 应抛错', () => {
  const buf = Buffer.alloc(8);
  const hugeVal = 99999999999999999999999999999n;
  try {
    buf.writeBigUInt64BE(hugeVal, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
  }
});

test('writeBigUInt64LE - value 远大于 2^64 应抛错', () => {
  const buf = Buffer.alloc(8);
  const hugeVal = 99999999999999999999999999999n;
  try {
    buf.writeBigUInt64LE(hugeVal, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
  }
});

// ===== offset 越界错误 =====

test('writeBigUInt64BE - offset 负数应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, -1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

test('writeBigUInt64LE - offset 负数应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, -1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

test('writeBigUInt64BE - offset > buf.length-8 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigUInt64LE - offset > buf.length-8 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigUInt64BE - offset=buf.length 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, 8);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigUInt64LE - offset=buf.length 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, 8);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigUInt64BE - offset 远大于 buf.length 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, 100);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigUInt64LE - offset 远大于 buf.length 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, 100);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

// ===== offset 类型错误 =====

test('writeBigUInt64BE - offset 不是整数（小数）应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, 1.5);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('offset');
  }
});

test('writeBigUInt64LE - offset 不是整数（小数）应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, 1.5);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('offset');
  }
});

test('writeBigUInt64BE - offset 是 NaN 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, NaN);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - offset 是 NaN 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, NaN);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64BE - offset 是 Infinity 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, Infinity);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - offset 是 Infinity 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, Infinity);
    return false;
  } catch (e) {
    return true;
  }
});

// ===== buffer 长度不足 =====

test('writeBigUInt64BE - buffer 长度 < 8 且 offset=0 应抛错', () => {
  const buf = Buffer.alloc(7);
  try {
    buf.writeBigUInt64BE(0n, 0);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigUInt64LE - buffer 长度 < 8 且 offset=0 应抛错', () => {
  const buf = Buffer.alloc(7);
  try {
    buf.writeBigUInt64LE(0n, 0);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigUInt64BE - buffer 长度为 0 应抛错', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeBigUInt64BE(0n, 0);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigUInt64LE - buffer 长度为 0 应抛错', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeBigUInt64LE(0n, 0);
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
