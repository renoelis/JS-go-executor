// buf.readBigUInt64LE() - 特殊 offset 值测试
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

// -0 测试
test('offset = -0（应等同于 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(123n, 0);
  return buf.readBigUInt64LE(-0) === 123n;
});

test('offset = +0（应等同于 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(456n, 0);
  return buf.readBigUInt64LE(+0) === 456n;
});

test('offset = 0.0（应等同于 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(789n, 0);
  return buf.readBigUInt64LE(0.0) === 789n;
});

// 科学计数法
test('offset = 0e0（应等同于 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(111n, 0);
  return buf.readBigUInt64LE(0e0) === 111n;
});

test('offset = 8e0（应等同于 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(222n, 8);
  return buf.readBigUInt64LE(8e0) === 222n;
});

test('offset = 1e1（应等同于 10，可能越界）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(1e1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1e-1（0.1，应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(1e-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 极小值
test('offset = Number.MIN_VALUE（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(Number.MIN_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = Number.EPSILON（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(Number.EPSILON);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 整数边界
test('offset = Number.MAX_VALUE（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.MIN_SAFE_INTEGER（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 十六进制和八进制
test('offset = 0x0（应等同于 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(333n, 0);
  return buf.readBigUInt64LE(0x0) === 333n;
});

test('offset = 0x8（应等同于 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(444n, 8);
  return buf.readBigUInt64LE(0x8) === 444n;
});

test('offset = 0o10（应等同于 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(555n, 8);
  return buf.readBigUInt64LE(0o10) === 555n;
});

test('offset = 0b1000（应等同于 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(666n, 8);
  return buf.readBigUInt64LE(0b1000) === 666n;
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
