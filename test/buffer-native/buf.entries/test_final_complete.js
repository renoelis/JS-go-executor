// buf.entries() - 最终完整测试（不使用禁用词）
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

// ==================== 核心功能覆盖 ====================

// 1. 基础迭代器协议
test('entries() 返回符合迭代器协议的对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return typeof iter.next === 'function' && 
         typeof iter[Symbol.iterator] === 'function';
});

test('迭代器 Symbol.iterator 返回自身（可迭代协议）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return iter[Symbol.iterator]() === iter;
});

// 2. 迭代结果格式
test('next() 返回正确的迭代器结果格式', () => {
  const buf = Buffer.from([42]);
  const iter = buf.entries();
  const result = iter.next();
  return result.hasOwnProperty('value') && 
         result.hasOwnProperty('done') &&
         Array.isArray(result.value) &&
         result.value.length === 2;
});

test('迭代返回 [index, byte] 格式', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Array.from(buf.entries());
  return entries[0][0] === 0 && entries[0][1] === 10 &&
         entries[1][0] === 1 && entries[1][1] === 20 &&
         entries[2][0] === 2 && entries[2][1] === 30;
});

// 3. 完整迭代行为
test('完整迭代直到 done', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  const r1 = iter.next();
  const r2 = iter.next();
  const r3 = iter.next();
  return !r1.done && r1.value[1] === 1 &&
         !r2.done && r2.value[1] === 2 &&
         r3.done && r3.value === undefined;
});

test('迭代完成后继续调用 next() 保持 done 状态', () => {
  const buf = Buffer.from([1]);
  const iter = buf.entries();
  iter.next();
  const r1 = iter.next();
  const r2 = iter.next();
  return r1.done && r2.done;
});

// ==================== 边界情况 ====================

test('空 Buffer 立即返回 done', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.entries();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

test('单字节 Buffer', () => {
  const buf = Buffer.from([255]);
  const entries = Array.from(buf.entries());
  return entries.length === 1 && 
         entries[0][0] === 0 && 
         entries[0][1] === 255;
});

test('包含所有可能字节值 0-255', () => {
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

test('大尺寸 Buffer (10KB)', () => {
  const size = 10240;
  const buf = Buffer.alloc(size);
  let count = 0;
  for (const [idx, val] of buf.entries()) {
    count++;
    if (idx !== count - 1) return false;
  }
  return count === size;
});

// ==================== 不同 Buffer 创建方式 ====================

test('Buffer.from(array)', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[2][1] === 3;
});

test('Buffer.from(string, utf8)', () => {
  const buf = Buffer.from('hello', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[0][1] === 104; // 'h'
});

test('Buffer.from(string, hex)', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[0][1] === 0x48;
});

test('Buffer.from(string, base64)', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64');
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[0][1] === 72;
});

test('Buffer.from(string, latin1)', () => {
  const buf = Buffer.from('café', 'latin1');
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[3][1] === 233;
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
  for (let i = 0; i < 5; i++) {
    view[i] = (i + 1) * 10;
  }
  const buf = Buffer.from(ab);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[2][1] === 30;
});

test('Buffer.from(Uint8Array)', () => {
  const arr = new Uint8Array([5, 10, 15, 20]);
  const buf = Buffer.from(arr);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[1][1] === 10;
});

test('Buffer.alloc(size)', () => {
  const buf = Buffer.alloc(3);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries.every(([, v]) => v === 0);
});

test('Buffer.alloc(size, fill)', () => {
  const buf = Buffer.alloc(4, 42);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries.every(([, v]) => v === 42);
});

test('Buffer.allocUnsafe(size)', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(99);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries.every(([, v]) => v === 99);
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

test('slice() 后索引从 0 重新开始', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(1, 4);
  const entries = Array.from(sliced.entries());
  return entries.length === 3 && 
         entries[0][0] === 0 && entries[0][1] === 20 &&
         entries[2][0] === 2 && entries[2][1] === 40;
});

test('subarray() 后索引从 0 重新开始', () => {
  const buf = Buffer.from([5, 10, 15, 20, 25]);
  const sub = buf.subarray(2, 4);
  const entries = Array.from(sub.entries());
  return entries.length === 2 && 
         entries[0][0] === 0 && entries[0][1] === 15;
});

test('slice 后修改原 Buffer 会影响迭代结果', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  buf[2] = 99;
  const entries = Array.from(sliced.entries());
  return entries[1][1] === 99;
});

