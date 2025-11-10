// buf.readBigUInt64LE() - 别名方法测试
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

// 别名方法存在性测试
test('readBigUint64LE 别名方法存在', () => {
  return typeof Buffer.prototype.readBigUint64LE === 'function';
});

test('readBigUint64LE 和 readBigUInt64LE 行为一致', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(12345n, 0);
  // 检查两个方法的行为是否一致，而不是检查是否是同一个引用
  return buf.readBigUint64LE(0) === buf.readBigUInt64LE(0) &&
         typeof buf.readBigUint64LE === 'function' &&
         typeof buf.readBigUInt64LE === 'function';
});

// 别名方法功能测试
test('readBigUint64LE 读取零', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0n, 0);
  return buf.readBigUint64LE(0) === 0n;
});

test('readBigUint64LE 读取正数', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(12345n, 0);
  return buf.readBigUint64LE(0) === 12345n;
});

test('readBigUint64LE 读取最大值', () => {
  const buf = Buffer.alloc(8);
  const max = 18446744073709551615n;
  buf.writeBigUInt64LE(max, 0);
  return buf.readBigUint64LE(0) === max;
});

test('readBigUint64LE 默认 offset', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(999n, 0);
  return buf.readBigUint64LE() === 999n;
});

test('readBigUint64LE 带 offset', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(777n, 8);
  return buf.readBigUint64LE(8) === 777n;
});

test('readBigUint64LE 抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUint64LE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('readBigUint64LE 与 readBigUInt64LE 结果一致', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(123456789n, 0);
  return buf.readBigUint64LE(0) === buf.readBigUInt64LE(0);
});

// 别名方法可以通过 call 调用
test('readBigUint64LE 可以通过 call 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(555n, 0);
  const result = Buffer.prototype.readBigUint64LE.call(buf, 0);
  return result === 555n;
});

// 别名方法可以通过 apply 调用
test('readBigUint64LE 可以通过 apply 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(888n, 0);
  const result = Buffer.prototype.readBigUint64LE.apply(buf, [0]);
  return result === 888n;
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
