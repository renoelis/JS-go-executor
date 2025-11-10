// buf.readUInt8() - 错误验证测试
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

// offset 越界测试
test('offset 等于 buffer 长度（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 大于 buffer 长度（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为负数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 200]);
    buf.readUInt8(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 -0（应正常工作）', () => {
  const buf = Buffer.from([255]);
  return buf.readUInt8(-0) === 255;
});

// 空 buffer 测试
test('空 buffer 读取（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readUInt8(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 浮点数 offset 测试
test('offset 为非整数浮点数 1.1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 200]);
    buf.readUInt8(1.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为非整数浮点数 0.5（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 200]);
    buf.readUInt8(0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// NaN 测试
test('offset 为 NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 边界条件
test('最后一个字节读取', () => {
  const buf = Buffer.from([10, 20, 30, 40, 255]);
  return buf.readUInt8(4) === 255;
});

test('尝试读取最后一个字节之后（应抛出错误）', () => {
  try {
    const buf = Buffer.from([10, 20, 30]);
    buf.readUInt8(3);
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
