// buf.readFloatLE() - 特殊值与边界测试
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

// 特殊浮点数值
test('读取 Infinity', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(Infinity, 0);
  return buf.readFloatLE(0) === Infinity;
});

test('读取 -Infinity', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(-Infinity, 0);
  return buf.readFloatLE(0) === -Infinity;
});

test('读取 NaN', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(NaN, 0);
  return Number.isNaN(buf.readFloatLE(0));
});

test('读取 +0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(+0, 0);
  const result = buf.readFloatLE(0);
  return result === 0 && 1 / result === Infinity;
});

test('读取 -0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(-0, 0);
  const result = buf.readFloatLE(0);
  return result === 0 && 1 / result === -Infinity;
});

// 默认参数测试
test('默认 offset = 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.14, 0);
  return Math.abs(buf.readFloatLE() - 3.14) < 0.01;
});

// offset 边界测试
test('offset = buf.length - 4（最后 4 字节）', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(2.718, 4);
  return Math.abs(buf.readFloatLE(4) - 2.718) < 0.001;
});

test('offset = buf.length - 3（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeFloatLE(1.5, 4);
    buf.readFloatLE(4.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 字符串数字（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeFloatLE(2.5, 4);
    buf.readFloatLE('4');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 空 Buffer 测试
test('空 Buffer 读取（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度不足 4 字节（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 精度测试（Float32 精度限制）
test('大数值精度损失', () => {
  const buf = Buffer.alloc(4);
  const value = 3.4028234663852886e+38;
  buf.writeFloatLE(value, 0);
  const read = buf.readFloatLE(0);
  return Math.abs(read - value) / value < 0.0001;
});

test('小数值精度', () => {
  const buf = Buffer.alloc(4);
  const value = 1.175494e-38;
  buf.writeFloatLE(value, 0);
  const read = buf.readFloatLE(0);
  return Math.abs(read - value) / value < 0.01;
});

// 原始字节测试（LE 字节序）
test('读取原始字节（Infinity）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x7F]);
  return buf.readFloatLE(0) === Infinity;
});

test('读取原始字节（-Infinity）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0xFF]);
  return buf.readFloatLE(0) === -Infinity;
});

test('读取原始字节（NaN）', () => {
  const buf = Buffer.from([0x00, 0x00, 0xC0, 0x7F]);
  return Number.isNaN(buf.readFloatLE(0));
});

test('读取原始字节（+0）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const result = buf.readFloatLE(0);
  return result === 0 && 1 / result === Infinity;
});

test('读取原始字节（-0）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  const result = buf.readFloatLE(0);
  return result === 0 && 1 / result === -Infinity;
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
