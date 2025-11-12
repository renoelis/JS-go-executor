// buf.writeDoubleBE/LE - Special Values Tests
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

// 特殊数值测试 - Infinity
test('writeDoubleBE 写入 Infinity', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Infinity);
  const readBack = buf.readDoubleBE(0);
  return readBack === Infinity;
});

test('writeDoubleLE 写入 Infinity', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Infinity);
  const readBack = buf.readDoubleLE(0);
  return readBack === Infinity;
});

test('writeDoubleBE 写入 -Infinity', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-Infinity);
  const readBack = buf.readDoubleBE(0);
  return readBack === -Infinity;
});

test('writeDoubleLE 写入 -Infinity', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-Infinity);
  const readBack = buf.readDoubleLE(0);
  return readBack === -Infinity;
});

// NaN 测试
test('writeDoubleBE 写入 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(NaN);
  const readBack = buf.readDoubleBE(0);
  return Number.isNaN(readBack);
});

test('writeDoubleLE 写入 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(NaN);
  const readBack = buf.readDoubleLE(0);
  return Number.isNaN(readBack);
});

// 正负零
test('writeDoubleBE 写入 +0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0);
  const readBack = buf.readDoubleBE(0);
  return readBack === 0 && 1 / readBack === Infinity;
});

test('writeDoubleLE 写入 +0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(0);
  const readBack = buf.readDoubleLE(0);
  return readBack === 0 && 1 / readBack === Infinity;
});

test('writeDoubleBE 写入 -0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-0);
  const readBack = buf.readDoubleBE(0);
  return readBack === 0 && 1 / readBack === -Infinity;
});

test('writeDoubleLE 写入 -0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-0);
  const readBack = buf.readDoubleLE(0);
  return readBack === 0 && 1 / readBack === -Infinity;
});

// 最大最小值
test('writeDoubleBE 写入 Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Number.MAX_VALUE);
  const readBack = buf.readDoubleBE(0);
  return readBack === Number.MAX_VALUE;
});

test('writeDoubleLE 写入 Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.MAX_VALUE);
  const readBack = buf.readDoubleLE(0);
  return readBack === Number.MAX_VALUE;
});

test('writeDoubleBE 写入 Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Number.MIN_VALUE);
  const readBack = buf.readDoubleBE(0);
  return readBack === Number.MIN_VALUE;
});

test('writeDoubleLE 写入 Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.MIN_VALUE);
  const readBack = buf.readDoubleLE(0);
  return readBack === Number.MIN_VALUE;
});

test('writeDoubleBE 写入 -Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-Number.MAX_VALUE);
  const readBack = buf.readDoubleBE(0);
  return readBack === -Number.MAX_VALUE;
});

test('writeDoubleLE 写入 -Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-Number.MAX_VALUE);
  const readBack = buf.readDoubleLE(0);
  return readBack === -Number.MAX_VALUE;
});

// 极小数值
test('writeDoubleBE 写入极小正数', () => {
  const buf = Buffer.alloc(8);
  const tiny = 1e-308;
  buf.writeDoubleBE(tiny);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - tiny) < 1e-320;
});

test('writeDoubleLE 写入极小正数', () => {
  const buf = Buffer.alloc(8);
  const tiny = 1e-308;
  buf.writeDoubleLE(tiny);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - tiny) < 1e-320;
});

test('writeDoubleBE 写入极小负数', () => {
  const buf = Buffer.alloc(8);
  const tiny = -1e-308;
  buf.writeDoubleBE(tiny);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - tiny) < 1e-320;
});

test('writeDoubleLE 写入极小负数', () => {
  const buf = Buffer.alloc(8);
  const tiny = -1e-308;
  buf.writeDoubleLE(tiny);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - tiny) < 1e-320;
});

// 非规格化数
test('writeDoubleBE 写入次正规数', () => {
  const buf = Buffer.alloc(8);
  const subnormal = Number.MIN_VALUE;
  buf.writeDoubleBE(subnormal);
  const readBack = buf.readDoubleBE(0);
  return readBack === subnormal;
});

test('writeDoubleLE 写入次正规数', () => {
  const buf = Buffer.alloc(8);
  const subnormal = Number.MIN_VALUE;
  buf.writeDoubleLE(subnormal);
  const readBack = buf.readDoubleLE(0);
  return readBack === subnormal;
});

// 精度边界测试
test('writeDoubleBE 精度测试 - 大整数', () => {
  const buf = Buffer.alloc(8);
  const largeInt = 9007199254740991; // Number.MAX_SAFE_INTEGER
  buf.writeDoubleBE(largeInt);
  const readBack = buf.readDoubleBE(0);
  return readBack === largeInt;
});

test('writeDoubleLE 精度测试 - 大整数', () => {
  const buf = Buffer.alloc(8);
  const largeInt = 9007199254740991; // Number.MAX_SAFE_INTEGER
  buf.writeDoubleLE(largeInt);
  const readBack = buf.readDoubleLE(0);
  return readBack === largeInt;
});

test('writeDoubleBE 精度测试 - 超出安全整数', () => {
  const buf = Buffer.alloc(8);
  const unsafeInt = 9007199254740992; // MAX_SAFE_INTEGER + 1
  buf.writeDoubleBE(unsafeInt);
  const readBack = buf.readDoubleBE(0);
  return readBack === unsafeInt;
});

test('writeDoubleLE 精度测试 - 超出安全整数', () => {
  const buf = Buffer.alloc(8);
  const unsafeInt = 9007199254740992; // MAX_SAFE_INTEGER + 1
  buf.writeDoubleLE(unsafeInt);
  const readBack = buf.readDoubleLE(0);
  return readBack === unsafeInt;
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
