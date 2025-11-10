// buf.readUInt8() - 参数类型全面测试
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

// undefined 参数测试
test('offset = undefined（应使用默认值 0）', () => {
  const buf = Buffer.from([255]);
  return buf.readUInt8(undefined) === 255;
});

// null 参数测试
test('offset = null（应抛出错误）', () => {
  try {
    const buf = Buffer.from([255]);
    buf.readUInt8(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// boolean 参数测试
test('offset = true（应抛出错误或转为 1）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    const result = buf.readUInt8(true);
    // 某些实现可能将 true 转为 1
    return result === 50;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = false（应抛出错误或转为 0）', () => {
  try {
    const buf = Buffer.from([100]);
    const result = buf.readUInt8(false);
    // 某些实现可能将 false 转为 0
    return result === 100;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// object 参数测试
test('offset = {} 空对象（应抛出错误）', () => {
  try {
    const buf = Buffer.from([255]);
    buf.readUInt8({});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = {valueOf: () => 1}（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readUInt8({valueOf: () => 1});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// array 参数测试
test('offset = [] 空数组（应抛出错误）', () => {
  try {
    const buf = Buffer.from([255]);
    buf.readUInt8([]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = [1]（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readUInt8([1]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 可转换为整数的浮点数（Node.js 接受这种情况）
test('offset = 1.0（整数浮点数，应被接受）', () => {
  const buf = Buffer.from([100, 50]);
  return buf.readUInt8(1.0) === 50;
});

test('offset = 0.0（应被接受）', () => {
  const buf = Buffer.from([100]);
  return buf.readUInt8(0.0) === 100;
});

// 负浮点数
test('offset = -0.5（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(-0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 极大整数
test('offset = Number.MAX_SAFE_INTEGER（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 极小整数
test('offset = Number.MIN_SAFE_INTEGER（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Symbol 参数测试
test('offset = Symbol()（应抛出错误）', () => {
  try {
    const buf = Buffer.from([255]);
    buf.readUInt8(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// BigInt 参数测试
test('offset = 1n（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readUInt8(1n);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 字符串数字
test('offset = "1"（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readUInt8("1");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Infinity 测试
test('offset = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(-Infinity);
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
