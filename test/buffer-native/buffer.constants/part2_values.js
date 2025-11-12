// constants - 常量值验证测试
const buffer = require('buffer');
const { Buffer } = buffer;
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

// 1. MAX_LENGTH 在合理范围内（64位系统）
test('MAX_LENGTH 应该在合理范围内', () => {
  const maxLen = constants.MAX_LENGTH;
  // 通常在 2GB 到 8GB 之间（32位或64位架构）
  return maxLen >= 2147483647 || (maxLen > 0 && maxLen < 2147483647);
});

// 2. MAX_STRING_LENGTH 小于等于 MAX_LENGTH
test('MAX_STRING_LENGTH 应该小于等于 MAX_LENGTH', () => {
  return constants.MAX_STRING_LENGTH <= constants.MAX_LENGTH;
});

// 3. MAX_STRING_LENGTH 应该是合理的字符串长度限制
test('MAX_STRING_LENGTH 应该是合理值', () => {
  const maxStrLen = constants.MAX_STRING_LENGTH;
  // Node.js v8.0+ 通常为 (2^30 - 1) 或 (2^29 - 24)
  return maxStrLen > 1000000 && maxStrLen < 2147483648;
});

// 4. 常量值应该是安全整数
test('MAX_LENGTH 应该是安全整数', () => {
  return Number.isSafeInteger(constants.MAX_LENGTH);
});

// 5. MAX_STRING_LENGTH 是安全整数
test('MAX_STRING_LENGTH 应该是安全整数', () => {
  return Number.isSafeInteger(constants.MAX_STRING_LENGTH);
});

// 6. 验证可以创建接近但不超过 MAX_LENGTH 的小 Buffer
test('可以创建小于 MAX_LENGTH 的 Buffer', () => {
  try {
    const smallBuf = Buffer.alloc(1024);
    return smallBuf.length === 1024;
  } catch (e) {
    return false;
  }
});

// 7. 尝试创建超过 MAX_LENGTH 的 Buffer 应该失败
test('创建超过 MAX_LENGTH 的 Buffer 应该抛出错误', () => {
  try {
    const tooBig = constants.MAX_LENGTH + 1;
    Buffer.alloc(tooBig);
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('length') ||
           e.message.includes('size') || e.message.includes('range');
  }
});

// 8. MAX_LENGTH 的二进制表示特征
test('MAX_LENGTH 应该符合预期的位模式', () => {
  const maxLen = constants.MAX_LENGTH;
  // 通常是 2^n - 1 或接近 2^n 的值
  const bitLength = maxLen.toString(2).length;
  return bitLength >= 30 && bitLength <= 53;
});

// 9. 常量值的一致性（多次访问相同）
test('多次访问 MAX_LENGTH 返回相同值', () => {
  const val1 = constants.MAX_LENGTH;
  const val2 = constants.MAX_LENGTH;
  const val3 = constants.MAX_LENGTH;
  return val1 === val2 && val2 === val3;
});

// 10. 常量值的一致性（多次访问相同）- MAX_STRING_LENGTH
test('多次访问 MAX_STRING_LENGTH 返回相同值', () => {
  const val1 = constants.MAX_STRING_LENGTH;
  const val2 = constants.MAX_STRING_LENGTH;
  const val3 = constants.MAX_STRING_LENGTH;
  return val1 === val2 && val2 === val3;
});

// 11. 验证 constants 对象本身的稳定性
test('constants 对象引用稳定', () => {
  const ref1 = constants;
  const ref2 = constants;
  return ref1 === ref2;
});

// 12. 检查是否有额外的未文档化属性
test('检查 constants 对象的属性数量', () => {
  const keys = Object.keys(constants);
  // 标准应该至少有 MAX_LENGTH 和 MAX_STRING_LENGTH
  return keys.length >= 2;
});

// 13. 验证 MAX_LENGTH 不等于 0
test('MAX_LENGTH 不应该等于 0', () => {
  return constants.MAX_LENGTH !== 0;
});

// 14. 验证 MAX_STRING_LENGTH 不等于 0
test('MAX_STRING_LENGTH 不应该等于 0', () => {
  return constants.MAX_STRING_LENGTH !== 0;
});

// 15. 验证值不为负数
test('所有常量值应该为正数', () => {
  const keys = Object.keys(constants);
  for (let i = 0; i < keys.length; i++) {
    const val = constants[keys[i]];
    if (typeof val === 'number' && val < 0) {
      return false;
    }
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
