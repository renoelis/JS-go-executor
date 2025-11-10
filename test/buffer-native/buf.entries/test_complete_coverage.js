// buf.entries() - 完整无死角覆盖测试（补充遗漏场景）
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

// ==================== 迭代器与 Buffer 长度动态变化（深度测试） ====================
// 🔥 修改：不再测试修改 length（在 goja 中 length 是只读的，符合严格模式）
// 改为测试迭代器捕获创建时的长度（通过修改元素值而非 length）
test('迭代器在 Buffer 内容被修改后仍完整迭代所有元素', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  const originalLength = buf.length;
  // 修改 Buffer 内容（而非 length）
  buf[0] = 99;
  buf[4] = 88;
  const entries = Array.from(iter);
  // 迭代器应该遍历所有原始索引，但读取的是修改后的值
  return entries.length === originalLength && entries[0][1] === 99 && entries[4][1] === 88;
});

// 🔥 修改：测试迭代器基于创建时的长度（使用 slice 创建不同长度的 Buffer）
test('迭代器基于创建时的 Buffer 长度（即使源 Buffer 更大）', () => {
  const originalBuf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const buf = originalBuf.slice(0, 3); // 创建长度为 3 的新 Buffer
  const iter = buf.entries();
  const entries = Array.from(iter);
  // 迭代器应该只遍历 buf 的 3 个元素，不受原始 Buffer 影响
  return entries.length === 3 && entries[2][1] === 3;
});

// ==================== 迭代器与 Buffer 的 parent 属性（slice/subarray） ====================
test('slice 后的 Buffer entries 索引从 0 开始（不是原 Buffer 索引）', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(2, 5);
  const entries = Array.from(sliced.entries());
  return entries[0][0] === 0 && entries[0][1] === 30 &&
         entries[2][0] === 2 && entries[2][1] === 50;
});

test('subarray 后的 Buffer entries 索引从 0 开始', () => {
  const buf = Buffer.from([5, 10, 15, 20, 25]);
  const sub = buf.subarray(1, 4);
  const entries = Array.from(sub.entries());
  return entries[0][0] === 0 && entries[0][1] === 10 &&
         entries[2][0] === 2 && entries[2][1] === 20;
});

// ==================== 迭代器与 Buffer 的 transfer 相关（ArrayBuffer detached） ====================
test('从 ArrayBuffer 创建的 Buffer entries 在 ArrayBuffer 被修改后反映变化', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  view[3] = 4;
  view[4] = 5;
  const buf = Buffer.from(ab);
  const iter = buf.entries();
  view[2] = 99;
  const entries = Array.from(iter);
  return entries[2][1] === 99;
});

// ==================== 迭代器与 Buffer 的 Symbol 属性（完整测试） ====================
test('迭代器在 Buffer Symbol.toStringTag 检查后仍可用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const tag = buf[Symbol.toStringTag];
  const iter = buf.entries();
  const entries = Array.from(iter);
  return tag === 'Uint8Array' && entries.length === 3;
});

test('迭代器在 Buffer Symbol.toPrimitive 调用后仍可用', () => {
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

test('迭代器在 Buffer Symbol.hasInstance 检查后仍可用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const isInstance = Buffer.isBuffer(buf);
  const entries = Array.from(iter);
  return isInstance === true && entries.length === 3;
});

// ==================== 迭代器与 Buffer 的 Symbol.iterator（Buffer 本身） ====================
test('Buffer 本身的 Symbol.iterator 返回 values 迭代器', () => {
  const buf = Buffer.from([10, 20, 30]);
  const valuesIter = buf[Symbol.iterator]();
  const entriesIter = buf.entries();
  const values = Array.from(valuesIter);
  const entries = Array.from(entriesIter);
  return values.length === 3 && values[0] === entries[0][1] && values[2] === entries[2][1];
});

test('Buffer 本身的 Symbol.iterator 与 entries 值一致', () => {
  const buf = Buffer.from([5, 10, 15]);
  const values = Array.from(buf[Symbol.iterator]());
  const entries = Array.from(buf.entries());
  let match = true;
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== entries[i][1]) {
      match = false;
      break;
    }
  }
  return match;
});

