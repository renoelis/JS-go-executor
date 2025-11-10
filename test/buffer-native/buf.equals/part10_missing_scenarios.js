// buf.equals() - Missing Scenarios and Edge Cases
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

// 无参数调用测试
test('TypeError - 无参数调用', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals();
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer');
  }
});

// 多参数调用测试（只使用第一个参数）
test('多参数调用 - 只使用第一个参数', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([4, 5, 6]);
  // Node.js 应该忽略第二个参数
  return buf1.equals(buf2, buf3) === true;
});

test('多参数调用 - 第一个参数错误', () => {
  try {
    const buf = Buffer.from('hello');
    const buf2 = Buffer.from('world');
    buf.equals('invalid', buf2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Uint8Array slice 结果比较
test('Uint8Array.slice - 返回新 Uint8Array', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const sliced = arr.slice(1, 4);
  const buf = Buffer.from([2, 3, 4]);
  return buf.equals(sliced) === true;
});

test('Uint8Array.slice - 空结果', () => {
  const arr = new Uint8Array([1, 2, 3]);
  const sliced = arr.slice(0, 0);
  const buf = Buffer.alloc(0);
  return buf.equals(sliced) === true;
});

test('Uint8Array.subarray - 返回视图', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const subarr = arr.subarray(1, 4);
  const buf = Buffer.from([2, 3, 4]);
  return buf.equals(subarr) === true;
});

test('Uint8Array.subarray - 修改原数组后', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const subarr = arr.subarray(1, 4);
  const buf = Buffer.from([2, 3, 4]);
  const result1 = buf.equals(subarr);
  arr[2] = 99;
  const result2 = buf.equals(subarr);
  return result1 === true && result2 === false;
});

// SharedArrayBuffer 测试（如果支持）
test('SharedArrayBuffer - Uint8Array 基于 SharedArrayBuffer', () => {
  try {
    const sab = new SharedArrayBuffer(10);
    const view = new Uint8Array(sab, 0, 3);
    view[0] = 1;
    view[1] = 2;
    view[2] = 3;
    const buf = Buffer.from([1, 2, 3]);
    return buf.equals(view) === true;
  } catch (e) {
    // SharedArrayBuffer 可能不支持，跳过测试
    return true;
  }
});

test('SharedArrayBuffer - 相同内容不同视图', () => {
  try {
    const sab = new SharedArrayBuffer(10);
    const view1 = new Uint8Array(sab, 0, 3);
    view1[0] = 1;
    view1[1] = 2;
    view1[2] = 3;
    const view2 = new Uint8Array(sab, 0, 3);
    const buf = Buffer.from([1, 2, 3]);
    return buf.equals(view1) === true && buf.equals(view2) === true;
  } catch (e) {
    // SharedArrayBuffer 可能不支持，跳过测试
    return true;
  }
});

test('SharedArrayBuffer - 修改共享内存', () => {
  try {
    const sab = new SharedArrayBuffer(10);
    const view1 = new Uint8Array(sab, 0, 3);
    view1[0] = 1;
    view1[1] = 2;
    view1[2] = 3;
    const view2 = new Uint8Array(sab, 0, 3);
    const buf = Buffer.from([1, 2, 3]);
    const result1 = buf.equals(view1);
    view2[0] = 99;
    const result2 = buf.equals(view1);
    return result1 === true && result2 === false;
  } catch (e) {
    // SharedArrayBuffer 可能不支持，跳过测试
    return true;
  }
});

// 内存对齐边界测试
test('内存对齐 - 8 字节边界', () => {
  const buf1 = Buffer.alloc(8, 0xAA);
  const buf2 = Buffer.alloc(8, 0xAA);
  return buf1.equals(buf2) === true;
});

test('内存对齐 - 16 字节边界', () => {
  const buf1 = Buffer.alloc(16, 0xBB);
  const buf2 = Buffer.alloc(16, 0xBB);
  return buf1.equals(buf2) === true;
});

test('内存对齐 - 32 字节边界', () => {
  const buf1 = Buffer.alloc(32, 0xCC);
  const buf2 = Buffer.alloc(32, 0xCC);
  return buf1.equals(buf2) === true;
});

test('内存对齐 - 64 字节边界', () => {
  const buf1 = Buffer.alloc(64, 0xDD);
  const buf2 = Buffer.alloc(64, 0xDD);
  return buf1.equals(buf2) === true;
});

test('内存对齐 - 128 字节边界', () => {
  const buf1 = Buffer.alloc(128, 0xEE);
  const buf2 = Buffer.alloc(128, 0xEE);
  return buf1.equals(buf2) === true;
});

test('内存对齐 - 256 字节边界', () => {
  const buf1 = Buffer.alloc(256, 0xFF);
  const buf2 = Buffer.alloc(256, 0xFF);
  return buf1.equals(buf2) === true;
});

test('内存对齐 - 非对齐长度 7', () => {
  const buf1 = Buffer.alloc(7, 0xAA);
  const buf2 = Buffer.alloc(7, 0xAA);
  return buf1.equals(buf2) === true;
});

test('内存对齐 - 非对齐长度 15', () => {
  const buf1 = Buffer.alloc(15, 0xBB);
  const buf2 = Buffer.alloc(15, 0xBB);
  return buf1.equals(buf2) === true;
});

test('内存对齐 - 非对齐长度 31', () => {
  const buf1 = Buffer.alloc(31, 0xCC);
  const buf2 = Buffer.alloc(31, 0xCC);
  return buf1.equals(buf2) === true;
});

test('内存对齐 - 非对齐长度 63', () => {
  const buf1 = Buffer.alloc(63, 0xDD);
  const buf2 = Buffer.alloc(63, 0xDD);
  return buf1.equals(buf2) === true;
});

// Uint8Array 构造方式测试
test('Uint8Array - 从数组创建', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.equals(arr) === true;
});

