// buf.swap16/swap32/swap64 - Part 15: TypedArray Methods & Advanced Features (Round 12)
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: '✅' });
    console.log(`✅ ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// ==================== Symbol 相关 ====================

test('swap16 - Symbol.toStringTag', () => {
  const buf = Buffer.from([0x01, 0x02]);
  buf.swap16();

  if (buf[Symbol.toStringTag] !== 'Uint8Array') {
    throw new Error('Symbol.toStringTag should be Uint8Array');
  }
});

test('swap32 - Symbol.iterator', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const iter = buf[Symbol.iterator]();
  const first = iter.next();

  if (first.value !== 0x04 || first.done !== false) {
    throw new Error('Symbol.iterator failed');
  }
});

test('swap64 + for...of 循环', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  const values = [];
  for (const byte of buf) {
    values.push(byte);
  }

  if (values[0] !== 0x08 || values[7] !== 0x01) {
    throw new Error('for...of after swap failed');
  }
});

// ==================== indexOf/includes 带 byteOffset ====================

test('swap16 + indexOf byteOffset', () => {
  const buf = Buffer.from([0x01, 0x02, 0x01, 0x02, 0x01, 0x02]);
  buf.swap16();

  const idx = buf.indexOf(0x02, 2);

  if (idx !== 2) {
    throw new Error('indexOf with byteOffset failed');
  }
});

test('swap32 + includes byteOffset', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const has = buf.includes(0x01, 2);

  if (!has) {
    throw new Error('includes with byteOffset failed');
  }
});

test('swap64 + indexOf 负 byteOffset', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  const idx = buf.indexOf(0x01, -2);

  if (idx !== 7) {
    throw new Error('indexOf with negative offset failed');
  }
});

// ==================== reduce/reduceRight ====================

test('swap16 + reduce 求和', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sumBefore = buf.reduce((acc, val) => acc + val, 0);

  buf.swap16();
  const sumAfter = buf.reduce((acc, val) => acc + val, 0);

  if (sumBefore !== sumAfter) {
    throw new Error('Sum should not change after swap');
  }
});

test('swap32 + reduceRight', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const result = buf.reduceRight((acc, val) => acc + val, 0);

  if (result !== 10) {
    throw new Error('reduceRight failed');
  }
});

test('swap64 + reduce 拼接字节', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  const hex = buf.reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');

  if (hex[0] !== '0' || hex.length !== 16) {
    throw new Error('reduce hex concatenation failed');
  }
});

// ==================== some/every ====================

test('swap16 + some 条件查找', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();

  const hasLarge = buf.some(b => b > 3);

  if (!hasLarge) {
    throw new Error('some should find value > 3');
  }
});

test('swap32 + every 全部非零', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const allNonZero = buf.every(b => b !== 0);

  if (!allNonZero) {
    throw new Error('every should return true for non-zero');
  }
});

test('swap64 + some 查找零值', () => {
  const buf = Buffer.from([0x01, 0x02, 0x00, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  const hasZero = buf.some(b => b === 0);

  if (!hasZero) {
    throw new Error('some should find zero');
  }
});

// ==================== map/filter ====================

test('swap16 + map 乘法', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();

  const mapped = buf.map(b => b * 2);

  if (!(mapped instanceof Uint8Array)) {
    throw new Error('map should return Uint8Array');
  }
});

test('swap32 + filter 过滤', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const filtered = buf.filter(b => b > 2);

  if (filtered.length !== 2) {
    throw new Error('filter should return 2 elements');
  }
});

test('swap64 + map 保持长度', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  const mapped = buf.map(b => b);

  if (mapped.length !== buf.length) {
    throw new Error('map should preserve length');
  }
});

// ==================== find/findIndex/findLast/findLastIndex ====================

test('swap16 + findIndex', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();

  const idx = buf.findIndex(b => b > 2);

  if (idx < 0) {
    throw new Error('findIndex should find element');
  }
});

test('swap32 + find 查找元素', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const val = buf.find(b => b === 0x04);

  if (val !== 0x04) {
    throw new Error('find should return 0x04');
  }
});

test('swap64 + findLast（如果存在）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  if (typeof buf.findLast === 'function') {
    const val = buf.findLast(b => b < 5);
    if (val === undefined) {
      throw new Error('findLast should find element');
    }
  }
});

test('swap16 + findLastIndex（如果存在）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x01, 0x02]);
  buf.swap16();

  if (typeof buf.findLastIndex === 'function') {
    const idx = buf.findLastIndex(b => b === 0x01);
    if (idx < 0) {
      throw new Error('findLastIndex should find element');
    }
  }
});

// ==================== join ====================

test('swap16 + join', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();

  const joined = buf.join('-');

  if (!joined.includes('-')) {
    throw new Error('join should use separator');
  }
});

test('swap32 + join 空分隔符', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const joined = buf.join('');

  if (joined.length < 4) {
    throw new Error('join with empty separator failed');
  }
});

// ==================== toSorted/toReversed/with ====================

test('swap16 + toSorted（ES2023）', () => {
  const buf = Buffer.from([0x03, 0x01, 0x04, 0x02]);
  buf.swap16();

  if (typeof buf.toSorted === 'function') {
    const sorted = buf.toSorted();
    // toSorted 返回新数组，原数组不变
    if (sorted[0] > sorted[sorted.length - 1]) {
      throw new Error('toSorted should return sorted array');
    }
  }
});

test('swap32 + toReversed（ES2023）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  if (typeof buf.toReversed === 'function') {
    const reversed = buf.toReversed();
    if (reversed[0] !== buf[buf.length - 1]) {
      throw new Error('toReversed failed');
    }
  }
});

test('swap64 + with（ES2023）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  if (typeof buf.with === 'function') {
    const updated = buf.with(0, 0xFF);
    // with 返回新数组，原数组不变
    if (buf[0] === 0xFF) {
      throw new Error('with should not mutate original');
    }
  }
});

// ==================== forEach ====================

test('swap16 + forEach 遍历', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();

  let count = 0;
  buf.forEach((val, idx) => {
    count++;
    if (idx !== count - 1) {
      throw new Error('forEach index incorrect');
    }
  });

  if (count !== 4) {
    throw new Error('forEach count incorrect');
  }
});

test('swap32 + forEach this 绑定', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const thisArg = { sum: 0 };
  buf.forEach(function(val) {
    this.sum += val;
  }, thisArg);

  if (thisArg.sum !== 10) {
    throw new Error('forEach this binding failed');
  }
});

// ==================== toString 默认编码 ====================

test('swap16 + toString 默认 utf8', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C]); // "Hell"
  const str1 = buf.toString();

  buf.swap16();
  const str2 = buf.toString();

  if (str1 === str2) {
    throw new Error('swap should change toString result');
  }
});

test('swap32 + toString ASCII 范围', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44]); // "ABCD"
  buf.swap32();

  const str = buf.toString('ascii');

  if (str === 'ABCD') {
    throw new Error('swap32 should change ASCII string');
  }
});

// ==================== inspect ====================

test('swap16 + inspect 方法', () => {
  const buf = Buffer.from([0x01, 0x02]);
  buf.swap16();

  if (typeof buf.inspect === 'function') {
    const inspectStr = buf.inspect();
    if (!inspectStr.includes('Buffer')) {
      throw new Error('inspect should contain Buffer');
    }
  }
});

// ==================== at() 方法 ====================

test('swap16 + at() 正索引', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();

  if (typeof buf.at === 'function') {
    const val = buf.at(0);
    if (val !== buf[0]) {
      throw new Error('at(0) should equal buf[0]');
    }
  }
});

test('swap32 + at() 负索引', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  if (typeof buf.at === 'function') {
    const last = buf.at(-1);
    if (last !== buf[buf.length - 1]) {
      throw new Error('at(-1) should equal last element');
    }
  }
});

test('swap64 + at() 越界', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  if (typeof buf.at === 'function') {
    const outOfBounds = buf.at(100);
    if (outOfBounds !== undefined) {
      throw new Error('at(100) should be undefined');
    }
  }
});

// ==================== subarray 负参数 ====================

test('swap16 + subarray 负 start', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();

  const sub = buf.subarray(-2);

  if (sub.length !== 2) {
    throw new Error('subarray(-2) length should be 2');
  }
});

test('swap32 + subarray 负 start 和 end', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap32();

  const sub = buf.subarray(-4, -1);

  if (sub.length !== 3) {
    throw new Error('subarray(-4, -1) length should be 3');
  }
});

test('swap64 + subarray 负索引共享内存', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const sub = buf.subarray(-4);

  sub.swap32();

  // 验证原 buffer 被修改
  if (buf[4] === 0x05) {
    throw new Error('subarray(-4) should share memory');
  }
});

// ==================== allocUnsafe swap ====================

test('swap16 - allocUnsafe 未初始化内存', () => {
  const buf = Buffer.allocUnsafe(4);

  // 对未初始化内存 swap 应该成功
  buf.swap16();

  if (buf.length !== 4) {
    throw new Error('allocUnsafe swap failed');
  }
});

test('swap32 - allocUnsafe 立即 swap', () => {
  const buf = Buffer.allocUnsafe(8);

  // 不初始化直接 swap
  try {
    buf.swap32();
  } catch (e) {
    throw new Error('allocUnsafe should allow swap: ' + e.message);
  }
});

// ==================== 超大 buffer ====================

test('swap16 - 1MB buffer 首尾验证', () => {
  const buf = Buffer.alloc(1000000);
  buf[0] = 0x01;
  buf[1] = 0x02;
  buf[999998] = 0xFE;
  buf[999999] = 0xFF;

  buf.swap16();

  if (buf[0] !== 0x02 || buf[1] !== 0x01 || buf[999998] !== 0xFF || buf[999999] !== 0xFE) {
    throw new Error('1MB swap16 head/tail failed');
  }
});

test('swap32 - 大 buffer 中间验证', () => {
  const buf = Buffer.alloc(100000);
  buf[50000] = 0x01;
  buf[50001] = 0x02;
  buf[50002] = 0x03;
  buf[50003] = 0x04;

  buf.swap32();

  if (buf[50000] !== 0x04 || buf[50003] !== 0x01) {
    throw new Error('Large buffer middle swap failed');
  }
});

// ==================== Buffer 全局属性 ====================

test('Buffer.poolSize 访问', () => {
  const poolSize = Buffer.poolSize;

  if (typeof poolSize !== 'number' || poolSize <= 0) {
    throw new Error('Buffer.poolSize should be positive number');
  }
});

test('swap 不影响 Buffer.poolSize', () => {
  const before = Buffer.poolSize;

  const buf = Buffer.from([0x01, 0x02]);
  buf.swap16();

  if (Buffer.poolSize !== before) {
    throw new Error('swap should not affect poolSize');
  }
});

// ==================== 总结 ====================

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
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
