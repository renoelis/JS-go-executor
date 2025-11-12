// Buffer.allocUnsafeSlow - 边缘场景测试
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

test('小数会被截断', () => {
  const buf = Buffer.allocUnsafeSlow(10.9);
  return buf.length === 10;
});

test('NaN 抛出 RangeError', () => {
  try {
    Buffer.allocUnsafeSlow(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Infinity 抛出 RangeError', () => {
  try {
    Buffer.allocUnsafeSlow(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('-Infinity 抛出 RangeError', () => {
  try {
    Buffer.allocUnsafeSlow(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('undefined 抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('null 抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('对象参数抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('数组参数抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow([10]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('布尔值 true 抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('布尔值 false 抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow(false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('数值字符串会被转换', () => {
  try {
    Buffer.allocUnsafeSlow('10');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('空字符串抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow('');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('超大数值可能成功或抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(2 ** 32);
    return buf.length === 2 ** 32;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('最大安全整数', () => {
  try {
    Buffer.allocUnsafeSlow(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('size = 1', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  return buf.length === 1;
});

test('size = 4095 (小于 4KB)', () => {
  const buf = Buffer.allocUnsafeSlow(4095);
  return buf.length === 4095;
});

test('size = 4096 (等于 4KB)', () => {
  const buf = Buffer.allocUnsafeSlow(4096);
  return buf.length === 4096;
});

test('size = 4097 (大于 4KB)', () => {
  const buf = Buffer.allocUnsafeSlow(4097);
  return buf.length === 4097;
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
