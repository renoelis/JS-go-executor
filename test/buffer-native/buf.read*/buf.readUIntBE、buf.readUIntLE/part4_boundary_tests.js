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

// === offset 边界测试 ===

// offset = 0
test('BE: offset = 0, byteLength = 1', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUIntBE(0, 1) === 0x12;
});

test('LE: offset = 0, byteLength = 1', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUIntLE(0, 1) === 0x12;
});

// offset 在缓冲区末尾
test('BE: offset = buf.length - byteLength (临界值)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUIntBE(2, 2) === 0x5678;
});

test('LE: offset = buf.length - byteLength (临界值)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUIntLE(2, 2) === 0x7856;
});

// offset 超出范围
test('BE: offset = buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(2, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(2, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset > buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(10, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset > buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(10, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 负数 offset
test('BE: offset = -1 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(-1, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = -1 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(-1, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset = -100 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(-100, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = -100 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(-100, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === offset + byteLength 边界测试 ===

test('BE: offset + byteLength = buf.length (临界值)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readUIntBE(1, 2) === 0x3456;
});

test('LE: offset + byteLength = buf.length (临界值)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readUIntLE(1, 2) === 0x5634;
});

test('BE: offset + byteLength > buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntBE(2, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset + byteLength > buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntLE(2, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset = 0, byteLength > buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = 0, byteLength > buf.length (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === byteLength 边界测试 ===

test('BE: byteLength = 0 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: byteLength = 0 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: byteLength = 1 (最小有效值)', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntBE(0, 1) === 255;
});

test('LE: byteLength = 1 (最小有效值)', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntLE(0, 1) === 255;
});

test('BE: byteLength = 6 (最大有效值)', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 6) === 281474976710655;
});

test('LE: byteLength = 6 (最大有效值)', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 6) === 281474976710655;
});

test('BE: byteLength = 7 (应抛出错误)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readUIntBE(0, 7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: byteLength = 7 (应抛出错误)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readUIntLE(0, 7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: byteLength = 8 (应抛出错误)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readUIntBE(0, 8);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: byteLength = 8 (应抛出错误)', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readUIntLE(0, 8);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: byteLength = -1 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: byteLength = -1 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === 极端 offset 值 ===

test('BE: offset = Number.MAX_SAFE_INTEGER (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(Number.MAX_SAFE_INTEGER, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = Number.MAX_SAFE_INTEGER (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(Number.MAX_SAFE_INTEGER, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset = Number.MIN_SAFE_INTEGER (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(Number.MIN_SAFE_INTEGER, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = Number.MIN_SAFE_INTEGER (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(Number.MIN_SAFE_INTEGER, 1);
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
