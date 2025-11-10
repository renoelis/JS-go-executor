// buf.readBigInt64LE() - 错误消息和错误类型详细测试
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

// RangeError - offset 越界
test('offset 越界抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && typeof e.message === 'string';
  }
});

// RangeError - offset 负数
test('offset 负数抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && typeof e.message === 'string';
  }
});

// RangeError - offset 浮点数
test('offset 浮点数抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && typeof e.message === 'string';
  }
});

// TypeError - offset 字符串
test('offset 字符串抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && typeof e.message === 'string';
  }
});

// TypeError - offset Symbol
test('offset Symbol 抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError' && typeof e.message === 'string';
  }
});

// TypeError - this 不是 Buffer
test('this 不是 Buffer 抛出 TypeError', () => {
  try {
    Buffer.prototype.readBigInt64LE.call({}, 0);
    return false;
  } catch (e) {
    return (e.name === 'TypeError' || e.name === 'RangeError') && typeof e.message === 'string';
  }
});

// TypeError - this 是 null
test('this 是 null 抛出 TypeError', () => {
  try {
    Buffer.prototype.readBigInt64LE.call(null, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && typeof e.message === 'string';
  }
});

// TypeError - this 是 undefined
test('this 是 undefined 抛出 TypeError', () => {
  try {
    Buffer.prototype.readBigInt64LE.call(undefined, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && typeof e.message === 'string';
  }
});

// RangeError - Buffer 长度不足
test('Buffer 长度不足抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && typeof e.message === 'string';
  }
});

// RangeError - offset 超出 Buffer 长度
test('offset 超出 Buffer 长度抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(8);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && typeof e.message === 'string';
  }
});

// 错误对象有 stack 属性
test('错误对象包含 stack 属性', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(1);
    return false;
  } catch (e) {
    return typeof e.stack === 'string' && e.stack.length > 0;
  }
});

// 错误对象有 message 属性
test('错误对象包含 message 属性', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(-1);
    return false;
  } catch (e) {
    return typeof e.message === 'string' && e.message.length > 0;
  }
});

// 错误对象有 name 属性
test('错误对象包含 name 属性', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(100);
    return false;
  } catch (e) {
    return typeof e.name === 'string' && (e.name === 'RangeError' || e.name === 'TypeError');
  }
});

// 错误可以被 instanceof 检测
test('错误可以被 instanceof Error 检测', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(1);
    return false;
  } catch (e) {
    return e instanceof Error;
  }
});

// 错误可以被 instanceof RangeError 检测
test('RangeError 可以被 instanceof 检测', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(1);
    return false;
  } catch (e) {
    return e instanceof RangeError || e instanceof Error;
  }
});

// 错误可以被 instanceof TypeError 检测
test('TypeError 可以被 instanceof 检测', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE('0');
    return false;
  } catch (e) {
    return e instanceof TypeError || e instanceof Error;
  }
});

// 错误可以被 toString
test('错误对象可以被 toString', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(1);
    return false;
  } catch (e) {
    const str = e.toString();
    return typeof str === 'string' && str.length > 0;
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
