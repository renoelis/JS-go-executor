// offset参数类型强制转换测试
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

// null 和 undefined 测试
test('offset = null (应抛出TypeError) - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = null (应抛出TypeError) - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = undefined (使用默认值0) - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE(undefined) === 0x12345678;
});

test('offset = undefined (使用默认值0) - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readInt32LE(undefined) === 0x12345678;
});

// boolean 测试
test('offset = true (应抛出TypeError) - BE', () => {
  try {
    const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = true (应抛出TypeError) - LE', () => {
  try {
    const buf = Buffer.from([0x00, 0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = false (应抛出TypeError) - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = false (应抛出TypeError) - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// object 测试
test('offset = {} (应抛出TypeError) - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = {} (应抛出TypeError) - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = {valueOf: () => 0} (应抛出TypeError) - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE({valueOf: () => 0});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = {valueOf: () => 0} (应抛出TypeError) - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE({valueOf: () => 0});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// array 测试
test('offset = [] (应抛出TypeError) - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE([]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = [] (应抛出TypeError) - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE([]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = [0] (应抛出TypeError) - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE([0]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = [0] (应抛出TypeError) - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE([0]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 特殊数字测试
test('offset = -0 (等同于0) - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE(-0) === 0x12345678;
});

test('offset = -0 (等同于0) - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readInt32LE(-0) === 0x12345678;
});

test('offset = +0 (等同于0) - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE(+0) === 0x12345678;
});

test('offset = +0 (等同于0) - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readInt32LE(+0) === 0x12345678;
});

test('offset = Infinity (应抛出RangeError) - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = Infinity (应抛出RangeError) - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = -Infinity (应抛出RangeError) - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = -Infinity (应抛出RangeError) - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// NaN 测试
test('offset = NaN (应抛出错误) - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = NaN (应抛出错误) - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 大数值测试
test('offset = Number.MAX_SAFE_INTEGER (应抛出RangeError) - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.MAX_SAFE_INTEGER (应抛出RangeError) - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.MIN_SAFE_INTEGER (应抛出RangeError) - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.MIN_SAFE_INTEGER (应抛出RangeError) - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
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
