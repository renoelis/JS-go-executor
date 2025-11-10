// buf.readBigInt64LE() - Offset 参数完整验证
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

// offset 默认值测试
test('offset 默认值为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(12345n, 0);
  return buf.readBigInt64LE() === 12345n;
});

// offset 边界值测试
test('offset = buf.length - 8（最大有效值）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(99999n, 8);
  return buf.readBigInt64LE(8) === 99999n;
});

test('offset = buf.length - 7（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = buf.length（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(8);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = buf.length + 1（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 负数 offset
test('offset = -1（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -100（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(-100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// undefined/null offset
test('offset = undefined（应使用默认值 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(777n, 0);
  return buf.readBigInt64LE(undefined) === 777n;
});

test('offset = null（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(null);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 其他无效类型
test('offset = 对象（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE({});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = 数组（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE([0]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = 布尔值 true（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(true);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 布尔值 false（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(false);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 极大的 offset
test('offset = Number.MAX_SAFE_INTEGER（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = -Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
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
