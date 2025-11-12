// buf.values() - 第 2 轮补漏：对照 Node 官方文档
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

// 测试 1：buf.values() 与 buf[Symbol.iterator]() 返回相同类型的迭代器
test('buf.values() 应与 buf[Symbol.iterator]() 返回相同类型', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.values();
  const iter2 = buf[Symbol.iterator]();

  // 两者应该返回相同行为的迭代器
  const values1 = [];
  const values2 = [];

  for (const v of iter1) values1.push(v);
  for (const v of iter2) values2.push(v);

  if (values1.length !== values2.length) return false;
  for (let i = 0; i < values1.length; i++) {
    if (values1[i] !== values2[i]) return false;
  }
  return true;
});

// 测试 2：直接在 Buffer 上使用 for...of（隐式调用 values()）
test('直接在 Buffer 上使用 for...of 应等价于 values()', () => {
  const buf = Buffer.from([10, 20, 30]);

  const explicit = [];
  for (const v of buf.values()) {
    explicit.push(v);
  }

  const implicit = [];
  for (const v of buf) {
    implicit.push(v);
  }

  if (explicit.length !== implicit.length) return false;
  for (let i = 0; i < explicit.length; i++) {
    if (explicit[i] !== implicit[i]) return false;
  }
  return true;
});

// 测试 3：Buffer 直接使用扩展运算符
test('Buffer 应支持直接使用扩展运算符', () => {
  const buf = Buffer.from([1, 2, 3]);
  const values = [...buf];
  if (values.length !== 3) return false;
  if (values[0] !== 1 || values[2] !== 3) return false;
  return true;
});

// 测试 4：Buffer 直接传给 Array.from
test('Buffer 应可直接传给 Array.from', () => {
  const buf = Buffer.from([5, 10, 15]);
  const arr = Array.from(buf);
  if (arr.length !== 3) return false;
  if (arr[0] !== 5 || arr[2] !== 15) return false;
  return true;
});

// 测试 5：values() 方法本身的存在性
test('Buffer.prototype 应有 values 方法', () => {
  if (typeof Buffer.prototype.values !== 'function') return false;
  return true;
});

// 测试 6：values() 返回的迭代器是否可重复迭代（应该不可以）
test('values() 返回的迭代器应只能迭代一次', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  // 第一次迭代
  const first = [...iter];
  // 第二次迭代应该为空
  const second = [...iter];

  if (first.length !== 3) return false;
  if (second.length !== 0) return false;
  return true;
});

// 测试 7：迭代器的 next 方法签名
test('迭代器的 next 方法应不需要参数', () => {
  const buf = Buffer.from([1]);
  const iter = buf.values();

  // next 方法的 length 应该是 0（不需要参数）
  if (iter.next.length !== 0) return false;
  return true;
});

// 测试 8：Buffer 的 Symbol.iterator 属性
test('Buffer 应有 Symbol.iterator 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  if (typeof buf[Symbol.iterator] !== 'function') return false;
  return true;
});

// 测试 9：values() 和 Symbol.iterator 是否指向同一实现
test('values() 和 Symbol.iterator 应返回兼容的迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const valuesResult = [];
  for (const v of buf.values()) valuesResult.push(v);

  const symbolResult = [];
  for (const v of buf[Symbol.iterator]()) symbolResult.push(v);

  if (valuesResult.length !== symbolResult.length) return false;
  for (let i = 0; i < valuesResult.length; i++) {
    if (valuesResult[i] !== symbolResult[i]) return false;
  }
  return true;
});

// 测试 10：迭代器应该是独立于 Buffer 的索引访问
test('迭代器不应影响 Buffer 的索引访问', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.values();

  iter.next();
  iter.next();

  // Buffer 的索引访问不应受影响
  if (buf[0] !== 10 || buf[1] !== 20 || buf[2] !== 30) return false;
  return true;
});

// 测试 11：空 Buffer 的 Symbol.iterator
test('空 Buffer 的 Symbol.iterator 应立即完成', () => {
  const buf = Buffer.alloc(0);
  const iter = buf[Symbol.iterator]();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

// 测试 12：迭代器不应暴露 Buffer 的内部结构
test('迭代器应只返回字节值，不暴露内部结构', () => {
  const buf = Buffer.from([100, 200]);
  const iter = buf.values();

  // 迭代器对象不应有 buffer 属性或类似的引用
  if ('buffer' in iter) return false;
  if ('byteOffset' in iter) return false;
  if ('byteLength' in iter) return false;

  return true;
});

// 测试 13：通过解构赋值消费 Buffer
test('Buffer 应支持解构赋值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const [a, b, ...rest] = buf;

  if (a !== 1 || b !== 2) return false;
  if (rest.length !== 3) return false;
  if (rest[0] !== 3 || rest[2] !== 5) return false;
  return true;
});

// 测试 14：values() 在不同 Buffer 实例上的独立性
test('不同 Buffer 的 values() 应返回独立迭代器', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);

  const iter1 = buf1.values();
  const iter2 = buf2.values();

  iter1.next();
  const v1 = iter1.next().value;
  const v2 = iter2.next().value;

  // iter1 在位置 2（值 2），iter2 在位置 1（值 4）
  if (v1 !== 2 || v2 !== 4) return false;
  return true;
});

// 测试 15：values() 方法的 name 属性
test('values 方法应有正确的 name 属性', () => {
  return Buffer.prototype.values.name === 'values';
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
