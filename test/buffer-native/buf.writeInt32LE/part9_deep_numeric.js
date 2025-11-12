// buf.writeInt32LE() - 深度补充：数值转换边界细节
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

// 浮点数截断的精确行为
test('浮点截断：123.1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(123.1, 0);
  return buf.readInt32LE(0) === 123;
});

test('浮点截断：123.5', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(123.5, 0);
  return buf.readInt32LE(0) === 123;
});

test('浮点截断：123.9', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(123.9, 0);
  return buf.readInt32LE(0) === 123;
});

test('浮点截断：-123.1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-123.1, 0);
  return buf.readInt32LE(0) === -123;
});

test('浮点截断：-123.5', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-123.5, 0);
  return buf.readInt32LE(0) === -123;
});

test('浮点截断：-123.9', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-123.9, 0);
  return buf.readInt32LE(0) === -123;
});

test('浮点截断：2147483646.9', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(2147483646.9, 0);
  return buf.readInt32LE(0) === 2147483646;
});

test('浮点截断：-2147483647.9', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-2147483647.9, 0);
  return buf.readInt32LE(0) === -2147483647;
});

// 非常小的浮点数
test('微小浮点：0.1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0.1, 0);
  return buf.readInt32LE(0) === 0;
});

test('微小浮点：0.9', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0.9, 0);
  return buf.readInt32LE(0) === 0;
});

test('微小浮点：-0.1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-0.1, 0);
  return buf.readInt32LE(0) === 0;
});

test('微小浮点：-0.9', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-0.9, 0);
  return buf.readInt32LE(0) === 0;
});

// 特殊数值：正负零
test('特殊数值：+0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(+0, 0);
  return buf.readInt32LE(0) === 0 && buf[0] === 0;
});

test('特殊数值：-0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-0, 0);
  return buf.readInt32LE(0) === 0 && buf[0] === 0;
});

// 字符串转数字的边界
test('字符串：\'0\'', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE('0', 0);
  return buf.readInt32LE(0) === 0;
});

test('字符串：\'123\'', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE('123', 0);
  return buf.readInt32LE(0) === 123;
});

test('字符串：\'-123\'', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE('-123', 0);
  return buf.readInt32LE(0) === -123;
});

test('字符串：\'2147483647\'', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE('2147483647', 0);
  return buf.readInt32LE(0) === 2147483647;
});

test('字符串：\'-2147483648\'', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE('-2147483648', 0);
  return buf.readInt32LE(0) === -2147483648;
});

test('字符串：\'123.456\'', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE('123.456', 0);
  return buf.readInt32LE(0) === 123;
});

test('字符串：非法数字 \'abc\'', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE('abc', 0);
  return buf.readInt32LE(0) === 0;
});

test('字符串：空字符串', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE('', 0);
  return buf.readInt32LE(0) === 0;
});

test('字符串：空格', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(' ', 0);
  return buf.readInt32LE(0) === 0;
});

test('字符串：\'  123  \'（带空格）', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE('  123  ', 0);
  return buf.readInt32LE(0) === 123;
});

// 科学计数法
test('科学计数法：1e2', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(1e2, 0);
  return buf.readInt32LE(0) === 100;
});

test('科学计数法：1e9', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(1e9, 0);
  return buf.readInt32LE(0) === 1000000000;
});

test('科学计数法：1e-2', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(1e-2, 0);
  return buf.readInt32LE(0) === 0;
});

test('科学计数法：-1e2', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-1e2, 0);
  return buf.readInt32LE(0) === -100;
});

// 十六进制边界
test('十六进制：0x00', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x00, 0);
  return buf.readInt32LE(0) === 0;
});

test('十六进制：0x01', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x01, 0);
  return buf.readInt32LE(0) === 1;
});

test('十六进制：0xFF', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0xFF, 0);
  return buf.readInt32LE(0) === 255;
});

test('十六进制：0x100', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x100, 0);
  return buf.readInt32LE(0) === 256;
});

test('十六进制：0x7FFFFFFF', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x7FFFFFFF, 0);
  return buf.readInt32LE(0) === 2147483647;
});

test('十六进制：0x80000000（超出范围）', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(0x80000000, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 八进制（已废弃，但测试兼容性）
test('八进制：0o10', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0o10, 0);
  return buf.readInt32LE(0) === 8;
});

test('八进制：0o777', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0o777, 0);
  return buf.readInt32LE(0) === 511;
});

// 二进制
test('二进制：0b0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0b0, 0);
  return buf.readInt32LE(0) === 0;
});

test('二进制：0b1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0b1, 0);
  return buf.readInt32LE(0) === 1;
});

test('二进制：0b11111111', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0b11111111, 0);
  return buf.readInt32LE(0) === 255;
});

test('二进制：0b1111111111111111111111111111111（31位）', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0b1111111111111111111111111111111, 0);
  return buf.readInt32LE(0) === 2147483647;
});

// 对象的 valueOf 方法
test('对象 valueOf：返回 123', () => {
  const obj = { valueOf: () => 123 };
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === 123;
});

test('对象 valueOf：返回 -123', () => {
  const obj = { valueOf: () => -123 };
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === -123;
});

test('对象 valueOf：返回 NaN', () => {
  const obj = { valueOf: () => NaN };
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === 0;
});

test('对象 toString：返回 \'123\'', () => {
  const obj = { toString: () => '123' };
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === 123;
});

// 数组
test('数组：[123]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE([123], 0);
  return buf.readInt32LE(0) === 123;
});

test('数组：[]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE([], 0);
  return buf.readInt32LE(0) === 0;
});

test('数组：[1, 2]（多元素）', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE([1, 2], 0);
  return buf.readInt32LE(0) === 0;
});

// Date 对象
test('Date：转为时间戳', () => {
  const date = new Date(123);
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(date, 0);
  return buf.readInt32LE(0) === 123;
});

test('Date：大时间戳（超范围）', () => {
  try {
    const date = new Date(9999999999999);
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(date, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// BigInt（如果支持）
test('BigInt：1n', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(1n, 0);
    return buf.readInt32LE(0) === 1;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BigInt：123n', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123n, 0);
    return buf.readInt32LE(0) === 123;
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
