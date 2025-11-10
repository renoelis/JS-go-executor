// buf.readBigUInt64BE() - Buffer 长度边界测试
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

// 精确长度测试
test('Buffer 长度刚好 8 字节，offset = 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(123n, 0);
  return buf.readBigUInt64BE(0) === 123n;
});

test('Buffer 长度 9 字节，offset = 0', () => {
  const buf = Buffer.alloc(9);
  buf.writeBigUInt64BE(456n, 0);
  return buf.readBigUInt64BE(0) === 456n;
});

test('Buffer 长度 9 字节，offset = 1', () => {
  const buf = Buffer.alloc(9);
  buf.writeBigUInt64BE(789n, 1);
  return buf.readBigUInt64BE(1) === 789n;
});

test('Buffer 长度 9 字节，offset = 2（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(9);
    buf.readBigUInt64BE(2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度 15 字节，offset = 7', () => {
  const buf = Buffer.alloc(15);
  buf.writeBigUInt64BE(111n, 7);
  return buf.readBigUInt64BE(7) === 111n;
});

test('Buffer 长度 15 字节，offset = 8（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(15);
    buf.readBigUInt64BE(8);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度 16 字节，offset = 8', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(222n, 8);
  return buf.readBigUInt64BE(8) === 222n;
});

test('Buffer 长度 16 字节，offset = 9（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigUInt64BE(9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度 100 字节，offset = 92', () => {
  const buf = Buffer.alloc(100);
  buf.writeBigUInt64BE(333n, 92);
  return buf.readBigUInt64BE(92) === 333n;
});

test('Buffer 长度 100 字节，offset = 93（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(100);
    buf.readBigUInt64BE(93);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 边界条件：buf.length - 8
test('验证 offset <= buf.length - 8 的边界', () => {
  const buf = Buffer.alloc(20);
  buf.writeBigUInt64BE(444n, 12);
  return buf.readBigUInt64BE(12) === 444n;
});

test('验证 offset > buf.length - 8 抛出错误', () => {
  try {
    const buf = Buffer.alloc(20);
    buf.readBigUInt64BE(13);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊长度
test('Buffer 长度 7 字节（不足 8 字节）', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readBigUInt64BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度 6 字节（不足 8 字节）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readBigUInt64BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度 5 字节（不足 8 字节）', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.readBigUInt64BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度 4 字节（不足 8 字节）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readBigUInt64BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度 3 字节（不足 8 字节）', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readBigUInt64BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度 2 字节（不足 8 字节）', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.readBigUInt64BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度 1 字节（不足 8 字节）', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readBigUInt64BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
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
