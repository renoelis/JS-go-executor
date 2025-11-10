// buf.readBigInt64BE() - 特殊 offset 值测试
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

// -0 测试
test('offset = -0（应等同于 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(123n, 0);
  return buf.readBigInt64BE(-0) === 123n;
});

test('offset = +0（应等同于 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(456n, 0);
  return buf.readBigInt64BE(+0) === 456n;
});

test('offset = 0.0（应等同于 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(789n, 0);
  return buf.readBigInt64BE(0.0) === 789n;
});

// 科学计数法
test('offset = 0e0（应等同于 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(111n, 0);
  return buf.readBigInt64BE(0e0) === 111n;
});

test('offset = 8e0（应等同于 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(222n, 8);
  return buf.readBigInt64BE(8e0) === 222n;
});

test('offset = 1e1（应等同于 10，可能越界）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(1e1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1.6e1（等于 16，有效）', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigInt64BE(333n, 16);
  return buf.readBigInt64BE(1.6e1) === 333n;
});

// 八进制和十六进制（在严格模式下可能不同）
test('offset = 0o10（八进制 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(333n, 8);
  return buf.readBigInt64BE(0o10) === 333n;
});

test('offset = 0x8（十六进制 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(444n, 8);
  return buf.readBigInt64BE(0x8) === 444n;
});

test('offset = 0b1000（二进制 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(555n, 8);
  return buf.readBigInt64BE(0b1000) === 555n;
});

// 整数边界
test('offset = 2^31-1（大整数但有效）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(2147483647);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 2^32（超大整数）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(4294967296);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 非常接近整数的浮点数
test('offset = 0.0000000001（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(0.0000000001);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 0.9999999999（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64BE(0.9999999999);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 数学运算结果
test('offset = 4 + 4（应等同于 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(666n, 8);
  return buf.readBigInt64BE(4 + 4) === 666n;
});

test('offset = 16 / 2（应等同于 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(777n, 8);
  return buf.readBigInt64BE(16 / 2) === 777n;
});

test('offset = 2 * 4（应等同于 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(888n, 8);
  return buf.readBigInt64BE(2 * 4) === 888n;
});

test('offset = 10 - 2（应等同于 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(999n, 8);
  return buf.readBigInt64BE(10 - 2) === 999n;
});

// 位运算结果
test('offset = 16 >> 1（应等同于 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(1111n, 8);
  return buf.readBigInt64BE(16 >> 1) === 1111n;
});

test('offset = 4 << 1（应等同于 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(2222n, 8);
  return buf.readBigInt64BE(4 << 1) === 2222n;
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
