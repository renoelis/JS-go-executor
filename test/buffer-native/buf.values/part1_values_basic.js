// buf.values() - 基本功能测试
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

// 测试 1：基本迭代器返回
test('返回值应该是迭代器对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  // 检查是否有 next 方法
  if (typeof iter.next !== 'function') return false;
  return true;
});

// 测试 2：迭代器正确返回所有字节值
test('迭代器应该返回所有字节值', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.values();

  const first = iter.next();
  if (first.done !== false || first.value !== 10) return false;

  const second = iter.next();
  if (second.done !== false || second.value !== 20) return false;

  const third = iter.next();
  if (third.done !== false || third.value !== 30) return false;

  const fourth = iter.next();
  if (fourth.done !== true || fourth.value !== undefined) return false;

  return true;
});

// 测试 3：空 Buffer 的迭代器
test('空 Buffer 的迭代器应立即返回 done=true', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.values();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

// 测试 4：单字节 Buffer
test('单字节 Buffer 应返回一个值后结束', () => {
  const buf = Buffer.from([42]);
  const iter = buf.values();

  const first = iter.next();
  if (first.done !== false || first.value !== 42) return false;

  const second = iter.next();
  return second.done === true && second.value === undefined;
});

// 测试 5：for...of 循环使用
test('迭代器应支持 for...of 循环', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const values = [];
  for (const value of buf.values()) {
    values.push(value);
  }
  if (values.length !== 5) return false;
  if (values[0] !== 1 || values[4] !== 5) return false;
  return true;
});

// 测试 6：扩展运算符
test('迭代器应支持扩展运算符', () => {
  const buf = Buffer.from([10, 20, 30]);
  const values = [...buf.values()];
  if (values.length !== 3) return false;
  if (values[0] !== 10 || values[1] !== 20 || values[2] !== 30) return false;
  return true;
});

// 测试 7：Array.from 转换
test('迭代器应支持 Array.from', () => {
  const buf = Buffer.from([5, 10, 15]);
  const values = Array.from(buf.values());
  if (!Array.isArray(values)) return false;
  if (values.length !== 3) return false;
  if (values[0] !== 5 || values[1] !== 10 || values[2] !== 15) return false;
  return true;
});

// 测试 8：多次调用 values() 应返回独立的迭代器
test('多次调用 values() 应返回独立的迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.values();
  const iter2 = buf.values();

  iter1.next();
  iter1.next();

  const result1 = iter1.next();
  const result2 = iter2.next();

  // iter1 应在第三个位置，iter2 应在第一个位置
  return result1.value === 3 && result2.value === 1;
});

// 测试 9：迭代器不受原始 Buffer 修改的影响（值快照）
test('迭代过程中修改 Buffer 应反映在未迭代的值中', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  const first = iter.next().value;
  buf[1] = 99;
  const second = iter.next().value;

  // 第一个值是 1（迭代前），第二个值应该是 99（迭代时已修改）
  return first === 1 && second === 99;
});

// 测试 10：值范围 0-255
test('迭代器返回的值应在 0-255 范围内', () => {
  const buf = Buffer.from([0, 127, 255]);
  const values = [...buf.values()];
  if (values[0] !== 0) return false;
  if (values[1] !== 127) return false;
  if (values[2] !== 255) return false;
  return true;
});

// 测试 11：大 Buffer 的基本迭代
test('大 Buffer 应正确迭代所有值', () => {
  const size = 1000;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf[i] = i % 256;
  }

  const values = [...buf.values()];
  if (values.length !== size) return false;
  if (values[0] !== 0 || values[999] !== 999 % 256) return false;
  return true;
});

// 测试 12：迭代器的 Symbol.iterator 方法
test('迭代器本身应该是可迭代的', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  // 检查迭代器是否有 Symbol.iterator 方法
  if (typeof iter[Symbol.iterator] !== 'function') return false;

  // 调用 Symbol.iterator 应返回迭代器自身
  const iterOfIter = iter[Symbol.iterator]();
  return iterOfIter === iter;
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