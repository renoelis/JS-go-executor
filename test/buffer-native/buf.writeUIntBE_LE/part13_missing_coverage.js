// buf.writeUIntBE/LE() - 查缺补漏测试用例
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

// === 负数值处理 ===
test('writeUIntBE value 为负数 -1 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(-1, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('must be');
  }
});

test('writeUIntLE value 为负数 -1 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(-1, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('must be');
  }
});

test('writeUIntBE value 为负数 -255 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(-255, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('must be');
  }
});

test('writeUIntLE value 为负数 -255 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(-255, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('must be');
  }
});

// === BigInt 类型处理 ===
test('writeUIntBE value 为 BigInt 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(BigInt(255), 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('number');
  }
});

test('writeUIntLE value 为 BigInt 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(BigInt(255), 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('number');
  }
});

// === Symbol 类型处理 ===
test('writeUIntBE value 为 Symbol 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(Symbol('test'), 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('Symbol') || e.message.includes('number');
  }
});

test('writeUIntLE value 为 Symbol 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(Symbol('test'), 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('Symbol') || e.message.includes('number');
  }
});

// === 函数作为参数 ===
test('writeUIntBE value 为函数转为 NaN -> 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE(function() {}, 0, 1);
  return result === 1 && buf[0] === 0; // 函数转为 NaN -> 0
});

test('writeUIntLE value 为函数转为 NaN -> 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE(function() {}, 0, 1);
  return result === 1 && buf[0] === 0; // 函数转为 NaN -> 0
});

// === 特殊对象处理 ===
test('writeUIntBE value 为 Date 对象应该报错', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeUIntBE(new Date(), 0, 1);
    return false; // Date 转为时间戳，可能超出范围
  } catch (e) {
    return e.message.includes('range') || e.message.includes('out of range');
  }
});

test('writeUIntLE value 为 Date 对象应该报错', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeUIntLE(new Date(), 0, 1);
    return false; // Date 转为时间戳，可能超出范围
  } catch (e) {
    return e.message.includes('range') || e.message.includes('out of range');
  }
});

test('writeUIntBE value 为 RegExp 对象转为 NaN -> 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE(/test/, 0, 1);
  return result === 1 && buf[0] === 0; // RegExp 转为 NaN -> 0
});

test('writeUIntLE value 为 RegExp 对象转为 NaN -> 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE(/test/, 0, 1);
  return result === 1 && buf[0] === 0; // RegExp 转为 NaN -> 0
});

// === 数组作为参数 ===
test('writeUIntBE value 为单元素数组转为数字', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE([255], 0, 1);
  return result === 1 && buf[0] === 255; // [255] 转为 255
});

test('writeUIntLE value 为单元素数组转为数字', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE([255], 0, 1);
  return result === 1 && buf[0] === 255; // [255] 转为 255
});

test('writeUIntBE value 为多元素数组转为 NaN -> 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE([1,2,3], 0, 1);
  return result === 1 && buf[0] === 0; // [1,2,3] 转为 NaN -> 0
});

test('writeUIntLE value 为多元素数组转为 NaN -> 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE([1,2,3], 0, 1);
  return result === 1 && buf[0] === 0; // [1,2,3] 转为 NaN -> 0
});

// === null 和 undefined 处理 ===
test('writeUIntBE value 为 null 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE(null, 0, 1);
  return result === 1 && buf[0] === 0;
});

test('writeUIntLE value 为 null 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE(null, 0, 1);
  return result === 1 && buf[0] === 0;
});

test('writeUIntBE value 为 undefined 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE(undefined, 0, 1);
  return result === 1 && buf[0] === 0;
});

test('writeUIntLE value 为 undefined 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE(undefined, 0, 1);
  return result === 1 && buf[0] === 0;
});

// === 布尔值处理 ===
test('writeUIntBE value 为 true 转为 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0);
  const result = buf.writeUIntBE(true, 0, 1);
  return result === 1 && buf[0] === 1;
});

test('writeUIntLE value 为 true 转为 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0);
  const result = buf.writeUIntLE(true, 0, 1);
  return result === 1 && buf[0] === 1;
});

test('writeUIntBE value 为 false 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE(false, 0, 1);
  return result === 1 && buf[0] === 0;
});

test('writeUIntLE value 为 false 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE(false, 0, 1);
  return result === 1 && buf[0] === 0;
});

// === 特殊数值处理 ===
test('writeUIntBE value 为 Infinity 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(Infinity, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('Infinity');
  }
});

test('writeUIntLE value 为 Infinity 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(Infinity, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('Infinity');
  }
});

test('writeUIntBE value 为 -Infinity 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(-Infinity, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('Infinity');
  }
});

test('writeUIntLE value 为 -Infinity 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(-Infinity, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('Infinity');
  }
});

// === 冻结 Buffer 测试 (跳过，因为 Buffer 无法被冻结) ===
// Node.js 中 Buffer 无法被 Object.freeze()，会抛出 "Cannot freeze array buffer views with elements"
test('writeUIntBE Buffer 无法被冻结', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    Object.freeze(buf);
    return false; // 不应该成功
  } catch (e) {
    return e.message.includes('Cannot freeze') || e.message.includes('array buffer views');
  }
});

test('writeUIntLE Buffer 无法被冻结', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    Object.freeze(buf);
    return false; // 不应该成功
  } catch (e) {
    return e.message.includes('Cannot freeze') || e.message.includes('array buffer views');
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
