// buf.readDoubleLE() - 精度测试
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

// 高精度数值往返
test('高精度数值往返', () => {
  const buf = Buffer.alloc(8);
  const value = 1.7976931348623157e+308;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

test('小数精度测试', () => {
  const buf = Buffer.alloc(8);
  const value = 0.1 + 0.2;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

test('科学计数法大数', () => {
  const buf = Buffer.alloc(8);
  const value = 1.23e100;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

test('科学计数法小数', () => {
  const buf = Buffer.alloc(8);
  const value = 1.23e-100;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

test('非常接近零的数', () => {
  const buf = Buffer.alloc(8);
  const value = 1e-307;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

test('非常大的数', () => {
  const buf = Buffer.alloc(8);
  const value = 1e307;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

// IEEE 754 精度边界
test('最小正规数（MIN_VALUE）', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.MIN_VALUE, 0);
  return buf.readDoubleLE(0) === Number.MIN_VALUE;
});

test('最大值（MAX_VALUE）', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.MAX_VALUE, 0);
  return buf.readDoubleLE(0) === Number.MAX_VALUE;
});

test('最小精度（EPSILON）', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.EPSILON, 0);
  return buf.readDoubleLE(0) === Number.EPSILON;
});

test('MAX_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.MAX_SAFE_INTEGER, 0);
  return buf.readDoubleLE(0) === Number.MAX_SAFE_INTEGER;
});

test('MIN_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.MIN_SAFE_INTEGER, 0);
  return buf.readDoubleLE(0) === Number.MIN_SAFE_INTEGER;
});

// 数学常数精度
test('Math.PI 精度', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.PI, 0);
  return buf.readDoubleLE(0) === Math.PI;
});

test('Math.E 精度', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.E, 0);
  return buf.readDoubleLE(0) === Math.E;
});

test('Math.SQRT2 精度', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.SQRT2, 0);
  return buf.readDoubleLE(0) === Math.SQRT2;
});

test('Math.LN2 精度', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.LN2, 0);
  return buf.readDoubleLE(0) === Math.LN2;
});

// 复杂计算结果精度
test('复杂计算 1/3', () => {
  const buf = Buffer.alloc(8);
  const value = 1 / 3;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

test('复杂计算 1/7', () => {
  const buf = Buffer.alloc(8);
  const value = 1 / 7;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

test('复杂计算 sqrt(2)', () => {
  const buf = Buffer.alloc(8);
  const value = Math.sqrt(2);
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

test('负数高精度', () => {
  const buf = Buffer.alloc(8);
  const value = -1.7976931348623157e+308;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

test('负数小精度', () => {
  const buf = Buffer.alloc(8);
  const value = -1.23e-100;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
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
