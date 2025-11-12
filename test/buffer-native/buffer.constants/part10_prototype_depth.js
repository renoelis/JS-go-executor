// Buffer.constants - 深度补漏：原型链与对象特性（第6轮）
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

// === 原型链深度测试 ===

// 1. constants 使用 null prototype
test('constants 的直接原型是 null prototype 对象', () => {
  const proto = Object.getPrototypeOf(constants);
  return proto !== null && Object.getPrototypeOf(proto) === null;
});

// 2. __proto__ 访问器
test('constants.__proto__ 指向 null prototype', () => {
  return constants.__proto__ !== null &&
         Object.getPrototypeOf(constants.__proto__) === null;
});

// 3. 原型链只有两层
test('constants 原型链深度为 2', () => {
  let depth = 0;
  let obj = constants;
  while (obj !== null) {
    obj = Object.getPrototypeOf(obj);
    depth++;
  }
  return depth === 2; // constants -> null prototype -> null
});

// 4. 继承自 Object（通过原型链）
test('constants instanceof Object 为 true', () => {
  return constants instanceof Object;
});

// 5. Object.prototype 在原型链中
test('Object.prototype.isPrototypeOf(constants) 为 true', () => {
  return Object.prototype.isPrototypeOf(constants);
});

// === 对象状态深度测试 ===

// 6. constants 对象是可扩展的
test('Object.isExtensible(constants) 为 true', () => {
  return Object.isExtensible(constants) === true;
});

// 7. constants 对象未被冻结
test('Object.isFrozen(constants) 为 false', () => {
  return Object.isFrozen(constants) === false;
});

// 8. constants 对象未被密封
test('Object.isSealed(constants) 为 false', () => {
  return Object.isSealed(constants) === false;
});

// 9. 可以添加新属性（但不影响原有属性）
test('可以向 constants 添加新属性', () => {
  try {
    constants.TEST_PROP = 999;
    const added = 'TEST_PROP' in constants;
    delete constants.TEST_PROP; // 清理
    return added;
  } catch (e) {
    return false;
  }
});

// 10. 无法修改已有属性值
test('无法修改 MAX_LENGTH 的值', () => {
  const original = constants.MAX_LENGTH;
  try {
    constants.MAX_LENGTH = 12345;
  } catch (e) {
    // 严格模式可能抛错
  }
  return constants.MAX_LENGTH === original;
});

// === 属性枚举性测试 ===

// 11. MAX_LENGTH 是可枚举的
test('MAX_LENGTH 的 enumerable 为 true', () => {
  const desc = Object.getOwnPropertyDescriptor(constants, 'MAX_LENGTH');
  return desc && desc.enumerable === true;
});

// 12. MAX_STRING_LENGTH 是可枚举的
test('MAX_STRING_LENGTH 的 enumerable 为 true', () => {
  const desc = Object.getOwnPropertyDescriptor(constants, 'MAX_STRING_LENGTH');
  return desc && desc.enumerable === true;
});

// 13. propertyIsEnumerable 正确工作
test('propertyIsEnumerable 对两个属性返回 true', () => {
  return constants.propertyIsEnumerable('MAX_LENGTH') &&
         constants.propertyIsEnumerable('MAX_STRING_LENGTH');
});

// 14. 非存在属性的 propertyIsEnumerable
test('propertyIsEnumerable 对不存在的属性返回 false', () => {
  return constants.propertyIsEnumerable('NONEXISTENT') === false;
});

// === Symbol 属性测试 ===

// 15. constants 没有 Symbol 属性
test('Object.getOwnPropertySymbols 返回空数组', () => {
  const symbols = Object.getOwnPropertySymbols(constants);
  return Array.isArray(symbols) && symbols.length === 0;
});

// 16. 没有 Symbol.toStringTag
test('Symbol.toStringTag 未定义', () => {
  return constants[Symbol.toStringTag] === undefined;
});

// 17. 没有 Symbol.iterator
test('Symbol.iterator 未定义', () => {
  return constants[Symbol.iterator] === undefined;
});

// 18. 没有 Symbol.toPrimitive
test('Symbol.toPrimitive 未定义', () => {
  return constants[Symbol.toPrimitive] === undefined;
});

// === 方法继承测试 ===

// 19. hasOwnProperty 方法可用
test('constants.hasOwnProperty 方法存在', () => {
  return typeof constants.hasOwnProperty === 'function';
});

// 20. toString 继承自 Object.prototype
test('constants.toString 继承自 Object.prototype', () => {
  return constants.toString === Object.prototype.toString;
});

// 21. valueOf 继承自 Object.prototype
test('constants.valueOf 继承自 Object.prototype', () => {
  return constants.valueOf === Object.prototype.valueOf;
});

// 22. isPrototypeOf 方法可用
test('constants.isPrototypeOf 方法存在', () => {
  return typeof constants.isPrototypeOf === 'function';
});

// 23. toLocaleString 继承自 Object.prototype
test('constants.toLocaleString 继承自 Object.prototype', () => {
  return constants.toLocaleString === Object.prototype.toLocaleString;
});

// === Object.create 测试 ===

// 24. 可以基于 constants 创建对象
test('Object.create(constants) 可以工作', () => {
  const obj = Object.create(constants);
  return obj !== null && Object.getPrototypeOf(obj) === constants;
});

// 25. 基于 constants 创建的对象可以访问属性
test('Object.create(constants) 的对象可以访问 MAX_LENGTH', () => {
  const obj = Object.create(constants);
  return obj.MAX_LENGTH === constants.MAX_LENGTH;
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
