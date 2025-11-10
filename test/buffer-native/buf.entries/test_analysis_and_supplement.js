// buf.entries() - 全面分析并补充遗漏场景测试
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

// ==================== 基础功能完整性验证 ====================
test('entries() 方法存在于 Buffer 原型链', () => {
  const buf = Buffer.from([1, 2, 3]);
  return typeof buf.entries === 'function';
});

test('entries() 返回迭代器对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return typeof iter === 'object' && iter !== null && typeof iter.next === 'function';
});

test('entries() 返回的迭代器是可迭代对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return typeof iter[Symbol.iterator] === 'function';
});

test('迭代器的 Symbol.iterator 返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return iter[Symbol.iterator]() === iter;
});

// ==================== 迭代结果格式验证 ====================
test('next() 返回 { value, done } 格式', () => {
  const buf = Buffer.from([42]);
  const iter = buf.entries();
  const result = iter.next();
  return typeof result === 'object' && 
         result.hasOwnProperty('value') && 
         result.hasOwnProperty('done');
});

test('next() 的 value 是数组 [index, byte]', () => {
  const buf = Buffer.from([42]);
  const iter = buf.entries();
  const result = iter.next();
  return Array.isArray(result.value) && 
         result.value.length === 2 &&
         typeof result.value[0] === 'number' &&
         typeof result.value[1] === 'number';
});

test('索引从 0 开始连续递增', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const entries = Array.from(buf.entries());
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][0] !== i) return false;
  }
  return true;
});

test('字节值范围在 0-255', () => {
  const buf = Buffer.from([0, 127, 128, 255]);
  const entries = Array.from(buf.entries());
  return entries.every(([idx, val]) => val >= 0 && val <= 255 && Number.isInteger(val));
});

// ==================== 边界和极端情况 ====================
test('空 Buffer 立即返回 done', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.entries();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

test('单字节 Buffer', () => {
  const buf = Buffer.from([123]);
  const entries = Array.from(buf.entries());
  return entries.length === 1 && 
         entries[0][0] === 0 && 
         entries[0][1] === 123;
});

test('两字节 Buffer', () => {
  const buf = Buffer.from([10, 20]);
  const entries = Array.from(buf.entries());
  return entries.length === 2 && 
         entries[0][0] === 0 && entries[0][1] === 10 &&
         entries[1][0] === 1 && entries[1][1] === 20;
});

test('包含全 0 的 Buffer', () => {
  const buf = Buffer.alloc(5, 0);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && 
         entries.every(([idx, val]) => val === 0);
});

test('包含全 255 的 Buffer', () => {
  const buf = Buffer.alloc(5, 255);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && 
         entries.every(([idx, val]) => val === 255);
});

test('包含所有字节值 0-255', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  const entries = Array.from(buf.entries());
  return entries.length === 256 && 
         entries.every(([idx, val]) => idx === val);
});

test('大尺寸 Buffer (10KB)', () => {
  const size = 10240;
  const buf = Buffer.alloc(size);
  let count = 0;
  for (const [idx, val] of buf.entries()) {
    count++;
  }
  return count === size;
});

// ==================== 不同创建方式的 Buffer ====================
test('Buffer.from(array)', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[2][1] === 3;
});

test('Buffer.from(string, utf8)', () => {
  const buf = Buffer.from('hello', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 5 && 
         entries[0][1] === 104 && // 'h'
         entries[4][1] === 111;   // 'o'
});

test('Buffer.from(string, hex)', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[0][1] === 0x48;
});

test('Buffer.from(string, base64)', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello"
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[0][1] === 72;
});

test('Buffer.from(string, latin1)', () => {
  const buf = Buffer.from('café', 'latin1');
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[3][1] === 233; // é
});

test('Buffer.from(string, ascii)', () => {
  const buf = Buffer.from('ABC', 'ascii');
  const entries = Array.from(buf.entries());
  return entries.length === 3 && 
         entries[0][1] === 65 && 
         entries[1][1] === 66 && 
         entries[2][1] === 67;
});

test('Buffer.from(buffer)', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);
  const entries = Array.from(buf2.entries());
  return entries.length === 3 && entries[1][1] === 2;
});

