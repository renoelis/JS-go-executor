// Buffer.allocUnsafeSlow - Error Handling Tests
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

// 越界和范围错误
test('超过 MAX_LENGTH 抛出 RangeError 或内存错误', () => {
  try {
    const { constants } = require('buffer');
    const buf = Buffer.allocUnsafeSlow(constants.MAX_LENGTH);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('Invalid') || e.message.includes('memory');
  }
});

test('负数大小抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('size');
  }
});

test('非常大的负数抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(-1000000);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('NaN 抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Infinity 抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('-Infinity 抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 类型错误
test('undefined 抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('null 抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('字符串抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow('not a number');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('对象抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow({ size: 10 });
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('数组抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow([10]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('Symbol 抛出 TypeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Symbol('size'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 错误消息内容验证
test('负数错误消息包含 size 关键词', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(-10);
    return false;
  } catch (e) {
    return e.message.toLowerCase().includes('size') ||
           e.message.toLowerCase().includes('range') ||
           e.message.toLowerCase().includes('invalid');
  }
});

test('NaN 错误消息包含相关关键词', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(NaN);
    return false;
  } catch (e) {
    return e.message.toLowerCase().includes('size') ||
           e.message.toLowerCase().includes('range') ||
           e.message.toLowerCase().includes('invalid');
  }
});

// 边界条件错误
test('Number.MAX_SAFE_INTEGER 可能抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Number.MIN_SAFE_INTEGER 抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 参数缺失
test('无参数调用抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow();
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 浮点数处理
test('小数可能被截断或抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(10.9);
    return buf.length === 10 || false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('负小数抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(-10.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('接近 0 的正小数可能被截断为 0', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(0.1);
    return buf.length === 0 || false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('接近 0 的负小数抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(-0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊数值
test('Number.EPSILON 可能被截断为 0', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Number.EPSILON);
    return buf.length === 0 || false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('Number.MIN_VALUE 可能被截断为 0', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Number.MIN_VALUE);
    return buf.length === 0 || false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('Number.MAX_VALUE 抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 科学计数法
test('科学计数法正数正常工作', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(1e3);
    return buf.length === 1000;
  } catch (e) {
    return false;
  }
});

test('科学计数法负数抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(-1e3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('科学计数法极大值抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(1e20);
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
