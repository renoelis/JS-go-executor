// buf.keys() - Part 15: 最终缺失场景补充测试
// 补充一些极端边界和特殊场景
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

// 测试 keys() 方法本身的属性
test('keys 方法是函数', () => {
  const buf = Buffer.from([1, 2, 3]);
  return typeof buf.keys === 'function';
});

test('keys 方法名称正确', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.keys.name === 'keys';
});

test('keys 方法长度为 0', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.keys.length === 0;
});

// 测试迭代器返回值的类型
test('迭代器不是数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return !Array.isArray(iter);
});

test('迭代器是对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return typeof iter === 'object' && iter !== null;
});

// 测试索引值的类型和范围
test('所有索引都是数字类型', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  return keys.every(k => typeof k === 'number');
});

test('所有索引都是整数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  return keys.every(k => Number.isInteger(k));
});

test('所有索引都是非负数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  return keys.every(k => k >= 0);
});

test('索引连续无间隔', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const keys = Array.from(buf.keys());
  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i + 1] - keys[i] !== 1) {
      return false;
    }
  }
  return true;
});

// 测试与 Buffer 长度的关系
test('keys 数量等于 Buffer 长度', () => {
  const sizes = [0, 1, 2, 10, 100, 1000];
  for (const size of sizes) {
    const buf = Buffer.alloc(size);
    const keys = Array.from(buf.keys());
    if (keys.length !== size) {
      return false;
    }
  }
  return true;
});

test('最小索引始终为 0（非空 Buffer）', () => {
  const buf = Buffer.from([100, 200, 50]);
  const keys = Array.from(buf.keys());
  return Math.min(...keys) === 0;
});

test('最大索引等于 length - 1（非空 Buffer）', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const keys = Array.from(buf.keys());
  return Math.max(...keys) === buf.length - 1;
});

// 测试迭代器协议的完整性
test('迭代器有 next 和 Symbol.iterator 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return typeof iter.next === 'function' && typeof iter[Symbol.iterator] === 'function';
});

test('next 方法返回的对象只有 value 和 done 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const result = iter.next();
  const keys = Object.keys(result);
  return keys.length === 2 && keys.includes('value') && keys.includes('done');
});

// 测试不同 Buffer 创建方式的一致性
test('Buffer.from(array) 和 Buffer.from(buffer) keys 一致', () => {
  const arr = [10, 20, 30, 40];
  const buf1 = Buffer.from(arr);
  const buf2 = Buffer.from(buf1);
  const keys1 = Array.from(buf1.keys());
  const keys2 = Array.from(buf2.keys());
  return JSON.stringify(keys1) === JSON.stringify(keys2);
});

test('Buffer.alloc 和 Buffer.allocUnsafe keys 一致', () => {
  const size = 10;
  const buf1 = Buffer.alloc(size);
  const buf2 = Buffer.allocUnsafe(size);
  const keys1 = Array.from(buf1.keys());
  const keys2 = Array.from(buf2.keys());
  return JSON.stringify(keys1) === JSON.stringify(keys2);
});

// 测试 Buffer 内容对 keys 的影响（应该无影响）
test('Buffer 内容不影响 keys 结果', () => {
  const buf1 = Buffer.from([0, 0, 0, 0]);
  const buf2 = Buffer.from([255, 255, 255, 255]);
  const buf3 = Buffer.from([10, 20, 30, 40]);
  const keys1 = Array.from(buf1.keys());
  const keys2 = Array.from(buf2.keys());
  const keys3 = Array.from(buf3.keys());
  return JSON.stringify(keys1) === JSON.stringify(keys2) && 
         JSON.stringify(keys2) === JSON.stringify(keys3);
});

// 测试迭代器的幂等性
test('多次调用 keys() 返回独立迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  const iter3 = buf.keys();
  return iter1 !== iter2 && iter2 !== iter3 && iter1 !== iter3;
});

test('迭代器不共享状态', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  
  iter1.next();
  iter1.next();
  iter1.next();
  
  const result2 = iter2.next();
  return result2.value === 0 && result2.done === false;
});

// 测试边界情况
test('Buffer 长度为 2^16', () => {
  const buf = Buffer.alloc(65536);
  const iter = buf.keys();
  let count = 0;
  for (const key of iter) {
    count++;
    if (count > 65536) break;
  }
  return count === 65536;
});

test('迭代器在空 Buffer 上立即完成', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.keys();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

// 测试迭代器的不可变性
test('无法修改迭代器返回的结果对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const result = iter.next();
  const originalValue = result.value;
  const originalDone = result.done;
  
  try {
    result.value = 999;
    result.done = true;
  } catch (e) {
    // 严格模式下可能抛错
  }
  
  // 即使修改了，也不应该影响迭代器的后续行为
  const result2 = iter.next();
  return result2.value === 1 && result2.done === false;
});

// 测试与 for...of 的兼容性
test('for...of 可以提前 break', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let count = 0;
  for (const key of buf.keys()) {
    count++;
    if (count === 3) break;
  }
  return count === 3;
});

test('for...of 可以提前 return', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  function testReturn() {
    for (const key of buf.keys()) {
      if (key === 2) return true;
    }
    return false;
  }
  return testReturn();
});

// 测试迭代器与异常处理
test('迭代过程中抛出异常不影响 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  try {
    for (const key of buf.keys()) {
      if (key === 2) throw new Error('test error');
    }
  } catch (e) {
    // 捕获异常
  }
  
  // Buffer 应该仍然可用
  const keys = Array.from(buf.keys());
  return keys.length === 5;
});

// 测试特殊的 Buffer 操作
test('Buffer.concat([]) 的 keys', () => {
  const buf = Buffer.concat([]);
  const keys = Array.from(buf.keys());
  return keys.length === 0;
});

test('Buffer.concat([empty, empty]) 的 keys', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const buf = Buffer.concat([buf1, buf2]);
  const keys = Array.from(buf.keys());
  return keys.length === 0;
});

test('Buffer.concat 多个 Buffer 的 keys', () => {
  const bufs = [
    Buffer.from([1]),
    Buffer.from([2, 3]),
    Buffer.from([4, 5, 6])
  ];
  const buf = Buffer.concat(bufs);
  const keys = Array.from(buf.keys());
  return keys.length === 6 && keys[0] === 0 && keys[5] === 5;
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
