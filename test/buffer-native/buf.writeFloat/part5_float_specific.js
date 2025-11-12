// buf.writeFloatBE/LE() - IEEE 754 单精度浮点数特性测试
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

// 特殊浮点值
test('writeFloatBE 写入 Infinity', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(Infinity, 0);
  return buf[0] === 0x7f && buf[1] === 0x80 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 Infinity', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(Infinity, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x80 && buf[3] === 0x7f;
});

test('writeFloatBE 写入 -Infinity', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(-Infinity, 0);
  return buf[0] === 0xff && buf[1] === 0x80 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 -Infinity', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(-Infinity, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x80 && buf[3] === 0xff;
});

test('writeFloatBE 写入 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(NaN, 0);
  const value = buf.readFloatBE(0);
  return isNaN(value);
});

test('writeFloatLE 写入 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(NaN, 0);
  const value = buf.readFloatLE(0);
  return isNaN(value);
});

test('writeFloatBE NaN 字节表示正确', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(NaN, 0);
  return (buf[0] & 0x7f) === 0x7f && buf[1] >= 0x80;
});

test('writeFloatLE NaN 字节表示正确', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(NaN, 0);
  return (buf[3] & 0x7f) === 0x7f && buf[2] >= 0x80;
});

// 精度边界
test('writeFloatBE 最大单精度浮点数', () => {
  const buf = Buffer.allocUnsafe(4);
  const maxFloat = 3.4028234663852886e+38;
  buf.writeFloatBE(maxFloat, 0);
  const value = buf.readFloatBE(0);
  return value > 3.4e38;
});

test('writeFloatLE 最大单精度浮点数', () => {
  const buf = Buffer.allocUnsafe(4);
  const maxFloat = 3.4028234663852886e+38;
  buf.writeFloatLE(maxFloat, 0);
  const value = buf.readFloatLE(0);
  return value > 3.4e38;
});

test('writeFloatBE 最小正规化单精度浮点数', () => {
  const buf = Buffer.allocUnsafe(4);
  const minNormal = 1.1754943508222875e-38;
  buf.writeFloatBE(minNormal, 0);
  const value = buf.readFloatBE(0);
  return value > 0 && value < 1.2e-38;
});

test('writeFloatLE 最小正规化单精度浮点数', () => {
  const buf = Buffer.allocUnsafe(4);
  const minNormal = 1.1754943508222875e-38;
  buf.writeFloatLE(minNormal, 0);
  const value = buf.readFloatLE(0);
  return value > 0 && value < 1.2e-38;
});

test('writeFloatBE 最小非正规化单精度浮点数', () => {
  const buf = Buffer.allocUnsafe(4);
  const minDenormal = 1.401298464324817e-45;
  buf.writeFloatBE(minDenormal, 0);
  const value = buf.readFloatBE(0);
  return value > 0 && value < 1.5e-45;
});

test('writeFloatLE 最小非正规化单精度浮点数', () => {
  const buf = Buffer.allocUnsafe(4);
  const minDenormal = 1.401298464324817e-45;
  buf.writeFloatLE(minDenormal, 0);
  const value = buf.readFloatLE(0);
  return value > 0 && value < 1.5e-45;
});

// 超出单精度范围的数值
test('writeFloatBE 超大值转为 Infinity', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(1e100, 0);
  const value = buf.readFloatBE(0);
  return value === Infinity;
});

test('writeFloatLE 超大值转为 Infinity', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(1e100, 0);
  const value = buf.readFloatLE(0);
  return value === Infinity;
});

test('writeFloatBE 超小值转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(1e-100, 0);
  const value = buf.readFloatBE(0);
  return value === 0;
});

test('writeFloatLE 超小值转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(1e-100, 0);
  const value = buf.readFloatLE(0);
  return value === 0;
});

// 精度损失
test('writeFloatBE 双精度值会损失精度', () => {
  const buf = Buffer.allocUnsafe(4);
  const precise = 1.2345678901234567;
  buf.writeFloatBE(precise, 0);
  const value = buf.readFloatBE(0);
  return Math.abs(value - precise) > 1e-9;
});

test('writeFloatLE 双精度值会损失精度', () => {
  const buf = Buffer.allocUnsafe(4);
  const precise = 1.2345678901234567;
  buf.writeFloatLE(precise, 0);
  const value = buf.readFloatLE(0);
  return Math.abs(value - precise) > 1e-9;
});

test('writeFloatBE 大整数会损失精度', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(16777217, 0);
  const value = buf.readFloatBE(0);
  return value !== 16777217;
});

test('writeFloatLE 大整数会损失精度', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(16777217, 0);
  const value = buf.readFloatLE(0);
  return value !== 16777217;
});

// 符号位测试
test('writeFloatBE 正零和负零字节表示不同', () => {
  const bufPos = Buffer.allocUnsafe(4);
  const bufNeg = Buffer.allocUnsafe(4);
  bufPos.writeFloatBE(0, 0);
  bufNeg.writeFloatBE(-0, 0);
  return bufPos[0] === 0x00 && bufNeg[0] === 0x80;
});

test('writeFloatLE 正零和负零字节表示不同', () => {
  const bufPos = Buffer.allocUnsafe(4);
  const bufNeg = Buffer.allocUnsafe(4);
  bufPos.writeFloatLE(0, 0);
  bufNeg.writeFloatLE(-0, 0);
  return bufPos[3] === 0x00 && bufNeg[3] === 0x80;
});

// 读写循环一致性
test('writeFloatBE 然后 readFloatBE 得到相同值', () => {
  const buf = Buffer.allocUnsafe(4);
  const original = 3.14159;
  buf.writeFloatBE(original, 0);
  const readBack = buf.readFloatBE(0);
  return Math.abs(readBack - original) < 0.00001;
});

test('writeFloatLE 然后 readFloatLE 得到相同值', () => {
  const buf = Buffer.allocUnsafe(4);
  const original = 3.14159;
  buf.writeFloatLE(original, 0);
  const readBack = buf.readFloatLE(0);
  return Math.abs(readBack - original) < 0.00001;
});

test('writeFloatBE 写入后用 readFloatLE 读取值不同', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(100.5, 0);
  const valueBE = buf.readFloatBE(0);
  const valueLE = buf.readFloatLE(0);
  return valueBE !== valueLE;
});

test('writeFloatLE 写入后用 readFloatBE 读取值不同', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(100.5, 0);
  const valueLE = buf.readFloatLE(0);
  const valueBE = buf.readFloatBE(0);
  return valueBE !== valueLE;
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
