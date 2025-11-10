// buf.readBigInt64LE() - Buffer subarray 和 slice 测试
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

// 从 subarray 读取
test('从 subarray 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(100n, 8);
  const sub = buf.subarray(8, 16);
  return sub.readBigInt64LE(0) === 100n;
});

// 从 slice 读取
test('从 slice 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(200n, 8);
  const sliced = buf.slice(8, 16);
  return sliced.readBigInt64LE(0) === 200n;
});

// subarray 修改影响原 Buffer
test('subarray 修改影响原 Buffer', () => {
  const buf = Buffer.alloc(16);
  const sub = buf.subarray(0, 8);
  sub.writeBigInt64LE(300n, 0);
  return buf.readBigInt64LE(0) === 300n;
});

// slice 修改影响原 Buffer（slice 也是引用）
test('slice 修改影响原 Buffer', () => {
  const buf = Buffer.alloc(16);
  const sliced = buf.slice(0, 8);
  sliced.writeBigInt64LE(400n, 0);
  return buf.readBigInt64LE(0) === 400n;
});

// subarray 的 subarray
test('subarray 的 subarray', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigInt64LE(500n, 8);
  const sub1 = buf.subarray(0, 16);
  const sub2 = sub1.subarray(8, 16);
  return sub2.readBigInt64LE(0) === 500n;
});

// 空 subarray
test('空 subarray 读取应抛出错误', () => {
  try {
    const buf = Buffer.alloc(16);
    const sub = buf.subarray(0, 0);
    sub.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// subarray 长度不足 8 字节
test('subarray 长度不足 8 字节应抛出错误', () => {
  try {
    const buf = Buffer.alloc(16);
    const sub = buf.subarray(0, 4);
    sub.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// subarray 恰好 8 字节
test('subarray 恰好 8 字节', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(600n, 4);
  const sub = buf.subarray(4, 12);
  return sub.readBigInt64LE(0) === 600n;
});

// 从大 Buffer 的中间 subarray
test('从大 Buffer 的中间 subarray', () => {
  const buf = Buffer.alloc(1024);
  buf.writeBigInt64LE(700n, 512);
  const sub = buf.subarray(512, 520);
  return sub.readBigInt64LE(0) === 700n;
});

// subarray 越界读取
test('subarray 越界读取应抛出错误', () => {
  try {
    const buf = Buffer.alloc(16);
    const sub = buf.subarray(0, 8);
    sub.readBigInt64LE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 负索引 subarray
test('负索引 subarray', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(800n, 8);
  const sub = buf.subarray(-8);
  return sub.readBigInt64LE(0) === 800n;
});

// 负索引范围 subarray
test('负索引范围 subarray', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(900n, 4);
  const sub = buf.subarray(-12, -4);
  return sub.readBigInt64LE(0) === 900n;
});

// Buffer.from 创建的 subarray
test('Buffer.from 创建的 subarray', () => {
  const buf = Buffer.from([100, 0, 0, 0, 0, 0, 0, 0, 200, 0, 0, 0, 0, 0, 0, 0]);
  const sub = buf.subarray(0, 8);
  return sub.readBigInt64LE(0) === 100n;
});

// 多层嵌套 subarray
test('多层嵌套 subarray', () => {
  const buf = Buffer.alloc(32);
  buf.writeBigInt64LE(1000n, 16);
  const sub1 = buf.subarray(8, 32);
  const sub2 = sub1.subarray(8, 16);
  return sub2.readBigInt64LE(0) === 1000n;
});

// subarray 后原 Buffer 修改
test('subarray 后原 Buffer 修改', () => {
  const buf = Buffer.alloc(16);
  const sub = buf.subarray(0, 8);
  buf.writeBigInt64LE(1100n, 0);
  return sub.readBigInt64LE(0) === 1100n;
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