test('Buffer.from(arrayBuffer)', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view[0] = 10;
  view[1] = 20;
  view[2] = 30;
  view[3] = 40;
  view[4] = 50;
  const buf = Buffer.from(ab);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[2][1] === 30;
});

test('Buffer.from(uint8Array)', () => {
  const arr = new Uint8Array([5, 10, 15, 20]);
  const buf = Buffer.from(arr);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[1][1] === 10;
});

test('Buffer.alloc(size)', () => {
  const buf = Buffer.alloc(3);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && 
         entries.every(([idx, val]) => val === 0);
});

test('Buffer.alloc(size, fill)', () => {
  const buf = Buffer.alloc(4, 42);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && 
         entries.every(([idx, val]) => val === 42);
});

test('Buffer.allocUnsafe(size)', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(99);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && 
         entries.every(([idx, val]) => val === 99);
});

test('Buffer.concat()', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf3 = Buffer.from([5, 6]);
  const buf = Buffer.concat([buf1, buf2, buf3]);
  const entries = Array.from(buf.entries());
  return entries.length === 6 && 
         entries[0][1] === 1 && 
         entries[5][1] === 6;
});

// ==================== slice 和 subarray ====================
test('slice() 创建的 Buffer 索引从 0 开始', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(1, 4);
  const entries = Array.from(sliced.entries());
  return entries.length === 3 && 
         entries[0][0] === 0 && entries[0][1] === 20 &&
         entries[2][0] === 2 && entries[2][1] === 40;
});

test('subarray() 创建的 Buffer 索引从 0 开始', () => {
  const buf = Buffer.from([5, 10, 15, 20, 25]);
  const sub = buf.subarray(2, 4);
  const entries = Array.from(sub.entries());
  return entries.length === 2 && 
         entries[0][0] === 0 && entries[0][1] === 15 &&
         entries[1][0] === 1 && entries[1][1] === 20;
});

test('slice 后修改原 Buffer 会反映在 entries 中', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  buf[2] = 99;
  const entries = Array.from(sliced.entries());
  return entries[1][1] === 99;
});

test('subarray 后修改原 Buffer 会反映在 entries 中', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const sub = buf.subarray(1, 3);
  buf[2] = 88;
  const entries = Array.from(sub.entries());
  return entries[1][1] === 88;
});

test('slice 负索引', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(-3, -1);
  const entries = Array.from(sliced.entries());
  return entries.length === 2 && 
         entries[0][1] === 3 && 
         entries[1][1] === 4;
});

test('subarray 负索引', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(-2);
  const entries = Array.from(sub.entries());
  return entries.length === 2 && 
         entries[0][1] === 40 && 
         entries[1][1] === 50;
});

// ==================== 迭代器使用方式 ====================
test('for...of 循环', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = [];
  for (const [index, value] of buf.entries()) {
    result.push([index, value]);
  }
  return result.length === 5 && 
         result[0][0] === 0 && result[0][1] === 1 &&
         result[4][0] === 4 && result[4][1] === 5;
});

test('Array.from()', () => {
  const buf = Buffer.from([10, 20, 30]);
  const arr = Array.from(buf.entries());
  return arr.length === 3 && 
         arr[1][0] === 1 && arr[1][1] === 20;
});

test('展开运算符 [...]', () => {
  const buf = Buffer.from([5, 10, 15]);
  const arr = [...buf.entries()];
  return arr.length === 3 && 
         arr[2][0] === 2 && arr[2][1] === 15;
});

test('解构赋值', () => {
  const buf = Buffer.from([100, 200, 50]);
  const [[i0, v0], [i1, v1], [i2, v2]] = buf.entries();
  return i0 === 0 && v0 === 100 &&
         i1 === 1 && v1 === 200 &&
         i2 === 2 && v2 === 50;
});

test('解构赋值部分元素', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const [[i0, v0], [i1, v1], ...rest] = buf.entries();
  return i0 === 0 && v0 === 1 &&
         i1 === 1 && v1 === 2 &&
         rest.length === 3;
});

test('Map 构造函数', () => {
  const buf = Buffer.from([10, 20, 30]);
  const map = new Map(buf.entries());
  return map.size === 3 && 
         map.get(0) === 10 && 
         map.get(1) === 20 && 
         map.get(2) === 30;
});

