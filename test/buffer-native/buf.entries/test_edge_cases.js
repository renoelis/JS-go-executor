// buf.entries() - 边界和极端情况补充测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// ==================== 迭代器协议完整性测试 ====================
test('迭代器没有 return() 方法（简单迭代器）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return iter.return === undefined;
});

test('迭代器没有 throw() 方法（简单迭代器）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return iter.throw === undefined;
});

test('迭代器 next() 方法可多次调用', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  const r1 = iter.next();
  const r2 = iter.next();
  const r3 = iter.next();
  const r4 = iter.next();
  return !r1.done && !r2.done && r3.done && r4.done;
});

// ==================== Buffer 长度动态变化测试 ====================
// 🔥 修改：测试迭代器捕获初始长度（通过修改元素值而非 length）
test('迭代过程中 Buffer 内容被修改不影响迭代索引', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  const r1 = iter.next(); // [0, 1]
  // 修改 Buffer 内容（而非 length）
  buf[1] = 99;
  buf[2] = 88;
  const r2 = iter.next(); // [1, 99] - 索引继续，但值是修改后的
  const r3 = iter.next(); // [2, 88]
  // 迭代器应该基于创建时的长度继续迭代，但读取的是当前值
  return r1.value[0] === 0 && r2.value[0] === 1 && r2.value[1] === 99 && r3.value[0] === 2 && r3.value[1] === 88;
});

test('迭代器读取 Buffer 的当前值（实时读取）', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.entries();
  const r1 = iter.next(); // [0, 10] - 读取索引 0
  buf[1] = 99; // 修改索引 1 的值
  const r2 = iter.next(); // [1, 99] - 应该读取修改后的值
  return r1.value[1] === 10 && r2.value[1] === 99;
});

// ==================== 迭代器与生成器函数 ====================
test('迭代器可以用 yield* 展开', () => {
  function* gen() {
    const buf = Buffer.from([1, 2, 3]);
    yield* buf.entries();
  }
  const g = gen();
  const r1 = g.next();
  const r2 = g.next();
  return r1.value[0] === 0 && r1.value[1] === 1 && 
         r2.value[0] === 1 && r2.value[1] === 2;
});

test('迭代器可以用 yield 包装', () => {
  function* gen() {
    const buf = Buffer.from([10, 20]);
    for (const entry of buf.entries()) {
      yield entry;
    }
  }
  const g = gen();
  const r1 = g.next();
  const r2 = g.next();
  return r1.value[0] === 0 && r1.value[1] === 10 &&
         r2.value[0] === 1 && r2.value[1] === 20;
});

// ==================== 迭代器与 Array 方法 ====================
test('迭代器可用于 Array.from()', () => {
  const buf = Buffer.from([5, 10, 15]);
  const arr = Array.from(buf.entries());
  return arr.length === 3 && arr[1][0] === 1 && arr[1][1] === 10;
});

test('迭代器可用于 Array.from() 带映射函数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Array.from(buf.entries(), ([index, value]) => index + value);
  return arr.length === 3 && arr[0] === 1 && arr[1] === 3 && arr[2] === 5;
});

test('迭代器可用于展开运算符创建数组', () => {
  const buf = Buffer.from([7, 8, 9]);
  const arr = [...buf.entries()];
  return arr.length === 3 && arr[0][0] === 0 && arr[0][1] === 7;
});

test('迭代器可用于 reduce()', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sum = Array.from(buf.entries()).reduce((acc, [index, value]) => acc + value, 0);
  return sum === 6;
});

test('迭代器可用于 map()', () => {
  const buf = Buffer.from([2, 4, 6]);
  const doubled = Array.from(buf.entries()).map(([index, value]) => value * 2);
  return doubled.length === 3 && doubled[0] === 4 && doubled[2] === 12;
});

test('迭代器可用于 filter()', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const evens = Array.from(buf.entries())
    .filter(([index, value]) => value % 2 === 0)
    .map(([index, value]) => value);
  return evens.length === 2 && evens[0] === 2 && evens[1] === 4;
});

test('迭代器可用于 find()', () => {
  const buf = Buffer.from([10, 20, 30]);
  const found = Array.from(buf.entries()).find(([index, value]) => value === 20);
  return found[0] === 1 && found[1] === 20;
});

test('迭代器可用于 findIndex()', () => {
  const buf = Buffer.from([5, 10, 15]);
  const index = Array.from(buf.entries()).findIndex(([index, value]) => value === 10);
  return index === 1;
});

test('迭代器可用于 some()', () => {
  const buf = Buffer.from([1, 2, 3]);
  const hasEven = Array.from(buf.entries()).some(([index, value]) => value % 2 === 0);
  const hasLarge = Array.from(buf.entries()).some(([index, value]) => value > 10);
  return hasEven === true && hasLarge === false;
});

test('迭代器可用于 every()', () => {
  const buf = Buffer.from([2, 4, 6]);
  const allEven = Array.from(buf.entries()).every(([index, value]) => value % 2 === 0);
  const allLarge = Array.from(buf.entries()).every(([index, value]) => value > 1);
  return allEven === true && allLarge === true;
});

// ==================== 迭代器与解构赋值 ====================
test('解构赋值获取多个元素', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const [[i0, v0], [i1, v1], [i2, v2]] = buf.entries();
  return i0 === 0 && v0 === 10 && i1 === 1 && v1 === 20 && i2 === 2 && v2 === 30;
});

test('解构赋值忽略某些元素', () => {
  const buf = Buffer.from([1, 2, 3]);
  const [[, v0], [, v1]] = buf.entries();
  return v0 === 1 && v1 === 2;
});

