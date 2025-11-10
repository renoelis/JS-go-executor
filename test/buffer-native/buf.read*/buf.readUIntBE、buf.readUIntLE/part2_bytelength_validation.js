//  byteLength 参数验证测试
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
    buf.readUIntBE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 1（最小有效值）', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntBE(0, 1) === 255;
});

test('byteLength = 6（最大有效值）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 6) === 281474976710655;
});

test('byteLength = 7（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readUIntBE(0, 7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 8（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readUIntBE(0, 8);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readUIntBE(0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readUIntBE(0, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('byteLength = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readUIntBE(0, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('byteLength = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, 2.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 字符串数字（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset + byteLength 边界测试
test('offset + byteLength = buf.length（临界值）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readUIntBE(1, 2) === 0x3456;
});

test('offset + byteLength > buf.length（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntBE(2, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 0, byteLength > buf.length（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 各种 byteLength 的正确读取
test('byteLength = 2', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUIntBE(0, 2) === 65535;
});

test('byteLength = 3', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 3) === 16777215;
});

test('byteLength = 4', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 4) === 4294967295;
});

test('byteLength = 5', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 5) === 1099511627775;
});

// 零值测试
test('读取全零 byteLength = 1', () => {
  const buf = Buffer.from([0x00]);
  return buf.readUIntBE(0, 1) === 0;
});

test('读取全零 byteLength = 6', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 6) === 0;
});

// 混合值测试
test('读取混合值 byteLength = 3', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readUIntBE(0, 3) === 0x123456;
});

test('读取混合值 byteLength = 6', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  return buf.readUIntBE(0, 6) === 0x123456789ABC;
});

// byteLength 边界测试
test('byteLength = 0（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readUIntLE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 1（最小有效值）', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntLE(0, 1) === 255;
});

test('byteLength = 6（最大有效值）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 6) === 281474976710655;
});

test('byteLength = 7（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readUIntLE(0, 7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 8（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readUIntLE(0, 8);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readUIntLE(0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readUIntLE(0, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('byteLength = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readUIntLE(0, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('byteLength = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readUIntLE(0, 2.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength = 字符串数字（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readUIntLE(0, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset + byteLength 边界测试
test('offset + byteLength = buf.length（临界值）', () => {
  const buf = Buffer.from([0x12, 0x56, 0x34]);
  return buf.readUIntLE(1, 2) === 0x3456;
});

test('offset + byteLength > buf.length（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntLE(2, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 0, byteLength > buf.length（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 各种 byteLength 的正确读取（LE 字节序）
test('byteLength = 2', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUIntLE(0, 2) === 65535;
});

test('byteLength = 3', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 3) === 16777215;
});

test('byteLength = 4', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 4) === 4294967295;
});

test('byteLength = 5', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 5) === 1099511627775;
});

// 零值测试
test('读取全零 byteLength = 1', () => {
  const buf = Buffer.from([0x00]);
  return buf.readUIntLE(0, 1) === 0;
});

test('读取全零 byteLength = 6', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 6) === 0;
});

// 混合值测试（LE 字节序）
test('读取混合值 byteLength = 3', () => {
  const buf = Buffer.from([0x56, 0x34, 0x12]);
  return buf.readUIntLE(0, 3) === 0x123456;
});

test('读取混合值 byteLength = 6', () => {
  const buf = Buffer.from([0xBC, 0x9A, 0x78, 0x56, 0x34, 0x12]);
  return buf.readUIntLE(0, 6) === 0x123456789ABC;
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
