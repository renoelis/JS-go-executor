// constants - 边界场景测试
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

// 1. 在不同上下文中访问 constants
test('从局部变量访问 constants', () => {
  const bufferModule = require('buffer');
  return bufferModule.constants.MAX_LENGTH === constants.MAX_LENGTH;
});

// 2. 解构访问
test('解构访问 constants 属性', () => {
  const { MAX_LENGTH, MAX_STRING_LENGTH } = constants;
  return typeof MAX_LENGTH === 'number' && typeof MAX_STRING_LENGTH === 'number';
});

// 3. 通过字符串键访问
test('通过字符串键访问属性', () => {
  const key1 = 'MAX_LENGTH';
  const key2 = 'MAX_STRING_LENGTH';
  return typeof constants[key1] === 'number' &&
         typeof constants[key2] === 'number';
});

// 4. 验证不存在的属性返回 undefined
test('访问不存在的属性返回 undefined', () => {
  return constants.NON_EXISTENT === undefined;
});

// 5. 验证 hasOwnProperty
test('hasOwnProperty 正确检测属性', () => {
  return constants.hasOwnProperty('MAX_LENGTH') &&
         constants.hasOwnProperty('MAX_STRING_LENGTH');
});

// 6. 验证 in 操作符
test('in 操作符正确检测属性', () => {
  return 'MAX_LENGTH' in constants &&
         'MAX_STRING_LENGTH' in constants;
});

// 7. Object.keys 返回预期属性
test('Object.keys 返回所有可枚举属性', () => {
  const keys = Object.keys(constants);
  return keys.includes('MAX_LENGTH') && keys.includes('MAX_STRING_LENGTH');
});

// 8. Object.values 返回数字数组
test('Object.values 返回有效数字', () => {
  const values = Object.values(constants);
  return values.length >= 2 && values.every(v => typeof v === 'number' && v > 0);
});

// 9. Object.entries 返回键值对
test('Object.entries 返回正确的键值对', () => {
  const entries = Object.entries(constants);
  const hasMaxLength = entries.some(([k, v]) => k === 'MAX_LENGTH' && typeof v === 'number');
  const hasMaxStrLength = entries.some(([k, v]) => k === 'MAX_STRING_LENGTH' && typeof v === 'number');
  return hasMaxLength && hasMaxStrLength;
});

// 10. for...in 遍历
test('for...in 可以遍历 constants', () => {
  let count = 0;
  let hasMaxLength = false;
  let hasMaxStrLength = false;

  for (const key in constants) {
    count++;
    if (key === 'MAX_LENGTH') hasMaxLength = true;
    if (key === 'MAX_STRING_LENGTH') hasMaxStrLength = true;
  }

  return count >= 2 && hasMaxLength && hasMaxStrLength;
});

// 11. JSON.stringify 序列化
test('JSON.stringify 可以序列化 constants', () => {
  try {
    const json = JSON.stringify(constants);
    const parsed = JSON.parse(json);
    return parsed.MAX_LENGTH === constants.MAX_LENGTH &&
           parsed.MAX_STRING_LENGTH === constants.MAX_STRING_LENGTH;
  } catch (e) {
    return false;
  }
});

// 12. 空字符串键访问
test('空字符串键访问返回 undefined', () => {
  return constants[''] === undefined;
});

// 13. 数字键访问
test('数字键访问返回 undefined', () => {
  return constants[0] === undefined && constants[1] === undefined;
});

// 14. Symbol 键访问
test('Symbol 键访问不影响基本功能', () => {
  const sym = Symbol('test');
  const val = constants[sym];
  return val === undefined && constants.MAX_LENGTH > 0;
});

// 15. 多层解构
test('多层解构不影响值', () => {
  const bufferModule = require('buffer');
  const { constants: consts } = bufferModule;
  const { MAX_LENGTH } = consts;
  return MAX_LENGTH === constants.MAX_LENGTH;
});

// 16. 使用 Object.getOwnPropertyNames
test('Object.getOwnPropertyNames 包含所有属性', () => {
  const names = Object.getOwnPropertyNames(constants);
  return names.includes('MAX_LENGTH') && names.includes('MAX_STRING_LENGTH');
});

// 17. 验证属性值类型一致性
test('所有属性值都是数字类型', () => {
  const keys = Object.keys(constants);
  for (let i = 0; i < keys.length; i++) {
    if (typeof constants[keys[i]] !== 'number') {
      return false;
    }
  }
  return true;
});

// 18. 验证 toString 方法存在
test('constants 对象有 toString 方法', () => {
  return typeof constants.toString === 'function';
});

// 19. 验证 valueOf 方法存在
test('constants 对象有 valueOf 方法', () => {
  return typeof constants.valueOf === 'function';
});

// 20. 检查原型链
test('constants 对象有正确的原型', () => {
  const proto = Object.getPrototypeOf(constants);
  return proto === Object.prototype || proto !== null;
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
