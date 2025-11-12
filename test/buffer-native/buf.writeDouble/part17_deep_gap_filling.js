// buf.writeDoubleBE/LE - 深度查缺补漏测试
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

// Symbol.toPrimitive 支持
test('writeDoubleBE 支持 Symbol.toPrimitive', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    [Symbol.toPrimitive]() { return 3.14159; }
  };
  buf.writeDoubleBE(obj);
  const result = buf.readDoubleBE();
  return Math.abs(result - 3.14159) < 0.00001;
});

test('writeDoubleLE 支持 Symbol.toPrimitive', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    [Symbol.toPrimitive]() { return 2.71828; }
  };
  buf.writeDoubleLE(obj);
  const result = buf.readDoubleLE();
  return Math.abs(result - 2.71828) < 0.00001;
});

// valueOf 优先于 toString
test('writeDoubleBE valueOf 优先于 toString', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    valueOf() { return 100.5; },
    toString() { return '200.5'; }
  };
  buf.writeDoubleBE(obj);
  const result = buf.readDoubleBE();
  return Math.abs(result - 100.5) < 0.0001;
});

test('writeDoubleLE valueOf 优先于 toString', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    valueOf() { return 150.5; },
    toString() { return '250.5'; }
  };
  buf.writeDoubleLE(obj);
  const result = buf.readDoubleLE();
  return Math.abs(result - 150.5) < 0.0001;
});

// 冻结的 Buffer 应该报错
test('writeDoubleBE 在冻结的 Buffer 上报错', () => {
  const buf = Buffer.alloc(8);
  try {
    Object.freeze(buf);
    buf.writeDoubleBE(123.456);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('freeze') || e.message.includes('frozen');
  }
});

test('writeDoubleLE 在冻结的 Buffer 上报错', () => {
  const buf = Buffer.alloc(8);
  try {
    Object.freeze(buf);
    buf.writeDoubleLE(123.456);
    return false;
  } catch (e) {
    return e.message.includes('freeze') || e.message.includes('frozen');
  }
});

// 密封的 Buffer 应该报错
test('writeDoubleBE 在密封的 Buffer 上报错', () => {
  const buf = Buffer.alloc(8);
  try {
    Object.seal(buf);
    buf.writeDoubleBE(123.456);
    return false;
  } catch (e) {
    return e.message.includes('seal');
  }
});

test('writeDoubleLE 在密封的 Buffer 上报错', () => {
  const buf = Buffer.alloc(8);
  try {
    Object.seal(buf);
    buf.writeDoubleLE(123.456);
    return false;
  } catch (e) {
    return e.message.includes('seal');
  }
});

// call/apply 调用
test('writeDoubleBE 通过 call 调用', () => {
  const buf = Buffer.alloc(8);
  Buffer.prototype.writeDoubleBE.call(buf, 999.111);
  const result = buf.readDoubleBE();
  return Math.abs(result - 999.111) < 0.001;
});

test('writeDoubleLE 通过 apply 调用', () => {
  const buf = Buffer.alloc(8);
  Buffer.prototype.writeDoubleLE.apply(buf, [777.222]);
  const result = buf.readDoubleLE();
  return Math.abs(result - 777.222) < 0.001;
});

// offset 为 Infinity
test('writeDoubleBE offset 为 Infinity 报错', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.23, Infinity);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('out of range');
  }
});

test('writeDoubleLE offset 为 Infinity 报错', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.23, Infinity);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('out of range');
  }
});

// offset 为 -Infinity
test('writeDoubleBE offset 为 -Infinity 报错', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.23, -Infinity);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('out of range');
  }
});

test('writeDoubleLE offset 为 -Infinity 报错', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.23, -Infinity);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('out of range');
  }
});

// offset 为 NaN
test('writeDoubleBE offset 为 NaN 报错', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.23, NaN);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer') || e.message.includes('NaN');
  }
});

test('writeDoubleLE offset 为 NaN 报错', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.23, NaN);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer') || e.message.includes('NaN');
  }
});

// offset 必须是整数，不能是浮点数
test('writeDoubleBE offset 为 0.5 报错', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.23, 0.5);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('offset');
  }
});

test('writeDoubleLE offset 为 2.9 报错', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.23, 2.9);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('offset');
  }
});

// Boolean 作为 value
test('writeDoubleBE value 为 true 转换为 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(true);
  const result = buf.readDoubleBE();
  return result === 1;
});

test('writeDoubleLE value 为 false 转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(false);
  const result = buf.readDoubleLE();
  return result === 0;
});

// BigInt 应该报错
test('writeDoubleBE value 为 BigInt 报错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleBE(123n);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('number');
  }
});

test('writeDoubleLE value 为 BigInt 报错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleLE(456n);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('number');
  }
});

// Date 对象转换为时间戳
test('writeDoubleBE value 为 Date', () => {
  const buf = Buffer.alloc(8);
  const date = new Date('2024-01-01T00:00:00.000Z');
  buf.writeDoubleBE(date);
  const result = buf.readDoubleBE();
  return result === date.getTime();
});

test('writeDoubleLE value 为 Date', () => {
  const buf = Buffer.alloc(8);
  const date = new Date('2024-12-31T23:59:59.999Z');
  buf.writeDoubleLE(date);
  const result = buf.readDoubleLE();
  return result === date.getTime();
});

// RegExp 转换为 NaN
test('writeDoubleBE value 为 RegExp 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(/test/);
  const result = buf.readDoubleBE();
  return Number.isNaN(result);
});

test('writeDoubleLE value 为 RegExp 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(/pattern/);
  const result = buf.readDoubleLE();
  return Number.isNaN(result);
});

// Number.MAX_SAFE_INTEGER
test('writeDoubleBE 写入 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Number.MAX_SAFE_INTEGER);
  const result = buf.readDoubleBE();
  return result === Number.MAX_SAFE_INTEGER;
});

test('writeDoubleLE 写入 Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.MIN_SAFE_INTEGER);
  const result = buf.readDoubleLE();
  return result === Number.MIN_SAFE_INTEGER;
});

// 超出安全整数范围
test('writeDoubleBE 写入 MAX_SAFE_INTEGER + 1', () => {
  const buf = Buffer.alloc(8);
  const val = Number.MAX_SAFE_INTEGER + 1;
  buf.writeDoubleBE(val);
  const result = buf.readDoubleBE();
  return result === 9007199254740992;
});

test('writeDoubleLE 写入 MIN_SAFE_INTEGER - 1', () => {
  const buf = Buffer.alloc(8);
  const val = Number.MIN_SAFE_INTEGER - 1;
  buf.writeDoubleLE(val);
  const result = buf.readDoubleLE();
  return result === -9007199254740992;
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
