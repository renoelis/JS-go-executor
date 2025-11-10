// 边界与错误测试
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

// 默认参数测试
test('默认 offset = 0', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE() === 0x12345678;
});

// 边界值测试
test('offset = buf.length - 4（最后 4 字节）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE(2) === 0x12345678;
});

test('offset = buf.length - 3（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 字符串（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE('2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 空 Buffer 测试
test('Buffer 长度不足 4 字节（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 边界值数据测试
test('读取 -1（0xFFFFFFFF）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readInt32BE(0) === -1;
});

test('读取 -2147483648（最小值 0x80000000）', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf.readInt32BE(0) === -2147483648;
});

test('读取 2147483647（最大值 0x7FFFFFFF）', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  return buf.readInt32BE(0) === 2147483647;
});

test('读取 0', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readInt32BE(0) === 0;
});

test('读取 1', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x01]);
  return buf.readInt32BE(0) === 1;
});

test('默认 offset = 0', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readInt32LE() === 0x12345678;
});

test('offset = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x00, 0x00, 0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 字符串（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x00, 0x00, 0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE('2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('读取 -1（LE）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readInt32LE(0) === -1;
});

test('读取 -2147483648（最小值 LE）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  return buf.readInt32LE(0) === -2147483648;
});

test('读取 2147483647（最大值 LE）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readInt32LE(0) === 2147483647;
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
