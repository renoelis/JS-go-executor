// buf.writeFloatBE/LE() - 输入类型测试
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

// Number 类型
test('writeFloatBE 整数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(42, 0);
  const value = buf.readFloatBE(0);
  return value === 42;
});

test('writeFloatLE 整数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(42, 0);
  const value = buf.readFloatLE(0);
  return value === 42;
});

test('writeFloatBE 小数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(3.14159, 0);
  const value = buf.readFloatBE(0);
  return Math.abs(value - 3.14159) < 0.00001;
});

test('writeFloatLE 小数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(3.14159, 0);
  const value = buf.readFloatLE(0);
  return Math.abs(value - 3.14159) < 0.00001;
});

test('writeFloatBE 很小的数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(0.000001, 0);
  const value = buf.readFloatBE(0);
  return Math.abs(value - 0.000001) < 0.0000001;
});

test('writeFloatLE 很小的数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(0.000001, 0);
  const value = buf.readFloatLE(0);
  return Math.abs(value - 0.000001) < 0.0000001;
});

test('writeFloatBE 很大的数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(123456789, 0);
  const value = buf.readFloatBE(0);
  return value === 123456789 || Math.abs(value - 123456789) < 10;
});

test('writeFloatLE 很大的数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(123456789, 0);
  const value = buf.readFloatLE(0);
  return value === 123456789 || Math.abs(value - 123456789) < 10;
});

// offset 类型
test('writeFloatBE offset 为整数', () => {
  const buf = Buffer.allocUnsafe(8);
  const result1 = buf.writeFloatBE(1.5, 0);
  const result2 = buf.writeFloatBE(2.5, 4);
  return result1 === 4 && result2 === 8;
});

test('writeFloatLE offset 为整数', () => {
  const buf = Buffer.allocUnsafe(8);
  const result1 = buf.writeFloatLE(1.5, 0);
  const result2 = buf.writeFloatLE(2.5, 4);
  return result1 === 4 && result2 === 8;
});

test('writeFloatBE offset 为小数会抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(5.5, 2.9);
    return false;
  } catch (e) {
    return e.message.includes('integer');
  }
});

test('writeFloatLE offset 为小数会抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(5.5, 2.9);
    return false;
  } catch (e) {
    return e.message.includes('integer');
  }
});

test('writeFloatBE offset 可选默认为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(7.5);
  return result === 4 && buf.readFloatBE(0) === 7.5;
});

test('writeFloatLE offset 可选默认为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(7.5);
  return result === 4 && buf.readFloatLE(0) === 7.5;
});

// 数字字符串会转换
test('writeFloatBE 数字字符串自动转换', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE('3.14', 0);
  const value = buf.readFloatBE(0);
  return Math.abs(value - 3.14) < 0.01;
});

test('writeFloatLE 数字字符串自动转换', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE('3.14', 0);
  const value = buf.readFloatLE(0);
  return Math.abs(value - 3.14) < 0.01;
});

// 布尔值会转换
test('writeFloatBE true 转为 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(true, 0);
  const value = buf.readFloatBE(0);
  return value === 1;
});

test('writeFloatLE true 转为 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(true, 0);
  const value = buf.readFloatLE(0);
  return value === 1;
});

test('writeFloatBE false 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(false, 0);
  const value = buf.readFloatBE(0);
  return value === 0;
});

test('writeFloatLE false 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(false, 0);
  const value = buf.readFloatLE(0);
  return value === 0;
});

// null/undefined 行为
test('writeFloatBE null 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(null, 0);
  const value = buf.readFloatBE(0);
  return value === 0;
});

test('writeFloatLE null 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(null, 0);
  const value = buf.readFloatLE(0);
  return value === 0;
});

test('writeFloatBE undefined offset 默认为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(9.5, undefined);
  return result === 4 && buf.readFloatBE(0) === 9.5;
});

test('writeFloatLE undefined offset 默认为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(9.5, undefined);
  return result === 4 && buf.readFloatLE(0) === 9.5;
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
