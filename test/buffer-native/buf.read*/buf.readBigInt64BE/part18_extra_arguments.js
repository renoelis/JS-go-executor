// buf.readBigInt64BE() - 额外参数和参数边界测试
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

// 无参数调用（使用默认 offset = 0）
test('无参数调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(100n, 0);
  return buf.readBigInt64BE() === 100n;
});

// 一个参数（正常）
test('一个参数调用', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(200n, 8);
  return buf.readBigInt64BE(8) === 200n;
});

// 两个参数（额外参数应被忽略）
test('两个参数调用（第二个参数被忽略）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(300n, 0);
  return buf.readBigInt64BE(0, 999) === 300n;
});

// 三个参数（额外参数应被忽略）
test('三个参数调用（额外参数被忽略）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(400n, 0);
  return buf.readBigInt64BE(0, 'extra', { obj: 'ignored' }) === 400n;
});

// 多个额外参数
test('多个额外参数被忽略', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(500n, 0);
  return buf.readBigInt64BE(0, 1, 2, 3, 4, 5) === 500n;
});

// offset 为 0（显式）
test('offset 显式为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(600n, 0);
  return buf.readBigInt64BE(0) === 600n;
});

// offset 为正整数
test('offset 为正整数', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(700n, 5);
  return buf.readBigInt64BE(5) === 700n;
});

// offset 为数字 0.0
test('offset 为 0.0（整数浮点）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(800n, 0);
  return buf.readBigInt64BE(0.0) === 800n;
});

// offset 为字符串 "0" 应抛出错误
test('offset 为字符串 "0" 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE("0");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset 为 NaN 应抛出错误
test('offset 为 NaN 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// offset 为浮点数应抛出错误
test('offset 为浮点数 1.5 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(1.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// offset 为负浮点数应抛出错误
test('offset 为负浮点数 -0.5 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(-0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// offset 为 BigInt 应抛出错误
test('offset 为 BigInt 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(0n);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// offset 为 Symbol 应抛出错误
test('offset 为 Symbol 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(Symbol('offset'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset 为函数应抛出错误
test('offset 为函数应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(() => 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// offset 为正则表达式应抛出错误
test('offset 为正则表达式应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(/test/);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// offset 为 Date 对象应抛出错误
test('offset 为 Date 对象应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(new Date());
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
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
