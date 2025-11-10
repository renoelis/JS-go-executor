// 非法 offset 类型测试
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

// undefined offset (应使用默认值 0)
test('BE: offset = undefined (应使用默认值 0)', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUInt16BE(undefined) === 0x1234;
});

test('LE: offset = undefined (应使用默认值 0)', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUInt16LE(undefined) === 0x3412;
});

// null offset
test('BE: offset = null (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(null);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('LE: offset = null (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE(null);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 字符串 offset
test('BE: offset = "0" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE("0");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = "0" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE("0");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: offset = "1" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUInt16BE("1");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = "1" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUInt16LE("1");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: offset = "abc" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE("abc");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = "abc" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE("abc");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 浮点数 offset
test('BE: offset = 0.5 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUInt16BE(0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = 0.5 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUInt16LE(0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset = 1.9 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt16BE(1.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = 1.9 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt16LE(1.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// NaN offset
test('BE: offset = NaN (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('LE: offset = NaN (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// Infinity offset
test('BE: offset = Infinity (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = Infinity (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset = -Infinity (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = -Infinity (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 对象 offset
test('BE: offset = {} (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = {} (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: offset = [] (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE([]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = [] (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE([]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 布尔值 offset
test('BE: offset = true (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUInt16BE(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = true (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUInt16LE(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: offset = false (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = false (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE(false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
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
