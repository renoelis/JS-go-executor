// buf.writeFloatBE/LE() - value 参数深度类型转换测试
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

// Symbol 类型
test('writeFloatBE value 为 Symbol 抛出错误', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatBE(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.message.includes('symbol') || e.message.includes('number') || e.message.includes('Cannot convert');
  }
});

test('writeFloatLE value 为 Symbol 抛出错误', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatLE(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.message.includes('symbol') || e.message.includes('number') || e.message.includes('Cannot convert');
  }
});

// BigInt 类型
test('writeFloatBE value 为 BigInt 抛出错误或转换', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatBE(BigInt(123), 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('number') || e.message.includes('Cannot convert');
  }
});

test('writeFloatLE value 为 BigInt 抛出错误或转换', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatLE(BigInt(123), 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('number') || e.message.includes('Cannot convert');
  }
});

// 对象有 valueOf
test('writeFloatBE value 为对象有 valueOf 会调用', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    valueOf: () => 42.5
  };
  buf.writeFloatBE(obj, 0);
  const value = buf.readFloatBE(0);
  return value === 42.5;
});

test('writeFloatLE value 为对象有 valueOf 会调用', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    valueOf: () => 42.5
  };
  buf.writeFloatLE(obj, 0);
  const value = buf.readFloatLE(0);
  return value === 42.5;
});

// 对象有 toString
test('writeFloatBE value 为对象有 toString 会调用', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    toString: () => '36.6'
  };
  buf.writeFloatBE(obj, 0);
  const value = buf.readFloatBE(0);
  return Math.abs(value - 36.6) < 0.01;
});

test('writeFloatLE value 为对象有 toString 会调用', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    toString: () => '36.6'
  };
  buf.writeFloatLE(obj, 0);
  const value = buf.readFloatLE(0);
  return Math.abs(value - 36.6) < 0.01;
});

// Date 对象
test('writeFloatBE value 为 Date 对象会转为时间戳', () => {
  const buf = Buffer.allocUnsafe(4);
  const date = new Date(1000000);
  buf.writeFloatBE(date, 0);
  const value = buf.readFloatBE(0);
  return value === 1000000;
});

test('writeFloatLE value 为 Date 对象会转为时间戳', () => {
  const buf = Buffer.allocUnsafe(4);
  const date = new Date(1000000);
  buf.writeFloatLE(date, 0);
  const value = buf.readFloatLE(0);
  return value === 1000000;
});

// 正则表达式
test('writeFloatBE value 为正则表达式转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(/test/, 0);
  const value = buf.readFloatBE(0);
  return isNaN(value);
});

test('writeFloatLE value 为正则表达式转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(/test/, 0);
  const value = buf.readFloatLE(0);
  return isNaN(value);
});

// 函数
test('writeFloatBE value 为函数转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(function() {}, 0);
  const value = buf.readFloatBE(0);
  return isNaN(value);
});

test('writeFloatLE value 为函数转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(function() {}, 0);
  const value = buf.readFloatLE(0);
  return isNaN(value);
});

// 箭头函数
test('writeFloatBE value 为箭头函数转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(() => 123, 0);
  const value = buf.readFloatBE(0);
  return isNaN(value);
});

test('writeFloatLE value 为箭头函数转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(() => 123, 0);
  const value = buf.readFloatLE(0);
  return isNaN(value);
});

// 数组
test('writeFloatBE value 为单元素数组会转换', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE([3.14], 0);
  const value = buf.readFloatBE(0);
  return Math.abs(value - 3.14) < 0.01;
});

test('writeFloatLE value 为单元素数组会转换', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE([3.14], 0);
  const value = buf.readFloatLE(0);
  return Math.abs(value - 3.14) < 0.01;
});

test('writeFloatBE value 为多元素数组转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE([1, 2, 3], 0);
  const value = buf.readFloatBE(0);
  return isNaN(value);
});

test('writeFloatLE value 为多元素数组转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE([1, 2, 3], 0);
  const value = buf.readFloatLE(0);
  return isNaN(value);
});

test('writeFloatBE value 为空数组转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE([], 0);
  const value = buf.readFloatBE(0);
  return value === 0;
});

test('writeFloatLE value 为空数组转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE([], 0);
  const value = buf.readFloatLE(0);
  return value === 0;
});

// 空对象
test('writeFloatBE value 为空对象转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE({}, 0);
  const value = buf.readFloatBE(0);
  return isNaN(value);
});

test('writeFloatLE value 为空对象转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE({}, 0);
  const value = buf.readFloatLE(0);
  return isNaN(value);
});

// 空字符串
test('writeFloatBE value 为空字符串转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE('', 0);
  const value = buf.readFloatBE(0);
  return value === 0;
});

test('writeFloatLE value 为空字符串转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE('', 0);
  const value = buf.readFloatLE(0);
  return value === 0;
});

// 非数字字符串
test('writeFloatBE value 为非数字字符串转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE('hello', 0);
  const value = buf.readFloatBE(0);
  return isNaN(value);
});

test('writeFloatLE value 为非数字字符串转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE('hello', 0);
  const value = buf.readFloatLE(0);
  return isNaN(value);
});

// 包含空格的数字字符串
test('writeFloatBE value 为包含空格的数字字符串会转换', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE('  12.34  ', 0);
  const value = buf.readFloatBE(0);
  return Math.abs(value - 12.34) < 0.01;
});

test('writeFloatLE value 为包含空格的数字字符串会转换', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE('  12.34  ', 0);
  const value = buf.readFloatLE(0);
  return Math.abs(value - 12.34) < 0.01;
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