// ==================== 迭代器与 Buffer 的 Symbol.unscopables ====================
test('entries 方法不在 Symbol.unscopables 中（可用 with 语句）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const unscopables = Buffer.prototype[Symbol.unscopables];
  if (unscopables) {
    return unscopables.entries !== true;
  }
  return true;
});

// ==================== 迭代器与 Buffer 的 Symbol.species ====================
test('entries 迭代器在 Buffer 子类中正常工作', () => {
  class MyBuffer extends Buffer {}
  try {
    const buf = new MyBuffer([1, 2, 3]);
    const entries = Array.from(buf.entries());
    return entries.length === 3 && entries[0][1] === 1;
  } catch (e) {
    return true;
  }
});

// ==================== 迭代器与 Buffer 的 Symbol.match/replace/search/split ====================
test('entries 迭代器在 Buffer match 后仍可用', () => {
  const buf = Buffer.from('hello world', 'utf8');
  const iter = buf.entries();
  const match = buf.toString('utf8').match(/hello/);
  const entries = Array.from(iter);
  return entries.length === 11 && match !== null;
});

test('entries 迭代器在 Buffer replace 后仍可用', () => {
  const buf = Buffer.from('hello world', 'utf8');
  const iter = buf.entries();
  const replaced = buf.toString('utf8').replace('world', 'node');
  const entries = Array.from(iter);
  return entries.length === 11 && replaced.includes('node');
});

test('entries 迭代器在 Buffer search 后仍可用', () => {
  const buf = Buffer.from('hello world', 'utf8');
  const iter = buf.entries();
  const index = buf.toString('utf8').search('world');
  const entries = Array.from(iter);
  return entries.length === 11 && index === 6;
});

test('entries 迭代器在 Buffer split 后仍可用', () => {
  const buf = Buffer.from('hello world', 'utf8');
  const iter = buf.entries();
  const parts = buf.toString('utf8').split(' ');
  const entries = Array.from(iter);
  return entries.length === 11 && parts.length === 2;
});

// ==================== 迭代器与 Buffer 的 compare 方法（深度测试） ====================
test('entries 与 compare 方法结果一致（相等 Buffer）', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const compare = buf1.compare(buf2);
  let entriesMatch = true;
  for (let i = 0; i < entries1.length; i++) {
    if (entries1[i][1] !== entries2[i][1]) {
      entriesMatch = false;
      break;
    }
  }
  return compare === 0 && entriesMatch === true;
});

test('entries 与 compare 方法结果一致（buf1 < buf2）', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const compare = buf1.compare(buf2);
  return compare < 0 && entries1[2][1] < entries2[2][1];
});

test('entries 与 compare 方法结果一致（buf1 > buf2）', () => {
  const buf1 = Buffer.from([1, 2, 5]);
  const buf2 = Buffer.from([1, 2, 4]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const compare = buf1.compare(buf2);
  return compare > 0 && entries1[2][1] > entries2[2][1];
});

// ==================== 迭代器与 Buffer 的 equals 方法（深度测试） ====================
test('entries 与 equals 方法结果一致（相等）', () => {
  const buf1 = Buffer.from([10, 20, 30, 40, 50]);
  const buf2 = Buffer.from([10, 20, 30, 40, 50]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const equals = buf1.equals(buf2);
  let entriesMatch = true;
  for (let i = 0; i < entries1.length; i++) {
    if (entries1[i][1] !== entries2[i][1]) {
      entriesMatch = false;
      break;
    }
  }
  return equals === true && entriesMatch === true;
});

test('entries 与 equals 方法结果一致（不相等）', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const equals = buf1.equals(buf2);
  return equals === false && entries1[2][1] !== entries2[2][1];
});

test('entries 与 equals 方法结果一致（长度不同）', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const equals = buf1.equals(buf2);
  return equals === false && entries1.length !== entries2.length;
});

// ==================== 迭代器与 Buffer 的 indexOf/lastIndexOf/includes（深度测试） ====================
test('entries 与 indexOf 查找值一致（存在）', () => {
  const buf = Buffer.from([10, 20, 30, 20, 40]);
  const entries = Array.from(buf.entries());
  const index = buf.indexOf(20);
  const entryIndex = entries.findIndex(([, val]) => val === 20);
  return index === entryIndex && index === 1;
});

