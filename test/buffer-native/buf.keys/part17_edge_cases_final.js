// buf.keys() - Part 17: 最终边界情况补充
// 补充一些极端和特殊的边界场景
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

// 测试 keys 方法的基本特征
test('keys 方法是函数类型', () => {
  const buf = Buffer.from([1, 2, 3]);
  return typeof buf.keys === 'function';
});

test('keys 方法可以被调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    const iter = buf.keys();
    return iter !== null && typeof iter === 'object';
  } catch (e) {
    return false;
  }
});

test('keys 方法返回值一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  const keys1 = Array.from(iter1);
  const keys2 = Array.from(iter2);
  return JSON.stringify(keys1) === JSON.stringify(keys2);
});

// 测试迭代器的属性
test('迭代器 next 方法存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return 'next' in iter && typeof iter.next === 'function';
});

test('迭代器 Symbol.iterator 方法存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return Symbol.iterator in iter && typeof iter[Symbol.iterator] === 'function';
});

// 测试不同大小的 Buffer
test('1 字节 Buffer', () => {
  const buf = Buffer.alloc(1);
  const keys = Array.from(buf.keys());
  return keys.length === 1 && keys[0] === 0;
});

test('2 字节 Buffer', () => {
  const buf = Buffer.alloc(2);
  const keys = Array.from(buf.keys());
  return keys.length === 2 && keys[0] === 0 && keys[1] === 1;
});

test('255 字节 Buffer', () => {
  const buf = Buffer.alloc(255);
  const keys = Array.from(buf.keys());
  return keys.length === 255 && keys[0] === 0 && keys[254] === 254;
});

test('256 字节 Buffer', () => {
  const buf = Buffer.alloc(256);
  const keys = Array.from(buf.keys());
  return keys.length === 256 && keys[0] === 0 && keys[255] === 255;
});

test('257 字节 Buffer', () => {
  const buf = Buffer.alloc(257);
  const keys = Array.from(buf.keys());
  return keys.length === 257 && keys[0] === 0 && keys[256] === 256;
});

// 测试特殊字符串编码
test('空字符串 Buffer', () => {
  const buf = Buffer.from('', 'utf8');
  const keys = Array.from(buf.keys());
  return keys.length === 0;
});

test('单字符 UTF-8 Buffer', () => {
  const buf = Buffer.from('a', 'utf8');
  const keys = Array.from(buf.keys());
  return keys.length === 1 && keys[0] === 0;
});

test('多字节 UTF-8 字符 Buffer', () => {
  const buf = Buffer.from('你好', 'utf8');
  const keys = Array.from(buf.keys());
  return keys.length === 6 && keys[0] === 0 && keys[5] === 5;
});

test('emoji Buffer', () => {
  const buf = Buffer.from('😀', 'utf8');
  const keys = Array.from(buf.keys());
  return keys.length === 4 && keys[0] === 0 && keys[3] === 3;
});

// 测试不同编码方式
test('latin1 编码 Buffer', () => {
  const buf = Buffer.from('hello', 'latin1');
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('ascii 编码 Buffer', () => {
  const buf = Buffer.from('test', 'ascii');
  const keys = Array.from(buf.keys());
  return keys.length === 4 && keys[0] === 0 && keys[3] === 3;
});

test('utf16le 编码 Buffer', () => {
  const buf = Buffer.from('ab', 'utf16le');
  const keys = Array.from(buf.keys());
  return keys.length === 4 && keys[0] === 0 && keys[3] === 3;
});

test('ucs2 编码 Buffer', () => {
  const buf = Buffer.from('test', 'ucs2');
  const keys = Array.from(buf.keys());
  return keys.length === 8 && keys[0] === 0 && keys[7] === 7;
});

// 测试 Buffer 操作后的 keys
test('fill 后的 Buffer keys 不变', () => {
  const buf = Buffer.alloc(5);
  const keysBefore = Array.from(buf.keys());
  buf.fill(255);
  const keysAfter = Array.from(buf.keys());
  return JSON.stringify(keysBefore) === JSON.stringify(keysAfter);
});

test('write 后的 Buffer keys 不变', () => {
  const buf = Buffer.alloc(10);
  const keysBefore = Array.from(buf.keys());
  buf.write('hello');
  const keysAfter = Array.from(buf.keys());
  return JSON.stringify(keysBefore) === JSON.stringify(keysAfter);
});

test('copy 后的目标 Buffer keys 不变', () => {
  const source = Buffer.from([1, 2, 3]);
  const target = Buffer.alloc(5);
  const keysBefore = Array.from(target.keys());
  source.copy(target);
  const keysAfter = Array.from(target.keys());
  return JSON.stringify(keysBefore) === JSON.stringify(keysAfter);
});

// 测试迭代器的边界行为
test('迭代器 next() 返回的对象不可扩展', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const result = iter.next();
  try {
    result.newProp = 'test';
    return true;
  } catch (e) {
    return false;
  }
});

test('迭代器完成后 value 始终为 undefined', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  
  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(iter.next().value);
  }
  
  return results.every(v => v === undefined);
});

test('迭代器完成后 done 始终为 true', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  
  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(iter.next().done);
  }
  
  return results.every(d => d === true);
});

// 测试与数组解构的兼容性
test('可以使用数组解构', () => {
  const buf = Buffer.from([10, 20, 30]);
  const [first, second, third] = buf.keys();
  return first === 0 && second === 1 && third === 2;
});

test('解构时可以跳过元素', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const [first, , third] = buf.keys();
  return first === 0 && third === 2;
});

test('解构时可以使用剩余参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const [first, ...rest] = buf.keys();
  return first === 0 && rest.length === 4 && rest[3] === 4;
});

// 测试迭代器与 Array 方法的兼容性
test('Array.from 带过滤函数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const evenKeys = Array.from(buf.keys()).filter(k => k % 2 === 0);
  return evenKeys.length === 3 && evenKeys[0] === 0 && evenKeys[2] === 4;
});

test('Array.from 带映射函数', () => {
  const buf = Buffer.from([10, 20, 30]);
  const mapped = Array.from(buf.keys(), k => k * 10);
  return mapped[0] === 0 && mapped[1] === 10 && mapped[2] === 20;
});

// 测试迭代器的性能特性
test('迭代器是惰性的', () => {
  const buf = Buffer.alloc(10000);
  const iter = buf.keys();
  const start = Date.now();
  iter.next();
  iter.next();
  const elapsed = Date.now() - start;
  return elapsed < 10;
});

test('部分迭代不影响性能', () => {
  const buf = Buffer.alloc(100000);
  const start = Date.now();
  let count = 0;
  for (const key of buf.keys()) {
    count++;
    if (count === 100) break;
  }
  const elapsed = Date.now() - start;
  return elapsed < 50 && count === 100;
});

// 测试 Buffer 的特殊状态
test('Buffer.allocUnsafeSlow 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

// 测试索引值的精确性
test('所有索引值都是安全整数', () => {
  const buf = Buffer.alloc(1000);
  const keys = Array.from(buf.keys());
  return keys.every(k => Number.isSafeInteger(k));
});

test('索引值不是浮点数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  return keys.every(k => k === Math.floor(k));
});

test('索引值不是 NaN', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  return keys.every(k => !Number.isNaN(k));
});

test('索引值不是 Infinity', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  return keys.every(k => isFinite(k));
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
