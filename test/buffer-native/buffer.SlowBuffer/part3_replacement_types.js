// Buffer.allocUnsafeSlow - Input Types Tests
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

// 整数类型
test('接受正整数', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.length === 10;
});

test('接受 0', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0;
});

test('接受大整数', () => {
  const buf = Buffer.allocUnsafeSlow(10000);
  return buf.length === 10000;
});

test('接受整数字符串（应该被转换）', () => {
  try {
    const buf = Buffer.allocUnsafeSlow('10');
    return buf.length === 10;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('integer');
  }
});

test('接受浮点数（应该被截断或报错）', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(10.5);
    return buf.length === 10;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('integer');
  }
});

// 负数和特殊数值
test('负数应该抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('size');
  }
});

test('负整数应该抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(-10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('NaN 应该抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Infinity 应该抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('-Infinity 应该抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 非数字类型
test('undefined 应该抛出 TypeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('null 应该抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('布尔值 true 应该抛出错误或转换为 1', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(true);
    return buf.length === 1 || false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('布尔值 false 应该抛出错误或转换为 0', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(false);
    return buf.length === 0 || false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('字符串应该抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow('abc');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('空字符串应该抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow('');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('对象应该抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow({});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('数组应该抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow([10]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('空数组应该抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow([]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('函数应该抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(() => {});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Symbol 类型
test('Symbol 应该抛出 TypeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// BigInt 类型
test('BigInt 应该抛出错误或被转换', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(BigInt(10));
    return buf.length === 10 || false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 无参数调用
test('不传参数应该抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow();
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