test('subarray 后修改原 Buffer 会影响迭代结果', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const sub = buf.subarray(1, 3);
  buf[2] = 88;
  const entries = Array.from(sub.entries());
  return entries[1][1] === 88;
});

test('slice 支持负索引', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(-3, -1);
  const entries = Array.from(sliced.entries());
  return entries.length === 2 && 
         entries[0][1] === 3 && 
         entries[1][1] === 4;
});

test('subarray 支持负索引', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(-2);
  const entries = Array.from(sub.entries());
  return entries.length === 2 && 
         entries[0][1] === 40 && 
         entries[1][1] === 50;
});

// ==================== 迭代器使用方式 ====================

test('for...of 循环遍历', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = [];
  for (const [index, value] of buf.entries()) {
    result.push([index, value]);
  }
  return result.length === 5 && 
         result[0][0] === 0 && result[0][1] === 1 &&
         result[4][0] === 4 && result[4][1] === 5;
});

test('Array.from() 转换', () => {
  const buf = Buffer.from([10, 20, 30]);
  const arr = Array.from(buf.entries());
  return arr.length === 3 && arr[1][0] === 1 && arr[1][1] === 20;
});

test('展开运算符 [...]', () => {
  const buf = Buffer.from([5, 10, 15]);
  const arr = [...buf.entries()];
  return arr.length === 3 && arr[2][0] === 2 && arr[2][1] === 15;
});

test('解构赋值', () => {
  const buf = Buffer.from([100, 200, 50]);
  const [[i0, v0], [i1, v1], [i2, v2]] = buf.entries();
  return i0 === 0 && v0 === 100 &&
         i1 === 1 && v1 === 200 &&
         i2 === 2 && v2 === 50;
});

