// buf.reverse() - Part 4: Deep Edge Cases
// 深度边界测试：迭代器、特殊长度、极端值、this绑定等

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

// === 迭代器测试 ===

// Case 1: reverse 后使用 entries() 迭代器
test('reverse 后使用 entries() 迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  buf.reverse(); // [4, 3, 2, 1]
  
  const entries = Array.from(buf.entries());
  const expected = [[0, 4], [1, 3], [2, 2], [3, 1]];
  
  return JSON.stringify(entries) === JSON.stringify(expected);
});

// Case 2: reverse 后使用 keys() 迭代器
test('reverse 后使用 keys() 迭代器', () => {
  const buf = Buffer.from([10, 20, 30]);
  buf.reverse(); // [30, 20, 10]
  
  const keys = Array.from(buf.keys());
  const expected = [0, 1, 2];
  
  return JSON.stringify(keys) === JSON.stringify(expected);
});

// Case 3: reverse 后使用 values() 迭代器
test('reverse 后使用 values() 迭代器', () => {
  const buf = Buffer.from([5, 10, 15]);
  buf.reverse(); // [15, 10, 5]
  
  const values = Array.from(buf.values());
  const expected = [15, 10, 5];
  
  return JSON.stringify(values) === JSON.stringify(expected);
});

// Case 4: reverse 后使用 for...of 循环
test('reverse 后使用 for...of 循环', () => {
  const buf = Buffer.from([100, 200]);
  buf.reverse(); // [200, 100]
  
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  
  const expected = [200, 100];
  return JSON.stringify(result) === JSON.stringify(expected);
});

// === 特殊长度测试 ===

// Case 5: 长度为 2 的 Buffer（最小需要交换的长度）
test('长度为 2 的 Buffer 反转', () => {
  const buf = Buffer.from([0xAA, 0xBB]);
  buf.reverse();
  
  return buf[0] === 0xBB && buf[1] === 0xAA;
});

// Case 6: 长度为 2 的幂次（8, 16, 32, 64, 128, 256）
test('长度为 256（2^8）的 Buffer 反转', () => {
  const buf = Buffer.alloc(256);
  buf[0] = 1;
  buf[127] = 2;
  buf[128] = 3;
  buf[255] = 4;
  
  buf.reverse();
  
  return buf[0] === 4 && buf[127] === 3 && buf[128] === 2 && buf[255] === 1;
});

// Case 7: 长度为 3 的 Buffer（奇数，有中心元素）
test('长度为 3 的 Buffer 中心元素不移动', () => {
  const buf = Buffer.from([10, 20, 30]);
  const centerBefore = buf[1];
  
  buf.reverse(); // [30, 20, 10]
  const centerAfter = buf[1];
  
  return centerBefore === centerAfter && centerAfter === 20;
});

// Case 8: 长度为 7 的 Buffer（奇数）
test('长度为 7 的 Buffer 反转', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7]);
  buf.reverse();
  
  const expected = [7, 6, 5, 4, 3, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// === 特殊字节值测试 ===

// Case 9: 所有字节为 0x00
test('全 0x00 Buffer 反转', () => {
  const buf = Buffer.alloc(10, 0x00);
  buf.reverse();
  
  return buf.every(byte => byte === 0x00);
});

// Case 10: 所有字节为 0x7F（最大正值 Int8）
test('全 0x7F Buffer 反转', () => {
  const buf = Buffer.alloc(8, 0x7F);
  buf.reverse();
  
  return buf.every(byte => byte === 0x7F);
});

// Case 11: 所有字节为 0x80（Int8 中的 -128）
test('全 0x80 Buffer 反转', () => {
  const buf = Buffer.alloc(6, 0x80);
  buf.reverse();
  
  return buf.every(byte => byte === 0x80);
});

// Case 12: 递增序列到 255
test('0-255 完整序列反转', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  
  buf.reverse();
  
  return buf[0] === 255 && buf[255] === 0 && buf[128] === 127;
});

// === this 绑定测试 ===

