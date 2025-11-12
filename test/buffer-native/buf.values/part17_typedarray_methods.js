// buf.values() - 深度补充 Part 17: TypedArray 方法和互操作
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

// 测试 1: at() 方法正索引
test('at() 方法应支持正索引', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9]);

  return buf.at(0) === 5 && buf.at(2) === 8 && buf.at(4) === 9;
});

// 测试 2: at() 方法负索引
test('at() 方法应支持负索引', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9]);

  return buf.at(-1) === 9 && buf.at(-2) === 1 && buf.at(-5) === 5;
});

// 测试 3: at() 方法越界返回 undefined
test('at() 方法越界应返回 undefined', () => {
  const buf = Buffer.from([1, 2, 3]);

  return buf.at(10) === undefined && buf.at(-10) === undefined;
});

// 测试 4: findLast() 方法
test('findLast() 应从末尾查找', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9, 3]);

  const result = buf.findLast(x => x > 5);

  return result === 9;
});

// 测试 5: findLast() 未找到返回 undefined
test('findLast() 未找到应返回 undefined', () => {
  const buf = Buffer.from([1, 2, 3]);

  return buf.findLast(x => x > 10) === undefined;
});

// 测试 6: findLastIndex() 方法
test('findLastIndex() 应返回最后匹配的索引', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9, 3]);

  const idx = buf.findLastIndex(x => x > 5);

  return idx === 4;
});

// 测试 7: findLastIndex() 未找到返回 -1
test('findLastIndex() 未找到应返回 -1', () => {
  const buf = Buffer.from([1, 2, 3]);

  return buf.findLastIndex(x => x > 10) === -1;
});

// 测试 8: with() 方法（如果支持）
test('with() 方法应创建新 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);

  if (typeof buf.with !== 'function') {
    return true; // 如果不支持，测试通过
  }

  const newBuf = buf.with(1, 99);
  return newBuf[1] === 99 && buf[1] === 2 && newBuf !== buf;
});

// 测试 9: toReversed() 方法（如果支持）
test('toReversed() 应创建反转的新 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  if (typeof buf.toReversed !== 'function') {
    return true;
  }

  const reversed = buf.toReversed();
  return reversed[0] === 5 && buf[0] === 1 && reversed !== buf;
});

// 测试 10: toSorted() 方法（如果支持）
test('toSorted() 应创建排序的新 Buffer', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9]);

  if (typeof buf.toSorted !== 'function') {
    return true;
  }

  const sorted = buf.toSorted();
  return sorted[0] === 1 && buf[0] === 5 && sorted !== buf;
});

// 测试 11: Buffer.compare 完整参数
test('Buffer.compare 应支持完整参数', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 4, 4, 5]);

  // 比较前两个字节，应该相等
  const result = buf1.compare(buf2, 0, 2, 0, 2);

  return result === 0;
});

// 测试 12: Buffer.compare 不同范围
test('Buffer.compare 不同范围应正确', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5]);

  // 比较第三个字节开始
  const result = buf1.compare(buf2, 2, 5, 2, 5);

  return result === 0;
});

// 测试 13: Buffer 继承 TypedArray 的 join
test('Buffer 应继承 TypedArray 的 join 方法', () => {
  const buf = Buffer.from([1, 2, 3]);

  return buf.join(',') === '1,2,3' && buf.join('-') === '1-2-3';
});

// 测试 14: Buffer 的 reduce 方法
test('Buffer reduce 应正确累加', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const sum = buf.reduce((acc, val) => acc + val, 0);

  return sum === 15;
});

// 测试 15: Buffer 的 reduceRight 方法
test('Buffer reduceRight 应从右向左累加', () => {
  const buf = Buffer.from([1, 2, 3]);

  const result = buf.reduceRight((acc, val) => acc * 10 + val, 0);

  // 0 * 10 + 3 = 3
  // 3 * 10 + 2 = 32
  // 32 * 10 + 1 = 321
  return result === 321;
});

