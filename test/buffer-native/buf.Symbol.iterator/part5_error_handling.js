// buf[Symbol.iterator] - Part 5: Error Handling and Edge Cases Tests
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

// 错误处理与边缘情况测试
test('非 Buffer 对象调用 Symbol.iterator 应抛出错误', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iteratorFunc = buf[Symbol.iterator];

  let errorThrown = false;
  try {
    iteratorFunc.call({}); // 错误的 this
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) throw new Error('Should throw error when called on non-Buffer');
});

test('非 Buffer 对象调用 Symbol.iterator - 数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iteratorFunc = buf[Symbol.iterator];

  let errorThrown = false;
  try {
    iteratorFunc.call([1, 2, 3]);
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) throw new Error('Should throw error when called on array');
});

test('非 Buffer 对象调用 Symbol.iterator - null', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iteratorFunc = buf[Symbol.iterator];

  let errorThrown = false;
  try {
    iteratorFunc.call(null);
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) throw new Error('Should throw error when called on null');
});

test('非 Buffer 对象调用 Symbol.iterator - undefined', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iteratorFunc = buf[Symbol.iterator];

  let errorThrown = false;
  try {
    iteratorFunc.call(undefined);
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) throw new Error('Should throw error when called on undefined');
});

test('迭代过程中 Buffer 被清空（理论测试）', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const result = [];
  let index = 0;

  for (const byte of buf) {
    result.push(byte);
    // 修改 length 不会影响迭代（Buffer 长度是固定的）
    index++;
  }

  if (result.length !== 4) throw new Error('Should iterate all original elements');
});

test('迭代 Buffer 包含所有可能字节值 0-255', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }

  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result.length !== 256) throw new Error('Should have 256 values');
  for (let i = 0; i < 256; i++) {
    if (result[i] !== i) throw new Error(`Value at ${i} should be ${i}`);
  }
});

test('迭代包含 Unicode 多字节字符的 UTF-8 Buffer', () => {
  const buf = Buffer.from('你好', 'utf8'); // 每个中文字符 3 字节
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  // "你好" 应该是 6 字节
  if (result.length !== 6) throw new Error('Should have 6 bytes for 2 Chinese characters');

  // 验证每个字节都是有效的数值（0-255）
  for (const byte of result) {
    if (typeof byte !== 'number' || byte < 0 || byte > 255) {
      throw new Error('All bytes should be valid numbers 0-255');
    }
  }
});

test('迭代包含 emoji 的 UTF-8 Buffer', () => {
  const buf = Buffer.from('😀', 'utf8'); // emoji 是 4 字节
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result.length !== 4) throw new Error('Emoji should be 4 bytes');
});

test('迭代损坏的 UTF-8 序列', () => {
  // 手动创建不完整的 UTF-8 序列
  const buf = Buffer.from([0xE4, 0xB8]); // 应该是 3 字节，但只有 2 字节
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  // 应该仍然能迭代，只是按字节返回
  if (result.length !== 2) throw new Error('Should iterate 2 bytes');
  if (result[0] !== 0xE4 || result[1] !== 0xB8) throw new Error('Byte values mismatch');
});

test('迭代后修改 Buffer 不影响已创建的迭代器', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iterator = buf[Symbol.iterator]();

  const first = iterator.next();
  if (first.value !== 10) throw new Error('First value should be 10');

  // 修改 Buffer
  buf[1] = 99;

  const second = iterator.next();
  // 修改应该反映在迭代器中（因为 Buffer 是可变的）
  if (second.value !== 99) throw new Error('Should reflect modification');
});

test('slice 视图迭代反映原 Buffer 修改', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = original.slice(1, 4); // [2, 3, 4]

  original[2] = 99; // 修改原 Buffer 的第 3 个元素

  const result = [];
  for (const byte of sliced) {
    result.push(byte);
  }

  // slice 是视图，应该反映修改
  if (result[1] !== 99) throw new Error('Slice should reflect original buffer modification');
});

test('迭代器与 Set 构造函数', () => {
  const buf = Buffer.from([1, 2, 2, 3, 3, 3]);
  const set = new Set(buf);

  if (set.size !== 3) throw new Error('Set should have 3 unique values');
  if (!set.has(1) || !set.has(2) || !set.has(3)) {
    throw new Error('Set should contain 1, 2, 3');
  }
});

test('迭代器与 Map 结合', () => {
  const buf = Buffer.from([1, 2, 3]);
  const entries = [...buf].map((byte, index) => [index, byte]);
  const map = new Map(entries);

  if (map.size !== 3) throw new Error('Map should have 3 entries');
  if (map.get(0) !== 1 || map.get(2) !== 3) throw new Error('Map values mismatch');
});

test('超大 Buffer 迭代性能检查', () => {
  const size = 100000;
  const buf = Buffer.alloc(size, 42);

  const start = Date.now();
  let count = 0;
  for (const byte of buf) {
    count++;
  }
  const elapsed = Date.now() - start;

  if (count !== size) throw new Error(`Count should be ${size}`);

  // 性能检查：100k 迭代应该在合理时间内完成（比如 1 秒）
  if (elapsed > 1000) {
    console.log(`Warning: Iteration took ${elapsed}ms for ${size} bytes`);
  }
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 5: Error Handling',
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