test('Uint8Array - 从 ArrayBuffer 创建', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  view[3] = 4;
  view[4] = 5;
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.equals(view) === true;
});

test('Uint8Array - 从长度创建（全零）', () => {
  const arr = new Uint8Array(5);
  const buf = Buffer.alloc(5, 0);
  return buf.equals(arr) === true;
});

test('Uint8Array - 从另一个 Uint8Array 创建', () => {
  const arr1 = new Uint8Array([1, 2, 3]);
  const arr2 = new Uint8Array(arr1);
  const buf = Buffer.from([1, 2, 3]);
  return buf.equals(arr1) === true && buf.equals(arr2) === true;
});

test('Uint8Array - set 方法修改后', () => {
  const arr = new Uint8Array(5);
  arr.set([1, 2, 3], 0);
  const buf = Buffer.from([1, 2, 3, 0, 0]);
  return buf.equals(arr) === true;
});

test('Uint8Array - fill 方法填充后', () => {
  const arr = new Uint8Array(5);
  arr.fill(0xAA);
  const buf = Buffer.alloc(5, 0xAA);
  return buf.equals(arr) === true;
});

test('Uint8Array - copyWithin 方法后', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  arr.copyWithin(0, 2, 4);
  const buf = Buffer.from([3, 4, 3, 4, 5]);
  return buf.equals(arr) === true;
});

test('Uint8Array - reverse 方法后', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  arr.reverse();
  const buf = Buffer.from([5, 4, 3, 2, 1]);
  return buf.equals(arr) === true;
});

test('Uint8Array - sort 方法后', () => {
  const arr = new Uint8Array([5, 2, 8, 1, 9]);
  arr.sort();
  const buf = Buffer.from([1, 2, 5, 8, 9]);
  return buf.equals(arr) === true;
});

// Buffer 和 Uint8Array 的边界差异
test('Buffer vs Uint8Array - 创建方式差异', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  return buf.equals(arr) === true && arr.buffer !== buf.buffer;
});

test('Buffer vs Uint8Array - byteLength 一致性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  return buf.byteLength === arr.byteLength && buf.equals(arr) === true;
});

test('Buffer vs Uint8Array - length 一致性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  return buf.length === arr.length && buf.equals(arr) === true;
});

// 极端长度测试
test('极端长度 - 长度 1', () => {
  const buf1 = Buffer.from([0]);
  const buf2 = Buffer.from([0]);
  return buf1.equals(buf2) === true;
});

test('极端长度 - 长度 2', () => {
  const buf1 = Buffer.from([0, 1]);
  const buf2 = Buffer.from([0, 1]);
  return buf1.equals(buf2) === true;
});

test('极端长度 - 长度 3', () => {
  const buf1 = Buffer.from([0, 1, 2]);
  const buf2 = Buffer.from([0, 1, 2]);
  return buf1.equals(buf2) === true;
});

