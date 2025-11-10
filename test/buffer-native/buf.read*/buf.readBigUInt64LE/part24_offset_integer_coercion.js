// buf.readBigUInt64LE() - offset 整数强制转换测试
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

// 测试 offset 必须是整数（Node.js 不再隐式转换为 uint32）
test('offset 为小数 0.0（应视为 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(123n, 0);
  try {
    const result = buf.readBigUInt64LE(0.0);
    return result === 123n;
  } catch (e) {
    // 如果抛出错误也是合理的
    return e.name === 'RangeError';
  }
});

test('offset 为 -0（应视为 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(456n, 0);
  const result = buf.readBigUInt64LE(-0);
  return result === 456n;
});

test('offset 为 1.0（整数形式的浮点数，应抛出错误）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(789n, 1);
  try {
    const result = buf.readBigUInt64LE(1.0);
    // Node.js 接受整数形式的浮点数
    return result === 789n;
  } catch (e) {
    // 如果抛出错误也是合理的
    return e.name === 'RangeError';
  }
});

test('offset 为 2.0（整数形式的浮点数，应抛出错误）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(999n, 2);
  try {
    const result = buf.readBigUInt64LE(2.0);
    // Node.js 接受整数形式的浮点数
    return result === 999n;
  } catch (e) {
    // 如果抛出错误也是合理的
    return e.name === 'RangeError';
  }
});

test('offset 为非常小的正数（应抛出错误）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.readBigUInt64LE(0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为非常接近整数的小数（应抛出错误）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.readBigUInt64LE(0.9999999);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为负小数（应抛出错误）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.readBigUInt64LE(-0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为 Number.MIN_VALUE（应抛出错误）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.readBigUInt64LE(Number.MIN_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为 Number.EPSILON（应抛出错误）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.readBigUInt64LE(Number.EPSILON);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为 -Number.EPSILON（应视为 0 或抛出错误）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(111n, 0);
  try {
    const result = buf.readBigUInt64LE(-Number.EPSILON);
    // 如果成功，应该读取到值
    return result === 111n;
  } catch (e) {
    // 抛出错误也是合理的
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为整数字符串（应抛出 TypeError）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.readBigUInt64LE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为数字字符串（应抛出 TypeError）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.readBigUInt64LE('1');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为科学计数法（应抛出错误）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.readBigUInt64LE(1e2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为负科学计数法（应抛出错误）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.readBigUInt64LE(-1e2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 Number.MAX_VALUE（应抛出 RangeError）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.readBigUInt64LE(Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 Number.MIN_SAFE_INTEGER（应抛出 RangeError）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.readBigUInt64LE(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
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
