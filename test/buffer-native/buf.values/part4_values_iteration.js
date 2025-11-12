// buf.values() - 迭代行为详细测试
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

// 测试 1：迭代器协议完整性
test('迭代器应完整实现迭代器协议', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  // 检查是否有 next 方法
  if (typeof iter.next !== 'function') return false;

  // 检查是否有 Symbol.iterator 方法
  if (typeof iter[Symbol.iterator] !== 'function') return false;

  return true;
});

// 测试 2：迭代器的 Symbol.iterator 返回自身
test('迭代器的 Symbol.iterator 应返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const iterOfIter = iter[Symbol.iterator]();
  return iter === iterOfIter;
});

// 测试 3：next() 返回对象的结构
test('next() 应返回包含 value 和 done 的对象', () => {
  const buf = Buffer.from([42]);
  const iter = buf.values();
  const result = iter.next();

  if (typeof result !== 'object') return false;
  if (!('value' in result)) return false;
  if (!('done' in result)) return false;
  if (typeof result.done !== 'boolean') return false;

  return true;
});

// 测试 4：迭代完成后持续调用 next
test('迭代完成后持续调用 next 应返回 {done: true, value: undefined}', () => {
  const buf = Buffer.from([1]);
  const iter = buf.values();

  iter.next(); // 消耗第一个值
  const result1 = iter.next();
  const result2 = iter.next();
  const result3 = iter.next();

  if (!result1.done || !result2.done || !result3.done) return false;
  if (result1.value !== undefined || result2.value !== undefined || result3.value !== undefined) return false;

  return true;
});

// 测试 5：提前退出 for...of 循环
test('提前退出 for...of 循环不应影响迭代器状态', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  let count = 0;
  for (const val of iter) {
    count++;
    if (count === 2) break;
  }

  // 继续使用同一个迭代器
  const next = iter.next();
  // 应该返回第三个值
  return next.value === 3 && next.done === false;
});

// 测试 6：使用 Array.from 带映射函数
test('Array.from 带映射函数应正确工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  const doubled = Array.from(buf.values(), x => x * 2);
  if (doubled.length !== 3) return false;
  if (doubled[0] !== 2 || doubled[1] !== 4 || doubled[2] !== 6) return false;
  return true;
});

// 测试 7：使用 reduce 消费迭代器
test('迭代器值应可用 Array 方法处理', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const values = [...buf.values()];
  const sum = values.reduce((a, b) => a + b, 0);
  return sum === 10;
});

// 测试 8：嵌套迭代
test('应支持嵌套迭代不同的迭代器', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([10, 20]);

  const results = [];
  for (const v1 of buf1.values()) {
    for (const v2 of buf2.values()) {
      results.push(v1 + v2);
    }
  }

  // 应该得到 [11, 21, 12, 22]
  if (results.length !== 4) return false;
  if (results[0] !== 11 || results[3] !== 22) return false;
  return true;
});

// 测试 9：使用解构赋值
test('迭代器应支持解构赋值', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const [first, second, ...rest] = buf.values();

  if (first !== 10 || second !== 20) return false;
  if (rest.length !== 3) return false;
  if (rest[0] !== 30 || rest[2] !== 50) return false;
  return true;
});

// 测试 10：迭代器与 filter
test('迭代器值应可用 filter 过滤', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const values = [...buf.values()];
  const evens = values.filter(x => x % 2 === 0);
  if (evens.length !== 3) return false;
  if (evens[0] !== 2 || evens[2] !== 6) return false;
  return true;
});

// 测试 11：迭代器与 map
test('迭代器值应可用 map 转换', () => {
  const buf = Buffer.from([1, 2, 3]);
  const values = [...buf.values()];
  const squared = values.map(x => x * x);
  if (squared.length !== 3) return false;
  if (squared[0] !== 1 || squared[1] !== 4 || squared[2] !== 9) return false;
  return true;
});

// 测试 12：迭代器与 every
test('迭代器值应可用 every 检查', () => {
  const buf = Buffer.from([2, 4, 6, 8]);
  const values = [...buf.values()];
  const allEven = values.every(x => x % 2 === 0);
  return allEven === true;
});

// 测试 13：迭代器与 some
test('迭代器值应可用 some 检查', () => {
  const buf = Buffer.from([1, 3, 5, 6, 7]);
  const values = [...buf.values()];
  const hasEven = values.some(x => x % 2 === 0);
  return hasEven === true;
});

// 测试 14：使用 Set 收集唯一值
test('迭代器值应可用于创建 Set', () => {
  const buf = Buffer.from([1, 2, 2, 3, 3, 3]);
  const uniqueValues = new Set(buf.values());
  if (uniqueValues.size !== 3) return false;
  if (!uniqueValues.has(1) || !uniqueValues.has(2) || !uniqueValues.has(3)) return false;
  return true;
});

// 测试 15：手动迭代并收集到数组
test('手动调用 next 迭代应与 for...of 结果一致', () => {
  const buf = Buffer.from([5, 10, 15]);
  const iter = buf.values();

  const manual = [];
  let result;
  while (!(result = iter.next()).done) {
    manual.push(result.value);
  }

  const forOf = [...buf.values()];

  if (manual.length !== forOf.length) return false;
  for (let i = 0; i < manual.length; i++) {
    if (manual[i] !== forOf[i]) return false;
  }
  return true;
});

// 测试 16：迭代器值可以转换为普通数组
test('迭代器值应可转换为普通数组用于后续处理', () => {
  const buf = Buffer.from([1, 2, 3]);
  const values = [...buf.values()];

  // 验证是普通数组
  if (!Array.isArray(values)) return false;
  if (values.length !== 3) return false;
  if (values[0] !== 1 || values[2] !== 3) return false;

  // 验证可以进行数组操作
  const sum = values.reduce((a, b) => a + b, 0);
  return sum === 6;
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