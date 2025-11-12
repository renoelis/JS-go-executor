// buf.writeDoubleBE/LE - Deep Round 6-1: Parameter Combinations and Boundaries
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

// offset 为整数浮点数（0.0, 1.0, 8.0）
test('writeDoubleBE offset 为 0.0 整数浮点数', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleBE(1.0, 0.0);
  return result === 8;
});

test('writeDoubleLE offset 为 0.0 整数浮点数', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleLE(1.0, 0.0);
  return result === 8;
});

test('writeDoubleBE offset 为 8.0 整数浮点数', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleBE(1.0, 8.0);
  return result === 16;
});

test('writeDoubleLE offset 为 8.0 整数浮点数', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleLE(1.0, 8.0);
  return result === 16;
});

// offset 为 -0
test('writeDoubleBE offset 为 -0', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleBE(1.0, -0);
  return result === 8;
});

test('writeDoubleLE offset 为 -0', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleLE(1.0, -0);
  return result === 8;
});

// offset 为负浮点数抛出错误
test('writeDoubleBE offset 为 -0.5 抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, -0.5);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('out of range');
  }
});

test('writeDoubleLE offset 为 -0.5 抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, -0.5);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('out of range');
  }
});

// offset 为接近整数的浮点数
test('writeDoubleBE offset 为 7.999999999 抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, 7.999999999);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('out of range');
  }
});

test('writeDoubleLE offset 为 8.000000001 抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, 8.000000001);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('out of range');
  }
});

// offset 为对象抛出错误
test('writeDoubleBE offset 为空对象抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, {});
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

test('writeDoubleLE offset 为空对象抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, {});
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

// offset 为数组抛出错误
test('writeDoubleBE offset 为数组抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, [8]);
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

test('writeDoubleLE offset 为数组抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, [8]);
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

// offset 为 Number 包装对象抛出错误
test('writeDoubleBE offset 为 Number 对象抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, new Number(8));
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

test('writeDoubleLE offset 为 Number 对象抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, new Number(8));
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

// offset 为超大整数
test('writeDoubleBE offset 为 MAX_SAFE_INTEGER 抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('writeDoubleLE offset 为 MAX_SAFE_INTEGER 抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

// offset 为 2^31
test('writeDoubleBE offset 为 2^31 抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, Math.pow(2, 31));
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('writeDoubleLE offset 为 2^31 抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, Math.pow(2, 31));
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

// value 为有 valueOf 方法的对象
test('writeDoubleBE value 为有 valueOf 的对象', () => {
  const buf = Buffer.alloc(8);
  const obj = { valueOf: () => 42.5 };
  buf.writeDoubleBE(obj);
  const readBack = buf.readDoubleBE();
  return Math.abs(readBack - 42.5) < 0.0001;
});

test('writeDoubleLE value 为有 valueOf 的对象', () => {
  const buf = Buffer.alloc(8);
  const obj = { valueOf: () => 42.5 };
  buf.writeDoubleLE(obj);
  const readBack = buf.readDoubleLE();
  return Math.abs(readBack - 42.5) < 0.0001;
});

// value 为有 toString 方法的对象
test('writeDoubleBE value 为有 toString 的对象', () => {
  const buf = Buffer.alloc(8);
  const obj = { toString: () => "3.14" };
  buf.writeDoubleBE(obj);
  const readBack = buf.readDoubleBE();
  return Math.abs(readBack - 3.14) < 0.0001;
});

test('writeDoubleLE value 为有 toString 的对象', () => {
  const buf = Buffer.alloc(8);
  const obj = { toString: () => "3.14" };
  buf.writeDoubleLE(obj);
  const readBack = buf.readDoubleLE();
  return Math.abs(readBack - 3.14) < 0.0001;
});

// value 为 Date 对象（转换为时间戳）
test('writeDoubleBE value 为 Date 对象', () => {
  const buf = Buffer.alloc(8);
  const date = new Date('2024-01-01');
  buf.writeDoubleBE(date);
  const readBack = buf.readDoubleBE();
  return readBack === date.getTime();
});

test('writeDoubleLE value 为 Date 对象', () => {
  const buf = Buffer.alloc(8);
  const date = new Date('2024-01-01');
  buf.writeDoubleLE(date);
  const readBack = buf.readDoubleLE();
  return readBack === date.getTime();
});

// value 为正则表达式（转换为 NaN）
test('writeDoubleBE value 为 RegExp 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(/test/);
  const readBack = buf.readDoubleBE();
  return Number.isNaN(readBack);
});

test('writeDoubleLE value 为 RegExp 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(/test/);
  const readBack = buf.readDoubleLE();
  return Number.isNaN(readBack);
});

// value 为 Function（转换为 NaN）
test('writeDoubleBE value 为 Function 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(function() {});
  const readBack = buf.readDoubleBE();
  return Number.isNaN(readBack);
});

test('writeDoubleLE value 为 Function 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(function() {});
  const readBack = buf.readDoubleLE();
  return Number.isNaN(readBack);
});

// value 为空字符串（转换为 0）
test('writeDoubleBE value 为空字符串转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('');
  const readBack = buf.readDoubleBE();
  return readBack === 0;
});

test('writeDoubleLE value 为空字符串转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('');
  const readBack = buf.readDoubleLE();
  return readBack === 0;
});

// value 为空格字符串（转换为 0）
test('writeDoubleBE value 为空格字符串转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('   ');
  const readBack = buf.readDoubleBE();
  return readBack === 0;
});

test('writeDoubleLE value 为空格字符串转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('   ');
  const readBack = buf.readDoubleLE();
  return readBack === 0;
});

// value 为 'Infinity' 字符串
test('writeDoubleBE value 为 Infinity 字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('Infinity');
  const readBack = buf.readDoubleBE();
  return readBack === Infinity;
});

