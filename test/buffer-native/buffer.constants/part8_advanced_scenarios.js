// Buffer.constants - 组合场景与高级测试（第4轮补充）
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

// 1. 验证 constants 在严格模式下的行为
test('严格模式下 constants 属性受保护', () => {
  'use strict';
  try {
    constants.MAX_LENGTH = 999;
    return constants.MAX_LENGTH !== 999;
  } catch (e) {
    return true; // 严格模式可能抛出错误
  }
});

// 2. 验证 Object.seal 对 constants 的影响
test('Object.seal 不影响现有属性访问', () => {
  const original = constants.MAX_LENGTH;
  try {
    Object.seal(constants);
  } catch (e) {
    // 可能已经被 sealed
  }
  return constants.MAX_LENGTH === original;
});

// 3. 验证 Object.freeze 对 constants 的影响
test('Object.freeze 不影响现有属性访问', () => {
  const original = constants.MAX_STRING_LENGTH;
  try {
    Object.freeze(constants);
  } catch (e) {
    // 可能已经被 frozen
  }
  return constants.MAX_STRING_LENGTH === original;
});

// 4. 验证 constants 解构赋值行为
test('constants 可以正确解构赋值', () => {
  try {
    const { MAX_LENGTH, MAX_STRING_LENGTH } = constants;
    return MAX_LENGTH === constants.MAX_LENGTH && 
           MAX_STRING_LENGTH === constants.MAX_STRING_LENGTH;
  } catch (e) {
    return false;
  }
});

// 5. 验证 constants 属性的枚举顺序
test('constants 属性枚举顺序稳定', () => {
  const keys1 = Object.keys(constants);
  const keys2 = Object.keys(constants);
  if (keys1.length !== keys2.length) return false;
  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i]) return false;
  }
  return true;
});

// 6. 验证 MAX_LENGTH 在二进制操作中的表现
test('MAX_LENGTH 的二进制操作', () => {
  const xor = constants.MAX_LENGTH ^ 0;
  const or = constants.MAX_LENGTH | 0;
  const and = constants.MAX_LENGTH & 0xFFFFFFFF;
  return typeof xor === 'number' && typeof or === 'number' && typeof and === 'number';
});

// 7. 验证 MAX_STRING_LENGTH 的模运算
test('MAX_STRING_LENGTH 可以进行模运算', () => {
  const mod = constants.MAX_STRING_LENGTH % 1000;
  return typeof mod === 'number' && mod >= 0;
});

// 8. 验证常量在三元运算符中的使用
test('常量可在三元运算符中使用', () => {
  const result = constants.MAX_LENGTH > 0 ? 'positive' : 'negative';
  return result === 'positive';
});

// 9. 验证常量在 switch 语句中的使用
test('常量可在 switch 语句中使用', () => {
  let matched = false;
  switch (constants.MAX_LENGTH) {
    case 9007199254740991:
      matched = true;
      break;
    default:
      matched = false;
  }
  return matched;
});

// 10. 验证常量与解构赋值的默认值
test('解构赋值可使用常量作为默认值', () => {
  const { nonexistent = constants.MAX_LENGTH } = {};
  return nonexistent === constants.MAX_LENGTH;
});

// 11. 验证常量在数组方法中的使用
test('常量可用于数组方法', () => {
  const arr = [1, 2, 3, 4, 5];
  const filtered = arr.filter(x => x < constants.MAX_LENGTH);
  return filtered.length === 5;
});

// 12. 验证常量在 map 中的使用
test('常量可作为 Map 的键', () => {
  const map = new Map();
  map.set(constants.MAX_LENGTH, 'max_length');
  return map.get(constants.MAX_LENGTH) === 'max_length';
});

// 13. 验证常量在 Set 中的使用
test('常量可作为 Set 的元素', () => {
  const set = new Set();
  set.add(constants.MAX_LENGTH);
  set.add(constants.MAX_STRING_LENGTH);
  return set.size === 2 &&
         set.has(constants.MAX_LENGTH) &&
         set.has(constants.MAX_STRING_LENGTH);
});

// 14. 验证常量在 WeakMap 中不能作为键
test('常量（原始类型）不能作为 WeakMap 的键', () => {
  const wm = new WeakMap();
  try {
    wm.set(constants.MAX_LENGTH, 'value');
    return false; // 不应该成功
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('key');
  }
});

// 15. 验证常量对象可以作为 WeakMap 的键
test('constants 对象可以作为 WeakMap 的键', () => {
  const wm = new WeakMap();
  try {
    wm.set(constants, 'metadata');
    return wm.get(constants) === 'metadata';
  } catch (e) {
    return false;
  }
});

// 16. 验证常量在正则表达式中的使用
test('常量可用于构造正则表达式', () => {
  const pattern = new RegExp(constants.MAX_LENGTH.toString());
  return pattern.test('9007199254740991');
});

// 17. 验证常量与 Promise 的配合
test('常量可在 Promise 中使用', async () => {
  try {
    const result = await Promise.resolve(constants.MAX_LENGTH);
    return result === constants.MAX_LENGTH;
  } catch (e) {
    return false;
  }
});

// 18. 验证常量在 async/await 中的使用
test('常量可在 async 函数中使用', async () => {
  async function getMax() {
    return constants.MAX_STRING_LENGTH;
  }
  try {
    const result = await getMax();
    return result === constants.MAX_STRING_LENGTH;
  } catch (e) {
    return false;
  }
});

// 19. 验证常量在生成器函数中的使用
test('常量可在生成器中使用', () => {
  function* gen() {
    yield constants.MAX_LENGTH;
    yield constants.MAX_STRING_LENGTH;
  }
  const g = gen();
  const val1 = g.next().value;
  const val2 = g.next().value;
  return val1 === constants.MAX_LENGTH && val2 === constants.MAX_STRING_LENGTH;
});

// 20. 验证常量对象在 JSON.parse reviver 中的使用
test('constants 值可在 JSON reviver 中使用', () => {
  const json = '{"max": 9007199254740991}';
  const parsed = JSON.parse(json, (key, value) => {
    if (key === 'max' && value === constants.MAX_LENGTH) {
      return 'matched';
    }
    return value;
  });
  return parsed.max === 'matched';
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
