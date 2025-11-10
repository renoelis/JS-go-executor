// buf.readBigUInt64BE() - Symbol.toPrimitive 和特殊对象测试
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
    buf.writeBigUInt64BE(100n, 0);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 0;
      }
    };
    const result = buf.readBigUInt64BE(obj);
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
    buf.readBigUInt64BE(obj);
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
    buf.readBigUInt64BE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 对象有 Symbol.toPrimitive 返回 NaN', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return NaN;
      }
    };
    buf.readBigUInt64BE(obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 对象有 Symbol.toPrimitive 返回 Infinity', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return Infinity;
      }
    };
    buf.readBigUInt64BE(obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// Symbol.toPrimitive 和 valueOf 同时存在
test('Symbol.toPrimitive 优先于 valueOf', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(100n, 0);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 0;
      },
      valueOf() {
        return 100;
      }
    };
    const result = buf.readBigUInt64BE(obj);
    return result === 100n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Symbol.toPrimitive 抛出错误
test('Symbol.toPrimitive 抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      [Symbol.toPrimitive](hint) {
        throw new Error('Custom error');
      }
    };
    buf.readBigUInt64BE(obj);
    return false;
  } catch (e) {
    return e.message === 'Custom error' || e.name === 'TypeError' || e.name === 'RangeError';
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
