// offset 参数验证测试
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

// offset 边界测试 - readIntBE
test('offset=0: readIntBE(0, 4) 正常', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('offset 最大值: readIntBE(buf.length - byteLength, byteLength)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x78]);
  return buf.readIntBE(2, 4) === 0x12345678;
});

test('offset 超出: readIntBE(buf.length - byteLength + 1, byteLength) 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE(1, 4);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset = buf.length: 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE(4, 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset < 0: 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE(-1, 4);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset = NaN: 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE(NaN, 4);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = Infinity: 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE(Infinity, 4);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 浮点数: 3.9 应该失败或截断为 3', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90]);
    buf.readIntBE(3.9, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 字符串: "1" 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE('1', 4);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = null: 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE(null, 4);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = undefined: 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE(undefined, 4);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = {}: 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE({}, 4);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// offset 边界测试 - readIntLE
test('offset=0: readIntLE(0, 4) 正常', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('offset 最大值: readIntLE(buf.length - byteLength, byteLength)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x78, 0x56, 0x34, 0x12]);
  return buf.readIntLE(2, 4) === 0x12345678;
});

test('offset 超出: readIntLE(buf.length - byteLength + 1, byteLength) 应失败', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readIntLE(1, 4);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset = buf.length: 应失败', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readIntLE(4, 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset < 0: 应失败', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readIntLE(-1, 4);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset = NaN: 应失败', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readIntLE(NaN, 4);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = Infinity: 应失败', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readIntLE(Infinity, 4);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// offset + byteLength 边界
test('offset + byteLength = buf.length: 临界值正常', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readIntBE(1, 2) === 0x3456;
});

test('offset + byteLength > buf.length: 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readIntBE(2, 2);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset=0, byteLength > buf.length: 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readIntBE(0, 3);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// 空 buffer 测试
test('空 Buffer: readIntBE(0, 1) 应失败', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readIntBE(0, 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('空 Buffer: readIntLE(0, 1) 应失败', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readIntLE(0, 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
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
