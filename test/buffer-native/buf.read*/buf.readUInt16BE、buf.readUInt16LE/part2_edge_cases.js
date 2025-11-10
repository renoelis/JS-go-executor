//  边界与错误测试
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

test('默认 offset = 0', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUInt16BE() === 0x1234;
});

test('offset = -1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 浮点数（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x00, 0x00, 0x12, 0x34]);
    buf.readUInt16BE(2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 字符串（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x00, 0x00, 0x12, 0x34]);
    buf.readUInt16BE('2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('读取 0', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readUInt16BE(0) === 0;
});

test('读取 65535（最大值）', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUInt16BE(0) === 65535;
});

test('offset = NaN（应抛出错误）', () => { try { Buffer.from([0x34, 0x12]).readUInt16LE(NaN); return false; } catch (e) { return e.name === 'RangeError' || e.name === 'TypeError'; } });
test('offset = 字符串（应抛出错误）', () => { try { Buffer.from([0x34, 0x12]).readUInt16LE('0'); return false; } catch (e) { return e.name === 'TypeError'; } });
test('读取 65535（最大值 LE）', () => Buffer.from([0xFF, 0xFF]).readUInt16LE(0) === 65535);


const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
