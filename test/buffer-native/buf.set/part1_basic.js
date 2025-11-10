// buf.set() - Part 1: Basic Functionality Tests
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

// 基本功能测试
test('从数组设置（默认 offset 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3]);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 0 && buf[4] === 0;
});

test('从数组设置（指定 offset）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], 2);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && 
         buf[3] === 2 && buf[4] === 3;
});

test('从 Uint8Array 设置', () => {
  const buf = Buffer.alloc(5);
  const uint8 = new Uint8Array([10, 20, 30]);
  buf.set(uint8);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

test('从 Uint8Array 设置（指定 offset）', () => {
  const buf = Buffer.alloc(5);
  const uint8 = new Uint8Array([10, 20, 30]);
  buf.set(uint8, 1);
  return buf[0] === 0 && buf[1] === 10 && buf[2] === 20 && buf[3] === 30;
});

test('从 Buffer 设置', () => {
  const buf = Buffer.alloc(5);
  const source = Buffer.from([100, 101, 102]);
  buf.set(source);
  return buf[0] === 100 && buf[1] === 101 && buf[2] === 102;
});

test('从 Buffer 设置（指定 offset）', () => {
  const buf = Buffer.alloc(5);
  const source = Buffer.from([100, 101, 102]);
  buf.set(source, 2);
  return buf[2] === 100 && buf[3] === 101 && buf[4] === 102;
});

// 返回值测试（set 方法无返回值或返回 undefined）
test('set 返回 undefined', () => {
  const buf = Buffer.alloc(5);
  const result = buf.set([1, 2, 3]);
  return result === undefined;
});

// 空数组测试
test('设置空数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.set([]);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('设置空 Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.set(new Uint8Array([]));
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 完全覆盖
test('完全覆盖 Buffer', () => {
  const buf = Buffer.alloc(3);
  buf.set([10, 20, 30]);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

// 部分覆盖
test('部分覆盖 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.set([99, 88], 1);
  return buf[0] === 1 && buf[1] === 99 && buf[2] === 88 && 
         buf[3] === 4 && buf[4] === 5;
});

// 单字节设置
test('设置单个字节', () => {
  const buf = Buffer.alloc(3);
  buf.set([42], 1);
  return buf[0] === 0 && buf[1] === 42 && buf[2] === 0;
});

// 不同 TypedArray 类型
test('从 Uint16Array 设置', () => {
  const buf = Buffer.alloc(4);
  const uint16 = new Uint16Array([0x0102, 0x0304]);
  buf.set(uint16);
  // Uint16Array 的每个元素会被截断为 uint8
  return buf[0] === 0x02 && buf[1] === 0x04;
});

test('从 Int8Array 设置', () => {
  const buf = Buffer.alloc(3);
  const int8 = new Int8Array([-1, 0, 127]);
  buf.set(int8);
  return buf[0] === 255 && buf[1] === 0 && buf[2] === 127;
});

test('从 Uint32Array 设置', () => {
  const buf = Buffer.alloc(3);
  const uint32 = new Uint32Array([0x12345678, 0xABCDEF00, 0xFF]);
  buf.set(uint32);
  // 每个元素截断为 uint8
  return buf[0] === 0x78 && buf[1] === 0x00 && buf[2] === 0xFF;
});

// offset 为 0
test('offset 为 0（显式指定）', () => {
  const buf = Buffer.alloc(3);
  buf.set([1, 2, 3], 0);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 连续多次 set
test('连续多次 set', () => {
  const buf = Buffer.alloc(6);
  buf.set([1, 2], 0);
  buf.set([3, 4], 2);
  buf.set([5, 6], 4);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 4 && buf[4] === 5 && buf[5] === 6;
});

// 覆盖已有数据
test('覆盖已有数据', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.set([99, 88, 77], 1);
  return buf[0] === 1 && buf[1] === 99 && buf[2] === 88 && 
         buf[3] === 77 && buf[4] === 5;
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
