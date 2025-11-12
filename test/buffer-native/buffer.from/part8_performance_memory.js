// Buffer.from() - Part 8: Performance and Memory Tests
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

// 大数据测试
test('大字符串 - 1KB', () => {
  const str = 'a'.repeat(1024);
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 1024;
});

test('大字符串 - 10KB', () => {
  const str = 'b'.repeat(10 * 1024);
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 10 * 1024;
});

test('大字符串 - 100KB', () => {
  const str = 'c'.repeat(100 * 1024);
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 100 * 1024;
});

test('大字符串 - 1MB', () => {
  const str = 'd'.repeat(1024 * 1024);
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 1024 * 1024;
});

test('大数组 - 1000 元素', () => {
  const arr = new Array(1000).fill(0).map((_, i) => i % 256);
  const buf = Buffer.from(arr);
  return buf.length === 1000;
});

test('大数组 - 10000 元素', () => {
  const arr = new Array(10000).fill(0).map((_, i) => i % 256);
  const buf = Buffer.from(arr);
  return buf.length === 10000;
});

test('大 ArrayBuffer - 1MB', () => {
  const ab = new ArrayBuffer(1024 * 1024);
  const buf = Buffer.from(ab);
  return buf.length === 1024 * 1024;
});

// 重复操作测试
test('重复创建 - 100 次相同字符串', () => {
  let success = true;
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.from('test', 'utf8');
    if (buf.toString() !== 'test') {
      success = false;
      break;
    }
  }
  return success;
});

test('重复创建 - 100 次不同字符串', () => {
  let success = true;
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.from(`test${i}`, 'utf8');
    if (buf.toString() !== `test${i}`) {
      success = false;
      break;
    }
  }
  return success;
});

test('重复创建 - 100 次数组', () => {
  let success = true;
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.from([1, 2, 3, i % 256]);
    if (buf.length !== 4) {
      success = false;
      break;
    }
  }
  return success;
});

// 混合编码测试
test('混合编码 - 多字节 UTF-8（中文 1000 字符）', () => {
  const str = '中'.repeat(1000);
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 3000 && buf.toString('utf8') === str;
});

test('混合编码 - 多字节 UTF-8（日文 1000 字符）', () => {
  const str = 'あ'.repeat(1000);
  const buf = Buffer.from(str, 'utf8');
  return buf.toString('utf8') === str;
});

test('混合编码 - 4 字节 UTF-8（Emoji 100 个）', () => {
  const str = '😀'.repeat(100);
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 400 && buf.toString('utf8') === str;
});

// Base64 大数据
test('Base64 - 大字符串编码', () => {
  const original = 'A'.repeat(1000);
  const base64 = Buffer.from(original).toString('base64');
  const buf = Buffer.from(base64, 'base64');
  return buf.toString('utf8') === original;
});

test('HEX - 大字符串编码', () => {
  const hex = '41'.repeat(1000); // 'A' 的 hex
  const buf = Buffer.from(hex, 'hex');
  return buf.length === 1000;
});

// 内存隔离验证
test('内存隔离 - 从数组创建后修改原数组', () => {
  const arr = [1, 2, 3, 4, 5];
  const buf = Buffer.from(arr);
  arr[0] = 99;
  return buf[0] === 1;
});

test('内存隔离 - 从 Uint8Array 创建后修改原数组', () => {
  const uint8 = new Uint8Array([10, 20, 30]);
  const buf = Buffer.from(uint8);
  uint8[0] = 99;
  return buf[0] === 10;
});

test('内存隔离 - 从 Buffer 创建后修改原 Buffer', () => {
  const original = Buffer.from([5, 10, 15]);
  const copy = Buffer.from(original);
  original[0] = 99;
  return copy[0] === 5;
});

// 零拷贝行为检测
test('ArrayBuffer 零拷贝 - 修改 ArrayBuffer 影响 Buffer（可能）', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view[0] = 42;
  const buf = Buffer.from(ab);
  const initialValue = buf[0];
  view[0] = 88;
  // 如果是零拷贝，buf[0] 会变成 88；否则仍是 42
  // 这取决于 Node.js 的实现
  return initialValue === 42;
});

// 边界大小测试
test('精确边界 - 255 字节', () => {
  const buf = Buffer.from(new Array(255).fill(128));
  return buf.length === 255;
});

test('精确边界 - 256 字节', () => {
  const buf = Buffer.from(new Array(256).fill(128));
  return buf.length === 256;
});

test('精确边界 - 65535 字节', () => {
  const buf = Buffer.from(new Array(65535).fill(64));
  return buf.length === 65535;
});

test('精确边界 - 65536 字节', () => {
  const buf = Buffer.from(new Array(65536).fill(64));
  return buf.length === 65536;
});

// 快速连续创建
test('快速连续创建 - 1000 个小 Buffer', () => {
  const buffers = [];
  for (let i = 0; i < 1000; i++) {
    buffers.push(Buffer.from([i % 256]));
  }
  return buffers.length === 1000 && buffers[999][0] === 999 % 256;
});

test('快速连续创建 - 100 个大 Buffer', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.from(new Array(1000).fill(i % 256)));
  }
  return buffers.length === 100 && buffers[99].length === 1000;
});

// TypedArray 大数据
test('大 Uint8Array - 10000 字节', () => {
  const uint8 = new Uint8Array(10000);
  for (let i = 0; i < 10000; i++) {
    uint8[i] = i % 256;
  }
  const buf = Buffer.from(uint8);
  return buf.length === 10000 && buf[9999] === 9999 % 256;
});

test('大 Int8Array - 10000 字节', () => {
  const int8 = new Int8Array(10000);
  for (let i = 0; i < 10000; i++) {
    int8[i] = (i % 256) - 128;
  }
  const buf = Buffer.from(int8);
  return buf.length === 10000;
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