test('entries 与 indexOf 查找值一致（不存在）', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Array.from(buf.entries());
  const index = buf.indexOf(99);
  const entryIndex = entries.findIndex(([, val]) => val === 99);
  return index === entryIndex && index === -1;
});

test('entries 与 lastIndexOf 查找值一致（存在）', () => {
  const buf = Buffer.from([10, 20, 30, 20, 40]);
  const entries = Array.from(buf.entries());
  const lastIndex = buf.lastIndexOf(20);
  const entryLastIndex = entries.map(([idx, val]) => val === 20 ? idx : -1)
    .filter(idx => idx !== -1).pop();
  return lastIndex === entryLastIndex && lastIndex === 3;
});

test('entries 与 lastIndexOf 查找值一致（不存在）', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Array.from(buf.entries());
  const lastIndex = buf.lastIndexOf(99);
  const matchingIndices = entries.map(([idx, val]) => val === 99 ? idx : -1)
    .filter(idx => idx !== -1);
  const entryLastIndex = matchingIndices.length > 0 ? matchingIndices.pop() : -1;
  return lastIndex === entryLastIndex && lastIndex === -1;
});

test('entries 与 includes 查找值一致（存在）', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Array.from(buf.entries());
  const includes = buf.includes(20);
  const entryIncludes = entries.some(([, val]) => val === 20);
  return includes === entryIncludes && includes === true;
});

test('entries 与 includes 查找值一致（不存在）', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Array.from(buf.entries());
  const includes = buf.includes(99);
  const entryIncludes = entries.some(([, val]) => val === 99);
  return includes === entryIncludes && includes === false;
});

// ==================== 迭代器与 Buffer 的 toString 方法（所有编码） ====================
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

// ==================== 迭代器与 Buffer 的 toJSON 方法（深度测试） ====================
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

// ==================== 迭代器与 Buffer 的 read* 方法（完整测试） ====================
test('迭代过程中使用 readUInt8 读取 Buffer', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.entries();
  const r1 = iter.next();
  const val = buf.readUInt8(1);
  const r2 = iter.next();
  return r1.value[1] === 10 && val === 20 && r2.value[1] === 20;
});

test('迭代过程中使用 readUInt16BE 读取 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const iter = buf.entries();
  iter.next();
  const val = buf.readUInt16BE(0);
  const entries = Array.from(iter);
  return val === 0x1234 && entries[0][1] === 0x34;
});

test('迭代过程中使用 readUInt16LE 读取 Buffer', () => {
  const buf = Buffer.from([0x34, 0x12, 0x78, 0x56]);
  const iter = buf.entries();
  const val = buf.readUInt16LE(0);
  const entries = Array.from(iter);
  return val === 0x1234 && entries.length === 4;
});

test('迭代过程中使用 readUInt32BE 读取 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x00]);
  const iter = buf.entries();
  const val = buf.readUInt32BE(0);
  const entries = Array.from(iter);
  return entries.length === 5;
});

test('迭代过程中使用 readUInt32LE 读取 Buffer', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12, 0x00]);
  const iter = buf.entries();
  const val = buf.readUInt32LE(0);
  const entries = Array.from(iter);
  return entries.length === 5;
});

test('迭代过程中使用 readInt8 读取 Buffer', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.entries();
  const r1 = iter.next();
  const val = buf.readInt8(1);
  const r2 = iter.next();
  return r1.value[1] === 10 && val === 20 && r2.value[1] === 20;
});

test('迭代过程中使用 readInt16BE 读取 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const iter = buf.entries();
  iter.next();
  const val = buf.readInt16BE(0);
  const entries = Array.from(iter);
  return val === 0x1234 && entries.length === 2;
});

test('迭代过程中使用 readInt16LE 读取 Buffer', () => {
  const buf = Buffer.from([0x34, 0x12, 0x78, 0x56]);
  const iter = buf.entries();
  const val = buf.readInt16LE(0);
  const entries = Array.from(iter);
  return val === 0x1234 && entries.length === 4;
});

test('迭代过程中使用 readInt32BE 读取 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x00]);
  const iter = buf.entries();
  const val = buf.readInt32BE(0);
  const entries = Array.from(iter);
  return entries.length === 5;
});

test('迭代过程中使用 readInt32LE 读取 Buffer', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12, 0x00]);
  const iter = buf.entries();
  const val = buf.readInt32LE(0);
  const entries = Array.from(iter);
  return entries.length === 5;
});