test('解构赋值 rest 参数', () => {
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

test('并发迭代同一个 Buffer 互不影响', () => {
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

// ==================== Buffer 动态修改 ====================

test('迭代前修改 Buffer 值', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf[1] = 99;
  const entries = Array.from(buf.entries());
  return entries[1][1] === 99;
});

test('迭代过程中修改 Buffer 值（实时读取）', () => {
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
  const remaining = Array.from(iter);
  return remaining.every(([, v]) => v === 42);
});

test('迭代过程中 write Buffer', () => {
  const buf = Buffer.alloc(10);
  const iter = buf.entries();
  buf.write('hello', 0, 'utf8');
  const entries = Array.from(iter);
  return entries[0][1] === 104 && entries[4][1] === 111;
});

// ==================== 与其他 Buffer 迭代方法对比 ====================

test('entries() 索引与 keys() 一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entriesIndices = Array.from(buf.entries()).map(([idx]) => idx);
  const keys = Array.from(buf.keys());
  return JSON.stringify(entriesIndices) === JSON.stringify(keys);
});

test('entries() 值与 values() 一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entriesValues = Array.from(buf.entries()).map(([, val]) => val);
  const values = Array.from(buf.values());
  return JSON.stringify(entriesValues) === JSON.stringify(values);
});

test('entries() 值与 Symbol.iterator 一致', () => {
  const buf = Buffer.from([5, 10, 15]);
  const entriesValues = Array.from(buf.entries()).map(([, val]) => val);
  const iterValues = Array.from(buf[Symbol.iterator]());
  return JSON.stringify(entriesValues) === JSON.stringify(iterValues);
});

// ==================== 特殊编码和字符 ====================

test('UTF-8 多字节字符 (中文)', () => {
  const buf = Buffer.from('你好', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 6; // 每个中文字符 3 字节
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

test('ASCII 编码', () => {
  const buf = Buffer.from('ABC', 'ascii');
  const entries = Array.from(buf.entries());
  return entries.length === 3 && 
         entries[0][1] === 65 && 
         entries[1][1] === 66 && 
         entries[2][1] === 67;
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

// ==================== 错误处理 ====================

test('在非 Buffer 对象上调用 entries 抛出错误', () => {
  try {
    const notBuffer = { length: 3 };
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

// ==================== 迭代器特性 ====================

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

test('迭代器不是数组', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  return !Array.isArray(iter);
});

test('迭代器消费完后不能重置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  Array.from(iter); // 消费完
  const result = iter.next();
  return result.done === true;
});

// ==================== 高级用法 ====================

test('yield* 语法展开迭代器', () => {
  function* gen() {
    const buf = Buffer.from([1, 2, 3]);
    yield* buf.entries();
  }
  const g = gen();
  const r1 = g.next();
  return r1.value[0] === 0 && r1.value[1] === 1;
});

test('Array.from 带映射函数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sum = Array.from(buf.entries(), ([idx, val]) => idx + val);
  return sum.length === 3 && sum[0] === 1 && sum[1] === 3 && sum[2] === 5;
});

test('reduce 计算总和', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sum = Array.from(buf.entries()).reduce((acc, [idx, val]) => acc + val, 0);
  return sum === 15;
});

test('filter 过滤偶数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const evens = Array.from(buf.entries())
    .filter(([idx, val]) => val % 2 === 0)
    .map(([idx, val]) => val);
  return evens.length === 3 && evens[0] === 2 && evens[2] === 6;
});

test('find 查找元素', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const found = Array.from(buf.entries()).find(([idx, val]) => val === 30);
  return found && found[0] === 2 && found[1] === 30;
});

test('some 检查是否存在', () => {
  const buf = Buffer.from([1, 3, 5, 7]);
  const hasEven = Array.from(buf.entries()).some(([idx, val]) => val % 2 === 0);
  return hasEven === false;
});

test('every 检查全部满足', () => {
  const buf = Buffer.from([2, 4, 6, 8]);
  const allEven = Array.from(buf.entries()).every(([idx, val]) => val % 2 === 0);
  return allEven === true;
});

// ==================== 嵌套和组合 ====================

test('嵌套迭代同一个 Buffer', () => {
  const buf = Buffer.from([1, 2]);
  const results = [];
  for (const [i1, v1] of buf.entries()) {
    for (const [i2, v2] of buf.entries()) {
      results.push([i1, v1, i2, v2]);
    }
  }
  return results.length === 4 && 
         results[0][0] === 0 && 
         results[3][2] === 1;
});

test('JSON 序列化迭代结果', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Array.from(buf.entries());
  const json = JSON.stringify(arr);
  const parsed = JSON.parse(json);
  return parsed.length === 3 && 
         parsed[0][0] === 0 && 
         parsed[0][1] === 1;
});

// ==================== 与 Buffer 其他方法交互 ====================

test('entries() 与 indexOf 配合', () => {
  const buf = Buffer.from([10, 20, 30, 20, 40]);
  const entries = Array.from(buf.entries());
  const index = buf.indexOf(20);
  const entryIndex = entries.findIndex(([idx, val]) => val === 20);
  return index === entryIndex;
});

test('entries() 与 lastIndexOf 配合', () => {
  const buf = Buffer.from([10, 20, 30, 20, 40]);
  const lastIndex = buf.lastIndexOf(20);
  const entries = Array.from(buf.entries());
  const entryLastIndex = entries.map(([idx, val]) => val === 20 ? idx : -1)
    .filter(idx => idx !== -1).pop();
  return lastIndex === entryLastIndex;
});

test('entries() 与 includes 配合', () => {
  const buf = Buffer.from([10, 20, 30]);
  const includes = buf.includes(20);
  const entries = Array.from(buf.entries());
  const entryIncludes = entries.some(([idx, val]) => val === 20);
  return includes === entryIncludes;
});

test('entries() 与 equals 配合', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const equals = buf1.equals(buf2);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
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

test('entries() 与 toString(hex) 配合', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  const entries = Array.from(buf.entries());
  const hex = buf.toString('hex');
  return entries[0][1] === 0x41 && 
         entries[1][1] === 0x42 && 
         entries[2][1] === 0x43 && 
         hex === '414243';
});

test('entries() 与 toString(base64) 配合', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  const entries = Array.from(buf.entries());
  const base64 = buf.toString('base64');
  return entries.length === 5 && base64 === 'SGVsbG8=';
});

// ==================== ArrayBuffer 相关 ====================

test('Buffer.buffer 属性存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer.byteOffset 属性正确', () => {
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

// ==================== 类型检查 ====================

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

// ==================== 性能相关场景 ====================

test('超大 Buffer (100KB) 迭代', () => {
  const size = 102400;
  const buf = Buffer.alloc(size);
  let count = 0;
  for (const [idx] of buf.entries()) {
    count++;
    if (count > size) return false;
  }
  return count === size;
});

test('频繁创建迭代器不崩溃', () => {
  const buf = Buffer.from([1, 2, 3]);
  for (let i = 0; i < 1000; i++) {
    const iter = buf.entries();
    Array.from(iter);
  }
  return true;
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
      '✅ 所有测试通过！buf.entries() 在 Node.js v25.0.0 中完全兼容' :
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

