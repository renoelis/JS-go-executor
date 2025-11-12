// buf.writeInt16BE() - 类型与边界测试
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

// 值类型转换测试
test('浮点数会被截断为整数', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(1234.56, 0);
  const expected = Buffer.alloc(4);
  expected.writeInt16BE(1234, 0);
  return buf[0] === expected[0] && buf[1] === expected[1];
});

test('负浮点数会被截断为整数', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-1234.56, 0);
  const expected = Buffer.alloc(4);
  expected.writeInt16BE(-1234, 0);
  return buf[0] === expected[0] && buf[1] === expected[1];
});

test('布尔值 true 转为 1', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(true, 0);
  return buf[0] === 0x00 && buf[1] === 0x01;
});

test('布尔值 false 转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(false, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('字符串数字会被转换', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE('1000', 0);
  const expected = Buffer.alloc(4);
  expected.writeInt16BE(1000, 0);
  return buf[0] === expected[0] && buf[1] === expected[1];
});

test('超出范围的正数会抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(32768, 0); // 超出最大值
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('超出范围的负数会抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(-32769, 0); // 超出最小值
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('大正数会抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(65535, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('超大正数会抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(100000, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('超大负数会抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(-100000, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

// offset 类型测试
test('offset 为浮点数会抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt16BE(100, 2.9);
    return false;
  } catch (e) {
    return e.message.includes('must be an integer') || e.message.includes('out of range');
  }
});

test('offset 为字符串数字会抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt16BE(100, '3');
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('offset 为 true 会抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt16BE(100, true);
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('offset 为 false 会抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt16BE(100, false);
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
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
