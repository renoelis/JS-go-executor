// buf[Symbol.iterator] - Part 1: Basic Iteration Tests
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

// 基础迭代功能测试
test('基本迭代 - for...of 遍历', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result.length !== 5) throw new Error(`Expected length 5, got ${result.length}`);
  if (result[0] !== 1 || result[4] !== 5) throw new Error(`Values mismatch`);
});

test('基本迭代 - 获取迭代器并手动调用 next()', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iterator = buf[Symbol.iterator]();

  const first = iterator.next();
  if (first.value !== 10 || first.done !== false) throw new Error('First iteration failed');

  const second = iterator.next();
  if (second.value !== 20 || second.done !== false) throw new Error('Second iteration failed');

  const third = iterator.next();
  if (third.value !== 30 || third.done !== false) throw new Error('Third iteration failed');

  const fourth = iterator.next();
  if (fourth.done !== true) throw new Error('Should be done');
});

test('基本迭代 - 迭代空字节值（0）', () => {
  const buf = Buffer.from([0, 0, 0]);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result.length !== 3) throw new Error('Length mismatch');
  if (result[0] !== 0 || result[1] !== 0 || result[2] !== 0) throw new Error('Zero values mismatch');
});

test('基本迭代 - 迭代最大字节值（255）', () => {
  const buf = Buffer.from([255, 255]);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result[0] !== 255 || result[1] !== 255) throw new Error('Max value mismatch');
});

test('基本迭代 - 迭代混合值', () => {
  const buf = Buffer.from([0, 128, 255, 1, 254]);
  const expected = [0, 128, 255, 1, 254];
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  for (let i = 0; i < expected.length; i++) {
    if (result[i] !== expected[i]) throw new Error(`Mismatch at index ${i}`);
  }
});

test('基本迭代 - 扩展运算符', () => {
  const buf = Buffer.from([5, 6, 7]);
  const arr = [...buf];
  if (arr.length !== 3) throw new Error('Array length mismatch');
  if (arr[0] !== 5 || arr[1] !== 6 || arr[2] !== 7) throw new Error('Array values mismatch');
});

test('基本迭代 - Array.from()', () => {
  const buf = Buffer.from([100, 200]);
  const arr = Array.from(buf);
  if (arr.length !== 2) throw new Error('Array length mismatch');
  if (arr[0] !== 100 || arr[1] !== 200) throw new Error('Array values mismatch');
});

test('基本迭代 - 字符串转 Buffer 后迭代', () => {
  const buf = Buffer.from('ABC', 'utf8'); // A=65, B=66, C=67
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result[0] !== 65 || result[1] !== 66 || result[2] !== 67) {
    throw new Error('String to buffer iteration failed');
  }
});

test('基本迭代 - hex 编码转 Buffer 后迭代', () => {
  const buf = Buffer.from('0a14ff', 'hex'); // [10, 20, 255]
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result[0] !== 10 || result[1] !== 20 || result[2] !== 255) {
    throw new Error('Hex to buffer iteration failed');
  }
});

test('基本迭代 - base64 编码转 Buffer 后迭代', () => {
  const buf = Buffer.from('AQID', 'base64'); // [1, 2, 3]
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result.length !== 3 || result[0] !== 1 || result[1] !== 2 || result[2] !== 3) {
    throw new Error('Base64 to buffer iteration failed');
  }
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 1: Basic Iteration',
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
