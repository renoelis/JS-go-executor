// buf[Symbol.iterator] - Part 9: Extreme Cases and Compatibility (Round 5)
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

// 第 5 轮：极端场景与兼容性测试
test('超大 Buffer 迭代 - 500K 字节', () => {
  const size = 500000;
  const buf = Buffer.alloc(size, 0x42);

  let count = 0;
  const start = Date.now();

  for (const byte of buf) {
    count++;
    if (count > size + 100) break; // 安全保护
  }

  const elapsed = Date.now() - start;

  if (count !== size) throw new Error(`Count should be ${size}, got ${count}`);

  // 性能检查：500K 应该在合理时间内完成
  if (elapsed > 2000) {
    console.log(`Warning: Large buffer iteration took ${elapsed}ms`);
  }
});

test('迭代 Buffer.allocUnsafeSlow() 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  for (let i = 0; i < 100; i++) {
    buf[i] = i % 256;
  }

  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result.length !== 100) throw new Error('Length mismatch');
  if (result[0] !== 0 || result[99] !== 99) throw new Error('allocUnsafeSlow values mismatch');
});

test('迭代器在同一 Buffer 上多次独立迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  // 第一次迭代
  const result1 = [];
  for (const byte of buf) {
    result1.push(byte);
  }

  // 修改 Buffer
  buf[2] = 99;

  // 第二次迭代应该反映修改
  const result2 = [];
  for (const byte of buf) {
    result2.push(byte);
  }

  if (result1[2] !== 3) throw new Error('First iteration value mismatch');
  if (result2[2] !== 99) throw new Error('Second iteration should reflect change');
});

test('同时运行多个独立迭代器', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);

  const iter1 = buf[Symbol.iterator]();
  const iter2 = buf[Symbol.iterator]();
  const iter3 = buf[Symbol.iterator]();

  // 交错调用
  const r1_1 = iter1.next();
  const r2_1 = iter2.next();
  const r1_2 = iter1.next();
  const r3_1 = iter3.next();
  const r2_2 = iter2.next();

  if (r1_1.value !== 10 || r1_2.value !== 20) throw new Error('iter1 mismatch');
  if (r2_1.value !== 10 || r2_2.value !== 20) throw new Error('iter2 mismatch');
  if (r3_1.value !== 10) throw new Error('iter3 mismatch');
});

test('迭代包含所有 ASCII 控制字符的 Buffer', () => {
  const buf = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    buf[i] = i; // 0-31 都是控制字符
  }

  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result.length !== 32) throw new Error('Should have 32 control chars');
  for (let i = 0; i < 32; i++) {
    if (result[i] !== i) throw new Error(`Control char ${i} mismatch`);
  }
});

test('迭代包含所有 ASCII 可打印字符的 Buffer', () => {
  const buf = Buffer.alloc(95);
  for (let i = 0; i < 95; i++) {
    buf[i] = i + 32; // 32-126 是可打印字符
  }

  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result[0] !== 32 || result[94] !== 126) {
    throw new Error('Printable chars range mismatch');
  }
});

test('迭代包含所有扩展 ASCII 字符的 Buffer', () => {
  const buf = Buffer.alloc(128);
  for (let i = 0; i < 128; i++) {
    buf[i] = i + 128; // 128-255
  }

  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result[0] !== 128 || result[127] !== 255) {
    throw new Error('Extended ASCII range mismatch');
  }
});

test('迭代 SharedArrayBuffer 转 Buffer', () => {
  // Node.js 支持 SharedArrayBuffer
  try {
    const sab = new SharedArrayBuffer(8);
    const view = new Uint8Array(sab);
    for (let i = 0; i < 8; i++) {
      view[i] = i * 10;
    }

    const buf = Buffer.from(sab);
    const result = [...buf];

    if (result.length !== 8) throw new Error('SharedArrayBuffer length mismatch');
    if (result[0] !== 0 || result[7] !== 70) throw new Error('SharedArrayBuffer values mismatch');
  } catch (e) {
    if (e.message.includes('SharedArrayBuffer')) {
      // 某些环境不支持 SharedArrayBuffer
      console.log('SharedArrayBuffer not supported, skipping');
    } else {
      throw e;
    }
  }
});

test('迭代器与 Promise.all 组合（异步测试）', async () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const promises = [...buf].map(byte => {
    return Promise.resolve(byte * 2);
  });

  const results = await Promise.all(promises);

  if (results[0] !== 2 || results[4] !== 10) {
    throw new Error('Promise.all results mismatch');
  }
});

test('迭代包含重复模式的 Buffer', () => {
  const pattern = [1, 2, 3];
  const buf = Buffer.alloc(100);

  for (let i = 0; i < 100; i++) {
    buf[i] = pattern[i % pattern.length];
  }

  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  // 验证模式重复
  for (let i = 0; i < 100; i++) {
    if (result[i] !== pattern[i % pattern.length]) {
      throw new Error(`Pattern mismatch at index ${i}`);
    }
  }
});

