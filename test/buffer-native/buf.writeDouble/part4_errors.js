// buf.writeDoubleBE/LE - Error and Edge Cases Tests
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

// offset 越界错误
test('writeDoubleBE offset 超出范围抛出错误', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleBE(1.0, 1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeDoubleLE offset 超出范围抛出错误', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleLE(1.0, 1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeDoubleBE offset 为负数抛出错误', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleBE(1.0, -1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('out of range');
  }
});

test('writeDoubleLE offset 为负数抛出错误', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleLE(1.0, -1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('out of range');
  }
});

test('writeDoubleBE offset 等于 buffer 长度抛出错误', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleBE(1.0, 8);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeDoubleLE offset 等于 buffer 长度抛出错误', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleLE(1.0, 8);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeDoubleBE offset 大于 buffer 长度抛出错误', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleBE(1.0, 100);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeDoubleLE offset 大于 buffer 长度抛出错误', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleLE(1.0, 100);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

// 空间不足错误
test('writeDoubleBE 剩余空间不足 8 字节抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeDoubleBE(1.0, 3);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeDoubleLE 剩余空间不足 8 字节抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeDoubleLE(1.0, 3);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeDoubleBE 在 7 字节 buffer 抛出错误', () => {
  const buf = Buffer.alloc(7);
  try {
    buf.writeDoubleBE(1.0, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') ||
           e.message.includes('beyond buffer') ||
           e.message.includes('outside buffer');
  }
});

test('writeDoubleLE 在 7 字节 buffer 抛出错误', () => {
  const buf = Buffer.alloc(7);
  try {
    buf.writeDoubleLE(1.0, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') ||
           e.message.includes('beyond buffer') ||
           e.message.includes('outside buffer');
  }
});

// 空 Buffer 测试
test('writeDoubleBE 在空 buffer 抛出错误', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeDoubleBE(1.0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') ||
           e.message.includes('beyond buffer') ||
           e.message.includes('outside buffer');
  }
});

test('writeDoubleLE 在空 buffer 抛出错误', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeDoubleLE(1.0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') ||
           e.message.includes('beyond buffer') ||
           e.message.includes('outside buffer');
  }
});

// offset 类型错误
test('writeDoubleBE offset 为非数字字符串', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, 'abc');
    return false;
  } catch (e) {
    return true;
  }
});

test('writeDoubleLE offset 为非数字字符串', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, 'abc');
    return false;
  } catch (e) {
    return true;
  }
});

test('writeDoubleBE offset 为 NaN', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, NaN);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeDoubleLE offset 为 NaN', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, NaN);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeDoubleBE offset 为 Infinity', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, Infinity);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeDoubleLE offset 为 Infinity', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, Infinity);
    return false;
  } catch (e) {
    return true;
  }
});

// value 类型测试（应该能自动转换）
test('writeDoubleBE value 为字符串数字', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('3.14');
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - 3.14) < 0.0001;
});

test('writeDoubleLE value 为字符串数字', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('3.14');
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - 3.14) < 0.0001;
});

test('writeDoubleBE value 为布尔值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(true);
  const readBack = buf.readDoubleBE(0);
  return readBack === 1;
});

test('writeDoubleLE value 为布尔值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(false);
  const readBack = buf.readDoubleLE(0);
  return readBack === 0;
});

test('writeDoubleBE value 为非数字字符串转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('hello');
  const readBack = buf.readDoubleBE(0);
  return Number.isNaN(readBack);
});

test('writeDoubleLE value 为非数字字符串转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('world');
  const readBack = buf.readDoubleLE(0);
  return Number.isNaN(readBack);
});

// offset 浮点数处理 - Node v25.0.0 要求必须是整数
test('writeDoubleBE offset 为浮点数抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, 8.9);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('out of range');
  }
});

test('writeDoubleLE offset 为浮点数抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, 8.1);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('out of range');
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
