// buf[Symbol.iterator] - Part 4: Iterator Protocol Completeness Tests
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

// 迭代器协议完整性测试
test('迭代器是函数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iteratorFunc = buf[Symbol.iterator];
  if (typeof iteratorFunc !== 'function') {
    throw new Error('Symbol.iterator should be a function');
  }
});

test('迭代器返回对象有 next 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iterator = buf[Symbol.iterator]();
  if (typeof iterator.next !== 'function') {
    throw new Error('Iterator should have a next method');
  }
});

test('next() 返回对象包含 value 和 done', () => {
  const buf = Buffer.from([42]);
  const iterator = buf[Symbol.iterator]();
  const result = iterator.next();

  if (!('value' in result)) throw new Error('Result should have value property');
  if (!('done' in result)) throw new Error('Result should have done property');
  if (result.value !== 42) throw new Error('Value should be 42');
  if (result.done !== false) throw new Error('Done should be false');
});

test('迭代完成时 done 为 true', () => {
  const buf = Buffer.from([1]);
  const iterator = buf[Symbol.iterator]();

  iterator.next(); // 消费唯一元素
  const result = iterator.next();

  if (result.done !== true) throw new Error('Should be done');
});

test('迭代器返回的是迭代器对象本身（可迭代协议）', () => {
  const buf = Buffer.from([1, 2]);
  const iterator = buf[Symbol.iterator]();

  // 迭代器对象自身也应该是可迭代的
  if (typeof iterator[Symbol.iterator] !== 'function') {
    throw new Error('Iterator should have Symbol.iterator method');
  }

  const selfIterator = iterator[Symbol.iterator]();
  if (selfIterator !== iterator) {
    throw new Error('Iterator should return itself');
  }
});

test('for...of 在迭代中修改 Buffer 值', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const result = [];
  let index = 0;
  for (const byte of buf) {
    result.push(byte);
    // 修改后续值
    if (index === 1) {
      buf[2] = 99;
    }
    index++;
  }
  // 修改应该在迭代中反映
  if (result[2] !== 99) throw new Error('Modification during iteration should be reflected');
});

test('迭代器 this 绑定测试', () => {
  const buf = Buffer.from([5, 6, 7]);
  const iteratorFunc = buf[Symbol.iterator];

  // 即使解绑，也应该正常工作（测试 this 是否正确绑定）
  const boundIterator = iteratorFunc.call(buf);
  const result = [];
  let next = boundIterator.next();
  while (!next.done) {
    result.push(next.value);
    next = boundIterator.next();
  }

  if (result.length !== 3 || result[0] !== 5) {
    throw new Error('Bound iterator failed');
  }
});

test('扩展运算符与 Array.from 结果一致', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const arr1 = [...buf];
  const arr2 = Array.from(buf);

  if (arr1.length !== arr2.length) throw new Error('Length mismatch');
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) throw new Error(`Value mismatch at index ${i}`);
  }
});

test('迭代器与 entries() 对比', () => {
  const buf = Buffer.from([11, 22, 33]);
  const iteratorValues = [];
  const entriesValues = [];

  for (const byte of buf) {
    iteratorValues.push(byte);
  }

  for (const [index, byte] of buf.entries()) {
    entriesValues.push(byte);
  }

  if (iteratorValues.length !== entriesValues.length) throw new Error('Length mismatch');
  for (let i = 0; i < iteratorValues.length; i++) {
    if (iteratorValues[i] !== entriesValues[i]) throw new Error('Value mismatch');
  }
});

test('迭代器与 values() 行为一致', () => {
  const buf = Buffer.from([7, 8, 9]);
  const iteratorValues = [];
  const valuesValues = [];

  for (const byte of buf) {
    iteratorValues.push(byte);
  }

  for (const byte of buf.values()) {
    valuesValues.push(byte);
  }

  if (iteratorValues.length !== valuesValues.length) throw new Error('Length mismatch');
  for (let i = 0; i < iteratorValues.length; i++) {
    if (iteratorValues[i] !== valuesValues[i]) throw new Error('Value mismatch');
  }
});

test('嵌套 for...of 迭代', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const result = [];

  for (const byte1 of buf1) {
    for (const byte2 of buf2) {
      result.push(byte1 * 10 + byte2);
    }
  }

  // 应该是 [13, 14, 23, 24]
  if (result.length !== 4) throw new Error('Nested iteration length mismatch');
  if (result[0] !== 13 || result[3] !== 24) throw new Error('Nested iteration values mismatch');
});

test('迭代器与 reduce 组合', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const arr = [...buf];
  const sum = arr.reduce((acc, val) => acc + val, 0);

  if (sum !== 10) throw new Error('Reduce sum should be 10');
});

test('迭代器与 filter 组合', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const arr = [...buf];
  const filtered = arr.filter(byte => byte > 25);

  if (filtered.length !== 3) throw new Error('Filter length should be 3');
  if (filtered[0] !== 30 || filtered[2] !== 50) throw new Error('Filter values mismatch');
});

test('迭代器与 map 组合', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = [...buf];
  const mapped = arr.map(byte => byte * 2);

  if (mapped[0] !== 2 || mapped[1] !== 4 || mapped[2] !== 6) {
    throw new Error('Map values mismatch');
  }
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 4: Iterator Protocol',
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
