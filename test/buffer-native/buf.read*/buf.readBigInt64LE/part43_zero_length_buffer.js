// buf.readBigInt64LE() - 零长度和极小 Buffer 测试
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

// 零长度 Buffer
test('Buffer.alloc(0) offset=0 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer.alloc(0) 默认 offset 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readBigInt64LE();
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer.from([]) 应抛出错误', () => {
  try {
    const buf = Buffer.from([]);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 长度不足的 Buffer
test('Buffer.alloc(1) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer.alloc(2) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer.alloc(3) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer.alloc(4) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer.alloc(5) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer.alloc(6) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer.alloc(7) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 恰好 8 字节
test('Buffer.alloc(8) offset=0 应成功', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(12345n, 0);
  return buf.readBigInt64LE(0) === 12345n;
});

test('Buffer.alloc(8) offset=1 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 9 字节 Buffer
test('Buffer.alloc(9) offset=0 应成功', () => {
  const buf = Buffer.alloc(9);
  buf.writeBigInt64LE(99999n, 0);
  return buf.readBigInt64LE(0) === 99999n;
});

test('Buffer.alloc(9) offset=1 应成功', () => {
  const buf = Buffer.alloc(9);
  buf.writeBigInt64LE(77777n, 1);
  return buf.readBigInt64LE(1) === 77777n;
});

test('Buffer.alloc(9) offset=2 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(9);
    buf.readBigInt64LE(2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 边界测试
test('Buffer.alloc(15) offset=7 应成功', () => {
  const buf = Buffer.alloc(15);
  buf.writeBigInt64LE(55555n, 7);
  return buf.readBigInt64LE(7) === 55555n;
});

test('Buffer.alloc(15) offset=8 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(15);
    buf.readBigInt64LE(8);
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
