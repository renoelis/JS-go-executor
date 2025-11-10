// buf.keys() - Part 2: 边界情况测试
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

// 空 Buffer
test('空 Buffer 返回空迭代器', () => {
  const buf = Buffer.alloc(0);
  const keys = Array.from(buf.keys());
  return keys.length === 0;
});

test('空 Buffer 迭代器 next() 立即 done', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.keys();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

test('空 Buffer for...of 不执行', () => {
  const buf = Buffer.alloc(0);
  let count = 0;
  for (const key of buf.keys()) {
    count++;
  }
  return count === 0;
});

// 单字节 Buffer
test('单字节 Buffer 返回索引 0', () => {
  const buf = Buffer.from([255]);
  const keys = Array.from(buf.keys());
  return keys.length === 1 && keys[0] === 0;
});

test('单字节 Buffer 第二次 next() done', () => {
  const buf = Buffer.from([100]);
  const iter = buf.keys();
  iter.next();
  const result = iter.next();
  return result.done === true;
});

// 大 Buffer
test('大 Buffer (1000 字节)', () => {
  const buf = Buffer.alloc(1000);
  const keys = Array.from(buf.keys());
  return keys.length === 1000 && 
         keys[0] === 0 && 
         keys[999] === 999;
});

test('大 Buffer (10000 字节)', () => {
  const buf = Buffer.alloc(10000);
  const keys = Array.from(buf.keys());
  return keys.length === 10000 && 
         keys[0] === 0 && 
         keys[9999] === 9999;
});

test('超大 Buffer (100000 字节) 索引正确', () => {
  const buf = Buffer.alloc(100000);
  const iter = buf.keys();
  // 只检查前几个和最后几个
  const first = iter.next().value;
  const second = iter.next().value;
  
  // 跳到最后
  let last;
  for (const key of buf.keys()) {
    last = key;
  }
  
  return first === 0 && second === 1 && last === 99999;
});

// Buffer 内容变化不影响迭代器
test('Buffer 修改不影响已创建的迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  buf[0] = 100;
  buf[1] = 200;
  const keys = Array.from(iter);
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('Buffer 长度不变，迭代器正常', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.keys();
  buf.fill(0);
  const keys = [];
  for (const key of iter) {
    keys.push(key);
  }
  return keys.length === 3;
});

// 不同创建方式的 Buffer
test('Buffer.alloc() 创建的 Buffer', () => {
  const buf = Buffer.alloc(5);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[4] === 4;
});

test('Buffer.allocUnsafe() 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafe(5);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0;
});

test('Buffer.from(array) 创建的 Buffer', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[2] === 2;
});

test('Buffer.from(string) 创建的 Buffer', () => {
  const buf = Buffer.from('hello');
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('Buffer.from(buffer) 创建的 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);
  const keys = Array.from(buf2.keys());
  return keys.length === 3 && keys[1] === 1;
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