test('writeDoubleLE value 为 Infinity 字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('Infinity');
  const readBack = buf.readDoubleLE();
  return readBack === Infinity;
});

test('writeDoubleBE value 为 -Infinity 字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('-Infinity');
  const readBack = buf.readDoubleBE();
  return readBack === -Infinity;
});

test('writeDoubleLE value 为 -Infinity 字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('-Infinity');
  const readBack = buf.readDoubleLE();
  return readBack === -Infinity;
});

// 非对齐 offset（1-7）
test('writeDoubleBE offset 为 1 非对齐写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(123.456, 1);
  const readBack = buf.readDoubleBE(1);
  return Math.abs(readBack - 123.456) < 0.0001;
});

test('writeDoubleLE offset 为 1 非对齐写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(123.456, 1);
  const readBack = buf.readDoubleLE(1);
  return Math.abs(readBack - 123.456) < 0.0001;
});

test('writeDoubleBE offset 为 3 非对齐写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(789.012, 3);
  const readBack = buf.readDoubleBE(3);
  return Math.abs(readBack - 789.012) < 0.0001;
});

test('writeDoubleLE offset 为 3 非对齐写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(789.012, 3);
  const readBack = buf.readDoubleLE(3);
  return Math.abs(readBack - 789.012) < 0.0001;
});

test('writeDoubleBE offset 为 7 非对齐写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(456.789, 7);
  const readBack = buf.readDoubleBE(7);
  return Math.abs(readBack - 456.789) < 0.0001;
});

test('writeDoubleLE offset 为 7 非对齐写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(456.789, 7);
  const readBack = buf.readDoubleLE(7);
  return Math.abs(readBack - 456.789) < 0.0001;
});

// 额外参数被忽略
test('writeDoubleBE 忽略额外参数', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleBE(1.0, 0, 999, 'extra', {});
  return result === 8;
});

test('writeDoubleLE 忽略额外参数', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleLE(1.0, 0, 999, 'extra', {});
  return result === 8;
});

// this 不是 Buffer 抛出错误
test('writeDoubleBE this 不是 Buffer 抛出错误', () => {
  try {
    const notBuffer = { length: 8 };
    Buffer.prototype.writeDoubleBE.call(notBuffer, 1.0, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeDoubleLE this 不是 Buffer 抛出错误', () => {
  try {
    const notBuffer = { length: 8 };
    Buffer.prototype.writeDoubleLE.call(notBuffer, 1.0, 0);
    return false;
  } catch (e) {
    return true;
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
