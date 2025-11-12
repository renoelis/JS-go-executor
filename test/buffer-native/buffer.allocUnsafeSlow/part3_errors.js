// Buffer.allocUnsafeSlow - 错误处理与边界测试
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

// 参数数量测试
test('无参数调用抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow();
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('接受 1 个参数', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.length === 10;
});

test('忽略多余参数', () => {
  const buf = Buffer.allocUnsafeSlow(10, 'ignored', 'extra');
  return buf.length === 10;
});

// 数值边界测试
test('size = 0 有效', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0 && Buffer.isBuffer(buf);
});

test('size = 1 有效', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  return buf.length === 1;
});

test('负数抛出 RangeError', () => {
  try {
    Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('负小数抛出 RangeError', () => {
  try {
    Buffer.allocUnsafeSlow(-0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
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

// 超大值测试
test('2^31 可能成功或抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(2 ** 31);
    return buf.length === 2 ** 31;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('2^32 可能成功或抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(2 ** 32);
    return buf.length === 2 ** 32;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('MAX_SAFE_INTEGER 抛出 RangeError', () => {
  try {
    Buffer.allocUnsafeSlow(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('MAX_VALUE 抛出 RangeError', () => {
  try {
    Buffer.allocUnsafeSlow(Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 非数值类型错误
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

test('字符串抛出 TypeError', () => {
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

test('对象抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('对象带 valueOf 抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow({ valueOf: () => 10 });
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('数组抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow([10]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('函数抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow(() => 10);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('Symbol 抛出 TypeError', () => {
  try {
    Buffer.allocUnsafeSlow(Symbol('10'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 浮点数处理
test('正浮点数向下取整', () => {
  const buf = Buffer.allocUnsafeSlow(10.1);
  return buf.length === 10;
});

test('正浮点数 .9 向下取整', () => {
  const buf = Buffer.allocUnsafeSlow(10.9);
  return buf.length === 10;
});

test('0.9 向下取整为 0', () => {
  const buf = Buffer.allocUnsafeSlow(0.9);
  return buf.length === 0;
});

test('1.0 等于 1', () => {
  const buf = Buffer.allocUnsafeSlow(1.0);
  return buf.length === 1;
});

// 边界值精确测试
test('size = 4095 (池临界值-1)', () => {
  const buf = Buffer.allocUnsafeSlow(4095);
  return buf.length === 4095;
});

test('size = 4096 (标准池大小)', () => {
  const buf = Buffer.allocUnsafeSlow(4096);
  return buf.length === 4096;
});

test('size = 4097 (池大小+1)', () => {
  const buf = Buffer.allocUnsafeSlow(4097);
  return buf.length === 4097;
});

test('size = 8192 (2倍池大小)', () => {
  const buf = Buffer.allocUnsafeSlow(8192);
  return buf.length === 8192;
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
