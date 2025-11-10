// buf.keys() - Part 16: Node.js v25.0.0 规范对齐测试
// 确保与官方文档完全一致
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

// 官方文档示例验证
test('官方示例: Buffer.from("buffer") 迭代', () => {
  const buf = Buffer.from('buffer');
  const keys = [];
  for (const key of buf.keys()) {
    keys.push(key);
  }
  return keys.length === 6 && 
         keys[0] === 0 && 
         keys[1] === 1 && 
         keys[2] === 2 && 
         keys[3] === 3 && 
         keys[4] === 4 && 
         keys[5] === 5;
});

// 返回值类型验证
test('返回 Iterator 对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return typeof iter === 'object' && 
         iter !== null && 
         typeof iter.next === 'function' && 
         typeof iter[Symbol.iterator] === 'function';
});

test('Iterator 符合迭代器协议', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const result = iter.next();
  return typeof result === 'object' && 
         'value' in result && 
         'done' in result && 
         typeof result.done === 'boolean';
});

// 索引范围验证
test('索引从 0 开始', () => {
  const sizes = [1, 5, 10, 100];
  for (const size of sizes) {
    const buf = Buffer.alloc(size);
    const iter = buf.keys();
    const first = iter.next();
    if (first.value !== 0 || first.done !== false) {
      return false;
    }
  }
  return true;
});

test('索引到 length-1 结束', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const keys = Array.from(buf.keys());
  const lastKey = keys[keys.length - 1];
  return lastKey === buf.length - 1;
});

test('索引连续递增', () => {
  const buf = Buffer.alloc(20);
  const keys = Array.from(buf.keys());
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== i) {
      return false;
    }
  }
  return true;
});

// 空 Buffer 特殊情况
test('空 Buffer 返回空迭代器', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.keys();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

test('空 Buffer for...of 不执行循环体', () => {
  const buf = Buffer.alloc(0);
  let executed = false;
  for (const key of buf.keys()) {
    executed = true;
  }
  return !executed;
});

// 迭代器独立性
test('每次调用 keys() 返回新的独立迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  
  iter1.next();
  iter1.next();
  
  const result1 = iter1.next();
  const result2 = iter2.next();
  
  return result1.value === 2 && result2.value === 0;
});

// 迭代器不可重置
test('迭代器耗尽后不可重置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  
  Array.from(iter);
  
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

test('迭代器耗尽后多次调用 next() 保持 done 状态', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  
  iter.next();
  const r1 = iter.next();
  const r2 = iter.next();
  const r3 = iter.next();
  
  return r1.done && r2.done && r3.done && 
         r1.value === undefined && 
         r2.value === undefined && 
         r3.value === undefined;
});

// Symbol.iterator 行为
test('迭代器的 Symbol.iterator 返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const iter2 = iter[Symbol.iterator]();
  return iter === iter2;
});

test('可以通过 Symbol.iterator 在 for...of 中使用', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.keys();
  const keys = [];
  for (const key of iter) {
    keys.push(key);
  }
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

// 与 Buffer 长度的关系
test('keys 数量等于 Buffer.length', () => {
  const sizes = [0, 1, 2, 5, 10, 100, 1000];
  for (const size of sizes) {
    const buf = Buffer.alloc(size);
    const keys = Array.from(buf.keys());
    if (keys.length !== size) {
      return false;
    }
  }
  return true;
});

// Buffer 内容不影响 keys
test('Buffer 值不影响索引序列', () => {
  const buf1 = Buffer.from([0, 0, 0, 0]);
  const buf2 = Buffer.from([255, 255, 255, 255]);
  const buf3 = Buffer.from([1, 2, 3, 4]);
  
  const keys1 = Array.from(buf1.keys());
  const keys2 = Array.from(buf2.keys());
  const keys3 = Array.from(buf3.keys());
  
  return JSON.stringify(keys1) === JSON.stringify(keys2) && 
         JSON.stringify(keys2) === JSON.stringify(keys3);
});

// 不同 Buffer 创建方式
test('Buffer.alloc 创建的 Buffer', () => {
  const buf = Buffer.alloc(5);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('Buffer.allocUnsafe 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafe(5);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('Buffer.from(array) 创建的 Buffer', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Array.from(buf.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('Buffer.from(string) 创建的 Buffer', () => {
  const buf = Buffer.from('hello');
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('Buffer.from(buffer) 创建的 Buffer', () => {
  const original = Buffer.from([1, 2, 3]);
  const copy = Buffer.from(original);
  const keys = Array.from(copy.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

// slice 和 subarray
test('slice 后的 Buffer 索引重新从 0 开始', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(2, 4);
  const keys = Array.from(sliced.keys());
  return keys.length === 2 && keys[0] === 0 && keys[1] === 1;
});

test('subarray 后的 Buffer 索引重新从 0 开始', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(1, 4);
  const keys = Array.from(sub.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

// concat
test('Buffer.concat 后的索引连续', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4, 5]);
  const concatenated = Buffer.concat([buf1, buf2]);
  const keys = Array.from(concatenated.keys());
  return keys.length === 5 && 
         keys[0] === 0 && 
         keys[4] === 4;
});

// 与其他迭代器方法的一致性
test('keys() 与 entries() 索引部分一致', () => {
  const buf = Buffer.from([100, 200, 50]);
  const keys = Array.from(buf.keys());
  const entries = Array.from(buf.entries());
  const entriesKeys = entries.map(([idx]) => idx);
  return JSON.stringify(keys) === JSON.stringify(entriesKeys);
});

test('keys() 与 values() 长度一致', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const keys = Array.from(buf.keys());
  const values = Array.from(buf.values());
  return keys.length === values.length;
});

// 迭代器方法不接受参数
test('keys() 方法不接受参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.keys();
  const iter2 = buf.keys(123);
  const iter3 = buf.keys('test');
  
  const keys1 = Array.from(iter1);
  const keys2 = Array.from(iter2);
  const keys3 = Array.from(iter3);
  
  return keys1.length === 3 && keys2.length === 3 && keys3.length === 3;
});

// 性能和内存相关
test('大 Buffer 迭代器不会立即计算所有索引', () => {
  const buf = Buffer.alloc(1000000);
  const iter = buf.keys();
  const start = Date.now();
  const first = iter.next();
  const elapsed = Date.now() - start;
  return first.value === 0 && elapsed < 100;
});

test('迭代器可以提前终止', () => {
  const buf = Buffer.alloc(1000);
  let count = 0;
  for (const key of buf.keys()) {
    count++;
    if (count === 10) break;
  }
  return count === 10;
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
