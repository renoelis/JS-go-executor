// Buffer.allocUnsafeSlow() - 类型测试
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

// 整数类型测试
test('接受正整数', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.length === 10;
});

test('接受 0', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0;
});

test('接受浮点数（向下取整）', () => {
  const buf = Buffer.allocUnsafeSlow(10.9);
  return buf.length === 10;
});

test('拒绝字符串数字', () => {
  try {
    Buffer.allocUnsafeSlow('10');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 错误类型测试
test('拒绝负数', () => {
  try {
    Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.code === 'ERR_INVALID_ARG_VALUE';
  }
});

test('拒绝 NaN', () => {
  try {
    Buffer.allocUnsafeSlow(NaN);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.code === 'ERR_INVALID_ARG_VALUE';
  }
});

test('拒绝 Infinity', () => {
  try {
    Buffer.allocUnsafeSlow(Infinity);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.code === 'ERR_INVALID_ARG_VALUE';
  }
});

test('拒绝 undefined', () => {
  try {
    Buffer.allocUnsafeSlow(undefined);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.code === 'ERR_INVALID_ARG_VALUE';
  }
});

test('拒绝 null', () => {
  try {
    Buffer.allocUnsafeSlow(null);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.code === 'ERR_INVALID_ARG_VALUE';
  }
});

test('拒绝对象', () => {
  try {
    Buffer.allocUnsafeSlow({});
    return false;
  } catch (e) {
    return e.message.includes('size') || e.code === 'ERR_INVALID_ARG_VALUE';
  }
});

test('拒绝数组', () => {
  try {
    Buffer.allocUnsafeSlow([10]);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.code === 'ERR_INVALID_ARG_VALUE';
  }
});

test('拒绝布尔值 true', () => {
  try {
    Buffer.allocUnsafeSlow(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('拒绝布尔值 false', () => {
  try {
    Buffer.allocUnsafeSlow(false);
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
