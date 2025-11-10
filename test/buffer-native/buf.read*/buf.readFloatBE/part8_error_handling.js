// buf.readFloatBE() - 错误处理测试
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

// RangeError 测试
test('RangeError: offset 超出范围', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: 负数 offset', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(-5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: offset 为小数', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: Buffer 长度不足', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: 空 Buffer', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// TypeError 测试
test('TypeError: offset 为字符串', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: offset 为对象', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE({});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('TypeError: offset 为数组', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE([1]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('TypeError: offset 为 null', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: offset 为布尔值', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 特殊值作为 offset
test('NaN 作为 offset', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('Infinity 作为 offset', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('-Infinity 作为 offset', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(-Infinity);
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
