// buf.entries() - 完整无死角测试
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

// ==================== 基本功能测试 ====================
test('entries() 返回迭代器对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return typeof iter === 'object' && typeof iter.next === 'function';
});

test('entries() 返回的迭代器有 Symbol.iterator 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return typeof iter[Symbol.iterator] === 'function';
});

test('迭代器的 Symbol.iterator 返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return iter[Symbol.iterator]() === iter;
});

test('next() 返回正确格式的结果对象', () => {
  const buf = Buffer.from([10]);
  const iter = buf.entries();
  const result = iter.next();
  return result.hasOwnProperty('value') && result.hasOwnProperty('done');
});

test('next() value 是包含 [index, byte] 的数组', () => {
  const buf = Buffer.from([42]);
  const iter = buf.entries();
  const result = iter.next();
  return Array.isArray(result.value) && result.value.length === 2;
});

test('迭代返回正确的索引和值', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.entries();
  const first = iter.next();
  return first.value[0] === 0 && first.value[1] === 10 && first.done === false;
});

test('迭代完成后 done 为 true', () => {
  const buf = Buffer.from([1]);
  const iter = buf.entries();
  iter.next(); // 消费唯一元素
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

test('迭代完成后继续调用 next 保持 done 为 true', () => {
  const buf = Buffer.from([1]);
  const iter = buf.entries();
  iter.next();
  iter.next();
  const result = iter.next();
  return result.done === true;
});

// ==================== 完整迭代测试 ====================
test('完整迭代所有元素', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const results = [];
  for (const [index, value] of buf.entries()) {
    results.push([index, value]);
  }
  return results.length === 5 && 
         results[0][0] === 0 && results[0][1] === 10 &&
         results[4][0] === 4 && results[4][1] === 50;
});

test('Array.from() 将迭代器转换为数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Array.from(buf.entries());
  return arr.length === 3 && 
         arr[0][0] === 0 && arr[0][1] === 1 &&
         arr[2][0] === 2 && arr[2][1] === 3;
});

test('扩展运算符 [...iterator] 工作正常', () => {
  const buf = Buffer.from([5, 10, 15]);
  const arr = [...buf.entries()];
  return arr.length === 3 && arr[1][0] === 1 && arr[1][1] === 10;
});

test('for...of 循环正确迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  let count = 0;
  let sumIndex = 0;
  let sumValue = 0;
  for (const [index, value] of buf.entries()) {
    count++;
    sumIndex += index;
    sumValue += value;
  }
  return count === 3 && sumIndex === 3 && sumValue === 6;
});

// ==================== 边界情况测试 ====================
test('空 Buffer 返回空迭代器', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.entries();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

test('空 Buffer 的 for...of 不执行', () => {
  const buf = Buffer.alloc(0);
  let executed = false;
  for (const entry of buf.entries()) {
    executed = true;
  }
  return !executed;
});

test('单字节 Buffer', () => {
  const buf = Buffer.from([99]);
  const entries = Array.from(buf.entries());
  return entries.length === 1 && entries[0][0] === 0 && entries[0][1] === 99;
});

test('大尺寸 Buffer (1000 字节)', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i++) {
    buf[i] = i % 256;
  }
  const entries = Array.from(buf.entries());
  return entries.length === 1000 && 
         entries[0][0] === 0 && entries[0][1] === 0 &&
         entries[999][0] === 999 && entries[999][1] === 231;
});

test('包含 0 值的 Buffer', () => {
  const buf = Buffer.from([0, 0, 0]);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && 
         entries[0][1] === 0 && 
         entries[1][1] === 0 && 
         entries[2][1] === 0;
});

test('包含 255 (最大值) 的 Buffer', () => {
  const buf = Buffer.from([255, 255]);
  const entries = Array.from(buf.entries());
  return entries[0][1] === 255 && entries[1][1] === 255;
});

test('包含所有可能字节值 (0-255)', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  const entries = Array.from(buf.entries());
  return entries.length === 256 && 
         entries[0][1] === 0 && 
         entries[127][1] === 127 && 
         entries[255][1] === 255;
});

// ==================== 解构和高级用法 ====================
test('解构赋值获取前几个元素', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const [[i0, v0], [i1, v1]] = buf.entries();
  return i0 === 0 && v0 === 10 && i1 === 1 && v1 === 20;
});

