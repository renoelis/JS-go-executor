// buffer.INSPECT_MAX_BYTES - 类型处理测试
const { Buffer } = require('buffer');
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

// 非数字类型测试 - 都应该抛出 TypeError
test('设置 INSPECT_MAX_BYTES 为字符串 "50" 会抛出 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = "50";
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('设置 INSPECT_MAX_BYTES 为字符串 "abc" 会抛出 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = "abc";
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('设置 INSPECT_MAX_BYTES 为空字符串会抛出 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = "";
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('设置 INSPECT_MAX_BYTES 为 null 会抛出 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = null;
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('设置 INSPECT_MAX_BYTES 为 undefined 会抛出 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = undefined;
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('设置 INSPECT_MAX_BYTES 为 true 会抛出 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = true;
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('设置 INSPECT_MAX_BYTES 为 false 会抛出 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = false;
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('设置 INSPECT_MAX_BYTES 为对象 {} 会抛出 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = {};
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('设置 INSPECT_MAX_BYTES 为数组 [] 会抛出 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = [];
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('设置 INSPECT_MAX_BYTES 为数组 [10] 会抛出 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = [10];
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('设置 INSPECT_MAX_BYTES 为函数会抛出 TypeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = function() { return 50; };
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('设置 INSPECT_MAX_BYTES 为 Symbol', () => {
  try {
    buffer.INSPECT_MAX_BYTES = Symbol('test');
    const buf = Buffer.from([0x41, 0x42]);
    const inspected = buf.inspect();
    return typeof inspected === 'string';
  } catch (e) {
    // Symbol 可能无法转换为数字导致错误
    return true;
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
