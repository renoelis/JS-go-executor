// buf.entries() - 最终覆盖测试（补充遗漏场景）
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

// ==================== 迭代器与 Buffer 属性关系 ====================
test('迭代器长度等于 Buffer.length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  let count = 0;
  for (const entry of iter) {
    count++;
  }
  return count === buf.length;
});

test('迭代器长度等于 Buffer.byteLength', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.entries();
  const entries = Array.from(iter);
  return entries.length === buf.byteLength;
});

test('从 ArrayBuffer 偏移创建的 Buffer entries 长度等于 byteLength', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i;
  }
  const buf = Buffer.from(ab, 2, 5);
  const entries = Array.from(buf.entries());
  return entries.length === buf.byteLength && buf.byteLength === 5;
});

test('从 ArrayBuffer 偏移创建的 Buffer entries 索引从 0 开始', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i * 10;
  }
  const buf = Buffer.from(ab, 3, 4);
  const entries = Array.from(buf.entries());
  return entries[0][0] === 0 && entries[3][0] === 3;
});

test('从 ArrayBuffer 偏移创建的 Buffer entries 值对应正确位置', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i * 10;
  }
  const buf = Buffer.from(ab, 2, 5);
  const entries = Array.from(buf.entries());
  return entries[0][1] === 20 && entries[4][1] === 60;
});

// ==================== 迭代器与 Buffer.buffer 属性 ====================
test('从 ArrayBuffer 创建的 Buffer entries 反映底层 ArrayBuffer 变化', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i;
  }
  const buf = Buffer.from(ab);
  const iter = buf.entries();
  view[3] = 99;
  const entries = Array.from(iter);
  return entries[3][1] === 99;
});

test('从 ArrayBuffer 偏移创建的 Buffer entries 反映底层 ArrayBuffer 变化', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i;
  }
  const buf = Buffer.from(ab, 2, 5);
  const iter = buf.entries();
  view[3] = 99;
  const entries = Array.from(iter);
  return entries[1][1] === 99;
});

test('Buffer.buffer 属性存在且为 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.buffer instanceof ArrayBuffer;
});

test('从 ArrayBuffer 创建的 Buffer entries 与 buffer 属性关联', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view[0] = 10;
  view[1] = 20;
  view[2] = 30;
  view[3] = 40;
  view[4] = 50;
  const buf = Buffer.from(ab);
  const iter = buf.entries();
  const entries = Array.from(iter);
  const bufView = new Uint8Array(buf.buffer);
  let match = true;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][1] !== bufView[i]) {
      match = false;
      break;
    }
  }
  return match;
});

// ==================== 迭代器与 Buffer.byteOffset 属性 ====================
test('从 ArrayBuffer 偏移创建的 Buffer byteOffset 正确', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i;
  }
  const buf = Buffer.from(ab, 3, 5);
  return buf.byteOffset === 3;
});

test('从 ArrayBuffer 偏移创建的 Buffer entries 值对应 byteOffset 位置', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i * 10;
  }
  const buf = Buffer.from(ab, 2, 5);
  const entries = Array.from(buf.entries());
  const offset = buf.byteOffset;
  return entries[0][1] === view[offset] && entries[4][1] === view[offset + 4];
});

// ==================== 迭代器与 Buffer 类型检查方法 ====================
test('Buffer.isBuffer 返回 true', () => {
  const buf = Buffer.from([1, 2, 3]);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.isBuffer 创建的 Buffer entries 正常工作', () => {
  const buf = Buffer.from([10, 20, 30]);
  if (!Buffer.isBuffer(buf)) {
    return false;
  }
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[1][1] === 20;
});

test('ArrayBuffer.isView 对 Buffer 返回 true', () => {
  const buf = Buffer.from([1, 2, 3]);
  return ArrayBuffer.isView(buf) === true;
});

test('ArrayBuffer.isView 创建的 Buffer entries 正常工作', () => {
  const buf = Buffer.from([5, 10, 15]);
  if (!ArrayBuffer.isView(buf)) {
    return false;
  }
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[2][1] === 15;
});

