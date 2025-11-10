//边界与错误测试
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
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE() === 0x1234;
});

// 边界值测试
test('offset = buf.length - 2（最后 2 字节）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x12, 0x34]);
  return buf.readInt16BE(2) === 0x1234;
});

test('offset = buf.length - 1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = buf.length（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 参数类型测试
test('offset = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x00, 0x00, 0x12, 0x34]);
    buf.readInt16BE(2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 字符串数字（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x00, 0x00, 0x12, 0x34]);
    buf.readInt16BE('2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 空 Buffer 测试
test('空 Buffer 读取（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readInt16BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度不足 2 字节（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readInt16BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 边界值数据测试
test('读取 -1（0xFFFF）', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readInt16BE(0) === -1;
});

test('读取 -32768（最小值 0x8000）', () => {
  const buf = Buffer.from([0x80, 0x00]);
  return buf.readInt16BE(0) === -32768;
});

test('读取 32767（最大值 0x7FFF）', () => {
  const buf = Buffer.from([0x7F, 0xFF]);
  return buf.readInt16BE(0) === 32767;
});

test('读取 0x0000', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readInt16BE(0) === 0;
});

test('读取 0x0001', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readInt16BE(0) === 1;
});

test('读取负数 -256（0xFF00）', () => {
  const buf = Buffer.from([0xFF, 0x00]);
  return buf.readInt16BE(0) === -256;
});

// 默认参数测试
test('默认 offset = 0', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return buf.readInt16LE() === 0x1234;
});

// 边界值测试
test('offset = buf.length - 2（最后 2 字节）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x34, 0x12]);
  return buf.readInt16LE(2) === 0x1234;
});

test('offset = buf.length - 1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readInt16LE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readInt16LE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readInt16LE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x00, 0x00, 0x34, 0x12]);
    buf.readInt16LE(2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 字符串（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x00, 0x00, 0x34, 0x12]);
    buf.readInt16LE('2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 边界值数据测试（LE 字节序）
test('读取 -1（0xFFFF）', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readInt16LE(0) === -1;
});

test('读取 -32768（最小值）', () => {
  const buf = Buffer.from([0x00, 0x80]);
  return buf.readInt16LE(0) === -32768;
});

test('读取 32767（最大值）', () => {
  const buf = Buffer.from([0xFF, 0x7F]);
  return buf.readInt16LE(0) === 32767;
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
