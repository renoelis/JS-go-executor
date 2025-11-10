// buf.readDoubleLE() - 特殊值与边界测试
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
test('读取 -Infinity', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-Infinity, 0);
  return buf.readDoubleLE(0) === -Infinity;
});

test('读取 +0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(+0, 0);
  const result = buf.readDoubleLE(0);
  return result === 0 && 1 / result === Infinity;
});

test('读取 -0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-0, 0);
  const result = buf.readDoubleLE(0);
  return result === 0 && 1 / result === -Infinity;
});

test('读取最小正数（MIN_VALUE）', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.MIN_VALUE, 0);
  return buf.readDoubleLE(0) === Number.MIN_VALUE;
});

test('读取负的最大值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-Number.MAX_VALUE, 0);
  return buf.readDoubleLE(0) === -Number.MAX_VALUE;
});

test('读取 Number.EPSILON', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.EPSILON, 0);
  return buf.readDoubleLE(0) === Number.EPSILON;
});

// 默认参数测试
test('默认 offset = 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(3.14, 0);
  return Math.abs(buf.readDoubleLE() - 3.14) < 0.0001;
});

// offset 边界测试
test('offset = buf.length - 8（最后 8 字节）', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(2.718, 8);
  return Math.abs(buf.readDoubleLE(8) - 2.718) < 0.0001;
});

test('offset = buf.length - 7（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeDoubleLE(1.5, 8);
    buf.readDoubleLE(8.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 字符串数字（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeDoubleLE(2.5, 8);
    buf.readDoubleLE('8');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 空 Buffer 测试
test('空 Buffer 读取（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readDoubleLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度不足 8 字节（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readDoubleLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 精度测试
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

test('科学计数法', () => {
  const buf = Buffer.alloc(8);
  const value = 1.23e-100;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

// 原始字节测试（LE 字节序）
test('读取原始字节（Infinity）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x7F]);
  return buf.readDoubleLE(0) === Infinity;
});

test('读取原始字节（-Infinity）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0xFF]);
  return buf.readDoubleLE(0) === -Infinity;
});

test('读取原始字节（NaN）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0x7F]);
  return Number.isNaN(buf.readDoubleLE(0));
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