test('Object.fromEntries()', () => {
  const buf = Buffer.from([5, 10, 15]);
  const obj = Object.fromEntries(buf.entries());
  return obj[0] === 5 && obj[1] === 10 && obj[2] === 15;
});

// ==================== 手动迭代 ====================
test('手动调用 next() 直到完成', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  const r1 = iter.next();
  const r2 = iter.next();
  const r3 = iter.next();
  return !r1.done && r1.value[0] === 0 && r1.value[1] === 1 &&
         !r2.done && r2.value[0] === 1 && r2.value[1] === 2 &&
         r3.done && r3.value === undefined;
});

test('迭代完成后继续调用 next() 保持 done=true', () => {
  const buf = Buffer.from([1]);
  const iter = buf.entries();
  iter.next(); // 消费唯一元素
  const r1 = iter.next();
  const r2 = iter.next();
  const r3 = iter.next();
  return r1.done && r2.done && r3.done;
});

test('部分迭代后停止', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  iter.next();
  iter.next();
  const third = iter.next();
  return third.value[0] === 2 && third.value[1] === 3 && !third.done;
});

// ==================== 多个迭代器独立性 ====================
test('多次调用 entries() 返回独立迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.entries();
  const iter2 = buf.entries();
  iter1.next();
  iter1.next();
  const r1 = iter1.next();
  const r2 = iter2.next();
  return r1.value[0] === 2 && r1.value[1] === 3 &&
         r2.value[0] === 0 && r2.value[1] === 1;
});

test('并发迭代同一个 Buffer', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter1 = buf.entries();
  const iter2 = buf.entries();
  const r1_1 = iter1.next();
  const r2_1 = iter2.next();
  const r1_2 = iter1.next();
  const r2_2 = iter2.next();
  return r1_1.value[0] === 0 && r1_1.value[1] === 10 &&
         r2_1.value[0] === 0 && r2_1.value[1] === 10 &&
         r1_2.value[0] === 1 && r1_2.value[1] === 20 &&
         r2_2.value[0] === 1 && r2_2.value[1] === 20;
});

// ==================== Buffer 修改后的迭代器行为 ====================
test('迭代前修改 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf[1] = 99;
  const entries = Array.from(buf.entries());
  return entries[1][1] === 99;
});

test('迭代过程中修改 Buffer（实时读取）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  iter.next(); // [0, 1]
  buf[1] = 99;
  buf[2] = 88;
  const r2 = iter.next(); // [1, 99]
  const r3 = iter.next(); // [2, 88]
  return r2.value[1] === 99 && r3.value[1] === 88;
});

test('迭代过程中 fill Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  iter.next();
  buf.fill(42);
  const entries = Array.from(iter);
  return entries.every(([idx, val]) => val === 42);
});

test('迭代过程中 write Buffer', () => {
  const buf = Buffer.alloc(10);
  const iter = buf.entries();
  buf.write('hello', 0, 'utf8');
  const entries = Array.from(iter);
  return entries[0][1] === 104 && entries[4][1] === 111;
});

// ==================== 与其他 Buffer 迭代方法的对比 ====================
test('entries() 与 keys() 的索引一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entriesIndices = Array.from(buf.entries()).map(([idx]) => idx);
  const keys = Array.from(buf.keys());
  return JSON.stringify(entriesIndices) === JSON.stringify(keys);
});

test('entries() 与 values() 的值一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entriesValues = Array.from(buf.entries()).map(([, val]) => val);
  const values = Array.from(buf.values());
  return JSON.stringify(entriesValues) === JSON.stringify(values);
});

test('entries() 与 Symbol.iterator 的值一致', () => {
  const buf = Buffer.from([5, 10, 15]);
  const entriesValues = Array.from(buf.entries()).map(([, val]) => val);
  const iterValues = Array.from(buf[Symbol.iterator]());
  return JSON.stringify(entriesValues) === JSON.stringify(iterValues);
});