// ==================== 迭代器与 Buffer 字符串方法 ====================
test('entries 值与 toString hex 编码一致', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  const entries = Array.from(buf.entries());
  const hex = buf.toString('hex');
  return entries[0][1] === 0x41 && entries[1][1] === 0x42 && 
         entries[2][1] === 0x43 && hex === '414243';
});

test('entries 值与 toString base64 编码一致', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  const entries = Array.from(buf.entries());
  const base64 = buf.toString('base64');
  return entries.length === 5 && base64 === 'SGVsbG8=';
});

test('entries 值与 toString utf8 编码一致', () => {
  const buf = Buffer.from('hello', 'utf8');
  const entries = Array.from(buf.entries());
  const str = buf.toString('utf8');
  return entries.length === 5 && str === 'hello';
});

test('entries 值与 toString latin1 编码一致', () => {
  const buf = Buffer.from('café', 'latin1');
  const entries = Array.from(buf.entries());
  const str = buf.toString('latin1');
  return entries.length === 4 && str === 'café';
});

// ==================== 迭代器与 Buffer toJSON 方法 ====================
test('entries 与 toJSON 的数据一致性', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const entries = Array.from(buf.entries());
  const json = buf.toJSON();
  let match = true;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][0] !== i || entries[i][1] !== json.data[i]) {
      match = false;
      break;
    }
  }
  return match;
});

test('entries 与 toJSON 长度一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const entries = Array.from(buf.entries());
  const json = buf.toJSON();
  return entries.length === json.data.length;
});

// ==================== 迭代器与 Buffer equals 方法 ====================
test('entries 比较两个相等的 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const equals = buf1.equals(buf2);
  let entriesMatch = true;
  for (let i = 0; i < entries1.length; i++) {
    if (entries1[i][0] !== entries2[i][0] || entries1[i][1] !== entries2[i][1]) {
      entriesMatch = false;
      break;
    }
  }
  return equals === true && entriesMatch === true;
});

test('entries 比较两个不相等的 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const equals = buf1.equals(buf2);
  return equals === false && entries1[2][1] !== entries2[2][1];
});

// ==================== 迭代器与 Buffer indexOf/lastIndexOf/includes 方法 ====================
test('entries 与 indexOf 查找值一致', () => {
  const buf = Buffer.from([10, 20, 30, 20, 40]);
  const entries = Array.from(buf.entries());
  const index = buf.indexOf(20);
  const entryIndex = entries.findIndex(([, val]) => val === 20);
  return index === entryIndex && index === 1;
});

test('entries 与 lastIndexOf 查找值一致', () => {
  const buf = Buffer.from([10, 20, 30, 20, 40]);
  const entries = Array.from(buf.entries());
  const lastIndex = buf.lastIndexOf(20);
  const entryLastIndex = entries.map(([idx, val]) => val === 20 ? idx : -1)
    .filter(idx => idx !== -1).pop();
  return lastIndex === entryLastIndex && lastIndex === 3;
});

test('entries 与 includes 查找值一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Array.from(buf.entries());
  const includes = buf.includes(20);
  const entryIncludes = entries.some(([, val]) => val === 20);
  return includes === entryIncludes && includes === true;
});

test('entries 与 includes 查找不存在的值一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Array.from(buf.entries());
  const includes = buf.includes(99);
  const entryIncludes = entries.some(([, val]) => val === 99);
  return includes === entryIncludes && includes === false;
});

// ==================== 迭代器与 Buffer compare 方法 ====================
test('entries 与 compare 方法结果一致', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const compare = buf1.compare(buf2);
  let entriesCompare = 0;
  for (let i = 0; i < Math.min(entries1.length, entries2.length); i++) {
    if (entries1[i][1] < entries2[i][1]) {
      entriesCompare = -1;
      break;
    } else if (entries1[i][1] > entries2[i][1]) {
      entriesCompare = 1;
      break;
    }
  }
  if (entriesCompare === 0) {
    entriesCompare = entries1.length - entries2.length;
    if (entriesCompare > 0) entriesCompare = 1;
    else if (entriesCompare < 0) entriesCompare = -1;
  }
  return compare === entriesCompare;
});