// Case 13: 使用 call 在 Uint8ClampedArray 上调用
test('在 Uint8ClampedArray 上调用 reverse', () => {
  const clamped = new Uint8ClampedArray([1, 2, 3, 4]);
  Buffer.prototype.reverse.call(clamped);
  
  const expected = [4, 3, 2, 1];
  const actual = Array.from(clamped);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 14: 使用 apply 在 Buffer 上调用
test('使用 apply 在 Buffer 上调用 reverse', () => {
  const buf = Buffer.from([5, 10, 15, 20]);
  Buffer.prototype.reverse.apply(buf);
  
  const expected = [20, 15, 10, 5];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 15: 使用 bind 创建绑定函数
test('使用 bind 创建绑定的 reverse 函数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const boundReverse = Buffer.prototype.reverse.bind(buf);
  
  boundReverse();
  
  const expected = [3, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// === 参数处理测试 ===

// Case 16: 传递多个参数（应全部忽略）
test('reverse 忽略多个参数', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const result = buf.reverse(10, 20, 'test', {}, [], null, undefined);
  
  const expected = [4, 3, 2, 1];
  const actual = Array.from(buf);
  return result === buf && JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 17: 传递对象参数
test('reverse 忽略对象参数', () => {
  const buf = Buffer.from([10, 20, 30]);
  buf.reverse({ start: 0, end: 2 });
  
  // 应该忽略参数，反转整个 Buffer
  const expected = [30, 20, 10];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 18: 传递函数参数
test('reverse 忽略函数参数', () => {
  const buf = Buffer.from([5, 6, 7, 8]);
  buf.reverse(() => {});
  
  const expected = [8, 7, 6, 5];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// === 内存和性能测试 ===

// Case 19: 反转后立即读取所有字节
test('反转后立即读取所有字节', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  buf.reverse();
  
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    sum += buf[i];
  }
  
  // 总和不变：1+2+...+10 = 55
  return sum === 55 && buf[0] === 10 && buf[9] === 1;
});

// Case 20: 小 Buffer（可能来自 Buffer pool）
test('小 Buffer（8 字节）反转', () => {
  const buf = Buffer.allocUnsafe(8);
  for (let i = 0; i < 8; i++) {
    buf[i] = i * 10;
  }
  
  buf.reverse();
  
  const expected = [70, 60, 50, 40, 30, 20, 10, 0];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// === 特殊 TypedArray 场景 ===

// Case 21: Int8Array 有符号字节反转
test('Int8Array 有符号字节反转', () => {
  const int8 = new Int8Array([-128, -1, 0, 1, 127]);
  Buffer.prototype.reverse.call(int8);
  
  const expected = [127, 1, 0, -1, -128];
  const actual = Array.from(int8);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 22: 自定义 byteOffset 的 TypedArray
test('自定义 byteOffset 的 TypedArray 反转', () => {
  const ab = new ArrayBuffer(16);
  const fullView = new Uint8Array(ab);
  for (let i = 0; i < 16; i++) {
    fullView[i] = i;
  }
  
  // 创建从偏移 4 开始，长度 8 的视图
  const view = new Uint8Array(ab, 4, 8);
  Buffer.prototype.reverse.call(view);
  
  // view 现在应该是 [11, 10, 9, 8, 7, 6, 5, 4]
  const expected = [11, 10, 9, 8, 7, 6, 5, 4];
  const actual = Array.from(view);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// === 混合场景 ===

// Case 23: reverse + slice + reverse 组合
test('reverse → slice → reverse 组合', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  buf.reverse(); // [6, 5, 4, 3, 2, 1]
  const slice = buf.slice(1, 5); // [5, 4, 3, 2]
  slice.reverse(); // [2, 3, 4, 5]
  
  // slice 共享内存，会影响 buf
  // buf 现在是 [6, 2, 3, 4, 5, 1]
  const expectedBuf = [6, 2, 3, 4, 5, 1];
  const expectedSlice = [2, 3, 4, 5];
  
  const actualBuf = Array.from(buf);
  const actualSlice = Array.from(slice);
  
  return JSON.stringify(actualBuf) === JSON.stringify(expectedBuf) &&
         JSON.stringify(actualSlice) === JSON.stringify(expectedSlice);
});

// Case 24: 交替字节模式（0xAA, 0x55）
test('交替字节模式 0xAA/0x55 反转', () => {
  const buf = Buffer.from([0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55]);
  buf.reverse();
  
  // 反转后模式变为 [0x55, 0xAA, ...]
  return buf[0] === 0x55 && buf[1] === 0xAA && buf[7] === 0xAA;
});

// Case 25: 验证 reverse 不改变 buffer.buffer 属性
test('reverse 不改变 buffer.buffer 引用', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const arrayBufferBefore = buf.buffer;
  
  buf.reverse();
  
  const arrayBufferAfter = buf.buffer;
  
  return arrayBufferBefore === arrayBufferAfter &&
         arrayBufferBefore instanceof ArrayBuffer;
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