// ==================== 特殊字符和编码 ====================
test('UTF-8 多字节字符 (中文)', () => {
  const buf = Buffer.from('你好', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 6; // 中文每个字符 3 字节
});

test('UTF-8 多字节字符 (emoji)', () => {
  const buf = Buffer.from('😀', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 4; // emoji 4 字节
});

test('UTF-16LE 编码', () => {
  const buf = Buffer.from('AB', 'utf16le');
  const entries = Array.from(buf.entries());
  return entries.length === 4; // 每个字符 2 字节
});

test('UCS-2 编码', () => {
  const buf = Buffer.from('中', 'ucs2');
  const entries = Array.from(buf.entries());
  return entries.length === 2;
});

test('Binary 编码', () => {
  const buf = Buffer.from('hello', 'binary');
  const entries = Array.from(buf.entries());
  return entries.length === 5;
});

// ==================== 循环控制 ====================
test('for...of 循环可以 break', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let count = 0;
  for (const [idx, val] of buf.entries()) {
    count++;
    if (val === 3) break;
  }
  return count === 3;
});

test('for...of 循环可以 continue', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let sum = 0;
  for (const [idx, val] of buf.entries()) {
    if (val % 2 === 0) continue;
    sum += val;
  }
  return sum === 9; // 1 + 3 + 5
});

test('for...of 循环可以 return', () => {
  function testReturn() {
    const buf = Buffer.from([1, 2, 3, 4]);
    for (const [idx, val] of buf.entries()) {
      if (val === 3) return val;
    }
    return 0;
  }
  return testReturn() === 3;
});

// ==================== 迭代器在不同作用域 ====================
test('迭代器可以作为函数参数传递', () => {
  function consumeIterator(iter) {
    return Array.from(iter).length;
  }
  const buf = Buffer.from([1, 2, 3]);
  return consumeIterator(buf.entries()) === 3;
});

test('迭代器在闭包中保持状态', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  function getNext() {
    return iter.next();
  }
  const r1 = getNext();
  const r2 = getNext();
  return r1.value[0] === 0 && r2.value[0] === 1;
});

test('迭代器在箭头函数中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const process = (iter) => Array.from(iter).length;
  return process(buf.entries()) === 3;
});

// ==================== 错误和异常处理 ====================
test('在非 Buffer 对象上调用 entries 抛出错误', () => {
  try {
    const notBuffer = { length: 3, 0: 1, 1: 2, 2: 3 };
    const entriesFunc = Buffer.prototype.entries;
    entriesFunc.call(notBuffer);
    return false;
  } catch (e) {
    return true; // 应该抛出错误
  }
});

test('迭代器在 try-catch 中正常工作', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const entries = Array.from(buf.entries());
    return entries.length === 3;
  } catch (e) {
    return false;
  }
});

// ==================== 补充：遗漏场景 ====================

// 测试迭代器不支持的方法
test('迭代器没有 return 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return typeof iter.return === 'undefined';
});

test('迭代器没有 throw 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return typeof iter.throw === 'undefined';
});

// 测试迭代器不是数组
test('迭代器不是数组类型', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  return !Array.isArray(iter);
});

// 测试迭代器不能被重用
test('迭代器消费完后不能重置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  Array.from(iter); // 消费完
  const result = iter.next();
  return result.done === true;
});

// 测试 yield* 语法
test('迭代器可以用 yield* 展开', () => {
  function* gen() {
    const buf = Buffer.from([1, 2, 3]);
    yield* buf.entries();
  }
  const g = gen();
  const r1 = g.next();
  return r1.value[0] === 0 && r1.value[1] === 1;
});

// 测试 Array.from 的映射函数
test('Array.from 带映射函数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sum = Array.from(buf.entries(), ([idx, val]) => idx + val);
  return sum.length === 3 && sum[0] === 1 && sum[1] === 3 && sum[2] === 5;
});

// 测试迭代器与 reduce
test('迭代器结果可以 reduce', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sum = Array.from(buf.entries()).reduce((acc, [idx, val]) => acc + val, 0);
  return sum === 15;
});

// 测试迭代器与 filter
test('迭代器结果可以 filter', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const evens = Array.from(buf.entries())
    .filter(([idx, val]) => val % 2 === 0)
    .map(([idx, val]) => val);
  return evens.length === 3 && evens[0] === 2 && evens[1] === 4 && evens[2] === 6;
});

// 测试迭代器与 find
test('迭代器结果可以 find', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const found = Array.from(buf.entries()).find(([idx, val]) => val === 30);
  return found[0] === 2 && found[1] === 30;
});