// 测试 16: Buffer 的 filter 创建新 Buffer
test('filter 应创建新 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const filtered = buf.filter(x => x > 2);

  if (filtered.length !== 3) return false;
  if (filtered[0] !== 3 || filtered[2] !== 5) return false;
  if (buf[0] !== 1) return false; // 原 Buffer 不变

  return true;
});

// 测试 17: Buffer 的 map 创建新 Buffer
test('map 应创建新 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);

  const mapped = buf.map(x => x * 2);

  if (mapped.length !== 3) return false;
  if (mapped[0] !== 2 || mapped[2] !== 6) return false;
  if (buf[0] !== 1) return false; // 原 Buffer 不变

  return true;
});

// 测试 18: Buffer 的 slice 与 TypedArray 一致性
test('slice 行为应与 TypedArray 一致', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const sliced = buf.slice(1, 4);

  // Node v25 中 slice 创建视图
  buf[2] = 99;

  const values = [...sliced.values()];

  return values.length === 3 && values[1] === 99;
});

// 测试 19: Buffer 的 subarray 与 TypedArray 一致性
test('subarray 应创建共享内存视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const sub = buf.subarray(1, 4);

  buf[2] = 99;

  const values = [...sub.values()];

  return values.length === 3 && values[1] === 99;
});

// 测试 20: Buffer 的 sort 修改原 Buffer
test('sort 应修改原 Buffer', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9]);

  buf.sort();

  const values = [...buf.values()];

  return values[0] === 1 && values[4] === 9;
});

// 测试 21: Buffer 的 sort 自定义比较函数
test('sort 应支持自定义比较函数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  buf.sort((a, b) => b - a); // 降序

  const values = [...buf.values()];

  return values[0] === 5 && values[4] === 1;
});

// 测试 22: Buffer 的 reverse 修改原 Buffer
test('reverse 应修改原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  buf.reverse();

  const values = [...buf.values()];

  return values[0] === 5 && values[4] === 1;
});

// 测试 23: Buffer 的 copyWithin 修改原 Buffer
test('copyWithin 应修改原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  buf.copyWithin(0, 3, 5); // 将 [4,5] 复制到开头

  const values = [...buf.values()];

  return values[0] === 4 && values[1] === 5;
});

// 测试 24: Buffer 的 fill 修改原 Buffer
test('fill 应修改原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  buf.fill(99, 1, 4); // 索引 1-3 填充 99

  const values = [...buf.values()];

  return values[0] === 1 && values[1] === 99 && values[3] === 99 && values[4] === 5;
});

// 测试 25: Buffer 的 set 方法
test('set 方法应设置多个值', () => {
  const buf = Buffer.alloc(10);
  const source = new Uint8Array([10, 20, 30]);

  buf.set(source, 2); // 从索引 2 开始设置

  const values = [...buf.values()];

  return values[0] === 0 && values[2] === 10 && values[4] === 30 && values[5] === 0;
});

// 测试 26: Buffer 的 indexOf 查找字节
test('indexOf 应能查找单个字节', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);

  const idx = buf.indexOf(2);

  return idx === 1;
});

// 测试 27: Buffer 的 indexOf 查找 Buffer
test('indexOf 应能查找 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const search = Buffer.from([3, 4]);

  const idx = buf.indexOf(search);

  return idx === 2;
});

// 测试 28: Buffer 的 indexOf 查找字符串
test('indexOf 应能查找字符串', () => {
  const buf = Buffer.from('hello world');

  const idx = buf.indexOf('world');

  return idx === 6;
});

// 测试 29: Buffer 的 lastIndexOf 查找
test('lastIndexOf 应从末尾查找', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);

  const idx = buf.lastIndexOf(2);

  return idx === 3;
});

// 测试 30: Buffer 的 includes 查找
test('includes 应检查是否包含值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  return buf.includes(3) && !buf.includes(10);
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
