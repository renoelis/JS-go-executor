// buf.readFloatLE() - Float32 精度测试
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

// Float32 最大值
test('Float32 最大值 (3.4028235e38)', () => {
  const buf = Buffer.alloc(4);
  const maxFloat32 = 3.4028234663852886e38;
  buf.writeFloatLE(maxFloat32, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - maxFloat32) / maxFloat32 < 0.0001;
});

// Float32 最小正值（规格化）
test('Float32 最小正规格化数 (1.175494e-38)', () => {
  const buf = Buffer.alloc(4);
  const minNormal = 1.1754943508222875e-38;
  buf.writeFloatLE(minNormal, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - minNormal) / minNormal < 0.01;
});

// Float32 最小正非规格化数
test('Float32 最小正非规格化数 (1.4e-45)', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  const result = buf.readFloatLE(0);
  return result === 1.401298464324817e-45;
});

// 精度损失场景 - 大整数
test('大整数精度损失 (16777217 无法精确表示)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(16777217, 0); // 2^24 + 1
  const result = buf.readFloatLE(0);
  // Float32 只能精确表示到 2^24
  return result !== 16777217; // 应该损失精度
});

// 精度损失场景 - 小数
test('小数精度损失 (0.1 + 0.2)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(0.1 + 0.2, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - 0.3) < 0.00001;
});

// 舍入测试
test('舍入测试 - 接近 1 的值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(0.9999999, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - 0.9999999) < 0.0001;
});

// 2 的幂次测试（应该精确）
test('2 的幂次精确表示 (2^10 = 1024)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1024, 0);
  return buf.readFloatLE(0) === 1024;
});

test('2 的幂次精确表示 (2^-10)', () => {
  const buf = Buffer.alloc(4);
  const value = Math.pow(2, -10);
  buf.writeFloatLE(value, 0);
  return buf.readFloatLE(0) === value;
});

// 极小正数
test('极小正数 (1e-40)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1e-40, 0);
  const result = buf.readFloatLE(0);
  return result > 0 && result < 1e-38;
});

// 极小负数
test('极小负数 (-1e-40)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(-1e-40, 0);
  const result = buf.readFloatLE(0);
  return result < 0 && result > -1e-38;
});

// 接近最大值但不超出
test('接近 Float32 最大值但不溢出', () => {
  const buf = Buffer.alloc(4);
  const value = 3.4e38;
  buf.writeFloatLE(value, 0);
  const result = buf.readFloatLE(0);
  return !isNaN(result) && isFinite(result);
});

// 超出 Float32 范围溢出为 Infinity
test('超出 Float32 范围溢出为 Infinity', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1e39, 0);
  return buf.readFloatLE(0) === Infinity;
});

// Float32 epsilon 测试
test('Float32 epsilon (1 + epsilon)', () => {
  const buf = Buffer.alloc(4);
  const epsilon = 1.1920928955078125e-7; // Float32 的 epsilon
  buf.writeFloatLE(1 + epsilon, 0);
  const result = buf.readFloatLE(0);
  return result > 1.0 && result < 1.0001;
});

// 负数精度测试
test('负数精度保持', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(-3.14159, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result + 3.14159) < 0.001;
});

// 非常接近 0 的值
test('非常接近 0 的值 (1e-50 下溢为 0)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1e-50, 0);
  return buf.readFloatLE(0) === 0;
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
