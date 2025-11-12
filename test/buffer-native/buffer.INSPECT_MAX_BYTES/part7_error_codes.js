// buffer.INSPECT_MAX_BYTES - 错误类型详细测试
const buffer = require('buffer');

const tests = [];
const originalValue = buffer.INSPECT_MAX_BYTES;

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  } finally {
    buffer.INSPECT_MAX_BYTES = originalValue;
  }
}

// RangeError 的各种触发条件
test('负数触发 RangeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = -1;
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('NaN 触发 RangeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = NaN;
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('-Infinity 触发 RangeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = -Infinity;
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('极小负数触发 RangeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = -9999999;
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('-0.1 触发 RangeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = -0.1;
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

// TypeError 的各种触发条件
test('字符串触发 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = "100";
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('null 触发 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = null;
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('undefined 触发 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = undefined;
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('布尔值触发 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = true;
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('对象触发 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = { value: 50 };
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('数组触发 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = [50];
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('Symbol 触发 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = Symbol('test');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('BigInt 触发 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = 50n;
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE';
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
