// buf.readFloatLE() - IEEE 754 标准测试
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
test('Infinity 的二进制表示 (LE: 00 00 80 7F)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x7F]);
  return buf.readFloatLE(0) === Infinity;
});

test('-Infinity 的二进制表示 (LE: 00 00 80 FF)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0xFF]);
  return buf.readFloatLE(0) === -Infinity;
});

test('NaN 的二进制表示 (LE: 00 00 C0 7F)', () => {
  const buf = Buffer.from([0x00, 0x00, 0xC0, 0x7F]);
  return Number.isNaN(buf.readFloatLE(0));
});

test('+0 的二进制表示 (LE: 00 00 00 00)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const result = buf.readFloatLE(0);
  return result === 0 && 1 / result === Infinity;
});

test('-0 的二进制表示 (LE: 00 00 00 80)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  const result = buf.readFloatLE(0);
  return result === 0 && 1 / result === -Infinity;
});

// 正常数值的二进制表示
test('1.0 的二进制表示 (LE: 00 00 80 3F)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x3F]);
  return buf.readFloatLE(0) === 1.0;
});

test('-1.0 的二进制表示 (LE: 00 00 80 BF)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0xBF]);
  return buf.readFloatLE(0) === -1.0;
});

test('2.0 的二进制表示 (LE: 00 00 00 40)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x40]);
  return buf.readFloatLE(0) === 2.0;
});

// 符号位测试
test('符号位决定正负（正数）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x3F]); // 1.0 (符号位 0)
  return buf.readFloatLE(0) > 0;
});

test('符号位决定正负（负数）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0xBF]); // -1.0 (符号位 1)
  return buf.readFloatLE(0) < 0;
});

// 指数位测试
test('指数位为 0（非规格化数）', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]); // 最小非规格化正数
  const result = buf.readFloatLE(0);
  return result > 0 && result < 1e-38;
});

test('指数位全为 1（特殊值 Infinity）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x7F]); // 指数位全 1，尾数为 0
  return buf.readFloatLE(0) === Infinity;
});

test('指数位全为 1（特殊值 NaN）', () => {
  const buf = Buffer.from([0x01, 0x00, 0x80, 0x7F]); // 指数位全 1，尾数非 0
  return Number.isNaN(buf.readFloatLE(0));
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
