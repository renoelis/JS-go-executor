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

test('读取零', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0, 0);
  return buf.readUInt32BE(0) === 0;
});

test('读取最大值 4294967295', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(4294967295, 0);
  return buf.readUInt32BE(0) === 4294967295;
});

test('读取中间值', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(2147483647, 0);
  return buf.readUInt32BE(0) === 2147483647;
});

test('offset 测试', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(1000, 4);
  return buf.readUInt32BE(4) === 1000;
});

test('RangeError: offset 超出', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readUInt32BE(5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('往返测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(1000, 0);
  return buf.readUInt32BE(0) === 1000;
});

test('读取零', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0, 0);
  return buf.readUInt32LE(0) === 0;
});

test('读取最大值 4294967295', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(4294967295, 0);
  return buf.readUInt32LE(0) === 4294967295;
});

test('读取中间值', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(2147483647, 0);
  return buf.readUInt32LE(0) === 2147483647;
});

test('offset 测试', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt32LE(1000, 4);
  return buf.readUInt32LE(4) === 1000;
});

test('RangeError: offset 超出', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readUInt32LE(5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('往返测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(1000, 0);
  return buf.readUInt32LE(0) === 1000;
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
