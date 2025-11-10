//  Complete Tests
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

test('读取 1 字节', () => {
  const buf = Buffer.alloc(1);
  buf.writeUIntBE(255, 0, 1);
  return buf.readUIntBE(0, 1) === 255;
});

test('读取 2 字节', () => {
  const buf = Buffer.alloc(2);
  buf.writeUIntBE(65535, 0, 2);
  return buf.readUIntBE(0, 2) === 65535;
});

test('读取 3 字节', () => {
  const buf = Buffer.alloc(3);
  buf.writeUIntBE(16777215, 0, 3);
  return buf.readUIntBE(0, 3) === 16777215;
});

test('读取 4 字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeUIntBE(4294967295, 0, 4);
  return buf.readUIntBE(0, 4) === 4294967295;
});

test('读取 6 字节', () => {
  const buf = Buffer.alloc(6);
  buf.writeUIntBE(281474976710655, 0, 6);
  return buf.readUIntBE(0, 6) === 281474976710655;
});

test('offset 测试', () => {
  const buf = Buffer.alloc(8);
  buf.writeUIntBE(1000, 2, 2);
  return buf.readUIntBE(2, 2) === 1000;
});

test('RangeError: byteLength 为 0', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readUIntBE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('往返测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeUIntBE(100000, 0, 4);
  return buf.readUIntBE(0, 4) === 100000;
});

test('读取 1 字节', () => {
  const buf = Buffer.alloc(1);
  buf.writeUIntLE(255, 0, 1);
  return buf.readUIntLE(0, 1) === 255;
});

test('读取 2 字节', () => {
  const buf = Buffer.alloc(2);
  buf.writeUIntLE(65535, 0, 2);
  return buf.readUIntLE(0, 2) === 65535;
});

test('读取 3 字节', () => {
  const buf = Buffer.alloc(3);
  buf.writeUIntLE(16777215, 0, 3);
  return buf.readUIntLE(0, 3) === 16777215;
});

test('读取 4 字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeUIntLE(4294967295, 0, 4);
  return buf.readUIntLE(0, 4) === 4294967295;
});

test('读取 6 字节', () => {
  const buf = Buffer.alloc(6);
  buf.writeUIntLE(281474976710655, 0, 6);
  return buf.readUIntLE(0, 6) === 281474976710655;
});

test('offset 测试', () => {
  const buf = Buffer.alloc(8);
  buf.writeUIntLE(1000, 2, 2);
  return buf.readUIntLE(2, 2) === 1000;
});

test('RangeError: byteLength 为 0', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readUIntLE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('往返测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeUIntLE(100000, 0, 4);
  return buf.readUIntLE(0, 4) === 100000;
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
