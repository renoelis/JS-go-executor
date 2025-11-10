// buf[Symbol.iterator]() - Iterator Tests
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

// 基本功能测试
test('Buffer 有 Symbol.iterator 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  return typeof buf[Symbol.iterator] === 'function';
});

test('Symbol.iterator 返回迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iterator = buf[Symbol.iterator]();
  return iterator !== null && typeof iterator.next === 'function';
});

test('迭代器遍历所有字节', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const values = [];
  for (const value of buf) {
    values.push(value);
  }
  return values.length === 5 && values[0] === 1 && values[4] === 5;
});

test('for...of 循环', () => {
  const buf = Buffer.from([10, 20, 30]);
  let sum = 0;
  for (const byte of buf) {
    sum += byte;
  }
  return sum === 60;
});

test('扩展运算符', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = [...buf];
  return Array.isArray(arr) && arr.length === 3 && arr[0] === 1;
});

test('Array.from()', () => {
  const buf = Buffer.from([5, 10, 15]);
  const arr = Array.from(buf);
  return Array.isArray(arr) && arr.length === 3 && arr[1] === 10;
});

// 空 Buffer 测试
test('空 Buffer 迭代', () => {
  const buf = Buffer.from([]);
  const values = [];
  for (const value of buf) {
    values.push(value);
  }
  return values.length === 0;
});

// 单字节 Buffer
test('单字节 Buffer 迭代', () => {
  const buf = Buffer.from([42]);
  const values = [...buf];
  return values.length === 1 && values[0] === 42;
});

// 大 Buffer 测试
test('大 Buffer 迭代', () => {
  const buf = Buffer.alloc(10000, 0x41);
  let count = 0;
  for (const byte of buf) {
    count++;
    if (byte !== 0x41) return false;
  }
  return count === 10000;
});

// 与 values() 方法等价
test('Symbol.iterator 等价于 values()', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf[Symbol.iterator]();
  const iter2 = buf.values();
  return iter1.next().value === iter2.next().value;
});

// 迭代器协议测试
test('迭代器 next() 返回正确格式', () => {
  const buf = Buffer.from([100]);
  const iterator = buf[Symbol.iterator]();
  const result = iterator.next();
  return result.value === 100 && result.done === false;
});

test('迭代器结束时 done 为 true', () => {
  const buf = Buffer.from([1]);
  const iterator = buf[Symbol.iterator]();
  iterator.next(); // 消费唯一元素
  const result = iterator.next();
  return result.done === true && result.value === undefined;
});

// 多次迭代
test('可以多次迭代同一个 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr1 = [...buf];
  const arr2 = [...buf];
  return arr1.length === 3 && arr2.length === 3 && arr1[0] === arr2[0];
});

// 修改 Buffer 不影响已创建的迭代器
test('迭代过程中修改 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const values = [];
  let index = 0;
  for (const value of buf) {
    values.push(value);
    if (index === 0) {
      buf[1] = 99; // 修改下一个值
    }
    index++;
  }
  return values[1] === 99; // 迭代器看到修改后的值
});

// 所有字节值测试
test('迭代所有可能的字节值 (0-255)', () => {
  const bytes = [];
  for (let i = 0; i <= 255; i++) {
    bytes.push(i);
  }
  const buf = Buffer.from(bytes);
  const values = [...buf];
  return values.length === 256 && values[0] === 0 && values[255] === 255;
});

// 解构赋值
test('解构赋值', () => {
  const buf = Buffer.from([10, 20, 30]);
  const [a, b, c] = buf;
  return a === 10 && b === 20 && c === 30;
});

// 部分解构
test('部分解构', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const [first, second, ...rest] = buf;
  return first === 1 && second === 2 && rest.length === 3;
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
