// buf.writeUInt16BE/LE() - Error Tests
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

// offset 越界错误
test('writeUInt16BE: offset 为负数抛出 RangeError', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 为负数抛出 RangeError', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: offset 超出 buffer 长度', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 超出 buffer 长度', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: offset 等于 buffer 长度', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, 4);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 等于 buffer 长度', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, 4);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: offset 远大于 buffer 长度', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, 100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 远大于 buffer 长度', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, 100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 边界 offset
test('writeUInt16BE: offset 最大合法值', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeUInt16BE(0x1234, 2);
  return result === 4 && buf[2] === 0x12 && buf[3] === 0x34;
});

test('writeUInt16LE: offset 最大合法值', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeUInt16LE(0x1234, 2);
  return result === 4 && buf[2] === 0x34 && buf[3] === 0x12;
});

test('writeUInt16BE: offset 刚好越界', () => {
  const buf = Buffer.alloc(3);
  try {
    buf.writeUInt16BE(0x1234, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 刚好越界', () => {
  const buf = Buffer.alloc(3);
  try {
    buf.writeUInt16LE(0x1234, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// NaN 和 Infinity
test('writeUInt16BE: value 为 NaN', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(NaN, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16LE: value 为 NaN', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(NaN, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16BE: value 为 Infinity 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: value 为 Infinity 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: value 为 -Infinity 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(-Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: value 为 -Infinity 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(-Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: offset 为 NaN', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 为 NaN', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: offset 为 Infinity', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 为 Infinity', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// undefined 和 null
test('writeUInt16BE: value 为 undefined', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(undefined, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16LE: value 为 undefined', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(undefined, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16BE: value 为 null', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(null, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16LE: value 为 null', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(null, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16BE: offset 为 undefined 视为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1234, undefined);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: offset 为 undefined 视为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1234, undefined);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

test('writeUInt16BE: offset 为 null 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16LE: offset 为 null 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 空 buffer
test('writeUInt16BE: 空 buffer 写入报错', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeUInt16BE(0x1234, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 空 buffer 写入报错', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeUInt16LE(0x1234, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: 长度为 1 的 buffer 写入报错', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt16BE(0x1234, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 长度为 1 的 buffer 写入报错', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt16LE(0x1234, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
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
