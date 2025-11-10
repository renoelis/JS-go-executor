// buf.keys() - Part 12: 最终覆盖测试
// 确保没有遗漏任何 Node.js v25.0.0 的特性
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

// 1. Buffer.prototype.keys 方法存在性
test('Buffer.prototype.keys 是函数', () => {
  return typeof Buffer.prototype.keys === 'function';
});

test('Buffer 实例有 keys 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  return typeof buf.keys === 'function';
});

// 2. 迭代器返回值的一致性
test('连续调用 keys() 每次返回新迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  const iter3 = buf.keys();
  return iter1 !== iter2 && iter2 !== iter3 && iter1 !== iter3;
});

test('迭代器状态完全独立', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  
  iter1.next();
  iter1.next();
  iter1.next();
  
  const r1 = iter1.next();
  const r2 = iter2.next();
  
  return r1.value === 3 && r2.value === 0;
});

// 3. 索引值的精确性
test('索引值是整数', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const keys = Array.from(buf.keys());
  return keys.every(k => Number.isInteger(k));
});

test('索引值非负', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Array.from(buf.keys());
  return keys.every(k => k >= 0);
});

test('索引值连续递增', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const keys = Array.from(buf.keys());
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== i) return false;
  }
  return true;
});

test('索引值无重复', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const keys = Array.from(buf.keys());
  const uniqueKeys = [...new Set(keys)];
  return keys.length === uniqueKeys.length;
});

// 4. 迭代器协议的完整性
test('迭代器可以被 for...of 消耗', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const collected = [];
  for (const key of iter) {
    collected.push(key);
  }
  return collected.length === 3 && collected[0] === 0;
});

test('迭代器可以被扩展运算符消耗', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const iter = buf.keys();
  const keys = [...iter];
  return keys.length === 4 && keys[3] === 3;
});

test('迭代器可以被 Array.from 消耗', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.keys();
  const keys = Array.from(iter);
  return keys.length === 5 && keys[4] === 4;
});

// 5. 边界条件
test('Buffer 长度为 1 时返回索引 0', () => {
  const buf = Buffer.from([255]);
  const keys = Array.from(buf.keys());
  return keys.length === 1 && keys[0] === 0;
});

test('Buffer 长度为 2 时返回索引 0, 1', () => {
  const buf = Buffer.from([100, 200]);
  const keys = Array.from(buf.keys());
  return keys.length === 2 && keys[0] === 0 && keys[1] === 1;
});

test('Buffer 长度为 256 时最大索引为 255', () => {
  const buf = Buffer.alloc(256);
  const keys = Array.from(buf.keys());
  return keys.length === 256 && keys[255] === 255;
});

// 6. 不同 Buffer 创建方式
test('Buffer.alloc 创建的 Buffer keys() 正常', () => {
  const buf = Buffer.alloc(5, 0);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('Buffer.allocUnsafe 创建的 Buffer keys() 正常', () => {
  const buf = Buffer.allocUnsafe(5);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[2] === 2;
});

test('Buffer.from(array) 创建的 Buffer keys() 正常', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Array.from(buf.keys());
  return keys.length === 3 && keys[1] === 1;
});

test('Buffer.from(string) 创建的 Buffer keys() 正常', () => {
  const buf = Buffer.from('hello', 'utf8');
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0;
});

test('Buffer.from(buffer) 创建的 Buffer keys() 正常', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);
  const keys = Array.from(buf2.keys());
  return keys.length === 3 && keys[2] === 2;
});

test('Buffer.from(arrayBuffer) 创建的 Buffer keys() 正常', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const keys = Array.from(buf.keys());
  return keys.length === 4 && keys[3] === 3;
});

// 7. 迭代器消耗后的状态
test('迭代器完全消耗后 done 为 true', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.keys();
  iter.next();
  iter.next();
  const result = iter.next();
  return result.done === true;
});

test('迭代器完全消耗后 value 为 undefined', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.keys();
  iter.next();
  iter.next();
  const result = iter.next();
  return result.value === undefined;
});

test('迭代器完全消耗后继续调用 next() 保持 done', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  iter.next();
  const r1 = iter.next();
  const r2 = iter.next();
  return r1.done === true && r2.done === true;
});

// 8. 特殊场景
test('Buffer 内容全为 0 时 keys() 正常', () => {
  const buf = Buffer.alloc(5, 0);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('Buffer 内容全为 255 时 keys() 正常', () => {
  const buf = Buffer.alloc(5, 255);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[2] === 2;
});

test('Buffer slice 后 keys() 返回新长度的索引', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(1, 4);
  const keys = Array.from(sliced.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('Buffer subarray 后 keys() 返回新长度的索引', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(2, 5);
  const keys = Array.from(sub.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

// 9. 与其他方法的交互
test('keys() 不影响 Buffer 内容', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.keys();
  Array.from(iter);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

test('修改 Buffer 不影响已创建的迭代器索引范围', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.keys();
  buf[0] = 100;
  buf[1] = 200;
  const keys = Array.from(iter);
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

// 10. 迭代器方法调用
test('可以直接调用 buf.keys()', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return iter !== null && typeof iter === 'object';
});

test('keys() 不接受参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.keys();
  const iter2 = buf.keys(123);
  const iter3 = buf.keys('test');
  // 参数应该被忽略，返回正常迭代器
  return Array.from(iter1).length === 3 &&
         Array.from(iter2).length === 3 &&
         Array.from(iter3).length === 3;
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
