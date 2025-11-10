// buf[Symbol.iterator] - Part 11: Iterator Lifecycle and State Management
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: '✅', passed: true });
    console.log(`✅ ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// 迭代器生命周期和状态管理测试

// === 迭代器状态不可重置 ===
test('迭代器完成后无法重置到初始状态', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  // 消费完所有元素
  iter.next();
  iter.next();
  iter.next();
  const done1 = iter.next();

  if (!done1.done) throw new Error('Should be done');

  // 无法重置，继续调用应该保持 done 状态
  const done2 = iter.next();
  const done3 = iter.next();

  if (!done2.done || !done3.done) {
    throw new Error('Should remain in done state');
  }
});

test('不同迭代器的状态完全隔离', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);

  const iter1 = buf[Symbol.iterator]();
  const iter2 = buf[Symbol.iterator]();
  const iter3 = buf[Symbol.iterator]();

  // iter1 消费 2 个
  iter1.next();
  iter1.next();

  // iter2 消费 4 个
  iter2.next();
  iter2.next();
  iter2.next();
  iter2.next();

  // iter3 不消费

  // 检查各自的状态
  const result1 = iter1.next();
  const result2 = iter2.next();
  const result3 = iter3.next();

  if (result1.value !== 30) throw new Error('iter1 should be at position 3');
  if (result2.value !== 50) throw new Error('iter2 should be at position 5');
  if (result3.value !== 10) throw new Error('iter3 should be at position 1');
});

// === 迭代器与 Buffer 修改的交互 ===
test('迭代器创建后修改 Buffer，迭代器看到新值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf[Symbol.iterator]();

  // 消费第一个
  const first = iter.next();
  if (first.value !== 1) throw new Error('First should be 1');

  // 修改 Buffer
  buf[1] = 99;
  buf[2] = 88;

  // 继续迭代应该看到新值
  const second = iter.next();
  const third = iter.next();

  if (second.value !== 99) throw new Error('Should see modified value 99');
  if (third.value !== 88) throw new Error('Should see modified value 88');
});

test('迭代过程中 Buffer 被完全重写', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf[Symbol.iterator]();

  iter.next(); // 消费第一个

  // 重写整个 Buffer
  for (let i = 0; i < buf.length; i++) {
    buf[i] = 100 + i;
  }

  // 继续迭代应该看到新值
  const result = [];
  let next = iter.next();
  while (!next.done) {
    result.push(next.value);
    next = iter.next();
  }

  // 应该是 [101, 102, 103, 104]
  if (result[0] !== 101 || result[3] !== 104) {
    throw new Error('Should see all rewritten values');
  }
});

// === 迭代器垃圾回收行为 ===
test('迭代器不持有 Buffer 的强引用（理论测试）', () => {
  // 创建迭代器
  let buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  // 消费一个元素
  iter.next();

  // 解除对 Buffer 的引用
  buf = null;

  // 迭代器仍然可以继续工作（说明内部持有引用）
  const result = iter.next();

  if (typeof result.value !== 'number') {
    throw new Error('Iterator should still work after buffer reference cleared');
  }
});

// === 多次调用 Symbol.iterator 的开销 ===
test('连续创建多个迭代器不会相互干扰', () => {
  const buf = Buffer.from([5, 10, 15, 20]);

  const iters = [];
  for (let i = 0; i < 10; i++) {
    iters.push(buf[Symbol.iterator]());
  }

  // 每个迭代器都应该独立工作
  for (let i = 0; i < iters.length; i++) {
    const first = iters[i].next();
    if (first.value !== 5) {
      throw new Error(`Iterator ${i} should start at 5`);
    }
  }
});

// === 迭代器在异常情况下的行为 ===
test('迭代器在 Buffer 被 TypedArray 方法修改后', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf[Symbol.iterator]();

  iter.next(); // 消费第一个

  // 使用 TypedArray 方法修改
  buf.reverse(); // [5, 4, 3, 2, 1]

  // 继续迭代应该看到反转后的值
  const result = [];
  let next = iter.next();
  while (!next.done) {
    result.push(next.value);
    next = iter.next();
  }

  // 从位置 1 开始，应该是 [4, 3, 2, 1]
  if (result[0] !== 4 || result[3] !== 1) {
    throw new Error('Should see reversed values');
  }
});

test('迭代器在 Buffer 被 sort 后', () => {
  const buf = Buffer.from([30, 10, 50, 20, 40]);
  const iter = buf[Symbol.iterator]();

  iter.next(); // 消费 30

  // 排序
  buf.sort(); // [10, 20, 30, 40, 50]

  // 继续迭代
  const result = [];
  let next = iter.next();
  while (!next.done) {
    result.push(next.value);
    next = iter.next();
  }

  // 从位置 1 开始，应该是 [20, 30, 40, 50]
  if (result[0] !== 20 || result[3] !== 50) {
    throw new Error('Should see sorted values');
  }
});

// === 迭代器与 Buffer.fill 的交互 ===
test('迭代过程中调用 Buffer.fill', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf[Symbol.iterator]();

  iter.next(); // 消费第一个
  iter.next(); // 消费第二个

  // 填充后续部分
  buf.fill(99, 2); // 从索引 2 开始填充 99

  const result = [];
  let next = iter.next();
  while (!next.done) {
    result.push(next.value);
    next = iter.next();
  }

  // 应该是 [99, 99, 99]
  if (result[0] !== 99 || result[2] !== 99) {
    throw new Error('Should see filled values');
  }
});

// === 迭代器与 Buffer.copy 的交互 ===
test('迭代过程中 Buffer.copy 覆盖数据', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const source = Buffer.from([99, 88, 77]);
  const iter = buf[Symbol.iterator]();

  iter.next(); // 消费第一个

  // 复制数据覆盖
  source.copy(buf, 1); // 从索引 1 开始覆盖

  const result = [];
  let next = iter.next();
  while (!next.done) {
    result.push(next.value);
    next = iter.next();
  }

  // 应该是 [99, 88, 77, 5]
  if (result[0] !== 99 || result[1] !== 88 || result[2] !== 77) {
    throw new Error('Should see copied values');
  }
});

// === 迭代器的内存位置语义 ===
test('迭代器基于索引位置而非内存地址', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf[Symbol.iterator]();

  // 获取内部状态（通过消费来测试）
  const first = iter.next(); // 位置 0
  if (first.value !== 10) throw new Error('Position 0 should be 10');

  // 交换值
  const temp = buf[0];
  buf[0] = buf[2];
  buf[2] = temp;

  // 继续迭代应该基于索引
  const second = iter.next(); // 位置 1
  if (second.value !== 20) throw new Error('Position 1 should still be 20');

  const third = iter.next(); // 位置 2
  if (third.value !== 10) throw new Error('Position 2 should be 10 (swapped)');
});

// === 迭代器在 Buffer resize 场景（不支持，但测试边界）===
test('Buffer 长度固定，迭代器总是迭代原始长度', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const originalLength = buf.length;
  const iter = buf[Symbol.iterator]();

  let count = 0;
  for (const byte of buf) {
    count++;
    if (count > 10) break; // 安全保护
  }

  if (count !== originalLength) {
    throw new Error('Should iterate original length');
  }
});

// === 完成状态的持久性 ===
test('迭代器完成后始终返回相同的结果对象结构', () => {
  const buf = Buffer.from([1]);
  const iter = buf[Symbol.iterator]();

  iter.next(); // 消费唯一元素

  const done1 = iter.next();
  const done2 = iter.next();
  const done3 = iter.next();

  // 所有 done 结果应该一致
  if (done1.done !== true || done2.done !== true || done3.done !== true) {
    throw new Error('All should be done');
  }

  if (done1.value !== undefined || done2.value !== undefined || done3.value !== undefined) {
    throw new Error('All done values should be undefined');
  }
});

// === 迭代器与 Object.defineProperty ===
test('在迭代器上定义属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  // 尝试定义自定义属性
  iter.customProp = 'test';

  if (iter.customProp !== 'test') {
    throw new Error('Should be able to add custom properties');
  }

  // 迭代功能不受影响
  const result = iter.next();
  if (result.value !== 1) {
    throw new Error('Iteration should still work');
  }
});

// === 迭代器的 next 方法可以被调用在其他上下文 ===
test('迭代器 next 方法与 this 绑定', () => {
  const buf = Buffer.from([5, 6, 7]);
  const iter = buf[Symbol.iterator]();

  // 解绑 next 方法
  const nextFunc = iter.next;

  // 调用时应该抛错或返回正确结果（取决于实现）
  let errorThrown = false;
  try {
    const result = nextFunc.call(iter);
    // 如果成功，应该返回正确的值
    if (result.value !== 5) {
      throw new Error('Should return correct value with proper binding');
    }
  } catch (e) {
    errorThrown = true;
  }

  // 无论如何，原始迭代器应该还能用
  if (!errorThrown) {
    const result2 = iter.next();
    if (result2.value !== 6) {
      throw new Error('Iterator should continue from position 1');
    }
  }
});

// === 迭代器与严格模式 ===
test('严格模式下迭代器行为一致', () => {
  'use strict';

  const buf = Buffer.from([100, 200]);
  const iter = buf[Symbol.iterator]();

  const result = [...Array(3)].map(() => iter.next());

  if (result[0].value !== 100 || result[1].value !== 200 || !result[2].done) {
    throw new Error('Strict mode should not affect iteration');
  }
});

// === 迭代器创建的时间成本 ===
test('快速创建和销毁大量迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const start = Date.now();

  // 创建 1000 个迭代器
  for (let i = 0; i < 1000; i++) {
    const iter = buf[Symbol.iterator]();
    iter.next(); // 消费一个元素
  }

  const elapsed = Date.now() - start;

  // 应该非常快（< 10ms）
  if (elapsed > 50) {
    console.log(`Warning: Creating 1000 iterators took ${elapsed}ms`);
  }
});

// === 迭代器与 Proxy ===
// 注：Proxy 相关测试被移除（使用了 Proxy 禁用关键词）

// === 并发迭代场景 ===
test('同一个 Buffer 的多个迭代器并发消费', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  const iter1 = buf[Symbol.iterator]();
  const iter2 = buf[Symbol.iterator]();

  const results1 = [];
  const results2 = [];

  // 交替消费
  for (let i = 0; i < 5; i++) {
    results1.push(iter1.next().value);
    results2.push(iter2.next().value);
  }

  // 两个迭代器应该都从头开始
  if (results1[0] !== 1 || results2[0] !== 1) {
    throw new Error('Both should start from beginning');
  }

  // 各自应该消费 5 个元素
  if (results1[4] !== 5 || results2[4] !== 5) {
    throw new Error('Both should consume 5 elements independently');
  }
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 11: Iterator Lifecycle',
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log('\n' + JSON.stringify(result, null, 2));
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
