// buf.length - Part 5: Edge Cases and Boundary Tests
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

// 边界测试
test('最小长度 buffer', () => {
  const buf = Buffer.alloc(1);
  return buf.length === 1;
});

test('大尺寸 buffer - 1KB', () => {
  const buf = Buffer.alloc(1024);
  return buf.length === 1024;
});

test('大尺寸 buffer - 1MB', () => {
  const buf = Buffer.alloc(1024 * 1024);
  return buf.length === 1024 * 1024;
});

test('大尺寸 buffer - 10MB', () => {
  const buf = Buffer.alloc(10 * 1024 * 1024);
  return buf.length === 10 * 1024 * 1024;
});

// slice 边界测试
test('slice 从开始到结束', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(0, 10);
  return slice.length === 10;
});

test('slice 负索引', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(-5);
  return slice.length === 5;
});

test('slice 负索引范围', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(-8, -3);
  return slice.length === 5;
});

test('slice 超出范围', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(0, 100);
  return slice.length === 10;
});

test('slice 空范围', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5, 5);
  return slice.length === 0;
});

test('slice 反向范围', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(8, 3);
  return slice.length === 0;
});

// subarray 边界测试
test('subarray 从开始到结束', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(0, 10);
  return sub.length === 10;
});

test('subarray 负索引', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(-5);
  return sub.length === 5;
});

test('subarray 负索引范围', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(-8, -3);
  return sub.length === 5;
});

test('subarray 超出范围', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(0, 100);
  return sub.length === 10;
});

test('subarray 空范围', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(5, 5);
  return sub.length === 0;
});

// 特殊字符测试
test('包含 null 字节的长度', () => {
  const buf = Buffer.from([0, 1, 2, 0, 3]);
  return buf.length === 5;
});

test('全是 null 字节的长度', () => {
  const buf = Buffer.from([0, 0, 0, 0]);
  return buf.length === 4;
});

test('包含高位字节的长度', () => {
  const buf = Buffer.from([255, 254, 253]);
  return buf.length === 3;
});

// 与 byteLength 的关系
test('length 等于 byteLength', () => {
  const buf = Buffer.from('hello world');
  return buf.length === buf.byteLength;
});

test('空 buffer 的 length 和 byteLength', () => {
  const buf = Buffer.alloc(0);
  return buf.length === buf.byteLength && buf.length === 0;
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
