// buf.readBigUInt64LE() - offset 参数类型强制转换测试
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

// offset 对象有 valueOf 方法
test('offset 对象有 valueOf 返回 0', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(100n, 0);
    const obj = { valueOf: () => 0 };
    const result = buf.readBigUInt64LE(obj);
    return result === 100n;
  } catch (e) {
    // 某些实现可能抛出 TypeError
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 对象有 valueOf 返回非整数', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = { valueOf: () => 0.5 };
    buf.readBigUInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 对象有 valueOf 返回负数', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = { valueOf: () => -1 };
    buf.readBigUInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 对象有 valueOf 返回超出范围', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = { valueOf: () => 100 };
    buf.readBigUInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// offset 对象有 toString 方法
test('offset 对象有 toString 返回数字字符串', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = { toString: () => '0' };
    buf.readBigUInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 数字包装对象
test('offset = new Number(0)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(123n, 0);
    const result = buf.readBigUInt64LE(new Number(0));
    return result === 123n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = new Number(0.5)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(new Number(0.5));
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 空对象
test('offset = {} (空对象)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE({});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 函数作为 offset
test('offset = function', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(() => 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Symbol 作为 offset
test('offset = Symbol()', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// BigInt 作为 offset
test('offset = 0n (BigInt)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(0n);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
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
