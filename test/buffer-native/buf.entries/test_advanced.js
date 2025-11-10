// buf.entries() - 高级场景和深入测试
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

// ==================== 迭代器与 Buffer 内存共享 ====================
test('slice 后的 Buffer 迭代器反映原 Buffer 变化', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const iter = sliced.entries();
  buf[2] = 99; // 修改原 Buffer
  const r1 = iter.next(); // [0, 2] - slice 的索引 0 对应原 Buffer 索引 1
  const r2 = iter.next(); // [1, 99] - slice 的索引 1 对应原 Buffer 索引 2，应该反映变化
  return r1.value[1] === 2 && r2.value[1] === 99;
});

test('subarray 后的 Buffer 迭代器反映原 Buffer 变化', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const sub = buf.subarray(1, 3);
  const iter = sub.entries();
  buf[2] = 99; // 修改原 Buffer
  const r1 = iter.next();
  const r2 = iter.next();
  return r1.value[1] === 20 && r2.value[1] === 99;
});

test('迭代器读取的是 Buffer 的当前值（不是快照）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const r1 = iter.next(); // [0, 1]
  buf[0] = 99; // 修改值
  buf[1] = 88; // 修改值
  const r2 = iter.next(); // [1, 88] - 应该读取新值
  return r1.value[1] === 1 && r2.value[1] === 88;
});

// ==================== 迭代器并发操作 ====================
test('多个迭代器同时迭代同一个 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter1 = buf.entries();
  const iter2 = buf.entries();
  const iter3 = buf.entries();
  
  const r1_1 = iter1.next();
  const r2_1 = iter2.next();
  const r3_1 = iter3.next();
  
  const r1_2 = iter1.next();
  const r2_2 = iter2.next();
  const r3_2 = iter3.next();
  
  return r1_1.value[0] === 0 && r1_1.value[1] === 1 &&
         r2_1.value[0] === 0 && r2_1.value[1] === 1 &&
         r3_1.value[0] === 0 && r3_1.value[1] === 1 &&
         r1_2.value[0] === 1 && r1_2.value[1] === 2 &&
         r2_2.value[0] === 1 && r2_2.value[1] === 2 &&
         r3_2.value[0] === 1 && r3_2.value[1] === 2;
});

test('多个迭代器独立状态', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter1 = buf.entries();
  const iter2 = buf.entries();
  
  iter1.next(); // 消费第一个
  iter1.next(); // 消费第二个
  
  const r1 = iter1.next(); // [2, 30]
  const r2 = iter2.next(); // [0, 10] - 应该从头开始
  
  return r1.value[0] === 2 && r1.value[1] === 30 &&
         r2.value[0] === 0 && r2.value[1] === 10;
});

// ==================== 迭代器与 Buffer 操作交互 ====================
test('迭代过程中 Buffer 被 fill', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  iter.next(); // [0, 1]
  buf.fill(99); // 填充所有值为 99
  const r2 = iter.next(); // [1, 99] - 应该读取新值
  const r3 = iter.next(); // [2, 99]
  return r2.value[1] === 99 && r3.value[1] === 99;
});

test('迭代过程中 Buffer 被 write', () => {
  const buf = Buffer.alloc(10);
  const iter = buf.entries();
  buf.write('hello', 0, 'utf8');
  const entries = Array.from(iter);
  return entries.length === 10 && entries[0][1] === 104; // 'h' = 104
});

test('迭代过程中 Buffer 被 copy', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.alloc(3);
  const iter = buf2.entries();
  buf1.copy(buf2);
  const entries = Array.from(iter);
  return entries.length === 3 && entries[0][1] === 1 && entries[2][1] === 3;
});

// ==================== 迭代器与 Buffer 长度边界 ====================
test('迭代器在 Buffer 长度为 0 时立即完成', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.entries();
  const r = iter.next();
  return r.done === true && r.value === undefined;
});

test('迭代器在单字节 Buffer 时正常工作', () => {
  const buf = Buffer.from([42]);
  const iter = buf.entries();
  const r1 = iter.next();
  const r2 = iter.next();
  return r1.value[0] === 0 && r1.value[1] === 42 && r1.done === false &&
         r2.done === true && r2.value === undefined;
});

test('迭代器在大 Buffer (10000 字节) 时正常工作', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < 10000; i++) {
    buf[i] = i % 256;
  }
  const iter = buf.entries();
  let count = 0;
  let lastIndex = -1;
  let allMatch = true;
  for (const [index, value] of iter) {
    count++;
    lastIndex = index;
    // 验证值是否正确：value 应该是 index % 256
    if (value !== (index % 256)) {
      allMatch = false;
      break;
    }
  }
  return count === 10000 && lastIndex === 9999 && allMatch;
});

// ==================== 迭代器与特殊值 ====================
test('迭代器处理 0 值', () => {
  const buf = Buffer.from([0, 0, 0]);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && 
         entries[0][1] === 0 && 
         entries[1][1] === 0 && 
         entries[2][1] === 0;
});

