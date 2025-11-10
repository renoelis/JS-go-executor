// buf.keys() - Part 3: 迭代器协议测试
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

// 迭代器协议
test('迭代器有 Symbol.iterator 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return typeof iter[Symbol.iterator] === 'function';
});

test('迭代器的 Symbol.iterator 返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return iter[Symbol.iterator]() === iter;
});

test('可以多次调用 Symbol.iterator', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const iter2 = iter[Symbol.iterator]();
  const iter3 = iter[Symbol.iterator]();
  return iter === iter2 && iter2 === iter3;
});

// next() 方法详细测试
test('next() 返回对象有 value 属性', () => {
  const buf = Buffer.from([10]);
  const iter = buf.keys();
  const result = iter.next();
  return 'value' in result;
});

test('next() 返回对象有 done 属性', () => {
  const buf = Buffer.from([10]);
  const iter = buf.keys();
  const result = iter.next();
  return 'done' in result;
});

test('未完成时 done 为 false', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const result = iter.next();
  return result.done === false;
});

test('完成时 done 为 true', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  const result = iter.next();
  return result.done === true;
});

test('完成后 value 为 undefined', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  const result = iter.next();
  return result.value === undefined;
});

test('完成后继续调用 next() 仍返回 done:true', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  iter.next();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

// 迭代顺序
test('索引按顺序递增', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const iter = buf.keys();
  let prev = -1;
  let ordered = true;
  for (const key of iter) {
    if (key !== prev + 1) {
      ordered = false;
      break;
    }
    prev = key;
  }
  return ordered;
});

test('手动调用 next() 顺序正确', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const iter = buf.keys();
  const r1 = iter.next();
  const r2 = iter.next();
  const r3 = iter.next();
  const r4 = iter.next();
  return r1.value === 0 && 
         r2.value === 1 && 
         r3.value === 2 && 
         r4.value === 3;
});

test('混合使用 next() 和 for...of', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.keys();
  const first = iter.next().value;
  const second = iter.next().value;
  
  const rest = [];
  for (const key of iter) {
    rest.push(key);
  }
  
  return first === 0 && 
         second === 1 && 
         rest.length === 3 && 
         rest[0] === 2 && 
         rest[2] === 4;
});

// 迭代器状态
test('迭代器状态独立', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  
  iter1.next();
  iter1.next();
  
  const result = iter2.next();
  return result.value === 0;
});

test('迭代器不可重置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  
  Array.from(iter);
  
  const result = iter.next();
  return result.done === true;
});

test('部分迭代后可继续', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.keys();
  
  iter.next();
  iter.next();
  
  const remaining = [];
  for (const key of iter) {
    remaining.push(key);
  }
  
  return remaining.length === 3 && 
         remaining[0] === 2 && 
         remaining[2] === 4;
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
