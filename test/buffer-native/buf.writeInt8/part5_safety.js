// buf.writeInt8() - Safety and Memory Tests
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

// 内存安全测试
test('写入不影响其他位置', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  buf.writeInt8(0, 2);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0 && buf[3] === 0xFF;
});

test('越界写入被拒绝，不破坏 buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  try {
    buf.writeInt8(99, 10);
  } catch (e) {
    return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && buf[3] === 4;
  }
  return false;
});

test('负 offset 不破坏 buffer', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  try {
    buf.writeInt8(99, -5);
  } catch (e) {
    return buf[0] === 10 && buf[1] === 20 && buf[2] === 30 && buf[3] === 40;
  }
  return false;
});

// 视图独立性
test('subarray 写入不影响其他 subarray', () => {
  const buf = Buffer.alloc(10);
  const slice1 = buf.subarray(0, 5);
  const slice2 = buf.subarray(5, 10);
  slice1.writeInt8(100, 0);
  slice2.writeInt8(-56, 0);
  return slice1[0] === 100 && slice2[0] === 200 && buf[0] === 100 && buf[5] === 200;
});

test('Buffer.from TypedArray 修改不影响原数组索引以外', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(arr);
  buf.writeInt8(99, 2);
  return buf[2] === 99 && buf[1] === 2 && buf[3] === 4;
});

// 并发写入（模拟）
test('多次写入不同位置互不干扰', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf.writeInt8(i - 50, i);
  }
  let pass = true;
  for (let i = 0; i < 100; i++) {
    const expected = ((i - 50) & 0xFF);
    if (buf[i] !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// 只读 buffer 不存在（Node.js Buffer 都可写）
test('Buffer.from 创建的 buffer 可写', () => {
  const buf = Buffer.from([0, 0, 0]);
  buf.writeInt8(42, 1);
  return buf[1] === 42;
});

// 内存对齐问题（writeInt8 只占 1 字节，无对齐要求）
test('非对齐 offset 正常写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt8(11, 1);
  buf.writeInt8(22, 3);
  buf.writeInt8(33, 7);
  return buf[1] === 11 && buf[3] === 22 && buf[7] === 33;
});

// TypedArray 互操作
test('通过 DataView 验证写入的值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(-100, 2);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  return dv.getInt8(2) === -100;
});

test('写入后 Uint8Array 看到无符号值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(-50, 1);
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  return u8[1] === (256 - 50);
});

// 空间不足保护
test('精确边界写入成功', () => {
  const buf = Buffer.alloc(5);
  const result = buf.writeInt8(123, 4);
  return result === 5 && buf[4] === 123;
});

test('超出边界一个字节失败', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.writeInt8(123, 5);
    return false;
  } catch (e) {
    return true;
  }
});

// 冻结对象测试（Buffer 不支持 freeze，但测试行为）
test('尝试在已填充的 buffer 上覆盖写入', () => {
  const buf = Buffer.alloc(4, 0xAA);
  buf.writeInt8(0x55, 2);
  return buf[0] === 0xAA && buf[2] === 0x55 && buf[3] === 0xAA;
});

// 极端内存大小
test('在接近最大偏移处写入', () => {
  const size = 10000;
  const buf = Buffer.alloc(size);
  const result = buf.writeInt8(127, size - 1);
  return result === size && buf[size - 1] === 127;
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
