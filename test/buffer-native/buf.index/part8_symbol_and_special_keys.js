// buf[index] - Part 8: Symbol and Special Keys Tests
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

// Symbol 作为索引测试
test('Symbol 作为索引读取返回 undefined', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sym = Symbol('test');
  return buf[sym] === undefined;
});

test('Symbol 作为索引写入不影响 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sym = Symbol('test');
  buf[sym] = 99;
  return buf[sym] === 99 && buf.length === 3 && buf[0] === 1;
});

test('Symbol.iterator 不影响索引访问', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[0] === 10 && typeof buf[Symbol.iterator] === 'function';
});

// 特殊字符串键测试
test('使用特殊属性名作为键不影响索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const hasMethod = typeof buf['toString'] !== 'undefined';
  return hasMethod && buf[0] === 1;
});

test('使用 "toString" 作为键', () => {
  const buf = Buffer.from([1, 2, 3]);
  const hasToString = typeof buf['toString'] === 'function';
  return hasToString && buf[0] === 1;
});

test('使用 "valueOf" 作为键', () => {
  const buf = Buffer.from([1, 2, 3]);
  const hasValueOf = typeof buf['valueOf'] === 'function';
  return hasValueOf && buf[0] === 1;
});

test('使用 "__proto__" 作为键', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['__proto__'] !== undefined && buf[0] === 1;
});

// 特殊数字字符串索引
test('使用 "0.0" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['0.0'] === undefined;
});

test('使用 "1.00" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['1.00'] === undefined;
});

test('使用 "00" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['00'] === undefined;
});

test('使用 "000" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['000'] === undefined;
});

// 负数字符串索引
test('使用 "-1" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['-1'] === undefined;
});

test('使用 "-0" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['-0'] === undefined;
});

// 特殊格式数字字符串
test('使用 "1e2" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['1e2'] === undefined;
});

test('使用 "1E2" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['1E2'] === undefined;
});

test('使用 "0x10" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['0x10'] === undefined;
});

// 空格和特殊字符索引
test('使用空格字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf[' '] === undefined;
});

test('使用制表符字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['\t'] === undefined;
});

test('使用换行符字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['\n'] === undefined;
});

// 使用 Number 对象作为索引
test('使用 Number(1) 对象作为索引读取', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[Number(1)] === 20;
});

test('使用 Number(1) 对象作为索引写入', () => {
  const buf = Buffer.alloc(3);
  buf[Number(1)] = 99;
  return buf[1] === 99;
});

test('使用 new Number(1) 对象作为索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  const numObj = new Number(1);
  // Number 对象会被转换为字符串 "1"，然后作为索引
  return buf[numObj] === 20;
});

// 写入 Symbol 值（应该转换）
test('写入 Symbol 值转换为 NaN 再转为 0', () => {
  const buf = Buffer.alloc(1);
  try {
    buf[0] = Symbol('test');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('symbol') || e.message.includes('Symbol');
  }
});

// 特殊索引边界
test('使用 4294967295 (2^32-1) 索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[4294967295] === undefined;
});

test('使用 4294967296 (2^32) 索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[4294967296] === undefined;
});

// 使用函数作为索引
test('使用函数作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const fn = function() { return 1; };
  return buf[fn] === undefined;
});

test('使用箭头函数作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const fn = () => 1;
  return buf[fn] === undefined;
});

// 正则表达式作为索引
test('使用正则表达式作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const regex = /test/;
  return buf[regex] === undefined;
});

// Date 对象作为索引
test('使用 Date 对象作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const date = new Date();
  return buf[date] === undefined;
});

// 使用 Map/Set 作为索引
test('使用 Map 作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const map = new Map();
  return buf[map] === undefined;
});

test('使用 Set 作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const set = new Set();
  return buf[set] === undefined;
});

// 使用 WeakMap/WeakSet 作为索引
test('使用 WeakMap 作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const weakMap = new WeakMap();
  return buf[weakMap] === undefined;
});

test('使用 WeakSet 作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const weakSet = new WeakSet();
  return buf[weakSet] === undefined;
});

// 使用 Promise 作为索引
test('使用 Promise 作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const promise = Promise.resolve(1);
  return buf[promise] === undefined;
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
