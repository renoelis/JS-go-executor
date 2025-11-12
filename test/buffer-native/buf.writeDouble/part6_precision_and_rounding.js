// buf.writeDoubleBE/LE - Precision and Rounding Tests
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

// 精度测试
test('writeDoubleBE 保持 15-17 位有效数字精度', () => {
  const buf = Buffer.alloc(8);
  const value = 1.2345678901234567;
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - value) < 1e-15;
});

test('writeDoubleLE 保持 15-17 位有效数字精度', () => {
  const buf = Buffer.alloc(8);
  const value = 1.2345678901234567;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - value) < 1e-15;
});

// 舍入测试
test('writeDoubleBE 处理超出精度的数字', () => {
  const buf = Buffer.alloc(8);
  const value = 0.1 + 0.2; // 典型浮点精度问题
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - 0.30000000000000004) < 1e-17;
});

test('writeDoubleLE 处理超出精度的数字', () => {
  const buf = Buffer.alloc(8);
  const value = 0.1 + 0.2;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - 0.30000000000000004) < 1e-17;
});

// 非常接近的数字
test('writeDoubleBE 区分极相近的数字', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeDoubleBE(1.0000000000000002);
  buf2.writeDoubleBE(1.0000000000000004);

  const v1 = buf1.readDoubleBE(0);
  const v2 = buf2.readDoubleBE(0);

  return v1 !== v2;
});

test('writeDoubleLE 区分极相近的数字', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeDoubleLE(1.0000000000000002);
  buf2.writeDoubleLE(1.0000000000000004);

  const v1 = buf1.readDoubleLE(0);
  const v2 = buf2.readDoubleLE(0);

  return v1 !== v2;
});

// 特殊分数
test('writeDoubleBE 处理 1/3', () => {
  const buf = Buffer.alloc(8);
  const value = 1 / 3;
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - value) < 1e-16;
});

test('writeDoubleLE 处理 1/3', () => {
  const buf = Buffer.alloc(8);
  const value = 1 / 3;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - value) < 1e-16;
});

test('writeDoubleBE 处理 Math.PI', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Math.PI);
  const readBack = buf.readDoubleBE(0);
  return readBack === Math.PI;
});

test('writeDoubleLE 处理 Math.PI', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.PI);
  const readBack = buf.readDoubleLE(0);
  return readBack === Math.PI;
});

test('writeDoubleBE 处理 Math.E', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Math.E);
  const readBack = buf.readDoubleBE(0);
  return readBack === Math.E;
});

test('writeDoubleLE 处理 Math.E', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.E);
  const readBack = buf.readDoubleLE(0);
  return readBack === Math.E;
});

// 科学计数法
test('writeDoubleBE 处理极大科学计数', () => {
  const buf = Buffer.alloc(8);
  const value = 1.23e100;
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE(0);
  return readBack === value;
});

test('writeDoubleLE 处理极大科学计数', () => {
  const buf = Buffer.alloc(8);
  const value = 1.23e100;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE(0);
  return readBack === value;
});

test('writeDoubleBE 处理极小科学计数', () => {
  const buf = Buffer.alloc(8);
  const value = 1.23e-100;
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - value) < 1e-115;
});

test('writeDoubleLE 处理极小科学计数', () => {
  const buf = Buffer.alloc(8);
  const value = 1.23e-100;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - value) < 1e-115;
});

// 整数边界
test('writeDoubleBE 处理 2^53', () => {
  const buf = Buffer.alloc(8);
  const value = Math.pow(2, 53);
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE(0);
  return readBack === value;
});

test('writeDoubleLE 处理 2^53', () => {
  const buf = Buffer.alloc(8);
  const value = Math.pow(2, 53);
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE(0);
  return readBack === value;
});

test('writeDoubleBE 处理 2^53 + 1 精度丢失', () => {
  const buf = Buffer.alloc(8);
  const value = Math.pow(2, 53) + 1;
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE(0);
  return readBack === value;
});

test('writeDoubleLE 处理 2^53 + 1 精度丢失', () => {
  const buf = Buffer.alloc(8);
  const value = Math.pow(2, 53) + 1;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE(0);
  return readBack === value;
});

// 负数精度
test('writeDoubleBE 负数精度保持', () => {
  const buf = Buffer.alloc(8);
  const value = -9.87654321098765;
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - value) < 1e-14;
});

test('writeDoubleLE 负数精度保持', () => {
  const buf = Buffer.alloc(8);
  const value = -9.87654321098765;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - value) < 1e-14;
});

// 混合正负零与极小值
test('writeDoubleBE 区分 +0 和极小正数', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeDoubleBE(0);
  buf2.writeDoubleBE(Number.MIN_VALUE);

  const v1 = buf1.readDoubleBE(0);
  const v2 = buf2.readDoubleBE(0);

  return v1 !== v2;
});

test('writeDoubleLE 区分 +0 和极小正数', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeDoubleLE(0);
  buf2.writeDoubleLE(Number.MIN_VALUE);

  const v1 = buf1.readDoubleLE(0);
  const v2 = buf2.readDoubleLE(0);

  return v1 !== v2;
});

// 连续小数
test('writeDoubleBE 处理连续小数 0.123456789', () => {
  const buf = Buffer.alloc(8);
  const value = 0.123456789;
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - value) < 1e-15;
});

test('writeDoubleLE 处理连续小数 0.123456789', () => {
  const buf = Buffer.alloc(8);
  const value = 0.123456789;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - value) < 1e-15;
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
