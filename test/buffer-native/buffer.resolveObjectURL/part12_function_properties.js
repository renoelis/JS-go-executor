// Buffer.resolveObjectURL() - Part 12: Function Properties and Advanced Tests
const { Buffer, resolveObjectURL, Blob } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 函数属性深度测试
test('resolveObjectURL.length 属性为 1', () => {
  return resolveObjectURL.length === 1;
});

test('resolveObjectURL.name 属性为 "resolveObjectURL"', () => {
  return resolveObjectURL.name === 'resolveObjectURL';
});

test('resolveObjectURL.toString() 包含函数标识', () => {
  const str = resolveObjectURL.toString();
  return str.includes('function') && str.includes('resolveObjectURL');
});

test('resolveObjectURL 不可重新赋值（函数属性）', () => {
  const original = resolveObjectURL.length;
  try {
    resolveObjectURL.length = 999;
    return resolveObjectURL.length === original;
  } catch (e) {
    return true;
  }
});

// 函数调用方式测试
test('call 方式调用', () => {
  const result = resolveObjectURL.call(null, 'blob:nodedata:test');
  return result === undefined || result instanceof Blob;
});

test('apply 方式调用', () => {
  const result = resolveObjectURL.apply(null, ['blob:nodedata:test']);
  return result === undefined || result instanceof Blob;
});

test('bind 方式调用', () => {
  const bound = resolveObjectURL.bind(null);
  const result = bound('blob:nodedata:test');
  return result === undefined || result instanceof Blob;
});

test('this 上下文不影响结果', () => {
  const obj = { test: 'value' };
  const result = resolveObjectURL.call(obj, 'blob:nodedata:test');
  return result === undefined || result instanceof Blob;
});

// 极端参数类型测试
test('Symbol 参数抛出 TypeError', () => {
  try {
    const sym = Symbol('test');
    const result = resolveObjectURL(sym);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Symbol.iterator 参数处理', () => {
  try {
    const result = resolveObjectURL(Symbol.iterator);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('WeakMap 参数转字符串', () => {
  const weakMap = new WeakMap();
  const result = resolveObjectURL(weakMap);
  return result === undefined;
});

test('WeakSet 参数转字符串', () => {
  const weakSet = new WeakSet();
  const result = resolveObjectURL(weakSet);
  return result === undefined;
});

test('BigInt 参数转字符串', () => {
  try {
    const bigint = BigInt(123);
    const result = resolveObjectURL(bigint);
    return result === undefined;
  } catch (e) {
    return true;
  }
});

test('Map 参数转字符串', () => {
  const map = new Map([['key', 'value']]);
  const result = resolveObjectURL(map);
  return result === undefined;
});

test('Set 参数转字符串', () => {
  const set = new Set([1, 2, 3]);
  const result = resolveObjectURL(set);
  return result === undefined;
});

test('RegExp 参数转字符串', () => {
  const regex = /test/g;
  const result = resolveObjectURL(regex);
  return result === undefined;
});

test('Date 参数转字符串', () => {
  const date = new Date();
  const result = resolveObjectURL(date);
  return result === undefined;
});

test('Error 参数转字符串', () => {
  const error = new Error('test');
  const result = resolveObjectURL(error);
  return result === undefined;
});

test('Function 参数转字符串', () => {
  const func = function() { return 'blob:nodedata:func'; };
  const result = resolveObjectURL(func);
  return result === undefined;
});

test('Arrow Function 参数转字符串', () => {
  const arrow = () => 'blob:nodedata:arrow';
  const result = resolveObjectURL(arrow);
  return result === undefined;
});

// 数值类型精确测试
test('科学计数法参数：1e10', () => {
  const result = resolveObjectURL(1e10);
  return result === undefined;
});

test('十六进制数值：0xff', () => {
  const result = resolveObjectURL(0xff);
  return result === undefined;
});

test('八进制数值：0o777', () => {
  const result = resolveObjectURL(0o777);
  return result === undefined;
});

test('二进制数值：0b1010', () => {
  const result = resolveObjectURL(0b1010);
  return result === undefined;
});

test('Number.MAX_SAFE_INTEGER', () => {
  const result = resolveObjectURL(Number.MAX_SAFE_INTEGER);
  return result === undefined;
});

test('Number.MIN_SAFE_INTEGER', () => {
  const result = resolveObjectURL(Number.MIN_SAFE_INTEGER);
  return result === undefined;
});

test('Number.POSITIVE_INFINITY', () => {
  const result = resolveObjectURL(Number.POSITIVE_INFINITY);
  return result === undefined;
});

test('Number.NEGATIVE_INFINITY', () => {
  const result = resolveObjectURL(Number.NEGATIVE_INFINITY);
  return result === undefined;
});

test('Number.EPSILON', () => {
  const result = resolveObjectURL(Number.EPSILON);
  return result === undefined;
});

// 类型检查边界测试
test('空数组转字符串', () => {
  const result = resolveObjectURL([]);
  return result === undefined;
});

test('数组转字符串', () => {
  const result = resolveObjectURL(['blob', 'nodedata', 'test']);
  return result === undefined;
});

test('类数组对象', () => {
  const arrayLike = { 0: 'blob', 1: 'nodedata', 2: 'test', length: 3 };
  const result = resolveObjectURL(arrayLike);
  return result === undefined;
});

test('带有自定义 toString 的数组', () => {
  const arr = ['a', 'b'];
  arr.toString = () => 'blob:nodedata:custom';
  const result = resolveObjectURL(arr);
  return result === undefined || result instanceof Blob;
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
