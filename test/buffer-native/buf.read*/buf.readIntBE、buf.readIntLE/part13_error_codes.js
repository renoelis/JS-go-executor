// buf.readIntBE/readIntLE - 错误码验证测试（对齐 Node.js v25.0.0）
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

// === ERR_OUT_OF_RANGE 错误码测试 - offset ===

test('ERR_OUT_OF_RANGE: readIntBE offset 越界', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntBE(2, 3); // 只有 4 字节，offset=2 + byteLength=3 会越界
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: readIntLE offset 越界', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntLE(2, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: readIntBE 负数 offset', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntBE(-1, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: readIntLE 负数 offset', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntLE(-1, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: readIntBE offset 为 NaN', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntBE(NaN, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: readIntLE offset 为 Infinity', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntLE(Infinity, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: readIntBE offset 为 -Infinity', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntBE(-Infinity, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: readIntLE offset 为小数', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntLE(0.5, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

// === ERR_OUT_OF_RANGE 错误码测试 - byteLength ===

test('ERR_OUT_OF_RANGE: readIntBE byteLength = 0', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntBE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: readIntLE byteLength = 7', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    buf.readIntLE(0, 7);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: readIntBE 负数 byteLength', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntBE(0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: readIntLE byteLength 为小数', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntLE(0, 2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: readIntBE offset + byteLength 超出', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntBE(2, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

// === ERR_INVALID_ARG_TYPE 错误码测试 ===

test('ERR_INVALID_ARG_TYPE: readIntBE offset 为字符串', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntBE('0', 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('ERR_INVALID_ARG_TYPE: readIntLE offset 为对象', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntLE({}, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('ERR_INVALID_ARG_TYPE: readIntBE offset 为数组', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntBE([], 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('ERR_INVALID_ARG_TYPE: readIntLE byteLength 为字符串', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntLE(0, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('ERR_INVALID_ARG_TYPE: readIntBE byteLength 为 null', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntBE(0, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('ERR_INVALID_ARG_TYPE: readIntLE byteLength 为 undefined', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readIntLE(0, undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
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
