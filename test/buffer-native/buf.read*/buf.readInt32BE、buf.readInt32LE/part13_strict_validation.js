// 严格验证测试 - freeze/seal/DataView互操作
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

// === Object.freeze 测试（Node.js v25 不允许freeze Buffer）===

test('freeze Buffer 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    Object.freeze(buf);
    return false; // 如果没抛出错误，测试失败
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('freeze Buffer 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    Object.freeze(buf);
    return false; // 如果没抛出错误，测试失败
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === Object.seal 测试 ===

test('seal Buffer 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    Object.seal(buf);
    return false; // 如果没抛出错误，测试失败
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('seal Buffer 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    Object.seal(buf);
    return false; // 如果没抛出错误，测试失败
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === Object.preventExtensions 测试 ===

test('preventExtensions Buffer 后仍可读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  Object.preventExtensions(buf);
  return buf.readInt32BE(0) === 0x12345678;
});

test('preventExtensions Buffer 后仍可读取 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  Object.preventExtensions(buf);
  return buf.readInt32LE(0) === 0x12345678;
});

// === DataView 互操作性 ===

test('DataView 与 Buffer 一致性 - BE正数', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setInt32(0, 0x12345678, false); // BE
  const buf = Buffer.from(ab);
  return buf.readInt32BE(0) === 0x12345678;
});

test('DataView 与 Buffer 一致性 - LE正数', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setInt32(0, 0x12345678, true); // LE
  const buf = Buffer.from(ab);
  return buf.readInt32LE(0) === 0x12345678;
});

test('DataView 与 Buffer 一致性 - BE负数', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setInt32(0, -1, false); // BE
  const buf = Buffer.from(ab);
  return buf.readInt32BE(0) === -1;
});

test('DataView 与 Buffer 一致性 - LE负数', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setInt32(0, -1, true); // LE
  const buf = Buffer.from(ab);
  return buf.readInt32LE(0) === -1;
});

// === 严格模式测试 ===

test('严格模式下读取 - BE', () => {
  'use strict';
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE(0) === 0x12345678;
});

test('严格模式下读取 - LE', () => {
  'use strict';
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readInt32LE(0) === 0x12345678;
});

test('严格模式下错误抛出 - BE', () => {
  'use strict';
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('严格模式下错误抛出 - LE', () => {
  'use strict';
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === JSON 序列化往返 ===

test('JSON往返后读取 - BE', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const json = JSON.stringify(buf1);
  const obj = JSON.parse(json);
  const buf2 = Buffer.from(obj.data);
  return buf2.readInt32BE(0) === 0x12345678;
});

test('JSON往返后读取 - LE', () => {
  const buf1 = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const json = JSON.stringify(buf1);
  const obj = JSON.parse(json);
  const buf2 = Buffer.from(obj.data);
  return buf2.readInt32LE(0) === 0x12345678;
});

// === toString 编码往返 ===

test('toString hex 往返后读取 - BE', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const hex = buf1.toString('hex');
  const buf2 = Buffer.from(hex, 'hex');
  return buf2.readInt32BE(0) === 0x12345678;
});

test('toString base64 往返后读取 - LE', () => {
  const buf1 = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const b64 = buf1.toString('base64');
  const buf2 = Buffer.from(b64, 'base64');
  return buf2.readInt32LE(0) === 0x12345678;
});

// === Buffer.isBuffer 验证 ===

test('Buffer.isBuffer 验证 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return Buffer.isBuffer(buf) && buf.readInt32BE(0) === 0x12345678;
});

test('Buffer.isBuffer 验证 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return Buffer.isBuffer(buf) && buf.readInt32LE(0) === 0x12345678;
});

// === 全面字节值覆盖 ===

test('256个可能高字节值遍历 - BE', () => {
  let pass = true;
  for (let highByte = 0; highByte < 256; highByte++) {
    const buf = Buffer.from([highByte, 0x00, 0x00, 0x00]);
    const expected = highByte >= 128 ? (highByte - 256) * 16777216 : highByte * 16777216;
    if (buf.readInt32BE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('256个可能低字节值遍历 - LE', () => {
  let pass = true;
  for (let lowByte = 0; lowByte < 256; lowByte++) {
    const buf = Buffer.from([lowByte, 0x00, 0x00, 0x00]);
    if (buf.readInt32LE(0) !== lowByte) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 连续读取稳定性 ===

test('连续100次读取一致性 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const expected = 0x12345678;
  let pass = true;
  for (let i = 0; i < 100; i++) {
    if (buf.readInt32BE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('连续100次读取一致性 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const expected = 0x12345678;
  let pass = true;
  for (let i = 0; i < 100; i++) {
    if (buf.readInt32LE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
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
