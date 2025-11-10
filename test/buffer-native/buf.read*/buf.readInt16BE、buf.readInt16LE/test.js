// Complete Tests
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

test('读取正数', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(16383, 0);
  return buf.readInt16BE(0) === 16383;
});

test('读取负数', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(-16384, 0);
  return buf.readInt16BE(0) === -16384;
});

test('读取零', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(0, 0);
  return buf.readInt16BE(0) === 0;
});

test('读取最大值 32767', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(32767, 0);
  return buf.readInt16BE(0) === 32767;
});

test('读取最小值 -32768', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(-32768, 0);
  return buf.readInt16BE(0) === -32768;
});

test('offset 测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(1000, 2);
  return buf.readInt16BE(2) === 1000;
});

test('RangeError: offset 超出', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.readInt16BE(3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('往返测试', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(1000, 0);
  return buf.readInt16BE(0) === 1000;
});

test('读取正数', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16LE(16383, 0);
  return buf.readInt16LE(0) === 16383;
});

test('读取负数', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16LE(-16384, 0);
  return buf.readInt16LE(0) === -16384;
});

test('读取零', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16LE(0, 0);
  return buf.readInt16LE(0) === 0;
});

test('读取最大值 32767', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16LE(32767, 0);
  return buf.readInt16LE(0) === 32767;
});

test('读取最小值 -32768', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16LE(-32768, 0);
  return buf.readInt16LE(0) === -32768;
});

test('offset 测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(1000, 2);
  return buf.readInt16LE(2) === 1000;
});

test('RangeError: offset 超出', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.readInt16LE(3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('往返测试', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16LE(1000, 0);
  return buf.readInt16LE(0) === 1000;
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
