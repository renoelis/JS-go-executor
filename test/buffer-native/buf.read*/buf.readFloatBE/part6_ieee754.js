// buf.readFloatBE() - IEEE 754 标准测试
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

// IEEE 754 特殊值的二进制表示
test('Infinity 的二进制表示 (0x7F800000)', () => {
  const buf = Buffer.from([0x7F, 0x80, 0x00, 0x00]);
  return buf.readFloatBE(0) === Infinity;
});

test('-Infinity 的二进制表示 (0xFF800000)', () => {
  const buf = Buffer.from([0xFF, 0x80, 0x00, 0x00]);
  return buf.readFloatBE(0) === -Infinity;
});

test('NaN 的二进制表示 (0x7FC00000)', () => {
  const buf = Buffer.from([0x7F, 0xC0, 0x00, 0x00]);
  return Number.isNaN(buf.readFloatBE(0));
});

test('+0 的二进制表示 (0x00000000)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const result = buf.readFloatBE(0);
  return result === 0 && 1 / result === Infinity;
});

test('-0 的二进制表示 (0x80000000)', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  const result = buf.readFloatBE(0);
  return result === 0 && 1 / result === -Infinity;
});

// 正常数值的二进制表示
test('1.0 的二进制表示 (0x3F800000)', () => {
  const buf = Buffer.from([0x3F, 0x80, 0x00, 0x00]);
  return buf.readFloatBE(0) === 1.0;
});

test('2.0 的二进制表示 (0x40000000)', () => {
  const buf = Buffer.from([0x40, 0x00, 0x00, 0x00]);
  return buf.readFloatBE(0) === 2.0;
});

test('0.5 的二进制表示 (0x3F000000)', () => {
  const buf = Buffer.from([0x3F, 0x00, 0x00, 0x00]);
  return buf.readFloatBE(0) === 0.5;
});

test('-1.0 的二进制表示 (0xBF800000)', () => {
  const buf = Buffer.from([0xBF, 0x80, 0x00, 0x00]);
  return buf.readFloatBE(0) === -1.0;
});

// 符号位测试
test('符号位：正数', () => {
  const buf = Buffer.from([0x40, 0x49, 0x0F, 0xDB]);
  const result = buf.readFloatBE(0);
  return result > 0;
});

test('符号位：负数', () => {
  const buf = Buffer.from([0xC0, 0x49, 0x0F, 0xDB]);
  const result = buf.readFloatBE(0);
  return result < 0;
});

// 指数位测试
test('指数全0（次正规数或0）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x01]);
  const result = buf.readFloatBE(0);
  return result > 0 && result < 1e-40;
});

test('指数全1（Infinity或NaN）', () => {
  const buf = Buffer.from([0x7F, 0x80, 0x00, 0x00]);
  const result = buf.readFloatBE(0);
  return result === Infinity || Number.isNaN(result);
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
