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

test('读取 1 字节正数', () => {
  const buf = Buffer.alloc(1);
  buf.writeIntBE(127, 0, 1);
  return buf.readIntBE(0, 1) === 127;
});

test('读取 1 字节负数', () => {
  const buf = Buffer.alloc(1);
  buf.writeIntBE(-128, 0, 1);
  return buf.readIntBE(0, 1) === -128;
});

test('读取 2 字节', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntBE(32767, 0, 2);
  return buf.readIntBE(0, 2) === 32767;
});

test('读取 3 字节', () => {
  const buf = Buffer.alloc(3);
  buf.writeIntBE(8388607, 0, 3);
  return buf.readIntBE(0, 3) === 8388607;
});

test('读取 4 字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(2147483647, 0, 4);
  return buf.readIntBE(0, 4) === 2147483647;
});

test('读取 6 字节', () => {
  const buf = Buffer.alloc(6);
  buf.writeIntBE(140737488355327, 0, 6);
  return buf.readIntBE(0, 6) === 140737488355327;
});

test('offset 测试', () => {
  const buf = Buffer.alloc(8);
  buf.writeIntBE(1000, 2, 2);
  return buf.readIntBE(2, 2) === 1000;
});

test('RangeError: byteLength 为 0', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readIntBE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('往返测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(100000, 0, 4);
  return buf.readIntBE(0, 4) === 100000;
});

test('读取 1 字节正数', () => {
  const buf = Buffer.alloc(1);
  buf.writeIntLE(127, 0, 1);
  return buf.readIntLE(0, 1) === 127;
});

test('读取 1 字节负数', () => {
  const buf = Buffer.alloc(1);
  buf.writeIntLE(-128, 0, 1);
  return buf.readIntLE(0, 1) === -128;
});

test('读取 2 字节', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntLE(32767, 0, 2);
  return buf.readIntLE(0, 2) === 32767;
});

test('读取 3 字节', () => {
  const buf = Buffer.alloc(3);
  buf.writeIntLE(8388607, 0, 3);
  return buf.readIntLE(0, 3) === 8388607;
});

test('读取 4 字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntLE(2147483647, 0, 4);
  return buf.readIntLE(0, 4) === 2147483647;
});

test('读取 6 字节', () => {
  const buf = Buffer.alloc(6);
  buf.writeIntLE(140737488355327, 0, 6);
  return buf.readIntLE(0, 6) === 140737488355327;
});

test('offset 测试', () => {
  const buf = Buffer.alloc(8);
  buf.writeIntLE(1000, 2, 2);
  return buf.readIntLE(2, 2) === 1000;
});

test('RangeError: byteLength 为 0', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readIntLE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('往返测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntLE(100000, 0, 4);
  return buf.readIntLE(0, 4) === 100000;
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
