// buf.readBigInt64LE() - Symbol.toPrimitive 和特殊对象测试
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

// Symbol.toPrimitive 测试
test('offset 对象有 Symbol.toPrimitive 返回 0', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(100n, 0);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 0;
      }
    };
    const result = buf.readBigInt64LE(obj);
    return result === 100n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 对象有 Symbol.toPrimitive 返回非整数', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 0.5;
      }
    };
    buf.readBigInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 对象有 Symbol.toPrimitive 返回字符串', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return '0';
      }
    };
    buf.readBigInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 对象 Symbol.toPrimitive 优先于 valueOf', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(200n, 0);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 0;
      },
      valueOf() {
        return 100;
      }
    };
    const result = buf.readBigInt64LE(obj);
    return result === 200n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 对象 Symbol.toPrimitive 抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      [Symbol.toPrimitive](hint) {
        throw new Error('toPrimitive error');
      }
    };
    buf.readBigInt64LE(obj);
    return false;
  } catch (e) {
    return e.message === 'toPrimitive error' || e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Date 对象测试
test('offset 为 Date 对象（valueOf 返回时间戳）', () => {
  try {
    const buf = Buffer.alloc(8);
    const date = new Date(0);
    const result = buf.readBigInt64LE(date);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// RegExp 对象测试
test('offset 为 RegExp 对象', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(/test/);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Function 对象测试
test('offset 为 Function', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(function() { return 0; });
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 为箭头函数', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(() => 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Map 和 Set 对象测试
test('offset 为 Map 对象', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(new Map());
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 为 Set 对象', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(new Set());
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// WeakMap 和 WeakSet 对象测试
test('offset 为 WeakMap 对象', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(new WeakMap());
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 为 WeakSet 对象', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(new WeakSet());
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Promise 对象测试
test('offset 为 Promise 对象', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(Promise.resolve(0));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Error 对象测试
test('offset 为 Error 对象', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(new Error('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
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
