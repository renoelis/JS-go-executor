// buf.writeUInt16BE/LE() - Type Tests (针对 Node v25.0.0 实际行为修正)
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

// 数值类型测试
test('writeUInt16BE: 整数值', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(12345, 0);
  return buf[0] === 0x30 && buf[1] === 0x39;
});

test('writeUInt16LE: 整数值', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(12345, 0);
  return buf[0] === 0x39 && buf[1] === 0x30;
});

test('writeUInt16BE: 浮点数自动截断', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(123.7, 0);
  const val = buf.readUInt16BE(0);
  return val === 123;
});

test('writeUInt16LE: 浮点数自动截断', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(123.7, 0);
  const val = buf.readUInt16LE(0);
  return val === 123;
});

// 负数应该抛出 RangeError (Node v25.0.0 实际行为)
test('writeUInt16BE: 负数抛出 RangeError', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(-1, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 负数抛出 RangeError', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(-1, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: 负数 -100 抛出 RangeError', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(-100, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 负数 -100 抛出 RangeError', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(-100, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 超出范围的正数应该抛出 RangeError
test('writeUInt16BE: 超出范围的正数 0x10000 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x10000, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 超出范围的正数 0x10000 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x10000, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: 0x10001 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x10001, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 0x10001 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x10001, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: 大整数抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(123456789, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 大整数抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(123456789, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// offset 类型测试
test('writeUInt16BE: offset 为整数', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1234, 1);
  return buf[1] === 0x12 && buf[2] === 0x34;
});

test('writeUInt16LE: offset 为整数', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1234, 1);
  return buf[1] === 0x34 && buf[2] === 0x12;
});

// offset 为浮点数应该抛出错误 (Node v25.0.0 实际行为)
test('writeUInt16BE: offset 为浮点数抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, 1.7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 为浮点数抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, 1.7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊数值
test('writeUInt16BE: 布尔值 true 转为 1', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(true, 0);
  return buf[0] === 0x00 && buf[1] === 0x01;
});

test('writeUInt16LE: 布尔值 true 转为 1', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(true, 0);
  return buf[0] === 0x01 && buf[1] === 0x00;
});

test('writeUInt16BE: 布尔值 false 转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(false, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16LE: 布尔值 false 转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(false, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16BE: 字符串数字转换', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE('1234', 0);
  const val = buf.readUInt16BE(0);
  return val === 1234;
});

test('writeUInt16LE: 字符串数字转换', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE('1234', 0);
  const val = buf.readUInt16LE(0);
  return val === 1234;
});

test('writeUInt16BE: 十六进制字符串转换', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE('0x1234', 0);
  const val = buf.readUInt16BE(0);
  return val === 0x1234;
});

test('writeUInt16LE: 十六进制字符串转换', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE('0x1234', 0);
  const val = buf.readUInt16LE(0);
  return val === 0x1234;
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
