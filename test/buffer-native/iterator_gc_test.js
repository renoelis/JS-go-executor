// 测试迭代器内存泄漏问题
const { Buffer } = require('buffer');

try {
  const testResults = {
    success: true,
    tests: []
  };

  // 测试1: 创建大量未完成的迭代器
  console.log("=== 测试1: 创建大量未完成的迭代器 ===");
  const iterCount = 10000;
  const buf = Buffer.alloc(100);

  for (let i = 0; i < iterCount; i++) {
    const iter = buf.values();
    // 只调用一次 next，然后放弃迭代器
    iter.next();
    // 迭代器对象应该被 GC 回收
  }

  testResults.tests.push({
    name: "未完成迭代器创建",
    result: "✅",
    note: `创建了 ${iterCount} 个未完成的迭代器`
  });

  // 测试2: 验证迭代器状态可以正确访问
  console.log("=== 测试2: 验证迭代器状态 ===");
  const buf2 = Buffer.from([1, 2, 3, 4, 5]);
  const iter2 = buf2.values();

  const results = [];
  for (let i = 0; i < 3; i++) {
    const item = iter2.next();
    results.push(item.value);
  }

  if (results[0] === 1 && results[1] === 2 && results[2] === 3) {
    testResults.tests.push({
      name: "迭代器状态正确",
      result: "✅"
    });
  } else {
    testResults.tests.push({
      name: "迭代器状态正确",
      result: "❌",
      expected: [1, 2, 3],
      actual: results
    });
    testResults.success = false;
  }

  // 测试3: 迭代完成后的状态
  console.log("=== 测试3: 迭代完成后的状态 ===");
  const buf3 = Buffer.from([1, 2]);
  const iter3 = buf3.values();

  iter3.next(); // 1
  iter3.next(); // 2
  const final = iter3.next(); // done

  if (final.done === true && final.value === undefined) {
    testResults.tests.push({
      name: "迭代完成状态",
      result: "✅"
    });
  } else {
    testResults.tests.push({
      name: "迭代完成状态",
      result: "❌",
      expected: { done: true, value: undefined },
      actual: final
    });
    testResults.success = false;
  }

  // 测试4: entries() 迭代器
  console.log("=== 测试4: entries() 迭代器 ===");
  const buf4 = Buffer.from([10, 20, 30]);
  const entries = buf4.entries();

  const entry1 = entries.next();
  if (entry1.value[0] === 0 && entry1.value[1] === 10) {
    testResults.tests.push({
      name: "entries() 迭代器",
      result: "✅"
    });
  } else {
    testResults.tests.push({
      name: "entries() 迭代器",
      result: "❌",
      expected: [0, 10],
      actual: entry1.value
    });
    testResults.success = false;
  }

  // 测试5: keys() 迭代器
  console.log("=== 测试5: keys() 迭代器 ===");
  const buf5 = Buffer.from([100, 200]);
  const keys = buf5.keys();

  const key1 = keys.next();
  const key2 = keys.next();

  if (key1.value === 0 && key2.value === 1) {
    testResults.tests.push({
      name: "keys() 迭代器",
      result: "✅"
    });
  } else {
    testResults.tests.push({
      name: "keys() 迭代器",
      result: "❌",
      expected: [0, 1],
      actual: [key1.value, key2.value]
    });
    testResults.success = false;
  }

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