test('解构赋值使用 rest 参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const [[i0, v0], ...rest] = buf.entries();
  return i0 === 0 && v0 === 1 && rest.length === 4 && rest[0][0] === 1;
});

// ==================== 迭代器与 Map/Set/Object ====================
test('迭代器可用于 Map 构造函数', () => {
  const buf = Buffer.from([10, 20, 30]);
  const map = new Map(buf.entries());
  return map.size === 3 && map.get(0) === 10 && map.get(1) === 20 && map.get(2) === 30;
});

test('迭代器可用于 Object.fromEntries()', () => {
  const buf = Buffer.from([5, 10, 15]);
  const obj = Object.fromEntries(buf.entries());
  return obj[0] === 5 && obj[1] === 10 && obj[2] === 15;
});

test('迭代器可用于 Set 构造函数（虽然不太常用）', () => {
  const buf = Buffer.from([1, 1, 2]);
  const set = new Set(Array.from(buf.entries()).map(([i, v]) => v));
  return set.size === 2 && set.has(1) && set.has(2);
});

// ==================== 迭代器与 for-await-of（异步迭代） ====================
test('迭代器不支持异步迭代协议（不是异步迭代器）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return iter[Symbol.asyncIterator] === undefined;
});

// ==================== 迭代器与 JSON 序列化 ====================
test('迭代器 JSON 序列化行为', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  // JSON.stringify 可以序列化迭代器，但结果可能不是预期的
  const json = JSON.stringify(iter);
  // 迭代器对象会被序列化为 {} 或包含其属性的对象
  return typeof json === 'string' && json.length > 0;
});

test('迭代器转换为数组后可以 JSON 序列化', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Array.from(buf.entries());
  const json = JSON.stringify(arr);
  const parsed = JSON.parse(json);
  return parsed.length === 3 && parsed[0][0] === 0 && parsed[0][1] === 1;
});

// ==================== 迭代器与类型检查 ====================
test('迭代器是对象类型', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  return typeof iter === 'object' && iter !== null;
});

test('迭代器不是数组', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  return !Array.isArray(iter);
});

test('迭代器有 next 方法', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  return typeof iter.next === 'function';
});

test('迭代器有 Symbol.iterator 方法', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  return typeof iter[Symbol.iterator] === 'function';
});

// ==================== 迭代器与 Buffer 操作组合 ====================
test('slice 后的 Buffer 迭代器独立', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const entries = Array.from(sliced.entries());
  return entries.length === 3 && entries[0][0] === 0 && entries[0][1] === 2;
});

test('subarray 后的 Buffer 迭代器独立', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const sub = buf.subarray(1, 3);
  const entries = Array.from(sub.entries());
  return entries.length === 2 && entries[0][0] === 0 && entries[0][1] === 20;
});

test('concat 后的 Buffer 迭代器', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2]);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[2][1] === 3 && entries[3][1] === 4;
});

test('fill 后的 Buffer 迭代器', () => {
  const buf = Buffer.alloc(5);
  buf.fill(42);
  const entries = Array.from(buf.entries());
  return entries.every(([index, value]) => value === 42);
});

// ==================== 迭代器与循环控制 ====================
test('for...of 循环可以 break', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let count = 0;
  for (const [index, value] of buf.entries()) {
    count++;
    if (value === 3) break;
  }
  return count === 3;
});

test('for...of 循环可以 continue', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let sum = 0;
  for (const [index, value] of buf.entries()) {
    if (value % 2 === 0) continue;
    sum += value;
  }
  return sum === 9; // 1 + 3 + 5
});

test('for...of 循环可以 return', () => {
  function testReturn() {
    const buf = Buffer.from([1, 2, 3]);
    for (const [index, value] of buf.entries()) {
      if (value === 2) return value;
    }
    return 0;
  }
  return testReturn() === 2;
});

// ==================== 迭代器与嵌套迭代 ====================
test('嵌套迭代同一个 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const results = [];
  for (const [i1, v1] of buf.entries()) {
    for (const [i2, v2] of buf.entries()) {
      results.push([i1, v1, i2, v2]);
    }
  }
  return results.length === 9 && results[0][0] === 0 && results[0][1] === 1;
});

test('嵌套迭代不同 Buffer', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const results = [];
  for (const [i1, v1] of buf1.entries()) {
    for (const [i2, v2] of buf2.entries()) {
      results.push([i1, v1, i2, v2]);
    }
  }
  return results.length === 4 && results[0][0] === 0 && results[0][1] === 1;
});

// ==================== 迭代器与函数参数 ====================
test('迭代器可以作为函数参数传递', () => {
  function processIterator(iter) {
    const arr = Array.from(iter);
    return arr.length;
  }
  const buf = Buffer.from([1, 2, 3]);
  return processIterator(buf.entries()) === 3;
});

test('迭代器可以在箭头函数中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const process = (iter) => Array.from(iter).length;
  return process(buf.entries()) === 3;
});

// ==================== 迭代器与变量作用域 ====================
test('迭代器在闭包中保持状态', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const results = [];
  function process() {
    const r = iter.next();
    if (!r.done) {
      results.push(r.value);
      process();
    }
  }
  process();
  return results.length === 3 && results[0][0] === 0;
});

// ==================== 迭代器与错误处理 ====================
test('迭代器在 try-catch 中正常工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  try {
    const r = iter.next();
    return r.value[0] === 0 && r.value[1] === 1;
  } catch (e) {
    return false;
  }
});

test('迭代器在错误后仍可继续使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  try {
    throw new Error('test');
  } catch (e) {
    // 忽略错误
  }
  const r = iter.next();
  return r.value[0] === 0 && r.value[1] === 1;
});

// ==================== 结果汇总 ====================
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

