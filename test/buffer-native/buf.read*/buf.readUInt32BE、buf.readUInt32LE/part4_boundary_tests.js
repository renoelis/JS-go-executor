// 边界测试
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

// offset 边界测试
test('BE: offset = 0 (最小有效 offset)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: offset = 0 (最小有效 offset)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32LE(0) === 0x78563412;
});

test('BE: offset = length - 4 (最大有效 offset)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32BE(2) === 0x12345678;
});

test('LE: offset = length - 4 (最大有效 offset)', () => {
  const buf = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32LE(2) === 0x78563412;
});

test('BE: offset = length - 3 (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32BE(2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = length - 3 (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32LE(2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset = length (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32BE(4);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = length (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32LE(4);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset = length + 1 (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32BE(5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = length + 1 (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32LE(5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: 负数 offset (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32BE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 负数 offset (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32LE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: 负数 offset -100 (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32BE(-100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 负数 offset -100 (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32LE(-100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Buffer 长度边界
test('BE: 长度为 4 的 Buffer (最小有效长度)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: 长度为 4 的 Buffer (最小有效长度)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32LE(0) === 0x78563412;
});

test('BE: 长度为 3 的 Buffer (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 长度为 3 的 Buffer (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUInt32LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: 长度为 2 的 Buffer (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 长度为 2 的 Buffer (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt32LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: 长度为 1 的 Buffer (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12]);
    buf.readUInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 长度为 1 的 Buffer (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12]);
    buf.readUInt32LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: 空 Buffer (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readUInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 空 Buffer (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readUInt32LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 大 offset 测试
test('BE: 大 offset 值 (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32BE(1000000);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 大 offset 值 (应抛出 RangeError)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32LE(1000000);
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
