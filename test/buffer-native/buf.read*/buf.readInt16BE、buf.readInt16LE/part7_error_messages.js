// 错误消息和特殊场景测试
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

// 错误类型验证
test('offset超出范围抛出RangeError - BE', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.readInt16BE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset超出范围抛出RangeError - LE', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.readInt16LE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset为字符串抛出TypeError - BE', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.readInt16BE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset为字符串抛出TypeError - LE', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.readInt16LE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Buffer长度边界测试
test('2字节buffer offset=0 成功 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE(0) === 0x1234;
});

test('2字节buffer offset=0 成功 - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return buf.readInt16LE(0) === 0x1234;
});

test('3字节buffer offset=0 成功 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readInt16BE(0) === 0x1234;
});

test('3字节buffer offset=0 成功 - LE', () => {
  const buf = Buffer.from([0x34, 0x12, 0x56]);
  return buf.readInt16LE(0) === 0x1234;
});

test('3字节buffer offset=1 成功 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readInt16BE(1) === 0x3456;
});

test('3字节buffer offset=1 成功 - LE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readInt16LE(1) === 0x5634;
});

test('3字节buffer offset=2 失败 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readInt16BE(2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('3字节buffer offset=2 失败 - LE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readInt16LE(2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊值边界测试
test('读取0x7FFF (32767最大值) - BE', () => {
  const buf = Buffer.from([0x7F, 0xFF]);
  return buf.readInt16BE(0) === 32767;
});

test('读取0x7FFF (32767最大值) - LE', () => {
  const buf = Buffer.from([0xFF, 0x7F]);
  return buf.readInt16LE(0) === 32767;
});

test('读取0x8000 (-32768最小值) - BE', () => {
  const buf = Buffer.from([0x80, 0x00]);
  return buf.readInt16BE(0) === -32768;
});

test('读取0x8000 (-32768最小值) - LE', () => {
  const buf = Buffer.from([0x00, 0x80]);
  return buf.readInt16LE(0) === -32768;
});

test('读取0x8001 (-32767) - BE', () => {
  const buf = Buffer.from([0x80, 0x01]);
  return buf.readInt16BE(0) === -32767;
});

test('读取0x8001 (-32767) - LE', () => {
  const buf = Buffer.from([0x01, 0x80]);
  return buf.readInt16LE(0) === -32767;
});

test('读取0x7FFE (32766) - BE', () => {
  const buf = Buffer.from([0x7F, 0xFE]);
  return buf.readInt16BE(0) === 32766;
});

test('读取0x7FFE (32766) - LE', () => {
  const buf = Buffer.from([0xFE, 0x7F]);
  return buf.readInt16LE(0) === 32766;
});

// 零值测试
test('读取0x0000 - BE', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readInt16BE(0) === 0;
});

test('读取0x0000 - LE', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readInt16LE(0) === 0;
});

test('读取0x0001 - BE', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readInt16BE(0) === 1;
});

test('读取0x0001 - LE', () => {
  const buf = Buffer.from([0x01, 0x00]);
  return buf.readInt16LE(0) === 1;
});

test('读取0xFFFF (-1) - BE', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readInt16BE(0) === -1;
});

test('读取0xFFFF (-1) - LE', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readInt16LE(0) === -1;
});

test('读取0xFFFE (-2) - BE', () => {
  const buf = Buffer.from([0xFF, 0xFE]);
  return buf.readInt16BE(0) === -2;
});

test('读取0xFFFE (-2) - LE', () => {
  const buf = Buffer.from([0xFE, 0xFF]);
  return buf.readInt16LE(0) === -2;
});

// 各种offset边界
test('offset刚好在边界 buf.length-2 - BE', () => {
  const buf = Buffer.alloc(10);
  buf[8] = 0x12;
  buf[9] = 0x34;
  return buf.readInt16BE(8) === 0x1234;
});

test('offset刚好在边界 buf.length-2 - LE', () => {
  const buf = Buffer.alloc(10);
  buf[8] = 0x34;
  buf[9] = 0x12;
  return buf.readInt16LE(8) === 0x1234;
});

test('offset超过边界1字节 - BE', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.readInt16BE(9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset超过边界1字节 - LE', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.readInt16LE(9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// slice后的buffer
test('slice后的buffer读取 - BE', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x00]);
  const sliced = buf.slice(1, 3);
  return sliced.readInt16BE(0) === 0x1234;
});

test('slice后的buffer读取 - LE', () => {
  const buf = Buffer.from([0x00, 0x34, 0x12, 0x00]);
  const sliced = buf.slice(1, 3);
  return sliced.readInt16LE(0) === 0x1234;
});

test('slice后的buffer越界 - BE', () => {
  try {
    const buf = Buffer.from([0x00, 0x12, 0x34, 0x00]);
    const sliced = buf.slice(1, 3);
    sliced.readInt16BE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('slice后的buffer越界 - LE', () => {
  try {
    const buf = Buffer.from([0x00, 0x34, 0x12, 0x00]);
    const sliced = buf.slice(1, 3);
    sliced.readInt16LE(1);
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
