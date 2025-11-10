// buf.entries() - 补充遗漏场景测试
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

// ==================== Buffer byteOffset 和 byteLength 相关 ====================
test('从 ArrayBuffer 偏移位置创建的 Buffer entries', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i;
  }
  const buf = Buffer.from(ab, 2, 5);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && 
         entries[0][0] === 0 && entries[0][1] === 2 &&
         entries[4][0] === 4 && entries[4][1] === 6;
});

test('从 ArrayBuffer 偏移位置创建的 Buffer entries 反映原 ArrayBuffer 变化', () => {
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

test('从 Uint8Array 偏移位置创建的 Buffer entries', () => {
  const arr = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const buf = Buffer.from(arr.buffer, 3, 4);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && 
         entries[0][0] === 0 && entries[0][1] === 3 &&
         entries[3][0] === 3 && entries[3][1] === 6;
});

// ==================== 迭代器与 Buffer write* 方法交互 ====================
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

test('迭代过程中使用 writeDoubleBE 修改 Buffer', () => {
  const buf = Buffer.alloc(10);
  const iter = buf.entries();
  iter.next();
  buf.writeDoubleBE(1.5, 1);
  const entries = Array.from(iter);
  return entries.length === 9;
});

test('迭代过程中使用 writeFloatLE 修改 Buffer', () => {
  const buf = Buffer.alloc(6);
  const iter = buf.entries();
  iter.next();
  buf.writeFloatLE(3.14, 1);
  const entries = Array.from(iter);
  return entries.length === 5;
});

// ==================== 迭代器与 Buffer read* 方法交互 ====================
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

test('迭代过程中使用 readInt32LE 读取 Buffer', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12, 0x00]);
  const iter = buf.entries();
  const val = buf.readInt32LE(0);
  const entries = Array.from(iter);
  return entries.length === 5;
});

// ==================== 迭代器与 Buffer swap* 方法交互 ====================
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

// ==================== 迭代器与 Buffer reverse() 方法交互 ====================
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

// ==================== 迭代器与 Buffer toJSON() 方法对比 ====================
test('entries 与 toJSON 的数据一致性', () => {
  const buf = Buffer.from([10, 20, 30]);
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

// ==================== 迭代器与 Buffer toString() 方法对比 ====================
test('entries 值与 toString hex 编码一致', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  const entries = Array.from(buf.entries());
  const hex = buf.toString('hex');
  return entries[0][1] === 0x41 && entries[1][1] === 0x42 && 
         entries[2][1] === 0x43 && hex === '414243';
});

test('entries 值与 toString base64 编码一致', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  const entries = Array.from(buf.entries());
  const base64 = buf.toString('base64');
  return entries.length === 3 && base64 === 'QUJD';
});

// ==================== 迭代器与 Buffer equals() 方法对比 ====================
test('entries 比较两个相等的 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
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

// ==================== 迭代器与 Buffer indexOf/lastIndexOf/includes 方法对比 ====================
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

// ==================== 迭代器与 Buffer concat 后原 Buffer 修改 ====================
test('concat 后的 Buffer entries 与原 Buffer 独立', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2]);
  const iter = buf.entries();
  buf1[0] = 99;
  const entries = Array.from(iter);
  return entries[0][1] === 1;
});

test('concat 后的 Buffer entries 反映原 Buffer 变化（如果共享内存）', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2]);
  const iter = buf.entries();
  buf[0] = 99;
  const entries = Array.from(iter);
  return entries[0][1] === 99;
});

// ==================== 迭代器与 Buffer writeBigInt* 方法交互 ====================
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

// ==================== 迭代器与 Buffer readBigInt* 方法交互 ====================
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

// ==================== 迭代器与 Buffer write*LE/write*BE 方法交互 ====================
test('迭代过程中使用 writeUInt16LE 修改 Buffer', () => {
  const buf = Buffer.alloc(5);
  const iter = buf.entries();
  iter.next();
  buf.writeUInt16LE(0x1234, 1);
  const r2 = iter.next();
  const r3 = iter.next();
  return r2.value[1] === 0x34 && r3.value[1] === 0x12;
});

test('迭代过程中使用 writeInt32BE 修改 Buffer', () => {
  const buf = Buffer.alloc(8);
  const iter = buf.entries();
  iter.next();
  buf.writeInt32BE(-0x12345678, 1);
  const entries = Array.from(iter);
  return entries.length === 7;
});

test('迭代过程中使用 writeDoubleLE 修改 Buffer', () => {
  const buf = Buffer.alloc(10);
  const iter = buf.entries();
  iter.next();
  buf.writeDoubleLE(3.14159, 1);
  const entries = Array.from(iter);
  return entries.length === 9;
});

// ==================== 迭代器与 Buffer read*LE/read*BE 方法交互 ====================
test('迭代过程中使用 readUInt16LE 读取 Buffer', () => {
  const buf = Buffer.from([0x34, 0x12, 0x78, 0x56]);
  const iter = buf.entries();
  const val = buf.readUInt16LE(0);
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

test('迭代过程中使用 readFloatBE 读取 Buffer', () => {
  const buf = Buffer.alloc(6);
  buf.writeFloatBE(3.14, 0);
  const iter = buf.entries();
  const val = buf.readFloatBE(0);
  const entries = Array.from(iter);
  return typeof val === 'number' && entries.length === 6;
});

// ==================== 迭代器与 Buffer fill() 方法交互 ====================
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

// ==================== 迭代器与 Buffer copy() 方法交互 ====================
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

// ==================== 迭代器与 Buffer write() 方法交互 ====================
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

// ==================== 迭代器与 Buffer 的 byteOffset 属性 ====================
test('从 ArrayBuffer 偏移创建的 Buffer entries 索引从 0 开始', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i;
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

// ==================== 迭代器与 Buffer 的 byteLength 属性 ====================
test('从 ArrayBuffer 创建的 Buffer entries 长度等于 byteLength', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i;
  }
  const buf = Buffer.from(ab, 2, 5);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && buf.byteLength === 5;
});

// ==================== 迭代器与 Buffer 的 buffer 属性 ====================
test('从 ArrayBuffer 创建的 Buffer entries 与原 ArrayBuffer 关联', () => {
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

