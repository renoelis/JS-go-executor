// buf[Symbol.iterator] - Part 7: Node Behavior Edge Cases (Round 3)
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

// 第 3 轮：实际行为与边缘场景
test('迭代器不支持 return() 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iterator = buf[Symbol.iterator]();

  // 标准迭代器协议不要求 return 方法，检查是否存在
  const hasReturn = typeof iterator.return === 'function';

  // 如果存在，测试它的行为
  if (hasReturn) {
    const result = iterator.return();
    if (result.done !== true) throw new Error('return() should set done to true');
  }

  // 无论是否存在 return，都应该可以正常迭代
  const buf2 = Buffer.from([4, 5, 6]);
  const result = [];
  for (const byte of buf2) {
    result.push(byte);
    break; // 提前退出
  }
  if (result.length !== 1) throw new Error('Early exit should work');
});

test('迭代器不支持 throw() 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iterator = buf[Symbol.iterator]();

  // 生成器迭代器有 throw()，但 Buffer 迭代器不是生成器
  const hasThrow = typeof iterator.throw === 'function';

  if (hasThrow) {
    console.log('Warning: Buffer iterator has throw() method (unexpected)');
  }

  // 确保即使没有 throw，正常迭代也能工作
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result.length !== 3) throw new Error('Normal iteration should work');
});

test('大端序和小端序不影响迭代顺序', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x12345678, 0); // 大端序写入

  const result1 = [...buf];

  buf.writeUInt32LE(0x12345678, 0); // 小端序写入
  const result2 = [...buf];

  // 两种写入方式的字节顺序应该不同
  if (JSON.stringify(result1) === JSON.stringify(result2)) {
    throw new Error('Endianness should affect byte order');
  }

  // 但迭代都应该按存储顺序返回
  if (result1.length !== 4 || result2.length !== 4) {
    throw new Error('Both should have 4 bytes');
  }
});

test('Buffer.poolSize 不影响迭代', () => {
  const originalPoolSize = Buffer.poolSize;

  // 创建小 Buffer（通常会使用 pool）
  const smallBuf = Buffer.from([1, 2, 3]);
  const smallResult = [...smallBuf];

  // 创建大 Buffer（不使用 pool）
  const largeBuf = Buffer.alloc(Buffer.poolSize + 100);
  largeBuf[0] = 1;
  largeBuf[1] = 2;
  largeBuf[2] = 3;

  let count = 0;
  for (const byte of largeBuf) {
    count++;
    if (count > Buffer.poolSize + 200) break; // 防止无限循环
  }

  if (count !== Buffer.poolSize + 100) {
    throw new Error('Large buffer iteration count mismatch');
  }
});

test('连续调用 next() 与 for...of 结果一致', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);

  // 手动 next()
  const iterator = buf[Symbol.iterator]();
  const manual = [];
  let result = iterator.next();
  while (!result.done) {
    manual.push(result.value);
    result = iterator.next();
  }

  // for...of
  const automatic = [];
  for (const byte of buf) {
    automatic.push(byte);
  }

  if (manual.length !== automatic.length) throw new Error('Length mismatch');
  for (let i = 0; i < manual.length; i++) {
    if (manual[i] !== automatic[i]) throw new Error(`Value mismatch at ${i}`);
  }
});

test('Buffer 视图（slice/subarray）的迭代器独立性', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const slice1 = original.slice(0, 3);
  const slice2 = original.slice(2, 5);

  const result1 = [...slice1]; // [1, 2, 3]
  const result2 = [...slice2]; // [3, 4, 5]

  if (result1.length !== 3 || result2.length !== 3) {
    throw new Error('Slice lengths mismatch');
  }

  if (result1[2] !== 3 || result2[0] !== 3) {
    throw new Error('Overlapping slices should share value');
  }

  // 修改原 Buffer
  original[2] = 99;

  const result3 = [...slice1]; // [1, 2, 99]
  const result4 = [...slice2]; // [99, 4, 5]

  if (result3[2] !== 99 || result4[0] !== 99) {
    throw new Error('Slice views should reflect original changes');
  }
});

test('迭代全 0 填充的 allocUnsafe Buffer', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);

  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result.length !== 10) throw new Error('Length mismatch');
  for (const byte of result) {
    if (byte !== 0) throw new Error('All bytes should be 0');
  }
});

test('迭代包含所有相同值的 Buffer', () => {
  const buf = Buffer.alloc(100, 0xAB);
  let count = 0;
  let sum = 0;

  for (const byte of buf) {
    count++;
    sum += byte;
  }

  if (count !== 100) throw new Error('Count should be 100');
  if (sum !== 0xAB * 100) throw new Error('Sum mismatch');
});

test('Buffer.compare() 不影响迭代', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);

  Buffer.compare(buf1, buf2); // 比较操作

  // 迭代应该不受影响
  const result1 = [...buf1];
  const result2 = [...buf2];

  if (result1[2] !== 3 || result2[2] !== 4) {
    throw new Error('Compare should not affect iteration');
  }
});

test('迭代 toString() 后再次创建的 Buffer', () => {
  const original = Buffer.from([65, 66, 67]); // ABC
  const str = original.toString('utf8');
  const recreated = Buffer.from(str, 'utf8');

  const result1 = [...original];
  const result2 = [...recreated];

  if (JSON.stringify(result1) !== JSON.stringify(result2)) {
    throw new Error('Round-trip should preserve bytes');
  }
});

test('迭代包含 null 字节的 Buffer', () => {
  const buf = Buffer.from([1, 0, 2, 0, 3]);
  const result = [];

  for (const byte of buf) {
    result.push(byte);
  }

  if (result.length !== 5) throw new Error('Should have 5 bytes including nulls');
  if (result[1] !== 0 || result[3] !== 0) throw new Error('Null bytes should be 0');
});

test('迭代 Buffer.fill() 部分填充的 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xFF, 2, 7); // 从索引 2 到 6 填充

  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result[0] !== 0 || result[1] !== 0) throw new Error('Beginning should be 0');
  if (result[2] !== 0xFF || result[6] !== 0xFF) throw new Error('Middle should be 0xFF');
  if (result[7] !== 0 || result[9] !== 0) throw new Error('End should be 0');
});

test('迭代 Buffer.write() 部分写入的 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf.write('Hi', 3, 'utf8'); // 从索引 3 写入 "Hi"

  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result[3] !== 72 || result[4] !== 105) { // H=72, i=105
    throw new Error('Written bytes mismatch');
  }
  if (result[0] !== 0 || result[5] !== 0) {
    throw new Error('Unwritten bytes should be 0');
  }
});

test('from/to JSON 不影响迭代', () => {
  const original = Buffer.from([1, 2, 3, 4]);
  const json = original.toJSON();
  const restored = Buffer.from(json.data);

  const result1 = [...original];
  const result2 = [...restored];

  if (JSON.stringify(result1) !== JSON.stringify(result2)) {
    throw new Error('JSON round-trip should preserve iteration');
  }
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 7: Node Behavior Edge Cases (Round 3)',
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
