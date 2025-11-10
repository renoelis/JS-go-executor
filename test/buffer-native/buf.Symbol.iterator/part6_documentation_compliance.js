// buf[Symbol.iterator] - Part 6: Documentation Compliance Tests (Round 2)
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

// 第 2 轮：对照官方文档补充的测试
test('迭代器返回值只包含 value 和 done 属性', () => {
  const buf = Buffer.from([1]);
  const iterator = buf[Symbol.iterator]();
  const result = iterator.next();

  const keys = Object.keys(result);
  if (keys.length !== 2) throw new Error(`Should have exactly 2 keys, got ${keys.length}`);
  if (!keys.includes('value') || !keys.includes('done')) {
    throw new Error('Should only have value and done properties');
  }
});

test('完成时 next() 返回值的 value 是 undefined', () => {
  const buf = Buffer.from([1]);
  const iterator = buf[Symbol.iterator]();

  iterator.next(); // 消费元素
  const result = iterator.next(); // 完成

  if (result.value !== undefined) throw new Error('Completed iterator should have undefined value');
  if (result.done !== true) throw new Error('Should be done');
});

test('Int8Array 转 Buffer 迭代', () => {
  const int8 = new Int8Array([10, -10, 20]);
  const buf = Buffer.from(int8.buffer);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  // -10 会被转换为 246 (256 - 10)
  if (result.length !== 3) throw new Error('Length mismatch');
  if (result[0] !== 10 || result[1] !== 246 || result[2] !== 20) {
    throw new Error('Int8Array conversion mismatch');
  }
});

test('Uint32Array 转 Buffer 迭代', () => {
  const uint32 = new Uint32Array([0x12345678]);
  const buf = Buffer.from(uint32.buffer);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  // 4 字节展开
  if (result.length !== 4) throw new Error('Should have 4 bytes');
});

test('Float32Array 转 Buffer 迭代', () => {
  const float32 = new Float32Array([1.5]);
  const buf = Buffer.from(float32.buffer);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  // Float32 是 4 字节
  if (result.length !== 4) throw new Error('Should have 4 bytes');
  // 验证每个字节都是有效的 0-255
  for (const byte of result) {
    if (typeof byte !== 'number' || byte < 0 || byte > 255) {
      throw new Error('Invalid byte value');
    }
  }
});

test('迭代器与 keys() 索引一致性', () => {
  const buf = Buffer.from([11, 22, 33, 44]);
  const iteratorValues = [...buf];
  const keysArray = [...buf.keys()];

  if (iteratorValues.length !== keysArray.length) throw new Error('Length mismatch');

  for (let i = 0; i < keysArray.length; i++) {
    const index = keysArray[i];
    if (buf[index] !== iteratorValues[index]) {
      throw new Error('Index access mismatch');
    }
  }
});

test('每次调用 Symbol.iterator 返回新的迭代器实例', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf[Symbol.iterator]();
  const iter2 = buf[Symbol.iterator]();

  if (iter1 === iter2) throw new Error('Should return new iterator instances');

  // 验证它们是独立的
  iter1.next();
  iter1.next();
  const result1 = iter1.next();
  const result2 = iter2.next();

  if (result1.value === result2.value) {
    // 这是预期的（都从原 Buffer 读取），但要确保不是同一个对象
    if (result1 === result2) throw new Error('Should return different result objects');
  }
});

test('for...of 不会消费手动创建的迭代器', () => {
  const buf = Buffer.from([5, 6, 7, 8]);
  const manualIterator = buf[Symbol.iterator]();

  manualIterator.next(); // 手动消费第一个

  // for...of 会创建新的迭代器
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result.length !== 4) throw new Error('for...of should iterate all elements');
  if (result[0] !== 5) throw new Error('Should start from beginning');
});

test('Buffer 本身也是可迭代对象', () => {
  const buf = Buffer.from([1, 2, 3]);

  // 检查 Buffer 有 Symbol.iterator
  if (typeof buf[Symbol.iterator] !== 'function') {
    throw new Error('Buffer should be iterable');
  }

  // 可以在需要可迭代对象的地方使用
  const set = new Set(buf);
  if (set.size !== 3) throw new Error('Buffer should work as iterable in Set');
});

test('空编码字符串转 Buffer 迭代', () => {
  const buf = Buffer.from('', 'utf8');
  let count = 0;
  for (const byte of buf) {
    count++;
  }
  if (count !== 0) throw new Error('Empty string should produce empty buffer');
});

test('只包含空格的字符串转 Buffer 迭代', () => {
  const buf = Buffer.from('   ', 'utf8'); // 3 个空格 = 3 字节（空格的 ASCII 是 32）
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result.length !== 3) throw new Error('Should have 3 bytes');
  if (result[0] !== 32 || result[1] !== 32 || result[2] !== 32) {
    throw new Error('Space should be 32');
  }
});

test('latin1 编码转 Buffer 迭代', () => {
  const buf = Buffer.from('café', 'latin1'); // é 在 latin1 中是单字节
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  // c=99, a=97, f=102, é=233
  if (result.length !== 4) throw new Error('Should have 4 bytes in latin1');
  if (result[3] !== 233) throw new Error('é should be 233 in latin1');
});

test('ascii 编码转 Buffer 迭代', () => {
  const buf = Buffer.from('Hello', 'ascii');
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  // H=72, e=101, l=108, l=108, o=111
  if (result.length !== 5) throw new Error('Should have 5 bytes');
  if (result[0] !== 72 || result[4] !== 111) {
    throw new Error('ASCII values mismatch');
  }
});

test('Buffer.from() 带 byteOffset 和 length 的迭代', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i;
  }

  const buf = Buffer.from(ab, 2, 5); // 从偏移 2 开始，长度 5
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result.length !== 5) throw new Error('Should have 5 bytes');
  if (result[0] !== 2 || result[4] !== 6) {
    throw new Error('Offset and length mismatch');
  }
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 6: Documentation Compliance (Round 2)',
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
