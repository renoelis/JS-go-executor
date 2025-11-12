// Buffer.constants - 基本属性测试
const buffer = require('buffer');
const constants = buffer.constants;

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 1. constants 属性存在性
test('buffer.constants 应该存在', () => {
  return constants !== undefined && constants !== null;
});

// 2. constants 是对象类型
test('buffer.constants 应该是对象', () => {
  return typeof constants === 'object';
});

// 3. MAX_LENGTH 属性存在
test('constants.MAX_LENGTH 应该存在', () => {
  return 'MAX_LENGTH' in constants;
});

// 4. MAX_STRING_LENGTH 属性存在
test('constants.MAX_STRING_LENGTH 应该存在', () => {
  return 'MAX_STRING_LENGTH' in constants;
});

// 5. MAX_LENGTH 是数字类型
test('constants.MAX_LENGTH 应该是数字', () => {
  return typeof constants.MAX_LENGTH === 'number';
});

// 6. MAX_STRING_LENGTH 是数字类型
test('constants.MAX_STRING_LENGTH 应该是数字', () => {
  return typeof constants.MAX_STRING_LENGTH === 'number';
});

// 7. MAX_LENGTH 是整数
test('constants.MAX_LENGTH 应该是整数', () => {
  return Number.isInteger(constants.MAX_LENGTH);
});

// 8. MAX_STRING_LENGTH 是整数
test('constants.MAX_STRING_LENGTH 应该是整数', () => {
  return Number.isInteger(constants.MAX_STRING_LENGTH);
});

// 9. MAX_LENGTH 大于 0
test('constants.MAX_LENGTH 应该大于 0', () => {
  return constants.MAX_LENGTH > 0;
});

// 10. MAX_STRING_LENGTH 大于 0
test('constants.MAX_STRING_LENGTH 应该大于 0', () => {
  return constants.MAX_STRING_LENGTH > 0;
});

// 11. MAX_LENGTH 是有限数
test('constants.MAX_LENGTH 应该是有限数', () => {
  return Number.isFinite(constants.MAX_LENGTH);
});

// 12. MAX_STRING_LENGTH 是有限数
test('constants.MAX_STRING_LENGTH 应该是有限数', () => {
  return Number.isFinite(constants.MAX_STRING_LENGTH);
});

// 13. 不包含 NaN 值
test('buffer.constants 不应包含 NaN', () => {
  const keys = Object.keys(constants);
  for (let i = 0; i < keys.length; i++) {
    if (Number.isNaN(constants[keys[i]])) {
      return false;
    }
  }
  return true;
});

// 14. 不包含 Infinity 值
test('buffer.constants 不应包含 Infinity', () => {
  const keys = Object.keys(constants);
  for (let i = 0; i < keys.length; i++) {
    const val = constants[keys[i]];
    if (val === Infinity || val === -Infinity) {
      return false;
    }
  }
  return true;
});

// 15. 属性可枚举性检查
test('buffer.constants 的主要属性应该可枚举', () => {
  const keys = Object.keys(constants);
  return keys.length >= 2;
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