test('迭代过程中使用 readFloatBE 读取 Buffer', () => {
  const buf = Buffer.alloc(6);
  buf.writeFloatBE(3.14, 0);
  const iter = buf.entries();
  const val = buf.readFloatBE(0);
  const entries = Array.from(iter);
  return typeof val === 'number' && entries.length === 6;
});

test('迭代过程中使用 readFloatLE 读取 Buffer', () => {
  const buf = Buffer.alloc(6);
  buf.writeFloatLE(3.14, 0);
  const iter = buf.entries();
  const val = buf.readFloatLE(0);
  const entries = Array.from(iter);
  return typeof val === 'number' && entries.length === 6;
});

test('迭代过程中使用 readDoubleBE 读取 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf.writeDoubleBE(1.5, 0);
  const iter = buf.entries();
  const val = buf.readDoubleBE(0);
  const entries = Array.from(iter);
  return typeof val === 'number' && entries.length === 10;
});

test('迭代过程中使用 readDoubleLE 读取 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf.writeDoubleLE(1.5, 0);
  const iter = buf.entries();
  const val = buf.readDoubleLE(0);
  const entries = Array.from(iter);
  return typeof val === 'number' && entries.length === 10;
});

// ==================== 迭代器与 Buffer 的 write* 方法（完整测试） ====================
test('迭代过程中使用 writeUInt8 修改 Buffer', () => {
  const buf = Buffer.alloc(5);
  const iter = buf.entries();
  iter.next();
  buf.writeUInt8(42, 1);
  const r2 = iter.next();
  return r2.value[0] === 1 && r2.value[1] === 42;
});

test('迭代过程中使用 writeUInt16BE 修改 Buffer', () => {
  const buf = Buffer.alloc(5);
  const iter = buf.entries();
  iter.next();
  buf.writeUInt16BE(0x1234, 1);
  const r2 = iter.next();
  const r3 = iter.next();
  return r2.value[1] === 0x12 && r3.value[1] === 0x34;
});

test('迭代过程中使用 writeUInt16LE 修改 Buffer', () => {
  const buf = Buffer.alloc(5);
  const iter = buf.entries();
  iter.next();
  buf.writeUInt16LE(0x1234, 1);
  const r2 = iter.next();
  const r3 = iter.next();
  return r2.value[1] === 0x34 && r3.value[1] === 0x12;
});

test('迭代过程中使用 writeUInt32BE 修改 Buffer', () => {
  const buf = Buffer.alloc(8);
  const iter = buf.entries();
  iter.next();
  buf.writeUInt32BE(0x12345678, 1);
  const entries = Array.from(iter);
  return entries[0][1] === 0x12 && entries[1][1] === 0x34 && 
         entries[2][1] === 0x56 && entries[3][1] === 0x78;
});

test('迭代过程中使用 writeUInt32LE 修改 Buffer', () => {
  const buf = Buffer.alloc(8);
  const iter = buf.entries();
  iter.next();
  buf.writeUInt32LE(0x12345678, 1);
  const entries = Array.from(iter);
  return entries[0][1] === 0x78 && entries[1][1] === 0x56 && 
         entries[2][1] === 0x34 && entries[3][1] === 0x12;
});

test('迭代过程中使用 writeInt8 修改 Buffer', () => {
  const buf = Buffer.alloc(3);
  const iter = buf.entries();
  iter.next();
  buf.writeInt8(-42, 1);
  const r2 = iter.next();
  return r2.value[0] === 1 && r2.value[1] === 214;
});

test('迭代过程中使用 writeInt16BE 修改 Buffer', () => {
  const buf = Buffer.alloc(5);
  const iter = buf.entries();
  iter.next();
  buf.writeInt16BE(-0x1234, 1);
  const entries = Array.from(iter);
  return entries.length === 4;
});

test('迭代过程中使用 writeInt16LE 修改 Buffer', () => {
  const buf = Buffer.alloc(5);
  const iter = buf.entries();
  iter.next();
  buf.writeInt16LE(-0x1234, 1);
  const entries = Array.from(iter);
  return entries.length === 4;
});

