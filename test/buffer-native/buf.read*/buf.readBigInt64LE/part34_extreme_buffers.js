// buf.readBigInt64LE() - 极端 Buffer 大小和场景测试
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

// 最小有效 Buffer
test('最小有效 Buffer（8字节）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(123n, 0);
  return buf.readBigInt64LE(0) === 123n;
});

test('小于8字节的 Buffer 抛出错误', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('1字节 Buffer 抛出错误', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('空 Buffer（0字节）抛出错误', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 大 Buffer 测试
test('大 Buffer（1KB）在起始位置读取', () => {
  const buf = Buffer.alloc(1024);
  buf.writeBigInt64LE(456n, 0);
  return buf.readBigInt64LE(0) === 456n;
});

test('大 Buffer（1KB）在末尾位置读取', () => {
  const buf = Buffer.alloc(1024);
  buf.writeBigInt64LE(789n, 1016);
  return buf.readBigInt64LE(1016) === 789n;
});

test('大 Buffer（1MB）读取', () => {
  const buf = Buffer.alloc(1024 * 1024);
  buf.writeBigInt64LE(999n, 0);
  return buf.readBigInt64LE(0) === 999n;
});

test('大 Buffer（10MB）读取', () => {
  try {
    const buf = Buffer.alloc(10 * 1024 * 1024);
    buf.writeBigInt64LE(1234n, 0);
    return buf.readBigInt64LE(0) === 1234n;
  } catch (e) {
    // 某些环境可能内存不足
    return e.name === 'RangeError' || e.message.includes('memory');
  }
});

// 多个值在大 Buffer 中
test('大 Buffer 中多个位置读取', () => {
  const buf = Buffer.alloc(1024);
  buf.writeBigInt64LE(100n, 0);
  buf.writeBigInt64LE(200n, 512);
  buf.writeBigInt64LE(300n, 1016);
  return buf.readBigInt64LE(0) === 100n &&
         buf.readBigInt64LE(512) === 200n &&
         buf.readBigInt64LE(1016) === 300n;
});

// Buffer.from 创建的 Buffer
test('Buffer.from 字节数组（8字节）', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigInt64LE(0) === 256n;
});

test('Buffer.from 字节数组（小于8字节）抛出错误', () => {
  try {
    const buf = Buffer.from([0x00, 0x01, 0x02]);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Buffer.allocUnsafe 测试
test('Buffer.allocUnsafe 可以读取', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64LE(555n, 0);
  return buf.readBigInt64LE(0) === 555n;
});

test('Buffer.allocUnsafe 大 Buffer', () => {
  const buf = Buffer.allocUnsafe(1024);
  buf.writeBigInt64LE(666n, 100);
  return buf.readBigInt64LE(100) === 666n;
});

// 连续分配和读取
test('连续分配多个 Buffer 并读取', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(BigInt(i), 0);
    buffers.push(buf);
  }
  return buffers.every((buf, i) => buf.readBigInt64LE(0) === BigInt(i));
});

// Buffer.concat 测试
test('Buffer.concat 后读取', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigInt64LE(111n, 0);
  buf2.writeBigInt64LE(222n, 0);
  const combined = Buffer.concat([buf1, buf2]);
  return combined.readBigInt64LE(0) === 111n && combined.readBigInt64LE(8) === 222n;
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
