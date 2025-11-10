// buf.readBigUInt64LE() - 极端 Buffer 大小和场景测试
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
  buf.writeBigUInt64LE(123n, 0);
  return buf.readBigUInt64LE(0) === 123n;
});

test('小于8字节的 Buffer 抛出错误', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readBigUInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('1字节 Buffer 抛出错误', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readBigUInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('空 Buffer（0字节）抛出错误', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readBigUInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 大 Buffer
test('大 Buffer（1KB）', () => {
  const buf = Buffer.alloc(1024);
  const offset = 512;
  buf.writeBigUInt64LE(999n, offset);
  return buf.readBigUInt64LE(offset) === 999n;
});

test('大 Buffer（10KB）', () => {
  const buf = Buffer.alloc(10240);
  const offset = 5000;
  buf.writeBigUInt64LE(888n, offset);
  return buf.readBigUInt64LE(offset) === 888n;
});

test('大 Buffer（100KB）', () => {
  const buf = Buffer.alloc(102400);
  const offset = 50000;
  buf.writeBigUInt64LE(777n, offset);
  return buf.readBigUInt64LE(offset) === 777n;
});

// 不同大小的 Buffer
test('9字节 Buffer，offset=0', () => {
  const buf = Buffer.alloc(9);
  buf.writeBigUInt64LE(111n, 0);
  return buf.readBigUInt64LE(0) === 111n;
});

test('9字节 Buffer，offset=1', () => {
  const buf = Buffer.alloc(9);
  buf.writeBigUInt64LE(222n, 1);
  return buf.readBigUInt64LE(1) === 222n;
});

test('16字节 Buffer，offset=8', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(333n, 8);
  return buf.readBigUInt64LE(8) === 333n;
});

test('100字节 Buffer，offset=92', () => {
  const buf = Buffer.alloc(100);
  buf.writeBigUInt64LE(444n, 92);
  return buf.readBigUInt64LE(92) === 444n;
});

// 奇数大小的 Buffer
test('15字节 Buffer（奇数）', () => {
  const buf = Buffer.alloc(15);
  buf.writeBigUInt64LE(555n, 0);
  return buf.readBigUInt64LE(0) === 555n;
});

test('17字节 Buffer（奇数）', () => {
  const buf = Buffer.alloc(17);
  buf.writeBigUInt64LE(666n, 9);
  return buf.readBigUInt64LE(9) === 666n;
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
