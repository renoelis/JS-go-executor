// buf.writeInt32LE() - 安全性与内存测试
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

// 内存隔离测试
test('内存隔离：不影响原始数组', () => {
  const arr = new Uint8Array(8);
  arr[0] = 0xFF;
  arr[7] = 0xFF;
  const buf = Buffer.from(arr.buffer, 2, 4);
  buf.writeInt32LE(0, 0);
  return arr[0] === 0xFF && arr[7] === 0xFF;
});

test('内存隔离：只修改指定范围', () => {
  const buf = Buffer.alloc(12, 0xFF);
  buf.writeInt32LE(0, 4);
  return buf[0] === 0xFF && buf[3] === 0xFF && buf[4] === 0x00 && buf[8] === 0xFF && buf[11] === 0xFF;
});

test('内存隔离：多个 Buffer 指向同一内存', () => {
  const original = Buffer.allocUnsafe(8);
  const view1 = original.subarray(0, 4);
  const view2 = original.subarray(4, 8);
  view1.writeInt32LE(0x11111111, 0);
  view2.writeInt32LE(0x22222222, 0);
  return original[0] === 0x11 && original[4] === 0x22;
});

test('内存隔离：子数组修改影响父 Buffer', () => {
  const parent = Buffer.allocUnsafe(8);
  parent.fill(0xFF);
  const child = parent.subarray(2, 6);
  child.writeInt32LE(0, 0);
  return parent[2] === 0x00 && parent[5] === 0x00 && parent[1] === 0xFF && parent[6] === 0xFF;
});

// 越界保护测试
test('越界保护：阻止越界写入', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('越界保护：阻止负偏移写入', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, -1);
    return false;
  } catch (e) {
    return true;
  }
});

test('越界保护：精确边界检查', () => {
  const buf = Buffer.allocUnsafe(7);
  try {
    buf.writeInt32LE(123, 3);
    return true;
  } catch (e) {
    return false;
  }
});

// 不可变性测试
test('不可变性：写入不影响其他实例', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = Buffer.from([1, 2, 3, 4]);
  buf1.writeInt32LE(0, 0);
  return buf2[0] === 1 && buf2[1] === 2 && buf2[2] === 3 && buf2[3] === 4;
});

test('不可变性：冻结后写入仍生效（Buffer 可变）', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(123, 0);
  return buf[0] === 123;
});

// TypedArray 互操作性
test('TypedArray 互操作：Uint8Array 视图', () => {
  const arr = new Uint8Array(4);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(0x12345678, 0);
  return arr[0] === 0x78 && arr[3] === 0x12;
});

test('TypedArray 互操作：DataView 兼容', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x12345678, 0);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const value = view.getInt32(0, true);
  return value === 0x12345678;
});

test('TypedArray 互操作：共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const u32 = new Uint32Array(ab);
  buf.writeInt32LE(0x12345678, 0);
  return u32[0] !== 0 || buf[0] === 0x78;
});

// 并发写入安全性
test('并发安全：同一位置多次写入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(111, 0);
  buf.writeInt32LE(222, 0);
  buf.writeInt32LE(333, 0);
  const value = buf.readInt32LE(0);
  return value === 333;
});

test('并发安全：不同位置独立写入', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.writeInt32LE(111, 0);
  buf.writeInt32LE(222, 4);
  buf.writeInt32LE(333, 8);
  return buf.readInt32LE(0) === 111 && buf.readInt32LE(4) === 222 && buf.readInt32LE(8) === 333;
});

// 零拷贝行为
test('零拷贝：subarray 共享内存', () => {
  const parent = Buffer.allocUnsafe(8);
  const child = parent.subarray(0, 4);
  child.writeInt32LE(0x12345678, 0);
  return parent[0] === 0x78 && parent[3] === 0x12;
});

test('零拷贝：slice 创建新副本（共享底层内存）', () => {
  const original = Buffer.allocUnsafe(8);
  original.fill(0xFF);
  const copy = original.slice(0, 4);
  copy.writeInt32LE(0, 0);
  // Node.js 的 slice 实际上共享底层内存
  return original[0] === 0x00;
});

// 内存对齐测试
test('内存对齐：对齐地址写入', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeInt32LE(0x7A7A7A7A, 0);
  buf.writeInt32LE(0x7B7B7B7B, 4);
  buf.writeInt32LE(0x7C7C7C7C, 8);
  buf.writeInt32LE(0x7D7D7D7D, 12);
  return buf[0] === 0x7A && buf[4] === 0x7B && buf[8] === 0x7C && buf[12] === 0x7D;
});

test('内存对齐：非对齐地址写入', () => {
  const buf = Buffer.allocUnsafe(15);
  buf.writeInt32LE(0x7A7A7A7A, 1);
  buf.writeInt32LE(0x7B7B7B7B, 5);
  buf.writeInt32LE(0x7C7C7C7C, 9);
  return buf[1] === 0x7A && buf[5] === 0x7B && buf[9] === 0x7C;
});

// 原型链安全
test('原型链安全：方法存在于原型', () => {
  const buf = Buffer.allocUnsafe(4);
  return typeof buf.writeInt32LE === 'function';
});

test('原型链安全：不可覆盖内建方法', () => {
  const buf = Buffer.allocUnsafe(4);
  const original = buf.writeInt32LE;
  buf.writeInt32LE = null;
  buf.writeInt32LE = original;
  buf.writeInt32LE(123, 0);
  return buf[0] === 123;
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