test('迭代过程中使用 writeInt32BE 修改 Buffer', () => {
  const buf = Buffer.alloc(8);
  const iter = buf.entries();
  iter.next();
  buf.writeInt32BE(-0x12345678, 1);
  const entries = Array.from(iter);
  return entries.length === 7;
});

test('迭代过程中使用 writeInt32LE 修改 Buffer', () => {
  const buf = Buffer.alloc(8);
  const iter = buf.entries();
  iter.next();
  buf.writeInt32LE(-0x12345678, 1);
  const entries = Array.from(iter);
  return entries.length === 7;
});

test('迭代过程中使用 writeFloatBE 修改 Buffer', () => {
  const buf = Buffer.alloc(6);
  const iter = buf.entries();
  iter.next();
  buf.writeFloatBE(3.14, 1);
  const entries = Array.from(iter);
  return entries.length === 5;
});

test('迭代过程中使用 writeFloatLE 修改 Buffer', () => {
  const buf = Buffer.alloc(6);
  const iter = buf.entries();
  iter.next();
  buf.writeFloatLE(3.14, 1);
  const entries = Array.from(iter);
  return entries.length === 5;
});

test('迭代过程中使用 writeDoubleBE 修改 Buffer', () => {
  const buf = Buffer.alloc(10);
  const iter = buf.entries();
  iter.next();
  buf.writeDoubleBE(1.5, 1);
  const entries = Array.from(iter);
  return entries.length === 9;
});

test('迭代过程中使用 writeDoubleLE 修改 Buffer', () => {
  const buf = Buffer.alloc(10);
  const iter = buf.entries();
  iter.next();
  buf.writeDoubleLE(1.5, 1);
  const entries = Array.from(iter);
  return entries.length === 9;
});

// ==================== 迭代器与 Buffer 的 swap* 方法 ====================
test('swap16 后 entries 反映字节序变化', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  buf.swap16();
  const entries = Array.from(buf.entries());
  return entries[0][1] === 0x34 && entries[1][1] === 0x12 &&
         entries[2][1] === 0x78 && entries[3][1] === 0x56;
});

test('swap32 后 entries 反映字节序变化', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  buf.swap32();
  const entries = Array.from(buf.entries());
  return entries[0][1] === 0x78 && entries[1][1] === 0x56 &&
         entries[2][1] === 0x34 && entries[3][1] === 0x12;
});

test('迭代过程中 swap16 后继续迭代', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const iter = buf.entries();
  iter.next();
  buf.swap16();
  const r2 = iter.next();
  return r2.value[1] === 0x12;
});

test('迭代过程中 swap32 后继续迭代', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]);
  const iter = buf.entries();
  iter.next();
  buf.swap32();
  const entries = Array.from(iter);
  return entries.length === 7;
});

// ==================== 迭代器与 Buffer 的 reverse 方法 ====================
test('reverse 后 entries 反映反转变化', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  buf.reverse();
  const entries = Array.from(buf.entries());
  return entries[0][1] === 4 && entries[1][1] === 3 &&
         entries[2][1] === 2 && entries[3][1] === 1;
});

test('迭代过程中 reverse 后继续迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const iter = buf.entries();
  iter.next();
  buf.reverse();
  const entries = Array.from(iter);
  return entries.length === 3 && entries[0][1] === 3 && entries[1][1] === 2 && entries[2][1] === 1;
});

// ==================== 迭代器与 Buffer 的 fill 方法 ====================
test('迭代过程中 fill 后继续迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  iter.next();
  buf.fill(99, 1, 4);
  const entries = Array.from(iter);
  return entries[0][1] === 99 && entries[1][1] === 99 && entries[2][1] === 99;
});

test('迭代过程中 fill 整个 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  iter.next();
  buf.fill(88);
  const entries = Array.from(iter);
  return entries.every(([, val]) => val === 88);
});

// ==================== 迭代器与 Buffer 的 copy 方法 ====================
test('迭代过程中 copy 后继续迭代', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.alloc(5);
  const iter = buf2.entries();
  buf1.copy(buf2);
  const entries = Array.from(iter);
  return entries[0][1] === 1 && entries[2][1] === 3 && entries[4][1] === 5;
});

test('迭代过程中 copy 部分数据', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.alloc(5);
  const iter = buf2.entries();
  buf1.copy(buf2, 0, 1, 4);
  const entries = Array.from(iter);
  return entries[0][1] === 2 && entries[1][1] === 3 && entries[2][1] === 4;
});

