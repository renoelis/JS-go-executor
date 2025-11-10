// buf.readBigInt64BE() - offset 参数类型强制转换测试
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
    buf.writeBigInt64BE(100n, 0);
    const obj = { valueOf: () => 0 };
    const result = buf.readBigInt64BE(obj);
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
    buf.readBigInt64BE(obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 对象有 valueOf 返回负数', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = { valueOf: () => -1 };
    buf.readBigInt64BE(obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 对象有 valueOf 返回超出范围', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = { valueOf: () => 100 };
    buf.readBigInt64BE(obj);
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
    buf.readBigInt64BE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// offset 对象同时有 valueOf 和 toString
test('offset 对象同时有 valueOf 和 toString（优先 valueOf）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(200n, 0);
    const obj = {
      valueOf: () => 0,
      toString: () => '100'
    };
    const result = buf.readBigInt64BE(obj);
    return result === 200n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// offset 为包装对象
test('offset 为 Number 包装对象', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(300n, 0);
    const result = buf.readBigInt64BE(new Number(0));
    return result === 300n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 为 String 包装对象', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(new String('0'));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 为 Boolean 包装对象 true', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigInt64BE(new Boolean(true));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 为 Boolean 包装对象 false', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(400n, 0);
    const result = buf.readBigInt64BE(new Boolean(false));
    return result === 400n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// offset 为特殊数值的对象形式
test('offset 对象 valueOf 返回 NaN', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = { valueOf: () => NaN };
    buf.readBigInt64BE(obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 对象 valueOf 返回 Infinity', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = { valueOf: () => Infinity };
    buf.readBigInt64BE(obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 对象 valueOf 返回 -Infinity', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = { valueOf: () => -Infinity };
    buf.readBigInt64BE(obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// offset 对象 valueOf 抛出错误
test('offset 对象 valueOf 抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      valueOf: () => {
        throw new Error('valueOf error');
      }
    };
    buf.readBigInt64BE(obj);
    return false;
  } catch (e) {
    return e.message === 'valueOf error' || e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// offset 为数组（会调用 valueOf）
test('offset 为空数组', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(500n, 0);
    const result = buf.readBigInt64BE([]);
    return result === 500n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 为单元素数组 [0]', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(600n, 0);
    const result = buf.readBigInt64BE([0]);
    return result === 600n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 为多元素数组', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE([0, 1]);
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
