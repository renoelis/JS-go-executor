// 边界条件完整测试
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

// 最小 Buffer 长度测试
test('BE: 最小 Buffer (2 bytes)', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUInt16BE(0) === 0x1234;
});

test('LE: 最小 Buffer (2 bytes)', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUInt16LE(0) === 0x3412;
});

test('BE: 最大有效 offset (buf.length - 2)', () => {
  const buf = Buffer.from([0x00, 0x11, 0x22, 0x33]);
  return buf.readUInt16BE(2) === 0x2233;
});

test('LE: 最大有效 offset (buf.length - 2)', () => {
  const buf = Buffer.from([0x00, 0x11, 0x22, 0x33]);
  return buf.readUInt16LE(2) === 0x3322;
});

test('BE: offset = buf.length - 2 (边界)', () => {
  const buf = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);
  return buf.readUInt16BE(4) === 0xEEFF;
});

test('LE: offset = buf.length - 2 (边界)', () => {
  const buf = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);
  return buf.readUInt16LE(4) === 0xFFEE;
});

// 超出边界测试
test('BE: offset = buf.length - 1 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = buf.length - 1 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset = buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE(2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset > buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset > buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 负数 offset 测试
test('BE: offset = -1 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = -1 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset = -100 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt16BE(-100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = -100 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt16LE(-100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 空 Buffer 测试
test('BE: 空 Buffer (应抛出错误)', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readUInt16BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 空 Buffer (应抛出错误)', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readUInt16LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 单字节 Buffer 测试
test('BE: 单字节 Buffer (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12]);
    buf.readUInt16BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 单字节 Buffer (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12]);
    buf.readUInt16LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
