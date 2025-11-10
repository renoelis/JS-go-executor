// buf.readBigInt64LE() - 特殊情况测试
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

// 多参数测试
test('传入多余参数（应忽略）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  return buf.readBigInt64LE(0, 'extra', 123, {}) === 100n;
});

// 特殊类型作为 offset
test('offset = Symbol（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = Function（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(function() {});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = BigInt（应抛出错误或转换）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigInt64LE(100n, 0);
    // Node.js 可能会抛出错误或将 BigInt 转换为 Number
    const result = buf.readBigInt64LE(0n);
    return result === 100n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 小数 offset 详细测试
test('offset = 0.1（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 0.9（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(0.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1.5（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigInt64LE(1.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -0.5（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(-0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊数值
test('offset = Number.MIN_VALUE（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(Number.MIN_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.MAX_VALUE（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.EPSILON（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(Number.EPSILON);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 空字符串和特殊字符串
test('offset = 空字符串（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE('');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = "abc"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE('abc');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = "0x10"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE('0x10');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 正则表达式
test('offset = RegExp（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(/test/);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Date 对象
test('offset = Date（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(new Date());
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
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
