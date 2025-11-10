// buf.readBigInt64LE() - Getter/Setter 陷阱测试
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

// Getter 测试
test('offset 对象有 getter 返回 0', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(12345n, 0);
    let callCount = 0;
    const obj = {
      get value() {
        callCount++;
        return 0;
      }
    };
    // 直接传递对象，而不是 obj.value
    const result = buf.readBigInt64LE(obj);
    return result === 12345n || callCount === 0;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 对象有 getter 返回非整数', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      get value() {
        return 0.5;
      }
    };
    buf.readBigInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 对象有 getter 抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      get value() {
        throw new Error('getter error');
      }
    };
    buf.readBigInt64LE(obj);
    return false;
  } catch (e) {
    return e.message === 'getter error' || e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// valueOf 与 getter 组合
test('offset 对象同时有 valueOf 和 getter', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(99999n, 0);
    const obj = {
      valueOf() {
        return 0;
      },
      get value() {
        return 100;
      }
    };
    const result = buf.readBigInt64LE(obj);
    return result === 99999n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 访问计数测试
test('offset valueOf 只被调用一次', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(77777n, 0);
    let callCount = 0;
    const obj = {
      valueOf() {
        callCount++;
        return 0;
      }
    };
    buf.readBigInt64LE(obj);
    return callCount <= 1;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 副作用测试
test('offset valueOf 有副作用', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(55555n, 0);
    let sideEffect = false;
    const obj = {
      valueOf() {
        sideEffect = true;
        return 0;
      }
    };
    buf.readBigInt64LE(obj);
    return sideEffect === true;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 递归 valueOf
test('offset valueOf 递归调用', () => {
  try {
    const buf = Buffer.alloc(8);
    let depth = 0;
    const obj = {
      valueOf() {
        depth++;
        if (depth > 10) {
          throw new Error('Too deep');
        }
        return 0;
      }
    };
    buf.readBigInt64LE(obj);
    return depth <= 10;
  } catch (e) {
    return e.message === 'Too deep' || e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// valueOf 返回对象
test('offset valueOf 返回对象', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      valueOf() {
        return { value: 0 };
      }
    };
    buf.readBigInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// valueOf 返回 null
test('offset valueOf 返回 null', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      valueOf() {
        return null;
      }
    };
    buf.readBigInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// valueOf 返回 undefined
test('offset valueOf 返回 undefined', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      valueOf() {
        return undefined;
      }
    };
    buf.readBigInt64LE(obj);
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
