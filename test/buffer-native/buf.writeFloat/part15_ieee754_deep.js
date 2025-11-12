// buf.writeFloatBE/LE() - IEEE 754 深度特性测试（舍入、溢出、下溢）
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

// 舍入测试 - 单精度无法精确表示的值
test('writeFloatBE 0.1 + 0.2 的舍入', () => {
  const buf = Buffer.allocUnsafe(4);
  const value = 0.1 + 0.2;
  buf.writeFloatBE(value, 0);
  const read = buf.readFloatBE(0);
  return typeof read === 'number' && !isNaN(read);
});

test('writeFloatLE 0.1 + 0.2 的舍入', () => {
  const buf = Buffer.allocUnsafe(4);
  const value = 0.1 + 0.2;
  buf.writeFloatLE(value, 0);
  const read = buf.readFloatLE(0);
  return typeof read === 'number' && !isNaN(read);
});

test('writeFloatBE 1/3 的舍入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(1/3, 0);
  const read = buf.readFloatBE(0);
  return Math.abs(read - 0.33333333) < 0.00000002;
});

test('writeFloatLE 1/3 的舍入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(1/3, 0);
  const read = buf.readFloatLE(0);
  return Math.abs(read - 0.33333333) < 0.00000002;
});

test('writeFloatBE π 的舍入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(Math.PI, 0);
  const read = buf.readFloatBE(0);
  return Math.abs(read - Math.PI) < 0.000001;
});

test('writeFloatLE π 的舍入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(Math.PI, 0);
  const read = buf.readFloatLE(0);
  return Math.abs(read - Math.PI) < 0.000001;
});

test('writeFloatBE e 的舍入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(Math.E, 0);
  const read = buf.readFloatBE(0);
  return Math.abs(read - Math.E) < 0.000001;
});

test('writeFloatLE e 的舍入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(Math.E, 0);
  const read = buf.readFloatLE(0);
  return Math.abs(read - Math.E) < 0.000001;
});

// 接近溢出边界的值
test('writeFloatBE 最大值 * 0.99', () => {
  const buf = Buffer.allocUnsafe(4);
  const maxFloat32 = 3.4028234663852886e+38;
  buf.writeFloatBE(maxFloat32 * 0.99, 0);
  const read = buf.readFloatBE(0);
  return read !== Infinity && read > 3e38;
});

test('writeFloatLE 最大值 * 0.99', () => {
  const buf = Buffer.allocUnsafe(4);
  const maxFloat32 = 3.4028234663852886e+38;
  buf.writeFloatLE(maxFloat32 * 0.99, 0);
  const read = buf.readFloatLE(0);
  return read !== Infinity && read > 3e38;
});

test('writeFloatBE 最大值 * 1.01 溢出为 Infinity', () => {
  const buf = Buffer.allocUnsafe(4);
  const maxFloat32 = 3.4028234663852886e+38;
  buf.writeFloatBE(maxFloat32 * 1.01, 0);
  const read = buf.readFloatBE(0);
  return read === Infinity;
});

test('writeFloatLE 最大值 * 1.01 溢出为 Infinity', () => {
  const buf = Buffer.allocUnsafe(4);
  const maxFloat32 = 3.4028234663852886e+38;
  buf.writeFloatLE(maxFloat32 * 1.01, 0);
  const read = buf.readFloatLE(0);
  return read === Infinity;
});

// 下溢测试
test('writeFloatBE 最小非正规化数 * 0.1 下溢为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const minDenormal = 1.401298464324817e-45;
  buf.writeFloatBE(minDenormal * 0.1, 0);
  const read = buf.readFloatBE(0);
  return read === 0;
});

test('writeFloatLE 最小非正规化数 * 0.1 下溢为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const minDenormal = 1.401298464324817e-45;
  buf.writeFloatLE(minDenormal * 0.1, 0);
  const read = buf.readFloatLE(0);
  return read === 0;
});

test('writeFloatBE 极小负数下溢为 -0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(-1e-50, 0);
  const read = buf.readFloatBE(0);
  return read === 0 && (1/read) === -Infinity;
});

test('writeFloatLE 极小负数下溢为 -0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(-1e-50, 0);
  const read = buf.readFloatLE(0);
  return read === 0 && (1/read) === -Infinity;
});

