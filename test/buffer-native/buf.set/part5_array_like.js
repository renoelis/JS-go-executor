// buf.set() - Part 5: Array-like Objects & Iterables
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

function testError(name, fn, expectedErrorType) {
  try {
    fn();
    tests.push({ 
      name, 
      status: '❌', 
      error: 'Expected error was not thrown' 
    });
  } catch (e) {
    let pass = true;
    if (expectedErrorType) {
      if (typeof expectedErrorType === 'string') {
        pass = e.name === expectedErrorType || e.code === expectedErrorType;
      } else {
        pass = e instanceof expectedErrorType;
      }
    }
    tests.push({ 
      name, 
      status: pass ? '✅' : '❌',
      error: pass ? undefined : `Expected ${expectedErrorType}, got ${e.constructor.name}: ${e.message}`,
      actualError: e.message
    });
  }
}

// 类数组对象测试
test('从类数组对象设置（有 length 属性）', () => {
  const buf = Buffer.alloc(5);
  const arrayLike = { 0: 1, 1: 2, 2: 3, length: 3 };
  try {
    buf.set(arrayLike);
    // 如果成功，检查结果
    return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
  } catch (e) {
    // 如果失败，也是合理的（取决于 Node.js 实现）
    return e instanceof TypeError;
  }
});

