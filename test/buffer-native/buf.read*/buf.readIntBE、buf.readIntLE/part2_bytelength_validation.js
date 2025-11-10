// byteLength 参数验证测试
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

// byteLength 边界测试
test('byteLength = 0（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 1（最小有效值）', () => {
  const buf = Buffer.from([0x7F]);
  return buf.readIntBE(0, 1) === 127;
});

test('byteLength = 6（最大有效值）', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 6) === 140737488355327;
});

test('byteLength = 7（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readIntBE(0, 7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 8（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readIntBE(0, 8);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('byteLength = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('byteLength = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readIntBE(0, 2.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 字符串数字（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readIntBE(0, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset + byteLength 边界测试
test('offset + byteLength = buf.length（临界值）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readIntBE(1, 2) === 0x3456;
});

test('offset + byteLength > buf.length（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readIntBE(2, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 0, byteLength > buf.length（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readIntBE(0, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 各种 byteLength 的正确读取
test('byteLength = 2', () => {
  const buf = Buffer.from([0x7F, 0xFF]);
  return buf.readIntBE(0, 2) === 32767;
});

test('byteLength = 3', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF]);
  return buf.readIntBE(0, 3) === 8388607;
});

test('byteLength = 4', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 4) === 2147483647;
});

test('byteLength = 5', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 5) === 549755813887;
});

// 负数测试
test('读取负数 byteLength = 1', () => {
  const buf = Buffer.from([0x80]);
  return buf.readIntBE(0, 1) === -128;
});

test('读取负数 byteLength = 2', () => {
  const buf = Buffer.from([0x80, 0x00]);
  return buf.readIntBE(0, 2) === -32768;
});

test('读取负数 byteLength = 3', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00]);
  return buf.readIntBE(0, 3) === -8388608;
});

test('读取负数 byteLength = 6', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readIntBE(0, 6) === -140737488355328;
});

// byteLength 边界测试
test('byteLength = 0（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntLE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 1（最小有效值）', () => {
  const buf = Buffer.from([0x7F]);
  return buf.readIntLE(0, 1) === 127;
});

test('byteLength = 6（最大有效值）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readIntLE(0, 6) === 140737488355327;
});

test('byteLength = 7（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readIntLE(0, 7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 8（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readIntLE(0, 8);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntLE(0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntLE(0, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('byteLength = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntLE(0, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('byteLength = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readIntLE(0, 2.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 字符串数字（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readIntLE(0, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset + byteLength 边界测试
test('offset + byteLength = buf.length（临界值）', () => {
  const buf = Buffer.from([0x12, 0x56, 0x34]);
  return buf.readIntLE(1, 2) === 0x3456;
});

test('offset + byteLength > buf.length（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readIntLE(2, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 0, byteLength > buf.length（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readIntLE(0, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 各种 byteLength 的正确读取（LE 字节序）
test('byteLength = 2', () => {
  const buf = Buffer.from([0xFF, 0x7F]);
  return buf.readIntLE(0, 2) === 32767;
});

test('byteLength = 3', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0x7F]);
  return buf.readIntLE(0, 3) === 8388607;
});

test('byteLength = 4', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readIntLE(0, 4) === 2147483647;
});

test('byteLength = 5', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readIntLE(0, 5) === 549755813887;
});

// 负数测试（LE 字节序）
test('读取负数 byteLength = 1', () => {
  const buf = Buffer.from([0x80]);
  return buf.readIntLE(0, 1) === -128;
});

test('读取负数 byteLength = 2', () => {
  const buf = Buffer.from([0x00, 0x80]);
  return buf.readIntLE(0, 2) === -32768;
});

test('读取负数 byteLength = 3', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80]);
  return buf.readIntLE(0, 3) === -8388608;
});

test('读取负数 byteLength = 6', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  return buf.readIntLE(0, 6) === -140737488355328;
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
