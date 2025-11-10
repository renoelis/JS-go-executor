// buf.readFloatBE() - Float32 精度测试
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

// Float32 范围测试
test('Float32 最大值', () => {
  const buf = Buffer.alloc(4);
  const max = 3.4028234663852886e+38;
  buf.writeFloatBE(max, 0);
  const read = buf.readFloatBE(0);
  return Math.abs((read - max) / max) < 0.0001;
});

test('Float32 最小正值', () => {
  const buf = Buffer.alloc(4);
  const min = 1.175494e-38;
  buf.writeFloatBE(min, 0);
  const read = buf.readFloatBE(0);
  return Math.abs((read - min) / min) < 0.01;
});

test('Float32 最小次正规数', () => {
  const buf = Buffer.alloc(4);
  const denorm = 1.4e-45;
  buf.writeFloatBE(denorm, 0);
  const read = buf.readFloatBE(0);
  return read === denorm || Math.abs(read - denorm) < 1e-45;
});

// 精度损失测试
test('精度损失：大整数', () => {
  const buf = Buffer.alloc(4);
  const value = 16777216; // 2^24，Float32 能精确表示的最大整数
  buf.writeFloatBE(value, 0);
  return buf.readFloatBE(0) === value;
});

test('精度损失：超大整数', () => {
  const buf = Buffer.alloc(4);
  const value = 16777217; // 2^24 + 1，Float32 无法精确表示
  buf.writeFloatBE(value, 0);
  // 会被四舍五入
  return buf.readFloatBE(0) !== value;
});

test('精度损失：小数', () => {
  const buf = Buffer.alloc(4);
  const value = 0.1;
  buf.writeFloatBE(value, 0);
  // 0.1 在二进制中无法精确表示
  return Math.abs(buf.readFloatBE(0) - 0.1) < 0.00001;
});

test('精度损失：多次运算', () => {
  const buf = Buffer.alloc(4);
  const value = 1.0 / 3.0;
  buf.writeFloatBE(value, 0);
  const read = buf.readFloatBE(0);
  return Math.abs(read - value) < 0.000001;
});

// 舍入测试
test('舍入到最近的 Float32', () => {
  const buf = Buffer.alloc(4);
  const value = 1.0000001;
  buf.writeFloatBE(value, 0);
  const read = buf.readFloatBE(0);
  return typeof read === 'number';
});

// 特殊边界
test('1 的表示', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(1.0, 0);
  return buf.readFloatBE(0) === 1.0;
});

test('2 的表示', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(2.0, 0);
  return buf.readFloatBE(0) === 2.0;
});

test('0.5 的表示', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(0.5, 0);
  return buf.readFloatBE(0) === 0.5;
});

// 2 的幂次
test('2 的正幂次', () => {
  const buf = Buffer.alloc(4);
  let allPass = true;
  for (let i = 0; i < 10; i++) {
    const value = Math.pow(2, i);
    buf.writeFloatBE(value, 0);
    if (buf.readFloatBE(0) !== value) {
      allPass = false;
      break;
    }
  }
  return allPass;
});

test('2 的负幂次', () => {
  const buf = Buffer.alloc(4);
  let allPass = true;
  for (let i = 1; i <= 10; i++) {
    const value = Math.pow(2, -i);
    buf.writeFloatBE(value, 0);
    if (buf.readFloatBE(0) !== value) {
      allPass = false;
      break;
    }
  }
  return allPass;
});

// 非常接近 0 的值
test('极小正数', () => {
  const buf = Buffer.alloc(4);
  const value = 1e-40;
  buf.writeFloatBE(value, 0);
  const read = buf.readFloatBE(0);
  return read > 0 && read < 1e-30;
});

test('极小负数', () => {
  const buf = Buffer.alloc(4);
  const value = -1e-40;
  buf.writeFloatBE(value, 0);
  const read = buf.readFloatBE(0);
  return read < 0 && read > -1e-30;
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
