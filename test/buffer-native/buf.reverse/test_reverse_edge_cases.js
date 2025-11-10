// buf.reverse() - 边界与极端情况测试
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

// Case 1: 包含全 0 字节的 Buffer
test('包含全 0 字节的 Buffer 反转', () => {
  const buf = Buffer.alloc(5);
  buf.reverse();
  const expected = [0, 0, 0, 0, 0];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 2: 包含全 0xFF 字节的 Buffer
test('包含全 0xFF 字节的 Buffer 反转', () => {
  const buf = Buffer.alloc(4, 0xFF);
  buf.reverse();
  const expected = [0xFF, 0xFF, 0xFF, 0xFF];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 3: 包含所有可能字节值（0x00 - 0xFF）
test('包含所有可能字节值（0x00 - 0xFF）的反转', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  buf.reverse();

  const expected = [];
  for (let i = 255; i >= 0; i--) {
    expected.push(i);
  }

  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 4: 较大的 Buffer（10KB）
test('较大的 Buffer（10KB）反转', () => {
  const size = 10 * 1024;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf[i] = i % 256;
  }

  const firstBefore = buf[0];
  const lastBefore = buf[size - 1];

  buf.reverse();

  const firstAfter = buf[0];
  const lastAfter = buf[size - 1];

  return firstAfter === lastBefore && lastAfter === firstBefore;
});

// Case 5: 超大 Buffer（1MB）
test('超大 Buffer（1MB）反转', () => {
  const size = 1024 * 1024;
  const buf = Buffer.alloc(size);
  buf[0] = 0xAA;
  buf[size - 1] = 0xBB;

  buf.reverse();

  return buf[0] === 0xBB && buf[size - 1] === 0xAA;
});

// Case 6: 对称 Buffer 反转结果相同
test('对称 Buffer 反转结果相同', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);
  const originalBytes = Array.from(buf);
  buf.reverse();
  const reversedBytes = Array.from(buf);

  return JSON.stringify(originalBytes) === JSON.stringify(reversedBytes);
});

// Case 7: 包含重复字节的 Buffer
test('包含重复字节的 Buffer 反转', () => {
  const buf = Buffer.from([5, 5, 5, 5, 5]);
  buf.reverse();
  const expected = [5, 5, 5, 5, 5];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 8: 长度为奇数的 Buffer（中间元素保持不变）
test('长度为奇数的 Buffer - 中间元素保持不变', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const middleBefore = buf[2];
  buf.reverse();
  const middleAfter = buf[2];

  const expected = [50, 40, 30, 20, 10];
  const actual = Array.from(buf);

  return middleBefore === 30 && middleAfter === 30 &&
         JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 9: 包含 NUL 字符的 Buffer（C 风格字符串）
test('包含 NUL 字符的 Buffer 反转', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x00]); // "Hello\0"
  buf.reverse();
  const expected = [0x00, 0x6F, 0x6C, 0x6C, 0x65, 0x48]; // "\0olleH"
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 10: 反转多次保持幂等性（偶数次反转）
test('反转 4 次（偶数）后恢复原样', () => {
  const original = Buffer.from([11, 22, 33, 44, 55]);
  const originalBytes = Array.from(original);
  original.reverse().reverse().reverse().reverse();
  const actualBytes = Array.from(original);

  return JSON.stringify(originalBytes) === JSON.stringify(actualBytes);
});

// Case 11: 交替字节模式反转
test('交替字节模式（0xAA/0x55）反转', () => {
  const buf = Buffer.from([0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55]);
  buf.reverse();
  const expected = [0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 12: 递增序列反转为递减序列
test('递增序列反转为递减序列', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  buf.reverse();
  const expected = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 13: 包含最大字节值边界
test('包含最大字节值边界（0, 1, 254, 255）', () => {
  const buf = Buffer.from([0, 1, 254, 255]);
  buf.reverse();
  const expected = [255, 254, 1, 0];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 14: 二进制数据（如图片头部字节）反转
test('二进制数据（JPEG 头部分）反转', () => {
  const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG 文件头部分字节
  buf.reverse();
  const expected = [0xE0, 0xFF, 0xD8, 0xFF];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 15: 包含随机字节的 Buffer
test('包含随机字节的 Buffer 反转', () => {
  const buf = Buffer.from([231, 43, 109, 87, 12, 200, 156, 77]);
  const originalFirst = buf[0];
  const originalLast = buf[7];
  buf.reverse();
  return buf[0] === originalLast && buf[7] === originalFirst;
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