test('部分迭代后停止', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  iter.next(); // 消费第一个
  iter.next(); // 消费第二个
  const third = iter.next();
  return third.value[0] === 2 && third.value[1] === 3 && third.done === false;
});

test('多次调用 entries() 返回独立迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.entries();
  const iter2 = buf.entries();
  iter1.next();
  iter1.next();
  const result1 = iter1.next();
  const result2 = iter2.next();
  return result1.value[0] === 2 && result2.value[0] === 0;
});

// ==================== 类型和值范围测试 ====================
test('索引是数字类型', () => {
  const buf = Buffer.from([1, 2]);
  const [[idx]] = buf.entries();
  return typeof idx === 'number';
});

test('值是数字类型', () => {
  const buf = Buffer.from([1, 2]);
  const [[, val]] = buf.entries();
  return typeof val === 'number';
});

test('值在 0-255 范围内', () => {
  const buf = Buffer.from([0, 128, 255]);
  const entries = Array.from(buf.entries());
  return entries.every(([, val]) => val >= 0 && val <= 255);
});

test('索引从 0 开始递增', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Array.from(buf.entries());
  return entries[0][0] === 0 && entries[1][0] === 1 && entries[2][0] === 2;
});

// ==================== 不同创建方式的 Buffer ====================
test('Buffer.alloc() 创建的 Buffer', () => {
  const buf = Buffer.alloc(3, 7);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries.every(([, val]) => val === 7);
});

test('Buffer.allocUnsafe() 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(42);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries.every(([, val]) => val === 42);
});

test('Buffer.from(array) 创建的 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const entries = Array.from(buf.entries());
  return entries.length === 3;
});

test('Buffer.from(string) 创建的 Buffer', () => {
  const buf = Buffer.from('abc', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[0][1] === 97; // 'a' = 97
});

test('Buffer.from(buffer) 创建的 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);
  const entries = Array.from(buf2.entries());
  return entries.length === 3 && entries[1][1] === 2;
});

// ==================== 修改 Buffer 后的行为 ====================
test('迭代前修改 Buffer 反映在迭代中', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf[1] = 99;
  const entries = Array.from(buf.entries());
  return entries[1][1] === 99;
});

test('迭代过程中修改 Buffer (Node.js 行为)', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  iter.next(); // [0, 1]
  buf[2] = 99; // 修改第3个元素
  iter.next(); // [1, 2]
  const third = iter.next(); // [2, ?]
  // 注意: Node.js 中迭代器会读取当前值
  return third.value[0] === 2 && third.value[1] === 99;
});

// ==================== 特殊场景 ====================
test('包含 UTF-8 编码字符的 Buffer', () => {
  const buf = Buffer.from('你好', 'utf8'); // 中文占 3 字节
  const entries = Array.from(buf.entries());
  return entries.length === 6; // '你好' = 6 bytes in UTF-8
});

test('包含 Base64 解码数据的 Buffer', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello"
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[0][1] === 72; // 'H'
});

test('包含 Hex 编码数据的 Buffer', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[0][1] === 0x48;
});

// ==================== slice 和 subarray 的迭代器 ====================
test('slice() 创建的 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const entries = Array.from(sliced.entries());
  return entries.length === 3 && entries[0][1] === 2;
});

test('subarray() 创建的 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2, 4);
  const entries = Array.from(sub.entries());
  return entries.length === 2 && entries[0][0] === 0 && entries[0][1] === 3;
});

// ==================== 性能和内存测试 ====================
test('大量连续迭代不崩溃', () => {
  const buf = Buffer.alloc(1000);
  let count = 0;
  for (let i = 0; i < 100; i++) {
    for (const [index] of buf.entries()) {
      count++;
    }
  }
  return count === 100000;
});

// ==================== 迭代器协议完整性 ====================
test('手动调用 next() 多次直到完成', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  const r1 = iter.next();
  const r2 = iter.next();
  const r3 = iter.next();
  return !r1.done && !r2.done && r3.done;
});

test('迭代器不可重用（迭代完成后不重置）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  Array.from(iter); // 消费完
  const result = iter.next();
  return result.done === true;
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

