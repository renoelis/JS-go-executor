// buf.readFloatLE() - 错误处理完整测试
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

// RangeError 场景
test('RangeError: offset 超出范围（正数）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: offset 为负数', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: offset 为小数', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: offset 为 NaN', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: offset 为 Infinity', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: offset 为 -Infinity', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: Buffer 长度不足（1 字节）', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: Buffer 长度不足（2 字节）', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: Buffer 长度不足（3 字节）', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: 空 Buffer', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// TypeError 场景
test('TypeError: offset 为字符串', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: offset 为对象', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: offset 为数组', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE([0]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: offset 为 null', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('TypeError: offset 为布尔值 true', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: offset 为布尔值 false', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 错误边界精确测试
test('offset = buf.length - 3（差 1 字节）应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = buf.length（恰好超出）应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(4);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 错误消息验证
test('RangeError 包含有用的错误信息', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.length > 0;
  }
});

test('TypeError 包含有用的错误信息', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE('invalid');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.length > 0;
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
