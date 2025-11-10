// buf.readBigUInt64LE() - 错误处理和边界检查
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

// 空 Buffer
test('空 Buffer（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readBigUInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Buffer 长度不足
test('Buffer 长度 < 8（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readBigUInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度 = 1（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readBigUInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度 = 4（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readBigUInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// offset 越界
test('offset 越界 - 刚好超出 1 字节', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 越界 - 超出很多', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset + 8 > buf.length', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.readBigUInt64LE(3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 无效的 this 上下文
test('在非 Buffer 对象上调用（应抛出错误）', () => {
  try {
    const notBuffer = { length: 8 };
    Buffer.prototype.readBigUInt64LE.call(notBuffer, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('在 null 上调用（应抛出 TypeError）', () => {
  try {
    Buffer.prototype.readBigUInt64LE.call(null, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('在 undefined 上调用（应抛出 TypeError）', () => {
  try {
    Buffer.prototype.readBigUInt64LE.call(undefined, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('在普通对象上调用（应抛出错误）', () => {
  try {
    Buffer.prototype.readBigUInt64LE.call({}, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('在数组上调用（应返回 0n）', () => {
  const result = Buffer.prototype.readBigUInt64LE.call([0, 0, 0, 0, 0, 0, 0, 0], 0);
  return result === 0n;
});

// 参数数量测试
test('无参数调用（使用默认 offset = 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(123n, 0);
  return buf.readBigUInt64LE() === 123n;
});

test('多余参数被忽略', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(456n, 0);
  return buf.readBigUInt64LE(0, 'extra', 'params') === 456n;
});

// 错误消息验证
test('RangeError 包含有用信息', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.length > 0;
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
