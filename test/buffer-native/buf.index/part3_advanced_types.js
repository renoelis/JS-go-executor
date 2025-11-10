// buf[index] - Part 3: Advanced Type Coercion Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 对象类型索引测试
test('对象索引（带 toString）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const obj = { toString: () => '1' };
  return buf[obj] === 2;
});

test('对象索引（带 valueOf）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const obj = { valueOf: () => 1 };
  return buf[obj] === undefined;
});

test('对象索引（toString 优先）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const obj = {
    toString: () => '1',
    valueOf: () => 2
  };
  return buf[obj] === 2;
});

// 写入对象值测试
test('写入对象值（带 valueOf）', () => {
  const buf = Buffer.alloc(1);
  const obj = { valueOf: () => 65 };
  buf[0] = obj;
  return buf[0] === 65;
});

test('写入对象值（带 toString）', () => {
  const buf = Buffer.alloc(1);
  const obj = { toString: () => '65' };
  buf[0] = obj;
  return buf[0] === 65;
});

test('写入对象值（valueOf 优先）', () => {
  const buf = Buffer.alloc(1);
  const obj = {
    valueOf: () => 65,
    toString: () => '66'
  };
  buf[0] = obj;
  return buf[0] === 65;
});

// 特殊数值测试
test('写入 -0', () => {
  const buf = Buffer.alloc(1);
  buf[0] = -0;
  return buf[0] === 0;
});

test('写入 +0', () => {
  const buf = Buffer.alloc(1);
  buf[0] = +0;
  return buf[0] === 0;
});

test('写入 Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(1);
  buf[0] = Number.MIN_VALUE;
  return buf[0] === 0;
});

test('写入 Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(1);
  buf[0] = Number.MAX_VALUE;
  return buf[0] === 0;
});

test('写入 Number.EPSILON', () => {
  const buf = Buffer.alloc(1);
  buf[0] = Number.EPSILON;
  return buf[0] === 0;
});

// 非数字字符串索引
test('非数字字符串索引读取', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['abc'] === undefined;
});

test('非数字字符串索引写入', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf['abc'] = 99;
  return buf['abc'] === 99 && buf.length === 3;
});

test('空字符串索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[''] === undefined;
});

// 大索引值测试
test('读取 Number.MAX_SAFE_INTEGER 索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[Number.MAX_SAFE_INTEGER] === undefined;
});

test('写入 Number.MAX_SAFE_INTEGER 索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf[Number.MAX_SAFE_INTEGER] = 99;
  return buf.length === 3;
});

test('读取 Number.MAX_SAFE_INTEGER + 1 索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[Number.MAX_SAFE_INTEGER + 1] === undefined;
});

// 数组索引测试
test('数组作为索引（转换为字符串）', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[[1]] === 2;
});

test('空数组作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[[]] === undefined;
});

// 特殊字符串数字索引
test('十六进制字符串索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['0x1'] === undefined;
});

test('八进制字符串索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['0o1'] === undefined;
});

test('二进制字符串索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['0b1'] === undefined;
});

test('科学计数法字符串索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['1e0'] === undefined;
});

// 前导零字符串索引
test('前导零字符串索引 "01"', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['01'] === undefined;
});

test('前导零字符串索引 "001"', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['001'] === undefined;
});

// 带空格的字符串索引
test('带前导空格的字符串索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[' 1'] === undefined;
});

test('带尾随空格的字符串索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['1 '] === undefined;
});

// 写入特殊值
test('写入空字符串', () => {
  const buf = Buffer.alloc(1);
  buf[0] = '';
  return buf[0] === 0;
});

test('写入空数组', () => {
  const buf = Buffer.alloc(1);
  buf[0] = [];
  return buf[0] === 0;
});

test('写入对象（无 valueOf/toString）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = {};
  return buf[0] === 0;
});

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
