// buffer.constants - Constants Tests
const { constants } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 基本存在性测试
test('constants 对象存在', () => {
  return constants !== undefined && typeof constants === 'object';
});

test('MAX_LENGTH 存在', () => {
  return constants.MAX_LENGTH !== undefined;
});

test('MAX_STRING_LENGTH 存在', () => {
  return constants.MAX_STRING_LENGTH !== undefined;
});

// 值类型测试
test('MAX_LENGTH 是数字', () => {
  return typeof constants.MAX_LENGTH === 'number';
});

test('MAX_STRING_LENGTH 是数字', () => {
  return typeof constants.MAX_STRING_LENGTH === 'number';
});

// 值范围测试
test('MAX_LENGTH 是正数', () => {
  return constants.MAX_LENGTH > 0;
});

test('MAX_STRING_LENGTH 是正数', () => {
  return constants.MAX_STRING_LENGTH > 0;
});

test('MAX_LENGTH 是整数', () => {
  return Number.isInteger(constants.MAX_LENGTH);
});

test('MAX_STRING_LENGTH 是整数', () => {
  return Number.isInteger(constants.MAX_STRING_LENGTH);
});

// 关系测试
test('MAX_STRING_LENGTH <= MAX_LENGTH', () => {
  return constants.MAX_STRING_LENGTH <= constants.MAX_LENGTH;
});

// 实际使用测试
test('Buffer.alloc() 不能超过 MAX_LENGTH', () => {
  try {
    Buffer.alloc(constants.MAX_LENGTH + 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer.alloc() 可以分配小于 MAX_LENGTH 的大小', () => {
  try {
    const buf = Buffer.alloc(100);
    return buf.length === 100;
  } catch (e) {
    return false;
  }
});

// 常量不可修改（只读）
test('MAX_LENGTH 是只读的', () => {
  const original = constants.MAX_LENGTH;
  try {
    constants.MAX_LENGTH = 999;
    return constants.MAX_LENGTH === original;
  } catch (e) {
    return true; // 严格模式下会抛出错误
  }
});

test('MAX_STRING_LENGTH 是只读的', () => {
  const original = constants.MAX_STRING_LENGTH;
  try {
    constants.MAX_STRING_LENGTH = 999;
    return constants.MAX_STRING_LENGTH === original;
  } catch (e) {
    return true;
  }
});

// 平台相关性测试
test('MAX_LENGTH 值合理（通常是 2^31-1 或 2^32-1）', () => {
  const maxLength = constants.MAX_LENGTH;
  // 在 64 位系统上通常是 2^31-1 (2147483647) 或更大
  return maxLength >= 2147483647 || maxLength === Math.pow(2, 30) - 1;
});

test('MAX_STRING_LENGTH 值合理', () => {
  const maxStrLength = constants.MAX_STRING_LENGTH;
  // 通常是 2^30-1 或 2^29-1
  return maxStrLength >= 536870888 && maxStrLength <= constants.MAX_LENGTH;
});

// 与废弃的 kMaxLength 比较（如果存在）
test('kMaxLength 等于 MAX_LENGTH（如果存在）', () => {
  const { kMaxLength } = require('buffer');
  if (kMaxLength !== undefined) {
    return kMaxLength === constants.MAX_LENGTH;
  }
  return true; // 如果不存在，测试通过
});

test('kStringMaxLength 等于 MAX_STRING_LENGTH（如果存在）', () => {
  const { kStringMaxLength } = require('buffer');
  if (kStringMaxLength !== undefined) {
    return kStringMaxLength === constants.MAX_STRING_LENGTH;
  }
  return true;
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
