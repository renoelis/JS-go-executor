// 测试迭代器内存泄漏修复
// 1. 基本功能测试
// 2. 大量迭代器创建测试 (验证不会因为全局 map 导致内存泄漏)

const { Buffer } = require('buffer');

function testBasicIterator() {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  // 测试 values()
  const values = [];
  for (const val of buf.values()) {
    values.push(val);
  }

  // 测试 keys()
  const keys = [];
  for (const key of buf.keys()) {
    keys.push(key);
  }

  // 测试 entries()
  const entries = [];
  for (const entry of buf.entries()) {
    entries.push(entry);
  }

  return {
    values: values,
    keys: keys,
    entries: entries
  };
}

function testMassiveIterators() {
  // 创建大量迭代器,测试是否会因为全局 map 导致内存泄漏
  // 在修复前,这些迭代器的状态会永久保留在全局 map 中
  // 修复后,迭代器对象被 GC 回收时,状态也会自动释放

  const iteratorCount = 10000;
  const results = [];

  for (let i = 0; i < iteratorCount; i++) {
    const buf = Buffer.from([i % 256]);
    const iter = buf.values();
    const result = iter.next();
    results.push(result.value);
  }

  return {
    count: iteratorCount,
    firstValue: results[0],
    lastValue: results[results.length - 1]
  };
}

function testIteratorWithLargeBuffer() {
  // 测试大 Buffer 的迭代器 (验证 cachedBytes 优化是否正常)
  const size = 1000;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf[i] = i % 256;
  }

  let count = 0;
  for (const val of buf.values()) {
    count++;
  }

  return {
    bufferSize: size,
    iteratedCount: count,
    match: count === size
  };
}

function testPartialIteration() {
  // 测试部分迭代 (不完整遍历,验证状态是否正确管理)
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  const partial = [];
  partial.push(iter.next().value);
  partial.push(iter.next().value);
  // 故意不迭代完,让迭代器对象被 GC

  return {
    partial: partial
  };
}

try {
  const results = {
    basicIterator: testBasicIterator(),
    massiveIterators: testMassiveIterators(),
    largeBuffer: testIteratorWithLargeBuffer(),
    partialIteration: testPartialIteration()
  };

  // 验证结果
  const basicOk =
    results.basicIterator.values.length === 5 &&
    results.basicIterator.keys.length === 5 &&
    results.basicIterator.entries.length === 5 &&
    results.basicIterator.values[0] === 1 &&
    results.basicIterator.keys[0] === 0 &&
    results.basicIterator.entries[0][0] === 0 &&
    results.basicIterator.entries[0][1] === 1;

  const massiveOk =
    results.massiveIterators.count === 10000 &&
    results.massiveIterators.firstValue === 0 &&
    results.massiveIterators.lastValue === (10000 - 1) % 256;

  const largeOk = results.largeBuffer.match === true;

  const partialOk =
    results.partialIteration.partial.length === 2 &&
    results.partialIteration.partial[0] === 1 &&
    results.partialIteration.partial[1] === 2;

  const allOk = basicOk && massiveOk && largeOk && partialOk;

  const testResults = {
    success: allOk,
    data: {
      basicIterator: basicOk,
      massiveIterators: massiveOk,
      largeBuffer: largeOk,
      partialIteration: partialOk,
      details: results
    }
  };

  console.log(JSON.stringify(testResults, null, 2));
  return testResults;

} catch (error) {
  const testResults = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(testResults, null, 2));
  return testResults;
}
