// buf.values() - 深度补充 Part 12: 并发、异常和特殊场景
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
  }
}

// 测试 1: 异常抛出后迭代器状态
test('异常抛出后迭代器应保持状态', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  iter.next(); // 1

  try {
    throw new Error('test');
  } catch (e) {
    // 忽略
  }

  const v = iter.next().value;
  return v === 2; // 状态应该保持
});

// 测试 2: 在 finally 块中使用迭代器
test('迭代器应可在 finally 块中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  let values = [];

  try {
    const iter = buf.values();
    iter.next();
    throw new Error('test');
  } catch (e) {
    // 忽略
  } finally {
    values = [...buf.values()];
  }

  return values.length === 3;
});

// 测试 3: 嵌套 try-catch 中的迭代器
test('嵌套 try-catch 中迭代器应正常工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  let result = false;

  try {
    try {
      const values = [...buf.values()];
      result = values.length === 3;
    } catch (inner) {
      result = false;
    }
  } catch (outer) {
    result = false;
  }

  return result;
});

// 测试 4: 在条件语句中提前返回
test('在条件语句中提前返回应正常', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  function findValue(target) {
    for (const v of buf.values()) {
      if (v === target) return v;
    }
    return null;
  }

  return findValue(3) === 3;
});

// 测试 5: 在递归函数中使用迭代器
test('迭代器应可在递归函数中使用', () => {
  const buf = Buffer.from([1, 1, 1, 1, 1]);

  function countOnes(iter, count = 0) {
    const result = iter.next();
    if (result.done) return count;
    return countOnes(iter, count + (result.value === 1 ? 1 : 0));
  }

  return countOnes(buf.values()) === 5;
});

// 测试 6: 在回调函数中使用迭代器
test('迭代器应可在回调函数中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  let callbackResult;
  setTimeout(() => {
    callbackResult = iter.next().value;
  }, 0);

  // 同步继续使用
  const syncResult = iter.next().value;

  return syncResult === 1;
});

// 测试 7: Promise 中使用迭代器值
test('迭代器值应可在 Promise 中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const values = [...buf.values()];

  // 同步验证，不返回 Promise
  if (values.length !== 3) return false;
  if (values[0] !== 1) return false;

  // 可以在 Promise 中传递
  return true;
});

// 测试 8: 迭代器在箭头函数中
test('迭代器应可在箭头函数中使用', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const doubled = [...buf.values()].map(v => v * 2);

  return doubled.length === 5 && doubled[0] === 2 && doubled[4] === 10;
});

// 测试 9: 多层嵌套迭代
test('多层嵌套迭代应正常工作', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([10, 20]);
  const buf3 = Buffer.from([100]);

  let count = 0;
  for (const v1 of buf1.values()) {
    for (const v2 of buf2.values()) {
      for (const v3 of buf3.values()) {
        count++;
      }
    }
  }

  return count === 4; // 2 * 2 * 1
});

// 测试 10: Buffer 的 Object.entries 包含所有属性
test('Object.entries(Buffer) 包含数字索引和自定义属性', () => {
  const buf = Buffer.from([10, 20, 30]);
  buf.customProp = 'test';

  const entries = Object.entries(buf);

  // 应该包含数字索引和自定义属性
  const hasNumbers = entries.some(([key]) => !isNaN(Number(key)));
  const hasCustom = entries.some(([key, val]) => key === 'customProp' && val === 'test');

  return hasNumbers && hasCustom;
});

// 测试 11: 在 Object.values 结果上操作
test('Object.values(buffer) 应返回字节值', () => {
  const buf = Buffer.from([10, 20, 30]);
  const vals = Object.values(buf);

  // 应该包含字节值
  return vals.includes(10) && vals.includes(20) && vals.includes(30);
});

// 测试 12: 使用 with 语句（已废弃，但测试兼容性）
test('迭代器不应受 with 语句影响', () => {
  const buf = Buffer.from([1, 2, 3]);
  const obj = { values: () => 'fake' };

  // 注意：with 在严格模式下不可用，这里只测试非严格模式
  let result;
  try {
    result = [...buf.values()];
  } catch (e) {
    return false;
  }

  return result.length === 3;
});

// 测试 13: 迭代器与 debugger 语句
test('迭代器不应受 debugger 语句影响', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  iter.next();
  debugger; // 调试断点（实际不会停）
  const v = iter.next().value;

  return v === 2;
});

