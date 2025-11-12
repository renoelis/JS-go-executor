// constants - 不可变性测试
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

// 1. 尝试修改 MAX_LENGTH（严格模式下应失败或静默忽略）
test('尝试修改 MAX_LENGTH 应该失败或被忽略', () => {
  const original = constants.MAX_LENGTH;
  try {
    constants.MAX_LENGTH = 999;
  } catch (e) {
    // 严格模式下可能抛出错误
  }
  return constants.MAX_LENGTH === original;
});

// 2. 尝试修改 MAX_STRING_LENGTH
test('尝试修改 MAX_STRING_LENGTH 应该失败或被忽略', () => {
  const original = constants.MAX_STRING_LENGTH;
  try {
    constants.MAX_STRING_LENGTH = 999;
  } catch (e) {
    // 严格模式下可能抛出错误
  }
  return constants.MAX_STRING_LENGTH === original;
});

// 3. 尝试删除 MAX_LENGTH 属性
test('尝试删除 MAX_LENGTH 应该失败', () => {
  const hadProperty = 'MAX_LENGTH' in constants;
  try {
    delete constants.MAX_LENGTH;
  } catch (e) {
    // 可能抛出错误
  }
  return 'MAX_LENGTH' in constants && hadProperty;
});

// 4. 尝试删除 MAX_STRING_LENGTH 属性
test('尝试删除 MAX_STRING_LENGTH 应该失败', () => {
  const hadProperty = 'MAX_STRING_LENGTH' in constants;
  try {
    delete constants.MAX_STRING_LENGTH;
  } catch (e) {
    // 可能抛出错误
  }
  return 'MAX_STRING_LENGTH' in constants && hadProperty;
});

// 5. 尝试添加新属性到 constants（可能成功，因为对象不一定被冻结）
test('尝试添加新属性后原有属性不变', () => {
  const originalMax = constants.MAX_LENGTH;
  const originalMaxStr = constants.MAX_STRING_LENGTH;
  try {
    constants.NEW_PROP = 12345;
  } catch (e) {
    // 可能抛出错误
  }
  // 确保原有属性值不变
  return constants.MAX_LENGTH === originalMax && constants.MAX_STRING_LENGTH === originalMaxStr;
});

// 6. 尝试用 Object.assign 修改
test('Object.assign 不应改变原 constants', () => {
  const original = constants.MAX_LENGTH;
  try {
    Object.assign(constants, { MAX_LENGTH: 888 });
  } catch (e) {
    // 可能失败
  }
  return constants.MAX_LENGTH === original;
});

// 7. 检查属性描述符 - MAX_LENGTH 可写性
test('MAX_LENGTH 应该是只读的（writable: false）', () => {
  const desc = Object.getOwnPropertyDescriptor(constants, 'MAX_LENGTH');
  if (!desc) return false;
  return desc.writable === false || desc.writable === undefined;
});

// 8. 检查属性描述符 - MAX_STRING_LENGTH 可写性
test('MAX_STRING_LENGTH 应该是只读的（writable: false）', () => {
  const desc = Object.getOwnPropertyDescriptor(constants, 'MAX_STRING_LENGTH');
  if (!desc) return false;
  return desc.writable === false || desc.writable === undefined;
});

// 9. 检查属性描述符 - MAX_LENGTH 可配置性
test('MAX_LENGTH 应该是不可配置的（configurable: false）', () => {
  const desc = Object.getOwnPropertyDescriptor(constants, 'MAX_LENGTH');
  if (!desc) return false;
  return desc.configurable === false;
});

// 10. 检查属性描述符 - MAX_STRING_LENGTH 可配置性
test('MAX_STRING_LENGTH 应该是不可配置的（configurable: false）', () => {
  const desc = Object.getOwnPropertyDescriptor(constants, 'MAX_STRING_LENGTH');
  if (!desc) return false;
  return desc.configurable === false;
});

// 11. 尝试重定义属性
test('不能用 defineProperty 重定义 MAX_LENGTH', () => {
  const original = constants.MAX_LENGTH;
  let failed = false;
  try {
    Object.defineProperty(constants, 'MAX_LENGTH', {
      value: 777,
      writable: true
    });
  } catch (e) {
    failed = true;
  }
  return (constants.MAX_LENGTH === original) || failed;
});

// 12. 检查对象属性的保护级别
test('constants 属性应该受到保护', () => {
  // 虽然对象可能不完全冻结，但重要属性应该是只读的
  const desc1 = Object.getOwnPropertyDescriptor(constants, 'MAX_LENGTH');
  const desc2 = Object.getOwnPropertyDescriptor(constants, 'MAX_STRING_LENGTH');
  return desc1 && desc2 && desc1.writable === false && desc2.writable === false;
});

// 13. 尝试修改后验证值完整性
test('任何修改尝试后值应保持完整', () => {
  const maxLen = constants.MAX_LENGTH;
  const maxStrLen = constants.MAX_STRING_LENGTH;

  try {
    constants.MAX_LENGTH = 0;
    constants.MAX_STRING_LENGTH = 0;
    delete constants.MAX_LENGTH;
  } catch (e) {
    // 忽略错误
  }

  return constants.MAX_LENGTH === maxLen &&
         constants.MAX_STRING_LENGTH === maxStrLen;
});

// 14. 验证 constants 对象本身不能被替换
test('不能替换整个 constants 对象', () => {
  const original = constants;
  try {
    constants = { MAX_LENGTH: 100 };
  } catch (e) {
    // 可能抛出错误
  }
  return constants === original;
});

// 15. 使用 spread 操作符不影响原对象
test('使用 spread 复制不影响原 constants', () => {
  const original = constants.MAX_LENGTH;
  const copy = { ...constants };
  copy.MAX_LENGTH = 555;
  return constants.MAX_LENGTH === original;
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
