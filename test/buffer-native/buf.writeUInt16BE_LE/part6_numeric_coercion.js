// buf.writeUInt16BE/LE() - Numeric Coercion Tests
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

// 字符串强制转换
test('writeUInt16BE: 空字符串转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE('', 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 空字符串转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE('', 0);
  return buf.readUInt16LE(0) === 0;
});

test('writeUInt16BE: 非数字字符串转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE('abc', 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 非数字字符串转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE('abc', 0);
  return buf.readUInt16LE(0) === 0;
});

test('writeUInt16BE: 带前导空格的数字字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE('  123', 0);
  return buf.readUInt16BE(0) === 123;
});

test('writeUInt16LE: 带前导空格的数字字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE('  123', 0);
  return buf.readUInt16LE(0) === 123;
});

test('writeUInt16BE: 带后导空格的数字字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE('123  ', 0);
  return buf.readUInt16BE(0) === 123;
});

test('writeUInt16LE: 带后导空格的数字字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE('123  ', 0);
  return buf.readUInt16LE(0) === 123;
});

test('writeUInt16BE: 浮点数字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE('123.456', 0);
  return buf.readUInt16BE(0) === 123;
});

test('writeUInt16LE: 浮点数字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE('123.456', 0);
  return buf.readUInt16LE(0) === 123;
});

test('writeUInt16BE: 科学计数法字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE('1e3', 0);
  return buf.readUInt16BE(0) === 1000;
});

test('writeUInt16LE: 科学计数法字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE('1e3', 0);
  return buf.readUInt16LE(0) === 1000;
});

test('writeUInt16BE: 八进制字符串视为十进制', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE('0123', 0);
  return buf.readUInt16BE(0) === 123;
});

test('writeUInt16LE: 八进制字符串视为十进制', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE('0123', 0);
  return buf.readUInt16LE(0) === 123;
});

test('writeUInt16BE: 二进制字符串 0b 前缀', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE('0b1111', 0);
  return buf.readUInt16BE(0) === 15;
});

test('writeUInt16LE: 二进制字符串 0b 前缀', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE('0b1111', 0);
  return buf.readUInt16LE(0) === 15;
});

// 对象转换
test('writeUInt16BE: 包含 valueOf 的对象', () => {
  const buf = Buffer.alloc(4);
  const obj = { valueOf: () => 100 };
  buf.writeUInt16BE(obj, 0);
  return buf.readUInt16BE(0) === 100;
});

test('writeUInt16LE: 包含 valueOf 的对象', () => {
  const buf = Buffer.alloc(4);
  const obj = { valueOf: () => 100 };
  buf.writeUInt16LE(obj, 0);
  return buf.readUInt16LE(0) === 100;
});

test('writeUInt16BE: 包含 toString 的对象', () => {
  const buf = Buffer.alloc(4);
  const obj = { toString: () => '200' };
  buf.writeUInt16BE(obj, 0);
  return buf.readUInt16BE(0) === 200;
});

test('writeUInt16LE: 包含 toString 的对象', () => {
  const buf = Buffer.alloc(4);
  const obj = { toString: () => '200' };
  buf.writeUInt16LE(obj, 0);
  return buf.readUInt16LE(0) === 200;
});

test('writeUInt16BE: 空数组转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE([], 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 空数组转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE([], 0);
  return buf.readUInt16LE(0) === 0;
});

test('writeUInt16BE: 单元素数组', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE([123], 0);
  return buf.readUInt16BE(0) === 123;
});

test('writeUInt16LE: 单元素数组', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE([123], 0);
  return buf.readUInt16LE(0) === 123;
});

test('writeUInt16BE: 多元素数组转为 NaN 视为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE([1, 2, 3], 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 多元素数组转为 NaN 视为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE([1, 2, 3], 0);
  return buf.readUInt16LE(0) === 0;
});

// Symbol 应该抛出错误
test('writeUInt16BE: Symbol 抛出 TypeError', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16LE: Symbol 抛出 TypeError', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// BigInt 抛出错误
test('writeUInt16BE: BigInt 抛出 TypeError', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(BigInt(1234), 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16LE: BigInt 抛出 TypeError', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(BigInt(1234), 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16BE: BigInt 最大值抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(BigInt(0xFFFF), 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16LE: BigInt 最大值抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(BigInt(0xFFFF), 0);
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