// 非正规化数的边界
test('writeFloatBE 最小正规化数边界', () => {
  const buf = Buffer.allocUnsafe(4);
  const minNormal = 1.1754943508222875e-38;
  buf.writeFloatBE(minNormal, 0);
  const read = buf.readFloatBE(0);
  return read > 0 && read <= minNormal * 1.1;
});

test('writeFloatLE 最小正规化数边界', () => {
  const buf = Buffer.allocUnsafe(4);
  const minNormal = 1.1754943508222875e-38;
  buf.writeFloatLE(minNormal, 0);
  const read = buf.readFloatLE(0);
  return read > 0 && read <= minNormal * 1.1;
});

test('writeFloatBE 最大非正规化数', () => {
  const buf = Buffer.allocUnsafe(4);
  const maxDenormal = 1.1754942106924411e-38;
  buf.writeFloatBE(maxDenormal, 0);
  const read = buf.readFloatBE(0);
  return read > 0 && read < 1.2e-38;
});

test('writeFloatLE 最大非正规化数', () => {
  const buf = Buffer.allocUnsafe(4);
  const maxDenormal = 1.1754942106924411e-38;
  buf.writeFloatLE(maxDenormal, 0);
  const read = buf.readFloatLE(0);
  return read > 0 && read < 1.2e-38;
});

// 2 的幂次测试
test('writeFloatBE 2^0 到 2^10 精确表示', () => {
  const buf = Buffer.allocUnsafe(4);
  for (let i = 0; i <= 10; i++) {
    const value = Math.pow(2, i);
    buf.writeFloatBE(value, 0);
    const read = buf.readFloatBE(0);
    if (read !== value) return false;
  }
  return true;
});

test('writeFloatLE 2^0 到 2^10 精确表示', () => {
  const buf = Buffer.allocUnsafe(4);
  for (let i = 0; i <= 10; i++) {
    const value = Math.pow(2, i);
    buf.writeFloatLE(value, 0);
    const read = buf.readFloatLE(0);
    if (read !== value) return false;
  }
  return true;
});

test('writeFloatBE 2^-1 到 2^-10 精确表示', () => {
  const buf = Buffer.allocUnsafe(4);
  for (let i = 1; i <= 10; i++) {
    const value = Math.pow(2, -i);
    buf.writeFloatBE(value, 0);
    const read = buf.readFloatBE(0);
    if (read !== value) return false;
  }
  return true;
});

test('writeFloatLE 2^-1 到 2^-10 精确表示', () => {
  const buf = Buffer.allocUnsafe(4);
  for (let i = 1; i <= 10; i++) {
    const value = Math.pow(2, -i);
    buf.writeFloatLE(value, 0);
    const read = buf.readFloatLE(0);
    if (read !== value) return false;
  }
  return true;
});

// 尾数精度测试
test('writeFloatBE 23位尾数边界', () => {
  const buf = Buffer.allocUnsafe(4);
  const value = 1 + Math.pow(2, -23);
  buf.writeFloatBE(value, 0);
  const read = buf.readFloatBE(0);
  return Math.abs(read - value) < 1e-7;
});

test('writeFloatLE 23位尾数边界', () => {
  const buf = Buffer.allocUnsafe(4);
  const value = 1 + Math.pow(2, -23);
  buf.writeFloatLE(value, 0);
  const read = buf.readFloatLE(0);
  return Math.abs(read - value) < 1e-7;
});

test('writeFloatBE 超过23位尾数精度损失', () => {
  const buf = Buffer.allocUnsafe(4);
  const value = 1 + Math.pow(2, -24);
  buf.writeFloatBE(value, 0);
  const read = buf.readFloatBE(0);
  return read === 1;
});

test('writeFloatLE 超过23位尾数精度损失', () => {
  const buf = Buffer.allocUnsafe(4);
  const value = 1 + Math.pow(2, -24);
  buf.writeFloatLE(value, 0);
  const read = buf.readFloatLE(0);
  return read === 1;
});

// 负数的舍入
test('writeFloatBE 负数舍入行为', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(-0.1 - 0.2, 0);
  const read = buf.readFloatBE(0);
  return read < 0 && !isNaN(read);
});

test('writeFloatLE 负数舍入行为', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(-0.1 - 0.2, 0);
  const read = buf.readFloatLE(0);
  return read < 0 && !isNaN(read);
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