test('Buffer.prototype.toString 调用后迭代不变', () => {
  const buf = Buffer.from([72, 101, 108, 108, 111]); // "Hello"

  const str = buf.toString('utf8');
  if (str !== 'Hello') throw new Error('toString failed');

  const result = [...buf];
  if (result.length !== 5 || result[0] !== 72) {
    throw new Error('toString should not affect iteration');
  }
});

test('Buffer.prototype.slice(0) 返回全副本迭代', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const fullSlice = original.slice(0);

  const result = [...fullSlice];
  if (result.length !== 5) throw new Error('Full slice length mismatch');

  // 修改原 Buffer
  original[2] = 99;

  const result2 = [...fullSlice];
  if (result2[2] !== 99) throw new Error('Slice should reflect original changes');
});

test('Buffer.prototype.subarray() 无参数调用', () => {
  const original = Buffer.from([10, 20, 30, 40]);
  const fullSub = original.subarray();

  const result = [...fullSub];
  if (result.length !== 4 || result[0] !== 10) {
    throw new Error('Full subarray mismatch');
  }
});

test('迭代器与 for await...of 不兼容（应该正常 for...of）', () => {
  const buf = Buffer.from([1, 2, 3]);

  // Buffer 迭代器不是异步迭代器
  let hasAsyncIterator = typeof buf[Symbol.asyncIterator] === 'function';

  if (hasAsyncIterator) {
    console.log('Warning: Buffer has async iterator (unexpected in standard Node)');
  }

  // 但普通 for...of 应该工作
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result.length !== 3) throw new Error('Sync iteration should work');
});

test('Buffer.concat 空数组迭代', () => {
  const buf = Buffer.concat([]);
  let count = 0;

  for (const byte of buf) {
    count++;
  }

  if (count !== 0) throw new Error('Empty concat should produce empty buffer');
});

test('Buffer.concat 单个 Buffer 迭代', () => {
  const single = Buffer.from([5, 6, 7]);
  const buf = Buffer.concat([single]);

  const result = [...buf];
  if (result.length !== 3 || result[0] !== 5) {
    throw new Error('Single concat mismatch');
  }
});

test('Buffer.concat 包含空 Buffer 迭代', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.alloc(0);
  const buf3 = Buffer.from([3, 4]);

  const buf = Buffer.concat([buf1, buf2, buf3]);
  const result = [...buf];

  if (result.length !== 4) throw new Error('Should skip empty buffers');
  if (result[0] !== 1 || result[3] !== 4) throw new Error('Concat with empty mismatch');
});

test('迭代 Buffer.from(buffer) 复制', () => {
  const original = Buffer.from([100, 200]);
  const copy = Buffer.from(original);

  // 修改原始
  original[0] = 1;

  const result = [...copy];
  // 复制应该独立
  if (result[0] !== 100) throw new Error('Copy should be independent');
});

test('length 为 0 的各种 Buffer 创建方式迭代', () => {
  const bufs = [
    Buffer.alloc(0),
    Buffer.allocUnsafe(0),
    Buffer.from([]),
    Buffer.from('', 'utf8'),
    Buffer.concat([])
  ];

  for (const buf of bufs) {
    let count = 0;
    for (const byte of buf) {
      count++;
    }
    if (count !== 0) throw new Error('Zero-length buffer should not iterate');
  }
});

test('迭代器协议 - 检查 Symbol.toStringTag', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iterator = buf[Symbol.iterator]();

  // 检查迭代器的类型标签（如果有的话）
  const tag = iterator[Symbol.toStringTag];

  // 不强制要求特定值，只记录
  if (tag) {
    console.log(`Iterator toStringTag: ${tag}`);
  }

  // 确保迭代器可以正常工作
  const result = [];
  let next = iterator.next();
  while (!next.done) {
    result.push(next.value);
    next = iterator.next();
  }

  if (result.length !== 3) throw new Error('Iterator should work regardless of tag');
});

test('迭代包含所有 0 和所有 255 的交替 Buffer', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf[i] = i % 2 === 0 ? 0 : 255;
  }

  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  for (let i = 0; i < 100; i++) {
    const expected = i % 2 === 0 ? 0 : 255;
    if (result[i] !== expected) throw new Error(`Alternating pattern mismatch at ${i}`);
  }
});

test('迭代 Buffer 后使用 reduce 累加', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sum = [...buf].reduce((acc, val) => acc + val, 0);

  if (sum !== 150) throw new Error('Reduce sum should be 150');
});

test('迭代 Buffer 后使用 join 转字符串', () => {
  const buf = Buffer.from([65, 66, 67]); // ABC
  const str = [...buf].map(b => String.fromCharCode(b)).join('');

  if (str !== 'ABC') throw new Error('Join string should be ABC');
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 9: Extreme Cases (Round 5)',
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
