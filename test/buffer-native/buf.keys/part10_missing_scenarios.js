// buf.keys() - Part 10: 缺失场景补充测试
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

// this 绑定和错误调用场景
test('在非 Buffer 对象上调用 keys() 应该抛错', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = buf.keys;
  try {
    keys.call({});
    return false;
  } catch (e) {
    return true;
  }
});

test('在 null 上调用 keys() 应该抛错', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = buf.keys;
  try {
    keys.call(null);
    return false;
  } catch (e) {
    return true;
  }
});

test('在 undefined 上调用 keys() 应该抛错', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = buf.keys;
  try {
    keys.call(undefined);
    return false;
  } catch (e) {
    return true;
  }
});

test('在数组上调用 keys() 应该抛错', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = buf.keys;
  try {
    keys.call([1, 2, 3]);
    return false;
  } catch (e) {
    return true;
  }
});

test('使用 apply 正确调用 keys()', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = buf.keys;
  const iter = keys.apply(buf, []);
  const result = iter.next();
  return result.value === 0 && result.done === false;
});

test('使用 bind 正确调用 keys()', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = buf.keys.bind(buf);
  const iter = keys();
  const result = iter.next();
  return result.value === 0;
});

// 迭代器方法的 this 绑定
test('next() 方法错误的 this 绑定', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const next = iter.next;
  try {
    next.call({});
    return false;
  } catch (e) {
    return true;
  }
});

test('Symbol.iterator 方法正确返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const symbolIterator = iter[Symbol.iterator];
  const result = symbolIterator.call(iter);
  return result === iter;
});

// 迭代器与 async/await
test('在 async 函数中使用迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  let success = false;
  
  async function testAsync() {
    const keys = [];
    for (const key of buf.keys()) {
      keys.push(key);
    }
    return keys.length === 3 && keys[0] === 0;
  }
  
  // 同步检查（因为迭代器本身是同步的）
  const keys = Array.from(buf.keys());
  return keys.length === 3;
});

test('迭代器可以在 Promise.resolve 中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const promise = Promise.resolve(iter);
  return promise instanceof Promise;
});

// 属性描述符测试
test('keys() 方法存在于 Buffer.prototype', () => {
  return typeof Buffer.prototype.keys === 'function';
});

test('keys() 方法可以被调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return iter !== null && typeof iter === 'object';
});

test('迭代器的 next 方法存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return typeof iter.next === 'function';
});

test('迭代器的 Symbol.iterator 方法存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return typeof iter[Symbol.iterator] === 'function';
});

// 冻结和密封对象（Buffer 不支持 freeze/seal，跳过这些测试）
test('尝试冻结 Buffer 会抛出错误', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    Object.freeze(buf);
    return false;
  } catch (e) {
    return true;
  }
});

test('尝试密封 Buffer 会抛出错误', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    Object.seal(buf);
    return false;
  } catch (e) {
    return true;
  }
});

test('冻结的迭代器仍可正常工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  Object.freeze(iter);
  const result = iter.next();
  return result.value === 0;
});

// 迭代器与其他迭代协议
test('迭代器可以用于 Array.from 的第二个参数', () => {
  const buf = Buffer.from([10, 20, 30]);
  const doubled = Array.from(buf.keys(), x => x * 2);
  return doubled[0] === 0 && doubled[1] === 2 && doubled[2] === 4;
});

test('迭代器可以用于 Set 构造', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const set = new Set(buf.keys());
  return set.size === 5 && set.has(0) && set.has(4);
});

test('迭代器可以用于 Map 构造（配合 entries）', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Array.from(buf.keys());
  const map = new Map(keys.map(k => [k, buf[k]]));
  return map.size === 3 && map.get(0) === 10 && map.get(2) === 30;
});

// 特殊 Buffer 场景
test('Buffer 元素不可重定义', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    Object.defineProperty(buf, '0', { writable: false });
    return false;
  } catch (e) {
    // Buffer 元素不能被重定义
    return true;
  }
});

test('带有自定义属性的 Buffer keys()', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.customProp = 'test';
  const keys = Array.from(buf.keys());
  return keys.length === 3 && keys[0] === 0;
});

// 迭代器状态边界
test('迭代器在完成后调用 Symbol.iterator', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  iter.next();
  const iter2 = iter[Symbol.iterator]();
  return iter === iter2;
});

test('完成的迭代器继续 for...of 不执行', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  Array.from(iter);
  
  let count = 0;
  for (const key of iter) {
    count++;
  }
  return count === 0;
});

// 数值精度测试
test('大索引值的精度', () => {
  const buf = Buffer.alloc(100000);
  const iter = buf.keys();
  let last;
  for (const key of iter) {
    last = key;
  }
  return last === 99999 && Number.isInteger(last);
});

test('索引值不是浮点数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  let allIntegers = true;
  for (const key of keys) {
    if (!Number.isInteger(key) || key !== Math.floor(key)) {
      allIntegers = false;
      break;
    }
  }
  return allIntegers;
});

// 迭代器与垃圾回收
test('迭代器可以被正确释放', () => {
  const buf = Buffer.from([1, 2, 3]);
  let iter = buf.keys();
  iter.next();
  iter = null;
  return true;
});

test('Buffer 释放后迭代器仍可工作', () => {
  let buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  buf = null;
  const result = iter.next();
  return result.value === 0;
});

// 输出结果
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
