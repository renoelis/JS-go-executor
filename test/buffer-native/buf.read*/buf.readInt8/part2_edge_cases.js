// buf.readInt8() - 边界与错误测试
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
  const buf = Buffer.from([127]);
  return buf.readInt8() === 127;
});

// 边界值测试
test('offset = buf.length - 1（最后一个字节）', () => {
  const buf = Buffer.from([1, 2, 3, 127]);
  return buf.readInt8(3) === 127;
});

test('offset = buf.length（应抛出错误）', () => {
  try {
    const buf = Buffer.from([1]);
    buf.readInt8(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([1]);
    buf.readInt8(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 负数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.readInt8(-5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 参数类型测试
test('offset = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.from([1]);
    buf.readInt8(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.from([1]);
    buf.readInt8(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 127]);
    buf.readInt8(1.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 字符串数字（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 127]);
    buf.readInt8('1');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = 非数字字符串（应抛出错误）', () => {
  try {
    const buf = Buffer.from([1]);
    buf.readInt8('abc');
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 空 Buffer 测试
test('空 Buffer 读取（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readInt8(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 边界值数据测试
test('读取 -1（0xFF）', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readInt8(0) === -1;
});

test('读取 -128（最小值）', () => {
  const buf = Buffer.from([0x80]);
  return buf.readInt8(0) === -128;
});

test('读取 127（最大值）', () => {
  const buf = Buffer.from([0x7F]);
  return buf.readInt8(0) === 127;
});

test('读取 0x00', () => {
  const buf = Buffer.from([0x00]);
  return buf.readInt8(0) === 0;
});

test('读取 0x01', () => {
  const buf = Buffer.from([0x01]);
  return buf.readInt8(0) === 1;
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
