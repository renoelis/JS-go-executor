// buf.keys() - Part 1: 基础功能测试
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

// 基本功能
test('返回迭代器对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return typeof iter === 'object' && iter !== null;
});

test('迭代器有 next 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return typeof iter.next === 'function';
});

test('next() 返回正确格式', () => {
  const buf = Buffer.from([10]);
  const iter = buf.keys();
  const result = iter.next();
  return typeof result === 'object' && 
         'value' in result && 
         'done' in result;
});

test('第一个索引是 0', () => {
  const buf = Buffer.from([100, 200]);
  const iter = buf.keys();
  const result = iter.next();
  return result.value === 0 && result.done === false;
});

test('迭代所有索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  return keys.length === 3 && 
         keys[0] === 0 && 
         keys[1] === 1 && 
         keys[2] === 2;
});

test('最后一个索引正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  return keys[keys.length - 1] === 4;
});

test('for...of 循环遍历', () => {
  const buf = Buffer.from([10, 20, 30]);
  const indices = [];
  for (const key of buf.keys()) {
    indices.push(key);
  }
  return indices.length === 3 && 
         indices[0] === 0 && 
         indices[1] === 1 && 
         indices[2] === 2;
});

test('扩展运算符', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const keys = [...buf.keys()];
  return keys.length === 4 && 
         keys[0] === 0 && 
         keys[3] === 3;
});

test('Array.from 转换', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = Array.from(buf.keys());
  return Array.isArray(arr) && 
         arr.length === 5 && 
         arr[4] === 4;
});

test('连续调用 keys() 返回新迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  return iter1 !== iter2;
});

test('两个迭代器独立工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  iter1.next();
  iter1.next();
  const result = iter2.next();
  return result.value === 0;
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
