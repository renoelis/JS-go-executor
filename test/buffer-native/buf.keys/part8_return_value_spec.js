// buf.keys() - Part 8: 返回值规范测试
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

// 迭代器对象类型
test('keys() 返回对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return typeof iter === 'object' && iter !== null;
});

test('迭代器不是数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return !Array.isArray(iter);
});

test('迭代器不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return !Buffer.isBuffer(iter);
});

// next() 返回值结构
test('next() 返回对象', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  const result = iter.next();
  return typeof result === 'object' && result !== null;
});

test('next() 返回值不是数组', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  const result = iter.next();
  return !Array.isArray(result);
});

test('next() 返回值有且仅有 value 和 done 属性', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  const result = iter.next();
  const keys = Object.keys(result);
  return keys.length === 2 && 
         keys.includes('value') && 
         keys.includes('done');
});

// value 类型
test('未完成时 value 是数字', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const result = iter.next();
  return typeof result.value === 'number';
});

test('未完成时 value 是整数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const result = iter.next();
  return Number.isInteger(result.value);
});

test('未完成时 value 非负', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const result = iter.next();
  return result.value >= 0;
});

test('完成时 value 是 undefined', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  const result = iter.next();
  return result.value === undefined;
});

test('完成时 value 严格等于 undefined', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  const result = iter.next();
  return result.value === undefined && typeof result.value === 'undefined';
});

// done 类型
test('未完成时 done 是布尔值', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const result = iter.next();
  return typeof result.done === 'boolean';
});

test('未完成时 done 严格等于 false', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const result = iter.next();
  return result.done === false;
});

test('完成时 done 是布尔值', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  const result = iter.next();
  return typeof result.done === 'boolean';
});

test('完成时 done 严格等于 true', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  const result = iter.next();
  return result.done === true;
});

// 索引值范围
test('索引值在 0 到 length-1 范围内', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const keys = Array.from(buf.keys());
  let allInRange = true;
  for (const key of keys) {
    if (key < 0 || key >= buf.length) {
      allInRange = false;
      break;
    }
  }
  return allInRange;
});

test('索引值连续递增', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  let continuous = true;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== i) {
      continuous = false;
      break;
    }
  }
  return continuous;
});

test('没有跳过的索引', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const keys = Array.from(buf.keys());
  const expected = [0, 1, 2, 3];
  return JSON.stringify(keys) === JSON.stringify(expected);
});

test('没有重复的索引', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  const uniqueKeys = [...new Set(keys)];
  return keys.length === uniqueKeys.length;
});

// Symbol.iterator 返回值
test('Symbol.iterator 返回迭代器自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const iter2 = iter[Symbol.iterator]();
  return iter === iter2;
});

test('Symbol.iterator 返回值类型正确', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const iter2 = iter[Symbol.iterator]();
  return typeof iter2 === 'object' && 
         iter2 !== null && 
         typeof iter2.next === 'function';
});

// 空 Buffer 特殊情况
test('空 Buffer 第一次 next() 返回 done:true', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.keys();
  const result = iter.next();
  return result.done === true;
});

test('空 Buffer 第一次 next() value 是 undefined', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.keys();
  const result = iter.next();
  return result.value === undefined;
});

// 单字节 Buffer
test('单字节 Buffer 第一次返回 0', () => {
  const buf = Buffer.from([255]);
  const iter = buf.keys();
  const result = iter.next();
  return result.value === 0 && result.done === false;
});

test('单字节 Buffer 第二次返回 done:true', () => {
  const buf = Buffer.from([255]);
  const iter = buf.keys();
  iter.next();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

// 输出结果
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