// ==================== 迭代器与 Buffer 的 parent 属性（如果有） ====================
test('slice 后的 Buffer entries 索引从 0 开始', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const entries = Array.from(sliced.entries());
  return entries[0][0] === 0 && entries[2][0] === 2;
});

test('subarray 后的 Buffer entries 索引从 0 开始', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const sub = buf.subarray(1, 3);
  const entries = Array.from(sub.entries());
  return entries[0][0] === 0 && entries[1][0] === 1;
});

// ==================== 迭代器与 Buffer 的 offset 属性（如果有） ====================
test('slice 后的 Buffer entries 值对应正确位置', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const entries = Array.from(sliced.entries());
  return entries[0][1] === 2 && entries[2][1] === 4;
});

test('subarray 后的 Buffer entries 值对应正确位置', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const sub = buf.subarray(1, 3);
  const entries = Array.from(sub.entries());
  return entries[0][1] === 20 && entries[1][1] === 30;
});

// ==================== 迭代器与 Buffer 的 transfer 相关（如果支持） ====================
test('迭代器在 Buffer 被复制后仍可用', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const iter = buf1.entries();
  const buf2 = Buffer.from(buf1);
  const entries = Array.from(iter);
  return entries.length === 3 && entries[0][1] === 1;
});

test('迭代器在 Buffer 被 concat 后原 Buffer 迭代器仍可用', () => {
  const buf1 = Buffer.from([1, 2]);
  const iter = buf1.entries();
  const buf2 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2]);
  const entries = Array.from(iter);
  return entries.length === 2 && entries[0][1] === 1;
});

// ==================== 迭代器与 Buffer 的垃圾回收相关（间接测试） ====================
test('迭代器在 Buffer 引用被清除后仍可用（闭包捕获）', () => {
  function createIterator() {
    const buf = Buffer.from([1, 2, 3]);
    return buf.entries();
  }
  const iter = createIterator();
  const entries = Array.from(iter);
  return entries.length === 3 && entries[0][1] === 1;
});

test('迭代器在 Buffer 被重新赋值后仍可用（闭包捕获）', () => {
  let buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  buf = Buffer.from([9, 9, 9]);
  const entries = Array.from(iter);
  return entries.length === 3 && entries[0][1] === 1;
});

// ==================== 迭代器与 Buffer 的 toString 方法（各种编码） ====================
test('entries 值与 toString ascii 编码一致', () => {
  const buf = Buffer.from('ABC', 'ascii');
  const entries = Array.from(buf.entries());
  const str = buf.toString('ascii');
  return entries.length === 3 && str === 'ABC';
});

test('entries 值与 toString utf16le 编码一致', () => {
  const buf = Buffer.from('AB', 'utf16le');
  const entries = Array.from(buf.entries());
  const str = buf.toString('utf16le');
  return entries.length === 4 && str === 'AB';
});

test('entries 值与 toString ucs2 编码一致', () => {
  const buf = Buffer.from('中', 'ucs2');
  const entries = Array.from(buf.entries());
  const str = buf.toString('ucs2');
  return entries.length === 2 && str === '中';
});

test('entries 值与 toString binary 编码一致', () => {
  const buf = Buffer.from('hello', 'binary');
  const entries = Array.from(buf.entries());
  const str = buf.toString('binary');
  return entries.length === 5 && str === 'hello';
});

// ==================== 迭代器与 Buffer 的 toLocaleString 方法 ====================
test('entries 值与 toLocaleString 一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const entries = Array.from(buf.entries());
  const str = buf.toLocaleString();
  return entries.length === 3 && typeof str === 'string';
});

// ==================== 迭代器与 Buffer 的 valueOf 方法 ====================
test('entries 值与 valueOf 一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const entries = Array.from(buf.entries());
  const val = buf.valueOf();
  return entries.length === 3 && Buffer.isBuffer(val);
});

// ==================== 迭代器与 Buffer 的 Symbol.toPrimitive 方法 ====================
test('entries 在 Buffer 转换为字符串后仍可用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const str = String(buf);
  const entries = Array.from(iter);
  return entries.length === 3 && typeof str === 'string';
});

