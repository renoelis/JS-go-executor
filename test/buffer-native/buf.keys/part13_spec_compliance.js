// buf.keys() - Part 13: Node.js v25.0.0 规范完全符合性测试
// 确保与 Node.js 官方文档完全一致
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
test('官方文档示例：Buffer.from("buffer")', () => {
  const buf = Buffer.from('buffer');
  const keys = [];
  for (const key of buf.keys()) {
    keys.push(key);
  }
  // 应该输出 0, 1, 2, 3, 4, 5
  return keys.length === 6 && 
         keys[0] === 0 && 
         keys[1] === 1 && 
         keys[2] === 2 && 
         keys[3] === 3 && 
         keys[4] === 4 && 
         keys[5] === 5;
});

// 返回值类型验证
test('返回值是迭代器（有 next 和 Symbol.iterator）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return typeof iter.next === 'function' && 
         typeof iter[Symbol.iterator] === 'function';
});

test('迭代器的 Symbol.iterator 返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return iter[Symbol.iterator]() === iter;
});

// 索引值验证
test('索引从 0 开始', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.keys();
  const first = iter.next();
  return first.value === 0 && first.done === false;
});

test('索引连续递增', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.keys();
  let prev = -1;
  let allSequential = true;
  
  for (const key of buf.keys()) {
    if (key !== prev + 1) {
      allSequential = false;
      break;
    }
    prev = key;
  }
  
  return allSequential;
});

test('最后一个索引是 length - 1', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  return keys[keys.length - 1] === buf.length - 1;
});

// 空 Buffer 特殊情况
test('空 Buffer 立即完成迭代', () => {
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
  return executed === false;
});

// 迭代器独立性
test('每次调用 keys() 返回新的独立迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  
  iter1.next();
  iter1.next();
  
  const r1 = iter1.next();
  const r2 = iter2.next();
  
  return r1.value === 2 && r2.value === 0;
});

// 迭代器消耗后的行为
test('迭代器完全消耗后保持 done 状态', () => {
  const buf = Buffer.from([1]);
  const iter = buf.keys();
  
  iter.next(); // 0
  iter.next(); // done
  const r1 = iter.next();
  const r2 = iter.next();
  const r3 = iter.next();
  
  return r1.done === true && 
         r2.done === true && 
         r3.done === true &&
         r1.value === undefined &&
         r2.value === undefined &&
         r3.value === undefined;
});

// 与数组方法的兼容性
test('Array.from 正确转换迭代器', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const keys = Array.from(buf.keys());
  return Array.isArray(keys) && 
         keys.length === 5 && 
         keys[0] === 0 && 
         keys[4] === 4;
});

test('扩展运算符正确展开迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = [...buf.keys()];
  return keys.length === 3 && 
         keys[0] === 0 && 
         keys[1] === 1 && 
         keys[2] === 2;
});

// 不同 Buffer 创建方式
test('Buffer.alloc 创建的 Buffer', () => {
  const buf = Buffer.alloc(3);
  const keys = Array.from(buf.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('Buffer.allocUnsafe 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafe(3);
  const keys = Array.from(buf.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('Buffer.from(array) 创建的 Buffer', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Array.from(buf.keys());
  return keys.length === 3 && keys[1] === 1;
});

test('Buffer.from(string) 创建的 Buffer', () => {
  const buf = Buffer.from('hello', 'utf8');
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('Buffer.from(buffer) 创建的 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);
  const keys = Array.from(buf2.keys());
  return keys.length === 3 && keys[0] === 0;
});

test('Buffer.from(arrayBuffer) 创建的 Buffer', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const keys = Array.from(buf.keys());
  return keys.length === 4 && keys[3] === 3;
});

// Buffer 修改不影响迭代器
test('修改 Buffer 内容不影响已创建的迭代器索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.keys();
  
  buf[0] = 100;
  buf[1] = 200;
  buf[2] = 255;
  
  const keys = Array.from(iter);
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

// slice 和 subarray
test('Buffer.slice 后的 keys() 返回新长度的索引', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(1, 4);
  const keys = Array.from(sliced.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('Buffer.subarray 后的 keys() 返回新长度的索引', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(2, 5);
  const keys = Array.from(sub.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

// 大 Buffer
test('大 Buffer (10000 字节) 索引正确', () => {
  const buf = Buffer.alloc(10000);
  const keys = Array.from(buf.keys());
  return keys.length === 10000 && 
         keys[0] === 0 && 
         keys[9999] === 9999;
});

// 索引值类型
test('所有索引值都是整数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  return keys.every(k => Number.isInteger(k));
});

test('所有索引值都非负', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  return keys.every(k => k >= 0);
});

// 迭代器方法调用
test('keys() 方法不接受参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  // 即使传入参数也应该被忽略
  const iter1 = buf.keys();
  const iter2 = buf.keys(123);
  const iter3 = buf.keys('test', 456);
  
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
