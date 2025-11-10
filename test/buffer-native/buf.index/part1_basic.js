// buf[index] - Part 1: Basic Functionality Tests
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

// 基本读取测试
test('读取索引 0', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  return buf[0] === 0x41;
});

test('读取索引 1', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  return buf[1] === 0x42;
});

test('读取最后一个索引', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  return buf[2] === 0x43;
});

test('读取所有字节', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 4 && buf[4] === 5;
});

// 基本写入测试
test('写入索引 0', () => {
  const buf = Buffer.alloc(3);
  buf[0] = 0x41;
  return buf[0] === 0x41;
});

test('写入索引 1', () => {
  const buf = Buffer.alloc(3);
  buf[1] = 0x42;
  return buf[1] === 0x42;
});

test('写入最后一个索引', () => {
  const buf = Buffer.alloc(3);
  buf[2] = 0x43;
  return buf[2] === 0x43;
});

test('写入所有字节', () => {
  const buf = Buffer.alloc(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 4 && buf[4] === 5;
});

// 读写混合
test('读写混合操作', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00]);
  buf[0] = 0x41;
  buf[1] = buf[0] + 1;
  buf[2] = buf[1] + 1;
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x43;
});

// 边界值测试
test('写入 0', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 0;
  return buf[0] === 0;
});

test('写入 255', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 255;
  return buf[0] === 255;
});

test('写入 0xFF', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 0xFF;
  return buf[0] === 0xFF;
});

// 空 Buffer
test('空 Buffer 读取索引 0', () => {
  const buf = Buffer.alloc(0);
  return buf[0] === undefined;
});

// 单字节 Buffer
test('单字节 Buffer 读取', () => {
  const buf = Buffer.from([0x42]);
  return buf[0] === 0x42;
});

test('单字节 Buffer 写入', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 0x42;
  return buf[0] === 0x42;
});

// 使用 length 属性
test('使用 length 读取最后一个元素', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf[buf.length - 1] === 5;
});

test('使用 length 写入最后一个元素', () => {
  const buf = Buffer.alloc(5);
  buf[buf.length - 1] = 99;
  return buf[4] === 99;
});

// 遍历测试
test('for 循环遍历', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    sum += buf[i];
  }
  return sum === 15;
});

test('修改所有元素', () => {
  const buf = Buffer.alloc(5);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i + 1;
  }
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 4 && buf[4] === 5;
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