test('极端长度 - 长度 4', () => {
  const buf1 = Buffer.from([0, 1, 2, 3]);
  const buf2 = Buffer.from([0, 1, 2, 3]);
  return buf1.equals(buf2) === true;
});

test('极端长度 - 长度 5', () => {
  const buf1 = Buffer.from([0, 1, 2, 3, 4]);
  const buf2 = Buffer.from([0, 1, 2, 3, 4]);
  return buf1.equals(buf2) === true;
});

test('极端长度 - 长度 6', () => {
  const buf1 = Buffer.from([0, 1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([0, 1, 2, 3, 4, 5]);
  return buf1.equals(buf2) === true;
});

test('极端长度 - 长度 7', () => {
  const buf1 = Buffer.from([0, 1, 2, 3, 4, 5, 6]);
  const buf2 = Buffer.from([0, 1, 2, 3, 4, 5, 6]);
  return buf1.equals(buf2) === true;
});

test('极端长度 - 长度 9', () => {
  const buf1 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const buf2 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  return buf1.equals(buf2) === true;
});

test('极端长度 - 长度 17', () => {
  const arr = [];
  for (let i = 0; i < 17; i++) arr.push(i);
  const buf1 = Buffer.from(arr);
  const buf2 = Buffer.from(arr);
  return buf1.equals(buf2) === true;
});

test('极端长度 - 长度 33', () => {
  const arr = [];
  for (let i = 0; i < 33; i++) arr.push(i % 256);
  const buf1 = Buffer.from(arr);
  const buf2 = Buffer.from(arr);
  return buf1.equals(buf2) === true;
});

test('极端长度 - 长度 65', () => {
  const arr = [];
  for (let i = 0; i < 65; i++) arr.push(i % 256);
  const buf1 = Buffer.from(arr);
  const buf2 = Buffer.from(arr);
  return buf1.equals(buf2) === true;
});

test('极端长度 - 长度 129', () => {
  const arr = [];
  for (let i = 0; i < 129; i++) arr.push(i % 256);
  const buf1 = Buffer.from(arr);
  const buf2 = Buffer.from(arr);
  return buf1.equals(buf2) === true;
});

// 不同位置的差异检测
test('差异位置 - 第 8 字节不同', () => {
  const buf1 = Buffer.alloc(16, 0xAA);
  const buf2 = Buffer.alloc(16, 0xAA);
  buf2[7] = 0xBB;
  return buf1.equals(buf2) === false;
});

test('差异位置 - 第 16 字节不同', () => {
  const buf1 = Buffer.alloc(32, 0xAA);
  const buf2 = Buffer.alloc(32, 0xAA);
  buf2[15] = 0xBB;
  return buf1.equals(buf2) === false;
});

test('差异位置 - 第 32 字节不同', () => {
  const buf1 = Buffer.alloc(64, 0xAA);
  const buf2 = Buffer.alloc(64, 0xAA);
  buf2[31] = 0xBB;
  return buf1.equals(buf2) === false;
});

test('差异位置 - 第 64 字节不同', () => {
  const buf1 = Buffer.alloc(128, 0xAA);
  const buf2 = Buffer.alloc(128, 0xAA);
  buf2[63] = 0xBB;
  return buf1.equals(buf2) === false;
});

// 模式测试
test('模式 - 交替 0 和 1', () => {
  const arr = [];
  for (let i = 0; i < 100; i++) arr.push(i % 2);
  const buf1 = Buffer.from(arr);
  const buf2 = Buffer.from(arr);
  return buf1.equals(buf2) === true;
});

test('模式 - 递增序列', () => {
  const arr = [];
  for (let i = 0; i < 256; i++) arr.push(i);
  const buf1 = Buffer.from(arr);
  const buf2 = Buffer.from(arr);
  return buf1.equals(buf2) === true;
});

test('模式 - 递减序列', () => {
  const arr = [];
  for (let i = 255; i >= 0; i--) arr.push(i);
  const buf1 = Buffer.from(arr);
  const buf2 = Buffer.from(arr);
  return buf1.equals(buf2) === true;
});

test('模式 - 随机模式（固定种子）', () => {
  const arr = [123, 45, 67, 89, 12, 34, 56, 78, 90, 11];
  const buf1 = Buffer.from(arr);
  const buf2 = Buffer.from(arr);
  return buf1.equals(buf2) === true;
});

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

