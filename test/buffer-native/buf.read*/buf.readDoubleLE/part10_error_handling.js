// buf.readDoubleLE() - 错误处理测试
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

// RangeError 测试
test('RangeError: offset 越界', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('offset');
  }
});

test('RangeError: 负 offset', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: 浮点 offset', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readDoubleLE(1.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError: Buffer 长度不足', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readDoubleLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// TypeError 测试
test('TypeError: offset 为 null', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: offset 为字符串', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: offset 为对象', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE({ value: 0 });
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('TypeError: offset 为数组', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE([0]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('TypeError: offset 为布尔值', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 特殊数值 offset
test('offset = NaN 抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = Infinity 抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = -Infinity 抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 错误消息验证
test('RangeError 包含有意义的消息', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(10);
    return false;
  } catch (e) {
    return e.message.length > 0 && (
      e.message.includes('offset') || 
      e.message.includes('out of range') ||
      e.message.includes('bounds')
    );
  }
});

test('TypeError 包含有意义的消息', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE('invalid');
    return false;
  } catch (e) {
    return e.message.length > 0 && (
      e.message.includes('offset') ||
      e.message.includes('type') ||
      e.message.includes('number') ||
      e.message.includes('integer')
    );
  }
});

// 错误堆栈
test('错误包含堆栈信息', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(100);
    return false;
  } catch (e) {
    return e.stack && e.stack.length > 0;
  }
});

// 未定义行为
test('undefined offset 使用默认值不抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeDoubleLE(100.5, 0);
    const result = buf.readDoubleLE(undefined);
    return Math.abs(result - 100.5) < 0.01;
  } catch (e) {
    return false;
  }
});

// 超大 offset
test('超大 offset 抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('超小 offset 抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
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