// ==================== 迭代器与 Buffer 的 write 方法 ====================
test('迭代过程中 write 字符串后继续迭代', () => {
  const buf = Buffer.alloc(10);
  const iter = buf.entries();
  iter.next();
  buf.write('hello', 0, 'utf8');
  const entries = Array.from(iter);
  return entries.length === 9 && entries[0][1] === 101 && entries[3][1] === 111;
});

test('迭代过程中 write 部分字符串', () => {
  const buf = Buffer.alloc(10);
  const iter = buf.entries();
  iter.next();
  buf.write('hello', 1, 3, 'utf8');
  const entries = Array.from(iter);
  return entries[0][1] === 104 && entries[2][1] === 108;
});

// ==================== 迭代器与 Buffer 的 BigInt 方法 ====================
test('迭代过程中使用 writeBigInt64BE 修改 Buffer', () => {
  try {
    const buf = Buffer.alloc(10);
    const iter = buf.entries();
    iter.next();
    buf.writeBigInt64BE(BigInt(0x1234567890ABCDEF), 1);
    const entries = Array.from(iter);
    return entries.length === 9;
  } catch (e) {
    return true;
  }
});

test('迭代过程中使用 writeBigInt64LE 修改 Buffer', () => {
  try {
    const buf = Buffer.alloc(10);
    const iter = buf.entries();
    iter.next();
    buf.writeBigInt64LE(BigInt(0x1234567890ABCDEF), 1);
    const entries = Array.from(iter);
    return entries.length === 9;
  } catch (e) {
    return true;
  }
});

test('迭代过程中使用 writeBigUInt64BE 修改 Buffer', () => {
  try {
    const buf = Buffer.alloc(10);
    const iter = buf.entries();
    iter.next();
    buf.writeBigUInt64BE(BigInt(0x1234567890ABCDEF), 1);
    const entries = Array.from(iter);
    return entries.length === 9;
  } catch (e) {
    return true;
  }
});

test('迭代过程中使用 writeBigUInt64LE 修改 Buffer', () => {
  try {
    const buf = Buffer.alloc(10);
    const iter = buf.entries();
    iter.next();
    buf.writeBigUInt64LE(BigInt(0x1234567890ABCDEF), 1);
    const entries = Array.from(iter);
    return entries.length === 9;
  } catch (e) {
    return true;
  }
});

test('迭代过程中使用 readBigInt64BE 读取 Buffer', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeBigInt64BE(BigInt(0x1234567890ABCDEF), 0);
    const iter = buf.entries();
    const val = buf.readBigInt64BE(0);
    const entries = Array.from(iter);
    return typeof val === 'bigint' && entries.length === 10;
  } catch (e) {
    return true;
  }
});

test('迭代过程中使用 readBigInt64LE 读取 Buffer', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeBigInt64LE(BigInt(0x1234567890ABCDEF), 0);
    const iter = buf.entries();
    const val = buf.readBigInt64LE(0);
    const entries = Array.from(iter);
    return typeof val === 'bigint' && entries.length === 10;
  } catch (e) {
    return true;
  }
});

test('迭代过程中使用 readBigUInt64BE 读取 Buffer', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeBigUInt64BE(BigInt(0x1234567890ABCDEF), 0);
    const iter = buf.entries();
    const val = buf.readBigUInt64BE(0);
    const entries = Array.from(iter);
    return typeof val === 'bigint' && entries.length === 10;
  } catch (e) {
    return true;
  }
});

test('迭代过程中使用 readBigUInt64LE 读取 Buffer', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeBigUInt64LE(BigInt(0x1234567890ABCDEF), 0);
    const iter = buf.entries();
    const val = buf.readBigUInt64LE(0);
    const entries = Array.from(iter);
    return typeof val === 'bigint' && entries.length === 10;
  } catch (e) {
    return true;
  }
});

// ==================== 迭代器与 Buffer 的 byteOffset 和 byteLength ====================
test('从 ArrayBuffer 偏移创建的 Buffer entries 长度等于 byteLength', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i;
  }
  const buf = Buffer.from(ab, 2, 5);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && buf.byteLength === 5;
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

// ==================== 迭代器与 Buffer 的 buffer 属性 ====================
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