test('迭代器处理 255 值（最大值）', () => {
  const buf = Buffer.from([255, 255, 255]);
  const entries = Array.from(buf.entries());
  return entries.every(([index, value]) => value === 255);
});

test('迭代器处理所有字节值 (0-255)', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  const entries = Array.from(buf.entries());
  let allMatch = true;
  for (let i = 0; i < 256; i++) {
    if (entries[i][0] !== i || entries[i][1] !== i) {
      allMatch = false;
      break;
    }
  }
  return allMatch && entries.length === 256;
});

// ==================== 迭代器与编码 ====================
test('UTF-8 多字节字符的迭代器', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  const entries = Array.from(buf.entries());
  // '你好世界' 在 UTF-8 中每个中文字符占 3 字节，共 12 字节
  return entries.length === 12;
});

test('UTF-16LE 编码的迭代器', () => {
  const buf = Buffer.from('AB', 'utf16le');
  const entries = Array.from(buf.entries());
  // 'AB' 在 UTF-16LE 中每个字符占 2 字节，共 4 字节
  return entries.length === 4;
});

test('Base64 编码的迭代器', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello"
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[0][1] === 72; // 'H' = 72
});

test('Hex 编码的迭代器', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[0][1] === 0x48;
});

// ==================== 迭代器与 TypedArray ====================
test('从 Uint8Array 创建的 Buffer 迭代器', () => {
  const arr = new Uint8Array([10, 20, 30]);
  const buf = Buffer.from(arr);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[1][1] === 20;
});

test('从 Uint16Array buffer 创建的 Buffer 迭代器', () => {
  const arr = new Uint16Array([0x1234, 0x5678]);
  const buf = Buffer.from(arr.buffer);
  const entries = Array.from(buf.entries());
  // Uint16Array 每个元素 2 字节，共 4 字节
  return entries.length === 4;
});

test('从 ArrayBuffer 创建的 Buffer 迭代器', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  view[3] = 4;
  const buf = Buffer.from(ab);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[2][1] === 3;
});

// ==================== 迭代器性能相关 ====================
test('迭代器创建是 O(1) 操作', () => {
  const buf = Buffer.alloc(1000000); // 1MB
  const start = Date.now();
  const iter = buf.entries();
  const elapsed = Date.now() - start;
  // 创建迭代器应该非常快，不应该遍历所有元素
  return elapsed < 10 && typeof iter.next === 'function';
});

test('迭代器延迟计算（按需迭代）', () => {
  const buf = Buffer.alloc(100000);
  const iter = buf.entries();
  // 只迭代前几个元素
  const r1 = iter.next();
  const r2 = iter.next();
  const r3 = iter.next();
  return r1.value[0] === 0 && r2.value[0] === 1 && r3.value[0] === 2;
});

// ==================== 迭代器与函数式编程 ====================
test('迭代器可用于函数式链式调用', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = Array.from(buf.entries())
    .filter(([index, value]) => value % 2 === 0)
    .map(([index, value]) => value * 2)
    .reduce((sum, val) => sum + val, 0);
  return result === 12; // (2*2) + (4*2) = 4 + 8 = 12
});

test('迭代器可用于复杂的数据转换', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = Array.from(buf.entries())
    .map(([index, value]) => ({ index, value, doubled: value * 2 }))
    .filter(item => item.doubled > 4)
    .map(item => item.index);
  return result.length === 3 && result[0] === 2 && result[2] === 4;
});

// ==================== 迭代器与错误边界 ====================
test('迭代器在 Buffer 为 null 时抛出错误', () => {
  try {
    const buf = null;
    buf.entries();
    return false;
  } catch (e) {
    return e.message.includes('Cannot read') || e.message.includes('null');
  }
});

test('迭代器在 Buffer 为 undefined 时抛出错误', () => {
  try {
    const buf = undefined;
    buf.entries();
    return false;
  } catch (e) {
    return true;
  }
});

// ==================== 迭代器与原型链 ====================
test('entries 方法在 Buffer.prototype 上', () => {
  return typeof Buffer.prototype.entries === 'function';
});

test('entries 方法可以被 call 调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = Buffer.prototype.entries.call(buf);
  return typeof iter.next === 'function';
});

test('entries 方法可以被 apply 调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = Buffer.prototype.entries.apply(buf, []);
  return typeof iter.next === 'function';
});

test('entries 方法可以被 bind 绑定', () => {
  const buf = Buffer.from([1, 2, 3]);
  const boundEntries = Buffer.prototype.entries.bind(buf);
  const iter = boundEntries();
  return typeof iter.next === 'function';
});

// ==================== 迭代器与 Symbol ====================
test('迭代器有 Symbol.iterator 属性', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  return Symbol.iterator in iter;
});

test('Symbol.iterator 返回自身', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  return iter[Symbol.iterator]() === iter;
});

test('迭代器可以用 Symbol.iterator 显式调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const iter2 = iter[Symbol.iterator]();
  const r1 = iter2.next();
  return r1.value[0] === 0 && r1.value[1] === 1;
});

// ==================== 结果汇总 ====================
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

