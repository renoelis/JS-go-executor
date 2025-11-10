// buf.readInt8() - 错误详细验证测试
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

// RangeError 详细测试
test('offset 超出应抛出 RangeError（正好等于 length）', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 超出应抛出 RangeError（大于 length）', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('负 offset 应抛出 RangeError', () => {
  try {
    const buf = Buffer.from([127, 100]);
    buf.readInt8(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 NaN 应抛出错误', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为 Infinity 应抛出错误', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为 -Infinity 应抛出错误', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// TypeError 详细测试
test('offset 为字符串应抛出 TypeError', () => {
  try {
    const buf = Buffer.from([127, 100]);
    buf.readInt8('1');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为对象应抛出 TypeError', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8({});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 为数组应抛出 TypeError', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8([0]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 为 Symbol 应抛出 TypeError', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 边界条件错误测试
test('空 Buffer（length=0）读取应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readInt8(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('length=1 的 Buffer，offset=1 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readInt8(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('length=10 的 Buffer，offset=10 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.readInt8(10);
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
