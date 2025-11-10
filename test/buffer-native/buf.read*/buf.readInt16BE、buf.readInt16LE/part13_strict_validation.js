// 严格验证 - 冻结/密封Buffer、DataView、严格模式
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

// === 冻结的Buffer测试（应该抛出错误）===

test('Object.freeze Buffer应该抛出TypeError - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    Object.freeze(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('Object.freeze Buffer应该抛出TypeError - LE', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    Object.freeze(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === 密封的Buffer测试（应该抛出错误）===

test('Object.seal Buffer应该抛出TypeError - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('Object.seal Buffer应该抛出TypeError - LE', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === 不可扩展的Buffer测试 ===

test('Object.preventExtensions后的Buffer仍可读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  Object.preventExtensions(buf);
  return buf.readInt16BE(0) === 0x1234;
});

test('Object.preventExtensions后的Buffer仍可读取 - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  Object.preventExtensions(buf);
  return buf.readInt16LE(0) === 0x1234;
});

// === DataView互操作 ===

test('DataView设置值后Buffer读取 - BE', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setInt16(0, 0x1234, false); // false = BE
  const buf = Buffer.from(ab);
  return buf.readInt16BE(0) === 0x1234;
});

test('DataView设置值后Buffer读取 - LE', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setInt16(0, 0x1234, true); // true = LE
  const buf = Buffer.from(ab);
  return buf.readInt16LE(0) === 0x1234;
});

test('Buffer与DataView一致性 - BE负数', () => {
  const ab = new ArrayBuffer(2);
  const dv = new DataView(ab);
  const buf = Buffer.from(ab);
  
  dv.setInt16(0, -32768, false); // BE
  return buf.readInt16BE(0) === -32768;
});

test('Buffer与DataView一致性 - LE负数', () => {
  const ab = new ArrayBuffer(2);
  const dv = new DataView(ab);
  const buf = Buffer.from(ab);
  
  dv.setInt16(0, -32768, true); // LE
  return buf.readInt16LE(0) === -32768;
});

// === 严格模式测试 ===

test('严格模式下读取 - BE', () => {
  'use strict';
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE(0) === 0x1234;
});

test('严格模式下读取 - LE', () => {
  'use strict';
  const buf = Buffer.from([0x34, 0x12]);
  return buf.readInt16LE(0) === 0x1234;
});

test('严格模式下错误抛出 - BE', () => {
  'use strict';
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('严格模式下错误抛出 - LE', () => {
  'use strict';
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readInt16LE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === JSON序列化往返 ===

test('JSON序列化后恢复再读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const json = JSON.stringify(buf);
  const restored = Buffer.from(JSON.parse(json).data);
  return restored.readInt16BE(0) === 0x1234;
});

test('JSON序列化后恢复再读取 - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const json = JSON.stringify(buf);
  const restored = Buffer.from(JSON.parse(json).data);
  return restored.readInt16LE(0) === 0x1234;
});

// === toString编码往返 ===

test('toString hex往返后读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const hex = buf.toString('hex');
  const restored = Buffer.from(hex, 'hex');
  return restored.readInt16BE(0) === 0x1234;
});

test('toString hex往返后读取 - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const hex = buf.toString('hex');
  const restored = Buffer.from(hex, 'hex');
  return restored.readInt16LE(0) === 0x1234;
});

test('toString base64往返后读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const b64 = buf.toString('base64');
  const restored = Buffer.from(b64, 'base64');
  return restored.readInt16BE(0) === 0x1234;
});

test('toString base64往返后读取 - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const b64 = buf.toString('base64');
  const restored = Buffer.from(b64, 'base64');
  return restored.readInt16LE(0) === 0x1234;
});

// === Buffer.isBuffer验证 ===

test('Buffer.isBuffer在读取前验证 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return Buffer.isBuffer(buf) && buf.readInt16BE(0) === 0x1234;
});

test('Buffer.isBuffer在读取前验证 - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return Buffer.isBuffer(buf) && buf.readInt16LE(0) === 0x1234;
});

// === 极端值精确验证 ===

test('每256个可能的第一字节值 - BE', () => {
  let pass = true;
  for (let i = 0; i < 256; i++) {
    const buf = Buffer.from([i, 0x00]);
    const result = buf.readInt16BE(0);
    const expected = i >= 128 ? (i << 8) - 0x10000 : i << 8;
    if (result !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('每256个可能的第二字节值 - LE', () => {
  let pass = true;
  for (let i = 0; i < 256; i++) {
    const buf = Buffer.from([0x00, i]);
    const result = buf.readInt16LE(0);
    const expected = i >= 128 ? (i << 8) - 0x10000 : i << 8;
    if (result !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 重复方法调用一致性 ===

test('连续100次读取相同结果 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const first = buf.readInt16BE(0);
  for (let i = 0; i < 100; i++) {
    if (buf.readInt16BE(0) !== first) {
      return false;
    }
  }
  return first === 0x1234;
});

test('连续100次读取相同结果 - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const first = buf.readInt16LE(0);
  for (let i = 0; i < 100; i++) {
    if (buf.readInt16LE(0) !== first) {
      return false;
    }
  }
  return first === 0x1234;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed/tests.length)*100).toFixed(2)+'%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
