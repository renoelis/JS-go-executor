// buf.writeInt8() - Value Coercion Tests
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

// 浮点数截断测试
test('value 为 126.9 向下截断为 126', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(126.9, 0);
  return result === 1 && buf[0] === 126;
});

test('value 为 126.1 向下截断为 126', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(126.1, 0);
  return result === 1 && buf[0] === 126;
});

test('value 为 127.5 会先截断导致不在范围内抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(127.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 -127.9 向上截断为 -127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-127.9, 0);
  return result === 1 && buf[0] === (256 - 127);
});

test('value 为 -127.1 向上截断为 -127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-127.1, 0);
  return result === 1 && buf[0] === (256 - 127);
});

// 科学计数法
test('value 为科学计数法 1e2 (100)', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(1e2, 0);
  return result === 1 && buf[0] === 100;
});

test('value 为科学计数法 -1e2 (-100)', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-1e2, 0);
  return result === 1 && buf[0] === (256 - 100);
});

test('value 为科学计数法 1.27e2 (127)', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(1.27e2, 0);
  return result === 1 && buf[0] === 127;
});

// 字符串数字边界
test('value 为字符串 "127"', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('127', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为字符串 "-128"', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('-128', 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为字符串 "128" 超出范围', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8('128', 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为非数字字符串转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('abc', 0);
  return result === 1 && buf[0] === 0;
});

// 对象转换
test('value 为空对象转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8({}, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为空数组转换为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8([], 0);
  return result === 1 && buf[0] === 0;
});

test('value 为单元素数组 [42]', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8([42], 0);
  return result === 1 && buf[0] === 42;
});

test('value 为多元素数组转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8([1, 2], 0);
  return result === 1 && buf[0] === 0;
});

// 特殊边界值组合
test('写入 1，然后在同一位置写入 -1', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt8(1, 0);
  buf.writeInt8(-1, 0);
  return buf[0] === 0xFF;
});

test('写入 127，然后写入 -128', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt8(127, 0);
  buf.writeInt8(-128, 0);
  return buf[0] === 0x80;
});

// BigInt 类型（如果支持）
test('value 为 BigInt 1n', () => {
  const buf = Buffer.alloc(2);
  try {
    const result = buf.writeInt8(1n, 0);
    return result === 1 && buf[0] === 1;
  } catch (e) {
    return e.message.includes('Cannot convert') || e.message.includes('BigInt');
  }
});

test('value 为 BigInt 127n', () => {
  const buf = Buffer.alloc(2);
  try {
    const result = buf.writeInt8(127n, 0);
    return result === 1 && buf[0] === 127;
  } catch (e) {
    return e.message.includes('Cannot convert') || e.message.includes('BigInt');
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
