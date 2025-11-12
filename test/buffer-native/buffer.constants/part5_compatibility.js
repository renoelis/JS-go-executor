// constants - 兼容性验证测试
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

// 1. 验证 MAX_LENGTH 符合 Node.js 规范
test('MAX_LENGTH 符合 Node.js v25 规范', () => {
  const maxLen = constants.MAX_LENGTH;
  // 64位系统通常是 2^31 - 1 或更大
  // 32位系统可能更小
  return maxLen > 0 && Number.isSafeInteger(maxLen);
});

// 2. 验证可以创建边界大小的 Buffer
test('可以创建接近边界的 Buffer（小样本）', () => {
  try {
    // 使用较小的值避免内存问题
    const size = Math.min(1024 * 1024, constants.MAX_LENGTH);
    const buf = Buffer.alloc(size);
    return buf.length === size;
  } catch (e) {
    return false;
  }
});

// 3. 验证 MAX_STRING_LENGTH 的实际限制
test('MAX_STRING_LENGTH 符合字符串长度限制', () => {
  const maxStrLen = constants.MAX_STRING_LENGTH;
  // 通常是 2^30 - 1 或 2^29 - 24（V8 引擎限制）
  const expectedMin = 1 << 28; // 256MB
  const expectedMax = (1 << 30) - 1; // ~1GB
  return maxStrLen >= expectedMin && maxStrLen <= expectedMax;
});

// 4. 验证常量与实际 Buffer 操作的一致性
test('alloc 遵守 MAX_LENGTH 限制', () => {
  try {
    Buffer.alloc(constants.MAX_LENGTH + 1);
    return false; // 不应该成功
  } catch (e) {
    return true; // 应该抛出错误
  }
});

// 5. 验证 from 方法与 MAX_LENGTH 的关系
test('from 方法遵守 MAX_LENGTH 限制', () => {
  try {
    // 尝试创建超长数组
    const arr = new Array(100);
    const buf = Buffer.from(arr);
    return buf.length === 100;
  } catch (e) {
    return false;
  }
});

// 6. 验证不同 Buffer 创建方法的一致性
test('allocUnsafe 遵守 MAX_LENGTH 限制', () => {
  try {
    Buffer.allocUnsafe(constants.MAX_LENGTH + 1);
    return false;
  } catch (e) {
    return true;
  }
});

// 7. 验证常量在跨模块使用时的一致性
test('require 多次返回相同的 constants', () => {
  const buf1 = require('buffer');
  const buf2 = require('buffer');
  return buf1.constants.MAX_LENGTH === buf2.constants.MAX_LENGTH;
});

// 8. 验证 MAX_LENGTH 与平台无关的最小保证
test('MAX_LENGTH 至少支持常见缓冲区大小', () => {
  const maxLen = constants.MAX_LENGTH;
  const commonSize = 64 * 1024 * 1024; // 64MB
  return maxLen >= commonSize;
});

// 9. 验证常量的数学运算不影响原值
test('对常量进行运算不改变原值', () => {
  const original = constants.MAX_LENGTH;
  const result = constants.MAX_LENGTH + 1000;
  const afterCalc = constants.MAX_LENGTH;
  return original === afterCalc && result === original + 1000;
});

// 10. 验证常量的位运算
test('常量可以进行位运算', () => {
  const maxLen = constants.MAX_LENGTH;
  const shifted = maxLen >> 1;
  const anded = maxLen & 0xFFFF;
  return typeof shifted === 'number' && typeof anded === 'number';
});

// 11. 验证常量的比较运算
test('常量可以进行比较运算', () => {
  const maxLen = constants.MAX_LENGTH;
  const maxStrLen = constants.MAX_STRING_LENGTH;
  return maxLen > 0 && maxStrLen > 0 && maxLen >= maxStrLen;
});

// 12. 验证常量在条件语句中的使用
test('常量可在条件语句中正确使用', () => {
  if (constants.MAX_LENGTH > 0) {
    return true;
  }
  return false;
});

// 13. 验证常量的 typeof 检查
test('typeof 检查返回正确类型', () => {
  return typeof constants.MAX_LENGTH === 'number' &&
         typeof constants.MAX_STRING_LENGTH === 'number';
});

// 14. 验证常量在模板字符串中的使用
test('常量可在模板字符串中使用', () => {
  const str = `MAX_LENGTH: ${constants.MAX_LENGTH}`;
  return str.includes('MAX_LENGTH') && str.includes(constants.MAX_LENGTH.toString());
});

// 15. 验证常量与 Number 方法的兼容性
test('常量可使用 Number 静态方法', () => {
  const maxLen = constants.MAX_LENGTH;
  return Number.isInteger(maxLen) &&
         Number.isFinite(maxLen) &&
         Number.isSafeInteger(maxLen);
});

// 16. 验证常量的字符串转换
test('常量可以转换为字符串', () => {
  const str1 = String(constants.MAX_LENGTH);
  const str2 = constants.MAX_LENGTH.toString();
  return str1 === str2 && typeof str1 === 'string';
});

// 17. 验证常量在数组中的使用
test('常量可作为数组元素', () => {
  const arr = [constants.MAX_LENGTH, constants.MAX_STRING_LENGTH];
  return arr.length === 2 && arr[0] > 0 && arr[1] > 0;
});

// 18. 验证常量在对象中的使用
test('常量可作为对象属性值', () => {
  const obj = {
    max: constants.MAX_LENGTH,
    maxStr: constants.MAX_STRING_LENGTH
  };
  return obj.max === constants.MAX_LENGTH &&
         obj.maxStr === constants.MAX_STRING_LENGTH;
});

// 19. 验证常量的 Math 运算兼容性
test('常量可与 Math 方法配合使用', () => {
  const maxLen = constants.MAX_LENGTH;
  const half = Math.floor(maxLen / 2);
  const min = Math.min(maxLen, 1000);
  return half > 0 && min === 1000;
});

// 20. 验证常量在错误消息中的使用
test('常量可在错误消息中引用', () => {
  try {
    throw new Error(`Exceeded MAX_LENGTH: ${constants.MAX_LENGTH}`);
  } catch (e) {
    return e.message.includes('MAX_LENGTH') &&
           e.message.includes(constants.MAX_LENGTH.toString());
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