// 测试迭代器与 some
test('迭代器结果可以 some', () => {
  const buf = Buffer.from([1, 3, 5, 7]);
  const hasEven = Array.from(buf.entries()).some(([idx, val]) => val % 2 === 0);
  return hasEven === false;
});

// 测试迭代器与 every
test('迭代器结果可以 every', () => {
  const buf = Buffer.from([2, 4, 6, 8]);
  const allEven = Array.from(buf.entries()).every(([idx, val]) => val % 2 === 0);
  return allEven === true;
});

// 测试嵌套迭代
test('嵌套迭代同一个 Buffer', () => {
  const buf = Buffer.from([1, 2]);
  const results = [];
  for (const [i1, v1] of buf.entries()) {
    for (const [i2, v2] of buf.entries()) {
      results.push([i1, v1, i2, v2]);
    }
  }
  return results.length === 4 && results[0][0] === 0 && results[3][2] === 1;
});

// 测试迭代器与 JSON
test('迭代器转数组后可以 JSON 序列化', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Array.from(buf.entries());
  const json = JSON.stringify(arr);
  const parsed = JSON.parse(json);
  return parsed.length === 3 && parsed[0][0] === 0 && parsed[0][1] === 1;
});

// 测试与 Buffer 其他方法的交互
test('entries() 与 indexOf 配合', () => {
  const buf = Buffer.from([10, 20, 30, 20, 40]);
  const entries = Array.from(buf.entries());
  const index = buf.indexOf(20);
  const entryIndex = entries.findIndex(([idx, val]) => val === 20);
  return index === entryIndex;
});

test('entries() 与 lastIndexOf 配合', () => {
  const buf = Buffer.from([10, 20, 30, 20, 40]);
  const entries = Array.from(buf.entries());
  const lastIndex = buf.lastIndexOf(20);
  const entryLastIndex = entries.map(([idx, val]) => val === 20 ? idx : -1)
    .filter(idx => idx !== -1).pop();
  return lastIndex === entryLastIndex;
});

test('entries() 与 includes 配合', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Array.from(buf.entries());
  const includes = buf.includes(20);
  const entryIncludes = entries.some(([idx, val]) => val === 20);
  return includes === entryIncludes;
});

test('entries() 与 equals 配合', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const equals = buf1.equals(buf2);
  const entriesMatch = JSON.stringify(entries1) === JSON.stringify(entries2);
  return equals && entriesMatch;
});

test('entries() 与 compare 配合', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);
  const compare = buf1.compare(buf2);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  return compare < 0 && entries1[2][1] < entries2[2][1];
});

test('entries() 与 toJSON 配合', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Array.from(buf.entries());
  const json = buf.toJSON();
  return entries.length === json.data.length &&
         entries.every(([idx, val]) => val === json.data[idx]);
});

test('entries() 与 toString 配合 (hex)', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  const entries = Array.from(buf.entries());
  const hex = buf.toString('hex');
  return entries[0][1] === 0x41 && hex === '414243';
});

test('entries() 与 toString 配合 (base64)', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  const entries = Array.from(buf.entries());
  const base64 = buf.toString('base64');
  return entries.length === 5 && base64 === 'SGVsbG8=';
});

// ==================== 补充：ArrayBuffer 相关测试 ====================
test('Buffer.buffer 属性存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer.byteOffset 属性', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i * 10;
  }
  const buf = Buffer.from(ab, 3, 4);
  const entries = Array.from(buf.entries());
  return buf.byteOffset === 3 && entries.length === 4;
});

test('Buffer.byteLength 与 entries 长度一致', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const entries = Array.from(buf.entries());
  return buf.byteLength === entries.length;
});

// ==================== 补充：类型检查 ====================
test('Buffer.isBuffer 返回 true', () => {
  const buf = Buffer.from([1, 2, 3]);
  return Buffer.isBuffer(buf);
});

test('ArrayBuffer.isView 返回 true', () => {
  const buf = Buffer.from([1, 2, 3]);
  return ArrayBuffer.isView(buf);
});

test('Buffer Symbol.toStringTag 为 Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[Symbol.toStringTag] === 'Uint8Array';
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
    tests: tests,
    message: failed === 0 ? 
      '✅ 所有测试通过！buf.entries() 测试覆盖全面' :
      '❌ 存在失败的测试，请检查详情'
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