test('entries 在 Buffer 转换为数字后仍可用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const num = Number(buf);
  const entries = Array.from(iter);
  return entries.length === 3 && typeof num === 'number';
});

// ==================== 迭代器与 Buffer 的 Symbol.toStringTag 属性 ====================
test('Buffer 的 Symbol.toStringTag 存在且为 Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3]);
  const tag = buf[Symbol.toStringTag];
  return tag === 'Uint8Array';
});

test('entries 迭代器在 Buffer toStringTag 检查后仍可用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const tag = buf[Symbol.toStringTag];
  const iter = buf.entries();
  const entries = Array.from(iter);
  return tag === 'Uint8Array' && entries.length === 3;
});

// ==================== 迭代器与 Buffer 的 Symbol.hasInstance 方法 ====================
test('Buffer.isBuffer 与 entries 配合使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  if (!Buffer.isBuffer(buf)) {
    return false;
  }
  const entries = Array.from(buf.entries());
  return entries.length === 3;
});

// ==================== 迭代器与 Buffer 的 Symbol.iterator 方法（Buffer 本身） ====================
test('Buffer 本身有 Symbol.iterator 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  return typeof buf[Symbol.iterator] === 'function';
});

test('Buffer 本身的 Symbol.iterator 返回 values 迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();
  const values = Array.from(iter);
  const entries = Array.from(buf.entries());
  return values.length === 3 && values[0] === entries[0][1];
});

// ==================== 迭代器与 Buffer 的 Symbol.toPrimitive 方法 ====================
test('entries 迭代器在 Buffer 转换为原始值后仍可用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  let prim;
  if (typeof buf[Symbol.toPrimitive] === 'function') {
    prim = buf[Symbol.toPrimitive]('string');
  } else {
    prim = String(buf);
  }
  const entries = Array.from(iter);
  return entries.length === 3 && typeof prim === 'string';
});

// ==================== 迭代器与 Buffer 的 Symbol.unscopables 属性 ====================
test('entries 方法不在 Symbol.unscopables 中', () => {
  const buf = Buffer.from([1, 2, 3]);
  const unscopables = Buffer.prototype[Symbol.unscopables];
  if (unscopables) {
    return unscopables.entries !== true;
  }
  return true;
});

// ==================== 迭代器与 Buffer 的 Symbol.species 属性 ====================
test('entries 迭代器在 Buffer 子类中正常工作', () => {
  class MyBuffer extends Buffer {}
  const buf = new MyBuffer([1, 2, 3]);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[0][1] === 1;
});

// ==================== 迭代器与 Buffer 的 Symbol.match 方法 ====================
test('entries 迭代器在 Buffer match 后仍可用', () => {
  const buf = Buffer.from('hello world', 'utf8');
  const iter = buf.entries();
  const match = buf.toString('utf8').match(/hello/);
  const entries = Array.from(iter);
  return entries.length === 11 && match !== null;
});

// ==================== 迭代器与 Buffer 的 Symbol.replace 方法 ====================
test('entries 迭代器在 Buffer replace 后仍可用', () => {
  const buf = Buffer.from('hello world', 'utf8');
  const iter = buf.entries();
  const replaced = buf.toString('utf8').replace('world', 'node');
  const entries = Array.from(iter);
  return entries.length === 11 && replaced.includes('node');
});

// ==================== 迭代器与 Buffer 的 Symbol.search 方法 ====================
test('entries 迭代器在 Buffer search 后仍可用', () => {
  const buf = Buffer.from('hello world', 'utf8');
  const iter = buf.entries();
  const index = buf.toString('utf8').search('world');
  const entries = Array.from(iter);
  return entries.length === 11 && index === 6;
});

// ==================== 迭代器与 Buffer 的 Symbol.split 方法 ====================
test('entries 迭代器在 Buffer split 后仍可用', () => {
  const buf = Buffer.from('hello world', 'utf8');
  const iter = buf.entries();
  const parts = buf.toString('utf8').split(' ');
  const entries = Array.from(iter);
  return entries.length === 11 && parts.length === 2;
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

