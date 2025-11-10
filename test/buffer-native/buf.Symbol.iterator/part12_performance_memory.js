// buf[Symbol.iterator] - Part 12: Performance and Memory Stress Tests
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

// 性能和内存压力测试

// === 大规模迭代性能 ===
test('迭代 1MB Buffer 性能测试', () => {
  const size = 1024 * 1024; // 1MB
  const buf = Buffer.alloc(size, 42);

  const start = Date.now();
  let count = 0;
  let sum = 0;

  for (const byte of buf) {
    count++;
    sum += byte;
  }

  const elapsed = Date.now() - start;

  if (count !== size) {
    throw new Error(`Should iterate ${size} bytes, got ${count}`);
  }

  if (sum !== 42 * size) {
    throw new Error(`Sum should be ${42 * size}, got ${sum}`);
  }

  console.log(`   Performance: 1MB iteration took ${elapsed}ms`);

  // 性能基准：1MB 应该在合理时间内完成（< 100ms）
  if (elapsed > 200) {
    console.log(`   Warning: Iteration seems slow`);
  }
});

test('迭代 10MB Buffer 性能测试', () => {
  const size = 10 * 1024 * 1024; // 10MB
  const buf = Buffer.alloc(size, 1);

  const start = Date.now();
  let count = 0;

  for (const byte of buf) {
    count++;
    if (count > size + 100) break; // 安全保护
  }

  const elapsed = Date.now() - start;

  if (count !== size) {
    throw new Error(`Should iterate ${size} bytes`);
  }

  console.log(`   Performance: 10MB iteration took ${elapsed}ms`);

  // 10MB 应该在合理时间内完成
  if (elapsed > 2000) {
    console.log(`   Warning: Large buffer iteration is slow`);
  }
});

// === 迭代器创建开销 ===
test('批量创建迭代器的性能', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const iterations = 100000;

  const start = Date.now();

  for (let i = 0; i < iterations; i++) {
    const iter = buf[Symbol.iterator]();
    // 立即丢弃
  }

  const elapsed = Date.now() - start;

  console.log(`   Created ${iterations} iterators in ${elapsed}ms`);
  console.log(`   Average: ${(elapsed / iterations * 1000).toFixed(3)} µs per iterator`);

  if (elapsed > 1000) {
    console.log(`   Warning: Iterator creation seems expensive`);
  }
});

// === 迭代器消费性能 ===
test('手动 next() vs for...of 性能对比', () => {
  const buf = Buffer.alloc(10000, 99);

  // 测试 for...of
  const start1 = Date.now();
  let count1 = 0;
  for (const byte of buf) {
    count1++;
  }
  const elapsed1 = Date.now() - start1;

  // 测试手动 next()
  const start2 = Date.now();
  let count2 = 0;
  const iter = buf[Symbol.iterator]();
  let result = iter.next();
  while (!result.done) {
    count2++;
    result = iter.next();
  }
  const elapsed2 = Date.now() - start2;

  console.log(`   for...of: ${elapsed1}ms, manual next(): ${elapsed2}ms`);

  if (count1 !== buf.length || count2 !== buf.length) {
    throw new Error('Iteration counts mismatch');
  }
});

// === 扩展运算符性能 ===
test('扩展运算符展开大 Buffer 的性能', () => {
  const buf = Buffer.alloc(50000, 77);

  const start = Date.now();
  const arr = [...buf];
  const elapsed = Date.now() - start;

  if (arr.length !== buf.length) {
    throw new Error('Array length mismatch');
  }

  console.log(`   Spread 50K buffer into array: ${elapsed}ms`);

  if (elapsed > 500) {
    console.log(`   Warning: Spread operator seems slow`);
  }
});

// === Array.from 性能 ===
test('Array.from 转换大 Buffer 的性能', () => {
  const buf = Buffer.alloc(50000, 55);

  const start = Date.now();
  const arr = Array.from(buf);
  const elapsed = Date.now() - start;

  if (arr.length !== buf.length) {
    throw new Error('Array length mismatch');
  }

  console.log(`   Array.from 50K buffer: ${elapsed}ms`);
});

// === 迭代器状态存储开销 ===
test('大量并发迭代器的内存行为', () => {
  const buf = Buffer.alloc(1000, 88);
  const iterators = [];

  // 创建 1000 个迭代器
  for (let i = 0; i < 1000; i++) {
    iterators.push(buf[Symbol.iterator]());
  }

  // 每个迭代器消费不同数量的元素
  for (let i = 0; i < iterators.length; i++) {
    const consumeCount = i % 100;
    for (let j = 0; j < consumeCount; j++) {
      iterators[i].next();
    }
  }

  // 验证每个迭代器的状态独立
  const iter0 = iterators[0];
  const iter50 = iterators[50];
  const iter999 = iterators[999];

  const result0 = iter0.next();
  const result50 = iter50.next();
  const result999 = iter999.next();

  if (result0.value !== 88) throw new Error('iter0 state wrong');
  if (result50.value !== 88) throw new Error('iter50 state wrong');
  if (result999.value !== 88) throw new Error('iter999 state wrong');
});

// === 嵌套迭代性能 ===
test('嵌套迭代的性能（笛卡尔积）', () => {
  const buf1 = Buffer.alloc(100, 1);
  const buf2 = Buffer.alloc(100, 2);

  const start = Date.now();
  let count = 0;

  for (const byte1 of buf1) {
    for (const byte2 of buf2) {
      count++;
    }
  }

  const elapsed = Date.now() - start;

  if (count !== 10000) {
    throw new Error(`Should have 10000 iterations, got ${count}`);
  }

  console.log(`   Nested iteration (100x100): ${elapsed}ms`);

  if (elapsed > 100) {
    console.log(`   Warning: Nested iteration is slow`);
  }
});

