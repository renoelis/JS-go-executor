// buf.readIntBE/readIntLE - Symbol.toPrimitive 和对象转换测试
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

// Symbol.toPrimitive 测试 - offset 参数
test('readIntBE: offset 对象有 Symbol.toPrimitive 返回 0', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 0;
      }
    };
    const result = buf.readIntBE(obj, 4);
    return result === 0x12345678;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readIntLE: offset 对象有 Symbol.toPrimitive 返回 0', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 0;
      }
    };
    const result = buf.readIntLE(obj, 4);
    return result === 0x12345678;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readIntBE: offset 对象有 Symbol.toPrimitive 返回浮点数应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 0.5;
      }
    };
    buf.readIntBE(obj, 4);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('readIntLE: offset 对象有 Symbol.toPrimitive 返回 NaN 应失败', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return NaN;
      }
    };
    buf.readIntLE(obj, 4);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('readIntBE: offset 对象有 Symbol.toPrimitive 返回 Infinity 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return Infinity;
      }
    };
    buf.readIntBE(obj, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// Symbol.toPrimitive 测试 - byteLength 参数
test('readIntBE: byteLength 对象有 Symbol.toPrimitive 返回 4', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 4;
      }
    };
    const result = buf.readIntBE(0, obj);
    return result === 0x12345678;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readIntLE: byteLength 对象有 Symbol.toPrimitive 返回 4', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 4;
      }
    };
    const result = buf.readIntLE(0, obj);
    return result === 0x12345678;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readIntBE: byteLength Symbol.toPrimitive 返回 0 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 0;
      }
    };
    buf.readIntBE(0, obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('readIntLE: byteLength Symbol.toPrimitive 返回 7 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 7;
      }
    };
    buf.readIntLE(0, obj);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// Symbol.toPrimitive 优先于 valueOf
test('readIntBE: Symbol.toPrimitive 优先于 valueOf', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return 0;
      },
      valueOf() {
        return 100;
      }
    };
    const result = buf.readIntBE(obj, 4);
    return result === 0x12345678;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Symbol.toPrimitive 抛出错误
test('readIntBE: Symbol.toPrimitive 抛出错误', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        throw new Error('Custom error');
      }
    };
    buf.readIntBE(obj, 2);
    return false;
  } catch (e) {
    return e.message === 'Custom error' || e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readIntLE: Symbol.toPrimitive 抛出错误', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    const obj = {
      [Symbol.toPrimitive](hint) {
        throw new Error('Custom error');
      }
    };
    buf.readIntLE(obj, 2);
    return false;
  } catch (e) {
    return e.message === 'Custom error' || e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// valueOf 测试
test('readIntBE: offset 对象有 valueOf 返回 0', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const obj = {
      valueOf() {
        return 0;
      }
    };
    const result = buf.readIntBE(obj, 4);
    return result === 0x12345678;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readIntLE: byteLength 对象有 valueOf 返回 2', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    const obj = {
      valueOf() {
        return 2;
      }
    };
    const result = buf.readIntLE(0, obj);
    return result === 0x1234;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readIntBE: valueOf 返回浮点数应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    const obj = {
      valueOf() {
        return 1.5;
      }
    };
    buf.readIntBE(obj, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('readIntLE: valueOf 抛出错误', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    const obj = {
      valueOf() {
        throw new Error('valueOf error');
      }
    };
    buf.readIntLE(obj, 2);
    return false;
  } catch (e) {
    return e.message === 'valueOf error' || e.name === 'TypeError' || e.name === 'RangeError';
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
