// buf.writeUInt16BE/LE - Round 9: 深度查缺补漏（ArrayLike/TypedArray/特殊偏移）
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (!pass) console.log('❌ ' + name);
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌ ' + name + ' - Error: ' + e.message);
  }
}

// 1) 数组作为 this，偏移为 1（验证 offset 行为）
test('writeUInt16BE: 数组 this + offset=1（高字节在 arr[1], 整值在 arr[2]）', () => {
  const arr = [0, 0, 0, 0];
  const ret = Buffer.prototype.writeUInt16BE.call(arr, 0x1234, 1);
  return ret === 3 && arr[1] === 0x12 && arr[2] === 0x1234;
});

test('writeUInt16LE: 数组 this + offset=1（整值在 arr[1], 高字节在 arr[2]）', () => {
  const arr = [0, 0, 0, 0];
  const ret = Buffer.prototype.writeUInt16LE.call(arr, 0x1234, 1);
  return ret === 3 && arr[1] === 0x1234 && arr[2] === 0x12;
});

// 2) 稀疏数组（holes）作为 this
test('writeUInt16BE: 稀疏数组 this（含 holes）越界抛错', () => {
  const arr = new Array(4); // [ <4 empty items> ]
  arr[0] = 0;
  try {
    Buffer.prototype.writeUInt16BE.call(arr, 0xABCD, 1);
    return false;
  } catch (e) {
    return e && e.name === 'RangeError';
  }
});

test('writeUInt16LE: 稀疏数组 this（含 holes）越界抛错', () => {
  const arr = new Array(4);
  arr[0] = 0;
  try {
    Buffer.prototype.writeUInt16LE.call(arr, 0xABCD, 1);
    return false;
  } catch (e) {
    return e && e.name === 'RangeError';
  }
});

// 3) TypedArray 作为 this（应按字节写入，发生 0xFF 截断）
test('writeUInt16BE: Uint8Array 作为 this（按字节写入）', () => {
  const u8 = new Uint8Array(4);
  const ret = Buffer.prototype.writeUInt16BE.call(u8, 0x1234, 0);
  return ret === 2 && u8[0] === 0x12 && u8[1] === 0x34;
});

test('writeUInt16LE: Uint8Array 作为 this（按字节写入）', () => {
  const u8 = new Uint8Array(4);
  const ret = Buffer.prototype.writeUInt16LE.call(u8, 0x1234, 0);
  return ret === 2 && u8[0] === 0x34 && u8[1] === 0x12;
});

// 4) TypedArray 越界（应 RangeError）
test('writeUInt16BE: Uint8Array 越界写入抛错', () => {
  const u8 = new Uint8Array(3);
  try {
    Buffer.prototype.writeUInt16BE.call(u8, 0x1234, 2);
    return false;
  } catch (e) {
    return (e && (e.name === 'RangeError'));
  }
});

test('writeUInt16LE: Uint8Array 越界写入抛错', () => {
  const u8 = new Uint8Array(3);
  try {
    Buffer.prototype.writeUInt16LE.call(u8, 0x1234, 2);
    return false;
  } catch (e) {
    return (e && (e.name === 'RangeError'));
  }
});

// 5) Array-like 对象作为 this（length 字符串、浮点数）
test('writeUInt16BE: array-like this（length 为字符串）', () => {
  const obj = { length: '4', 0: 0, 1: 0, 2: 0, 3: 0 };
  const ret = Buffer.prototype.writeUInt16BE.call(obj, 0xBEEF, 1);
  return ret === 3 && obj[1] === 0xBE && obj[2] === 0xBEEF;
});

test('writeUInt16LE: array-like this（length 为字符串）', () => {
  const obj = { length: '4', 0: 0, 1: 0, 2: 0, 3: 0 };
  const ret = Buffer.prototype.writeUInt16LE.call(obj, 0xBEEF, 1);
  return ret === 3 && obj[1] === 0xBEEF && obj[2] === 0xBE;
});

test('writeUInt16BE: array-like this（length 为 3.7，越界抛错）', () => {
  const obj = { length: 3.7, 0: 0, 1: 0, 2: 0 };
  try {
    Buffer.prototype.writeUInt16BE.call(obj, 0x1122, 2); // 2 + 2 > ToInteger(3.7)=3
    return false;
  } catch (e) {
    return (e && (e.name === 'RangeError'));
  }
});

test('writeUInt16LE: array-like this（length 为 3.7，越界抛错）', () => {
  const obj = { length: 3.7, 0: 0, 1: 0, 2: 0 };
  try {
    Buffer.prototype.writeUInt16LE.call(obj, 0x1122, 2);
    return false;
  } catch (e) {
    return (e && (e.name === 'RangeError'));
  }
});

// 6) 特殊值写入到数组 this（NaN -> 0；Infinity 抛错）
test('writeUInt16BE: 数组 this + NaN 行为（高字节为 0，整值为 NaN）', () => {
  const arr = [1, 2, 3, 4];
  Buffer.prototype.writeUInt16BE.call(arr, NaN, 0);
  return arr[0] === 0 && Number.isNaN(arr[1]);
});

test('writeUInt16LE: 数组 this + NaN 行为（整值为 NaN，高字节为 0）', () => {
  const arr = [1, 2, 3, 4];
  Buffer.prototype.writeUInt16LE.call(arr, NaN, 0);
  return Number.isNaN(arr[0]) && arr[1] === 0;
});

test('writeUInt16BE: 数组 this + Infinity 抛错', () => {
  const arr = [0, 0, 0, 0];
  try {
    Buffer.prototype.writeUInt16BE.call(arr, Infinity, 0);
    return false;
  } catch (e) {
    return (e && (e.name === 'RangeError'));
  }
});

test('writeUInt16LE: 数组 this + -Infinity 抛错', () => {
  const arr = [0, 0, 0, 0];
  try {
    Buffer.prototype.writeUInt16LE.call(arr, -Infinity, 0);
    return false;
  } catch (e) {
    return (e && (e.name === 'RangeError'));
  }
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
