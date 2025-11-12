const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({ name, passed: result, details: result ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, error: e.message, stack: e.stack });
  }
}

test('错误处理 - 非数字 size（字符串数字除外）', () => {
  try {
    Buffer.allocUnsafeSlow('abc');
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('number');
  }
});

test('错误处理 - Object 作为 size', () => {
  try {
    Buffer.allocUnsafeSlow({});
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('number');
  }
});

test('错误处理 - Array 作为 size', () => {
  try {
    Buffer.allocUnsafeSlow([1, 2, 3]);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('number');
  }
});

test('错误处理 - Symbol 作为 size', () => {
  try {
    Buffer.allocUnsafeSlow(Symbol('size'));
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('number');
  }
});

test('错误处理 - 浮点数数值', () => {
  try {
    Buffer.allocUnsafeSlow(10.5);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('integer');
  }
});

test('错误处理 - 负数值', () => {
  try {
    Buffer.allocUnsafeSlow(-5);
    return false;
  } catch (e) {
    return e.message.includes('negative') || e.message.includes('size');
  }
});

test('错误处理 - NaN 值', () => {
  try {
    Buffer.allocUnsafeSlow(NaN);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('number');
  }
});

test('错误处理 - Infinity 值', () => {
  try {
    Buffer.allocUnsafeSlow(Infinity);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('number');
  }
});

test('错误处理 - 超出数组大小限制的值', () => {
  try {
    Buffer.allocUnsafeSlow(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('range');
  }
});

test('错误处理 - 无效的 encoding 字符串', () => {
  try {
    Buffer.allocUnsafeSlow(10, 'hello', 'invalid-encoding');
    return false;
  } catch (e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

test('错误处理 - fill 为 null', () => {
  const buf = Buffer.allocUnsafeSlow(10, null);
  return buf.length === 10;
});

test('错误处理 - fill 为 undefined', () => {
  const buf = Buffer.allocUnsafeSlow(10, undefined);
  return buf.length === 10;
});

test('错误处理 - fill 长度大于 size', () => {
  const buf = Buffer.allocUnsafeSlow(3, 'hello');
  return buf.length === 3 && buf.toString() === 'hel';
});

test('错误处理 - fill 为空的字符串', () => {
  const buf = Buffer.allocUnsafeSlow(5, '');
  return buf.length === 5;
});

test('错误处理 - fill 为空的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5, Buffer.alloc(0));
  return buf.length === 5;
});

test('错误处理 - fill 为负数的数字', () => {
  const buf = Buffer.allocUnsafeSlow(3, -1);
  return buf.length === 3 && buf[0] === 255 && buf[1] === 255 && buf[2] === 255;
});

test('错误处理 - fill 为大数字', () => {
  const buf = Buffer.allocUnsafeSlow(3, 65536);
  return buf.length === 3 && buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

test('错误处理 - 缺少 size 参数', () => {
  try {
    Buffer.allocUnsafeSlow();
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('required');
  }
});

test('错误处理 - 参数过多（4个以上）', () => {
  try {
    Buffer.allocUnsafeSlow(10, 'a', 'utf8', 'extra', 'param');
    return false;
  } catch (e) {
    return true;
  }
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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