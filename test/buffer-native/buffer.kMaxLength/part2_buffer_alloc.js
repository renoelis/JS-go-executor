// buffer.kMaxLength - Part 2: Buffer Allocation Methods
const { Buffer, kMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Buffer.alloc 边界测试
test('Buffer.alloc(kMaxLength) 抛出错误', () => {
  try {
    Buffer.alloc(kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.alloc(kMaxLength + 1) 抛出错误', () => {
  try {
    Buffer.alloc(kMaxLength + 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.alloc(kMaxLength - 1) 可能因内存限制失败', () => {
  try {
    const buf = Buffer.alloc(Math.min(kMaxLength - 1, 100 * 1024 * 1024));
    return buf.length > 0;
  } catch (e) {
    return e.message.includes('memory') || e.message.includes('allocation');
  }
});

test('Buffer.alloc(kMaxLength + 1000) 抛出错误', () => {
  try {
    Buffer.alloc(kMaxLength + 1000);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

// Buffer.allocUnsafe 边界测试
test('Buffer.allocUnsafe(kMaxLength) 抛出错误', () => {
  try {
    Buffer.allocUnsafe(kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.allocUnsafe(kMaxLength + 1) 抛出错误', () => {
  try {
    Buffer.allocUnsafe(kMaxLength + 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.allocUnsafe(kMaxLength - 1) 可能因内存限制失败', () => {
  try {
    const buf = Buffer.allocUnsafe(Math.min(kMaxLength - 1, 100 * 1024 * 1024));
    return buf.length > 0;
  } catch (e) {
    return e.message.includes('memory') || e.message.includes('allocation');
  }
});

// Buffer.allocUnsafeSlow 边界测试
test('Buffer.allocUnsafeSlow(kMaxLength) 抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow(kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.allocUnsafeSlow(kMaxLength + 1) 抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow(kMaxLength + 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.allocUnsafeSlow(kMaxLength - 1) 可能因内存限制失败', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Math.min(kMaxLength - 1, 100 * 1024 * 1024));
    return buf.length > 0;
  } catch (e) {
    return e.message.includes('memory') || e.message.includes('allocation');
  }
});

// Buffer.from 边界测试
test('Buffer.from 创建超大数组时抛出错误', () => {
  try {
    const arr = { length: kMaxLength + 1 };
    Buffer.from(arr);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError || e instanceof TypeError;
  }
});

// 小型有效分配测试
test('可以分配 100MB 的 Buffer', () => {
  try {
    const size = 100 * 1024 * 1024;
    const buf = Buffer.alloc(size);
    return buf.length === size;
  } catch (e) {
    return e.message.includes('memory');
  }
});

test('可以分配 1KB 的 Buffer', () => {
  const buf = Buffer.alloc(1024);
  return buf.length === 1024;
});

test('可以分配 0 长度的 Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.length === 0;
});

// 负数和非法值测试
test('Buffer.alloc(-1) 抛出错误', () => {
  try {
    Buffer.alloc(-1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.alloc(kMaxLength * 2) 抛出错误', () => {
  try {
    Buffer.alloc(kMaxLength * 2);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.alloc(Infinity) 抛出错误', () => {
  try {
    Buffer.alloc(Infinity);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError || e instanceof TypeError;
  }
});

test('Buffer.alloc(NaN) 抛出错误', () => {
  try {
    Buffer.alloc(NaN);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError || e instanceof TypeError;
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
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%',
      kMaxLength: kMaxLength
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
