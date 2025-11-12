// Buffer.constants - 精确值验证测试（第2轮补充）
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

// 1. MAX_LENGTH 精确值验证（64位系统）
test('MAX_LENGTH 应该等于 Number.MAX_SAFE_INTEGER', () => {
  // 在64位系统上，MAX_LENGTH = 2^53 - 1
  return constants.MAX_LENGTH === Number.MAX_SAFE_INTEGER;
});

// 2. MAX_LENGTH 的二进制表示
test('MAX_LENGTH 应该是 2^53 - 1', () => {
  const expected = Math.pow(2, 53) - 1;
  return constants.MAX_LENGTH === expected;
});

// 3. MAX_LENGTH 的十进制精确值
test('MAX_LENGTH 应该是 9007199254740991', () => {
  return constants.MAX_LENGTH === 9007199254740991;
});

// 4. MAX_STRING_LENGTH 的合理范围
test('MAX_STRING_LENGTH 应该小于 MAX_LENGTH', () => {
  return constants.MAX_STRING_LENGTH < constants.MAX_LENGTH;
});

// 5. MAX_STRING_LENGTH 不应该是 MAX_SAFE_INTEGER
test('MAX_STRING_LENGTH 应该远小于 MAX_LENGTH', () => {
  // MAX_STRING_LENGTH 通常是 2^29 - 24 或类似值
  return constants.MAX_STRING_LENGTH < constants.MAX_LENGTH / 10;
});

// 6. 验证 kMaxLength 别名（如果存在）
test('buffer.kMaxLength 应该等于 constants.MAX_LENGTH', () => {
  if (buffer.kMaxLength !== undefined) {
    return buffer.kMaxLength === constants.MAX_LENGTH;
  }
  return true; // 如果不存在，跳过
});

// 7. 验证 kStringMaxLength 别名（如果存在）
test('buffer.kStringMaxLength 应该等于 constants.MAX_STRING_LENGTH', () => {
  if (buffer.kStringMaxLength !== undefined) {
    return buffer.kStringMaxLength === constants.MAX_STRING_LENGTH;
  }
  return true;
});

// 8. MAX_STRING_LENGTH 应该是 2^29 - 24
test('MAX_STRING_LENGTH 验证具体值', () => {
  // Node.js v8+ 通常是 (2^29 - 24) = 536870888
  const expected = Math.pow(2, 29) - 24;
  return constants.MAX_STRING_LENGTH === expected;
});

// 9. 验证常量不是负数
test('MAX_LENGTH 和 MAX_STRING_LENGTH 都是正整数', () => {
  return constants.MAX_LENGTH > 0 &&
         constants.MAX_STRING_LENGTH > 0 &&
         Number.isInteger(constants.MAX_LENGTH) &&
         Number.isInteger(constants.MAX_STRING_LENGTH);
});

// 10. 验证常量在 JavaScript 安全整数范围内
test('两个常量都是安全整数', () => {
  return Number.isSafeInteger(constants.MAX_LENGTH) &&
         Number.isSafeInteger(constants.MAX_STRING_LENGTH);
});

// 11. MAX_LENGTH 的位数
test('MAX_LENGTH 应该是 53 位二进制', () => {
  const bitLength = constants.MAX_LENGTH.toString(2).length;
  return bitLength === 53;
});

// 12. MAX_STRING_LENGTH 的位数
test('MAX_STRING_LENGTH 位数合理', () => {
  const bitLength = constants.MAX_STRING_LENGTH.toString(2).length;
  // 应该在 29-30 位之间
  return bitLength >= 29 && bitLength <= 30;
});

// 13. 验证常量的十六进制表示
test('MAX_LENGTH 的十六进制值', () => {
  const hex = constants.MAX_LENGTH.toString(16);
  return hex === '1fffffffffffff';
});

// 14. 验证 MAX_STRING_LENGTH 的合理性（V8 限制）
test('MAX_STRING_LENGTH 符合 V8 字符串长度限制', () => {
  // V8 引擎的字符串长度限制
  const v8Limit = (1 << 29) - 24; // 536870888
  return constants.MAX_STRING_LENGTH === v8Limit;
});

// 15. 验证两个常量的比例关系
test('MAX_LENGTH 应该是 MAX_STRING_LENGTH 的数倍', () => {
  const ratio = constants.MAX_LENGTH / constants.MAX_STRING_LENGTH;
  return ratio > 1000; // 应该相差很多倍
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