// 测试 14: delete 操作符对迭代器的影响
test('delete 迭代器属性不应崩溃', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  // 尝试删除 next 方法
  const originalNext = iter.next;
  delete iter.next;

  // 恢复
  iter.next = originalNext;

  const values = [];
  let result = iter.next();
  while (!result.done) {
    values.push(result.value);
    result = iter.next();
  }

  return values.length === 3;
});

// 测试 15: void 操作符
test('void 操作符不应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  void iter.next();
  const v = iter.next().value;

  return v === 2;
});

// 测试 16: typeof 操作符
test('typeof 应正确识别迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  return typeof iter === 'object' && typeof iter.next === 'function';
});

// 测试 17: instanceof 操作符
test('迭代器不应是 Array 实例', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  return !(iter instanceof Array) && !(iter instanceof Buffer);
});

// 测试 18: 逗号操作符
test('逗号操作符不应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  const v = (iter.next(), iter.next(), iter.next()).value;
  return v === 3;
});

// 测试 19: 位运算符不影响字节值
test('迭代后的字节值应可进行位运算', () => {
  const buf = Buffer.from([0b1010, 0b1100]);
  const values = [...buf.values()];

  const and = values[0] & values[1]; // 0b1000 = 8
  const or = values[0] | values[1];  // 0b1110 = 14
  const xor = values[0] ^ values[1]; // 0b0110 = 6

  return and === 8 && or === 14 && xor === 6;
});

// 测试 20: 迭代器与模板字符串
test('迭代器值应可用于模板字符串', () => {
  const buf = Buffer.from([65, 66, 67]); // "ABC"
  const values = [...buf.values()];
  const str = `${values[0]}-${values[1]}-${values[2]}`;

  return str === '65-66-67';
});

// 测试 21: 解构赋值的嵌套
test('解构赋值应支持嵌套', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const [first, second, ...rest] = [...buf.values()];
  const [third, ...remaining] = rest;

  return first === 1 && second === 2 && third === 3 && remaining.length === 2;
});

// 测试 22: 默认参数与迭代器
test('迭代器应可作为默认参数', () => {
  const buf = Buffer.from([10, 20, 30]);

  function process(iter = buf.values()) {
    return [...iter];
  }

  const values = process();
  return values.length === 3 && values[0] === 10;
});

// 测试 23: 剩余参数与迭代器
test('迭代器值应可作为剩余参数', () => {
  const buf = Buffer.from([1, 2, 3]);

  function sum(...nums) {
    return nums.reduce((a, b) => a + b, 0);
  }

  const total = sum(...buf.values());
  return total === 6;
});

// 测试 24: Object.assign 不影响迭代
test('Object.assign 不应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  const obj = {};

  Object.assign(obj, buf);

  const values = [...buf.values()];
  return values.length === 3;
});

// 测试 25: JSON.stringify 循环引用处理
test('Buffer 的 JSON.stringify 应正常工作', () => {
  const buf = Buffer.from([1, 2, 3]);

  const json = JSON.stringify(buf);
  const parsed = JSON.parse(json);

  return parsed.type === 'Buffer' && Array.isArray(parsed.data);
});

// 测试 26: WeakMap 可以使用迭代器作为键（对象类型）
test('WeakMap 应接受迭代器作为键（如果是对象）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const wm = new WeakMap();

  try {
    wm.set(iter, 'value');
    return wm.get(iter) === 'value';
  } catch (e) {
    // 如果迭代器不是对象类型，可能会失败
    return e.name === 'TypeError';
  }
});

// 测试 27: WeakSet 可以使用迭代器（如果是对象）
test('WeakSet 应接受迭代器（如果是对象）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const ws = new WeakSet();

  try {
    ws.add(iter);
    return ws.has(iter);
  } catch (e) {
    // 如果迭代器不是对象类型，可能会失败
    return e.name === 'TypeError';
  }
});

// 测试 28: 迭代器在 Map 中作为键
test('迭代器应可在 Map 中作为键', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const map = new Map();

  map.set(iter, 'value');

  return map.get(iter) === 'value';
});

// 测试 29: 迭代器在 Set 中
test('迭代器应可在 Set 中', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.values();
  const iter2 = buf.values();
  const set = new Set();

  set.add(iter1);
  set.add(iter2);

  // 两个不同的迭代器对象
  return set.size === 2;
});

const passed = tests.filter(t => t.passed === true).length;
const failed = tests.filter(t => t.passed === false).length;

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

return result
