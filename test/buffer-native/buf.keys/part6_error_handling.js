// buf.keys() - Part 6: 错误处理和异常测试
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

// 正常调用不抛出错误
test('正常 Buffer 调用 keys() 不抛错', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    const iter = buf.keys();
    return true;
  } catch (e) {
    return false;
  }
});

test('空 Buffer 调用 keys() 不抛错', () => {
  const buf = Buffer.alloc(0);
  try {
    const iter = buf.keys();
    return true;
  } catch (e) {
    return false;
  }
});

test('大 Buffer 调用 keys() 不抛错', () => {
  const buf = Buffer.alloc(10000);
  try {
    const iter = buf.keys();
    return true;
  } catch (e) {
    return false;
  }
});

// 迭代器方法调用
test('next() 方法不带参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  try {
    const result = iter.next();
    return result.value === 0;
  } catch (e) {
    return false;
  }
});

test('next() 方法带参数被忽略', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  try {
    const result = iter.next('ignored');
    return result.value === 0;
  } catch (e) {
    return false;
  }
});

test('Symbol.iterator 不带参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  try {
    const iter2 = iter[Symbol.iterator]();
    return iter === iter2;
  } catch (e) {
    return false;
  }
});

// Buffer 修改场景
test('迭代过程中修改 Buffer 不影响索引', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.keys();
  const first = iter.next().value;
  
  buf[0] = 100;
  buf[1] = 200;
  
  const second = iter.next().value;
  return first === 0 && second === 1;
});

test('迭代过程中 fill Buffer 不影响索引', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.keys();
  iter.next();
  
  buf.fill(0);
  
  const keys = [];
  for (const key of iter) {
    keys.push(key);
  }
  return keys.length === 4 && keys[0] === 1;
});

// 特殊值测试
test('Buffer 包含 0 值字节', () => {
  const buf = Buffer.from([0, 0, 0]);
  const keys = Array.from(buf.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('Buffer 包含 255 值字节', () => {
  const buf = Buffer.from([255, 255, 255]);
  const keys = Array.from(buf.keys());
  return keys.length === 3 && keys[1] === 1;
});

test('Buffer 包含混合值', () => {
  const buf = Buffer.from([0, 128, 255, 1, 254]);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

// 迭代器状态测试
test('完成的迭代器继续调用 next()', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  const r1 = iter.next();
  const r2 = iter.next();
  const r3 = iter.next();
  return r1.done && r2.done && r3.done;
});

test('完成的迭代器 value 始终 undefined', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  iter.next();
  const r1 = iter.next();
  const r2 = iter.next();
  return r1.value === undefined && r2.value === undefined;
});

// 并发迭代器
test('多个迭代器同时迭代不冲突', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  const iter3 = buf.keys();
  
  const v1 = iter1.next().value;
  const v2 = iter2.next().value;
  const v3 = iter3.next().value;
  
  const v1_2 = iter1.next().value;
  const v2_2 = iter2.next().value;
  
  return v1 === 0 && v2 === 0 && v3 === 0 && v1_2 === 1 && v2_2 === 1;
});

test('交错使用多个迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  
  iter1.next();
  iter1.next();
  iter2.next();
  iter1.next();
  
  const remaining1 = Array.from(iter1);
  const remaining2 = Array.from(iter2);
  
  return remaining1.length === 2 && remaining2.length === 4;
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
