// buf.writeUIntBE/LE() - 数值强制转换测试（Node v25.0.0 实际行为）
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

// 小数截断测试 - 只在范围内允许小数
test('writeUIntBE value 为小数 1.1', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(1.1, 0, 1);
  return r === 1 && buf[0] === 1;
});

test('writeUIntBE value 为小数 1.5', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(1.5, 0, 1);
  return r === 1 && buf[0] === 1;
});

test('writeUIntBE value 为小数 1.9', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(1.9, 0, 1);
  return r === 1 && buf[0] === 1;
});

// 边界小数会报错
test('writeUIntBE value 为小数 255.1 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(255.1, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('range');
  }
});

test('writeUIntLE value 为小数 1.1', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE(1.1, 0, 1);
  return r === 1 && buf[0] === 1;
});

test('writeUIntLE value 为小数 1.9', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE(1.9, 0, 1);
  return r === 1 && buf[0] === 1;
});

test('writeUIntLE value 为小数 255.1 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(255.1, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('range');
  }
});

// 字符串数字转换
test('writeUIntBE value 为字符串 "42"', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE('42', 0, 1);
  return r === 1 && buf[0] === 42;
});

test('writeUIntBE value 为字符串 "255"', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE('255', 0, 1);
  return r === 1 && buf[0] === 255;
});

test('writeUIntBE value 为字符串 "0x10" (十六进制)', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE('0x10', 0, 1);
  return r === 1 && buf[0] === 16;
});

test('writeUIntLE value 为字符串 "42"', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE('42', 0, 1);
  return r === 1 && buf[0] === 42;
});

test('writeUIntLE value 为字符串 "255"', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE('255', 0, 1);
  return r === 1 && buf[0] === 255;
});

// 布尔值转换
test('writeUIntBE value 为 true', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(true, 0, 1);
  return r === 1 && buf[0] === 1;
});

test('writeUIntBE value 为 false', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntBE(false, 0, 1);
  return r === 1 && buf[0] === 0;
});

test('writeUIntLE value 为 true', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE(true, 0, 1);
  return r === 1 && buf[0] === 1;
});

test('writeUIntLE value 为 false', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntLE(false, 0, 1);
  return r === 1 && buf[0] === 0;
});

// 科学计数法
test('writeUIntBE value 为科学计数法 1e2', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(1e2, 0, 1);
  return r === 1 && buf[0] === 100;
});

test('writeUIntBE value 为科学计数法 2.55e2', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(2.55e2, 0, 1);
  return r === 1 && buf[0] === 255;
});

test('writeUIntLE value 为科学计数法 1e2', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE(1e2, 0, 1);
  return r === 1 && buf[0] === 100;
});

test('writeUIntLE value 为科学计数法 2.55e2', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE(2.55e2, 0, 1);
  return r === 1 && buf[0] === 255;
});

// 整数范围内的大小数
test('writeUIntBE value 为大小数 65535', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(65535, 0, 2);
  return r === 2 && buf[0] === 0xff && buf[1] === 0xff;
});

test('writeUIntLE value 为大小数 65535', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE(65535, 0, 2);
  return r === 2 && buf[0] === 0xff && buf[1] === 0xff;
});

// 负零
test('writeUIntBE value 为 -0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntBE(-0, 0, 1);
  return r === 1 && buf[0] === 0;
});

test('writeUIntLE value 为 -0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntLE(-0, 0, 1);
  return r === 1 && buf[0] === 0;
});

// 对象带 valueOf 方法
test('writeUIntBE value 为对象带 valueOf', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = { valueOf: () => 42 };
  const r = buf.writeUIntBE(obj, 0, 1);
  return r === 1 && buf[0] === 42;
});

test('writeUIntLE value 为对象带 valueOf', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = { valueOf: () => 42 };
  const r = buf.writeUIntLE(obj, 0, 1);
  return r === 1 && buf[0] === 42;
});

// offset 不接受非整数
test('writeUIntBE offset 必须是整数', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x12, true, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE offset 必须是整数', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x12, true, 1);
    return false;
  } catch (e) {
    return true;
  }
});

// byteLength 必须是整数
test('writeUIntBE byteLength 必须是整数', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x12, 0, true);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE byteLength 必须是整数', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x12, 0, true);
    return false;
  } catch (e) {
    return true;
  }
});

// 数组转换
test('writeUIntBE value 为空数组转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntBE([], 0, 1);
  return r === 1 && buf[0] === 0;
});

test('writeUIntBE value 为数组 [42]', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE([42], 0, 1);
  return r === 1 && buf[0] === 42;
});

test('writeUIntLE value 为空数组转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntLE([], 0, 1);
  return r === 1 && buf[0] === 0;
});

test('writeUIntLE value 为数组 [42]', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE([42], 0, 1);
  return r === 1 && buf[0] === 42;
});

// 非数字字符串转为 NaN 转为 0
test('writeUIntBE value 为 "abc" 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntBE('abc', 0, 1);
  return r === 1 && buf[0] === 0;
});

test('writeUIntLE value 为 "abc" 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntLE('abc', 0, 1);
  return r === 1 && buf[0] === 0;
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