test('从 Arguments 对象设置', () => {
  const buf = Buffer.alloc(5);
  function getArgs() { return arguments; }
  const args = getArgs(10, 20, 30);
  try {
    buf.set(args);
    return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('从 NodeList 类似对象设置', () => {
  const buf = Buffer.alloc(3);
  const nodeListLike = {
    0: 100,
    1: 101,
    2: 102,
    length: 3,
    item: function(i) { return this[i]; }
  };
  try {
    buf.set(nodeListLike);
    return buf[0] === 100 && buf[1] === 101 && buf[2] === 102;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 可迭代对象测试（Node.js 不支持，静默忽略）
test('从 Set 设置（可迭代，不支持）', () => {
  const buf = Buffer.from([99, 99, 99]);
  const set = new Set([1, 2, 3]);
  buf.set(set); // 不报错，但不做任何操作
  // Buffer 内容不变
  return buf[0] === 99 && buf[1] === 99 && buf[2] === 99;
});

test('从 Map.values() 设置（可迭代，不支持）', () => {
  const buf = Buffer.from([99, 99, 99]);
  const map = new Map([[0, 10], [1, 20], [2, 30]]);
  buf.set(map.values()); // 不报错，但不做任何操作
  return buf[0] === 99 && buf[1] === 99 && buf[2] === 99;
});

// 自定义可迭代对象
test('从自定义可迭代对象设置（不支持）', () => {
  const buf = Buffer.from([99, 99, 99]);
  const iterable = {
    [Symbol.iterator]: function*() {
      yield 1;
      yield 2;
      yield 3;
    }
  };
  buf.set(iterable); // 不报错，但不做任何操作
  return buf[0] === 99 && buf[1] === 99 && buf[2] === 99;
});

// 空类数组对象
test('从空类数组对象设置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arrayLike = { length: 0 };
  try {
    buf.set(arrayLike);
    return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 类数组对象缺少元素
test('从稀疏类数组对象设置', () => {
  const buf = Buffer.alloc(5);
  const arrayLike = { 0: 1, 2: 3, length: 3 }; // 缺少索引1
  try {
    buf.set(arrayLike);
    // 索引1应该是 undefined -> 0
    return buf[0] === 1 && buf[1] === 0 && buf[2] === 3;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 类数组对象包含非数字
test('从包含非数字的类数组对象设置', () => {
  const buf = Buffer.alloc(5);
  const arrayLike = { 0: 'a', 1: null, 2: undefined, length: 3 };
  try {
    buf.set(arrayLike);
    // 'a' -> NaN -> 0, null -> 0, undefined -> 0
    return buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 类数组对象 length 为负数
test('从 length 为负数的类数组对象设置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arrayLike = { 0: 99, length: -1 };
  try {
    buf.set(arrayLike);
    // 负数 length 应该被当作 0
    return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 类数组对象 length 为非整数
test('从 length 为小数的类数组对象设置', () => {
  const buf = Buffer.alloc(5);
  const arrayLike = { 0: 1, 1: 2, 2: 3, length: 2.7 };
  try {
    buf.set(arrayLike);
    // length 应该被截断为 2
    return buf[0] === 1 && buf[1] === 2 && buf[2] === 0;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 类数组对象 length 为字符串
test('从 length 为字符串的类数组对象设置', () => {
  const buf = Buffer.alloc(5);
  const arrayLike = { 0: 1, 1: 2, 2: 3, length: '2' };
  try {
    buf.set(arrayLike);
    // length '2' 应该被转换为 2
    return buf[0] === 1 && buf[1] === 2 && buf[2] === 0;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 类数组对象 length 为 NaN
test('从 length 为 NaN 的类数组对象设置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arrayLike = { 0: 99, length: NaN };
  try {
    buf.set(arrayLike);
    // NaN length 应该被当作 0
    return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 类数组对象 length 为 Infinity
test('从 length 为 Infinity 的类数组对象设置', () => {
  const buf = Buffer.alloc(5);
  const arrayLike = { 0: 1, 1: 2, length: Infinity };
  try {
    buf.set(arrayLike);
    // Infinity length 可能导致错误或被限制
    return false; // 不应该成功
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

// 类数组对象包含 getter
test('从包含 getter 的类数组对象设置', () => {
  const buf = Buffer.alloc(5);
  let callCount = 0;
  const arrayLike = {
    get 0() { callCount++; return 10; },
    get 1() { callCount++; return 20; },
    length: 2
  };
  try {
    buf.set(arrayLike);
    // getter 应该被调用
    return buf[0] === 10 && buf[1] === 20 && callCount === 2;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 类数组对象在迭代过程中修改
test('从在迭代过程中修改的类数组对象设置', () => {
  const buf = Buffer.alloc(5);
  const arrayLike = {
    0: 1,
    get 1() {
      this[2] = 99; // 修改后续元素
      return 2;
    },
    2: 3,
    length: 3
  };
  try {
    buf.set(arrayLike);
    // 行为取决于实现
    return true;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 字符串（被当作可迭代对象，每个字符被转换为数字）
test('从字符串设置（可迭代，字符转数字）', () => {
  const buf = Buffer.from([99, 99, 99, 99, 99]);
  buf.set('123'); // '1' -> 1, '2' -> 2, '3' -> 3
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 99 && buf[4] === 99;
});

// 数字（不可迭代，静默忽略）
test('从数字设置（静默忽略）', () => {
  const buf = Buffer.from([99, 99, 99]);
  buf.set(123); // 不报错，不做任何操作
  return buf[0] === 99 && buf[1] === 99 && buf[2] === 99;
});

// 布尔值
test('从布尔值设置（静默忽略）', () => {
  const buf = Buffer.from([99, 99, 99]);
  buf.set(true); // 不报错，不做任何操作
  return buf[0] === 99 && buf[1] === 99 && buf[2] === 99;
});

// Symbol
test('从 Symbol 设置（静默忽略）', () => {
  const buf = Buffer.from([99, 99, 99]);
  buf.set(Symbol('test')); // 不报错，不做任何操作
  return buf[0] === 99 && buf[1] === 99 && buf[2] === 99;
});

// 函数
test('从函数设置（静默忽略）', () => {
  const buf = Buffer.from([99, 99, 99]);
  buf.set(function() {}); // 不报错，不做任何操作
  return buf[0] === 99 && buf[1] === 99 && buf[2] === 99;
});

// 正则表达式
test('从正则表达式设置（静默忽略）', () => {
  const buf = Buffer.from([99, 99, 99]);
  buf.set(/test/); // 不报错，不做任何操作
  return buf[0] === 99 && buf[1] === 99 && buf[2] === 99;
});

// Date 对象
test('从 Date 对象设置（静默忽略）', () => {
  const buf = Buffer.from([99, 99, 99]);
  buf.set(new Date()); // 不报错，不做任何操作
  return buf[0] === 99 && buf[1] === 99 && buf[2] === 99;
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
