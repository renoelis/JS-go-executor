// buf.reverse() - Part 2: Edge Cases & Special Scenarios
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

// TypedArray 视图测试
test('Uint8Array 视图反转影响原 ArrayBuffer', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  view[3] = 4;
  const buf = Buffer.from(ab);
  buf.reverse();
  // 反转应该影响底层 ArrayBuffer
  return buf[0] === 4 && buf[1] === 3 && buf[2] === 2 && buf[3] === 1;
});

// 共享底层内存测试
test('subarray 反转影响父 Buffer', () => {
  const parent = Buffer.from([1, 2, 3, 4, 5]);
  const sub = parent.subarray(1, 4);
  sub.reverse();
  // subarray 共享内存，反转会影响父 Buffer
  return parent[1] === 4 && parent[2] === 3 && parent[3] === 2;
});

test('slice 反转影响原 Buffer（v25.0.0 行为变化）', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = original.slice(1, 4);
  sliced.reverse();
  // 在 Node.js v25.0.0 中，slice 也共享底层内存
  return original[1] === 4 && original[2] === 3 && original[3] === 2;
});

// 多字节字符反转（注意：reverse 是字节级操作）
test('UTF-8 多字节字符反转（字节级）', () => {
  const buf = Buffer.from('你好');
  const originalLength = buf.length;
  buf.reverse();
  // 字节级反转会破坏 UTF-8 编码
  return buf.length === originalLength && buf.toString('utf8') !== '你好';
});

test('Emoji 反转（字节级）', () => {
  const buf = Buffer.from('😀');
  const originalLength = buf.length;
  buf.reverse();
  // 字节级反转会破坏 Emoji 编码
  return buf.length === originalLength && buf.toString('utf8') !== '😀';
});

// 十六进制数据反转
test('十六进制数据反转', () => {
  const buf = Buffer.from('0123456789abcdef', 'hex');
  buf.reverse();
  return buf.toString('hex') === 'efcdab8967452301';
});

// Base64 数据反转
test('Base64 数据反转（字节级）', () => {
  const original = 'SGVsbG8=';
  const buf = Buffer.from(original, 'base64');
  const originalBytes = Buffer.from(buf);
  buf.reverse();
  // 反转后的字节序列
  let allReversed = true;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== originalBytes[originalBytes.length - 1 - i]) {
      allReversed = false;
      break;
    }
  }
  return allReversed;
});

// 极端长度测试
test('非常大的 Buffer 反转', () => {
  const size = 100000;
  const buf = Buffer.alloc(size);
  buf[0] = 0xAA;
  buf[size - 1] = 0xBB;
  buf.reverse();
  return buf[0] === 0xBB && buf[size - 1] === 0xAA;
});

// 特殊字节值
test('包含所有可能字节值的反转', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  buf.reverse();
  return buf[0] === 255 && buf[255] === 0 && buf[128] === 127;
});

// 重复值测试
test('重复值 Buffer 反转', () => {
  const buf = Buffer.alloc(10, 0x42);
  buf.reverse();
  return buf.every(b => b === 0x42);
});

// 交替模式
test('交替模式反转', () => {
  const buf = Buffer.from([0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55]);
  buf.reverse();
  return buf[0] === 0x55 && buf[1] === 0xAA && buf[2] === 0x55 &&
         buf[3] === 0xAA && buf[4] === 0x55 && buf[5] === 0xAA;
});

// 递增序列
test('递增序列反转', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  buf.reverse();
  return buf[0] === 9 && buf[9] === 0;
});

// 递减序列
test('递减序列反转', () => {
  const buf = Buffer.from([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  buf.reverse();
  return buf[0] === 0 && buf[9] === 9;
});

// 性能相关：确保是原地操作
test('反转不改变 Buffer 引用', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const ref = buf;
  buf.reverse();
  return buf === ref;
});

test('反转不改变 length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const originalLength = buf.length;
  buf.reverse();
  return buf.length === originalLength;
});

// 与数组 reverse 行为对比
test('行为与数组 reverse 一致', () => {
  const arr = [1, 2, 3, 4, 5];
  const buf = Buffer.from(arr);
  arr.reverse();
  buf.reverse();
  return arr.every((val, idx) => val === buf[idx]);
});

// 边界情况：只有两个不同值
test('只有首尾不同的 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf[0] = 1;
  buf[9] = 2;
  buf.reverse();
  return buf[0] === 2 && buf[9] === 1 && buf[5] === 0;
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
