// buf[Symbol.iterator] - Part 3: Boundary and Empty Buffer Tests
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

// 边界与空 Buffer 测试
test('空 Buffer 迭代 - for...of', () => {
  const buf = Buffer.alloc(0);
  let count = 0;
  for (const byte of buf) {
    count++;
  }
  if (count !== 0) throw new Error('Empty buffer should not iterate');
});

test('空 Buffer 迭代 - 手动 next()', () => {
  const buf = Buffer.alloc(0);
  const iterator = buf[Symbol.iterator]();
  const first = iterator.next();
  if (first.done !== true) throw new Error('Empty buffer iterator should be done immediately');
  if (first.value !== undefined) throw new Error('Empty buffer should have undefined value');
});

test('长度为 1 的 Buffer 迭代', () => {
  const buf = Buffer.from([42]);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result.length !== 1 || result[0] !== 42) throw new Error('Single byte iteration failed');
});

test('长度为 1 的 Buffer - 手动 next()', () => {
  const buf = Buffer.from([99]);
  const iterator = buf[Symbol.iterator]();

  const first = iterator.next();
  if (first.value !== 99 || first.done !== false) throw new Error('First iteration failed');

  const second = iterator.next();
  if (second.done !== true) throw new Error('Should be done after single iteration');
});

test('大 Buffer 迭代 - 1000 字节', () => {
  const buf = Buffer.alloc(1000, 123);
  let count = 0;
  let sum = 0;
  for (const byte of buf) {
    count++;
    sum += byte;
  }
  if (count !== 1000) throw new Error('Count should be 1000');
  if (sum !== 123000) throw new Error('Sum should be 123000');
});

test('大 Buffer 迭代 - 10000 字节', () => {
  const buf = Buffer.alloc(10000, 1);
  let count = 0;
  for (const byte of buf) {
    count++;
    if (count > 10001) break; // 防止无限循环
  }
  if (count !== 10000) throw new Error(`Count should be 10000, got ${count}`);
});

test('slice 后的空视图迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  const empty = buf.slice(1, 1); // 空 slice
  let count = 0;
  for (const byte of empty) {
    count++;
  }
  if (count !== 0) throw new Error('Empty slice should not iterate');
});

test('subarray 后的空视图迭代', () => {
  const buf = Buffer.from([5, 6, 7]);
  const empty = buf.subarray(2, 2); // 空 subarray
  let count = 0;
  for (const byte of empty) {
    count++;
  }
  if (count !== 0) throw new Error('Empty subarray should not iterate');
});

test('迭代到边界 - 确保最后一个字节被访问', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result[result.length - 1] !== 5) throw new Error('Last byte not accessed');
});

test('迭代中途停止 - break', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
    if (byte === 30) break;
  }
  if (result.length !== 3) throw new Error('Should break at third element');
  if (result[2] !== 30) throw new Error('Break value mismatch');
});

test('迭代中途跳过 - continue', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = [];
  for (const byte of buf) {
    if (byte === 3) continue;
    result.push(byte);
  }
  if (result.length !== 4) throw new Error('Should skip one element');
  if (result.includes(3)) throw new Error('Should not include skipped value');
});

test('多次调用迭代器 - 独立实例', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf[Symbol.iterator]();
  const iter2 = buf[Symbol.iterator]();

  const first1 = iter1.next();
  const first2 = iter2.next();

  if (first1.value !== 1 || first2.value !== 1) throw new Error('Both iterators should start at first element');

  iter1.next(); // advance iter1

  const second2 = iter2.next();
  if (second2.value !== 2) throw new Error('iter2 should be independent');
});

test('迭代完成后再次调用 next()', () => {
  const buf = Buffer.from([1]);
  const iterator = buf[Symbol.iterator]();

  iterator.next(); // value: 1, done: false
  const done1 = iterator.next(); // done: true
  const done2 = iterator.next(); // 再次调用
  const done3 = iterator.next(); // 再次调用

  if (done1.done !== true || done2.done !== true || done3.done !== true) {
    throw new Error('Should remain done');
  }
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 3: Boundary and Empty',
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
