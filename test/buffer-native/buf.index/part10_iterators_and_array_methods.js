// buf[index] - Part 10: Iterators and Array Methods Tests
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

// for...of 迭代测试
test('for...of 迭代 Buffer 值', () => {
  const buf = Buffer.from([10, 20, 30]);
  const values = [];
  for (const val of buf) {
    values.push(val);
  }
  return values.length === 3 && values[0] === 10 && values[1] === 20 && values[2] === 30;
});

test('for...of 迭代空 Buffer', () => {
  const buf = Buffer.alloc(0);
  let count = 0;
  for (const val of buf) {
    count++;
  }
  return count === 0;
});

test('for...of 迭代后修改不影响已迭代值', () => {
  const buf = Buffer.from([1, 2, 3]);
  const values = [];
  for (const val of buf) {
    values.push(val);
    if (values.length === 1) {
      buf[1] = 99;
    }
  }
  return values[1] === 99;
});

// Array.from 测试
test('Array.from(Buffer) 创建数组', () => {
  const buf = Buffer.from([10, 20, 30]);
  const arr = Array.from(buf);
  return arr.length === 3 && arr[0] === 10 && arr[1] === 20 && arr[2] === 30;
});

test('Array.from(Buffer) 数组独立', () => {
  const buf = Buffer.from([10, 20, 30]);
  const arr = Array.from(buf);
  arr[1] = 99;
  return buf[1] === 20;
});

test('Array.from 空 Buffer', () => {
  const buf = Buffer.alloc(0);
  const arr = Array.from(buf);
  return arr.length === 0;
});

// 展开运算符测试
test('展开运算符 [...Buffer]', () => {
  const buf = Buffer.from([10, 20, 30]);
  const arr = [...buf];
  return arr.length === 3 && arr[0] === 10 && arr[1] === 20 && arr[2] === 30;
});

test('展开运算符创建的数组独立', () => {
  const buf = Buffer.from([10, 20, 30]);
  const arr = [...buf];
  arr[1] = 99;
  return buf[1] === 20;
});

// Array.prototype 方法测试
test('Array.prototype.map 通过 call', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = Array.prototype.map.call(buf, x => x * 2);
  return result.length === 3 && result[0] === 2 && result[1] === 4 && result[2] === 6;
});

test('Array.prototype.filter 通过 call', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const result = Array.prototype.filter.call(buf, x => x > 25);
  return result.length === 3 && result[0] === 30 && result[1] === 40 && result[2] === 50;
});

test('Array.prototype.reduce 通过 call', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sum = Array.prototype.reduce.call(buf, (acc, val) => acc + val, 0);
  return sum === 15;
});

test('Array.prototype.forEach 通过 call', () => {
  const buf = Buffer.from([10, 20, 30]);
  let sum = 0;
  Array.prototype.forEach.call(buf, val => { sum += val; });
  return sum === 60;
});

test('Array.prototype.every 通过 call', () => {
  const buf = Buffer.from([10, 20, 30]);
  const allPositive = Array.prototype.every.call(buf, x => x > 0);
  return allPositive === true;
});

test('Array.prototype.some 通过 call', () => {
  const buf = Buffer.from([10, 20, 30]);
  const hasLarge = Array.prototype.some.call(buf, x => x > 25);
  return hasLarge === true;
});

test('Array.prototype.find 通过 call', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const found = Array.prototype.find.call(buf, x => x > 25);
  return found === 30;
});

test('Array.prototype.findIndex 通过 call', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const idx = Array.prototype.findIndex.call(buf, x => x > 25);
  return idx === 2;
});

// 迭代器方法测试
test('buf.values() 迭代器', () => {
  const buf = Buffer.from([10, 20, 30]);
  const values = [];
  for (const val of buf.values()) {
    values.push(val);
  }
  return values.length === 3 && values[0] === 10 && values[1] === 20 && values[2] === 30;
});

test('buf.keys() 迭代器', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = [];
  for (const key of buf.keys()) {
    keys.push(key);
  }
  return keys.length === 3 && keys[0] === 0 && keys[1] === 1 && keys[2] === 2;
});

test('buf.entries() 迭代器', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = [];
  for (const entry of buf.entries()) {
    entries.push(entry);
  }
  return entries.length === 3 && 
         entries[0][0] === 0 && entries[0][1] === 10 &&
         entries[1][0] === 1 && entries[1][1] === 20;
});

// 解构赋值测试
test('数组解构 Buffer', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const [a, b, c] = buf;
  return a === 10 && b === 20 && c === 30;
});

test('数组解构跳过元素', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const [a, , c] = buf;
  return a === 10 && c === 30;
});

test('数组解构剩余参数', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const [a, b, ...rest] = buf;
  return a === 10 && b === 20 && rest.length === 3 && rest[0] === 30;
});

// 与 Set/Map 的交互
test('从 Buffer 创建 Set', () => {
  const buf = Buffer.from([10, 20, 30, 20, 10]);
  const set = new Set(buf);
  return set.size === 3 && set.has(10) && set.has(20) && set.has(30);
});

test('Buffer 作为 Map 的值', () => {
  const buf = Buffer.from([10, 20, 30]);
  const map = new Map();
  map.set('key', buf);
  const retrieved = map.get('key');
  return retrieved[0] === 10 && retrieved[1] === 20 && retrieved[2] === 30;
});

test('修改 Map 中的 Buffer 影响原 Buffer', () => {
  const buf = Buffer.from([10, 20, 30]);
  const map = new Map();
  map.set('key', buf);
  map.get('key')[1] = 99;
  return buf[1] === 99;
});

// JSON 序列化测试
test('JSON.stringify Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = JSON.stringify(buf);
  const parsed = JSON.parse(json);
  return parsed.type === 'Buffer' && parsed.data.length === 3;
});

test('JSON.stringify 后索引访问', () => {
  const buf = Buffer.from([10, 20, 30]);
  const json = JSON.stringify(buf);
  const parsed = JSON.parse(json);
  return parsed.data[0] === 10 && parsed.data[1] === 20 && parsed.data[2] === 30;
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
