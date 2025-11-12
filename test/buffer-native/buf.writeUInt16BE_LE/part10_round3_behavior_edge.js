// buf.writeUInt16BE/LE() - Round 3: 实际行为边缘分支测试
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

// 零值的特殊情况
test('writeUInt16BE: -0 等同于 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(-0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16LE: -0 等同于 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(-0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

// 对象 toString/valueOf 优先级
test('writeUInt16BE: 对象同时有 valueOf 和 toString', () => {
  const buf = Buffer.alloc(2);
  const obj = {
    valueOf: () => 100,
    toString: () => '200'
  };
  buf.writeUInt16BE(obj, 0);
  return buf.readUInt16BE(0) === 100;
});

test('writeUInt16LE: 对象同时有 valueOf 和 toString', () => {
  const buf = Buffer.alloc(2);
  const obj = {
    valueOf: () => 100,
    toString: () => '200'
  };
  buf.writeUInt16LE(obj, 0);
  return buf.readUInt16LE(0) === 100;
});

// offset 对象转换
test('writeUInt16BE: offset 为对象带 valueOf', () => {
  const buf = Buffer.alloc(4);
  const offsetObj = { valueOf: () => 1 };
  try {
    buf.writeUInt16BE(0x1234, offsetObj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16LE: offset 为对象带 valueOf', () => {
  const buf = Buffer.alloc(4);
  const offsetObj = { valueOf: () => 1 };
  try {
    buf.writeUInt16LE(0x1234, offsetObj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 极小浮点数
test('writeUInt16BE: 极小正数 Number.EPSILON', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(Number.EPSILON, 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 极小正数 Number.EPSILON', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(Number.EPSILON, 0);
  return buf.readUInt16LE(0) === 0;
});

test('writeUInt16BE: Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(Number.MIN_VALUE, 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(Number.MIN_VALUE, 0);
  return buf.readUInt16LE(0) === 0;
});

// 负浮点数接近 0
test('writeUInt16BE: -0.1 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16BE(-0.1, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: -0.1 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16LE(-0.1, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: -0.9 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16BE(-0.9, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: -0.9 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16LE(-0.9, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 边界浮点数
test('writeUInt16BE: 65535.0 精确值', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(65535.0, 0);
  return buf.readUInt16BE(0) === 65535;
});

test('writeUInt16LE: 65535.0 精确值', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(65535.0, 0);
  return buf.readUInt16LE(0) === 65535;
});

test('writeUInt16BE: 65535.1 超出范围', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16BE(65535.1, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 65535.1 超出范围', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16LE(65535.1, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: 65535.5 超出范围', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16BE(65535.5, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 65535.5 超出范围', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16LE(65535.5, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 数组特殊值
test('writeUInt16BE: 空对象转为 NaN 视为 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE({}, 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 空对象转为 NaN 视为 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE({}, 0);
  return buf.readUInt16LE(0) === 0;
});

// 科学计数法边界
test('writeUInt16BE: 1e4 等于 10000', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(1e4, 0);
  return buf.readUInt16BE(0) === 10000;
});

test('writeUInt16LE: 1e4 等于 10000', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(1e4, 0);
  return buf.readUInt16LE(0) === 10000;
});

test('writeUInt16BE: 6.5535e4 等于 65535', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(6.5535e4, 0);
  return buf.readUInt16BE(0) === 65535;
});

test('writeUInt16LE: 6.5535e4 等于 65535', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(6.5535e4, 0);
  return buf.readUInt16LE(0) === 65535;
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
