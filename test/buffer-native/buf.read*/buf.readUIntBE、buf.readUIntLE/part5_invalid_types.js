// 非法参数类型测试
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

// === 非法 offset 类型测试 ===

// undefined offset (应抛出错误)
test('BE: offset = undefined (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(undefined, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = undefined (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(undefined, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// null offset
test('BE: offset = null (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(null, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('LE: offset = null (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(null, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 字符串 offset
test('BE: offset = "0" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE("0", 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = "0" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE("0", 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: offset = "1" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntBE("1", 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = "1" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntLE("1", 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: offset = "abc" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE("abc", 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = "abc" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE("abc", 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 浮点数 offset
test('BE: offset = 0.5 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntBE(0.5, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = 0.5 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntLE(0.5, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset = 1.9 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUIntBE(1.9, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = 1.9 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUIntLE(1.9, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// NaN offset
test('BE: offset = NaN (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(NaN, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('LE: offset = NaN (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(NaN, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// Infinity offset
test('BE: offset = Infinity (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(Infinity, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = Infinity (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(Infinity, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: offset = -Infinity (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(-Infinity, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = -Infinity (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(-Infinity, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 对象 offset
test('BE: offset = {} (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE({}, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = {} (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE({}, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: offset = [] (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE([], 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = [] (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE([], 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 布尔值 offset
test('BE: offset = true (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntBE(true, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = true (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntLE(true, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: offset = false (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(false, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset = false (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(false, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === 非法 byteLength 类型测试 ===

test('BE: byteLength = NaN (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('LE: byteLength = NaN (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('BE: byteLength = Infinity (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('LE: byteLength = Infinity (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('BE: byteLength = 浮点数 2.9 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntBE(0, 2.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: byteLength = 浮点数 2.9 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntLE(0, 2.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('BE: byteLength = 字符串 "2" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: byteLength = 字符串 "2" (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: byteLength = null (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, null);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('LE: byteLength = null (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, null);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('BE: byteLength = undefined (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, undefined);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('LE: byteLength = undefined (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, undefined);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('BE: byteLength = {} (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, {});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: byteLength = {} (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, {});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: byteLength = [] (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, []);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: byteLength = [] (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, []);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: byteLength = true (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: byteLength = true (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: byteLength = false (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntBE(0, false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: byteLength = false (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUIntLE(0, false);
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
