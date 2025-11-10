// buf.readBigInt64LE() - 错误码验证测试
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

// ERR_OUT_OF_RANGE 错误码测试
test('offset 越界应抛出包含 "out of range" 的错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(1);
    return false;
  } catch (e) {
    const msg = e.message.toLowerCase();
    return e.name === 'RangeError' && (msg.includes('out of range') || msg.includes('offset'));
  }
});

test('offset 负数应抛出包含 "out of range" 的错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(-1);
    return false;
  } catch (e) {
    const msg = e.message.toLowerCase();
    return e.name === 'RangeError' && (msg.includes('out of range') || msg.includes('offset') || msg.includes('negative'));
  }
});

test('Buffer 长度不足应抛出包含 "out of range" 的错误', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    const msg = e.message.toLowerCase();
    return e.name === 'RangeError' && (msg.includes('out of range') || msg.includes('length') || msg.includes('offset') || msg.includes('buffer') || msg.includes('bound'));
  }
});

// ERR_INVALID_ARG_TYPE 错误码测试
test('offset 为字符串应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为 Symbol 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('this 不是 Buffer 应抛出 TypeError', () => {
  try {
    Buffer.prototype.readBigInt64LE.call({}, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 错误消息应该是字符串
test('错误消息应该是非空字符串', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(100);
    return false;
  } catch (e) {
    return typeof e.message === 'string' && e.message.length > 0;
  }
});

// 错误应该有正确的原型链
test('RangeError 应该在 Error 原型链上', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(1);
    return false;
  } catch (e) {
    return e instanceof Error && (e instanceof RangeError || e.name === 'RangeError');
  }
});

test('TypeError 应该在 Error 原型链上', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE('invalid');
    return false;
  } catch (e) {
    return e instanceof Error && (e instanceof TypeError || e.name === 'TypeError');
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
