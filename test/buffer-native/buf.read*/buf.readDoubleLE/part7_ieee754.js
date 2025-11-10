// buf.readDoubleLE() - IEEE 754 标准测试
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

// IEEE 754 特殊值（原始字节 - Little-Endian）
test('Infinity 的原始字节表示', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x7F]);
  return buf.readDoubleLE(0) === Infinity;
});

test('-Infinity 的原始字节表示', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0xFF]);
  return buf.readDoubleLE(0) === -Infinity;
});

test('NaN 的原始字节表示（静默 NaN）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x7F]);
  return Number.isNaN(buf.readDoubleLE(0));
});

test('NaN 的原始字节表示（其他模式）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  return Number.isNaN(buf.readDoubleLE(0));
});

test('+0 的原始字节表示', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const result = buf.readDoubleLE(0);
  return result === 0 && 1 / result === Infinity;
});

test('-0 的原始字节表示', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  const result = buf.readDoubleLE(0);
  return result === 0 && 1 / result === -Infinity;
});

// IEEE 754 标准值
test('最小正规数', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00]);
  const result = buf.readDoubleLE(0);
  return result === 2.2250738585072014e-308;
});

test('最大次正规数', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x0F, 0x00]);
  const result = buf.readDoubleLE(0);
  return result > 0 && result < 2.2250738585072014e-308;
});

test('最小次正规数（MIN_VALUE）', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readDoubleLE(0) === 5e-324;
});

test('最大正数（MAX_VALUE）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xEF, 0x7F]);
  return buf.readDoubleLE(0) === Number.MAX_VALUE;
});

// 符号位测试
test('符号位为 0（正数）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F]);
  return buf.readDoubleLE(0) === 1.0;
});

test('符号位为 1（负数）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0xBF]);
  return buf.readDoubleLE(0) === -1.0;
});

// 指数边界
test('指数全 0（次正规数或零）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x0F, 0x00]);
  const result = buf.readDoubleLE(0);
  return result > 0 && result < 2.2250738585072014e-308;
});

test('指数全 1（无穷或 NaN）', () => {
  const buf1 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x7F]);
  const buf2 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x7F]);
  return buf1.readDoubleLE(0) === Infinity && Number.isNaN(buf2.readDoubleLE(0));
});

// 尾数测试
test('尾数全 0', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40]);
  return buf.readDoubleLE(0) === 2.0;
});

test('尾数全 1', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x3F]);
  const result = buf.readDoubleLE(0);
  return result < 2.0 && result > 1.0;
});

// 幂次测试
test('2^0 = 1', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F]);
  return buf.readDoubleLE(0) === 1.0;
});

test('2^1 = 2', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40]);
  return buf.readDoubleLE(0) === 2.0;
});

test('2^10 = 1024', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x90, 0x40]);
  return buf.readDoubleLE(0) === 1024.0;
});

test('2^-1 = 0.5', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x3F]);
  return buf.readDoubleLE(0) === 0.5;
});

test('2^-10 = 0.0009765625', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x50, 0x3F]);
  return buf.readDoubleLE(0) === 0.0009765625;
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
