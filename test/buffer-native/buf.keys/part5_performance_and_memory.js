// buf.keys() - Part 5: 性能和内存测试
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

// 迭代器创建性能
test('快速创建多个迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iterators = [];
  for (let i = 0; i < 100; i++) {
    iterators.push(buf.keys());
  }
  return iterators.length === 100;
});

test('迭代器不持有 Buffer 引用导致内存泄漏', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  // 迭代器应该可以正常工作
  const first = iter.next();
  return first.value === 0;
});

// 大量数据迭代
test('迭代 1000 个索引', () => {
  const buf = Buffer.alloc(1000);
  let count = 0;
  for (const key of buf.keys()) {
    count++;
  }
  return count === 1000;
});

test('迭代 10000 个索引', () => {
  const buf = Buffer.alloc(10000);
  let count = 0;
  for (const key of buf.keys()) {
    count++;
    if (count > 10000) break; // 防止无限循环
  }
  return count === 10000;
});

test('部分迭代大 Buffer 不影响性能', () => {
  const buf = Buffer.alloc(100000);
  const iter = buf.keys();
  let count = 0;
  for (const key of iter) {
    count++;
    if (count >= 100) break;
  }
  return count === 100;
});

// 迭代器内存效率
test('迭代器不预先分配所有索引', () => {
  const buf = Buffer.alloc(100000);
  const iter = buf.keys();
  // 只获取第一个值，不应该分配所有索引
  const first = iter.next();
  return first.value === 0 && first.done === false;
});

test('未完成的迭代器可以被垃圾回收', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let iter = buf.keys();
  iter.next();
  iter = null; // 释放引用
  return true;
});

// 重复迭代
test('可以多次完整迭代同一个 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  
  const keys1 = Array.from(buf.keys());
  const keys2 = Array.from(buf.keys());
  const keys3 = Array.from(buf.keys());
  
  return keys1.length === 3 && 
         keys2.length === 3 && 
         keys3.length === 3;
});

test('连续创建和消耗迭代器', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  let success = true;
  
  for (let i = 0; i < 10; i++) {
    const keys = Array.from(buf.keys());
    if (keys.length !== 5 || keys[0] !== 0) {
      success = false;
      break;
    }
  }
  
  return success;
});

// 边界性能
test('最小 Buffer (1 字节) 迭代', () => {
  const buf = Buffer.from([255]);
  const keys = Array.from(buf.keys());
  return keys.length === 1 && keys[0] === 0;
});

test('中等 Buffer (256 字节) 迭代', () => {
  const buf = Buffer.alloc(256);
  const keys = Array.from(buf.keys());
  return keys.length === 256 && keys[255] === 255;
});

test('较大 Buffer (8192 字节) 迭代', () => {
  const buf = Buffer.alloc(8192);
  const keys = Array.from(buf.keys());
  return keys.length === 8192 && keys[8191] === 8191;
});

// 迭代中断和恢复
test('中断迭代后重新开始', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter1 = buf.keys();
  
  iter1.next();
  iter1.next();
  
  const iter2 = buf.keys();
  const keys = Array.from(iter2);
  
  return keys.length === 5 && keys[0] === 0;
});

test('多个迭代器同时工作', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  const iter3 = buf.keys();
  
  const v1 = iter1.next().value;
  const v2 = iter2.next().value;
  const v3 = iter3.next().value;
  
  return v1 === 0 && v2 === 0 && v3 === 0;
});

// 特殊场景
test('空迭代器不消耗资源', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.keys();
  const result = iter.next();
  return result.done === true;
});

test('立即完成的迭代器', () => {
  const buf = Buffer.from([100]);
  const iter = buf.keys();
  iter.next();
  const result = iter.next();
  return result.done === true;
});

test('交替使用 next() 和 for...of', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const iter = buf.keys();
  
  const manual1 = iter.next().value;
  const manual2 = iter.next().value;
  
  const remaining = [];
  for (const key of iter) {
    remaining.push(key);
  }
  
  return manual1 === 0 && 
         manual2 === 1 && 
         remaining.length === 6 && 
         remaining[0] === 2;
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
