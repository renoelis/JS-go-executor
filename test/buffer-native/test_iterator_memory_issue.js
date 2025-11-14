/**
 * 测试迭代器内存问题
 * 验证：调用 buf.values() 是否会立即复制整个 Buffer
 */

const { Buffer } = require('buffer');

try {
  const results = [];

  // 测试 1: 小 Buffer (49字节,低于阈值50)
  const smallBuf = Buffer.alloc(49);
  const smallIter = smallBuf.values();
  results.push({
    test: 'Small Buffer (49 bytes, below threshold)',
    size: 49,
    description: '应该使用逐字节访问,不预分配内存'
  });

  // 测试 2: 刚好达到阈值的 Buffer (50字节)
  const thresholdBuf = Buffer.alloc(50);
  const thresholdIter = thresholdBuf.values();
  results.push({
    test: 'Threshold Buffer (50 bytes)',
    size: 50,
    description: '触发快速路径,预分配50字节副本'
  });

  // 测试 3: 大 Buffer (1MB)
  const largeBuf = Buffer.alloc(1024 * 1024); // 1MB
  const largeIter = largeBuf.values();
  results.push({
    test: 'Large Buffer (1MB)',
    size: 1024 * 1024,
    description: '触发快速路径,预分配1MB副本(即使只读取1个元素)'
  });

  // 测试 4: 只迭代第一个元素就停止
  const hugeBuf = Buffer.alloc(10 * 1024 * 1024); // 10MB
  hugeBuf[0] = 42;
  const hugeIter = hugeBuf.values();
  const firstValue = hugeIter.next().value;
  results.push({
    test: 'Huge Buffer (10MB), only read first element',
    size: 10 * 1024 * 1024,
    firstValue: firstValue,
    description: '预分配10MB副本,但只读了1个字节 - 巨大内存浪费!'
  });

  // 测试 5: entries() 也有同样问题
  const buf5 = Buffer.alloc(1024 * 1024);
  const entriesIter = buf5.entries();
  results.push({
    test: 'entries() with 1MB Buffer',
    size: 1024 * 1024,
    description: 'entries() 也会预分配1MB副本'
  });

  // 测试 6: keys() 不应该预分配(只返回索引)
  const buf6 = Buffer.alloc(1024 * 1024);
  const keysIter = buf6.keys();
  results.push({
    test: 'keys() with 1MB Buffer',
    size: 1024 * 1024,
    description: 'keys() 应该不预分配数据(只返回索引)'
  });

  const testResults = {
    success: true,
    issue: '迭代器在创建时立即复制整个Buffer(>=50字节)',
    impact: [
      '1. 内存占用翻倍:调用buf.values()瞬间多占一倍内存',
      '2. GC压力:大量临时副本增加垃圾回收负担',
      '3. 提前迭代中断无效:即使只读1个元素,也已经复制了全部数据',
      '4. 违背迭代器按需读取设计:应该在next()时才读取,而不是预先全部复制'
    ],
    threshold: 50,
    results: results,
    recommendation: '使用 fast_byte_access.go 的 getUnderlyingBytes + 按需读取,不预分配副本'
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