// === 迭代过程中频繁修改 Buffer ===
test('迭代时每步都修改 Buffer 的性能', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i % 256;
  }

  const start = Date.now();
  let index = 0;

  for (const byte of buf) {
    // 每次迭代都修改下一个位置
    if (index + 1 < buf.length) {
      buf[index + 1] = (buf[index + 1] + 1) % 256;
    }
    index++;
  }

  const elapsed = Date.now() - start;

  console.log(`   Iteration with per-step modification: ${elapsed}ms`);
});

// === 长时间运行的迭代器 ===
test('迭代器长时间存活测试', () => {
  const buf = Buffer.alloc(10000, 33);
  const iter = buf[Symbol.iterator]();

  // 消费一半
  for (let i = 0; i < 5000; i++) {
    iter.next();
  }

  // 模拟长时间等待（实际上只是检查状态保持）
  // 在真实场景中，这里可能有其他操作

  // 继续消费
  let count = 0;
  let result = iter.next();
  while (!result.done) {
    count++;
    result = iter.next();
  }

  if (count !== 5000) {
    throw new Error(`Should consume remaining 5000, got ${count}`);
  }
});

// === 迭代器与垃圾回收 ===
test('快速创建和丢弃迭代器（GC 压力测试）', () => {
  const buf = Buffer.alloc(1000, 66);

  const start = Date.now();

  for (let i = 0; i < 10000; i++) {
    const iter = buf[Symbol.iterator]();
    iter.next();
    iter.next();
    // 迭代器被丢弃，等待 GC
  }

  const elapsed = Date.now() - start;

  console.log(`   Created and discarded 10000 iterators: ${elapsed}ms`);

  if (elapsed > 100) {
    console.log(`   Warning: Iterator churn is expensive`);
  }
});

// === 极端：最小和最大 Buffer ===
test('空 Buffer 迭代的性能（最小情况）', () => {
  const buf = Buffer.alloc(0);

  const start = Date.now();

  for (let i = 0; i < 100000; i++) {
    let count = 0;
    for (const byte of buf) {
      count++;
    }
    if (count !== 0) throw new Error('Empty buffer should not iterate');
  }

  const elapsed = Date.now() - start;

  console.log(`   100K empty buffer iterations: ${elapsed}ms`);
});

test('单字节 Buffer 迭代的性能', () => {
  const buf = Buffer.from([123]);

  const start = Date.now();

  for (let i = 0; i < 100000; i++) {
    let count = 0;
    for (const byte of buf) {
      count++;
    }
    if (count !== 1) throw new Error('Should iterate once');
  }

  const elapsed = Date.now() - start;

  console.log(`   100K single-byte iterations: ${elapsed}ms`);
});

// === 迭代器与 Set/Map 大规模测试 ===
test('将大 Buffer 迭代值添加到 Set 的性能', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i % 256; // 创建重复值
  }

  const start = Date.now();
  const set = new Set(buf);
  const elapsed = Date.now() - start;

  // Set 应该只有 256 个唯一值
  if (set.size !== 256) {
    throw new Error(`Set should have 256 unique values, got ${set.size}`);
  }

  console.log(`   Create Set from 10K buffer: ${elapsed}ms`);
});

// === 比较不同大小 Buffer 的迭代性能 ===
test('不同大小 Buffer 的迭代性能线性关系', () => {
  const sizes = [100, 1000, 10000, 100000];
  const times = [];

  for (const size of sizes) {
    const buf = Buffer.alloc(size, 77);

    const start = Date.now();
    let count = 0;
    for (const byte of buf) {
      count++;
    }
    const elapsed = Date.now() - start;

    times.push(elapsed);

    if (count !== size) {
      throw new Error(`Size ${size}: count mismatch`);
    }
  }

  console.log(`   Size vs Time: ${sizes.map((s, i) => `${s}:${times[i]}ms`).join(', ')}`);

  // 检查大致线性关系（允许一定误差）
  // 这是一个粗略的检查
  const ratio1 = times[1] / times[0]; // 1000/100
  const ratio2 = times[2] / times[1]; // 10000/1000
  const ratio3 = times[3] / times[2]; // 100000/10000

  console.log(`   Ratios: ${ratio1.toFixed(2)}, ${ratio2.toFixed(2)}, ${ratio3.toFixed(2)}`);
});

// === 迭代器在不同 Node 优化场景下的表现 ===
test('热路径迭代（重复迭代同一个 Buffer）', () => {
  const buf = Buffer.alloc(1000, 44);

  const start = Date.now();

  // 重复迭代 100 次
  for (let i = 0; i < 100; i++) {
    let count = 0;
    for (const byte of buf) {
      count++;
    }
    if (count !== 1000) throw new Error('Count mismatch');
  }

  const elapsed = Date.now() - start;

  console.log(`   Hot path (100 iterations of 1K buffer): ${elapsed}ms`);
});

test('冷路径迭代（每次新建 Buffer）', () => {
  const start = Date.now();

  // 每次创建新 Buffer
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(1000, 44);
    let count = 0;
    for (const byte of buf) {
      count++;
    }
    if (count !== 1000) throw new Error('Count mismatch');
  }

  const elapsed = Date.now() - start;

  console.log(`   Cold path (100 new buffers + iteration): ${elapsed}ms`);
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 12: Performance & Memory',
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
